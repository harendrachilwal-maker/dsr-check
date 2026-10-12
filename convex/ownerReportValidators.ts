import {v} from 'convex/values';

const amount=v.union(v.number(),v.null());
export const ownerValues=v.object({room:amount,food:amount,cash:amount,upi:amount,expenses:amount});
const salesMoneyCheck=v.object({status:v.union(v.literal('Matched'),v.literal('Difference'),v.literal('Not enough information')),sales:amount,money:amount,difference:amount});
export const ownerReceipt=v.object({date:v.string(),version:v.id('confirmedVersions'),confirmedAt:v.number(),values:ownerValues,salesMoneyCheck,needsChecking:v.array(v.string()),editedBy:v.optional(v.literal('owner')),editedAt:v.optional(v.number())});
export const ownerMonth=v.object({month:v.string(),confirmedDays:v.number(),totals:ownerValues,counts:v.object({matches:v.number(),check:v.number(),incomplete:v.number(),missingAmounts:v.number()}),days:v.array(ownerReceipt)});
export const ownerDayReference=v.object({date:v.string(),version:v.id('confirmedVersions'),confirmedAt:v.number()});
