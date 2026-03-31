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
