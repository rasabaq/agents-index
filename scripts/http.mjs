// Shared by the refresh scripts: a fetch that retries 429 and 5xx a few times and fails on any other error status.
export async function get(url, headers = {}) {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: { 'user-agent': 'ai-agent-observatory', ...headers }, signal: AbortSignal.timeout(30000) });
    if ((res.status === 429 || res.status >= 500) && i < 4) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res;
  }
}
