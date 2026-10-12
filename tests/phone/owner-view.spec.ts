import {test,expect,type Page,type Browser} from '@playwright/test';
import type {OwnerMonth} from '../../src/owner-data';
import {ownerReading} from '../owner-message-fixture';
import {comparisonReadingFromRaw,buildComparison} from '../../src/comparison';
import {createAccount,createProperty,inviteManager,claimManager,createManagerAccount,devEndpoint as endpoint,testPassword,landingHeadline} from './property-fixture';

// Fabricated property records only. No test below calls a paid AI service.
function reading(date:string,amounts:(number|null)[],uncertain=-1){
 const raw=ownerReading(amounts),answer=JSON.parse(raw.output[0].content[0].text);answer.date=date;answer.documents[0].date=date;
 if(uncertain>=0)answer.documents[0].lines[uncertain].unclear=true;
 raw.output[0].content[0].text=JSON.stringify(answer);return raw;
}
async function ownerAccount(page:Page,name='Sample Hill Resort'){
 const email=`owner-${crypto.randomUUID()}@example.invalid`;await page.goto('/');await createAccount(page,email);await createProperty(page,name);await expect(page.locator('#owner-page')).toBeVisible();return email;
}
async function authorization(page:Page){
 const ready=page.waitForRequest('**/property/session');await page.reload();const request=await ready;expect(new URL(request.url()).origin).toBe(endpoint);expect(request.headers().authorization).toBeTruthy();
 await expect(page.locator('#owner-page,#manager-page')).toBeVisible({timeout:30000});return request.headers().authorization;
}
async function save(page:Page,token:string,date:string,amounts:(number|null)[],corrections:{id:string;amount:number}[]=[],uncertain=-1){
 const response=await page.request.post(`${endpoint}/days/confirm`,{headers:{Authorization:token},data:{raw:reading(date,amounts,uncertain),date,sources:[1],dsrSources:[1],choices:[],corrections,expectedVersion:null}});expect(response.status()).toBe(200);
}
async function paired(page:Page,browser:Browser){
 const email=await ownerAccount(page),managerEmail=`manager-${crypto.randomUUID()}@example.invalid`,link=await inviteManager(page,managerEmail);
 const context=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:390,height:844}}),manager=await context.newPage();
 await claimManager(manager,link,managerEmail);return {email,managerEmail,link,context,manager};
}

test('October overview and History include both corrected 4 Oct and 10 Oct saved days at 390px',async({page,browser})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:844});
 const {manager,context}=await paired(page,browser),token=await authorization(manager);
 // These amounts are invented; no real hotel figures or paid AI calls are used.
 await save(manager,token,'2026-10-04',[2400,600,1200,1800,150],[{id:'1:0',amount:2600},{id:'1:3',amount:2000}]);
 await save(manager,token,'2026-10-10',[3200,700,1100,2800,275],[{id:'1:1',amount:800},{id:'1:3',amount:2900}]);
 const monthResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/owner/month'&&new URL(response.url()).searchParams.get('month')==='2026-10');
 await page.reload();await page.getByLabel('Month',{exact:true}).fill('2026-10');
 const response=await monthResponse;expect(response.status()).toBe(200);const {report}=await response.json() as {report:OwnerMonth};
 expect(report.confirmedDays).toBe(2);expect(report.days.map(day=>day.date)).toEqual(['2026-10-10','2026-10-04']);
 await expect(page.locator('.owner-month-count')).toHaveText('2 confirmed days');
 await expect(page.locator('.owner-month-totals dd')).toHaveText(['₹5,800','₹1,400','₹2,300','₹4,900','₹425']);
 await expect(page.locator('.owner-check-counts dd')).toHaveText(['2','0','0']);
 await expect(page.locator('.owner-receipts .receipt-date')).toHaveText(['10 Oct 2026','4 Oct 2026']);
 await expect(page.locator('.owner-day[data-date="2026-10-04"] .receipt-amounts dd')).toHaveText(['₹2,600','₹600','₹1,200','₹2,000','₹150']);
 await expect(page.locator('.owner-day[data-date="2026-10-10"] .receipt-amounts dd')).toHaveText(['₹3,200','₹800','₹1,100','₹2,900','₹275']);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});
 await page.screenshot({path:'.test-results/october-two-days-390.png',fullPage:true,animations:'disabled'});
 const historyResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/days/history');
 await page.getByRole('button',{name:'History',exact:true}).click();
 const history=await historyResponse;expect(history.status()).toBe(200);const {days}=await history.json() as {days:{date:string;version:string}[]};
 expect(days.map(({date,version})=>({date,version}))).toEqual(report.days.map(({date,version})=>({date,version})));
 await expect(page.locator('.history-card')).toHaveCount(2);
 for(const [date,amounts] of [['10 Oct 2026',['₹3,200','₹800','₹1,100','₹2,900','₹275']],['4 Oct 2026',['₹2,600','₹600','₹1,200','₹2,000','₹150']]] as const){
  const card=page.locator('.history-card').filter({has:page.getByRole('button',{name:date,exact:true})});
  await expect(card.locator('.day-metrics dd')).toHaveText([...amounts]);
 }
 await context.close();
});

