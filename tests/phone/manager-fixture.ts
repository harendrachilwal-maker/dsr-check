import { test as base, expect } from '@playwright/test';
export const test=base.extend<{managerSession:void}>({
 managerSession:[async({page},use)=>{
  await page.goto('/');await page.getByRole('button',{name:'Create an account',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill(`test-${crypto.randomUUID()}@example.invalid`);
  await page.getByLabel('Password',{exact:true}).fill('MadeUp-Test-Password-2026');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByLabel('Reporting date',{exact:true})).toBeVisible({timeout:30000});await use();
 },{auto:true}],
});
export {expect};
