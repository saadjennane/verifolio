'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type ChatMode, getNextMode } from '@/lib/chat/modes';
import {
  type WorkingStep,
  type WorkingState,
  initialWorkingState,
  createWorkingStep,
} from '@/lib/chat/working';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatState {
  messages: Message[];
  mode: ChatMode;
  working: WorkingState;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;
  setMode: (mode: ChatMode) => void;
  cycleMode: () => void;
  // Working state actions
  startWorking: (steps: string[], contextId?: string) => void;
  updateStepStatus: (stepId: string, status: WorkingStep['status']) => void;
  nextStep: () => void;
  completeCurrentStep: () => void;
  stopWorking: () => void;
  clearWorking: () => void;
  toggleWorkingCollapse: () => void;
}

const initialMessage: Message = {
  id: '1',
  role: 'assistant',
  content: 'Salut ! Comment je peux t\'aider ?',
  timestamp: new Date(),
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [initialMessage],
      mode: 'auto' as ChatMode,
      working: initialWorkingState,

      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: Date.now().toString(),
              timestamp: new Date(),
            },
          ],
        })),

      clearMessages: () => set({ messages: [initialMessage] }),

      setMessages: (messages) => set({ messages }),

      setMode: (mode) => set({ mode }),

      cycleMode: () =>
        set((state) => ({
          mode: getNextMode(state.mode),
        })),

      // Working state actions
      startWorking: (stepLabels, contextId) =>
        set(() => ({
          working: {
            isActive: true,
            isCollapsed: false,
            steps: stepLabels.map((label, index) =>
              index === 0
                ? { ...createWorkingStep(label), status: 'in_progress' as const }
                : createWorkingStep(label)
            ),
            contextId: contextId || null,
          },
        })),

      updateStepStatus: (stepId, status) =>
        set((state) => ({
          working: {
            ...state.working,
            steps: state.working.steps.map((step) =>
              step.id === stepId ? { ...step, status } : step
            ),
          },
        })),

      nextStep: () =>
        set((state) => {
          const steps = [...state.working.steps];
          const currentIndex = steps.findIndex((s) => s.status === 'in_progress');

          if (currentIndex >= 0 && currentIndex < steps.length - 1) {
            steps[currentIndex] = { ...steps[currentIndex], status: 'completed' };
            steps[currentIndex + 1] = { ...steps[currentIndex + 1], status: 'in_progress' };
          } else if (currentIndex >= 0) {
            steps[currentIndex] = { ...steps[currentIndex], status: 'completed' };
          }

          return {
            working: {
              ...state.working,
              steps,
              isActive: steps.some((s) => s.status === 'in_progress' || s.status === 'pending'),
            },
          };
        }),

      completeCurrentStep: () => {
        const state = get();
        const currentStep = state.working.steps.find((s) => s.status === 'in_progress');
        if (currentStep) {
          state.nextStep();
        }
      },

      stopWorking: () =>
        set((state) => ({
          working: {
            ...state.working,
            isActive: false,
            steps: state.working.steps.map((step) =>
              step.status === 'in_progress' || step.status === 'pending'
                ? { ...step, status: 'cancelled' as const }
                : step
            ),
          },
        })),

      clearWorking: () =>
        set(() => ({
          working: initialWorkingState,
        })),

      toggleWorkingCollapse: () =>
        set((state) => ({
          working: {
            ...state.working,
            isCollapsed: !state.working.isCollapsed,
          },
        })),
    }),
    {
      name: 'verifolio-chat',
      partialize: (state) => ({
        messages: state.messages,
        mode: state.mode,
        // Ne pas persister working state (temporaire)
      }),
    }
  )
);
