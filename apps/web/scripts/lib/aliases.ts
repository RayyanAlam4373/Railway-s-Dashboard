// Canonical names + alias map. Source files contain spelling variants,
// typos, and case differences across sheets. The ingestion script uses
// these maps to resolve every xlsx label back to a single canonical row in
// the lookup tables. Add a new alias here when a new variant is spotted.

export type CommodityCategory =
  | "oil"
  | "fertilizer"
  | "mineral"
  | "coal"
  | "container"
  | "cargo_express"
  | "agricultural"
  | "industrial"
  | "other";

export type CommoditySeed = {
  name: string;
  category: CommodityCategory;
  display_order: number;
};

// Canonical commodities in display order (the order shown in dashboards).
export const COMMODITIES: CommoditySeed[] = [
  { name: "Coal / YSW", category: "coal", display_order: 10 },
  { name: "Coal / AKDD", category: "coal", display_order: 11 },
  { name: "Coal / Other", category: "coal", display_order: 12 },
  { name: "Local Container (PNX)", category: "container", display_order: 20 },
  { name: "Dry Port (Container)", category: "container", display_order: 21 },
  { name: "GITA Container", category: "container", display_order: 22 },
  { name: "Cargo Express", category: "cargo_express", display_order: 30 },
  { name: "Rock Phosphate", category: "mineral", display_order: 40 },
  { name: "Fertilizer", category: "fertilizer", display_order: 50 },
  { name: "Oil Seed", category: "agricultural", display_order: 60 },
  { name: "Wheat", category: "agricultural", display_order: 61 },
  { name: "Steel Coils", category: "industrial", display_order: 70 },
  { name: "PTA", category: "industrial", display_order: 71 },
  { name: "Dolomite", category: "mineral", display_order: 72 },
  { name: "Sulphur", category: "mineral", display_order: 73 },
  { name: "P.O.L", category: "oil", display_order: 80 },
  { name: "Furnace Oil", category: "oil", display_order: 81 },
  { name: "HSD Oil", category: "oil", display_order: 82 },
  { name: "Oil Defence", category: "oil", display_order: 83 },
  { name: "Military Store", category: "other", display_order: 90 },
  { name: "Others", category: "other", display_order: 999 },
];

// Map normalized source label → canonical commodity name.
// Keys are lowercased + trimmed; values are canonical names from COMMODITIES.
export const COMMODITY_ALIASES: Record<string, string> = {
  "coal / ysw": "Coal / YSW",
  "ysw / coal": "Coal / YSW",
  "coal / akdd": "Coal / AKDD",
  "akdd / coal": "Coal / AKDD",
  "coal / other": "Coal / Other",
  "other than ysw / coal": "Coal / Other",
  "local container (nb)": "Local Container (PNX)",
  "local container (pnx)": "Local Container (PNX)",
  "local cont. (pnx)": "Local Container (PNX)",
  "dry port (container)": "Dry Port (Container)",
  "dry/port": "Dry Port (Container)",
  "gita container": "GITA Container",
  "gita contaienr": "GITA Container", // typo in source
  "gita cargo": "GITA Container",
  "cargo express": "Cargo Express",
  "cargo/express": "Cargo Express",
  "rock phosphate": "Rock Phosphate",
  "r/phosphate": "Rock Phosphate",
  fertilizer: "Fertilizer",
  "oil seed": "Oil Seed",
  "oil/seed": "Oil Seed",
  "rape seeds": "Oil Seed",
  wheat: "Wheat",
  "steel coils": "Steel Coils",
  pta: "PTA",
  dolomite: "Dolomite",
  sulphur: "Sulphur",
  "p.o.l": "P.O.L",
  "oil railway": "P.O.L",
  "furnace oil": "Furnace Oil",
  "hsd oil": "HSD Oil",
  "oil defence": "Oil Defence",
  "military store": "Military Store",
  others: "Others",
  other: "Others",
};

