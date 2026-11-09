export interface AIExplainRequest {
  target: 'checks' | 'audit' | 'error';
  rawOutput: string;
  context?: Record<string, unknown>;
}

export interface AIExplainResponse {
  summary: string;
  rootCause: string;
  remediationSteps: string[];
  suggestedCommands: string[];
  providerUsed: string;
}

export interface AIProjectExplainRequest {
  projectName: string;
  projectType: string;
  files: string[];
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export interface AIProjectExplainResponse {
  architectureOverview: string;
  majorModules: string[];
  entryPoints: string[];
  recommendations: string[];
  providerUsed: string;
}

export interface AIPRSummaryRequest {
  branch: string;
  baseBranch: string;
  changedFiles: string[];
  diffExcerpt: string;
}

export interface AIPRSummaryResponse {
  markdownSummary: string;
  risksIdentified: string[];
  providerUsed: string;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  isAvailable(): boolean;
  explainFailure(request: AIExplainRequest): Promise<AIExplainResponse>;
  explainProject(request: AIProjectExplainRequest): Promise<AIProjectExplainResponse>;
  generatePRSummary(request: AIPRSummaryRequest): Promise<AIPRSummaryResponse>;
}
