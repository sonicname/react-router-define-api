import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

/** Supported HTTP methods */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Methods handled by the action export */
export type ActionMethod = Exclude<HttpMethod, 'GET'>;

/** Handler function for a given HTTP method */
export type MethodHandler<Args, R = unknown> = (args: Args) => R | Promise<R>;

/** Route handler args (union of loader and action args) */
export type HandlerArgs = LoaderFunctionArgs | ActionFunctionArgs;

/** Middleware function — call next() to proceed, or return early to short-circuit */
export type MiddlewareFn = (
  args: HandlerArgs,
  next: () => Promise<unknown>,
) => unknown | Promise<unknown>;

/** Generic schema interface — works with Zod, Valibot, ArkType, etc. */
export interface Schema<T = unknown> {
  parse(input: unknown): T;
}

/** Handler definition with optional validation schemas */
export interface HandlerDef {
  params?: Schema;
  body?: Schema;
  handler: (args: HandlerArgs & { body?: unknown }) => unknown;
}

/** A method entry is either a plain function or a validated handler config */
export type MethodEntry =
  | ((args: LoaderFunctionArgs | ActionFunctionArgs) => unknown)
  | HandlerDef;

/** Map of HTTP method handlers passed to defineApi */
export type ApiHandlers = {
  middleware?: MiddlewareFn[];
  GET?: ((args: LoaderFunctionArgs) => unknown) | HandlerDef;
  POST?: ((args: ActionFunctionArgs) => unknown) | HandlerDef;
  PUT?: ((args: ActionFunctionArgs) => unknown) | HandlerDef;
  PATCH?: ((args: ActionFunctionArgs) => unknown) | HandlerDef;
  DELETE?: ((args: ActionFunctionArgs) => unknown) | HandlerDef;
};

/** Extract the awaited return type from a handler (plain function or config) */
type HandlerReturn<T> = T extends (...args: never[]) => infer R
  ? Awaited<R>
  : T extends { handler: (...args: never[]) => infer R }
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

/** Return type of defineApi — loader/action presence and return types inferred from handlers */
export type ApiExports<H extends ApiHandlers> = {
  loader: H extends { GET: infer F }
    ? (args: LoaderFunctionArgs) => Promise<HandlerReturn<F>>
    : undefined;
  action: HasActionMethods<H> extends true
    ? (args: ActionFunctionArgs) => Promise<ActionReturn<H>>
    : undefined;
  /** Inferred return type of the GET handler */
  GetResponse: ResponseOf<H, 'GET'>;
  /** Inferred return type of the POST handler */
  PostResponse: ResponseOf<H, 'POST'>;
  /** Inferred return type of the PUT handler */
  PutResponse: ResponseOf<H, 'PUT'>;
  /** Inferred return type of the PATCH handler */
  PatchResponse: ResponseOf<H, 'PATCH'>;
  /** Inferred return type of the DELETE handler */
  DeleteResponse: ResponseOf<H, 'DELETE'>;
};
