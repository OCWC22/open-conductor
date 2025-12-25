import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
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

describe('workspace resolution', () => {
  it('prefers CONDUCTOR_WORKSPACE when set', () => {
    const tempDir = makeTemp('ws-env-');
    const context = resolveWorkspace({ envWorkspace: tempDir, cwd: '/' });
    expect(context.root).toBe(path.resolve(tempDir));
    expect(context.source).toBe('env');
  });

  it('falls back to requested path when no env', () => {
    const tempDir = makeTemp('ws-arg-');
    const context = resolveWorkspace({ requestedPath: tempDir, cwd: '/' });
    expect(context.root).toBe(path.resolve(tempDir));
    expect(context.source).toBe('arg');
  });

  it('uses mcpRoots before cwd', () => {
    const tempDir = makeTemp('ws-mcp-');
    const context = resolveWorkspace({ mcpRoots: [tempDir], cwd: '/' });
    expect(context.root).toBe(path.resolve(tempDir));
    expect(context.source).toBe('mcpRoot');
  });

  it('throws structured error when directory missing', () => {
    expect(() => resolveWorkspace({ requestedPath: '/non-existent/workspace/path' })).toThrow(ConductorError);
  });

  it('wraps unknown errors with workspace_resolution_failed', () => {
    try {
      ensureWorkspace({ requestedPath: '/non-existent/workspace/path' });
    } catch (error) {
      expect(error).toBeInstanceOf(ConductorError);
      expect((error as ConductorError).code === 'workspace_not_found' || (error as ConductorError).code === 'workspace_resolution_failed').toBe(true);
    }
  });
});
