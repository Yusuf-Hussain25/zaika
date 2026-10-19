# Zaika 2.0

**Zaika** (ज़ायका, "taste") is a full-stack Indian food delivery app: a light, modern storefront with live order tracking, and a restaurant admin panel with a real-time kitchen board, all running on one Express API and Neon Postgres.

![Zaika storefront](docs/screenshots/storefront.webp)

| Kitchen dashboard | Live kitchen board |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.webp) | ![Kitchen board](docs/screenshots/kitchen-board.webp) |

## What's new in 2.0

- **One app, one command.** The separate customer site, admin site and API are now a single React 19 + Express 5 project. `npm run dev` serves everything on one port; Vercel serves it as a static site plus one serverless function.
- **Neon Postgres instead of MongoDB.** A cloud database you never have to start, with versioned SQL migrations.
- **A brand-new design.** Light-first 2026 look with Geist type, a saffron-to-chilli gradient, frosted glass and a warm aurora. Dark mode is an optional toggle.
- **Live order tracking.** Every status change is timestamped and the order page updates itself.
- **A real restaurant console.** Dashboard with KPIs and charts, a Kanban kitchen board with chimes for new orders, menu, customers and store settings.
- **Security fixes.** The original API let anyone add or delete dishes and change any order, trusted prices sent by the browser, and marked Stripe orders paid from a URL flag. All fixed (see [Security](#security)).
- **Demo data** with 36 Indian dishes and real photos, plus a read-only demo admin for portfolio visitors.

## Features

### For customers
- Menu grouped by category (biryani, North and South Indian, street food, rolls, Indo-Chinese, desserts, drinks) with search (press `/`), a veg-only switch and sorting
- Indian veg / non-veg marks on every dish, **Bestseller** badges calculated from real orders in the last 30 days, sold-out states
- Dish quick-view, quantity steppers, and a floating cart bar with a free-delivery nudge
- Guest cart that is kept and merged into your account when you sign in
- Checkout with a saved address, inline validation (phone, 6-digit PIN code), a note for the kitchen, and cash on delivery or card (Stripe, when configured)
- Order page with estimated arrival, a step-by-step timeline with real times, and automatic refresh
- Order history with cancel (until the kitchen starts cooking) and one-tap reorder
- Account page for profile, default address and theme

### For the restaurant (`/admin`)
- **Dashboard:** revenue, orders, average order value and active orders, compared with the previous 24 hours / 7 / 30 days; a 14-day revenue chart with tooltips; live orders; top dishes; orders by status
- **Kitchen board:** New → In the kitchen → On the way, one-click advance, wait-time warnings, a chime and toast for every new order, searchable history
- **Order drawer:** customer details with tap-to-call, address, note, bill, payment state and timeline; cancel with confirmation
- **Menu manager:** add and edit dishes with drag-and-drop photo upload and a live card preview, instant sold-out switch, delete with confirmation
- **Customers:** lifetime spend ranking, repeat-customer rate, top customer
- **Store settings:** open or close the kitchen (closes checkout and shows a banner), delivery fee, free-delivery threshold and delivery time

### Under the hood
- Skeleton loaders, empty and error states, toasts, disabled and loading buttons everywhere
- Responsive from 390px phones to wide desktops, keyboard focus styles, aria labels, `prefers-reduced-motion`
- Optimistic cart and stock toggles with rollback; late server replies can't overwrite newer clicks
- Database connection retries for flaky networks

## Screenshots

| | |
|---|---|
| ![Sign in](docs/screenshots/login.webp) | ![Menu](docs/screenshots/menu.webp) |
| ![Dish quick view](docs/screenshots/dish.webp) | ![Cart](docs/screenshots/cart.webp) |
| ![My orders](docs/screenshots/orders.webp) | ![Order drawer](docs/screenshots/order-drawer.webp) |
| ![Menu manager](docs/screenshots/menu-manager.webp) | ![Dish editor](docs/screenshots/dish-editor.webp) |
| ![Customers](docs/screenshots/customers.webp) | ![Store settings](docs/screenshots/settings.webp) |

| Phone | Order tracking | Dark mode |
|---|---|---|
| ![Mobile storefront](docs/screenshots/mobile-home.webp) | ![Mobile tracking](docs/screenshots/mobile-tracking.webp) | ![Dark dashboard](docs/screenshots/dark-dashboard.webp) |

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router 7, Vite 8, lucide-react icons, Sonner toasts |
| Styling | Plain CSS with design tokens (no UI framework), Geist font |
| API | Node.js, Express 5, JWT auth, bcryptjs |
| Database | Neon serverless Postgres (`@neondatabase/serverless`), SQL migrations |
| Images | Cloudinary unsigned uploads or image links |
| Payments | Cash on delivery; optional Stripe Checkout |
| Hosting | Vercel (static site + one serverless function) |

## Project structure

```
zaika/
├── api/index.js            # Vercel function: serves the Express app
├── server/
│   ├── app.js              # Express app and error handling
│   ├── db.js               # Neon client, connection retries
│   ├── migrate.js          # Runs migrations/*.sql in order
│   ├── migrations/         # 001_init.sql: users, foods, carts, orders, events, settings
│   ├── lib/                # auth & roles, validation, orders, store settings, demo autopilot
│   └── routes/             # auth, foods, cart, orders, admin, settings
├── shared/menu.js          # Categories and order statuses (used by API and UI)
├── scripts/
│   ├── migrate.mjs         # npm run migrate
│   ├── seed.mjs            # npm run seed
│   └── seed-data.mjs       # The demo menu
├── public/dishes/          # Demo dish photos (WebP) + CREDITS.md
├── src/
│   ├── index.css           # Design tokens and primitives
│   ├── lib/                # api client, theme, formatting, uploads, categories
│   ├── context/            # AuthContext, StoreContext (menu, settings, cart)
│   ├── components/         # ui/ (Logo, Avatar, Modal, Drawer, …), food/, orders/, layout/
│   └── pages/              # Home, Auth, Cart, Checkout, Orders, Account, Admin/*
├── vite.config.js          # Mounts the API inside the dev server
└── vercel.json             # /api/* → function, everything else → SPA
```

## Getting started

### Prerequisites
- Node.js 20.19 or newer
- A free [Neon](https://neon.tech) Postgres database (no credit card). Nothing runs locally besides Node.

### 1. Clone and install

```bash
git clone https://github.com/Yusuf-Hussain25/zaika.git
cd zaika
npm install
```

### 2. Configure `.env`

```bash
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Neon console → your project → **Connect** → copy the pooled `postgresql://…` string |
| `JWT_SECRET` | Any long random string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `VITE_DEMO_*`, `SEED_PASSWORD` | Passwords you choose for the demo accounts the seeder creates |
| `VITE_CLOUDINARY_*` | Optional, see [Configurable providers](#configurable-providers) |
| `STRIPE_SECRET_KEY` | Optional, Stripe → Developers → API keys (test mode) |

`.env` is git-ignored. Only `VITE_` variables reach the browser; the database URL, JWT secret and Stripe key stay on the server.

### 3. Create the tables and demo data

```bash
npm run migrate   # creates the tables (safe to re-run)
npm run seed      # menu, demo accounts and two weeks of orders
```

### 4. Run

```bash
npm run dev       # site + API on http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview` (production build with the API), `npm run lint`, `npm run api` (API alone on port 4000).

## Configurable providers

| Setting | Options |
|---|---|
| `VITE_UPLOAD_PROVIDER` | `cloudinary`: admins upload photos straight from the browser to an **unsigned** preset (no API secret in the browser). `url`: admins paste an image link. Without Cloudinary settings the app falls back to `url`. |
| `STRIPE_SECRET_KEY` | Empty: cash on delivery only, and the card option is shown as unavailable. Set: card payments through Stripe Checkout, verified on the server, with automatic refunds when a paid order is cancelled. |
| `DEMO_AUTOPILOT` | `true`: orders from `@zaika-demo.dev` customers move through the kitchen on a timer (2 min placed, 6 min preparing, 8 min on the way) and seeded customers place a new order now and then, so a public demo always looks alive. Real customers' orders are never touched. |

**Cloudinary preset:** Cloudinary console → Settings (gear) → Upload → Upload presets → **Add upload preset** → name `zaika_unsigned`, Signing mode **Unsigned**, Asset folder `zaika` → Save.

## Demo data

`npm run seed` creates, all on the `@zaika-demo.dev` domain:

| Account | Role | Password |
|---|---|---|
| `admin@zaika-demo.dev` | Admin (full access) | `SEED_PASSWORD` |
| `VITE_DEMO_ADMIN_EMAIL` | Demo admin: sees the whole panel, every change is rejected by the API, real customers' contact details are masked | `VITE_DEMO_ADMIN_PASSWORD` |
| `VITE_DEMO_EMAIL` | Demo customer with live orders and a few treats in the cart | `VITE_DEMO_PASSWORD` |
| 12 customers | Customers with addresses in Bengaluru, Mumbai, Hyderabad, Delhi and Pune | `SEED_PASSWORD` |

It also adds 36 dishes and about 80 orders over the last 14 days at lunch and dinner times, in every status. When the demo variables are set, the sign-in page shows **Explore with a demo account** and **Explore the admin panel (read-only)**.

The seeder goes through the real API (same validation, prices and permissions); SQL is used only to grant the admin roles and backdate timestamps. Re-running it reuses accounts and dishes and only tops up orders. To give your own account some orders:

```bash
npm run seed -- --with you@example.com
```

## Security

- Passwords are hashed with bcrypt; sessions are signed JWTs, and the user's role is re-read from the database on every request
- Dish, order-status and settings changes require the `admin` role; the `demo_admin` role can read the admin panel but every write returns 403
- Order totals and delivery fees are computed on the server from database prices; the browser only sends the address and payment method
- Customers can only see, cancel and reorder their own orders
- Stripe payments are confirmed by retrieving the Checkout session from Stripe, never from a URL flag
- Cash-on-delivery orders are marked paid only when delivered
- Inputs are validated server-side (emails, phone numbers, PIN codes, categories, prices, image URLs); request bodies are capped at 100 KB

## Deployment (Vercel)

1. Push the repo to GitHub and **Import** it in Vercel (framework preset: Vite).
2. Add the environment variables from `.env` in **Settings → Environment Variables** (`DATABASE_URL`, `JWT_SECRET`, the `VITE_` values, and optionally `STRIPE_SECRET_KEY`, `APP_URL`, `DEMO_AUTOPILOT`). If your Neon database was created from Vercel's Storage tab, connecting it to the project adds `DATABASE_URL` for you.
3. Deploy. `vercel.json` sends `/api/*` to the Express function in `api/index.js` and every other path to the React app.
4. Run `npm run migrate` and `npm run seed` locally against the same `DATABASE_URL` (once).

## Credits

- Demo dish photos: [Wikimedia Commons](https://commons.wikimedia.org) contributors under their free licences, listed in [`public/dishes/CREDITS.md`](public/dishes/CREDITS.md)
- Started from a MERN food-delivery tutorial project, then rebuilt as Zaika 2.0

## Author

**Yusuf Hussain** · [github.com/Yusuf-Hussain25](https://github.com/Yusuf-Hussain25)
