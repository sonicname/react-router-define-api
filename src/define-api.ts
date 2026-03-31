import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import type {
  ActionMethod,
  ApiExports,
  ApiHandlers,
  HandlerArgs,
  MiddlewareFn,
} from './types';

/** Action methods to check for handler presence */
const ACTION_METHODS: readonly ActionMethod[] = [
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
];

/** Execute a handler through the middleware chain (onion model) */
function runMiddleware(
  middleware: MiddlewareFn[],
  args: HandlerArgs,
  handler: (args: HandlerArgs) => unknown,
): Promise<unknown> {
  let index = 0;
  const next = async (): Promise<unknown> => {
    if (index < middleware.length) {
      return middleware[index++](args, next);
    }
    return handler(args);
  };
  return next();
}

/**
 * Define HTTP method handlers for a React Router v7 route.
 * Returns `{ loader, action }` ready to export from a route module.
 *
 * @example
 * ```ts
 * export const { loader, action } = defineApi({
 *   middleware: [authMiddleware],
 *   GET: async ({ params }) => ({ user: params.id }),
 *   POST: async ({ request }) => {
 *     const body = await request.formData();
 *     return { created: true };
 *   },
 * });
 * ```
 */
export function defineApi<const H extends ApiHandlers>(
  handlers: H,
): ApiExports<H> {
  const mw = handlers.middleware ?? [];

  const loader = handlers.GET
    ? mw.length > 0
      ? (args: LoaderFunctionArgs) =>
          runMiddleware(mw, args, handlers.GET as (a: HandlerArgs) => unknown)
      : handlers.GET
    : undefined;

  const hasActionHandlers = ACTION_METHODS.some(
    (m) => handlers[m] != null,
  );

  const action = hasActionHandlers
    ? async (args: ActionFunctionArgs) => {
        const method = args.request.method.toUpperCase() as ActionMethod;
        const handler = handlers[method];
        if (typeof handler !== 'function') {
          throw new Response('Method Not Allowed', { status: 405 });
        }
        if (mw.length > 0) {
          return runMiddleware(mw, args, handler);
        }
        return handler(args);
      }
    : undefined;

  return { loader, action } as ApiExports<H>;
}
