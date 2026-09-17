# ANANT EXOTIKA — Admin Panel

Professional operations dashboard for **ANANT EXOTIKA** — *Beyond Time, Beyond Luxury*.

This frontend is the store admin workspace. It is separate from the customer storefront (`store/`) and talks to the existing Node.js API in `server/`.

There is only one admin type. The panel does not include staff accounts, sub-admins, or permission roles.

## 1. Purpose

Give the store operator a clear, daily workspace to manage:

- Products and inventory
- Categories
- Orders
- Customers (derived from orders)
- Coupons
- Lightweight store settings (UI only)

## 2. Tech stack

- React 19
- Vite
- JavaScript
- React Router DOM
- Axios
- Lucide React
- Recharts (dashboard sales overview)
- CSS variables (no Bootstrap, no heavy UI kit)

## 3. Installation

From the repository root:

```bash
cd admin
npm install
cp .env.example .env
```

Edit `.env` so `VITE_API_URL` matches the running backend.

## 4. Environment variables

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend API base, including version prefix |

Example:

```
VITE_API_URL=http://localhost:5000/api/v1
```

If the backend is running on another port (common on macOS, where port `5000` may be taken), use that port instead:

```
VITE_API_URL=http://localhost:5001/api/v1
```

Do not hardcode API URLs in components. All requests go through `src/services/api.js`.

The backend CORS allowlist expects this app at `http://localhost:5174`.

## 5. Development server

```bash
cd admin
npm run dev
```

The Vite server runs on **port 5174**.

Open:

```
http://localhost:5174
```

The API server must already be running, typically:

```bash
cd server
npm run dev
```

Create an admin user from the backend if one does not exist:

```bash
cd server
npm run create-admin
```

## 6. Production build

```bash
cd admin
npm run build
npm run preview
```

`preview` also uses port `5174`.

## 7. API connection

The admin panel authenticates with:

- `POST /admin/auth/login`
- `GET /admin/auth/me`
- `POST /admin/auth/logout`

Protected requests send:

```
Authorization: Bearer <token>
```

Catalogue, orders, coupons, and uploads use the existing backend routes:

- `/products`
- `/categories`
- `/admin/orders`
- `/admin/coupons`
- `/upload/product-images`

Customer list and dashboard totals are composed from those APIs. Store settings are local UI only until a settings endpoint exists.

If a required admin API is missing, the page shows a loading, empty, or error state instead of failing silently.
