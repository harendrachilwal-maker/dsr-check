import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
export const save = internalMutation({
  args: { date: v.string(), batch: v.string(), records: v.array(v.object({ kind: v.union(v.literal('Guest bill'), v.literal('Food bill'), v.literal('Expense bill'), v.literal('UPI payment record')), storageId: v.id('_storage'), filename: v.string() })) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const record of args.records) await ctx.db.insert('supportingRecords', { date: args.date, batch: args.batch, ...record });
    return null;
  },
});
export const reserve = internalMutation({
  args: {}, returns: v.boolean(),
  handler: async ctx => {
    const now = Date.now();
    const row = await ctx.db.query('aiLimits').withIndex('by_name', q => q.eq('name', 'records')).unique();
    const calls = (row?.calls ?? []).filter(time => time > now - 3600000);
    if (calls.length >= 25) return false;
    calls.push(now);
    if (row) await ctx.db.patch(row._id, { calls });
    else await ctx.db.insert('aiLimits', { name: 'records', calls });
    return true;
  },
});
