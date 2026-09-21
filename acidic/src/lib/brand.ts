/** Acidity's own identity, carried over from acidity.com.au: ink, cream and the emerald accent. */
export const BRAND = {
  ink: "#15130f",
  cream: "#ede8de",
  creamDim: "#b4afa4",
  green: "#7d9161",
  greenDim: "#62744a",
  rust: "#b1543a",
  venue: "Acidity Bar & Coffee",
  address: process.env.ACIDIC_BUSINESS_ADDRESS || "3/240 Victoria Street, Richmond VIC 3121",
  email: process.env.ACIDIC_BUSINESS_EMAIL || "admin@acidity.com.au",
} as const;