export type ContainerPartySeed = {
  name: string;
  agreement_terms: string | null;
  display_order: number;
};

// Canonical container parties. Spelling typos in the xlsx (e.g.
// "Internatinal", missing closing paren) resolve here via aliases.
export const CONTAINER_PARTIES: ContainerPartySeed[] = [
  {
    name: "DP World Port Qasim",
    agreement_terms: null,
    display_order: 10,
  },
  { name: "MICT / PIL", agreement_terms: null, display_order: 20 },
  {
    name: "Chishtian (FSLD)",
    agreement_terms: "Agreement 2 Years; 400 TEUs per month",
    display_order: 30,
  },
  {
    name: "Mughal Steel (QSS)",
    agreement_terms: "Agreement 3 Years; 1000 TEUs per month",
    display_order: 40,
  },
  {
    name: "Karachi International Gateway Terminal (KICT)",
    agreement_terms: null,
    display_order: 50,
  },
  {
    name: "PPCT (MGPR)",
    agreement_terms: "MOU 6 Month; 480 FEUs or 960 TEUs per month",
    display_order: 60,
  },
  {
    name: "LCI / ICI Pakistan (KWA)",
    agreement_terms: null,
    display_order: 70,
  },
  { name: "Mobility Services (MGPR)", agreement_terms: null, display_order: 80 },
  { name: "Asim International (MGPR)", agreement_terms: null, display_order: 90 },
  {
    name: "Ittehad Transport Company (ITC)",
    agreement_terms: null,
    display_order: 100,
  },
  { name: "KGTL (JBA)", agreement_terms: null, display_order: 110 },
  {
    name: "International Logistics Solution (ISL)",
    agreement_terms: null,
    display_order: 120,
  },
  {
    name: "Skyline International (MFPR)",
    agreement_terms: null,
    display_order: 130,
  },
  { name: "Port Link MGPR", agreement_terms: null, display_order: 140 },
  {
    name: "M.K Trade & Logistics (KRK)",
    agreement_terms: null,
    display_order: 150,
  },
  {
    name: "International Ports Logistics (IPL) GITA",
    agreement_terms: null,
    display_order: 160,
  },
  { name: "Waraich & Sons (JBA)", agreement_terms: null, display_order: 170 },
  { name: "Azaan & Co. (Azakhel)", agreement_terms: null, display_order: 180 },
  {
    name: "International Ports Logistics (IPL) SAPT",
    agreement_terms: null,
    display_order: 190,
  },
  { name: "Fareed Logistics (KRK)", agreement_terms: null, display_order: 200 },
  { name: "NLC (JBA)", agreement_terms: null, display_order: 210 },
];

