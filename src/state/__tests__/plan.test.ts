import assert from 'assert';
import { test } from 'node:test';
import { addPhaseCheckpoint, findNextTask, parsePlanFile, updateTaskStatus } from '../plan';

const plan = `# Plan

## Phase 1: Foundations
- [ ] Task: Scaffold project
- [~] Task: Write initial tests

## Phase 2: Feature
- [ ] Task: Build feature A (abc1234)
- [x] Task: Conductor - User Manual Verification 'Feature'
`;

test('parses phases and tasks with global indices', () => {
  const parsed = parsePlanFile(plan);
  assert.deepStrictEqual(parsed.phases.map((p) => p.name), ['Foundations', 'Feature']);
  assert.deepStrictEqual(parsed.tasks.map((t) => t.index), [1, 2, 3, 4]);
  const task = parsed.tasks[1];
  assert.strictEqual(task.status, 'in_progress');
  assert.strictEqual(task.title, 'Write initial tests');
  assert.strictEqual(task.phase, 'Foundations');
  assert.strictEqual(task.index, 2);
});

test('finds next task prioritizing in progress', () => {
  const parsed = parsePlanFile(plan);
  const next = findNextTask(parsed);
  assert.strictEqual(next?.title, 'Write initial tests');
});

test('updates task status by global index and truncates sha', () => {
  const updated = updateTaskStatus(plan, 1, 'completed', '1234567890');
  assert.ok(updated.includes('- [x] Task: Scaffold project (1234567)'));
});

test('adds checkpoint metadata to matching phase headings', () => {
  const updated = addPhaseCheckpoint(plan, 'Feature', 'deadbeefcafebabe');
  assert.ok(updated.includes('## Phase 2: Feature [checkpoint: deadbee]'));
});
