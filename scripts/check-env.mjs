// Runs before the web build. The two values are inlined into the app at BUILD time,
// so a missing one would otherwise give a blank page that is hard to debug.
const need = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\nBuild stopped. Missing environment variable(s): ${missing.join(', ')}`);
  console.error('Add them in Vercel: Project > Settings > Environment Variables (Production AND Preview), then redeploy.\n');
  process.exit(1);
}
if (/sb_secret_|service_role/i.test(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
  console.error('\nBuild stopped. EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY looks like a SECRET key. Use the publishable key.\n');
  process.exit(1);
}
console.log('check-env: Supabase values present.');
