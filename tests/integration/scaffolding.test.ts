import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateEngine } from '../../src/core/template-engine.js';
import { TemplateError } from '../../src/utils/errors.js';

describe('End-to-End Scaffolding Integration Tests', () => {
  let tempBaseDir: string;
  let engine: TemplateEngine;

  beforeEach(async () => {
    tempBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-scaffold-e2e-'));
    engine = new TemplateEngine(path.resolve('src/templates'));
  });

  afterEach(async () => {
    try {
      await fs.remove(tempBaseDir);
    } catch {
      // Ignored
    }
  });

  it('1. should scaffold complete Express.js REST API project without duplicated test files or sourcemaps', async () => {
    const targetDir = path.join(tempBaseDir, 'express-payment-service');
    const result = await engine.scaffold({
      projectName: 'express-payment-service',
      targetDir,
      templateId: 'node-express-api',
      description: 'Microservice for payment gateway processing',
      includeTesting: true,
      includeLinting: true,
      includeDocker: true,
      includeCompose: true,
      includeCI: true,
      includeDocs: true,
    });

    expect(result.createdCount).toBeGreaterThan(10);
    expect(await fs.pathExists(path.join(targetDir, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'tsconfig.json'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'Dockerfile'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'docker-compose.yml'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.github', 'workflows', 'ci.yml'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'src', 'app.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'src', 'server.ts'))).toBe(true);
    expect(
      await fs.pathExists(path.join(targetDir, 'tests', 'unit', 'items.service.test.ts')),
    ).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'tests', 'integration', 'api.test.ts'))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(targetDir, 'vitest.config.ts'))).toBe(true);

    // Verify absence of compiled/duplicate test files and sourcemaps
    expect(
      await fs.pathExists(path.join(targetDir, 'tests', 'unit', 'items.service.test.js')),
    ).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'tests', 'integration', 'api.test.js'))).toBe(
      false,
    );
    expect(
      await fs.pathExists(path.join(targetDir, 'tests', 'integration', 'api.test.js.map')),
    ).toBe(false);

    const pkg = await fs.readJson(path.join(targetDir, 'package.json'));
    expect(pkg.name).toBe('express-payment-service');
    expect(pkg.description).toBe('Microservice for payment gateway processing');
    expect(pkg.scripts.test).toBe('vitest run');
    expect(pkg.scripts.dev).toBe('tsx watch src/server.ts');
  });

  it('2. should scaffold complete Python FastAPI project with valid configuration', async () => {
    const targetDir = path.join(tempBaseDir, 'fastapi-user-service');
    const result = await engine.scaffold({
      projectName: 'fastapi-user-service',
      targetDir,
      templateId: 'python-fastapi',
      description: 'FastAPI microservice for user management',
      includeDocker: true,
      includeCompose: true,
      includeCI: true,
    });

    expect(result.createdCount).toBeGreaterThan(10);
    expect(await fs.pathExists(path.join(targetDir, 'pyproject.toml'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'Dockerfile'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'docker-compose.yml'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.github', 'workflows', 'ci.yml'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'app', 'main.py'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'app', 'core', 'config.py'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'app', 'api', 'routes', 'health.py'))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(targetDir, 'tests', 'test_health.py'))).toBe(true);

    const pyproject = await fs.readFile(path.join(targetDir, 'pyproject.toml'), 'utf-8');
    expect(pyproject).toContain('name = "fastapi-user-service"');
    expect(pyproject).toContain('dependencies = [');
  });

  it('3. should scaffold complete Node.js CLI project with clean test configuration', async () => {
    const targetDir = path.join(tempBaseDir, 'sample-cli');
    const result = await engine.scaffold({
      projectName: 'sample-cli',
      targetDir,
      templateId: 'node-cli',
      description: 'DevOps command line utility',
    });

    expect(result.createdCount).toBeGreaterThan(5);
    expect(await fs.pathExists(path.join(targetDir, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'tsconfig.json'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'src', 'index.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'src', 'commands', 'greet.command.ts'))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(targetDir, 'tests', 'greet.test.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'vitest.config.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'tests', 'greet.test.js'))).toBe(false);

    const pkg = await fs.readJson(path.join(targetDir, 'package.json'));
    expect(pkg.name).toBe('sample-cli');
    expect(pkg.bin['sample-cli']).toBe('./dist/index.js');
  });

  it('4. should prevent overwriting existing non-empty directory without explicit permission', async () => {
    const targetDir = path.join(tempBaseDir, 'existing-dir');
    await fs.ensureDir(targetDir);
    await fs.writeFile(
      path.join(targetDir, 'important-user-code.ts'),
      'console.log("dont touch me");',
    );

    await expect(
      engine.scaffold({
        projectName: 'existing-dir',
        targetDir,
        templateId: 'node-express-api',
        overwrite: false,
      }),
    ).rejects.toThrow(TemplateError);

    // Verify existing file was preserved untouched
    const preservedContent = await fs.readFile(
      path.join(targetDir, 'important-user-code.ts'),
      'utf-8',
    );
    expect(preservedContent).toBe('console.log("dont touch me");');
  });

  it('5. should safely rollback all created files if scaffolding is aborted or encounters error', async () => {
    const targetDir = path.join(tempBaseDir, 'rollback-test-dir');

    // Simulate failure by providing invalid templateId
    await expect(
      engine.scaffold({
        projectName: 'rollback-test-dir',
        targetDir,
        templateId: 'non-existent-template-xyz',
      }),
    ).rejects.toThrow(TemplateError);

    expect(await fs.pathExists(path.join(targetDir, 'package.json'))).toBe(false);
  });
});
