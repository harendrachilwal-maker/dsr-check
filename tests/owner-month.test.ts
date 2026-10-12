import {expect,test} from 'vitest';
import {convexTest} from 'convex-test';
import {makeFunctionReference} from 'convex/server';
import schema from '../convex/schema';
import type {Id} from '../convex/_generated/dataModel';
import {aggregateOwnerMonth,monthBounds,validMonth} from '../convex/ownerReports';
import {prepareDay,type DaySnapshot} from '../src/confirmed-day';
import type {Reading,Context} from '../src/comparison';
import type {OwnerReceipt,OwnerValues} from '../src/owner-data';

// All records and amounts in this file are made up for testing, not hotel transcriptions.
const modules=import.meta.glob('../convex/**/*.ts');
const labels=['Room revenue','Food revenue','Guest cash','Guest UPI','Expenses'];
const roles:Context['role'][]=['Room charge','Food charge','Guest payment','Guest payment','Expense charge'];
const methods:Context['method'][]=['Not identified','Not identified','Cash','UPI','Not identified'];
const defaults:[number,number,number,number,number]=[12500,3750,4000,12250,500];
const refs=makeFunctionReference<'query',{scope:string;month:string},{date:string;version:Id<'confirmedVersions'>;confirmedAt:number}[]>('ownerReports:monthRefs');
const receipt=makeFunctionReference<'query',{scope:string;date:string;expectedVersion:Id<'confirmedVersions'>},OwnerReceipt|null>('ownerReports:receipt');
const fixture=(date='2026-10-10',amounts:(number|null)[]=defaults,uncertain=-1):DaySnapshot=>{
 const reading:Reading={date,dsrSources:[1],documents:[{source:1,kind:'Daily sheet',date,lines:amounts.map((amount,index)=>({section:index<2?'Sales':index<4?'Payment':'Expense',label:labels[index],amount,unclear:index===uncertain}))}],contexts:amounts.map((_,line)=>({source:1,line,role:roles[line],party:null,purpose:null,billRef:null,transactionRef:null,method:methods[line],unclear:false}))};
 return prepareDay(reading,[],[],'Fabricated AI answer, never exposed in owner data.');
};
const setup=()=>convexTest(schema,modules);
async function insert(t:ReturnType<typeof setup>,snapshot=fixture(),scope='manager:example-a',previousVersion:Id<'confirmedVersions'>|null=null){
 return t.run(async ctx=>{
  const confirmedAt=Date.parse(`${snapshot.date}T09:30:00Z`)+(previousVersion?1000:0);
  const version=await ctx.db.insert('confirmedVersions',{scope,date:snapshot.date,confirmedAt,previousVersion,snapshot});
  const existing=await ctx.db.query('confirmedDays').withIndex('by_scope_date',query=>query.eq('scope',scope).eq('date',snapshot.date)).unique();
  if(existing)await ctx.db.patch(existing._id,{version,confirmedAt});
  else await ctx.db.insert('confirmedDays',{scope,date:snapshot.date,version,confirmedAt});
  return {version,confirmedAt};
 });
}
const projected=(date='2026-10-10',values:OwnerValues={room:12500,food:3750,cash:4000,upi:12250,expenses:500},status:OwnerReceipt['salesMoneyCheck']['status']='Matched'):OwnerReceipt=>({date,version:`made-up-${date}`,confirmedAt:1800000000000,values,salesMoneyCheck:{status,sales:16250,money:status==='Difference'?16000:16250,difference:status==='Difference'?-250:status==='Matched'?0:null},needsChecking:[]});

