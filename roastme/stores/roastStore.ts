import { create } from 'zustand';
import type { Question, RoastAnswer } from '@/types/database';

interface RoastState {
  sessionId: string | null;
  roastedUserId: string | null;
  roastedDisplayName: string | null;
  questions: Question[];
  currentIndex: number;
  answers: Map<string, { value: string; label: string }>;
  isCompleted: boolean;
  isSubmitting: boolean;

  startSession: (params: {
    sessionId: string;
    roastedUserId: string;
    roastedDisplayName: string;
    questions: Question[];
  }) => void;
  answerQuestion: (questionId: string, value: string, label: string) => void;
  nextQuestion: () => void;
  setCompleted: () => void;
  setSubmitting: (value: boolean) => void;
  reset: () => void;
  getCurrentQuestion: () => Question | null;
  getProgress: () => number;
}

export const useRoastStore = create<RoastState>((set, get) => ({
  sessionId: null,
  roastedUserId: null,
  roastedDisplayName: null,
  questions: [],
  currentIndex: 0,
  answers: new Map(),
  isCompleted: false,
  isSubmitting: false,

  startSession: ({ sessionId, roastedUserId, roastedDisplayName, questions }) =>
    set({
      sessionId,
      roastedUserId,
      roastedDisplayName,
      questions,
      currentIndex: 0,
      answers: new Map(),
      isCompleted: false,
      isSubmitting: false,
    }),

  answerQuestion: (questionId, value, label) =>
    set((state) => {
      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, { value, label });
      return { answers: newAnswers };
    }),

  nextQuestion: () =>
    set((state) => {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { isCompleted: true };
      }
      return { currentIndex: nextIndex };
    }),

  setCompleted: () => set({ isCompleted: true }),
  setSubmitting: (value) => set({ isSubmitting: value }),

  reset: () =>
    set({
      sessionId: null,
      roastedUserId: null,
      roastedDisplayName: null,
      questions: [],
      currentIndex: 0,
      answers: new Map(),
      isCompleted: false,
      isSubmitting: false,
    }),

  getCurrentQuestion: () => {
    const { questions, currentIndex } = get();
    return questions[currentIndex] ?? null;
  },

  getProgress: () => {
    const { questions, currentIndex } = get();
    if (questions.length === 0) return 0;
    return (currentIndex + 1) / questions.length;
  },
}));
