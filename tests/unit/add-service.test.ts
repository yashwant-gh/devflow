import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AddService } from '../../src/modules/configuration/add-service.js';

describe('AddService Feature Automation', () => {
  let tempDir: string;
  let addService: AddService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-add-test-'));
    addService = new AddService();
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'add-feature-target',
      scripts: {},
    });
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should add testing configuration to project', async () => {
    const results = await addService.addFeature('testing', { cwd: tempDir });
    expect(results.length).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(tempDir, 'vitest.config.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, 'tests', 'example.test.ts'))).toBe(true);

    const pkg = await fs.readJson(path.join(tempDir, 'package.json'));
    expect(pkg.scripts.test).toBe('vitest run');
  });

  it('should add linting configuration to project', async () => {
    const results = await addService.addFeature('linting', { cwd: tempDir });
    expect(results.length).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(tempDir, 'eslint.config.js'))).toBe(true);

    const pkg = await fs.readJson(path.join(tempDir, 'package.json'));
    expect(pkg.scripts.lint).toBe('eslint src tests --ext .ts');
  });

  it('should add formatting configuration to project', async () => {
    const results = await addService.addFeature('formatting', { cwd: tempDir });
    expect(results.length).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(tempDir, '.prettierrc.json'))).toBe(true);

    const pkg = await fs.readJson(path.join(tempDir, 'package.json'));
    expect(pkg.scripts.format).toContain('prettier');
  });
});
