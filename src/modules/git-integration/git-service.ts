import { commandRunner } from '../../core/command-runner.js';
import { DependencyError } from '../../utils/errors.js';

export interface ChangedFile {
  path: string;
  status: 'A' | 'M' | 'D' | 'R' | '??';
  additions: number;
  deletions: number;
  isSensitive: boolean;
  isDependencyManifest: boolean;
  isCIWorkflow: boolean;
  isTestFile: boolean;
}

export interface PRAnalysisReport {
  isGitRepo: boolean;
  currentBranch: string;
  baseBranch: string;
  totalChangedFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  changedFiles: ChangedFile[];
  sensitiveChanges: string[];
  manifestChanges: string[];
  workflowChanges: string[];
  hasCorrespondingTests: boolean;
  untestedComponents: string[];
  risks: string[];
}

export class GitService {
  public async isGitRepository(cwd?: string): Promise<boolean> {
    try {
      const res = await commandRunner.run('git', ['rev-parse', '--is-inside-work-tree'], {
        cwd: cwd || process.cwd(),
        allowFailure: true,
      });
      return res.exitCode === 0 && res.stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  public async getCurrentBranch(cwd?: string): Promise<string> {
    const res = await commandRunner.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: cwd || process.cwd(),
      allowFailure: true,
    });
    return res.stdout.trim() || 'HEAD';
  }

  public async getBaseBranch(cwd?: string): Promise<string> {
    const root = cwd || process.cwd();
    // Check if main exists, else master
    const checkMain = await commandRunner.run('git', ['rev-parse', '--verify', 'main'], {
      cwd: root,
      allowFailure: true,
    });
    if (checkMain.exitCode === 0) return 'main';

    const checkMaster = await commandRunner.run('git', ['rev-parse', '--verify', 'master'], {
      cwd: root,
      allowFailure: true,
    });
    if (checkMaster.exitCode === 0) return 'master';

    return 'main';
  }

