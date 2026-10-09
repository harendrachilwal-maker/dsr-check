import { afterEach, expect, test, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { selectDailyRow, validDate } from '../src/daily';
import { dailyFromRawResponse } from '../src/extraction';
const modules=import.meta.glob('../convex/**/*.ts');
const sheets=[{sheet:'Fabricated report',data:[['Date','ROOM','FOOD','UPI','CLOSING BALANCE CASH'],['1/11/26',999,999,999,999],['2/11/26',4100,1250,null,0]]}];
const values={date:'2026-11-02',lines:[{section:'Sales',label:'ROOM',amount:4100,unclear:false},{section:'Sales',label:'FOOD',amount:1250,unclear:false},{section:'Payment',label:'UPI',amount:null,unclear:true},{section:'Cash balance',label:'CLOSING BALANCE CASH',amount:0,unclear:false}]};
const raw={status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(values)}]}]};
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
test('selected Excel date preserves blank and zero, rejects absent, invalid or duplicate dates',()=>{
  expect(selectDailyRow(sheets,'2026-11-02').cells.map(cell=>cell.value)).toEqual([4100,1250,null,0]);
  expect(validDate('2026-02-30')).toBe(false);expect(validDate('2026-99-99')).toBe(false);
  expect(()=>selectDailyRow(sheets,'2026-11-03')).toThrow('No row');
  expect(()=>selectDailyRow([...sheets,...sheets],'2026-11-02')).toThrow('More than one row');
  expect(()=>dailyFromRawResponse(raw,'2026-11-01')).toThrow('Wrong reporting date');
  expect(dailyFromRawResponse(raw,'2026-11-02').lines[2].amount).toBeNull();
});
test('Excel backend sends only selected date to AI and rejects altered source values',async()=>{
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify(raw)));vi.stubGlobal('fetch',mock);
  const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});const request={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'sheet',date:'2026-11-02',sheets})};
  const response=await t.fetch('/extract',request);expect(response.status).toBe(200);
  expect((await response.json()).raw).toEqual(raw);
  const input=JSON.parse(mock.mock.calls[0][1].body).input;expect(JSON.stringify(input)).not.toContain('999');expect(JSON.stringify(input)).toContain('4100');
  const changed={...values,lines:values.lines.map(line=>line.label==='UPI'?{...line,amount:0}:line)};
  mock.mockResolvedValue(new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(changed)}]}]})));
  expect((await t.fetch('/extract',request)).status).toBe(503);
});
test('invalid or duplicate Excel dates never consume a paid call',async()=>{
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');const mock=vi.fn();vi.stubGlobal('fetch',mock);const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});
  for(const body of [{mode:'sheet',date:'2026-11-03',sheets},{mode:'sheet',date:'2026-11-02',sheets:[...sheets,...sheets]},{mode:'sheet',date:'invalid',images:['data:image/jpeg;base64,/9j/4AAAAAA=']}])expect((await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).status).toBe(400);
  expect(mock).not.toHaveBeenCalled();
});
test('sheet photo uses chosen date and retains raw answer instead of combining monthly rows',async()=>{
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify(raw)));vi.stubGlobal('fetch',mock);const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});
  const result=await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'sheet',date:'2026-11-02',images:['data:image/jpeg;base64,/9j/4AAAAAA=']})});
  expect(result.status).toBe(200);const request=JSON.parse(mock.mock.calls[0][1].body);expect(request.instructions).toContain('ignore every other date');expect(request.text.format.schema.properties.date.enum).toEqual(['2026-11-02']);
});
function form(kind='Guest bill',file='fabricated.pdf',contents='%PDF-1.4\nFabricated record only'){
  const body=new FormData();body.set('date','2026-11-02');body.set('kind',kind);body.append('files',new Blob([contents],{type:'application/pdf'}),file);return body;
}
test('supporting records are really stored by date and type without calling AI or exposing storage URLs',async()=>{
  const mock=vi.fn();vi.stubGlobal('fetch',mock);const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});
  const response=await t.fetch('/records',{method:'POST',body:form()});expect(response.status).toBe(200);const result=await response.json();expect(result.status).toBe('Uploaded — not checked');expect(JSON.stringify(result)).not.toContain('storageId');
  const saved=await t.run(ctx=>ctx.db.query('supportingRecords').withIndex('by_batch',q=>q.eq('batch',result.batch)).collect());expect(saved).toHaveLength(1);expect(saved[0].date).toBe('2026-11-02');expect(saved[0].kind).toBe('Guest bill');
  const bytes=await t.run(async ctx=>(await ctx.storage.get(saved[0].storageId))?.text());expect(bytes).toBe('%PDF-1.4\nFabricated record only');expect(mock).not.toHaveBeenCalled();
});
test('bad supporting files and exhausted upload quota do not store records',async()=>{
  const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});
  expect((await t.fetch('/records',{method:'POST',body:form('Guest bill','fake.pdf','not a PDF')})).status).toBe(400);
  expect((await t.fetch('/records',{method:'POST',body:form('Unknown kind')})).status).toBe(400);
  await t.run(ctx=>ctx.db.insert('aiLimits',{name:'records',calls:Array(25).fill(Date.now())}));
  expect((await t.fetch('/records',{method:'POST',body:form()})).status).toBe(429);
  expect(await t.run(ctx=>ctx.db.system.query('_storage').collect())).toEqual([]);
});


