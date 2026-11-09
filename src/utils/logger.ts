import chalk from 'chalk';
import { table, getBorderCharacters } from 'table';
import { BANNER, PRODUCT_NAME, PRODUCT_TAGLINE, PRODUCT_VERSION } from './constants.js';

export interface LoggerOptions {
  quiet?: boolean;
  verbose?: boolean;
  json?: boolean;
}

export class Logger {
  private quiet = false;
  private verbose = false;
  private jsonMode = false;

  constructor(options: LoggerOptions = {}) {
    this.setOptions(options);
  }

  public setOptions(options: LoggerOptions) {
    if (options.quiet !== undefined) this.quiet = options.quiet;
    if (options.verbose !== undefined) this.verbose = options.verbose;
    if (options.json !== undefined) this.jsonMode = options.json;
  }

  public isQuiet(): boolean {
    return this.quiet;
  }

  public isVerbose(): boolean {
    return this.verbose;
  }

  public isJson(): boolean {
    return this.jsonMode;
  }

  public banner(): void {
    if (this.quiet || this.jsonMode) return;
    console.log(chalk.cyan.bold(BANNER));
    console.log(
      chalk.bold(`  ${PRODUCT_NAME} v${PRODUCT_VERSION}`) + chalk.dim(` — ${PRODUCT_TAGLINE}`),
    );
    console.log('');
  }

  public info(message: string): void {
    if (this.quiet || this.jsonMode) return;
    console.log(`${chalk.blue('ℹ')} ${message}`);
  }

  public success(message: string): void {
    if (this.quiet || this.jsonMode) return;
    console.log(`${chalk.green('✓')} ${message}`);
  }

  public warn(message: string): void {
    if (this.quiet || this.jsonMode) return;
    console.log(`${chalk.yellow('⚠')} ${chalk.yellow(message)}`);
  }

  public error(message: string): void {
    if (this.jsonMode) return;
    console.error(`${chalk.red('✗')} ${chalk.red(message)}`);
  }

  public debug(message: string): void {
    if (!this.verbose || this.jsonMode) return;
    console.log(`${chalk.magenta('⚙ [debug]')} ${chalk.dim(message)}`);
  }

  public log(message: string): void {
    if (this.quiet || this.jsonMode) return;
    console.log(message);
  }

  public dim(message: string): void {
    if (this.quiet || this.jsonMode) return;
    console.log(chalk.dim(message));
  }

  public step(step: number, total: number, message: string): void {
    if (this.quiet || this.jsonMode) return;
    console.log(`${chalk.cyan(`[${step}/${total}]`)} ${chalk.bold(message)}`);
  }

  public table(data: unknown[][]): void {
    if (this.quiet || this.jsonMode) return;
    const formatted = table(data as any, {
      border: getBorderCharacters('norc'),
      drawHorizontalLine: (lineIndex, rowCount) =>
        lineIndex === 0 || lineIndex === 1 || lineIndex === rowCount,
    });
    console.log(formatted);
  }

  public json(data: unknown): void {
    console.log(JSON.stringify(data, null, 2));
  }

  public sanitize(text: string): string {
    return text
      .replace(/([a-zA-Z0-9_-]{20,})(:[a-zA-Z0-9_-]+)?@/g, '***@')
      .replace(/(npm_[a-zA-Z0-9]{36})/g, 'npm_***')
      .replace(/(ghp_[a-zA-Z0-9]{36})/g, 'ghp_***')
      .replace(/(Bearer\s+)[a-zA-Z0-9._-]+/gi, '$1***')
      .replace(/(token|password|secret|key)=([^&\s]+)/gi, '$1=***');
  }
}

export const logger = new Logger();
