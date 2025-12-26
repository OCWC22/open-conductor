import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'assert';
import { execFileSync } from 'child_process';
import { afterEach, beforeEach, test } from 'node:test';
import {
  addNote,
  commitAll,
  commitExists,
  getLastCommitSha,
  isRepo,
  revert,
  listCommitsByMessage,
  listCommitsTouchingPaths,
} from '..';
import { ConductorError } from '../../errors';

const TMP_ROOT = path.join(os.tmpdir(), 'conductor-git-tests');
let repoDir: string;

function initRepo(): void {
  fs.mkdirSync(repoDir, { recursive: true });
  fs.writeFileSync(path.join(repoDir, 'README.md'), '# tmp\n');
  execFileSync('git', ['init'], { cwd: repoDir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: repoDir });
  execFileSync('git', ['add', '.'], { cwd: repoDir });
  execFileSync('git', ['commit', '-m', 'chore: init'], { cwd: repoDir });
}

beforeEach(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  fs.mkdirSync(TMP_ROOT, { recursive: true });
  repoDir = fs.mkdtempSync(path.join(TMP_ROOT, 'repo-'));
  initRepo();
});

afterEach(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

test('detects repository presence', () => {
  assert.ok(isRepo({ cwd: repoDir }));
  const nonRepo = path.join(TMP_ROOT, 'no-repo');
  fs.mkdirSync(nonRepo, { recursive: true });
  assert.ok(!isRepo({ cwd: nonRepo }));
});

test('reports last commit sha and existence', () => {
  const sha = getLastCommitSha({ cwd: repoDir });
  assert.match(sha, /^[0-9a-f]{40}$/);
  assert.ok(commitExists({ cwd: repoDir }, sha));
  assert.ok(!commitExists({ cwd: repoDir }, 'abc1234'));
});

test('throws helpful error when no commits exist', () => {
  const emptyRepo = path.join(TMP_ROOT, 'empty-repo');
  fs.mkdirSync(emptyRepo, { recursive: true });
  execFileSync('git', ['init'], { cwd: emptyRepo });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: emptyRepo });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: emptyRepo });
  assert.throws(() => getLastCommitSha({ cwd: emptyRepo }), ConductorError);
});

test('commits changes and attaches notes', () => {
  fs.writeFileSync(path.join(repoDir, 'file.txt'), 'hello', 'utf8');
  const sha = commitAll({ cwd: repoDir }, 'feat: add file');
  assert.ok(commitExists({ cwd: repoDir }, sha));
  addNote({ cwd: repoDir }, sha, 'note content');
  const notes = execFileSync('git', ['notes', 'show', sha], {
    cwd: repoDir,
    encoding: 'utf8',
  });
  assert.strictEqual(notes.trim(), 'note content');
});

test('reverts commits in order', () => {
  const target = path.join(repoDir, 'file.txt');
  fs.writeFileSync(target, 'v1', 'utf8');
  commitAll({ cwd: repoDir }, 'feat: add file');
  fs.writeFileSync(target, 'v2', 'utf8');
  const second = commitAll({ cwd: repoDir }, 'feat: update file');

  revert({ cwd: repoDir }, [second]);
  const content = fs.readFileSync(target, 'utf8');
  assert.strictEqual(content, 'v1');
});

test('finds commits by message', () => {
  fs.writeFileSync(path.join(repoDir, 'file-a.txt'), 'a1', 'utf8');
  commitAll({ cwd: repoDir }, 'feat: add a1');
  fs.writeFileSync(path.join(repoDir, 'file-b.txt'), 'b1', 'utf8');
  const commitB = commitAll({ cwd: repoDir }, 'fix: patch b1');

  const matches = listCommitsByMessage({ cwd: repoDir }, 'patch');
  assert.strictEqual(matches[0], commitB);
});

test('finds commits by touched paths', () => {
  fs.writeFileSync(path.join(repoDir, 'file-a.txt'), 'a1', 'utf8');
  commitAll({ cwd: repoDir }, 'feat: add a1');
  fs.mkdirSync(path.join(repoDir, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(repoDir, 'nested/file-b.txt'), 'b1', 'utf8');
  const commitB = commitAll({ cwd: repoDir }, 'feat: add b1');

  const matches = listCommitsTouchingPaths({ cwd: repoDir }, ['nested/file-b.txt']);
  assert.strictEqual(matches[0], commitB);
});
