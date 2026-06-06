import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfajxzjrzmckroitcqxz.supabase.co';
const supabaseKey = 'sb_publishable_mGvaE8MgMQ6PcfPtmSS2Zw_mInWWc_s'; // using anon key from other scripts
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Data length:", data.length);
    if (data.length > 0) {
      console.log("Columns:", Object.keys(data[0]));
    }
  }
}
testUsers();
