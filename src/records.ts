import { imageType, MAX_BYTES } from './extraction';
import { recordKinds, recordType, validDate } from './daily';
export function setupRecords(date: HTMLInputElement, endpoint: string, busy: (active: boolean) => void) {
  const area = document.querySelector<HTMLElement>('#support')!;
  area.innerHTML = `<h2>Supporting records</h2><p>Add the same day’s bills and UPI records. Uploaded records are not checked yet.</p><label for="record-kind">Record type</label><select id="record-kind">${recordKinds.map(kind => `<option>${kind}</option>`).join('')}</select><input id="record-files" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden><button id="add-records" type="button" class="secondary">Add supporting records</button><div id="record-list"></div><button id="upload-records" type="button" class="secondary" hidden>Upload supporting records</button><p id="record-status" role="status" aria-live="polite"></p><p id="record-error" role="alert" hidden></p>`;
  const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const input = get<HTMLInputElement>('record-files'), kind = get<HTMLSelectElement>('record-kind');
  const pending: {file:File; kind:typeof recordKinds[number]; date:string; uploaded:boolean}[] = [];
  let active = false, locked = false;
  const error = (message = '') => { get('record-error').textContent = message; get('record-error').hidden = !message; };
  const render = () => {
    const list = get('record-list'); list.replaceChildren();
    pending.forEach((item,index) => {
      const row = document.createElement('div'); row.className='photo-row';
      const text=document.createElement('p'); text.textContent=`${item.file.name} · ${item.kind} · ${item.date} · ${item.uploaded ? 'Uploaded — not checked' : 'Selected — not uploaded'}`;
      row.append(text);
      if (!item.uploaded) { const remove=document.createElement('button'); remove.type='button';remove.className='secondary';remove.textContent='Remove record';remove.setAttribute('aria-label',`Remove record: ${item.file.name}`);remove.disabled=active||locked;remove.onclick=()=>{pending.splice(index,1);render();};row.append(remove); }
      list.append(row);
    });
    get<HTMLButtonElement>('add-records').disabled=active||locked;
    kind.disabled=active||locked;
    const upload=get<HTMLButtonElement>('upload-records');upload.hidden=!pending.some(item=>!item.uploaded&&item.date===date.value);upload.disabled=active||locked;upload.textContent=active?'Uploading records…':'Upload supporting records';
  };
  get('add-records').onclick=()=>{error();if(!validDate(date.value)){error('Choose the reporting date first.');date.focus();return;}input.value='';input.click();};
  input.onchange=async()=>{
    if(active||locked)return;
    const files=Array.from(input.files??[]);input.value='';if(!files.length)return;
    const chosenDate=date.value, chosenKind=kind.value as typeof recordKinds[number];
    active=true;busy(true);render();error();
    try {
      if(!validDate(chosenDate))throw new Error('Choose the reporting date first.');
      const remaining=pending.filter(item=>!item.uploaded&&item.date===chosenDate);
      if(remaining.length+files.length>6)throw new Error('Choose up to six supporting records per upload.');
      if([...remaining.map(item=>item.file),...files].reduce((sum,file)=>sum+file.size,0)>MAX_BYTES)throw new Error('Choose supporting files totalling no more than 10 MB.');
      for(const file of files){const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());if(!imageType(bytes)&&!recordType(bytes))throw new Error('Choose JPEG, PNG, WebP or PDF supporting records.');}
      pending.push(...files.map(file=>({file,kind:chosenKind,date:chosenDate,uploaded:false})));
    }catch(cause){error(cause instanceof Error?cause.message:'Choose valid supporting records.');}
    finally{active=false;busy(false);render();}
  };
  get('upload-records').onclick=async()=>{
    if(active||locked)return;
    if(!endpoint){error('Uploading is not configured yet.');return;}
    active=true;busy(true);render();error();
    try {
      for(const recordKind of recordKinds){
        const items=pending.filter(item=>!item.uploaded&&item.date===date.value&&item.kind===recordKind);if(!items.length)continue;
        const form=new FormData();form.set('date',date.value);form.set('kind',recordKind);items.forEach(item=>form.append('files',item.file));
        const response=await fetch(`${endpoint}/records`,{method:'POST',body:form,signal:AbortSignal.timeout(100000)});const data=await response.json();
        if(!response.ok)throw new Error(data.error||'Upload failed. Try again.');
        if(data.date!==date.value||!Array.isArray(data.files)||data.files.length!==items.length||data.files.some((file:{filename:string;kind:string},index:number)=>file.filename!==items[index].file.name.slice(0,200)||file.kind!==recordKind))throw new Error('Upload could not be verified. Try again.');
        items.forEach(item=>item.uploaded=true);render();
      }
      get('record-status').textContent='Supporting records uploaded. Comparison is not available yet.';
    }catch(cause){error(cause instanceof Error&&!['AbortError','TimeoutError','TypeError'].includes(cause.name)?cause.message:'Upload failed. Your selected files are still available to retry.');}
    finally{active=false;busy(false);render();}
  };
  date.addEventListener('change',()=>{get('record-status').textContent='';error();render();});
  return (value:boolean)=>{locked=value;render();};
}
