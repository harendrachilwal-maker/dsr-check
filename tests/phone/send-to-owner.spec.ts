import {test,expect} from './manager-fixture';
import {makeRaw,comparisonDate as date,comparisonDocuments,comparisonContexts} from '../comparison-fixture';
import {comparisonReadingFromRaw,buildComparison} from '../../src/comparison';
import {ownerMessage} from '../../src/owner-message';
import type {SavedDay} from '../../src/confirmed-day';

function fabricatedReading(){
 const docs=structuredClone(comparisonDocuments),contexts=structuredClone(comparisonContexts);
 const labels=['Room Bills','Food Bills','Guest Cash','Guest UPI'],amounts=[12500,3750,4000,12250],roles=['Room charge','Food charge','Guest payment','Guest payment'];
 docs[0].lines.push(...labels.map((label,index)=>({label,amount:amounts[index],section:index<2?'Sales':'Payment',unclear:false})));
 contexts.push(...roles.map((role,index)=>({...comparisonContexts[0],source:1,line:index+1,role,method:index===2?'Cash':index===3?'UPI':'Not identified'})) as typeof contexts);
 docs[2].lines[0].unclear=true;
 return makeRaw(docs,contexts);
}
async function scan(page:import('@playwright/test').Page){
 const raw=fabricatedReading();let paidCalls=0;
 await page.route('**/extract',route=>{paidCalls++;return route.fulfill({contentType:'application/json',body:JSON.stringify({mode:'compare',raw,comparison:buildComparison(comparisonReadingFromRaw(raw,date,[1,2,3,4,5],[1]))})});});
 await page.getByLabel('Reporting date',{exact:true}).fill(date);
 const buffer=await page.screenshot(),file=(n:number)=>({name:`fabricated-owner-${n}.png`,mimeType:'image/png',buffer});
 await page.locator('#photo').setInputFiles(file(1));await page.locator('#other-photo').setInputFiles([file(2),file(3),file(4),file(5)]);
 await page.getByRole('button',{name:'Start AI Scanning',exact:true}).click();await expect(page.locator('#results')).toBeVisible();
 return ()=>paidCalls;
}
for(const width of [320,390,1280])test(`reachable confirmation and saved WhatsApp draft in review and History at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/');const calls=await scan(page);
 await expect(page.getByRole('link',{name:'Send to owner',exact:true})).toHaveCount(0);
 const confirm=page.getByRole('button',{name:'Confirm day',exact:true});
 for(const y of [0,1400,2800]){
  await page.evaluate(y=>scrollTo(0,y),y);
  await expect.poll(async()=>{const box=await confirm.boundingBox();return !!box&&box.y>=0&&box.y+box.height<=844;}).toBe(true);
 }
 const savedResponse=page.waitForResponse(response=>response.url().includes('/days/detail?date=')&&response.status()===200);
 await confirm.click();const saved=(await (await savedResponse).json()).day as SavedDay;
 await expect(page.getByRole('link',{name:'Send to owner',exact:true})).toBeVisible();
 const share=page.getByRole('link',{name:'Send to owner',exact:true});expect(new URL((await share.getAttribute('href'))!).searchParams.get('text')).toBe(ownerMessage(saved));
 expect(await share.getAttribute('target')).toBe('_blank');
 if(width===390){
  // Capture the handoff URL without opening a real contact or sending a message.
  await page.context().route('https://wa.me/**',route=>route.fulfill({contentType:'text/plain',body:'Test handoff only; no WhatsApp message was sent.'}));
  const opened=page.waitForEvent('popup');await share.click();const popup=await opened;await popup.waitForLoadState('domcontentloaded');
  expect(new URL(popup.url()).searchParams.get('text')).toBe(ownerMessage(saved));expect(await popup.evaluate(()=>window.opener)).toBeNull();await popup.close();
 }
 const history=page.getByRole('button',{name:'View History',exact:true});const box=await history.boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(844);
 await page.locator('#confirmation summary').click();await expect(page.locator('#confirmation pre')).toHaveText(ownerMessage(saved));
 await page.screenshot({path:`.test-results/owner-review-${width}.png`,fullPage:false});
 await history.click();await expect(page.locator('#confirmation')).not.toBeVisible();
 const card=page.locator('.history-card');await expect(card.getByRole('link',{name:'Send to owner',exact:true})).toBeVisible();
 expect(new URL((await card.getByRole('link',{name:'Send to owner',exact:true}).getAttribute('href'))!).searchParams.get('text')).toBe(ownerMessage(saved));
 await card.locator('summary').click();await expect(card.locator('pre')).toHaveText(ownerMessage(saved));await page.screenshot({path:`.test-results/owner-history-${width}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await card.getByRole('button',{name:'2 Nov 2026',exact:true}).click();await expect(page.locator('#history-page').getByRole('link',{name:'Send to owner',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Upload DSR',exact:true}).click();
 const row=page.locator('.dsr-line').filter({has:page.locator('dt').filter({hasText:/^Painting$/})});
 await row.getByRole('button',{name:'Correct',exact:true}).click();await expect(share).not.toBeVisible();await expect(confirm).toBeDisabled();
 await row.getByLabel('Amount (₹)',{exact:true}).fill('6300');await row.getByRole('button',{name:'Save Correction',exact:true}).click();
 await expect(page.getByText('Correction saved.',{exact:true})).toBeVisible();await expect(share).toHaveCount(0);
 page.once('dialog',dialog=>dialog.accept());await confirm.click();await expect(share).toBeVisible();
 expect(new URL((await share.getAttribute('href'))!).searchParams.get('text')).not.toContain('Painting: ₹6,000?');expect(calls()).toBe(1);
 await page.getByLabel('Reporting date',{exact:true}).fill('2026-11-03');await expect(share).toHaveCount(0);await expect(page.locator('#confirmation')).not.toBeVisible();
});

test('a saved draft read failure offers retry without sharing unsaved or invented figures',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await scan(page);
 await page.route('**/days/detail?date=*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Saved draft unavailable'})}));
 await page.getByRole('button',{name:'Confirm day',exact:true}).click();await expect(page.locator('#confirmation')).toContainText('Day confirmed and saved');
 await expect(page.locator('#confirmation').getByRole('alert')).toHaveText('Saved draft unavailable');await expect(page.getByRole('link',{name:'Send to owner',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'View History',exact:true})).toBeEnabled();
 await page.unroute('**/days/detail?date=*');await page.getByRole('button',{name:'Retry message',exact:true}).click();await expect(page.getByRole('link',{name:'Send to owner',exact:true})).toBeVisible();
});

