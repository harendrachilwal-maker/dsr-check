import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { daySnapshot, savedDay, historyResult, dayReference } from './dayValidators';
import { salesMoneyCheck } from './salesMoneyCheck';
import {requireProperty,requireManager} from './propertyAccess';
import {prepareDay,applyCorrections,type Correction} from '../src/confirmed-day';

export const confirm=internalMutation({
  args:{scope:v.string(),snapshot:daySnapshot,expectedVersion:v.union(v.id('confirmedVersions'),v.null())},
  returns:v.object({status:v.union(v.literal('saved'),v.literal('exists')),version:v.id('confirmedVersions'),confirmedAt:v.optional(v.number())}),
  handler:async(ctx,{scope,snapshot,expectedVersion})=>{
    await requireManager(ctx,scope);
    const day=await ctx.db.query('confirmedDays').withIndex('by_scope_date',q=>q.eq('scope',scope).eq('date',snapshot.date)).unique();
    if(day&&expectedVersion!==day.version)return {status:'exists' as const,version:day.version};
    if(!day&&expectedVersion!==null)throw new Error('The saved day changed. Refresh History and try again.');
    const confirmedAt=Date.now();
    const version=await ctx.db.insert('confirmedVersions',{scope,date:snapshot.date,confirmedAt,previousVersion:day?.version??null,snapshot});
    if(day)await ctx.db.patch(day._id,{version,confirmedAt});
    else await ctx.db.insert('confirmedDays',{scope,date:snapshot.date,version,confirmedAt});
    return {status:'saved' as const,version,confirmedAt};
  },
});
export const history=internalQuery({
  args:{scope:v.string(),paginationOpts:paginationOptsValidator},returns:historyResult,
  handler:async(ctx,{scope,paginationOpts})=>{
    await requireProperty(ctx,scope);
    const result=await ctx.db.query('confirmedDays').withIndex('by_scope_date',q=>q.eq('scope',scope)).order('desc').paginate(paginationOpts);
    return {days:result.page.map(day=>({date:day.date,confirmedAt:day.confirmedAt,version:day.version})),cursor:result.isDone?null:result.continueCursor};
  },
});
export const latest=internalQuery({
  args:{scope:v.string()},returns:v.union(dayReference,v.null()),
  handler:async(ctx,{scope})=>{
    await requireProperty(ctx,scope);
    const day=await ctx.db.query('confirmedDays').withIndex('by_scope_confirmedAt',q=>q.eq('scope',scope)).order('desc').first();
    return day?{date:day.date,confirmedAt:day.confirmedAt,version:day.version}:null;
  },
});
export const detail=internalQuery({
  args:{scope:v.string(),date:v.string()},returns:v.union(savedDay,v.null()),
  handler:async(ctx,{scope,date})=>{
    await requireProperty(ctx,scope);
    const day=await ctx.db.query('confirmedDays').withIndex('by_scope_date',q=>q.eq('scope',scope).eq('date',date)).unique();
    if(!day)return null;
    const version=await ctx.db.get(day.version);
    if(!version||version.scope!==scope||version.date!==date||version.snapshot.date!==date)return null;
    return {...version.snapshot,confirmedAt:version.confirmedAt,version:version._id,salesMoneyCheck:salesMoneyCheck(version.snapshot),...(version.editedBy?{editedBy:version.editedBy,editedAt:version.editedAt}: {})};
  },
});
const correction=v.object({id:v.string(),label:v.optional(v.string()),amount:v.optional(v.union(v.number(),v.null()))});
export const edit=internalMutation({
 args:{scope:v.string(),date:v.string(),expectedVersion:v.id('confirmedVersions'),corrections:v.array(correction)},
 returns:v.object({status:v.union(v.literal('saved'),v.literal('exists')),version:v.id('confirmedVersions'),confirmedAt:v.optional(v.number()),editedAt:v.optional(v.number())}),
 handler:async(ctx,{scope,date,expectedVersion,corrections})=>{
  await requireProperty(ctx,scope,true);
  const day=await ctx.db.query('confirmedDays').withIndex('by_scope_date',query=>query.eq('scope',scope).eq('date',date)).unique();
  if(!day)throw new Error('No saved day found for this date.');
  if(day.version!==expectedVersion)return {status:'exists' as const,version:day.version};
  const prior=await ctx.db.get(day.version);
  if(!prior||prior.scope!==scope||prior.date!==date||prior.snapshot.date!==date)throw new Error('The saved day could not be read.');
  // Validate the new edits independently before merging, so duplicate line edits cannot silently win.
  applyCorrections(prior.snapshot.aiReading,corrections);
  const merged=new Map<string,Correction>();
  for(const line of prior.snapshot.lines){
   const correction:Correction={id:line.id};
   if(Object.hasOwn(line,'correctedValue'))correction.amount=line.correctedValue!;
   else if(!line.unclear&&line.aiUnclear)correction.amount=line.aiValue;
   if(line.label!==line.aiLabel&&typeof line.label==='string')correction.label=line.label;
   if(Object.keys(correction).length>1)merged.set(line.id,correction);
  }
  for(const correction of corrections)merged.set(correction.id,{...merged.get(correction.id),...correction});
  const snapshot=prepareDay(prior.snapshot.aiReading,[...merged.values()],prior.snapshot.choices,prior.snapshot.aiAnswerText);
  if(new TextEncoder().encode(JSON.stringify(snapshot)).length>750000)throw new Error('The reading is too large to save.');
  const editedAt=Date.now(),confirmedAt=prior.confirmedAt;
  const version=await ctx.db.insert('confirmedVersions',{scope,date,confirmedAt,previousVersion:prior._id,snapshot,editedBy:'owner',editedAt});
  await ctx.db.patch(day._id,{version});
  return {status:'saved' as const,version,confirmedAt,editedAt};
 },
});
