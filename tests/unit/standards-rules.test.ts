import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  RequireReadmeRule,
  RequireTestsRule,
  RequireDockerRule,
  RequireCICDRule,
  RequireEnvExampleRule,
  RequireGitignoreRule,
  RequireTypeCheckingRule,
  type RuleContext,
} from '../../src/modules/standards/rules.js';
import { DEFAULT_CONFIG } from '../../src/core/configuration-manager.js';

describe('Engineering Standards Individual Rules', () => {
  let tempDir: string;
  let context: RuleContext;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-rules-test-'));
    context = {
      root: tempDir,
      projectInfo: {
        rootPath: tempDir,
        name: 'test-project',
        type: 'node-api',
        packageManager: 'npm',
        hasGit: false,
        hasDocker: false,
        hasCompose: false,
        hasCI: false,
        hasTests: false,
        hasLinter: false,
        hasFormatter: false,
        hasEnvFile: false,
        hasEnvExample: false,
      },
      config: DEFAULT_CONFIG,
    };
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('RequireReadmeRule should fail when missing and pass when present', async () => {
    const rule = new RequireReadmeRule();
    const failRes = await rule.evaluate(context);
    expect(failRes.passed).toBe(false);

    await fs.writeFile(
      path.join(tempDir, 'README.md'),
      '# Project Title\n\nFull documentation here.',
    );
    const passRes = await rule.evaluate(context);
    expect(passRes.passed).toBe(true);
  });

  it('RequireTestsRule should detect test directory', async () => {
    const rule = new RequireTestsRule();
    expect((await rule.evaluate(context)).passed).toBe(false);

    await fs.ensureDir(path.join(tempDir, 'tests'));
    expect((await rule.evaluate(context)).passed).toBe(true);
  });

  it('RequireDockerRule should detect Dockerfile', async () => {
    const rule = new RequireDockerRule();
    expect((await rule.evaluate(context)).passed).toBe(false);

    await fs.writeFile(path.join(tempDir, 'Dockerfile'), 'FROM node:22-alpine\n');
    expect((await rule.evaluate(context)).passed).toBe(true);
  });

  it('RequireCICDRule should detect GitHub Actions workflow', async () => {
    const rule = new RequireCICDRule();
    expect((await rule.evaluate(context)).passed).toBe(false);

    await fs.ensureDir(path.join(tempDir, '.github', 'workflows'));
    expect((await rule.evaluate(context)).passed).toBe(true);
  });

  it('RequireEnvExampleRule should detect .env.example', async () => {
    const rule = new RequireEnvExampleRule();
    expect((await rule.evaluate(context)).passed).toBe(false);

    await fs.writeFile(path.join(tempDir, '.env.example'), 'PORT=3000\n');
    expect((await rule.evaluate(context)).passed).toBe(true);
  });

  it('RequireGitignoreRule should require .gitignore with .env ignored', async () => {
    const rule = new RequireGitignoreRule();
    expect((await rule.evaluate(context)).passed).toBe(false);

    await fs.writeFile(path.join(tempDir, '.gitignore'), 'node_modules/\n.env\n');
    expect((await rule.evaluate(context)).passed).toBe(true);
  });

  it('RequireTypeCheckingRule should verify tsconfig strict mode', async () => {
    const rule = new RequireTypeCheckingRule();
    expect((await rule.evaluate(context)).passed).toBe(false);

    await fs.writeFile(
      path.join(tempDir, 'tsconfig.json'),
      '{\n  "compilerOptions": {\n    "strict": true\n  }\n}',
    );
    expect((await rule.evaluate(context)).passed).toBe(true);
  });
});
