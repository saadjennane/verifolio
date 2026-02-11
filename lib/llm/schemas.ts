import { z } from 'zod';

export const ALLOWED_CONTEXT_TYPES = [
  'dashboard',
  'deal',
  'mission',
  'invoice',
  'quote',
  'client',
  'contact',
  'proposal',
  'brief',
  'review',
  'settings',
] as const;

export const ContextIdSchema = z.object({
  type: z.enum(ALLOWED_CONTEXT_TYPES),
  id: z.string().optional(),
}).refine(
  (val) => {
    if (val.type === 'dashboard' || val.type === 'settings') {
      return true;
    }
    return typeof val.id === 'string' && val.id.length > 0;
  },
  { message: 'id is required for this context type' }
);

export const ToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
});

export const ToolResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.unknown().optional(),
});

export const ChatHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

// Limite de caractères pour les messages utilisateur (protection contre abus/coûts)
const MAX_MESSAGE_LENGTH = 8000;

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH, {
    message: `Le message ne peut pas dépasser ${MAX_MESSAGE_LENGTH} caractères`,
  }),
  history: z.array(ChatHistoryItemSchema).optional(),
  mode: z.enum(['plan', 'auto', 'demander']).optional(),
  contextId: z.string().nullable().optional(),
  confirmedAction: z.boolean().optional(),
  confirmedToolCallId: z.string().optional(),
  stream: z.boolean().optional(),
});

export type ParsedContextId = z.infer<typeof ContextIdSchema>;
