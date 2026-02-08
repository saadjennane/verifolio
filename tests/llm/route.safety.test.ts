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

const contentResponse = (msg: string) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: msg } }],
    })
  );

describe('Tool result safety and read-before-write', () => {
  beforeEach(() => {
    executeToolCallMock.mockReset();
    executeToolCallMock.mockResolvedValue({ success: true, message: 'OK' });
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('handles invalid ToolResult shape without chat pollution', async () => {
    fetchMock.mockResolvedValueOnce(responseWithTool('list_clients', {}));
    executeToolCallMock.mockResolvedValueOnce({ message: 'bad' }); // missing success
    const res = await POST(makeRequest({ message: 'hi', mode: 'auto', contextId: 'client:abc' }));
    expect([400, 422, 500]).toContain(res.status);
  });

  it.skip('enforces read-before-write / no hallucinated IDs (SPEC)', () => {
    // TODO: SPEC requires rejecting writes without prior read/context-provided IDs.
  });
});
