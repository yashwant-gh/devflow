import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HealthService } from '../../src/modules/quality-check/health-service.js';

describe('HealthService Assessment', () => {
  let tempDir: string;
  let healthService: HealthService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-health-test-'));
    healthService = new HealthService();

    // Prepare well-configured project structure
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'healthy-project',
      scripts: {},
    });
    await fs.writeFile(path.join(tempDir, 'README.md'), '# Healthy Project\nFull documentation');
    await fs.writeFile(path.join(tempDir, '.gitignore'), 'node_modules/\n.env\n');
    await fs.writeFile(path.join(tempDir, '.env.example'), 'PORT=3000\n');
    await fs.ensureDir(path.join(tempDir, 'tests'));
    await fs.ensureDir(path.join(tempDir, '.github', 'workflows'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should assess project health and return score', async () => {
    const report = await healthService.assess(tempDir);
    expect(report.project).toBe('healthy-project');
    expect(report.score).toBeGreaterThan(0);
    expect(report.standards.results.length).toBeGreaterThan(0);
    expect(report.diagnostics.system.length).toBeGreaterThan(0);
  });
});
