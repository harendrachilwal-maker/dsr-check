import type {HttpRouter} from 'convex/server';
import {httpAction} from './_generated/server';
import {internal} from './_generated/api';
import type {Id} from './_generated/dataModel';
import {aggregateOwnerMonth,validMonth} from './ownerReports';
import type {OwnerReceipt} from '../src/owner-data';
import {ownerAccess,propertyReply as reply,propertyHeaders as headers,readPropertyBody} from './propertyHttp';
import {validDate} from '../src/daily';

const month=httpAction(async(ctx,request)=>{
 const {denied,access}=await ownerAccess(ctx);if(denied)return denied;
 const scope=access!.scope,params=new URL(request.url).searchParams,selected=params.get('month');
 if(params.size!==1||!selected||!validMonth(selected))return reply({error:'Choose a valid month.'},400);
 try{
  const references=await ctx.runQuery(internal.ownerReports.monthRefs,{scope,month:selected}),receipts:OwnerReceipt[]=[];
  for(const ref of references){
   const receipt=await ctx.runQuery(internal.ownerReports.receipt,{scope,date:ref.date,expectedVersion:ref.version});
   if(!receipt||receipt.confirmedAt!==ref.confirmedAt)throw new Error('Your reports changed. Refresh this month.');
   receipts.push(receipt);
  }
  const current=await ctx.runQuery(internal.ownerReports.monthRefs,{scope,month:selected});
  const membership=await ctx.runQuery(internal.propertyAccess.access,{});
  if(!membership||membership.role!=='owner'||membership.propertyId!==access!.propertyId||membership.scope!==scope||JSON.stringify(current)!==JSON.stringify(references))throw new Error('Your reports changed. Refresh this month.');
  return reply({report:aggregateOwnerMonth(selected,receipts)});
 }catch{return reply({error:'The month could not be loaded completely. Refresh this month and try again.'},409);}
});
const edit=httpAction(async(ctx,request)=>{
 const {denied,access}=await ownerAccess(ctx);if(denied)return denied;
 try{
  const body=await readPropertyBody(request,['date','expectedVersion','corrections'],1024*1024);
  if(!validDate(body.date)||typeof body.expectedVersion!=='string'||!Array.isArray(body.corrections))throw new Error('Check this saved day and its corrections.');
  const result=await ctx.runMutation(internal.days.edit,{scope:access!.scope,date:body.date,expectedVersion:body.expectedVersion as Id<'confirmedVersions'>,corrections:body.corrections});
  return reply(result,result.status==='exists'?409:200);
 }catch{return reply({error:'Your changes could not be saved. Check the amounts and refresh this day before trying again.'},400);}
});
export function registerOwnerRoutes(http:HttpRouter){
 for(const [path,method,handler] of [['/owner/month','GET',month],['/owner/day/edit','POST',edit]] as const)http.route({path,method,handler});
 for(const path of ['/owner/month','/owner/day/edit'])http.route({path,method:'OPTIONS',handler:httpAction(async()=>new Response(null,{status:204,headers}))});
}
