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
    const users = await db.users.findMany();
    return { users };
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