test('property owner controls corrected October reports, manager invitation, edits and removal at 390px',async({page,browser})=>{
 test.setTimeout(180000);await page.setViewportSize({width:390,height:844});
 const {context,manager,managerEmail,link}=await paired(page,browser),ownerToken=await authorization(page),seedToken=await authorization(manager);
 await save(manager,seedToken,'2026-10-09',[10000,1000,5000,6000,200]);
 await save(manager,seedToken,'2026-10-08',[8000,2000,3000,7200,300]);
 await save(manager,seedToken,'2026-10-07',[0,0,0,0,0]);
 // Manager uses the real correction and confirmation flow; only AI extraction is mocked.
 const raw=reading('2026-10-10',[999,3750,4000,null,500],0);let calls=0;
 await manager.route('**/extract',route=>{calls++;expect(new URL(route.request().url()).origin).toBe(endpoint);return route.fulfill({json:{mode:'compare',raw,comparison:buildComparison(comparisonReadingFromRaw(raw,'2026-10-10',[1],[1]))}});});
 await manager.getByLabel('Reporting date',{exact:true}).fill('2026-10-10');
 const buffer=await manager.screenshot();await manager.locator('#photo').setInputFiles({name:'fabricated-dsr.png',mimeType:'image/png',buffer});
 await manager.getByRole('button',{name:'Start AI Scanning',exact:true}).click();
 const room=manager.locator('.dsr-line').filter({has:manager.locator('dt').filter({hasText:/^Room Bills$/})});
 await room.getByRole('button',{name:'Correct',exact:true}).click();await room.getByLabel('Amount (₹)',{exact:true}).fill('12500');await room.getByRole('button',{name:'Save Correction',exact:true}).click();
 await expect(manager.getByText('Correction saved.',{exact:true})).toBeVisible();await manager.getByRole('button',{name:'Confirm day',exact:true}).click();await expect(manager.getByText('Day confirmed and saved — 10 Oct 2026.',{exact:true})).toBeVisible();expect(calls).toBe(1);
 await expect(manager.getByRole('link',{name:'Send to owner',exact:true})).toBeVisible();
 await expect(manager.getByRole('button',{name:'Owner overview',exact:true})).toHaveCount(0);await expect(manager.locator('#manager-invitation')).toHaveCount(0);
 await page.reload();await page.getByLabel('Month',{exact:true}).fill('2026-10');
 await expect(page.locator('.owner-month-totals dd')).toHaveText(['₹30,500','₹6,750','₹12,000','Not read','₹1,000']);
 await expect(page.locator('.owner-month-totals [data-metric="upi"]')).toContainText('Incomplete total');
 await expect(page.locator('.owner-check-counts dd')).toHaveText(['2','1','1']);await expect(page.locator('.owner-missing-count')).toHaveText('1 day had a missing amount.');
 await expect(page.locator('.owner-receipts .receipt-date')).toHaveText(['10 Oct 2026','9 Oct 2026','8 Oct 2026','7 Oct 2026']);
 const latest=page.locator('.owner-day[data-date="2026-10-10"]');
 await expect(latest.locator('.receipt-hotel')).toHaveText('Sample Hill Resort');await expect(latest.locator('.receipt-amounts dd')).toHaveText(['₹12,500','₹3,750','₹4,000','Not read','₹500']);await expect(latest).not.toContainText('₹999');
 await expect(latest.locator('.receipt-not-read')).toHaveCSS('font-size','14px');await expect(page.locator('.owner-receipts .sales-money-badge')).toHaveText(['Not enough info','Matches','Check','Matches']);
 // Owner changes an unread saved amount while preserving the original AI and manager correction.
 await latest.getByRole('button',{name:'Edit saved day',exact:true}).click();
 const editor=latest.locator('.owner-editor'),upi=editor.locator('.owner-edit-line').filter({has:page.getByRole('heading',{name:'UPI',exact:true})});
 await upi.getByRole('button',{name:'Correct UPI (1:3)',exact:true}).click();await upi.getByLabel('Amount (₹)',{exact:true}).fill('12250');await upi.getByRole('button',{name:'Save Correction',exact:true}).click();
 await editor.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page.locator('.owner-month-totals dd')).toHaveText(['₹30,500','₹6,750','₹12,000','₹25,450','₹1,000']);
 await expect(page.locator('.owner-check-counts dd')).toHaveText(['3','1','0']);await expect(page.locator('.owner-missing-count')).toHaveText('0 days had a missing amount.');
 await expect(latest.locator('.day-receipt')).toContainText('Edited by owner');
 const detail=await page.request.get(`${endpoint}/days/detail?date=2026-10-10`,{headers:{Authorization:ownerToken}});expect(detail.status()).toBe(200);const day=(await detail.json()).day;
 expect(day.lines.find((line:{id:string})=>line.id==='1:0')).toMatchObject({aiValue:999,correctedValue:12500});expect(day.lines.find((line:{id:string})=>line.id==='1:3')).toMatchObject({aiValue:null,correctedValue:12250});expect(day).toMatchObject({editedBy:'owner'});
 const ids=await page.locator('.receipt-date').evaluateAll(nodes=>nodes.map(node=>node.id));expect(new Set(ids).size).toBe(4);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});await page.screenshot({path:'.test-results/property-owner-october-390.png',fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:1280,height:1000});await page.screenshot({path:'.impeccable/review/property-owner-desktop.png',fullPage:true,animations:'disabled'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.setViewportSize({width:390,height:844});
 await manager.getByRole('button',{name:'Upload DSR',exact:true}).click();await manager.reload();await expect(manager.getByLabel('Reporting date',{exact:true})).toBeVisible({timeout:30000});await expect(manager.locator('#last-confirmed')).toHaveText('Last confirmed: 10 Oct 2026');await manager.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});await manager.screenshot({path:'.test-results/property-manager-upload-390.png',fullPage:true,animations:'disabled'});
 // A separate property with the same report date never enters this owner's totals or receipts.
 const otherContext=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:390,height:844}}),otherManager=await otherContext.newPage();
 await createManagerAccount(otherManager);const otherToken=await authorization(otherManager);await save(otherManager,otherToken,'2026-10-10',[777,88,333,532,42]);
 await page.getByLabel('Month',{exact:true}).fill('2026-12');await expect(page.locator('.owner-empty')).toContainText('No confirmed days in this month.');await expect(page.locator('.day-receipt')).toHaveCount(0);
 await page.getByLabel('Month',{exact:true}).fill('2026-10');await expect(page.locator('.day-receipt')).toHaveCount(4);await expect(page.locator('.owner-month-totals')).not.toContainText('₹777');
 const managerToken=await authorization(manager);
 for(const path of ['/owner/month?month=2026-10','/property/invitation'])expect((await manager.request.get(`${endpoint}${path}`,{headers:{Authorization:managerToken}})).status()).toBe(403);
 const forbidden=await manager.request.post(`${endpoint}/owner/day/edit`,{headers:{Authorization:managerToken},data:{date:'2026-10-10',expectedVersion:day.version,corrections:[{id:'1:0',amount:1}]}});expect(forbidden.status()).toBe(403);
 for(const path of ['/extract','/compare','/days/confirm'])expect((await page.request.post(`${endpoint}${path}`,{headers:{Authorization:ownerToken},data:{}})).status()).toBe(403);
 const metadata=await page.request.get(`${endpoint}/property/invitation`,{headers:{Authorization:ownerToken}});expect(metadata.status()).toBe(200);const access=await metadata.json();expect(access.manager.email).toBe(managerEmail);expect(access).not.toHaveProperty('token');expect(JSON.stringify(access)).not.toContain(new URL(link).hash.slice(8));
 const second=await page.request.post(`${endpoint}/property/invitation`,{headers:{Authorization:ownerToken},data:{email:`second-${crypto.randomUUID()}@example.invalid`}});expect(second.status()).toBe(409);
 await page.locator('#manager-invitation > summary').click();await expect(page.locator('#manager-invitation')).toContainText(managerEmail);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Remove manager',exact:true}).click();await expect(page.getByLabel('Manager email',{exact:true})).toBeVisible();
 await manager.getByRole('button',{name:'History',exact:true}).click();await expect(manager.getByRole('alert')).toContainText('Your property access has changed.');await expect(manager.locator('#manager-page')).toHaveCount(0);await expect(manager.getByLabel('Reporting date',{exact:true})).toHaveCount(0);
 expect((await manager.request.get(`${endpoint}/days/history`,{headers:{Authorization:managerToken}})).status()).toBe(403);
 await page.reload();await page.getByLabel('Month',{exact:true}).fill('2026-10');await expect(page.locator('.day-receipt')).toHaveCount(4);
 await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('.history-card')).toHaveCount(4);await expect(page.getByRole('button',{name:'Owner overview',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Upload DSR',exact:true})).toBeHidden();await expect(page.getByLabel('Reporting date',{exact:true})).toBeHidden();
 await context.close();await otherContext.close();
});

test('owner month reads discard stale responses, clear old figures on errors and retry safely',async({page,browser})=>{
 test.setTimeout(90000);const {manager,context}=await paired(page,browser);const token=await authorization(manager);await save(manager,token,'2026-10-10',[12500,3750,4000,null,500]);await page.reload();await expect(page.locator('.day-receipt')).toHaveCount(1);
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 const empty:OwnerMonth={month:'2026-11',confirmedDays:0,totals:{room:null,food:null,cash:null,upi:null,expenses:null},counts:{matches:0,check:0,incomplete:0,missingAmounts:0},days:[]};let octoberCount=0;
 await page.route('**/owner/month?*',async route=>{const month=new URL(route.request().url()).searchParams.get('month');if(month==='2026-11'){await held;try{await route.fulfill({json:{report:empty}});}catch{/* Obsolete request may be aborted. */}return;}if(month==='2026-10'&&octoberCount++===0){await route.fulfill({status:503,json:{error:'Month unavailable. Try again.'}});return;}await route.continue();});
 await page.getByLabel('Month',{exact:true}).fill('2026-11');await expect(page.locator('.owner-month-content')).toContainText('Loading confirmed days…');await expect(page.locator('.day-receipt')).toHaveCount(0);
 await page.getByLabel('Month',{exact:true}).fill('2026-10');await expect(page.getByRole('alert')).toContainText('Month unavailable. Try again.');await expect(page.locator('.owner-month-totals')).toHaveCount(0);
 await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.locator('.day-receipt')).toHaveCount(1);release();await expect(page.locator('.owner-month-summary h2')).toHaveText('October 2026');await expect(page.locator('.day-receipt')).toHaveCount(1);
 await context.close();
});

