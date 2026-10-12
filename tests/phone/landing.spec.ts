import {test,expect} from '@playwright/test';
import {createProperty,devEndpoint,landingHeadline,testPassword} from './property-fixture';

// The landing receipt is a static made-up example, never a saved report.
for(const width of [320,390,1280])test(`public landing, sample receipt and existing sign-in paths at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});
 const privateRequests:string[]=[];
 page.on('request',request=>{
  const url=new URL(request.url());
  if(url.origin===devEndpoint&&/^\/(days\/|owner\/month|property\/|extract$|compare$)/.test(url.pathname))privateRequests.push(url.pathname);
 });
 await page.goto('/');
 await expect(page.getByRole('heading',{name:landingHeadline,exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'How it works',exact:true})).toBeVisible();
 const steps=page.getByRole('list').getByRole('listitem');
 await expect(steps).toHaveCount(3);
 await expect(steps.nth(0)).toContainText(/manager.*paper DSR/i);
 await expect(steps.nth(1)).toContainText(/AI.*manager.*check/i);
 await expect(steps.nth(2)).toContainText(/WhatsApp.*month.*dashboard/i);
 const sample=page.getByRole('region',{name:'Sample receipt',exact:true});
 await expect(sample).toContainText('Made-up numbers to show how a day looks.');
 await expect(sample).toContainText('Example day');
 await expect(sample.getByRole('heading',{name:'12 May 2027',exact:true})).toBeVisible();
 for(const [label,amount] of [['Room revenue','₹8,000'],['Food revenue','₹1,500'],['Guest cash','₹2,500'],['Guest UPI','₹7,000'],['Expenses','₹450']] as const){
  await expect(sample.getByText(label,{exact:true})).toBeVisible();
  await expect(sample.getByText(amount,{exact:true})).toBeVisible();
 }
 await expect(sample.getByText('Matches',{exact:true})).toBeVisible();
 const illustration=page.getByRole('img',{name:'A paper report at a hotel desk being read on a phone.',exact:true});
 await expect(illustration).toBeVisible();
 await expect.poll(async()=>illustration.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth===1536&&img.naturalHeight===1024)).toBe(true);
 const subheadline=page.locator('.landing-subheadline');
 await expect(subheadline).toHaveText('Your team uploads the DSR. AI checks the numbers. You get the important update on WhatsApp');
 await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});
 const headline=page.getByRole('heading',{name:landingHeadline,exact:true});
 // Keep both phrases on two lines, including the tightest wider-gutter phone.
 for(const phoneWidth of width===390?[351,390]:[width]){
  await page.setViewportSize({width:phoneWidth,height:844});
  expect(await headline.evaluate(node=>node.getBoundingClientRect().height/parseFloat(getComputedStyle(node).lineHeight))).toBeCloseTo(2,2);
  expect(await headline.evaluate(node=>{const range=document.createRange();range.selectNodeContents(node.firstElementChild!);return range.getBoundingClientRect().width<=node.getBoundingClientRect().width;})).toBe(true);
 }
 const illustrationBox=(await illustration.boundingBox())!,stepsBox=(await page.getByRole('heading',{name:'How it works',exact:true}).boundingBox())!;
 const subheadingBox=(await subheadline.boundingBox())!,ownerBox=(await page.getByRole('button',{name:'Start as owner',exact:true}).first().boundingBox())!,signInBox=(await page.getByRole('button',{name:'Sign in',exact:true}).boundingBox())!;
 expect(ownerBox.y).toBeGreaterThanOrEqual(subheadingBox.y+subheadingBox.height);
 expect(signInBox.y).toBeGreaterThanOrEqual(ownerBox.y+ownerBox.height);
 expect(signInBox.y+signInBox.height).toBeLessThanOrEqual(illustrationBox.y);
 expect(signInBox.y+signInBox.height).toBeLessThanOrEqual(844);
 expect(illustrationBox.y+illustrationBox.height).toBeLessThanOrEqual(844);
 expect(stepsBox.y).toBeGreaterThan(illustrationBox.y+illustrationBox.height);
 await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});
 await page.screenshot({path:`.test-results/landing-first-screen-${width}.png`,animations:'disabled'});
 const ownerBenefits=page.getByRole('region',{name:'What the owner gets',exact:true});
 await expect(ownerBenefits).toContainText('Both examples use made-up numbers. They are not real hotel records.');
 await expect(ownerBenefits.getByRole('heading',{name:'Sample WhatsApp daily summary',exact:true})).toBeVisible();
 await expect(ownerBenefits.getByText('Example daily summary — 12 May 2027',{exact:false})).toContainText('Guest UPI: ₹7,000');
 await expect(ownerBenefits.getByRole('heading',{name:'Sample month total — May 2027',exact:true})).toBeVisible();
 await page.evaluate(async()=>{await document.fonts.ready;});
 for(const amount of ['₹2,40,000','₹45,000','₹75,000','₹2,10,000','₹13,500']){
  const value=ownerBenefits.getByText(amount,{exact:true});await expect(value).toBeVisible();
  // Financial examples must keep each amount on one line even on the narrow phone.
  expect(await value.evaluate(node=>{const range=document.createRange();range.selectNodeContents(node);return range.getClientRects().length;})).toBe(1);
 }
 const privacy=page.getByRole('region',{name:'Your data stays private',exact:true});
 await expect(privacy).toContainText('We don’t save your uploaded photos. Each property can access only its own saved days.');
 const price=page.getByRole('region',{name:'Price',exact:true});
 await expect(price.getByRole('article')).toHaveCount(3);
 for(const [name,amount] of [['Monthly','₹499'],['6 months','₹2,994'],['Yearly','₹4,990']] as const){
  const plan=price.getByRole('article',{name,exact:true});
  await expect(plan.getByText(amount,{exact:true})).toBeVisible();await expect(plan.getByText('Per property',{exact:true})).toBeVisible();
  const contact=plan.getByRole('link',{name:'Talk to me on WhatsApp',exact:true}),url=new URL((await contact.getAttribute('href'))!);
  expect(url.origin).toBe('https://wa.me');expect(url.pathname).toBe('/');
  expect(url.searchParams.get('text')).toBe(`Hi, I'm interested in the ${name} plan (${amount} per property).`);
  await expect(contact).toHaveAttribute('target','_blank');await expect(contact).toHaveAttribute('rel','noopener noreferrer');
 }
 await expect(price.getByRole('article',{name:'Yearly',exact:true}).getByText('Best value, 2 months free',{exact:true})).toBeVisible();
 const normalSurface=await price.getByRole('article',{name:'Monthly',exact:true}).evaluate(node=>getComputedStyle(node).backgroundColor);
 expect(await price.getByRole('article',{name:'Yearly',exact:true}).evaluate(node=>getComputedStyle(node).backgroundColor)).not.toBe(normalSurface);
 await expect(price.getByRole('button')).toHaveCount(0);await expect(page.getByText('PRICE_HERE',{exact:true})).toHaveCount(0);
 const finalActions=page.getByRole('region',{name:'Get started',exact:true});
 await expect(finalActions.getByRole('button',{name:'Start as owner',exact:true})).toBeVisible();
 await expect(finalActions.getByRole('button')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Start as owner',exact:true})).toHaveCount(2);
 await expect(page.getByRole('link',{name:'Talk to me on WhatsApp',exact:true})).toHaveCount(3);
 await expect(page.getByRole('button',{name:'Talk to me on WhatsApp',exact:true})).toHaveCount(0);
 await expect(page.locator('a[href*="wa.me"]')).toHaveCount(3);
 const benefitsTop=(await ownerBenefits.boundingBox())!.y,privacyTop=(await privacy.boundingBox())!.y,priceTop=(await price.boundingBox())!.y,finalTop=(await finalActions.boundingBox())!.y;
 expect(benefitsTop).toBeGreaterThan(844);expect(privacyTop).toBeGreaterThan(benefitsTop);expect(priceTop).toBeGreaterThan(privacyTop);expect(finalTop).toBeGreaterThan(priceTop);
 await expect(page.getByLabel('Email',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Reporting date',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'History',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await price.scrollIntoViewIfNeeded();
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 await price.evaluate(async node=>{await Promise.all(node.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{})));});
 await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});
 await page.screenshot({path:`.test-results/landing-pricing-full-${width}.png`,fullPage:true,animations:'disabled'});
 const pricingBox=(await price.boundingBox())!;
 await page.screenshot({path:`.test-results/landing-pricing-${width}.png`,fullPage:true,clip:{x:0,y:Math.max(0,pricingBox.y-16),width,height:pricingBox.height+32},animations:'disabled'});
 // Both choices still lead to the existing forms, including their toggle links.
 const owner=page.getByRole('button',{name:'Start as owner',exact:true}).first();
 await owner.focus();await expect(owner).toBeFocused();await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Create your account',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Create your account',exact:true})).toBeFocused();
 await expect(page.getByLabel('Email',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Already have an account? Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Create an account',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Create your account',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:landingHeadline,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
 await expect(page.getByLabel('Password',{exact:true})).toBeVisible();
 expect(privateRequests).toEqual([]);
});

