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

/** Return type of defineApi — loader/action presence and return types inferred from handlers */
export type ApiExports<H extends ApiHandlers> = {
  loader: H extends { GET: infer F }
    ? (args: LoaderFunctionArgs) => Promise<HandlerReturn<F>>
    : undefined;
  action: HasActionMethods<H> extends true
    ? (args: ActionFunctionArgs) => Promise<ActionReturn<H>>
    : undefined;
};
