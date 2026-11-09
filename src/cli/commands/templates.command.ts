import { Command } from 'commander';
import chalk from 'chalk';
import { templateEngine } from '../../core/template-engine.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerTemplatesCommand(
  program: Command,
  getGlobalOptions: () => GlobalOptions,
): void {
  program
    .command('templates')
    .description('List all available project scaffolding templates and capabilities')
    .action(async () => {
      const globals = getGlobalOptions();
      const templates = await templateEngine.getAvailableTemplates();

      if (globals.json) {
        logger.json(templates);
        return;
      }

      logger.log('');
      logger.log(chalk.bold('AVAILABLE DEVFLOW PROJECT TEMPLATES'));
      logger.log(chalk.dim('Use "devflow init <name> --template <id>" to create a project.\n'));

      const tableData: unknown[][] = [
        [
          chalk.bold('TEMPLATE ID'),
          chalk.bold('NAME'),
          chalk.bold('LANG'),
          chalk.bold('DESCRIPTION'),
        ],
      ];

      for (const t of templates) {
        tableData.push([chalk.cyan(t.id), chalk.bold(t.name), t.language, t.description]);
      }

      logger.table(tableData);
      logger.log('');
    });
}
