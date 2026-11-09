import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { z } from 'zod';
import {
  CONFIG_FILE_NAME,
  SUPPORTED_PROJECT_TYPES,
  SUPPORTED_PACKAGE_MANAGERS,
  SUPPORTED_SEVERITIES,
} from '../utils/constants.js';
import { ConfigurationError } from '../utils/errors.js';
import { type DevFlowConfig, type GlobalOptions } from '../types/index.js';

export const DevFlowConfigSchema = z.object({
  version: z.number().default(1),
  project: z.object({
    name: z.string().min(1, 'Project name cannot be empty'),
    type: z.enum(SUPPORTED_PROJECT_TYPES).default('generic'),
    defaultTemplate: z.string().optional(),
    preferredPackageManager: z.enum(SUPPORTED_PACKAGE_MANAGERS).optional(),
  }),
  standards: z
    .object({
      requireReadme: z.boolean().default(true),
      requireTests: z.boolean().default(true),
      requireDocker: z.boolean().default(false),
      requireCICD: z.boolean().default(true),
      requireEnvExample: z.boolean().default(true),
      requireGitignore: z.boolean().default(true),
      requireTypeChecking: z.boolean().default(true),
    })
    .prefault({}),
  quality: z
    .object({
      minimumCoverage: z.number().min(0).max(100).default(70),
      failOnLintError: z.boolean().default(true),
      failOnTypeError: z.boolean().default(true),
    })
    .prefault({}),
  security: z
    .object({
      failOn: z.array(z.enum(SUPPORTED_SEVERITIES)).default(['high', 'critical']),
      autoFix: z.boolean().default(false),
    })
    .prefault({}),
  ci: z
    .object({
      provider: z.enum(['github-actions', 'gitlab']).default('github-actions'),
      profile: z.enum(['basic', 'standard', 'strict']).default('standard'),
    })
    .optional(),
  ai: z
    .object({
      provider: z.string().optional(),
      model: z.string().optional(),
      consentGiven: z.boolean().default(false),
    })
    .optional(),
});

export const DEFAULT_CONFIG: DevFlowConfig = {
  version: 1,
  project: {
    name: 'devflow-project',
    type: 'generic',
  },
  standards: {
    requireReadme: true,
    requireTests: true,
    requireDocker: false,
    requireCICD: true,
    requireEnvExample: true,
    requireGitignore: true,
    requireTypeChecking: true,
  },
  quality: {
    minimumCoverage: 70,
    failOnLintError: true,
    failOnTypeError: true,
  },
  security: {
    failOn: ['high', 'critical'],
    autoFix: false,
  },
  ci: {
    provider: 'github-actions',
    profile: 'standard',
  },
};

export class ConfigurationManager {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = path.resolve(projectRoot);
  }

  public setProjectRoot(root: string): void {
    this.projectRoot = path.resolve(root);
  }

  public getProjectConfigPath(): string {
    return path.join(this.projectRoot, CONFIG_FILE_NAME);
  }

  public getUserConfigPath(): string {
    return path.join(os.homedir(), CONFIG_FILE_NAME);
  }

  public async hasProjectConfig(): Promise<boolean> {
    return await fs.pathExists(this.getProjectConfigPath());
  }

  public async loadConfig(_cliOptions: GlobalOptions = {}): Promise<DevFlowConfig> {
    let mergedConfig: Record<string, any> = { ...DEFAULT_CONFIG };

    // 1. User home config
    const userConfigPath = this.getUserConfigPath();
    if (await fs.pathExists(userConfigPath)) {
      try {
        const userContent = await fs.readJson(userConfigPath);
        mergedConfig = this.deepMerge(mergedConfig, userContent);
      } catch (err) {
        throw new ConfigurationError(
          `Failed to parse user config at ${userConfigPath}: ${(err as Error).message}`,
          {
            context: { userConfigPath },
            suggestion: 'Check that ~/.devflowrc.json is valid JSON or remove it.',
          },
        );
      }
    }

    // 2. Project config
    const projectConfigPath = this.getProjectConfigPath();
    if (await fs.pathExists(projectConfigPath)) {
      try {
        const projectContent = await fs.readJson(projectConfigPath);
        mergedConfig = this.deepMerge(mergedConfig, projectContent);
      } catch (err) {
        throw new ConfigurationError(
          `Failed to parse project config at ${projectConfigPath}: ${(err as Error).message}`,
          {
            context: { projectConfigPath },
            suggestion: 'Ensure .devflowrc.json in your project contains valid JSON.',
          },
        );
      }
    }

    // 3. Validate merged config
    const parseResult = DevFlowConfigSchema.safeParse(mergedConfig);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.issues
        .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new ConfigurationError(`Configuration validation failed:\n${errorDetails}`, {
        context: { issues: parseResult.error.issues },
        suggestion: 'Verify the fields in .devflowrc.json conform to the DevFlow schema.',
      });
    }

    return parseResult.data as DevFlowConfig;
  }

  public async writeProjectConfig(config: Partial<DevFlowConfig>): Promise<string> {
    const filePath = this.getProjectConfigPath();
    const parseResult = DevFlowConfigSchema.safeParse(config);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.issues
        .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new ConfigurationError(`Cannot write invalid configuration:\n${errorDetails}`, {
        suggestion: 'Fix configuration validation issues before writing.',
      });
    }

    await fs.writeJson(filePath, parseResult.data, { spaces: 2 });
    return filePath;
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

export const configurationManager = new ConfigurationManager();
