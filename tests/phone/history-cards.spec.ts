import { displayDate } from '../../src/date-display';
import {test,expect} from './manager-fixture';
import {makeRaw,comparisonDate as date,comparisonContexts,comparisonDocuments} from '../comparison-fixture';
for(const width of [320,390,1280])test(`saved financial cards and unchanged day view at ${width}px`,async({page,request})=>{
 await page.setViewportSize({width,height:844});await page.goto('/');
 await expect(page.getByRole('button',{name:'Add DSR Photos',exact:true})).toBeVisible();
 await expect(page.locator('#last-confirmed')).toHaveText('Last confirmed: None yet');
 await page.screenshot({path:`.test-results/redesign-home-${width}.png`,fullPage:true});
 const captured=page.waitForRequest('**/days/history');await page.getByRole('button',{name:'History',exact:true}).click();const authorization=(await captured).headers().authorization;
 const labels=['Room Bills','Food Bills','Guest Cash','Guest UPI'],amounts=[12500,3750,4000,12250],roles=['Room charge','Food charge','Guest payment','Guest payment'];
 // All records are fabricated. No model call is made.
 const docs=structuredClone(comparisonDocuments);docs[0].lines.push(...labels.map((label,index)=>({label,amount:amounts[index],section:index<2?'Sales':'Payment',unclear:false})));
 const contexts=[...comparisonContexts,...roles.map((role,index)=>({...comparisonContexts[0],source:1,line:index+1,role,method:index===2?'Cash':index===3?'UPI':'Not identified'}))];
 const raw=makeRaw(docs,contexts);
 const body={raw,date,sources:[1,2,3,4,5],dsrSources:[1],choices:[],corrections:[],expectedVersion:null};
 expect((await request.post('https://resilient-hamster-178.convex.site/days/confirm',{headers:{Authorization:authorization},data:body})).status()).toBe(200);
 await page.getByRole('button',{name:'Upload DSR',exact:true}).click();await page.getByRole('button',{name:'History',exact:true}).click();
 const card=page.locator('.history-card');await expect(card).toHaveCount(1);
 await expect(card.locator('dd')).toHaveText(['₹12,500','₹3,750','₹4,000','₹12,250','₹21,000']);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`.test-results/redesign-history-${width}.png`,fullPage:true});
 await card.getByRole('button',{name:displayDate(date),exact:true}).click();await expect(page.getByRole('heading',{name:`Confirmed day — ${displayDate(date)}`,exact:true})).toBeFocused();
 await expect(page.locator('#history-page')).toContainText('Written totals');await page.getByRole('button',{name:'Back to History',exact:true}).click();await expect(card.locator('dd')).toHaveText(['₹12,500','₹3,750','₹4,000','₹12,250','₹21,000']);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await card.evaluate(node=>getComputedStyle(node).animationName)).toBe('none');
});

test('deferred opening animation cannot overwrite a fast History response or later navigation',async({page})=>{
 await page.evaluate(()=>{
  Object.defineProperty(document,'startViewTransition',{configurable:true,value:(change:()=>void)=>{
   const done=new Promise<void>(resolve=>setTimeout(()=>{change();resolve();},120));
   return {updateCallbackDone:done,ready:done,finished:done,skipTransition(){}};
  }});
 });
 await page.route('**/days/history',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({days:[],cursor:null})}));
 await page.getByRole('button',{name:'History',exact:true}).click();
 await expect(page.locator('#history-page')).toContainText('No confirmed days yet.');
 await page.getByRole('button',{name:'Upload DSR',exact:true}).click();
 await page.getByRole('button',{name:'History',exact:true}).click();await page.getByRole('button',{name:'Upload DSR',exact:true}).click();
 await expect(page.getByRole('button',{name:'Add DSR Photos',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('#history-page')).toContainText('No confirmed days yet.');
 await expect(page.locator('#history-page')).not.toContainText('Loading your saved days…');
});
