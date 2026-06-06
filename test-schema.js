import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfajxzjrzmckroitcqxz.supabase.co';
const supabaseKey = 'sb_publishable_mGvaE8MgMQ6PcfPtmSS2Zw_mInWWc_s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSchema() {
  // Fetch a single row to see what keys exist, or if empty, fetch nothing.
  // Actually, we can just insert with user_id, full_name, email which are standard.
  const { data, error } = await supabase
    .from('tenant_profiles')
    .select('*')
    .limit(1);
    
  console.log("Data schema (if any rows exist):", data);
  
  // Try inserting without the extra columns
  const dummyUUID = "00000000-0000-0000-0000-000000000000";
  const { data: d2, error: e2 } = await supabase
    .from('tenant_profiles')
    .insert([{
      user_id: dummyUUID,
      full_name: "Test User",
      email: "test@example.com"
    }])
    .select()
    .single();
    
  if (e2) {
    console.error("Second insert failed:", e2);
  } else {
    console.log("Second insert success! Columns returned:", Object.keys(d2));
    // Clean up
    await supabase.from('tenant_profiles').delete().eq('user_id', dummyUUID);
  }
}

fetchSchema();
