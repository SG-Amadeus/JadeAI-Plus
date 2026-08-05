export const EX_USAGE = 1;
export const EX_NETWORK = 2;
export const EX_API = 3;
export const EX_IO = 4;
export const EX_STREAM = 5;

export class CliError extends Error {
  code: number;
  status?: number;

  constructor(code: number, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function usageError(msg: string): CliError {
  return new CliError(EX_USAGE, msg);
}

export function networkError(msg: string): CliError {
  return new CliError(EX_NETWORK, msg);
}

export function apiError(msg: string, status?: number): CliError {
  return new CliError(EX_API, msg, status);
}

export function ioError(msg: string): CliError {
  return new CliError(EX_IO, msg);
}
