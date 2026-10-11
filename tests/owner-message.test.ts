import {test,expect} from 'vitest';
import {ownerMessage,whatsappLink} from '../src/owner-message';
import {prepareDay} from '../src/confirmed-day';
import {comparisonReadingFromRaw} from '../src/comparison';
import {makeRaw,comparisonDate} from './comparison-fixture';

const snapshot=()=>prepareDay(comparisonReadingFromRaw(makeRaw(),comparisonDate,[1,2,3,4,5],[1]),[],[]);
test('owner draft uses persisted DSR figures, Indian rupees and the document date without recalculation',()=>{
 const day=snapshot();const before=JSON.stringify(day);
 expect(ownerMessage(day)).toBe('Manager-confirmed DSR — 2 Nov 2026\nRoom revenue: Not extracted\nFood revenue: Not extracted\nGuest cash: Not extracted\nGuest UPI: Not extracted\nExpenses: ₹21,000\n\nNeeds checking\nRoom revenue: Not extracted\nFood revenue: Not extracted\nGuest cash: Not extracted\nGuest UPI: Not extracted');
 expect(JSON.stringify(day)).toBe(before);
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
