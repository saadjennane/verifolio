import { describe, expect, it } from 'vitest';
import { ContextIdSchema, ToolCallSchema, ToolResultSchema, ChatRequestSchema } from '@/lib/llm/schemas';

describe('Schema validation', () => {
  it('validates ContextId for dashboard without id', () => {
    const parsed = ContextIdSchema.safeParse({ type: 'dashboard' });
    expect(parsed.success).toBe(true);
  });

  it('rejects ContextId without id for client', () => {
    const parsed = ContextIdSchema.safeParse({ type: 'client' });
    expect(parsed.success).toBe(false);
  });

  it('validates ToolCall', () => {
    const parsed = ToolCallSchema.safeParse({ name: 'list_clients', arguments: {} });
    expect(parsed.success).toBe(true);
  });

  it('validates ToolResult', () => {
    const parsed = ToolResultSchema.safeParse({ success: true, message: 'ok' });
    expect(parsed.success).toBe(true);
  });

  it('validates ChatRequest', () => {
    const parsed = ChatRequestSchema.safeParse({ message: 'hi' });
    expect(parsed.success).toBe(true);
  });
});
