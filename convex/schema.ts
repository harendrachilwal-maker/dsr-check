import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
export default defineSchema({
  aiLimits: defineTable({ name: v.string(), calls: v.array(v.number()) }).index('by_name', ['name']),
  supportingRecords: defineTable({ date: v.string(), kind: v.string(), storageId: v.id('_storage'), filename: v.string(), batch: v.string() }).index('by_batch', ['batch']),
});
