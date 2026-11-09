import { Command } from 'commander';
import chalk from 'chalk';
import { projectDetector } from '../../core/project-detector.js';
import { commandRunner } from '../../core/command-runner.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';
import { DependencyError } from '../../utils/errors.js';

export function registerTestCommand(program: Command, getGlobalOptions: () => GlobalOptions): void {
  program
    .command('test')
    .description('Execute automated project test suite')
    .allowUnknownOption(true)
    .argument('[args...]', 'Optional arguments forwarded to underlying test runner')
    .action(async (args: string[] = []) => {
      const globals = getGlobalOptions();
      const projectInfo = await projectDetector.detect();

      logger.info(`Running tests for ${chalk.bold(projectInfo.name)}...`);

      const isNode =
        projectInfo.type === 'node-api' ||
        projectInfo.type === 'node-cli' ||
        !!projectInfo.packageJsonPath;
      const isPython =
        projectInfo.type === 'python-fastapi' ||
        projectInfo.type === 'python-service' ||
        !!projectInfo.pyprojectPath;

      if (isNode) {
        await commandRunner.run('npm', ['test', '--', ...args], {
          cwd: globals.cwd,
          dryRun: globals.dryRun,
        });
      } else if (isPython) {
        await commandRunner.run('pytest', args, {
          cwd: globals.cwd,
          dryRun: globals.dryRun,
        });
      } else {
        throw new DependencyError('No test runner configured for this project.', {
          suggestion: 'Run "devflow add testing" to configure automated testing.',
        });
      }

      logger.success('Test suite executed successfully.');
    });
}
