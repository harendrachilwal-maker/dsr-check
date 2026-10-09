import { managerScope } from './managerAccess';
import type { HttpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { comparisonReadingFromRaw, type Choice } from '../src/comparison';
import { prepareDay, type Correction } from '../src/confirmed-day';
import { validDate } from '../src/daily';

const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
async function readBody(request:Request){
  const reader=request.body?.getReader();if(!reader)throw new Error('Missing confirmation.');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>1024*1024){await reader.cancel();throw new Error('The reading is too large to save.');}chunks.push(item.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
const confirm=httpAction(async(ctx,request)=>{
  const scope=await managerScope(ctx);if(!scope)return reply({error:'Sign in to continue.'},401);
  try{
    const body=await readBody(request);
    const keys=['raw','date','sources','dsrSources','choices','corrections','expectedVersion'];
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==keys.length||keys.some(key=>!Object.hasOwn(body,key))||!validDate(body.date)||!Array.isArray(body.sources)||!body.sources.length||body.sources.length>6||body.sources.some((source:number,index:number)=>source!==index+1)||!Array.isArray(body.dsrSources)||!body.dsrSources.length||new Set(body.dsrSources).size!==body.dsrSources.length||body.dsrSources.some((source:number)=>!body.sources.includes(source))||(body.expectedVersion!==null&&typeof body.expectedVersion!=='string'))throw new Error('Invalid confirmation.');
    const reading=comparisonReadingFromRaw(body.raw,body.date,body.sources,body.dsrSources);
    // Retain only the exact validated answer text, never uploaded images or request bodies.
    const aiAnswerText=body.raw.output.filter((item:{type:string})=>item.type==='message').flatMap((item:{content:{type:string;text:string}[]})=>item.content.filter(part=>part.type==='output_text').map(part=>part.text)).join('');
    const snapshot=prepareDay(reading,body.corrections as Correction[],body.choices as Choice[],aiAnswerText);
    if(new TextEncoder().encode(JSON.stringify(snapshot)).length>750000)throw new Error('The reading is too large to save.');
    const result=await ctx.runMutation(internal.days.confirm,{scope,snapshot,expectedVersion:body.expectedVersion as Id<'confirmedVersions'>|null});
    return reply(result,result.status==='exists'?409:200);
  }catch{return reply({error:'Your day could not be confirmed. Check its document date and corrections, then try again.'},400);}
});
const history=httpAction(async(ctx,request)=>{
  const scope=await managerScope(ctx);if(!scope)return reply({error:'Sign in to continue.'},401);
  try{
    const cursor=new URL(request.url).searchParams.get('cursor');
    return reply(await ctx.runQuery(internal.days.history,{scope,paginationOpts:{numItems:20,cursor}}));
  }catch{return reply({error:'History could not be loaded. Try again.'},400);}
});
const detail=httpAction(async(ctx,request)=>{
  const scope=await managerScope(ctx);if(!scope)return reply({error:'Sign in to continue.'},401);
  const date=new URL(request.url).searchParams.get('date');if(!date||!validDate(date))return reply({error:'Choose a saved date.'},400);
  const day=await ctx.runQuery(internal.days.detail,{scope,date});
  return day?reply({day}):reply({error:'No saved day found for this date.'},404);
});
const latest=httpAction(async ctx=>{
  const scope=await managerScope(ctx);if(!scope)return reply({error:'Sign in to continue.'},401);
  try{return reply({day:await ctx.runQuery(internal.days.latest,{scope})});}
  catch{return reply({error:'Your last confirmed day could not be loaded. Try again.'},400);}
});
export function registerDayRoutes(http:HttpRouter){
  for(const [path,method,handler] of [['/days/confirm','POST',confirm],['/days/history','GET',history],['/days/detail','GET',detail],['/days/latest','GET',latest]] as const){
    http.route({path,method,handler});
    http.route({path,method:'OPTIONS',handler:httpAction(async()=>new Response(null,{status:204,headers}))});
  }
}
