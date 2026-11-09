#!/usr/bin/env node
import { runCLI } from './program.js';

runCLI().catch((err) => {
  console.error('Fatal CLI execution error:', err);
  process.exit(1);
});
