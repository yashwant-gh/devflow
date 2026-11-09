#!/usr/bin/env node
import { Command } from 'commander';
import { registerGreetCommand } from './commands/greet.command.js';

const program = new Command();

program.name('{{projectName}}').description('{{description}}').version('1.0.0');

registerGreetCommand(program);

program.parse(process.argv);
