import { describe, it, expect } from 'vitest';

describe('Greet Command Logic', () => {
  it('should format greeting correctly', () => {
    const formatGreeting = (name: string, uppercase?: boolean) => {
      const msg = `Hello, ${name}! Welcome to {{projectName}}.`;
      return uppercase ? msg.toUpperCase() : msg;
    };

    expect(formatGreeting('Alice')).toBe('Hello, Alice! Welcome to {{projectName}}.');
    expect(formatGreeting('Bob', true)).toBe('HELLO, BOB! WELCOME TO {{PROJECTNAME}}.');
  });
});
