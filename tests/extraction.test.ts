import { afterEach, expect, test, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';
import { BUSY, displayAmount, displayLineAmount, extractionFromRawResponse, validateExtraction, totalsBySection } from '../src/extraction';
const modules = import.meta.glob('../convex/**/*.ts');
// All records in this public fixture are fabricated.
const amounts = { lines: [
  { section: 'Sales', label: 'Room', amount: 4100, unclear: false },
  { section: 'Sales', label: 'Food', amount: 1250, unclear: false },
  { section: 'Payment', label: 'Online Pay', amount: 0, unclear: false },
  { section: 'Expense', label: 'Vendor bill', amount: null, unclear: true },
  { section: 'Cash balance', label: 'Last day C.B.', amount: 50, unclear: false },
] };
const image = new Uint8Array([255,216,255,224,0,0,0,0]);
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); vi.restoreAllMocks(); });
test('unreadable lines stay Not extracted while a written zero stays ₹0', () => {
  expect(displayAmount(validateExtraction(amounts).lines[3].amount)).toBe('Not extracted');
  expect(displayAmount(amounts.lines[2].amount)).toBe('₹0');
  for (const change of [{amount:'100'},{amount:undefined},{amount:1.001},{section:'UPI'},{unclear:'true'}]) expect(() => validateExtraction({lines:[{...amounts.lines[0],...change}]})).toThrow();
  expect(validateExtraction({lines:[{...amounts.lines[0],amount:null}]}).lines[0]).toEqual({...amounts.lines[0],amount:null,unclear:true});
  expect(validateExtraction({lines:[{section:null,label:null,amount:null,unclear:true}]}).lines[0].amount).toBeNull();
});
test('rolling app-wide quota blocks call 101 and allows calls after one hour', async () => {
  vi.useFakeTimers(); vi.setSystemTime(10000000);
  const t = convexTest(schema, modules);
  for (let i=0; i<100; i++) expect(await t.mutation(internal.limits.reserve, {})).toBe(true);
  expect(await t.mutation(internal.limits.reserve, {})).toBe(false);
  vi.setSystemTime(13600000);
  expect(await t.mutation(internal.limits.reserve, {})).toBe(true);
});
test('HTTP action sends the image to the requested model and retains the raw reply without saving photos', async () => {
  vi.stubEnv('OPENAI_API_KEY', 'fake-test-key');
  const raw = { status: 'completed', output: [{ type: 'reasoning' }, { type:'message', content:[{type:'output_text',text:JSON.stringify(amounts)}]}] };
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(raw)));
  vi.stubGlobal('fetch', fetchMock);
  const t = convexTest(schema, modules);
  const res = await t.fetch('/extract', {method:'POST', body:image});
  expect(res.status).toBe(200); expect(await res.json()).toEqual({extracted:amounts,totals:totalsBySection(validateExtraction(amounts)),raw});
  const body=JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.model).toBe('gpt-6-luna'); expect(body.reasoning).toEqual({effort:'low'}); expect(body.max_output_tokens).toBe(1500); expect(body.store).toBe(false);
  expect(body.input[0].content[1].image_url).toBe('data:image/jpeg;base64,/9j/4AAAAAA=');
  expect(await t.run(async ctx => await ctx.db.system.query('_storage').collect())).toEqual([]);
});
test('quota hit does not call OpenAI', async () => {
  vi.stubEnv('OPENAI_API_KEY', 'fake-test-key'); const mock=vi.fn(); vi.stubGlobal('fetch',mock);
  const t=convexTest(schema,modules);
  await t.run(async ctx => { await ctx.db.insert('aiLimits',{name:'extraction',calls:Array(100).fill(Date.now())}); });
  const res=await t.fetch('/extract',{method:'POST',body:image});
  expect(res.status).toBe(429); expect(await res.json()).toEqual({error:BUSY}); expect(mock).not.toHaveBeenCalled();
});
test('missing key and invalid upload never call OpenAI', async () => {
  vi.stubEnv('OPENAI_API_KEY',''); const mock=vi.fn(); vi.stubGlobal('fetch',mock);
  const t=convexTest(schema,modules);
  expect((await t.fetch('/extract',{method:'POST',body:image})).status).toBe(503);
  expect((await t.fetch('/extract',{method:'POST',body:'not a photo'})).status).toBe(400);
  expect((await t.fetch('/extract',{method:'POST',body:image,headers:{'Content-Length':'14680065'}})).status).toBe(413);
  expect(mock).not.toHaveBeenCalled();
});
test('truncated, invalid and failed AI replies return the retry message instead of fabricated amounts', async () => {
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');
  const t=convexTest(schema,modules);
  for (const raw of [{status:'incomplete',output:[]},{status:'completed',output:[]},{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({lines:[{...amounts.lines[0],amount:'unknown'}]})}]}]}]) {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(raw))));
    const res=await t.fetch('/extract',{method:'POST',body:image}); expect(res.status).toBe(503); expect(await res.json()).toEqual({error:BUSY,...(raw.status==='completed'?{code:raw.output.length?'invalid_amount':'invalid_json'}:{})});
  }
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Provider unavailable')));
  expect((await t.fetch('/extract',{method:'POST',body:image})).status).toBe(503);
});

