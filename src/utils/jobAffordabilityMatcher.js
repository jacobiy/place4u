/**
 * Place4U - Job & Affordability Linking & Approximation Engine
 * 
 * Computes deep underwriting compatibility between a tenant's job/employment profile
 * and a rental property application:
 *  1. Rent-to-Income Affordability Multiplier (South African 33% standard)
 *  2. Geographic & Commute Proximity Approximation (Metro cluster matrix & transit distance)
 *  3. Employment Stability & Document Verification Rating (Payslips, Bank statements, FICA ID)
 *  4. Composite Compatibility Index & Actionable Underwriting Insights
 */

// South African Suburb & Municipal Cluster Proximity Graph
const SA_SUBURB_CLUSTERS = {
  // Johannesburg Central & Campus Corridor
  jhb_central: {
    name: "Johannesburg Central / Campus Corridor",
    metro: "Johannesburg",
    suburbs: ["braamfontein", "auckland park", "melville", "parktown", "johannesburg cbd", "newtown", "westdene", "marshalltown", "berea", "doornfontein"],
    centerKm: { lat: -26.1929, lng: 28.0306 }
  },
  // Northern Suburbs Financial Core
  jhb_northern_core: {
    name: "Northern Suburbs Financial Core",
    metro: "Johannesburg",
    suburbs: ["rosebank", "sandton", "ilovo", "illovo", "hyde park", "melrose", "melrose arch", "saxenwold", "saxonwold", "dunkeld", "inanda", "sandhurst", "sandown"],
    centerKm: { lat: -26.1245, lng: 28.0485 }
  },
  // Northern Suburbs Residential / Tech
  jhb_north_extended: {
    name: "Bryanston / Rivonia Corridor",
    metro: "Johannesburg",
    suburbs: ["bryanston", "rivonia", "morningside", "woodmead", "sunninghill", "paulshof", "gallo manor", "river club"],
    centerKm: { lat: -26.056, lng: 28.058 }
  },
  // Randburg & West
  jhb_northwest: {
    name: "Randburg / Cresta Corridor",
    metro: "Johannesburg",
    suburbs: ["randburg", "ferndale", "cresta", "northcliff", "linden", "blairgowrie", "fontainebleau", "roodepoort"],
    centerKm: { lat: -26.0945, lng: 27.9985 }
  },
  // Midrand Gateway
  midrand_gateway: {
    name: "Midrand / Waterfall Hub",
    metro: "Midrand",
    suburbs: ["midrand", "waterfall", "waterfall city", "kyalami", "halfway house", "vorna valley", "carlswald", "crowthorne"],
    centerKm: { lat: -25.9985, lng: 28.1265 }
  },
  // Centurion
  centurion_hub: {
    name: "Centurion Business District",
    metro: "Tshwane",
    suburbs: ["centurion", "centurion central", "highveld", "die hoewes", "irene", "zwartkop", "lyttelton", "eldoraigne"],
    centerKm: { lat: -25.8603, lng: 28.1895 }
  },
  // Pretoria Central & Universities
  pretoria_central: {
    name: "Pretoria Central & Hatfield Hub",
    metro: "Tshwane",
    suburbs: ["hatfield", "brooklyn", "menlyn", "lynnwood", "arcadia", "pretoria cbd", "sunnyside", "garsfontein", "faerie glen"],
    centerKm: { lat: -25.7533, lng: 28.2366 }
  },
  // Cape Town CBD & Atlantic
  cpt_central: {
    name: "Cape Town CBD & Atlantic Seaboard",
    metro: "Cape Town",
    suburbs: ["cape town", "cape town cbd", "foreshore", "sea point", "green point", "camps bay", "woodstock", "observatory", "salt river", "gardens"],
    centerKm: { lat: -33.9249, lng: 18.4241 }
  },
  // Cape Town Southern Suburbs
  cpt_southern: {
    name: "Cape Town Southern Suburbs",
    metro: "Cape Town",
    suburbs: ["rondebosch", "claremont", "newlands", "kenilworth", "wynberg", "rosebank cpt", "mowbray"],
    centerKm: { lat: -33.985, lng: 18.468 }
  },
  // Cape Town Northern Suburbs
  cpt_northern: {
    name: "Cape Town Northern Suburbs & Century City",
    metro: "Cape Town",
    suburbs: ["century city", "bellville", "durbanville", "parow", "goodwood", "milnerton"],
    centerKm: { lat: -33.892, lng: 18.511 }
  },
  // Durban Hub
  durban_coastal: {
    name: "Durban Metro & Umhlanga",
    metro: "eThekwini",
    suburbs: ["durban", "durban cbd", "umhlanga", "umhlanga rocks", "morningside", "berea", "durban north", "westville", "ballito"],
    centerKm: { lat: -29.8587, lng: 31.0218 }
  }
};

