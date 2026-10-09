import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import './style.css';
import { BUSY, displayAmount, displayLineAmount, sections, imageType, MAX_BYTES, datedDocumentsFromRawResponse, totalsBySection, isWrittenTotal, type Extracted } from './extraction';
import { comparisonReadingFromRaw, buildComparison, type Choice, type Reading, type Comparison } from './comparison';
import { showComparison } from './comparison-ui';
import { validDate } from './daily';
import { encodeImage, MAX_PHOTOS, SIZE_ERROR } from './uploads';
import { applyCorrections, type Correction } from './confirmed-day';
import { DayReview, type ReviewState } from './day-review-ui';
const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML=`<header><h1>Turn Your Paper DSR into a Digital DSR</h1><p>Choose the reporting date, add the DSR photos, then add guest bills, UPI records and expense photos.</p></header><label for="report-date">Reporting date</label><input id="report-date" type="date"><section aria-label="DSR photos"><h2>DSR photos</h2><input id="photo" type="file" aria-label="Choose DSR photos" accept="image/jpeg,image/png,image/webp" multiple hidden><button id="add-dsr" class="secondary" type="button">Add DSR Photos</button><div id="dsr-photos"></div></section><section aria-label="Other photos"><h2>Other photos</h2><p>Guest bills, food bills, UPI records and expenses.</p><input id="other-photo" type="file" aria-label="Choose other photos" accept="image/jpeg,image/png,image/webp" multiple hidden><button id="add-other" class="secondary" type="button">Add Other Photos</button><div id="other-photos"></div></section><section id="selected" hidden aria-label="Selected photos"><p id="selection-count"></p></section><section id="results" hidden aria-label="Extracted Digital DSR"><h2 id="result-heading" tabindex="-1">Extracted Digital DSR</h2><p>AI-extracted figures. Check them against your original photos.</p><div id="comparison" translate="no"></div><div id="amounts" translate="no"></div><details><summary>View raw AI response</summary><pre id="raw" translate="no"></pre></details></section><p id="status" role="status" aria-live="polite"></p><p id="error" role="alert" hidden></p><div class="actions"><button id="primary" type="button">Start AI Scanning</button></div>`;
const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const input=get<HTMLInputElement>('photo'),otherInput=get<HTMLInputElement>('other-photo'),date=get<HTMLInputElement>('report-date'),primary=get<HTMLButtonElement>('primary');
type Photo={file:File;url:string;role:'DSR'|'Other'};
date.onchange=()=>{clearResults();error();};
let photos:Photo[]=[];let scanning=false;let selecting=false;
let comparisonState:ReviewState|null=null;
const review=new DayReview({endpoint:import.meta.env.VITE_CONVEX_SITE_URL,state:()=>comparisonState,photos:()=>photos,busy:()=>scanning||selecting,refreshControls:renderPhotos,apply:applyLineCorrections});
function error(message=''){get('error').textContent=message;get('error').hidden=!message;}
function clearResults(){comparisonState=null;review.reset();primary.classList.remove('secondary');get('comparison').replaceChildren();get('results').hidden=true;get('raw').textContent='';get('amounts').textContent='';get('status').textContent='';get('result-heading').textContent='Extracted Digital DSR';}
function renderPhotos(){
 const locked=scanning||selecting||review.busy()||!!comparisonState?.updating;
 get('dsr-photos').replaceChildren();get('other-photos').replaceChildren();
 photos.forEach((photo,index)=>{
  const row=document.createElement('div');row.className='photo-row';
  const image=document.createElement('img');image.src=photo.url;image.alt=`Uploaded photo ${index+1}`;
  const name=document.createElement('p');name.textContent=photo.file.name;
  const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Remove photo';remove.setAttribute('aria-label',`Remove photo ${index+1}: ${photo.file.name}`);remove.disabled=locked;
  remove.onclick=()=>{if(locked)return;URL.revokeObjectURL(photo.url);photos.splice(index,1);clearResults();error();renderPhotos();get<HTMLButtonElement>(photo.role==='DSR'?'add-dsr':'add-other').focus();};
  row.append(image,name,remove);get(photo.role==='DSR'?'dsr-photos':'other-photos').append(row);
 });
 get('selected').hidden=!photos.length;get('selection-count').textContent=`${photos.length} of ${MAX_PHOTOS} photos · 10 MB total maximum`;
 date.disabled=locked;
 for(const id of ['add-dsr','add-other'])get<HTMLButtonElement>(id).disabled=locked||photos.length>=MAX_PHOTOS;primary.disabled=locked;
 if(!scanning)primary.textContent='Start AI Scanning';
 review.sync();
}
get('add-dsr').onclick=()=>{input.value='';input.click();};
get('add-other').onclick=()=>{otherInput.value='';otherInput.click();};
async function selectPhotos(input:HTMLInputElement,role:Photo['role']){
 const chosen=Array.from(input.files??[]);input.value='';if(!chosen.length||scanning||selecting)return;
 selecting=true;renderPhotos();error();
 try{
  if(photos.length+chosen.length>MAX_PHOTOS)throw new Error('Choose up to six DSR and bill photos.');
  if([...photos.map(photo=>photo.file),...chosen].reduce((sum,file)=>sum+file.size,0)>MAX_BYTES)throw new Error(SIZE_ERROR);
  for(const file of chosen)if(!imageType(new Uint8Array(await file.slice(0,12).arrayBuffer())))throw new Error('Choose JPEG, PNG or WebP photos.');
  photos.push(...chosen.map(file=>({file,url:URL.createObjectURL(file),role})));clearResults();
 }catch(cause){error(cause instanceof Error?cause.message:'Choose valid photos.');}
 finally{selecting=false;renderPhotos();}
}
input.onchange=()=>selectPhotos(input,'DSR');otherInput.onchange=()=>selectPhotos(otherInput,'Other');
function renderLines(extracted: Extracted, amounts: HTMLElement, calculate=false, compact=false, source?:number){
    const original=comparisonState?.reading.documents.find(doc=>doc.source===source);
    const summaries = calculate?totalsBySection({lines:extracted.lines.map((line,index)=>original&&(isWrittenTotal(original.lines[index]?.label)||comparisonState?.reading.contexts.some(context=>context.source===source&&context.line===index&&context.role==='Written total'))?{...line,label:'Total'}:line)}):[];
    const groups = [...sections, ...(extracted.lines.some(line => line.section === null) ? [null] : [])];
    for (const section of groups) {
      if(compact&&!extracted.lines.some(line=>line.section===section))continue;
      const group = document.createElement('section'); group.className = 'dsr-section';
      const heading = document.createElement(compact?'h4':'h3'); heading.textContent = section ?? 'Section not extracted'; group.append(heading);
      const list = document.createElement('dl');
      for (const line of extracted.lines.filter(line => line.section === section)) {
        const row = document.createElement('div'); row.className = 'dsr-line';
        const name = document.createElement('dt'); name.textContent = line.label ?? 'Not extracted';
        const value = document.createElement('dd'); value.textContent = displayLineAmount(line); row.append(name, value);
        if (line.unclear) { const note = document.createElement('p'); note.textContent = 'Unclear — check the original DSR.'; row.append(note); }
        if (isWrittenTotal(line.label)) { const note = document.createElement('p'); note.textContent = 'Written total — not added again.'; row.append(note); }
        if(source!==undefined&&comparisonState){const index=extracted.lines.indexOf(line);const original=comparisonState.reading.documents.find(doc=>doc.source===source)!.lines[index];review.attachLine(row,source,index,original,line);}
        list.append(row);
      }
      if (!list.children.length) { const empty = document.createElement('p'); empty.textContent = 'Not extracted'; group.append(empty); }
      else group.append(list);
      const summary = summaries.find(item => item.section === section);
      if (summary) {
        const total = document.createElement('p'); total.className = 'section-total'; total.textContent = `Calculated total of entries: ${displayAmount(summary.total)}`; group.append(total);
        if (summary.incomplete) { const note = document.createElement('p'); note.textContent = `Incomplete: ${summary.incomplete} unreadable, unclear or unassigned ${summary.incomplete === 1 ? 'entry' : 'entries'}.`; group.append(note); }
        if (summary.incomplete && summary.readableSubtotal !== null) { const subtotal = document.createElement('p'); subtotal.textContent = `Readable subtotal: ${displayAmount(summary.readableSubtotal)}`; group.append(subtotal); }
      }
      amounts.append(group);
    }
    if(compact&&!extracted.lines.length){const empty=document.createElement('p');empty.textContent='Not extracted';amounts.append(empty);}
}
primary.onclick=async()=>{
 if(scanning||selecting||review.busy()||comparisonState?.updating)return;
 if(!validDate(date.value)){error('Choose the reporting date first.');date.focus();return;}
 if(!photos.some(photo=>photo.role==='DSR')){error('Add the DSR photo before scanning.');get<HTMLButtonElement>('add-dsr').focus();return;}
 const endpoint=import.meta.env.VITE_CONVEX_SITE_URL;if(!endpoint){error('Scanning is not configured yet.');return;}
 scanning=true;renderPhotos();clearResults();error();primary.textContent='Reading your DSR…';get('status').textContent='Reading your DSR…';get('selected').classList.add('scanning');let failed=false;
 try{
  const images=await Promise.all(photos.map(async photo=>encodeImage(new Uint8Array(await photo.file.arrayBuffer()))));
  const response=await fetch(`${endpoint}/extract`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'compare',date:date.value,dsrSources:photos.flatMap((photo,index)=>photo.role==='DSR'?[index+1]:[]),images}),signal:AbortSignal.timeout(100000)});
  const data=await response.json();if(!response.ok)throw new Error(data.error||BUSY);
  if(data.mode!=='dated'&&data.mode!=='compare')throw new Error(BUSY);
  let reading:ReturnType<typeof datedDocumentsFromRawResponse>;
  try{
   const sources=photos.map((_,index)=>index+1),dsrSources=photos.flatMap((photo,index)=>photo.role==='DSR'?[index+1]:[]);
   if(data.mode==='compare'){const contextual=comparisonReadingFromRaw(data.raw,date.value,sources,dsrSources);reading=contextual;comparisonState={raw:data.raw,reading:contextual,choices:[],corrections:[],updating:false};const checked=buildComparison(contextual);if(JSON.stringify(data.comparison)!==JSON.stringify(checked))throw new Error(BUSY);renderComparison(data.comparison);}
   else reading=datedDocumentsFromRawResponse(data.raw,date.value,sources,dsrSources);
  }catch{throw new Error(BUSY);}
  const amounts=get('amounts');amounts.replaceChildren();
  get('result-heading').textContent=`Extracted Digital DSR — ${reading.date??'Date not extracted'}`;
  if(!reading.documents.some(doc=>doc.kind==='Daily sheet'||doc.kind==='Handwritten DSR')){const note=document.createElement('p');note.textContent='DSR not identified. Add a clear DSR photo.';amounts.append(note);}
  for(const doc of reading.documents){
   const container=document.createElement('section');container.className='dsr-document';
   const heading=document.createElement('h3');heading.textContent=`Photo ${doc.source} — ${doc.kind}`;container.append(heading);
   const filename=document.createElement('p');filename.textContent=photos[doc.source-1].file.name;container.append(filename);
   const note=document.createElement('p');note.textContent=doc.date===null?'Date not extracted — check the original.':reading.date!==null&&doc.date!==reading.date?`Different date: ${doc.date} — not this day’s record.`:`Document date: ${doc.date}`;container.append(note);
   if(reading.date===null){const unmatched=document.createElement('p');unmatched.textContent='DSR date not extracted — this photo is not matched to a reporting day.';container.append(unmatched);}
   renderLines({lines:doc.lines},container,doc.kind==='Handwritten DSR'&&reading.date!==null,true,doc.source);amounts.append(container);
  }
  get('raw').textContent=JSON.stringify(data.raw,null,2);get('results').hidden=false;
  if(comparisonState){primary.classList.add('secondary');review.sync();}
  get('status').textContent=!reading.documents.some(doc=>photos[doc.source-1].role==='DSR'&&doc.lines.some(line=>line.amount!==null))?'DSR row not extracted for this date. Check the selected date or upload a clearer DSR photo.':reading.documents.every(doc=>!doc.lines.length||doc.lines.every(line=>line.amount===null))?'We couldn’t read the amounts clearly. Upload clearer photos.':'Your photos have been read. These figures are not confirmed.';
  get('result-heading').focus({preventScroll:true});get('results').scrollIntoView({block:'start'});
 }catch(cause){failed=true;clearResults();error(cause instanceof Error&&!['AbortError','TimeoutError','TypeError'].includes(cause.name)?cause.message:BUSY);get('status').textContent='';}
 finally{scanning=false;renderPhotos();primary.textContent=failed?'Retry Scanning':'Start AI Scanning';get('selected').classList.remove('scanning');}
};
renderPhotos();

