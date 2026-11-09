import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import fg from 'fast-glob';
import Handlebars from 'handlebars';
import { TemplateError, ValidationError } from '../utils/errors.js';
import { FileManager, type FileOperationResult } from './file-manager.js';
import { logger } from '../utils/logger.js';
import { type TemplateDefinition } from '../types/index.js';

export interface ScaffoldingOptions {
  projectName: string;
  targetDir: string;
  templateId: string;
  description?: string;
  packageManager?: string;
  includeTesting?: boolean;
  includeLinting?: boolean;
  includeDocker?: boolean;
  includeCompose?: boolean;
  includeCI?: boolean;
  includeDocs?: boolean;
  initGit?: boolean;
  installDeps?: boolean;
  dryRun?: boolean;
  overwrite?: boolean;
}

export interface ScaffoldingResult {
  projectName: string;
  targetDir: string;
  templateId: string;
  files: FileOperationResult[];
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
}

export class TemplateEngine {
  private templatesDir: string;

  constructor(templatesDir?: string) {
    if (templatesDir) {
      this.templatesDir = path.resolve(templatesDir);
    } else {
      // Default to bundled templates directory
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      // In source: src/core -> src/templates
      // In dist: dist/core -> templates
      const possibleSrc = path.resolve(currentDir, '../templates');
      const possibleRoot = path.resolve(currentDir, '../../templates');
      if (fs.existsSync(possibleSrc)) {
        this.templatesDir = possibleSrc;
      } else {
        this.templatesDir = possibleRoot;
      }
    }
    this.registerHelpers();
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('ne', (a, b) => a !== b);
    Handlebars.registerHelper('and', (a, b) => a && b);
    Handlebars.registerHelper('or', (a, b) => a || b);
    Handlebars.registerHelper('not', (a) => !a);
    Handlebars.registerHelper('lower', (str: string) => (str ? str.toLowerCase() : ''));
    Handlebars.registerHelper('upper', (str: string) => (str ? str.toUpperCase() : ''));
    Handlebars.registerHelper('kebab', (str: string) =>
      str
        ? str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase()
            .replace(/\s+/g, '-')
        : '',
    );
  }

  public getTemplatesDir(): string {
    return this.templatesDir;
  }

  public async getAvailableTemplates(): Promise<TemplateDefinition[]> {
    return [
      {
        id: 'node-express-api',
        name: 'Express.js REST API',
        description:
          'Production-grade TypeScript Express REST API with health check, Zod env validation, error middleware, and tests.',
        language: 'typescript',
        category: 'api',
        tags: ['express', 'typescript', 'rest-api', 'docker'],
        files: ['src/app.ts', 'src/server.ts', 'src/controllers', 'tests'],
        defaultPackageManager: 'npm',
        requiredTools: ['node', 'npm'],
      },
      {
        id: 'python-fastapi',
        name: 'Python FastAPI Service',
        description:
          'High-performance Python FastAPI service with Pydantic settings, health check, pytest, and Docker container.',
        language: 'python',
        category: 'api',
        tags: ['python', 'fastapi', 'pydantic', 'pytest', 'docker'],
        files: ['app/main.py', 'app/core/config.py', 'app/api/routes', 'tests'],
        defaultPackageManager: 'pip',
        requiredTools: ['python'],
      },
      {
        id: 'node-cli',
        name: 'Node.js CLI Tool',
        description:
          'Extensible TypeScript CLI with Commander.js, argument parsing, unit tests, and build scripts.',
        language: 'typescript',
        category: 'cli',
        tags: ['cli', 'commander', 'typescript', 'tools'],
        files: ['src/index.ts', 'src/commands', 'tests'],
        defaultPackageManager: 'npm',
        requiredTools: ['node', 'npm'],
      },
    ];
  }