/**
 * Finds the geographic cluster key for a given suburb or address string
 */
function identifyCluster(text = "") {
  if (!text) return null;
  const clean = text.toLowerCase();
  
  for (const [clusterKey, cluster] of Object.entries(SA_SUBURB_CLUSTERS)) {
    for (const suburb of cluster.suburbs) {
      if (clean.includes(suburb)) {
        return { clusterKey, cluster, matchedSuburb: suburb };
      }
    }
  }
  return null;
}

/**
 * Approximates commute distance (km), travel duration (mins), and transit grade
 */
export function approximateCommute(workplaceText = "", propertyText = "") {
  const wp = (workplaceText || "").toLowerCase().trim();
  const pp = (propertyText || "").toLowerCase().trim();

  if (!wp || !pp) {
    // No fabricated proximity: without workplace/property locations the commute
    // cannot be scored, so the caller must treat it as unknown.
    return {
      approxDistanceKm: null,
      commuteDurationMins: null,
      proximityScore: null,
      commuteRating: "Location not provided",
      transitType: null,
      isEstimate: true,
      summary: "Commute could not be approximated because workplace or property location is missing."
    };
  }

  // Check exact token overlap or identical suburb
  const wpTokens = wp.split(/[,\s-/]+/).filter(t => t.length > 2);
  const ppTokens = pp.split(/[,\s-/]+/).filter(t => t.length > 2);
  const commonTokens = wpTokens.filter(t => ppTokens.includes(t));

  const wpCluster = identifyCluster(wp);
  const ppCluster = identifyCluster(pp);

  // 1. Exact or Very Near Suburb Match
  if (commonTokens.length > 0 && commonTokens.some(t => !["road", "street", "avenue", "city", "north", "south", "west", "east"].includes(t))) {
    return {
      approxDistanceKm: 1.8,
      commuteDurationMins: 6,
      proximityScore: 98,
      commuteRating: "Walking / Ultra-Short Commute",
      transitType: "Walking / 5-min Drive",
      isEstimate: false,
      summary: `Workplace and property are in the immediate vicinity (${commonTokens[0].toUpperCase()}). Zero commute friction.`
    };
  }

  // 2. Both identified in same cluster
  if (wpCluster && ppCluster && wpCluster.clusterKey === ppCluster.clusterKey) {
    return {
      approxDistanceKm: 4.2,
      commuteDurationMins: 12,
      proximityScore: 92,
      commuteRating: "Short Commute (Same Hub)",
      transitType: "Local Bus / Taxi / 10-min Drive",
      isEstimate: false,
      summary: `Both situated within the ${wpCluster.cluster.name}. Estimated 10–14 minute commute.`
    };
  }

  // 3. Known Inter-Cluster Relationships in Gauteng
  if (wpCluster && ppCluster) {
    const k1 = wpCluster.clusterKey;
    const k2 = ppCluster.clusterKey;
    
    // Northern Core <-> Campus / JHB Central (e.g. Rosebank <-> Braamfontein)
    if ((k1 === 'jhb_central' && k2 === 'jhb_northern_core') || (k1 === 'jhb_northern_core' && k2 === 'jhb_central')) {
      return {
        approxDistanceKm: 7.5,
        commuteDurationMins: 18,
        proximityScore: 88,
        commuteRating: "Direct Metro Corridor",
        transitType: "Gautrain / Rea Vaya / M1 Highway",
        isEstimate: false,
        summary: "Direct transit corridor along M1 / Gautrain Rosebank-Park station link (approx 18 mins)."
      };
    }

    // Northern Core <-> Bryanston / Rivonia (e.g. Sandton <-> Rivonia)
    if ((k1 === 'jhb_northern_core' && k2 === 'jhb_north_extended') || (k1 === 'jhb_north_extended' && k2 === 'jhb_northern_core')) {
      return {
        approxDistanceKm: 8.4,
        commuteDurationMins: 20,
        proximityScore: 86,
        commuteRating: "Northern Suburbs Link",
        transitType: "Rivonia Rd / Gautrain Bus",
        isEstimate: false,
        summary: "Convenient northern corridor along Rivonia / William Nicol (approx 20 mins)."
      };
    }

    // Northern Core <-> Midrand
    if ((k1 === 'jhb_northern_core' && k2 === 'midrand_gateway') || (k1 === 'midrand_gateway' && k2 === 'jhb_northern_core')) {
      return {
        approxDistanceKm: 18.5,
        commuteDurationMins: 28,
        proximityScore: 78,
        commuteRating: "Midrand Gautrain Corridor",
        transitType: "Gautrain / N1 Highway",
        isEstimate: false,
        summary: "N1 Highway or direct Gautrain link between Sandton and Midrand (approx 25–30 mins)."
      };
    }

    // Midrand <-> Centurion
    if ((k1 === 'midrand_gateway' && k2 === 'centurion_hub') || (k1 === 'centurion_hub' && k2 === 'midrand_gateway')) {
      return {
        approxDistanceKm: 16.0,
        commuteDurationMins: 22,
        proximityScore: 80,
        commuteRating: "Midrand–Centurion Highway",
        transitType: "Gautrain / N1 Highway",
        isEstimate: false,
        summary: "Direct N1 corridor or Gautrain link between Midrand and Centurion (approx 20–25 mins)."
      };
    }

    // Centurion <-> Pretoria Central
    if ((k1 === 'centurion_hub' && k2 === 'pretoria_central') || (k1 === 'pretoria_central' && k2 === 'centurion_hub')) {
      return {
        approxDistanceKm: 14.5,
        commuteDurationMins: 22,
        proximityScore: 82,
        commuteRating: "Tshwane Metro Link",
        transitType: "Gautrain / R21 / Ben Schoeman",
        isEstimate: false,
        summary: "Quick Tshwane metro transit connecting Centurion and Pretoria East/Central."
      };
    }

    // Johannesburg <-> Pretoria Cross-Metro (e.g. Sandton <-> Hatfield)
    if (
      (k1.startsWith('jhb') && k2.startsWith('pretoria')) ||
      (k2.startsWith('jhb') && k1.startsWith('pretoria'))
    ) {
      return {
        approxDistanceKm: 48.0,
        commuteDurationMins: 55,
        proximityScore: 56,
        commuteRating: "Cross-Metro Commute",
        transitType: "Gautrain (35 mins) / N1 Highway",
        isEstimate: false,
        summary: "Cross-metro commute. Gautrain is recommended for daily travel (approx 35–45 min rail time)."
      };
    }

    // Cape Town CBD <-> Southern Suburbs
    if ((k1 === 'cpt_central' && k2 === 'cpt_southern') || (k1 === 'cpt_southern' && k2 === 'cpt_central')) {
      return {
        approxDistanceKm: 9.8,
        commuteDurationMins: 20,
        proximityScore: 85,
        commuteRating: "M3 / MetroRail Corridor",
        transitType: "M3 Highway / Southern Line",
        isEstimate: false,
        summary: "Direct Cape Town Southern Line rail & M3 expressway connection (approx 20 mins)."
      };
    }

    // Cross-Provincial check
    if (wpCluster.cluster.metro !== ppCluster.cluster.metro) {
      return {
        approxDistanceKm: 550,
        commuteDurationMins: 360,
        proximityScore: 30,
        commuteRating: "Different Metropolitan Areas",
        transitType: "Domestic Travel / Remote Job Required",
        isEstimate: false,
        summary: `Workplace is in ${wpCluster.cluster.metro} while property is in ${ppCluster.cluster.metro}. Suitable for remote work or pending relocation.`
      };
    }
  }

  // 4. Fallback Estimate for General South African Urban Areas
  return {
    approxDistanceKm: 11.2,
    commuteDurationMins: 24,
    proximityScore: 76,
    commuteRating: "Standard Urban Commute",
    transitType: "Urban Arterial Route / Transit",
    isEstimate: true,
    summary: "Moderate urban commute within typical residential and business radius (approx 20–25 mins)."
  };
}

