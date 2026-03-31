/** Parse request body based on Content-Type header */
export async function parseBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return request.json();
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData();
    return Object.fromEntries(formData as any);
  }

  if (contentType.includes('text/')) {
    return request.text();
  }

  throw new Response('Unsupported Media Type', { status: 415 });
}
