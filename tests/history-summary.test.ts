import {test,expect} from 'vitest';
import {historySummary,historyStatus} from '../src/history-summary';
import type {Check} from '../src/comparison';
const check=(title:string,dsr:number|null):Check=>({title,dsr,evidence:999999,difference:null,status:'Not enough information',note:'Fabricated',sources:[]});
test('History status uses saved checks only and never treats missing or incomplete checks as a match',()=>{
 const titles=['Room charges','Food charges','Guest cash received','Guest UPI received','OTA money received','Expenses'];
 const checks=titles.map(title=>({...check(title,0),status:'Matched' as const}));
 const before=JSON.stringify(checks);
 expect(historyStatus({checks})).toEqual({label:'Matches',tone:'matches'});
 expect(historyStatus({checks:checks.map((item,index)=>index===0?{...item,status:'Difference'}:item)}).label).toBe('Check');
 expect(historyStatus({checks:checks.map((item,index)=>index===0?{...item,status:'Not enough information'}:item)})).toEqual({label:'Not enough info',tone:'incomplete'});
 expect(historyStatus({checks:checks.map((item,index)=>index===0?{...item,status:'Not enough information'}:index===1?{...item,status:'Difference'}:item)}).label).toBe('Not enough info');
 expect(historyStatus({checks:[]})).toEqual({label:'Not enough info',tone:'incomplete'});
 expect(historyStatus({checks:checks.slice(0,1)}).label).toBe('Not enough info');
 expect(JSON.stringify(checks)).toBe(before);
});
test('History cards use only saved DSR amounts, including zero and missing fields, never supporting totals',()=>{
 expect(historySummary({checks:[check('Room charges',12500),check('Food charges',3750),check('Guest cash received',0),check('Guest UPI received',null),check('Expenses',21000)]})).toEqual([
  {label:'Room revenue',value:'₹12,500'},{label:'Food revenue',value:'₹3,750'},{label:'Guest cash',value:'₹0'},{label:'Guest UPI',value:'Not extracted'},{label:'Expenses',value:'₹21,000'},
 ]);
 expect(historySummary({checks:[]}).every(metric=>metric.value==='Not extracted')).toBe(true);
});

test('History displays the confirmed correction rather than the original AI reading',async()=>{
 const {prepareDay}=await import('../src/confirmed-day');
 const {comparisonReadingFromRaw}=await import('../src/comparison');
 const {makeRaw,comparisonDate}=await import('./comparison-fixture');
 const reading=comparisonReadingFromRaw(makeRaw(),comparisonDate,[1,2,3,4,5],[1]);
 const saved=prepareDay(reading,[{id:'1:0',amount:21500}],[]);
 expect(saved.aiReading.documents[0].lines[0].amount).toBe(21000);
 expect(historySummary(saved).find(metric=>metric.label==='Expenses')?.value).toBe('₹21,500');
 const before=JSON.stringify(saved);historySummary(saved);expect(JSON.stringify(saved)).toBe(before);
});
