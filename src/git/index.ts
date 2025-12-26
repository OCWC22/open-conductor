import { createError } from '../errors';
import { ensureRepo, GitOptions, runGit, isRepo } from './helpers';

export function commitExists(options: GitOptions, sha: string): boolean {
  ensureRepo(options);
  try {
    const type = runGit(['cat-file', '-t', sha], options);
    return type === 'commit';
  } catch {
    return false;
  }
}

export function getLastCommitSha(options: GitOptions): string {
  ensureRepo(options);
  try {
    return runGit(['rev-parse', 'HEAD'], options);
  } catch {
    throw createError('git_no_commits', 'Repository has no commits', [
      'Create an initial commit before performing this operation',
    ]);
  }
}

export function commitAll(options: GitOptions, message: string, allowEmpty = false): string {
  ensureRepo(options);
  runGit(['add', '-A'], options);
  const args = ['commit', '-m', message];
  if (allowEmpty) {
    args.splice(1, 0, '--allow-empty');
  }
  runGit(args, options);
  return getLastCommitSha(options);
}

export function addNote(options: GitOptions, commitSha: string, note: string): void {
  ensureRepo(options);
  runGit(['notes', 'add', '-m', note, commitSha], options);
}

export interface RevertOptions {
  noEdit?: boolean;
}

export function revert(options: GitOptions, commits: string[], revertOptions: RevertOptions = {}): void {
  ensureRepo(options);
  const argsBase = ['revert'];
  if (revertOptions.noEdit !== false) {
    argsBase.push('--no-edit');
  }

  commits.forEach((commit) => {
    runGit([...argsBase, commit], options);
  });
}

export { listCommitsByMessage, listCommitsTouchingPaths } from './history';
export { isRepo } from './helpers';
export type { GitOptions } from './helpers';
