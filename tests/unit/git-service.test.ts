import { describe, it, expect } from 'vitest';
import {
  GitService,
  type PRAnalysisReport,
} from '../../src/modules/git-integration/git-service.js';

describe('Git and Pull Request Assistant Logic', () => {
  it('should format PR summary cleanly with Markdown structure', () => {
    const gitService = new GitService();
    const fakeReport: PRAnalysisReport = {
      isGitRepo: true,
      currentBranch: 'feature/payment-webhook',
      baseBranch: 'main',
      totalChangedFiles: 3,
      totalAdditions: 45,
      totalDeletions: 12,
      changedFiles: [
        {
          path: 'src/routes/payment.ts',
          status: 'M',
          additions: 30,
          deletions: 5,
          isSensitive: false,
          isDependencyManifest: false,
          isCIWorkflow: false,
          isTestFile: false,
        },
        {
          path: 'tests/payment.test.ts',
          status: 'A',
          additions: 15,
          deletions: 0,
          isSensitive: false,
          isDependencyManifest: false,
          isCIWorkflow: false,
          isTestFile: true,
        },
      ],
      sensitiveChanges: [],
      manifestChanges: [],
      workflowChanges: [],
      hasCorrespondingTests: true,
      untestedComponents: [],
      risks: [],
    };

    const summary = gitService.generatePRSummary(fakeReport);
    expect(summary).toContain('# Pull Request Summary');
    expect(summary).toContain('feature/payment-webhook');
    expect(summary).toContain('main');
    expect(summary).toContain('src/routes/payment.ts');
    expect(summary).toContain('Unit/Integration tests updated');
  });

  it('should flag sensitive files and manifest changes as risks', () => {
    const gitService = new GitService();
    const fakeReport: PRAnalysisReport = {
      isGitRepo: true,
      currentBranch: 'fix/env-leak',
      baseBranch: 'main',
      totalChangedFiles: 2,
      totalAdditions: 10,
      totalDeletions: 2,
      changedFiles: [
        {
          path: '.env',
          status: 'M',
          additions: 5,
          deletions: 0,
          isSensitive: true,
          isDependencyManifest: false,
          isCIWorkflow: false,
          isTestFile: false,
        },
      ],
      sensitiveChanges: ['.env'],
      manifestChanges: ['package.json'],
      workflowChanges: [],
      hasCorrespondingTests: false,
      untestedComponents: [],
      risks: [
        'Sensitive configuration files modified: .env',
        'Dependency specifications updated: package.json',
      ],
    };

    const summary = gitService.generatePRSummary(fakeReport);
    expect(summary).toContain('Sensitive configuration files modified');
  });
});
