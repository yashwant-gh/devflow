import { Command } from 'commander';
import chalk from 'chalk';
import { cicdService, type CIProfile } from '../../modules/cicd/cicd-service.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerCICommand(program: Command, getGlobalOptions: () => GlobalOptions): void {
  const ciCmd = program
    .command('ci')
    .description('Manage CI/CD pipeline automation workflows (GitHub Actions)')
    .action(async () => {
      ciCmd.help();
    });

  ciCmd
    .command('init')
    .description('Initialize a new CI/CD pipeline workflow')
    .option('-p, --profile <profile>', 'Pipeline profile: basic | standard | strict', 'standard')
    .option('--force', 'Overwrite existing CI workflow', false)
    .action(async (cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      logger.info(`Generating CI pipeline with ${chalk.bold(cmdOptions.profile)} profile...`);

      const result = await cicdService.init({
        cwd: globals.cwd,
        profile: cmdOptions.profile as CIProfile,
        force: cmdOptions.force || globals.yes,
        dryRun: globals.dryRun,
      });

      if (globals.json) {
        logger.json(result);
      } else {
        logger.success(`CI/CD pipeline generated at ${chalk.bold(result.path)}`);
      }
    });

  ciCmd
    .command('validate')
    .description('Validate existing CI/CD workflow syntax and permissions')
    .action(async () => {
      const globals = getGlobalOptions();
      const result = await cicdService.validate(globals.cwd);

      if (globals.json) {
        logger.json(result);
        return;
      }

      logger.log('');
      logger.log(chalk.bold('DEVFLOW CI/CD VALIDATION'));
      logger.log(`  Provider:    ${result.provider}`);
      logger.log(`  Workflow:    ${result.workflowPath || chalk.red('Missing')}`);
      logger.log(`  Valid YAML:  ${result.valid ? chalk.green('Yes') : chalk.red('No')}`);
      logger.log('');

      if (result.warnings.length > 0) {
        for (const w of result.warnings) {
          logger.warn(w);
        }
      }

      if (result.errors.length > 0) {
        for (const e of result.errors) {
          logger.error(e);
        }
        process.exitCode = 1;
      } else {
        logger.success('CI workflow is valid and ready for automation.');
      }
      logger.log('');
    });

  ciCmd
    .command('update')
    .description('Update CI workflow safely to latest profile specification')
    .option('-p, --profile <profile>', 'Pipeline profile: basic | standard | strict', 'standard')
    .action(async (cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      const result = await cicdService.update({
        cwd: globals.cwd,
        profile: cmdOptions.profile as CIProfile,
        dryRun: globals.dryRun,
      });

      if (globals.json) {
        logger.json(result);
      } else if (result.updated) {
        logger.success('CI workflow updated successfully.');
      }
    });
}
