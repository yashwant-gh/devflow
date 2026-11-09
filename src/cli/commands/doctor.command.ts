import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { doctorService } from '../../modules/diagnostics/doctor-service.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerDoctorCommand(
  program: Command,
  getGlobalOptions: () => GlobalOptions,
): void {
  program
    .command('doctor')
    .description('Diagnose development environment tools, dependencies, and project readiness')
    .action(async () => {
      const globals = getGlobalOptions();

      const spinner = ora({
        text: 'Inspecting developer environment and system tools...',
        isSilent: globals.quiet || globals.json || !process.stdout.isTTY,
      }).start();

      const report = await doctorService.diagnose(globals.cwd);
      spinner.stop();

      if (globals.json) {
        logger.json(report);
        return;
      }

      logger.log('');
      logger.log(chalk.bold('DEVFLOW DOCTOR'));
      logger.log(chalk.dim(`Diagnostic timestamp: ${report.timestamp}\n`));

      // SYSTEM
      logger.log(chalk.bold('SYSTEM'));
      for (const item of report.system) {
        logger.log(`  ${chalk.white(item.name.padEnd(24))} ${chalk.dim(item.details || '')}`);
      }
      logger.log('');

      // TOOLS
      logger.log(chalk.bold('TOOLS'));
      for (const item of report.tools) {
        let statusBadge = chalk.green('Installed');
        if (item.status === 'Missing') {
          statusBadge = item.required ? chalk.red('Missing') : chalk.yellow('Missing (Optional)');
        } else if (item.status === 'Unavailable') {
          statusBadge = chalk.dim('Unavailable');
        }
        const versionStr = item.version ? chalk.dim(`(v${item.version})`) : '';
        logger.log(`  ${chalk.white(item.name.padEnd(24))} ${statusBadge} ${versionStr}`);
      }
      logger.log('');

      // PROJECT
      logger.log(chalk.bold('PROJECT'));
      for (const item of report.project) {
        let statusStr = item.status ? chalk.green(item.status) : '';
        if (item.status === 'Missing') statusStr = chalk.yellow('Missing');
        const detailStr = item.details ? chalk.cyan(item.details) : '';
        logger.log(`  ${chalk.white(item.name.padEnd(24))} ${detailStr || statusStr}`);
      }
      logger.log('');

      // RECOMMENDATIONS
      if (report.recommendations.length > 0) {
        logger.log(chalk.bold('RECOMMENDATIONS'));
        for (const rec of report.recommendations) {
          logger.log(`  ${chalk.yellow('→')} ${rec}`);
        }
        logger.log('');
      } else {
        logger.success('No issues detected. Development environment is fully healthy!');
        logger.log('');
      }
    });
}
