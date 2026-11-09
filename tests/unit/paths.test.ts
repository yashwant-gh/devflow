import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { resolveSafePath, normalizeDisplayPath, getRelativePath } from '../../src/utils/paths.js';
import { FilesystemError } from '../../src/utils/errors.js';

describe('Paths and Security Utilities – Traversal and Boundary Protection', () => {
  const baseDir = path.resolve('test-base');

  it('1. should resolve valid relative subpath safely', () => {
    const resolved = resolveSafePath(baseDir, 'src/subfolder/file.ts');
    expect(resolved).toBe(path.join(baseDir, 'src', 'subfolder', 'file.ts'));
  });

  it('2. should resolve base directory itself with dot', () => {
    const resolved = resolveSafePath(baseDir, '.');
    expect(resolved).toBe(baseDir);
  });

  it('3. should throw FilesystemError on relative ../ path traversal attempt', () => {
    expect(() => {
      resolveSafePath(baseDir, '../outside-file.txt');
    }).toThrow(FilesystemError);

    expect(() => {
      resolveSafePath(baseDir, '../../etc/passwd');
    }).toThrow(FilesystemError);
  });

  it('4. should throw FilesystemError on Windows backslash traversal (..\\..\\)', () => {
    expect(() => {
      resolveSafePath(baseDir, '..\\outside.txt');
    }).toThrow(FilesystemError);

    expect(() => {
      resolveSafePath(baseDir, '..\\..\\windows\\system32');
    }).toThrow(FilesystemError);
  });

  it('5. should throw FilesystemError on mixed slash traversal (..\\../)', () => {
    expect(() => {
      resolveSafePath(baseDir, 'sub/..\\../../secret');
    }).toThrow(FilesystemError);

    expect(() => {
      resolveSafePath(baseDir, 'sub/../../outside.txt');
    }).toThrow(FilesystemError);
  });

  it('6. should reject absolute paths outside the base directory', () => {
    const outsideAbsolute = path.resolve(baseDir, '..', 'external.txt');
    expect(() => {
      resolveSafePath(baseDir, outsideAbsolute);
    }).toThrow(FilesystemError);
  });

  it('7. should reject Windows cross-drive letter traversal', () => {
    // If baseDir is on drive D:, attempting to target drive C: must be rejected
    const differentDrive =
      process.platform === 'win32' ? 'C:\\Windows\\System32\\cmd.exe' : '/var/log/syslog';
    expect(() => {
      resolveSafePath(baseDir, differentDrive);
    }).toThrow(FilesystemError);
  });

  it('8. should allow safe paths containing spaces and special characters inside baseDir', () => {
    const safeSpecial = 'folder with spaces/special #1/my file @ 2026.txt';
    const resolved = resolveSafePath(baseDir, safeSpecial);
    expect(resolved).toBe(
      path.join(baseDir, 'folder with spaces', 'special #1', 'my file @ 2026.txt'),
    );
  });

  it('9. should normalize display path to forward slashes', () => {
    expect(normalizeDisplayPath('a\\b\\c')).toBe('a/b/c');
    expect(normalizeDisplayPath('a/b/c')).toBe('a/b/c');
  });

  it('10. should calculate relative display path with forward slashes', () => {
    const from = path.resolve('root');
    const to = path.resolve('root', 'src', 'index.ts');
    expect(getRelativePath(from, to)).toBe('src/index.ts');
  });
});