test.each([
 ['2026-10',{start:'2026-10-01',end:'2026-11-01'}],
 ['2026-12',{start:'2026-12-01',end:'2027-01-01'}],
 ['2028-02',{start:'2028-02-01',end:'2028-03-01'}],
 ['0001-01',{start:'0001-01-01',end:'0001-02-01'}],
 ['9999-12',{start:'9999-12-01',end:'9999-13-01'}],
])('month %s has exact inclusive and exclusive query bounds',(month,bounds)=>{
 expect(validMonth(month as string)).toBe(true);
 expect(monthBounds(month as string)).toEqual(bounds);
});
test.each(['2026-1','2026-00','2026-13','0000-10','October 2026','2026-10-01','2026-10suffix',''])('invalid month %s cannot query or produce totals',month=>{
 expect(validMonth(month)).toBe(false);
 expect(()=>monthBounds(month)).toThrow('Choose a valid month.');
 expect(()=>aggregateOwnerMonth(month,[])).toThrow('Choose a valid month.');
});

test('indexed month references return only the selected manager and month, newest first',async()=>{
 const t=setup();
 await insert(t,fixture('2026-09-30'));
 const first=await insert(t,fixture('2026-10-01'));
 const last=await insert(t,fixture('2026-10-31'));
 await insert(t,fixture('2026-11-01'));
 await insert(t,fixture('2026-10-20'),'manager:example-b');
 expect(await t.query(refs,{scope:'manager:example-a',month:'2026-10'})).toEqual([{date:'2026-10-31',...last},{date:'2026-10-01',...first}]);
 expect(await t.query(refs,{scope:'manager:no-records',month:'2026-10'})).toEqual([]);
});
test.each([
 {month:'2028-02',inside:'2028-02-29',outside:'2028-03-01'},
 {month:'2026-12',inside:'2026-12-31',outside:'2027-01-01'},
])('indexed $month references include its final day and exclude the next month',async({month,inside,outside})=>{
 const t=setup(),saved=await insert(t,fixture(inside));await insert(t,fixture(outside));
 expect(await t.query(refs,{scope:'manager:example-a',month})).toEqual([{date:inside,...saved}]);
});

test('receipt uses saved corrected DSR values and strips original AI, evidence, source lines and raw responses',async()=>{
 const t=setup(),snapshot=fixture();
 snapshot.lines[0].aiValue=999;snapshot.lines[0].correctedValue=12500;snapshot.aiReading.documents[0].lines[0].amount=999;
 for(const check of snapshot.checks)check.evidence=987654;
 const {version,confirmedAt}=await insert(t,snapshot);
 const result=await t.query(receipt,{scope:'manager:example-a',date:snapshot.date,expectedVersion:version});
 expect(result).toEqual({date:snapshot.date,version,confirmedAt,values:{room:12500,food:3750,cash:4000,upi:12250,expenses:500},salesMoneyCheck:{status:'Matched',sales:16250,money:16250,difference:0},needsChecking:[]});
 expect(Object.keys(result!).sort()).toEqual(['confirmedAt','date','needsChecking','salesMoneyCheck','values','version']);
 expect(JSON.stringify(result)).not.toContain('Fabricated AI answer');
 expect(result).not.toHaveProperty('aiReading');expect(result).not.toHaveProperty('lines');expect(result).not.toHaveProperty('checks');
});
test('receipt preserves a corrected zero instead of substituting the original AI value',async()=>{
 const t=setup(),snapshot=fixture('2026-10-10',[0,0,0,0,0]);
 snapshot.lines[0].aiValue=999;snapshot.lines[0].correctedValue=0;snapshot.aiReading.documents[0].lines[0].amount=999;
 const {version}=await insert(t,snapshot);
 expect((await t.query(receipt,{scope:'manager:example-a',date:snapshot.date,expectedVersion:version}))?.values).toEqual({room:0,food:0,cash:0,upi:0,expenses:0});
});
test.each(labels.map((label,index)=>({label,index})))('missing saved $label remains null and produces a needs-checking warning',async({index})=>{
 const t=setup(),amounts:(number|null)[]=[...defaults];amounts[index]=null;const snapshot=fixture('2026-10-10',amounts);
 const {version}=await insert(t,snapshot),day=await t.query(receipt,{scope:'manager:example-a',date:snapshot.date,expectedVersion:version});
 const keys=['room','food','cash','upi','expenses'] as const;
 expect(day?.values[keys[index]]).toBeNull();expect(day?.needsChecking.length).toBeGreaterThan(0);
 expect(aggregateOwnerMonth('2026-10',[day!]).counts.missingAmounts).toBe(1);
});
test.each(labels.map((label,index)=>({label,index})))('uncertain saved $label does not become a monthly total',async({index})=>{
 const t=setup(),snapshot=fixture('2026-10-10',defaults,index);
 // A legacy snapshot may retain a numeric check even while its saved contributing amount is uncertain.
 snapshot.checks.find(check=>check.title===(['Room charges','Food charges','Guest cash received','Guest UPI received','Expenses'][index]))!.dsr=defaults[index];
 const {version}=await insert(t,snapshot),day=await t.query(receipt,{scope:'manager:example-a',date:snapshot.date,expectedVersion:version});
 const keys=['room','food','cash','upi','expenses'] as const;
 expect(day?.values[keys[index]]).toBeNull();
 expect(aggregateOwnerMonth('2026-10',[day!]).totals[keys[index]]).toBeNull();
});
test('missing, duplicated or source-less main checks cannot produce plausible owner figures',async()=>{
 for(const kind of ['missing','duplicate','source-less'] as const){
  const t=setup(),snapshot=fixture();
  if(kind==='missing')snapshot.checks=snapshot.checks.filter(check=>check.title!=='Room charges');
  else if(kind==='duplicate')snapshot.checks.push({...snapshot.checks[0]});
  else snapshot.checks[0].sources=[];
  const {version}=await insert(t,snapshot);
  expect((await t.query(receipt,{scope:'manager:example-a',date:snapshot.date,expectedVersion:version}))?.values.room).toBeNull();
 }
});

