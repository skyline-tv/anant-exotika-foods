# ANANT EXOTIKA — Backend Server

Premium luxury e-commerce API for **ANANT EXOTIKA** — *Beyond Time, Beyond Luxury*.

This server powers the customer storefront and the upcoming admin panel. It is a standalone Node.js application and does not live inside the customer frontend.

## 1. Project purpose

Provide a production-oriented REST API for:

- Customer authentication and accounts
- Product catalogue and categories
- Cart, wishlist, and addresses
- Orders (Cash on Delivery now; Razorpay-ready later)
- Coupons and product reviews
- Admin authentication and catalogue / order management
- Local image uploads for product media

Payment gateways (optional Razorpay), Delhivery shipping, shipping, GST, invoices, and cloud storage can be expanded later. Transactional email uses **Resend** (password reset, welcome, order confirmation, and order status updates). Shipping uses **Delhivery** when configured.

## 2. Tech stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (local) with Mongoose
- **Auth:** JWT + bcryptjs
- **Uploads:** Multer (local disk)
- **Security:** Helmet, CORS, rate limiting

## 3. Installation

From the repository root:

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` and set a strong `JWT_SECRET`. Optionally set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to bootstrap the first admin on startup.

Ensure MongoDB is running locally:

```bash
# example
mongod --dbpath /data/db
```

The default database name is `anant_exotika`.

## 4. Environment variables

| Variable | Description |
| --- | --- |
| `PORT` | API port (default `5000`) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | Local MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `JWT_EXPIRE` | Token lifetime (e.g. `7d`) |
| `CLIENT_URL` | Customer frontend origin (`http://localhost:5173`) |
| `ADMIN_URL` | Admin frontend origin (`http://localhost:5174`) |
| `UPLOAD_PATH` | Upload directory relative to `src/` (default `uploads`) |
| `ADMIN_NAME` | Optional first-admin name |
| `ADMIN_EMAIL` | Optional first-admin email (created if no admin exists) |
| `ADMIN_PASSWORD` | Optional first-admin password |
| `RAZORPAY_KEY_ID` | Optional Razorpay key id |
| `RAZORPAY_KEY_SECRET` | Optional Razorpay secret (server only) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signature secret |
| `COD_ENABLED` | `true`/`false` — global Cash on Delivery switch |
| `DELHIVERY_API_KEY` | Delhivery API token (server only) |
| `DELHIVERY_MODE` | `staging` or `production` |
| `DELHIVERY_PICKUP_NAME` | Registered Delhivery pickup / warehouse name |
| `DELHIVERY_PICKUP_PIN` | Origin pincode for rate calculation |
| `SHIPPING_FREE_THRESHOLD` | Free shipping when goods total ≥ this amount (0 disables) |
| `SHIPPING_FALLBACK_RATE` | Fallback shipping ₹ if Delhivery rate API is unavailable |
| `RESEND_API_KEY` | Resend API key for transactional email (server only) |
| `EMAIL_FROM` | Verified Resend from address, e.g. `Anant Exotika Foods <orders@yourdomain.com>` |

Never commit the real `.env` file.

Webhook endpoint: `POST /api/v1/payments/webhook` (configure in Razorpay dashboard).

## 5. How to run the development server

```bash
cd server
npm run dev
```

This starts Nodemon on `src/server.js`.

Production:

```bash
npm start
```

Create an admin manually (if not using env bootstrap):

```bash
npm run create-admin
```

## 6. API base URL

All endpoints are versioned under:

```
http://localhost:5000/api/v1/
```

Examples:

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `GET /api/v1/products`
- `GET /api/v1/categories`
- `GET /api/v1/cart`
- `POST /api/v1/orders`
- `POST /api/v1/admin/auth/login`

Send JWT tokens as:

```
Authorization: Bearer <token>
```

Customer tokens cannot access admin routes. Admin tokens cannot access customer-protected routes.

### Response format

Success:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error message",
  "errors": []
}
```

## 7. Folder structure

```
server/
├── src/
│   ├── config/          # Database connection
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, upload, errors
│   ├── models/          # Mongoose models
│   ├── routes/          # Express routers
│   ├── services/        # Pricing, coupons, uploads
│   ├── utils/           # Tokens, responses, helpers
│   ├── scripts/         # Admin bootstrap script
│   ├── uploads/         # Local product images
│   ├── app.js           # Express app configuration
│   └── server.js        # Process entry, DB, shutdown
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Health check:

```bash
curl http://localhost:5000/api/v1/health
```

If port `5000` is already in use (common on macOS because AirPlay Receiver binds to it), set `PORT=5001` in `.env` and use that URL instead.
