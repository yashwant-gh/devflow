import { Command } from 'commander';
import chalk from 'chalk';
import { projectDetector } from '../../core/project-detector.js';
import { commandRunner } from '../../core/command-runner.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';
import { DependencyError } from '../../utils/errors.js';

export function registerLintCommand(program: Command, getGlobalOptions: () => GlobalOptions): void {
  program
    .command('lint')
    .description('Execute project linter and static code analysis')
    .allowUnknownOption(true)
    .argument('[args...]', 'Optional arguments forwarded to underlying linter')
    .action(async (args: string[] = []) => {
      const globals = getGlobalOptions();
      const projectInfo = await projectDetector.detect();

      logger.info(`Running linter for ${chalk.bold(projectInfo.name)}...`);

      const isNode =
        projectInfo.type === 'node-api' ||
        projectInfo.type === 'node-cli' ||
        !!projectInfo.packageJsonPath;
      const isPython =
        projectInfo.type === 'python-fastapi' ||
        projectInfo.type === 'python-service' ||
        !!projectInfo.pyprojectPath;

      if (isNode) {
        await commandRunner.run('npm', ['run', 'lint', '--', ...args], {
          cwd: globals.cwd,
          dryRun: globals.dryRun,
        });
      } else if (isPython) {
        await commandRunner.run('ruff', ['check', '.', ...args], {
          cwd: globals.cwd,
          dryRun: globals.dryRun,
        });
      } else {
        throw new DependencyError('No linter configured for this project.', {
          suggestion: 'Run "devflow add linting" to set up ESLint or Ruff.',
        });
      }

      logger.success('Linting passed with zero errors.');
    });
}
