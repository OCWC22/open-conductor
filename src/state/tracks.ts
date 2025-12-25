import { ConductorError, createError } from '../errors';

export type TrackStatus = 'pending' | 'in_progress' | 'completed';

export interface TrackEntry {
  id: string;
  description: string;
  status: TrackStatus;
}

const statusToMarker: Record<TrackStatus, string> = {
  pending: ' ',
  in_progress: '~',
  completed: 'x',
};

const markerToStatus: Record<string, TrackStatus> = {
  ' ': 'pending',
  '~': 'in_progress',
  x: 'completed',
};

function extractTrackId(lines: string[], startIndex: number): string | undefined {
  for (let offset = 1; offset <= 3 && startIndex + offset < lines.length; offset += 1) {
    const linkMatch = lines[startIndex + offset].match(/conductor\/tracks\/([^/]+)\//);
    if (linkMatch) {
      return linkMatch[1];
    }
  }
  return undefined;
}

export function parseTracksFile(contents: string): TrackEntry[] {
  const lines = contents.split(/\r?\n/);
  const entries: TrackEntry[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index].match(/^## \[( |~|x)\] Track: (.+)$/);
    if (!headingMatch) {
      continue;
    }

    const marker = headingMatch[1];
    const description = headingMatch[2].trim();
    const id = extractTrackId(lines, index) ?? `track_${entries.length + 1}`;
    const status = markerToStatus[marker];

    entries.push({ id, description, status });
  }

  return entries;
}

export function updateTrackStatus(contents: string, trackId: string, status: TrackStatus): string {
  const lines = contents.split(/\r?\n/);
  const marker = statusToMarker[status];
  let updated = false;

  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index].match(/^## \[( |~|x)\] Track: (.+)$/);
    if (!headingMatch) {
      continue;
    }

    const candidateId = extractTrackId(lines, index);
    if (candidateId !== trackId) {
      continue;
    }

    const description = headingMatch[2].trim();
    lines[index] = `## [${marker}] Track: ${description}`;
    updated = true;
    break;
  }

  if (!updated) {
    throw createError('track_not_found', `Track with id '${trackId}' not found in tracks.md`, [
      'Verify the track id exists in conductor/tracks.md',
      'Ensure the track entry includes a link to its folder',
    ]);
  }

  return lines.join('\n');
}

export function appendTrack(contents: string, entry: TrackEntry): string {
  const marker = statusToMarker[entry.status];
  const block = [
    `## [${marker}] Track: ${entry.description}`,
    `*Link: [./conductor/tracks/${entry.id}/](./conductor/tracks/${entry.id}/)*`,
  ].join('\n');

  const trimmed = contents.trimEnd();
  const prefix = trimmed.length > 0 ? `${trimmed}\n\n` : '';
  return `${prefix}${block}\n`;
}

export function assertTrackExists(entries: TrackEntry[], trackId: string): TrackEntry {
  const entry = entries.find((item) => item.id === trackId);
  if (!entry) {
    throw new ConductorError({
      code: 'track_not_found',
      message: `Track '${trackId}' does not exist`,
      recovery: [
        'List tracks from conductor/tracks.md',
        'Verify the track id matches the folder name under conductor/tracks',
      ],
    });
  }
  return entry;
}
