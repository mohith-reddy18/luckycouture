# Lucky Couture

Lucky Couture is a premium Indian fashion, boutique shopping, and custom tailoring platform. The platform offers a unified digital e-commerce experience for purchasing curated boutique fashion as well as booking bespoke tailoring services with custom measurement inputs and express delivery options.

---

## Production

Lucky Couture is deployed as a production web application and is being prepared for live customer use under its official custom domain:

🔗 **Live Website**: [https://www.luckycouture.in](https://www.luckycouture.in)

The platform is hosted on production cloud infrastructure with a decoupled frontend web application, an authoritative backend API server, and a high-availability MongoDB Atlas cloud database.

---

## Key Functional Areas

### Customer Experience
- **Boutique Shopping Catalog**: Browse luxury Indian fashion, filter by category, price, size, and fabric types.
- **Product Variants**: Support for multi-color, multi-size, and fabric options with real-time stock availability.
- **Shopping Cart & Checkout**: Seamless shopping cart management, address verification, and delivery calculations.
- **Secure Online Payments**: Integrated Razorpay checkout supporting UPI, Credit/Debit cards, Netbanking, as well as Cash on Delivery (COD).
- **Custom Bespoke Tailoring**: Submit custom stitching orders, select garment types, provide custom measurements, and attach design preferences.
- **Express Priority Stitching**: Dedicated fast-track tailoring service with 24–36 hour turnaround times.
- **Store Pickup & Delivery**: Flexible fulfillment supporting home delivery across India and local store pickup in Guntur, Andhra Pradesh.
- **Order Tracking & Details**: Real-time order status tracking, digital receipts, and fulfillment status updates.
- **Customer Accounts & Auth**: Secure authentication via email/password, Google OAuth 2.0, and SMS OTP verification.
- **Customer Support**: Integrated contact forms and direct customer support communications.

### Admin Portal
- **Dashboard Metrics**: Real-time operational overview showing sales revenue, daily fulfillment queues, stock alerts, and customer metrics.
- **Unified Order Management**: Comprehensive management of boutique shopping orders, tailoring bookings, and express priority orders.
- **Inventory & Catalog Control**: Real-time product inventory updates, variant pricing, and low-stock warnings.
- **Design Gallery Management**: Manage showcase stitching reference designs for customer tailoring orders.
- **Content & Articles Management**: Publish and maintain fashion articles, style guides, and store updates.
- **Customer Management**: View registered customer accounts, order histories, and profile details.
- **Dynamic Platform Settings**: Manage daily tailoring capacities, priority surcharges, and support contact details.

---

## Technology Stack

### Frontend
- **Framework**: React 19, Vite
- **Routing & State**: React Router DOM 7
- **UI & Animations**: Tailwind CSS, Framer Motion, Lucide React Icons
- **Authentication**: Google OAuth (`@react-oauth/google`)

### Backend
- **Runtime & Server**: Node.js (>=18), Express 4
- **Database**: MongoDB with Mongoose 8 ORM
- **Security & Utility**: Helmet, CORS, Express Rate Limit, Express Mongo Sanitize, XSS filtering, Compression, JSON Web Tokens (JWT), Bcrypt.js

### Service Integrations
- **Payments**: Razorpay Payment Gateway API
- **Emails**: Resend API & Nodemailer (Transactional order emails & daily admin reports)
- **SMS & Verification**: Twilio Verify API (OTP verification)
- **Media Storage**: Cloudinary API (Product and design image storage)

---

## System Architecture

The application is built using a modern decoupled architecture:

```
Lucky-Couture/
├── frontend/               # Client-side React application (Customer Storefront & Admin Portal)
├── backend/                # Server-side Express API (Business logic, Auth, DB, Payments)
├── scripts/                # Environment setup and build automation scripts
├── README.md               # Production & repository documentation
└── package.json            # Root package configuration with npm workspaces
```

- **Frontend (`frontend/`)**: Renders the responsive customer web application and the secure Admin Portal interface using Vite and React.
- **Backend (`backend/`)**: Provides RESTful API endpoints, handles authentication, validates business logic, calculates fulfillment deadlines, processes payments, and interacts with MongoDB.

---

## Payments & Financial Security

Lucky Couture integrates **Razorpay** for secure online payment processing.

- **Authoritative Validation**: All order totals, advance amounts, and remaining balance calculations are evaluated authoritatively on the backend API server.
- **Payment Lifecycle**: Supports full payment, advance payment for custom tailoring, and Cash on Delivery (COD).
- **Payment Safety**: Payment attempts are verified server-side via cryptographic signature verification before updating order status or deducting inventory.

> [!NOTE]
> All sensitive API keys, secrets, and credentials are configured exclusively via server-side environment variables and are never exposed to the client browser.

---

## Database Architecture

Application data is stored in **MongoDB** (using **MongoDB Atlas** in production).

- **Core Collections**: Users, Products, Orders (Shopping), TailoringOrders, PriorityOrders, AdminSettings, ContactMessages, Articles, and DailyReportLogs.
- **Data Integrity**: Schemas enforce strict type definitions, enum status validation, and terminal state rules for completed/cancelled orders.

---

## Environment Configuration

Environment configuration is managed via environment variables and is **never committed** to the source repository.

To configure local development or production deployments, copy `backend/.env.example` to `backend/.env` and supply the required values:

Key environment variables include:

| Variable | Description |
| :--- | :--- |
| `NODE_ENV` | Application environment (`development` / `production`) |
| `PORT` | Backend server port (default `5000`) |
| `CLIENT_URL` | Frontend application URL (used for CORS configuration) |
| `MONGO_URI` | MongoDB connection string (Local MongoDB or MongoDB Atlas cluster) |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens |
| `RAZORPAY_KEY_ID` | Razorpay API Public Key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API Private Secret |
| `RESEND_API_KEY` | Resend API key for transactional emails |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID for OTP SMS verification |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify Service SID |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for media assets |

---

## Local Development Setup

### Prerequisites
- Node.js (>= 18.0.0)
- npm (>= 9.0.0)
- Local MongoDB instance or MongoDB Atlas account

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mohith-reddy18/luckycouture.git
   cd luckycouture
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
   *This command uses `npm workspaces` to install dependencies for both `frontend/` and `backend/` and automatically creates `backend/.env` from `backend/.env.example`.*

3. **Configure Environment**:
   Open `backend/.env` and update your local `MONGO_URI` and `JWT_SECRET`.

4. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   *Starts both frontend (`http://localhost:5173`) and backend (`http://localhost:5000`) concurrently in a single terminal.*

   Alternatively, you can run them separately:
   ```bash
   npm run dev:frontend
   npm run dev:backend
   ```

---

## Deployment Architecture

- **Frontend Application**: Deployed on production web hosting, served over HTTPS with custom domain routing.
- **Backend Service**: Deployed on cloud platform (Render), configured with Node.js runtime and environment secrets.
- **Database**: Production MongoDB cluster hosted on MongoDB Atlas with encrypted transport.
- **Custom Domain**: Configured under official custom domain `https://www.luckycouture.in`.

---

## Security Notes

- **Secrets Isolation**: Credentials, private keys, database connection strings, and payment secrets are stored strictly in environment variables and excluded via `.gitignore`.
- **Authoritative Backend**: Price calculations, order status transitions, stock deductions, and admin authorization logic are enforced authoritatively on the backend server.
- **CORS & Rate Limiting**: Production API enforces origin restriction via CORS and rate limiting on authentication endpoints.
