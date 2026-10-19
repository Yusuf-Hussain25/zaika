# Zaika: next steps

The handoff file for continuing Zaika. Start a new session with:
**"Continue Zaika from NEXT_STEPS.md"**

Last updated: 20 Oct 2026 · version 2.0.0 · repo: https://github.com/Yusuf-Hussain25/zaika

---

## Where we are

Zaika 2.0 is built, tested and pushed (16 commits).

- **Run:** `npm run dev` → http://localhost:5173. Site and API run on one port; the database is Neon (cloud), so nothing else needs to run.
- **Stack:**
  - React 19, React Router 7, Vite 8
  - Express 5 API in `server/`, mounted inside Vite in dev and served by `api/index.js` on Vercel
  - Neon Postgres with SQL migrations in `server/migrations/`
- **Design:** light-first. Tokens are in `src/index.css`, shared UI in `src/components/ui/`. Accent is saffron → chilli red (`--accent-grad`).
- **Data:** `npm run seed` creates 36 dishes, demo accounts and about 80 orders. `DEMO_AUTOPILOT=true` moves demo orders along by itself.
- **Accounts:** emails and passwords are in `.env` (never committed).
  - Your admin login: `yusuf@zaika-demo.dev` (password in the `.env` comment)
  - Demo customer: `VITE_DEMO_EMAIL`
  - Read-only demo admin: `VITE_DEMO_ADMIN_EMAIL`
  - Seeded admin: `admin@zaika-demo.dev` (password = `SEED_PASSWORD`)
- **Checks that passed:**
  - `npm run lint` and `npm run build`
  - 49 API checks
  - one real browser test: customer orders → admin advances → customer page updates live

---

## Next: UI showcase features (agreed plan)

Build in this order, one commit each, then screenshots and a README update.

### 1. Live delivery map on order tracking
- New `src/components/orders/DeliveryMap.jsx`, shown on `src/pages/Orders/OrderDetail.jsx` while the status is `out_for_delivery`.
- Use an illustrated SVG map: soft streets and blocks in theme colours, a kitchen pin and a home pin, and a curved route.
- The rider icon moves along the route with `getPointAtLength()`. Its progress = time since the `out_for_delivery` event ÷ remaining ETA (`settings.etaMinutes`), capped at 95% until delivered.
- No map API or key needed. Respect `prefers-reduced-motion`: place the rider at its position without animating.
- Show "Rider is ~X min away" under the map and a mini map in the admin order drawer.

### 2. Dish customisation sheet
- Tapping **Add** on dishes that have options opens a bottom sheet (reuse `Modal`; it already becomes a sheet under 560px):
  - spice level (mild / medium / hot)
  - portion (half / full) where it applies
  - add-ons with prices (extra raita +₹30, butter naan +₹59, …)
  - a live price total
- **Data:** add a migration `002_dish_options.sql` with `foods.options jsonb`. Seed options for biryanis, curries and rolls.
- **Cart:** the cart key becomes a *line* (food + chosen options), not just `foodId`. This touches:
  - `cart_items`: add `options jsonb` and a line id
  - `server/routes/cart.js` and `server/routes/orders.js`: price = base + add-ons, computed server-side
  - `order_items.options`
  - `StoreContext` cart shape
- Show the chosen options in the cart, checkout, order page and kitchen tickets.
- **Admin:** edit options in `src/pages/Admin/DishForm.jsx`.
- Keep the security rule: **never trust prices from the browser.**

### 3. "Order placed" celebration
- After checkout, `OrderDetail` receives `state.placed`. Replace the green banner with a full-screen moment: an animated check drawn with SVG stroke, a light confetti burst, then fade into tracking.
- Use CSS/SVG only (no library), keep it under 1.5s, and skip it with `prefers-reduced-motion`.

### 4. Phone-app feel
- **Bottom tab bar** under 640px: Home, Search, Cart (with badge), Orders, Account. Add it in `src/components/layout/SiteLayout.jsx`; hide the top nav links on phones.
- **Search tab:** focuses the menu search, or opens a full-screen search.
- **Page transitions:** use the View Transitions API (`document.startViewTransition`) on route changes, with a fade/slide fallback.
- **PWA:**
  - `public/manifest.webmanifest` with Zaika name, icons (from the logo mark) and theme colour `#fbf8f4`
  - `<link rel="manifest">` in `index.html`
  - a small service worker that caches the app shell and `/dishes/*.webp`, never `/api/*`
- Keep the floating cart bar above the tab bar.

### After the four features
- Retake screenshots into `docs/screenshots/` (light, dark, 390×844 mobile), add the new ones to the README, and add "What's new in 2.1".
- Bump the version to 2.1.0, commit, push, and confirm with `git status -sb`.

---

## More UI ideas (later)

5. Offers carousel on Home + coupon field in the cart ("You saved ₹80")
6. Ratings & reviews: stars on cards, "Rate your order" after delivery
7. Favourites (heart) + "Your usuals" row on Home
8. ⌘K search palette with dish photos and recent searches
9. Drag-and-drop between kitchen board columns
10. Admin charts: busy-hours heatmap (day × hour), sales-by-category donut

## Non-UI gaps (backlog)

- [ ] **Deploy to Vercel** for a live link. Ask first: it uploads `.env` values to Vercel.
- [ ] **Cloudinary preset** `zaika_unsigned` (Unsigned, folder `zaika`). Until then the admin can only paste image links.
- [ ] **Commit automated tests.**
  - The API test (49 checks) and the end-to-end browser test were throwaway scripts; recreate them in `tests/`.
  - Use `playwright-core` with `/usr/bin/google-chrome`.
  - Add a GitHub Actions CI workflow.
- [ ] **Stripe:** add a test key and a webhook (`checkout.session.completed`) so paid orders confirm even if the customer closes the tab.
- [ ] Rate-limit login/signup; consider httpOnly cookies instead of a localStorage token.
- [ ] Forgot password and order emails (e.g. Resend free tier).
- [ ] Delivery areas (serviceable PIN codes), GST line on the bill.
- [ ] Rotate the Neon password (it was pasted in chat) and update `DATABASE_URL`.

## How to verify each change

- `npm run lint` and `npm run build` must pass.
- Screenshot every changed screen in light, dark and 390×844 mobile, and look at them.
- Run one real flow in the browser: demo customer orders → admin advances on `/admin/orders` → customer page updates.
- Commit with a short summary and a body explaining what and why, then push.
