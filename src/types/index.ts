/**
 * DevFlow Core Type Definitions
 */

export enum ExitCode {
  SUCCESS = 0,
  GENERAL_FAILURE = 1,
  INVALID_ARGUMENTS = 2,
  MISSING_DEPENDENCY = 3,
  QUALITY_CHECKS_FAILED = 4,
  SECURITY_AUDIT_FAILED = 5,
  USER_INTERRUPTED = 130,
}

export interface GlobalOptions {
  help?: boolean;
  version?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
  interactive?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  cwd?: string;
}

export type ProjectType = 'node-api' | 'node-cli' | 'python-fastapi' | 'python-service' | 'generic';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'pip' | 'poetry' | 'uv';

export interface ProjectInfo {
  rootPath: string;
  name: string;
  type: ProjectType;
  packageManager: PackageManager;
  hasGit: boolean;
  hasDocker: boolean;
  hasCompose: boolean;
  hasCI: boolean;
  hasTests: boolean;
  hasLinter: boolean;
  hasFormatter: boolean;
  hasEnvFile: boolean;
  hasEnvExample: boolean;
  packageJsonPath?: string;
  pyprojectPath?: string;
  requirementsPath?: string;
  lockfilePath?: string;
}

export type CheckStatus = 'PASS' | 'FAIL' | 'SKIPPED' | 'WARNING' | 'ERROR';

export interface QualityCheckResult {
  name: string;
  description: string;
  status: CheckStatus;
  durationMs: number;
  exitCode: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  remediation?: string;
}

export interface QualityReport {
  projectName: string;
  timestamp: string;
  durationMs: number;
  overallStatus: CheckStatus;
  checks: QualityCheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    warnings: number;
    errors: number;
  };
  remediations: string[];
}

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface VulnerabilityFinding {
  id?: string;
  package: string;
  severity: SeverityLevel;
  installedVersion: string;
  fixedVersion: string | null;
  vulnerableRange?: string;
  title: string;
  url?: string;
  path?: string;
  remediation?: string;
  isDirect?: boolean;
}

export interface OutdatedPackage {
  package: string;
  current: string;
  wanted: string;
  latest: string;
  dependent?: string;
}

export interface SecurityAuditReport {
  project: string;
  ecosystem: 'npm' | 'python';
  timestamp: string;
  auditStatus?: 'completed' | 'network_error' | 'skipped' | 'no_lockfile';
  auditError?: string;
  dependencySummary: {
    total: number;
    direct: number;
    dev: number;
    outdated: number;
    vulnerabilities: number;
  };
  vulnerabilities: VulnerabilityFinding[];
  outdated: OutdatedPackage[];
  policyPassed: boolean;
  failedSeverityLevels: SeverityLevel[];
  recommendation: string;
}

export type DiagnosticStatus =
  'Installed' | 'Missing' | 'Unsupported version' | 'Unavailable' | 'Not required';

export interface DiagnosticItem {
  name: string;
  category: 'SYSTEM' | 'TOOLS' | 'PROJECT';
  status: DiagnosticStatus;
  details?: string;
  version?: string;
  recommendation?: string;
  required?: boolean;
}

export interface DoctorReport {
  timestamp: string;
  system: DiagnosticItem[];
  tools: DiagnosticItem[];
  project: DiagnosticItem[];
  recommendations: string[];
  overallHealthy: boolean;
}

export interface StandardRuleResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  severity: 'error' | 'warning';
  message: string;
  remediation: string;
}

export interface StandardsReport {
  project: string;
  passed: boolean;
  totalRules: number;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  results: StandardRuleResult[];
}

export interface DevFlowConfig {
  version: number;
  project: {
    name: string;
    type: ProjectType;
    defaultTemplate?: string;
    preferredPackageManager?: PackageManager;
  };
  standards: {
    requireReadme: boolean;
    requireTests: boolean;
    requireDocker: boolean;
    requireCICD: boolean;
    requireEnvExample: boolean;
    requireGitignore: boolean;
    requireTypeChecking: boolean;
  };
  quality: {
    minimumCoverage: number;
    failOnLintError: boolean;
    failOnTypeError: boolean;
  };
  security: {
    failOn: SeverityLevel[];
    autoFix: boolean;
  };
  ci?: {
    provider: 'github-actions' | 'gitlab';
    profile: 'basic' | 'standard' | 'strict';
  };
  ai?: {
    provider?: string;
    model?: string;
    consentGiven?: boolean;
  };
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  language: 'typescript' | 'python' | 'javascript';
  category: 'api' | 'cli' | 'service';
  tags: string[];
  files: string[];
  defaultPackageManager: PackageManager;
  requiredTools: string[];
}
