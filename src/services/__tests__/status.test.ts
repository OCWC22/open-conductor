import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { test, beforeEach, afterEach } from 'node:test';
import { computeStatus } from '../status';

const TMP_ROOT = path.join(process.cwd(), 'tmp-status-tests');

beforeEach(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  fs.mkdirSync(path.join(TMP_ROOT, 'conductor', 'tracks', 'alpha'), { recursive: true });
  fs.mkdirSync(path.join(TMP_ROOT, 'conductor', 'tracks', 'beta'), { recursive: true });

  const tracksMd = `# Project Tracks
\n## [~] Track: Alpha delivery
*Link: [./conductor/tracks/alpha/](./conductor/tracks/alpha/)*
\n## [ ] Track: Beta polish
*Link: [./conductor/tracks/beta/](./conductor/tracks/beta/)*\n`;
  fs.writeFileSync(path.join(TMP_ROOT, 'conductor', 'tracks.md'), tracksMd, 'utf8');

  const alphaPlan = `# Plan
\n## Phase 1: Build
- [~] Task: Implement core feature
- [ ] Task: Conductor - User Manual Verification 'Build'
\n## Phase 2: Polish
- [ ] Task: Add docs
`;
  fs.writeFileSync(path.join(TMP_ROOT, 'conductor', 'tracks', 'alpha', 'plan.md'), alphaPlan, 'utf8');

  const betaPlan = `# Plan
\n## Phase 1: Follow up
- [ ] Task: Investigate feedback
`;
  fs.writeFileSync(path.join(TMP_ROOT, 'conductor', 'tracks', 'beta', 'plan.md'), betaPlan, 'utf8');
});

afterEach(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

test('computes status with task summaries and selects current track', () => {
  const status = computeStatus(TMP_ROOT, { includeTaskDetails: true });

  assert.strictEqual(status.currentTrack?.id, 'alpha');
  assert.strictEqual(status.nextAction, 'Continue with task #1: Implement core feature');

  const alpha = status.tracks.find((t) => t.id === 'alpha');
  assert.ok(alpha?.progress);
  assert.strictEqual(alpha?.progress?.totalTasks, 3);
  assert.strictEqual(alpha?.progress?.inProgress, 1);

  const beta = status.tracks.find((t) => t.id === 'beta');
  assert.strictEqual(beta?.progress?.pending, 1);
});

test('throws helpful error when artifacts missing', () => {
  fs.rmSync(path.join(TMP_ROOT, 'conductor', 'tracks.md'));
  assert.throws(() => computeStatus(TMP_ROOT, { includeTaskDetails: true }));
});
