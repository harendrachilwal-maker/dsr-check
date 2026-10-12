import {expect,test,vi} from 'vitest';
import {convexTest} from 'convex-test';
import {makeFunctionReference} from 'convex/server';
import schema from '../convex/schema';
import {ownerReading} from './owner-message-fixture';
import {comparisonReadingFromRaw} from '../src/comparison';
import {prepareDay} from '../src/confirmed-day';

// Fabricated accounts and amounts only. The repair is never called by the app.
const modules=import.meta.glob('../convex/**/*.ts');
const repair=makeFunctionReference<'mutation'>('dayOwnershipRepair:attachBrowserDay');
const browserScope='a'.repeat(64),date='2026-10-04';
async function setup(){
 const t=convexTest(schema,modules);
 const data=await t.run(async ctx=>{
  const ownerId=await ctx.db.insert('users',{email:'repair-owner@example.invalid'}),scope=`manager:${ownerId}`;
  const propertyId=await ctx.db.insert('properties',{ownerId,name:'Sample Repair Property',dataScope:scope,managerId:null,createdAt:1800000000000});
  const raw=ownerReading([12000,2000,6000,8000,400]);
  const answer=JSON.parse(raw.output[0].content[0].text);answer.date=date;answer.documents[0].date=date;raw.output[0].content[0].text=JSON.stringify(answer);
  const snapshot=prepareDay(comparisonReadingFromRaw(raw,date,[1],[1]),[{id:'1:0',amount:13000}],[],'Fabricated original AI answer');
  const confirmedAt=1800000000000;
  const versionId=await ctx.db.insert('confirmedVersions',{scope:browserScope,date,confirmedAt,previousVersion:null,snapshot});
  const dayId=await ctx.db.insert('confirmedDays',{scope:browserScope,date,confirmedAt,version:versionId});
  const next={...snapshot,date:'2026-10-10',aiReading:{...snapshot.aiReading,date:'2026-10-10',documents:snapshot.aiReading.documents.map(doc=>({...doc,date:'2026-10-10'}))},lines:snapshot.lines.map(line=>({...line,documentDate:'2026-10-10'}))};
  const otherVersion=await ctx.db.insert('confirmedVersions',{scope,date:next.date,confirmedAt,previousVersion:null,snapshot:next});
  await ctx.db.insert('confirmedDays',{scope,date:next.date,confirmedAt,version:otherVersion});
  return {ownerId,propertyId,dayId,versionId,scope,confirmedAt};
 });
 return {t,...data,args:{dayId:data.dayId,versionId:data.versionId,propertyId:data.propertyId,expectedOwnerId:data.ownerId,expectedPropertyName:'Sample Repair Property',expectedDate:date,expectedSourceScope:browserScope,expectedConfirmedAt:data.confirmedAt}};
}
const withDev=async(work:()=>Promise<void>)=>{vi.stubEnv('CONVEX_CLOUD_URL','https://resilient-hamster-178.convex.cloud');try{await work();}finally{vi.unstubAllEnvs();}};
test('one approved browser day joins its property without changing IDs, saved values, dates or confirmations',()=>withDev(async()=>{
 const {t,args,ownerId,scope,dayId,versionId}=await setup(),owner=t.withIdentity({subject:`${ownerId}|session`});
 const before=await t.run(async ctx=>({day:await ctx.db.get(dayId),version:await ctx.db.get(versionId)}));
 expect((await (await owner.fetch('/owner/month?month=2026-10')).json()).report.confirmedDays).toBe(1);
 expect(await t.mutation(repair,args)).toMatchObject({status:'attached',versionsMoved:1,dayId,versionId});
 const after=await t.run(async ctx=>({day:await ctx.db.get(dayId),version:await ctx.db.get(versionId)}));
 expect(after).toEqual({day:{...before.day,scope},version:{...before.version,scope}});
 const history=await (await owner.fetch('/days/history')).json(),month=await (await owner.fetch('/owner/month?month=2026-10')).json();
 expect(history.days.map((day:{date:string})=>day.date)).toEqual(['2026-10-10',date]);
 expect(month.report.confirmedDays).toBe(2);expect(month.report.days.map((day:{date:string})=>day.date)).toEqual(history.days.map((day:{date:string})=>day.date));
 expect(month.report.totals.room).toBe(26000);
 expect(await t.mutation(repair,args)).toMatchObject({status:'already attached',versionsMoved:0});
 expect(await t.run(ctx=>ctx.db.get(versionId))).toEqual(after.version);
}));
test('signed-in application accounts cannot invoke administrator repair',()=>withDev(async()=>{
 const {t,args,ownerId,versionId}=await setup(),before=await t.run(ctx=>ctx.db.get(versionId));
 await expect(t.withIdentity({subject:`${ownerId}|session`}).mutation(repair,args)).rejects.toThrow('development administrator');
 expect(await t.run(ctx=>ctx.db.get(versionId))).toEqual(before);
}));
test('repair refuses a production deployment before changing ownership',async()=>{
 const {t,args,versionId}=await setup(),before=await t.run(ctx=>ctx.db.get(versionId));
 vi.stubEnv('CONVEX_CLOUD_URL','https://made-up-production.convex.cloud');
 try{await expect(t.mutation(repair,args)).rejects.toThrow('development administrator');expect(await t.run(ctx=>ctx.db.get(versionId))).toEqual(before);}finally{vi.unstubAllEnvs();}
});
test.each(['owner','property','version','time','extra version','property source','target conflict'] as const)('repair refuses changed %s without touching either record',kind=>withDev(async()=>{
 const {t,args,ownerId,dayId,versionId,scope}=await setup();
 await t.run(async ctx=>{
  if(kind==='owner')args.expectedOwnerId=await ctx.db.insert('users',{email:'other@example.invalid'});
  else if(kind==='property')args.expectedPropertyName='Another property';
  else if(kind==='version'){const original=(await ctx.db.get(versionId))!;args.versionId=await ctx.db.insert('confirmedVersions',{scope:original.scope,date,confirmedAt:original.confirmedAt,previousVersion:null,snapshot:original.snapshot});}
  else if(kind==='time')args.expectedConfirmedAt++;
  else if(kind==='extra version'){const original=(await ctx.db.get(versionId))!;await ctx.db.insert('confirmedVersions',{scope:original.scope,date,confirmedAt:original.confirmedAt,previousVersion:versionId,snapshot:original.snapshot});}
  else if(kind==='property source')await ctx.db.insert('properties',{ownerId,name:'Other property',dataScope:browserScope,managerId:null,createdAt:1800000000000});
  else await ctx.db.insert('confirmedDays',{scope,date,confirmedAt:1800000000000,version:versionId});
 });
 const before=await t.run(async ctx=>({day:await ctx.db.get(dayId),version:await ctx.db.get(versionId)}));
 await expect(t.mutation(repair,args)).rejects.toThrow();
 expect(await t.run(async ctx=>({day:await ctx.db.get(dayId),version:await ctx.db.get(versionId)}))).toEqual(before);
}));
