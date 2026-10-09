import { displayDate } from '../../src/date-display';
import {test,expect} from '@playwright/test';
import {makeRaw,comparisonDate as date} from '../comparison-fixture';
for(const width of [320,390])test(`open sign-up, private History, sign-out and sign-in at ${width}px`,async({page,request})=>{
 await page.setViewportSize({width,height:844});await page.goto('/');
 await expect(page.getByRole('heading',{name:'Manager sign-in',exact:true})).toBeVisible();
 await expect(page.getByLabel('Reporting date',{exact:true})).toHaveCount(0);
 const endpoint='https://resilient-hamster-178.convex.site';
 for(const [path,method] of [['/extract','POST'],['/compare','POST'],['/days/confirm','POST'],['/days/history','GET'],[`/days/detail?date=${date}`,'GET']] as const){
  const result=await request.fetch(`${endpoint}${path}`,{method});expect(result.status()).toBe(401);
 }
 await page.screenshot({path:`.test-results/login-${width}.png`,fullPage:true});
 const email=`login-${crypto.randomUUID()}@example.invalid`,password='MadeUp-Test-Password-2026';
 await page.getByRole('button',{name:'Create an account',exact:true}).click();await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Create account',exact:true}).click();
 await expect(page.getByLabel('Reporting date',{exact:true})).toBeVisible({timeout:30000});
 const historyRequest=page.waitForRequest('**/days/history');await page.getByRole('button',{name:'History',exact:true}).click();const authorization=(await historyRequest).headers().authorization;
 const saved=await request.post(`${endpoint}/days/confirm`,{headers:{Authorization:authorization},data:{raw:makeRaw(),date,sources:[1,2,3,4,5],dsrSources:[1],choices:[],corrections:[],expectedVersion:null}});expect(saved.status()).toBe(200);
 await page.reload();await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.getByRole('button',{name:displayDate(date),exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Manager sign-in',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'History',exact:true})).toHaveCount(0);
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('Wrong-Password-2026');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Sign-in failed');
 await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByLabel('Reporting date',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'History',exact:true}).click();await page.getByRole('button',{name:displayDate(date),exact:true}).click();await expect(page.locator('#history-page')).toContainText('Confirmed day');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Manager sign-in',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Create an account',exact:true}).click();await page.getByLabel('Email',{exact:true}).fill(`other-${crypto.randomUUID()}@example.invalid`);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByLabel('Reporting date',{exact:true})).toBeVisible();
 const otherRequest=page.waitForRequest('**/days/history');await page.getByRole('button',{name:'History',exact:true}).click();const otherAuthorization=(await otherRequest).headers().authorization;
 await expect(page.locator('#history-page')).toContainText('No confirmed days yet.');
 expect((await request.get(`${endpoint}/days/detail?date=${date}`,{headers:{Authorization:otherAuthorization}})).status()).toBe(404);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
