# @sonicname/define-api

Define HTTP method handlers for React Router v7 routes — no more manual `request.method` checks.

## Install

```bash
npm install @sonicname/define-api
```

**Peer dependency:** `react-router@^7.0.0`

## Usage

```ts
// app/routes/api.users.ts
import { defineApi } from '@sonicname/define-api';

const api = defineApi({
  GET: async ({ params }) => {
    const users = await db.users.findMany();
    return { users };
  },
  POST: async ({ request }) => {
    const body = await request.formData();
    const user = await db.users.create({ name: body.get('name') });
    return { user };
  },
  DELETE: async ({ params }) => {
    await db.users.delete(params.id);
    return { deleted: true };
  },
});

export const loader = api.loader;
export const action = api.action;
```

### How it works

- `GET` handler → exported as `loader`
- `POST`, `PUT`, `PATCH`, `DELETE` handlers → dispatched inside `action` by `request.method`
- Undefined methods return a `405 Method Not Allowed` response

### All methods

```ts
const api = defineApi({
  GET: async (args) => {
    /* ... */
  },
  POST: async (args) => {
    /* ... */
  },
  PUT: async (args) => {
    /* ... */
  },
  PATCH: async (args) => {
    /* ... */
  },
  DELETE: async (args) => {
    /* ... */
  },
});
```

## API

### `defineApi(handlers)`

| Parameter  | Type          | Description                              |
| ---------- | ------------- | ---------------------------------------- |
| `handlers` | `ApiHandlers` | Map of HTTP methods to handler functions |

Returns `{ loader, action }` — each is `undefined` if no relevant methods are defined.

Handler args are the same as React Router's `LoaderFunctionArgs` / `ActionFunctionArgs`:

- `request` — the incoming `Request` object
- `params` — route parameters
- `context` — app context

## TypeScript

Full type inference — return types are inferred from your handler functions.

```ts
const api = defineApi({
  GET: async ({ params }) => ({ id: params.id, name: 'John' }),
});

// api.loader return type is inferred as { id: string, name: string }
// api.action is undefined (no action methods defined)
```

## License

MIT
