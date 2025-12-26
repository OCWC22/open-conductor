import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { test } from 'node:test';
import { execFileSync } from 'child_process';
import { completeTask, startTask } from '../tasks';
import { parsePlanFile } from '../../state/plan';

function write(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function scaffoldWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'conductor-workspace-'));
  const tracksMd = `# Project Tracks\n\n## [ ] Track: Demo\n*Link: [./conductor/tracks/demo_20240101/](./conductor/tracks/demo_20240101/)*\n`;
  const planMd = `# Plan\n\n## Phase 1: Setup\n- [ ] Task: Write tests\n- [ ] Task: Implement feature\n`;

  write(path.join(dir, 'conductor', 'tracks.md'), tracksMd);
  write(path.join(dir, 'conductor', 'tracks', 'demo_20240101', 'plan.md'), planMd);
  return dir;
}

function initGitRepo(cwd: string): string {
  fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\n');
  execFileSync('git', ['init'], { cwd, stdio: 'ignore' });
  fs.writeFileSync(path.join(cwd, 'README.md'), '# Demo\n');
  execFileSync('git', ['add', '.'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'chore: initial'], { cwd, stdio: 'ignore' });
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
}

test('startTask marks the next pending task in progress and promotes track status', () => {
  const workspace = scaffoldWorkspace();
  const result = startTask(workspace, {});

  const updatedPlan = fs.readFileSync(path.join(result.planPath), 'utf8');
  const parsed = parsePlanFile(updatedPlan);
  assert.strictEqual(result.taskIndex, 1);
  assert.strictEqual(parsed.tasks[0].status, 'in_progress');

  const tracks = fs.readFileSync(path.join(workspace, 'conductor', 'tracks.md'), 'utf8');
  assert.ok(tracks.includes('[~] Track: Demo'));
});

test('completeTask marks active task complete, commits plan, and completes track when finished', () => {
  const workspace = scaffoldWorkspace();
  const commitSha = initGitRepo(workspace);

  // start first task
  startTask(workspace, {});

  const { planCommitSha } = completeTask(workspace, { commitSha });

  const planContents = fs.readFileSync(path.join(workspace, 'conductor', 'tracks', 'demo_20240101', 'plan.md'), 'utf8');
  const parsed = parsePlanFile(planContents);
  assert.strictEqual(parsed.tasks[0].status, 'completed');
  assert.ok(parsed.tasks[0].sha?.length === 7);

  const log = execFileSync('git', ['log', '-1', '--pretty=%H %s'], {
    cwd: workspace,
    encoding: 'utf8',
  });
  assert.ok(log.includes(planCommitSha));
  assert.ok(log.includes("conductor(plan): Mark task 'Write tests' as complete"));

  // mark second task to complete and ensure track completion
  startTask(workspace, {});
  execFileSync('git', ['commit', '--allow-empty', '-m', 'feat: impl'], {
    cwd: workspace,
    stdio: 'ignore',
  });
  const implCommitSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspace, encoding: 'utf8' }).trim();
  completeTask(workspace, { commitSha: implCommitSha });

  const tracksMd = fs.readFileSync(path.join(workspace, 'conductor', 'tracks.md'), 'utf8');
  assert.ok(tracksMd.includes('[x] Track: Demo'));
});
