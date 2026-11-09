import {
  type AIProvider,
  type AIExplainRequest,
  type AIExplainResponse,
  type AIProjectExplainRequest,
  type AIProjectExplainResponse,
  type AIPRSummaryRequest,
  type AIPRSummaryResponse,
} from './ai-provider.js';

export class LocalRuleFallbackProvider implements AIProvider {
  public readonly id = 'local-rule-engine';
  public readonly name = 'Local Deterministic Knowledge Engine';

  public isAvailable(): boolean {
    return true; // Always available offline without network or API key
  }

  public async explainFailure(request: AIExplainRequest): Promise<AIExplainResponse> {
    const output = request.rawOutput.toLowerCase();
    const remediationSteps: string[] = [];
    const suggestedCommands: string[] = [];
    let rootCause = 'Detected build or test assertion failure.';
    let summary = 'A quality check or security operation exited with non-zero status.';

    if (output.includes('eslint') || output.includes('lint') || output.includes('prettier')) {
      summary = 'Linter static analysis detected code style or syntax issues.';
      rootCause = 'Files violate configured ESLint rules or formatting constraints.';
      remediationSteps.push('Review ESLint violation lines and fix reported errors.');
      remediationSteps.push('Run automatic fixer to fix safe formatting and syntax issues.');
      suggestedCommands.push('npm run lint:fix');
    } else if (
      output.includes('typeerror') ||
      output.includes('tsc') ||
      output.includes('typescript') ||
      /ts\d{4}/.test(output) ||
      output.includes('not assignable to')
    ) {
      summary = 'TypeScript type checking identified type mismatches.';
      rootCause = 'Incompatible types, missing null checks, or incorrect interface declarations.';
      remediationSteps.push('Check the reported file and line numbers.');
      remediationSteps.push('Ensure exported types match parameter specifications.');
      suggestedCommands.push('npx tsc --noEmit');
    } else if (
      output.includes('vulnerab') ||
      output.includes('audit') ||
      output.includes('cve-') ||
      request.target === 'audit'
    ) {
      summary = 'Security audit discovered vulnerable package versions.';
      rootCause = 'Dependencies have published CVE vulnerabilities matching your security policy.';
      remediationSteps.push('Inspect vulnerability advisory links.');
      remediationSteps.push('Update packages to non-vulnerable versions.');
      suggestedCommands.push('devflow audit --fix');
    } else if (output.includes('test') || output.includes('failed') || output.includes('assert')) {
      summary = 'Automated unit or integration tests failed.';
      rootCause = 'Assertion mismatch between expected and actual test results.';
      remediationSteps.push('Run tests in verbose or watch mode to inspect failure stack.');
      remediationSteps.push('Verify recent logic changes against test assertions.');
      suggestedCommands.push('npm test -- --watch');
    }

    return {
      summary,
      rootCause,
      remediationSteps:
        remediationSteps.length > 0 ? remediationSteps : ['Review error logs above.'],
      suggestedCommands:
        suggestedCommands.length > 0 ? suggestedCommands : ['devflow check --verbose'],
      providerUsed: this.name,
    };
  }

  public async explainProject(request: AIProjectExplainRequest): Promise<AIProjectExplainResponse> {
    const isApi = request.projectType.includes('api');
    const isCli = request.projectType.includes('cli');

    const majorModules: string[] = [];
    const entryPoints: string[] = [];

    for (const file of request.files) {
      if (file.includes('server') || file.includes('app') || file.includes('main')) {
        entryPoints.push(file);
      }
      if (file.includes('controller') || file.includes('route') || file.includes('service')) {
        majorModules.push(file);
      }
    }

    const architectureOverview = isApi
      ? `Project "${request.projectName}" is a RESTful API service structured into controllers, services, middleware, and routes.`
      : isCli
        ? `Project "${request.projectName}" is a command-line interface tool structured around modular subcommands.`
        : `Project "${request.projectName}" is a modular application built with standard engineering conventions.`;

    return {
      architectureOverview,
      majorModules: majorModules.slice(0, 10),
      entryPoints,
      recommendations: [
        'Maintain strict separation of concerns between business logic and transport layers.',
        'Run "devflow standards check" to ensure repository follows team policies.',
        'Ensure continuous integration workflows run tests and security audits on pull requests.',
      ],
      providerUsed: this.name,
    };
  }

  public async generatePRSummary(request: AIPRSummaryRequest): Promise<AIPRSummaryResponse> {
    const markdown = `# Pull Request Summary

**Branch:** \`${request.branch}\` → \`${request.baseBranch}\`
**Modified Files:** ${request.changedFiles.length}

## Changes
${request.changedFiles.map((f) => `- \`${f}\``).join('\n')}

## Verification
- Code quality verified with \`devflow check\`.
`;

    return {
      markdownSummary: markdown,
      risksIdentified: ['Verify test suite passes before merging to base branch.'],
      providerUsed: this.name,
    };
  }
}
