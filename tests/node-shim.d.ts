// Minimal ambient typing for the one Node API the token tests use (the project does not install @types/node).
declare module 'node:fs' {
  export function readFileSync(path: URL | string, encoding: 'utf8'): string
}
