import {test,expect} from 'vitest';
import {displayDate,displayMonth,displayTime} from '../src/date-display';
test('dates display as day short-month year, without changing the source or guessing missing dates',()=>{
 expect(displayDate('2026-10-10')).toBe('10 Oct 2026');expect(displayDate('2026-01-01')).toBe('1 Jan 2026');
 expect(displayDate('2024-02-29')).toBe('29 Feb 2024');expect(displayDate('2026-02-29')).toBe('Not extracted');
 expect(displayDate(null)).toBe('Not extracted');expect(displayDate('','Choose a date')).toBe('Choose a date');
 const iso='2026-10-10';displayDate(iso);expect(iso).toBe('2026-10-10');
});
test('History month headings retain the document year and month',()=>{
 expect(displayMonth('2026-10-10')).toBe('October 2026');expect(displayMonth('2027-01-01')).toBe('January 2027');expect(displayMonth('2026-02-30')).toBe('Date not extracted');
});
test('confirmation dates keep the saved instant, showing its IST date in the same format',()=>{
 expect(displayTime(Date.parse('2026-10-09T20:30:00Z'))).toBe('10 Oct 2026, 2:00:00 am IST');
});
