import {getAuthUserId} from '@convex-dev/auth/server';
import {v} from 'convex/values';
import {internalQuery,internalMutation,type QueryCtx} from './_generated/server';
import {normalEmail} from './ownerAccess';

type AccessCtx=Pick<QueryCtx,'auth'|'db'>;
export async function propertyAccess(ctx:AccessCtx){
 const userId=await getAuthUserId(ctx);if(!userId)return null;
 const owned=await ctx.db.query('properties').withIndex('by_owner',query=>query.eq('ownerId',userId)).unique();
 const managed=owned?null:await ctx.db.query('properties').withIndex('by_manager',query=>query.eq('managerId',userId)).unique();
 const property=owned??managed;
 return property?{role:owned?'owner' as const:'manager' as const,propertyId:property._id,name:property.name,scope:property.dataScope}:null;
}
export async function requireProperty(ctx:AccessCtx,scope?:string,ownerOnly=false){
 const access=await propertyAccess(ctx);
 if(!access||scope!==undefined&&access.scope!==scope||ownerOnly&&access.role!=='owner')throw new Error('You do not have access to this property.');
 return access;
}
export async function requireManager(ctx:AccessCtx,scope?:string){
 const access=await requireProperty(ctx,scope);
 if(access.role!=='manager')throw new Error('Only the invited manager can upload and confirm a day.');
 return access;
}
const accessValue=v.object({role:v.union(v.literal('owner'),v.literal('manager')),propertyId:v.id('properties'),name:v.string(),scope:v.string()});
export const access=internalQuery({args:{},returns:v.union(accessValue,v.null()),handler:propertyAccess});
export const session=internalQuery({
 args:{},returns:v.object({role:v.union(v.literal('owner'),v.literal('manager'),v.literal('unassigned')),property:v.union(v.object({id:v.id('properties'),name:v.string()}),v.null())}),
 handler:async ctx=>{const access=await propertyAccess(ctx);return access?{role:access.role,property:{id:access.propertyId,name:access.name}}:{role:'unassigned' as const,property:null};},
});
export const create=internalMutation({
 args:{name:v.string()},returns:v.union(v.object({status:v.literal('exists')}),v.object({status:v.literal('created'),property:v.object({id:v.id('properties'),name:v.string()})})),
 handler:async(ctx,{name:provided})=>{
  const ownerId=await getAuthUserId(ctx);if(!ownerId||!await ctx.db.get(ownerId))throw new Error('Sign in to continue.');
  if(await propertyAccess(ctx))return {status:'exists' as const};
  const name=provided.trim();if(!name||name.length>200)throw new Error('Enter a property name with up to 200 characters.');
  // Bind this exact signed-in account's legacy scope in place, including every historical version.
  const dataScope=`manager:${ownerId}`;
  if(await ctx.db.query('properties').withIndex('by_scope',query=>query.eq('dataScope',dataScope)).unique())throw new Error('This account is already connected to a property.');
  const id=await ctx.db.insert('properties',{ownerId,name,dataScope,managerId:null,createdAt:Date.now()});
  return {status:'created' as const,property:{id,name}};
 },
});
const invitationMetadata=v.object({email:v.string(),status:v.union(v.literal('pending'),v.literal('accepted')),expiresAt:v.number()});
export const invitation=internalQuery({
 args:{},returns:v.object({invitation:v.union(invitationMetadata,v.null()),manager:v.union(v.object({id:v.id('users'),email:v.string()}),v.null())}),
 handler:async ctx=>{
  const access=await requireProperty(ctx,undefined,true),property=await ctx.db.get(access.propertyId);
  const row=await ctx.db.query('propertyInvitations').withIndex('by_property',query=>query.eq('propertyId',access.propertyId)).unique();
  const manager=property?.managerId?await ctx.db.get(property.managerId):null;
  return {invitation:row?{email:row.email,status:row.managerId?'accepted' as const:'pending' as const,expiresAt:row.expiresAt}:null,manager:manager?{id:manager._id,email:manager.email??''}:null};
 },
});
export const invite=internalMutation({
 args:{email:v.string(),tokenHash:v.string(),expiresAt:v.number()},returns:v.union(v.object({status:v.literal('exists')}),v.object({status:v.literal('created'),invitation:invitationMetadata})),
 handler:async(ctx,{email:provided,tokenHash,expiresAt})=>{
  const access=await requireProperty(ctx,undefined,true),property=await ctx.db.get(access.propertyId),ownerId=await getAuthUserId(ctx),owner=ownerId?await ctx.db.get(ownerId):null;
  if(!property||!owner)throw new Error('Sign in to continue.');
  if(property.managerId)return {status:'exists' as const};
  const email=normalEmail(provided);
  if(email===normalEmail(owner.email))throw new Error('Use a separate manager email.');
  if(!/^[a-f0-9]{64}$/.test(tokenHash)||!Number.isFinite(expiresAt)||expiresAt<=Date.now()||expiresAt>Date.now()+8*24*60*60*1000)throw new Error('Invalid invitation.');
  const row=await ctx.db.query('propertyInvitations').withIndex('by_property',query=>query.eq('propertyId',property._id)).unique();
  if(row)await ctx.db.patch(row._id,{email,tokenHash,expiresAt,createdAt:Date.now(),managerId:null,acceptedAt:null});
  else await ctx.db.insert('propertyInvitations',{propertyId:property._id,email,tokenHash,expiresAt,createdAt:Date.now(),managerId:null,acceptedAt:null});
  return {status:'created' as const,invitation:{email,status:'pending' as const,expiresAt}};
 },
});
export const accept=internalMutation({
 args:{tokenHash:v.string()},returns:v.object({property:v.object({id:v.id('properties'),name:v.string()}),role:v.literal('manager')}),
 handler:async(ctx,{tokenHash})=>{
  const managerId=await getAuthUserId(ctx),user=managerId?await ctx.db.get(managerId):null;
  if(!managerId||!user)throw new Error('Sign in to continue.');
  const row=await ctx.db.query('propertyInvitations').withIndex('by_token_hash',query=>query.eq('tokenHash',tokenHash)).unique();
  const property=row?await ctx.db.get(row.propertyId):null;
  const existing=await propertyAccess(ctx);
  // A lost response can safely retry this account's exact accepted link, never another user's link.
  if(row&&property&&existing?.role==='manager'&&existing.propertyId===property._id&&property.managerId===managerId&&row.managerId===managerId&&row.email===normalEmail(user.email))return {property:{id:property._id,name:property.name},role:'manager' as const};
  if(existing)throw new Error('This account is already connected to a property.');
  if(!row||!property||row.managerId||row.expiresAt<=Date.now()||row.email!==normalEmail(user.email)||property.ownerId===managerId||property.managerId)throw new Error('This invitation is not valid. Ask the owner for a new link.');
  await ctx.db.patch(property._id,{managerId});await ctx.db.patch(row._id,{managerId,acceptedAt:Date.now()});
  return {property:{id:property._id,name:property.name},role:'manager' as const};
 },
});
export const remove=internalMutation({
 args:{expectedManagerId:v.id('users')},returns:v.object({status:v.union(v.literal('removed'),v.literal('changed'))}),
 handler:async(ctx,{expectedManagerId})=>{
  const access=await requireProperty(ctx,undefined,true),property=await ctx.db.get(access.propertyId);
  if(!property||property.managerId!==expectedManagerId)return {status:'changed' as const};
  const row=await ctx.db.query('propertyInvitations').withIndex('by_property',query=>query.eq('propertyId',property._id)).unique();
  if(row)await ctx.db.delete(row._id);
  await ctx.db.patch(property._id,{managerId:null});return {status:'removed' as const};
 },
});
