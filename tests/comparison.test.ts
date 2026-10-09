import {afterEach,expect,test,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {buildComparison,comparisonReadingFromRaw,type Choice} from '../src/comparison';
import {comparisonDocuments as documents,comparisonContexts as contexts,comparisonDate as date,makeRaw} from './comparison-fixture';
const modules=import.meta.glob('../convex/**/*.ts');
const reading=()=>comparisonReadingFromRaw(makeRaw(),date,[1,2,3,4,5],[1]);
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
test('one painter expense links online and cash payments without adding bill and payment twice',()=>{
 const result=buildComparison(reading());const painter=result.expenses.find(item=>item.party==='Example Painter')!;
 expect(painter).toMatchObject({bill:6000,paid:6000,amount:6000,missingBill:false,incomplete:false,sources:['3:0','4:0','5:0']});
 expect(result.checks.find(item=>item.title==='Expenses')).toMatchObject({status:'Matched',dsr:21000,evidence:21000,difference:0});
 expect(result.entries.find(entry=>entry.id==='3:1')?.role).toBe('Written total');
});
test('payment-only evidence never removes the missing-bill flag even when totals agree',()=>{
 const docs=documents.filter(doc=>doc.source!==3),meta=contexts.filter(context=>context.source!==3);
 const result=buildComparison(comparisonReadingFromRaw(makeRaw(docs,meta),date,[1,2,4,5],[1]));
 expect(result.expenses.find(item=>item.party==='Example Painter')).toMatchObject({bill:null,paid:6000,amount:6000,missingBill:true});
 expect(result.checks.find(item=>item.title==='Expenses')).toMatchObject({status:'Not enough information',dsr:21000,evidence:21000,difference:0});
});
test('matching equal amounts cannot establish a recipient or an expense connection',()=>{
 const meta=contexts.map(context=>context.source===4?{...context,party:null,purpose:null,billRef:null}:context);
 const result=buildComparison(comparisonReadingFromRaw(makeRaw(documents,meta),date,[1,2,3,4,5],[1]));
 expect(result.questions.some(question=>question.id==='4:0')).toBe(true);
 expect(result.checks.find(item=>item.title==='Expenses')?.status).toBe('Not enough information');
 const choices:Choice[]=[{id:'4:0',role:'Expense payment',party:'Example Painter',purpose:'Painting',method:'UPI',link:'3:0'}];
 expect(buildComparison(comparisonReadingFromRaw(makeRaw(documents,meta),date,[1,2,3,4,5],[1]),choices).expenses.find(item=>item.party==='Example Painter')?.paid).toBe(6000);
});
test('a conflicting bill reference cannot be overridden by matching payee and purpose',()=>{
 const meta=contexts.map(context=>context.source===4?{...context,billRef:'OTHER-BILL'}:context);
 const reading=comparisonReadingFromRaw(makeRaw(documents,meta),date,[1,2,3,4,5],[1]);
 const result=buildComparison(reading);
 expect(result.expenses.find(item=>item.party==='Example Painter'&&!item.missingBill)?.paid).toBe(1200);
 expect(result.checks.find(item=>item.title==='Expenses')?.status).toBe('Not enough information');
 expect(result.questions.some(question=>question.id==='4:0')).toBe(true);
 const choice:Choice={id:'4:0',role:'Expense payment',party:'Example Painter',purpose:'Painting',method:'UPI',link:'3:0'};
 expect(buildComparison(reading,[choice]).expenses.find(item=>item.party==='Example Painter'&&!item.missingBill)?.paid).toBe(6000);
});
test('unclear amounts cannot be repaired by context; missing dates and different dates remain excluded',()=>{
 const docs=documents.map(doc=>doc.source===4?{...doc,lines:doc.lines.map(line=>({...line,unclear:true}))}:doc);
 const choices:Choice[]=[{id:'4:0',role:'Expense payment',party:'Example Painter',purpose:'Painting',method:'UPI',link:'3:0'}];
 const result=buildComparison(comparisonReadingFromRaw(makeRaw(docs),date,[1,2,3,4,5],[1]),choices);
 expect(result.checks.find(item=>item.title==='Expenses')?.status).toBe('Not enough information');expect(result.expenses.find(item=>item.party==='Example Painter')?.amount).toBeNull();
 for(const dateValue of [null,'2026-11-01']){
  const changed=documents.map(doc=>doc.source===4?{...doc,date:dateValue}:doc);
  const report=buildComparison(comparisonReadingFromRaw(makeRaw(changed),date,[1,2,3,4,5],[1]));
  expect(report.checks.find(item=>item.title==='Expenses')?.status).toBe('Not enough information');expect(report.questions.some(question=>question.id==='4:0')).toBe(true);
 }
});
test('duplicate references are counted once and conflicting copies block complete checks',()=>{
 for(const amount of [6000,6100]){
  const docs=[...documents,{...documents[2],source:6,lines:[{...documents[2].lines[0],amount}]}],meta=[...contexts,{...contexts[2],source:6}];
  const result=buildComparison(comparisonReadingFromRaw(makeRaw(docs,meta),date,[1,2,3,4,5,6],[1]));
  expect(result.expenses.filter(item=>item.party==='Example Painter')).toHaveLength(1);
  expect(result.checks.find(item=>item.title==='Expenses')?.status).toBe(amount===6000?'Matched':'Not enough information');
 }
});
test('invalid context pointers, missing contexts, circular links and financial edits are rejected',()=>{
 expect(()=>comparisonReadingFromRaw(makeRaw(documents,contexts.slice(0,-1)),date,[1,2,3,4,5],[1])).toThrow('Missing comparison context');
 expect(()=>comparisonReadingFromRaw(makeRaw(documents,contexts.map(context=>context.source===4?{...context,line:999}:context)),date,[1,2,3,4,5],[1])).toThrow('Invalid context source');
 const choice:Choice={id:'4:0',role:'Expense payment',party:null,purpose:null,method:'UPI',link:'5:0'};
 expect(()=>buildComparison(reading(),[choice,{...choice,id:'5:0',link:'4:0'}])).toThrow('Circular');
 expect(()=>buildComparison(reading(),[{...choice,amount:999} as Choice])).toThrow('Invalid context answers');
 expect(()=>buildComparison(reading(),[{...choice,id:'1:0',link:null}])).toThrow('Cannot replace DSR');
 expect(()=>buildComparison(reading(),[{...choice,id:'3:1',link:null}])).toThrow('written total');
});
test('DSR difference is deterministic in paise and explicit zero is not missing',()=>{
 const docs=documents.map(doc=>doc.source===1?{...doc,lines:[{...doc.lines[0],amount:21000.25}]}:doc);
 expect(buildComparison(comparisonReadingFromRaw(makeRaw(docs),date,[1,2,3,4,5],[1])).checks.find(item=>item.title==='Expenses')).toMatchObject({status:'Difference',difference:-0.25});
 const zeroDocs=documents.slice(0,2).map(doc=>({...doc,lines:[{...doc.lines[0],amount:0}]}));
 expect(buildComparison(comparisonReadingFromRaw(makeRaw(zeroDocs,contexts.slice(0,2)),date,[1,2],[1])).checks.find(item=>item.title==='Expenses')).toMatchObject({status:'Matched',dsr:0,evidence:0,difference:0});
});
test('comparison extraction uses one capped call and returns raw plus code-calculated results',async()=>{
 vi.stubEnv('OPENAI_API_KEY','fake-test-key');const raw=makeRaw(),mock=vi.fn().mockResolvedValue(new Response(JSON.stringify(raw)));vi.stubGlobal('fetch',mock);
 const t=convexTest(schema,modules);const res=await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'compare',date,dsrSources:[1],images:Array(5).fill('data:image/jpeg;base64,/9j/4AAAAAA=')})});
 expect(res.status).toBe(200);expect(await res.json()).toEqual({mode:'compare',raw,comparison:buildComparison(reading())});expect(mock).toHaveBeenCalledTimes(1);
 const sent=JSON.parse(mock.mock.calls[0][1].body);expect(sent.max_output_tokens).toBe(6000);expect(sent.instructions).toContain('code calculates');expect(sent.text.format.schema.required).toContain('contexts');
});
test('context rechecks are calculated in Convex without an AI call or changes to raw amounts',async()=>{
 const mock=vi.fn();vi.stubGlobal('fetch',mock);const t=convexTest(schema,modules);
 const raw=makeRaw(),original=JSON.stringify(raw),choice:Choice={id:'4:0',role:'Expense payment',party:'Example Painter',purpose:'Painting',method:'UPI',link:'3:0'};
 const body={date,raw,sources:[1,2,3,4,5],dsrSources:[1],choices:[choice]};
 const response=await t.fetch('/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 expect(response.status).toBe(200);expect((await response.json()).comparison.entries.find((entry:{id:string})=>entry.id==='4:0').userContext).toBe(true);expect(JSON.stringify(raw)).toBe(original);expect(mock).not.toHaveBeenCalled();
 expect(await t.run(ctx=>ctx.db.query('aiLimits').withIndex('by_name',q=>q.eq('name','extraction')).unique())).toBeNull();
 expect((await t.fetch('/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,choices:[{...choice,amount:1}]})})).status).toBe(400);
});
test('guest cash and UPI cannot cancel each other; advances and refunds stay separate from receipts',()=>{
 const line=(label:string,amount:number)=>({section:'Payment',label,amount,unclear:false});
 const docs=[{source:1,kind:'Daily sheet',date,lines:[line('Cash',100),line('UPI',200)]},{source:2,kind:'UPI record',date,lines:[line('Cash received',200),line('UPI received',100),line('Advance',900),line('Refund',400)]}];
 const context=(source:number,line:number,role:typeof contexts[number]['role'],method:typeof contexts[number]['method'])=>({...contexts[0],source,line,role,method});
 const meta=[context(1,0,'Guest payment','Cash'),context(1,1,'Guest payment','UPI'),context(2,0,'Guest payment','Cash'),context(2,1,'Guest payment','UPI'),context(2,2,'Advance received','UPI'),context(2,3,'Refund paid','Cash')];
 const result=buildComparison(comparisonReadingFromRaw(makeRaw(docs,meta),date,[1,2],[1]));
 expect(result.checks.find(check=>check.title==='Guest cash received')).toMatchObject({status:'Difference',difference:100});
 expect(result.checks.find(check=>check.title==='Guest UPI received')).toMatchObject({status:'Difference',difference:-100});
});
test('possible duplicates without references and overlapping DSR photos cannot produce a match',()=>{
 const docs=[...documents,{...documents[1],source:6}];
 const meta=[...contexts.map(context=>context.source===2?{...context,billRef:null}:context),{...contexts[1],source:6,billRef:null}];
 const result=buildComparison(comparisonReadingFromRaw(makeRaw(docs,meta),date,[1,2,3,4,5,6],[1]));
 expect(result.checks.find(check=>check.title==='Expenses')).toMatchObject({status:'Not enough information',evidence:null});
 const duplicateDsr=[...documents,{...documents[0],source:6}];
 expect(buildComparison(comparisonReadingFromRaw(makeRaw(duplicateDsr,[...contexts,{...contexts[0],source:6}]),date,[1,2,3,4,5,6],[1,6])).checks.every(check=>check.status==='Not enough information')).toBe(true);
});
test('distinct lines inside one bill are retained; repeated whole-bill photos count once',()=>{
 const line=(label:string)=>({section:'Sales',label,amount:100,unclear:false});
 const docs=[{source:1,kind:'Daily sheet',date,lines:[line('Room charges')]},{source:2,kind:'Guest bill',date,lines:[line('Room A'),line('Room B')]}];
 const context=(source:number,index:number)=>({...contexts[0],source,line:index,role:'Room charge' as const,party:'Example Guest',billRef:source===1?null:'G-F1'});
 const meta=[context(1,0),context(2,0),context(2,1)];
 const result=buildComparison(comparisonReadingFromRaw(makeRaw(docs,meta),date,[1,2],[1]));
 expect(result.checks.find(check=>check.title==='Room charges')).toMatchObject({status:'Difference',dsr:100,evidence:200,difference:100});
 const changed={...docs[1],lines:[docs[1].lines[0],{...docs[1].lines[1],amount:200}]};
 const repeated=buildComparison(comparisonReadingFromRaw(makeRaw([docs[0],changed,{...changed,source:3}],[...meta,context(3,0),context(3,1)]),date,[1,2,3],[1]));
 expect(repeated.checks.find(check=>check.title==='Room charges')?.evidence).toBe(300);
});
test('unidentified DSR and empty unreadable supporting photos never allow a complete match',()=>{
 const unknown=documents.map(doc=>doc.source===1?{...doc,kind:'Not identified'}:doc);
 const result=buildComparison(comparisonReadingFromRaw(makeRaw(unknown),date,[1,2,3,4,5],[1]));
 expect(result.checks.every(check=>check.status==='Not enough information'&&check.dsr===null)).toBe(true);
 const docs=[...documents,{source:6,kind:'Not identified',date,lines:[]}];
 const incomplete=buildComparison(comparisonReadingFromRaw(makeRaw(docs),date,[1,2,3,4,5,6],[1]));
 expect(incomplete.checks.every(check=>check.status==='Not enough information')).toBe(true);expect(incomplete.questions.some(question=>question.id==='6:document')).toBe(true);
});
