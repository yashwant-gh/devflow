import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CICDService } from '../../src/modules/cicd/cicd-service.js';
import { ConfigurationError } from '../../src/utils/errors.js';

describe('CICDService Pipeline Automation', () => {
  let tempDir: string;
  let cicdService: CICDService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-ci-test-'));
    cicdService = new CICDService();
  });

  afterEach(async () => {
    try {
      await fs.remove(tempDir);
    } catch {
      // Ignored
    }
  });

  it('should generate and validate standard GitHub Actions workflow', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'ci-test-project',
      scripts: {
        build: 'tsc',
        test: 'vitest run',
        lint: 'eslint .',
      },
    });

    const result = await cicdService.init({ cwd: tempDir, profile: 'standard' });
    expect(result.action).toBe('created');
    expect(await fs.pathExists(path.join(tempDir, '.github', 'workflows', 'ci.yml'))).toBe(true);

    const validation = await cicdService.validate(tempDir);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);

    const content = await fs.readFile(
      path.join(tempDir, '.github', 'workflows', 'ci.yml'),
      'utf-8',
    );
    expect(content).toContain('permissions:');
    expect(content).toContain('contents: read');
    expect(content).toContain('actions/checkout@v4');
    expect(content).toContain('actions/setup-node@v4');
  });

  it('strict profile should pin actions to commit SHAs', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'strict-ci-project',
    });

    await cicdService.init({ cwd: tempDir, profile: 'strict' });
    const content = await fs.readFile(
      path.join(tempDir, '.github', 'workflows', 'ci.yml'),
      'utf-8',
    );
    expect(content).toContain('actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11');
    expect(content).toContain('timeout-minutes: 10');
  });

  it('should protect existing workflow from overwrite without force', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'overwrite-ci-project',
    });

    await cicdService.init({ cwd: tempDir, profile: 'standard' });

    await expect(
      cicdService.init({ cwd: tempDir, profile: 'strict', force: false }),
    ).rejects.toThrow(ConfigurationError);
  });

  it('should safely update workflow with update command', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'update-ci-project',
    });

    await cicdService.init({ cwd: tempDir, profile: 'standard' });

    // Update to strict profile
    const updateResult = await cicdService.update({ cwd: tempDir, profile: 'strict' });
    expect(updateResult.updated).toBe(true);

    const content = await fs.readFile(
      path.join(tempDir, '.github', 'workflows', 'ci.yml'),
      'utf-8',
    );
    expect(content).toContain('strict');

    // Calling update again with same profile should be idempotent (updated: false)
    const idempotentResult = await cicdService.update({ cwd: tempDir, profile: 'strict' });
    expect(idempotentResult.updated).toBe(false);
  });
});
