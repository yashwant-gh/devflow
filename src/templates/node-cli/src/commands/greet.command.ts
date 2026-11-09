import { Command } from 'commander';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';

export function registerGreetCommand(program: Command): void {
  program
    .command('greet')
    .description('Greet a user or team with style')
    .argument('[name]', 'Name of person or team to greet', 'Developer')
    .option('-u, --uppercase', 'Display greeting in uppercase')
    .action((name: string, options: { uppercase?: boolean }) => {
      let message = `Hello, ${name}! Welcome to {{projectName}}.`;
      if (options.uppercase) {
        message = message.toUpperCase();
      }
      logger.success(chalk.bold(message));
    });
}
