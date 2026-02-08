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

const toolCallResponse = (tool: string, args: Record<string, unknown> = {}) =>
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
                function: { name: tool, arguments: JSON.stringify(args) },
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
      choices: [
        {
          message: { content: msg },
        },
      ],
    })
  );

const makeRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('PLAN mode enforcement (matrix cases 1-5)', () => {
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

  it('allows READ_ONLY without confirmation (case 1)', async () => {
    fetchMock
      .mockResolvedValueOnce(toolCallResponse('list_clients', {}))
      .mockResolvedValueOnce(contentResponse('Done'));
    const res = await POST(makeRequest({ message: 'hi', mode: 'plan', contextId: 'client:abc' }));
    expect(res.status).toBe(200);
    expect(executeToolCallMock).toHaveBeenCalledTimes(1);
  });

  it('blocks SAFE_WRITE without confirmation (case 2)', async () => {
    fetchMock.mockResolvedValueOnce(toolCallResponse('create_client', { nom: 'Acme', type: 'entreprise' }));
    const res = await POST(makeRequest({ message: 'create', mode: 'plan', contextId: 'client:abc' }));
    expect([403, 422]).toContain(res.status);
    expect(executeToolCallMock).not.toHaveBeenCalled();
    const payload = await res.json().catch(() => ({}));
    expect(payload).toMatchObject({ mode: 'plan', tool: 'create_client' });
  });

  it('blocks CRITICAL without confirmation (case 3)', async () => {
    fetchMock.mockResolvedValueOnce(toolCallResponse('send_invoice', { id: 'inv-1' }));
    const res = await POST(makeRequest({ message: 'send', mode: 'plan', contextId: 'invoice:abc' }));
    expect([403, 422]).toContain(res.status);
    expect(executeToolCallMock).not.toHaveBeenCalled();
    const payload = await res.json().catch(() => ({}));
    expect(payload).toMatchObject({ mode: 'plan', tool: 'send_invoice' });
  });

  it('blocks SAFE_WRITE even with confirmation (case 4)', async () => {
    fetchMock.mockResolvedValueOnce(toolCallResponse('create_client', { nom: 'Acme', type: 'entreprise' }));
    const res = await POST(
      makeRequest({
        message: 'create',
        mode: 'plan',
        contextId: 'client:abc',
        confirmedAction: true,
      })
    );
    expect([403, 422]).toContain(res.status);
    expect(executeToolCallMock).not.toHaveBeenCalled();
    const payload = await res.json().catch(() => ({}));
    expect(payload).toMatchObject({ mode: 'plan', tool: 'create_client' });
  });

  it('blocks CRITICAL even with confirmation (case 5)', async () => {
    fetchMock.mockResolvedValueOnce(toolCallResponse('send_invoice', { id: 'inv-1' }));
    const res = await POST(
      makeRequest({
        message: 'send',
        mode: 'plan',
        contextId: 'invoice:abc',
        confirmedAction: true,
      })
    );
    expect([403, 422]).toContain(res.status);
    expect(executeToolCallMock).not.toHaveBeenCalled();
    const payload = await res.json().catch(() => ({}));
    expect(payload).toMatchObject({ mode: 'plan', tool: 'send_invoice' });
  });
});
