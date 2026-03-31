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
