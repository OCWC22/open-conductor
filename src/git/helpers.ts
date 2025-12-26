import { execFileSync } from 'child_process';
import { createError } from '../errors';

export interface GitOptions {
  cwd: string;
}

export function runGit(args: string[], options: GitOptions, customMessage?: string): string {
  try {
    const output = execFileSync('git', args, {
      cwd: options.cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output.trim();
  } catch (error: unknown) {
    const message = customMessage ?? `Git command failed: git ${args.join(' ')}`;
    throw createError('git_error', message, [
      'Ensure git is installed and available on PATH',
      'Verify the repository is accessible',
      'Check that the working tree is in a clean state',
    ]);
  }
}

export function isRepo(options: GitOptions): boolean {
  try {
    const result = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: options.cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return result.trim() === 'true';
  } catch {
    return false;
  }
}

export function ensureRepo(options: GitOptions): void {
  if (!isRepo(options)) {
    throw createError('git_repo_required', 'Git repository required for this operation', [
      'Run git init in the workspace',
      'Ensure commands are executed from within a git repository',
    ]);
  }
}
