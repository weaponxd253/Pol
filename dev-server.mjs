import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png'
};
const allowed = new Set([
  '/index.html', '/styles.css', '/term.css',
  '/js/main.js', '/js/engine.js', '/js/content.js', '/js/view.js', '/js/storage.js', '/js/assembly.js',
  '/js/office-scene.js', '/js/office-alerts.js', '/js/government-corridor-scene.js',
  '/js/corridor-layout.js', '/js/room-controls.js',
  '/js/cabinet-room-scene.js', '/js/cabinet-room-layout.js',
  '/js/situation-room-scene.js', '/js/situation-room-layout.js', '/js/situation-briefing.js',
  '/js/press-room-scene.js', '/js/press-room-layout.js',
  '/js/room-npcs.js', '/js/npc-content.js', '/js/npc-dialogue.js', '/js/office-objectives.js',
  '/js/finance-dialogue.js', '/js/official-dialogue.js',
  '/assets/office.png', '/assets/prez.png', '/assets/policy-dossier.png', '/assets/policy-dossier-seal.png',
  '/assets/government_corridor.png', '/assets/chief_of_staff.png', '/assets/cabinet_room.png',
  '/assets/situation_room.png', '/assets/press_briefing_room.png', '/assets/finance_secretary.png',
  '/assets/government_aide.png', '/assets/press_secretary.png', '/assets/defense_secretary.png'
]);
let port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');

const server = createServer(async (request, response) => {
  try {
    const requested = new URL(request.url, 'http://localhost').pathname;
    const resource = requested === '/' ? '/index.html' : requested;
    if (!['GET', 'HEAD'].includes(request.method) || !allowed.has(resource)) {
      response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    const content = await readFile(path.join(root, resource));
    response.writeHead(200, { 'Content-Type': types[path.extname(resource)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain' }).end('Unable to load this file.');
  }
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < 4190) server.listen(++port, '127.0.0.1');
  else { console.error(error.message); process.exitCode = 1; }
});
server.on('listening', () => console.log(`Policy-Maker is ready. Local: http://127.0.0.1:${port}`));
server.listen(port, '127.0.0.1');
