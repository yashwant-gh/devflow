import path from 'node:path';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { templateEngine } from '../../core/template-engine.js';
import { commandRunner } from '../../core/command-runner.js';
import { logger } from '../../utils/logger.js';
import { type GlobalOptions } from '../../types/index.js';

export function registerInitCommand(program: Command, getGlobalOptions: () => GlobalOptions): void {
  program
    .command('init')
    .description('Initialize a new standardized software project from a template')
    .argument('[name]', 'Project name')
    .option(
      '-t, --template <template>',
      'Template identifier (node-express-api, python-fastapi, node-cli)',
    )
    .option('--desc, --description <description>', 'Project description')
    .option('--pm, --package-manager <manager>', 'Package manager (npm, pnpm, yarn, pip)')
    .option('--no-testing', 'Exclude automated testing configuration')
    .option('--no-linting', 'Exclude linting and formatting configuration')
    .option('--no-docker', 'Exclude Docker container configuration')
    .option('--no-compose', 'Exclude Docker Compose configuration')
    .option('--no-ci', 'Exclude CI/CD pipeline configuration')
    .option('--no-git', 'Skip Git initialization')
    .option('--install', 'Install dependencies after generation', false)
    .option('--force', 'Overwrite existing files in target directory', false)
    .action(async (nameArg?: string, cmdOptions: any = {}) => {
      const globals = getGlobalOptions();
      const isInteractive = globals.interactive !== false && process.stdin.isTTY;

      let projectName = nameArg;
      let templateId = cmdOptions.template;
      let description = cmdOptions.description;
      let packageManager = cmdOptions.packageManager;
      let includeTesting = cmdOptions.testing !== false;
      let includeLinting = cmdOptions.linting !== false;
      let includeDocker = cmdOptions.docker !== false;
      let includeCompose = cmdOptions.compose !== false;
      let includeCI = cmdOptions.ci !== false;
      let initGit = cmdOptions.git !== false;
      let installDeps = Boolean(cmdOptions.install);

      if (isInteractive) {
        const availableTemplates = await templateEngine.getAvailableTemplates();

        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            default: projectName || 'my-service',
            when: !projectName,
            validate: (input: string) => {
              if (!input || !/^[a-zA-Z0-9_.-]+$/.test(input)) {
                return 'Name must contain only letters, numbers, dashes, dots, and underscores.';
              }
              return true;
            },
          },
          {
            type: 'list',
            name: 'templateId',
            message: 'Select a project template:',
            choices: availableTemplates.map((t) => ({
              name: `${t.name} (${chalk.dim(t.description)})`,
              value: t.id,
            })),
            default: templateId || 'node-express-api',
            when: !templateId,
          },
          {
            type: 'input',
            name: 'description',
            message: 'Project description:',
            default: (ans: any) => `${ans.projectName || projectName} service`,
            when: !description,
          },
          {
            type: 'confirm',
            name: 'includeDocker',
            message: 'Include Docker & Docker Compose setup?',
            default: true,
            when: cmdOptions.docker === undefined,
          },
          {
            type: 'confirm',
            name: 'includeCI',
            message: 'Generate GitHub Actions CI/CD pipeline?',
            default: true,
            when: cmdOptions.ci === undefined,
          },
          {
            type: 'confirm',
            name: 'initGit',
            message: 'Initialize Git repository?',
            default: true,
            when: cmdOptions.git === undefined,
          },
          {
            type: 'confirm',
            name: 'installDeps',
            message: 'Install dependencies now?',
            default: false,
            when: cmdOptions.install === undefined,
          },
        ]);

        projectName = projectName || answers.projectName;
        templateId = templateId || answers.templateId;
        description = description || answers.description;
        if (answers.includeDocker !== undefined) {
          includeDocker = answers.includeDocker;
          includeCompose = answers.includeDocker;
        }
        if (answers.includeCI !== undefined) includeCI = answers.includeCI;
        if (answers.initGit !== undefined) initGit = answers.initGit;
        if (answers.installDeps !== undefined) installDeps = answers.installDeps;
      }

      if (!projectName) {
        projectName = 'devflow-service';
      }
      if (!templateId) {
        templateId = 'node-express-api';
      }

      const targetDir = path.resolve(globals.cwd || process.cwd(), projectName);
      logger.info(
        `Scaffolding ${chalk.bold(projectName)} with template ${chalk.cyan(templateId)}...`,
      );

      const spinner = ora({
        text: 'Generating project files...',
        isSilent: globals.quiet || globals.json || !process.stdout.isTTY,
      }).start();

      try {
        const result = await templateEngine.scaffold({
          projectName,
          targetDir,
          templateId,
          description,
          packageManager,
          includeTesting,
          includeLinting,
          includeDocker,
          includeCompose,
          includeCI,
          includeDocs: true,
          dryRun: globals.dryRun,
          overwrite: cmdOptions.force || globals.yes,
        });

        spinner.succeed(`Generated ${result.createdCount} files in ${chalk.bold(targetDir)}`);

        // Initialize Git if requested
        if (initGit && !globals.dryRun) {
          try {
            await commandRunner.run('git', ['init'], { cwd: targetDir, allowFailure: true });
            logger.info('Initialized clean Git repository.');
          } catch {
            logger.debug('Git init skipped or unavailable.');
          }
        }

        // Install dependencies if requested
        if (installDeps && !globals.dryRun) {
          const isNode = templateId.startsWith('node');
          const isPython = templateId.startsWith('python');

          const installSpinner = ora({
            text: 'Installing project dependencies...',
            isSilent: globals.quiet || globals.json || !process.stdout.isTTY,
          }).start();

          try {
            if (isNode) {
              await commandRunner.run('npm', ['install'], { cwd: targetDir });
            } else if (isPython) {
              await commandRunner.run('pip', ['install', '-e', '.[dev]'], {
                cwd: targetDir,
                allowFailure: true,
              });
            }
            installSpinner.succeed('Dependencies installed successfully.');
          } catch (err) {
            installSpinner.warn(`Dependency installation warning: ${(err as Error).message}`);
          }
        }

        if (globals.json) {
          logger.json(result);
        } else {
          logger.log('');
          logger.success(chalk.bold(`Project "${projectName}" ready!`));
          logger.log('');
          logger.log('Next steps:');
          logger.log(`  1. ${chalk.cyan(`cd ${projectName}`)}`);
          if (!installDeps) {
            logger.log(
              `  2. ${chalk.cyan(templateId.startsWith('python') ? 'pip install -e .[dev]' : 'npm install')}`,
            );
          }
          logger.log(`  3. ${chalk.cyan('devflow check')} to run quality verification`);
          logger.log(
            `  4. ${chalk.cyan(templateId.startsWith('python') ? 'uvicorn app.main:app --reload' : 'npm run dev')} to start dev server`,
          );
          logger.log('');
        }
      } catch (err) {
        spinner.fail(`Scaffolding failed: ${(err as Error).message}`);
        throw err;
      }
    });
}
