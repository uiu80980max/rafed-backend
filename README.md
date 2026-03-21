# Rafed Backend

Backend API for Rafed ERP.

## Stack
- Express
- Prisma
- PostgreSQL
- JWT Auth

## Run locally
```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:push
npm run dev
```

## Env vars
- DATABASE_URL
- JWT_SECRET
- PORT

## Endpoints
- POST /auth/register
- POST /auth/login
- GET /me
- GET /customers
- POST /customers
- GET /invoices
- POST /invoices
- GET /dashboard
