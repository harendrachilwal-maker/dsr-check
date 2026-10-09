import { rawAnswer, datedDocumentsFromRawResponse, type ReadDocument, type DsrLine } from './extraction';

export const moneyRoles = ['Room charge', 'Food charge', 'Expense charge', 'Guest payment', 'OTA payment', 'Expense payment', 'Advance received', 'Refund paid', 'Written total', 'Cash balance', 'Not identified'] as const;
export const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Not identified'] as const;
export type Context = { source:number; line:number; role:typeof moneyRoles[number]; party:string|null; purpose:string|null; billRef:string|null; transactionRef:string|null; method:typeof paymentMethods[number]; unclear:boolean };
export type Choice = { id:string; role:Context['role']; party:string|null; purpose:string|null; method:Context['method']; link:string|null };
export type Reading = {date:string;documents:ReadDocument[];contexts:Context[];dsrSources:number[]};
export type Entry = Context & {id:string;value:DsrLine;date:string|null;dsr:boolean;userContext:boolean;link:string|null};
export type Check = {title:string;status:'Matched'|'Difference'|'Not enough information';dsr:number|null;evidence:number|null;difference:number|null;note:string;sources:string[]};
export type Expense = {id:string;party:string;purpose:string;bill:number|null;paid:number|null;amount:number|null;missingBill:boolean;incomplete:boolean;sources:string[]};
export type Comparison = {date:string;checks:Check[];expenses:Expense[];entries:Entry[];questions:{id:string;text:string}[]};
export const entryId=(source:number,line:number)=>`${source}:${line}`;
const clean=(value:unknown):value is string|null=>value===null||(typeof value==='string'&&value.trim().length>0&&value.length<=200);
export function comparisonReadingFromRaw(raw:unknown,date:string,sources:number[],dsrSources:number[]):Reading {
  const answer=rawAnswer(raw) as Record<string,unknown>|null;
  if(!answer||Object.keys(answer).length!==3||!['date','documents','contexts'].every(key=>Object.hasOwn(answer,key))||!Array.isArray(answer.contexts))throw new Error('Invalid comparison reading');
  // Validate the original document values with the existing source/date/amount rules.
  const documentRaw={status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({date:answer.date,documents:answer.documents})}]}]};
  const {documents}=datedDocumentsFromRawResponse(documentRaw,date,sources,dsrSources);
  const seen=new Set<string>();
  const contexts:Context[]=answer.contexts.map(item=>{
    if(!item||typeof item!=='object'||Object.keys(item).length!==9||!['source','line','role','party','purpose','billRef','transactionRef','method','unclear'].every(key=>Object.hasOwn(item,key)))throw new Error('Invalid comparison context');
    const doc=documents.find(doc=>doc.source===item.source);
    if(!doc||!Number.isInteger(item.line)||item.line<0||!doc.lines[item.line]||seen.has(entryId(item.source,item.line)))throw new Error('Invalid context source');
    if(!moneyRoles.includes(item.role)||!paymentMethods.includes(item.method)||typeof item.unclear!=='boolean'||![item.party,item.purpose,item.billRef,item.transactionRef].every(clean))throw new Error('Invalid comparison context');
    seen.add(entryId(item.source,item.line));
    return {...item,unclear:item.unclear||item.role==='Not identified'};
  });
  if(contexts.length!==documents.reduce((sum,doc)=>sum+doc.lines.length,0))throw new Error('Missing comparison context');
  return {date,documents,contexts,dsrSources};
}
const normal=(value:string|null)=>(value??'').trim().toLocaleLowerCase('en-IN').replace(/\s+/g,' ');
const paise=(value:number)=>BigInt(Math.round(value*100));
const rupees=(value:bigint)=>{if(value>BigInt(Number.MAX_SAFE_INTEGER)||value< -BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Total exceeds safe range');return Number(value)/100;};
const sum=(entries:Entry[])=>entries.length?rupees(entries.reduce((total,entry)=>total+paise(entry.value.amount!),0n)):null;
const readable=(entry:Entry)=>entry.value.amount!==null&&!entry.value.unclear&&!entry.unclear&&entry.value.amount>=0;

export function buildComparison(reading:Reading,choices:Choice[]=[]):Comparison {
  if(!Array.isArray(choices)||choices.length>1000)throw new Error('Invalid context answers');
  const chosen=new Map<string,Choice>();
  for(const choice of choices){
    if(!choice||typeof choice!=='object'||Object.keys(choice).length!==6||!['id','role','party','purpose','method','link'].every(key=>Object.hasOwn(choice,key))||typeof choice.id!=='string'||chosen.has(choice.id)||!moneyRoles.includes(choice.role)||!paymentMethods.includes(choice.method)||![choice.party,choice.purpose,choice.link].every(clean))throw new Error('Invalid context answers');
    chosen.set(choice.id,choice);
  }
  const entries=reading.contexts.map((context:Context)=>{
    const doc=reading.documents.find(doc=>doc.source===context.source)!;const id=entryId(context.source,context.line),choice=chosen.get(id);
    const dsr=reading.dsrSources.includes(context.source);
    if(choice&&dsr)throw new Error('Cannot replace DSR context');
    if(choice&&context.role==='Written total')throw new Error('Cannot turn a written total into another transaction');
    return {...context,...(choice?{role:choice.role,party:choice.party,purpose:choice.purpose,method:choice.method,unclear:choice.role==='Not identified'}:{}),id,value:doc.lines[context.line],date:doc.date,dsr,userContext:!!choice,link:choice?.link??null};
  });
  if([...chosen.keys()].some(id=>!entries.some(entry=>entry.id===id)))throw new Error('Invalid context source');
  const questions:Comparison['questions']=[];
  const unknownDsr=reading.documents.some(doc=>reading.dsrSources.includes(doc.source)&&(!['Daily sheet','Handwritten DSR'].includes(doc.kind)||doc.date!==reading.date||!doc.lines.length));
  const unreadableDocuments=reading.documents.filter(doc=>!reading.dsrSources.includes(doc.source)&&(doc.kind==='Not identified'||!doc.lines.length));
  for(const doc of unreadableDocuments)questions.push({id:`${doc.source}:document`,text:'This photo could not be identified or read. Upload a clearer identifying photo; it cannot be silently omitted from a complete comparison.'});
  const eligible=entries.filter(entry=>!entry.dsr&&entry.date===reading.date);
  const excluded=entries.filter(entry=>!entry.dsr&&entry.date!==reading.date);
  for(const entry of excluded)questions.push({id:entry.id,text:entry.date===null?'The date was not extracted. Upload a photo showing its date.':'This document has a different date. It is excluded from this day’s comparison.'});
  for(const entry of eligible){if(entry.value.unclear||entry.value.amount===null)questions.push({id:entry.id,text:'Upload a clearer photo of this amount. It is excluded from complete totals.'});else if(entry.unclear||entry.role==='Not identified')questions.push({id:entry.id,text:'What does this entry represent? Add context below.'});}
  // A repeated bill/transaction reference is never counted twice. Conflicting copies block matching.
  const unique:Entry[]=[];const references=new Map<string,Entry>();const possibleDuplicates=new Map<string,Entry>();
  let duplicateConflict=false;
  for(const entry of eligible){
    const reference=entry.role.endsWith('charge')?entry.billRef:entry.role.endsWith('payment')?entry.transactionRef:null;
    const key=reference?`${entry.role}|${normal(entry.party)}|${normal(reference)}`:null;
    const previous=key?references.get(key):undefined;
    if(previous){
      if(entry.role.endsWith('charge')&&previous.source===entry.source){unique.push(entry);continue;}
      let identical=previous.value.amount===entry.value.amount&&readable(previous)&&readable(entry);
      if(entry.role.endsWith('charge')){
        const fingerprint=(source:number)=>JSON.stringify(eligible.filter(item=>item.source===source&&item.role===entry.role&&normal(item.party)===normal(entry.party)&&normal(item.billRef)===normal(entry.billRef)).map(item=>[item.value.label,item.value.section,item.value.amount,item.value.unclear,item.unclear]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
        identical=fingerprint(previous.source)===fingerprint(entry.source)&&eligible.filter(item=>[previous.source,entry.source].includes(item.source)&&item.role===entry.role&&normal(item.party)===normal(entry.party)&&normal(item.billRef)===normal(entry.billRef)).every(readable);
      }
      questions.push({id:entry.id,text:identical?'This bill or transaction reference repeats another photo and is counted only once.':'Repeated reference has conflicting or partial readings. Check both source photos.'});
      if(!identical)duplicateConflict=true;continue;
    }
    if(!key&&normal(entry.party)&&normal(entry.purpose)&&entry.value.amount!==null&&!['Written total','Cash balance','Not identified'].includes(entry.role)){
      const signature=`${entry.role}|${normal(entry.party)}|${normal(entry.purpose)}|${entry.method}|${entry.value.amount}`;
      const possible=possibleDuplicates.get(signature);
      if(possible){duplicateConflict=true;for(const candidate of [possible,entry])questions.push({id:candidate.id,text:'This may repeat another record, but no reference establishes that. Check the source photos and remove a duplicate or upload its identifying reference.'});}
      else possibleDuplicates.set(signature,entry);
    }
    if(key)references.set(key,entry);unique.push(entry);
  }
  const bills=unique.filter(entry=>entry.role==='Expense charge');
  const payments=unique.filter(entry=>entry.role==='Expense payment');
  const groups=new Map<string,{bill:Entry[];payments:Entry[]}>();
  for(const bill of bills)groups.set(bill.id,{bill:[bill],payments:[]});
  const groupFor=(payment:Entry,path=new Set<string>()):string=>{
    if(path.has(payment.id))throw new Error('Circular expense link');path.add(payment.id);
    if(payment.link){
      const target=unique.find(entry=>entry.id===payment.link);
      if(!target||target.dsr||!['Expense charge','Expense payment'].includes(target.role)||target.date!==reading.date)throw new Error('Invalid expense link');
      return target.role==='Expense charge'?target.id:groupFor(target,path);
    }
    // Never match by amount alone. A bill reference, or a unique payee AND purpose, is needed.
    const candidates=bills.filter(bill=>readable(bill)&&readable(payment)&&normal(bill.party)&&normal(bill.party)===normal(payment.party)&&!(payment.billRef&&bill.billRef&&normal(payment.billRef)!==normal(bill.billRef))&&((payment.billRef&&normal(payment.billRef)===normal(bill.billRef))||(normal(payment.purpose)&&normal(payment.purpose)===normal(bill.purpose))));
    if(candidates.length===1)return candidates[0].id;
    if(payment.billRef&&bills.some(bill=>normal(bill.party)===normal(payment.party)&&normal(bill.purpose)===normal(payment.purpose)&&bill.billRef&&normal(bill.billRef)!==normal(payment.billRef))){questions.push({id:payment.id,text:'The bill references disagree. Check the original photos and explicitly choose the correct expense if you know the connection.'});return payment.id;}
    // Payments without a bill can share one documented purpose/reference, but remain missing-bill expenses.
    if(candidates.length===0&&readable(payment)&&normal(payment.party)&&(normal(payment.billRef)||normal(payment.purpose)))return `payments:${normal(payment.party)}:${normal(payment.billRef)||normal(payment.purpose)}`;
    questions.push({id:payment.id,text:'Which expense does this payment belong to? Choose below; equal amounts alone do not establish a match.'});
    return payment.id;
  };
  for(const payment of payments){const id=groupFor(payment);const group=groups.get(id)??{bill:[],payments:[]};group.payments.push(payment);groups.set(id,group);}
  const expenses=[...groups].map(([id,group]):Expense=>{
    const all=[...group.bill,...group.payments],first=all[0];
    const incomplete=all.some(entry=>!readable(entry))||questions.some(question=>all.some(entry=>entry.id===question.id));
    const bill=group.bill.length&&group.bill.every(readable)?sum(group.bill):null;
    const paid=group.payments.length&&group.payments.every(readable)?sum(group.payments):null;
    const billDocument=group.bill.length===1&&reading.documents.find(doc=>doc.source===group.bill[0].source)?.kind==='Expense bill'&&reading.contexts.find(context=>entryId(context.source,context.line)===group.bill[0].id)?.role==='Expense charge';
    return {id,party:first.party??'Payee not extracted',purpose:first.purpose??'Purpose not extracted',bill,paid,amount:incomplete?null:group.bill.length?bill:paid,missingBill:!billDocument,incomplete,sources:all.map(entry=>entry.id)};
  });
  for(const choice of choices)if(choice.link&&entries.find(entry=>entry.id===choice.id)?.role!=='Expense payment')throw new Error('Only expense payments can be linked');
  const dsrSeen=new Map<string,number>();let dsrOverlap=false;
  for(const entry of entries.filter(entry=>entry.dsr&&entry.role!=='Written total')){const signature=`${entry.role}|${entry.value.label}|${entry.value.amount}`;const source=dsrSeen.get(signature);if(source!==undefined&&source!==entry.source)dsrOverlap=true;dsrSeen.set(signature,entry.source);}
  const checks:Check[]=[];
  const pairs:[string,Context['role'],Context['method']|null][]=[['Room charges','Room charge',null],['Food charges','Food charge',null],['Guest cash received','Guest payment','Cash'],['Guest UPI received','Guest payment','UPI'],['OTA money received','OTA payment',null]];
  for(const [title,role,method]of pairs){
    const dsr=entries.filter(entry=>entry.dsr&&entry.role===role&&(!method||entry.method===method)),support=unique.filter(entry=>entry.role===role&&(!method||entry.method===method));
    const target=dsr.length&&dsr.every(readable)?sum(dsr):null,value=!duplicateConflict&&support.length&&support.every(readable)?sum(support):null;
    const incomplete=target===null||value===null||duplicateConflict||eligible.some(entry=>entry.role==='Not identified'||entry.unclear)||excluded.some(entry=>entry.role===role)||!!method&&entries.some(entry=>entry.role===role&&entry.method==='Not identified');
    const difference=target!==null&&value!==null?rupees(paise(value)-paise(target)):null;
    checks.push({title,status:incomplete?'Not enough information':difference===0?'Matched':'Difference',dsr:target,evidence:value,difference,note:'Charges and money received are checked separately. Advances and refunds are not added to sales or ordinary guest receipts.',sources:[...dsr,...support].map(entry=>entry.id)});
  }
  const dsrExpenses=entries.filter(entry=>entry.dsr&&entry.role==='Expense charge');
  const target=dsrExpenses.length&&dsrExpenses.every(readable)?sum(dsrExpenses):null;
  const evidence=!duplicateConflict&&expenses.length&&expenses.every(expense=>expense.amount!==null)?rupees(expenses.reduce((total,expense)=>total+paise(expense.amount!),0n)):null;
  const difference=target!==null&&evidence!==null?rupees(paise(evidence)-paise(target)):null;
  const incomplete=target===null||evidence===null||expenses.some(expense=>expense.missingBill)||duplicateConflict||eligible.some(entry=>entry.role==='Not identified'||entry.unclear)||excluded.some(entry=>['Expense charge','Expense payment'].includes(entry.role));
  checks.push({title:'Expenses',status:incomplete?'Not enough information':difference===0?'Matched':'Difference',dsr:target,evidence,difference,note:expenses.some(expense=>expense.missingBill)?'Amounts can agree while a bill is missing. A payment receipt or your explanation does not replace an expense bill.':'Each expense is counted once. Payments linked to its bill are shown separately.',sources:[...dsrExpenses.map(entry=>entry.id),...expenses.flatMap(expense=>expense.sources)]});
  if(unreadableDocuments.length)for(const check of checks)check.status='Not enough information';
  if(unknownDsr)for(const check of checks){check.status='Not enough information';check.dsr=null;check.difference=null;check.note='The DSR was not identified or its selected row was not read. Add a clearer DSR photo.';}
  // Unknown DSR context can hide another relevant amount, so no complete check may ignore it.
  if(entries.some(entry=>entry.dsr&&(entry.role==='Not identified'||entry.unclear)))for(const check of checks)check.status='Not enough information';
  if(dsrOverlap||reading.documents.filter(doc=>reading.dsrSources.includes(doc.source)&&doc.kind==='Daily sheet'&&doc.lines.some(line=>line.amount!==null)).length>1){for(const check of checks){check.status='Not enough information';check.dsr=null;check.difference=null;check.note='DSR photos may repeat the same entries. Keep one summary sheet or non-overlapping DSR photos to avoid counting twice.';}}
  return {date:reading.date,checks,expenses,entries,questions};
}