test('failed scans identify token exhaustion and provider status without logging private provider data', async () => {
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');
  const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
  const t=convexTest(schema,modules);
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[{private:'PRIVATE-HOTEL-DATA'}]}))));
  const incomplete=await t.fetch('/extract',{method:'POST',body:image});
  expect(await incomplete.json()).toEqual({error:BUSY});
  expect(log).toHaveBeenLastCalledWith('dsr_scan_failed',{reason:'output_token_limit'});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('PRIVATE-HOTEL-DATA',{status:429})));
  const rejected=await t.fetch('/extract',{method:'POST',body:image});
  expect(await rejected.json()).toEqual({error:BUSY});
  expect(log).toHaveBeenLastCalledWith('dsr_scan_failed',{reason:'provider_http_error',providerStatus:429});
  expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE-HOTEL-DATA');
  expect(JSON.stringify(log.mock.calls)).not.toContain('fake-test-key');
});

test('multiple pages of one DSR are sent together in one AI call and use one quota slot', async () => {
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');
  const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(amounts)}]}]})));
  vi.stubGlobal('fetch',mock);
  const t=convexTest(schema,modules);
  const images=['data:image/jpeg;base64,/9j/4AAAAAA=','data:image/png;base64,iVBORw0KGgo='];
  const res=await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images})});
  expect(res.status).toBe(200); expect((await res.json()).extracted).toEqual(amounts);
  expect(mock).toHaveBeenCalledTimes(1);
  const request=JSON.parse(mock.mock.calls[0][1].body);
  expect(request.input[0].content.filter((item:{type:string})=>item.type==='input_image').map((item:{image_url:string})=>item.image_url)).toEqual(images);
  expect(await t.run(async ctx=>(await ctx.db.query('aiLimits').withIndex('by_name',q=>q.eq('name','extraction')).unique())?.calls.length)).toBe(1);
});
test('empty, excessive or invalid multi-photo uploads are rejected before charging', async () => {
  vi.stubEnv('OPENAI_API_KEY','fake-test-key'); const mock=vi.fn(); vi.stubGlobal('fetch',mock);
  const t=convexTest(schema,modules);
  for(const images of [[],Array(7).fill('data:image/jpeg;base64,/9j/4AAAAAA='),['data:image/jpeg;base64,bm90IGEgcGhvdG8='],['data:image/jpeg;base64,/9j/4AAAAAA=',null]]) {
    expect((await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images})})).status).toBe(400);
  }
  expect(mock).not.toHaveBeenCalled();
});

