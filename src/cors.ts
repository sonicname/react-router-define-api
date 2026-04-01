import type { MiddlewareFn } from './types';

/** CORS configuration options */
export interface CorsOptions {
  /** Allowed origins — `true` for any, string for single, array for multiple, or function for dynamic */
  origin?: boolean | string | string[] | ((origin: string) => boolean);
  /** Allowed HTTP methods (defaults to defined handler methods) */
  methods?: string[];
  /** Allowed request headers */
  allowedHeaders?: string[];
  /** Headers exposed to the browser */
  exposedHeaders?: string[];
  /** Allow credentials (cookies, auth headers) */
  credentials?: boolean;
  /** Preflight cache duration in seconds (default: 86400 = 24h) */
  maxAge?: number;
}

/** Resolve whether the request origin is allowed */
function isOriginAllowed(
  requestOrigin: string,
  option: CorsOptions['origin'],
): boolean {
  if (option === true) return true;
  if (option === false || option == null) return false;
  if (typeof option === 'string') return option === requestOrigin;
  if (Array.isArray(option)) return option.includes(requestOrigin);
  return option(requestOrigin);
}

/**
 * CORS middleware factory — returns a MiddlewareFn that handles
 * CORS headers and OPTIONS preflight requests.
 *
 * @example
 * ```ts
 * defineApi({
 *   middleware: [cors({ origin: 'https://example.com', credentials: true })],
 *   GET: async () => ({ data: 'hello' }),
 * });
 * ```
 */
export function cors(options: CorsOptions = {}): MiddlewareFn {
  const {
    methods,
    allowedHeaders,
    exposedHeaders,
    credentials = false,
    maxAge = 86400,
  } = options;

  return async (args, next) => {
    const requestOrigin = args.request.headers.get('origin') ?? '';
    const allowed = isOriginAllowed(requestOrigin, options.origin ?? true);

    const corsHeaders = new Headers();

    if (allowed) {
      corsHeaders.set(
        'access-control-allow-origin',
        options.origin === true ? '*' : requestOrigin,
      );
    }

    if (credentials) {
      corsHeaders.set('access-control-allow-credentials', 'true');
    }

    if (exposedHeaders?.length) {
      corsHeaders.set(
        'access-control-expose-headers',
        exposedHeaders.join(', '),
      );
    }

    // Preflight request — respond immediately
    if (args.request.method === 'OPTIONS') {
      if (methods?.length) {
        corsHeaders.set(
          'access-control-allow-methods',
          methods.join(', '),
        );
      }

      if (allowedHeaders?.length) {
        corsHeaders.set(
          'access-control-allow-headers',
          allowedHeaders.join(', '),
        );
      } else {
        // Mirror the request's Access-Control-Request-Headers
        const requestedHeaders = args.request.headers.get(
          'access-control-request-headers',
        );
        if (requestedHeaders) {
          corsHeaders.set('access-control-allow-headers', requestedHeaders);
        }
      }

      corsHeaders.set('access-control-max-age', String(maxAge));

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Normal request — call next, then attach CORS headers to response
    const result = await next();

    if (result instanceof Response) {
      corsHeaders.forEach((value, key) => {
        result.headers.set(key, value);
      });
      return result;
    }

    // Non-Response result — return as-is (headers added at framework level)
    return result;
  };
}
