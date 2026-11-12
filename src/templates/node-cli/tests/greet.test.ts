import { describe, it, expect } from 'vitest';
import { formatGreeting } from '../src/commands/greet.command.js';

describe('Greet Command Logic', () => {
  it('should format greeting correctly', () => {
    const normalGreeting = formatGreeting('Bob');

    expect(formatGreeting('Alice')).toMatch(/^Hello, Alice! Welcome to .+\.$/);

    expect(formatGreeting('Bob', true)).toBe(normalGreeting.toUpperCase());
  });
});
