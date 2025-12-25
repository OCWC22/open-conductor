#!/usr/bin/env node
import { startHttpServer } from './http/server';
import { logger } from './utils/logging';

interface CliOptions {
  httpPort?: number;
  host?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--http' || arg === '--http-port') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --http');
      }
      const port = Number(value);
      if (Number.isNaN(port)) {
        throw new Error(`Invalid port: ${value}`);
      }
      options.httpPort = port;
      i += 1;
    } else if (arg === '--host') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --host');
      }
      options.host = value;
      i += 1;
    }
  }
  return options;
}

function startStdioPlaceholder(): void {
  logger.info('Starting Conductor MCP server in stdio mode (placeholder implementation).');
  logger.warn('The stdio transport has not been wired to MCP tools yet.');
  process.stdin.resume();
}

function main(): void {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    logger.error((error as Error).message);
    process.exitCode = 1;
    return;
  }

  if (options.httpPort) {
    startHttpServer({ port: options.httpPort, host: options.host });
    return;
  }

  startStdioPlaceholder();
}

main();
