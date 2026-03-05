const http = require('http');

// Create a simple HTTP server to keep the bot alive
const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Bot is running and alive!');
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Keep-alive server running on port ${PORT}`);
});

// Keep the process alive
setInterval(() => {
    console.log('Keep-alive ping:', new Date().toISOString());
}, 300000); // Every 5 minutes

module.exports = server;