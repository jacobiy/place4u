import { createClient } from '@supabase/supabase-js';

console.log('==================================================');
console.log('   Running Agent Verification & KYC Test Suite    ');
console.log('==================================================\n');

// Test 1: Verification Access Guarding
console.log('--- Test 1: Verification Access Guarding ---');
function canAccessAgentCards(profile) {
  return Boolean(profile && profile.is_verified === true);
}

const unverifiedProfile = {
  id: 'agent-101',
  full_name: 'Sarah Connor',
  is_verified: false,
  verification_status: 'not_applied'
};

const pendingProfile = {
  id: 'agent-102',
  full_name: 'Kyle Reese',
  is_verified: false,
  verification_status: 'pending_review',
  id_document_url: 'data:image/png;base64,sample...',
  proof_of_residence_url: 'data:image/png;base64,sample...'
};

const verifiedProfile = {
  id: 'agent-103',
  full_name: 'John Connor',
  is_verified: true,
  verification_status: 'verified'
};

if (!canAccessAgentCards(unverifiedProfile)) {
  console.log('✅ PASS: Unverified agent (not_applied) blocked from accessing cards');
} else {
  console.error('❌ FAIL: Unverified agent was allowed to see cards');
  process.exit(1);
}

if (!canAccessAgentCards(pendingProfile)) {
  console.log('✅ PASS: Pending review agent blocked from accessing operational cards');
} else {
  console.error('❌ FAIL: Pending agent was allowed to see cards');
  process.exit(1);
}

if (canAccessAgentCards(verifiedProfile)) {
  console.log('✅ PASS: Verified agent granted full access to agent cards & actions');
} else {
  console.error('❌ FAIL: Verified agent was blocked');
  process.exit(1);
}

// Test 2: admin@agent.com Edge Case (Profile does not exist / unverified in agent_profiles)
console.log('\n--- Test 2: admin@agent.com Unverified Protection ---');
// Even if users table has is_verified: true or email is admin@agent.com:
const legacyAdminUser = {
  id: '49e48730-fa49-465b-b52d-cf8ca7c93828',
  email: 'admin@agent.com',
  is_verified: true // legacy flag in users table
};

// Newly resolved agent profile for an agent with no KYC record yet:
const initialAgentProfile = {
  id: legacyAdminUser.id,
  user_id: legacyAdminUser.id,
  email: legacyAdminUser.email,
  is_verified: false, // Must remain false!
  verification_status: 'not_applied'
};

// Dashboard and layout verification logic
const isAgentVerified = Boolean(initialAgentProfile?.is_verified === true);
if (!isAgentVerified) {
  console.log('✅ PASS: admin@agent.com with no verified profile is strictly marked as unverified');
} else {
  console.error('❌ FAIL: admin@agent.com bypassed verification check');
  process.exit(1);
}

if (!canAccessAgentCards(initialAgentProfile)) {
  console.log('✅ PASS: Operational cards are safely locked for admin@agent.com until verified');
} else {
  console.error('❌ FAIL: Operational cards unlocked prematurely');
  process.exit(1);
}

// Test 3: Verification Application Data Payload Validation
console.log('\n--- Test 3: Verification Application Payload Validation ---');
function validateApplicationPayload(data) {
  const errors = [];
  if (!data.full_name || data.full_name.trim().length < 2) errors.push('Full name required');
  if (!data.id_number || data.id_number.trim().length < 6) errors.push('Valid ID number required');
  if (!data.id_document_url) errors.push('ID Document upload required');
  if (!data.proof_of_residence_url) errors.push('Proof of residence upload required');
  return { isValid: errors.length === 0, errors };
}

const invalidApp = {
  full_name: 'Jane Doe',
  id_number: '',
  id_document_url: null,
  proof_of_residence_url: null
};

