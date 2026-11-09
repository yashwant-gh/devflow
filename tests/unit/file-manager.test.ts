import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileManager } from '../../src/core/file-manager.js';
import { FilesystemError } from '../../src/utils/errors.js';

describe('FileManager Safe Operations & Overwrite Protection', () => {
  let tempDir: string;
  let fileManager: FileManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-fm-test-'));
    fileManager = new FileManager(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.remove(tempDir);
    } catch {
      // Ignored
    }
  });

  it('1. should write and read file content within base directory', async () => {
    const result = await fileManager.writeFile('test.txt', 'Hello World');
    expect(result.action).toBe('created');
    expect(await fileManager.exists('test.txt')).toBe(true);

    const content = await fileManager.readFile('test.txt');
    expect(content).toBe('Hello World');
  });

  it('2. should prevent overwriting existing file unless overwrite enabled', async () => {
    await fileManager.writeFile('config.json', '{"a": 1}');

    await expect(fileManager.writeFile('config.json', '{"a": 2}')).rejects.toThrow(FilesystemError);

    const updated = await fileManager.writeFile('config.json', '{"a": 2}', { overwrite: true });
    expect(updated.action).toBe('updated');
    expect(await fileManager.readFile('config.json')).toBe('{"a": 2}');
  });

  it('3. should skip write if existing content is already identical', async () => {
    await fileManager.writeFile('same.txt', 'identical content');
    const res = await fileManager.writeFile('same.txt', 'identical content');
    expect(res.action).toBe('skipped');
  });

  it('4. should support dry-run without writing to disk', async () => {
    fileManager.setDryRun(true);
    const res = await fileManager.writeFile('dry.txt', 'will not exist');
    expect(res.action).toBe('created');
    expect(await fs.pathExists(path.join(tempDir, 'dry.txt'))).toBe(false);
  });

  it('5. should safely write files in nested directories with spaces and special characters', async () => {
    const nestedSpaced = 'nested dir with space/item #1/data @ 2026.json';
    const res = await fileManager.writeFile(nestedSpaced, '{"valid": true}');
    expect(res.action).toBe('created');
    expect(await fileManager.exists(nestedSpaced)).toBe(true);

    const readBack = await fileManager.readJson<{ valid: boolean }>(nestedSpaced);
    expect(readBack.valid).toBe(true);
  });

  it('6. should track created files and support atomic rollback on failure', async () => {
    await fileManager.writeFile('file1.txt', '1');
    await fileManager.writeFile('file2.txt', '2');

    expect(await fileManager.exists('file1.txt')).toBe(true);
    expect(await fileManager.exists('file2.txt')).toBe(true);

    const rolledBack = await fileManager.rollback();
    expect(rolledBack.length).toBe(2);
    expect(await fileManager.exists('file1.txt')).toBe(false);
    expect(await fileManager.exists('file2.txt')).toBe(false);
  });

  it('7. should block path traversal attacks via ../', async () => {
    await expect(fileManager.writeFile('../traversal.txt', 'bad')).rejects.toThrow(FilesystemError);
  });

  it('8. should block path traversal attacks via backslashes and mixed slashes', async () => {
    await expect(fileManager.writeFile('..\\traversal-win.txt', 'bad')).rejects.toThrow(
      FilesystemError,
    );
    await expect(fileManager.writeFile('sub/..\\../outside.txt', 'bad')).rejects.toThrow(
      FilesystemError,
    );
  });
});
