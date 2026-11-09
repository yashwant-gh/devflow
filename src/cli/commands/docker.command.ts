import { Command } from 'commander';
import chalk from 'chalk';
import { dockerService } from '../../modules/docker/docker-service.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerDockerCommand(
  program: Command,
  getGlobalOptions: () => GlobalOptions,
): void {
  const dockerCmd = program
    .command('docker')
    .description('Manage, generate, validate, and build Docker container configurations')
    .action(async () => {
      dockerCmd.help();
    });

  dockerCmd
    .command('validate')
    .description('Validate Dockerfile and Docker Compose configurations')
    .action(async () => {
      const globals = getGlobalOptions();
      const result = await dockerService.validate(globals.cwd);

      if (globals.json) {
        logger.json(result);
        if (!result.valid) {
          process.exitCode = 1;
        }
        return;
      }

      logger.log('');
      logger.log(chalk.bold('DEVFLOW DOCKER VALIDATION'));
      logger.log(
        `  Dockerfile:        ${result.hasDockerfile ? chalk.green('Present') : chalk.red('Missing')}`,
      );
      logger.log(
        `  Docker Compose:    ${result.hasCompose ? chalk.green('Present') : chalk.dim('Not configured')}`,
      );
      logger.log(
        `  Docker CLI:        ${result.dockerInstalled ? chalk.green('Installed') : chalk.yellow('Not installed')}`,
      );
      logger.log(
        `  Docker Daemon:     ${
          result.daemonRunning
            ? chalk.green('Running')
            : result.dockerInstalled
              ? chalk.yellow('Stopped (Docker Desktop not active)')
              : chalk.dim('Unavailable')
        }`,
      );
      logger.log('');

      if (result.output) {
        logger.info(result.output);
      }

      if (result.warnings.length > 0) {
        for (const warn of result.warnings) {
          logger.warn(warn);
        }
      }

      if (!result.valid) {
        logger.error(`Validation Failed: ${result.error}`);
        process.exitCode = 1;
      } else {
        logger.success('Docker configuration validation passed.');
      }
      logger.log('');
    });

  dockerCmd
    .command('init')
    .description('Generate production Dockerfile and Docker Compose configurations')
    .option('--postgres', 'Include PostgreSQL database service in compose', false)
    .option('--redis', 'Include Redis cache service in compose', false)
    .option('--port <number>', 'Application exposed port', (val) => parseInt(val, 10))
    .option('--force', 'Overwrite existing Docker configurations', false)
    .action(async (cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      const results = await dockerService.generate({
        cwd: globals.cwd,
        dryRun: globals.dryRun,
        overwrite: cmdOptions.force || globals.yes,
        includeCompose: true,
        includePostgres: cmdOptions.postgres,
        includeRedis: cmdOptions.redis,
        port: cmdOptions.port,
      });

      if (globals.json) {
        logger.json(results);
      } else {
        logger.success(chalk.bold('Docker configurations generated successfully:'));
        for (const r of results) {
          logger.log(`  ${chalk.cyan(r.action.padEnd(8))} ${r.path}`);
        }
      }
    });

  dockerCmd
    .command('build [tag]')
    .description('Build container image using Dockerfile (requires active Docker daemon)')
    .action(async (tag?: string) => {
      const globals = getGlobalOptions();
      const imageTag = tag || 'devflow-app:latest';

      logger.info(`Building Docker image "${chalk.bold(imageTag)}"...`);
      const result = await dockerService.buildImage({
        tag: imageTag,
        cwd: globals.cwd,
        dryRun: globals.dryRun,
      });

      if (globals.json) {
        logger.json(result);
        if (!result.success) process.exitCode = 1;
        return;
      }

      if (result.success) {
        if (result.output) logger.log(result.output);
        logger.success(`Successfully built Docker image: ${chalk.bold(result.tag)}`);
      } else {
        logger.error(`Docker Image Build Failed:`);
        logger.error(result.error || 'Unknown build failure');
        process.exitCode = 1;
      }
    });
}
