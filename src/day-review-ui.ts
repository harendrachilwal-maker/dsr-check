import { displayDate, displayTime, displayMonth } from './date-display';
import { historySummary, historyStatus } from './history-summary';
import {ownerSharing} from './owner-share-ui';
import { authenticatedFetch } from './session';
import { displayAmount, displayLineAmount, sections, type DsrLine } from './extraction';
import { applyCorrections, checkWord, parseAmount, prepareDay, type Correction, type SavedDay, type SavedLine } from './confirmed-day';
import { type Reading, type Choice } from './comparison';

export type ReviewState={raw:unknown;reading:Reading;choices:Choice[];corrections:Correction[];updating:boolean};
type Deps={endpoint:string;state:()=>ReviewState|null;photos:()=>{url:string}[];busy:()=>boolean;refreshControls:()=>void;apply:(changes:Correction[])=>Promise<void>};
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const button=(text:string,click:()=>void)=>{const node=el('button',text);node.type='button';node.className='secondary';node.onclick=click;return node;};
const time=displayTime;
const savedAmount=(line:SavedLine)=>{const amount=Object.hasOwn(line,'correctedValue')?line.correctedValue!:line.aiValue;return displayAmount(amount)+(line.unclear&&amount!==null?'?':'');};
export class DayReview {
  private manager=el('section');private history=el('section');private content=el('div');
  private navHistory:HTMLButtonElement;private navUpload:HTMLButtonElement;
  private confirmButton:HTMLButtonElement;private confirmStatus=el('p');private confirmError=el('p');
  private panel=el('section');private shareSlot=el('div');private viewHistory:HTMLButtonElement;private hint=el('p','Review the lines, then confirm.');private actionButtons=el('div');
  private shareRequest=0;private confirmed:{state:ReviewState;signature:string;date:string;version:string}|null=null;
  private active:string|null=null;private saving=false;private historyRequest=0;private latestRequest=0;
  constructor(private deps:Deps){
    const app=document.getElementById('app')!;
    this.manager.id='manager-page';this.manager.append(...Array.from(app.childNodes));
    const nav=el('nav');nav.setAttribute('aria-label','Manager pages');
    this.navUpload=button('Upload DSR',()=>this.showUpload());this.navHistory=button('History',()=>{void this.showHistory();});
    nav.append(this.navUpload,this.navHistory);this.history.id='history-page';this.history.hidden=true;this.content.className='history-content';
    const heading=el('h1','History');heading.tabIndex=-1;
    this.history.append(heading,el('p','Confirmed days, newest first. Saved days are private to your account. Photos are not saved.'),this.content);
    app.append(nav,this.manager,this.history);
    const panel=this.panel;panel.id='confirmation';panel.className='review-actions';panel.hidden=true;
    this.confirmButton=button('Confirm day',()=>{void this.confirm();});this.confirmButton.className='primary-action confirm-day';
    this.viewHistory=button('View History',()=>{void this.showHistory();});this.viewHistory.classList.add('view-history');this.viewHistory.hidden=true;
    this.shareSlot.className='share-slot';this.actionButtons.className='review-buttons';
    this.confirmStatus.setAttribute('role','status');this.confirmError.setAttribute('role','alert');this.confirmError.className='form-error';this.confirmError.hidden=true;
    this.confirmStatus.tabIndex=-1;this.actionButtons.append(this.shareSlot,this.viewHistory,this.confirmButton);
    const inner=el('div');inner.className='review-actions-inner';inner.append(this.hint,this.confirmStatus,this.confirmError,this.actionButtons);panel.append(inner);
    document.getElementById('results')!.append(el('p','Confirm the reviewed lines for this document date. Missing amounts and unresolved differences stay flagged.'));
    this.manager.append(panel);new ResizeObserver(()=>this.updateInset()).observe(panel);this.showUpload();
  }
  busy(){return this.saving||this.active!==null;}
  reset(){this.active=null;this.clearShare();this.confirmStatus.textContent='';this.confirmError.hidden=true;this.panel.hidden=true;this.sync();}
  private signature(state:ReviewState){return JSON.stringify([state.corrections,state.choices]);}
  private clearShare(){this.confirmed=null;this.shareRequest++;this.shareSlot.replaceChildren();this.actionButtons.removeAttribute('data-confirmed');}
  private updateInset(){const height=this.panel.hidden||this.manager.hidden||this.active!==null?0:this.panel.getBoundingClientRect().height;this.manager.style.paddingBottom=height?`${height+24}px`:'';}
  sync(){
    const state=this.deps.state();if(this.confirmed&&(state!==this.confirmed.state||this.signature(state)!==this.confirmed.signature)){this.clearShare();this.confirmStatus.textContent='Review the changed lines, then confirm again.';}
    const locked=this.saving||this.active!==null||this.deps.busy()||!!state?.updating;
    this.confirmButton.disabled=locked;
    this.confirmButton.textContent=this.saving?'Saving day…':'Confirm day';
    this.confirmButton.className=`confirm-day ${this.confirmed?'secondary':'primary-action'}`;
    this.navHistory.disabled=this.saving||this.deps.busy()||!!state?.updating;
    this.viewHistory.hidden=!this.confirmed;this.viewHistory.disabled=locked;this.shareSlot.hidden=locked;
    this.hint.hidden=!!this.confirmed||!!this.confirmStatus.textContent;this.confirmStatus.hidden=!this.confirmStatus.textContent;
    this.panel.hidden=!state;this.panel.classList.toggle('editing',this.active!==null);this.updateInset();
    document.querySelectorAll<HTMLButtonElement>('[data-correct]').forEach(button=>{button.disabled=this.saving||this.active!==null||this.deps.busy()||!!state?.updating;});
  }
  showUpload(){this.historyRequest++;this.manager.hidden=false;this.history.hidden=true;this.navUpload.setAttribute('aria-current','page');this.navHistory.removeAttribute('aria-current');this.updateInset();void this.loadLatest();}
  private async loadShare(){
    const receipt=this.confirmed;if(!receipt)return;const request=++this.shareRequest;
    this.actionButtons.removeAttribute('data-confirmed');this.shareSlot.replaceChildren(el('p','Loading saved WhatsApp draft…'));
    try{
      const {day}=await this.request(`/days/detail?date=${encodeURIComponent(receipt.date)}`) as {day:SavedDay};
      if(request!==this.shareRequest||this.confirmed!==receipt)return;
      if(day.date!==receipt.date||day.version!==receipt.version)throw new Error('This saved day changed. Open History for the latest version.');
      this.shareSlot.replaceChildren(ownerSharing(day,true));this.actionButtons.dataset.confirmed='true';this.sync();
    }catch(cause){
      if(request!==this.shareRequest||this.confirmed!==receipt)return;
      const message=el('p',cause instanceof Error?cause.message:'The saved WhatsApp draft could not be loaded. Try again.');message.setAttribute('role','alert');
      this.shareSlot.replaceChildren(message,button('Retry message',()=>{void this.loadShare();}));this.sync();
    }
  }
  private async loadLatest(){
    const request=++this.latestRequest,line=document.getElementById('last-confirmed');if(!line)return;
    line.replaceChildren(el('span','Last confirmed: Loading…'));
    try{
      const {day}=await this.request('/days/latest');if(request!==this.latestRequest)return;
      line.textContent=`Last confirmed: ${day?displayDate(day.date):'None yet'}`;
    }catch{
      if(request!==this.latestRequest)return;
      line.replaceChildren(el('span','Last confirmed: Could not load.'),button('Retry',()=>{void this.loadLatest();}));
    }
  }
  private async request(path:string,body?:unknown){
    const response=await authenticatedFetch(`${this.deps.endpoint}${path}`,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
    const data=await response.json();if(!response.ok&&response.status!==409)throw new Error(data.error??'The saved day could not be loaded. Try again.');return data;
  }
  attachLine(row:HTMLElement,source:number,index:number,original:DsrLine,current:DsrLine){
    const id=`${source}:${index}`,state=this.deps.state();if(!state)return;
    const change=state.corrections.find(change=>change.id===id);
    if(change){row.append(el('p',`AI label: ${original.label??'Not extracted'} · AI value: ${displayLineAmount(original)}`),el('p','Manager correction — original AI reading retained.'));}
    const sourceButton=button('View original',()=>{
      const existing=row.querySelector('.line-original');if(existing){existing.remove();return;}
      const photo=this.deps.photos()[source-1];if(!photo)return;
      const sourceView=el('div');sourceView.className='line-original';
      const link=el('a','Open original photo to zoom');link.href=photo.url;link.target='_blank';link.rel='noopener';
      const image=el('img');image.src=photo.url;image.alt=`Original photo ${source}`;sourceView.append(image,link);row.prepend(sourceView);
    });
    const correct=button('Correct',()=>{
      if(this.active!==null||this.saving||this.deps.busy()||state.updating)return;
      this.active=id;this.deps.refreshControls();this.sync();correct.disabled=true;
      const form=el('form');form.className='line-editor';
      const label=el('input');label.type='text';label.value=current.label??'';label.id=`label-${source}-${index}`;label.maxLength=1000;
      const labelCaption=el('label','Label');labelCaption.htmlFor=label.id;
      const amount=el('input');amount.type='text';amount.inputMode='decimal';amount.value=current.amount===null?'':String(current.amount);amount.id=`amount-${source}-${index}`;
      const amountCaption=el('label','Amount (₹)');amountCaption.htmlFor=amount.id;let amountEdited=false;amount.oninput=()=>{amountEdited=true;};
      const message=el('p');message.setAttribute('role','alert');message.className='form-error';message.hidden=true;
      const save=el('button','Save Correction');save.type='submit';save.className='primary-action';
      const cancel=button('Cancel',()=>{this.active=null;form.remove();correct.disabled=false;this.deps.refreshControls();this.sync();correct.focus();});
      form.append(el('p',`AI value: ${displayLineAmount(original)}`),labelCaption,label,amountCaption,amount,el('p','Leave amount blank for Not extracted. Enter 0 only when the document shows zero.'),save,cancel,message);
      form.onsubmit=async event=>{
        event.preventDefault();message.hidden=true;const latest=this.deps.state();if(latest!==state)return;
        try{
          const next:Correction={id,...(change??{})};
          if(label.value!==original.label&&label.value!=='' )next.label=label.value;
          else if(label.value===original.label)delete next.label;
          else if(current.label!==null)throw new Error('Enter a label.');
          const value=parseAmount(amount.value);
          if(amountEdited||Object.hasOwn(change??{},'amount'))next.amount=value;
          const changes=state.corrections.filter(change=>change.id!==id);if(Object.keys(next).length>1)changes.push(next);
          applyCorrections(state.reading,changes);save.disabled=true;cancel.disabled=true;label.disabled=true;amount.disabled=true;save.textContent='Saving your correction…';
          await this.deps.apply(changes);this.active=null;this.confirmStatus.textContent='Correction saved.';this.deps.refreshControls();this.sync();
          document.querySelector<HTMLButtonElement>(`[data-correct="${id}"]`)?.focus();
        }catch(cause){message.textContent=cause instanceof Error?cause.message:'Your correction could not be saved. Try again.';message.hidden=false;save.disabled=false;cancel.disabled=false;label.disabled=false;amount.disabled=false;save.textContent='Save Correction';}
      };
      row.append(form);label.focus();
    });
    correct.dataset.correct=id;correct.disabled=this.saving||this.deps.busy()||this.active!==null;
    const controls=el('div');controls.className='line-controls';controls.append(sourceButton,correct);row.append(controls);
  }
  private async confirm(){
    const state=this.deps.state();if(!state||this.saving||this.active!==null||state.updating||this.deps.busy())return;
    this.confirmError.hidden=true;
    try{
      prepareDay(state.reading,state.corrections,state.choices);
      this.saving=true;this.deps.refreshControls();this.sync();
      const body={raw:state.raw,date:state.reading.date,sources:state.reading.documents.map(doc=>doc.source),dsrSources:state.reading.dsrSources,choices:state.choices,corrections:state.corrections,expectedVersion:null as string|null};
      let result=await this.request('/days/confirm',body);
      while(result.status==='exists'){
        if(!window.confirm('Replace the saved day?')){this.confirmStatus.textContent='Saved day kept. Your current corrections are still here.';return;}
        body.expectedVersion=result.version;result=await this.request('/days/confirm',body);
      }
      this.clearShare();this.confirmed={state,signature:this.signature(state),date:state.reading.date,version:result.version};
      this.confirmStatus.textContent=`Day confirmed and saved — ${displayDate(state.reading.date)}.`;void this.loadLatest();
    }catch(cause){this.confirmError.textContent=cause instanceof Error?cause.message:'Your day could not be confirmed. Try again.';this.confirmError.hidden=false;}
    finally{this.saving=false;this.deps.refreshControls();this.sync();if(this.confirmed){this.confirmStatus.focus({preventScroll:true});void this.loadShare();}}
  }
  async showHistory(){
    if(this.saving||this.deps.busy())return;
    const request=++this.historyRequest;this.manager.hidden=true;this.history.hidden=false;this.navHistory.setAttribute('aria-current','page');this.navUpload.removeAttribute('aria-current');
    this.history.querySelector('h1')!.focus();await this.changeView(()=>{if(request===this.historyRequest)this.content.replaceChildren(el('p','Loading your saved days…'));});
    if(request!==this.historyRequest)return;
    try{
      const data=await this.request('/days/history');if(request!==this.historyRequest)return;
      const groups=el('div');this.content.replaceChildren(groups);const months=new Map<string,HTMLUListElement>();
      const append=(days:{date:string;confirmedAt:number;version:string}[])=>{
        const queue=days.map(day=>{
          const key=day.date.slice(0,7);let list=months.get(key);
          if(!list){
            const group=el('section');group.className='history-month';group.setAttribute('aria-label',displayMonth(day.date));
            list=el('ul');list.className='history-list';group.append(el('h2',displayMonth(day.date)),list);groups.append(group);months.set(key,list);
          }
          const item=el('li');item.className='history-card';
          const open=button(displayDate(day.date),()=>{void this.openDay(day.date);});open.className='day-open';
          const badge=el('span');badge.className='day-badge';badge.hidden=true;
          const header=el('div');header.className='day-card-header';header.append(open,badge);
          const stamp=el('p',`Confirmed: ${time(day.confirmedAt)}`);stamp.className='day-stamp';
          const values=el('dl');values.className='day-metrics';values.setAttribute('aria-label',`Saved DSR amounts for ${displayDate(day.date)}`);
          const message=el('p','Loading saved amounts…');message.className='card-status';
          const sharing=el('div');item.append(header,stamp,values,message,sharing);list.append(item);
          const load=async()=>{
            try{
              const {day:saved}=await this.request(`/days/detail?date=${encodeURIComponent(day.date)}`) as {day:SavedDay};
              if(request!==this.historyRequest)return;
              if(saved.version!==day.version)throw new Error('This day changed. Open it to see the latest saved version.');
              values.replaceChildren(...historySummary(saved).map(metric=>{const row=el('div');row.append(el('dt',metric.label),el('dd',metric.value));return row;}));
              const status=historyStatus(saved);badge.textContent=status.label;badge.hidden=false;item.dataset.status=status.tone;
              message.textContent='Saved DSR figures · Open the date for lines and checks.';
              sharing.replaceChildren(ownerSharing(saved));
            }catch(cause){
              if(request!==this.historyRequest)return;
              message.textContent=cause instanceof Error?cause.message:'Saved amounts could not be loaded.';
              message.setAttribute('role','alert');const retry=button('Retry amounts',()=>{retry.remove();message.textContent='Loading saved amounts…';void load();});item.append(retry);
            }
          };
          return load;
        });
        // Bound the reads for the existing 20-day page; never fetch the whole History.
        void Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{while(queue.length&&request===this.historyRequest)await queue.shift()!();}));
      };
      append(data.days);if(!data.days.length)this.content.append(el('p','No confirmed days yet. Read a DSR, review its lines, then tap Confirm day.'));
      let cursor=data.cursor;
      const more=button('Load more days',async()=>{more.disabled=true;try{const data=await this.request(`/days/history?cursor=${encodeURIComponent(cursor)}`);if(request!==this.historyRequest)return;append(data.days);cursor=data.cursor;more.hidden=!cursor;}catch{this.content.append(el('p','More days could not be loaded. Try again.'));}finally{more.disabled=false;}});more.hidden=!cursor;this.content.append(more);
    }catch(cause){if(request!==this.historyRequest)return;this.historyError(cause,()=>{void this.showHistory();});}
  }
  private async changeView(change:()=>void){
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&document.startViewTransition){
      try{await document.startViewTransition(change).updateCallbackDone;}catch{change();}
    }else change();
  }
  private historyError(cause:unknown,retry:()=>void){const message=el('p',cause instanceof Error?cause.message:'History could not be loaded. Try again.');message.className='form-error';message.setAttribute('role','alert');this.content.replaceChildren(message,button('Retry',retry));}
  private async openDay(date:string){
    const request=++this.historyRequest;this.content.replaceChildren(el('p','Loading saved day…'));
    try{
      const {day}=await this.request(`/days/detail?date=${encodeURIComponent(date)}`) as {day:SavedDay};if(request!==this.historyRequest)return;
      await this.changeView(()=>{
      if(request!==this.historyRequest)return;
      const heading=el('h2',`Confirmed day — ${displayDate(day.date)}`);heading.tabIndex=-1;
      this.content.replaceChildren(heading,el('p',`Confirmed: ${time(day.confirmedAt)}`),button('Back to History',()=>{void this.showHistory();}));
      this.content.append(ownerSharing(day));
      const checks=el('section');checks.append(el('h2','Matches / Differs'));
      for(const check of day.checks){const row=el('div');row.className='comparison-row';row.append(el('h3',check.title),el('p',checkWord(check.status)),el('p',`DSR: ${displayAmount(check.dsr)}`),el('p',`Supporting records: ${displayAmount(check.evidence)}`),el('p',`Difference: ${displayAmount(check.difference)}`));if(check.status==='Difference')row.classList.add('difference');checks.append(row);}
      this.content.append(checks);
      for(const doc of day.aiReading.documents){
        const group=el('section');group.append(el('h2',`Photo ${doc.source} — ${doc.kind}`),el('p',`Document date: ${displayDate(doc.date)}`));
        for(const section of [...sections,null]){
          const lines=day.lines.filter(line=>line.source===doc.source&&line.section===section);if(!lines.length)continue;
          group.append(el('h3',section??'Section not extracted'));const list=el('dl');
          for(const line of lines){const row=el('div');row.append(el('dt',line.label??'Not extracted'),el('dd',savedAmount(line)),el('p',`AI label: ${line.aiLabel??'Not extracted'}`),el('p',`AI value: ${displayAmount(line.aiValue)}${line.aiUnclear&&line.aiValue!==null?'?':''}`));if(Object.hasOwn(line,'correctedValue'))row.append(el('p',`Corrected value: ${displayAmount(line.correctedValue!)}`));if(line.correctedLabel!==undefined)row.append(el('p',`Corrected label: ${line.correctedLabel}`));if(line.writtenTotal)row.append(el('p','Written total — not added again.'));if(line.unclear)row.append(el('p','Unclear — remains flagged.'));list.append(row);}
          group.append(list);
        }this.content.append(group);
      }
      const totals=el('section');totals.append(el('h2','Written totals'));if(!day.writtenTotals.length)totals.append(el('p','Not extracted'));
      for(const line of day.writtenTotals)totals.append(el('p',`Photo ${line.source} — ${line.label??'Not extracted'}: ${savedAmount(line)}`));this.content.append(totals);
      heading.focus();
      });
    }catch(cause){if(request!==this.historyRequest)return;this.historyError(cause,()=>{void this.openDay(date);});}
  }
}
