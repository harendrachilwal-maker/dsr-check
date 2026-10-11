import type {DaySnapshot} from './confirmed-day';
import {displayDate} from './date-display';
import {displayAmount} from './extraction';
import {historySummary} from './history-summary';
import {salesMoneyPresentation,type SalesMoneyCheck} from './sales-money';

const mainAmountAliases=new Map([
 ['upi','Guest UPI'],['guest upi','Guest UPI'],['cash','Guest cash'],['guest cash','Guest cash'],
 ['room','Room revenue'],['room revenue','Room revenue'],['room bills','Room revenue'],
 ['food','Food revenue'],['food revenue','Food revenue'],['food bills','Food revenue'],
]);

// This is a draft from a persisted snapshot, not a new calculation or a delivery record.
type OwnerDay=Pick<DaySnapshot,'date'|'checks'|'lines'|'aiReading'>&{salesMoneyCheck?:SalesMoneyCheck;choices?:DaySnapshot['choices']};
export function ownerNeedsChecking(day:OwnerDay):string[] {
 const metrics=historySummary(day),needs:string[]=[];
 const missingMain=new Set(metrics.filter(metric=>metric.value==='Not extracted').map(metric=>metric.label));
 const contexts=new Map(day.aiReading.contexts.map(context=>[`${context.source}:${context.line}`,context]));
 const choices=new Map((day.choices??[]).map(choice=>[choice.id,choice]));
 const titles=['Room charges','Food charges','Guest cash received','Guest UPI received','Expenses'];
 const amountOf=(line:DaySnapshot['lines'][number])=>Object.hasOwn(line,'correctedValue')?line.correctedValue!:line.aiValue;
 const represented=new Set<string>();
 metrics.forEach((metric,index)=>{
  if(metric.value!=='Not extracted')return;
  const sources=new Set(day.checks.find(check=>check.title===titles[index])?.sources??[]);
  const contributors=day.lines.filter(line=>line.documentDate===day.date&&day.aiReading.dsrSources.includes(line.source)&&sources.has(line.id));
  // Merge only the same single DSR cell; separate expenses and supporting amounts keep their warnings.
  if(contributors.length===1&&amountOf(contributors[0])===null){
   const label=contributors[0].label?.replace(/\s+/g,' ').trim();
   // A named expense is clearer than its aggregate; keep that one original warning instead.
   if(metric.label==='Expenses'&&label&&!/^(?:expenses?|expense bills?|total expenses?|expense totals?)$/i.test(label))return;
   represented.add(contributors[0].id);
  }
  needs.push(`${metric.label}: not read, please check.`);
 });
 for(const line of day.lines){
  const amount=amountOf(line);
  if(amount!==null&&!line.unclear)continue;
  if(represented.has(line.id))continue;
  const label=(line.label??'Amount').replace(/\s+/g,' ').trim().replace(/^Other Bills$/i,'Other bills')||'Amount';
  const main=mainAmountAliases.get(label.toLowerCase());
  if(amount===null&&main&&missingMain.has(main as typeof metrics[number]['label'])&&(line.documentDate===null||line.documentDate===day.date)&&!line.writtenTotal){
   const context=choices.get(line.id)??contexts.get(line.id),role=context?.role??'Not identified';
   const sales=main==='Room revenue'||main==='Food revenue';
   const sameRole=role==='Not identified'||(sales?role===(main==='Room revenue'?'Room charge':'Food charge'):role==='Guest payment'&&(!context||context.method==='Not identified'||context.method===(main==='Guest UPI'?'UPI':'Cash')));
   // An unclassified short label can repeat a main field, but never hide outgoing money or another date.
   if(sameRole&&(line.section===null||line.section===(sales?'Sales':'Payment')))continue;
  }
  const date=line.documentDate!==null&&line.documentDate!==day.date?` (${displayDate(line.documentDate)})`:'';
  needs.push(`${label}${date}: ${amount===null?'not read, please check.':`${displayAmount(amount)}? Please check.`}`);
 }
 return needs;
}

export function ownerMessage(day:OwnerDay):string {
 const metrics=historySummary(day),needs=ownerNeedsChecking(day),check=salesMoneyPresentation(day.salesMoneyCheck);
 return [`Manager-confirmed DSR — ${displayDate(day.date)}`,...metrics.map(metric=>`${metric.label}: ${metric.value}`),`Sales vs money: ${check.label}${check.detail?` — ${check.detail}`:''}`,...(needs.length?['','Needs checking',...needs]:[])].join('\n');
}

export const whatsappLink=(message:string)=>`https://wa.me/?text=${encodeURIComponent(message)}`;
