import http from 'http';
import { logger } from '../utils/logging';

export interface HttpServerOptions {
  port: number;
  host?: string;
}

export function startHttpServer(options: HttpServerOptions): any {
  const host = options.host ?? '0.0.0.0';
  const server = http.createServer((req: any, res: any) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end('Bad request');
      return;
    }

    if (req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.url.startsWith('/sse')) {
      res.writeHead(501, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'SSE transport not yet implemented' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(options.port, host, () => {
    logger.info(`HTTP mode listening on http://${host}:${options.port}`);
  });

  server.on('error', (err: any) => {
    logger.error('HTTP server error', { error: (err as Error).message });
  });

  return server;
}