test('combined original photo size is enforced before the paid call', async () => {
  vi.stubEnv('OPENAI_API_KEY','fake-test-key');const mock=vi.fn();vi.stubGlobal('fetch',mock);
  const t=convexTest(schema,modules);
  const big='data:image/jpeg;base64,'+btoa('\xff\xd8\xff'+'a'.repeat(5*1024*1024));
  const response=await t.fetch('/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images:[big,big]})});
  expect(response.status).toBe(413);expect(mock).not.toHaveBeenCalled();
});

test('latest raw AI lines preserve labels and uncertainty, with explicit Indian rupees', () => {
  const lines={lines:[
    {section:'Sales',label:'  Food  ',amount:123456.25,unclear:false},
    {section:'Expense',label:'Electricity',amount:12345,unclear:true},
    {section:'Cash balance',label:'Last day C.B.',amount:null,unclear:true},
  ]};
  const raw={status:'completed',output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:JSON.stringify(lines)}]}]};
  expect(extractionFromRawResponse(raw)).toEqual(lines);
  expect(extractionFromRawResponse(raw).lines.map(displayLineAmount)).toEqual(['₹1,23,456.25','₹12,345?','Not extracted']);
  expect(displayAmount(-123456.25)).toBe('-₹1,23,456.25');
  expect(() => extractionFromRawResponse({...raw,status:'incomplete'})).toThrow();
  expect(() => extractionFromRawResponse({status:'completed',output:[]})).toThrow();
});
test('code adds section entries in paise, excludes written totals, and never treats uncertainty as zero', () => {
  const data=validateExtraction({lines:[
    {section:'Sales',label:'Room',amount:4100,unclear:false},
    {section:'Sales',label:'Food',amount:1250,unclear:false},
    {section:'Sales',label:'Total',amount:5350,unclear:false},
    {section:'Payment',label:'Online Pay',amount:0,unclear:false},
    {section:'Expense',label:'Vendor A',amount:0.1,unclear:false},
    {section:'Expense',label:'Vendor B',amount:0.2,unclear:false},
    {section:'Expense',label:'Vendor C',amount:12345,unclear:true},
    {section:'Cash balance',label:'Last day C.B.',amount:null,unclear:true},
  ]});
  expect(totalsBySection(data)).toEqual([
    {section:'Sales',total:5350,readableSubtotal:5350,incomplete:0},
    {section:'Payment',total:0,readableSubtotal:0,incomplete:0},
    {section:'Expense',total:null,readableSubtotal:0.3,incomplete:1},
    {section:'Cash balance',total:null,readableSubtotal:null,incomplete:1},
  ]);
  expect(totalsBySection({lines:[]}).every(item=>item.total===null)).toBe(true);
});

test('unassigned lines prevent complete section totals and overflowing totals are rejected', () => {
  const data=validateExtraction({lines:[{section:'Sales',label:'Room',amount:4100,unclear:false},{section:null,label:'Unknown heading',amount:20,unclear:true}]});
  expect(totalsBySection(data).every(summary=>summary.total===null)).toBe(true);
  expect(totalsBySection(data)[0].readableSubtotal).toBe(4100);
  const large=validateExtraction({lines:Array.from({length:100},()=>({section:'Sales',label:'Fabricated amount',amount:1e12,unclear:false}))});
  expect(()=>totalsBySection(large)).toThrow('Total exceeds safe range');
});


test('missing fields force uncertainty without changing source values or counting them in totals',()=>{
 for(const missing of [{amount:null},{label:null},{section:null}]){
  const source={...amounts.lines[0],...missing};const original=JSON.stringify(source);
  const read=validateExtraction({lines:[source]});
  expect(read.lines[0]).toEqual({...source,unclear:true});expect(JSON.stringify(source)).toBe(original);
  expect(totalsBySection(read).every(summary=>summary.total===null)).toBe(true);
 }
 expect(validateExtraction({lines:[amounts.lines[2]]}).lines[0]).toEqual(amounts.lines[2]);
 expect(()=>validateExtraction({lines:[{...amounts.lines[0],amount:null,unclear:null}]})).toThrow();
});
