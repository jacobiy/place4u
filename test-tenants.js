import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfajxzjrzmckroitcqxz.supabase.co';
const supabaseKey = 'sb_publishable_mGvaE8MgMQ6PcfPtmSS2Zw_mInWWc_s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing tenant_profiles...");
  let res1 = await supabase.from('tenant_profiles').select('*').limit(1);
  console.log("tenant_profiles error:", res1.error);

  console.log("Testing tenants...");
  let res2 = await supabase.from('tenants').select('*').limit(1);
  console.log("tenants error:", res2.error);
  
  if (res2.data) console.log("Tenants Data:", res2.data);
  if (res1.data) console.log("Tenant Profiles Data:", res1.data);
}

test();
