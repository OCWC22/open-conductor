import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { afterEach, beforeEach, test } from 'node:test';
import { ensureDir, fileExists, readFileOptional, writeFileAtomic } from '../fs';

const TMP_ROOT = path.join(process.cwd(), 'tmp-test-fs');

beforeEach(async () => {
  await fs.promises.rm(TMP_ROOT, { recursive: true, force: true });
  await fs.promises.mkdir(TMP_ROOT, { recursive: true });
});

afterEach(async () => {
  await fs.promises.rm(TMP_ROOT, { recursive: true, force: true });
});

test('creates directories recursively', async () => {
  const nested = path.join(TMP_ROOT, 'a', 'b', 'c');
  await ensureDir(nested);
  const stats = await fs.promises.stat(nested);
  assert.ok(stats.isDirectory());
});

test('performs atomic writes and reads back content', async () => {
  const target = path.join(TMP_ROOT, 'file.txt');
  await writeFileAtomic(target, 'hello world');
  const content = await fs.promises.readFile(target, 'utf8');
  assert.strictEqual(content, 'hello world');
});

test('reports existence correctly', async () => {
  const target = path.join(TMP_ROOT, 'exists.txt');
  await fs.promises.writeFile(target, 'exists', 'utf8');
  assert.ok(await fileExists(target));
  assert.ok(!(await fileExists(path.join(TMP_ROOT, 'missing.txt'))));
});

test('reads optional file and returns undefined when missing', async () => {
  const target = path.join(TMP_ROOT, 'optional.txt');
  assert.strictEqual(await readFileOptional(target), undefined);
  await fs.promises.writeFile(target, 'content', 'utf8');
  assert.strictEqual(await readFileOptional(target), 'content');
});
