# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev          # nest start --watch (needs Postgres: docker compose up -d)
npm run build              # nest build -> dist/
npm run lint               # eslint --fix over src, test
npm run format             # prettier --write
npm test                   # jest unit tests (*.spec.ts under src/)
npx jest path/to/file.spec.ts            # single test file
npx jest -t "test name"                  # single test by name
npm run test:e2e           # jest --config test/jest-e2e.json
npx prisma db push         # local schema sync (README flow for first run)
npx prisma migrate dev     # create a new migration after editing prisma/schema.prisma
npm run start:prod         # `prisma migrate deploy` then node dist/main.js
```

Local env (`.env`): `DATABASE_URL`, `JWT_SECRET`, `PORT` (8080), `NODE_ENV`, `ALLOWED_ORIGINS`. `MASTER_API_KEY` is required for master-key-guarded routes.

## Architecture

NestJS 10 + Prisma 6 (PostgreSQL) backend for "Mara Studio", a multi-tenant salon/beauty shop system (UI strings and errors are in Spanish). Deployed to Fly.io (`fly.toml`, app `dukarmo`) via the `Dockerfile`, whose `CMD` runs `npm run start:prod` so migrations are applied on boot.

**Multi-tenancy:** everything hangs off `Shop`. The JWT payload carries `shopId`; `JwtStrategy.validate` exposes `{ id, email, rol, shopId }` as `req.user`, and services scope every query by `user.shopId` (e.g. `products.service.ts` checks that related categories belong to the shop before writing). Keep new queries shop-scoped and soft-delete aware (`deletedAt: null`).

**Three auth mechanisms** (`src/auth/`):
- `JwtAuthGuard` — staff/admin API; token read from `Authorization: Bearer` or the `token` cookie.
- `PublicShopGuard` — public storefront endpoints; validates `x-shop-id` + `x-public-key` headers against `Shop.publicApiKey` and sets `request.publicShopId`. Used on `public/*` routes (e.g. `products/public/all`, `products/public/:id`) alongside JWT routes in the same controller.
- `MasterKeyGuard` — `x-api-key` header compared to `MASTER_API_KEY`.

**Module layout:** feature folders under `src/` (`orders`, `scheduled-orders`, `treatments`, `products`, `product-categories`, `user-schedules`, `dashboard`, ...) each with controller/service/`dto`. Note `AppModule` registers some controllers/services directly (orders, shop, dashboard, users) rather than only via feature modules. Global `ValidationPipe` (`transform`, `whitelist`, implicit conversion) and `GlobalExceptionFilter` (`src/common/filters`) are set in `main.ts`; CORS origins come from `ALLOWED_ORIGINS` plus localhost dev ports when `NODE_ENV=development`, and custom headers (`x-shop-id`, `x-public-key`) must be listed in `allowedHeaders` there.

**Realtime/integrations:** `OrdersGateway` (socket.io) pushes order events; `fcm` + `services/notification.service.ts` for push notifications; `email` (SES/nodemailer + handlebars), `pdf` (pdfkit/wkhtmltopdf), RENIEC lookup config in `src/config/reniec.config.ts`.

**Data model** (`prisma/schema.prisma`): Shop, User (Role enum), Client, Treatment/TreatmentCategory, UserTreatment, UserSchedule(+Exception), Order/OrderTreatment, ScheduledOrder(+Treatment, with status/source enums), and the product catalog (ProductCategory, Product, ProductVariant with stock). Schema changes must ship with a migration in `prisma/migrations/`.

## Gotchas

- Imports mix relative paths and `src/...` absolute paths (e.g. `src/auth/public-shop.guard`); `src/` absolute imports work via tsconfig baseUrl.
- `run-prod-sql.ts` is an untracked ad-hoc script that runs SQL from stdin against `PROD_DATABASE_URL` — it touches production; don't commit or run it casually.
- Dockerfile uses `node:18-alpine` while `package.json` engines says Node 20.x.
