import path from 'path';
import { z } from 'zod';
import { readFileOptional, writeFileAtomic } from '../utils/fs';
import { createError } from '../errors';

export const DEFAULT_SETUP_STATE_PATH = path.join('conductor', 'setup_state.json');

const activeSessionSchema = z.object({
  command: z.string(),
  section: z.string(),
  firstQuestion: z.string(),
  answers: z.record(z.any()).default({}),
  pendingQuestions: z.array(z.string()).default([]),
});

const setupStateSchema = z.object({
  last_successful_step: z.string().optional(),
  activeSession: activeSessionSchema.optional(),
});

export type ActiveSession = z.infer<typeof activeSessionSchema>;
export type SetupState = z.infer<typeof setupStateSchema>;

export async function loadSetupState(filePath = DEFAULT_SETUP_STATE_PATH): Promise<SetupState | undefined> {
  const contents = await readFileOptional(filePath);
  if (!contents) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(contents);
    return setupStateSchema.parse(parsed);
  } catch (error: unknown) {
    throw createError('invalid_setup_state', 'Failed to parse conductor/setup_state.json', [
      'Delete the corrupted setup_state.json and rerun setup',
      'Ensure setup_state.json matches the expected schema',
    ]);
  }
}

export async function saveSetupState(state: SetupState, filePath = DEFAULT_SETUP_STATE_PATH): Promise<void> {
  const validated = setupStateSchema.parse(state);
  const serialized = `${JSON.stringify(validated, null, 2)}\n`;
  await writeFileAtomic(filePath, serialized);
}

export function startSession(command: string, section: string, firstQuestion: string, pendingQuestions: string[] = []): ActiveSession {
  return {
    command,
    section,
    firstQuestion,
    answers: {},
    pendingQuestions: [firstQuestion, ...pendingQuestions],
  };
}

export function recordAnswer(session: ActiveSession, questionId: string, answer: unknown): ActiveSession {
  const remaining = session.pendingQuestions.filter((id) => id !== questionId);
  return {
    ...session,
    answers: { ...session.answers, [questionId]: answer },
    pendingQuestions: remaining,
  };
}

export function nextQuestionOrCompleteSection(session: ActiveSession): { nextQuestion?: string; completed: boolean } {
  if (session.pendingQuestions.length === 0) {
    return { completed: true };
  }

  const [nextQuestion, ...rest] = session.pendingQuestions;
  return {
    nextQuestion,
    completed: rest.length === 0 && session.answers[nextQuestion] !== undefined,
  };
}

export function clearSession(state: SetupState): SetupState {
  const { activeSession, ...rest } = state;
  if (!activeSession) {
    return state;
  }
  return rest;
}
