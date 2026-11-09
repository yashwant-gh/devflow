import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateEngine } from '../../src/core/template-engine.js';
import { ValidationError, TemplateError } from '../../src/utils/errors.js';

describe('TemplateEngine Scaffolding Core', () => {
  let tempDir: string;
  let engine: TemplateEngine;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-template-test-'));
    // Point to src/templates directly for tests
    engine = new TemplateEngine(path.resolve('src/templates'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should list all three supported templates with metadata', async () => {
    const templates = await engine.getAvailableTemplates();
    expect(templates.length).toBe(3);
    const ids = templates.map((t) => t.id);
    expect(ids).toContain('node-express-api');
    expect(ids).toContain('python-fastapi');
    expect(ids).toContain('node-cli');
  });

  it('should reject invalid project names', () => {
    expect(() => engine.validateProjectName('')).toThrow(ValidationError);
    expect(() => engine.validateProjectName('invalid name with spaces')).toThrow(ValidationError);
    expect(() => engine.validateProjectName('bad/name')).toThrow(ValidationError);
    expect(() => engine.validateProjectName('valid-name-123')).not.toThrow();
  });

  it('should throw TemplateError for unknown template identifier', async () => {
    await expect(
      engine.scaffold({
        projectName: 'test-project',
        targetDir: tempDir,
        templateId: 'non-existent-template',
      }),
    ).rejects.toThrow(TemplateError);
  });

  it('should perform dry-run without writing files to disk', async () => {
    const result = await engine.scaffold({
      projectName: 'test-dry-run',
      targetDir: tempDir,
      templateId: 'node-express-api',
      dryRun: true,
    });

    expect(result.createdCount).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(tempDir, 'package.json'))).toBe(false);
  });
});
