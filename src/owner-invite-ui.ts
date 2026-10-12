import './owner-style.css';
import {displayTime} from './date-display';
import {authenticatedFetch} from './session';

type Invitation={email:string;status:'pending'|'accepted';expiresAt:number};
type Manager={id:string;email:string};
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};

export function mountManagerInvitation(container:HTMLElement,endpoint:string){
 const section=el('details');section.className='owner-invitation';section.id='manager-invitation';
 section.append(el('summary','Manage manager'));
 const content=el('div');section.append(content);container.replaceChildren(section);
 let disposed=false,request=0,controller:AbortController|null=null;

 async function call(path='/property/invitation',body?:unknown){
  controller?.abort();controller=new AbortController();
  const response=await authenticatedFetch(`${endpoint}${path}`,{method:body?'POST':'GET',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Manager access could not be loaded. Try again.');return data as {invitation:Invitation|null;manager:Manager|null;token?:string};
 }
 function failure(error:HTMLElement,cause:unknown){error.textContent=cause instanceof Error&&cause.name!=='AbortError'&&cause.name!=='TimeoutError'?cause.message:'Manager access could not be updated. Try again.';error.hidden=false;}

 function render(invitation:Invitation|null,manager:Manager|null){
  const explanation=el('p','Invite one manager to upload, review and confirm reports for this property. You keep control of the property and its saved reports.');
  content.replaceChildren(explanation);
  if(manager){
   const connected=el('p',`Manager: ${manager.email}`);connected.setAttribute('role','status');
   const remove=el('button','Remove manager');remove.type='button';remove.className='secondary';
   const error=el('p');error.className='form-error';error.setAttribute('role','alert');error.hidden=true;
   remove.onclick=async()=>{
    if(!window.confirm('Remove this manager? They will lose access to this property. Saved reports will stay.'))return;
    const id=++request;remove.disabled=true;error.hidden=true;
    try{await call('/property/remove-manager',{expectedManagerId:manager.id});if(disposed||id!==request)return;await load();}
    catch(cause){if(!disposed&&id===request)failure(error,cause);}
    finally{if(!disposed)remove.disabled=false;}
   };
   content.append(connected,remove,error);return;
  }
  if(invitation)content.append(el('p',`Waiting for ${invitation.email} to accept.`));
  const form=el('form'),label=el('label','Manager email'),email=el('input');
  email.id='manager-email';email.type='email';email.name='manager-email';email.autocomplete='email';email.maxLength=254;email.required=true;email.value=invitation?.email??'';label.htmlFor=email.id;
  const submit=el('button',invitation?'Create new link':'Create invitation link');submit.type='submit';submit.className='secondary';
  const error=el('p');error.className='form-error';error.setAttribute('role','alert');error.hidden=true;
  const linkSlot=el('div');linkSlot.className='owner-invite-result';
  email.oninput=()=>{linkSlot.replaceChildren();error.hidden=true;};
  let busy=false;
  form.onsubmit=async event=>{
   event.preventDefault();if(busy||disposed)return;
   const id=++request;busy=true;email.disabled=true;submit.disabled=true;submit.textContent='Creating link…';error.hidden=true;linkSlot.replaceChildren();
   try{
    const data=await call('/property/invitation',{email:email.value.trim()});if(disposed||id!==request)return;
    if(!data.invitation||typeof data.token!=='string'||!data.token)throw new Error('The invitation link could not be created. Try again.');
    render(data.invitation,null);
    const result=content.querySelector<HTMLElement>('.owner-invite-result');if(!result)return;
    const link=`${location.origin}/manager#invite=${encodeURIComponent(data.token)}`;
    const caption=el('label','Private invitation link'),field=el('input');field.id='manager-invite-link';field.className='owner-invite-link';field.type='text';field.readOnly=true;field.value=link;caption.htmlFor=field.id;field.onclick=()=>field.select();
    const copy=el('button','Copy invitation link');copy.type='button';copy.className='secondary';
    const status=el('p','Share this link with the invited manager yourself. No email has been sent.');status.setAttribute('role','status');
    copy.onclick=async()=>{
     try{await navigator.clipboard.writeText(link);if(disposed)return;status.textContent='Invitation link copied. Share it with the invited manager.';}
     catch{if(disposed)return;field.focus();field.select();status.textContent='Select and copy the link above, then share it with the invited manager.';}
    };
    result.append(caption,field,copy,status,el('p',`Link expires: ${displayTime(data.invitation.expiresAt)}.`));
   }catch(cause){if(!disposed&&id===request)failure(error,cause);}
   finally{busy=false;if(!disposed&&id===request){email.disabled=false;submit.disabled=false;submit.textContent=invitation?'Create new link':'Create invitation link';}}
  };
  form.append(label,email,submit,error);content.append(form,linkSlot);
 }

 async function load(){
  const id=++request,loading=el('p','Loading manager access…');loading.setAttribute('role','status');content.replaceChildren(loading);
  try{const data=await call();if(disposed||id!==request)return;render(data.invitation,data.manager);}
  catch(cause){
   if(disposed||id!==request)return;
   const error=el('p');error.className='form-error';error.setAttribute('role','alert');failure(error,cause);
   const retry=el('button','Retry invitation');retry.type='button';retry.className='secondary';retry.onclick=()=>{void load();};content.replaceChildren(error,retry);
  }
 }
 void load();
 return {destroy(){disposed=true;request++;controller?.abort();section.remove();}};
}
