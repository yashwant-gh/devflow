import fs from 'fs-extra';
import { projectDetector } from '../../core/project-detector.js';
import { FileManager, type FileOperationResult } from '../../core/file-manager.js';
import { ConfigurationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export interface AddFeatureOptions {
  cwd?: string;
  dryRun?: boolean;
  overwrite?: boolean;
}

export class AddService {
  public async addFeature(
    feature: 'testing' | 'linting' | 'formatting',
    options: AddFeatureOptions = {},
  ): Promise<FileOperationResult[]> {
    const root = options.cwd || process.cwd();
    const projectInfo = await projectDetector.detect(root);
    const fileManager = new FileManager(root, { dryRun: options.dryRun });
    const results: FileOperationResult[] = [];

    logger.debug(`Adding feature "${feature}" for project type "${projectInfo.type}" at ${root}`);

    if (
      projectInfo.type === 'node-api' ||
      projectInfo.type === 'node-cli' ||
      projectInfo.packageJsonPath
    ) {
      if (feature === 'testing') {
        // 1. vitest.config.ts
        const vitestConfig = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
`;
        results.push(
          await fileManager.writeFile('vitest.config.ts', vitestConfig, {
            overwrite: options.overwrite,
          }),
        );

        // 2. Sample test file if tests folder doesn't exist
        const sampleTest = `import { describe, it, expect } from 'vitest';

describe('Sample Test Suite', () => {
  it('should verify test environment is working', () => {
    expect(1 + 1).toBe(2);
  });
});
`;
        if (!(await fileManager.exists('tests/example.test.ts'))) {
          results.push(
            await fileManager.writeFile('tests/example.test.ts', sampleTest, {
              overwrite: options.overwrite,
            }),
          );
        }

        // 3. Update package.json scripts
        if (projectInfo.packageJsonPath && (await fs.pathExists(projectInfo.packageJsonPath))) {
          const pkg = await fs.readJson(projectInfo.packageJsonPath);
          pkg.scripts = pkg.scripts || {};
          pkg.scripts.test = pkg.scripts.test || 'vitest run';
          pkg.scripts['test:watch'] = pkg.scripts['test:watch'] || 'vitest';
          if (!options.dryRun) {
            await fs.writeJson(projectInfo.packageJsonPath, pkg, { spaces: 2 });
          }
          results.push({ action: 'updated', path: projectInfo.packageJsonPath });
        }
      } else if (feature === 'linting') {
        const eslintConfig = `export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];
`;
        results.push(
          await fileManager.writeFile('eslint.config.js', eslintConfig, {
            overwrite: options.overwrite,
          }),
        );

        if (projectInfo.packageJsonPath && (await fs.pathExists(projectInfo.packageJsonPath))) {
          const pkg = await fs.readJson(projectInfo.packageJsonPath);
          pkg.scripts = pkg.scripts || {};
          pkg.scripts.lint = pkg.scripts.lint || 'eslint src tests --ext .ts';
          pkg.scripts['lint:fix'] = pkg.scripts['lint:fix'] || 'eslint src tests --ext .ts --fix';
          if (!options.dryRun) {
            await fs.writeJson(projectInfo.packageJsonPath, pkg, { spaces: 2 });
          }
          results.push({ action: 'updated', path: projectInfo.packageJsonPath });
        }
      } else if (feature === 'formatting') {
        const prettierConfig = JSON.stringify(
          {
            semi: true,
            trailingComma: 'all',
            singleQuote: true,
            printWidth: 100,
            tabWidth: 2,
          },
          null,
          2,
        );
        results.push(
          await fileManager.writeFile('.prettierrc.json', prettierConfig, {
            overwrite: options.overwrite,
          }),
        );

        if (projectInfo.packageJsonPath && (await fs.pathExists(projectInfo.packageJsonPath))) {
          const pkg = await fs.readJson(projectInfo.packageJsonPath);
          pkg.scripts = pkg.scripts || {};
          pkg.scripts.format =
            pkg.scripts.format || 'prettier --write "src/**/*.ts" "tests/**/*.ts"';
          pkg.scripts['format:check'] =
            pkg.scripts['format:check'] || 'prettier --check "src/**/*.ts" "tests/**/*.ts"';
          if (!options.dryRun) {
            await fs.writeJson(projectInfo.packageJsonPath, pkg, { spaces: 2 });
          }
          results.push({ action: 'updated', path: projectInfo.packageJsonPath });
        }
      }
    } else if (projectInfo.type === 'python-fastapi' || projectInfo.type === 'python-service') {
      if (feature === 'testing') {
        const samplePyTest = `def test_sample():
    assert 1 + 1 == 2
`;
        if (!(await fileManager.exists('tests/test_sample.py'))) {
          results.push(
            await fileManager.writeFile('tests/test_sample.py', samplePyTest, {
              overwrite: options.overwrite,
            }),
          );
        }
      } else if (feature === 'linting' || feature === 'formatting') {
        const ruffConfig = `[tool.ruff]
line-length = 100
target-version = "py310"
`;
        if (projectInfo.pyprojectPath && (await fs.pathExists(projectInfo.pyprojectPath))) {
          let content = await fs.readFile(projectInfo.pyprojectPath, 'utf-8');
          if (!content.includes('[tool.ruff]')) {
            content += `\n${ruffConfig}`;
            if (!options.dryRun) {
              await fs.writeFile(projectInfo.pyprojectPath, content, 'utf-8');
            }
            results.push({ action: 'updated', path: projectInfo.pyprojectPath });
          }
        } else {
          results.push(
            await fileManager.writeFile('ruff.toml', 'line-length = 100\n', {
              overwrite: options.overwrite,
            }),
          );
        }
      }
    } else {
      throw new ConfigurationError(
        `Unable to automatically configure "${feature}" for unsupported project type: ${projectInfo.type}`,
        {
          suggestion: 'Ensure your project contains a package.json or pyproject.toml file.',
          context: { projectType: projectInfo.type, root },
        },
      );
    }

    return results;
  }
}

export const addService = new AddService();
