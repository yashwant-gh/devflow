import { describe, it, expect } from 'vitest';
import { CommandRunner } from '../../src/core/command-runner.js';
import { ProcessExecutionError } from '../../src/utils/errors.js';

describe('CommandRunner Subprocess Execution', () => {
  it('should run valid command and return stdout', async () => {
    const runner = new CommandRunner();
    const result = await runner.run('node', ['-e', 'console.log("hello runner")']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello runner');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should support dry-run mode without executing', async () => {
    const runner = new CommandRunner({ dryRun: true });
    const result = await runner.run('dangerous-command', ['--format', 'all']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[DRY-RUN]');
  });

  it('should throw ProcessExecutionError when command exits with non-zero code', async () => {
    const runner = new CommandRunner();
    await expect(runner.run('node', ['-e', 'process.exit(2)'])).rejects.toThrow(
      ProcessExecutionError,
    );
  });

  it('should allow failure when allowFailure is true', async () => {
    const runner = new CommandRunner();
    const result = await runner.run('node', ['-e', 'process.exit(2)'], { allowFailure: true });
    expect(result.exitCode).toBe(2);
  });

  it('should check if executable is available', async () => {
    const runner = new CommandRunner();
    const nodeAvailable = await runner.isExecutableAvailable('node');
    expect(nodeAvailable).toBe(true);

    const fakeAvailable = await runner.isExecutableAvailable('totally-non-existent-executable-xyz');
    expect(fakeAvailable).toBe(false);
  });

  it('should reject execution when working directory does not exist', async () => {
    const runner = new CommandRunner();
    await expect(
      runner.run('node', ['--version'], { cwd: 'd:/definitely/non/existent/path/99999' }),
    ).rejects.toThrow(ProcessExecutionError);
  });

  it('should abort and throw ProcessExecutionError when command times out', async () => {
    const runner = new CommandRunner();
    await expect(
      runner.run('node', ['-e', 'setTimeout(() => {}, 5000)'], { timeout: 300 }),
    ).rejects.toThrow(/timed out/i);
  });
});
