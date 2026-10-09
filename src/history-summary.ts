import type {SavedDay} from './confirmed-day';
import {displayAmount} from './extraction';
const metrics=[['Room revenue','Room charges'],['Food revenue','Food charges'],['Guest cash','Guest cash received'],['Guest UPI','Guest UPI received'],['Expenses','Expenses']] as const;
// Read the already-saved, code-calculated DSR side of each check. Never use evidence totals or recalculate the report.
export function historySummary(day:Pick<SavedDay,'checks'>){
 return metrics.map(([label,title])=>({label,value:displayAmount(day.checks.find(check=>check.title===title)?.dsr??null)}));
}
export function historyStatus(day:Pick<SavedDay,'checks'>){
 const required=[...metrics.map(([,title])=>title),'OTA money received'];
 if(required.some(title=>!day.checks.some(check=>check.title===title))||day.checks.some(check=>check.status==='Not enough information'))return {label:'Not enough info',tone:'incomplete'} as const;
 if(day.checks.some(check=>check.status==='Difference'))return {label:'Check',tone:'check'} as const;
 return {label:'Matches',tone:'matches'} as const;
}
