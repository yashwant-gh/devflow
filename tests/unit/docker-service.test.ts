import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DockerService } from '../../src/modules/docker/docker-service.js';
import { commandRunner } from '../../src/core/command-runner.js';

describe('DockerService Generation, Validation, and Build Intelligence', () => {
  let tempDir: string;
  let dockerService: DockerService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-docker-test-'));
    dockerService = new DockerService();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      await fs.remove(tempDir);
    } catch {
      // Ignored
    }
  });

  it('1. should generate Node.js multi-stage Dockerfile and docker-compose', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'dockerized-api',
      dependencies: { express: '^4.21.0' },
    });

    const results = await dockerService.generate({
      cwd: tempDir,
      includeCompose: true,
      includePostgres: true,
      includeRedis: true,
    });

    expect(results.length).toBe(3); // Dockerfile, .dockerignore, docker-compose.yml
    expect(await fs.pathExists(path.join(tempDir, 'Dockerfile'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, '.dockerignore'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, 'docker-compose.yml'))).toBe(true);

    const composeContent = await fs.readFile(path.join(tempDir, 'docker-compose.yml'), 'utf-8');
    expect(composeContent).toContain('postgres:16-alpine');
    expect(composeContent).toContain('redis:7-alpine');
    expect(composeContent).toContain('healthcheck:');

    const validation = await dockerService.validate(tempDir);
    expect(validation.valid).toBe(true);
    expect(validation.hasDockerfile).toBe(true);
    expect(validation.hasCompose).toBe(true);
  });

  it('2. should clearly distinguish when Docker CLI is not installed', async () => {
    await fs.writeFile(path.join(tempDir, 'Dockerfile'), 'FROM node:22-alpine\nCMD ["node"]\n');

    vi.spyOn(commandRunner, 'isExecutableAvailable').mockResolvedValue(false);

    const status = await dockerService.checkDockerStatus();
    expect(status.installed).toBe(false);
    expect(status.daemonRunning).toBe(false);

    const validation = await dockerService.validate(tempDir);
    expect(validation.valid).toBe(true); // static syntax valid
    expect(validation.dockerInstalled).toBe(false);
    expect(validation.daemonRunning).toBe(false);
    expect(validation.status).toBe('not_installed');
    expect(validation.warnings.some((w) => w.includes('Docker CLI is not installed'))).toBe(true);
  });

  it('3. should clearly distinguish when Docker is installed but daemon is stopped', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Dockerfile'),
      'FROM node:22-alpine\nUSER node\nCMD ["node"]\n',
    );

    vi.spyOn(commandRunner, 'isExecutableAvailable').mockResolvedValue(true);
    vi.spyOn(commandRunner, 'run').mockResolvedValue({
      command: 'docker version',
      args: [],
      exitCode: 1, // daemon offline
      stdout: '',
      stderr:
        'error during connect: This error may indicate that the docker daemon is not running.',
      durationMs: 15,
    });

    const status = await dockerService.checkDockerStatus();
    expect(status.installed).toBe(true);
    expect(status.daemonRunning).toBe(false);

    const validation = await dockerService.validate(tempDir);
    expect(validation.valid).toBe(true);
    expect(validation.dockerInstalled).toBe(true);
    expect(validation.daemonRunning).toBe(false);
    expect(validation.status).toBe('daemon_stopped');
    expect(validation.warnings.some((w) => w.includes('daemon is stopped'))).toBe(true);
  });

  it('4. should identify when Docker daemon is running and active', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Dockerfile'),
      'FROM node:22-alpine\nUSER node\nCMD ["node"]\n',
    );

    vi.spyOn(commandRunner, 'isExecutableAvailable').mockResolvedValue(true);
    vi.spyOn(commandRunner, 'run').mockResolvedValue({
      command: 'docker version',
      args: [],
      exitCode: 0,
      stdout: '27.2.0',
      stderr: '',
      durationMs: 15,
    });

    const status = await dockerService.checkDockerStatus();
    expect(status.installed).toBe(true);
    expect(status.daemonRunning).toBe(true);
    expect(status.version).toBe('27.2.0');

    const validation = await dockerService.validate(tempDir);
    expect(validation.valid).toBe(true);
    expect(validation.status).toBe('running');
    expect(validation.daemonRunning).toBe(true);
  });

  it('5. should reject build request when Dockerfile is missing', async () => {
    const buildResult = await dockerService.buildImage({ cwd: tempDir, tag: 'my-app:1.0' });
    expect(buildResult.success).toBe(false);
    expect(buildResult.failureReason).toBe('no_dockerfile');
    expect(buildResult.error).toContain('No Dockerfile found');
  });

  it('6. should reject build request with clear error when Docker daemon is not running', async () => {
    await fs.writeFile(path.join(tempDir, 'Dockerfile'), 'FROM node:22-alpine\n');

    vi.spyOn(commandRunner, 'isExecutableAvailable').mockResolvedValue(true);
    vi.spyOn(commandRunner, 'run').mockResolvedValue({
      command: 'docker version',
      args: [],
      exitCode: 1,
      stdout: '',
      stderr: 'daemon not running',
      durationMs: 10,
    });

    const buildResult = await dockerService.buildImage({ cwd: tempDir, tag: 'my-app:1.0' });
    expect(buildResult.success).toBe(false);
    expect(buildResult.failureReason).toBe('daemon_stopped');
    expect(buildResult.error).toContain('Docker daemon is not running');
  });

  it('7. should report build failure and error output when docker build command fails', async () => {
    await fs.writeFile(path.join(tempDir, 'Dockerfile'), 'FROM node:22-alpine\nRUN exit 1\n');

    vi.spyOn(commandRunner, 'isExecutableAvailable').mockResolvedValue(true);
    vi.spyOn(commandRunner, 'run').mockImplementation(async (file, args) => {
      if (args[0] === 'version') {
        return {
          command: 'docker version',
          args,
          exitCode: 0,
          stdout: '27.0.0',
          stderr: '',
          durationMs: 5,
        };
      }
      return {
        command: 'docker build',
        args,
        exitCode: 1,
        stdout: 'Step 1/2: FROM node:22-alpine\nStep 2/2: RUN exit 1',
        stderr: 'The command "/bin/sh -c exit 1" returned a non-zero code: 1',
        durationMs: 120,
      };
    });

    const buildResult = await dockerService.buildImage({
      cwd: tempDir,
      tag: 'failing-image:latest',
    });
    expect(buildResult.success).toBe(false);
    expect(buildResult.failureReason).toBe('build_failed');
    expect(buildResult.error).toContain('returned a non-zero code: 1');
  });

  it('8. should report success ONLY when docker build actually succeeds', async () => {
    await fs.writeFile(path.join(tempDir, 'Dockerfile'), 'FROM node:22-alpine\nCMD ["node"]\n');

    vi.spyOn(commandRunner, 'isExecutableAvailable').mockResolvedValue(true);
    vi.spyOn(commandRunner, 'run').mockImplementation(async (file, args) => {
      if (args[0] === 'version') {
        return {
          command: 'docker version',
          args,
          exitCode: 0,
          stdout: '27.0.0',
          stderr: '',
          durationMs: 5,
        };
      }
      return {
        command: 'docker build',
        args,
        exitCode: 0,
        stdout: 'Successfully built 7d5a8b9e1c2d\nSuccessfully tagged my-app:2.0',
        stderr: '',
        durationMs: 250,
      };
    });

    const buildResult = await dockerService.buildImage({ cwd: tempDir, tag: 'my-app:2.0' });
    expect(buildResult.success).toBe(true);
    expect(buildResult.tag).toBe('my-app:2.0');
    expect(buildResult.output).toContain('Successfully built');
  });

  it('9. should detect invalid Dockerfile syntax missing FROM instruction', async () => {
    await fs.writeFile(path.join(tempDir, 'Dockerfile'), 'RUN echo "missing FROM"\n');

    const validation = await dockerService.validate(tempDir);
    expect(validation.valid).toBe(false);
    expect(validation.status).toBe('invalid_config');
    expect(validation.error).toContain('FROM');
  });
});
