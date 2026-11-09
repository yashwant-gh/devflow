import {
  type AIProvider,
  type AIExplainRequest,
  type AIExplainResponse,
  type AIProjectExplainRequest,
  type AIProjectExplainResponse,
  type AIPRSummaryRequest,
  type AIPRSummaryResponse,
} from './ai-provider.js';
import { LocalRuleFallbackProvider } from './local-provider.js';
import { logger } from '../../utils/logger.js';

export class OpenAICompatibleProvider implements AIProvider {
  public readonly id = 'openai-compatible';
  public readonly name = 'LLM API Provider';
  private fallback = new LocalRuleFallbackProvider();

  public isAvailable(): boolean {
    return Boolean(process.env.DEVFLOW_AI_API_KEY || process.env.OPENAI_API_KEY);
  }

  public async explainFailure(request: AIExplainRequest): Promise<AIExplainResponse> {
    const apiKey = process.env.DEVFLOW_AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return this.fallback.explainFailure(request);
    }

    const endpoint =
      process.env.DEVFLOW_AI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.DEVFLOW_AI_MODEL || 'gpt-4o-mini';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert DevOps and Software Infrastructure assistant. Respond strictly in JSON format with fields: summary, rootCause, remediationSteps (string array), suggestedCommands (string array).',
            },
            {
              role: 'user',
              content: `Explain the following build/check failure output:\n\n${request.rawOutput.slice(0, 3000)}`,
            },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        logger.debug(
          `AI API error: HTTP ${response.status}. Falling back to deterministic engine.`,
        );
        return this.fallback.explainFailure(request);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());

      return {
        summary: parsed.summary || 'Build error analyzed by AI assistant.',
        rootCause: parsed.rootCause || 'Unspecified failure condition.',
        remediationSteps: parsed.remediationSteps || ['Review logs and resolve error.'],
        suggestedCommands: parsed.suggestedCommands || ['devflow check'],
        providerUsed: `Cloud LLM (${model})`,
      };
    } catch (err) {
      logger.debug(`AI request exception: ${(err as Error).message}. Falling back.`);
      return this.fallback.explainFailure(request);
    }
  }

  public async explainProject(request: AIProjectExplainRequest): Promise<AIProjectExplainResponse> {
    const apiKey = process.env.DEVFLOW_AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return this.fallback.explainProject(request);
    }

    const endpoint =
      process.env.DEVFLOW_AI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.DEVFLOW_AI_MODEL || 'gpt-4o-mini';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert software architect. Respond strictly in JSON format with fields: architectureOverview, majorModules (string array), entryPoints (string array), recommendations (string array).',
            },
            {
              role: 'user',
              content: `Explain the architecture of project "${request.projectName}" (${request.projectType}) given files: ${request.files.slice(0, 50).join(', ')}.`,
            },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        return this.fallback.explainProject(request);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());

      return {
        architectureOverview: parsed.architectureOverview || 'Project architecture analysis.',
        majorModules: parsed.majorModules || request.files.slice(0, 5),
        entryPoints: parsed.entryPoints || [],
        recommendations: parsed.recommendations || [],
        providerUsed: `Cloud LLM (${model})`,
      };
    } catch {
      return this.fallback.explainProject(request);
    }
  }

  public async generatePRSummary(request: AIPRSummaryRequest): Promise<AIPRSummaryResponse> {
    const apiKey = process.env.DEVFLOW_AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return this.fallback.generatePRSummary(request);
    }

    const endpoint =
      process.env.DEVFLOW_AI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.DEVFLOW_AI_MODEL || 'gpt-4o-mini';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert senior code reviewer. Respond strictly in JSON format with fields: markdownSummary (string formatted markdown), risksIdentified (string array).',
            },
            {
              role: 'user',
              content: `Generate PR summary for branch ${request.branch} into ${request.baseBranch} with files: ${request.changedFiles.join(', ')}.\nDiff excerpt: ${request.diffExcerpt.slice(0, 2000)}`,
            },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        return this.fallback.generatePRSummary(request);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());

      return {
        markdownSummary: parsed.markdownSummary || this.fallback.generatePRSummary(request),
        risksIdentified: parsed.risksIdentified || [],
        providerUsed: `Cloud LLM (${model})`,
      };
    } catch {
      return this.fallback.generatePRSummary(request);
    }
  }
}
