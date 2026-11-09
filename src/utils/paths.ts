import path from 'node:path';
import { FilesystemError } from './errors.js';

/**
 * Ensures that a target path is safely contained within a base directory,
 * preventing directory traversal attacks.
 */
export function resolveSafePath(baseDir: string, relativeOrAbsolutePath: string): string {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.isAbsolute(relativeOrAbsolutePath)
    ? path.resolve(relativeOrAbsolutePath)
    : path.resolve(resolvedBase, relativeOrAbsolutePath);

  // Check if target is equal to or sub-path of resolvedBase
  const relative = path.relative(resolvedBase, resolvedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new FilesystemError(
      `Access denied: Path "${relativeOrAbsolutePath}" traverses outside base directory "${baseDir}".`,
      {
        suggestion: 'Ensure relative paths do not use ".." to escape the workspace boundary.',
        context: { baseDir, targetPath: relativeOrAbsolutePath, resolvedTarget },
      },
    );
  }

  return resolvedTarget;
}

/**
 * Normalize path for display, converting Windows backslashes to forward slashes.
 */
export function normalizeDisplayPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Returns a relative path from the current working directory.
 */
export function getRelativePath(from: string, to: string): string {
  const rel = path.relative(from, to);
  return normalizeDisplayPath(rel || '.');
}
