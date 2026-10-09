import {expect,test} from './manager-fixture';
// All document contents below are fabricated. Provider replies are simulated, not paid calls.
const dsrDate='2026-11-02';
const lines=[{section:'Sales',label:'Room',amount:4100,unclear:false},{section:'Sales',label:'Food',amount:1250,unclear:false},{section:'Payment',label:'UPI',amount:0,unclear:false},{section:'Expense',label:'Vendor bill',amount:null,unclear:false},{section:'Cash balance',label:'Closing cash',amount:50,unclear:false}];
const raw=(date:string|null,documents:unknown[])=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({date,documents})}]}]});
for(const width of [320,390]){
 test(`separate DSR and other uploads use the selected date at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect(page.getByRole('button',{name:'Add DSR Photos',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Add Other Photos',exact:true})).toBeVisible();await page.getByLabel('Reporting date',{exact:true}).fill(dsrDate);
  expect(await page.locator('input[type=date]').count()).toBe(1);expect(await page.locator('select').count()).toBe(0);await expect(page.locator('#photo')).not.toHaveAttribute('accept',/xlsx/);await expect(page.getByRole('heading',{name:'Supporting records'})).toHaveCount(0);
  const documents=[{source:1,kind:'Daily sheet',date:dsrDate,lines},{source:2,kind:'Guest bill',date:null,lines:[{section:'Sales',label:'Bill total',amount:5350,unclear:false}]},{source:3,kind:'UPI record',date:dsrDate,lines:[{section:'Payment',label:'Received',amount:1000,unclear:false}]},{source:4,kind:'Expense bill',date:'2026-11-01',lines:[{section:'Expense',label:'Supplier',amount:450,unclear:false}]}];
  let fail=true;const requests:unknown[]=[];
  await page.route('**/extract',async route=>{
   const body=route.request().postDataJSON();requests.push(body);expect(body.mode).toBe('compare');expect(body.date).toBe(dsrDate);expect(body.dsrSources).toEqual([1]);expect(body.images).toHaveLength(4);
   await route.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify(fail?{error:'Busy right now. Try again in a few minutes.'}:{mode:'dated',date:'2099-01-01',extracted:{lines:[{label:'STALE',amount:999999}]},raw:raw(dsrDate,documents)})});
  });
  const buffer=await page.screenshot(),file=(name:string)=>({name:`fabricated-${name}.png`,mimeType:'image/png',buffer});
  await page.locator('#photo').setInputFiles(file('sheet'));await page.locator('#other-photo').setInputFiles([file('guest'),file('upi'),file('expense')]);
  await page.locator('#photo').setInputFiles([file('extra1'),file('extra2'),file('extra3')]);await expect(page.getByRole('alert')).toHaveText('Choose up to six DSR and bill photos.');await expect(page.getByText('4 of 6 photos · 10 MB total maximum')).toBeVisible();
  await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('Busy right now. Try again in a few minutes.');await expect(page.getByText('fabricated-guest.png',{exact:true})).toBeVisible();
  fail=false;await page.getByRole('button',{name:'Retry Scanning'}).click();
  await expect(page.getByRole('heading',{name:`Extracted Digital DSR — ${dsrDate}`})).toBeFocused();await expect(page.locator('.dsr-document')).toHaveCount(4);
  const sheet=page.locator('.dsr-document').nth(0),guest=page.locator('.dsr-document').nth(1),expense=page.locator('.dsr-document').nth(3);
  await expect(sheet.getByText('Not extracted',{exact:true})).toBeVisible();await expect(sheet.getByText('Unclear — check the original DSR.',{exact:true})).toBeVisible();await expect(sheet.getByText('₹0',{exact:true})).toBeVisible();await expect(sheet.getByText('₹50',{exact:true})).toBeVisible();await expect(sheet).not.toContainText('₹450');
  await expect(guest).toContainText('Date not extracted — check the original.');await expect(expense).toContainText('Different date: 2026-11-01 — not this day’s record.');await expect(page.locator('#results')).not.toContainText('999999');await expect(page.locator('#results')).not.toContainText('2099');await expect(page.locator('.section-total')).toHaveCount(0);
  expect(requests[0]).toEqual(requests[1]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.test-results/split-date-results-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Remove photo 4: fabricated-expense.png',exact:true}).click();await expect(page.locator('#results')).toBeHidden();expect(await page.locator('#raw').textContent()).toBe('');
 });
 test(`missing date or DSR prevents a call and a missing selected row is shown at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.goto('/');let calls=0;
  await page.route('**/extract',route=>{calls++;return route.fulfill({contentType:'application/json',body:JSON.stringify({mode:'dated',raw:raw(dsrDate,[{source:1,kind:'Daily sheet',date:null,lines:[]}])})});});
  await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('Choose the reporting date first.');expect(calls).toBe(0);
  await page.getByLabel('Reporting date',{exact:true}).fill(dsrDate);await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('Add the DSR photo before scanning.');expect(calls).toBe(0);
  await page.locator('#photo').setInputFiles({name:'fabricated-month.png',mimeType:'image/png',buffer:await page.screenshot()});await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();
  await expect(page.getByRole('heading',{name:`Extracted Digital DSR — ${dsrDate}`})).toBeVisible();await expect(page.locator('#status')).toHaveText('DSR row not extracted for this date. Check the selected date or upload a clearer DSR photo.');expect(await page.locator('dd').count()).toBe(0);
  await page.getByLabel('Reporting date',{exact:true}).fill('2026-11-03');await expect(page.locator('#results')).toBeHidden();expect(await page.locator('#raw').textContent()).toBe('');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.test-results/split-date-after-date-change-${width}.png`,fullPage:true});
 });
}
test('latest raw dated reading replaces amounts; wrong dates clear old results',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByLabel('Reporting date',{exact:true}).fill(dsrDate);let calls=0;
 const old={source:1,kind:'Handwritten DSR',date:dsrDate,lines:[{section:'Sales',label:'Old label',amount:999,unclear:false}]};
 const latest={source:1,kind:'Handwritten DSR',date:dsrDate,lines:[...lines,{section:'Sales',label:'Total',amount:5350,unclear:false},{section:'Expense',label:'Unclear amount',amount:12345,unclear:true}]};
 await page.route('**/extract',route=>{
  calls++;const reply=calls===3?raw('2026-11-03',[{...latest,date:'2026-11-03'}]):raw(calls===1?dsrDate:latest.date,[calls===1?old:latest]);
  return route.fulfill({contentType:'application/json',body:JSON.stringify({mode:'dated',extracted:{lines:[old]},totals:[{section:'Sales',total:999999}],raw:reply})});
 });
 await page.locator('#photo').setInputFiles({name:'fabricated-latest.png',mimeType:'image/png',buffer:await page.screenshot()});await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();await expect(page.getByText('Old label',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();await expect(page.getByText('Old label',{exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Extracted Digital DSR — 2026-11-02'})).toBeVisible();
 await expect(page.getByText('₹12,345?',{exact:true})).toBeVisible();await expect(page.getByText('Calculated total of entries: ₹5,350',{exact:true})).toBeVisible();await expect(page.locator('#results')).not.toContainText('€');await expect(page.locator('#results')).not.toContainText('999999');
 await page.getByText('View raw AI response',{exact:true}).click();expect(JSON.parse((JSON.parse(await page.locator('#raw').innerText())).output[0].content[0].text).documents).toEqual([latest]);
 await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('Busy right now. Try again in a few minutes.');await expect(page.locator('#results')).toBeHidden();expect(await page.locator('dd').count()).toBe(0);expect(await page.locator('#raw').textContent()).toBe('');
});
