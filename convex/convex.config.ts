import { defineApp } from 'convex/server';
import staticHosting from '@convex-dev/static-hosting/convex.config';

// Keep /extract, /compare and /records at their existing addresses.
const app = defineApp();
app.use(staticHosting);
export default app;
