import {test,expect} from './manager-fixture';
test('Reporting date fits the upload panels at 390px and displays a readable date while keeping ISO values',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 const input=page.getByLabel('Reporting date',{exact:true});
 for(const value of ['', '2026-10-10']){
  await input.fill(value);await expect(page.locator('#report-date-display')).toHaveText(value?'10 Oct 2026':'Choose a date');await expect(input).toHaveValue(value);
  const bounds=await page.evaluate(()=>{
   const field=document.querySelector('.report-date-field')!.getBoundingClientRect(),card=document.querySelector('.upload-card')!.getBoundingClientRect(),input=document.querySelector('#report-date')!.getBoundingClientRect();
   return {left:field.left,right:field.right,cardLeft:card.left,cardRight:card.right,inputLeft:input.left,inputRight:input.right,scroll:document.documentElement.scrollWidth};
  });
  expect(bounds.left).toBe(bounds.cardLeft);expect(bounds.right).toBe(bounds.cardRight);expect(bounds.inputLeft).toBeGreaterThanOrEqual(bounds.left);expect(bounds.inputRight).toBeLessThanOrEqual(bounds.right);expect(bounds.scroll).toBeLessThanOrEqual(390);
 }
 await input.focus();await expect(input).toBeFocused();
 await input.evaluate(node=>(node as HTMLInputElement).blur());
 await page.screenshot({path:'.test-results/date-upload-390.png',fullPage:true});
});
