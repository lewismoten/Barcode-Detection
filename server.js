const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
  key: fs.readFileSync('localhost.key'),
  cert: fs.readFileSync('localhost.crt')
};

const contentTypes = {
  js: 'text/javascript',
  html: 'text/html',
  css: 'text/css',
  png: 'image/png'
}

const server = https.createServer(options, ({url}, res) => {
  console.log(url);
  if(url.endsWith('/')) url += 'index.html';
  let filePath = '.' + url;
  fs.readFile(filePath, (err, content) => {
    if(err) {
      if(err.code === "ENOENT") {
        res.writeHead(404);
        res.end('404: Chuck Norris tried to find the file, but it fled in terror at the sight of him.');
      } else {
        res.writeHead(500);
        res.end('500: Chuck Norris told the server a joke, and it laughed so hard, it crashed.')
      }
    } else {
      let contentType = contentTypes[path.extname(filePath).slice(1)] ?? 'text/plain';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  })
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server running at https://localhost:${PORT}/`);
});
