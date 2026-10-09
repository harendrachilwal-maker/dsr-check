import { displayAmount } from './extraction';
import { moneyRoles, paymentMethods, type Comparison, type Choice } from './comparison';
type Photo={url:string;file:File};
const element=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function showComparison(root:HTMLElement,report:Comparison,photos:Photo[],onContext:(choice:Choice)=>Promise<void>,focusEntry?:string){
  const openEntries=new Set(Array.from(root.querySelectorAll<HTMLDetailsElement>('.context-entry[open]')).map(node=>node.dataset.contextId));
  const activeId=(document.activeElement as HTMLElement|null)?.id;
  if(focusEntry)openEntries.add(focusEntry);
  root.replaceChildren();root.append(element('h3','Compare with the DSR'),element('p','Code checks these amounts. A match does not confirm the report or prove that cash was counted.'));
  const sources=(ids:string[])=>{
    const details=element('details');details.append(element('summary','View source photos'));
    for(const source of [...new Set(ids.map(id=>Number(id.split(':')[0])))]){
      const photo=photos[source-1];if(!photo)continue;
      const label=element('p',`Photo ${source} — ${photo.file.name}`),image=element('img');image.src=photo.url;image.alt=`Source photo ${source}`;
      const link=element('a','Open full photo');link.href=photo.url;link.target='_blank';link.rel='noopener';
      details.append(label,image,link);
    }return details;
  };
  const amounts=(values:[string,number|null][])=>{
    const list=element('dl');for(const [name,value]of values){const row=element('div');row.append(element('dt',name),element('dd',displayAmount(value)));list.append(row);}return list;
  };
  for(const check of report.checks){
    if(check.dsr===null&&check.evidence===null&&!check.sources.length){const empty=element('details');empty.className='comparison-empty';empty.append(element('summary',`${check.title} — Not enough information`),element('p','DSR: Not extracted. Supporting evidence: Not extracted.'),element('p',check.note));root.append(empty);continue;}
    const row=element('section');row.className='comparison-row';row.append(element('h4',check.title));
    const status=element('p',check.status);status.className=check.status==='Difference'?'difference':'section-total';row.append(status,amounts([['DSR',check.dsr],['Supporting evidence',check.evidence],['Evidence minus DSR',check.difference]]),element('p',check.note));
    if(check.sources.length)row.append(sources(check.sources));root.append(row);
  }
  root.append(element('h3','Where expense money went'));
  if(!report.expenses.length)root.append(element('p','Not extracted. Add expense bills and payment photos.'));
  for(const expense of report.expenses){
    const row=element('section');row.className='comparison-row';row.append(element('h4',expense.party),element('p',expense.purpose),amounts([['Bill amount',expense.bill],['Payments linked to this expense',expense.paid],['Counted once in expense evidence',expense.amount]]));
    if(expense.missingBill)row.append(element('p','Missing expense bill. A receipt or explanation does not remove this flag.'));
    if(expense.bill!==null&&expense.paid!==null&&expense.bill!==expense.paid)row.append(element('p',`Bill and linked payments differ. Check whether a payment or remaining amount is missing.`));
    if(expense.incomplete)row.append(element('p','Not enough information to include this expense in a complete total.'));
    const payments=report.entries.filter(entry=>expense.sources.includes(entry.id)&&entry.role==='Expense payment');
    for(const payment of payments)row.append(element('p',`${payment.method} — ${displayAmount(payment.value.amount)}${payment.value.unclear?'?':''} · Photo ${payment.source}, ${payment.value.label??'Not extracted'}`));
    row.append(sources(expense.sources));root.append(row);
  }
  const other=report.entries.filter(entry=>!entry.dsr&&['Advance received','Refund paid'].includes(entry.role));
  if(other.length){root.append(element('h3','Advances and refunds — kept separate'));for(const entry of other)root.append(element('p',`${entry.role}: ${displayAmount(entry.value.amount)}${entry.value.unclear||entry.unclear?'?':''} · Photo ${entry.source} — ${entry.date===report.date?'selected day':entry.date===null?'Date not extracted; excluded from this day':`Different date ${entry.date}; excluded from this day`}`));}
  root.append(element('h3','Connections to check'),element('p','Add context only when you know it. Your answers are kept separate from the original AI reading and disappear when the page is refreshed. No new AI call is needed.'));
  for(const question of report.questions.filter(question=>question.id.endsWith(':document'))){root.append(element('p',`Photo ${question.id.split(':')[0]} — ${question.text}`),sources([question.id]));}
  for(const entry of report.entries.filter(entry=>!entry.dsr&&!['Written total','Cash balance'].includes(entry.role))){
    const details=element('details');details.className='context-entry';details.dataset.contextId=entry.id;details.open=openEntries.has(entry.id);
    details.append(element('summary',`Photo ${entry.source} — ${entry.value.label??'Not extracted'}: ${displayAmount(entry.value.amount)}${entry.value.unclear?'?':''}`));
    for(const question of report.questions.filter(question=>question.id===entry.id))details.append(element('p',question.text));
    details.append(element('p',`${entry.userContext?'Context supplied by you':'AI-read context'}: ${entry.role}; ${entry.party??'Person not extracted'}; ${entry.purpose??'Purpose not extracted'}.`));
    details.append(sources([entry.id]));
    if(entry.date!==report.date){root.append(details);continue;}
    const form=element('form');const prefix=`context-${entry.source}-${entry.line}`;
    const field=(name:string,label:string,node:HTMLInputElement|HTMLSelectElement)=>{node.id=`${prefix}-${name}`;const caption=element('label',label);caption.htmlFor=node.id;form.append(caption,node);return node;};
    const role=element('select');for(const value of moneyRoles)role.append(new Option(value,value));role.value=entry.role;field('role','What does this entry represent?',role);
    const party=element('input');party.type='text';party.maxLength=200;party.value=entry.party??'';field('party','Who was paid, or who paid you?',party);
    const purpose=element('input');purpose.type='text';purpose.maxLength=200;purpose.value=entry.purpose??'';field('purpose','What was this payment or bill for?',purpose);
    const method=element('select');for(const value of paymentMethods)method.append(new Option(value,value));method.value=entry.method;field('method','Payment method',method);
    const link=element('select');link.append(new Option('Not linked / not sure',''));
    for(const target of report.entries.filter(item=>!item.dsr&&item.id!==entry.id&&item.date===entry.date&&['Expense charge','Expense payment'].includes(item.role)))link.append(new Option(`Photo ${target.source}: ${target.party??target.value.label??'Not extracted'} — ${displayAmount(target.value.amount)}`,target.id));
    link.value=entry.link??'';field('link','Which expense or other payment belongs with this payment?',link);
    const linkLabel=form.querySelector<HTMLLabelElement>(`label[for="${link.id}"]`)!;
    const updateLink=()=>{link.hidden=role.value!=='Expense payment';linkLabel.hidden=link.hidden;};role.onchange=updateLink;updateLink();
    const note=element('p','Amounts cannot be changed here. For unreadable amounts, upload a clearer photo.');form.append(note);
    const button=element('button','Use this context');button.id=`${prefix}-apply`;button.className='secondary';button.type='submit';const status=element('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');if(entry.userContext)status.textContent='Context supplied by you. Comparison updated.';form.append(button,status);
    form.onsubmit=async event=>{
      event.preventDefault();button.disabled=true;status.textContent='Checking your context…';
      try{await onContext({id:entry.id,role:role.value as Choice['role'],party:party.value.trim()||null,purpose:purpose.value.trim()||null,method:method.value as Choice['method'],link:role.value==='Expense payment'?link.value||null:null});}
      catch(cause){status.textContent=cause instanceof Error?cause.message:'Could not check this context. Try again.';}
      finally{button.disabled=false;}
    };
    details.append(form);root.append(details);
  }
  const focusId=focusEntry?`context-${focusEntry.replace(':','-')}-apply`:activeId;
  if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
}
