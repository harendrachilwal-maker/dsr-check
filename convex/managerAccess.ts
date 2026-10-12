import {getAuthUserId} from '@convex-dev/auth/server';
import type {ActionCtx} from './_generated/server';
import {internal} from './_generated/api';
export async function managerScope(ctx:Pick<ActionCtx,'auth'|'runQuery'>){
  const access=await ctx.runQuery(internal.propertyAccess.access,{});
  return access?.scope??null;
}
export async function managerAccessError(ctx:Pick<ActionCtx,'auth'>){
 return await getAuthUserId(ctx)?{error:'Create a property or accept the owner’s invitation to continue.',status:403}:{error:'Sign in to continue.',status:401};
}
export async function submissionScope(ctx:Pick<ActionCtx,'auth'|'runQuery'>){
 const access=await ctx.runQuery(internal.propertyAccess.access,{});
 return access?.role==='manager'?access.scope:null;
}
export async function submissionAccessError(ctx:Pick<ActionCtx,'auth'>){
 return await getAuthUserId(ctx)?{error:'Only the invited manager can upload and confirm a day.',status:403}:{error:'Sign in to continue.',status:401};
}
