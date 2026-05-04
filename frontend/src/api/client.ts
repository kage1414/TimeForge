const GRAPHQL_URL = '/graphql';

export async function gql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  if (!text) {
    throw new Error(
      `Server returned empty response (HTTP ${res.status}). The backend may be down or crashing — check backend logs.`
    );
  }
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`
    );
  }
  if (json.errors?.length) {
    const err = json.errors[0];
    if (err.extensions?.code === 'UNAUTHENTICATED') {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    throw new Error(err.message);
  }
  return json.data;
}
