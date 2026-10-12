import './owner-style.css';
import {displayMonth} from './date-display';
import {displayAmount} from './extraction';
import {ownerReceipt} from './day-receipt';
import {ownerMetrics,type OwnerMonth} from './owner-data';
import {authenticatedFetch} from './session';
import {mountManagerInvitation} from './owner-invite-ui';
import {mountOwnerEditor} from './owner-edit-ui';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
function currentMonth(){
 const parts=new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',timeZone:'Asia/Kolkata'}).formatToParts(new Date());
 return `${parts.find(part=>part.type==='year')!.value}-${parts.find(part=>part.type==='month')!.value}`;
}
function validMonth(month:string){return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)&&Number(month.slice(0,4))>0;}
function calendar(){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','20');svg.setAttribute('height','20');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.5');svg.setAttribute('aria-hidden','true');
 const outline=document.createElementNS(svg.namespaceURI,'rect');outline.setAttribute('x','3');outline.setAttribute('y','5');outline.setAttribute('width','18');outline.setAttribute('height','16');outline.setAttribute('rx','2');
 const lines=document.createElementNS(svg.namespaceURI,'path');lines.setAttribute('d','M16 3v4M8 3v4M3 11h18');svg.append(outline,lines);return svg;
}

export function mountOwnerView(container:HTMLElement,endpoint:string,options:{propertyName:string}){
 const view=el('section');view.className='owner-view';view.id='owner-page';
 const header=el('header'),heading=el('h1','Owner overview');
 header.append(heading,el('p',options.propertyName));
 const nav=el('nav');nav.setAttribute('aria-label','Owner pages');
 const history=el('button','History');history.type='button';history.className='secondary';history.onclick=()=>location.assign('/?view=history');nav.append(history);
 const invitationSlot=el('div');
 const label=el('label','Month');label.htmlFor='owner-month';
 const monthField=el('div');monthField.className='owner-month-field';
 const display=el('span');display.id='owner-month-display';display.setAttribute('aria-live','polite');
 const input=el('input');input.type='month';input.id='owner-month';input.setAttribute('aria-label','Month');input.setAttribute('aria-describedby',display.id);input.value=currentMonth();
 monthField.append(display,calendar(),input);
 const content=el('div');content.className='owner-month-content';content.setAttribute('aria-live','polite');
 view.append(header,nav,label,monthField,content,invitationSlot);container.replaceChildren(view);
 const invitation=mountManagerInvitation(invitationSlot,endpoint);
 let request=0,disposed=false,controller:AbortController|null=null;
 const editors=new Set<{destroy():void}>();
 const clearEditors=()=>{for(const editor of editors)editor.destroy();editors.clear();};

 function render(report:OwnerMonth){
  if(!report.confirmedDays){
   const empty=el('section');empty.className='owner-empty';empty.append(el('h2',displayMonth(`${report.month}-01`)),el('p','No confirmed days in this month. Saved receipts will appear here after the manager confirms a day.'));content.replaceChildren(empty);return;
  }
  const summary=el('section');summary.className='owner-month-summary';summary.setAttribute('aria-label','Month totals');
  const title=el('h2',displayMonth(`${report.month}-01`));
  const saved=el('p',`${report.confirmedDays} confirmed ${report.confirmedDays===1?'day':'days'}`);saved.className='owner-month-count';
  const totals=el('dl');totals.className='owner-month-totals';
  for(const {key,label} of ownerMetrics){
   const row=el('div'),amount=report.totals[key],value=el('dd',amount===null?'Not read':displayAmount(amount));
   row.dataset.metric=key;row.append(el('dt',label),value);
   if(amount===null){value.className='owner-not-read';const missing=el('p','Incomplete total');missing.className='owner-total-note';row.append(missing);}
   totals.append(row);
  }
  const status=el('section');status.className='owner-check-counts';status.setAttribute('aria-label','Sales vs money day counts');status.append(el('h3','Sales vs money'));
  const counts=el('dl');
  for(const {key,label,tone} of [{key:'matches',label:'Matches',tone:'matches'},{key:'check',label:'Check',tone:'check'},{key:'incomplete',label:'Not enough info',tone:'incomplete'}] as const){
   const row=el('div'),name=el('dt',label);name.className='sales-money-badge';row.className='sales-money-check';row.dataset.tone=tone;row.append(name,el('dd',String(report.counts[key])));counts.append(row);
  }
  status.append(counts);
  const missing=el('p',`${report.counts.missingAmounts} ${report.counts.missingAmounts===1?'day had':'days had'} a missing amount.`);missing.className='owner-missing-count';
  summary.append(title,saved,totals,status,missing);
  if(ownerMetrics.some(({key})=>report.totals[key]===null)){const explanation=el('p','A missing saved amount makes that month total incomplete. It is never counted as zero.');explanation.className='owner-summary-note';summary.append(explanation);}
  const receipts=el('section');receipts.className='owner-receipts';receipts.setAttribute('aria-label','Confirmed day receipts');receipts.append(el('h2','Day receipts'));
  for(const day of report.days){
   const group=el('div');group.className='owner-day';group.dataset.date=day.date;
   const actions=el('div');actions.className='owner-day-actions';const edit=el('button','Edit saved day');edit.type='button';edit.className='secondary';
   const slot=el('div');slot.className='owner-day-editor';
   edit.onclick=()=>{
    clearEditors();view.querySelectorAll('.owner-day-editor').forEach(node=>node.replaceChildren());view.querySelectorAll<HTMLButtonElement>('.owner-day-actions button').forEach(button=>{button.hidden=false;});
    edit.hidden=true;
    const editor=mountOwnerEditor(slot,endpoint,day.date,()=>{editors.delete(editor);void load();},()=>{editors.delete(editor);edit.hidden=false;edit.focus();});editors.add(editor);
   };
   actions.append(edit);group.append(ownerReceipt(day).receipt,actions,slot);receipts.append(group);
  }
  content.replaceChildren(summary,receipts);
 }

 async function load(){
  const month=input.value;if(!validMonth(month))return;
  const id=++request;controller?.abort();controller=new AbortController();
  clearEditors();
  display.textContent=displayMonth(`${month}-01`);
  const loading=el('p','Loading confirmed days…');loading.setAttribute('role','status');content.replaceChildren(loading);content.setAttribute('aria-busy','true');
  try{
   const response=await authenticatedFetch(`${endpoint}/owner/month?month=${encodeURIComponent(month)}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
   const data=await response.json();if(disposed||id!==request)return;
   if(!response.ok)throw new Error(data.error||'This month could not be loaded. Try again.');
   if(!data.report||data.report.month!==month||!Array.isArray(data.report.days))throw new Error('This month could not be loaded. Try again.');
   render(data.report as OwnerMonth);
  }catch(cause){
   if(disposed||id!==request)return;
   const error=el('p',cause instanceof Error&&cause.name!=='AbortError'&&cause.name!=='TimeoutError'?cause.message:'This month could not be loaded. Try again.');error.className='form-error';error.setAttribute('role','alert');
   const retry=el('button','Retry');retry.type='button';retry.className='secondary';retry.onclick=()=>{void load();};content.replaceChildren(error,retry);
  }finally{if(!disposed&&id===request)content.removeAttribute('aria-busy');}
 }
 input.onchange=()=>{void load();};input.onclick=()=>{try{input.showPicker?.();}catch{/* Native month controls remain usable when showPicker is unavailable. */}};
 void load();
 return {destroy(){disposed=true;request++;controller?.abort();clearEditors();invitation.destroy();view.remove();}};
}
