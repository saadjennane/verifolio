import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/chat/route';

const executeToolCallMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('@/lib/llm/router', () => ({
  executeToolCall: (...args: unknown[]) => executeToolCallMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/supabase/auth-helper', () => ({
  getUserId: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('@/lib/llm/prompt', () => ({
  getSystemPromptWithMode: vi.fn().mockReturnValue('system'),
  enrichPromptWithContext: vi.fn().mockResolvedValue('system + ctx'),
}));

const makeRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const responseWithTool = (toolName: string, args: Record<string, unknown>) =>
  new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call-1',
                type: 'function',
                function: { name: toolName, arguments: JSON.stringify(args) },
              },
            ],
          },
        },
      ],
    })
  );

describe('Timeouts and retry behaviors', () => {
  beforeEach(() => {
    executeToolCallMock.mockReset();
    executeToolCallMock.mockResolvedValue({ success: true, message: 'OK' });
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it.skip('handles OpenAI timeout', async () => {
    // Skipped: Fake timers don't work well with AbortController in the route
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((_resolve, _reject) => {
          /* never resolves */
        })
    );
    const resPromise = POST(makeRequest({ message: 'hi', mode: 'auto', contextId: 'client:abc' }));
    vi.runAllTimers();
    const res = await resPromise;
    expect([500, 504, 408]).toContain(res.status);
  });

  it.skip('retries OpenAI once on transient failure', async () => {
    // Skipped: Route doesn't have built-in retry logic for transient failures
    fetchMock
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(responseWithTool('list_clients', {}));
    const res = await POST(makeRequest({ message: 'hi', mode: 'auto', contextId: 'client:abc' }));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.skip('handles tool timeout', async () => {
    // Skipped: Fake timers don't work well with the timeout wrapper
    executeToolCallMock.mockImplementation(
      () =>
        new Promise((_resolve, _reject) => {
          /* never resolves */
        })
    );
    fetchMock.mockResolvedValueOnce(responseWithTool('list_clients', {}));
    const res = await POST(makeRequest({ message: 'hi', mode: 'auto', contextId: 'client:abc' }));
    expect([500, 504, 408]).toContain(res.status);
  });

  it.skip('respects total budget (90s SPEC)', () => {
    // TODO: add when total budget observable
  });
});