test('empty and whitespace-only Excel cells remain blank and fabricated zero is rejected',async()=>{
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});
  const incorrect={date:'2026-11-02',lines:[{section:'Payment',label:'UPI',amount:0,unclear:false}]};
  const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(incorrect)}]}]})));vi.stubGlobal('fetch',mock);
  for(const blank of ['', '   ']){
    const sheets=[{sheet:'Fabricated blanks',data:[['Date','UPI'],['2/11/26',blank]]}];
    expect(selectDailyRow(sheets,'2026-11-02').cells[0].value).toBeNull();
    expect((await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'sheet',date:'2026-11-02',sheets})})).status).toBe(503);
  }
});

const mixed={date:'2026-11-02',documents:[
  {source:1,kind:'Daily sheet',date:'2026-11-02',lines:values.lines},
  {source:2,kind:'Guest bill',date:null,lines:[{section:'Sales',label:'Bill total',amount:5350,unclear:false}]},
  {source:3,kind:'UPI record',date:'2026-11-02',lines:[{section:'Payment',label:'Received',amount:1000,unclear:false}]},
  {source:4,kind:'Expense bill',date:'2026-11-01',lines:[{section:'Expense',label:'Supplier',amount:450,unclear:false}]},
]};
test('mixed photos have separate source readings in one call; sheet blanks are not filled by receipts',async()=>{
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(mixed)}]}]})));vi.stubGlobal('fetch',mock);const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});
  const response=await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'bundle',date:mixed.date,images:Array(4).fill('data:image/jpeg;base64,/9j/4AAAAAA=')})});
  expect(response.status).toBe(200);const result=await response.json();expect(result.mode).toBe('bundle');expect(JSON.parse(result.raw.output[0].content[0].text)).toEqual(mixed);
  const sent=JSON.parse(mock.mock.calls[0][1].body);expect(sent.instructions).toContain('Do not treat bills or payment screenshots as pages');expect(sent.instructions).toContain('Never replace blank sheet cells');expect(sent.input[0].content.filter((item:{type:string})=>item.type==='input_image')).toHaveLength(4);expect(mock).toHaveBeenCalledTimes(1);
});
test('missing, duplicate, invented sources and wrong sheet dates are rejected; undated bills remain marked',async()=>{
  const {documentsFromRawResponse}=await import('../src/extraction');
  const raw=(documents:unknown)=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({date:mixed.date,documents})}]}]});
  expect(documentsFromRawResponse(raw(mixed.documents),mixed.date,[1,2,3,4])[1].date).toBeNull();
  for(const documents of [mixed.documents.slice(0,3),[mixed.documents[0],mixed.documents[0],...mixed.documents.slice(2)],mixed.documents.map(doc=>doc.source===2?{...doc,source:9}:doc),mixed.documents.map(doc=>doc.source===1?{...doc,date:'2026-11-01'}:doc)])expect(()=>documentsFromRawResponse(raw(documents),mixed.date,[1,2,3,4])).toThrow();
});
test('Excel with bill photos checks only the Excel source and never folds bills into its numbers',async()=>{
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');const documents=[{source:0,kind:'Daily sheet',date:values.date,lines:values.lines},mixed.documents[1]];documents[1]={...documents[1],source:1};
  const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({date:values.date,documents})}]}]})));vi.stubGlobal('fetch',mock);const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});
  const response=await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'bundle',date:values.date,sheets,images:['data:image/jpeg;base64,/9j/4AAAAAA=']})});expect(response.status).toBe(200);
  expect(JSON.stringify(JSON.parse(mock.mock.calls[0][1].body).input)).not.toContain('999');
});

