# Business Requirements Document (BRD)
## Place4U – Relocation Assistance & Tenant Matching Platform

**Document Owner:** Jacob Molomo  
**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2024-XX-XX  

---

## 1. Project Introduction
Place4U is a relocation assistance and tenant–property matching platform designed to simplify the
process of finding accommodation, particularly for individuals relocating to new areas. Instead of
manually searching through multiple listings, users submit a single application detailing their
preferences, and Place4U assists by identifying and introducing the most suitable housing options.

The platform focuses on **efficiency**, **trust**, and **accessibility**, catering to both formal and
informal rental markets such as backrooms, rooms, and small rental units.

### 1.1 Scope
**In scope:**
- Web-based platform for tenant registration and application submission.
- Collection of user preferences and supporting documents.
- Matching tenants to suitable landlords or rental providers.
- Facilitating introductions between tenants and landlords.
- Providing application status tracking.

**Out of scope:**
- Lease negotiation.
- Rent or deposit handling.
- Legal representation of tenants or landlords.

### 1.2 Business Problem
Finding suitable accommodation is time-consuming and stressful, especially for individuals
relocating to new cities. Users often face unreliable listings, scams, lack of trusted intermediaries,
and repetitive application processes. Informal landlords struggle to reach verified tenants
consistently and efficiently.

### 1.3 Qualification Criteria
**Tenants must:**
- Be 18 years or older.
- Provide valid identification.
- Submit basic financial or employment information.
- Agree to the platform’s terms and conditions.

**Landlords must:**
- Provide valid contact details.
- Confirm property ownership or authority to rent.
- Agree to platform guidelines.

### 1.4 Assumptions
- Users are willing to pay a fixed application or assistance fee.
- Landlords prefer pre-screened tenant introductions.
- Internet access is available to users.
- The platform acts only as an assistance service, not a brokerage.

### 1.5 Business Rules
- All fees are non-refundable and charged for assistance services only.
- Place4U does not guarantee successful placement.
- No negotiations or financial transactions are handled by the platform.
- User data must be stored securely and confidentially.

---

## 2. Project Solution
Place4U provides a centralized digital solution where tenants submit one application and receive
curated housing matches. The system streamlines data collection, matching logic, and communication
between tenants and landlords.

### 2.1 Core Pages
- Landing Page
- User Registration and Login
- Tenant Application Form
- Dashboard (Application Status)
- Admin Management Panel
- Contact and Support Page

### 2.2 Data Flow Diagram (Narrative)
1. User registers and submits an application.
2. User data is validated and stored in the database.
3. Matching logic reviews preferences against landlord inventory.
4. Suitable matches are shared with landlords.
5. Status updates are reflected on the user dashboard.

### 2.3 Solution Architecture (High-Level)
- **Frontend web application** for user interactions.
- **Backend server** handling business logic and matching.
- **Database** for user, application, and match records.
- **External communication services** (email/WhatsApp notifications).

### 2.4 APIs
The system will expose secure APIs for:
- User authentication
- Application submission
- Match retrieval
- Status updates
- Admin operations

### 2.5 Database Schema (Logical)
The database is designed to store and manage:
- User profiles
- Applications
- Property listings (basic)
- Match records
- Activity logs

### 2.6 Non-Functional Requirements
- **Security:** Data encryption in transit and at rest.
- **Availability:** 99.5% uptime target for tenant-facing flows.
- **Performance:** Application submission completes within 3 seconds under normal load.
- **Compliance:** POPIA-aligned data handling and privacy policy disclosures.
- **Scalability:** Modular services to support growth in new regions.

---

## 3. Stakeholders
- **Tenants:** Individuals seeking relocation assistance.
- **Landlords:** Property owners or managers providing available units.
- **Operations Team:** Reviews applications, validates documents, and manages matches.
- **Admin Users:** Configure platform rules, pricing, and compliance settings.

---

## 4. Success Metrics
- Application completion rate ≥ 75%.
- Match introduction turnaround time ≤ 3 business days.
- Verified landlord adoption rate ≥ 60% of onboarded listings.
- Reduction in tenant search time compared to manual listing searches.

---

## 5. Compliance & Disclaimers
Place4U provides relocation assistance and tenant matching services only. The platform is **not an
estate agency** and does not act as a property practitioner. The service fee covers application
support, screening, and introductions only and does not guarantee successful placement.
