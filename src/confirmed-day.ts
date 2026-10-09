import { buildComparison, entryId, type Reading, type Choice, type Check } from './comparison';
import { isWrittenTotal, type DsrLine } from './extraction';

export type Correction = { id:string; label?:string; amount?:number|null };
export type SavedLine = { id:string; source:number; documentDate:string|null; section:DsrLine['section']; aiLabel:string|null; label:string|null; aiValue:number|null; correctedValue?:number|null; correctedLabel?:string; unclear:boolean; aiUnclear:boolean; writtenTotal:boolean };
export type DaySnapshot = { date:string; lines:SavedLine[]; writtenTotals:SavedLine[]; checks:Check[]; aiReading:Reading; aiAnswerText:string; choices:Choice[] };
export type SavedDay = DaySnapshot & { confirmedAt:number; version:string };
export const checkWord = (status:Check['status']) => status==='Matched'?'Matches':status==='Difference'?'Differs':'Not enough information';

export function parseAmount(text:string):number|null {
  if(!text.trim())return null;
  const cleaned=text.trim().replace(/^₹\s*/, '').replace(/,/g,'');
  if(!/^-?\d+(\.\d{1,2})?$/.test(cleaned))throw new Error('Enter an amount with up to two decimal places, or leave it blank for Not extracted.');
  const value=Number(cleaned);if(!Number.isFinite(value)||Math.abs(value)>1e12)throw new Error('This amount is too large.');
  return value;
}

export function applyCorrections(original:Reading,corrections:Correction[]):Reading {
  if(!Array.isArray(corrections)||corrections.length>6000)throw new Error('Invalid corrections.');
  const reading=structuredClone(original),seen=new Set<string>();
  for(const change of corrections){
    if(!change||typeof change!=='object'||typeof change.id!=='string'||Object.keys(change).some(key=>!['id','label','amount'].includes(key))||Object.keys(change).length<2||seen.has(change.id))throw new Error('Invalid correction.');
    seen.add(change.id);
    const doc=reading.documents.find(doc=>doc.lines.some((_,index)=>entryId(doc.source,index)===change.id));
    const index=doc?.lines.findIndex((_,index)=>entryId(doc.source,index)===change.id)??-1;
    if(!doc||index<0)throw new Error('This line is not in the latest reading.');
    const line=doc.lines[index];
    if(Object.hasOwn(change,'label')){
      if(typeof change.label!=='string'||!change.label.trim()||change.label.length>1000)throw new Error('Enter a label.');
      line.label=change.label;
    }
    if(Object.hasOwn(change,'amount')){
      const amount=change.amount;
      if(amount!==null&&(typeof amount!=='number'||!Number.isFinite(amount)||Math.abs(amount)>1e12||Math.abs(amount*100-Math.round(amount*100))>0.001))throw new Error('Enter a valid amount with up to two decimal places.');
      line.amount=amount as number|null;
      // Explicitly checking an amount resolves numeric uncertainty, not a missing section/label.
      line.unclear=line.amount===null||line.section===null||line.label===null;
    }
  }
  return reading;
}

export function prepareDay(original:Reading,corrections:Correction[],choices:Choice[],aiAnswerText=JSON.stringify({date:original.date,documents:original.documents,contexts:original.contexts})):DaySnapshot {
  const effective=applyCorrections(original,corrections);
  const dsrs=effective.documents.filter(doc=>effective.dsrSources.includes(doc.source));
  if(!dsrs.length||dsrs.some(doc=>doc.date!==original.date||!['Daily sheet','Handwritten DSR'].includes(doc.kind)||!doc.lines.length))throw new Error('The DSR document date must be read before confirming.');
  const lines:SavedLine[]=original.documents.flatMap(doc=>doc.lines.map((ai,index)=>{
    const current=effective.documents.find(item=>item.source===doc.source)!.lines[index];
    const writtenTotal=isWrittenTotal(ai.label)||original.contexts.some(context=>context.source===doc.source&&context.line===index&&context.role==='Written total');
    return {id:entryId(doc.source,index),source:doc.source,documentDate:doc.date,section:ai.section,aiLabel:ai.label,label:current.label,aiValue:ai.amount,
      ...(current.amount!==ai.amount?{correctedValue:current.amount}:{}),...(current.label!==ai.label?{correctedLabel:current.label!}:{}),unclear:current.unclear,aiUnclear:ai.unclear,writtenTotal};
  }));
  return {date:original.date,lines,writtenTotals:lines.filter(line=>line.writtenTotal),checks:buildComparison(effective,choices).checks,aiReading:structuredClone(original),aiAnswerText,choices:structuredClone(choices)};
}
