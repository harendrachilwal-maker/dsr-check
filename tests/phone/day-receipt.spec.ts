import {test,expect} from './manager-fixture';
import type {Page} from '@playwright/test';
import type {SavedDay} from '../../src/confirmed-day';
import {displayTime} from '../../src/date-display';
import {ownerMessage} from '../../src/owner-message';
import {ownerReading} from '../owner-message-fixture';

const date='2026-10-10';
// All figures are fabricated. Save them on dev without scanning or calling the AI.
function receiptReading(cash=4000,upi:number|null=12250,uncertain=false,longWarning=false){
 const raw=ownerReading([999,3750,cash,upi,500]),answer=JSON.parse(raw.output[0].content[0].text);
 answer.date=date;answer.documents[0].date=date;answer.documents[0].lines[3].unclear=upi===null||uncertain;
 const label=longWarning?'Other bills for maintenance materials and supplies from the example vendor, needing a clearer amount':'Other Bills';
 answer.documents.push({source:2,kind:'Expense bill',date,lines:[{section:'Expense',label,amount:null,unclear:true}]});
 answer.contexts.push({...answer.contexts[4],source:2,line:0,party:'Example vendor'});
 raw.output[0].content[0].text=JSON.stringify(answer);return raw;
}
async function saveAndOpen(page:Page,raw:ReturnType<typeof ownerReading>){
 const historyRequest=page.waitForRequest('**/days/history');await page.getByRole('button',{name:'History',exact:true}).click();
 const request=await historyRequest,endpoint=new URL(request.url()).origin,authorization=request.headers().authorization;
 expect(endpoint).toBe('https://resilient-hamster-178.convex.site');
 const saved=await page.request.post(`${endpoint}/days/confirm`,{headers:{Authorization:authorization},data:{raw,date,sources:[1,2],dsrSources:[1],choices:[],corrections:[{id:'1:0',amount:12500}],expectedVersion:null}});
 expect(saved.status()).toBe(200);
 await page.getByRole('button',{name:'Upload DSR',exact:true}).click();await page.getByRole('button',{name:'History',exact:true}).click();
 await expect(page.locator('.history-card').getByRole('link',{name:'Send to owner',exact:true})).toBeVisible();
 const opened=page.waitForResponse('**/days/detail?date=*');await page.getByRole('button',{name:'10 Oct 2026',exact:true}).click();
 const day=(await (await opened).json()).day as SavedDay;await expect(page.locator('.day-receipt')).toBeVisible();
 return day;
}

