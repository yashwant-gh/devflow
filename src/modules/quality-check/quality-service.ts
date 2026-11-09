import path from 'node:path';
import fs from 'fs-extra';
import { commandRunner } from '../../core/command-runner.js';
import { projectDetector } from '../../core/project-detector.js';
import { auditService } from '../dependency-audit/audit-service.js';
import {
  type QualityCheckResult,
  type QualityReport,
  type CheckStatus,
} from '../../types/index.js';

export interface QualityCheckOptions {
  cwd?: string;
  only?: string[];
  skip?: string[];
  json?: boolean;
  verbose?: boolean;
}

export class QualityService {
  public async runChecks(options: QualityCheckOptions = {}): Promise<QualityReport> {
    const root = options.cwd || process.cwd();
    const projectInfo = await projectDetector.detect(root);
    const startTime = Date.now();

    const checkResults: QualityCheckResult[] = [];
    const only = options.only?.map((c) => c.toLowerCase().trim());
    const skip = options.skip?.map((c) => c.toLowerCase().trim()) || [];

    const shouldRun = (name: string): boolean => {
      const lower = name.toLowerCase();
      if (skip.includes(lower)) return false;
      if (only && only.length > 0 && !only.includes(lower)) return false;
      return true;
    };

    const isNode =
      projectInfo.type === 'node-api' ||
      projectInfo.type === 'node-cli' ||
      !!projectInfo.packageJsonPath;
    const isPython =
      projectInfo.type === 'python-fastapi' ||
      projectInfo.type === 'python-service' ||
      !!projectInfo.pyprojectPath;

    // 1. Linting Check
    if (shouldRun('lint')) {
      checkResults.push(await this.checkLint(root, isNode, isPython));
    }

    // 2. Formatting Check
    if (shouldRun('format')) {
      checkResults.push(await this.checkFormatting(root, isNode, isPython));
    }

    // 3. Unit Tests Check
    if (shouldRun('test')) {
      checkResults.push(await this.checkTests(root, isNode, isPython));
    }

    // 4. Type Checking
    if (shouldRun('typecheck')) {
      checkResults.push(await this.checkTypecheck(root, isNode, isPython));
    }

    // 5. Dependency Security Audit
    if (shouldRun('audit')) {
      checkResults.push(await this.checkAudit(root));
    }

    // 6. Environment Validation
    if (shouldRun('env')) {
      checkResults.push(await this.checkEnvironment(root));
    }

    // 7. Structure Validation
    if (shouldRun('structure')) {
      checkResults.push(await this.checkStructure(root, projectInfo));
    }

    // 8. Documentation Check
    if (shouldRun('docs')) {
      checkResults.push(await this.checkDocs(root));
    }

    // 9. Git Hygiene Check
    if (shouldRun('git')) {
      checkResults.push(await this.checkGit(root, projectInfo.hasGit));
    }

    const durationMs = Date.now() - startTime;
    const passedCount = checkResults.filter((c) => c.status === 'PASS').length;
    const failedCount = checkResults.filter((c) => c.status === 'FAIL').length;
    const errorCount = checkResults.filter((c) => c.status === 'ERROR').length;
    const warningCount = checkResults.filter((c) => c.status === 'WARNING').length;
    const skippedCount = checkResults.filter((c) => c.status === 'SKIPPED').length;

    let overallStatus: CheckStatus = 'PASS';
    if (failedCount > 0 || errorCount > 0) {
      overallStatus = 'FAIL';
    } else if (warningCount > 0) {
      overallStatus = 'WARNING';
    }

    const remediations = checkResults
      .filter((c) => c.remediation && (c.status === 'FAIL' || c.status === 'ERROR'))
      .map((c) => `${c.name}: ${c.remediation}`);

    return {
      projectName: projectInfo.name,
      timestamp: new Date().toISOString(),
      durationMs,
      overallStatus,
      checks: checkResults,
      summary: {
        total: checkResults.length,
        passed: passedCount,
        failed: failedCount,
        skipped: skippedCount,
        warnings: warningCount,
        errors: errorCount,
      },
      remediations,
    };
  }

