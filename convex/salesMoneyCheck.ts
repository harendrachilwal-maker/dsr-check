import type {DaySnapshot} from '../src/confirmed-day';
import type {SalesMoneyCheck} from '../src/sales-money';

const operands=[
 {title:'Room charges',role:'Room charge',method:null},
 {title:'Food charges',role:'Food charge',method:null},
 {title:'Guest cash received',role:'Guest payment',method:'Cash'},
 {title:'Guest UPI received',role:'Guest payment',method:'UPI'},
] as const;
const safePaise=BigInt(Number.MAX_SAFE_INTEGER);
const rupees=(paise:bigint|null)=>paise!==null&&paise<=safePaise&&paise>=-safePaise?Number(paise)/100:null;
const sum=(left:bigint|null,right:bigint|null)=>left===null||right===null?null:left+right;

// Derive this additional check on read; preserve the confirmed snapshot and its evidence checks.
export function salesMoneyCheck(snapshot:DaySnapshot):SalesMoneyCheck {
 const amounts=operands.map(({title,role,method})=>{
  const checks=snapshot.checks.filter(check=>check.title===title);
  const value=checks.length===1?checks[0].dsr:null;
  if(value===null||!Number.isFinite(value))return null;
  const contributors=snapshot.aiReading.contexts.filter(context=>snapshot.aiReading.dsrSources.includes(context.source)&&context.role===role&&(method===null||context.method===method));
  if(!contributors.length||contributors.some(context=>{
   const line=snapshot.lines.find(line=>line.id===`${context.source}:${context.line}`&&line.source===context.source);
   if(!line)return true;
   const current=Object.hasOwn(line,'correctedValue')?line.correctedValue:line.aiValue;
   return context.unclear||line.unclear||current===null||current===undefined;
  }))return null;
  // These are the saved, corrected DSR totals; neither evidence nor original AI amounts enter the sum.
  const paise=Math.round(value*100);
  return Number.isSafeInteger(paise)?BigInt(paise):null;
 });
 const salesPaise=sum(amounts[0],amounts[1]),moneyPaise=sum(amounts[2],amounts[3]);
 const sales=rupees(salesPaise),money=rupees(moneyPaise);
 if(sales===null||money===null)return {status:'Not enough information',sales,money,difference:null};
 const difference=rupees(moneyPaise!-salesPaise!);
 if(difference===null)return {status:'Not enough information',sales,money,difference:null};
 return {status:difference===0?'Matched':'Difference',sales,money,difference};
}
