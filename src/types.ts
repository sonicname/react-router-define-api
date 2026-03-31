import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

/** Supported HTTP methods */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Methods handled by the action export */
export type ActionMethod = Exclude<HttpMethod, 'GET'>;

/** Handler function for a given HTTP method */
export type MethodHandler<Args, R = unknown> = (args: Args) => R | Promise<R>;

/** Map of HTTP method handlers passed to defineApi */
export type ApiHandlers = {
  GET?: (args: LoaderFunctionArgs) => unknown;
  POST?: (args: ActionFunctionArgs) => unknown;
  PUT?: (args: ActionFunctionArgs) => unknown;
  PATCH?: (args: ActionFunctionArgs) => unknown;
  DELETE?: (args: ActionFunctionArgs) => unknown;
};

/** Extract the awaited return type from a handler */
type HandlerReturn<T> = T extends (...args: never[]) => infer R
  ? Awaited<R>
  : never;

/** Checks if handler map includes any action methods */
type HasActionMethods<H> =
  'POST' extends keyof H
    ? true
    : 'PUT' extends keyof H
      ? true
      : 'PATCH' extends keyof H
        ? true
        : 'DELETE' extends keyof H
          ? true
          : false;

/** Build union return type from all defined action handlers */
type ActionReturn<H> =
  | (H extends { POST: infer F } ? HandlerReturn<F> : never)
  | (H extends { PUT: infer F } ? HandlerReturn<F> : never)
  | (H extends { PATCH: infer F } ? HandlerReturn<F> : never)
  | (H extends { DELETE: infer F } ? HandlerReturn<F> : never);

/** Extract response type for a specific method, or never if not defined */
type ResponseOf<H, M extends HttpMethod> = H extends Record<M, infer F>
  ? HandlerReturn<F>
  : never;

/**
 * Higher-order function that wraps each method handler.
 * Receives the original handler and returns a new handler with transformed behavior.
 *
 * @example
 * ```ts
 * const loaderActionHandler: HandlerWrapper<BaseResponse<unknown>> =
 *   (fn) => async (args) => {
 *     try {
 *       const result = await fn(args);
 *       return { success: true, status: 200, data: result };
 *     } catch (error) {
 *       return { success: false, status: 500, message: String(error) };
 *     }
 *   };
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HandlerWrapper<W = unknown> = (fn: (...args: any[]) => any) => (...args: any[]) => Promise<W>;

/** Options for defineApi */
export interface DefineApiOptions<W = never> {
  /** Higher-order function to wrap all method handlers (e.g. for error handling, response transformation) */
  handler?: HandlerWrapper<W>;
}

/** Apply wrapper type: if wrapper is provided, use its return type; otherwise use the raw handler return */
type WithWrapper<R, W> = [W] extends [never] ? R : Awaited<W>;

/** Return type of defineApi — loader/action presence and return types inferred from handlers */
export type ApiExports<H extends ApiHandlers, W = never> = {
  loader: H extends { GET: infer F }
    ? (args: LoaderFunctionArgs) => Promise<WithWrapper<HandlerReturn<F>, W>>
    : undefined;
  action: HasActionMethods<H> extends true
    ? (
        args: ActionFunctionArgs,
      ) => Promise<WithWrapper<ActionReturn<H>, W>>
    : undefined;
  /** Inferred return type of the GET handler */
  GetResponse: WithWrapper<ResponseOf<H, 'GET'>, W>;
  /** Inferred return type of the POST handler */
  PostResponse: WithWrapper<ResponseOf<H, 'POST'>, W>;
  /** Inferred return type of the PUT handler */
  PutResponse: WithWrapper<ResponseOf<H, 'PUT'>, W>;
  /** Inferred return type of the PATCH handler */
  PatchResponse: WithWrapper<ResponseOf<H, 'PATCH'>, W>;
  /** Inferred return type of the DELETE handler */
  DeleteResponse: WithWrapper<ResponseOf<H, 'DELETE'>, W>;
};
