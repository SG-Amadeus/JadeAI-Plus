import { readFileSync, existsSync, writeFileSync } from 'fs';
import { ioError } from '../errors';

/** Resolve --jd or --prompt that can be either a file path or inline text */
export function readFileOrText(value: string): string {
  if (existsSync(value)) {
    try {
      return readFileSync(value, 'utf-8');
    } catch (err: any) {
      throw ioError(`Cannot read ${value}: ${err.message}`);
    }
  }
  return value;
}

/** Read and parse a JSON file */
export function readJsonFile<T = unknown>(filepath: string): T {
  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch (err: any) {
    throw ioError(`Cannot read ${filepath}: ${err.message}`);
  }
}

/** Write output to file */
export function writeOutput(data: string | Buffer, filepath: string): void {
  try {
    writeFileSync(filepath, data);
  } catch (err: any) {
    throw ioError(`Cannot write ${filepath}: ${err.message}`);
  }
}

/** Parse comma-separated string */
export function parseCsv(value: string): string[] {
  return value.split(',').map(s => s.trim()).filter(Boolean);
}
