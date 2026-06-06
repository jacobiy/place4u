import { supabase } from '../../utils/Supabase';

export const testDB = async () => {
  console.log("Testing basic select * from properties...");
  const { data: data1, error: err1 } = await supabase.from('properties').select('*');
  console.log("Basic select:", data1, err1);

  console.log("Testing join select...");
  const { data: data2, error: err2 } = await supabase.from('properties').select(`*, landlord:landlord_profiles(id, full_name, email)`);
  console.log("Join select:", data2, err2);
};
