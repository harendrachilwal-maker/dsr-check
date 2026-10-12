import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
import { daySnapshot } from './dayValidators';
export default defineSchema({
  ...authTables,
  properties: defineTable({ownerId:v.id('users'),name:v.string(),dataScope:v.string(),managerId:v.union(v.id('users'),v.null()),createdAt:v.number()}).index('by_owner',['ownerId']).index('by_manager',['managerId']).index('by_scope',['dataScope']),
  propertyInvitations: defineTable({propertyId:v.id('properties'),email:v.string(),tokenHash:v.string(),expiresAt:v.number(),createdAt:v.number(),managerId:v.union(v.id('users'),v.null()),acceptedAt:v.union(v.number(),v.null())}).index('by_property',['propertyId']).index('by_token_hash',['tokenHash']),
  aiLimits: defineTable({ name: v.string(), calls: v.array(v.number()) }).index('by_name', ['name']),
  supportingRecords: defineTable({ scope:v.optional(v.string()),date: v.string(), kind: v.string(), storageId: v.id('_storage'), filename: v.string(), batch: v.string() }).index('by_batch', ['batch']),
  confirmedDays: defineTable({scope:v.string(),date:v.string(),version:v.id('confirmedVersions'),confirmedAt:v.number()}).index('by_scope_date',['scope','date']).index('by_scope_confirmedAt',['scope','confirmedAt']),
  confirmedVersions: defineTable({scope:v.string(),date:v.string(),confirmedAt:v.number(),previousVersion:v.union(v.id('confirmedVersions'),v.null()),snapshot:daySnapshot,editedBy:v.optional(v.literal('owner')),editedAt:v.optional(v.number())}).index('by_scope_date',['scope','date']),
});
