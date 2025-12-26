import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { afterEach, test } from 'node:test';
import { clearSession, loadSetupState, nextQuestionOrCompleteSection, recordAnswer, saveSetupState, startSession } from '../setup';

const tempDir = path.join(process.cwd(), 'tmp-setup-tests');
const statePath = path.join(tempDir, 'setup_state.json');

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('saves and loads state with active session data', async () => {
  const session = startSession('conductor_setup', 'product', 'q1', ['q2']);
  const state = { last_successful_step: '2.1_product_guide', activeSession: session };

  await saveSetupState(state, statePath);
  const loaded = await loadSetupState(statePath);

  assert.strictEqual(loaded?.last_successful_step, '2.1_product_guide');
  assert.deepStrictEqual(loaded?.activeSession?.pendingQuestions, ['q1', 'q2']);
});

test('records answers and advances session', () => {
  const session = startSession('conductor_setup', 'product', 'q1', ['q2']);
  const answered = recordAnswer(session, 'q1', 'yes');
  const status = nextQuestionOrCompleteSection(answered);

  assert.strictEqual(status.nextQuestion, 'q2');
  assert.strictEqual(status.completed, false);
});

test('clears session when requested', () => {
  const state = { last_successful_step: 'step', activeSession: startSession('cmd', 'section', 'q1') };
  const cleared = clearSession(state);
  assert.strictEqual(cleared.activeSession, undefined);
});
