import { describe, expect, it } from 'vitest';
import { addPhaseCheckpoint, findNextTask, parsePlanFile, updateTaskStatus } from '../plan';

const plan = `# Plan

## Phase 1: Foundations
- [ ] Task: Scaffold project
- [~] Task: Write initial tests

## Phase 2: Feature
- [ ] Task: Build feature A (abc1234)
- [x] Task: Conductor - User Manual Verification 'Feature'
`;

describe('plan parsing', () => {
  it('parses phases and tasks with global indices', () => {
    const parsed = parsePlanFile(plan);
    expect(parsed.phases.map((p) => p.name)).toEqual(['Phase 1: Foundations', 'Phase 2: Feature']);
    expect(parsed.tasks.map((t) => t.index)).toEqual([1, 2, 3, 4]);
    expect(parsed.tasks[1]).toMatchObject({ status: 'in_progress', title: 'Write initial tests', phase: 'Phase 1: Foundations' });
  });

  it('finds next task prioritizing in progress', () => {
    const parsed = parsePlanFile(plan);
    const next = findNextTask(parsed);
    expect(next?.title).toBe('Write initial tests');
  });

  it('updates task status by global index and truncates sha', () => {
    const updated = updateTaskStatus(plan, 1, 'completed', '1234567890');
    expect(updated).toContain('- [x] Task: Scaffold project (1234567)');
  });

  it('adds checkpoint metadata to matching phase headings', () => {
    const updated = addPhaseCheckpoint(plan, 'Phase 2: Feature', 'deadbeefcafebabe');
    expect(updated).toContain('## Phase 2: Feature [checkpoint: deadbee]');
  });
});
