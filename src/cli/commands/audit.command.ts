import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { auditService } from '../../modules/dependency-audit/audit-service.js';
import { logger } from '../../utils/logger.js';
import { SecurityAuditError } from '../../utils/errors.js';
import { type GlobalOptions, type SeverityLevel } from '../../types/index.js';

export function registerAuditCommand(
  program: Command,
  getGlobalOptions: () => GlobalOptions,
): void {
  program
    .command('audit')
    .description('Analyze project dependencies for security vulnerabilities and outdated versions')
    .option(
      '-s, --severity <level>',
      'Minimum severity level to report/fail (low, moderate, high, critical)',
    )
    .option('--fix', 'Automatically apply compatible security fixes where possible', false)
    .action(async (cmdOptions: any = {}) => {
      const globals = getGlobalOptions();

      const spinner = ora({
        text: 'Analyzing project dependencies and security advisories...',
        isSilent: globals.quiet || globals.json || !process.stdout.isTTY,
      }).start();

      const report = await auditService.audit({
        cwd: globals.cwd,
        severity: cmdOptions.severity as SeverityLevel,
        fix: cmdOptions.fix,
        yes: globals.yes,
        dryRun: globals.dryRun,
      });

      spinner.stop();

      if (globals.json) {
        logger.json(report);
        if (report.auditStatus === 'network_error') {
          logger.warn(chalk.bold('NETWORK NOTICE:'));
          logger.warn(report.recommendation);
          logger.log('');
          return;
        }

        if (!report.policyPassed) {
          throw new SecurityAuditError('Security audit failed according to configured policy.', {
            context: { failedSeverities: report.failedSeverityLevels },
          });
        }
        return;
      }

      logger.log('');
      logger.log(chalk.bold('DEVFLOW SECURITY AUDIT'));
      logger.log(
        chalk.dim(`Project: ${chalk.white(report.project)} | Ecosystem: ${report.ecosystem}\n`),
      );

      logger.log(chalk.bold('Dependency Summary:'));
      logger.log(`  Total dependencies:     ${report.dependencySummary.total}`);
      logger.log(`  Direct dependencies:    ${report.dependencySummary.direct}`);
      logger.log(`  Dev dependencies:       ${report.dependencySummary.dev}`);
      logger.log(`  Outdated packages:      ${report.dependencySummary.outdated}`);
      logger.log(
        `  Vulnerabilities:        ${report.vulnerabilities.length > 0 ? chalk.red(report.vulnerabilities.length) : chalk.green('0')}`,
      );
      logger.log('');

      if (report.vulnerabilities.length > 0) {
        logger.log(chalk.bold('FINDINGS'));

        const tableData: unknown[][] = [
          [
            chalk.bold('PACKAGE'),
            chalk.bold('TYPE'),
            chalk.bold('SEVERITY'),
            chalk.bold('INSTALLED'),
            chalk.bold('FIXED VERSION'),
            chalk.bold('REMEDIATION'),
          ],
        ];

        for (const v of report.vulnerabilities) {
          let sevColor = chalk.cyan(v.severity.toUpperCase());
          if (v.severity === 'high') sevColor = chalk.red.bold('HIGH');
          if (v.severity === 'critical') sevColor = chalk.bgRed.white.bold('CRITICAL');
          if (v.severity === 'moderate') sevColor = chalk.yellow('MODERATE');

          const depType = v.isDirect ? chalk.blue('Direct') : chalk.dim('Transitive');

          tableData.push([
            chalk.bold(v.package),
            depType,
            sevColor,
            v.installedVersion,
            v.fixedVersion || chalk.dim('None available'),
            v.remediation || v.title,
          ]);
        }

        logger.table(tableData);
      }

      if (report.outdated.length > 0) {
        logger.log(chalk.bold(`Outdated Dependencies (${report.outdated.length}):`));
        const outdatedTable: unknown[][] = [
          [
            chalk.bold('PACKAGE'),
            chalk.bold('CURRENT'),
            chalk.bold('WANTED'),
            chalk.bold('LATEST'),
          ],
        ];
        for (const o of report.outdated.slice(0, 10)) {
          outdatedTable.push([
            chalk.bold(o.package),
            o.current,
            chalk.green(o.wanted),
            chalk.cyan(o.latest),
          ]);
        }
        logger.table(outdatedTable);
        if (report.outdated.length > 10) {
          logger.dim(`... and ${report.outdated.length - 10} more outdated packages.`);
        }
        logger.log('');
      }

      if (report.auditStatus === 'network_error') {
        logger.warn(chalk.bold('NETWORK NOTICE:'));
        logger.warn(report.recommendation);
        logger.log('');
        return;
      }

      if (!report.policyPassed) {
        logger.error(chalk.bold('FINAL RESULT:'));
        logger.error(`Security policy: FAILED`);
        logger.log(`Reason: ${report.recommendation}\n`);
        throw new SecurityAuditError('Security audit failed according to configured policy.', {
          suggestion: 'Update vulnerable packages or run "devflow audit --fix".',
        });
      } else {
        logger.success(chalk.bold('FINAL RESULT:'));
        logger.success(`Security policy: PASSED`);
        logger.log(`Notice: ${report.recommendation}\n`);
      }
    });
}