test('a replaced saved version cannot be shared from an old confirmation or History card',async({page})=>{
 await page.goto('/');await scan(page);
 await page.route('**/days/detail?date=*',async route=>{const response=await route.fetch(),body=await response.json();body.day.version='fabricated-stale-version';await route.fulfill({response,json:body});});
 await page.getByRole('button',{name:'Confirm day',exact:true}).click();await expect(page.locator('#confirmation')).toContainText('This saved day changed. Open History for the latest version.');
 await expect(page.getByRole('link',{name:'Send to owner',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'View History',exact:true}).click();
 await expect(page.getByRole('button',{name:'Retry amounts',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Send to owner',exact:true})).toHaveCount(0);
 await page.unroute('**/days/detail?date=*');await page.getByRole('button',{name:'Retry amounts',exact:true}).click();await expect(page.getByRole('link',{name:'Send to owner',exact:true})).toBeVisible();
});

test('a late saved draft cannot return after the manager changes the reporting date',async({page})=>{
 await page.goto('/');await scan(page);let release!:()=>void;const hold=new Promise<void>(resolve=>release=resolve);
 let arrived!:()=>void;const fetched=new Promise<void>(resolve=>arrived=resolve);
 await page.route('**/days/detail?date=*',async route=>{const response=await route.fetch();arrived();await hold;await route.fulfill({response});});
 await page.getByRole('button',{name:'Confirm day',exact:true}).click();await fetched;
 await page.getByLabel('Reporting date',{exact:true}).fill('2026-11-03');
 const returned=page.waitForResponse('**/days/detail?date=*');release();await returned;
 await expect(page.getByRole('link',{name:'Send to owner',exact:true})).toHaveCount(0);await expect(page.locator('#confirmation')).not.toBeVisible();
});
