import YAML from 'yaml';
import { projectDetector } from '../../core/project-detector.js';
import { FileManager, type FileOperationResult } from '../../core/file-manager.js';
import { ConfigurationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export type CIProfile = 'basic' | 'standard' | 'strict';

export interface CIOptions {
  cwd?: string;
  profile?: CIProfile;
  provider?: 'github-actions' | 'gitlab';
  dryRun?: boolean;
  force?: boolean;
}

export interface CIValidationResult {
  valid: boolean;
  provider: string;
  workflowPath?: string;
  errors: string[];
  warnings: string[];
}

export class CICDService {
  public async init(options: CIOptions = {}): Promise<FileOperationResult> {
    const root = options.cwd || process.cwd();
    const projectInfo = await projectDetector.detect(root);
    const fileManager = new FileManager(root, { dryRun: options.dryRun });
    const profile = options.profile || 'standard';

    const isNode =
      projectInfo.type === 'node-api' ||
      projectInfo.type === 'node-cli' ||
      !!projectInfo.packageJsonPath;
    const isPython =
      projectInfo.type === 'python-fastapi' ||
      projectInfo.type === 'python-service' ||
      !!projectInfo.pyprojectPath;

    if (!isNode && !isPython) {
      throw new ConfigurationError('Unable to generate CI/CD pipeline: unknown project type.', {
        suggestion: 'Initialize a Node.js or Python project before setting up CI.',
      });
    }

    const workflowRelativePath = '.github/workflows/ci.yml';
    const exists = await fileManager.exists(workflowRelativePath);

    if (exists && !options.force) {
      throw new ConfigurationError(
        `CI workflow already exists at ${workflowRelativePath}. Use "devflow ci update" or pass --force to overwrite.`,
        {
          context: { path: workflowRelativePath },
          suggestion: 'Run devflow ci update to safely review and apply updates.',
        },
      );
    }

    const workflowContent = this.generateGitHubActionsWorkflow(projectInfo, profile);

    // Validate YAML before writing
    try {
      YAML.parse(workflowContent);
    } catch (err) {
      throw new ConfigurationError(
        `Generated CI workflow has invalid YAML: ${(err as Error).message}`,
      );
    }

    return await fileManager.writeFile(workflowRelativePath, workflowContent, {
      overwrite: options.force,
      dryRun: options.dryRun,
    });
  }

  public async update(options: CIOptions = {}): Promise<{ updated: boolean; diff?: string }> {
    const root = options.cwd || process.cwd();
    const fileManager = new FileManager(root, { dryRun: options.dryRun });
    const workflowPath = '.github/workflows/ci.yml';

    const exists = await fileManager.exists(workflowPath);
    if (!exists) {
      logger.info('No existing CI workflow found. Running init instead...');
      await this.init(options);
      return { updated: true };
    }

    const existingContent = await fileManager.readFile(workflowPath);
    const projectInfo = await projectDetector.detect(root);
    const newContent = this.generateGitHubActionsWorkflow(
      projectInfo,
      options.profile || 'standard',
    );

    if (existingContent.trim() === newContent.trim()) {
      logger.info('CI workflow is already up to date with the latest profile settings.');
      return { updated: false };
    }

    logger.info(`Updating ${workflowPath} with ${options.profile || 'standard'} profile...`);
    await fileManager.writeFile(workflowPath, newContent, {
      overwrite: true,
      dryRun: options.dryRun,
    });

    return { updated: true, diff: 'Workflow updated to latest specification.' };
  }

  public async validate(cwd?: string): Promise<CIValidationResult> {
    const root = cwd || process.cwd();
    const fileManager = new FileManager(root);
    const errors: string[] = [];
    const warnings: string[] = [];
    const workflowPath = '.github/workflows/ci.yml';

    const hasWorkflow = await fileManager.exists(workflowPath);
    if (!hasWorkflow) {
      return {
        valid: false,
        provider: 'github-actions',
        errors: [`Workflow file not found at ${workflowPath}`],
        warnings,
      };
    }

    try {
      const content = await fileManager.readFile(workflowPath);
      const parsed = YAML.parse(content);

      if (!parsed.name) warnings.push('Workflow missing top-level "name" attribute.');
      if (!parsed.on) errors.push('Workflow missing "on" trigger specification.');
      if (!parsed.jobs || Object.keys(parsed.jobs).length === 0) {
        errors.push('Workflow does not define any jobs.');
      }
      if (!parsed.permissions) {
        warnings.push(
          'Security Warning: Workflow does not define explicit permissions. Consider adding "permissions: contents: read".',
        );
      }

      return {
        valid: errors.length === 0,
        provider: 'github-actions',
        workflowPath,
        errors,
        warnings,
      };
    } catch (err) {
      return {
        valid: false,
        provider: 'github-actions',
        workflowPath,
        errors: [`YAML parsing error: ${(err as Error).message}`],
        warnings,
      };
    }
  }

  private generateGitHubActionsWorkflow(projectInfo: any, profile: CIProfile): string {
    const isNode =
      projectInfo.type === 'node-api' ||
      projectInfo.type === 'node-cli' ||
      !!projectInfo.packageJsonPath;

    // Pinning to immutable SHAs in strict mode
    const checkoutAction =
      profile === 'strict'
        ? 'actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1'
        : 'actions/checkout@v4';

    const setupNodeAction =
      profile === 'strict'
        ? 'actions/setup-node@60edb5dd545a775178f525247833795be8391ab8 # v4.0.2'
        : 'actions/setup-node@v4';

    const setupPythonAction =
      profile === 'strict'
        ? 'actions/setup-python@0a5c61591373683505ea898e09a3ea4f39ef2b9c # v5.0.0'
        : 'actions/setup-python@v5';

    if (isNode) {
      let steps = `      - name: Checkout repository
        uses: ${checkoutAction}

      - name: Set up Node.js
        uses: ${setupNodeAction}
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Verify code formatting
        run: npm run format:check --if-present

      - name: Run linter
        run: npm run lint --if-present
`;

      if (profile === 'standard' || profile === 'strict') {
        steps += `
      - name: Type check
        run: npm run typecheck --if-present
`;
      }

      steps += `
      - name: Run tests
        run: npm test --if-present
`;

      if (profile === 'standard' || profile === 'strict') {
        steps += `
      - name: Build project
        run: npm run build --if-present

      - name: Run dependency security audit
        run: npm audit --audit-level=${profile === 'strict' ? 'moderate' : 'high'}
`;
      }

      return `name: CI Pipeline (${profile})

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

permissions:
  contents: read

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    name: Build & Test
    runs-on: ubuntu-latest
    timeout-minutes: ${profile === 'strict' ? 10 : 15}

    steps:
${steps}`;
    } else {
      // Python workflow
      let steps = `      - name: Checkout repository
        uses: ${checkoutAction}

      - name: Set up Python
        uses: ${setupPythonAction}
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install .[dev]

      - name: Run linter
        run: ruff check . --exit-non-zero-on-fix
`;

      steps += `
      - name: Run pytest
        run: pytest
`;

      if (profile === 'standard' || profile === 'strict') {
        steps += `
      - name: Security audit
        run: |
          pip install pip-audit
          pip-audit --desc
`;
      }

      return `name: Python CI Pipeline (${profile})

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

permissions:
  contents: read

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    name: Lint & Test
    runs-on: ubuntu-latest
    timeout-minutes: ${profile === 'strict' ? 10 : 15}

    steps:
${steps}`;
    }
  }
}

export const cicdService = new CICDService();