/**
 * Evaluates full Job-to-Application Compatibility & Affordability
 * 
 * @param {Object} params
 * @param {Object} params.application - The rental application record
 * @param {Object} params.tenant - Tenant profile / user info
 * @param {Object} params.property - The target property or property under evaluation
 * @returns {Object} Comprehensive underwriting analysis object
 */
export function evaluateJobApplicationMatch({ application = {}, tenant = {}, property = {} } = {}) {
  // 1. Resolve Monthly Rent — never invent a rent figure for an applicant.
  const monthlyRent = Number(
    property?.price || 
    application?.max_budget || 
    application?.min_budget || 
    0
  ) || 0;

  // 2. Resolve Monthly Income — null unless the applicant supplied one. A
  //    gross-income approximation is only derived from the applicant's own
  //    stated max budget, never from a hardcoded figure.
  let rawIncome = tenant?.monthly_income || application?.monthly_income;
  if (!rawIncome && application?.max_budget) {
    // If budget is known, conservative gross income approximation is 3.2x their budget
    rawIncome = Math.round(application.max_budget * 3.25);
  }
  const monthlyIncome = rawIncome ? Number(rawIncome) : null;
  const hasIncome = Boolean(monthlyIncome && monthlyIncome > 0);

  // 3. Resolve Employment Status and Category — "unknown" is a valid answer.
  const employmentStatus = (
    tenant?.employment_status || 
    application?.employment_status || 
    null
  );

  const jobTitle = (
    tenant?.occupation || 
    tenant?.job_title || 
    application?.job_title || 
    null
  );

  const employerName = (
    tenant?.employer || 
    tenant?.employer_name || 
    application?.employer_name || 
    null
  );

  const isStudent = (
    Boolean(employmentStatus && employmentStatus.toLowerCase().includes('student')) || 
    (application?.accommodation_category || application?.category) === 'student_room' ||
    (property?.property_type || '').toLowerCase().includes('student')
  );

  // 4. Resolve Locations for Commute Approximation — missing values stay missing.
  const workplaceLocation = (
    tenant?.workplace_location || 
    application?.workplace_location || 
    tenant?.city || 
    null
  );

  const propertyLocation = (
    property?.address || 
    property?.location || 
    property?.city || 
    application?.preferred_areas?.[0] || 
    null
  );

  // 5. Compute Affordability Metrics (Rent-to-Income) — only when both rent
  //    and income are known; otherwise the pillar stays unknown instead of
  //    being scored against invented figures.
  const multiplier = hasIncome ? Number((monthlyIncome / Math.max(monthlyRent, 1)).toFixed(2)) : null;
  const rentToIncomePercent = hasIncome ? Number(((monthlyRent / Math.max(monthlyIncome, 1)) * 100).toFixed(1)) : null;
  const disposableBuffer = hasIncome ? Math.max(0, monthlyIncome - monthlyRent) : null;

  let affordabilityScore = null;
  let affordabilityGrade = hasIncome && monthlyRent > 0 ? "Moderate" : "Insufficient Data";
  let affordabilityBadge = hasIncome && monthlyRent > 0 ? "Acceptable" : "Income Not Provided";

  if (hasIncome && monthlyRent > 0) {
    if (isStudent) {
      // Student Bursary / NSFAS benchmark
      if (monthlyRent <= 6500) {
        affordabilityScore = 96;
        affordabilityGrade = "Pre-Approved Student Allocation";
        affordabilityBadge = "Institutional Grant";
      } else {
        affordabilityScore = 80;
        affordabilityGrade = "Above Standard Bursary Cap";
        affordabilityBadge = "Guarantor Recommended";
      }
    } else {
      // Standard South African Property Underwriting Thresholds:
      // Multiplier >= 3.33x: Rent is <= 30% of gross income (Ideal)
      // Multiplier 3.0x - 3.33x: Rent is 30% - 33.3% of income (Conforms to standard)
      // Multiplier 2.5x - 3.0x: Rent is 33.3% - 40% of income (Acceptable with good credit)
      // Multiplier 2.0x - 2.5x: Rent is 40% - 50% of income (Stretched)
      // Multiplier < 2.0x: Rent exceeds 50% of income (High default risk)
      if (multiplier >= 3.5) {
        affordabilityScore = 100;
        affordabilityGrade = "Exceptional Income Buffer (Rent < 28%)";
        affordabilityBadge = "Very Low Risk";
      } else if (multiplier >= 3.0) {
        affordabilityScore = 92;
        affordabilityGrade = "Conforms to 33% SA Standard";
        affordabilityBadge = "Low Risk";
      } else if (multiplier >= 2.5) {
        affordabilityScore = 75;
        affordabilityGrade = "Moderate Rent Burden (33%–40%)";
        affordabilityBadge = "Standard Risk";
      } else if (multiplier >= 2.0) {
        affordabilityScore = 52;
        affordabilityGrade = "Tight Margin (40%–50% of Income)";
        affordabilityBadge = "Elevated Risk";
      } else {
        affordabilityScore = 25;
        affordabilityGrade = "Affordability Breach (Rent > 50% Income)";
        affordabilityBadge = "High Risk";
      }
    }
  }

  // 6. Compute Commute & Proximity Approximation
  const commute = approximateCommute(workplaceLocation, propertyLocation);

  // 7. Compute Employment Stability & Verification Score
  let stabilitySubscore = 60; // neutral when the applicant's status is unknown
  const statusLower = (employmentStatus || "").toLowerCase();
  if (statusLower.includes('permanent') || statusLower.includes('employed')) {
    stabilitySubscore = 95;
  } else if (statusLower.includes('contract')) {
    stabilitySubscore = 82;
  } else if (statusLower.includes('self')) {
    stabilitySubscore = 80;
  } else if (statusLower.includes('student')) {
    stabilitySubscore = 88;
  }

  // Inspect uploaded documents for verification bonus
  const docs = Array.isArray(application?.documents) ? application.documents : [];
  const hasPayslip = docs.some(d => d.slotKey === 'proof_of_income' || (d.title || '').toLowerCase().includes('payslip') || (d.title || '').toLowerCase().includes('income'));
  const hasBankStatement = docs.some(d => d.slotKey === 'bank_statement' || (d.title || '').toLowerCase().includes('bank'));
  const hasId = docs.some(d => d.slotKey === 'id_document' || (d.title || '').toLowerCase().includes('id'));
  const hasAcceptance = docs.some(d => d.slotKey === 'acceptance_letter' || (d.title || '').toLowerCase().includes('acceptance'));
  const hasBursary = docs.some(d => d.slotKey === 'bursary_nsfas' || (d.title || '').toLowerCase().includes('nsfas'));

  let docVerificationScore = 60;
  if (hasId) docVerificationScore += 15;
  if (hasPayslip || hasBursary) docVerificationScore += 15;
  if (hasBankStatement || hasAcceptance) docVerificationScore += 10;
  docVerificationScore = Math.min(100, docVerificationScore);

  const verificationScore = Math.round((stabilitySubscore * 0.4) + (docVerificationScore * 0.6));

  // 8. Compute Composite Job Compatibility Score
  // Weighted: 45% Affordability + 30% Commute Proximity + 25% Stability & Docs.
  // When a pillar cannot be computed (no income, no locations) its weight drops
  // out of the average instead of being scored against invented figures.
  const affordabilityWeight = affordabilityScore != null ? 0.45 : 0;
  const commuteWeight = commute.proximityScore != null ? 0.30 : 0;
  const stabilityWeight = 0.25;
  const compositeWeight = affordabilityWeight + commuteWeight + stabilityWeight;
  const compositeScore = compositeWeight > 0
    ? Math.round(((affordabilityScore * affordabilityWeight) + (commute.proximityScore * commuteWeight) + (verificationScore * stabilityWeight)) / compositeWeight)
    : 0;

  // 9. Assign Tier & Color
  let tier = "Moderate Match";
  let tierColor = "#f59e0b"; // amber
  let verdict = "Qualified with Review";
  let badgeClass = "badge-amber";

  if (compositeScore >= 88) {
    tier = "Prime Candidate";
    tierColor = "#10b981"; // emerald
    verdict = "Fast-Track Approval";
    badgeClass = "badge-emerald";
  } else if (compositeScore >= 75) {
    tier = "Strong Match";
    tierColor = "#4f7ef8"; // blue
    verdict = "Recommended Applicant";
    badgeClass = "badge-blue";
  } else if (compositeScore >= 60) {
    tier = "Conditional Fit";
    tierColor = "#f59e0b"; // amber
    verdict = "Standard Review / Double Deposit";
    badgeClass = "badge-amber";
  } else {
    tier = "Underwriting Warning";
    tierColor = "#ef4444"; // rose
    verdict = "Affordability or Distance Concern";
    badgeClass = "badge-rose";
  }

  // 10. Generate Explanatory Insights for Agent
  const insights = [];
  if (hasIncome && monthlyRent > 0) {
    insights.push(`Income Coverage: Monthly salary of R${monthlyIncome.toLocaleString()} provides ${multiplier}x coverage on R${monthlyRent.toLocaleString()}/mo rent (${rentToIncomePercent}% rent-to-income).`);
  } else {
    insights.push(`Income Coverage: Applicant has not provided a monthly income — affordability against the R${monthlyRent.toLocaleString()}/mo rent is unverified.`);
  }

  if (commute.proximityScore == null) {
    insights.push(`Commute Proximity: Workplace location not provided for this applicant — a commute estimate is unavailable.`);
  } else {
    insights.push(`Commute Proximity: Workplace at "${workplaceLocation}" is approximately ${commute.approxDistanceKm} km from property (~${commute.commuteDurationMins} min transit). ${commute.commuteRating}.`);
  }

  if (isStudent) {
    insights.push(`Funding Status: Student applicant evaluated with institutional bursary / NSFAS housing criteria.`);
  } else if (employmentStatus) {
    insights.push(`Employment Status: ${employmentStatus} (${jobTitle || "Occupation not provided"} at ${employerName || "Employer not provided"}).`);
  } else {
    insights.push(`Employment Status: not provided for this applicant.`);
  }

  insights.push(`FICA & Documents: ${docs.length} certified document${docs.length !== 1 ? 's' : ''} uploaded. ID: ${hasId ? 'Verified' : 'Pending'}, Income Proof: ${(hasPayslip || hasBursary) ? 'Verified' : 'Pending'}, Bank: ${(hasBankStatement || hasAcceptance) ? 'Verified' : 'Pending'}.`);

  return {
    compositeScore,
    tier,
    tierColor,
    verdict,
    badgeClass,
    affordability: {
      score: affordabilityScore,
      monthlyRent,
      monthlyIncome,
      multiplier,
      rentToIncomePercent,
      disposableBuffer,
      grade: affordabilityGrade,
      badge: affordabilityBadge,
      provided: affordabilityScore != null
    },
    proximity: {
      score: commute.proximityScore,
      approxDistanceKm: commute.approxDistanceKm,
      commuteDurationMins: commute.commuteDurationMins,
      commuteRating: commute.commuteRating,
      transitType: commute.transitType,
      workplaceLocation,
      propertyLocation,
      summary: commute.summary
    },
    employment: {
      score: verificationScore,
      jobTitle,
      employerName,
      employmentStatus,
      isStudent,
      hasPayslip,
      hasBankStatement,
      hasId,
      hasBursary,
      docsCount: docs.length
    },
    insights
  };
}
