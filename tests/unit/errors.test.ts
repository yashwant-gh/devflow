import { describe, it, expect } from 'vitest';
import {
  DevFlowError,
  ValidationError,
  ConfigurationError,
  FilesystemError,
  ProcessExecutionError,
  DependencyError,
  QualityCheckError,
  SecurityAuditError,
  TemplateError,
  NetworkError,
  UserInterruptedError,
} from '../../src/utils/errors.js';
import { ExitCode } from '../../src/types/index.js';

describe('Error Hierarchy and Exit Codes', () => {
  it('DevFlowError base class should have correct defaults', () => {
    const err = new DevFlowError('Base error');
    expect(err.name).toBe('DevFlowError');
    expect(err.message).toBe('Base error');
    expect(err.code).toBe('DEVFLOW_GENERAL_ERROR');
    expect(err.exitCode).toBe(ExitCode.GENERAL_FAILURE);
  });

  it('ValidationError should map to INVALID_ARGUMENTS (exit code 2)', () => {
    const err = new ValidationError('Invalid argument supplied', {
      suggestion: 'Check input flags',
    });
    expect(err.name).toBe('ValidationError');
    expect(err.exitCode).toBe(ExitCode.INVALID_ARGUMENTS);
    expect(err.code).toBe('ERR_VALIDATION');
    expect(err.suggestion).toBe('Check input flags');
  });

  it('ConfigurationError should map to INVALID_ARGUMENTS (exit code 2)', () => {
    const err = new ConfigurationError('Malformed config');
    expect(err.name).toBe('ConfigurationError');
    expect(err.exitCode).toBe(ExitCode.INVALID_ARGUMENTS);
    expect(err.code).toBe('ERR_CONFIGURATION');
  });

  it('DependencyError should map to MISSING_DEPENDENCY (exit code 3)', () => {
    const err = new DependencyError('Docker is not installed');
    expect(err.name).toBe('DependencyError');
    expect(err.exitCode).toBe(ExitCode.MISSING_DEPENDENCY);
    expect(err.code).toBe('ERR_DEPENDENCY');
  });

  it('QualityCheckError should map to QUALITY_CHECKS_FAILED (exit code 4)', () => {
    const err = new QualityCheckError('Linter failed');
    expect(err.name).toBe('QualityCheckError');
    expect(err.exitCode).toBe(ExitCode.QUALITY_CHECKS_FAILED);
    expect(err.code).toBe('ERR_QUALITY_CHECKS_FAILED');
  });

  it('SecurityAuditError should map to SECURITY_AUDIT_FAILED (exit code 5)', () => {
    const err = new SecurityAuditError('High severity vulnerability detected');
    expect(err.name).toBe('SecurityAuditError');
    expect(err.exitCode).toBe(ExitCode.SECURITY_AUDIT_FAILED);
    expect(err.code).toBe('ERR_SECURITY_AUDIT_FAILED');
  });

  it('UserInterruptedError should map to USER_INTERRUPTED (exit code 130)', () => {
    const err = new UserInterruptedError();
    expect(err.name).toBe('UserInterruptedError');
    expect(err.exitCode).toBe(ExitCode.USER_INTERRUPTED);
  });

  it('FilesystemError, TemplateError, and NetworkError should map to GENERAL_FAILURE (exit code 1)', () => {
    const fsErr = new FilesystemError('File read failure');
    expect(fsErr.exitCode).toBe(ExitCode.GENERAL_FAILURE);

    const tmplErr = new TemplateError('Template parsing failure');
    expect(tmplErr.exitCode).toBe(ExitCode.GENERAL_FAILURE);

    const netErr = new NetworkError('Connection timeout');
    expect(netErr.exitCode).toBe(ExitCode.GENERAL_FAILURE);
  });

  it('ProcessExecutionError should store stdout and stderr', () => {
    const err = new ProcessExecutionError('Process failed', {
      stdout: 'some stdout',
      stderr: 'fatal error',
      processExitCode: 127,
    });
    expect(err.name).toBe('ProcessExecutionError');
    expect(err.stdout).toBe('some stdout');
    expect(err.stderr).toBe('fatal error');
    expect(err.processExitCode).toBe(127);
  });
});
