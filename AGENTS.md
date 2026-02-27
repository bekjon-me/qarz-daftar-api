# Qarz Daftar — Express API

This directory contains the Express.js 5 REST API built with TypeScript, Prisma, and PostgreSQL.

## Build / Lint / Test Commands

```bash
pnpm dev              # Start dev server (tsx watch, hot reload)
pnpm build            # Compile TypeScript (tsc) — run to verify no type errors
pnpm lint             # ESLint check
pnpm lint:fix         # ESLint auto-fix
pnpm format           # Prettier format
pnpm prisma:generate  # Regenerate Prisma client after schema changes
pnpm prisma:migrate   # Run database migrations
```

## Docker

```bash
docker compose up        # Start API + PostgreSQL (dev mode, hot reload via volume mounts)
docker compose restart api  # Restart API container to pick up changes
```

## Architecture — Feature-based structure

```
src/
  features/<name>/       # Each feature: routes + controller + service + schemas
  middleware/             # Express middleware (auth, error-handler, validate)
  services/              # Shared services (SMS, OTP, reCAPTCHA)
  types/                 # Shared TypeScript types
  utils/                 # Utilities (ApiError class)
  app.ts                 # Express app setup
  server.ts              # Entry point with graceful shutdown
```

New features go in `src/features/<feature-name>/` with their own routes, controller, service, and schemas files. Register routes in `app.ts`.

## Code Style

- **Semicolons**: Yes. **Quotes**: Single. **Print width**: 80. **Trailing commas**: All.
- **Module system**: ESM — all relative imports MUST include `.js` extension:
  `import { env } from '../config/env.js'`
- **File names**: kebab-case (`auth.service.ts`, `api-error.ts`)
- **Naming**: camelCase variables/functions, PascalCase classes/interfaces/types, UPPER_SNAKE_CASE env vars
- **Exports**: Named exports for services/controllers. Default exports only for route modules.
- **Types**: `interface` for object shapes, `type` for unions/intersections. No `any` without justification.
- **Prefer** `const` over `let`. Never use `var`.
- TypeScript `strict: true` is enabled — respect it.

## Error Handling

- Use the `ApiError` class for all known errors. Static factories: `ApiError.badRequest()`, `.unauthorized()`, `.forbidden()`, `.notFound()`, `.internal()`
- Throw `ApiError` from services; the global `errorHandler` middleware catches and formats them.
- Controllers: wrap logic in try/catch, call `next(error)` in catch block.
- Error messages are in **Uzbek language**.
- All responses follow: `{ success: true, data }` or `{ success: false, message, errors? }`

## Validation

- Zod v4 schemas in `<feature>.schemas.ts` — infer types with `z.output<typeof schema>`
- `validate(schema)` middleware parses `req.body`, replaces it with validated data.
- Custom reusable schemas (e.g., `uzbekPhoneSchema` normalizes to `+998XXXXXXXXX`)

## Controller Pattern

```typescript
export async function handler(req: Request, res: Response, next: NextFunction) {
  try {
    const { field } = req.body; // Already validated by zod middleware
    const result = await service.method(field);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
```

## Database

- PostgreSQL via Prisma ORM. Schema in `prisma/schema.prisma`
- DB columns: snake_case via `@map`/`@@map`. TypeScript fields: camelCase.
- UUID primary keys. Prisma client generated to `src/generated/prisma`.
- Always create a migration when changing the schema: `pnpm prisma:migrate`

## Auth Flow

- JWT Bearer tokens. API middleware in `src/middleware/auth.ts`.
- reCAPTCHA v3 verified server-side via `@valture/react-native-recaptcha-v3`.
- OTP via Eskiz SMS provider. Dev bypass code: `000000`.

## Specific Important Rules for API
1. Never commit `.env` files or secrets.
2. Business logic lives in **services**, not controllers — keep controllers thin.
3. After making API code changes, run `pnpm build` and `pnpm lint` to verify.
4. When the API runs in Docker, restart the container after code changes: `docker compose restart api`.
