/**
 * Master Domain Application Configurations & Reference Rules
 *
 * Fabric requirements, material categories, and size rules maintained
 * for boutique tailoring and shop calculations.
 */

// ---------- Fabric Pricing & Standard Requirements Model ----------
export const standardFabricRequirements = {
  "Blouse": 1,
  "Saree Blouse": 1,
  "Kurti": 2.5,
  "Lehenga": 4,
  "Frock": 3,
  "Nightie": 3,
  "School Uniform": 2.5,
  "Other": 2,
};

export const fabricCatalog = [
  { id: "f1", name: "Cotton", pricePerMeter: 350, availability: "In Stock" },
  { id: "f2", name: "Silk", pricePerMeter: 850, availability: "In Stock" },
  { id: "f3", name: "Premium Silk", pricePerMeter: 1450, availability: "In Stock" },
  { id: "f4", name: "Georgette", pricePerMeter: 450, availability: "In Stock" },
  { id: "f5", name: "Chiffon", pricePerMeter: 400, availability: "In Stock" },
  { id: "f6", name: "Velvet", pricePerMeter: 950, availability: "In Stock" },
  { id: "f7", name: "Satin", pricePerMeter: 500, availability: "In Stock" },
  { id: "f8", name: "Net", pricePerMeter: 300, availability: "In Stock" },
  { id: "f9", name: "Linen", pricePerMeter: 600, availability: "In Stock" },
];

export const categories = ["Wedding", "Women", "School", "Customised", "Men", "Kids"];
export const shopCategories = ["Wedding", "Sarees", "Dresses", "Nighties", "Blouses", "Casual"];

export const materials = [
  "Cotton", "Silk", "Linen", "Georgette", "Chiffon", "Velvet", "Satin", "Net",
];

export const garmentTypes = [
  "Blouse", "Frock", "Kurti", "Lehenga", "Saree Blouse", "Nightie", "School Uniform", "Other",
];

// Helper to check if a limited-time deal is currently active and not expired
export function isDealActive(product) {
  if (!product) return false;
  const deal = product.limitedTimeDeal;
  if (!deal || !deal.enabled) return false;
  const now = new Date();
  if (deal.startDate && new Date(deal.startDate) > now) return false;
  if (deal.endDate && new Date(deal.endDate) < now) return false;
  return true;
}
