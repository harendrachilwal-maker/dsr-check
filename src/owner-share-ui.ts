import type {SavedDay} from './confirmed-day';
import {ownerMessage,whatsappLink} from './owner-message';

export function ownerSharing(day:SavedDay,primary=false):HTMLElement {
 const message=ownerMessage(day),section=document.createElement('section');section.className='owner-sharing';
 const link=document.createElement('a');link.className=`owner-share-link ${primary?'primary-action':'secondary'}`;link.textContent='Send to owner';
 link.href=whatsappLink(message);link.target='_blank';link.rel='noopener noreferrer';
 const details=document.createElement('details');details.className='owner-draft';
 const summary=document.createElement('summary');summary.textContent='WhatsApp message';
 const preview=document.createElement('pre');preview.textContent=message;preview.setAttribute('translate','no');
 const help=document.createElement('p');help.textContent='Choose your owner in WhatsApp, then tap Send. Opening the draft does not send it.';
 details.append(summary,preview,help);section.append(link,details);return section;
}
