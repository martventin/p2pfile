/**
 * STATIC FILE SERVER
 * Serves HTML, CSS, JS files on port 8000
 * Runs independently from API server (port 3000)
 * 
 * Run this SEPARATELY: node static-server.js
 * This stays running even when API server (port 3000) is down
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const MIME_TYPES = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
    // Enable CORS for API calls
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Cache busting: Service Worker should always get latest
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');

    let fileUrl = req.url;
    if (fileUrl === '/') fileUrl = '/index.html';

    // Prevent directory traversal attack
    const filepath = path.join(__dirname, decodeURIComponent(fileUrl));
    
    if (!filepath.startsWith(__dirname)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
    }

    fs.stat(filepath, (err, stat) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.log(`404: ${fileUrl}`);
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`<h1>404 Not Found</h1><p>File: ${fileUrl}</p>`);
            } else {
                console.error('Server error:', err);
                res.writeHead(500);
                res.end('500 Server Error');
            }
            return;
        }

        if (stat.isDirectory()) {
            const indexFile = path.join(filepath, 'index.html');
            fs.stat(indexFile, (err) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                } else {
                    serveFile(indexFile, res);
                }
            });
        } else {
            serveFile(filepath, res);
        }
    });
});

function serveFile(filepath, res) {
    const ext = path.extname(filepath).slice(1);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filepath, (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            res.writeHead(500);
            res.end('500 Server Error');
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': data.length });
        res.end(data);
        console.log(`✓ ${filepath}`);
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📁 STATIC FILE SERVER RUNNING`);
    console.log(`${'='.repeat(60)}`);
    console.log(`🌐 Access app at: http://192.168.1.105:8000`);
    console.log(`🌐 Access app at: http://localhost:8000`);
    console.log(`\n✓ THIS SERVER STAYS RUNNING EVEN IF API SERVER (port 3000) RESTARTS`);
    console.log(`✓ Service Worker caches all files for offline access`);
    console.log(`${'='.repeat(60)}\n`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Static File Server shutting down...');
    server.close(() => {
        console.log('✓ Server closed');
        process.exit(0);
    });
});
