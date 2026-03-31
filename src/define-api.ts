import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { ApiBuilder } from './api-builder';
import { parseBody } from './parse-body';
import type {
  ActionMethod,
  ApiExports,
  ApiHandlers,
  HandlerArgs,
  HandlerDef,
  MethodEntry,
  MiddlewareFn,
} from './types';

/** Action methods to check for handler presence */
const ACTION_METHODS: readonly ActionMethod[] = [
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
];

/** Check if a method entry is a handler config (not a plain function) */
function isHandlerDef(entry: MethodEntry): entry is HandlerDef {
  return typeof entry === 'object' && 'handler' in entry;
}

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

/** Wrap a method entry with validation, returning a plain handler function */
function wrapWithValidation(
  entry: MethodEntry,
): (args: HandlerArgs) => unknown {
  if (!isHandlerDef(entry)) return entry;

  const { params: paramsSchema, body: bodySchema, handler } = entry;

  return async (args: HandlerArgs) => {
    let validatedParams: unknown = args.params;
    if (paramsSchema) {
      try {
        validatedParams = paramsSchema.parse(args.params);
      } catch (error) {
        throw new Response(
          JSON.stringify({ error: 'Validation failed', details: error }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        );
      }
    }

    let body: unknown;
    if (bodySchema) {
      const raw = await parseBody(args.request);
      try {
        body = bodySchema.parse(raw);
      } catch (error) {
        throw new Response(
          JSON.stringify({ error: 'Validation failed', details: error }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        );
      }
    }

    const handlerArgs = {
      ...args,
      params: validatedParams,
      ...(bodySchema ? { body } : {}),
    };
    return handler(handlerArgs as HandlerArgs & { body?: unknown });
  };
}

/** Shared build logic — converts ApiHandlers to { loader, action } */
function buildExports<H extends ApiHandlers>(handlers: H): ApiExports<H> {
  const mw = handlers.middleware ?? [];

  const getEntry = handlers.GET;
  const getHandler = getEntry ? wrapWithValidation(getEntry) : undefined;

  const loader = getHandler
    ? mw.length > 0
      ? (args: LoaderFunctionArgs) => runMiddleware(mw, args, getHandler)
      : getHandler
    : undefined;

  const hasActionHandlers = ACTION_METHODS.some(
    (m) => handlers[m] != null,
  );

  const action = hasActionHandlers
    ? async (args: ActionFunctionArgs) => {
        const method = args.request.method.toUpperCase() as ActionMethod;
        const entry = handlers[method];
        if (entry == null) {
          throw new Response('Method Not Allowed', { status: 405 });
        }
        const handler = wrapWithValidation(entry);
        if (mw.length > 0) {
          return runMiddleware(mw, args, handler);
        }
        return handler(args);
      }
    : undefined;

  return { loader, action } as ApiExports<H>;
}

/** Wire up the builder's build() method */
ApiBuilder._buildFn = buildExports;

/**
 * Define HTTP method handlers for a React Router v7 route.
 *
 * **Object style** — pass all handlers at once:
 * ```ts
 * export const { loader, action } = defineApi({
 *   GET: async ({ params }) => ({ user: params.id }),
 *   POST: async ({ request }) => ({ created: true }),
 * });
 * ```
 *
 * **Builder style** — chain methods fluently:
 * ```ts
 * export const { loader, action } = defineApi()
 *   .get(async ({ params }) => ({ user: params.id }))
 *   .post(async ({ request }) => ({ created: true }))
 *   .build();
 * ```
 */
export function defineApi(): ApiBuilder;
export function defineApi<const H extends ApiHandlers>(
  handlers: H,
): ApiExports<H>;
export function defineApi<const H extends ApiHandlers>(
  handlers?: H,
): ApiExports<H> | ApiBuilder {
  if (handlers === undefined) {
    return new ApiBuilder();
  }
  return buildExports(handlers);
}
