import { StructuredError } from './types';

export class ConductorError extends Error {
  readonly code: string;
  readonly recovery?: string[];

  constructor(error: StructuredError) {
    super(error.message);
    this.code = error.code;
    this.recovery = error.recovery;
  }
}

export function asStructuredError(error: unknown, fallbackCode = 'unknown_error'): StructuredError {
  if (error instanceof ConductorError) {
    return { code: error.code, message: error.message, recovery: error.recovery };
  }
  if (error instanceof Error) {
    return { code: fallbackCode, message: error.message };
  }
  return { code: fallbackCode, message: String(error) };
}

export function createError(code: string, message: string, recovery?: string[]): ConductorError {
  return new ConductorError({ code, message, recovery });
}