test('receipt rejects a different manager, stale version, different date and unreferenced version',async()=>{
 const t=setup(),snapshot=fixture(),old=await insert(t,snapshot),latest=await insert(t,fixture(snapshot.date,[15000,3750,4000,14750,500]),'manager:example-a',old.version);
 expect(await t.query(receipt,{scope:'manager:example-b',date:snapshot.date,expectedVersion:latest.version})).toBeNull();
 expect(await t.query(receipt,{scope:'manager:example-a',date:snapshot.date,expectedVersion:old.version})).toBeNull();
 expect(await t.query(receipt,{scope:'manager:example-a',date:'2026-10-11',expectedVersion:latest.version})).toBeNull();
 expect((await t.query(receipt,{scope:'manager:example-a',date:snapshot.date,expectedVersion:latest.version}))?.values.room).toBe(15000);
 expect(await t.query(refs,{scope:'manager:example-a',month:'2026-10'})).toEqual([{date:snapshot.date,...latest}]);
});
test('receipt rejects an inconsistent referenced scope, snapshot date or confirmation time',async()=>{
 for(const kind of ['scope','date','time'] as const){
  const t=setup(),snapshot=fixture(),{version}=await insert(t,snapshot);
  await t.run(async ctx=>{
   if(kind==='scope')await ctx.db.patch(version,{scope:'manager:example-b'});
   else if(kind==='date')await ctx.db.patch(version,{snapshot:{...snapshot,date:'2026-10-11'}});
   else await ctx.db.patch(version,{confirmedAt:1800000000999});
  });
  expect(await t.query(receipt,{scope:'manager:example-a',date:snapshot.date,expectedVersion:version})).toBeNull();
 }
});
test('owner month reads do not alter saved versions or manager history',async()=>{
 const t=setup(),snapshot=fixture(),{version}=await insert(t,snapshot);
 const before=await t.run(ctx=>ctx.db.get(version));
 await t.query(refs,{scope:'manager:example-a',month:'2026-10'});
 await t.query(receipt,{scope:'manager:example-a',date:snapshot.date,expectedVersion:version});
 expect(await t.run(ctx=>ctx.db.get(version))).toEqual(before);
});

