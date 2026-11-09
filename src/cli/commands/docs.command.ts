import { Command } from 'commander';
import chalk from 'chalk';
import { docsService } from '../../modules/documentation/docs-service.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerDocsCommand(program: Command, getGlobalOptions: () => GlobalOptions): void {
  const docsCmd = program
    .command('docs')
    .description('Generate and maintain project documentation')
    .action(async () => {
      docsCmd.help();
    });

  docsCmd
    .command('generate')
    .description('Generate or update standardized README.md documentation with managed sections')
    .option('--force', 'Overwrite existing README even if unmanaged markers are absent', false)
    .action(async (cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      logger.info('Analyzing project architecture and building documentation...');

      const result = await docsService.generate({
        cwd: globals.cwd,
        dryRun: globals.dryRun,
        force: cmdOptions.force || globals.yes,
      });

      if (globals.json) {
        logger.json(result);
      } else {
        logger.success(`Documentation written to ${chalk.bold(result.path)}`);
      }
    });
}
