import {test,expect,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {makeRaw} from './comparison-fixture';
const modules=import.meta.glob('../convex/**/*.ts');
test('Last confirmed is the most recent confirmation in this account, even for an older document date',async()=>{
 const t=convexTest(schema,modules),manager=t.withIdentity({subject:'manager-a|session'}),other=t.withIdentity({subject:'manager-b|session'});
 const now=vi.spyOn(Date,'now');
 const save=async(date:string,expectedVersion:string|null=null)=>{
  const raw=makeRaw(),answer=JSON.parse(raw.output[0].content[0].text);answer.date=date;for(const doc of answer.documents)doc.date=date;raw.output[0].content[0].text=JSON.stringify(answer);
  const result=await manager.fetch('/days/confirm',{method:'POST',body:JSON.stringify({raw,date,sources:[1,2,3,4,5],dsrSources:[1],choices:[],corrections:[],expectedVersion})});expect(result.status).toBe(200);return result.json();
 };
 try{
  expect((await t.fetch('/days/latest')).status).toBe(401);
  expect(await (await manager.fetch('/days/latest')).json()).toEqual({day:null});
  now.mockReturnValue(1800000000000);const newer=await save('2026-11-05');
  now.mockReturnValue(1800000001000);await save('2026-10-10');
  expect(await (await manager.fetch('/days/latest')).json()).toMatchObject({day:{date:'2026-10-10',confirmedAt:1800000001000}});
  expect(await (await other.fetch('/days/latest')).json()).toEqual({day:null});
  now.mockReturnValue(1800000002000);await save('2026-11-05',newer.version);
  const {day}=await (await manager.fetch('/days/latest')).json();expect(day).toMatchObject({date:'2026-11-05',confirmedAt:1800000002000});
  expect(Object.keys(day).sort()).toEqual(['confirmedAt','date','version']);
  const history=await (await manager.fetch('/days/history')).json();expect(history.days.map((day:{date:string})=>day.date)).toEqual(['2026-11-05','2026-10-10']);
 }finally{now.mockRestore();}
});
