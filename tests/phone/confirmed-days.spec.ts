import { displayDate } from '../../src/date-display';
import { expect, test } from './manager-fixture';
import { comparisonReadingFromRaw, buildComparison } from '../../src/comparison';
import { prepareDay, type SavedDay } from '../../src/confirmed-day';
import { makeRaw, comparisonDate as date } from '../comparison-fixture';

for(const width of [320,390])test(`correct, confirm and reopen a saved day; replacement asks first at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/');await page.getByLabel('Reporting date',{exact:true}).fill(date);
 const raw=makeRaw();let calls=0;
 const original=comparisonReadingFromRaw(raw,date,[1,2,3,4,5],[1]);
 const corrected=prepareDay(original,[{id:'3:0',label:'Painting checked',amount:6100}],[],raw.output[0].content[0].text);
 const unchanged=prepareDay(original,[],[],raw.output[0].content[0].text);
 const openSavedDay=async()=>{
  await page.getByRole('button',{name:'History',exact:true}).click();
  const card=page.locator('.history-card').filter({has:page.getByRole('button',{name:displayDate(date),exact:true})});
  await expect(card.locator('.day-badge')).toBeVisible();
  const detail=page.waitForResponse(response=>new URL(response.url()).pathname==='/days/detail'&&new URL(response.url()).searchParams.get('date')===date);
  await card.getByRole('button',{name:displayDate(date),exact:true}).click();
  const response=await detail;expect(response.status()).toBe(200);
  const {day}=await response.json() as {day:SavedDay};
  await expect(page.locator('.day-receipt')).toBeVisible();
  await expect(page.locator('.receipt-amounts dd')).toHaveText(['Not read','Not read','Not read','Not read','₹21,000']);
  return day;
 };
 await page.route('**/extract',route=>{calls++;expect(route.request().url()).toContain('resilient-hamster-178.convex.site');return route.fulfill({contentType:'application/json',body:JSON.stringify({mode:'compare',raw,comparison:buildComparison(comparisonReadingFromRaw(raw,date,[1,2,3,4,5],[1]))})});});
 const buffer=await page.screenshot(),file=(n:number)=>({name:`fabricated-${n}.png`,mimeType:'image/png',buffer});
 await page.locator('#photo').setInputFiles(file(1));await page.locator('#other-photo').setInputFiles([file(2),file(3),file(4),file(5)]);await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();
 const row=page.locator('.dsr-document').filter({has:page.getByRole('heading',{name:'Photo 3 — Expense bill',exact:true})}).locator('.dsr-line').filter({has:page.locator('dt').filter({hasText:/^Painting$/})});
 await row.getByRole('button',{name:'Correct',exact:true}).click();await expect(page.getByRole('button',{name:'Confirm day',exact:true})).toBeDisabled();
 await row.getByLabel('Label',{exact:true}).fill('Painting checked');await row.getByLabel('Amount (₹)',{exact:true}).fill('6100');
 if(width===320){await page.route('**/compare',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Temporary check failure'})}));await row.getByRole('button',{name:'Save Correction',exact:true}).click();await expect(row.getByRole('alert')).toHaveText('Your correction could not be checked. Try again.');await expect(row.getByLabel('Amount (₹)',{exact:true})).toHaveValue('6100');await expect(row.getByLabel('Label',{exact:true})).toHaveValue('Painting checked');await page.unroute('**/compare');}
 await row.getByRole('button',{name:'Save Correction',exact:true}).click();await expect(page.getByText('Correction saved.',{exact:true})).toBeVisible();
 const changed=page.locator('.dsr-line').filter({has:page.locator('dt').filter({hasText:/^Painting checked$/})});await expect(changed).toContainText('₹6,100');await expect(changed).toContainText('AI value: ₹6,000');
 const check=page.locator('#comparison .comparison-row').filter({has:page.getByRole('heading',{name:'Expenses',exact:true})});await expect(check).toContainText('Difference');expect(calls).toBe(1);
 await page.getByRole('button',{name:'Confirm day',exact:true}).click();await expect(page.getByText(`Day confirmed and saved — ${displayDate(date)}.`,{exact:true})).toBeVisible();
 const saved=await openSavedDay();expect(saved).toMatchObject(corrected);
 expect(saved.lines.find(line=>line.id==='3:0')).toMatchObject({aiValue:6000,correctedValue:6100,aiLabel:'Painting',correctedLabel:'Painting checked'});
 expect(saved.checks.find(check=>check.title==='Expenses')?.status).toBe('Difference');expect(saved.writtenTotals).toEqual(corrected.writtenTotals);
 const history=page.locator('#history-page');await expect(history.locator('.day-receipt')).not.toContainText('AI value:');await expect(history.locator('.day-receipt')).not.toContainText('Written totals');
 await expect(page.getByRole('heading',{name:`Confirmed day — ${displayDate(date)}`,exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Back to History',exact:true})).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.reload();const reopened=await openSavedDay();expect(reopened).toMatchObject(corrected);expect(reopened.version).toBe(saved.version);
 await page.getByRole('button',{name:'Upload DSR',exact:true}).click();await page.getByLabel('Reporting date',{exact:true}).fill(date);
 await page.locator('#photo').setInputFiles(file(1));await page.locator('#other-photo').setInputFiles([file(2),file(3),file(4),file(5)]);await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();
 page.once('dialog',async dialog=>{expect(dialog.message()).toBe('Replace the saved day?');await dialog.dismiss();});
 await page.getByRole('button',{name:'Confirm day',exact:true}).click();await expect(page.getByText('Saved day kept. Your current corrections are still here.',{exact:true})).toBeVisible();
 const kept=await openSavedDay();expect(kept).toMatchObject(corrected);expect(kept.version).toBe(saved.version);
 await page.getByRole('button',{name:'Upload DSR',exact:true}).click();page.once('dialog',async dialog=>{expect(dialog.message()).toBe('Replace the saved day?');await dialog.accept();});
 await page.getByRole('button',{name:'Confirm day',exact:true}).click();await expect(page.getByText(`Day confirmed and saved — ${displayDate(date)}.`,{exact:true})).toBeVisible();
 const replaced=await openSavedDay();expect(replaced).toMatchObject(unchanged);expect(replaced.version).not.toBe(saved.version);expect(replaced.lines.find(line=>line.id==='3:0')).not.toHaveProperty('correctedValue');
 if(width===320){
  await page.getByRole('button',{name:'Upload DSR',exact:true}).click();await row.getByRole('button',{name:'Correct',exact:true}).click();await row.getByLabel('Amount (₹)',{exact:true}).fill('');await row.getByRole('button',{name:'Save Correction',exact:true}).click();await expect(row.locator('dd')).toHaveText('Not extracted');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Confirm day',exact:true}).click();await expect(page.getByText(`Day confirmed and saved — ${displayDate(date)}.`,{exact:true})).toBeVisible();
  const missing=await openSavedDay();expect(missing).toMatchObject(prepareDay(original,[{id:'3:0',amount:null}],[],raw.output[0].content[0].text));expect(missing.version).not.toBe(replaced.version);
  expect(missing.lines.find(line=>line.id==='3:0')).toMatchObject({aiValue:6000,correctedValue:null,unclear:true});
  await expect(history.locator('.receipt-needs')).toContainText('Painting: not read, please check.');await expect(history.locator('.day-receipt')).not.toContainText('Not extracted?');
 }
 await page.screenshot({path:`.test-results/history-${width}.png`,fullPage:true});
});