function renderComparison(report:Comparison,focusEntry?:string){
 showComparison(get('comparison'),report,photos,async choice=>{
  const state=comparisonState;if(!state||scanning||review.busy())throw new Error('Finish the current correction before adding context.');
  if(state.updating)throw new Error('Wait for the current context check to finish.');
  state.updating=true;renderPhotos();review.sync();
  try{
  const choices=[...state.choices.filter(item=>item.id!==choice.id),choice];
  const response=await fetch(`${import.meta.env.VITE_CONVEX_SITE_URL}/compare`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({raw:state.raw,date:state.reading.date,sources:state.reading.documents.map(doc=>doc.source),dsrSources:state.reading.dsrSources,choices,corrections:state.corrections}),signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(comparisonState!==state)return;
  if(!response.ok)throw new Error(data.error||'Check this context and try again.');
  if(JSON.stringify(data.comparison)!==JSON.stringify(buildComparison(applyCorrections(state.reading,state.corrections),choices)))throw new Error('The comparison could not be checked. Try again.');
  state.choices=choices;renderComparison(data.comparison,choice.id);get('status').textContent='Comparison updated using your context. The original AI reading is unchanged.';
  }finally{state.updating=false;renderPhotos();review.sync();}
 },focusEntry);
}

async function applyLineCorrections(changes:Correction[]){
 const state=comparisonState;if(!state||state.updating)throw new Error('Wait for the current check to finish.');
 const effective=applyCorrections(state.reading,changes);state.updating=true;renderPhotos();review.sync();
 try{
  const response=await fetch(`${import.meta.env.VITE_CONVEX_SITE_URL}/compare`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({raw:state.raw,date:state.reading.date,sources:state.reading.documents.map(doc=>doc.source),dsrSources:state.reading.dsrSources,choices:state.choices,corrections:changes}),signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(comparisonState!==state)throw new Error('The reading changed. Review the latest photos.');
  if(!response.ok||JSON.stringify(data.comparison)!==JSON.stringify(buildComparison(effective,state.choices)))throw new Error('Your correction could not be checked. Try again.');
  state.corrections=changes;renderComparison(data.comparison);
  const amounts=get('amounts');amounts.replaceChildren();
  for(const doc of effective.documents){const container=document.createElement('section');container.className='dsr-document';const heading=document.createElement('h3');heading.textContent=`Photo ${doc.source} — ${doc.kind}`;const name=document.createElement('p');name.textContent=photos[doc.source-1].file.name;const note=document.createElement('p');note.textContent=doc.date===null?'Date not extracted — check the original.':doc.date!==effective.date?`Different date: ${doc.date} — not this day’s record.`:`Document date: ${doc.date}`;container.append(heading,name,note);renderLines({lines:doc.lines},container,doc.kind==='Handwritten DSR',true,doc.source);amounts.append(container);}
 }finally{state.updating=false;renderPhotos();review.sync();}
}
