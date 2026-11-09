import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuditService } from '../../src/modules/dependency-audit/audit-service.js';
import { commandRunner } from '../../src/core/command-runner.js';

describe('AuditService Dependency Intelligence & Security Accuracy', () => {
  let tempDir: string;
  let auditService: AuditService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-audit-test-'));
    auditService = new AuditService();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      await fs.remove(tempDir);
    } catch {
      // Ignored
    }
  });

  it('should audit project with package.json and count dependencies', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'audit-test-pkg',
      dependencies: {
        express: '^4.21.0',
        zod: '^3.23.8',
      },
      devDependencies: {
        vitest: '^2.1.1',
      },
    });

    const report = await auditService.audit({ cwd: tempDir });
    expect(report.project).toBe('audit-test-pkg');
    expect(report.ecosystem).toBe('npm');
    expect(report.dependencySummary.direct).toBe(2);
    expect(report.dependencySummary.dev).toBe(1);
    expect(report.dependencySummary.total).toBe(3);
    expect(report.policyPassed).toBe(false); // No lockfile present
    expect(report.auditStatus).toBe('no_lockfile');
  });

  it('should accurately parse direct vs transitive vulnerabilities from npm audit JSON', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'payment-service',
      dependencies: {
        express: '^4.21.0',
        micromatch: '^4.0.0',
      },
    });

    await fs.writeJson(path.join(tempDir, 'package-lock.json'), {
      name: 'payment-service',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {
        '': {
          dependencies: {
            express: '^4.21.0',
            micromatch: '^4.0.0',
          },
        },
        'node_modules/micromatch': {
          version: '4.0.5',
        },
        'node_modules/braces': {
          version: '3.0.2',
        },
      },
    });

    // Mock npm audit response with both a transitive vulnerability (braces) and a direct vulnerability (micromatch)
    const mockAuditOutput = JSON.stringify({
      auditReportVersion: 2,
      vulnerabilities: {
        braces: {
          name: 'braces',
          severity: 'high',
          isDirect: false,
          via: [
            {
              source: 1097489,
              name: 'braces',
              title: 'Uncontrolled resource consumption in braces',
              url: 'https://github.com/advisories/GHSA-grv7-fg5c-x5vh',
              severity: 'high',
              range: '<3.0.3',
            },
          ],
          nodes: ['node_modules/braces'],
          range: '<3.0.3',
          fixAvailable: {
            name: 'micromatch',
            version: '4.0.8',
            isSemVerMajor: false,
          },
        },
        micromatch: {
          name: 'micromatch',
          severity: 'high',
          isDirect: true,
          via: ['braces'],
          nodes: ['node_modules/micromatch'],
          range: '<=4.0.7',
          fixAvailable: {
            name: 'micromatch',
            version: '4.0.8',
            isSemVerMajor: false,
          },
        },
      },
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 0,
          high: 2,
          critical: 0,
          total: 2,
        },
      },
    });

    vi.spyOn(commandRunner, 'run').mockImplementation(async (file, args) => {
      if (file === 'npm' && args[0] === 'audit') {
        return {
          command: 'npm audit --json',
          args,
          exitCode: 1, // npm audit exits with 1 when vulnerabilities found
          stdout: mockAuditOutput,
          stderr: '',
          durationMs: 50,
        };
      }
      return {
        command: file,
        args,
        exitCode: 0,
        stdout: '{}',
        stderr: '',
        durationMs: 10,
      };
    });

    const report = await auditService.audit({ cwd: tempDir });

    expect(report.auditStatus).toBe('completed');
    expect(report.vulnerabilities.length).toBe(2);

    // Finding 1: braces (transitive)
    const bracesFinding = report.vulnerabilities.find((v) => v.package === 'braces')!;
    expect(bracesFinding).toBeDefined();
    expect(bracesFinding.installedVersion).toBe('3.0.2'); // True installed version from lockfile, NOT range!
    expect(bracesFinding.isDirect).toBe(false);
    expect(bracesFinding.fixedVersion).toBeNull(); // Must NOT be 4.0.8 (which was micromatch's version)!
    expect(bracesFinding.remediation).toContain('Update top-level package "micromatch" to 4.0.8');

    // Finding 2: micromatch (direct)
    const microFinding = report.vulnerabilities.find((v) => v.package === 'micromatch')!;
    expect(microFinding).toBeDefined();
    expect(microFinding.installedVersion).toBe('4.0.5'); // True installed version from lockfile
    expect(microFinding.isDirect).toBe(true);
    expect(microFinding.fixedVersion).toBe('4.0.8'); // micromatch fix applies to micromatch itself
    expect(microFinding.remediation).toContain('Update micromatch to 4.0.8');

    // Policy verification: 2 high vulnerabilities violating default policy (fail on high/critical)
    expect(report.policyPassed).toBe(false);
    expect(report.failedSeverityLevels).toContain('high');
  });

  it('should handle network errors gracefully without false clean pass', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'network-test-pkg',
      dependencies: { express: '^4.21.0' },
    });

    await fs.writeJson(path.join(tempDir, 'package-lock.json'), {
      name: 'network-test-pkg',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {},
    });

    vi.spyOn(commandRunner, 'run').mockImplementation(async (file, args) => {
      if (file === 'npm' && args[0] === 'audit') {
        return {
          command: 'npm audit --json',
          args,
          exitCode: 1,
          stdout: '',
          stderr: 'npm ERR! code ENOTFOUND\nnpm ERR! network request to registry failed',
          durationMs: 50,
        };
      }
      return {
        command: file,
        args,
        exitCode: 0,
        stdout: '{}',
        stderr: '',
        durationMs: 10,
      };
    });

    const report = await auditService.audit({ cwd: tempDir });

    expect(report.auditStatus).toBe('network_error');
    expect(report.policyPassed).toBe(false);
    expect(report.recommendation).toContain('Could not connect to the npm registry');
  });
});
