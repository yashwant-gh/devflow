import path from 'node:path';
import fs from 'fs-extra';
import { execa, type Options as ExecaOptions, type ResultPromise } from 'execa';
import { ProcessExecutionError, DependencyError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_EXEC_TIMEOUT_MS } from '../utils/constants.js';

export interface CommandRunOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  dryRun?: boolean;
  shell?: boolean;
  stdin?: string;
  allowFailure?: boolean;
}

export interface CommandRunResult {
  command: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export class CommandRunner {
  private dryRun = false;

  constructor(options: { dryRun?: boolean } = {}) {
    this.dryRun = !!options.dryRun;
  }

  public setDryRun(dryRun: boolean): void {
    this.dryRun = dryRun;
  }

  public async run(
    file: string,
    args: string[] = [],
    options: CommandRunOptions = {},
  ): Promise<CommandRunResult> {
    const isDryRun = options.dryRun ?? this.dryRun;
    const commandStr = `${file} ${args.join(' ')}`.trim();

    if (isDryRun) {
      logger.info(`[DRY-RUN] Would execute: ${commandStr}`);
      return {
        command: file,
        args,
        exitCode: 0,
        stdout: `[DRY-RUN] Simulated execution of: ${commandStr}`,
        stderr: '',
        durationMs: 0,
      };
    }

    const targetCwd = path.resolve(options.cwd || process.cwd());
    if (!(await fs.pathExists(targetCwd))) {
      throw new ProcessExecutionError(`Working directory "${targetCwd}" does not exist.`, {
        context: { cwd: targetCwd, command: commandStr },
        suggestion: 'Verify that the working directory path exists and is accessible.',
      });
    }

    logger.debug(`Executing command: ${commandStr} (cwd: ${targetCwd})`);
    const startTime = Date.now();

    const execaOptions: ExecaOptions = {
      cwd: targetCwd,
      env: {
        ...process.env,
        ...options.env,
      },
      timeout: options.timeout ?? DEFAULT_EXEC_TIMEOUT_MS,
      reject: false, // Don't throw directly so we can inspect and sanitize
      shell: options.shell ?? false,
      windowsHide: true,
      cleanup: true,
      killSignal: 'SIGTERM',
    };

    try {
      const subprocess: ResultPromise = execa(file, args, execaOptions);
      const result = await subprocess;
      const durationMs = Date.now() - startTime;

      const stdout = logger.sanitize(String(result.stdout ?? ''));
      const stderr = logger.sanitize(String(result.stderr ?? ''));

      if ((result as any).timedOut) {
        throw new ProcessExecutionError(
          `Command "${commandStr}" timed out after ${options.timeout ?? DEFAULT_EXEC_TIMEOUT_MS}ms.`,
          {
            processExitCode: 124,
            stdout,
            stderr,
            context: { command: commandStr, timeout: options.timeout ?? DEFAULT_EXEC_TIMEOUT_MS },
            suggestion:
              'Process exceeded timeout limit. Ensure external process is not hanging or waiting for interactive input.',
          },
        );
      }

      if (result.exitCode !== 0 && !options.allowFailure) {
        throw new ProcessExecutionError(
          `Command "${commandStr}" failed with exit code ${result.exitCode}.`,
          {
            processExitCode: result.exitCode ?? 1,
            stdout,
            stderr,
            context: { command: commandStr, exitCode: result.exitCode, cwd: options.cwd },
            suggestion:
              stderr.includes('not found') || stderr.includes('ENOENT')
                ? `Ensure "${file}" is installed and available in your system PATH.`
                : `Review the error output above and verify arguments.`,
          },
        );
      }

      return {
        command: file,
        args,
        exitCode: result.exitCode ?? 0,
        stdout,
        stderr,
        durationMs,
      };
    } catch (err: unknown) {
      if (err instanceof ProcessExecutionError) {
        throw err;
      }

      const error = err as any;
      if (error?.code === 'ENOENT') {
        throw new DependencyError(
          `Required executable "${file}" was not found in your system PATH.`,
          {
            context: { file, command: commandStr },
            suggestion: `Please install "${file}" or verify that it is in your system PATH.`,
            cause: error,
          },
        );
      }

      throw new ProcessExecutionError(`Failed to execute "${commandStr}": ${error.message}`, {
        stdout: error.stdout ? logger.sanitize(String(error.stdout)) : undefined,
        stderr: error.stderr ? logger.sanitize(String(error.stderr)) : error.message,
        context: { command: commandStr },
        cause: error,
      });
    }
  }

  public async isExecutableAvailable(cmd: string): Promise<boolean> {
    try {
      const checkCmd = process.platform === 'win32' ? 'where' : 'which';
      const result = await execa(checkCmd, [cmd], { reject: false });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
}

export const commandRunner = new CommandRunner();
