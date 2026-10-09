import {test,expect} from './manager-fixture';
import {makeRaw} from '../comparison-fixture';
import {displayDate} from '../../src/date-display';

// Fully fabricated days. Tests save through dev; they never call the AI provider.
function dayRaw(date:string,upi:number|null=12250){
 const labels=['Room Bills','Food Bills','Guest Cash','Guest UPI','OTA Pay','Expense Bills'];
 const roles=['Room charge','Food charge','Guest payment','Guest payment','OTA payment','Expense charge'];
 const amounts=[12500,3750,4000,12250,0,21000];
 const lines=labels.map((label,index)=>({section:index<2?'Sales':index<5?'Payment':'Expense',label,amount:amounts[index],unclear:false}));
 const documents=[{source:1,kind:'Daily sheet',date,lines},{source:2,kind:'Guest bill',date,lines:lines.slice(0,5).map((line,index)=>({...line,amount:index===3?upi:line.amount}))},{source:3,kind:'Expense bill',date,lines:[lines[5]]}];
 const contexts=documents.flatMap(doc=>doc.lines.map((_,line)=>{
  const index=doc.source===3?5:line;
  return {source:doc.source,line,role:roles[index],party:doc.source===1?null:'Example account',purpose:null,billRef:doc.source===1?null:`FAKE-${index}`,transactionRef:null,method:index===2?'Cash':index===3?'UPI':'Not identified',unclear:false};
 }));
 const raw=makeRaw(documents,contexts);raw.output[0].content[0].text=JSON.stringify({date,documents,contexts});return raw;
}

test('numbered steps, thumbnails, latest confirmation and all three saved status badges at 390px',async({page,request})=>{
 await page.setViewportSize({width:390,height:844});
 await expect(page.locator('#last-confirmed')).toHaveText('Last confirmed: None yet');
 const latest=page.waitForRequest('**/days/latest');await page.getByRole('button',{name:'Upload DSR',exact:true}).click();const authorization=(await latest).headers().authorization;
 const endpoint='https://resilient-hamster-178.convex.site';
 for(const [date,upi] of [['2026-11-12',12250],['2026-10-09',null],['2026-10-10',12000]] as const){
  expect((await request.post(`${endpoint}/days/confirm`,{headers:{Authorization:authorization},data:{raw:dayRaw(date,upi),date,sources:[1,2,3],dsrSources:[1],choices:[],corrections:[],expectedVersion:null}})).status()).toBe(200);
 }
 await page.getByRole('button',{name:'Upload DSR',exact:true}).click();await expect(page.locator('#last-confirmed')).toHaveText('Last confirmed: 10 Oct 2026');
 await expect(page.getByText('1 Reporting date',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'2 DSR photos',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'3 Other photos',exact:true})).toBeVisible();
 await page.getByLabel('Reporting date',{exact:true}).fill('2026-10-10');
 const png=Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=180;canvas.height=240;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,180,240);ctx.fillStyle='#17212F';ctx.font='16px sans-serif';ctx.fillText('Fabricated DSR',16,36);ctx.fillText('Test photo only',16,64);return canvas.toDataURL('image/png').split(',')[1];}),'base64');
 await page.locator('#photo').setInputFiles({name:'fabricated-dsr.png',mimeType:'image/png',buffer:png});await page.locator('#other-photo').setInputFiles({name:'fabricated-bill.png',mimeType:'image/png',buffer:png});
 await expect(page.getByText('2 of 6 photos · 10 MB total maximum',{exact:true})).toBeVisible();
 const thumbnails=page.locator('.upload-card .photo-row img');await expect(thumbnails).toHaveCount(2);
 for(const image of await thumbnails.all())expect((await image.boundingBox())!.height).toBeLessThanOrEqual(64);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'.test-results/home-steps-390.png',fullPage:true});
 await page.getByRole('button',{name:'History',exact:true}).click();
 await expect(page.locator('.history-month > h2')).toHaveText(['November 2026','October 2026']);
 await expect(page.locator('.day-badge')).toHaveText(['Matches','Check','Not enough info']);
 const cards=page.locator('.history-card');
 for(const card of await cards.all())await expect(card.locator('dd')).toHaveText(['₹12,500','₹3,750','₹4,000','₹12,250','₹21,000']);
 expect(await cards.evaluateAll(nodes=>nodes.map(node=>({tone:(node as HTMLElement).dataset.status,edge:getComputedStyle(node).borderLeftColor,badge:getComputedStyle(node.querySelector('.day-badge')!).color})))).toEqual([
  {tone:'matches',edge:'rgb(39, 103, 73)',badge:'rgb(39, 103, 73)'},{tone:'check',edge:'rgb(138, 90, 0)',badge:'rgb(138, 90, 0)'},{tone:'incomplete',edge:'rgb(85, 97, 107)',badge:'rgb(85, 97, 107)'},
 ]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'.test-results/history-months-390.png',fullPage:true});
 await page.getByRole('button',{name:'10 Oct 2026',exact:true}).click();await expect(page.getByRole('heading',{name:'Confirmed day — 10 Oct 2026',exact:true})).toBeFocused();
 await expect(page.locator('#history-page')).toContainText('Differs');await page.getByRole('button',{name:'Back to History',exact:true}).click();await expect(page.locator('.day-badge')).toHaveText(['Matches','Check','Not enough info']);
 await page.getByRole('button',{name:'Upload DSR',exact:true}).click();await expect(page.locator('#last-confirmed')).toHaveText('Last confirmed: 10 Oct 2026');await expect(thumbnails).toHaveCount(2);
 await page.getByRole('button',{name:'Remove photo 1: fabricated-dsr.png',exact:true}).click();await expect(thumbnails).toHaveCount(1);
});

test('History groups remain unique across pagination and never badges stale or failed saved reads',async({page})=>{
 const dates=['2027-01-04','2026-12-03','2026-12-02','2026-11-01'];
 await page.route('**/days/history*',route=>{
  const next=new URL(route.request().url()).searchParams.has('cursor');
  return route.fulfill({contentType:'application/json',body:JSON.stringify({days:(next?dates.slice(2):dates.slice(0,2)).map(date=>({date,version:date,confirmedAt:1800000000000})),cursor:next?null:'next'})});
 });
 await page.route('**/days/detail?date=*',route=>{
  const date=new URL(route.request().url()).searchParams.get('date')!;
  if(date===dates[3])return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Saved amounts could not be loaded.'})});
  return route.fulfill({contentType:'application/json',body:JSON.stringify({day:{version:date===dates[2]?'changed':date,checks:[]}})});
 });
 await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('.day-badge:visible')).toHaveCount(2);
 await page.getByRole('button',{name:'Load more days',exact:true}).click();await expect(page.locator('.history-month > h2')).toHaveText(['January 2027','December 2026','November 2026']);
 await expect(page.locator('.history-card')).toHaveCount(4);await expect(page.locator('.day-badge:visible')).toHaveCount(2);await expect(page.getByText('This day changed. Open it to see the latest saved version.',{exact:true})).toBeVisible();await expect(page.getByText('Saved amounts could not be loaded.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:displayDate(dates[2]),exact:true})).toBeVisible();
});
