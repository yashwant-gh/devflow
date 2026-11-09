import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigurationManager } from '../../src/core/configuration-manager.js';
import { ConfigurationError } from '../../src/utils/errors.js';

describe('ConfigurationManager Hierarchy and Validation', () => {
  let tempDir: string;
  let configManager: ConfigurationManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-config-test-'));
    configManager = new ConfigurationManager(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should load default configuration when no file exists', async () => {
    const config = await configManager.loadConfig();
    expect(config.version).toBe(1);
    expect(config.standards.requireReadme).toBe(true);
    expect(config.security.failOn).toContain('high');
    expect(config.security.failOn).toContain('critical');
    expect(config.quality.minimumCoverage).toBe(70);
  });

  it('should write and reload valid project configuration', async () => {
    await configManager.writeProjectConfig({
      version: 1,
      project: {
        name: 'custom-service',
        type: 'node-api',
      },
      standards: {
        requireReadme: true,
        requireTests: true,
        requireDocker: true,
        requireCICD: true,
        requireEnvExample: true,
        requireGitignore: true,
        requireTypeChecking: true,
      },
      quality: {
        minimumCoverage: 85,
        failOnLintError: true,
        failOnTypeError: true,
      },
      security: {
        failOn: ['critical'],
        autoFix: true,
      },
    });

    expect(await configManager.hasProjectConfig()).toBe(true);

    const reloaded = await configManager.loadConfig();
    expect(reloaded.project.name).toBe('custom-service');
    expect(reloaded.quality.minimumCoverage).toBe(85);
    expect(reloaded.security.failOn).toEqual(['critical']);
    expect(reloaded.security.autoFix).toBe(true);
  });

  it('should reject invalid configuration with detailed error', async () => {
    const configPath = configManager.getProjectConfigPath();
    await fs.writeJson(configPath, {
      version: 1,
      quality: {
        minimumCoverage: 999, // Invalid coverage > 100
      },
    });

    await expect(configManager.loadConfig()).rejects.toThrow(ConfigurationError);
  });
});