test('auto photos read date from the DSR with no client date and still use one capped call',async()=>{
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(mixed)}]}]})));vi.stubGlobal('fetch',mock);const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});
  const response=await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'auto',images:Array(4).fill('data:image/jpeg;base64,/9j/4AAAAAA=')})});expect(response.status).toBe(200);expect((await response.json()).mode).toBe('auto');
  const sent=JSON.parse(mock.mock.calls[0][1].body);expect(sent.instructions).toContain('never from today');expect(sent.instructions).toContain('monthly table with multiple dates');expect(sent.text.format.schema.properties.date).toEqual({type:['string','null']});expect(mock).toHaveBeenCalledTimes(1);
});
test('auto dates require a DSR source, reject invented dates and conflicting DSRs, and preserve null',async()=>{
  const {autoDocumentsFromRawResponse}=await import('../src/extraction');
  const raw=(date:unknown,documents:unknown[])=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({date,documents})}]}]});
  expect(autoDocumentsFromRawResponse(raw(null,[{source:1,kind:'Daily sheet',date:null,lines:[]}]),[1]).date).toBeNull();
  expect(()=>autoDocumentsFromRawResponse(raw('2026-11-02',[{source:1,kind:'Guest bill',date:'2026-11-02',lines:[]}]),[1])).toThrow('Date has no DSR source');
  expect(()=>autoDocumentsFromRawResponse(raw(null,[{source:1,kind:'Daily sheet',date:null,lines:values.lines}]),[1])).toThrow();
  expect(()=>autoDocumentsFromRawResponse(raw('2026-02-30',[{source:1,kind:'Daily sheet',date:'2026-02-30',lines:[]}]),[1])).toThrow();
  expect(()=>autoDocumentsFromRawResponse(raw('2026-11-02',[{source:1,kind:'Daily sheet',date:'2026-11-02',lines:[]},{source:2,kind:'Handwritten DSR',date:'2026-11-03',lines:[]}]),[1,2])).toThrow('Conflicting DSR dates');
});
test('auto upload rejects date and Excel payloads before a paid call',async()=>{
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');const mock=vi.fn();vi.stubGlobal('fetch',mock);const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});
  for(const extra of [{date:'2026-11-02'},{sheets}])expect((await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'auto',images:['data:image/jpeg;base64,/9j/4AAAAAA='],...extra})})).status).toBe(400);
  expect(mock).not.toHaveBeenCalled();
});


test('dated split upload passes selected date and DSR role before one AI call',async()=>{
 vi.stubEnv('OPENAI_API_KEY','fake-test-key');const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(mixed)}]}]})));vi.stubGlobal('fetch',mock);const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});
 const response=await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'dated',date:mixed.date,dsrSources:[1],images:Array(4).fill('data:image/jpeg;base64,/9j/4AAAAAA=')})});expect(response.status).toBe(200);expect((await response.json()).mode).toBe('dated');
 const sent=JSON.parse(mock.mock.calls[0][1].body);expect(sent.instructions).toContain('DSR-designated photo sources are 1');expect(sent.instructions).toContain('Supporting photos must never supply');expect(sent.text.format.schema.properties.date.enum).toEqual([mixed.date]);expect(mock).toHaveBeenCalledTimes(1);
});
test('bad split date or DSR role is rejected before charging; bills cannot become the main report',async()=>{
 vi.stubEnv('OPENAI_API_KEY','fake-test-key');const mock=vi.fn();vi.stubGlobal('fetch',mock);const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});
 for(const extra of [{date:'invalid',dsrSources:[1]},{date:mixed.date,dsrSources:[]},{date:mixed.date,dsrSources:[2]},{date:mixed.date,dsrSources:[1,1]}])expect((await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'dated',images:['data:image/jpeg;base64,/9j/4AAAAAA='],...extra})})).status).toBe(400);
 expect(mock).not.toHaveBeenCalled();const {datedDocumentsFromRawResponse}=await import('../src/extraction');
 const raw=(documents:unknown[])=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({date:mixed.date,documents})}]}]});
 expect(()=>datedDocumentsFromRawResponse(raw([{source:1,kind:'Guest bill',date:mixed.date,lines:[]}]),mixed.date,[1],[1])).toThrow('DSR upload misclassified');
 expect(()=>datedDocumentsFromRawResponse(raw([{source:1,kind:'Not identified',date:null,lines:[]},{source:2,kind:'Daily sheet',date:mixed.date,lines:values.lines}]),mixed.date,[1,2],[1])).toThrow('Bill upload cannot replace DSR');
 expect(datedDocumentsFromRawResponse(raw([{source:1,kind:'Daily sheet',date:null,lines:[]}]),mixed.date,[1],[1]).documents[0].lines).toEqual([]);
});


