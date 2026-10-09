import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import './style.css';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexReactClient, useConvexAuth } from 'convex/react';
import { ConvexAuthProvider, useAuthActions, useAuthToken } from '@convex-dev/auth/react';
import { setSession } from './session';
const endpoint=import.meta.env.VITE_CONVEX_SITE_URL;
const client=new ConvexReactClient(import.meta.env.VITE_CONVEX_URL||endpoint.replace('.site','.cloud'));
let mounted=false;
let mountedAccount:string|null=null;
function accountFromToken(token:string|null){
  if(!token)return null;
  try{return String(JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub).split('|')[0];}catch{return null;}
}
function Login(){
  const {isLoading,isAuthenticated}=useConvexAuth();const token=useAuthToken();const {signIn,signOut}=useAuthActions();
  const [creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    setSession(isAuthenticated?token:null);
    const app=document.getElementById('app')!;app.hidden=!isAuthenticated;
    const account=accountFromToken(token);
    if(mounted&&isAuthenticated&&account!==mountedAccount){setSession(null);app.hidden=true;app.replaceChildren();window.location.reload();return;}
    if(isAuthenticated&&token&&!mounted){mounted=true;mountedAccount=account;void import('./main');}
    if(!isAuthenticated&&!isLoading&&mounted){app.replaceChildren();window.location.reload();}
  },[isAuthenticated,isLoading,token]);
  if(isLoading)return <p role="status">Checking sign-in…</p>;
  if(isAuthenticated)return <><button className="secondary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await signOut();}catch{setError('Sign-out failed. Try again.');}finally{setBusy(false);}}}>Sign out</button><p role="alert" className="form-error" hidden={!error}>{error}</p></>;
  return <><header><h1>{creating?'Create your account':'Manager sign-in'}</h1><p>Sign in to read, review and save your DSR. Your History is private to your account.</p></header><form onSubmit={async event=>{
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    const data=new FormData(event.currentTarget);data.set('flow',creating?'signUp':'signIn');
    try{await signIn('password',data);}catch{setError(creating?'Account could not be created. Check your email and use a password with at least 8 characters.':'Sign-in failed. Check your email and password, then try again.');}finally{setBusy(false);}
  }}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy}/><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={creating?'new-password':'current-password'} minLength={8} required disabled={busy}/>{creating&&<p>Use at least 8 characters.</p>}<p role="alert" className="form-error" hidden={!error}>{error}</p><button className="primary-action" disabled={busy}>{busy?'Please wait…':creating?'Create account':'Sign in'}</button><button type="button" className="secondary" disabled={busy} onClick={()=>{setCreating(!creating);setError('');}}>{creating?'Already have an account? Sign in':'Create an account'}</button></form></>;
}
createRoot(document.getElementById('login-root')!).render(<ConvexAuthProvider client={client}><Login/></ConvexAuthProvider>);
