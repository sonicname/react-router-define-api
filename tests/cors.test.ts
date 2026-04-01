import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { describe, expect, test } from 'vitest';
import { cors } from '../src/cors';
import { defineApi } from '../src/define-api';

/** Create args with optional origin and method */
function createArgs(
  method: string,
  options?: { origin?: string; requestHeaders?: string },
): LoaderFunctionArgs | ActionFunctionArgs {
  const headers: Record<string, string> = {};
  if (options?.origin) headers.origin = options.origin;
  if (options?.requestHeaders) {
    headers['access-control-request-headers'] = options.requestHeaders;
  }
  return {
    request: new Request('http://localhost/test', { method, headers }),
    params: {},
    context: {},
  } as any;
}

describe('cors middleware', () => {
  test('default options — allows any origin', async () => {
    const api = defineApi({
      middleware: [cors()],
      GET: async () => ({ ok: true }),
    });
    const result = await api.loader!(
      createArgs('GET', { origin: 'https://example.com' }),
    );
    expect(result).toEqual({ ok: true });
  });

  test('origin: true — sets wildcard', async () => {
    const mw = cors({ origin: true });
    const args = createArgs('GET', { origin: 'https://any.com' });
    const result = await mw(args, async () => new Response('ok'));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('access-control-allow-origin')).toBe('*');
  });

  test('origin: string — matches exact origin', async () => {
    const mw = cors({ origin: 'https://allowed.com' });

    const allowed = createArgs('GET', { origin: 'https://allowed.com' });
    const res1 = await mw(allowed, async () => new Response('ok'));
    expect((res1 as Response).headers.get('access-control-allow-origin')).toBe(
      'https://allowed.com',
    );

    const denied = createArgs('GET', { origin: 'https://evil.com' });
    const res2 = await mw(denied, async () => new Response('ok'));
    expect(
      (res2 as Response).headers.get('access-control-allow-origin'),
    ).toBeNull();
  });

  test('origin: array — matches multiple origins', async () => {
    const mw = cors({ origin: ['https://a.com', 'https://b.com'] });

    const args = createArgs('GET', { origin: 'https://b.com' });
    const res = await mw(args, async () => new Response('ok'));
    expect((res as Response).headers.get('access-control-allow-origin')).toBe(
      'https://b.com',
    );
  });

  test('origin: function — dynamic check', async () => {
    const mw = cors({
      origin: (o) => o.endsWith('.example.com'),
    });

    const allowed = createArgs('GET', { origin: 'https://app.example.com' });
    const res1 = await mw(allowed, async () => new Response('ok'));
    expect(
      (res1 as Response).headers.get('access-control-allow-origin'),
    ).toBe('https://app.example.com');

    const denied = createArgs('GET', { origin: 'https://evil.com' });
    const res2 = await mw(denied, async () => new Response('ok'));
    expect(
      (res2 as Response).headers.get('access-control-allow-origin'),
    ).toBeNull();
  });

  test('credentials: true — sets header', async () => {
    const mw = cors({ origin: true, credentials: true });
    const args = createArgs('GET', { origin: 'https://app.com' });
    const res = await mw(args, async () => new Response('ok'));
    expect(
      (res as Response).headers.get('access-control-allow-credentials'),
    ).toBe('true');
  });

  test('exposedHeaders — sets header', async () => {
    const mw = cors({ origin: true, exposedHeaders: ['X-Total', 'X-Page'] });
    const args = createArgs('GET', { origin: 'https://app.com' });
    const res = await mw(args, async () => new Response('ok'));
    expect(
      (res as Response).headers.get('access-control-expose-headers'),
    ).toBe('X-Total, X-Page');
  });

  test('OPTIONS preflight — returns 204 with CORS headers', async () => {
    const mw = cors({
      origin: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 3600,
    });
    const args = createArgs('OPTIONS', { origin: 'https://app.com' });
    const res = await mw(args, async () => new Response('should not reach'));
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(204);
    expect(
      (res as Response).headers.get('access-control-allow-methods'),
    ).toBe('GET, POST');
    expect(
      (res as Response).headers.get('access-control-allow-headers'),
    ).toBe('Content-Type, Authorization');
    expect((res as Response).headers.get('access-control-max-age')).toBe(
      '3600',
    );
  });

  test('OPTIONS preflight — mirrors request headers when allowedHeaders not set', async () => {
    const mw = cors({ origin: true });
    const args = createArgs('OPTIONS', {
      origin: 'https://app.com',
      requestHeaders: 'X-Custom, Authorization',
    });
    const res = await mw(args, async () => new Response('nope'));
    expect(
      (res as Response).headers.get('access-control-allow-headers'),
    ).toBe('X-Custom, Authorization');
  });

  test('non-Response result — passes through without error', async () => {
    const mw = cors({ origin: true });
    const args = createArgs('GET', { origin: 'https://app.com' });
    const result = await mw(args, async () => ({ data: 'plain object' }));
    expect(result).toEqual({ data: 'plain object' });
  });

  test('integrates with defineApi builder', async () => {
    const api = defineApi()
      .middleware([cors({ origin: 'https://app.com', credentials: true })])
      .get(async () => new Response(JSON.stringify({ ok: true })))
      .build();

    const result = await api.loader!(
      createArgs('GET', { origin: 'https://app.com' }),
    );
    expect(result).toBeInstanceOf(Response);
    expect(
      (result as Response).headers.get('access-control-allow-origin'),
    ).toBe('https://app.com');
    expect(
      (result as Response).headers.get('access-control-allow-credentials'),
    ).toBe('true');
  });
});
