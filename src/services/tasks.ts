import fs from 'fs';
import path from 'path';
import { ConductorError, createError } from '../errors';
import { addNote, commitAll, commitExists, GitOptions, isRepo } from '../git';
import { findNextTask, parsePlanFile, updateTaskStatus } from '../state/plan';
import { assertTrackExists, parseTracksFile, TrackEntry, updateTrackStatus as updateTrackEntryStatus } from '../state/tracks';

export interface StartTaskOptions {
  trackId?: string;
  taskIndex?: number;
}

export interface StartTaskResult {
  track: TrackEntry;
  taskIndex: number;
  title: string;
  planPath: string;
}

export interface CompleteTaskOptions {
  trackId?: string;
  taskIndex?: number;
  commitSha: string;
  summaryNote?: string;
}

export interface CompleteTaskResult {
  track: TrackEntry;
  taskIndex: number;
  planCommitSha: string;
  planPath: string;
}

function readFileStrict(filePath: string, missingCode: string): string {
  if (!fs.existsSync(filePath)) {
    throw createError(missingCode, `Required file not found: ${filePath}`, [
      'Run conductor_setup to initialize the workspace',
      'Ensure conductor/tracks.md and track plan files exist',
    ]);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function pickTrack(workspaceRoot: string, requestedId?: string): TrackEntry {
  const tracksPath = path.join(workspaceRoot, 'conductor', 'tracks.md');
  const tracks = parseTracksFile(readFileStrict(tracksPath, 'missing_tracks'));

  if (requestedId) {
    return assertTrackExists(tracks, requestedId);
  }

  const inProgress = tracks.find((track) => track.status === 'in_progress');
  if (inProgress) {
    return inProgress;
  }

  const pending = tracks.find((track) => track.status === 'pending');
  if (pending) {
    return pending;
  }

  throw createError('no_active_track', 'No active or pending tracks found in tracks.md', [
    'Add a track entry and plan before starting tasks',
    'Set at least one track to pending status in conductor/tracks.md',
  ]);
}

function assertNoTaskInProgress(planContents: string): void {
  const parsed = parsePlanFile(planContents);
  const active = parsed.tasks.find((task) => task.status === 'in_progress');
  if (active) {
    throw new ConductorError({
      code: 'task_already_active',
      message: `Task #${active.index} is already in progress: ${active.title}`,
      recovery: [
        'Complete or revert the in-progress task before starting another',
        'Update plan.md to reflect the correct active task',
      ],
    });
  }
}

function ensureGitRepo(workspaceRoot: string): GitOptions {
  const gitOptions: GitOptions = { cwd: workspaceRoot };
  if (!isRepo(gitOptions)) {
    throw createError('git_repo_required', 'Git repository required for this operation', [
      'Run git init in the workspace',
      'Ensure commands are executed from within a git repository',
    ]);
  }
  return gitOptions;
}

export function startTask(workspaceRoot: string, options: StartTaskOptions = {}): StartTaskResult {
  const track = pickTrack(workspaceRoot, options.trackId);
  const planPath = path.join(workspaceRoot, 'conductor', 'tracks', track.id, 'plan.md');
  const planContents = readFileStrict(planPath, 'missing_plan');

  assertNoTaskInProgress(planContents);

  const parsedPlan = parsePlanFile(planContents);
  const targetTask = options.taskIndex
    ? parsedPlan.tasks.find((task) => task.index === options.taskIndex)
    : findNextTask(parsedPlan);

  if (!targetTask) {
    throw createError('no_tasks_available', 'No tasks are available to start in plan.md', [
      'Add tasks under the appropriate phase headings in plan.md',
    ]);
  }

  if (targetTask.status !== 'pending') {
    throw createError('task_not_pending', `Task #${targetTask.index} is not pending`, [
      'Ensure the task marker is [ ] before starting',
      'Update plan.md to reflect pending tasks',
    ]);
  }

  const updatedPlan = updateTaskStatus(planContents, targetTask.index, 'in_progress');
  fs.writeFileSync(planPath, `${updatedPlan}\n`);

  // Promote track status to in_progress if needed
  if (track.status === 'pending') {
    const tracksPath = path.join(workspaceRoot, 'conductor', 'tracks.md');
    const tracksContents = readFileStrict(tracksPath, 'missing_tracks');
    const nextTracks = updateTrackEntryStatus(tracksContents, track.id, 'in_progress');
    fs.writeFileSync(tracksPath, `${nextTracks}\n`);
    track.status = 'in_progress';
  }

  return { track, taskIndex: targetTask.index, title: targetTask.title, planPath };
}

export function completeTask(workspaceRoot: string, options: CompleteTaskOptions): CompleteTaskResult {
  if (!options.commitSha) {
    throw createError('commit_required', 'commitSha is required to complete a task', [
      'Provide the implementation commit SHA for the completed task',
    ]);
  }

  const gitOptions = ensureGitRepo(workspaceRoot);
  if (!commitExists(gitOptions, options.commitSha)) {
    throw createError('unknown_commit', `Commit ${options.commitSha} does not exist`, [
      'Verify the commit SHA is correct and exists in the repository',
    ]);
  }

  const track = pickTrack(workspaceRoot, options.trackId);
  const planPath = path.join(workspaceRoot, 'conductor', 'tracks', track.id, 'plan.md');
  const planContents = readFileStrict(planPath, 'missing_plan');
  const parsedPlan = parsePlanFile(planContents);

  const activeTask = parsedPlan.tasks.find((task) => task.status === 'in_progress');
  if (!activeTask) {
    throw createError('no_active_task', 'No task is currently in progress to complete', [
      'Start a task before marking it complete',
      'Set a task marker to [~] in plan.md to indicate in-progress work',
    ]);
  }

  if (options.taskIndex && options.taskIndex !== activeTask.index) {
    throw createError(
      'task_mismatch',
      `Task #${options.taskIndex} is not the active task (current: #${activeTask.index})`,
      [
        'Complete the in-progress task before moving to another',
        'If the wrong task is active, update plan.md to fix the marker',
      ],
    );
  }

  const updatedPlan = updateTaskStatus(planContents, activeTask.index, 'completed', options.commitSha);
  fs.writeFileSync(planPath, `${updatedPlan}\n`);

  const commitMessage = `conductor(plan): Mark task '${activeTask.title}' as complete`;
  const planCommitSha = commitAll(gitOptions, commitMessage);

  if (options.summaryNote) {
    addNote(gitOptions, planCommitSha, options.summaryNote);
  }

  // If all tasks are completed, mark the track as completed
  const refreshedPlan = parsePlanFile(fs.readFileSync(planPath, 'utf8'));
  const allCompleted = refreshedPlan.tasks.length > 0 && refreshedPlan.tasks.every((task) => task.status === 'completed');
  if (allCompleted && track.status !== 'completed') {
    const tracksPath = path.join(workspaceRoot, 'conductor', 'tracks.md');
    const tracksContents = readFileStrict(tracksPath, 'missing_tracks');
    const nextTracks = updateTrackEntryStatus(tracksContents, track.id, 'completed');
    fs.writeFileSync(tracksPath, `${nextTracks}\n`);
    track.status = 'completed';
  }

  return { track, taskIndex: activeTask.index, planCommitSha, planPath };
}
