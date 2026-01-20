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

const makeRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('AUTO mode enforcement (matrix cases 13-17)', () => {
  beforeEach(() => {
    executeToolCallMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('allows READ_ONLY without confirmation (case 13)', async () => {
    fetchMock.mockResolvedValueOnce(toolCallResponse('list_clients', {}));
    const res = await POST(makeRequest({ message: 'hi', mode: 'auto', contextId: 'client:abc' }));
    expect(res.status).toBe(200);
    expect(executeToolCallMock).toHaveBeenCalledTimes(1);
  });

  it('allows SAFE_WRITE without confirmation (case 14)', async () => {
    fetchMock.mockResolvedValueOnce(toolCallResponse('create_client', { nom: 'Acme', type: 'entreprise' }));
    const res = await POST(makeRequest({ message: 'create', mode: 'auto', contextId: 'client:abc' }));
    expect(res.status).toBe(200);
    expect(executeToolCallMock).toHaveBeenCalledTimes(1);
  });

  it('blocks CRITICAL without confirmation (case 15)', async () => {
    fetchMock.mockResolvedValueOnce(toolCallResponse('send_invoice', { id: 'inv-1' }));
    const res = await POST(makeRequest({ message: 'send', mode: 'auto', contextId: 'invoice:abc' }));
    expect([403, 422]).toContain(res.status);
    expect(executeToolCallMock).not.toHaveBeenCalled();
    const payload = await res.json().catch(() => ({}));
    expect(payload).toMatchObject({ mode: 'auto', tool: 'send_invoice' });
  });

  it('allows CRITICAL with valid confirmation (case 16)', async () => {
    fetchMock.mockResolvedValueOnce(toolCallResponse('send_invoice', { id: 'inv-1' }));
    const res = await POST(
      makeRequest({
        message: 'send',
        mode: 'auto',
        contextId: 'invoice:abc',
        confirmedAction: true,
      })
    );
    expect(res.status).toBe(200);
    expect(executeToolCallMock).toHaveBeenCalledTimes(1);
  });

  it('blocks CRITICAL with invalid confirmation (case 17)', async () => {
    fetchMock.mockResolvedValueOnce(toolCallResponse('send_invoice', { id: 'inv-1' }));
    const res = await POST(
      makeRequest({
        message: 'send',
        mode: 'auto',
        contextId: 'invoice:abc',
        confirmedToolCallId: 'wrong',
      })
    );
    expect([403, 422]).toContain(res.status);
    expect(executeToolCallMock).not.toHaveBeenCalled();
    const payload = await res.json().catch(() => ({}));
    expect(payload).toMatchObject({ mode: 'auto', tool: 'send_invoice' });
  });
});
