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

describe('ContextId validation (matrix cases 18-20)', () => {
  beforeEach(() => {
    executeToolCallMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects invalid type (case 18)', async () => {
    const res = await POST(makeRequest({ message: 'hi', mode: 'auto', contextId: 'foo:123' }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(executeToolCallMock).not.toHaveBeenCalled();
  });

  it('rejects missing id for non-dashboard/settings (case 19)', async () => {
    const res = await POST(makeRequest({ message: 'hi', mode: 'auto', contextId: 'client' }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(executeToolCallMock).not.toHaveBeenCalled();
  });

  it('rejects malformed contextId string (case 20)', async () => {
    const res = await POST(makeRequest({ message: 'hi', mode: 'auto', contextId: 'badformat' }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(executeToolCallMock).not.toHaveBeenCalled();
  });
});
