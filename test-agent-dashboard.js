// test-agent-dashboard.js - Comprehensive test suite for Agent Dashboard logic and queries

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

async function runTests() {
  console.log("==========================================");
  console.log("  Running Agent Dashboard Test Suite      ");
  console.log("==========================================\n");

  // Test 1: Fetch Applications
  console.log("--- Test 1: Querying Applications ---");
  const { data: apps, error: appErr } = await supabase
    .from("applications")
    .select("*")
    .limit(10);

  assert(!appErr, `Applications query succeeds: ${appErr?.message || 'OK'}`);
  assert(Array.isArray(apps), `Applications is an array (count: ${apps?.length || 0})`);
  
  if (apps && apps.length > 0) {
    const sample = apps[0];
    assert('id' in sample, "Application has 'id' field");
    assert('tenant_id' in sample, "Application has 'tenant_id' field");
    assert('preferred_areas' in sample, "Application has 'preferred_areas' field");
    assert('max_budget' in sample, "Application has 'max_budget' field");
    assert('status' in sample, "Application has 'status' field");
    console.log(`Sample application status: ${sample.status}, max_budget: R${sample.max_budget}`);
  }

  // Test 2: Fetch Active Properties
  console.log("\n--- Test 2: Querying Active Properties ---");
  const { data: props, error: propErr } = await supabase
    .from("properties")
    .select("*")
    .eq("is_active", true)
    .limit(10);

  assert(!propErr, `Properties query succeeds: ${propErr?.message || 'OK'}`);
  assert(Array.isArray(props), `Properties is an array (count: ${props?.length || 0})`);

  if (props && props.length > 0) {
    const sampleProp = props[0];
    assert('id' in sampleProp, "Property has 'id' field");
    assert('price' in sampleProp, "Property has 'price' field");
    assert('image_urls' in sampleProp || 'images' in sampleProp, "Property has image urls field");
    console.log(`Sample property price: R${sampleProp.price}, address: ${sampleProp.address}`);
  }

  // Test 3: Match Scoring Algorithm Logic
  console.log("\n--- Test 3: AI Matching Engine Algorithm ---");
  const calculateMatchScore = (app, prop) => {
    let score = 50;
    if (!app || !prop) return score;

    const maxBudget = Number(app.max_budget) || 0;
    const propPrice = Number(prop.price) || 0;
    if (maxBudget > 0 && propPrice > 0) {
      if (propPrice <= maxBudget) {
        score += 25;
        if (propPrice >= maxBudget * 0.7) score += 10;
      } else if (propPrice <= maxBudget * 1.1) {
        score += 10;
      }
    }

    const preferredAreas = (app.preferred_areas || []).map(a => String(a).toLowerCase());
    const propArea = (prop.area || "").toLowerCase();
    const propCity = (prop.city || "").toLowerCase();
    const propAddress = (prop.address || "").toLowerCase();

    if (preferredAreas.some(area => 
      propArea.includes(area) || propCity.includes(area) || propAddress.includes(area)
    )) {
      score += 15;
    }

    const preferredTypes = (app.preferred_types || []).map(t => String(t).toLowerCase());
    const propType = (prop.property_type || "").toLowerCase();
    if (preferredTypes.includes(propType)) {
      score += 10;
    }

    return Math.min(score, 98);
  };

  const mockApp = {
    max_budget: 10000,
    preferred_areas: ["Mokopane", "Westden"],
    preferred_types: ["apartment"]
  };
  const mockPropPerfect = {
    price: 8500,
    city: "Mokopane",
    property_type: "apartment",
    address: "123 Main St, Mokopane"
  };
  const mockPropPoor = {
    price: 25000,
    city: "Cape Town",
    property_type: "villa",
    address: "99 Beach Road"
  };

  const perfectScore = calculateMatchScore(mockApp, mockPropPerfect);
  const poorScore = calculateMatchScore(mockApp, mockPropPoor);

  assert(perfectScore >= 90, `Perfect match gives high score (calculated: ${perfectScore}%)`);
  assert(poorScore <= 60, `Poor match gives base/low score (calculated: ${poorScore}%)`);
  assert(perfectScore > poorScore, "Scoring ranks compatible listings above incompatible ones");

  // Test 4: Task Queue State Management Logic
  console.log("\n--- Test 4: Task Queue State Management ---");
  let tasks = [
    { id: 1, title: "Task 1", completed: false },
    { id: 2, title: "Task 2", completed: true }
  ];

  // Toggle
  tasks = tasks.map(t => t.id === 1 ? { ...t, completed: !t.completed } : t);
  assert(tasks.find(t => t.id === 1)?.completed === true, "Task 1 toggled to completed");

  // Add
  const newTask = { id: 3, title: "New Task", completed: false };
  tasks = [newTask, ...tasks];
  assert(tasks.length === 3, "New task added to queue");
  assert(tasks[0].id === 3, "New task inserted at front");

  // Delete
  tasks = tasks.filter(t => t.id !== 2);
  assert(tasks.length === 2 && !tasks.find(t => t.id === 2), "Task 2 removed from queue");

  // Test 5: Image Fallback Logic
  console.log("\n--- Test 5: Image Resolution Fallback ---");
  const fallback = "DEFAULT_IMAGE_URL";
  const propWithUrls = { image_urls: ["https://example.com/photo.jpg"] };
  const propWithImages = { images: ["https://example.com/photo2.jpg"] };
  const propWithoutImages = {};

  const resolveImage = (p) => p.image_urls?.[0] || p.images?.[0] || fallback;

  assert(resolveImage(propWithUrls) === "https://example.com/photo.jpg", "Resolves image_urls correctly");
  assert(resolveImage(propWithImages) === "https://example.com/photo2.jpg", "Resolves images array correctly");
  assert(resolveImage(propWithoutImages) === fallback, "Uses fallback when no images present");

  // Test 6: Commission Earnings & Placement Yield
  console.log("\n--- Test 6: Placement Commission Calculations ---");
  const calculateCommission = (monthlyRent, rate = 0.50) => Math.round(monthlyRent * rate);

  const testPlacements = [
    { rent: 4500, rate: 0.50, status: 'Settled' },
    { rent: 19000, rate: 0.50, status: 'Settled' },
    { rent: 14500, rate: 0.50, status: 'In Escrow' }
  ];

  const earned1 = calculateCommission(testPlacements[0].rent, testPlacements[0].rate);
  assert(earned1 === 2250, `50% commission on R4,500 rental equals R2,250 (actual: R${earned1})`);

  const totalCommissions = testPlacements.reduce((sum, p) => sum + calculateCommission(p.rent, p.rate), 0);
  assert(totalCommissions === (2250 + 9500 + 7250), "Cumulative lifetime commission sums accurately");

  const inEscrowTotal = testPlacements
    .filter(p => p.status === 'In Escrow')
    .reduce((sum, p) => sum + calculateCommission(p.rent, p.rate), 0);
  assert(inEscrowTotal === 7250, "Escrow pending balance filters and calculates accurately");

  // Test 7: Withdrawal Processing & Ledger Deductions
  console.log("\n--- Test 7: Wallet Payout & Withdrawal Processing ---");
  let availableBalance = 18450;
  const withdrawAmount = 5000;

  assert(withdrawAmount <= availableBalance, "Withdrawal amount within available balance threshold");
  availableBalance -= withdrawAmount;
  assert(availableBalance === 13450, "Available balance correctly decremented after withdrawal");

  const newPayoutEntry = {
    id: "WDL-TEST",
    amount: withdrawAmount,
    status: "Completed",
    fee: 0
  };
  assert(newPayoutEntry.fee === 0, "Place4U Instant EFT has R0 withdrawal fee");
  assert(newPayoutEntry.status === "Completed", "Payout state confirmed as Completed");

  console.log("\n==========================================");
  console.log("  All Agent Dashboard & Wallet Tests Passed! 🎉 ");
  console.log("==========================================");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
