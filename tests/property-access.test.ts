import {expect,test,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {internal} from '../convex/_generated/api';
import {ownerReading} from './owner-message-fixture';
import {comparisonReadingFromRaw} from '../src/comparison';
import {prepareDay} from '../src/confirmed-day';

// Made-up accounts and financial records only; no real hotel data.
const modules=import.meta.glob('../convex/**/*.ts');
const post=(data:unknown)=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
async function setup(){
 const t=convexTest(schema,modules);
 const [ownerId,managerId,otherId,wrongId]=await t.run(async ctx=>Promise.all(['owner','manager','other','wrong'].map(name=>ctx.db.insert('users',{email:`${name}@example.invalid`}))));
 return {t,ownerId,managerId,otherId,owner:t.withIdentity({subject:`${ownerId}|session`}),manager:t.withIdentity({subject:`${managerId}|session`}),other:t.withIdentity({subject:`${otherId}|session`}),wrong:t.withIdentity({subject:`${wrongId}|session`})};
}
type Account=Awaited<ReturnType<typeof setup>>['owner'];
async function create(account:Account,name='Example Property'){
 const response=await account.fetch('/property/create',post({name}));expect(response.status).toBe(200);return response.json();
}
async function invite(account:Account,email='manager@example.invalid'){
 const response=await account.fetch('/property/invitation',post({email}));expect(response.status).toBe(200);return response.json();
}
async function join(owner:Account,manager:Account){const invitation=await invite(owner);expect((await manager.fetch('/property/accept',post({token:invitation.token}))).status).toBe(200);return invitation;}
const digest=async(token:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),byte=>byte.toString(16).padStart(2,'0')).join('');
const date='2026-10-10';
function raw(amounts:(number|null)[]=[12500,3750,4000,12250,500]){
 const result=ownerReading(amounts),answer=JSON.parse(result.output[0].content[0].text);answer.date=date;answer.documents[0].date=date;result.output[0].content[0].text=JSON.stringify(answer);return result;
}
const confirmBody=(amounts?:(number|null)[])=>({raw:raw(amounts),date,sources:[1],dsrSources:[1],choices:[],corrections:[],expectedVersion:null});

