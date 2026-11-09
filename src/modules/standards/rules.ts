import path from 'node:path';
import fs from 'fs-extra';
import {
  type StandardRuleResult,
  type DevFlowConfig,
  type ProjectInfo,
} from '../../types/index.js';

export interface RuleContext {
  root: string;
  projectInfo: ProjectInfo;
  config: DevFlowConfig;
}

export interface StandardRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rationale: string;
  readonly remediation: string;
  readonly defaultSeverity: 'error' | 'warning';
  evaluate(context: RuleContext): Promise<StandardRuleResult>;
}

export class RequireReadmeRule implements StandardRule {
  public readonly id = 'require-readme';
  public readonly name = 'README Documentation';
  public readonly description = 'Validates that the project contains a non-empty README.md.';
  public readonly rationale =
    'Clear documentation enables engineers to onboard quickly and understand project architecture.';
  public readonly remediation =
    'Run "devflow docs generate" to create standard project documentation.';
  public readonly defaultSeverity = 'error';

  public async evaluate(context: RuleContext): Promise<StandardRuleResult> {
    const readmePath = path.join(context.root, 'README.md');
    const exists = await fs.pathExists(readmePath);
    if (!exists) {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        passed: false,
        severity: this.defaultSeverity,
        message: 'README.md is missing in the project root.',
        remediation: this.remediation,
      };
    }

    const content = await fs.readFile(readmePath, 'utf-8');
    if (content.trim().length < 20) {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        passed: false,
        severity: 'warning',
        message: 'README.md exists but has insufficient content.',
        remediation: this.remediation,
      };
    }

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      passed: true,
      severity: this.defaultSeverity,
      message: 'README.md is present and documented.',
      remediation: this.remediation,
    };
  }
}

export class RequireTestsRule implements StandardRule {
  public readonly id = 'require-tests';
  public readonly name = 'Automated Testing Setup';
  public readonly description = 'Validates that the project has test directories and test scripts.';
  public readonly rationale =
    'Automated tests ensure functional correctness and prevent regressions during continuous deployment.';
  public readonly remediation = 'Run "devflow add testing" to configure a test suite.';
  public readonly defaultSeverity = 'error';

  public async evaluate(context: RuleContext): Promise<StandardRuleResult> {
    const hasTestDir =
      (await fs.pathExists(path.join(context.root, 'tests'))) ||
      (await fs.pathExists(path.join(context.root, 'test'))) ||
      (await fs.pathExists(path.join(context.root, '__tests__')));

    if (!hasTestDir) {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        passed: false,
        severity: this.defaultSeverity,
        message: 'No test directory (tests/ or test/) detected.',
        remediation: this.remediation,
      };
    }

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      passed: true,
      severity: this.defaultSeverity,
      message: 'Automated test suite structure is configured.',
      remediation: this.remediation,
    };
  }
}

export class RequireDockerRule implements StandardRule {
  public readonly id = 'require-docker';
  public readonly name = 'Containerization';
  public readonly description =
    'Validates that a Dockerfile is configured for container deployment.';
  public readonly rationale =
    'Standard container definitions ensure consistent behavior between development and production.';
  public readonly remediation =
    'Run "devflow add docker" to generate production Docker configuration.';
  public readonly defaultSeverity = 'error';

  public async evaluate(context: RuleContext): Promise<StandardRuleResult> {
    const hasDockerfile = await fs.pathExists(path.join(context.root, 'Dockerfile'));
    if (!hasDockerfile) {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        passed: false,
        severity: this.defaultSeverity,
        message: 'Dockerfile is missing in the project root.',
        remediation: this.remediation,
      };
    }

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      passed: true,
      severity: this.defaultSeverity,
      message: 'Dockerfile is present.',
      remediation: this.remediation,
    };
  }
}

export class RequireCICDRule implements StandardRule {
  public readonly id = 'require-cicd';
  public readonly name = 'CI/CD Pipeline';
  public readonly description = 'Validates that continuous integration workflows are present.';
  public readonly rationale =
    'Continuous integration automatically verifies code quality before changes merge to production.';
  public readonly remediation = 'Run "devflow ci init" to generate GitHub Actions pipelines.';
  public readonly defaultSeverity = 'error';

  public async evaluate(context: RuleContext): Promise<StandardRuleResult> {
    const hasGitHubActions = await fs.pathExists(path.join(context.root, '.github', 'workflows'));
    const hasGitLab = await fs.pathExists(path.join(context.root, '.gitlab-ci.yml'));

    if (!hasGitHubActions && !hasGitLab) {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        passed: false,
        severity: this.defaultSeverity,
        message: 'No CI/CD pipeline configuration (.github/workflows or .gitlab-ci.yml) found.',
        remediation: this.remediation,
      };
    }

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      passed: true,
      severity: this.defaultSeverity,
      message: 'CI/CD workflow is configured.',
      remediation: this.remediation,
    };
  }
}

