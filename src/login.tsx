import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import './style.css';
import './owner-style.css';
import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ConvexReactClient,useConvexAuth} from 'convex/react';
import {ConvexAuthProvider,useAuthActions,useAuthToken} from '@convex-dev/auth/react';
import {setSession,setPropertyName,authenticatedFetch} from './session';
import {Landing} from './landing';
const endpoint=import.meta.env.VITE_CONVEX_SITE_URL;
const client=new ConvexReactClient(import.meta.env.VITE_CONVEX_URL||endpoint.replace('.site','.cloud'));
const invitationKey=`dsr-manager-invitation:${endpoint}`;
let invitationToken='';
const supplied=new URLSearchParams(location.hash.slice(1)).get('invite')||new URLSearchParams(location.search).get('invite');
try{
 if(supplied&&/^[a-f0-9]{64}$/.test(supplied)){sessionStorage.setItem(invitationKey,supplied);history.replaceState(null,'',location.pathname);}
 invitationToken=sessionStorage.getItem(invitationKey)||'';
}catch{invitationToken=supplied&&/^[a-f0-9]{64}$/.test(supplied)?supplied:'';}
type PropertySession={role:'owner'|'manager'|'unassigned';property:{id:string;name:string}|null};
let mounted=false,mountedAccount:string|null=null,destroyView:(()=>void)|null=null;
function accountFromToken(token:string|null){
 if(!token)return null;
 try{return String(JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub).split('|')[0];}catch{return null;}
}
function Login(){
 const {isLoading,isAuthenticated}=useConvexAuth(),token=useAuthToken(),{signIn,signOut}=useAuthActions();
 const [creating,setCreating]=useState(!!invitationToken),[busy,setBusy]=useState(false),[error,setError]=useState(''),[accessError,setAccessError]=useState(''),[connecting,setConnecting]=useState(false),[attempt,setAttempt]=useState(0),[session,setPropertySession]=useState<PropertySession|null>(null),[accessLost,setAccessLost]=useState(false);
 const [authOpened,setAuthOpened]=useState(!!invitationToken);
 const [propertyDraft,setPropertyDraft]=useState<{account:string|null;name:string}>({account:null,name:''});
 useEffect(()=>{
  if(authOpened&&!isLoading&&!isAuthenticated)document.getElementById('auth-heading')?.focus();
 },[authOpened,creating,isLoading,isAuthenticated]);
 useEffect(()=>{
  let checking=false;
  const lost=()=>{if(checking)return;checking=true;void(async()=>{
   const app=document.getElementById('app')!;
   try{const response=await authenticatedFetch(`${endpoint}/property/session`,{signal:AbortSignal.timeout(15000)}),next=await response.json() as PropertySession;if(response.ok&&next.property?.id===app.dataset.propertyId&&next.role===app.dataset.role)return;}catch{/* Hide old property records if access can no longer be verified. */}
   destroyView?.();destroyView=null;app.hidden=true;app.replaceChildren();setSession(null);setPropertySession(null);setConnecting(false);setAccessLost(true);setAccessError('Your property access has changed. Sign out, then use a valid manager invitation to sign in again.');
  })().finally(()=>{checking=false;});};
  window.addEventListener('property-access-lost',lost);return()=>window.removeEventListener('property-access-lost',lost);
 },[]);
 useEffect(()=>{
  let cancelled=false;const app=document.getElementById('app')!;
  if(accessLost){setSession(null);app.hidden=true;return;}
  setSession(isAuthenticated?token:null);app.hidden=!isAuthenticated||!mounted;
  const account=accountFromToken(token);
  if(mounted&&isAuthenticated&&account!==mountedAccount){setSession(null);app.hidden=true;destroyView?.();app.replaceChildren();window.location.reload();return;}
  if(!isAuthenticated&&!isLoading&&mounted){destroyView?.();app.replaceChildren();window.location.reload();return;}
  if(isAuthenticated&&token&&!mounted){
   setConnecting(true);setAccessError('');
   void(async()=>{
    try{
     if(invitationToken){
      const accepted=await authenticatedFetch(`${endpoint}/property/accept`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:invitationToken}),signal:AbortSignal.timeout(15000)}),result=await accepted.json();
      if(cancelled)return;
      if(!accepted.ok)throw new Error(result.error||'This invitation could not be accepted. Check that you signed in with the invited email.');
      try{sessionStorage.removeItem(invitationKey);}catch{/* Browser storage may be disabled. */}invitationToken='';
     }
     const response=await authenticatedFetch(`${endpoint}/property/session`,{signal:AbortSignal.timeout(15000)}),next=await response.json() as PropertySession;
     if(cancelled)return;
     if(!response.ok||!['owner','manager','unassigned'].includes(next.role))throw new Error('Your property could not be loaded. Try again.');
     setPropertySession(next);
     if(next.role==='unassigned'){app.hidden=true;return;}
     if(!next.property)throw new Error('Your property could not be loaded. Try again.');
     app.dataset.role=next.role;app.dataset.propertyName=next.property.name;app.dataset.propertyId=next.property.id;setPropertyName(next.property.name);
     const view=new URLSearchParams(location.search).get('view');
     if(next.role==='owner'&&view!=='history'){
      const {mountOwnerView}=await import('./owner-ui');if(cancelled)return;
      destroyView=mountOwnerView(app,endpoint,{propertyName:next.property.name}).destroy;
     }else{
      await import('./main');if(cancelled)return;
     }
     if(!cancelled){mounted=true;mountedAccount=account;app.hidden=false;}
    }catch(cause){if(!cancelled){app.hidden=true;setAccessError(cause instanceof Error?cause.message:'Your property could not be loaded. Try again.');}}
    finally{if(!cancelled)setConnecting(false);}
   })();
  }
  return()=>{cancelled=true;};
 },[isAuthenticated,isLoading,token,attempt,accessLost]);
 async function leave(){setBusy(true);setError('');try{await signOut();if(!mounted)window.location.reload();}catch{setError('Sign-out failed. Try again.');}finally{setBusy(false);}}
 if(isLoading)return <p role="status">Checking sign-in…</p>;
 if(isAuthenticated)return <><button className="secondary" disabled={busy} onClick={()=>{void leave();}}>Sign out</button>{connecting&&<p role="status">Loading your property…</p>}<p role="alert" className="form-error" hidden={!error&&!accessError}>{error||accessError}</p>{accessError&&!accessLost&&<button className="secondary" onClick={()=>setAttempt(value=>value+1)}>Retry property</button>}{session?.role==='unassigned'&&!connecting&&!accessError&&!invitationToken&&<section className="property-setup"><header><h1>Create your property</h1><p>Name your property to begin. Your existing saved reports stay with your account and will belong to this property.</p></header><form onSubmit={async event=>{
  event.preventDefault();if(busy)return;setBusy(true);setError('');const data=new FormData(event.currentTarget);
  try{const response=await authenticatedFetch(`${endpoint}/property/create`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:data.get('name')}),signal:AbortSignal.timeout(15000)}),result=await response.json();if(!response.ok)throw new Error(result.error||'Your property could not be created. Try again.');window.location.reload();}catch(cause){setError(cause instanceof Error?cause.message:'Your property could not be created. Try again.');}finally{setBusy(false);}
 }}><label htmlFor="property-name">Property name</label><input id="property-name" name="name" value={propertyDraft.account===accountFromToken(token)?propertyDraft.name:''} onChange={event=>setPropertyDraft({account:accountFromToken(token),name:event.currentTarget.value})} required maxLength={200} disabled={busy}/><button className="primary-action" disabled={busy}>{busy?'Creating property…':'Create property'}</button></form></section>}</>;
 if(!authOpened)return <Landing onStartOwner={()=>{setCreating(true);setError('');setAuthOpened(true);}} onSignIn={()=>{setCreating(false);setError('');setAuthOpened(true);}}/>;
 return <><header><h1 id="auth-heading" tabIndex={-1}>{creating?'Create your account':'Sign in'}</h1><p>{invitationToken?'Use the email in your manager invitation to sign in or create an account.':'Sign in to read, review and save your DSR. Your property’s reports are private to its owner and manager.'}</p></header><form onSubmit={async event=>{
  event.preventDefault();if(busy)return;setBusy(true);setError('');
  const data=new FormData(event.currentTarget);data.set('flow',creating?'signUp':'signIn');
  try{await signIn('password',data);}catch{setError(creating?'Account could not be created. Check your email and use a password with at least 8 characters.':'Sign-in failed. Check your email and password, then try again.');}finally{setBusy(false);}
 }}>{creating&&<p>Use the email you already have (Gmail is fine). Choose a new password just for this app.</p>}<label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy}/><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={creating?'new-password':'current-password'} minLength={8} required disabled={busy}/>{creating&&<p>At least 8 characters</p>}<p role="alert" className="form-error" hidden={!error}>{error}</p><button className="primary-action" disabled={busy}>{busy?'Please wait…':creating?'Create account':'Sign in'}</button><button type="button" className="secondary" disabled={busy} onClick={()=>{setCreating(!creating);setError('');}}>{creating?'Already have an account? Sign in':'Create an account'}</button></form></>;
}
createRoot(document.getElementById('login-root')!).render(<ConvexAuthProvider client={client}><Login/></ConvexAuthProvider>);
