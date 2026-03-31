import type { ActionFunctionArgs } from 'react-router';
import type { ActionMethod, ApiExports, ApiHandlers } from './types';

/** Action methods to check for handler presence */
const ACTION_METHODS: readonly ActionMethod[] = [
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
];

/**
 * Define HTTP method handlers for a React Router v7 route.
 * Returns `{ loader, action }` ready to export from a route module.
 *
 * @example
 * ```ts
 * const api = defineApi({
 *   GET: async ({ params }) => ({ user: params.id }),
 *   POST: async ({ request }) => {
 *     const body = await request.formData();
 *     return { created: true };
 *   },
 * });
 *
 * export const loader = api.loader;
 * export const action = api.action;
 * ```
 */
export function defineApi<const H extends ApiHandlers>(
  handlers: H,
): ApiExports<H> {
  const loader = handlers.GET ?? undefined;

  const hasActionHandlers = ACTION_METHODS.some((m) => handlers[m] != null);

  const action = hasActionHandlers
    ? async (args: ActionFunctionArgs) => {
        const method = args.request.method.toUpperCase() as ActionMethod;
        const handler = handlers[method];
        if (typeof handler === 'function') {
          return handler(args);
        }
        throw new Response('Method Not Allowed', { status: 405 });
      }
    : undefined;

  return { loader, action } as ApiExports<H>;
}
