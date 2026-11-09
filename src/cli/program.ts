import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { PRODUCT_NAME, PRODUCT_VERSION, PRODUCT_TAGLINE, BANNER } from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import { DevFlowError } from '../utils/errors.js';
import { ExitCode, type GlobalOptions } from '../types/index.js';
import { registerAllCommands } from './register-commands.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('devflow')
    .description(`${chalk.bold(PRODUCT_NAME)} - ${PRODUCT_TAGLINE}`)
    .version(PRODUCT_VERSION, '-v, --version', 'Output the current version of DevFlow')
    .option('--verbose', 'Output detailed debugging logs and execution timing', false)
    .option('--quiet', 'Suppress non-essential terminal outputs and banners', false)
    .option('--json', 'Output machine-readable JSON for CI/CD and automation', false)
    .option('--no-interactive', 'Disable interactive terminal prompts', false)
    .option('-y, --yes', 'Automatically confirm prompts with default answers', false)
    .option(
      '--dry-run',
      'Simulate actions and report planned file modifications without making changes',
      false,
    )
    .option('--cwd <path>', 'Explicit working directory path for command execution')
    .helpOption('-h, --help', 'Display command-line help information');

  const getGlobalOptions = (): GlobalOptions => {
    const opts = program.opts();
    const explicitCwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();

    const globals: GlobalOptions = {
      verbose: Boolean(opts.verbose),
      quiet: Boolean(opts.quiet),
      json: Boolean(opts.json),
      interactive: opts.interactive !== false,
      yes: Boolean(opts.yes),
      dryRun: Boolean(opts.dryRun),
      cwd: explicitCwd,
    };

    logger.setOptions({
      quiet: globals.quiet,
      verbose: globals.verbose,
      json: globals.json,
    });

    return globals;
  };

  registerAllCommands(program, getGlobalOptions);

  // Custom help formatter with categorized layout
  program.addHelpText('before', () => {
    return (
      chalk.cyan(BANNER) +
      `  ${chalk.bold(PRODUCT_NAME)} v${PRODUCT_VERSION} — ${PRODUCT_TAGLINE}\n`
    );
  });

  program.addHelpText('after', () => {
    return `
${chalk.bold('COMMAND CATEGORIES:')}

  ${chalk.bold.yellow('PROJECT MANAGEMENT')}
    init        Create standardized software project from a template
    templates   List all available project scaffolding templates

  ${chalk.bold.yellow('DEVELOPMENT AUTOMATION')}
    add         Add configurations (testing, linting, formatting, docker)
    check       Execute unified engineering quality gate checks
    test        Run automated test suites with project runner
    lint        Run project static analysis and linting
    audit       Analyze dependency vulnerabilities and outdated packages

  ${chalk.bold.yellow('INFRASTRUCTURE')}
    docker      Manage and validate Docker & Docker Compose setup
    ci          Generate, validate, and update CI/CD pipelines

  ${chalk.bold.yellow('DEVELOPER EXPERIENCE')}
    doctor      Diagnose developer environment, tools, and project readiness
    docs        Generate and maintain standardized README documentation
    standards   Validate repositories against organizational engineering standards
    pr          Analyze Git changes and generate Pull Request summaries
    ai          Explain failed checks and inspect project architecture (offline/safe)

  ${chalk.bold.yellow('SYSTEM')}
    config      Inspect and validate configuration hierarchy
    health      Assess overarching engineering health score

${chalk.bold('EXAMPLES:')}
  $ ${chalk.cyan('devflow init payment-service --template node-express-api')}
  $ ${chalk.cyan('devflow check --verbose')}
  $ ${chalk.cyan('devflow audit --severity high')}
  $ ${chalk.cyan('devflow doctor')}
  $ ${chalk.cyan('devflow docs generate --force')}
  $ ${chalk.cyan('devflow pr summary')}
  $ ${chalk.cyan('devflow standards check')}

${chalk.dim('Documentation: https://github.com/devflow-cli/devflow')}
`;
  });

  return program;
}

export async function runCLI(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();

  try {
    // If no arguments passed, display help with banner
    if (argv.length <= 2) {
      program.outputHelp();
      return;
    }

    await program.parseAsync(argv);
  } catch (err: unknown) {
    if (err instanceof DevFlowError) {
      logger.error(err.message);
      if (err.suggestion) {
        logger.log(`  ${chalk.yellow('💡 Suggestion:')} ${err.suggestion}`);
      }
      if (program.opts().verbose && err.stack) {
        logger.dim(`\nStack Trace:\n${err.stack}`);
      }
      process.exit(err.exitCode);
    }

    const genericError = err as Error;
    logger.error(`Unexpected Error: ${genericError.message}`);
    if (program.opts().verbose && genericError.stack) {
      logger.dim(`\nStack Trace:\n${genericError.stack}`);
    }
    process.exit(ExitCode.GENERAL_FAILURE);
  }
}
