import { Command } from 'commander';
import { type GlobalOptions } from '../types/index.js';
import { registerInitCommand } from './commands/init.command.js';
import { registerTemplatesCommand } from './commands/templates.command.js';
import { registerAddCommand } from './commands/add.command.js';
import { registerCheckCommand } from './commands/check.command.js';
import { registerTestCommand } from './commands/test.command.js';
import { registerLintCommand } from './commands/lint.command.js';
import { registerAuditCommand } from './commands/audit.command.js';
import { registerDockerCommand } from './commands/docker.command.js';
import { registerCICommand } from './commands/ci.command.js';
import { registerDoctorCommand } from './commands/doctor.command.js';
import { registerDocsCommand } from './commands/docs.command.js';
import { registerStandardsCommand } from './commands/standards.command.js';
import { registerPRCommand } from './commands/pr.command.js';
import { registerAICommand } from './commands/ai.command.js';
import { registerConfigCommand } from './commands/config.command.js';
import { registerHealthCommand } from './commands/health.command.js';

export function registerAllCommands(program: Command, getGlobalOptions: () => GlobalOptions): void {
  // Project Management
  registerInitCommand(program, getGlobalOptions);
  registerTemplatesCommand(program, getGlobalOptions);

  // Development Automation
  registerAddCommand(program, getGlobalOptions);
  registerCheckCommand(program, getGlobalOptions);
  registerTestCommand(program, getGlobalOptions);
  registerLintCommand(program, getGlobalOptions);
  registerAuditCommand(program, getGlobalOptions);

  // Infrastructure
  registerDockerCommand(program, getGlobalOptions);
  registerCICommand(program, getGlobalOptions);

  // Developer Experience
  registerDoctorCommand(program, getGlobalOptions);
  registerDocsCommand(program, getGlobalOptions);
  registerStandardsCommand(program, getGlobalOptions);
  registerPRCommand(program, getGlobalOptions);
  registerAICommand(program, getGlobalOptions);

  // System & Health
  registerConfigCommand(program, getGlobalOptions);
  registerHealthCommand(program, getGlobalOptions);
}