test('signed-out visitors cannot access property, invitation, History, owner edit or monthly data',async()=>{
 const t=convexTest(schema,modules);
 for(const [path,method] of [['/property/session','GET'],['/property/create','POST'],['/property/invitation','GET'],['/property/invitation','POST'],['/property/accept','POST'],['/property/remove-manager','POST'],['/owner/month?month=2026-10','GET'],['/owner/day/edit','POST'],['/days/history','GET']])expect((await t.fetch(path,{method})).status).toBe(401);
});
test('existing sign-in starts unassigned and property creation makes only that account the owner',async()=>{
 const {owner,other}=await setup();
 expect(await (await owner.fetch('/property/session')).json()).toEqual({role:'unassigned',property:null});
 const {property}=await create(owner);
 expect(await (await owner.fetch('/property/session')).json()).toEqual({role:'owner',property});
 expect(await (await other.fetch('/property/session')).json()).toEqual({role:'unassigned',property:null});
 expect((await owner.fetch('/property/create',post({name:'Second property'}))).status).toBe(409);
});
test.each(['','  ','x'.repeat(201)])('invalid property name is rejected without granting access',async name=>{
 const {owner}=await setup();expect((await owner.fetch('/property/create',post({name}))).status).toBe(400);
 expect(await (await owner.fetch('/property/session')).json()).toEqual({role:'unassigned',property:null});
});
test('current account adoption preserves all previous saved versions and isolates other legacy accounts',async()=>{
 const {t,owner,other,ownerId,otherId}=await setup(),snapshot=prepareDay(comparisonReadingFromRaw(raw(),date,[1],[1]),[],[]);
 const previous=await t.run(async ctx=>{
  const original=await ctx.db.insert('confirmedVersions',{scope:`manager:${ownerId}`,date,confirmedAt:1800000000000,previousVersion:null,snapshot});
  const latest=await ctx.db.insert('confirmedVersions',{scope:`manager:${ownerId}`,date,confirmedAt:1800000001000,previousVersion:original,snapshot});
  await ctx.db.insert('confirmedDays',{scope:`manager:${ownerId}`,date,version:latest,confirmedAt:1800000001000});
  const foreign=await ctx.db.insert('confirmedVersions',{scope:`manager:${otherId}`,date,confirmedAt:1800000000000,previousVersion:null,snapshot});
  await ctx.db.insert('confirmedDays',{scope:`manager:${otherId}`,date,version:foreign,confirmedAt:1800000000000});
  return {original,latest};
 });
 const before=await t.run(async ctx=>({first:await ctx.db.get(previous.original),last:await ctx.db.get(previous.latest)}));
 await create(owner);
 expect((await (await owner.fetch(`/days/detail?date=${date}`)).json()).day.version).toBe(previous.latest);
 expect(await t.run(async ctx=>({first:await ctx.db.get(previous.original),last:await ctx.db.get(previous.latest)}))).toEqual(before);
 expect((await other.fetch('/days/history')).status).toBe(403);
 const report=(await (await owner.fetch('/owner/month?month=2026-10')).json()).report;
 expect(report.confirmedDays).toBe(1);expect(report.totals.room).toBe(12500);
});
test('adopted 4 Oct and 10 Oct confirmed days appear identically in History and the owner month with both saved corrections',async()=>{
 const {t,owner,other,ownerId,otherId}=await setup();
 const records=[
  {date:'2026-10-04',ai:[11,12,13,14,15],corrected:[6400,1600,2500,5500,180]},
  {date:'2026-10-10',ai:[21,22,23,24,25],corrected:[9700,2300,4600,7400,420]},
 ];
 const saved=await t.run(async ctx=>Promise.all(records.map(async record=>{
  const response=raw(record.ai),answer=JSON.parse(response.output[0].content[0].text);
  answer.date=record.date;answer.documents[0].date=record.date;response.output[0].content[0].text=JSON.stringify(answer);
  const reading=comparisonReadingFromRaw(response,record.date,[1],[1]);
  const original=prepareDay(reading,[],[]),snapshot=prepareDay(reading,record.corrected.map((amount,line)=>({id:`1:${line}`,amount})),[]);
  const scope=`manager:${ownerId}`,confirmedAt=1800000000000;
  const first=await ctx.db.insert('confirmedVersions',{scope,date:record.date,confirmedAt:confirmedAt-1000,previousVersion:null,snapshot:original});
  const version=await ctx.db.insert('confirmedVersions',{scope,date:record.date,confirmedAt,previousVersion:first,snapshot});
  await ctx.db.insert('confirmedDays',{scope,date:record.date,version,confirmedAt});
  const foreignScope=`manager:${otherId}`;
  const foreign=await ctx.db.insert('confirmedVersions',{scope:foreignScope,date:record.date,confirmedAt,previousVersion:null,snapshot});
  await ctx.db.insert('confirmedDays',{scope:foreignScope,date:record.date,version:foreign,confirmedAt});
  return {date:record.date,version,first,foreign};
 })));
 const before=await t.run(async ctx=>Promise.all(saved.flatMap(record=>[record.first,record.version,record.foreign]).map(id=>ctx.db.get(id))));
 await create(owner);await create(other,'Other Example Property');
 const historyResponse=await owner.fetch('/days/history'),monthResponse=await owner.fetch('/owner/month?month=2026-10');
 expect(historyResponse.status).toBe(200);expect(monthResponse.status).toBe(200);
 const history=await historyResponse.json(),report=(await monthResponse.json()).report;
 expect(history.days.map((day:{date:string})=>day.date)).toEqual(['2026-10-10','2026-10-04']);
 expect(history.days.map((day:{version:string})=>day.version)).toEqual([saved[1].version,saved[0].version]);
 expect(report.days.map((day:{date:string})=>day.date)).toEqual(history.days.map((day:{date:string})=>day.date));
 expect(report.days.map((day:{version:string})=>day.version)).toEqual(history.days.map((day:{version:string})=>day.version));
 expect(report.confirmedDays).toBe(history.days.length);expect(report.confirmedDays).toBe(2);
 expect(report.totals).toEqual({room:16100,food:3900,cash:7100,upi:12900,expenses:600});
 expect(report.counts).toEqual({matches:2,check:0,incomplete:0,missingAmounts:0});
 expect(await t.run(async ctx=>Promise.all(saved.flatMap(record=>[record.first,record.version,record.foreign]).map(id=>ctx.db.get(id))))).toEqual(before);
});
test('private manager link is hashed, email bound, one slot and absent from metadata responses',async()=>{
 const {t,owner,manager,wrong}=await setup();const {property}=await create(owner),invitation=await invite(owner,' MANAGER@example.invalid ');
 expect(invitation.token).toMatch(/^[a-f0-9]{64}$/);
 const status=await (await owner.fetch('/property/invitation')).json();expect(status.invitation).toMatchObject({email:'manager@example.invalid',status:'pending'});expect(status.manager).toBeNull();
 expect(JSON.stringify(status)).not.toContain(invitation.token);
 const stored=await t.run(ctx=>ctx.db.query('propertyInvitations').withIndex('by_property',query=>query.eq('propertyId',property.id)).take(2));
 expect(stored).toHaveLength(1);expect(stored[0].tokenHash).toBe(await digest(invitation.token));expect(JSON.stringify(stored)).not.toContain(invitation.token);
 expect((await wrong.fetch('/property/accept',post({token:invitation.token}))).status).toBe(400);
 expect((await manager.fetch('/property/accept',post({token:invitation.token}))).status).toBe(200);
 expect(await (await manager.fetch('/property/session')).json()).toEqual({role:'manager',property});
 expect((await manager.fetch('/property/accept',post({token:invitation.token}))).status).toBe(200);
 expect((await wrong.fetch('/property/accept',post({token:invitation.token}))).status).toBe(400);
 expect((await owner.fetch('/property/invitation',post({email:'second@example.invalid'}))).status).toBe(409);
});
test.each(['owner@example.invalid','bad','a@b','','a'.repeat(255)+'@example.invalid'])('invalid or self manager email %s cannot reserve a slot',async email=>{
 const {owner}=await setup();await create(owner);expect((await owner.fetch('/property/invitation',post({email}))).status).toBe(400);
 expect((await (await owner.fetch('/property/invitation')).json()).invitation).toBeNull();
});
test('only the property owner may invite, remove a manager, edit a saved day or read month totals',async()=>{
 const {owner,manager,other}=await setup();await create(owner);await join(owner,manager);
 for(const account of [manager,other]){
  expect((await account.fetch('/property/invitation')).status).toBe(403);
  expect((await account.fetch('/property/invitation',post({email:'another@example.invalid'}))).status).toBe(403);
  expect((await account.fetch('/property/remove-manager',post({expectedManagerId:'fake'}))).status).toBe(403);
  expect((await account.fetch('/owner/day/edit',post({}))).status).toBe(403);
  expect((await account.fetch('/owner/month?month=2026-10')).status).toBe(403);
 }
 expect((await manager.fetch('/days/history')).status).toBe(200);
});
test('regenerating a pending link and link expiry invalidate old invitations',async()=>{
 const {t,owner,manager}=await setup(),{property}=await create(owner),first=await invite(owner),second=await invite(owner);
 expect(first.token).not.toBe(second.token);
 expect((await manager.fetch('/property/accept',post({token:first.token}))).status).toBe(400);
 await t.run(async ctx=>{const row=await ctx.db.query('propertyInvitations').withIndex('by_property',query=>query.eq('propertyId',property.id)).unique();await ctx.db.patch(row!._id,{expiresAt:Date.now()-1});});
 expect((await manager.fetch('/property/accept',post({token:second.token}))).status).toBe(400);
});
test('one account cannot own or manage two properties and invite cannot move a property owner',async()=>{
 const {owner,manager,other}=await setup();await create(owner);await create(other,'Other Example Property');
 const invitation=await invite(owner,'other@example.invalid');expect((await other.fetch('/property/accept',post({token:invitation.token}))).status).toBe(400);
 await join(owner,manager);expect((await manager.fetch('/property/create',post({name:'Not allowed'}))).status).toBe(409);
 const second=await invite(other);expect((await manager.fetch('/property/accept',post({token:second.token}))).status).toBe(400);
});
test('property isolation blocks foreign dates and ignores neither scope nor property parameters',async()=>{
 const {owner,manager,other}=await setup();await create(owner);await join(owner,manager);await create(other,'Other Example Property');
 expect((await manager.fetch('/days/confirm',post(confirmBody()))).status).toBe(200);
 expect((await other.fetch(`/days/detail?date=${date}`)).status).toBe(404);
 expect((await owner.fetch('/owner/month?month=2026-10&scope=foreign')).status).toBe(400);
 expect((await owner.fetch('/days/history?scope=foreign')).status).toBe(400);
 expect((await owner.fetch(`/days/detail?date=${date}&propertyId=foreign`)).status).toBe(400);
 expect((await manager.fetch('/days/confirm',post({...confirmBody(),scope:'foreign'}))).status).toBe(400);
});
test('removing the manager revokes all property access and old links without deleting property records',async()=>{
 const {owner,manager,managerId}=await setup();await create(owner);const invitation=await join(owner,manager);
 expect((await manager.fetch('/days/confirm',post(confirmBody()))).status).toBe(200);
 expect((await owner.fetch('/property/remove-manager',post({expectedManagerId:managerId}))).status).toBe(200);
 expect(await (await manager.fetch('/property/session')).json()).toEqual({role:'unassigned',property:null});
 for(const [path,method] of [['/extract','POST'],['/records','POST'],['/compare','POST'],['/days/confirm','POST'],['/days/history','GET'],['/days/latest','GET'],[`/days/detail?date=${date}`,'GET']])expect((await manager.fetch(path,{method})).status).toBe(403);
 expect((await manager.fetch('/property/accept',post({token:invitation.token}))).status).toBe(400);
 expect((await owner.fetch(`/days/detail?date=${date}`)).status).toBe(200);
 expect((await (await owner.fetch('/owner/month?month=2026-10')).json()).report.confirmedDays).toBe(1);
});
test('manager removal rechecks expected identity and blocks late save/quota/upload mutations',async()=>{
 const {t,owner,manager,ownerId,managerId,otherId}=await setup();await create(owner);await join(owner,manager);
 expect((await owner.fetch('/property/remove-manager',post({expectedManagerId:otherId}))).status).toBe(409);
 expect((await owner.fetch('/property/remove-manager',post({expectedManagerId:managerId}))).status).toBe(200);
 const snapshot=prepareDay(comparisonReadingFromRaw(raw(),date,[1],[1]),[],[]);
 await expect(manager.mutation(internal.days.confirm,{scope:`manager:${ownerId}`,snapshot,expectedVersion:null})).rejects.toThrow();
 await expect(manager.mutation(internal.limits.reserve,{})).rejects.toThrow();
 await expect(manager.mutation(internal.records.reserve,{})).rejects.toThrow();
 await expect(manager.mutation(internal.records.save,{scope:`manager:${ownerId}`,date,batch:'fabricated',records:[]})).rejects.toThrow();
 expect(await t.run(ctx=>ctx.db.query('confirmedDays').withIndex('by_scope_date',query=>query.eq('scope',`manager:${ownerId}`)).take(2))).toEqual([]);
});
test('owner edits append a version using existing corrected amounts and preserve original confirmation and AI data',async()=>{
 const {t,owner,manager,ownerId}=await setup();await create(owner);await join(owner,manager);
 const body=confirmBody([999,3750,4000,12250,500]);body.corrections=[{id:'1:0',amount:12500}] as never[];
 const first=await (await manager.fetch('/days/confirm',post(body))).json();
 const original=await t.run(ctx=>ctx.db.get(first.version));
 const response=await owner.fetch('/owner/day/edit',post({date,expectedVersion:first.version,corrections:[{id:'1:1',amount:4000},{id:'1:4',label:'Checked expense'}]}));
 expect(response.status).toBe(200);const edited=await response.json();expect(edited.version).not.toBe(first.version);expect(edited.confirmedAt).toBe(first.confirmedAt);
 const saved=await t.run(ctx=>ctx.db.get(edited.version));
 expect(saved).toMatchObject({scope:`manager:${ownerId}`,previousVersion:first.version,confirmedAt:first.confirmedAt,editedBy:'owner',editedAt:expect.any(Number)});
 expect(saved!.snapshot.lines[0]).toMatchObject({aiValue:999,correctedValue:12500});
 expect(saved!.snapshot.lines[1]).toMatchObject({aiValue:3750,correctedValue:4000});
 expect(saved!.snapshot.lines[4]).toMatchObject({aiLabel:'Expense Bills',correctedLabel:'Checked expense'});
 expect(saved!.snapshot.aiReading).toEqual(original!.snapshot.aiReading);expect(saved!.snapshot.aiAnswerText).toBe(original!.snapshot.aiAnswerText);
 expect(await t.run(ctx=>ctx.db.get(first.version))).toEqual(original);
 const day=(await (await owner.fetch(`/days/detail?date=${date}`)).json()).day;
 expect(day.editedBy).toBe('owner');expect(day.salesMoneyCheck).toMatchObject({status:'Difference',difference:-250});
 expect((await (await owner.fetch('/owner/month?month=2026-10')).json()).report.totals).toEqual({room:12500,food:4000,cash:4000,upi:12250,expenses:500});
 const second=await owner.fetch('/owner/day/edit',post({date,expectedVersion:edited.version,corrections:[{id:'1:4',amount:0}]}));expect(second.status).toBe(200);
 expect((await (await owner.fetch(`/days/detail?date=${date}`)).json()).day.lines[4].correctedValue).toBe(0);
});
test('stale owner edit returns a conflict and never silently overwrites',async()=>{
 const {owner,manager}=await setup();await create(owner);await join(owner,manager);const first=await (await manager.fetch('/days/confirm',post(confirmBody()))).json();
 const body={date,expectedVersion:first.version,corrections:[{id:'1:0',amount:13000}]};
 expect((await owner.fetch('/owner/day/edit',post(body))).status).toBe(200);
 const stale=await owner.fetch('/owner/day/edit',post({...body,corrections:[{id:'1:0',amount:999}]}));expect(stale.status).toBe(409);
 expect((await (await owner.fetch(`/days/detail?date=${date}`)).json()).day.checks.find((check:{title:string})=>check.title==='Room charges').dsr).toBe(13000);
});
test('owner edits retain a manager-confirmed uncertain AI amount even when its number was unchanged',async()=>{
 const {owner,manager}=await setup();await create(owner);await join(owner,manager);
 const body=confirmBody(),answer=JSON.parse(body.raw.output[0].content[0].text);answer.documents[0].lines[0].unclear=true;body.raw.output[0].content[0].text=JSON.stringify(answer);
 body.corrections=[{id:'1:0',amount:12500}] as never[];
 const first=await (await manager.fetch('/days/confirm',post(body))).json();
 let day=(await (await owner.fetch(`/days/detail?date=${date}`)).json()).day;
 expect(day.lines[0]).toMatchObject({aiUnclear:true,unclear:false,aiValue:12500});expect(day.lines[0]).not.toHaveProperty('correctedValue');
 const response=await owner.fetch('/owner/day/edit',post({date,expectedVersion:first.version,corrections:[{id:'1:4',label:'Checked expense'}]}));expect(response.status).toBe(200);
 day=(await (await owner.fetch(`/days/detail?date=${date}`)).json()).day;
 expect(day.lines[0]).toMatchObject({aiUnclear:true,unclear:false,aiValue:12500});expect(day.salesMoneyCheck.status).toBe('Matched');
 expect((await (await owner.fetch('/owner/month?month=2026-10')).json()).report.totals.room).toBe(12500);
});
test('owners can read and edit but cannot impersonate manager uploads or confirmation',async()=>{
 const {t,owner,manager,ownerId}=await setup();await create(owner);await join(owner,manager);
 const first=await manager.fetch('/days/confirm',post(confirmBody()));expect(first.status).toBe(200);
 const provider=vi.fn();vi.stubGlobal('fetch',provider);
 try{
  for(const path of ['/extract','/records','/compare','/days/confirm'])expect((await owner.fetch(path,post(confirmBody()))).status).toBe(403);
  const snapshot=prepareDay(comparisonReadingFromRaw(raw(),date,[1],[1]),[],[]);
  await expect(owner.mutation(internal.days.confirm,{scope:`manager:${ownerId}`,snapshot,expectedVersion:null})).rejects.toThrow();
  await expect(owner.mutation(internal.limits.reserve,{})).rejects.toThrow();
  await expect(owner.mutation(internal.records.reserve,{})).rejects.toThrow();
  await expect(owner.mutation(internal.records.save,{scope:`manager:${ownerId}`,date,batch:'fabricated',records:[]})).rejects.toThrow();
  expect(provider).not.toHaveBeenCalled();
  expect(await t.run(ctx=>ctx.db.query('aiLimits').take(1))).toEqual([]);
  expect((await owner.fetch('/days/history')).status).toBe(200);expect((await owner.fetch(`/days/detail?date=${date}`)).status).toBe(200);
 }finally{vi.unstubAllGlobals();}
});
test('unassigned users cannot charge AI calls or create quota rows',async()=>{
 const {t,manager}=await setup(),provider=vi.fn();vi.stubGlobal('fetch',provider);
 try{expect((await manager.fetch('/extract',post({}))).status).toBe(403);expect(provider).not.toHaveBeenCalled();expect(await t.run(ctx=>ctx.db.query('aiLimits').take(1))).toEqual([]);}finally{vi.unstubAllGlobals();}
});
