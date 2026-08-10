// Placeholder data layer.
// Swap these arrays for fetch()/axios calls to your Express + MongoDB API
// (e.g. GET /api/products, GET /api/designs, GET /api/orders) — component
// props and shapes below already match a typical Mongo document shape.

const img = (seed, w = 800, h = 1000) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

// ---------- Design Gallery (women-focused studio) ----------
export const categories = ["Wedding", "Women", "School", "Customised", "Men", "Kids"];

export const designs = [
  { id: "d1", title: "Regal Zardozi Lehenga", category: "Wedding", image: img("wed1", 800, 1100), likes: 214, price: 8999, mrp: 12999, rating: 4.8 },
  { id: "d3", title: "Chikankari Kurti", category: "Women", image: img("wom1", 800, 1050), likes: 156, price: 1899, mrp: 2499, rating: 4.7 },
  { id: "d4", title: "Navy Blazer Set", category: "School", image: img("sch1", 800, 950), likes: 42, price: 1299, mrp: 1699, rating: 4.3 },
  { id: "d5", title: "Bridal Reception Gown", category: "Wedding", image: img("wed2", 800, 1150), likes: 301, price: 9999, mrp: 13999, rating: 4.9 },
  { id: "d7", title: "Anarkali Suit", category: "Women", image: img("wom2", 800, 1080), likes: 189, price: 2999, mrp: 3799, rating: 4.6 },
  { id: "d8", title: "Custom Denim Jacket", category: "Customised", image: img("cus1", 800, 1000), likes: 76, price: 2199, mrp: 2799, rating: 4.3 },
  { id: "d9", title: "Sangeet Sharara", category: "Wedding", image: img("wed3", 800, 1120), likes: 167, price: 6799, mrp: 8999, rating: 4.8 },
  { id: "d10", title: "School Pinafore", category: "School", image: img("sch2", 800, 960), likes: 33, price: 999, mrp: 1299, rating: 4.2 },
  { id: "d12", title: "Embroidered Blouse", category: "Women", image: img("wom3", 800, 1000), likes: 210, price: 3499, mrp: 4999, rating: 4.8 },
  { id: "d13", title: "Banarasi Silk Saree Blouse", category: "Women", image: img("wom4", 800, 1050), likes: 132, price: 2599, mrp: 3299, rating: 4.6 },
  { id: "d14", title: "Maggam Work Lehenga", category: "Wedding", image: img("wed4", 800, 1120), likes: 245, price: 10999, mrp: 15999, rating: 4.9 },
  { id: "d15", title: "Designer Nightie Set", category: "Customised", image: img("night1", 800, 1000), likes: 58, price: 899, mrp: 1199, rating: 4.4 },
  { id: "d16", title: "Royal Silk Sherwani", category: "Men", image: img("men1", 800, 1100), likes: 142, price: 7999, mrp: 10999, rating: 4.8 },
  { id: "d17", title: "Embroidered Kurta Set", category: "Men", image: img("men2", 800, 1050), likes: 98, price: 2499, mrp: 3499, rating: 4.6 },
  { id: "d18", title: "Kids Ethnic Lehenga", category: "Kids", image: img("kids1", 800, 1000), likes: 88, price: 1999, mrp: 2799, rating: 4.7 },
  { id: "d19", title: "Kids Kurta Dhoti Set", category: "Kids", image: img("kids2", 800, 1000), likes: 74, price: 1799, mrp: 2499, rating: 4.5 },
];

// Amazon-style multi-angle gallery for the design detail page.
export const designViews = (design) => [
  { label: "Front", image: design.image },
  { label: "Side", image: img(`${design.id}-side`, 800, 1100) },
  { label: "Back", image: img(`${design.id}-back`, 800, 1100) },
  { label: "Detail", image: img(`${design.id}-detail`, 800, 1100) },
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

// ---------- Shop ----------
export const shopCategories = ["Wedding", "Sarees", "Dresses", "Nighties", "Men", "Kids"];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 2);

const fiveDaysLater = new Date();
fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

