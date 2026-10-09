import { expect, test } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { applyCorrections, prepareDay } from '../src/confirmed-day';
import { comparisonReadingFromRaw } from '../src/comparison';
import { makeRaw, comparisonDate as date } from './comparison-fixture';
const modules = import.meta.glob('../convex/**/*.ts');
const reading = () => comparisonReadingFromRaw(makeRaw(),date,[1,2,3,4,5],[1]);
const token = 'a'.repeat(64), otherToken = 'b'.repeat(64);
const request = (body:unknown, key=token) => ({method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(body)});
const body = (corrections:unknown[]=[]) => ({raw:makeRaw(),date,sources:[1,2,3,4,5],dsrSources:[1],choices:[],corrections,expectedVersion:null});

test('corrections preserve AI values, retain written totals and recalculate differences',()=>{
 const original=reading(), before=JSON.stringify(original);
 const corrections=[{id:'3:0',label:'Painting corrected',amount:6100}];
 const effective=applyCorrections(original,corrections);
 expect(effective.documents[2].lines[0]).toMatchObject({label:'Painting corrected',amount:6100});
 expect(JSON.stringify(original)).toBe(before);
 const saved=prepareDay(original,corrections,[]);
 expect(saved.lines.find(line=>line.id==='3:0')).toMatchObject({aiValue:6000,correctedValue:6100,aiLabel:'Painting',label:'Painting corrected'});
 expect(saved.writtenTotals.find(line=>line.id==='3:1')).toMatchObject({aiValue:6000});
 expect(saved.checks.find(check=>check.title==='Expenses')).toMatchObject({status:'Difference',difference:100});
 expect(()=>applyCorrections(original,[{id:'9:0',amount:0}])).toThrow();
 expect(()=>applyCorrections(original,[{id:'3:0',amount:NaN}])).toThrow();
 expect(()=>applyCorrections(original,[{id:'3:0',amount:1.001}])).toThrow();
});

test('blank amounts stay null and label-only corrections do not clear amount uncertainty',()=>{
 const original=reading();original.documents[2].lines[0].amount=null;original.documents[2].lines[0].unclear=true;
 expect(applyCorrections(original,[{id:'3:0',label:'Checked label'}]).documents[2].lines[0]).toMatchObject({amount:null,unclear:true});
 expect(applyCorrections(original,[{id:'3:0',amount:0}]).documents[2].lines[0]).toMatchObject({amount:0,unclear:false});
 const missingDate=reading();missingDate.documents[0].date=null;
 expect(()=>prepareDay(missingDate,[],[])).toThrow('The DSR document date must be read before confirming.');
});

test('a blank DSR cell remains Not extracted when the day is saved, never an invented zero',async()=>{
 const raw=makeRaw();const answer=JSON.parse(raw.output[0].content[0].text);
 answer.documents[0].lines.push({section:'Expense',label:'Other Bills',amount:null,unclear:false});
 answer.contexts.push({...answer.contexts[0],line:1});raw.output[0].content[0].text=JSON.stringify(answer);
 const t=convexTest(schema,modules);const response=await t.fetch('/days/confirm',request({...body(),raw}));expect(response.status).toBe(200);
 const {day}=await (await t.fetch(`/days/detail?date=${date}`,{headers:{Authorization:`Bearer ${token}`}})).json();
 const saved=day.lines.find((line:{id:string})=>line.id==='1:1');expect(saved.aiValue).toBeNull();expect(saved).not.toHaveProperty('correctedValue');
 expect(day.checks.find((check:{title:string})=>check.title==='Expenses').status).toBe('Not enough information');
 expect(day.aiAnswerText).toBe(raw.output[0].content[0].text);
});

test('confirmation persists without photos, protects history and requires explicit version replacement',async()=>{
 const t=convexTest(schema,modules);
 const first=await t.fetch('/days/confirm',request(body([{id:'3:0',amount:6100}])));
 expect(first.status).toBe(200);const one=await first.json();expect(one.status).toBe('saved');
 const second=await t.fetch('/days/confirm',request(body()));
 expect(second.status).toBe(409);expect(await second.json()).toMatchObject({status:'exists',version:one.version});
 const headers={Authorization:`Bearer ${token}`};
 const detail=await (await t.fetch(`/days/detail?date=${date}`,{headers})).json();
 expect(detail.day.lines.find((line:{id:string})=>line.id==='3:0').correctedValue).toBe(6100);
 expect(detail.day.confirmedAt).toBeGreaterThan(0);
 expect((await t.fetch(`/days/detail?date=${date}`,{headers:{Authorization:`Bearer ${otherToken}`}})).status).toBe(404);
 expect((await t.fetch('/days/history')).status).toBe(401);
 expect((await t.fetch('/days/confirm',request({...body(),images:['data:image/jpeg;base64,private']}))).status).toBe(400);
 const replacement=await t.fetch('/days/confirm',request({...body(),expectedVersion:one.version}));
 expect(replacement.status).toBe(200);const two=await replacement.json();expect(two.version).not.toBe(one.version);
 expect((await t.fetch('/days/confirm',request({...body(),expectedVersion:one.version}))).status).toBe(409);
 const list=await (await t.fetch('/days/history',{headers})).json();expect(list.days).toHaveLength(1);expect(list.days[0].date).toBe(date);
 const versions=await t.run(ctx=>ctx.db.query('confirmedVersions').withIndex('by_scope_date').take(10));expect(versions).toHaveLength(2);
 const stored=JSON.stringify(versions);expect(stored).not.toContain('data:image');expect(stored).not.toContain(token);
 expect(await t.run(ctx=>ctx.db.system.query('_storage').take(10))).toHaveLength(0);
});

test('History orders by document date, paginates and cannot mix browser scopes',async()=>{
 const t=convexTest(schema,modules);
 for(const dayDate of ['2026-11-03','2026-11-01','2026-11-04']){
  const raw=makeRaw(),answer=JSON.parse(raw.output[0].content[0].text);answer.date=dayDate;for(const doc of answer.documents)doc.date=dayDate;raw.output[0].content[0].text=JSON.stringify(answer);
  expect((await t.fetch('/days/confirm',request({...body(),date:dayDate,raw}))).status).toBe(200);
 }
 const list=await (await t.fetch('/days/history',{headers:{Authorization:`Bearer ${token}`}})).json();expect(list.days.map((day:{date:string})=>day.date)).toEqual(['2026-11-04','2026-11-03','2026-11-01']);
 const isolated=await (await t.fetch('/days/history',{headers:{Authorization:`Bearer ${otherToken}`}})).json();expect(isolated.days).toEqual([]);
});