test('validation diagnostics identify multi-photo rejection without leaking raw records',async()=>{
 vi.stubEnv('OPENAI_API_KEY','fake-test-key');const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
 const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});const mock=vi.fn();vi.stubGlobal('fetch',mock);
 const cases=[
  {documents:mixed.documents.slice(0,3),code:'document_count_mismatch'},
  {documents:[mixed.documents[0],mixed.documents[0],...mixed.documents.slice(2)],code:'invalid_document_source'},
  {documents:mixed.documents.map(doc=>doc.source===1?{...doc,date:'2026-11-01'}:doc),code:'dsr_date_mismatch'},
  {documents:mixed.documents.map(doc=>doc.source===2?{...doc,lines:[{section:'Sales',label:'private-test-record',amount:null,unclear:null}]}:doc),code:'missing_uncertainty'},
 ];
 for(const item of cases){
  mock.mockResolvedValue(new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({date:mixed.date,documents:item.documents})}]}]})));
  const response=await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'dated',date:mixed.date,dsrSources:[1],images:Array(4).fill('data:image/jpeg;base64,/9j/4AAAAAA=')})});
  expect(response.status).toBe(503);expect(await response.json()).toEqual({error:'Busy right now. Try again in a few minutes.',code:item.code});
  expect(warn).toHaveBeenLastCalledWith('dsr_scan_failed',{reason:'extraction_validation',code:item.code});
 }
 mock.mockResolvedValue(new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'private-test-record malformed JSON'}]}]})));
 const response=await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'dated',date:mixed.date,dsrSources:[1],images:['data:image/jpeg;base64,/9j/4AAAAAA=']})});
 expect((await response.json()).code).toBe('invalid_json');
 expect(JSON.stringify(warn.mock.calls)).not.toContain('private-test-record');expect(JSON.stringify(warn.mock.calls)).not.toContain('fake-test-key');expect(JSON.stringify(warn.mock.calls)).not.toContain('4100');
});


test('multi-photo missing-field reading succeeds while raw response is kept exactly',async()=>{
 vi.stubEnv('OPENAI_API_KEY','fake-test-key');
 const documents=[{...mixed.documents[0],lines:[{section:'Expense',label:'Vendor bill',amount:null,unclear:false}]},mixed.documents[1]];
 const raw={status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({date:mixed.date,documents})}]}]};
 const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify(raw)));vi.stubGlobal('fetch',mock);
 const t=convexTest(schema,modules).withIdentity({subject:"test-manager|test-session"});const response=await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'dated',date:mixed.date,dsrSources:[1],images:Array(2).fill('data:image/jpeg;base64,/9j/4AAAAAA=')})});
 expect(response.status).toBe(200);const reply=await response.json();expect(reply).toEqual({mode:'dated',raw});
 const {datedDocumentsFromRawResponse}=await import('../src/extraction');
 expect(datedDocumentsFromRawResponse(reply.raw,mixed.date,[1,2],[1]).documents[0].lines).toEqual([{section:'Expense',label:'Vendor bill',amount:null,unclear:true}]);expect(mock).toHaveBeenCalledTimes(1);
});
