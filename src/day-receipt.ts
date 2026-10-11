import type {SavedDay} from './confirmed-day';
import {displayDate,displayTime} from './date-display';
import {historySummary} from './history-summary';
import {ownerNeedsChecking} from './owner-message';
import {salesMoneyPresentation} from './sales-money';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};

// Decorative linework occupies its own band, never a background beneath report text.
function pattern(){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 440 24');svg.setAttribute('preserveAspectRatio','none');
 svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.classList.add('receipt-pattern');
 for(let curve=0;curve<10;curve++){
  const path=document.createElementNS(svg.namespaceURI,'path');
  const points=Array.from({length:221},(_,step)=>{
   const x=step*2,phase=curve*Math.PI/5,y=12+7*Math.sin(x*Math.PI/44+phase)+3*Math.sin(x*Math.PI/22-phase);
   return `${step?'L':'M'}${x} ${y.toFixed(2)}`;
  });
  path.setAttribute('d',points.join(' '));svg.append(path);
 }
 return svg;
}

export function dayReceipt(day:SavedDay){
 const receipt=el('article');receipt.className='day-receipt';receipt.setAttribute('aria-labelledby','receipt-date');
 const header=el('header');
 const hotel=el('p','Himalaya Mount View Resort');hotel.className='receipt-hotel';
 const heading=el('h2',displayDate(day.date));heading.className='receipt-date';heading.id='receipt-date';heading.tabIndex=-1;
 heading.setAttribute('aria-label',`Confirmed day — ${displayDate(day.date)}`);
 header.append(hotel,heading);
 const amounts=el('dl');amounts.className='receipt-amounts';
 // These are the persisted, corrected DSR checks; evidence and raw AI figures never fill a blank.
 for(const metric of historySummary(day)){
  const row=el('div'),missing=metric.value==='Not extracted',amount=el('dd',missing?'Not read':metric.value);
  if(missing)amount.className='receipt-not-read';
  row.append(el('dt',metric.label),amount);amounts.append(row);
 }
 const check=salesMoneyPresentation(day.salesMoneyCheck),salesMoney=el('div');
 salesMoney.className='sales-money-check';salesMoney.dataset.tone=check.tone;
 const badge=el('span',check.label);badge.className='sales-money-badge';
 salesMoney.append(el('span','Sales vs money'),badge);if(check.detail)salesMoney.append(el('span',check.detail));
 const needs=el('section');needs.className='receipt-needs';needs.append(el('h3','Needs checking'));
 const warnings=ownerNeedsChecking(day);
 if(warnings.length){const list=el('ul');for(const warning of warnings)list.append(el('li',warning));needs.append(list);}
 const footer=el('footer');footer.className='receipt-confirmation';
 const stamp=el('time',displayTime(day.confirmedAt));stamp.dateTime=new Date(day.confirmedAt).toISOString();
 footer.append(el('p','Confirmed by manager'),stamp);
 receipt.append(pattern(),header,amounts,salesMoney,...(warnings.length?[needs]:[]),pattern(),footer);
 return {receipt,heading};
}
