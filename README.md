# react-router-define-api

Define HTTP method handlers for React Router v7 routes — no more manual `request.method` checks.

## Install

```bash
npm install react-router-define-api
```

**Peer dependency:** `react-router@^7.0.0`

## Usage

```ts
// app/routes/api.users.ts
import { defineApi } from 'react-router-define-api';

export const { loader, action } = defineApi({
  GET: async ({ params }) => {
    return { users: await db.users.findMany() };
  },
  POST: async ({ request }) => {
    const body = await request.formData();
    return { user: await db.users.create({ name: body.get('name') }) };
  },
  DELETE: async ({ params }) => {
    await db.users.delete(params.id);
    return { deleted: true };
  },
});
```

### Builder API

Prefer a fluent style? Call `defineApi()` with no arguments to get a chainable builder:

```ts
import { defineApi } from 'react-router-define-api';

export const { loader, action } = defineApi()
  .middleware([auth, logger])
  .get(async ({ params }) => {
    return { user: await db.users.find(params.id) };
  })
  .post(async ({ request }) => {
    const body = await request.formData();
    return { user: await db.users.create({ name: body.get('name') }) };
  })
  .delete(async ({ params }) => {
    await db.users.delete(params.id);
    return { deleted: true };
  })
  .build();
```

Available methods: `.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`, `.middleware()`, `.build()`. Each accepts plain functions or validated handler configs:

```ts
export const { loader, action } = defineApi()
  .middleware([auth, logger])
  .get({
    params: z.object({ id: z.string().uuid() }),
    handler: async ({ params }) => {
      return { user: await db.users.find(params.id) };
    },
  })
  .post({
    body: z.object({ name: z.string() }),
    handler: async ({ body }) => {
      return { user: await db.users.create(body) };
    },
  })
  .delete({
    params: z.object({ id: z.string() }),
    handler: async ({ params }) => {
      await db.users.delete(params.id);
      return { deleted: true };
    },
  })
  .build();
```

### How it works

- `GET` → `loader`
- `POST`, `PUT`, `PATCH`, `DELETE` → dispatched inside `action` by `request.method`
- Undefined methods → `405 Method Not Allowed`

### Middleware

Add middleware that runs before every handler. Middleware uses the onion model — call `next()` to proceed, or return early to short-circuit.

```ts
import type { MiddlewareFn } from 'react-router-define-api';

const auth: MiddlewareFn = async (args, next) => {
  const token = args.request.headers.get('Authorization');
  if (!token) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return next();
};

const logger: MiddlewareFn = async (args, next) => {
  console.log(`${args.request.method} ${args.request.url}`);
  return next();
};

export const { loader, action } = defineApi({
  middleware: [auth, logger],
  GET: async ({ params }) => ({ user: params.id }),
  POST: async ({ request }) => {
    const body = await request.formData();
    return { created: true };
  },
});
```

Middleware executes in array order. Each middleware can:

- **Pass through** — call `next()` and return its result
- **Short-circuit** — return a value without calling `next()`
- **Transform** — call `next()`, modify the result, then return it

### CORS

Built-in CORS middleware factory — handles preflight `OPTIONS` requests and sets headers on all responses:

```ts
import { cors, defineApi } from 'react-router-define-api';

export const { loader, action } = defineApi({
  middleware: [
    cors({
      origin: 'https://myapp.com',       // string, array, function, or true (any)
      credentials: true,                  // Access-Control-Allow-Credentials
      methods: ['GET', 'POST', 'DELETE'], // Access-Control-Allow-Methods
      allowedHeaders: ['Authorization'],  // Access-Control-Allow-Headers
      exposedHeaders: ['X-Total-Count'],  // Access-Control-Expose-Headers
      maxAge: 3600,                       // preflight cache (seconds, default: 86400)
    }),
  ],
  GET: async () => ({ users: [] }),
  POST: async () => ({ created: true }),
});
```

| Option | Type | Default | Description |
| --------------- | ----------------------------------------------------------------- | --------------- | ----------------------------- |
| `origin` | `boolean \| string \| string[] \| (origin: string) => boolean` | `true` | Allowed origins |
| `credentials` | `boolean` | `false` | Allow cookies/auth headers |
| `methods` | `string[]` | — | Allowed methods for preflight |
| `allowedHeaders` | `string[]` | mirrors request | Allowed request headers |
| `exposedHeaders` | `string[]` | — | Headers exposed to browser |
| `maxAge` | `number` | `86400` | Preflight cache duration (s) |

### Request validation

Validate params and body using any schema library with a `.parse()` method (Zod, Valibot, ArkType, etc.). Pass a handler config object instead of a plain function:

```ts
import { z } from 'zod';

export const { loader, action } = defineApi({
  GET: {
    params: z.object({ id: z.string().uuid() }),
    handler: async ({ params }) => {
      return { user: await db.users.find(params.id) };
    },
  },
  POST: {
    body: z.object({ name: z.string(), email: z.string().email() }),
    handler: async ({ body }) => {
      return { user: await db.users.create(body) };
    },
  },
  PUT: {
    params: z.object({ id: z.string() }),
    body: z.object({ name: z.string() }),
    handler: async ({ params, body }) => {
      return { user: await db.users.update(params.id, body) };
    },
  },
});
```

- **`params`** — validates `args.params` (route path parameters)
- **`body`** — auto-parses the request body based on `Content-Type`, then validates:
  - `application/json` → `request.json()`
  - `application/x-www-form-urlencoded` / `multipart/form-data` → `request.formData()`
  - `text/*` → `request.text()`
  - Other → `415 Unsupported Media Type`
- Validation failure → `400` response with error details
- Plain functions and handler configs can be mixed in the same `defineApi` call

### Response helpers

Utility functions for error and special HTTP responses — no more manual `new Response(...)`.

Return **plain objects** for normal success responses (preserves type inference for `GetResponse`, `PostResponse`, etc.). Use helpers when you need specific status codes or headers:

```ts
import { created, noContent, notFound } from 'react-router-define-api';

export const { loader, action } = defineApi({
  GET: async () => ({ users: await db.users.findMany() }), // plain object → type inference works
  POST: async () => created({ id: 1 }),                    // 201 Created
  DELETE: async ({ params }) => {
    const user = await db.users.find(params.id);
    if (!user) return notFound('User not found');           // 404
    await db.users.delete(params.id);
    return noContent();                                     // 204
  },
});
```

| Helper | Status | Body |
| ---------------- | ------ | ----------------------------- |
| `json(data)` | 200 | JSON (custom status via opts) |
| `created(data)` | 201 | JSON |
| `noContent()` | 204 | empty |
| `redirect(url)` | 302 | empty (301/303/307/308 opts) |
| `badRequest()` | 400 | `{ error: message }` |
| `unauthorized()` | 401 | `{ error: message }` |
| `forbidden()` | 403 | `{ error: message }` |
| `notFound()` | 404 | `{ error: message }` |

All helpers accept optional `headers` for custom response headers.

### Response type helpers

Access inferred response types for client-side fetchers or shared contracts:

```ts
const api = defineApi({
  GET: async ({ params }) => ({ id: params.id, name: 'John' }),
  POST: async () => ({ created: true }),
});

export const { loader, action } = api;

type GetRes = typeof api.GetResponse;
// → { id: string | undefined; name: string }

type PostRes = typeof api.PostResponse;
// → { created: boolean }
```

These are **type-only** — zero runtime cost. Undefined methods resolve to `never`.

## License

MIT
