import {expect,test} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {propertyAccount} from './property-test-fixture';
import {comparisonReadingFromRaw,type Context} from '../src/comparison';
import {prepareDay,type Correction,type DaySnapshot} from '../src/confirmed-day';
import {makeRaw} from './comparison-fixture';

const modules=import.meta.glob('../convex/**/*.ts');
const date='2026-11-02';
const titles=['Room charges','Food charges','Guest cash received','Guest UPI received'] as const;
const roles:Context['role'][]=['Room charge','Food charge','Guest payment','Guest payment'];
const methods:Context['method'][]=['Not identified','Not identified','Cash','UPI'];
const fixture=(amounts:(number|null)[]=[12500,3750,4000,12250],uncertain=-1)=>{
 const documents=[{source:1,kind:'Daily sheet',date,lines:amounts.map((amount,index)=>({section:index<2?'Sales':'Payment',label:titles[index],amount,unclear:index===uncertain}))}];
 const contexts:Context[]=amounts.map((_,line)=>({source:1,line,role:roles[line],party:null,purpose:null,billRef:null,transactionRef:null,method:methods[line],unclear:false}));
 return makeRaw(documents,contexts);
};
const snapshot=(raw=fixture(),corrections:Correction[]=[])=>prepareDay(comparisonReadingFromRaw(raw,date,[1],[1]),corrections,[]);
const setup=async()=>{
 const t=convexTest(schema,modules);
 return {t,manager:await propertyAccount(t)};
};
type Manager=Awaited<ReturnType<typeof setup>>['manager'];
async function confirm(manager:Manager,raw=fixture(),corrections:Correction[]=[],sources=[1]){
 const response=await manager.fetch('/days/confirm',{method:'POST',body:JSON.stringify({raw,date,sources,dsrSources:[1],choices:[],corrections,expectedVersion:null})});
 expect(response.status).toBe(200);
 return response.json();
}
async function detail(manager:Manager){
 const response=await manager.fetch(`/days/detail?date=${date}`);
 expect(response.status).toBe(200);
 return (await response.json()).day;
}
async function insertLegacy(t:Awaited<ReturnType<typeof setup>>['t'],day:DaySnapshot){
 return t.run(async ctx=>{
  const version=await ctx.db.insert('confirmedVersions',{scope:(await ctx.db.query('properties').take(1))[0].dataScope,date,confirmedAt:1800000000000,previousVersion:null,snapshot:day});
  await ctx.db.insert('confirmedDays',{scope:(await ctx.db.query('properties').take(1))[0].dataScope,date,version,confirmedAt:1800000000000});
  return version;
 });
}

test.each([
 {amounts:[12500,3750,4000,12250],status:'Matched',sales:16250,money:16250,difference:0},
 {amounts:[12500,3750,4000,12000],status:'Difference',sales:16250,money:16000,difference:-250},
 {amounts:[12500,3750,4250,12250],status:'Difference',sales:16250,money:16500,difference:250},
 {amounts:[0,0,0,0],status:'Matched',sales:0,money:0,difference:0},
 {amounts:[0.1,0.2,0.3,0],status:'Matched',sales:0.3,money:0.3,difference:0},
 {amounts:[0.1,0.2,0.29,0],status:'Difference',sales:0.3,money:0.29,difference:-0.01},
 {amounts:[0.1,0.2,0.31,0],status:'Difference',sales:0.3,money:0.31,difference:0.01},
])('saved detail calculates integer-paise sales $sales against money $money with $difference difference',async({amounts,status,sales,money,difference})=>{
 const {manager}=await setup();
 await confirm(manager,fixture(amounts));
 const day=await detail(manager);
 expect(day.salesMoneyCheck).toEqual({status,sales,money,difference});
 // These DSR amounts exist without supporting bills; that separate incomplete check is unchanged.
 expect(day.checks.every((check:{status:string})=>check.status==='Not enough information')).toBe(true);
});

test.each(titles.map((title,index)=>({title,index})))('a missing $title amount stays incomplete instead of becoming zero',async({index})=>{
 const {manager}=await setup();const amounts:(number|null)[]=[12500,3750,4000,12250];amounts[index]=null;
 await confirm(manager,fixture(amounts));
 expect((await detail(manager)).salesMoneyCheck).toEqual({status:'Not enough information',sales:index<2?null:16250,money:index<2?16250:null,difference:null});
});

test.each(titles.map((title,index)=>({title,index})))('a legacy snapshot without the $title saved check stays incomplete',async({index})=>{
 const {t,manager}=await setup();const legacy=snapshot();legacy.checks=legacy.checks.filter(check=>check.title!==titles[index]);
 await insertLegacy(t,legacy);
 expect((await detail(manager)).salesMoneyCheck).toEqual({status:'Not enough information',sales:index<2?null:16250,money:index<2?16250:null,difference:null});
});

test.each(titles.map((title,index)=>({title,index})))('a still-uncertain $title value blocks a legacy numeric total',async({index})=>{
 const {t,manager}=await setup();const legacy=snapshot();legacy.lines[index].unclear=true;
 await insertLegacy(t,legacy);
 expect((await detail(manager)).salesMoneyCheck).toEqual({status:'Not enough information',sales:index<2?null:16250,money:index<2?16250:null,difference:null});
});