export const products = [
  { id: "p1", name: "Hand-embroidered Bridal Lehenga", price: 8999, mrp: 12999, category: "Wedding", image: img("shop1", 700, 900), rating: 4.8, bestseller: true, recent: false, stock: 4, unitsSold: 142,
    limitedTimeDeal: { enabled: true, startDate: null, endDate: tomorrow.toISOString() },
    specifications: [
      { label: "Fabric", value: "Silk blend with zardozi embroidery" },
      { label: "Length", value: "42 inches (skirt)" },
      { label: "Set Includes", value: "Lehenga, blouse, dupatta" },
      { label: "Work Type", value: "Hand zardozi & sequin" },
      { label: "Wash Care", value: "Dry clean only" },
    ] },
  { id: "p2", name: "Maggam Work Blouse Piece", price: 2899, mrp: 3599, category: "Sarees", image: img("shop2", 700, 900), rating: 4.6, bestseller: false, recent: true, stock: 9, unitsSold: 45,
    specifications: [
      { label: "Fabric", value: "Raw silk" },
      { label: "Length", value: "0.8m (unstitched blouse piece)" },
      { label: "Work Type", value: "Maggam / aari work" },
      { label: "Wash Care", value: "Dry clean recommended" },
    ] },
  { id: "p3", name: "Kanjeevaram Silk Saree", price: 6999, mrp: 9999, category: "Sarees", image: img("shop3", 700, 950), rating: 4.9, bestseller: true, recent: false, stock: 6, unitsSold: 180,
    specifications: [
      { label: "Fabric", value: "Pure Kanjeevaram silk" },
      { label: "Length", value: "6.3m + 0.8m blouse piece" },
      { label: "Border", value: "Zari contrast border" },
      { label: "Wash Care", value: "Dry clean only" },
    ] },
  { id: "p4", name: "Floral A-line Dress", price: 1499, mrp: 1999, category: "Dresses", image: img("shop4", 700, 900), rating: 4.4, bestseller: false, recent: true, stock: 14, unitsSold: 65,
    limitedTimeDeal: { enabled: true, startDate: null, endDate: fiveDaysLater.toISOString() },
    specifications: [
      { label: "Fabric", value: "Rayon" },
      { label: "Length", value: "Knee-length" },
      { label: "Sleeve", value: "Three-quarter sleeve" },
      { label: "Wash Care", value: "Machine wash cold" },
    ] },
  { id: "p5", name: "Chikankari Anarkali Dress", price: 1899, mrp: 2499, category: "Dresses", image: img("shop5", 700, 900), rating: 4.7, bestseller: true, recent: false, stock: 3, unitsSold: 98,
    specifications: [
      { label: "Fabric", value: "Cotton with chikankari embroidery" },
      { label: "Length", value: "Ankle-length" },
      { label: "Sleeve", value: "Full sleeve" },
      { label: "Wash Care", value: "Hand wash recommended" },
    ] },
  { id: "p6", name: "Satin Nightie Set", price: 799, mrp: 1099, category: "Nighties", image: img("shop6", 700, 950), rating: 4.3, bestseller: false, recent: true, stock: 20,
    specifications: [
      { label: "Fabric", value: "Satin" },
      { label: "Length", value: "Ankle-length" },
      { label: "Set Includes", value: "Nightie with matching robe" },
      { label: "Wash Care", value: "Machine wash cold, gentle cycle" },
    ] },
  { id: "p7", name: "Reception Gown", price: 9999, mrp: 13999, category: "Wedding", image: img("shop7", 700, 980), rating: 4.9, bestseller: true, recent: false, stock: 2,
    specifications: [
      { label: "Fabric", value: "Satin georgette" },
      { label: "Length", value: "Floor-length" },
      { label: "Work Type", value: "Hand embellished, sequin detailing" },
      { label: "Wash Care", value: "Dry clean only" },
    ] },
  { id: "p8", name: "Cotton Nightie Set", price: 599, mrp: 799, category: "Nighties", image: img("shop8", 700, 900), rating: 4.2, bestseller: false, recent: false, stock: 0,
    specifications: [
      { label: "Fabric", value: "Pure cotton" },
      { label: "Length", value: "Knee-length" },
      { label: "Wash Care", value: "Machine wash cold" },
    ] },
  { id: "p9", name: "Sangeet Sharara Set", price: 6799, mrp: 8999, category: "Wedding", image: img("shop9", 700, 970), rating: 4.8, bestseller: false, recent: true, stock: 5,
    specifications: [
      { label: "Fabric", value: "Georgette with net dupatta" },
      { label: "Length", value: "40 inches (sharara)" },
      { label: "Set Includes", value: "Kurti, sharara, dupatta" },
      { label: "Wash Care", value: "Dry clean only" },
    ] },
  { id: "p11", name: "Party Wear Bodycon Dress", price: 2199, mrp: 2799, category: "Dresses", image: img("shop11", 700, 950), rating: 4.6, bestseller: false, recent: true, stock: 8,
    specifications: [
      { label: "Fabric", value: "Lycra blend" },
      { label: "Length", value: "Knee-length" },
      { label: "Sleeve", value: "Sleeveless" },
      { label: "Wash Care", value: "Hand wash cold" },
    ] },
  { id: "p13", name: "Royal Silk Sherwani Set", price: 7999, mrp: 10999, category: "Men", image: img("shop13", 700, 900), rating: 4.8, bestseller: true, recent: true, stock: 7, unitsSold: 88,
    specifications: [
      { label: "Fabric", value: "Art silk with embroidery" },
      { label: "Set Includes", value: "Sherwani & churidar" },
      { label: "Wash Care", value: "Dry clean only" },
    ] },
  { id: "p14", name: "Designer Kurta Pyjama", price: 2499, mrp: 3499, category: "Men", image: img("shop14", 700, 900), rating: 4.6, bestseller: false, recent: true, stock: 12, unitsSold: 42,
    specifications: [
      { label: "Fabric", value: "Cotton silk blend" },
      { label: "Set Includes", value: "Kurta & pyjama" },
      { label: "Wash Care", value: "Dry clean or gentle hand wash" },
    ] },
  { id: "p15", name: "Kids Ethnic Lehenga Choli", price: 1999, mrp: 2799, category: "Kids", image: img("shop15", 700, 900), rating: 4.7, bestseller: true, recent: true, stock: 10, unitsSold: 64,
    specifications: [
      { label: "Fabric", value: "Soft brocade & dupion silk" },
      { label: "Age Group", value: "3 - 8 Years" },
      { label: "Wash Care", value: "Dry clean recommended" },
    ] },
  { id: "p16", name: "Kids Sherwani & Dhoti Set", price: 1799, mrp: 2499, category: "Kids", image: img("shop16", 700, 900), rating: 4.5, bestseller: false, recent: true, stock: 8, unitsSold: 35,
    specifications: [
      { label: "Fabric", value: "Jacquard silk" },
      { label: "Age Group", value: "4 - 10 Years" },
      { label: "Wash Care", value: "Dry clean only" },
    ] },
];