test('pricing is static with reduced motion and reveals only once when motion is allowed',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const price=page.getByRole('region',{name:'Price',exact:true});await price.scrollIntoViewIfNeeded();
 expect(await price.evaluate(node=>node.getAnimations({subtree:true}).length)).toBe(0);
 for(const amount of ['₹499','₹2,994','₹4,990'])await expect(price.getByText(amount,{exact:true})).toBeVisible();
 await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();await expect(page.getByRole('heading',{name:landingHeadline,exact:true})).toBeVisible();
 const played=await price.evaluate(async node=>{
  node.scrollIntoView();await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  const animations=node.getAnimations({subtree:true});await Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));return animations.length;
 });
 expect(played).toBeGreaterThan(0);
 await page.evaluate(async()=>{scrollTo(0,0);await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});await price.evaluate(async node=>{
  node.scrollIntoView();await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
 });
 expect(await price.evaluate(node=>node.getAnimations({subtree:true}).length)).toBe(0);
 for(const amount of ['₹499','₹2,994','₹4,990'])await expect(price.getByText(amount,{exact:true})).toBeVisible();
});

test('Start as owner creates an empty private property without saving the sample receipt at 390px',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:390,height:844});
 const email=`landing-${crypto.randomUUID()}@example.invalid`;
 await page.goto('/');
 await page.getByRole('region',{name:'Get started',exact:true}).getByRole('button',{name:'Start as owner',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Create your account',exact:true})).toBeVisible();
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(testPassword);
 await page.getByRole('button',{name:'Create account',exact:true}).click();await createProperty(page,'Sample Lake Hotel');
 await expect(page.getByRole('heading',{name:landingHeadline,exact:true})).toHaveCount(0);
 await expect(page.getByRole('region',{name:'Sample receipt',exact:true})).toHaveCount(0);
 await expect(page.getByRole('region',{name:'What the owner gets',exact:true})).toHaveCount(0);
 const monthResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/owner/month'&&new URL(response.url()).searchParams.get('month')==='2027-05');
 await page.getByLabel('Month',{exact:true}).fill('2027-05');
 const response=await monthResponse;expect(response.status()).toBe(200);
 expect((await response.json()).report).toMatchObject({confirmedDays:0,days:[]});
 await expect(page.getByText('No confirmed days in this month. Saved receipts will appear here after the manager confirms a day.',{exact:true})).toBeVisible();
 await expect(page.getByText('₹8,000',{exact:true})).toHaveCount(0);
 await expect(page.getByText('₹2,40,000',{exact:true})).toHaveCount(0);
 const reloaded=page.waitForEvent('domcontentloaded');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await reloaded;
 await expect(page.getByRole('heading',{name:landingHeadline,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(testPassword);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByLabel('Month',{exact:true})).toBeVisible({timeout:30000});
 await expect(page.getByText('Sample Lake Hotel',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'History',exact:true}).click();
 await expect(page.getByText('No confirmed days yet. Read a DSR, review its lines, then tap Confirm day.',{exact:true})).toBeVisible();
});

test('a manager invitation still opens its existing account form directly, without the public landing',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(`/manager#invite=${'0'.repeat(64)}`);
 await expect(page.getByRole('heading',{name:'Create your account',exact:true})).toBeVisible();
 await expect(page.getByText('Use the email in your manager invitation to sign in or create an account.',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:landingHeadline,exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Start as owner',exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Reporting date',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Already have an account? Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
 await expect(page.getByText('Use the email in your manager invitation to sign in or create an account.',{exact:true})).toBeVisible();
});
