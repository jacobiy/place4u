import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfajxzjrzmckroitcqxz.supabase.co';
const supabaseKey = 'sb_publishable_mGvaE8MgMQ6PcfPtmSS2Zw_mInWWc_s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Attempting to insert into tenant_profiles...");
  
  // Use a dummy UUID
  const dummyUUID = "00000000-0000-0000-0000-000000000000";

  const { data, error } = await supabase
    .from('tenant_profiles')
    .insert([{
      user_id: dummyUUID,
      full_name: "Test User",
      email: "test@example.com",
      phone: "",
      join_date: new Date().toISOString(),
      account_status: "active"
    }])
    .select()
    .single();

  if (error) {
    console.error("INSERT FAILED:");
    console.error(error);
  } else {
    console.log("INSERT SUCCESS:");
    console.log(data);
  }
}

testInsert();
