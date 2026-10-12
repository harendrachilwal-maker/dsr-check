import {convexAuth} from '@convex-dev/auth/server';
import {Password} from '@convex-dev/auth/providers/Password';
import {normalEmail} from './ownerAccess';

// Property membership supplies the role; existing password credentials and user IDs stay unchanged.
export const {auth,signIn,signOut,store,isAuthenticated}=convexAuth({
 providers:[Password({profile:(params:Record<string,unknown>)=>({email:normalEmail(params.email)})})],
});
