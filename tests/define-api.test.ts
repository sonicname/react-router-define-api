import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { describe, expect, test } from 'vitest';
import { defineApi } from '../src/define-api';

/** Create loader/action args with a real Request object */
function createArgs(
  method: string,
  params: Record<string, string> = {},
): LoaderFunctionArgs | ActionFunctionArgs {
  return {
    request: new Request('http://localhost/test', { method }),
    params,
    context: {},
  } as any; // Type assertion since we're only using a subset of the full args
}

describe('defineApi', () => {
  test('GET handler is returned as loader', async () => {
    const api = defineApi({
      GET: async () => ({ data: 'hello' }),
    });
    expect(api.loader).toBeDefined();
    expect(api.action).toBeUndefined();
    const result = await api.loader!(createArgs('GET'));
    expect(result).toEqual({ data: 'hello' });
  });

  test('POST handler dispatched via action', async () => {
    const api = defineApi({
      POST: async () => ({ created: true }),
    });
    expect(api.action).toBeDefined();
    expect(api.loader).toBeUndefined();
    const result = await api.action!(createArgs('POST'));
    expect(result).toEqual({ created: true });
  });

  test('dispatches to correct action method', async () => {
    const api = defineApi({
      POST: async () => 'post',
      PUT: async () => 'put',
      DELETE: async () => 'delete',
    });
    expect(await api.action!(createArgs('POST'))).toBe('post');
    expect(await api.action!(createArgs('PUT'))).toBe('put');
    expect(await api.action!(createArgs('DELETE'))).toBe('delete');
  });

  test('throws 405 for undefined action method', async () => {
    const api = defineApi({
      POST: async () => 'ok',
    });
    try {
      await api.action!(createArgs('DELETE'));
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(405);
    }
  });

  test('all methods defined', async () => {
    const api = defineApi({
      GET: async () => 'get',
      POST: async () => 'post',
      PUT: async () => 'put',
      PATCH: async () => 'patch',
      DELETE: async () => 'delete',
    });
    expect(api.loader).toBeDefined();
    expect(api.action).toBeDefined();
    expect(await api.loader!(createArgs('GET'))).toBe('get');
    expect(await api.action!(createArgs('PATCH'))).toBe('patch');
  });

  test('empty handlers returns undefined loader and action', () => {
    const api = defineApi({});
    expect(api.loader).toBeUndefined();
    expect(api.action).toBeUndefined();
  });

  test('params are passed to handler', async () => {
    const api = defineApi({
      GET: async ({ params }) => ({ id: params.id }),
    });
    const result = await api.loader!(createArgs('GET', { id: '42' }));
    expect(result).toEqual({ id: '42' });
  });

  test('request object is accessible in handler', async () => {
    const api = defineApi({
      POST: async ({ request }) => ({
        method: request.method,
        url: request.url,
      }),
    });
    const result = await api.action!(createArgs('POST'));
    expect(result).toEqual({ method: 'POST', url: 'http://localhost/test' });
  });

  test('sync handlers work', () => {
    const api = defineApi({
      GET: ({ params }) => ({ id: params.id }),
    });
    const result = api.loader!(createArgs('GET', { id: '1' }));
    expect(result).toEqual({ id: '1' });
  });
});
