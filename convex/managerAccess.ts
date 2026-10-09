import { getAuthUserId } from '@convex-dev/auth/server';
import type { ActionCtx } from './_generated/server';
export async function managerScope(ctx:Pick<ActionCtx,'auth'>){
  const userId=await getAuthUserId(ctx);
  return userId?`manager:${userId}`:null;
}
