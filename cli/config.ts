import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const JADE_DIR = join(homedir(), '.jadeai');
const ALIASES_FILE = join(JADE_DIR, 'aliases.json');

export type Aliases = Record<string, string>;

function ensureDir(): void {
  if (!existsSync(JADE_DIR)) mkdirSync(JADE_DIR, { recursive: true });
}

export function getAliases(): Aliases {
  ensureDir();
  try {
    return JSON.parse(readFileSync(ALIASES_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveAliases(aliases: Aliases): void {
  ensureDir();
  writeFileSync(ALIASES_FILE, JSON.stringify(aliases, null, 2));
}

export function setAlias(name: string, id: string): void {
  const aliases = getAliases();
  aliases[name] = id;
  saveAliases(aliases);
}

export function removeAlias(name: string): boolean {
  const aliases = getAliases();
  if (!(name in aliases)) return false;
  delete aliases[name];
  saveAliases(aliases);
  return true;
}

export function resolveAlias(input: string): string {
  const aliases = getAliases();
  return aliases[input] || input;
}