  public validateProjectName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Project name cannot be empty.', {
        suggestion: 'Provide a valid project name (e.g. devflow init my-service).',
      });
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
      throw new ValidationError(
        `Project name "${name}" contains invalid characters. Only alphanumeric characters, dashes, dots, and underscores are allowed.`,
        {
          context: { name },
          suggestion: 'Choose a name containing only letters, numbers, hyphens, and underscores.',
        },
      );
    }
  }

  public async scaffold(options: ScaffoldingOptions): Promise<ScaffoldingResult> {
    this.validateProjectName(options.projectName);

    const available = await this.getAvailableTemplates();
    const templateDef = available.find((t) => t.id === options.templateId);
    if (!templateDef) {
      const validIds = available.map((t) => t.id).join(', ');
      throw new TemplateError(`Unknown template "${options.templateId}".`, {
        context: { templateId: options.templateId, available: validIds },
        suggestion: `Choose one of the supported templates: ${validIds}`,
      });
    }

    const templateSourceDir = path.join(this.templatesDir, options.templateId);
    if (!(await fs.pathExists(templateSourceDir))) {
      throw new TemplateError(
        `Template source directory not found for "${options.templateId}" at: ${templateSourceDir}`,
        { context: { templateSourceDir } },
      );
    }

    const targetDir = path.resolve(options.targetDir);
    const fileManager = new FileManager(targetDir, { dryRun: options.dryRun });

    // Conflict detection: if target dir exists and has files, verify overwrite permission
    if (await fs.pathExists(targetDir)) {
      const existingEntries = await fs.readdir(targetDir);
      if (existingEntries.length > 0 && !options.overwrite) {
        throw new TemplateError(
          `Target directory "${targetDir}" is not empty. Found ${existingEntries.length} existing files/folders.`,
          {
            context: { targetDir, existingEntries: existingEntries.slice(0, 5) },
            suggestion: 'Use a different directory or pass --yes / --force to allow overwriting.',
          },
        );
      }
    }

    // Context for template variable interpolation
    const templateContext = {
      projectName: options.projectName,
      description: options.description || `${options.projectName} created with DevFlow`,
      packageManager: options.packageManager || templateDef.defaultPackageManager,
      includeTesting: options.includeTesting ?? true,
      includeLinting: options.includeLinting ?? true,
      includeDocker: options.includeDocker ?? true,
      includeCompose: options.includeCompose ?? true,
      includeCI: options.includeCI ?? true,
      includeDocs: options.includeDocs ?? true,
      year: new Date().getFullYear(),
    };

    const results: FileOperationResult[] = [];

    try {
      // Find all files in the template source
      const files = await fg('**/*', {
        cwd: templateSourceDir,
        dot: true,
        onlyFiles: true,
        ignore: ['**/*.map', '**/*.d.ts', '**/dist/**', '**/node_modules/**'],
      });

      for (const relativeFile of files) {
        // Exclude stray compiled JavaScript files in TypeScript templates (except configuration files like eslint.config.js)
        if (
          templateDef.language === 'typescript' &&
          relativeFile.endsWith('.js') &&
          !relativeFile.endsWith('eslint.config.js')
        ) {
          continue;
        }

        // Handle conditional files
        if (
          !templateContext.includeDocker &&
          (relativeFile === 'Dockerfile' || relativeFile === '.dockerignore')
        ) {
          continue;
        }
        if (
          !templateContext.includeCompose &&
          (relativeFile === 'docker-compose.yml' || relativeFile === 'docker-compose.yaml')
        ) {
          continue;
        }
        if (!templateContext.includeCI && relativeFile.startsWith('.github/')) {
          continue;
        }

        const sourcePath = path.join(templateSourceDir, relativeFile);
        const sourceContent = await fs.readFile(sourcePath, 'utf-8');

        // Compile and render content with Handlebars
        let renderedContent = sourceContent;
        try {
          const compiled = Handlebars.compile(sourceContent, { noEscape: true });
          renderedContent = compiled(templateContext);
        } catch (err) {
          // If template compilation fails, write original file content
          logger.debug(
            `Template compilation warning for ${relativeFile}: ${(err as Error).message}`,
          );
        }

        // Render target filename (e.g. if filename contains __name__)
        let targetFileName = relativeFile.replace(/__name__/g, options.projectName);
        // Rename gitignore.template to .gitignore if present
        if (targetFileName === 'gitignore.template') {
          targetFileName = '.gitignore';
        }

        const opResult = await fileManager.writeFile(targetFileName, renderedContent, {
          overwrite: options.overwrite,
          dryRun: options.dryRun,
        });

        results.push(opResult);
      }

      return {
        projectName: options.projectName,
        targetDir,
        templateId: options.templateId,
        files: results,
        createdCount: results.filter((r) => r.action === 'created').length,
        updatedCount: results.filter((r) => r.action === 'updated').length,
        skippedCount: results.filter((r) => r.action === 'skipped').length,
      };
    } catch (err) {
      if (!options.dryRun) {
        logger.warn('Rolling back generated files due to error...');
        await fileManager.rollback();
      }
      throw err;
    }
  }
}

export const templateEngine = new TemplateEngine();
