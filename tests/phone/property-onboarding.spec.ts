import {test,expect} from '@playwright/test';
import {ConvexHttpClient} from 'convex/browser';
import {makeFunctionReference} from 'convex/server';
import {createAccount,devEndpoint,testPassword} from './property-fixture';

test('typed property name survives a signed-in account recheck and creates the intended property once',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:390,height:844});
 const email=`onboarding-${crypto.randomUUID()}@example.invalid`,name='Sample Hill Resort';
 await page.goto('/');await createAccount(page,email);const input=page.getByLabel('Property name',{exact:true});await expect(input).toBeVisible({timeout:30000});await input.fill(name);
 // A real new token for this same test account reproduces another tab/token refresh.
 // No token or password is printed, stored in the repo, or used outside dev.
 const client=new ConvexHttpClient(devEndpoint.replace('.site','.cloud'));
 const result=await client.action(makeFunctionReference<'action'>('auth:signIn'),{provider:'password',params:{email,password:testPassword,flow:'signIn'}}) as {tokens:{token:string;refreshToken:string}|null};
 expect(!!result.tokens?.token).toBe(true);
 let release!:()=>void,started!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;}),lookupStarted=new Promise<void>(resolve=>{started=resolve;});
 await page.route('**/property/session',async route=>{expect(new URL(route.request().url()).origin).toBe(devEndpoint);started();await held;await route.continue();});
 await page.evaluate(token=>{
  const key=Object.keys(localStorage).find(key=>key.startsWith('__convexAuthJWT_'));
  if(!key)throw new Error('The fabricated account has no active sign-in.');
  window.dispatchEvent(new StorageEvent('storage',{key,newValue:token,storageArea:localStorage}));
 },result.tokens!.token);
 await lookupStarted;await expect(page.getByRole('status')).toContainText('Loading your property…');release();
 await expect(input).toBeVisible({timeout:30000});await expect(input).toHaveValue(name);
 let createRequests=0;page.on('request',request=>{if(request.url()===`${devEndpoint}/property/create`&&request.method()==='POST')createRequests++;});
 const created=page.waitForResponse(response=>response.url()===`${devEndpoint}/property/create`&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Create property',exact:true}).click();const response=await created;expect(response.status()).toBe(200);expect(response.request().postDataJSON()).toEqual({name});
 await expect(page.locator('#owner-page')).toBeVisible({timeout:30000});await expect(page.locator('#owner-page > header p')).toHaveText(name);expect(createRequests).toBe(1);
});
