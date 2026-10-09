import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({profile(params) {
    const email=String(params.email??'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Enter a valid email address.');
    return {email};
  }})],
});