test('month totals use integer paise, count each status and count missing days only once',()=>{
 const first=projected('2026-10-01',{room:0.1,food:1,cash:1,upi:0.1,expenses:5});
 const second=projected('2026-10-10',{room:0.2,food:2,cash:2,upi:0.2,expenses:6},'Difference');
 const third=projected('2026-10-20',{room:0,food:null,cash:0,upi:null,expenses:0},'Not enough information');
 const result=aggregateOwnerMonth('2026-10',[first,third,second]);
 expect(result).toMatchObject({month:'2026-10',confirmedDays:3,totals:{room:0.3,food:null,cash:3,upi:null,expenses:11},counts:{matches:1,check:1,incomplete:1,missingAmounts:1}});
 expect(result.days.map(day=>day.date)).toEqual(['2026-10-20','2026-10-10','2026-10-01']);
 expect(first.values.room).toBe(0.1); // Aggregation does not mutate its projected receipts.
});
test('an empty month has null totals and zero counts, while a confirmed all-zero day has real zero totals',()=>{
 expect(aggregateOwnerMonth('2026-10',[])).toEqual({month:'2026-10',confirmedDays:0,totals:{room:null,food:null,cash:null,upi:null,expenses:null},counts:{matches:0,check:0,incomplete:0,missingAmounts:0},days:[]});
 expect(aggregateOwnerMonth('2026-10',[projected('2026-10-10',{room:0,food:0,cash:0,upi:0,expenses:0})])).toMatchObject({totals:{room:0,food:0,cash:0,upi:0,expenses:0},counts:{missingAmounts:0}});
});
test('large decimal sums remain exact and totals outside the safe money range remain null',()=>{
 const large=aggregateOwnerMonth('2026-10',[projected('2026-10-01',{room:999999999999.99,food:0.1,cash:0,upi:0,expenses:0}),projected('2026-10-02',{room:999999999999.99,food:0.2,cash:0,upi:0,expenses:0})]);
 expect(large.totals.room).toBe(1999999999999.98);expect(large.totals.food).toBe(0.3);
 const unsafe=aggregateOwnerMonth('2026-10',[projected('2026-10-01',{room:50000000000000,food:0,cash:0,upi:0,expenses:0}),projected('2026-10-02',{room:50000000000000,food:0,cash:0,upi:0,expenses:0})]);
 expect(unsafe.totals.room).toBeNull();
});
test.each([
 {days:[projected('2026-09-30')]},
 {days:[projected('2026-11-01')]},
 {days:[projected('2026-10-32')]},
 {days:[projected('2026-10-10'),projected('2026-10-10')]},
])('inconsistent or duplicate month membership cannot produce totals',({days})=>{
 expect(()=>aggregateOwnerMonth('2026-10',days)).toThrow('The saved days changed.');
});
test('February rejects impossible days while allowing leap-year days',()=>{
 expect(()=>aggregateOwnerMonth('2026-02',[projected('2026-02-29')])).toThrow();
 expect(()=>aggregateOwnerMonth('2028-02',[projected('2028-02-29')])).not.toThrow();
});
test('duplicate indexed confirmed days block the complete month read instead of counting twice',async()=>{
 const t=setup(),snapshot=fixture(),saved=await insert(t,snapshot);
 await t.run(ctx=>ctx.db.insert('confirmedDays',{scope:'manager:example-a',date:snapshot.date,...saved}));
 await expect(t.query(refs,{scope:'manager:example-a',month:'2026-10'})).rejects.toThrow('The saved days changed.');
});
test('invalid indexed calendar dates block a complete month read',async()=>{
 const t=setup();await insert(t,fixture('2026-02-30'));
 await expect(t.query(refs,{scope:'manager:example-a',month:'2026-02'})).rejects.toThrow('The saved days changed.');
});
