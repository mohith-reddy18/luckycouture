# Lucky Couture — Backend

Production-oriented REST API for the Lucky Couture tailoring & boutique platform, built with Node.js, Express, and MongoDB (Mongoose).

## Stack

- Node.js + Express (MVC-style structure)
- MongoDB + Mongoose
- JWT auth (httpOnly cookie or `Authorization: Bearer`) + bcrypt
- Multer for uploads, Cloudinary-ready (falls back to local `/uploads` when unconfigured)
- Helmet, CORS, express-rate-limit, express-mongo-sanitize, and a custom XSS-sanitizing middleware (`src/middleware/xssSanitize.js`, built on the actively-maintained `xss` package — the older `xss-clean` package is unmaintained and was intentionally not used)
- Nodemailer (falls back to console logging in development)

## Getting started
Run this from the **repo root** (one level up) — `npm install` there sets up
both frontend and backend together and auto-creates `.env` for you. See the
root `README.md` for the full walkthrough. To run only the backend on its own:

```bash
cd backend
cp .env.example .env      # then fill in MONGO_URI, JWT_SECRET, etc.
npm install
npm run seed               # creates an admin user, categories, sample products/designs
npm run dev                 # starts on http://localhost:5000 with nodemon
```

Health check: `GET /api/health`

## Environment variables

See `.env.example` for the full list. Minimum required to run locally:

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing secret for auth tokens — use a long random value |
| `CLIENT_URL` | Frontend origin, used for CORS and password-reset links |

Cloudinary and SMTP variables are optional — uploads fall back to local disk storage under `/uploads`, and emails are logged to the console instead of sent, so the API is fully testable without either.

## Folder structure

```
backend/
  server.js               # entry point
  src/
    app.js                 # Express app: middleware + route mounting
    config/                # DB connection, Cloudinary config
    models/                 # Mongoose schemas
    controllers/            # business logic per resource
    routes/                  # route → controller wiring
    middleware/              # auth, error handling, validation, uploads, rate limiting
    validators/               # express-validator rule sets
    utils/                     # asyncHandler, ApiError/ApiResponse, JWT, pagination,
                                 # capacity calculator, mailer, storage service, seed script
  uploads/                    # local file storage (used only without Cloudinary)
```

## Authentication

JWT is issued on register/login and set as an httpOnly cookie (`token`) as well as returned in the JSON body, so the frontend can use either cookie-based auth or `Authorization: Bearer <token>` depending on how it's deployed (same-origin vs separate domains).

Guest checkout/booking is supported for the Tailoring and Priority Stitching endpoints (`optionalAuth` middleware) — logged-in users get order history and notifications automatically; guests provide `guestInfo` (name/phone/email) instead. Call `POST /api/auth/merge-guest-data` right after login/signup to fold a guest's localStorage cart/wishlist into their new account.

## Business rules implemented

- **Daily tailoring capacity** (default 4/day, admin-configurable): `POST /api/tailoring` automatically finds the next date with an open slot and returns the computed `expectedDeliveryDate`.
- **Priority Stitching** uses its own separate daily capacity pool (default 2/day) and a 24–30 hour delivery window, with a surcharge percentage read from Admin Settings (`prioritySurchargeMin`/`Max`). Admin approval finalizes the exact price.
- **Customer design submissions**: customers can submit a design they like via `POST /api/designs/submit` (images uploaded first via `POST /api/uploads/reference-images`). Submissions sit in `pending_review` until an admin approves (`PATCH /api/designs/:id/moderate`) or rejects them — only approved designs appear in the public gallery.
- **Stock-aware checkout**: placing an order validates stock, decrements it, and clears the cart atomically per item.
- **Review ratings** recalculate a product's `ratingAverage`/`ratingCount` on every create/delete.
- **Search by name or category**: `GET /api/products?q=...` and `GET /api/designs?q=...` match against the item's own name/title as well as its category's name (e.g. searching "Wedding" surfaces every Wedding-category item even if the word never appears in an individual product's name).

## API overview

All responses follow `{ success, message, data, pagination? }`. Paginated list endpoints accept `?page=&limit=`.

| Resource | Base path | Notes |
|---|---|---|
| Auth | `/api/auth` | register, login, logout, me, forgot/reset password, merge-guest-data |
| Users | `/api/users` | profile, addresses, measurement profiles (CRUD + duplicate), admin user list |
| Categories | `/api/categories` | public list, admin CRUD |
| Products | `/api/products` | search/filter/sort/paginate, related products, admin CRUD |
| Designs | `/api/designs` | gallery browse, customer submissions + moderation queue, admin CRUD |
| Cart | `/api/cart` | authenticated cart CRUD |
| Wishlist | `/api/wishlist` | toggle product/design favorites |
| Orders | `/api/orders` | checkout from cart, order history, admin status updates |
| Tailoring | `/api/tailoring` | booking with capacity-aware scheduling, availability check, admin management |
| Priority Stitching | `/api/priority-stitching` | express booking, availability, admin approve/reject |
| Reviews | `/api/reviews` | product reviews with verified-purchase flag |
| Notifications | `/api/notifications` | in-app notification feed |
| Contact | `/api/contact` | contact form submissions, admin inbox |
| Uploads | `/api/uploads` | admin management images + guest-accessible reference images |
| Admin | `/api/admin` | dashboard summary, site settings |
| Settings | `/api/settings/public` | read-only subset of settings for the public site |

## Security notes

- Passwords hashed with bcrypt (12 rounds); reset tokens are hashed before storage and expire in 30 minutes.
- Rate limiting is tighter on `/api/auth/*` than the general API.
- All list/filter inputs are validated; Mongo operator injection is stripped via `express-mongo-sanitize`.
- No secrets are ever returned in API responses (`User.toSafeObject()` strips password/reset fields).

## Not included (deliberately out of scope for this pass)

Payment gateway integration (Razorpay), SMS/WhatsApp delivery of notifications, and a full coupon engine are stubbed at the model/field level (`paymentMethod`, `couponCode`, `AdminSetting.couponsEnabled`) but not wired to a live provider — these need real merchant credentials to implement meaningfully and are flagged in Volume 5's roadmap as future work.
