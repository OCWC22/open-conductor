import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { clearSession, loadSetupState, nextQuestionOrCompleteSection, recordAnswer, saveSetupState, startSession } from '../setup';

const tempDir = path.join(process.cwd(), 'tmp-setup-tests');
const statePath = path.join(tempDir, 'setup_state.json');

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('setup state persistence', () => {
  it('saves and loads state with active session data', async () => {
    const session = startSession('conductor_setup', 'product', 'q1', ['q2']);
    const state = { last_successful_step: '2.1_product_guide', activeSession: session };

    await saveSetupState(state, statePath);
    const loaded = await loadSetupState(statePath);

    expect(loaded?.last_successful_step).toBe('2.1_product_guide');
    expect(loaded?.activeSession?.pendingQuestions).toEqual(['q1', 'q2']);
  });

  it('records answers and advances session', () => {
    const session = startSession('conductor_setup', 'product', 'q1', ['q2']);
    const answered = recordAnswer(session, 'q1', 'yes');
    const status = nextQuestionOrCompleteSection(answered);

    expect(status.nextQuestion).toBe('q2');
    expect(status.completed).toBe(false);
  });

  it('clears session when requested', () => {
    const state = { last_successful_step: 'step', activeSession: startSession('cmd', 'section', 'q1') };
    const cleared = clearSession(state);
    expect(cleared.activeSession).toBeUndefined();
  });
});