// Source-column-header → canonical party name. Headers are normalized
// (lowercased, whitespace collapsed) before lookup.
export const CONTAINER_PARTY_ALIASES: Record<string, string> = {
  "dp world port qasim": "DP World Port Qasim",
  "mict / pil": "MICT / PIL",
  "chishtian (fsld) agreement 2 years 400 teus per month":
    "Chishtian (FSLD)",
  "chishtian (fsld)": "Chishtian (FSLD)",
  "mughal steel (qss) agreement 3 years 1000 teus per month":
    "Mughal Steel (QSS)",
  "mughal steel (qss)": "Mughal Steel (QSS)",
  "karachi internatinal gateway terminal (kict)":
    "Karachi International Gateway Terminal (KICT)",
  "karachi international gateway terminal (kict)":
    "Karachi International Gateway Terminal (KICT)",
  "ppct (mgpr) mou 6 month 480 feus or 960 teus per month": "PPCT (MGPR)",
  "ppct (mgpr)": "PPCT (MGPR)",
  "lci / ici pakistan (kwa)": "LCI / ICI Pakistan (KWA)",
  "mobility services (mgpr": "Mobility Services (MGPR)", // missing paren in source
  "mobility services (mgpr)": "Mobility Services (MGPR)",
  "asim international (mgpr)": "Asim International (MGPR)",
  "ittehad transprot company (itc)": "Ittehad Transport Company (ITC)", // typo
  "ittehad transport company (itc)": "Ittehad Transport Company (ITC)",
  "kgtl (jba)": "KGTL (JBA)",
  "international logistis soluation (isl)":
    "International Logistics Solution (ISL)", // typos
  "international logistics solution (isl)":
    "International Logistics Solution (ISL)",
  "skyline international (mfpr)": "Skyline International (MFPR)",
  "port link mgpr": "Port Link MGPR",
  "m.k trade & logistics (krk)": "M.K Trade & Logistics (KRK)",
  "international ports logistics (ipl) gita":
    "International Ports Logistics (IPL) GITA",
  "waraich & sons jba": "Waraich & Sons (JBA)",
  "waraich & sons (jba)": "Waraich & Sons (JBA)",
  "azaan & co. azakhel": "Azaan & Co. (Azakhel)",
  "azaan & co. (azakhel)": "Azaan & Co. (Azakhel)",
  "international ports logistics (ipl) sapt":
    "International Ports Logistics (IPL) SAPT",
  "fareed logistics (krk)": "Fareed Logistics (KRK)",
  "nlc (jba)": "NLC (JBA)",
};

export const COAL_PARTIES: { name: string; display_order: number }[] = [
  { name: "Maple Leaf", display_order: 10 },
  { name: "Mughal Steel", display_order: 20 },
  { name: "Chishtian", display_order: 30 },
  { name: "M.I. Mehdi Traders", display_order: 40 },
  { name: "Imlak", display_order: 50 },
  { name: "LCI / ICI Pakistan", display_order: 60 },
  { name: "Awan Trading", display_order: 70 },
  { name: "NEFT / NLC", display_order: 80 },
  { name: "Fast Ways", display_order: 90 },
  { name: "Sitara Chemical", display_order: 100 },
  { name: "K.S. Traders", display_order: 110 },
  { name: "West Gate", display_order: 120 },
];

export const COAL_PARTY_ALIASES: Record<string, string> = {
  "maple leaf": "Maple Leaf",
  "mughal steel": "Mughal Steel",
  chishtian: "Chishtian",
  "m.i. mehdi traders": "M.I. Mehdi Traders",
  imlak: "Imlak",
  "lci/ici pakistan": "LCI / ICI Pakistan",
  "lci / ici pakistan": "LCI / ICI Pakistan",
  "awan trading": "Awan Trading",
  "neft / nlc": "NEFT / NLC",
  "neft/nlc": "NEFT / NLC",
  "fast ways": "Fast Ways",
  "sitara chemical": "Sitara Chemical",
  "k.s. traders": "K.S. Traders",
  "west gate": "West Gate",
};

export const CARGO_EXPRESS_ROUTES: {
  code: string;
  description: string;
}[] = [
  { code: "501-Up (KBX)", description: "Karachi → Lahore freight express" },
  { code: "503-Up (KYC)", description: "Karachi → Faisalabad freight express" },
];

export const CARGO_EXPRESS_ROUTE_ALIASES: Record<string, string> = {
  "501-up (kbx)": "501-Up (KBX)",
  "501-up": "501-Up (KBX)",
  "503-up (kyc)": "503-Up (KYC)",
  "503-up": "503-Up (KYC)",
};

// Month name → 1..12 (calendar month, not fiscal).
export const MONTH_NUMBERS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

// Normalize any header/label for case-insensitive lookup:
// collapse whitespace + newlines, strip trailing punctuation, lowercase.
export function normalizeLabel(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Excel writes a giant negative integer where it tried to divide by zero
// (int overflow). Coerce these and the literal "-" placeholder to null.
export function cleanNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "-") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    // -2146826281 is the int-overflow placeholder seen in source files.
    if (value === -2146826281) return null;
    return value;
  }
  return null;
}
