const http = require('http');

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('Ronan Flavio Ribeiro');
});

const hostname = '127.0.0.1';
const port = process.env.PORT;

server.listen(port, hostname, () => {
    console.log(`Server running at: https://${hostname}:${port}`);
});
