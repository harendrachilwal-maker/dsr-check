import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
export const reserve = internalMutation({
  args: {}, returns: v.boolean(),
  handler: async (ctx) => {
    const now = Date.now();
    const row = await ctx.db.query('aiLimits').withIndex('by_name', q => q.eq('name', 'extraction')).unique();
    const calls = (row?.calls ?? []).filter(time => time > now - 3600000);
    if (calls.length >= 100) return false;
    calls.push(now);
    if (row) await ctx.db.patch(row._id, { calls });
    else await ctx.db.insert('aiLimits', { name: 'extraction', calls });
    return true;
  },
});
