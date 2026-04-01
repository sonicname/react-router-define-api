/** Branded Response that carries the data type at compile time */
export interface TypedResponse<T = unknown> extends Response {
  readonly _type: T;
}

/** Common response init options */
type ResponseOptions = {
  headers?: Record<string, string>;
  status?: number;
};

/** 200 OK — JSON response */
export function json<T>(
  data: T,
  options?: ResponseOptions,
): TypedResponse<T> {
  return new Response(JSON.stringify(data), {
    status: options?.status ?? 200,
    headers: { 'content-type': 'application/json', ...options?.headers },
  }) as TypedResponse<T>;
}

/** 201 Created — JSON response */
export function created<T>(
  data: T,
  options?: Omit<ResponseOptions, 'status'>,
): TypedResponse<T> {
  return json(data, { ...options, status: 201 });
}

/** 204 No Content — empty response */
export function noContent(
  options?: Omit<ResponseOptions, 'status'>,
): TypedResponse<never> {
  return new Response(null, {
    status: 204,
    headers: options?.headers,
  }) as TypedResponse<never>;
}

/** 301/302 Redirect */
export function redirect(
  url: string,
  status: 301 | 302 | 303 | 307 | 308 = 302,
): TypedResponse<never> {
  return new Response(null, {
    status,
    headers: { location: url },
  }) as TypedResponse<never>;
}

/** 400 Bad Request — JSON error response */
export function badRequest<T extends string = 'Bad Request'>(
  message?: T,
  options?: Omit<ResponseOptions, 'status'>,
): TypedResponse<{ error: T }> {
  return json(
    { error: (message ?? 'Bad Request') as T },
    { ...options, status: 400 },
  );
}

/** 401 Unauthorized — JSON error response */
export function unauthorized<T extends string = 'Unauthorized'>(
  message?: T,
  options?: Omit<ResponseOptions, 'status'>,
): TypedResponse<{ error: T }> {
  return json(
    { error: (message ?? 'Unauthorized') as T },
    { ...options, status: 401 },
  );
}

/** 403 Forbidden — JSON error response */
export function forbidden<T extends string = 'Forbidden'>(
  message?: T,
  options?: Omit<ResponseOptions, 'status'>,
): TypedResponse<{ error: T }> {
  return json(
    { error: (message ?? 'Forbidden') as T },
    { ...options, status: 403 },
  );
}

/** 404 Not Found — JSON error response */
export function notFound<T extends string = 'Not Found'>(
  message?: T,
  options?: Omit<ResponseOptions, 'status'>,
): TypedResponse<{ error: T }> {
  return json(
    { error: (message ?? 'Not Found') as T },
    { ...options, status: 404 },
  );
}
