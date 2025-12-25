import { createError } from '../errors';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface PlanTask {
  index: number;
  phase: string;
  title: string;
  status: TaskStatus;
  sha?: string;
}

export interface PlanPhase {
  name: string;
  headingLine: number;
}

export interface ParsedPlan {
  phases: PlanPhase[];
  tasks: PlanTask[];
}

const statusFromMarker: Record<string, TaskStatus> = {
  ' ': 'pending',
  '~': 'in_progress',
  x: 'completed',
};

const markerFromStatus: Record<TaskStatus, string> = {
  pending: ' ',
  in_progress: '~',
  completed: 'x',
};

function normalizePhaseHeading(line: string): string | undefined {
  const match = line.match(/^##\s+(?:Phase\s+\d+[:\-]?\s*)?(.*\S)\s*$/i);
  return match?.[1]?.trim();
}

function parseTaskLine(line: string) {
  const match = line.match(/^- \[( |~|x)\]\s+Task:\s+(.+)$/);
  if (!match) {
    return undefined;
  }
  const marker = match[1];
  const remainder = match[2].trim();

  const shaMatch = remainder.match(/^(.*)\((?<sha>[0-9a-f]{7,40})\)\s*$/i);
  const title = shaMatch ? shaMatch[1].trim() : remainder;
  const sha = shaMatch?.groups?.sha;

  return { marker, title, sha } as const;
}

export function parsePlanFile(contents: string): ParsedPlan {
  const lines = contents.split(/\r?\n/);
  const phases: PlanPhase[] = [];
  const tasks: PlanTask[] = [];
  let currentPhase = 'Uncategorized';

  lines.forEach((line, idx) => {
    const heading = normalizePhaseHeading(line);
    if (heading) {
      currentPhase = heading;
      phases.push({ name: heading, headingLine: idx });
      return;
    }

    const task = parseTaskLine(line);
    if (task) {
      tasks.push({
        index: tasks.length + 1,
        phase: currentPhase,
        title: task.title,
        status: statusFromMarker[task.marker],
        sha: task.sha,
      });
    }
  });

  return { phases, tasks };
}

export function findNextTask(plan: ParsedPlan): PlanTask | undefined {
  return plan.tasks.find((task) => task.status === 'in_progress') ?? plan.tasks.find((task) => task.status === 'pending');
}

export function updateTaskStatus(contents: string, taskIndex: number, status: TaskStatus, sha?: string): string {
  if (taskIndex < 1) {
    throw createError('invalid_task_index', 'Task index must be >= 1');
  }

  const lines = contents.split(/\r?\n/);
  const marker = markerFromStatus[status];
  let currentIndex = 0;
  let updated = false;

  for (let i = 0; i < lines.length; i += 1) {
    const task = parseTaskLine(lines[i]);
    if (!task) {
      continue;
    }
    currentIndex += 1;
    if (currentIndex !== taskIndex) {
      continue;
    }

    const appliedSha = sha ?? task.sha;
    const suffix = appliedSha ? ` (${appliedSha.slice(0, 7)})` : '';
    lines[i] = `- [${marker}] Task: ${task.title}${suffix}`;
    updated = true;
    break;
  }

  if (!updated) {
    throw createError('task_not_found', `Task index ${taskIndex} does not exist in plan.md`, [
      'Confirm the task index aligns with the task order in plan.md',
      'Ensure plan.md contains task list items in the expected format',
    ]);
  }

  return lines.join('\n');
}

export function addPhaseCheckpoint(contents: string, phaseName: string, sha: string): string {
  const lines = contents.split(/\r?\n/);
  const shaShort = sha.slice(0, 7);
  let updated = false;

  for (let i = 0; i < lines.length; i += 1) {
    const heading = normalizePhaseHeading(lines[i]);
    if (!heading) {
      continue;
    }

    if (heading.toLowerCase() !== phaseName.toLowerCase()) {
      continue;
    }

    if (lines[i].includes('[checkpoint:')) {
      lines[i] = lines[i].replace(/\[checkpoint:[^\]]*\]/i, `[checkpoint: ${shaShort}]`);
    } else {
      lines[i] = `${lines[i].trimEnd()} [checkpoint: ${shaShort}]`;
    }
    updated = true;
    break;
  }

  if (!updated) {
    throw createError('phase_not_found', `Phase '${phaseName}' not found in plan.md`, [
      'Verify the phase heading exists and matches the provided name',
      'Ensure phase headings start with level 2 markdown headings (##)',
    ]);
  }

  return lines.join('\n');
}