export const productViews = (product) => [
  { label: "Front", image: product.image },
  { label: "Side", image: img(`${product.id}-side`, 700, 950) },
  { label: "Back", image: img(`${product.id}-back`, 700, 950) },
  { label: "Detail", image: img(`${product.id}-detail`, 700, 950) },
];

export const bestWork = [
  { id: "b1", title: "Birthday Special", subtitle: "Party Wear", image: img("best1", 700, 900) },
  { id: "b2", title: "Wedding Season", subtitle: "Bridal Couture", image: img("best2", 700, 900) },
  { id: "b3", title: "Festive Edit", subtitle: "Ethnic Wear", image: img("best3", 700, 900) },
  { id: "b4", title: "Saree Season", subtitle: "Handloom Picks", image: img("best4", 700, 900) },
  { id: "b5", title: "Reception Night", subtitle: "Statement Gowns", image: img("best5", 700, 900) },
  { id: "b6", title: "Back to School", subtitle: "Uniforms", image: img("best6", 700, 900) },
];

// Hero carousel — clothes, tailoring/stitching, shopping, designs
export const heroSlides = [
  { id: "h1", label: "Clothes", image: img("herocloth", 1800, 1200) },
  { id: "h2", label: "Tailoring", image: img("herotailor", 1800, 1200) },
  { id: "h3", label: "Shopping", image: img("heroshop", 1800, 1200) },
  { id: "h4", label: "Designs", image: img("herodesign", 1800, 1200) },
];

