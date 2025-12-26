import fs from 'fs';
import path from 'path';
import { ConductorError, createError } from '../errors';
import { WorkspaceContext } from '../types';

export interface WorkspaceResolutionOptions {
  requestedPath?: string;
  mcpRoots?: string[];
  cwd?: string;
  envWorkspace?: string;
}

function assertDirectoryExists(root: string): void {
  let stats: any;
  try {
    stats = fs.statSync(root);
  } catch (error: unknown) {
    throw createError('workspace_not_found', `Workspace path does not exist: ${root}`, [
      'Verify the path exists on disk',
      'Adjust CONDUCTOR_WORKSPACE or provided path',
    ]);
  }

  if (!stats.isDirectory()) {
    throw createError('workspace_not_directory', `Workspace path is not a directory: ${root}`, [
      'Choose a directory path for the workspace',
    ]);
  }
}

function normalizeRoot(root: string): string {
  return path.resolve(root);
}

function chooseRoot(options: WorkspaceResolutionOptions): WorkspaceContext {
  const cwd = options.cwd ?? process.cwd();
  const envRoot = options.envWorkspace ?? process.env.CONDUCTOR_WORKSPACE;

  if (envRoot) {
    return { root: normalizeRoot(envRoot), source: 'env' };
  }

  if (options.requestedPath) {
    return { root: normalizeRoot(options.requestedPath), source: 'arg' };
  }

  if (options.mcpRoots && options.mcpRoots.length > 0) {
    return { root: normalizeRoot(options.mcpRoots[0]), source: 'mcpRoot' };
  }

  return { root: normalizeRoot(cwd), source: 'cwd' };
}

export function resolveWorkspace(options: WorkspaceResolutionOptions = {}): WorkspaceContext {
  const context = chooseRoot(options);
  assertDirectoryExists(context.root);
  return context;
}

export function ensureWorkspace(options: WorkspaceResolutionOptions = {}): WorkspaceContext {
  try {
    return resolveWorkspace(options);
  } catch (error: unknown) {
    if (error instanceof ConductorError) {
      throw error;
    }
    throw createError('workspace_resolution_failed', 'Failed to resolve workspace root', [
      'Check CONDUCTOR_WORKSPACE environment variable',
      'Ensure requested path exists and is accessible',
    ]);
  }
}
