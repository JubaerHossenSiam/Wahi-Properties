import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDirectory = fileURLToPath(new URL('./dist/', import.meta.url));
const port = Number(process.argv[2] ?? 4173);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
};

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const file = resolve(siteDirectory, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    const contentType = contentTypes[extname(file)];
    if (!file.startsWith(resolve(siteDirectory) + sep) || !contentType) {
      response.writeHead(404).end();
      return;
    }
    const metadata = await stat(file);
    if (!metadata.isFile()) {
      response.writeHead(404).end();
      return;
    }

    if (contentType === 'video/mp4') {
      response.setHeader('Accept-Ranges', 'bytes');
      const range = request.method === 'GET' && /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '');
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : Math.max(0, metadata.size - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), metadata.size - 1) : metadata.size - 1;
        if (start > end) {
          response.writeHead(416, { 'Content-Range': 'bytes */' + metadata.size }).end();
          return;
        }
        response.writeHead(206, {
          'Content-Type': contentType,
          'Content-Length': end - start + 1,
          'Content-Range': 'bytes ' + start + '-' + end + '/' + metadata.size,
        });
        createReadStream(file, { start, end }).pipe(response);
        return;
      }
    }

    response.writeHead(200, { 'Content-Type': contentType, 'Content-Length': metadata.size });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch (error) {
    const status = error instanceof URIError ? 400 : error.code === 'ENOENT' ? 404 : 500;
    response.writeHead(status).end();
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log('Local: http://127.0.0.1:' + server.address().port + '/');
});
