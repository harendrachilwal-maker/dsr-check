import { expect, test } from '@playwright/test';
import { comparisonReadingFromRaw, buildComparison } from '../../src/comparison';
import { makeRaw, comparisonDate as date } from '../comparison-fixture';

for(const width of [320,390])test(`correct, confirm and reopen a saved day; replacement asks first at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/');await page.getByLabel('Reporting date',{exact:true}).fill(date);
 const raw=makeRaw();let calls=0;
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
 await page.getByRole('button',{name:'Confirm day',exact:true}).click();await expect(page.getByText(`Day confirmed and saved — ${date}.`,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'History',exact:true}).click();await page.getByRole('button',{name:date,exact:true}).click();
 const history=page.locator('#history-page');await expect(history).toContainText('Corrected value: ₹6,100');await expect(history).toContainText('AI value: ₹6,000');await expect(history).toContainText('Differs');await expect(history).toContainText('Written totals');
 await expect(page.getByRole('heading',{name:`Confirmed day — ${date}`,exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Back to History',exact:true})).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.reload();await page.getByRole('button',{name:'History',exact:true}).click();await page.getByRole('button',{name:date,exact:true}).click();await expect(history).toContainText('Corrected label: Painting checked');
 await page.getByRole('button',{name:'Upload DSR',exact:true}).click();await page.getByLabel('Reporting date',{exact:true}).fill(date);
 await page.locator('#photo').setInputFiles(file(1));await page.locator('#other-photo').setInputFiles([file(2),file(3),file(4),file(5)]);await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();
 page.once('dialog',async dialog=>{expect(dialog.message()).toBe('Replace the saved day?');await dialog.dismiss();});
 await page.getByRole('button',{name:'Confirm day',exact:true}).click();await expect(page.getByText('Saved day kept. Your current corrections are still here.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'History',exact:true}).click();await page.getByRole('button',{name:date,exact:true}).click();await expect(history).toContainText('Corrected value: ₹6,100');
 await page.getByRole('button',{name:'Upload DSR',exact:true}).click();page.once('dialog',async dialog=>{expect(dialog.message()).toBe('Replace the saved day?');await dialog.accept();});
 await page.getByRole('button',{name:'Confirm day',exact:true}).click();await expect(page.getByText(`Day confirmed and saved — ${date}.`,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'History',exact:true}).click();await page.getByRole('button',{name:date,exact:true}).click();await expect(history).not.toContainText('Corrected value: ₹6,100');
 if(width===320){
  await page.getByRole('button',{name:'Upload DSR',exact:true}).click();await row.getByRole('button',{name:'Correct',exact:true}).click();await row.getByLabel('Amount (₹)',{exact:true}).fill('');await row.getByRole('button',{name:'Save Correction',exact:true}).click();await expect(row.locator('dd')).toHaveText('Not extracted');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Confirm day',exact:true}).click();await expect(page.getByText(`Day confirmed and saved — ${date}.`,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'History',exact:true}).click();await page.getByRole('button',{name:date,exact:true}).click();await expect(history).toContainText('Corrected value: Not extracted');await expect(history).not.toContainText('Not extracted?');
 }
 await page.screenshot({path:`.test-results/history-${width}.png`,fullPage:true});
});
