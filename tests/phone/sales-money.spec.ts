import {test,expect} from './manager-fixture';
import {makeRaw} from '../comparison-fixture';
import type {Context} from '../../src/comparison';
import type {SavedDay} from '../../src/confirmed-day';

// Fabricated DSRs only; this flow saves directly on dev without calling the AI.
function reading(date:string,amounts:(number|null)[],uncertain=-1){
 const labels=['Room Bills','Food Bills','Guest Cash','Guest UPI'];
 const roles:Context['role'][]=['Room charge','Food charge','Guest payment','Guest payment'];
 const methods:Context['method'][]=['Not identified','Not identified','Cash','UPI'];
 const documents=[{source:1,kind:'Daily sheet',date,lines:amounts.map((amount,index)=>({section:index<2?'Sales':'Payment',label:labels[index],amount,unclear:index===uncertain}))}];
 const contexts:Context[]=amounts.map((_,line)=>({source:1,line,role:roles[line],method:methods[line],party:null,purpose:null,billRef:null,transactionRef:null,unclear:false}));
 const raw=makeRaw(documents,contexts);raw.output[0].content[0].text=JSON.stringify({date,documents,contexts});return raw;
}

for(const width of [320,390,1280])test(`saved Sales vs money badges and owner drafts at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});
 const historyRequest=page.waitForRequest('**/days/history');
 await page.getByRole('button',{name:'History',exact:true}).click();
 const authorization=(await historyRequest).headers().authorization;
 expect(authorization).toBeTruthy();
 const endpoint=new URL((await historyRequest).url()).origin;
 const cases=[
  {date:'2026-11-06',amounts:[999,3750,4000,12250],uncertain:0,corrections:[{id:'1:0',amount:12500}],badge:'Matches',tone:'matches',detail:null,room:'₹12,500'},
  {date:'2026-11-05',amounts:[12500,3750,4000,12050],uncertain:-1,corrections:[],badge:'Check',tone:'check',detail:'₹200 short',room:'₹12,500'},
  {date:'2026-11-04',amounts:[12500,3750,4000,12450],uncertain:-1,corrections:[],badge:'Check',tone:'check',detail:'₹200 extra',room:'₹12,500'},
  {date:'2026-11-03',amounts:[12500,3750,4000,12250],uncertain:0,corrections:[],badge:'Not enough info',tone:'incomplete',detail:null,room:'Not extracted'},
  {date:'2026-11-02',amounts:[null,3750,4000,12250],uncertain:-1,corrections:[],badge:'Not enough info',tone:'incomplete',detail:null,room:'Not extracted'},
 ];
 for(const item of cases){
  const response=await page.request.post(`${endpoint}/days/confirm`,{headers:{Authorization:authorization},data:{raw:reading(item.date,item.amounts,item.uncertain),date:item.date,sources:[1],dsrSources:[1],choices:[],corrections:item.corrections,expectedVersion:null}});
  expect(response.status()).toBe(200);
 }
 await page.getByRole('button',{name:'Upload DSR',exact:true}).click();
 await page.getByRole('button',{name:'History',exact:true}).click();
 await expect(page.locator('.history-card')).toHaveCount(5);
 const colours={matches:'rgb(39, 103, 73)',check:'rgb(138, 90, 0)',incomplete:'rgb(85, 97, 107)'};
 for(const item of cases){
  const day=Number(item.date.slice(-2)),card=page.locator('.history-card').filter({has:page.getByRole('button',{name:`${day} Nov 2026`,exact:true})});
  const check=card.locator('.sales-money-check');
  await expect(check).toBeVisible();await expect(check).toHaveAttribute('data-tone',item.tone);
  await expect(check.locator('.sales-money-badge')).toHaveText(item.badge);
  expect(await check.locator('.sales-money-badge').evaluate(node=>getComputedStyle(node).color)).toBe(colours[item.tone as keyof typeof colours]);
  await expect(card.locator('.day-badge')).toHaveText('Not enough info'); // Existing evidence status stays separate.
  await expect(card.locator('dl > div').filter({hasText:'Room revenue'}).locator('dd')).toHaveText(item.room);
  if(item.detail)await expect(check).toContainText(item.detail);
  else await expect(check).not.toContainText(/short|extra/);
  const link=card.getByRole('link',{name:'Send to owner',exact:true}),draft=new URL((await link.getAttribute('href'))!).searchParams.get('text')!;
  const expected=`Sales vs money: ${item.badge}${item.detail?` — ${item.detail}`:''}`;
  expect(draft).toContain(expected);await card.locator('summary').click();await expect(card.locator('pre')).toContainText(expected);
  if(item.uncertain===0&&!item.corrections.length)await expect(card.locator('pre')).toContainText('Room Bills: ₹12,500? Please check.');
  if(item.corrections.length)expect(draft).not.toContain('₹999');
  await card.locator('summary').click();
 }
 await page.evaluate(async()=>{scrollTo(0,0);await document.fonts.ready;});
 await page.screenshot({path:`.test-results/sales-money-history-${width}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const detail=page.waitForResponse(response=>new URL(response.url()).pathname==='/days/detail'&&new URL(response.url()).searchParams.get('date')==='2026-11-06');
 await page.getByRole('button',{name:'6 Nov 2026',exact:true}).click();const response=await detail;expect(response.status()).toBe(200);
 const {day}=await response.json() as {day:SavedDay};expect(day.lines.find(line=>line.id==='1:0')).toMatchObject({aiValue:999,correctedValue:12500,aiUnclear:true,unclear:false});
 expect(day.checks.find(check=>check.title==='Room charges')?.dsr).toBe(12500);expect(day.aiReading.documents[0].lines[0]).toMatchObject({amount:999,unclear:true});
 await expect(page.locator('.receipt-amounts > div').filter({has:page.getByText('Room revenue',{exact:true})}).locator('dd')).toHaveText('₹12,500');
 await expect(page.locator('.day-receipt')).not.toContainText('₹999');await expect(page.locator('.day-receipt .sales-money-badge')).toHaveText('Matches');
 await page.locator('#history-page summary').click();
 await expect(page.locator('#history-page pre')).toContainText('Sales vs money: Matches');
});
