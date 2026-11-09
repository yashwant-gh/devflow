import { Command } from 'commander';
import chalk from 'chalk';
import { addService } from '../../modules/configuration/add-service.js';
import { dockerService } from '../../modules/docker/docker-service.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';
import { ValidationError } from '../../utils/errors.js';

export function registerAddCommand(program: Command, getGlobalOptions: () => GlobalOptions): void {
  program
    .command('add')
    .description(
      'Add tools or configurations to an existing project (testing, linting, formatting, docker)',
    )
    .argument('<feature>', 'Feature to configure: testing | linting | formatting | docker')
    .option('--force', 'Overwrite existing configurations', false)
    .option('--postgres', 'Include PostgreSQL service (for docker)', false)
    .option('--redis', 'Include Redis service (for docker)', false)
    .action(async (feature: string, cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      const normalizedFeature = feature.toLowerCase().trim();

      const validFeatures = ['testing', 'linting', 'formatting', 'docker'];
      if (!validFeatures.includes(normalizedFeature)) {
        throw new ValidationError(
          `Unknown feature "${feature}". Supported features: ${validFeatures.join(', ')}`,
          {
            suggestion: `Run "devflow add <${validFeatures.join('|')}>".`,
          },
        );
      }

      logger.info(`Configuring ${chalk.bold(normalizedFeature)} in project...`);

      if (normalizedFeature === 'docker') {
        const results = await dockerService.generate({
          cwd: globals.cwd,
          dryRun: globals.dryRun,
          overwrite: cmdOptions.force || globals.yes,
          includeCompose: true,
          includePostgres: cmdOptions.postgres,
          includeRedis: cmdOptions.redis,
        });

        if (globals.json) {
          logger.json(results);
        } else {
          logger.success(chalk.bold(`Docker configurations added successfully:`));
          for (const r of results) {
            logger.log(`  ${chalk.cyan(r.action.padEnd(8))} ${r.path}`);
          }
        }
        return;
      }

      const results = await addService.addFeature(
        normalizedFeature as 'testing' | 'linting' | 'formatting',
        {
          cwd: globals.cwd,
          dryRun: globals.dryRun,
          overwrite: cmdOptions.force || globals.yes,
        },
      );

      if (globals.json) {
        logger.json(results);
      } else {
        logger.success(chalk.bold(`Feature "${normalizedFeature}" configured successfully:`));
        for (const r of results) {
          logger.log(`  ${chalk.cyan(r.action.padEnd(8))} ${r.path}`);
        }
      }
    });
}
