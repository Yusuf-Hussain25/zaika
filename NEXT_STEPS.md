# Zaika: next steps

The handoff file for continuing Zaika. Start a new session with:
**"Continue Zaika from NEXT_STEPS.md"**

Last updated: 20 Oct 2026 · version 2.1.0 · repo: https://github.com/Yusuf-Hussain25/zaika

---

## Where we are

Zaika 2.1 is built, tested and pushed.

- **Run:** `npm run dev` → http://localhost:5173. Site and API run on one port; the database is Neon (cloud), so nothing else needs to run. After pulling, run `npm run migrate` once (migrations 002 and 003).
- **Stack:**
  - React 19, React Router 7, Vite 8
  - Express 5 API in `server/`, mounted inside Vite in dev and served by `api/index.js` on Vercel
  - Neon Postgres with SQL migrations in `server/migrations/`
  - Razorpay (test keys in `.env`), optional Stripe
- **Design:** light-first. Tokens are in `src/index.css`, shared UI in `src/components/ui/`. Accent is saffron → chilli red (`--accent-grad`).
- **Data:** `npm run seed` creates 36 dishes (13 with options), demo accounts and about 80 orders. `DEMO_AUTOPILOT=true` moves demo orders along by itself.
- **Accounts:** emails and passwords are in `.env` (never committed).
  - Your admin login: `yusufhussain.dev@gmail.com` (password in the `.env` comment)
  - Demo customer: `VITE_DEMO_EMAIL`
  - Read-only demo admin: `VITE_DEMO_ADMIN_EMAIL`
  - Seeded admin: `admin@zaika-demo.dev` (password = `SEED_PASSWORD`)

## Done in 2.1

1. **Live delivery map** (`src/components/orders/DeliveryMap.jsx`): illustrated SVG map, rider moves with `getPointAtLength()`, "Rider is about X min away", mini map in the admin order drawer.
2. **Dish customisation** (`src/components/food/CustomiseSheet.jsx`, migration 002): half/full, spice, priced add-ons. Shared pricing in `shared/menu.js`; cart lines are dish + choice; the API rebuilds line ids and prices server-side. Admin edits options in `DishForm.jsx`.
3. **Razorpay** (`server/lib/razorpay.js`, `src/lib/razorpay.js`, migration 003): Checkout popup, HMAC signature + Razorpay API check before marking paid, automatic refunds on cancel (`server/lib/payments.js`).
4. **"Order placed" celebration** (`PlacedCelebration.jsx`): SVG check + confetti, 1.5s, skipped with reduced motion.
5. **Phone-app feel:** bottom tab bar (`TabBar.jsx`), View Transitions (`src/lib/viewTransition.js`), PWA (`public/manifest.webmanifest`, `public/sw.js`, icons in `public/icons/`).
6. **Fixes:** deep links into guarded pages keep their query string (auth readiness race fixed); refreshing an order page no longer replays the placed banner.

Checks that passed: `npm run lint`, `npm run build`, 19 API checks for options, 12 for Razorpay, a real Razorpay test payment and refund, browser flows for customise → cart → checkout, tab bar navigation, celebration, and the offline shell on `npm run preview`.

---

## Next: more UI ideas

1. Offers carousel on Home + coupon field in the cart ("You saved ₹80")
2. Ratings & reviews: stars on cards, "Rate your order" after delivery
3. Favourites (heart) + "Your usuals" row on Home
4. ⌘K search palette with dish photos and recent searches
5. Drag-and-drop between kitchen board columns
6. Admin charts: busy-hours heatmap (day × hour), sales-by-category donut
7. "Pay now" button on an unpaid Razorpay order (reopen Checkout for the same Razorpay order)

## Non-UI gaps (backlog)

- [ ] **Rotate the Razorpay test secret** (it was pasted in chat): Razorpay dashboard → Test Mode → API Keys → Regenerate, then update `.env`.
- [ ] **Razorpay webhook** (`payment.captured`, `refund.processed`) so payments confirm even if the customer never reopens the order. Needs a public URL, so do it after deploying.
- [ ] **Deploy to Vercel** for a live link. Ask first: it uploads `.env` values to Vercel. Add the Razorpay keys there too.
- [ ] **Cloudinary preset** `zaika_unsigned` (Unsigned, folder `zaika`). Until then the admin can only paste image links.
- [ ] **Commit automated tests.**
  - The API checks (options, Razorpay) and browser flows were throwaway scripts; recreate them in `tests/`.
  - Use `playwright-core` with `/usr/bin/google-chrome`.
  - Add a GitHub Actions CI workflow.
- [ ] Rate-limit login/signup; consider httpOnly cookies instead of a localStorage token.
- [ ] Forgot password and order emails (e.g. Resend free tier).
- [ ] Delivery areas (serviceable PIN codes), GST line on the bill.
- [ ] Rotate the Neon password (it was pasted in chat) and update `DATABASE_URL`.

## How to verify each change

- `npm run lint` and `npm run build` must pass.
- Screenshot every changed screen in light, dark and 390×844 mobile, and look at them.
- Run one real flow in the browser: demo customer orders → admin advances on `/admin/orders` → customer page updates.
- Commit with a short summary and a body explaining what and why, then push.
