# Lucky Couture — Frontend

A luxury boutique tailoring website frontend, built with React 19 + Vite.

## Stack
- React 19 + Vite
- React Router v7 for routing
- Framer Motion for animation
- Tailwind CSS for styling (custom design tokens in `tailwind.config.js`)
- Lucide React for icons

## Getting started
Run this from the **repo root** (one level up), not from inside this folder —
see the root `README.md` for the full setup (it installs and runs the
backend too). If you specifically want to run only the frontend on its own:
```bash
npm install
npm run dev      # start dev server
npm run build    # production build -> dist/
```

## Structure
```
src/
  components/   Navbar, Footer, ProductCard, DesignCard, FAQAccordion, etc.
  context/      AppContext.jsx — cart, wishlist, auth (mock, localStorage-backed)
  data/         mockData.js — placeholder products/designs/testimonials/FAQs
  pages/        Home, DesignGallery, Tailoring, Shop, Cart, Wishlist, Orders,
                Profile, About, Contact, Login, Signup, NotFound
```

## Connecting to your Node/Express/MongoDB backend
Everything currently reading from `src/data/mockData.js` and `AppContext.jsx`
is written to mirror a typical REST + Mongo document shape, so it's a
drop-in swap:

- `GET /api/designs`, `GET /api/products` → replace the arrays in `mockData.js`
- `POST /api/auth/login`, `POST /api/auth/signup` → replace the `login`/`signup`
  functions in `AppContext.jsx`
- `POST /api/tailoring-orders` → replace the mock ETA logic in
  `src/pages/Tailoring.jsx` `handleSubmit` — your Express route should
  compute delivery date server-side based on the "4 orders/day" capacity rule
- `POST /api/cart`, `POST /api/wishlist`, `GET /api/orders` → same pattern,
  swap the localStorage-backed state in `AppContext.jsx` for API calls once
  you have auth/session wired up

## Design tokens
Primary `#443742` · Secondary `#846C5B` · Accent `#CEA07E` · Highlight `#EDD9A3`
Background `#F8F6F2` · Text `#2B2B2B`
Fonts: Playfair Display (headings), Poppins (body)
