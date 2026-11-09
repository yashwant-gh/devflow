import { configurationManager } from '../../core/configuration-manager.js';
import { projectDetector } from '../../core/project-detector.js';
import {
  type StandardRule,
  RequireReadmeRule,
  RequireTestsRule,
  RequireDockerRule,
  RequireCICDRule,
  RequireEnvExampleRule,
  RequireGitignoreRule,
  RequireTypeCheckingRule,
} from './rules.js';
import { type StandardsReport, type StandardRuleResult } from '../../types/index.js';

export class StandardsService {
  private rules: Map<string, StandardRule> = new Map();

  constructor() {
    this.registerRule(new RequireReadmeRule());
    this.registerRule(new RequireTestsRule());
    this.registerRule(new RequireDockerRule());
    this.registerRule(new RequireCICDRule());
    this.registerRule(new RequireEnvExampleRule());
    this.registerRule(new RequireGitignoreRule());
    this.registerRule(new RequireTypeCheckingRule());
  }

  public registerRule(rule: StandardRule): void {
    this.rules.set(rule.id, rule);
  }

  public getRules(): StandardRule[] {
    return Array.from(this.rules.values());
  }

  public async initConfig(cwd?: string): Promise<string> {
    const root = cwd || process.cwd();
    configurationManager.setProjectRoot(root);
    const projectInfo = await projectDetector.detect();

    return await configurationManager.writeProjectConfig({
      version: 1,
      project: {
        name: projectInfo.name,
        type: projectInfo.type,
      },
      standards: {
        requireReadme: true,
        requireTests: true,
        requireDocker: projectInfo.hasDocker,
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
    });
  }

  public async check(cwd?: string): Promise<StandardsReport> {
    const root = cwd || process.cwd();
    configurationManager.setProjectRoot(root);
    projectDetector.setProjectRoot(root);

    const config = await configurationManager.loadConfig();
    const projectInfo = await projectDetector.detect();

    const ruleContext = {
      root,
      projectInfo,
      config,
    };

    const results: StandardRuleResult[] = [];
    const standards = config.standards || {};

    for (const rule of this.rules.values()) {
      // Check if rule is enabled in config
      let enabled = true;
      if (rule.id === 'require-readme' && standards.requireReadme === false) enabled = false;
      if (rule.id === 'require-tests' && standards.requireTests === false) enabled = false;
      if (rule.id === 'require-docker' && standards.requireDocker === false) enabled = false;
      if (rule.id === 'require-cicd' && standards.requireCICD === false) enabled = false;
      if (rule.id === 'require-env-example' && standards.requireEnvExample === false)
        enabled = false;
      if (rule.id === 'require-gitignore' && standards.requireGitignore === false) enabled = false;
      if (rule.id === 'require-typechecking' && standards.requireTypeChecking === false)
        enabled = false;

      if (!enabled) {
        continue;
      }

      try {
        const result = await rule.evaluate(ruleContext);
        results.push(result);
      } catch (err) {
        results.push({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          passed: false,
          severity: 'error',
          message: `Evaluation failed: ${(err as Error).message}`,
          remediation: rule.remediation,
        });
      }
    }

    const failedCount = results.filter((r) => !r.passed && r.severity === 'error').length;
    const warningCount = results.filter((r) => !r.passed && r.severity === 'warning').length;
    const passedCount = results.filter((r) => r.passed).length;

    return {
      project: projectInfo.name,
      passed: failedCount === 0,
      totalRules: results.length,
      passedCount,
      failedCount,
      warningCount,
      results,
    };
  }

  public explain(
    ruleId?: string,
  ): { id: string; name: string; description: string; rationale: string; remediation: string }[] {
    const list: {
      id: string;
      name: string;
      description: string;
      rationale: string;
      remediation: string;
    }[] = [];
    for (const rule of this.rules.values()) {
      if (!ruleId || rule.id.toLowerCase() === ruleId.toLowerCase()) {
        list.push({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          rationale: rule.rationale,
          remediation: rule.remediation,
        });
      }
    }
    return list;
  }
}

export const standardsService = new StandardsService();