  private async checkLint(
    root: string,
    isNode: boolean,
    isPython: boolean,
  ): Promise<QualityCheckResult> {
    const start = Date.now();
    try {
      if (isNode) {
        const pkgJsonPath = path.join(root, 'package.json');
        if (await fs.pathExists(pkgJsonPath)) {
          const pkg = await fs.readJson(pkgJsonPath);
          if (pkg.scripts?.lint) {
            const res = await commandRunner.run('npm', ['run', 'lint'], {
              cwd: root,
              allowFailure: true,
            });
            return {
              name: 'Linting',
              description: 'Static analysis and code style inspection',
              status: res.exitCode === 0 ? 'PASS' : 'FAIL',
              durationMs: Date.now() - start,
              exitCode: res.exitCode,
              stdout: res.stdout,
              stderr: res.stderr,
              remediation:
                res.exitCode !== 0
                  ? 'Run "npm run lint:fix" to auto-correct lint errors.'
                  : undefined,
            };
          }
        }
      } else if (isPython) {
        const hasRuff = await commandRunner.isExecutableAvailable('ruff');
        if (hasRuff) {
          const res = await commandRunner.run('ruff', ['check', '.'], {
            cwd: root,
            allowFailure: true,
          });
          return {
            name: 'Linting',
            description: 'Ruff static linting analysis',
            status: res.exitCode === 0 ? 'PASS' : 'FAIL',
            durationMs: Date.now() - start,
            exitCode: res.exitCode,
            stdout: res.stdout,
            stderr: res.stderr,
            remediation:
              res.exitCode !== 0
                ? 'Run "ruff check . --fix" to resolve lint violations.'
                : undefined,
          };
        }
      }

      return {
        name: 'Linting',
        description: 'Static analysis and code style inspection',
        status: 'SKIPPED',
        durationMs: Date.now() - start,
        exitCode: 0,
        remediation: 'Configure a linter by running "devflow add linting".',
      };
    } catch (err) {
      return {
        name: 'Linting',
        description: 'Static analysis and code style inspection',
        status: 'ERROR',
        durationMs: Date.now() - start,
        exitCode: 1,
        error: (err as Error).message,
      };
    }
  }

  private async checkFormatting(
    root: string,
    isNode: boolean,
    _isPython: boolean,
  ): Promise<QualityCheckResult> {
    const start = Date.now();
    try {
      if (isNode) {
        const pkgJsonPath = path.join(root, 'package.json');
        if (await fs.pathExists(pkgJsonPath)) {
          const pkg = await fs.readJson(pkgJsonPath);
          if (pkg.scripts?.['format:check']) {
            const res = await commandRunner.run('npm', ['run', 'format:check'], {
              cwd: root,
              allowFailure: true,
            });
            return {
              name: 'Formatting',
              description: 'Code formatting consistency verification',
              status: res.exitCode === 0 ? 'PASS' : 'FAIL',
              durationMs: Date.now() - start,
              exitCode: res.exitCode,
              stdout: res.stdout,
              stderr: res.stderr,
              remediation: res.exitCode !== 0 ? 'Run "npm run format" to format files.' : undefined,
            };
          }
        }
      }

      return {
        name: 'Formatting',
        description: 'Code formatting verification',
        status: 'SKIPPED',
        durationMs: Date.now() - start,
        exitCode: 0,
        remediation: 'Configure code formatting by running "devflow add formatting".',
      };
    } catch (err) {
      return {
        name: 'Formatting',
        description: 'Code formatting verification',
        status: 'ERROR',
        durationMs: Date.now() - start,
        exitCode: 1,
        error: (err as Error).message,
      };
    }
  }

