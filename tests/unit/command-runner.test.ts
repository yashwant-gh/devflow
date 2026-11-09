import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandRunner } from '../../src/core/command-runner.js';
import { ProcessExecutionError, DependencyError } from '../../src/utils/errors.js';

describe('CommandRunner Subprocess Execution & Safety Verification', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-cmd-test-'));
  });

  afterEach(async () => {
    try {
      await fs.remove(tempDir);
    } catch {
      // Ignored
    }
  });

  it('1. should run valid command and return stdout and execution duration', async () => {
    const runner = new CommandRunner();
    const result = await runner.run('node', ['-e', 'console.log("hello runner")']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello runner');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('2. should support dry-run mode without executing external process', async () => {
    const runner = new CommandRunner({ dryRun: true });
    const result = await runner.run('dangerous-command', ['--format', 'all']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[DRY-RUN]');
  });

  it('3. should throw ProcessExecutionError preserving exit code when command fails', async () => {
    const runner = new CommandRunner();
    try {
      await runner.run('node', ['-e', 'process.exit(42)']);
      expect.fail('Should have thrown ProcessExecutionError');
    } catch (err) {
      expect(err).toBeInstanceOf(ProcessExecutionError);
      expect((err as ProcessExecutionError).context?.exitCode).toBe(42);
    }
  });

  it('4. should preserve non-zero exit code when allowFailure is true', async () => {
    const runner = new CommandRunner();
    const result = await runner.run('node', ['-e', 'process.exit(2)'], { allowFailure: true });
    expect(result.exitCode).toBe(2);
  });

  it('5. should capture both stdout and stderr accurately', async () => {
    const runner = new CommandRunner();
    const result = await runner.run(
      'node',
      ['-e', 'console.log("standard out text"); console.error("standard err text")'],
      { allowFailure: true },
    );
    expect(result.stdout).toContain('standard out text');
    expect(result.stderr).toContain('standard err text');
  });

  it('6. should handle empty output gracefully without undefined', async () => {
    const runner = new CommandRunner();
    const result = await runner.run('node', ['-e', '']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('7. should safely pass arguments with shell metacharacters without shell injection', async () => {
    const runner = new CommandRunner();
    // Pass args with special characters that would break if passed through a raw shell
    const specialArg = 'arg; with & specials && | $(whoami) `echo 1` < > * " \' ';
    const result = await runner.run('node', ['-e', 'console.log(process.argv[1])', specialArg]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(specialArg.trim());
  });

  it('8. should safely execute commands in paths containing spaces', async () => {
    const spacedDir = path.join(tempDir, 'folder with spaces');
    await fs.ensureDir(spacedDir);

    const runner = new CommandRunner();
    const result = await runner.run('node', ['-e', 'console.log(process.cwd())'], {
      cwd: spacedDir,
    });
    expect(result.exitCode).toBe(0);
    expect(path.resolve(result.stdout.trim())).toBe(path.resolve(spacedDir));
  });

  it('9. should check executable availability accurately', async () => {
    const runner = new CommandRunner();
    const nodeAvailable = await runner.isExecutableAvailable('node');
    expect(nodeAvailable).toBe(true);

    const fakeAvailable = await runner.isExecutableAvailable(
      'totally-non-existent-executable-xyz-999',
    );
    expect(fakeAvailable).toBe(false);
  });

  it('10. should throw DependencyError when executing a non-existent executable', async () => {
    const runner = new CommandRunner();
    await expect(runner.run('definitely-not-an-executable-xyz-123456789')).rejects.toThrow(
      DependencyError,
    );
  });

  it('11. should reject execution when working directory does not exist', async () => {
    const runner = new CommandRunner();
    await expect(
      runner.run('node', ['--version'], { cwd: 'd:/definitely/non/existent/path/99999' }),
    ).rejects.toThrow(ProcessExecutionError);
  });

  it('12. should abort and terminate child process when command times out', async () => {
    const runner = new CommandRunner();
    await expect(
      runner.run('node', ['-e', 'setTimeout(() => {}, 5000)'], { timeout: 300 }),
    ).rejects.toThrow(/timed out/i);
  });
});
