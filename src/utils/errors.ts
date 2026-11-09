import { ExitCode } from '../types/index.js';

export interface ErrorOptions {
  code?: string;
  exitCode?: ExitCode;
  context?: Record<string, unknown> | string;
  suggestion?: string;
  cause?: Error;
}

export class DevFlowError extends Error {
  public readonly code: string;
  public readonly exitCode: ExitCode;
  public readonly context?: Record<string, unknown> | string;
  public readonly suggestion?: string;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message);
    this.name = 'DevFlowError';
    this.code = options.code || 'DEVFLOW_GENERAL_ERROR';
    this.exitCode = options.exitCode ?? ExitCode.GENERAL_FAILURE;
    this.context = options.context;
    this.suggestion = options.suggestion;
    if (options.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DevFlowError {
  constructor(message: string, options: Omit<ErrorOptions, 'exitCode'> = {}) {
    super(message, {
      ...options,
      code: options.code || 'ERR_VALIDATION',
      exitCode: ExitCode.INVALID_ARGUMENTS,
    });
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends DevFlowError {
  constructor(message: string, options: Omit<ErrorOptions, 'exitCode'> = {}) {
    super(message, {
      ...options,
      code: options.code || 'ERR_CONFIGURATION',
      exitCode: ExitCode.INVALID_ARGUMENTS,
    });
    this.name = 'ConfigurationError';
  }
}

export class FilesystemError extends DevFlowError {
  constructor(message: string, options: Omit<ErrorOptions, 'exitCode'> = {}) {
    super(message, {
      ...options,
      code: options.code || 'ERR_FILESYSTEM',
      exitCode: ExitCode.GENERAL_FAILURE,
    });
    this.name = 'FilesystemError';
  }
}

export class ProcessExecutionError extends DevFlowError {
  public readonly stdout?: string;
  public readonly stderr?: string;
  public readonly processExitCode?: number;

  constructor(
    message: string,
    options: Omit<ErrorOptions, 'exitCode'> & {
      stdout?: string;
      stderr?: string;
      processExitCode?: number;
    } = {},
  ) {
    super(message, {
      ...options,
      code: options.code || 'ERR_PROCESS_EXECUTION',
      exitCode: ExitCode.GENERAL_FAILURE,
    });
    this.name = 'ProcessExecutionError';
    this.stdout = options.stdout;
    this.stderr = options.stderr;
    this.processExitCode = options.processExitCode;
  }
}

export class DependencyError extends DevFlowError {
  constructor(message: string, options: Omit<ErrorOptions, 'exitCode'> = {}) {
    super(message, {
      ...options,
      code: options.code || 'ERR_DEPENDENCY',
      exitCode: ExitCode.MISSING_DEPENDENCY,
    });
    this.name = 'DependencyError';
  }
}

export class QualityCheckError extends DevFlowError {
  constructor(message: string, options: Omit<ErrorOptions, 'exitCode'> = {}) {
    super(message, {
      ...options,
      code: options.code || 'ERR_QUALITY_CHECKS_FAILED',
      exitCode: ExitCode.QUALITY_CHECKS_FAILED,
    });
    this.name = 'QualityCheckError';
  }
}

export class SecurityAuditError extends DevFlowError {
  constructor(message: string, options: Omit<ErrorOptions, 'exitCode'> = {}) {
    super(message, {
      ...options,
      code: options.code || 'ERR_SECURITY_AUDIT_FAILED',
      exitCode: ExitCode.SECURITY_AUDIT_FAILED,
    });
    this.name = 'SecurityAuditError';
  }
}

export class TemplateError extends DevFlowError {
  constructor(message: string, options: Omit<ErrorOptions, 'exitCode'> = {}) {
    super(message, {
      ...options,
      code: options.code || 'ERR_TEMPLATE',
      exitCode: ExitCode.GENERAL_FAILURE,
    });
    this.name = 'TemplateError';
  }
}

export class NetworkError extends DevFlowError {
  constructor(message: string, options: Omit<ErrorOptions, 'exitCode'> = {}) {
    super(message, {
      ...options,
      code: options.code || 'ERR_NETWORK',
      exitCode: ExitCode.GENERAL_FAILURE,
    });
    this.name = 'NetworkError';
  }
}

export class UserInterruptedError extends DevFlowError {
  constructor(
    message = 'Operation interrupted by user.',
    options: Omit<ErrorOptions, 'exitCode'> = {},
  ) {
    super(message, {
      ...options,
      code: options.code || 'ERR_INTERRUPTED',
      exitCode: ExitCode.USER_INTERRUPTED,
    });
    this.name = 'UserInterruptedError';
  }
}
