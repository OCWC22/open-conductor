import fs from 'fs';
import path from 'path';
import { ConductorError } from '../errors';
import { findNextTask, parsePlanFile, PlanTask } from '../state/plan';
import { parseTracksFile, TrackEntry } from '../state/tracks';

export interface TrackProgressSummary {
  totalTasks: number;
  completed: number;
  inProgress: number;
  pending: number;
  nextTask?: PlanTask;
}

export interface TrackStatusSummary extends TrackEntry {
  progress?: TrackProgressSummary;
}

export interface StatusResult {
  tracks: TrackStatusSummary[];
  currentTrack?: TrackStatusSummary;
  nextAction?: string;
}

function readText(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new ConductorError({
      code: 'missing_artifact',
      message: `Required file is missing: ${filePath}`,
      recovery: [
        'Run conductor_setup to scaffold the workspace',
        'Ensure tracks.md and plan.md exist under the conductor directory',
      ],
    });
  }
  return fs.readFileSync(filePath, 'utf8');
}

function summarizePlan(planPath: string): TrackProgressSummary {
  const contents = readText(planPath);
  const parsed = parsePlanFile(contents);
  const next = findNextTask(parsed);

  return {
    totalTasks: parsed.tasks.length,
    completed: parsed.tasks.filter((t) => t.status === 'completed').length,
    inProgress: parsed.tasks.filter((t) => t.status === 'in_progress').length,
    pending: parsed.tasks.filter((t) => t.status === 'pending').length,
    nextTask: next,
  };
}

function pickCurrentTrack(tracks: TrackStatusSummary[]): TrackStatusSummary | undefined {
  return (
    tracks.find((track) => track.status === 'in_progress') ??
    tracks.find((track) => track.status === 'pending')
  );
}

function buildNextAction(track?: TrackStatusSummary): string | undefined {
  if (!track) {
    return 'No tracks are defined. Run conductor_setup or conductor_new_track to begin.';
  }

  if (track.progress?.nextTask) {
    return `Continue with task #${track.progress.nextTask.index}: ${track.progress.nextTask.title}`;
  }

  if (track.status === 'in_progress') {
    return `Track '${track.description}' is in progress. Update plan.md with the next task.`;
  }

  if (track.status === 'pending') {
    return `Start track '${track.description}' by selecting the first task in its plan.`;
  }

  return undefined;
}

export function computeStatus(workspaceRoot: string, options?: { includeTaskDetails?: boolean }): StatusResult {
  const tracksPath = path.join(workspaceRoot, 'conductor', 'tracks.md');
  const trackEntries = parseTracksFile(readText(tracksPath));

  const tracks: TrackStatusSummary[] = trackEntries.map((entry) => {
    const summary: TrackStatusSummary = { ...entry };

    if (options?.includeTaskDetails) {
      const planPath = path.join(workspaceRoot, 'conductor', 'tracks', entry.id, 'plan.md');
      try {
        summary.progress = summarizePlan(planPath);
      } catch (error) {
        if (error instanceof ConductorError) {
          throw error;
        }
        throw new ConductorError({
          code: 'plan_parse_failed',
          message: `Failed to parse plan for track '${entry.id}'`,
          recovery: ['Ensure plan.md exists and follows the expected format'],
        });
      }
    }

    return summary;
  });

  const currentTrack = pickCurrentTrack(tracks);

  return {
    tracks,
    currentTrack,
    nextAction: buildNextAction(currentTrack),
  };
}
