import type {Context} from '../src/comparison';
import {makeRaw,comparisonDate} from './comparison-fixture';

// Made-up records only, including a missing DSR cell written as UPI.
export function ownerReading(amounts:(number|null)[]=[12500,3750,4000,null,500]){
 const labels=['Room Bills','Food Bills','Guest Cash','UPI','Expense Bills'];
 const roles:Context['role'][]=['Room charge','Food charge','Guest payment','Guest payment','Expense charge'];
 const methods:Context['method'][]=['Not identified','Not identified','Cash','UPI','Not identified'];
 const documents=[{source:1,kind:'Daily sheet',date:comparisonDate,lines:amounts.map((amount,index)=>({section:index<2?'Sales':index<4?'Payment':'Expense',label:labels[index],amount,unclear:amount===null}))}];
 const contexts:Context[]=amounts.map((_,line)=>({source:1,line,role:roles[line],method:methods[line],party:null,purpose:null,billRef:null,transactionRef:null,unclear:false}));
 return makeRaw(documents,contexts);
}

export const missingUpiMessage=`Manager-confirmed DSR — 2 Nov 2026
Room revenue: ₹12,500
Food revenue: ₹3,750
Guest cash: ₹4,000
Guest UPI: Not extracted
Expenses: ₹500
Sales vs money: Not enough info

Needs checking
Guest UPI: not read, please check.`;

// Reproduce the reported 10 Oct label/date case without using real hotel figures.
export const octoberOwnerDate='2026-10-10';
export function octoberOwnerReading(){
 const raw=ownerReading([null,null,null,null,null]),answer=JSON.parse(raw.output[0].content[0].text);
 answer.date=octoberOwnerDate;answer.documents[0].date=octoberOwnerDate;
 answer.contexts[3].role='Not identified';answer.contexts[3].method='Not identified';
 answer.documents[0].lines.push({section:'Payment',label:'OTA PAY',amount:null,unclear:true});
 answer.contexts.push({...answer.contexts[3],line:5,role:'OTA payment'});
 raw.output[0].content[0].text=JSON.stringify(answer);return raw;
}
export const octoberOwnerMessage=`Manager-confirmed DSR — 10 Oct 2026
Room revenue: Not extracted
Food revenue: Not extracted
Guest cash: Not extracted
Guest UPI: Not extracted
Expenses: Not extracted
Sales vs money: Not enough info

Needs checking
Room revenue: not read, please check.
Food revenue: not read, please check.
Guest cash: not read, please check.
Guest UPI: not read, please check.
Expenses: not read, please check.
OTA PAY: not read, please check.`;