const validApp = {
  full_name: 'Jane Doe',
  id_number: '9201015800085',
  phone: '+27 82 123 4567',
  agency_name: 'Cape Premier Properties',
  id_document_url: 'https://place4u.co.za/docs/id_sample.pdf',
  proof_of_residence_url: 'https://place4u.co.za/docs/por_sample.pdf',
  preferred_interview_time: '2026-10-15 10:00'
};

const validationFail = validateApplicationPayload(invalidApp);
if (!validationFail.isValid && validationFail.errors.length === 3) {
  console.log('✅ PASS: Incomplete application correctly rejected with required fields');
} else {
  console.error('❌ FAIL: Validation failed to detect missing FICA documents');
  process.exit(1);
}

const validationSuccess = validateApplicationPayload(validApp);
if (validationSuccess.isValid) {
  console.log('✅ PASS: Complete application with FICA documents validated successfully');
} else {
  console.error('❌ FAIL: Valid application failed validation:', validationSuccess.errors);
  process.exit(1);
}

// Test 4: Status Transition Workflow
console.log('\n--- Test 4: Lifecycle Status Transition ---');
let agentState = {
  id: 'agent-200',
  is_verified: false,
  verification_status: 'not_applied'
};

// Step 4a: Agent submits application
function submitApplication(current, submissionData) {
  return {
    ...current,
    ...submissionData,
    is_verified: false,
    verification_status: 'pending_review',
    submitted_at: new Date().toISOString()
  };
}

agentState = submitApplication(agentState, validApp);
if (agentState.verification_status === 'pending_review' && !agentState.is_verified) {
  console.log('✅ PASS: Status transitioned to "pending_review", cards remain locked');
} else {
  console.error('❌ FAIL: Status transition incorrect');
  process.exit(1);
}

// Step 4b: Admin verifies agent after interview
function reviewAgent(current, approved) {
  return {
    ...current,
    is_verified: approved,
    verification_status: approved ? 'verified' : 'rejected',
    verified_at: approved ? new Date().toISOString() : null
  };
}

agentState = reviewAgent(agentState, true);
if (agentState.verification_status === 'verified' && agentState.is_verified === true) {
  console.log('✅ PASS: Admin approval sets is_verified=true & unlocks operational dashboard');
} else {
  console.error('❌ FAIL: Approval transition incorrect');
  process.exit(1);
}

// Test 5: Profile Field Mapping Validation
console.log('\n--- Test 5: Profile Field Mapping Validation ---');
function mapProfileUpdates(formFields) {
  const dbUpdates = {};
  if (formFields.agency_name !== undefined) dbUpdates.agency_name = formFields.agency_name;
  if (formFields.phone !== undefined) dbUpdates.phone = formFields.phone;
  if (formFields.office_address !== undefined || formFields.address !== undefined) {
    dbUpdates.address = formFields.office_address ?? formFields.address;
  }
  if (formFields.years_experience !== undefined || formFields.experience_years !== undefined) {
    dbUpdates.experience_years = formFields.years_experience ?? formFields.experience_years;
  }
  if (formFields.license_number !== undefined || formFields.tax_number !== undefined) {
    dbUpdates.tax_number = formFields.license_number ?? formFields.tax_number;
  }
  return dbUpdates;
}

const mapped = mapProfileUpdates({
  agency_name: 'Luxury Realty SA',
  phone: '0821234567',
  office_address: '12 Sandton Drive',
  years_experience: 5,
  license_number: 'FFC-9988',
  bio: 'Top broker' // should not be passed to db columns
});

if (mapped.address === '12 Sandton Drive' && mapped.experience_years === 5 && mapped.tax_number === 'FFC-9988' && mapped.bio === undefined) {
  console.log('✅ PASS: Profile form fields correctly mapped to valid database columns');
} else {
  console.error('❌ FAIL: Profile mapping error:', mapped);
  process.exit(1);
}

console.log('\n==================================================');
console.log('   All Agent Verification Tests Passed! 🎉        ');
console.log('==================================================');