test('manager invitation requires its invited email and cannot create an owner property on a failed claim',async({page,browser})=>{
 test.setTimeout(90000);await ownerAccount(page);const email=`manager-${crypto.randomUUID()}@example.invalid`,link=await inviteManager(page,email),context=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:390,height:844}}),manager=await context.newPage();
 await manager.goto(link);await manager.getByLabel('Email',{exact:true}).fill(`wrong-${crypto.randomUUID()}@example.invalid`);await manager.getByLabel('Password',{exact:true}).fill(testPassword);await manager.getByRole('button',{name:'Create account',exact:true}).click();
 await expect(manager.getByRole('alert')).toBeVisible({timeout:30000});await expect(manager.getByLabel('Reporting date',{exact:true})).toHaveCount(0);await expect(manager.getByLabel('Property name',{exact:true})).toHaveCount(0);
 await manager.getByRole('button',{name:'Sign out',exact:true}).click();await claimManager(manager,link,email);await expect(manager.locator('#owner-page')).toHaveCount(0);
 await manager.getByRole('button',{name:'Sign out',exact:true}).click();await expect(manager.getByRole('heading',{name:landingHeadline,exact:true})).toBeVisible();
 await manager.getByRole('button',{name:'Sign in',exact:true}).click();await expect(manager.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
 await manager.getByLabel('Email',{exact:true}).fill(email);await manager.getByLabel('Password',{exact:true}).fill(testPassword);await manager.getByRole('button',{name:'Sign in',exact:true}).click();await expect(manager.getByLabel('Reporting date',{exact:true})).toBeVisible({timeout:30000});
 await manager.getByRole('button',{name:'History',exact:true}).click();await expect(manager.locator('#history-page')).toContainText('No confirmed days yet.');
 await context.close();
});

