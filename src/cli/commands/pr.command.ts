import { Command } from 'commander';
import chalk from 'chalk';
import { gitService } from '../../modules/git-integration/git-service.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerPRCommand(program: Command, getGlobalOptions: () => GlobalOptions): void {
  const prCmd = program
    .command('pr')
    .description('Git change intelligence and pull request assistant')
    .action(async () => {
      prCmd.help();
    });

  prCmd
    .command('analyze')
    .description('Analyze Git working tree changes, test alignment, and security risks')
    .option('-b, --base <branch>', 'Base comparison branch (e.g. main, master)')
    .action(async (cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      const report = await gitService.analyze({ cwd: globals.cwd, baseBranch: cmdOptions.base });

      if (globals.json) {
        logger.json(report);
        return;
      }

      logger.log('');
      logger.log(chalk.bold('DEVFLOW PULL REQUEST ANALYSIS'));
      logger.log(`  Working Branch:      ${chalk.cyan(report.currentBranch)}`);
      logger.log(`  Base Branch:         ${chalk.cyan(report.baseBranch)}`);
      logger.log(`  Files Changed:       ${report.totalChangedFiles}`);
      logger.log(
        `  Line Changes:        ${chalk.green(`+${report.totalAdditions}`)} / ${chalk.red(`-${report.totalDeletions}`)}`,
      );
      logger.log(
        `  Test Changes Added:  ${report.hasCorrespondingTests ? chalk.green('Yes') : chalk.yellow('No test files modified')}`,
      );
      logger.log('');

      if (report.risks.length > 0) {
        logger.log(chalk.bold('Risk Indicators:'));
        for (const risk of report.risks) {
          logger.log(`  ${chalk.yellow('⚠')} ${risk}`);
        }
        logger.log('');
      } else {
        logger.success('No critical change anomalies detected.');
        logger.log('');
      }
    });

  prCmd
    .command('summary')
    .description('Generate structured Pull Request markdown summary from Git changes')
    .option('-b, --base <branch>', 'Base comparison branch (e.g. main, master)')
    .action(async (cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      const report = await gitService.analyze({ cwd: globals.cwd, baseBranch: cmdOptions.base });
      const summaryMarkdown = gitService.generatePRSummary(report);

      if (globals.json) {
        logger.json({ summary: summaryMarkdown, report });
      } else {
        logger.log('');
        logger.log(summaryMarkdown);
      }
    });
}