for(const width of [320,390,1280])test(`10 Oct saved receipt shows corrected figures, confirmation and unchanged owner draft at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});const day=await saveAndOpen(page,receiptReading());
 const receipt=page.locator('.day-receipt');
 expect(day.lines.find(line=>line.id==='1:0')).toMatchObject({aiValue:999,correctedValue:12500});
 await expect(receipt.locator('dt')).toHaveText(['Room revenue','Food revenue','Guest cash','Guest UPI','Expenses']);
 await expect(receipt.locator('dd')).toHaveText(['₹12,500','₹3,750','₹4,000','₹12,250','₹500']);
 await expect(receipt.getByRole('heading',{name:'Confirmed day — 10 Oct 2026',exact:true})).toBeFocused();
 await expect(receipt.locator('.sales-money-badge')).toHaveText('Matches');
 await expect(receipt.locator('.receipt-needs li')).toHaveText(['Other bills: not read, please check.']);
 await expect(receipt.locator('footer p')).toHaveText('Confirmed by manager');
 await expect(receipt.locator('footer time')).toHaveText(displayTime(day.confirmedAt));
 await expect(receipt.locator('footer time')).toHaveAttribute('datetime',new Date(day.confirmedAt).toISOString());
 await expect(receipt).not.toContainText(/AI value|Photo \d|Written totals|Supporting records|Owner approval|₹999/);
 // Bands have real layout space and cannot overlap any figure, date, difference or timestamp.
 expect(await receipt.evaluate(node=>{
  const numbers=Array.from(node.querySelectorAll('dd,h2,.sales-money-check span,time')).map(n=>n.getBoundingClientRect());
  return Array.from(node.querySelectorAll('.receipt-pattern')).every(pattern=>{
   const box=pattern.getBoundingClientRect();return numbers.every(number=>box.bottom<=number.top||box.top>=number.bottom||box.right<=number.left||box.left>=number.right);
  });
 })).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(async()=>{
  await document.fonts.ready;
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  await Promise.allSettled(document.getAnimations().map(animation=>animation.finished));scrollTo(0,0);
 });
 await page.screenshot({path:`.test-results/day-receipt-${width}.png`,fullPage:true,animations:'disabled'});
 const share=page.locator('#history-page').getByRole('link',{name:'Send to owner',exact:true});
 expect(new URL((await share.getAttribute('href'))!).searchParams.get('text')).toBe(ownerMessage(day));
 await page.locator('#history-page .owner-draft summary').click();await expect(page.locator('#history-page .owner-draft pre')).toHaveText(ownerMessage(day));
 await page.getByRole('button',{name:'Back to History',exact:true}).click();
 await expect(page.locator('.history-card dd')).toHaveText(['₹12,500','₹3,750','₹4,000','₹12,250','₹500']);
 await expect(page.locator('.day-receipt')).toHaveCount(0);
});

for(const [upi,difference] of [[12050,'₹200 short'],[12450,'₹200 extra']] as const)test(`receipt shows the saved amber Check and ${difference} with no unread amounts`,async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const raw=receiptReading(4000,upi),answer=JSON.parse(raw.output[0].content[0].text);
 answer.documents[1].lines[0].amount=500;answer.documents[1].lines[0].unclear=false;
 raw.output[0].content[0].text=JSON.stringify(answer);
 const day=await saveAndOpen(page,raw),receipt=page.locator('.day-receipt');
 expect(day.salesMoneyCheck).toMatchObject({status:'Difference',difference:upi===12050?-200:200});
 await expect(receipt.locator('.sales-money-badge')).toHaveText('Check');
 await expect(receipt.locator('.sales-money-check')).toHaveAttribute('data-tone','check');
 await expect(receipt.locator('.sales-money-check')).toContainText(difference);
 await expect(receipt.locator('.receipt-needs')).toHaveCount(0);
 await expect(receipt.locator('footer time')).toHaveText(displayTime(day.confirmedAt));
});

for(const uncertain of [false,true])test(`receipt preserves saved zero and ${uncertain?'uncertain':'missing'} UPI with grey Not enough info`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await saveAndOpen(page,receiptReading(0,uncertain?12250:null,uncertain,true));
 const receipt=page.locator('.day-receipt');
 await expect(receipt.locator('dd')).toHaveText(['₹12,500','₹3,750','₹0','Not read','₹500']);
 await expect(receipt.locator('.receipt-not-read')).toHaveCSS('font-size','14px');
 await expect(receipt.locator('.receipt-not-read')).toHaveCSS('font-weight','400');
 await expect(receipt.locator('.receipt-not-read')).toHaveCSS('color','rgb(101, 95, 85)');
 await expect(receipt.locator('.sales-money-badge')).toHaveText('Not enough info');
 await expect(receipt.locator('.sales-money-check')).toHaveAttribute('data-tone','incomplete');
 await expect(receipt.locator('.receipt-needs')).toContainText('Guest UPI: not read, please check.');
 if(uncertain)await expect(receipt.locator('.receipt-needs')).toContainText('UPI: ₹12,250? Please check.');
 else await expect(receipt.locator('.receipt-needs li')).toHaveCount(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test.describe('History date touch navigation',()=>{
 test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
 test('the first touch on 10 Oct 2026 opens the receipt after the History fade',async({page})=>{
  const day=await saveAndOpen(page,receiptReading(4000,null));
  await page.route('**/days/history',route=>route.fulfill({json:{days:[{date:day.date,version:day.version,confirmedAt:day.confirmedAt}],cursor:null}}));
  await page.route('**/days/detail?date=*',route=>route.fulfill({json:{day}}));
  // Hold the real native fade. A locator click waits past its blocked-tap window.
  await page.evaluate(()=>{
   const start=document.startViewTransition.bind(document);
   Object.defineProperty(document,'startViewTransition',{configurable:true,value:(change:()=>void)=>{
    Object.defineProperty(document,'startViewTransition',{configurable:true,value:start});
    const transition=start(change);
    void transition.ready.then(()=>{
     const animations=document.getAnimations().filter(animation=>(animation.effect as KeyframeEffect).pseudoElement?.startsWith('::view-transition'));
     for(const animation of animations)animation.pause();
     (globalThis as typeof globalThis & {heldHistoryFade:Animation[]}).heldHistoryFade=animations;
    });
    return transition;
   }});
  });
  await page.getByRole('button',{name:'Back to History',exact:true}).click();
  await page.waitForFunction(()=>(globalThis as typeof globalThis & {heldHistoryFade?:Animation[]}).heldHistoryFade?.length);
  await expect(page.getByRole('button',{name:'10 Oct 2026',exact:true})).toHaveCount(0);
  await expect(page.locator('.history-content')).toHaveText('Loading your saved days…');
  await page.evaluate(()=>{for(const animation of (globalThis as typeof globalThis & {heldHistoryFade:Animation[]}).heldHistoryFade)animation.finish();});
  await page.getByRole('button',{name:'10 Oct 2026',exact:true}).waitFor({state:'attached'});
  const point=await page.locator('.day-open').evaluate(node=>{const box=node.getBoundingClientRect();return {x:box.x+box.width/2,y:box.y+box.height/2};});
  await page.touchscreen.tap(point.x,point.y);
  await expect(page.locator('.day-receipt')).toBeVisible();
  await expect(page.locator('.history-card')).toHaveCount(0);
  await expect(page.locator('.receipt-date')).toHaveText('10 Oct 2026');
  await expect(page.locator('.day-receipt')).toHaveCSS('background-color','rgb(250, 247, 239)');
  await expect(page.locator('.receipt-date')).toHaveCSS('font-family',/Georgia/);
  await expect(page.locator('.receipt-hotel')).toHaveCSS('font-family',/Georgia/);
  await expect(page.locator('.receipt-amounts .receipt-not-read')).toHaveText('Not read');
  await expect(page.locator('.receipt-not-read')).toHaveCSS('font-size','14px');
  await expect(page.locator('.receipt-not-read')).toHaveCSS('font-weight','400');
  await expect(page.locator('.receipt-not-read')).toHaveCSS('color','rgb(101, 95, 85)');
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.allSettled(document.getAnimations().map(animation=>animation.finished));scrollTo(0,0);});
  await page.screenshot({path:'.test-results/receipt-after-date-tap-390.png',fullPage:true,animations:'disabled'});
 });
});