test('owner stale-version recovery keeps the draft and reviews the latest manager values before saving',async({page,browser})=>{
 test.setTimeout(90000);const {manager,context}=await paired(page,browser),managerToken=await authorization(manager),ownerToken=await authorization(page);
 await save(manager,managerToken,'2026-10-10',[12000,1000,5000,8000,100]);await page.reload();await expect(page.locator('.day-receipt')).toHaveCount(1);
 const initial=await page.request.get(`${endpoint}/days/detail?date=2026-10-10`,{headers:{Authorization:ownerToken}}),first=(await initial.json()).day;
 await page.getByRole('button',{name:'Edit saved day',exact:true}).click();
 const editor=page.locator('.owner-editor'),room=editor.locator('.owner-edit-line').filter({has:page.getByRole('heading',{name:'Room Bills',exact:true})});
 await room.getByRole('button',{name:'Correct Room Bills (1:0)',exact:true}).click();await room.getByLabel('Amount (₹)',{exact:true}).fill('13000');await room.getByRole('button',{name:'Save Correction',exact:true}).click();
 const replacement=await manager.request.post(`${endpoint}/days/confirm`,{headers:{Authorization:managerToken},data:{raw:reading('2026-10-10',[14400,1000,5000,10000,100]),date:'2026-10-10',sources:[1],dsrSources:[1],choices:[],corrections:[{id:'1:0',amount:14000},{id:'1:1',amount:1200}],expectedVersion:first.version}});expect(replacement.status()).toBe(200);
 const current=await page.request.get(`${endpoint}/days/detail?date=2026-10-10`,{headers:{Authorization:ownerToken}}),latest=(await current.json()).day;
 const denied=page.waitForResponse(response=>response.url()===`${endpoint}/owner/day/edit`&&response.request().method()==='POST');await editor.getByRole('button',{name:'Save changes',exact:true}).click();expect((await denied).status()).toBe(409);
 await expect(editor.getByRole('alert')).toContainText('Your corrections are still here');await expect(room).toContainText('₹13,000');
 await editor.getByRole('button',{name:'Load latest saved day',exact:true}).click();await expect(editor.getByRole('status')).toContainText('Latest saved lines loaded. Your corrections are still here');await expect(room).toContainText('₹13,000');await expect(room).toContainText('Latest saved: Room Bills · ₹14,000');await expect(room).toContainText('AI read: Room Bills · ₹14,400');await expect(room.getByRole('button',{name:'Correct Room Bills (1:0)',exact:true})).toBeEnabled();
 await editor.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.locator('.owner-month-totals dd')).toHaveText(['₹13,000','₹1,200','₹5,000','₹10,000','₹100']);
 const final=await page.request.get(`${endpoint}/days/detail?date=2026-10-10`,{headers:{Authorization:ownerToken}}),saved=(await final.json()).day;
 expect(saved.confirmedAt).toBe(latest.confirmedAt);expect(saved.version).not.toBe(latest.version);expect(saved.aiReading).toEqual(latest.aiReading);expect(saved.lines.find((line:{id:string})=>line.id==='1:0')).toMatchObject({aiValue:14400,correctedValue:13000});expect(saved.lines.find((line:{id:string})=>line.id==='1:1')).toMatchObject({aiValue:1000,correctedValue:1200});
 await context.close();
});
