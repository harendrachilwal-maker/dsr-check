import { spawnSync } from 'node:child_process';

// The hosting CLI supplies the target deployment, overriding local dev settings.
const cloud = new URL(process.env.VITE_CONVEX_URL ?? '');
if (cloud.protocol !== 'https:' || !cloud.hostname.endsWith('.convex.cloud')) {
  throw new Error('Run this build through the Convex Static Hosting CLI.');
}
const site = `https://${cloud.hostname.replace(/\.convex\.cloud$/, '.convex.site')}`;
console.log(`   VITE_CONVEX_SITE_URL=${site}`);
const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_CONVEX_SITE_URL: site },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
