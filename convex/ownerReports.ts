import {v} from 'convex/values';
import {internalQuery} from './_generated/server';
import {ownerDayReference,ownerReceipt} from './ownerReportValidators';
import {salesMoneyCheck} from './salesMoneyCheck';
import {ownerNeedsChecking} from '../src/owner-message';
import {ownerMetrics,type OwnerMonth,type OwnerReceipt,type OwnerValues} from '../src/owner-data';
import type {DaySnapshot} from '../src/confirmed-day';

const safePaise=BigInt(Number.MAX_SAFE_INTEGER);
const blankValues=():OwnerValues=>({room:null,food:null,cash:null,upi:null,expenses:null});
const titles={room:'Room charges',food:'Food charges',cash:'Guest cash received',upi:'Guest UPI received',expenses:'Expenses'} as const;

export function validMonth(month:string):boolean {
 return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)&&Number(month.slice(0,4))>=1;
}
export function monthBounds(month:string){
 if(!validMonth(month))throw new Error('Choose a valid month.');
 const year=Number(month.slice(0,4)),number=Number(month.slice(5));
 const next=number===12?(year===9999?'9999-13':`${String(year+1).padStart(4,'0')}-01`):`${month.slice(0,4)}-${String(number+1).padStart(2,'0')}`;
 return {start:`${month}-01`,end:`${next}-01`};
}
function dateInMonth(date:string,month:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date.slice(0,7)!==month)return false;
 const year=Number(month.slice(0,4)),number=Number(month.slice(5)),day=Number(date.slice(8));
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const length=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][number-1];
 return day>=1&&day<=length;
}
function paise(value:number):bigint|null {
 if(!Number.isFinite(value))return null;
 const rounded=Math.round(value*100);
 if(!Number.isSafeInteger(rounded)||Math.abs(value*100-rounded)>0.001)return null;
 return BigInt(rounded);
}
function savedValues(snapshot:DaySnapshot):OwnerValues {
 const values=blankValues(),dsrs=new Set(snapshot.aiReading.dsrSources);
 const contexts=new Map(snapshot.aiReading.contexts.map(context=>[`${context.source}:${context.line}`,context]));
 const choices=new Map(snapshot.choices.map(choice=>[choice.id,choice]));
 for(const {key} of ownerMetrics){
  const checks=snapshot.checks.filter(check=>check.title===titles[key]);
  if(checks.length!==1||checks[0].dsr===null||paise(checks[0].dsr)===null)continue;
  const sourceIds=checks[0].sources.filter(id=>dsrs.has(Number(id.split(':')[0])));
  if(!sourceIds.length||sourceIds.some(id=>{
   const line=snapshot.lines.find(item=>item.id===id&&dsrs.has(item.source)&&item.documentDate===snapshot.date);
   if(!line||line.unclear)return true;
   const current=Object.hasOwn(line,'correctedValue')?line.correctedValue:line.aiValue;
   if(current===null||current===undefined||paise(current)===null)return true;
   const context=contexts.get(id),choice=choices.get(id);
   return !context||(choice?choice.role==='Not identified':context.unclear);
  }))continue;
  // The saved check already contains the corrected DSR total. Evidence and AI figures are not re-added.
  values[key]=checks[0].dsr;
 }
 return values;
}

// Only trusted HTTP coordination supplies a manager's scope; these queries are not public entry points.
export const monthRefs=internalQuery({
 args:{scope:v.string(),month:v.string()},returns:v.array(ownerDayReference),
 handler:async(ctx,{scope,month})=>{
  const {start,end}=monthBounds(month);
  const days=await ctx.db.query('confirmedDays').withIndex('by_scope_date',query=>query.eq('scope',scope).gte('date',start).lt('date',end)).order('desc').take(32);
  if(days.length>31||days.some(day=>!dateInMonth(day.date,month))||new Set(days.map(day=>day.date)).size!==days.length)throw new Error('The saved days changed. Refresh the month and try again.');
  return days.map(({date,version,confirmedAt})=>({date,version,confirmedAt}));
 },
});
export const receipt=internalQuery({
 args:{scope:v.string(),date:v.string(),expectedVersion:v.id('confirmedVersions')},returns:v.union(ownerReceipt,v.null()),
 handler:async(ctx,{scope,date,expectedVersion})=>{
  const month=date.slice(0,7);
  if(!validMonth(month)||!dateInMonth(date,month))return null;
  const current=await ctx.db.query('confirmedDays').withIndex('by_scope_date',query=>query.eq('scope',scope).eq('date',date)).unique();
  if(!current||current.version!==expectedVersion)return null;
  const version=await ctx.db.get(expectedVersion);
  if(!version||version.scope!==scope||version.date!==date||version.snapshot.date!==date||version.confirmedAt!==current.confirmedAt)return null;
  const snapshot=version.snapshot;
  return {date,version:version._id,confirmedAt:version.confirmedAt,values:savedValues(snapshot),salesMoneyCheck:salesMoneyCheck(snapshot),needsChecking:ownerNeedsChecking(snapshot),...(version.editedBy?{editedBy:version.editedBy}:{}),...(version.editedAt!==undefined?{editedAt:version.editedAt}:{})};
 },
});

export function aggregateOwnerMonth(month:string,receipts:OwnerReceipt[]):OwnerMonth {
 monthBounds(month);
 if(receipts.length>31||receipts.some(day=>!dateInMonth(day.date,month))||new Set(receipts.map(day=>day.date)).size!==receipts.length)throw new Error('The saved days changed. Refresh the month and try again.');
 const days=[...receipts].sort((left,right)=>right.date.localeCompare(left.date));
 const totals=blankValues(),counts={matches:0,check:0,incomplete:0,missingAmounts:0};
 for(const day of days){
  if(day.salesMoneyCheck.status==='Matched')counts.matches++;
  else if(day.salesMoneyCheck.status==='Difference')counts.check++;
  else counts.incomplete++;
  if(ownerMetrics.some(({key})=>day.values[key]===null))counts.missingAmounts++;
 }
 for(const {key} of ownerMetrics){
  if(!days.length||days.some(day=>day.values[key]===null))continue;
  let sum=0n,complete=true;
  for(const day of days){const value=paise(day.values[key]!);if(value===null){complete=false;break;}sum+=value;}
  if(complete&&sum<=safePaise&&sum>=-safePaise)totals[key]=Number(sum)/100;
 }
 return {month,confirmedDays:days.length,totals,counts,days};
}
