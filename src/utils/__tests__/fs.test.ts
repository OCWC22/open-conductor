import fs from 'fs';
import path from 'path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ensureDir, fileExists, readFileOptional, writeFileAtomic } from '../fs';

const TMP_ROOT = path.join(process.cwd(), 'tmp-test-fs');

beforeEach(async () => {
  await fs.promises.rm(TMP_ROOT, { recursive: true, force: true });
  await fs.promises.mkdir(TMP_ROOT, { recursive: true });
});

afterEach(async () => {
  await fs.promises.rm(TMP_ROOT, { recursive: true, force: true });
});

describe('fs utilities', () => {
  it('creates directories recursively', async () => {
    const nested = path.join(TMP_ROOT, 'a', 'b', 'c');
    await ensureDir(nested);
    const stats = await fs.promises.stat(nested);
    expect(stats.isDirectory()).toBe(true);
  });

  it('performs atomic writes and reads back content', async () => {
    const target = path.join(TMP_ROOT, 'file.txt');
    await writeFileAtomic(target, 'hello world');
    const content = await fs.promises.readFile(target, 'utf8');
    expect(content).toBe('hello world');
  });

  it('reports existence correctly', async () => {
    const target = path.join(TMP_ROOT, 'exists.txt');
    await fs.promises.writeFile(target, 'exists', 'utf8');
    expect(await fileExists(target)).toBe(true);
    expect(await fileExists(path.join(TMP_ROOT, 'missing.txt'))).toBe(false);
  });

  it('reads optional file and returns undefined when missing', async () => {
    const target = path.join(TMP_ROOT, 'optional.txt');
    expect(await readFileOptional(target)).toBeUndefined();
    await fs.promises.writeFile(target, 'content', 'utf8');
    expect(await readFileOptional(target)).toBe('content');
  });
});
