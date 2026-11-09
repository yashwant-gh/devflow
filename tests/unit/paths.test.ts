import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { resolveSafePath, normalizeDisplayPath, getRelativePath } from '../../src/utils/paths.js';
import { FilesystemError } from '../../src/utils/errors.js';

describe('Paths and Security Utilities', () => {
  const baseDir = path.resolve('test-base');

  it('should resolve valid subpath safely', () => {
    const resolved = resolveSafePath(baseDir, 'src/subfolder/file.ts');
    expect(resolved).toBe(path.join(baseDir, 'src', 'subfolder', 'file.ts'));
  });

  it('should resolve base directory itself', () => {
    const resolved = resolveSafePath(baseDir, '.');
    expect(resolved).toBe(baseDir);
  });

  it('should throw FilesystemError on path traversal attempt', () => {
    expect(() => {
      resolveSafePath(baseDir, '../outside-file.txt');
    }).toThrow(FilesystemError);

    expect(() => {
      resolveSafePath(baseDir, '../../etc/passwd');
    }).toThrow(FilesystemError);
  });

  it('should normalize display path to forward slashes', () => {
    expect(normalizeDisplayPath('a\\b\\c')).toBe('a/b/c');
    expect(normalizeDisplayPath('a/b/c')).toBe('a/b/c');
  });

  it('should calculate relative display path', () => {
    const from = path.resolve('root');
    const to = path.resolve('root', 'src', 'index.ts');
    expect(getRelativePath(from, to)).toBe('src/index.ts');
  });
});
