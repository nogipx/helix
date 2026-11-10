import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root = new URL('./dist/', import.meta.url).pathname;
const server = http.createServer(async (req,res) => {
  try {
    const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
    if (!file.startsWith(root)) {res.writeHead(403).end(); return;}
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type': ({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript'})[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'}).end(data);
  } catch {res.writeHead(404).end('Not found');}
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('http://127.0.0.1:4173'));
