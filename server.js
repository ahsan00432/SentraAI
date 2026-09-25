import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanProject } from './lib/scanner.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.yml': 'text/yaml' };

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  if (requestUrl.pathname === '/api/scan') {
    try {
      const result = scanProject(requestUrl.searchParams.get('path') || directory);
      response.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  const requested = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const file = path.resolve(directory, `.${requested}`);
  if (!file.startsWith(directory) || !fs.existsSync(file)) {
    response.writeHead(404); response.end('Not found'); return;
  }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

server.listen(port, '127.0.0.1', () => console.log(`SentraAI dashboard running at http://127.0.0.1:${port}`));
