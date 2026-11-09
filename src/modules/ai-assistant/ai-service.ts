import fg from 'fast-glob';
import fs from 'fs-extra';
import {
  type AIProvider,
  type AIExplainResponse,
  type AIProjectExplainResponse,
  type AIPRSummaryResponse,
} from '../../providers/ai/ai-provider.js';
import { LocalRuleFallbackProvider } from '../../providers/ai/local-provider.js';
import { OpenAICompatibleProvider } from '../../providers/ai/openai-provider.js';
import { projectDetector } from '../../core/project-detector.js';
import { gitService } from '../git-integration/git-service.js';
import { logger } from '../../utils/logger.js';

export interface AIServiceOptions {
  cwd?: string;
  consentGiven?: boolean;
}

export class AIService {
  private localProvider = new LocalRuleFallbackProvider();
  private openAIProvider = new OpenAICompatibleProvider();

  private getProvider(consentGiven?: boolean): AIProvider {
    if (consentGiven && this.openAIProvider.isAvailable()) {
      return this.openAIProvider;
    }
    return this.localProvider;
  }

  public async explainFailure(
    rawOutput: string,
    options: AIServiceOptions = {},
  ): Promise<AIExplainResponse> {
    const provider = this.getProvider(options.consentGiven);
    if (!options.consentGiven && this.openAIProvider.isAvailable()) {
      logger.info(
        'External AI provider is configured, but explicit consent was not given. Using local offline knowledge engine.',
      );
    }
    return await provider.explainFailure({
      target: 'checks',
      rawOutput,
    });
  }

  public async explainProject(options: AIServiceOptions = {}): Promise<AIProjectExplainResponse> {
    const root = options.cwd || process.cwd();
    const projectInfo = await projectDetector.detect(root);

    const files = await fg('**/*', {
      cwd: root,
      ignore: ['node_modules/**', 'dist/**', '.git/**', '.venv/**'],
      onlyFiles: true,
    });

    let dependencies: Record<string, string> = {};
    let scripts: Record<string, string> = {};

    if (projectInfo.packageJsonPath && (await fs.pathExists(projectInfo.packageJsonPath))) {
      try {
        const pkg = await fs.readJson(projectInfo.packageJsonPath);
        dependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        scripts = pkg.scripts || {};
      } catch {
        // Ignored
      }
    }

    const provider = this.getProvider(options.consentGiven);
    return await provider.explainProject({
      projectName: projectInfo.name,
      projectType: projectInfo.type,
      files,
      dependencies,
      scripts,
    });
  }

  public async generatePRSummary(options: AIServiceOptions = {}): Promise<AIPRSummaryResponse> {
    const root = options.cwd || process.cwd();
    const prReport = await gitService.analyze({ cwd: root });

    const provider = this.getProvider(options.consentGiven);
    return await provider.generatePRSummary({
      branch: prReport.currentBranch,
      baseBranch: prReport.baseBranch,
      changedFiles: prReport.changedFiles.map((f) => f.path),
      diffExcerpt: prReport.changedFiles
        .map((f) => `${f.path} (+${f.additions}/-${f.deletions})`)
        .join('\n'),
    });
  }
}

export const aiService = new AIService();
