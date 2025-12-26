import { createError } from '../errors';
import { ensureRepo, GitOptions, runGit } from './helpers';

export function listCommitsByMessage(
  options: GitOptions,
  pattern: string | RegExp,
  limit = 50,
): string[] {
  ensureRepo(options);
  if (limit <= 0) {
    return [];
  }
  const grepPattern = typeof pattern === 'string' ? pattern : pattern.source;
  try {
    const output = runGit(['log', `-n${limit}`, '--format=%H', '--grep', grepPattern], options);
    if (!output) return [];
    return output.split(/\r?\n/).filter(Boolean);
  } catch (error) {
    throw createError('git_error', 'Failed to search git history by message', [
      'Verify the repository exists',
      'Check the grep pattern for correctness',
    ]);
  }
}

export function listCommitsTouchingPaths(
  options: GitOptions,
  paths: string[],
  limit = 50,
): string[] {
  ensureRepo(options);
  if (paths.length === 0 || limit <= 0) {
    return [];
  }
  try {
    const output = runGit(['log', `-n${limit}`, '--format=%H', '--', ...paths], options);
    if (!output) return [];
    return output.split(/\r?\n/).filter(Boolean);
  } catch (error) {
    throw createError('git_error', 'Failed to search git history by paths', [
      'Verify the repository exists',
      'Check provided file paths',
    ]);
  }
}
