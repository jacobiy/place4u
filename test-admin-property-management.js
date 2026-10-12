// test-admin-property-management.js - Test suite for Admin Property Management CRUD & Sourcing

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfajxzjrzmckroitcqxz.supabase.co';
const supabaseKey = 'sb_publishable_mGvaE8MgMQ6PcfPtmSS2Zw_mInWWc_s';
const supabase = createClient(supabaseUrl, supabaseKey);

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runAdminPropertyTests() {
  console.log("==================================================");
  console.log("  Running Admin Property Management Test Suite    ");
  console.log("==================================================\n");

  // Test 1: Fetch properties list
  console.log("--- Test 1: Fetch Admin Properties ---");
  const { data: props, error: pErr } = await supabase
    .from('properties')
    .select('*, landlord:users!properties_landlord_id_fkey(*)')
    .order('created_at', { ascending: false });

  assert(!pErr, `Query properties succeeds: ${pErr?.message || 'OK'}`);
  assert(Array.isArray(props), `Returns properties array (count: ${props?.length || 0})`);

  // Test 2: Create a Scraped / Sourced Property without landlord_id
  console.log("\n--- Test 2: Admin Add Scraped Property (No landlord_id) ---");
  const testScrapedProp = {
    address: "99 Test Scraped Boulevard (Unit 4)",
    area: "Rosebank",
    city: "Johannesburg",
    province: "Gauteng",
    property_type: "apartment",
    price: 12500,
    bedrooms: 2,
    bathrooms: 1,
    furnished: true,
    pet_friendly: false,
    available_from: "2026-11-01",
    is_active: true,
    image_urls: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"
    ],
    landlord_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: createdProp, error: cErr } = await supabase
    .from('properties')
    .insert([testScrapedProp])
    .select('*, landlord:users!properties_landlord_id_fkey(*)')
    .single();

  assert(!cErr, `Admin can create property without landlord_id: ${cErr?.message || 'OK'}`);
  assert(createdProp?.id, `Created property has valid UUID: ${createdProp?.id}`);
  assert(createdProp?.landlord_id === null, "Created property correctly identified as Place4U Sourced (landlord_id is null)");
  assert(createdProp?.price === 12500, "Price stored accurately as R12,500");
  assert(createdProp?.image_urls?.length === 2, "Scraped image URLs stored as array");

  // Test 3: Update Property (Price & Status)
  console.log("\n--- Test 3: Admin Update Property Listing ---");
  const { data: updatedProp, error: uErr } = await supabase
    .from('properties')
    .update({
      price: 13000,
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', createdProp.id)
    .select()
    .single();

  assert(!uErr, `Update property succeeds: ${uErr?.message || 'OK'}`);
  assert(updatedProp?.price === 13000, "Property price updated to R13,000");
  assert(updatedProp?.is_active === false, "Property toggled to inactive");

  // Test 4: Delete the Test Property
  console.log("\n--- Test 4: Admin Delete Property Listing ---");
  const { error: dErr } = await supabase
    .from('properties')
    .delete()
    .eq('id', createdProp.id);

  assert(!dErr, `Delete property succeeds: ${dErr?.message || 'OK'}`);

  // Verify deletion
  const { data: checkDeleted } = await supabase
    .from('properties')
    .select('id')
    .eq('id', createdProp.id);
  assert(checkDeleted?.length === 0, "Test property permanently removed from registry");

  console.log("\n==================================================");
  console.log("  All Admin Property Management Tests Passed! 🎉  ");
  console.log("==================================================");
}

runAdminPropertyTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
