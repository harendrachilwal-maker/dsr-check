import {test,expect,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {makeRaw,comparisonDate as date} from './comparison-fixture';
const modules=import.meta.glob('../convex/**/*.ts');
test('signed-out and old browser-key requests cannot scan, correct, confirm or read History',async()=>{
 const t=convexTest(schema,modules),provider=vi.fn();vi.stubGlobal('fetch',provider);
 try{
  for(const token of ['',`Bearer ${'a'.repeat(64)}`,'Bearer forged-token']){
   for(const [path,method] of [['/extract','POST'],['/compare','POST'],['/records','POST'],['/days/confirm','POST'],['/days/history','GET'],[`/days/detail?date=${date}`,'GET']]){
    const response=await t.fetch(path,{method,headers:{Authorization:token}});expect(response.status).toBe(401);
   }
  }
  expect(provider).not.toHaveBeenCalled();expect(await t.run(ctx=>ctx.db.query('aiLimits').take(10))).toEqual([]);
 }finally{vi.unstubAllGlobals();}
});
test('new accounts cannot see legacy dev days or another manager’s day, even with their browser key',async()=>{
 const t=convexTest(schema,modules),a=t.withIdentity({subject:'manager-a|session'}),b=t.withIdentity({subject:'manager-b|session'});
 const body={raw:makeRaw(),date,sources:[1,2,3,4,5],dsrSources:[1],choices:[],corrections:[],expectedVersion:null};
 const result=await a.fetch('/days/confirm',{method:'POST',body:JSON.stringify(body)});expect(result.status).toBe(200);
 const original=await t.run(ctx=>ctx.db.query('confirmedDays').take(1));
 await t.run(async ctx=>{await ctx.db.insert('confirmedDays',{...{scope:'legacy-browser-hash',date:'2026-11-01',version:original[0].version,confirmedAt:1}});});
 expect((await (await b.fetch('/days/history')).json()).days).toEqual([]);
 expect((await b.fetch(`/days/detail?date=${date}`)).status).toBe(404);
 const otherSave=await b.fetch('/days/confirm',{method:'POST',body:JSON.stringify({...body,corrections:[{id:'3:0',amount:6100}]})});expect(otherSave.status).toBe(200);
 const otherDay=(await (await b.fetch(`/days/detail?date=${date}`)).json()).day;expect(otherDay.lines.find((line:{id:string})=>line.id==='3:0').correctedValue).toBe(6100);
 const firstDay=(await (await a.fetch(`/days/detail?date=${date}`)).json()).day;expect(firstDay.lines.find((line:{id:string})=>line.id==='3:0')).not.toHaveProperty('correctedValue');
 expect((await (await a.fetch('/days/history')).json()).days.map((d:{date:string})=>d.date)).toEqual([date]);
 expect(await t.run(ctx=>ctx.db.query('confirmedDays').withIndex('by_scope_date',q=>q.eq('scope','legacy-browser-hash')).take(1))).toHaveLength(1);
});
