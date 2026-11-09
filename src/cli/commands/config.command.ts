import { Command } from 'commander';
import chalk from 'chalk';
import { configurationManager } from '../../core/configuration-manager.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerConfigCommand(
  program: Command,
  getGlobalOptions: () => GlobalOptions,
): void {
  const configCmd = program
    .command('config')
    .description('Manage project and user level DevFlow configurations')
    .action(async () => {
      configCmd.help();
    });

  configCmd
    .command('show')
    .description('Display resolved configuration hierarchy')
    .action(async () => {
      const globals = getGlobalOptions();
      configurationManager.setProjectRoot(globals.cwd || process.cwd());
      const config = await configurationManager.loadConfig(globals);

      if (globals.json) {
        logger.json(config);
      } else {
        logger.log('');
        logger.log(chalk.bold('DEVFLOW RESOLVED CONFIGURATION'));
        logger.log(`  Project Config:  ${configurationManager.getProjectConfigPath()}`);
        logger.log(`  User Config:     ${configurationManager.getUserConfigPath()}`);
        logger.log('');
        logger.log(JSON.stringify(config, null, 2));
        logger.log('');
      }
    });

  configCmd
    .command('validate')
    .description('Validate syntax and schema of active .devflowrc.json')
    .action(async () => {
      const globals = getGlobalOptions();
      configurationManager.setProjectRoot(globals.cwd || process.cwd());
      await configurationManager.loadConfig(globals);
      logger.success('Configuration schema is valid.');
    });

  configCmd
    .command('init')
    .description('Initialize default project-level .devflowrc.json')
    .action(async () => {
      const globals = getGlobalOptions();
      configurationManager.setProjectRoot(globals.cwd || process.cwd());
      const pathWritten = await configurationManager.writeProjectConfig({});
      logger.success(`Initialized configuration at ${chalk.bold(pathWritten)}`);
    });
}