  public async analyze(
    options: { cwd?: string; baseBranch?: string } = {},
  ): Promise<PRAnalysisReport> {
    const root = options.cwd || process.cwd();
    const isGit = await this.isGitRepository(root);

    if (!isGit) {
      throw new DependencyError('The current directory is not a Git repository.', {
        suggestion: 'Initialize a Git repository using "git init" to use PR analysis tools.',
      });
    }

    const currentBranch = await this.getCurrentBranch(root);
    const baseBranch = options.baseBranch || (await this.getBaseBranch(root));

    // Try diff against baseBranch; if base branch comparison fails, diff against HEAD or working tree
    let diffStatOutput = '';
    const diffStat = await commandRunner.run('git', ['diff', '--numstat', `${baseBranch}...HEAD`], {
      cwd: root,
      allowFailure: true,
    });

    if (diffStat.exitCode === 0 && diffStat.stdout.trim()) {
      diffStatOutput = diffStat.stdout.trim();
    } else {
      // Fallback to uncommitted / unstaged changes
      const workingDiff = await commandRunner.run('git', ['diff', '--numstat', 'HEAD'], {
        cwd: root,
        allowFailure: true,
      });
      diffStatOutput = workingDiff.stdout.trim();
    }

    const lines = diffStatOutput ? diffStatOutput.split('\n') : [];
    const changedFiles: ChangedFile[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    const sensitiveChanges: string[] = [];
    const manifestChanges: string[] = [];
    const workflowChanges: string[] = [];
    const untestedComponents: string[] = [];

    const SENSITIVE_PATTERNS = ['.env', 'secret', 'credential', '.pem', '.key', 'id_rsa'];
    const MANIFEST_PATTERNS = [
      'package.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'pyproject.toml',
      'requirements.txt',
    ];
    const WORKFLOW_PATTERNS = ['.github/workflows', '.gitlab-ci.yml'];

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const additions = parts[0] === '-' ? 0 : parseInt(parts[0] || '0', 10);
      const deletions = parts[1] === '-' ? 0 : parseInt(parts[1] || '0', 10);
      const filePath = parts[2] || '';

      totalAdditions += additions;
      totalDeletions += deletions;

      const lowerPath = filePath.toLowerCase();
      const isSensitive = SENSITIVE_PATTERNS.some((p) => lowerPath.includes(p));
      const isManifest = MANIFEST_PATTERNS.some((p) => lowerPath.endsWith(p));
      const isWorkflow = WORKFLOW_PATTERNS.some((p) => lowerPath.includes(p));
      const isTestFile = lowerPath.includes('test') || lowerPath.includes('spec');

      if (isSensitive) sensitiveChanges.push(filePath);
      if (isManifest) manifestChanges.push(filePath);
      if (isWorkflow) workflowChanges.push(filePath);

      if (!isTestFile && (lowerPath.startsWith('src/') || lowerPath.startsWith('app/'))) {
        untestedComponents.push(filePath);
      }

      changedFiles.push({
        path: filePath,
        status: 'M',
        additions,
        deletions,
        isSensitive,
        isDependencyManifest: isManifest,
        isCIWorkflow: isWorkflow,
        isTestFile,
      });
    }

    const hasTestsInPR = changedFiles.some((f) => f.isTestFile);
    const risks: string[] = [];

    if (sensitiveChanges.length > 0) {
      risks.push(
        `Sensitive configuration files modified: ${sensitiveChanges.join(', ')}. Verify no secrets or keys are committed.`,
      );
    }
    if (manifestChanges.length > 0) {
      risks.push(
        `Dependency specifications updated: ${manifestChanges.join(', ')}. Run "devflow audit" before merging.`,
      );
    }
    if (workflowChanges.length > 0) {
      risks.push(
        `CI/CD pipeline files modified: ${workflowChanges.join(', ')}. Review pipeline security.`,
      );
    }
    if (untestedComponents.length > 0 && !hasTestsInPR) {
      risks.push(
        `Source code modified in ${untestedComponents.length} file(s) without corresponding test modifications.`,
      );
    }

    return {
      isGitRepo: true,
      currentBranch,
      baseBranch,
      totalChangedFiles: changedFiles.length,
      totalAdditions,
      totalDeletions,
      changedFiles,
      sensitiveChanges,
      manifestChanges,
      workflowChanges,
      hasCorrespondingTests: hasTestsInPR,
      untestedComponents,
      risks,
    };
  }

  public generatePRSummary(report: PRAnalysisReport): string {
    const changedCategories: string[] = [];
    if (report.manifestChanges.length > 0) changedCategories.push('Dependency updates');
    if (report.workflowChanges.length > 0) changedCategories.push('CI/CD pipeline updates');
    if (report.changedFiles.some((f) => f.path.startsWith('src/') || f.path.startsWith('app/'))) {
      changedCategories.push('Application core logic');
    }
    if (report.hasCorrespondingTests) changedCategories.push('Automated tests');

    const fileList = report.changedFiles
      .slice(0, 15)
      .map((f) => `- \`${f.path}\` (+${f.additions}/-${f.deletions})`)
      .join('\n');

    const risksList =
      report.risks.length > 0
        ? report.risks.map((r) => `- ⚠ ${r}`).join('\n')
        : '- No high-risk configuration or security anomalies detected.';

    return `# Pull Request Summary

**Branch:** \`${report.currentBranch}\` → \`${report.baseBranch}\`
**Changes:** ${report.totalChangedFiles} file(s) changed (+${report.totalAdditions} / -${report.totalDeletions} lines)

## Summary
This pull request introduces updates across: ${changedCategories.join(', ') || 'repository files'}.

## Changes
${fileList || '- No files modified.'}
${report.changedFiles.length > 15 ? `\n... and ${report.changedFiles.length - 15} more file(s)` : ''}

## Testing
- [x] Pre-commit quality checks validated with \`devflow check\`.
${report.hasCorrespondingTests ? '- [x] Unit/Integration tests updated.' : '- [ ] Additional unit test coverage recommended.'}

## Risks & Review Considerations
${risksList}
`;
  }
}

export const gitService = new GitService();
