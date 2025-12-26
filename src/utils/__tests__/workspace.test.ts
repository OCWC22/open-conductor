import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { afterEach, test } from 'node:test';
import { ensureWorkspace, resolveWorkspace } from '../workspace';
import { ConductorError } from '../../errors';

const createdDirs: string[] = [];

function makeTemp(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(process.cwd(), prefix));
  createdDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('prefers CONDUCTOR_WORKSPACE when set', () => {
  const tempDir = makeTemp('ws-env-');
  const context = resolveWorkspace({ envWorkspace: tempDir, cwd: '/' });
  assert.strictEqual(context.root, path.resolve(tempDir));
  assert.strictEqual(context.source, 'env');
});

test('falls back to requested path when no env', () => {
  const tempDir = makeTemp('ws-arg-');
  const context = resolveWorkspace({ requestedPath: tempDir, cwd: '/' });
  assert.strictEqual(context.root, path.resolve(tempDir));
  assert.strictEqual(context.source, 'arg');
});

test('uses mcpRoots before cwd', () => {
  const tempDir = makeTemp('ws-mcp-');
  const context = resolveWorkspace({ mcpRoots: [tempDir], cwd: '/' });
  assert.strictEqual(context.root, path.resolve(tempDir));
  assert.strictEqual(context.source, 'mcpRoot');
});

test('throws structured error when directory missing', () => {
  assert.throws(() => resolveWorkspace({ requestedPath: '/non-existent/workspace/path' }), ConductorError);
});

test('wraps unknown errors with workspace_resolution_failed', () => {
  try {
    ensureWorkspace({ requestedPath: '/non-existent/workspace/path' });
  } catch (error) {
    assert.ok(error instanceof ConductorError);
    const code = (error as ConductorError).code;
    assert.ok(code === 'workspace_not_found' || code === 'workspace_resolution_failed');
  }
});
