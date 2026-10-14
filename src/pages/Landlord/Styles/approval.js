/* Property approval lifecycle — shared metadata + display helpers. */
import { T } from "./designTokens";

export const APPROVAL_STATUSES = ["draft", "pending_approval", "approved", "rejected"];

const META = {
  draft: {
    key: "draft",
    label: "Draft",
    short: "DRAFT",
    color: "#64748b",
    soft: "rgba(100,116,139,0.10)",
    border: "rgba(100,116,139,0.24)",
    help: "Not yet submitted. Add the required documents, then submit for approval."
  },
  pending_approval: {
    key: "pending_approval",
    label: "Pending approval",
    short: "PENDING",
    color: T.amber,
    soft: T.amberSoft,
    border: T.amberBorder,
    help: "Under review by the Place4U compliance team. You'll be notified once a decision is made."
  },
  approved: {
    key: "approved",
    label: "Approved",
    short: "APPROVED",
    color: T.emerald,
    soft: T.emeraldSoft,
    border: T.emeraldBorder,
    help: "Live and visible to tenants on the marketplace."
  },
  rejected: {
    key: "rejected",
    label: "Rejected",
    short: "REJECTED",
    color: T.red,
    soft: T.redSoft,
    border: T.redBorder,
    help: "Changes are required before this listing can go live."
  }
};

export const getApprovalMeta = (status) => META[status] || META.approved;

/* A listing is live to tenants only when approved. */
export const isListingLive = (property) =>
  (property?.approval_status || "approved") === "approved";

/* Documents required before a landlord may submit a listing for approval.
   At minimum a proof-of-ownership (title deed / rates clearance). */
export const REQUIRED_DOC_TYPES = ["ownership"];

export const hasRequiredDocuments = (docs = []) => {
  if (!Array.isArray(docs) || docs.length === 0) return false;
  return docs.some((d) => REQUIRED_DOC_TYPES.includes(d?.documentType));
};

export const countDocs = (docs) => (Array.isArray(docs) ? docs.length : 0);
