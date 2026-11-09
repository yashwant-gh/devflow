import { describe, it, expect } from 'vitest';
import { LocalRuleFallbackProvider } from '../../src/providers/ai/local-provider.js';
import { AIService } from '../../src/modules/ai-assistant/ai-service.js';

describe('AI Provider Abstraction and Offline Knowledge Engine', () => {
  it('LocalRuleFallbackProvider should be available offline without API key', () => {
    const provider = new LocalRuleFallbackProvider();
    expect(provider.isAvailable()).toBe(true);
  });

  it('should explain lint failures with appropriate remediation commands', async () => {
    const provider = new LocalRuleFallbackProvider();
    const explanation = await provider.explainFailure({
      target: 'checks',
      rawOutput: 'ESLint error: 14 problems found. Quotes must be singlequote.',
    });

    expect(explanation.summary).toContain('Linter');
    expect(explanation.suggestedCommands).toContain('npm run lint:fix');
    expect(explanation.providerUsed).toBe('Local Deterministic Knowledge Engine');
  });

  it('should explain typescript typecheck errors', async () => {
    const provider = new LocalRuleFallbackProvider();
    const explanation = await provider.explainFailure({
      target: 'checks',
      rawOutput: 'error TS2322: Type "string" is not assignable to type "number".',
    });

    expect(explanation.summary).toContain('TypeScript');
    expect(explanation.suggestedCommands).toContain('npx tsc --noEmit');
  });

  it('should explain security vulnerability audit findings', async () => {
    const provider = new LocalRuleFallbackProvider();
    const explanation = await provider.explainFailure({
      target: 'audit',
      rawOutput: 'Found 2 high severity vulnerabilities in tar package.',
    });

    expect(explanation.summary).toContain('Security');
    expect(explanation.suggestedCommands).toContain('devflow audit --fix');
  });

  it('AIService should safely use local fallback when no external consent is provided', async () => {
    const service = new AIService();
    const res = await service.explainFailure('npm test failed', { consentGiven: false });
    expect(res.providerUsed).toBe('Local Deterministic Knowledge Engine');
  });
});
