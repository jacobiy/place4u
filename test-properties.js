import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfajxzjrzmckroitcqxz.supabase.co';
const supabaseKey = 'sb_publishable_mGvaE8MgMQ6PcfPtmSS2Zw_mInWWc_s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testProperties() {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching properties:", error);
  } else {
    console.log("Data length:", data.length);
    if (data.length > 0) {
      console.log("Columns:", Object.keys(data[0]));
    }
  }
}
testProperties();
