import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { healthService } from '../../modules/quality-check/health-service.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerHealthCommand(
  program: Command,
  getGlobalOptions: () => GlobalOptions,
): void {
  program
    .command('health')
    .description(
      'Run comprehensive project health assessment across quality, security, and standards',
    )
    .action(async () => {
      const globals = getGlobalOptions();

      const spinner = ora({
        text: 'Evaluating full project engineering health...',
        isSilent: globals.quiet || globals.json || !process.stdout.isTTY,
      }).start();

      const report = await healthService.assess(globals.cwd);
      spinner.stop();

      if (globals.json) {
        logger.json(report);
        return;
      }

      logger.log('');
      logger.log(chalk.bold('DEVFLOW PROJECT HEALTH ASSESSMENT'));
      logger.log(
        `Project: ${chalk.bold(report.project)} | Health Score: ${report.score >= 80 ? chalk.green.bold(`${report.score}%`) : report.score >= 50 ? chalk.yellow.bold(`${report.score}%`) : chalk.red.bold(`${report.score}%`)}\n`,
      );

      const tableData: unknown[][] = [
        [chalk.bold('PILLAR'), chalk.bold('STATUS'), chalk.bold('SCORE / DETAILS')],
        [
          'Code Quality Gate',
          report.quality.overallStatus === 'PASS' ? chalk.green('PASS') : chalk.red('FAIL'),
          `${report.quality.summary.passed}/${report.quality.summary.total} checks passed`,
        ],
        [
          'Security Policy',
          report.security.policyPassed ? chalk.green('COMPLIANT') : chalk.red('VIOLATION'),
          `${report.security.vulnerabilities.length} vulnerabilities detected`,
        ],
        [
          'Standards Compliance',
          report.standards.passed ? chalk.green('COMPLIANT') : chalk.red('NON-COMPLIANT'),
          `${report.standards.passedCount}/${report.standards.totalRules} rules passed`,
        ],
        [
          'Environment Diagnostics',
          report.diagnostics.overallHealthy ? chalk.green('READY') : chalk.yellow('WARNINGS'),
          `${report.diagnostics.recommendations.length} action item(s)`,
        ],
      ];

      logger.table(tableData);

      if (report.healthy) {
        logger.success(chalk.bold('PROJECT HEALTH: PRODUCTION READY'));
      } else {
        logger.error(chalk.bold('PROJECT HEALTH: ACTION REQUIRED'));
        logger.dim('Review itemized reports with "devflow check" and "devflow audit".');
      }
      logger.log('');
    });
}
