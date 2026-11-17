// 本機預覽伺服器：提供 web/ 裡的網頁，並先載入假後端（不連線、不動到真實資料）
// 用法：node preview/server.js，然後打開 http://localhost:5178/（學生頁）或 /screen.html（投影頁）
const http = require('http');
const fs = require('fs');
const path = require('path');

// 雲端硬碟正本的網頁在 web/；GitHub repo 裡網頁直接放在上一層
const WEB = fs.existsSync(path.join(__dirname, '..', 'web')) ? path.join(__dirname, '..', 'web') : path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 5178;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/preview/demo-api.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(__dirname, 'demo-api.js')));
    }
    let name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (name === 'screen') name = 'screen.html';
    const ext = path.extname(name);
    // 只提供 web/ 第一層的檔案，避免讀到其他資料夾
    if (!TYPES[ext] || /[\/\\]/.test(name) || !fs.existsSync(path.join(WEB, name))) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('找不到這個檔案');
    }
    let body = fs.readFileSync(path.join(WEB, name), 'utf8');
    if (ext === '.html') body = body.replace('<head>', '<head>\n  <script src="/preview/demo-api.js"></script>');
    res.writeHead(200, { 'Content-Type': TYPES[ext] + '; charset=utf-8' });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(err));
  }
}).listen(PORT, () => console.log(`預覽：http://localhost:${PORT}/  投影頁：http://localhost:${PORT}/screen.html`));
