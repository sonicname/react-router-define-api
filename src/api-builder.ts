import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import type {
  ApiExports,
  ApiHandlers,
  HandlerDef,
  MiddlewareFn,
} from './types';

/** Loader handler — plain function or validated config */
type LoaderEntry =
  | ((args: LoaderFunctionArgs) => unknown)
  | HandlerDef;

/** Action handler — plain function or validated config */
type ActionEntry =
  | ((args: ActionFunctionArgs) => unknown)
  | HandlerDef;

/**
 * Fluent builder for defining HTTP method handlers.
 * Each method returns a new builder with updated type state.
 *
 * @example
 * ```ts
 * const api = new ApiBuilder()
 *   .get(async ({ params }) => ({ user: params.id }))
 *   .post(async ({ request }) => ({ created: true }))
 *   .build();
 * export const { loader, action } = api;
 * ```
 */
export class ApiBuilder<H extends ApiHandlers = object> {
  private handlers: ApiHandlers;

  constructor(handlers: ApiHandlers = {}) {
    this.handlers = handlers;
  }

  /** Add middleware that runs before every handler */
  middleware(fns: MiddlewareFn[]): ApiBuilder<H> {
    return new ApiBuilder<H>({
      ...this.handlers,
      middleware: [...(this.handlers.middleware ?? []), ...fns],
    });
  }

  /** Define the GET handler (becomes the loader) */
  get<F extends LoaderEntry>(handler: F): ApiBuilder<H & { GET: F }> {
    return new ApiBuilder({ ...this.handlers, GET: handler }) as ApiBuilder<
      H & { GET: F }
    >;
  }

  /** Define the POST handler */
  post<F extends ActionEntry>(handler: F): ApiBuilder<H & { POST: F }> {
    return new ApiBuilder({ ...this.handlers, POST: handler }) as ApiBuilder<
      H & { POST: F }
    >;
  }

  /** Define the PUT handler */
  put<F extends ActionEntry>(handler: F): ApiBuilder<H & { PUT: F }> {
    return new ApiBuilder({ ...this.handlers, PUT: handler }) as ApiBuilder<
      H & { PUT: F }
    >;
  }

  /** Define the PATCH handler */
  patch<F extends ActionEntry>(handler: F): ApiBuilder<H & { PATCH: F }> {
    return new ApiBuilder({ ...this.handlers, PATCH: handler }) as ApiBuilder<
      H & { PATCH: F }
    >;
  }

  /** Define the DELETE handler */
  delete<F extends ActionEntry>(handler: F): ApiBuilder<H & { DELETE: F }> {
    return new ApiBuilder({
      ...this.handlers,
      DELETE: handler,
    }) as ApiBuilder<H & { DELETE: F }>;
  }

  /** Build and return { loader, action } with response type helpers */
  build(): ApiExports<H> {
    // Import dynamically avoided — use the shared buildExports function
    // This is set by defineApi module to avoid circular imports
    return ApiBuilder._buildFn(this.handlers) as ApiExports<H>;
  }

  /** @internal — set by define-api.ts to wire up the build logic */
  static _buildFn: (handlers: ApiHandlers) => unknown;
}
