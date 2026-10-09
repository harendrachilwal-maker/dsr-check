import {expect,test} from './manager-fixture';
import {buildComparison,comparisonReadingFromRaw} from '../../src/comparison';
import {comparisonDate as date,comparisonDocuments as documents,comparisonContexts as contexts,makeRaw} from '../comparison-fixture';
for(const width of [320,390,1280])test(`expense connections and sources work at ${width}px; context is free and raw stays original`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/');await page.getByLabel('Reporting date',{exact:true}).fill(date);
 const uncertain=contexts.map(context=>context.source===4?{...context,role:'Not identified',party:null,purpose:null,unclear:true}:context);
 const original=makeRaw(documents,uncertain);let calls=0,rechecks=0;
 await page.route('**/extract',async route=>{
  calls++;expect(route.request().postDataJSON().mode).toBe('compare');
  const raw=calls===1?original:makeRaw(documents.map(doc=>doc.source===3?{...doc,kind:'Not identified',lines:[]}:doc),contexts.filter(context=>context.source!==3));
  const reading=comparisonReadingFromRaw(raw,date,[1,2,3,4,5],[1]);
  await route.fulfill({contentType:'application/json',body:JSON.stringify({mode:'compare',raw,comparison:buildComparison(reading)})});
 });
 await page.route('**/compare',async route=>{
  rechecks++;const body=route.request().postDataJSON();expect(body.raw).toEqual(original);
  await route.fulfill({contentType:'application/json',body:JSON.stringify({comparison:buildComparison(comparisonReadingFromRaw(body.raw,date,body.sources,body.dsrSources),body.choices)})});
 });
 const buffer=await page.screenshot(),file=(number:number)=>({name:`fabricated-source-${number}.png`,mimeType:'image/png',buffer});
 await page.locator('#photo').setInputFiles(file(1));await page.locator('#other-photo').setInputFiles([file(2),file(3),file(4),file(5)]);await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();
 const checks=page.locator('#comparison');await expect(checks.getByRole('heading',{name:'Compare with the DSR',exact:true})).toBeVisible();
 const expenseCheck=checks.locator('.comparison-row').filter({has:page.getByRole('heading',{name:'Expenses',exact:true})});await expect(expenseCheck).toContainText('Not enough information');
 const entry=checks.locator('.context-entry').filter({has:page.locator('summary').filter({hasText:'Photo 4 — Paid to Example Painter'})});
 await entry.locator('summary').first().click();await entry.getByLabel('What does this entry represent?',{exact:true}).selectOption('Expense payment');await entry.getByLabel('Who was paid, or who paid you?',{exact:true}).fill('Example Painter');await entry.getByLabel('What was this payment or bill for?',{exact:true}).fill('Painting');await entry.getByLabel('Payment method',{exact:true}).selectOption('UPI');await entry.getByLabel('Which expense or other payment belongs with this payment?',{exact:true}).selectOption('3:0');await entry.getByRole('button',{name:'Use this context',exact:true}).click();
 await expect(expenseCheck).toContainText('Matched');expect(calls).toBe(1);expect(rechecks).toBe(1);
 const updated=checks.locator('.context-entry').filter({has:page.locator('summary').filter({hasText:'Photo 4 — Paid to Example Painter'})});await expect(updated).toHaveAttribute('open','');await expect(updated.getByRole('button',{name:'Use this context',exact:true})).toBeFocused();await expect(updated.getByText('Context supplied by you. Comparison updated.',{exact:true})).toBeVisible();
 const painter=checks.locator('.comparison-row').filter({has:page.getByRole('heading',{name:'Example Painter',exact:true})});await expect(painter).toContainText('UPI — ₹4,800');await expect(painter).toContainText('Cash — ₹1,200');await expect(painter.locator('dd')).toHaveText(['₹6,000','₹6,000','₹6,000']);
 await painter.getByText('View source photos',{exact:true}).click();await expect(painter.locator('img')).toHaveCount(3);await expect(painter.locator('img').first()).toBeVisible();

 await page.getByText('View raw AI response',{exact:true}).click();expect(JSON.parse(await page.locator('#raw').innerText())).toEqual(original);await expect(page.locator('#results')).not.toContainText('€');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByText('View raw AI response',{exact:true}).click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`.test-results/comparison-page-${width}.png`,fullPage:true});await checks.screenshot({path:`.test-results/comparison-results-${width}.png`});
 await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();await expect(expenseCheck).toContainText('Not enough information');await expect(checks).toContainText('Missing expense bill.');await expect(checks).not.toContainText('Context supplied by you');
 await page.getByLabel('Reporting date',{exact:true}).fill('2026-11-03');await expect(page.locator('#results')).toBeHidden();expect(await checks.textContent()).toBe('');expect(await page.locator('#raw').textContent()).toBe('');
});
test('independent supplied comparison cannot replace calculations from the latest raw response',async({page})=>{
 await page.goto('/');await page.getByLabel('Reporting date',{exact:true}).fill(date);const raw=makeRaw();let calls=0;
 await page.route('**/extract',route=>{calls++;const report=buildComparison(comparisonReadingFromRaw(raw,date,[1,2,3,4,5],[1]));if(calls===2)report.checks[5].evidence=999999;return route.fulfill({contentType:'application/json',body:JSON.stringify({mode:'compare',raw,comparison:report})});});
 const buffer=await page.screenshot(),file=(number:number)=>({name:`fabricated-${number}.png`,mimeType:'image/png',buffer});await page.locator('#photo').setInputFiles(file(1));await page.locator('#other-photo').setInputFiles([file(2),file(3),file(4),file(5)]);await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();await expect(page.getByRole('heading',{name:'Compare with the DSR',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('Busy right now. Try again in a few minutes.');await expect(page.locator('#results')).toBeHidden();expect(await page.locator('#comparison').textContent()).toBe('');expect(await page.locator('#raw').textContent()).toBe('');
});
test('other-date advances and refunds show their exclusion beside the amount',async({page})=>{
 await page.goto('/');await page.getByLabel('Reporting date',{exact:true}).fill(date);
 const docs=[...documents,{source:6,kind:'Guest bill',date:'2026-11-01',lines:[{section:'Payment',label:'Advance',amount:900,unclear:false}]}];
 const meta=[...contexts,{...contexts[0],source:6,role:'Advance received',unclear:true}];const raw=makeRaw(docs,meta);
 await page.route('**/extract',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({mode:'compare',raw,comparison:buildComparison(comparisonReadingFromRaw(raw,date,[1,2,3,4,5,6],[1]))})}));
 const buffer=await page.screenshot(),file=(number:number)=>({name:`fabricated-${number}.png`,mimeType:'image/png',buffer});await page.locator('#photo').setInputFiles(file(1));await page.locator('#other-photo').setInputFiles([file(2),file(3),file(4),file(5),file(6)]);await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();
 await expect(page.getByText('Advance received: ₹900? · Photo 6 — Different date 1 Nov 2026; excluded from this day',{exact:true})).toBeVisible();
});
