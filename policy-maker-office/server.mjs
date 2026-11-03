import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png' };
const server = createServer(async (request,response) => {
  try {
    const url = new URL(request.url,'http://localhost');
    const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const target = resolve(root, '.' + name);
    if (target !== root && !target.startsWith(root + sep)) {response.writeHead(403);response.end('Forbidden');return;}
    const body = await readFile(target);
    response.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream'});
    response.end(body);
  } catch { response.writeHead(404);response.end('Not found'); }
});
const port = Number(process.env.PORT||4173);
server.listen(port,()=>console.log(`Office demo: http://localhost:${port}`));
