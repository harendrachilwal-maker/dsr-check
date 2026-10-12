import { test as base, expect } from '@playwright/test';
import {createManagerAccount} from './property-fixture';
export const test=base.extend<{managerSession:void}>({
 managerSession:[async({page},use)=>{
  await createManagerAccount(page);
  await expect(page.getByLabel('Reporting date',{exact:true})).toBeVisible({timeout:30000});await use();
 },{auto:true,timeout:60000}],
});
export {expect};