  private async checkTests(
    root: string,
    isNode: boolean,
    isPython: boolean,
  ): Promise<QualityCheckResult> {
    const start = Date.now();
    try {
      if (isNode) {
        const pkgJsonPath = path.join(root, 'package.json');
        if (await fs.pathExists(pkgJsonPath)) {
          const pkg = await fs.readJson(pkgJsonPath);
          if (pkg.scripts?.test) {
            const res = await commandRunner.run('npm', ['test'], { cwd: root, allowFailure: true });
            return {
              name: 'Unit Tests',
              description: 'Automated test suite execution',
              status: res.exitCode === 0 ? 'PASS' : 'FAIL',
              durationMs: Date.now() - start,
              exitCode: res.exitCode,
              stdout: res.stdout,
              stderr: res.stderr,
              remediation:
                res.exitCode !== 0
                  ? 'Inspect failed test output and update tests or code.'
                  : undefined,
            };
          }
        }
      } else if (isPython) {
        const hasPytest = await commandRunner.isExecutableAvailable('pytest');
        if (hasPytest) {
          const res = await commandRunner.run('pytest', [], { cwd: root, allowFailure: true });
          return {
            name: 'Unit Tests',
            description: 'Automated test suite execution (pytest)',
            status: res.exitCode === 0 ? 'PASS' : 'FAIL',
            durationMs: Date.now() - start,
            exitCode: res.exitCode,
            stdout: res.stdout,
            stderr: res.stderr,
            remediation:
              res.exitCode !== 0 ? 'Inspect pytest output and fix assertions.' : undefined,
          };
        }
      }

      return {
        name: 'Unit Tests',
        description: 'Automated test suite execution',
        status: 'SKIPPED',
        durationMs: Date.now() - start,
        exitCode: 0,
        remediation: 'Configure testing by running "devflow add testing".',
      };
    } catch (err) {
      return {
        name: 'Unit Tests',
        description: 'Automated test suite execution',
        status: 'ERROR',
        durationMs: Date.now() - start,
        exitCode: 1,
        error: (err as Error).message,
      };
    }
  }

  private async checkTypecheck(
    root: string,
    isNode: boolean,
    _isPython: boolean,
  ): Promise<QualityCheckResult> {
    const start = Date.now();
    try {
      if (isNode) {
        const tsconfigPath = path.join(root, 'tsconfig.json');
        if (await fs.pathExists(tsconfigPath)) {
          const res = await commandRunner.run('npx', ['tsc', '--noEmit'], {
            cwd: root,
            allowFailure: true,
          });
          return {
            name: 'Type Checking',
            description: 'Static TypeScript type checking',
            status: res.exitCode === 0 ? 'PASS' : 'FAIL',
            durationMs: Date.now() - start,
            exitCode: res.exitCode,
            stdout: res.stdout,
            stderr: res.stderr,
            remediation:
              res.exitCode !== 0 ? 'Fix type errors highlighted in tsc output.' : undefined,
          };
        }
      }

      return {
        name: 'Type Checking',
        description: 'Static type checking',
        status: 'SKIPPED',
        durationMs: Date.now() - start,
        exitCode: 0,
      };
    } catch (err) {
      return {
        name: 'Type Checking',
        description: 'Static type checking',
        status: 'ERROR',
        durationMs: Date.now() - start,
        exitCode: 1,
        error: (err as Error).message,
      };
    }
  }

  private async checkAudit(root: string): Promise<QualityCheckResult> {
    const start = Date.now();
    try {
      const auditReport = await auditService.audit({ cwd: root });
      return {
        name: 'Security Audit',
        description: 'Dependency vulnerability inspection against security policy',
        status: auditReport.policyPassed ? 'PASS' : 'FAIL',
        durationMs: Date.now() - start,
        exitCode: auditReport.policyPassed ? 0 : 1,
        stdout: auditReport.recommendation,
        remediation: !auditReport.policyPassed
          ? `Run "devflow audit --fix" or review high severity vulnerabilities.`
          : undefined,
      };
    } catch (err) {
      return {
        name: 'Security Audit',
        description: 'Dependency vulnerability inspection',
        status: 'WARNING',
        durationMs: Date.now() - start,
        exitCode: 0,
        remediation: (err as Error).message,
      };
    }
  }

  private async checkEnvironment(root: string): Promise<QualityCheckResult> {
    const start = Date.now();
    const envExamplePath = path.join(root, '.env.example');
    const envPath = path.join(root, '.env');

    const hasExample = await fs.pathExists(envExamplePath);
    const hasEnv = await fs.pathExists(envPath);

    if (!hasExample) {
      return {
        name: 'Environment Validation',
        description: 'Verification of .env and .env.example definitions',
        status: 'WARNING',
        durationMs: Date.now() - start,
        exitCode: 0,
        remediation:
          'Create a .env.example template file to document required environment variables.',
      };
    }

    if (hasExample && hasEnv) {
      const exampleContent = await fs.readFile(envExamplePath, 'utf-8');
      const envContent = await fs.readFile(envPath, 'utf-8');

      const exampleKeys = this.extractEnvKeys(exampleContent);
      const envKeys = this.extractEnvKeys(envContent);

      const missingKeys = exampleKeys.filter((k) => !envKeys.includes(k));
      if (missingKeys.length > 0) {
        return {
          name: 'Environment Validation',
          description: 'Verification of .env against .env.example',
          status: 'WARNING',
          durationMs: Date.now() - start,
          exitCode: 0,
          remediation: `The following variables are defined in .env.example but missing in .env: ${missingKeys.join(', ')}`,
        };
      }
    }

    return {
      name: 'Environment Validation',
      description: 'Verification of .env and .env.example definitions',
      status: 'PASS',
      durationMs: Date.now() - start,
      exitCode: 0,
    };
  }

