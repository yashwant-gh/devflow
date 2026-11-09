import { Command } from 'commander';
import chalk from 'chalk';
import { standardsService } from '../../modules/standards/standards-service.js';
import { logger } from '../../utils/logger.js';
import { QualityCheckError } from '../../utils/errors.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerStandardsCommand(
  program: Command,
  getGlobalOptions: () => GlobalOptions,
): void {
  const standardsCmd = program
    .command('standards')
    .description('Define and enforce organizational engineering standards across repositories')
    .action(async () => {
      standardsCmd.help();
    });

  standardsCmd
    .command('init')
    .description('Initialize default .devflowrc.json standards configuration')
    .action(async () => {
      const globals = getGlobalOptions();
      const configPath = await standardsService.initConfig(globals.cwd);
      logger.success(
        `Engineering standards configuration initialized at ${chalk.bold(configPath)}`,
      );
    });

  standardsCmd
    .command('check')
    .description('Validate current repository against active engineering standards rules')
    .action(async () => {
      const globals = getGlobalOptions();
      const report = await standardsService.check(globals.cwd);

      if (globals.json) {
        logger.json(report);
        if (!report.passed) {
          throw new QualityCheckError('Repository failed active engineering standards rules.');
        }
        return;
      }

      logger.log('');
      logger.log(chalk.bold('DEVFLOW ENGINEERING STANDARDS COMPLIANCE'));
      logger.log(chalk.dim(`Repository: ${chalk.white(report.project)}\n`));

      const tableData: unknown[][] = [
        [chalk.bold('RULE'), chalk.bold('STATUS'), chalk.bold('SEVERITY'), chalk.bold('DETAILS')],
      ];

      for (const res of report.results) {
        const statusBadge = res.passed
          ? chalk.green('COMPLIANT')
          : res.severity === 'error'
            ? chalk.red('NON-COMPLIANT')
            : chalk.yellow('WARNING');

        tableData.push([
          chalk.bold(res.name),
          statusBadge,
          res.severity.toUpperCase(),
          res.message,
        ]);
      }

      logger.table(tableData);

      logger.log(
        `Results: ${chalk.green(`${report.passedCount} passed`)}, ${chalk.red(`${report.failedCount} violations`)}, ${chalk.yellow(`${report.warningCount} warnings`)}`,
      );
      logger.log('');

      if (!report.passed) {
        logger.error(chalk.bold('STANDARDS CHECK: FAILED'));
        logger.log(
          chalk.dim('Run "devflow standards explain" to view detailed remediation guidance.\n'),
        );
        throw new QualityCheckError(
          'Repository violates mandatory organizational engineering standards.',
        );
      } else {
        logger.success(chalk.bold('STANDARDS CHECK: PASSED'));
        logger.log('');
      }
    });

  standardsCmd
    .command('explain')
    .description('Explain why standards rules exist and how to remediate violations')
    .argument('[ruleId]', 'Optional rule ID to explain')
    .action(async (ruleId?: string) => {
      const explanations = standardsService.explain(ruleId);

      logger.log('');
      logger.log(chalk.bold('DEVFLOW ENGINEERING STANDARDS REFERENCE'));
      logger.log('');

      for (const rule of explanations) {
        logger.log(chalk.cyan.bold(`Rule: ${rule.name} (${rule.id})`));
        logger.log(`  ${chalk.bold('Description:')} ${rule.description}`);
        logger.log(`  ${chalk.bold('Rationale:')}   ${rule.rationale}`);
        logger.log(`  ${chalk.bold('Remedy:')}      ${chalk.yellow(rule.remediation)}`);
        logger.log('');
      }
    });
}
