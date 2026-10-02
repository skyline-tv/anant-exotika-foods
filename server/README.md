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

Payment gateways (optional Razorpay), Shiprocket shipping, GST, invoices, and cloud storage can be expanded later. Transactional email uses **Resend** (password reset, welcome, order confirmation, and order status updates). Shipping uses **Shiprocket** when `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD` are set.

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
| `SHIPROCKET_EMAIL` | Shiprocket API user email (server only) |
| `SHIPROCKET_PASSWORD` | Shiprocket API user password (server only) |
| `SHIPROCKET_PICKUP_LOCATION` | Pickup location nickname from the Shiprocket panel |
| `SHIPROCKET_PICKUP_PIN` | Origin pincode for serviceability and live rates |
| `SHIPROCKET_WEBHOOK_TOKEN` | Shared secret Shiprocket sends as `x-api-key` |
| `SHIPPING_FREE_THRESHOLD` | Free shipping when goods total ≥ this amount (0 disables) |
| `SHIPPING_FALLBACK_RATE` | Fallback shipping ₹ if a live Shiprocket rate is unavailable |
| `SHIPPING_ORIGIN_PIN` | Used as the pickup pincode when `SHIPROCKET_PICKUP_PIN` is empty |
| `RESEND_API_KEY` | Resend API key for transactional email (server only) |
| `EMAIL_FROM` | Verified Resend from address, e.g. `Anant Exotika <orders@yourdomain.com>` |
| `JSON_BODY_LIMIT` | JSON body limit (default `2mb`). Uploads stay at 5MB per image |
| `HTTP_REQUEST_TIMEOUT_MS` | Maximum time for one HTTP request (default `60000`) |
| `RATE_LIMIT_PUBLIC_MAX` | Storefront requests per window (default `600` / 15 min) |
| `RATE_LIMIT_AUTH_MAX` | Login and password attempts per window (default `20`) |
| `RATE_LIMIT_ORDER_MAX` | Order creation attempts per window (default `30`) |
| `SHIPROCKET_TIMEOUT_MS` | Shiprocket HTTP timeout (default `15000`) |
| `SHIPROCKET_MAX_RETRIES` | Extra attempts for timeouts, HTTP 429, and HTTP 5xx (default `2`) |
| `MONGO_MAX_POOL_SIZE` | Shared Mongo pool size (default `20`) |

Never commit the real `.env` file.

Webhook endpoints:

- Razorpay: `POST /api/v1/payments/webhook`
- Shiprocket tracking: `POST /api/v1/shipping/webhook` (header `x-api-key: <SHIPROCKET_WEBHOOK_TOKEN>`)

Shiprocket does not publish a separate sandbox host. The API base URL is `https://apiv2.shiprocket.in/v1/external`. Use a Shiprocket account and the pickup location configured in their panel.

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

Health checks:

```bash
curl http://localhost:5000/health
curl http://localhost:5000/ready
curl http://localhost:5000/api/v1/health
```

`/health` only reports that the process is up. `/ready` returns 503 until MongoDB is connected. Docker Compose in the repository root runs the API behind Nginx, with a daily MongoDB dump in a separate volume. See `deploy/backup-mongo.sh`.

Safe read-only load test (does not place orders):

```bash
LOAD_TEST_URL=http://127.0.0.1:5001 npm run load-test
```

If port `5000` is already in use (common on macOS because AirPlay Receiver binds to it), set `PORT=5001` in `.env` and use that URL instead.
