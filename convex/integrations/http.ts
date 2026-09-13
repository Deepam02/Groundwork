export class ProviderError extends Error {
  constructor(
    public provider: string,
    public status: number,
  ) {
    super(
      `${provider}: ${status === 429 ? 'usage limit reached' : status === 401 || status === 403 ? 'connection needs attention' : 'request failed'}.`,
    );
  }
}
export async function providerJson(
  url: string,
  key: string,
  init: RequestInit = {},
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      ...init.headers,
    },
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok)
    throw new ProviderError(
      new URL(url).hostname.includes('firecrawl') ? 'Firecrawl' : 'AgentMail',
      response.status,
    );
  return response.json();
}
