import { describe, expect, it } from 'vitest';
import { appendTrack, parseTracksFile, updateTrackStatus } from '../tracks';

const sample = `# Project Tracks

## [ ] Track: Initial setup
*Link: [./conductor/tracks/track_20240101/](./conductor/tracks/track_20240101/)*

## [~] Track: Implementation
*Link: [./conductor/tracks/impl_20240102/](./conductor/tracks/impl_20240102/)*\n`;

describe('tracks parsing', () => {
  it('parses multiple track entries', () => {
    const tracks = parseTracksFile(sample);
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({ id: 'track_20240101', description: 'Initial setup', status: 'pending' });
    expect(tracks[1]).toMatchObject({ id: 'impl_20240102', description: 'Implementation', status: 'in_progress' });
  });

  it('updates track status by id', () => {
    const updated = updateTrackStatus(sample, 'track_20240101', 'completed');
    expect(updated).toContain('## [x] Track: Initial setup');
  });

  it('appends new track entries with canonical layout', () => {
    const next = appendTrack(sample, { id: 'new_20240103', description: 'QA hardening', status: 'pending' });
    expect(next.trimEnd().endsWith('## [ ] Track: QA hardening\n*Link: [./conductor/tracks/new_20240103/](./conductor/tracks/new_20240103/)*')).toBe(true);
  });
});
