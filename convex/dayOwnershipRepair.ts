import {v} from 'convex/values';
import {internalMutation} from './_generated/server';
import {validDate} from '../src/daily';

// Manually invoked maintenance only: no HTTP route or automatic adoption.
// A browser-only report needs the owner's explicit approval before this is run.
export const attachBrowserDay=internalMutation({
 args:{dayId:v.id('confirmedDays'),versionId:v.id('confirmedVersions'),propertyId:v.id('properties'),expectedOwnerId:v.id('users'),expectedPropertyName:v.string(),expectedDate:v.string(),expectedSourceScope:v.string(),expectedConfirmedAt:v.number()},
 returns:v.object({status:v.union(v.literal('attached'),v.literal('already attached')),date:v.string(),propertyId:v.id('properties'),dayId:v.id('confirmedDays'),versionId:v.id('confirmedVersions'),versionsMoved:v.number()}),
 handler:async(ctx,args)=>{
  if(process.env.CONVEX_CLOUD_URL!=='https://resilient-hamster-178.convex.cloud'||await ctx.auth.getUserIdentity())throw new Error('This repair is restricted to the development administrator.');
  if(!validDate(args.expectedDate)||!/^[a-f0-9]{64}$/.test(args.expectedSourceScope))throw new Error('The expected browser record is not valid.');
  const property=await ctx.db.get(args.propertyId),day=await ctx.db.get(args.dayId),version=await ctx.db.get(args.versionId);
  if(!property||property.ownerId!==args.expectedOwnerId||property.name!==args.expectedPropertyName||property.dataScope!==`manager:${property.ownerId}`||!await ctx.db.get(property.ownerId))throw new Error('The target property changed.');
  if(!day||!version||day.date!==args.expectedDate||version.date!==args.expectedDate||version.snapshot.date!==args.expectedDate||day.version!==version._id||day.confirmedAt!==args.expectedConfirmedAt||version.confirmedAt!==args.expectedConfirmedAt||version.previousVersion!==null)throw new Error('The approved day or version changed.');
  const target=await ctx.db.query('confirmedDays').withIndex('by_scope_date',q=>q.eq('scope',property.dataScope).eq('date',args.expectedDate)).unique();
  const result={date:day.date,propertyId:property._id,dayId:day._id,versionId:version._id};
  if(day.scope===property.dataScope&&version.scope===property.dataScope&&target?._id===day._id)return {...result,status:'already attached' as const,versionsMoved:0};
  if(day.scope!==args.expectedSourceScope||version.scope!==args.expectedSourceScope)throw new Error('The source ownership changed.');
  if(await ctx.db.query('properties').withIndex('by_scope',q=>q.eq('dataScope',args.expectedSourceScope)).unique())throw new Error('The source already belongs to a property.');
  if(target)throw new Error('The target property already has this date. Nothing was replaced.');
  const source=await ctx.db.query('confirmedDays').withIndex('by_scope_date',q=>q.eq('scope',args.expectedSourceScope).eq('date',args.expectedDate)).unique();
  const versions=await ctx.db.query('confirmedVersions').withIndex('by_scope_date',q=>q.eq('scope',args.expectedSourceScope).eq('date',args.expectedDate)).take(2);
  if(source?._id!==day._id||versions.length!==1||versions[0]._id!==version._id)throw new Error('The approved single-version record changed.');
  // Keep IDs, every financial field, original AI text, and timestamps unchanged.
  await ctx.db.patch(version._id,{scope:property.dataScope});
  await ctx.db.patch(day._id,{scope:property.dataScope});
  return {...result,status:'attached' as const,versionsMoved:1};
 },
});
