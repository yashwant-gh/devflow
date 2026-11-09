import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { qualityService } from '../../modules/quality-check/quality-service.js';
import { logger } from '../../utils/logger.js';
import { QualityCheckError } from '../../utils/errors.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerCheckCommand(
  program: Command,
  getGlobalOptions: () => GlobalOptions,
): void {
  program
    .command('check')
    .description('Execute unified engineering quality gate checks')
    .option('--only <checks>', 'Run only specified comma-separated checks (e.g. lint,test)')
    .option('--skip <checks>', 'Skip specified comma-separated checks (e.g. audit)')
    .action(async (cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      const only = cmdOptions.only ? cmdOptions.only.split(',') : undefined;
      const skip = cmdOptions.skip ? cmdOptions.skip.split(',') : undefined;

      const spinner = ora({
        text: 'Running engineering quality checks...',
        isSilent: globals.quiet || globals.json || globals.verbose || !process.stdout.isTTY,
      }).start();

      const report = await qualityService.runChecks({
        cwd: globals.cwd,
        only,
        skip,
        json: globals.json,
        verbose: globals.verbose,
      });

      spinner.stop();

      if (globals.json) {
        logger.json(report);
        if (report.overallStatus === 'FAIL') {
          throw new QualityCheckError('Quality checks failed.', {
            context: { failed: report.summary.failed, errors: report.summary.errors },
          });
        }
        return;
      }

      logger.log('');
      logger.log(chalk.bold('DEVFLOW QUALITY REPORT'));
      logger.log(
        chalk.dim(
          `Project: ${chalk.white(report.projectName)} | Duration: ${(report.durationMs / 1000).toFixed(2)}s\n`,
        ),
      );

      const tableData: unknown[][] = [
        [chalk.bold('CHECK'), chalk.bold('STATUS'), chalk.bold('DURATION'), chalk.bold('DETAILS')],
      ];

      for (const check of report.checks) {
        let statusBadge = chalk.green('PASS');
        if (check.status === 'FAIL') statusBadge = chalk.red('FAIL');
        else if (check.status === 'ERROR') statusBadge = chalk.red('ERROR');
        else if (check.status === 'WARNING') statusBadge = chalk.yellow('WARNING');
        else if (check.status === 'SKIPPED') statusBadge = chalk.dim('SKIPPED');

        tableData.push([
          chalk.bold(check.name),
          statusBadge,
          `${(check.durationMs / 1000).toFixed(2)}s`,
          check.error || check.remediation || chalk.dim(check.description),
        ]);
      }

      logger.table(tableData);

      logger.log(
        `Summary: ${chalk.green(`${report.summary.passed} passed`)}, ${chalk.red(`${report.summary.failed} failed`)}, ${chalk.yellow(`${report.summary.warnings} warnings`)}, ${chalk.dim(`${report.summary.skipped} skipped`)}`,
      );
      logger.log('');

      if (report.remediations.length > 0) {
        logger.log(chalk.bold('Actionable Recommendations:'));
        for (const rem of report.remediations) {
          logger.log(`  ${chalk.yellow('→')} ${rem}`);
        }
        logger.log('');
      }

      if (report.overallStatus === 'FAIL') {
        logger.error(chalk.bold('OVERALL QUALITY GATE: FAILED'));
        logger.dim('One or more required quality checks did not pass.\n');
        throw new QualityCheckError('Engineering quality checks failed.', {
          suggestion: 'Resolve the failed checks listed above and re-run "devflow check".',
        });
      } else {
        logger.success(chalk.bold('OVERALL QUALITY GATE: PASSED'));
        logger.log('');
      }
    });
}
