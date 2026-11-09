import path from 'node:path';
import fs from 'fs-extra';
import { commandRunner } from '../../core/command-runner.js';
import { projectDetector } from '../../core/project-detector.js';
import { configurationManager } from '../../core/configuration-manager.js';
import {
  type SecurityAuditReport,
  type VulnerabilityFinding,
  type OutdatedPackage,
  type SeverityLevel,
} from '../../types/index.js';
import { DependencyError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export interface AuditOptions {
  cwd?: string;
  severity?: SeverityLevel;
  json?: boolean;
  fix?: boolean;
  yes?: boolean;
  dryRun?: boolean;
}

interface NpmAdvisoryVia {
  source?: number;
  name?: string;
  dependency?: string;
  title?: string;
  url?: string;
  severity?: string;
  cwe?: string[];
  range?: string;
}

export class AuditService {
  public async audit(options: AuditOptions = {}): Promise<SecurityAuditReport> {
    const root = options.cwd || process.cwd();
    const projectInfo = await projectDetector.detect(root);
    const config = await configurationManager.loadConfig();

    const isNode =
      projectInfo.type === 'node-api' ||
      projectInfo.type === 'node-cli' ||
      !!projectInfo.packageJsonPath;
    const isPython =
      projectInfo.type === 'python-fastapi' ||
      projectInfo.type === 'python-service' ||
      !!projectInfo.pyprojectPath;

    if (!isNode && !isPython) {
      throw new DependencyError('No supported package ecosystem detected for audit.', {
        suggestion: 'Ensure your project contains a package.json or pyproject.toml.',
      });
    }

    if (isNode) {
      return await this.auditNodeProject(root, projectInfo, config, options);
    } else {
      return await this.auditPythonProject(root, projectInfo, config, options);
    }
  }

  private async auditNodeProject(
    root: string,
    projectInfo: any,
    config: any,
    options: AuditOptions,
  ): Promise<SecurityAuditReport> {
    let directCount = 0;
    let devCount = 0;
    const directDepsSet = new Set<string>();
    const devDepsSet = new Set<string>();

    if (projectInfo.packageJsonPath && (await fs.pathExists(projectInfo.packageJsonPath))) {
      try {
        const pkg = await fs.readJson(projectInfo.packageJsonPath);
        const deps = pkg.dependencies || {};
        const devDeps = pkg.devDependencies || {};
        directCount = Object.keys(deps).length;
        devCount = Object.keys(devDeps).length;
        for (const k of Object.keys(deps)) directDepsSet.add(k);
        for (const k of Object.keys(devDeps)) devDepsSet.add(k);
      } catch {
        // Ignored
      }
    }

    // 1. Check outdated dependencies if lockfile and dependencies exist
    const outdatedList: OutdatedPackage[] = [];
    const hasLockfile =
      (await fs.pathExists(path.join(root, 'package-lock.json'))) ||
      (await fs.pathExists(path.join(root, 'pnpm-lock.yaml'))) ||
      (await fs.pathExists(path.join(root, 'yarn.lock')));

    if (hasLockfile && directCount + devCount > 0) {
      try {
        const outdatedResult = await commandRunner.run('npm', ['outdated', '--json'], {
          cwd: root,
          timeout: 8000,
          allowFailure: true,
        });
        if (outdatedResult.stdout) {
          try {
            const parsed = JSON.parse(outdatedResult.stdout);
            for (const [pkgName, details] of Object.entries<any>(parsed)) {
              outdatedList.push({
                package: pkgName,
                current: details.current || 'unknown',
                wanted: details.wanted || 'unknown',
                latest: details.latest || 'unknown',
                dependent: details.dependent,
              });
            }
          } catch {
            // Outdated JSON parsing optional
          }
        }
      } catch {
        logger.debug('npm outdated command could not be completed.');
      }
    }

    // Load lockfile data if available for accurate installed version lookups
    let lockfilePackages: Record<string, any> = {};
    let lockfileDependencies: Record<string, any> = {};
    const lockPath = path.join(root, 'package-lock.json');
    if (await fs.pathExists(lockPath)) {
      try {
        const lockJson = await fs.readJson(lockPath);
        lockfilePackages = lockJson.packages || {};
        lockfileDependencies = lockJson.dependencies || {};
      } catch {
        // Ignored
      }
    }

    const resolveInstalledVersion = (pkgName: string, nodes: string[]): string => {
      const foundVersions = new Set<string>();

      // 1. Check specific node paths from npm audit (handles nested dependencies and multiple installed versions)
      for (const node of nodes) {
        // Try on disk at exact node path
        try {
          const nestedDiskPath = path.join(root, node, 'package.json');
          if (fs.existsSync(nestedDiskPath)) {
            const diskPkg = fs.readJsonSync(nestedDiskPath);
            if (diskPkg?.version) {
              foundVersions.add(String(diskPkg.version));
              continue;
            }
          }
        } catch {
          // Ignore filesystem read error
        }

        // Try lockfile packages map at exact node path
        if (lockfilePackages[node]?.version) {
          foundVersions.add(String(lockfilePackages[node].version));
        }
      }

      if (foundVersions.size > 0) {
        return Array.from(foundVersions).join(', ');
      }

      // 2. Fallback to top-level node_modules on disk
      try {
        const onDiskPath = path.join(root, 'node_modules', pkgName, 'package.json');
        if (fs.existsSync(onDiskPath)) {
          const diskPkg = fs.readJsonSync(onDiskPath);
          if (diskPkg?.version) {
            return String(diskPkg.version);
          }
        }
      } catch {
        // Ignore filesystem read error
      }

      // 3. Fallback to top-level lockfile packages entry (npm v7+ lockfile format)
      const defaultNode = `node_modules/${pkgName}`;
      if (lockfilePackages[defaultNode]?.version) {
        return String(lockfilePackages[defaultNode].version);
      }

      // 4. Fallback to legacy dependencies entry (npm v6 lockfile format)
      if (lockfileDependencies[pkgName]?.version) {
        return String(lockfileDependencies[pkgName].version);
      }

      return 'Unknown';
    };

    // 2. Run npm audit if lockfile exists
    const vulnerabilities: VulnerabilityFinding[] = [];
    let auditRawOutput = '';
    let auditStatus: 'completed' | 'network_error' | 'skipped' | 'no_lockfile' = 'completed';
    let auditError: string | undefined;

    if (!hasLockfile) {
      auditStatus = 'no_lockfile';
      auditError = 'No lockfile found (package-lock.json). Run "npm install" first.';
    } else if (directCount + devCount > 0) {
      try {
        const auditResult = await commandRunner.run('npm', ['audit', '--json'], {
          cwd: root,
          timeout: 10000,
          allowFailure: true,
        });
        auditRawOutput = auditResult.stdout;

        let parsedSuccessfully = false;
        if (auditRawOutput) {
          try {
            const parsedAudit = JSON.parse(auditRawOutput);

            if (parsedAudit.error) {
              auditStatus = 'network_error';
              auditError =
                parsedAudit.error.summary ||
                parsedAudit.error.detail ||
                'Package registry audit endpoint error';
            } else if (parsedAudit.vulnerabilities) {
              parsedSuccessfully = true;
              for (const [pkgName, vulnData] of Object.entries<any>(parsedAudit.vulnerabilities)) {
                const severity: SeverityLevel = (
                  vulnData.severity || 'low'
                ).toLowerCase() as SeverityLevel;

                const nodes: string[] = Array.isArray(vulnData.nodes) ? vulnData.nodes : [];
                const installedVersion = resolveInstalledVersion(pkgName, nodes);
                const isDirect =
                  directDepsSet.has(pkgName) ||
                  devDepsSet.has(pkgName) ||
                  Boolean(vulnData.isDirect);

                // Parse via array: separate direct advisories from transitive package strings
                const viaList = Array.isArray(vulnData.via) ? vulnData.via : [];
                const directAdvisories: NpmAdvisoryVia[] = viaList.filter(
                  (v: any) => typeof v === 'object' && v !== null,
                );
                const transitiveCauses: string[] = viaList.filter(
                  (v: any) => typeof v === 'string',
                );

                let title = vulnData.title || `Vulnerability in ${pkgName}`;
                let advisoryUrl: string | undefined = vulnData.url;
                let advisoryId: string | undefined = vulnData.name || pkgName;

                const primaryAdv = directAdvisories[0];
                if (primaryAdv) {
                  title = primaryAdv.title || title;
                  advisoryUrl = primaryAdv.url || advisoryUrl;
                  advisoryId = primaryAdv.source
                    ? String(primaryAdv.source)
                    : primaryAdv.name || advisoryId;
                } else if (transitiveCauses.length > 0) {
                  title = `Transitive vulnerability via ${transitiveCauses.join(', ')}`;
                }

                // Correctly interpret fixAvailable
                // In npm audit JSON: fixAvailable is either boolean or { name: string, version: string, isSemVerMajor: boolean }
                // where name is the TOP-LEVEL package that requires updating.
                const fixAvailable = vulnData.fixAvailable;
                let fixedVersion: string | null = null;
                let remediation = 'Review dependency advisory for mitigation options.';

                if (fixAvailable === true) {
                  fixedVersion = null;
                  remediation =
                    'Compatible patch available. Run "npm audit fix" to remediate safely.';
                } else if (fixAvailable === false) {
                  fixedVersion = null;
                  remediation =
                    'No automated fix available without breaking changes or upstream patches.';
                } else if (typeof fixAvailable === 'object' && fixAvailable !== null) {
                  const fixPkg = fixAvailable.name;
                  const fixVer = fixAvailable.version;
                  const isMajor = Boolean(fixAvailable.isSemVerMajor);

                  if (fixPkg === pkgName) {
                    // Fix applies directly to this package
                    fixedVersion = fixVer;
                    remediation = isMajor
                      ? `Upgrade ${pkgName} to ${fixVer} (Breaking change: manual upgrade or npm audit fix --force)`
                      : `Update ${pkgName} to ${fixVer}`;
                  } else {
                    // Fix applies to an ancestor / top-level package
                    fixedVersion = null; // Do NOT report fixVer as the version of pkgName!
                    remediation = isMajor
                      ? `Upgrade top-level package "${fixPkg}" to ${fixVer} (Major upgrade) to resolve transitive vulnerability in ${pkgName}`
                      : `Update top-level package "${fixPkg}" to ${fixVer} to resolve transitive vulnerability in ${pkgName}`;
                  }
                }

                const finding: VulnerabilityFinding = {
                  id: advisoryId,
                  package: pkgName,
                  severity,
                  installedVersion,
                  fixedVersion,
                  vulnerableRange: vulnData.range,
                  title,
                  url: advisoryUrl,
                  path: nodes.length > 0 ? nodes.join(', ') : undefined,
                  remediation,
                  isDirect,
                };
                vulnerabilities.push(finding);
              }
            }
          } catch {
            logger.debug('npm audit output could not be parsed as JSON.');
          }
        }

        if (!parsedSuccessfully && auditStatus !== 'network_error') {
          const errOutput = `${auditResult.stderr} ${auditResult.stdout}`;
          if (
            errOutput.includes('ENOTFOUND') ||
            errOutput.includes('ECONNREFUSED') ||
            errOutput.includes('EAI_AGAIN') ||
            errOutput.includes('ETIMEDOUT') ||
            errOutput.includes('network') ||
            errOutput.includes('offline') ||
            errOutput.includes('npm ERR!')
          ) {
            auditStatus = 'network_error';
            auditError =
              'Could not connect to the npm registry. Check your network or registry settings.';
          } else if (auditResult.exitCode !== 0 || auditRawOutput.trim().length > 0) {
            auditStatus = 'skipped';
            auditError =
              'Failed to parse npm audit output. Data format was invalid or unrecognized.';
          }
        }
      } catch (err) {
        logger.debug(`npm audit failed: ${(err as Error).message}`);
        auditStatus = 'network_error';
        auditError = (err as Error).message;
      }
    }

    // 3. Handle --fix if requested (safe fix only, never --force)
    if (options.fix && auditStatus === 'completed') {
      if (!options.yes && !options.dryRun) {
        logger.info(
          'Proposed fix: Running "npm audit fix" to safely remediate compatible vulnerabilities...',
        );
      }
      await commandRunner.run('npm', ['audit', 'fix'], {
        cwd: root,
        dryRun: options.dryRun,
        allowFailure: true,
      });
      logger.success('Executed safe vulnerability fix pass.');
    }

    // 4. Evaluate against security policy
    const failOnSeverities: SeverityLevel[] = (config.security?.failOn || ['high', 'critical']).map(
      (s: string) => s.toLowerCase() as SeverityLevel,
    );

    const violatingVulns = vulnerabilities.filter((v) => failOnSeverities.includes(v.severity));

    let policyPassed = violatingVulns.length === 0;
    let recommendation = policyPassed
      ? 'All dependencies satisfy configured security policy.'
      : `Policy violation: Detected ${violatingVulns.length} vulnerabilities meeting or exceeding fail policy [${failOnSeverities.join(', ')}].`;

    if (auditStatus === 'network_error') {
      policyPassed = false;
      recommendation = `Security audit could not reach the npm registry: ${auditError || 'Network failure'}. Security status cannot be verified offline.`;
    } else if (auditStatus === 'no_lockfile') {
      policyPassed = false;
      recommendation =
        'No lockfile found. Run "npm install" to generate package-lock.json before auditing.';
    } else if (auditStatus === 'skipped') {
      policyPassed = false;
      recommendation = `Security audit could not be completed: ${auditError || 'Audit output error'}.`;
    }

    const report: SecurityAuditReport = {
      project: projectInfo.name,
      ecosystem: 'npm',
      timestamp: new Date().toISOString(),
      auditStatus,
      auditError,
      dependencySummary: {
        total: directCount + devCount,
        direct: directCount,
        dev: devCount,
        outdated: outdatedList.length,
        vulnerabilities: vulnerabilities.length,
      },
      vulnerabilities,
      outdated: outdatedList,
      policyPassed,
      failedSeverityLevels: [...new Set(violatingVulns.map((v) => v.severity))],
      recommendation,
    };

    return report;
  }

  private async auditPythonProject(
    root: string,
    projectInfo: any,
    config: any,
    _options: AuditOptions,
  ): Promise<SecurityAuditReport> {
    const hasPipAudit = await commandRunner.isExecutableAvailable('pip-audit');
    const vulnerabilities: VulnerabilityFinding[] = [];

    if (!hasPipAudit) {
      logger.warn(
        'pip-audit is not installed in the current environment. Python dependency vulnerability scanning requires pip-audit.',
      );
      return {
        project: projectInfo.name,
        ecosystem: 'python',
        timestamp: new Date().toISOString(),
        auditStatus: 'skipped',
        auditError: 'pip-audit executable not found',
        dependencySummary: {
          total: 0,
          direct: 0,
          dev: 0,
          outdated: 0,
          vulnerabilities: 0,
        },
        vulnerabilities: [],
        outdated: [],
        policyPassed: true,
        failedSeverityLevels: [],
        recommendation:
          'Install pip-audit ("pip install pip-audit") to enable vulnerability analysis.',
      };
    }

    let auditStatus: 'completed' | 'network_error' | 'skipped' = 'completed';
    let auditError: string | undefined;

    try {
      const result = await commandRunner.run('pip-audit', ['--format=json'], {
        cwd: root,
        allowFailure: true,
      });

      if (result.stdout) {
        try {
          const parsed = JSON.parse(result.stdout);
          const vulnsArray = parsed.dependencies || parsed;
          if (Array.isArray(vulnsArray)) {
            for (const item of vulnsArray) {
              for (const vuln of item.vulns || []) {
                vulnerabilities.push({
                  id: vuln.id,
                  package: item.name,
                  severity: 'high',
                  installedVersion: item.version || 'Unknown',
                  fixedVersion: vuln.fix_versions ? vuln.fix_versions.join(', ') : null,
                  title: vuln.description || `Vulnerability ${vuln.id}`,
                  remediation: vuln.fix_versions
                    ? `Upgrade ${item.name} to ${vuln.fix_versions.join(', ')}`
                    : 'Inspect package security advisory',
                });
              }
            }
          }
        } catch {
          logger.debug('pip-audit JSON parse failed.');
        }
      }

      if (result.exitCode !== 0 && vulnerabilities.length === 0 && result.stderr) {
        if (
          result.stderr.includes('connection') ||
          result.stderr.includes('Network') ||
          result.stderr.includes('offline')
        ) {
          auditStatus = 'network_error';
          auditError = result.stderr.trim();
        }
      }
    } catch (err) {
      logger.debug(`pip-audit execution error: ${(err as Error).message}`);
      auditStatus = 'network_error';
      auditError = (err as Error).message;
    }

    const failOnSeverities: SeverityLevel[] = config.security?.failOn || ['high', 'critical'];
    const violatingVulns = vulnerabilities.filter((v) => failOnSeverities.includes(v.severity));

    let policyPassed = violatingVulns.length === 0;
    let recommendation =
      violatingVulns.length === 0
        ? 'Python dependencies satisfy configured policy.'
        : `Policy violation: ${violatingVulns.length} vulnerabilities detected.`;

    if (auditStatus === 'network_error') {
      policyPassed = false;
      recommendation = `pip-audit could not reach vulnerability databases: ${auditError || 'Network failure'}`;
    }

    return {
      project: projectInfo.name,
      ecosystem: 'python',
      timestamp: new Date().toISOString(),
      auditStatus,
      auditError,
      dependencySummary: {
        total: 0,
        direct: 0,
        dev: 0,
        outdated: 0,
        vulnerabilities: vulnerabilities.length,
      },
      vulnerabilities,
      outdated: [],
      policyPassed,
      failedSeverityLevels: [...new Set(violatingVulns.map((v) => v.severity))],
      recommendation,
    };
  }
}

export const auditService = new AuditService();
