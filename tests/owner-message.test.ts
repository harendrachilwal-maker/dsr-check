import {test,expect} from 'vitest';
import {ownerMessage,whatsappLink} from '../src/owner-message';
import {prepareDay} from '../src/confirmed-day';
import {comparisonReadingFromRaw} from '../src/comparison';
import {makeRaw,comparisonDate} from './comparison-fixture';
import {ownerReading,missingUpiMessage,octoberOwnerReading,octoberOwnerDate,octoberOwnerMessage} from './owner-message-fixture';

const snapshot=()=>prepareDay(comparisonReadingFromRaw(makeRaw(),comparisonDate,[1,2,3,4,5],[1]),[],[]);
test('owner draft uses persisted DSR figures, Indian rupees and the document date without recalculation',()=>{
 const day=snapshot();const before=JSON.stringify(day);
 expect(ownerMessage(day)).toBe('Manager-confirmed DSR — 2 Nov 2026\nRoom revenue: Not extracted\nFood revenue: Not extracted\nGuest cash: Not extracted\nGuest UPI: Not extracted\nExpenses: ₹21,000\nSales vs money: Not enough info\n\nNeeds checking\nRoom revenue: not read, please check.\nFood revenue: not read, please check.\nGuest cash: not read, please check.\nGuest UPI: not read, please check.');
 expect(JSON.stringify(day)).toBe(before);
});
const ownerDay=(raw=ownerReading(),corrections:Parameters<typeof prepareDay>[1]=[],sources=[1])=>prepareDay(comparisonReadingFromRaw(raw,comparisonDate,sources,[1]),corrections,[]);
const needsChecking=(message:string)=>message.split('\nNeeds checking\n')[1]?.split('\n')??[];
const octoberDay=()=>prepareDay(comparisonReadingFromRaw(octoberOwnerReading(),octoberOwnerDate,[1],[1]),[],[]);
test('10 Oct 2026: unclassified UPI is listed only as Guest UPI while OTA PAY stays unread',()=>{
 const day=octoberDay(),before=JSON.stringify(day);
 expect(day.checks.find(check=>check.title==='Guest UPI received')!.sources).not.toContain('1:3');
 expect(ownerMessage(day)).toBe(octoberOwnerMessage);
 expect(JSON.stringify(day)).toBe(before);
});
test.each(['UPI','Guest UPI','Cash','Guest cash','Room','Food','  gUeSt   uPi  '])('an unclassified unread %s alias uses its missing main amount name once',label=>{
 const day=octoberDay();day.lines[3].label=label;day.lines[3].section=/room|food/i.test(label)?'Sales':'Payment';
 expect(needsChecking(ownerMessage(day))).toEqual(needsChecking(octoberOwnerMessage));
});
test('an unread alias stays listed if its main amount was read',()=>{
 const day=octoberDay();day.checks.find(check=>check.title==='Guest UPI received')!.dsr=0;
 expect(needsChecking(ownerMessage(day))).toContain('UPI: not read, please check.');
 expect(ownerMessage(day)).toContain('Guest UPI: ₹0');
});
test('an unread UPI row from another date keeps its own warning',()=>{
 const day=octoberDay();day.lines[3].documentDate='2026-10-09';
 expect(needsChecking(ownerMessage(day))).toContain('UPI (9 Oct 2026): not read, please check.');
});
test('an unclassified unread expense UPI row keeps its own warning',()=>{
 const day=octoberDay();day.lines[3].section='Expense';
 expect(needsChecking(ownerMessage(day))).toContain('UPI: not read, please check.');
});
test('a manager-classified outgoing UPI row keeps its own warning',()=>{
 const reading=comparisonReadingFromRaw(octoberOwnerReading(),octoberOwnerDate,[1],[1]);
 reading.documents.push({source:2,kind:'UPI record',date:octoberOwnerDate,lines:[{...reading.documents[0].lines[3]}]});
 reading.contexts.push({...reading.contexts[3],source:2,line:0});
 const day=prepareDay(reading,[],[{id:'2:0',role:'Expense payment',method:'UPI',party:null,purpose:null,link:null}]);
 expect(needsChecking(ownerMessage(day))).toContain('UPI: not read, please check.');
});
test('a missing DSR UPI cell has exactly one plain warning while the main summary stays unchanged',()=>{
 const day=ownerDay(),before=JSON.stringify(day);
 expect(ownerMessage(day)).toBe(missingUpiMessage);
 expect(needsChecking(ownerMessage(day))).toEqual(['Guest UPI: not read, please check.']);
 expect(JSON.stringify(day)).toBe(before);
});
test.each([
 {index:0,label:'Room revenue'},
 {index:1,label:'Food revenue'},
 {index:2,label:'Guest cash'},
 {index:3,label:'Guest UPI'},
 {index:4,label:'Expenses'},
])('a missing single DSR $label field is listed once under its summary name',({index,label})=>{
 const amounts:(number|null)[]=[12500,3750,4000,12250,500];amounts[index]=null;
 expect(needsChecking(ownerMessage(ownerDay(ownerReading(amounts))))).toEqual([`${label}: not read, please check.`]);
});
test('a corrected label and a corrected blank amount still identify the same saved missing UPI cell',()=>{
 const day=ownerDay(ownerReading([12500,3750,4000,12250,500]),[{id:'1:3',label:'Online payment checked',amount:null}]);
 expect(needsChecking(ownerMessage(day))).toEqual(['Guest UPI: not read, please check.']);
 expect(ownerMessage(day)).not.toContain('Online payment checked');
 expect(day.lines[3]).toMatchObject({aiValue:12250,correctedValue:null,correctedLabel:'Online payment checked'});
});
test.each([0,12250])('a corrected readable UPI amount of %s clears the missing warning',amount=>{
 const message=ownerMessage(ownerDay(ownerReading(),[{id:'1:3',amount}]));
 expect(needsChecking(message)).toEqual([]);
 expect(message).not.toContain('UPI: not read');
 expect(message).toContain(`Guest UPI: ${amount===0?'₹0':'₹12,250'}`);
});
test.each([comparisonDate,'2026-11-01'])('a separate supporting UPI amount dated %s keeps its own missing warning',date=>{
 const raw=ownerReading(),answer=JSON.parse(raw.output[0].content[0].text);
 answer.documents.push({source:2,kind:'UPI record',date,lines:[{section:'Expense',label:'UPI',amount:null,unclear:true}]});
 answer.contexts.push({...answer.contexts[3],source:2,line:0,role:'Expense payment',party:'Example Painter',purpose:'Painting'});
 raw.output[0].content[0].text=JSON.stringify(answer);
 expect(needsChecking(ownerMessage(ownerDay(raw,[],[1,2])))).toEqual(['Guest UPI: not read, please check.',`UPI${date===comparisonDate?'':' (1 Nov 2026)'}: not read, please check.`]);
});
test('an uncertain numeric DSR UPI value keeps its question-mark warning',()=>{
 const raw=ownerReading([12500,3750,4000,12250,500]),answer=JSON.parse(raw.output[0].content[0].text);
 answer.documents[0].lines[3].unclear=true;raw.output[0].content[0].text=JSON.stringify(answer);
 expect(needsChecking(ownerMessage(ownerDay(raw)))).toContain('UPI: ₹12,250? Please check.');
});
test('separate unreadable DSR expense amounts are retained rather than collapsed into the expense total',()=>{
 const raw=ownerReading(),answer=JSON.parse(raw.output[0].content[0].text);
 answer.documents[0].lines[4]={section:'Expense',label:'Milk dairy',amount:null,unclear:true};
 answer.documents[0].lines.push({section:'Expense',label:'Painter',amount:null,unclear:true});
 answer.contexts.push({...answer.contexts[4],line:5});raw.output[0].content[0].text=JSON.stringify(answer);
 const needs=needsChecking(ownerMessage(ownerDay(raw)));
 expect(needs.filter(line=>line==='Milk dairy: not read, please check.')).toHaveLength(1);
 expect(needs.filter(line=>line==='Painter: not read, please check.')).toHaveLength(1);
});
test('a sole missing named DSR expense keeps its name once instead of a duplicate aggregate warning',()=>{
 const raw=ownerReading([12500,3750,4000,12250,null]),answer=JSON.parse(raw.output[0].content[0].text);
 answer.documents[0].lines[4].label='Milk dairy';raw.output[0].content[0].text=JSON.stringify(answer);
 expect(needsChecking(ownerMessage(ownerDay(raw)))).toEqual(['Milk dairy: not read, please check.']);
});
test('missing, uncertain and written-total lines stay flagged, with no duplicate totals and no guessed zero',()=>{
 const day=snapshot();day.lines[1].aiValue=null;day.lines[1].unclear=true;day.lines[1].label='Other Bills';
 day.lines[3].unclear=true;day.writtenTotals=[day.lines[3]];
 const message=ownerMessage(day);
 expect(message).toContain('Other bills: not read, please check.');
 expect(message).not.toContain('Photo 2 · Expense');
 expect(message).toContain('TOTAL: ₹6,000? Please check.');
 expect(message.match(/TOTAL: ₹6,000\?/g)).toHaveLength(1);
 expect(message).not.toContain('₹0');expect(message).not.toContain('€');
});
test('saved corrections replace original AI amounts and resolved uncertainty does not reappear',()=>{
 const day=snapshot();day.lines[1].aiValue=123456;day.lines[1].aiUnclear=true;
 day.lines[1].correctedValue=75;day.lines[1].correctedLabel='Checked supplies';day.lines[1].label='Checked supplies';day.lines[1].unclear=true;
 expect(ownerMessage(day)).toContain('Checked supplies: ₹75?');expect(ownerMessage(day)).not.toContain('₹1,23,456');
 day.lines[1].unclear=false;expect(ownerMessage(day)).not.toContain('Checked supplies:');
 day.lines[1].correctedValue=null;expect(ownerMessage(day)).toContain('Checked supplies: not read, please check.');
});
test('explicit saved zero, large Indian amounts, and other-date sources remain distinct',()=>{
 const day=snapshot();day.checks[0].dsr=0;day.checks[1].dsr=123456.75;
 day.lines[1].aiValue=0;day.lines[1].unclear=true;day.lines[1].documentDate='2026-10-29';
 const message=ownerMessage(day);expect(message).toContain('Room revenue: ₹0');expect(message).toContain('Food revenue: ₹1,23,456.75');
 expect(message).toContain('Supplies (29 Oct 2026): ₹0? Please check.');
});
test('WhatsApp receives the exact draft as encoded text and leaves recipient selection to the manager',()=>{
 const message='Manager-confirmed DSR — 2 Nov 2026\nNeeds checking\nExample & supplies: ₹1,23,456?';
 const url=new URL(whatsappLink(message));expect(url.origin).toBe('https://wa.me');expect(url.pathname).toBe('/');
 expect(url.searchParams.get('text')).toBe(message);expect(url.searchParams.size).toBe(1);
});
test.each([
 {status:'Matched' as const,sales:1000,money:1000,difference:0,text:'Matches'},
 {status:'Difference' as const,sales:1000,money:800,difference:-200,text:'Check — ₹200 short'},
 {status:'Difference' as const,sales:1000,money:1200,difference:200,text:'Check — ₹200 extra'},
 {status:'Difference' as const,sales:150000,money:267413.5,difference:117413.5,text:'Check — ₹1,17,413.5 extra'},
 {status:'Not enough information' as const,sales:null,money:1000,difference:null,text:'Not enough info'},
])('the owner draft formats the server check as $text without recalculating from other saved figures',({text,...salesMoneyCheck})=>{
 const day={...snapshot(),salesMoneyCheck};const before=JSON.stringify(day);
 const message=ownerMessage(day);
 expect(message).toContain(`\nSales vs money: ${text}\n`);
 expect(new URL(whatsappLink(message)).searchParams.get('text')).toBe(message);
 expect(JSON.stringify(day)).toBe(before);
});
