import { Command } from 'commander';
import chalk from 'chalk';
import { aiService } from '../../modules/ai-assistant/ai-service.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerAICommand(program: Command, getGlobalOptions: () => GlobalOptions): void {
  const aiCmd = program
    .command('ai')
    .description('Optional AI developer assistance and failure explanation (privacy-preserving)')
    .action(async () => {
      aiCmd.help();
    });

  aiCmd
    .command('explain')
    .description('Analyze error logs or check failure output and provide root causes and remedies')
    .argument('[text...]', 'Failure text or error logs to analyze')
    .option(
      '--consent',
      'Explicit consent to send diagnostic text to configured external LLM provider',
      false,
    )
    .action(async (textParts: string[] = [], cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      const inputText =
        textParts.join(' ') || 'General project check failure or test assertion error';

      const consent = Boolean(cmdOptions.consent || globals.yes);
      const analysis = await aiService.explainFailure(inputText, { consentGiven: consent });

      if (globals.json) {
        logger.json(analysis);
        return;
      }

      logger.log('');
      logger.log(chalk.bold('DEVFLOW FAILURE EXPLANATION'));
      logger.log(chalk.dim(`Engine: ${analysis.providerUsed}\n`));

      logger.log(`${chalk.bold('Summary:')}     ${analysis.summary}`);
      logger.log(`${chalk.bold('Root Cause:')}  ${analysis.rootCause}`);
      logger.log('');

      logger.log(chalk.bold('Remediation Steps:'));
      for (const step of analysis.remediationSteps) {
        logger.log(`  ${chalk.cyan('•')} ${step}`);
      }
      logger.log('');

      if (analysis.suggestedCommands.length > 0) {
        logger.log(chalk.bold('Suggested Commands:'));
        for (const cmd of analysis.suggestedCommands) {
          logger.log(`  ${chalk.yellow('$')} ${cmd}`);
        }
        logger.log('');
      }
    });

  aiCmd
    .command('explain-project')
    .description('Provide an architectural overview of detected project modules and entry points')
    .option('--consent', 'Explicit consent to send metadata to external LLM provider', false)
    .action(async (cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      const consent = Boolean(cmdOptions.consent || globals.yes);
      const explanation = await aiService.explainProject({
        cwd: globals.cwd,
        consentGiven: consent,
      });

      if (globals.json) {
        logger.json(explanation);
        return;
      }

      logger.log('');
      logger.log(chalk.bold('DEVFLOW ARCHITECTURE OVERVIEW'));
      logger.log(chalk.dim(`Engine: ${explanation.providerUsed}\n`));

      logger.log(explanation.architectureOverview);
      logger.log('');

      if (explanation.entryPoints.length > 0) {
        logger.log(chalk.bold('Detected Entry Points:'));
        for (const ep of explanation.entryPoints) {
          logger.log(`  ${chalk.cyan('→')} ${ep}`);
        }
        logger.log('');
      }

      if (explanation.majorModules.length > 0) {
        logger.log(chalk.bold('Key Modules:'));
        for (const mod of explanation.majorModules) {
          logger.log(`  ${chalk.cyan('•')} ${mod}`);
        }
        logger.log('');
      }

      if (explanation.recommendations.length > 0) {
        logger.log(chalk.bold('Architecture Recommendations:'));
        for (const rec of explanation.recommendations) {
          logger.log(`  ${chalk.yellow('✓')} ${rec}`);
        }
        logger.log('');
      }
    });

  aiCmd
    .command('pr-summary')
    .description('Generate AI-enhanced Pull Request summary from local Git changes')
    .option(
      '--consent',
      'Explicit consent to send Git diff excerpt to external LLM provider',
      false,
    )
    .action(async (cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      const consent = Boolean(cmdOptions.consent || globals.yes);
      const res = await aiService.generatePRSummary({ cwd: globals.cwd, consentGiven: consent });

      if (globals.json) {
        logger.json(res);
      } else {
        logger.log('');
        logger.log(res.markdownSummary);
        if (res.risksIdentified.length > 0) {
          logger.log(chalk.bold('Risks Highlighted:'));
          for (const risk of res.risksIdentified) {
            logger.log(`  ${chalk.yellow('⚠')} ${risk}`);
          }
          logger.log('');
        }
      }
    });
}
