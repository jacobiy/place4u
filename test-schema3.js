import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfajxzjrzmckroitcqxz.supabase.co';
const supabaseKey = 'sb_publishable_mGvaE8MgMQ6PcfPtmSS2Zw_mInWWc_s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert3() {
  const dummyUUID = "00000000-0000-0000-0000-000000000000";
  const { data, error } = await supabase
    .from('tenant_profiles')
    .insert([{
      id: dummyUUID
    }])
    .select()
    .single();
    
  if (error) {
    console.error("Insert failed with just ID:", error);
  } else {
    console.log("Success! Columns:", Object.keys(data));
    await supabase.from('tenant_profiles').delete().eq('id', dummyUUID);
  }
}
testInsert3();
