/* Shared landlord helpers — single source of truth (dedupe). */

export const initials = (nameOrEmail) => {
  const raw = (nameOrEmail || "").trim();
  if (!raw) return "P4";
  if (raw.includes("@")) return raw.slice(0, 2).toUpperCase();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const formatZar = (amount, { decimals = 0, fallback = "—" } = {}) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return fallback;
  try {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(Number(amount));
  } catch {
    return `R${Number(amount).toLocaleString("en-ZA")}`;
  }
};

export const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "recently";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  } catch {
    return "recently";
  }
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

export const parseRentValue = (rentStr, priceNum) => {
  if (typeof priceNum === "number" && !Number.isNaN(priceNum) && priceNum > 0) return priceNum;
  if (!rentStr) return 0;
  const num = String(rentStr).replace(/[^0-9]/g, "");
  return num ? parseInt(num, 10) : 0;
};
