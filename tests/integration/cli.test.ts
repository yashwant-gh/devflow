import { describe, it, expect } from 'vitest';
import { createProgram } from '../../src/cli/program.js';

describe('CLI Commands Integration', () => {
  it('should initialize Commander program with expected metadata and commands', () => {
    const program = createProgram();
    expect(program.name()).toBe('devflow');
    expect(program.version()).toBe('1.0.1');

    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('init');
    expect(commandNames).toContain('templates');
    expect(commandNames).toContain('add');
    expect(commandNames).toContain('check');
    expect(commandNames).toContain('test');
    expect(commandNames).toContain('lint');
    expect(commandNames).toContain('audit');
    expect(commandNames).toContain('docker');
    expect(commandNames).toContain('ci');
    expect(commandNames).toContain('doctor');
    expect(commandNames).toContain('docs');
    expect(commandNames).toContain('standards');
    expect(commandNames).toContain('pr');
    expect(commandNames).toContain('ai');
    expect(commandNames).toContain('config');
    expect(commandNames).toContain('health');
  });

  it('should register global options', () => {
    const program = createProgram();
    const optionFlags = program.options.map((o) => o.flags);
    expect(optionFlags.some((f) => f.includes('--verbose'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--quiet'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--json'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--dry-run'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--yes'))).toBe(true);
    expect(optionFlags.some((f) => f.includes('--cwd'))).toBe(true);
  });
});
