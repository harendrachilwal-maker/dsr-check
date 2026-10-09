import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
import { daySnapshot } from './dayValidators';
export default defineSchema({
  ...authTables,
  aiLimits: defineTable({ name: v.string(), calls: v.array(v.number()) }).index('by_name', ['name']),
  supportingRecords: defineTable({ date: v.string(), kind: v.string(), storageId: v.id('_storage'), filename: v.string(), batch: v.string() }).index('by_batch', ['batch']),
  confirmedDays: defineTable({scope:v.string(),date:v.string(),version:v.id('confirmedVersions'),confirmedAt:v.number()}).index('by_scope_date',['scope','date']),
  confirmedVersions: defineTable({scope:v.string(),date:v.string(),confirmedAt:v.number(),previousVersion:v.union(v.id('confirmedVersions'),v.null()),snapshot:daySnapshot}).index('by_scope_date',['scope','date']),
});
