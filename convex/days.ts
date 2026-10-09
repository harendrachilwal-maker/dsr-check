import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { daySnapshot, savedDay, historyResult, dayReference } from './dayValidators';

export const confirm=internalMutation({
  args:{scope:v.string(),snapshot:daySnapshot,expectedVersion:v.union(v.id('confirmedVersions'),v.null())},
  returns:v.object({status:v.union(v.literal('saved'),v.literal('exists')),version:v.id('confirmedVersions'),confirmedAt:v.optional(v.number())}),
  handler:async(ctx,{scope,snapshot,expectedVersion})=>{
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
    const result=await ctx.db.query('confirmedDays').withIndex('by_scope_date',q=>q.eq('scope',scope)).order('desc').paginate(paginationOpts);
    return {days:result.page.map(day=>({date:day.date,confirmedAt:day.confirmedAt,version:day.version})),cursor:result.isDone?null:result.continueCursor};
  },
});
export const latest=internalQuery({
  args:{scope:v.string()},returns:v.union(dayReference,v.null()),
  handler:async(ctx,{scope})=>{
    const day=await ctx.db.query('confirmedDays').withIndex('by_scope_confirmedAt',q=>q.eq('scope',scope)).order('desc').first();
    return day?{date:day.date,confirmedAt:day.confirmedAt,version:day.version}:null;
  },
});
export const detail=internalQuery({
  args:{scope:v.string(),date:v.string()},returns:v.union(savedDay,v.null()),
  handler:async(ctx,{scope,date})=>{
    const day=await ctx.db.query('confirmedDays').withIndex('by_scope_date',q=>q.eq('scope',scope).eq('date',date)).unique();
    if(!day)return null;
    const version=await ctx.db.get(day.version);
    return version?{...version.snapshot,confirmedAt:version.confirmedAt,version:version._id}:null;
  },
});
