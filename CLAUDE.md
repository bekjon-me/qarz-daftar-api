# IMPORTANT

First read ../CLAUDE.md file

# CLAUDE.md — qarz-daftar-api

## Project Overview

**qarz-daftar-api** is the REST API backend for Qarz Daftar — a credit/debt management app for small shop owners in Uzbekistan. Shop owners give items on credit (nasiya) to trusted customers, and this app replaces their paper notebooks. The mobile client is built with React Native.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5
- **Language:** TypeScript (strict mode, ESM)
- **Module:** ESM (`"type": "module"` in package.json, `NodeNext` in tsconfig)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT (Bearer token)
- **Package Manager:** pnpm

## Project Structure

This project uses a **feature-based** architecture:

```
src/
├── config/          # App configuration (env, database)
├── features/        # Feature modules (each has routes, controller, service)
│   └── auth/        # Authentication feature
│       ├── auth.routes.ts
│       ├── auth.controller.ts
│       └── auth.service.ts
├── middleware/       # Express middleware (auth, error-handler)
├── types/           # Shared TypeScript types and interfaces
├── utils/           # Shared utility functions
├── app.ts           # Express app setup (middleware, routes)
└── server.ts        # Server entry point
```

### Adding a New Feature

Create a new directory under `src/features/<feature-name>/` with:

- `<feature>.routes.ts` — Route definitions
- `<feature>.controller.ts` — Request handlers (thin; delegates to service)
- `<feature>.service.ts` — Business logic and database queries

Register routes in `src/app.ts`.

## Coding Standards

### TypeScript

- **Strict mode** is enabled — no `any` types unless unavoidable (and marked with a comment explaining why).
- Use **interfaces** for object shapes, **types** for unions/intersections.
- Prefer `const` over `let`. Never use `var`.
- Use named exports for services and controllers. Use default exports only for route modules.
- **ESM imports** must include `.js` extension for relative imports (e.g., `import { env } from '../config/env.js'`).

### Naming Conventions

- **Files:** kebab-case (`api-error.ts`, `auth.service.ts`)
- **Variables/Functions:** camelCase (`getUserById`, `authPayload`)
- **Classes:** PascalCase (`ApiError`)
- **Interfaces/Types:** PascalCase (`AuthRequest`, `ApiResponse`)
- **Database tables:** snake_case (use Prisma `@@map` and `@map`)
- **Environment variables:** UPPER_SNAKE_CASE (`JWT_SECRET`)

### API Design

- All endpoints return the standard `ApiResponse` shape:
  ```json
  { "success": true, "data": { ... } }
  { "success": false, "message": "...", "errors": ["..."] }
  ```
- Use proper HTTP status codes (201 for create, 400 for validation, 401 for auth, 404 for not found).
- Route prefix pattern: `/api/<feature>` (e.g., `/api/auth`, `/api/debts`).
- Use the `ApiError` class for all error responses — throw it from services; the error handler middleware catches it.

### Controller Pattern

Controllers should be thin:

1. Extract request data (`req.body`, `req.params`, `req.query`)
2. Call the appropriate service function
3. Return the response
4. Pass errors to `next()` via try/catch

### Service Pattern

Services contain business logic:

1. Validate business rules
2. Interact with the database via Prisma
3. Throw `ApiError` for error cases
4. Return plain data objects (not Express responses)

### Error Handling

- Use `ApiError` for known error conditions (bad request, not found, unauthorized).
- Wrap controller logic in try/catch and call `next(error)`.
- The global `errorHandler` middleware formats all error responses consistently.

## Commands

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `pnpm dev`             | Start dev server with hot reload |
| `pnpm build`           | Compile TypeScript to `dist/`    |
| `pnpm start`           | Run compiled server              |
| `pnpm lint`            | Run ESLint                       |
| `pnpm lint:fix`        | Run ESLint with auto-fix         |
| `pnpm format`          | Format code with Prettier        |
| `pnpm prisma:generate` | Generate Prisma client           |
| `pnpm prisma:migrate`  | Run database migrations          |
| `pnpm prisma:studio`   | Open Prisma Studio               |

## Review Criteria

When reviewing code changes, ensure:

1. **No `any` types** without justification
2. **All new endpoints** follow the `ApiResponse` format
3. **Business logic lives in services**, not controllers
4. **New features** are in their own directory under `src/features/`
5. **Database schema changes** include a Prisma migration
6. **Environment variables** are added to both `.env` and `.env.example`
7. **Error cases** use `ApiError` (not raw `res.status().json()`)
8. **No secrets** are committed (`.env` is gitignored)
9. **Linting passes** (`pnpm lint`)
10. **Imports** use the generated Prisma client from `src/generated/prisma`
