import { describe, expect, test } from 'vitest';
import {
  badRequest,
  created,
  forbidden,
  json,
  noContent,
  notFound,
  redirect,
  unauthorized,
} from '../src/response';

describe('response helpers', () => {
  test('json() — 200 with JSON body', async () => {
    const res = json({ name: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(await res.json()).toEqual({ name: 'Alice' });
  });

  test('json() — custom status and headers', async () => {
    const res = json({ ok: true }, { status: 201, headers: { 'x-id': '1' } });
    expect(res.status).toBe(201);
    expect(res.headers.get('x-id')).toBe('1');
  });

  test('created() — 201', async () => {
    const res = created({ id: 1 });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 1 });
  });

  test('noContent() — 204 empty body', () => {
    const res = noContent();
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });

  test('noContent() — custom headers', () => {
    const res = noContent({ headers: { 'x-trace': 'abc' } });
    expect(res.headers.get('x-trace')).toBe('abc');
  });

  test('redirect() — 302 by default', () => {
    const res = redirect('/login');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/login');
  });

  test('redirect() — custom status', () => {
    const res = redirect('/new-url', 301);
    expect(res.status).toBe(301);
  });

  test('badRequest() — 400', async () => {
    const res = badRequest('Invalid input');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid input' });
  });

  test('badRequest() — default message', async () => {
    const res = badRequest();
    expect(await res.json()).toEqual({ error: 'Bad Request' });
  });

  test('unauthorized() — 401', async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  test('forbidden() — 403', async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  test('notFound() — 404', async () => {
    const res = notFound('User not found');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'User not found' });
  });
});
