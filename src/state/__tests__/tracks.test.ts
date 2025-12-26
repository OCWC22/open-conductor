import assert from 'assert';
import { test } from 'node:test';
import { appendTrack, parseTracksFile, updateTrackStatus } from '../tracks';

const sample = `# Project Tracks

## [ ] Track: Initial setup
*Link: [./conductor/tracks/track_20240101/](./conductor/tracks/track_20240101/)*

## [~] Track: Implementation
*Link: [./conductor/tracks/impl_20240102/](./conductor/tracks/impl_20240102/)*\n`;

test('parses multiple track entries', () => {
  const tracks = parseTracksFile(sample);
  assert.strictEqual(tracks.length, 2);
  assert.deepStrictEqual(tracks[0], { id: 'track_20240101', description: 'Initial setup', status: 'pending' });
  assert.deepStrictEqual(tracks[1], { id: 'impl_20240102', description: 'Implementation', status: 'in_progress' });
});

test('updates track status by id', () => {
  const updated = updateTrackStatus(sample, 'track_20240101', 'completed');
  assert.ok(updated.includes('## [x] Track: Initial setup'));
});

test('appends new track entries with canonical layout', () => {
  const next = appendTrack(sample, { id: 'new_20240103', description: 'QA hardening', status: 'pending' });
  assert.ok(next.trimEnd().endsWith('## [ ] Track: QA hardening\n*Link: [./conductor/tracks/new_20240103/](./conductor/tracks/new_20240103/)*'));
});
