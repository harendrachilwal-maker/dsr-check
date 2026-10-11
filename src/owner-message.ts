import type {DaySnapshot} from './confirmed-day';
import {displayDate} from './date-display';
import {displayAmount} from './extraction';
import {historySummary} from './history-summary';

// This is a draft from a persisted snapshot, not a new calculation or a delivery record.
export function ownerMessage(day:Pick<DaySnapshot,'date'|'checks'|'lines'>):string {
 const metrics=historySummary(day),needs=metrics.filter(metric=>metric.value==='Not extracted').map(metric=>`${metric.label}: ${metric.value}`);
 for(const line of day.lines){
  const amount=Object.hasOwn(line,'correctedValue')?line.correctedValue!:line.aiValue;
  if(amount!==null&&!line.unclear)continue;
  const date=line.documentDate!==null&&line.documentDate!==day.date?` (${displayDate(line.documentDate)})`:'';
  const label=(line.label??'Amount').replace(/\s+/g,' ').trim().replace(/^Other Bills$/i,'Other bills')||'Amount';
  needs.push(`${label}${date}: ${amount===null?'not read, please check.':`${displayAmount(amount)}? Please check.`}`);
 }
 return [`Manager-confirmed DSR — ${displayDate(day.date)}`,...metrics.map(metric=>`${metric.label}: ${metric.value}`),...(needs.length?['','Needs checking',...needs]:[])].join('\n');
}

export const whatsappLink=(message:string)=>`https://wa.me/?text=${encodeURIComponent(message)}`;