  private async checkStructure(root: string, _projectInfo: any): Promise<QualityCheckResult> {
    const start = Date.now();
    const missingItems: string[] = [];

    if (!(await fs.pathExists(path.join(root, '.gitignore')))) {
      missingItems.push('.gitignore');
    }
    if (!(await fs.pathExists(path.join(root, 'README.md')))) {
      missingItems.push('README.md');
    }

    if (missingItems.length > 0) {
      return {
        name: 'Project Structure',
        description: 'Standard project metadata files verification',
        status: 'WARNING',
        durationMs: Date.now() - start,
        exitCode: 0,
        remediation: `Create missing recommended standard files: ${missingItems.join(', ')}`,
      };
    }

    return {
      name: 'Project Structure',
      description: 'Standard project metadata files verification',
      status: 'PASS',
      durationMs: Date.now() - start,
      exitCode: 0,
    };
  }

  private async checkDocs(root: string): Promise<QualityCheckResult> {
    const start = Date.now();
    const readmePath = path.join(root, 'README.md');

    if (!(await fs.pathExists(readmePath))) {
      return {
        name: 'Documentation',
        description: 'Presence and content completeness of README.md',
        status: 'FAIL',
        durationMs: Date.now() - start,
        exitCode: 1,
        remediation: 'Run "devflow docs generate" to automatically create project documentation.',
      };
    }

    const content = await fs.readFile(readmePath, 'utf-8');
    if (content.trim().length < 50) {
      return {
        name: 'Documentation',
        description: 'README content completeness',
        status: 'WARNING',
        durationMs: Date.now() - start,
        exitCode: 0,
        remediation:
          'README.md is very short. Run "devflow docs generate" to generate complete sections.',
      };
    }

    return {
      name: 'Documentation',
      description: 'Presence and content completeness of README.md',
      status: 'PASS',
      durationMs: Date.now() - start,
      exitCode: 0,
    };
  }

  private async checkGit(root: string, hasGit: boolean): Promise<QualityCheckResult> {
    const start = Date.now();
    if (!hasGit) {
      return {
        name: 'Git Hygiene',
        description: 'Repository status and working branch cleanliness',
        status: 'SKIPPED',
        durationMs: Date.now() - start,
        exitCode: 0,
        remediation: 'Initialize Git with "git init".',
      };
    }

    try {
      const statusRes = await commandRunner.run('git', ['status', '--porcelain'], {
        cwd: root,
        allowFailure: true,
      });

      const uncommittedCount = statusRes.stdout
        ? statusRes.stdout.split('\n').filter((l) => l.trim().length > 0).length
        : 0;

      if (uncommittedCount > 0) {
        return {
          name: 'Git Hygiene',
          description: 'Repository working directory cleanliness',
          status: 'WARNING',
          durationMs: Date.now() - start,
          exitCode: 0,
          remediation: `Working tree has ${uncommittedCount} uncommitted changes. Commit or stash them before shipping.`,
        };
      }

      return {
        name: 'Git Hygiene',
        description: 'Repository working directory cleanliness',
        status: 'PASS',
        durationMs: Date.now() - start,
        exitCode: 0,
      };
    } catch {
      return {
        name: 'Git Hygiene',
        description: 'Repository working directory cleanliness',
        status: 'SKIPPED',
        durationMs: Date.now() - start,
        exitCode: 0,
      };
    }
  }

  private extractEnvKeys(content: string): string[] {
    return content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => l.split('=')[0]?.trim())
      .filter((k): k is string => Boolean(k));
  }
}

export const qualityService = new QualityService();
