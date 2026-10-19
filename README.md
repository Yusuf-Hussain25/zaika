# Zaika

**Zaika** (ज़ायका, "taste") is a full-stack food delivery app: a customer storefront, a restaurant admin panel and a REST API on Neon Postgres.

> Work in progress: Zaika 2.0 is being rebuilt as a single React app with a new design. The API is done; the screens follow.

## Stack

| Layer | Tech |
|---|---|
| API | Node.js, Express 5, JWT auth, bcryptjs |
| Database | Neon serverless Postgres, plain SQL migrations |
| Payments | Cash on delivery, optional Stripe Checkout |

## Getting started

```bash
git clone https://github.com/Yusuf-Hussain25/zaika.git
cd zaika
npm install
cp .env.example .env      # add DATABASE_URL and JWT_SECRET
npm run migrate           # creates the tables
npm run api               # http://localhost:4000/api/health
```

## Author

Yusuf Hussain · https://github.com/Yusuf-Hussain25
