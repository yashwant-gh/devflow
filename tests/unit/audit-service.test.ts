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

  it('1. should audit project without lockfile and report no_lockfile status', async () => {
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
    expect(report.policyPassed).toBe(false);
    expect(report.auditStatus).toBe('no_lockfile');
  });

  it('2. should accurately parse direct vs transitive vulnerabilities from npm audit JSON', async () => {
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
          exitCode: 1,
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
    expect(bracesFinding.installedVersion).toBe('3.0.2');
    expect(bracesFinding.isDirect).toBe(false);
    expect(bracesFinding.fixedVersion).toBeNull();
    expect(bracesFinding.remediation).toContain('Update top-level package "micromatch" to 4.0.8');

    // Finding 2: micromatch (direct)
    const microFinding = report.vulnerabilities.find((v) => v.package === 'micromatch')!;
    expect(microFinding).toBeDefined();
    expect(microFinding.installedVersion).toBe('4.0.5');
    expect(microFinding.isDirect).toBe(true);
    expect(microFinding.fixedVersion).toBe('4.0.8');
    expect(microFinding.remediation).toContain('Update micromatch to 4.0.8');

    expect(report.policyPassed).toBe(false);
    expect(report.failedSeverityLevels).toContain('high');
  });

  it('3. should resolve multiple installed versions of the same package at different locations in the tree', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'multi-version-app',
      dependencies: {
        'lib-a': '^1.0.0',
        'lib-b': '^2.0.0',
      },
    });

    await fs.writeJson(path.join(tempDir, 'package-lock.json'), {
      name: 'multi-version-app',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {
        '': { dependencies: { 'lib-a': '^1.0.0', 'lib-b': '^2.0.0' } },
        'node_modules/lib-a/node_modules/tar': { version: '4.4.13' },
        'node_modules/lib-b/node_modules/tar': { version: '6.1.0' },
      },
    });

    const mockAuditOutput = JSON.stringify({
      auditReportVersion: 2,
      vulnerabilities: {
        tar: {
          name: 'tar',
          severity: 'high',
          isDirect: false,
          via: [
            {
              source: 1098234,
              name: 'tar',
              title: 'Denial of Service via crafted tar archive',
              url: 'https://github.com/advisories/GHSA-9r2w-394v-53qc',
              severity: 'high',
              range: '<4.4.18 || >=5.0.0 <6.1.9',
            },
          ],
          nodes: ['node_modules/lib-a/node_modules/tar', 'node_modules/lib-b/node_modules/tar'],
          range: '<4.4.18 || >=5.0.0 <6.1.9',
          fixAvailable: false,
        },
      },
    });

    vi.spyOn(commandRunner, 'run').mockImplementation(async (file, args) => {
      if (file === 'npm' && args[0] === 'audit') {
        return {
          command: 'npm audit --json',
          args,
          exitCode: 1,
          stdout: mockAuditOutput,
          stderr: '',
          durationMs: 40,
        };
      }
      return { command: file, args, exitCode: 0, stdout: '{}', stderr: '', durationMs: 5 };
    });

    const report = await auditService.audit({ cwd: tempDir });
    expect(report.vulnerabilities.length).toBe(1);

    const tarFinding = report.vulnerabilities[0];
    expect(tarFinding.package).toBe('tar');
    // Both nested versions should be accurately discovered and reported
    expect(tarFinding.installedVersion).toContain('4.4.13');
    expect(tarFinding.installedVersion).toContain('6.1.0');
    expect(tarFinding.installedVersion).toBe('4.4.13, 6.1.0');
    expect(tarFinding.path).toBe(
      'node_modules/lib-a/node_modules/tar, node_modules/lib-b/node_modules/tar',
    );
    expect(tarFinding.fixedVersion).toBeNull();
    expect(tarFinding.remediation).toContain('No automated fix available');
  });

  it('4. should handle packages with breaking change major upgrades', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'major-upgrade-app',
      dependencies: {
        semver: '^5.7.0',
      },
    });

    await fs.writeJson(path.join(tempDir, 'package-lock.json'), {
      name: 'major-upgrade-app',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {
        '': { dependencies: { semver: '^5.7.0' } },
        'node_modules/semver': { version: '5.7.1' },
      },
    });

    const mockAuditOutput = JSON.stringify({
      auditReportVersion: 2,
      vulnerabilities: {
        semver: {
          name: 'semver',
          severity: 'moderate',
          isDirect: true,
          via: [
            {
              source: 1098111,
              name: 'semver',
              title: 'ReDoS in semver',
              severity: 'moderate',
              range: '<7.5.2',
            },
          ],
          nodes: ['node_modules/semver'],
          range: '<7.5.2',
          fixAvailable: {
            name: 'semver',
            version: '7.5.4',
            isSemVerMajor: true,
          },
        },
      },
    });

    vi.spyOn(commandRunner, 'run').mockImplementation(async (file, args) => {
      if (file === 'npm' && args[0] === 'audit') {
        return {
          command: 'npm audit --json',
          args,
          exitCode: 1,
          stdout: mockAuditOutput,
          stderr: '',
          durationMs: 40,
        };
      }
      return { command: file, args, exitCode: 0, stdout: '{}', stderr: '', durationMs: 5 };
    });

    const report = await auditService.audit({ cwd: tempDir });
    const finding = report.vulnerabilities[0];
    expect(finding.package).toBe('semver');
    expect(finding.installedVersion).toBe('5.7.1');
    expect(finding.fixedVersion).toBe('7.5.4');
    expect(finding.remediation).toContain('Breaking change');
  });

  it('5. should report Unknown rather than inventing version when package-lock entry is missing', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'missing-lock-entry-app',
      dependencies: { foo: '^1.0.0' },
    });

    await fs.writeJson(path.join(tempDir, 'package-lock.json'), {
      name: 'missing-lock-entry-app',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {},
    });

    const mockAuditOutput = JSON.stringify({
      auditReportVersion: 2,
      vulnerabilities: {
        'phantom-pkg': {
          name: 'phantom-pkg',
          severity: 'low',
          isDirect: false,
          via: ['something'],
          nodes: ['node_modules/nonexistent/phantom-pkg'],
          range: '<1.2.3',
          fixAvailable: false,
        },
      },
    });

    vi.spyOn(commandRunner, 'run').mockImplementation(async (file, args) => {
      if (file === 'npm' && args[0] === 'audit') {
        return {
          command: 'npm audit --json',
          args,
          exitCode: 1,
          stdout: mockAuditOutput,
          stderr: '',
          durationMs: 20,
        };
      }
      return { command: file, args, exitCode: 0, stdout: '{}', stderr: '', durationMs: 5 };
    });

    const report = await auditService.audit({ cwd: tempDir });
    expect(report.vulnerabilities.length).toBe(1);
    // Crucial requirement: Never display vulnerable range as installed version!
    expect(report.vulnerabilities[0].installedVersion).toBe('Unknown');
    expect(report.vulnerabilities[0].vulnerableRange).toBe('<1.2.3');
  });

  it('6. should detect malformed npm audit JSON without reporting a false clean pass', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'malformed-app',
      dependencies: { express: '^4.21.0' },
    });

    await fs.writeJson(path.join(tempDir, 'package-lock.json'), {
      name: 'malformed-app',
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
          stdout: '<<<HTML>502 Bad Gateway</HTML>>>',
          stderr: '',
          durationMs: 25,
        };
      }
      return { command: file, args, exitCode: 0, stdout: '{}', stderr: '', durationMs: 5 };
    });

    const report = await auditService.audit({ cwd: tempDir });
    expect(report.auditStatus).toBe('skipped');
    expect(report.policyPassed).toBe(false);
    expect(report.recommendation).toContain('Failed to parse npm audit output');
  });

  it('7. should handle network errors gracefully without false clean pass', async () => {
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