export const faqs = [
  {
    q: "How long does custom stitching usually take?",
    a: "Most single garments are ready in 5–7 working days. Since we can only take on a limited number of stitching orders per day to protect quality, your exact delivery date is confirmed right after you submit the tailoring form.",
  },
  {
    q: "Can I provide my own fabric?",
    a: "Yes. On the tailoring form you can choose to bring your own material, or select from our in-house fabric options and we'll source it for you.",
  },
  {
    q: "How do I share my measurements?",
    a: "You can enter measurements directly in the booking form using our at-home measuring guide, or book a store visit and our tailor will take them for you.",
  },
  {
    q: "What if I need alterations after delivery?",
    a: "Every order includes one free alteration within 15 days of delivery. Just reach out from your Orders page or contact us directly.",
  },
  {
    q: "Do you offer fast delivery?",
    a: "Yes — select the fast delivery option on the tailoring form for a 1-day turnaround. A small extra charge applies for rush orders.",
  },
  {
    q: "What payment methods are accepted?",
    a: "UPI, major debit/credit cards, and cash on pickup at our store.",
  },
];

export const materials = [
  "Cotton", "Silk", "Linen", "Georgette", "Chiffon", "Velvet", "Satin", "Net",
];

export const garmentTypes = [
  "Blouse", "Frock", "Kurti", "Lehenga", "Saree Blouse", "Nightie", "School Uniform", "Other",
];

export const orders = [
  { id: "382941750293847", type: "Stitching", item: "Silk Zardozi Blouse", status: "In Progress", date: "2026-07-10", eta: "2026-07-16", amount: 3499 },
  { id: "719205384612093", type: "Shop", item: "Chikankari Anarkali Dress", status: "Delivered", date: "2026-06-28", eta: "2026-07-02", amount: 1899 },
  { id: "504817623905148", type: "Stitching", item: "Maggam Work Blouse", status: "Delivered", date: "2026-06-14", eta: "2026-06-20", amount: 2899 },
];

const reviewPool = [
  { name: "Priya Menon", comment: "The finishing on this is beautiful — exactly like the photos. Highly recommend." },
  { name: "Sneha Iyer", comment: "Ordered this for a family function, got so many compliments on the stitching detail." },
  { name: "Divya Prasad", comment: "Loved the embroidery work, very close to the reference image shown." },
  { name: "Meera Krishnan", comment: "Good value for the price. Delivery was on time as promised." },
  { name: "Anjali Reddy", comment: "Fabric quality feels premium, fit was perfect after one small alteration." },
];

export const contactInfo = {
  phone: "+91 88017 90961",
  phoneHref: "+918801790961",
  whatsappHref: "https://wa.me/918801790961",
  email: "lakshmibade32@gmail.com",
  address: "Muthyalareddy Nagar Main Road, Amaravathi Road, Guntur 522007",
  // Precise pin from 16°19'18.9"N 80°26'10.8"E — a text search on the
  // address string alone was resolving to a generic nearby point, so both
  // the embed and the "open in maps" link use these coordinates directly.
  lat: 16.321917,
  lng: 80.436333,
  get mapsUrl() {
    return `https://www.google.com/maps/search/?api=1&query=${this.lat},${this.lng}`;
  },
};

// Deterministic per-item reviews so the same item always shows the same set.
export const getReviews = (itemId) => {
  const seed = itemId.charCodeAt(itemId.length - 1);
  const count = 3 + (seed % 3);
  return Array.from({ length: count }).map((_, i) => {
    const r = reviewPool[(seed + i) % reviewPool.length];
    return {
      id: `${itemId}-r${i}`,
      name: r.name,
      comment: r.comment,
      rating: 4 + ((seed + i) % 2),
      date: `2026-0${(6 + (i % 3))}-${10 + i}`,
    };
  });
};
