import path from 'node:path';
import fs from 'fs-extra';
import { FilesystemError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { resolveSafePath } from '../utils/paths.js';

export interface FileOperationResult {
  action: 'created' | 'updated' | 'skipped' | 'deleted';
  path: string;
  bytes?: number;
}

export interface WriteFileOptions {
  overwrite?: boolean;
  dryRun?: boolean;
  atomic?: boolean;
}

export class FileManager {
  private baseDir: string;
  private dryRun = false;
  private createdFiles: string[] = [];

  constructor(baseDir: string = process.cwd(), options: { dryRun?: boolean } = {}) {
    this.baseDir = path.resolve(baseDir);
    this.dryRun = !!options.dryRun;
  }

  public setBaseDir(baseDir: string): void {
    this.baseDir = path.resolve(baseDir);
  }

  public getBaseDir(): string {
    return this.baseDir;
  }

  public setDryRun(dryRun: boolean): void {
    this.dryRun = dryRun;
  }

  public getCreatedFiles(): string[] {
    return [...this.createdFiles];
  }

  public clearTrackedFiles(): void {
    this.createdFiles = [];
  }

  /**
   * Safely write content to a file with conflict checking, atomic writes, and dry-run support.
   */
  public async writeFile(
    targetRelativePath: string,
    content: string,
    options: WriteFileOptions = {},
  ): Promise<FileOperationResult> {
    const isDryRun = options.dryRun ?? this.dryRun;
    const safePath = resolveSafePath(this.baseDir, targetRelativePath);
    const exists = await fs.pathExists(safePath);

    if (exists && !options.overwrite) {
      // Check if existing content is already identical
      const existingContent = await fs.readFile(safePath, 'utf-8');
      if (existingContent === content) {
        return { action: 'skipped', path: safePath, bytes: 0 };
      }
      throw new FilesystemError(
        `File already exists and overwrite is not enabled: ${targetRelativePath}`,
        {
          context: { file: targetRelativePath, absolutePath: safePath },
          suggestion: 'Pass --force or enable overwrite to update this file.',
        },
      );
    }

    if (isDryRun) {
      logger.info(`[DRY-RUN] Would ${exists ? 'update' : 'create'}: ${targetRelativePath}`);
      return {
        action: exists ? 'updated' : 'created',
        path: safePath,
        bytes: Buffer.byteLength(content, 'utf-8'),
      };
    }

    try {
      await fs.ensureDir(path.dirname(safePath));

      if (options.atomic ?? true) {
        const tempPath = `${safePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
        await fs.writeFile(tempPath, content, 'utf-8');
        await fs.rename(tempPath, safePath);
      } else {
        await fs.writeFile(safePath, content, 'utf-8');
      }

      if (!exists) {
        this.createdFiles.push(safePath);
      }

      return {
        action: exists ? 'updated' : 'created',
        path: safePath,
        bytes: Buffer.byteLength(content, 'utf-8'),
      };
    } catch (err: unknown) {
      const error = err as any;
      throw new FilesystemError(`Failed to write file "${targetRelativePath}": ${error.message}`, {
        context: { targetRelativePath, safePath },
        suggestion: 'Verify filesystem permissions and disk space.',
        cause: error,
      });
    }
  }

  /**
   * Safely read a file.
   */
  public async readFile(targetRelativePath: string): Promise<string> {
    const safePath = resolveSafePath(this.baseDir, targetRelativePath);
    try {
      return await fs.readFile(safePath, 'utf-8');
    } catch (err: unknown) {
      const error = err as any;
      throw new FilesystemError(`Failed to read file "${targetRelativePath}": ${error.message}`, {
        context: { targetRelativePath, safePath },
        suggestion: 'Verify the file exists and is readable.',
        cause: error,
      });
    }
  }

  /**
   * Check if file or directory exists.
   */
  public async exists(targetRelativePath: string): Promise<boolean> {
    try {
      const safePath = resolveSafePath(this.baseDir, targetRelativePath);
      return await fs.pathExists(safePath);
    } catch {
      return false;
    }
  }

  /**
   * Safely read JSON file.
   */
  public async readJson<T = unknown>(targetRelativePath: string): Promise<T> {
    const content = await this.readFile(targetRelativePath);
    try {
      return JSON.parse(content) as T;
    } catch (err: unknown) {
      throw new FilesystemError(
        `Failed to parse JSON file "${targetRelativePath}": ${(err as Error).message}`,
        {
          context: { file: targetRelativePath },
          suggestion: 'Ensure the file contains valid JSON.',
        },
      );
    }
  }

  /**
   * Ensure directory exists safely.
   */
  public async ensureDir(targetRelativePath: string): Promise<void> {
    if (this.dryRun) return;
    const safePath = resolveSafePath(this.baseDir, targetRelativePath);
    await fs.ensureDir(safePath);
  }

  /**
   * Rollback created files in reverse order if generation fails.
   */
  public async rollback(): Promise<string[]> {
    const rolledBack: string[] = [];
    while (this.createdFiles.length > 0) {
      const filePath = this.createdFiles.pop();
      if (!filePath) continue;
      try {
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          rolledBack.push(filePath);
        }
      } catch (err) {
        logger.debug(`Rollback failed for ${filePath}: ${(err as Error).message}`);
      }
    }
    return rolledBack;
  }
}