export class RequireEnvExampleRule implements StandardRule {
  public readonly id = 'require-env-example';
  public readonly name = 'Environment Variables Example';
  public readonly description = 'Validates that a .env.example template file is provided.';
  public readonly rationale =
    'Environment variable templates allow developers to safely configure local environments without committing secrets.';
  public readonly remediation =
    'Create a .env.example file documenting required environment variables.';
  public readonly defaultSeverity = 'error';

  public async evaluate(context: RuleContext): Promise<StandardRuleResult> {
    const hasExample =
      (await fs.pathExists(path.join(context.root, '.env.example'))) ||
      (await fs.pathExists(path.join(context.root, '.env.sample')));

    if (!hasExample) {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        passed: false,
        severity: this.defaultSeverity,
        message: '.env.example template is missing.',
        remediation: this.remediation,
      };
    }

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      passed: true,
      severity: this.defaultSeverity,
      message: '.env.example is present.',
      remediation: this.remediation,
    };
  }
}

export class RequireGitignoreRule implements StandardRule {
  public readonly id = 'require-gitignore';
  public readonly name = 'Git Ignore Configuration';
  public readonly description = 'Validates that .gitignore exists and ignores sensitive files.';
  public readonly rationale =
    'Prevents accidental leakage of credentials, dependencies, and temporary build artifacts into version control.';
  public readonly remediation = 'Create a .gitignore file ignoring node_modules, .env, and dist.';
  public readonly defaultSeverity = 'error';

  public async evaluate(context: RuleContext): Promise<StandardRuleResult> {
    const gitignorePath = path.join(context.root, '.gitignore');
    const exists = await fs.pathExists(gitignorePath);

    if (!exists) {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        passed: false,
        severity: this.defaultSeverity,
        message: '.gitignore file is missing.',
        remediation: this.remediation,
      };
    }

    const content = await fs.readFile(gitignorePath, 'utf-8');
    const missingCrucial: string[] = [];
    if (!content.includes('.env')) missingCrucial.push('.env');

    if (missingCrucial.length > 0) {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        passed: false,
        severity: 'warning',
        message: `.gitignore exists but does not ignore: ${missingCrucial.join(', ')}`,
        remediation: `Add ${missingCrucial.join(', ')} to .gitignore to protect secrets.`,
      };
    }

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      passed: true,
      severity: this.defaultSeverity,
      message: '.gitignore is properly configured.',
      remediation: this.remediation,
    };
  }
}

export class RequireTypeCheckingRule implements StandardRule {
  public readonly id = 'require-typechecking';
  public readonly name = 'TypeScript Configuration';
  public readonly description =
    'Validates that TypeScript projects have tsconfig.json with strict checks.';
  public readonly rationale =
    'TypeScript strict mode eliminates common runtime type errors and improves software maintainability.';
  public readonly remediation = 'Ensure tsconfig.json has "strict": true enabled.';
  public readonly defaultSeverity = 'error';

  public async evaluate(context: RuleContext): Promise<StandardRuleResult> {
    const isNode =
      context.projectInfo.type === 'node-api' ||
      context.projectInfo.type === 'node-cli' ||
      !!context.projectInfo.packageJsonPath;

    if (!isNode) {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        passed: true,
        severity: 'warning',
        message: 'Non-TypeScript project; typecheck rule not applicable.',
        remediation: this.remediation,
      };
    }

    const tsconfigPath = path.join(context.root, 'tsconfig.json');
    if (!(await fs.pathExists(tsconfigPath))) {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        passed: false,
        severity: this.defaultSeverity,
        message: 'tsconfig.json is missing in TypeScript project.',
        remediation: this.remediation,
      };
    }

    try {
      const content = await fs.readFile(tsconfigPath, 'utf-8');
      if (!content.includes('"strict": true') && !content.includes('"strict":true')) {
        return {
          id: this.id,
          name: this.name,
          description: this.description,
          passed: false,
          severity: 'warning',
          message: 'tsconfig.json does not enable "strict": true.',
          remediation: 'Enable "strict": true in tsconfig.json compilerOptions.',
        };
      }
    } catch {
      // Ignored
    }

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      passed: true,
      severity: this.defaultSeverity,
      message: 'TypeScript strict mode is configured.',
      remediation: this.remediation,
    };
  }
}
