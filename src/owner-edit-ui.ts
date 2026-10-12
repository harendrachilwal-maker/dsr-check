import type {Correction,SavedDay,SavedLine} from './confirmed-day';
import {parseAmount,applyCorrections} from './confirmed-day';
import {displayAmount} from './extraction';
import {displayDate} from './date-display';
import {authenticatedFetch} from './session';
import './owner-edit-style.css';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const button=(text:string,action:()=>void)=>{const node=el('button',text);node.type='button';node.className='secondary';node.onclick=action;return node;};
const currentAmount=(line:SavedLine)=>Object.hasOwn(line,'correctedValue')?line.correctedValue!:line.aiValue;

export function mountOwnerEditor(container:HTMLElement,endpoint:string,date:string,onSaved:()=>void,onCancel?:()=>void){
 let stopped=false,busy=false,active:string|null=null;
 const controller=new AbortController(),pending=new Map<string,Correction>();
 const panel=el('section');panel.className='owner-editor';container.replaceChildren(panel);
 const heading=el('h2',`Edit saved day — ${displayDate(date)}`);heading.tabIndex=-1;
 const status=el('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const error=el('p');error.className='form-error';error.setAttribute('role','alert');error.hidden=true;
 const rows=el('div'),actions=el('div');actions.className='owner-editor-actions';
 const refresh=button('Load latest saved day',()=>{void(async()=>{busy=true;controls();refresh.disabled=true;await load();busy=false;refresh.disabled=false;render();})();});refresh.hidden=true;
 const save=button('Save changes',()=>{void saveDay();});save.className='primary-action';save.disabled=true;
 const cancel=button('Cancel editing',()=>{if(!busy){destroy();container.replaceChildren();onCancel?.();}});
 panel.append(heading,el('p','Changes are saved as a new version. The original AI reading and manager confirmation are kept.'),status,rows,error,refresh,actions);actions.append(save,cancel);
 let day:SavedDay|null=null;
 function controls(){save.disabled=busy||active!==null||pending.size===0;cancel.disabled=busy;}
 function showError(cause:unknown){error.textContent=cause instanceof Error?cause.message:'The saved day could not be loaded. Try again.';error.hidden=false;}
 async function load(){
  status.textContent='Loading saved lines…';error.hidden=true;
  try{
   const response=await authenticatedFetch(`${endpoint}/days/detail?date=${encodeURIComponent(date)}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
   const result=await response.json();if(stopped)return;
   if(!response.ok)throw new Error(result.error??'The saved day could not be loaded. Try again.');
   if(result.day?.date!==date||typeof result.day.version!=='string'||!Array.isArray(result.day.lines))throw new Error('The saved day could not be verified. Reopen it and try again.');
   day=result.day;refresh.hidden=true;status.textContent=pending.size?'Latest saved lines loaded. Your corrections are still here; review them before Save changes.':'Choose a line to correct. Blank amounts remain Not extracted.';render();heading.focus();
  }catch(cause){if(stopped)return;status.textContent='';showError(cause);rows.replaceChildren(button('Retry saved lines',()=>{void load();}));}
 }
 function render(){
  if(!day)return;rows.replaceChildren();
  for(const line of day.lines){
   const change=pending.get(line.id),label=change?.label??line.label,amount=change&&Object.hasOwn(change,'amount')?change.amount!:currentAmount(line);
   const row=el('article');row.className='owner-edit-line';
   row.append(el('p',`Photo ${line.source} · ${line.section??'Section not extracted'}`),el('h3',label??'Not extracted'),el('p',displayAmount(amount)+(amount!==null&&line.unclear&&!Object.hasOwn(change??{},'amount')?'?':'')));
   const original=el('p',`AI read: ${line.aiLabel??'Not extracted'} · ${displayAmount(line.aiValue)}${line.aiValue!==null&&line.aiUnclear?'?':''}`);original.className='owner-edit-source';row.append(original);
   if(line.writtenTotal)row.append(el('p','Written total — not added again.'));
   if(change)row.append(el('p',`Latest saved: ${line.label??'Not extracted'} · ${displayAmount(currentAmount(line))}${currentAmount(line)!==null&&line.unclear?'?':''}`),el('p','Owner correction — not saved yet.'));
   const correct=button('Correct',()=>edit(row,line,label,amount));correct.setAttribute('aria-label',`Correct ${label??'unread line'} (${line.id})`);correct.disabled=active!==null||busy;row.append(correct);rows.append(row);
  }
  controls();
 }
 function edit(row:HTMLElement,line:SavedLine,label:string|null,amount:number|null){
  if(busy||active!==null||!day)return;active=line.id;render();
  // Re-rendered rows retain order; one editor is active at a time.
  row=rows.children[day.lines.findIndex(item=>item.id===line.id)] as HTMLElement;
  const form=el('form');form.className='line-editor';
  const labelInput=el('input');labelInput.type='text';labelInput.id=`owner-label-${line.id}`;labelInput.maxLength=1000;labelInput.value=label??'';
  const labelCaption=el('label','Label');labelCaption.htmlFor=labelInput.id;
  const amountInput=el('input');amountInput.type='text';amountInput.id=`owner-amount-${line.id}`;amountInput.inputMode='decimal';amountInput.value=amount===null?'':String(amount);
  let amountEdited=false;amountInput.oninput=()=>{amountEdited=true;};
  const amountCaption=el('label','Amount (₹)');amountCaption.htmlFor=amountInput.id;
  const message=el('p');message.className='form-error';message.setAttribute('role','alert');message.hidden=true;
  const apply=el('button','Save Correction');apply.type='submit';apply.className='primary-action';
  const discard=button('Cancel',()=>{active=null;render();});
  form.append(labelCaption,labelInput,amountCaption,amountInput,el('p','Leave amount blank for Not extracted. Enter 0 only when the document shows zero.'),apply,discard,message);
  form.onsubmit=event=>{
   event.preventDefault();try{
    const change:Correction={id:line.id,...pending.get(line.id)};
    if(labelInput.value!==line.label&&labelInput.value!==''){if(!labelInput.value.trim())throw new Error('Enter a label.');change.label=labelInput.value;}
    else if(labelInput.value===line.label||line.label===null)delete change.label;
    else throw new Error('Enter a label.');
    if(amountEdited)change.amount=parseAmount(amountInput.value);
    applyCorrections(day!.aiReading,[change].filter(change=>Object.keys(change).length>1));
    if(Object.keys(change).length>1)pending.set(line.id,change);else pending.delete(line.id);
    active=null;render();status.textContent='Correction ready. Tap Save changes to update the saved day.';
   }catch(cause){message.textContent=cause instanceof Error?cause.message:'Check the correction.';message.hidden=false;}
  };
  row.append(form);labelInput.focus();controls();
 }
 async function saveDay(){
  if(stopped||busy||active!==null||!day||!pending.size)return;
  busy=true;error.hidden=true;controls();render();save.textContent='Saving changes…';
  try{
   const response=await authenticatedFetch(`${endpoint}/owner/day/edit`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,expectedVersion:day.version,corrections:[...pending.values()]}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
   const result=await response.json();if(stopped)return;
   if(response.status===409){refresh.hidden=false;throw new Error('This saved day changed. Your corrections are still here; load the latest saved day and review them before saving.');}
   if(!response.ok)throw new Error(result.error??'Changes could not be saved. Try again.');
   if(result.status!=='saved'||typeof result.version!=='string')throw new Error('The saved changes could not be verified. Reopen the day.');
   destroy();container.replaceChildren();onSaved();
  }catch(cause){if(!stopped)showError(cause);}finally{if(!stopped){busy=false;save.textContent='Save changes';render();}}
 }
 function destroy(){stopped=true;controller.abort();}
 void load();return {destroy};
}
