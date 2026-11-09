import path from 'node:path';
import fs from 'fs-extra';
import { type ProjectInfo, type ProjectType, type PackageManager } from '../types/index.js';

export class ProjectDetector {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = path.resolve(projectRoot);
  }

  public setProjectRoot(root: string): void {
    this.projectRoot = path.resolve(root);
  }

  public async detect(cwd?: string): Promise<ProjectInfo> {
    if (cwd) {
      this.projectRoot = path.resolve(cwd);
    }
    const root = this.projectRoot;
    const pkgJsonPath = path.join(root, 'package.json');
    const pyprojectPath = path.join(root, 'pyproject.toml');
    const requirementsPath = path.join(root, 'requirements.txt');

    const hasPkgJson = await fs.pathExists(pkgJsonPath);
    const hasPyproject = await fs.pathExists(pyprojectPath);
    const hasRequirements = await fs.pathExists(requirementsPath);

    let projectName = path.basename(root);
    let type: ProjectType = 'generic';
    let packageManager: PackageManager = 'npm';
    let lockfilePath: string | undefined;

    if (hasPkgJson) {
      try {
        const pkg = await fs.readJson(pkgJsonPath);
        if (pkg.name) projectName = pkg.name;

        const allDeps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };

        if (allDeps['express']) {
          type = 'node-api';
        } else if (pkg.bin || allDeps['commander']) {
          type = 'node-cli';
        } else {
          type = 'node-api';
        }
      } catch {
        type = 'node-api';
      }

      // Check package manager
      if (await fs.pathExists(path.join(root, 'pnpm-lock.yaml'))) {
        packageManager = 'pnpm';
        lockfilePath = path.join(root, 'pnpm-lock.yaml');
      } else if (await fs.pathExists(path.join(root, 'yarn.lock'))) {
        packageManager = 'yarn';
        lockfilePath = path.join(root, 'yarn.lock');
      } else if (await fs.pathExists(path.join(root, 'package-lock.json'))) {
        packageManager = 'npm';
        lockfilePath = path.join(root, 'package-lock.json');
      } else {
        packageManager = 'npm';
      }
    } else if (hasPyproject || hasRequirements) {
      if (hasPyproject) {
        try {
          const content = await fs.readFile(pyprojectPath, 'utf-8');
          if (content.toLowerCase().includes('fastapi')) {
            type = 'python-fastapi';
          } else {
            type = 'python-service';
          }
          if (content.includes('[tool.poetry]')) {
            packageManager = 'poetry';
          }
        } catch {
          type = 'python-service';
        }
      } else if (hasRequirements) {
        try {
          const content = await fs.readFile(requirementsPath, 'utf-8');
          if (content.toLowerCase().includes('fastapi')) {
            type = 'python-fastapi';
          } else {
            type = 'python-service';
          }
        } catch {
          type = 'python-service';
        }
        packageManager = 'pip';
      }

      if (await fs.pathExists(path.join(root, 'poetry.lock'))) {
        packageManager = 'poetry';
        lockfilePath = path.join(root, 'poetry.lock');
      } else if (await fs.pathExists(path.join(root, 'uv.lock'))) {
        packageManager = 'uv';
        lockfilePath = path.join(root, 'uv.lock');
      }
    }

    const hasGit = await fs.pathExists(path.join(root, '.git'));
    const hasDocker = await fs.pathExists(path.join(root, 'Dockerfile'));
    const hasCompose =
      (await fs.pathExists(path.join(root, 'docker-compose.yml'))) ||
      (await fs.pathExists(path.join(root, 'docker-compose.yaml'))) ||
      (await fs.pathExists(path.join(root, 'compose.yaml')));

    const hasCI =
      (await fs.pathExists(path.join(root, '.github', 'workflows'))) ||
      (await fs.pathExists(path.join(root, '.gitlab-ci.yml')));

    const hasTests =
      (await fs.pathExists(path.join(root, 'tests'))) ||
      (await fs.pathExists(path.join(root, 'test'))) ||
      (await fs.pathExists(path.join(root, '__tests__')));

    const hasLinter =
      (await fs.pathExists(path.join(root, 'eslint.config.js'))) ||
      (await fs.pathExists(path.join(root, '.eslintrc.json'))) ||
      (await fs.pathExists(path.join(root, '.eslintrc.js'))) ||
      (await fs.pathExists(path.join(root, 'ruff.toml'))) ||
      (await fs.pathExists(path.join(root, '.flake8')));

    const hasFormatter =
      (await fs.pathExists(path.join(root, '.prettierrc'))) ||
      (await fs.pathExists(path.join(root, '.prettierrc.json'))) ||
      (await fs.pathExists(path.join(root, 'prettier.config.js')));

    const hasEnvFile = await fs.pathExists(path.join(root, '.env'));
    const hasEnvExample =
      (await fs.pathExists(path.join(root, '.env.example'))) ||
      (await fs.pathExists(path.join(root, '.env.sample')));

    return {
      rootPath: root,
      name: projectName,
      type,
      packageManager,
      hasGit,
      hasDocker,
      hasCompose,
      hasCI,
      hasTests,
      hasLinter,
      hasFormatter,
      hasEnvFile,
      hasEnvExample,
      packageJsonPath: hasPkgJson ? pkgJsonPath : undefined,
      pyprojectPath: hasPyproject ? pyprojectPath : undefined,
      requirementsPath: hasRequirements ? requirementsPath : undefined,
      lockfilePath,
    };
  }
}

export const projectDetector = new ProjectDetector();
