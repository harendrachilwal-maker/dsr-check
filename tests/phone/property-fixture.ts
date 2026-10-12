import {expect,type Page} from '@playwright/test';

export const devEndpoint='https://resilient-hamster-178.convex.site';
export const testPassword='MadeUp-Test-Password-2026';
export const landingHeadline='Turn Your Paper DSR into a Digital DSR';
export async function createAccount(page:Page,email:string){
 await page.getByRole('button',{name:'Start as owner',exact:true}).first().or(page.getByRole('button',{name:'Create an account',exact:true})).click();
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(testPassword);
 await page.getByRole('button',{name:'Create account',exact:true}).click();
}
export async function createProperty(page:Page,name='Sample Hill Resort'){
 await expect(page.getByLabel('Property name',{exact:true})).toBeVisible({timeout:30000});
 await page.getByLabel('Property name',{exact:true}).fill(name);await page.getByRole('button',{name:'Create property',exact:true}).click();
 await expect(page.getByLabel('Property name',{exact:true})).toHaveCount(0);
 await expect(page.locator('#owner-page, #manager-page')).toBeVisible({timeout:30000});
}
export async function inviteManager(page:Page,email:string){
 await page.locator('#manager-invitation > summary').click();await page.getByLabel('Manager email',{exact:true}).fill(email);
 const response=page.waitForResponse(response=>response.url()===`${devEndpoint}/property/invitation`&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Create invitation link',exact:true}).click();expect((await response).status()).toBe(200);
 await expect(page.getByLabel('Private invitation link',{exact:true})).toBeVisible();return await page.getByLabel('Private invitation link',{exact:true}).inputValue();
}
export async function claimManager(page:Page,link:string,email:string){
 await page.goto(link);await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(testPassword);await page.getByRole('button',{name:'Create account',exact:true}).click();
 await expect(page.getByLabel('Reporting date',{exact:true})).toBeVisible({timeout:30000});
}
export async function createManagerAccount(page:Page,email=`manager-test-${crypto.randomUUID()}@example.invalid`){
 await page.goto('/');await createAccount(page,`owner-test-${crypto.randomUUID()}@example.invalid`);await createProperty(page);
 const link=await inviteManager(page,email),reloaded=page.waitForEvent('domcontentloaded');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await reloaded;
 await expect(page.getByRole('heading',{name:landingHeadline,exact:true})).toBeVisible();
 await claimManager(page,link,email);return email;
}
