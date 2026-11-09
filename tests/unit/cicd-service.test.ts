import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CICDService } from '../../src/modules/cicd/cicd-service.js';
import { ConfigurationError } from '../../src/utils/errors.js';

describe('CICDService Pipeline Automation & Workflow Integrity', () => {
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

  it('1. should generate and validate standard GitHub Actions workflow for Node.js project', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'ci-test-project',
      scripts: {
        build: 'tsc',
        test: 'vitest run',
        lint: 'eslint .',
        'format:check': 'prettier --check .',
        typecheck: 'tsc --noEmit',
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

    // Verify triggers
    expect(content).toContain('branches: [main, master]');
    // Verify permissions
    expect(content).toContain('permissions:');
    expect(content).toContain('contents: read');
    // Verify concurrency
    expect(content).toContain('cancel-in-progress: true');
    // Verify steps
    expect(content).toContain('actions/checkout@v4');
    expect(content).toContain('actions/setup-node@v4');
    expect(content).toContain('npm ci');
    expect(content).toContain('npm run format:check');
    expect(content).toContain('npm run lint');
    expect(content).toContain('npm run typecheck');
    expect(content).toContain('npm test');
    expect(content).toContain('npm run build');
    expect(content).toContain('npm audit --audit-level=high');
    // Verify no hardcoded secrets or tokens
    expect(content).not.toMatch(/ghp_[a-zA-Z0-9]+/);
    expect(content).not.toMatch(/npm_[a-zA-Z0-9]+/);
    expect(content).not.toContain('AWS_SECRET');
  });

  it('2. strict profile should pin actions to commit SHAs with lower timeout and strict audit', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'strict-ci-project',
    });

    await cicdService.init({ cwd: tempDir, profile: 'strict' });
    const content = await fs.readFile(
      path.join(tempDir, '.github', 'workflows', 'ci.yml'),
      'utf-8',
    );
    expect(content).toContain('actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11');
    expect(content).toContain('actions/setup-node@60edb5dd545a775178f525247833795be8391ab8');
    expect(content).toContain('timeout-minutes: 10');
    expect(content).toContain('npm audit --audit-level=moderate');
  });

  it('3. should generate valid Python CI workflow with pytest, ruff, and pip-audit', async () => {
    await fs.writeFile(
      path.join(tempDir, 'pyproject.toml'),
      '[project]\nname = "python-app"\nversion = "0.1.0"\n',
    );

    await cicdService.init({ cwd: tempDir, profile: 'standard' });
    const content = await fs.readFile(
      path.join(tempDir, '.github', 'workflows', 'ci.yml'),
      'utf-8',
    );
    expect(content).toContain('actions/setup-python@v5');
    expect(content).toContain('ruff check .');
    expect(content).toContain('pytest');
    expect(content).toContain('pip-audit');
    expect(content).toContain('permissions:');
    expect(content).toContain('contents: read');
  });

  it('4. should protect existing workflow from overwrite without force', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'overwrite-ci-project',
    });

    await cicdService.init({ cwd: tempDir, profile: 'standard' });

    await expect(
      cicdService.init({ cwd: tempDir, profile: 'strict', force: false }),
    ).rejects.toThrow(ConfigurationError);
  });

  it('5. should safely update workflow with update command idempotently without duplication', async () => {
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

    // Calling update again with same profile must be idempotent (updated: false)
    const idempotentResult = await cicdService.update({ cwd: tempDir, profile: 'strict' });
    expect(idempotentResult.updated).toBe(false);

    // Verify the workflow wasn't corrupted or duplicated
    const validation = await cicdService.validate(tempDir);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });
});