test.each(titles.map((title,index)=>({title,index})))('a newly confirmed uncertain $title stays incomplete',async({index})=>{
 const {manager}=await setup();
 await confirm(manager,fixture([12500,3750,4000,12250],index));
 const day=await detail(manager);
 expect(day.salesMoneyCheck).toEqual({status:'Not enough information',sales:index<2?null:16250,money:index<2?16250:null,difference:null});
 expect(day.lines[index].unclear).toBe(true);
 expect(day.checks.find((check:{title:string})=>check.title===titles[index]).dsr).toBeNull();
});

test('manager-corrected saved values replace the original uncertain amounts without changing their history',async()=>{
 const {manager}=await setup();
 const raw=fixture([999,3750,4000,12250],0);
 await confirm(manager,raw,[{id:'1:0',amount:12500}]);
 const day=await detail(manager);
 expect(day.salesMoneyCheck).toEqual({status:'Matched',sales:16250,money:16250,difference:0});
 expect(day.lines[0]).toMatchObject({aiValue:999,correctedValue:12500,aiUnclear:true,unclear:false});
 expect(day.aiReading.documents[0].lines[0]).toMatchObject({amount:999,unclear:true});
 expect(day.checks.find((check:{title:string})=>check.title===titles[0]).dsr).toBe(12500);
});

test('supporting evidence and unrelated saved uncertainty never replace or block the four DSR operands',async()=>{
 const {t,manager}=await setup();const legacy=snapshot();
 for(const check of legacy.checks){check.evidence=987654;check.difference=987654;check.status='Not enough information';}
 const contexts:Context[]=[
  {...legacy.aiReading.contexts[0],source:1,line:4,role:'Expense charge'},
  {...legacy.aiReading.contexts[0],source:1,line:5,role:'OTA payment'},
  {...legacy.aiReading.contexts[0],source:2,line:0},
 ];
 legacy.aiReading.contexts.push(...contexts);
 legacy.lines.push(...contexts.map((context,index)=>({...legacy.lines[0],id:`${context.source}:${context.line}`,source:context.source,section:index===0?'Expense' as const:index===1?'Payment' as const:'Sales' as const,unclear:true,aiUnclear:true,aiValue:987654})));
 await insertLegacy(t,legacy);
 expect((await detail(manager)).salesMoneyCheck).toEqual({status:'Matched',sales:16250,money:16250,difference:0});
});

test('a newly confirmed day ignores an uncertain supporting photo while preserving its existing evidence checks',async()=>{
 const {manager}=await setup();const raw=fixture(),answer=JSON.parse(raw.output[0].content[0].text);
 answer.documents.push({source:2,kind:'Guest bill',date,lines:[{section:'Sales',label:'Fabricated room bill',amount:999999,unclear:true}]});
 answer.contexts.push({...answer.contexts[0],source:2,line:0});raw.output[0].content[0].text=JSON.stringify(answer);
 await confirm(manager,raw,[],[1,2]);
 const day=await detail(manager);
 expect(day.salesMoneyCheck).toEqual({status:'Matched',sales:16250,money:16250,difference:0});
 expect(day.checks.find((check:{title:string})=>check.title===titles[0])).toMatchObject({dsr:12500,evidence:null,status:'Not enough information'});
});

test('uncertain expense, OTA and written-total DSR lines do not block available sales and guest money',async()=>{
 const {manager}=await setup();const raw=fixture(),answer=JSON.parse(raw.output[0].content[0].text);
 for(const [index,role] of ['Expense charge','OTA payment','Written total'].entries()){
  answer.documents[0].lines.push({section:index===0?'Expense':index===1?'Payment':'Sales',label:`Fabricated ${role}`,amount:null,unclear:true});
  answer.contexts.push({...answer.contexts[0],line:4+index,role});
 }
 raw.output[0].content[0].text=JSON.stringify(answer);
 await confirm(manager,raw);
 expect((await detail(manager)).salesMoneyCheck).toEqual({status:'Matched',sales:16250,money:16250,difference:0});
});

test('legacy relevant classification uncertainty or a missing saved contributing line cannot produce a match',async()=>{
 for(const missingLine of [false,true]){
  const {t,manager}=await setup();const legacy=snapshot();
  if(missingLine)legacy.lines=legacy.lines.slice(1);
  else legacy.aiReading.contexts[0].unclear=true;
  await insertLegacy(t,legacy);
  expect((await detail(manager)).salesMoneyCheck).toEqual({status:'Not enough information',sales:null,money:16250,difference:null});
 }
});

test('legacy detail derives the check without writing snapshots or versions and keeps account access enforced',async()=>{
 const {t,manager}=await setup(),legacy=snapshot();const version=await insertLegacy(t,legacy);
 const scope=await t.run(async ctx=>(await ctx.db.query('properties').take(1))[0].dataScope);
 const stored=()=>t.run(async ctx=>({days:await ctx.db.query('confirmedDays').withIndex('by_scope_date',q=>q.eq('scope',scope)).take(10),versions:await ctx.db.query('confirmedVersions').withIndex('by_scope_date',q=>q.eq('scope',scope)).take(10)}));
 const before=await stored();
 const day=await detail(manager);
 expect(day).toMatchObject({version,salesMoneyCheck:{status:'Matched',sales:16250,money:16250,difference:0}});
 expect(before.versions[0].snapshot).not.toHaveProperty('salesMoneyCheck');
 expect(await stored()).toEqual(before);
 expect((await (await propertyAccount(t,'other@example.invalid')).fetch(`/days/detail?date=${date}`)).status).toBe(404);
 expect((await t.fetch(`/days/detail?date=${date}`)).status).toBe(401);
 expect(await stored()).toEqual(before);
});
