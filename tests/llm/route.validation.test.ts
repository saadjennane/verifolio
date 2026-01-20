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

const responseWithTool = (toolName: string, args: string) =>
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
                function: { name: toolName, arguments: args },
              },
            ],
          },
        },
      ],
    })
  );

describe('Tool call validation failures', () => {
  beforeEach(() => {
    executeToolCallMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('blocks malformed tool_call payload', async () => {
    fetchMock.mockResolvedValueOnce(responseWithTool('list_clients', '{bad json'));
    const res = await POST(makeRequest({ message: 'hi', mode: 'auto', contextId: 'client:abc' }));
    expect([400, 422, 500]).toContain(res.status);
    expect(executeToolCallMock).not.toHaveBeenCalled();
  });

  it('blocks unknown tool name', async () => {
    fetchMock.mockResolvedValueOnce(responseWithTool('unknown_tool', '{}'));
    const res = await POST(makeRequest({ message: 'hi', mode: 'auto', contextId: 'client:abc' }));
    expect([400, 422]).toContain(res.status);
    expect(executeToolCallMock).not.toHaveBeenCalled();
    const payload = await res.json().catch(() => ({}));
    expect(payload).toMatchObject({ tool: 'unknown_tool' });
  });

  it('blocks invalid arguments shape', async () => {
    fetchMock.mockResolvedValueOnce(responseWithTool('create_client', JSON.stringify({ nom: 123 })));
    const res = await POST(makeRequest({ message: 'hi', mode: 'auto', contextId: 'client:abc' }));
    expect([400, 422]).toContain(res.status);
    expect(executeToolCallMock).not.toHaveBeenCalled();
  });
});
