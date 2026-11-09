import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectDetector } from '../../src/core/project-detector.js';

describe('ProjectDetector Capabilities', () => {
  let tempDir: string;
  let detector: ProjectDetector;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-detector-test-'));
    detector = new ProjectDetector(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should detect Node.js Express API project', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'express-test-api',
      dependencies: { express: '^4.21.0' },
    });
    await fs.writeFile(path.join(tempDir, 'package-lock.json'), '{}');
    await fs.writeFile(path.join(tempDir, 'Dockerfile'), 'FROM node:22\n');
    await fs.ensureDir(path.join(tempDir, '.git'));

    const info = await detector.detect();
    expect(info.type).toBe('node-api');
    expect(info.name).toBe('express-test-api');
    expect(info.packageManager).toBe('npm');
    expect(info.hasDocker).toBe(true);
    expect(info.hasGit).toBe(true);
  });

  it('should detect Python FastAPI project', async () => {
    await fs.writeFile(
      path.join(tempDir, 'pyproject.toml'),
      '[project]\nname = "fastapi-service"\ndependencies = ["fastapi"]\n',
    );
    await fs.writeFile(path.join(tempDir, '.env.example'), 'PORT=8000\n');

    const info = await detector.detect();
    expect(info.type).toBe('python-fastapi');
    expect(info.hasEnvExample).toBe(true);
    expect(info.hasEnvFile).toBe(false);
  });

  it('should detect Node CLI tool', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'my-awesome-cli',
      bin: { mycli: './dist/index.js' },
      dependencies: { commander: '^12.0.0' },
    });

    const info = await detector.detect();
    expect(info.type).toBe('node-cli');
    expect(info.name).toBe('my-awesome-cli');
  });
});
