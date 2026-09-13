# Prism E-commerce API

Backend API for an e-commerce platform built with NestJS, TypeScript, PostgreSQL, and Prisma.

The API provides authentication, user management, product and category administration, shopping carts, orders, and Stripe payments. It also supports Cloudinary image uploads and transactional order emails.

## Features

- JWT authentication with access and refresh tokens
- Role-based access control for administrators
- Product and category management
- Shopping carts and checkout workflows
- Order tracking and payment status management
- Stripe payment intents and webhook handling
- Cloudinary image storage
- Swagger/OpenAPI documentation
- Request validation, CORS, and throttling

## Requirements

- Node.js 20 or later
- npm
- PostgreSQL database
- Stripe account for payment features

## Getting started

```bash
npm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/prism_ecommerce?schema=public"
PORT=3000
CORS_ORIGIN="http://localhost:3001"

JWT_SECRET="replace-with-a-long-random-secret"
JWT_REFRESH_SECRET="replace-with-another-long-random-secret"

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

RESEND_API_KEY="re_..."
MAIL_FROM="noreply@example.com"
```

Use the credentials and URLs provided by each service. Keep `.env` out of version control.

## Database

Generate the Prisma client and apply development migrations:

```bash
npm run prisma:generate
npx prisma migrate dev
```

To inspect the database with Prisma Studio:

```bash
npx prisma studio
```

## Running the API

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run build
npm run start:prod
```

The server runs on `http://localhost:3000` by default.

## API documentation

Swagger documentation is available at `http://localhost:3000/api/docs`.

All API routes use the `/api/v1` prefix. For example:

```text
POST http://localhost:3000/api/v1/auth/login
GET  http://localhost:3000/api/v1/products
```

The `requests/` directory contains HTTP request examples for authentication, products, categories, orders, and payments. Protected routes require a JWT access token:

```text
Authorization: Bearer <access-token>
```

## Stripe webhooks

Configure Stripe to send payment events to:

```text
POST http://localhost:3000/api/v1/payments/webhook
```

Set `STRIPE_WEBHOOK_SECRET` to the signing secret for this endpoint. The application preserves the raw request body so Stripe signatures can be verified.

## Run tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Project structure

```text
src/
  common/       Shared decorators, guards, interfaces, and utilities
  modules/
    auth/       Registration, login, JWT, and refresh tokens
    users/      User profiles and administration
    products/   Product management
    category/   Category management
    cart/       Shopping carts
    orders/     Orders and tracking
    payments/   Stripe payments and webhooks
    cloudinary/ Image upload integration
    mail/       Transactional email integration
  prisma/       Prisma database service
prisma/
  schema.prisma Database schema
  migrations/   Database migrations
requests/       HTTP request examples
```

## Useful commands

```bash
npm run format
npm run lint
npm run build
```

## Built with

- [NestJS](https://nestjs.com/)
- [Prisma](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Stripe](https://stripe.com/)
- [Cloudinary](https://cloudinary.com/)
- [Resend](https://resend.com/)

