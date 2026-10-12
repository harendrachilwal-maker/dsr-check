import {getAuthUserId} from '@convex-dev/auth/server';
import type {HttpRouter} from 'convex/server';
import {httpAction,type ActionCtx} from './_generated/server';
import {internal} from './_generated/api';
import type {Id} from './_generated/dataModel';
import {invitationHash,normalEmail} from './ownerAccess';

export const propertyHeaders={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'};
export const propertyReply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:propertyHeaders});
export async function readPropertyBody(request:Request,keys:string[],limit=4096){
 const reader=request.body?.getReader();if(!reader)throw new Error('Check the form and try again.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>limit){await reader.cancel();throw new Error('This request is too large.');}chunks.push(part.value);}
 const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
 const body=JSON.parse(new TextDecoder().decode(bytes));
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==keys.length||keys.some(key=>!Object.hasOwn(body,key)))throw new Error('Check the form and try again.');
 return body;
}
export async function ownerAccess(ctx:ActionCtx){
 if(!await getAuthUserId(ctx))return {denied:propertyReply({error:'Sign in to continue.'},401),access:null};
 const access=await ctx.runQuery(internal.propertyAccess.access,{});
 return access?.role==='owner'?{denied:null,access}:{denied:propertyReply({error:'Only the property owner can do this.'},403),access:null};
}
const signedOut=()=>propertyReply({error:'Sign in to continue.'},401);
const session=httpAction(async ctx=>!await getAuthUserId(ctx)?signedOut():propertyReply(await ctx.runQuery(internal.propertyAccess.session,{})));
const create=httpAction(async(ctx,request)=>{
 if(!await getAuthUserId(ctx))return signedOut();
 try{
  const body=await readPropertyBody(request,['name']);if(typeof body.name!=='string')throw new Error('Enter a property name.');
  const result=await ctx.runMutation(internal.propertyAccess.create,{name:body.name});
  return result.status==='exists'?propertyReply({error:'This account is already connected to a property.'},409):propertyReply({property:result.property});
 }catch(cause){return propertyReply({error:cause instanceof Error?cause.message:'The property could not be created.'},400);}
});
const invitation=httpAction(async ctx=>{
 const {denied}=await ownerAccess(ctx);if(denied)return denied;
 return propertyReply(await ctx.runQuery(internal.propertyAccess.invitation,{}));
});
const invite=httpAction(async(ctx,request)=>{
 const {denied}=await ownerAccess(ctx);if(denied)return denied;
 try{
  const body=await readPropertyBody(request,['email']),email=normalEmail(body.email);
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
  const result=await ctx.runMutation(internal.propertyAccess.invite,{email,tokenHash:await invitationHash(token),expiresAt:Date.now()+7*24*60*60*1000});
  return result.status==='exists'?propertyReply({error:'A manager is already connected. Remove them before inviting another.'},409):propertyReply({invitation:result.invitation,token});
 }catch(cause){return propertyReply({error:cause instanceof Error?cause.message:'The invitation could not be created.'},400);}
});
const accept=httpAction(async(ctx,request)=>{
 if(!await getAuthUserId(ctx))return signedOut();
 try{
  const body=await readPropertyBody(request,['token']);
  return propertyReply(await ctx.runMutation(internal.propertyAccess.accept,{tokenHash:await invitationHash(body.token)}));
 }catch{return propertyReply({error:'This invitation is not valid for your account. Ask the owner for a new link.'},400);}
});
const remove=httpAction(async(ctx,request)=>{
 const {denied}=await ownerAccess(ctx);if(denied)return denied;
 try{
  const body=await readPropertyBody(request,['expectedManagerId']);if(typeof body.expectedManagerId!=='string')throw new Error('Choose the connected manager.');
  const result=await ctx.runMutation(internal.propertyAccess.remove,{expectedManagerId:body.expectedManagerId as Id<'users'>});
  return result.status==='changed'?propertyReply({error:'The connected manager changed. Refresh before removing anyone.'},409):propertyReply({removed:true});
 }catch{return propertyReply({error:'The manager could not be removed. Refresh and try again.'},400);}
});
export function registerPropertyRoutes(http:HttpRouter){
 for(const [path,method,handler] of [['/property/session','GET',session],['/owner/session','GET',session],['/property/create','POST',create],['/property/invitation','GET',invitation],['/property/invitation','POST',invite],['/property/accept','POST',accept],['/property/remove-manager','POST',remove]] as const)http.route({path,method,handler});
 for(const path of ['/property/session','/owner/session','/property/create','/property/invitation','/property/accept','/property/remove-manager'])http.route({path,method:'OPTIONS',handler:httpAction(async()=>new Response(null,{status:204,headers:propertyHeaders}))});
}
