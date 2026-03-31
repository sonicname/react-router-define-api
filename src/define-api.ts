import type { ActionFunctionArgs } from 'react-router';
import type {
  ActionMethod,
  ApiExports,
  ApiHandlers,
  DefineApiOptions,
} from './types';

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
 * export const { loader, action } = defineApi({
 *   GET: async ({ params }) => ({ user: params.id }),
 *   POST: async ({ request }) => {
 *     const body = await request.formData();
 *     return { created: true };
 *   },
 * });
 * ```
 *
 * @example With handler wrapper
 * ```ts
 * export const { loader, action } = defineApi({
 *   GET: async () => ({ data: 'ok' }),
 * }, {
 *   handler: loaderActionHandler,
 * });
 * ```
 */
export function defineApi<const H extends ApiHandlers, W = never>(
  handlers: H,
  options?: DefineApiOptions<W>,
): ApiExports<H, W> {
  const { handler: wrapper } = options ?? {};

  const wrap = <F extends (...args: never[]) => unknown>(fn: F) =>
    wrapper ? wrapper(fn as any) : fn;

  const loader = handlers.GET ? wrap(handlers.GET) : undefined;

  const hasActionHandlers = ACTION_METHODS.some(
    (m) => handlers[m] != null,
  );

  const action = hasActionHandlers
    ? wrap(async (args: ActionFunctionArgs) => {
        const method = args.request.method.toUpperCase() as ActionMethod;
        const handler = handlers[method];
        if (typeof handler === 'function') {
          return handler(args);
        }
        throw new Response('Method Not Allowed', { status: 405 });
      })
    : undefined;

  return { loader, action } as ApiExports<H, W>;
}
