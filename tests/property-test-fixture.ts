import {convexTest} from 'convex-test';
import schema from '../convex/schema';
const modules=import.meta.glob('../convex/**/*.ts');
export const backend=()=>convexTest(schema,modules);
export async function propertyAccount(t:ReturnType<typeof backend>,email='owner@example.invalid'){
 const userId=await t.run(ctx=>ctx.db.insert('users',{email:`property-${email}`}));
 const account=t.withIdentity({subject:`${userId}|test-session`});
 const response=await account.fetch('/property/create',{method:'POST',body:JSON.stringify({name:'Sample Hill Resort'})});
 if(response.status!==200)throw new Error(`Test property setup failed: ${await response.text()}`);
 const invitation=await account.fetch('/property/invitation',{method:'POST',body:JSON.stringify({email})});
 if(invitation.status!==200)throw new Error(`Test invitation failed: ${await invitation.text()}`);
 const managerId=await t.run(ctx=>ctx.db.insert('users',{email})),manager=t.withIdentity({subject:`${managerId}|test-session`});
 const accepted=await manager.fetch('/property/accept',{method:'POST',body:JSON.stringify({token:(await invitation.json()).token})});
 if(accepted.status!==200)throw new Error(`Test manager setup failed: ${await accepted.text()}`);
 return manager;
}
