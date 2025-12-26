declare module 'fs' {
  const anyExport: any;
  export = anyExport;
}

declare module 'fs/promises' {
  const anyExport: any;
  export = anyExport;
}

declare module 'path' {
  const anyExport: any;
  export = anyExport;
}

declare module 'os' {
  const anyExport: any;
  export = anyExport;
}

declare module 'child_process' {
  export function execFileSync(...args: any[]): any;
  export function spawnSync(...args: any[]): any;
}

declare module 'http' {
  const anyExport: any;
  export default anyExport;
  export const IncomingMessage: any;
  export const ServerResponse: any;
  export function createServer(...args: any[]): any;
}

declare const process: any;

declare namespace NodeJS {
  interface ErrnoException extends Error {
    code?: string;
  }
}

declare module 'assert' {
  const strict: any;
  export = strict;
}

declare module 'node:test' {
  export function test(name: string, fn: (...args: any[]) => any): any;
  export function describe(name: string, fn: (...args: any[]) => any): any;
  export function it(name: string, fn: (...args: any[]) => any): any;
  export function before(fn: (...args: any[]) => any): any;
  export function after(fn: (...args: any[]) => any): any;
  export function beforeEach(fn: (...args: any[]) => any): any;
  export function afterEach(fn: (...args: any[]) => any): any;
}
