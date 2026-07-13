// Load environment variables immediately on startup
require('dotenv').config();

const app = require('./app');
const { initializeDatabase } = require('./config/db');

// Handle uncaught synchronous exceptions (e.g., using undefined variables)
process.on('uncaughtException', (err) => {
  console.error('[JCMS Uncaught Exception]:', err.name, err.message);
  console.log('[JCMS Server] Shutting down due to uncaught exception...');
  process.exit(1);
});

const os = require('os');
const fs = require('fs');
const path = require('path');
const https = require('https');
const selfsigned = require('selfsigned');

const getLocalIPAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
};

const startServer = async () => {
  // 1. Database connection initialization
  try {
    await initializeDatabase();
  } catch (err) {
    console.error('[JCMS Server] Database initialization failed. Shutting down...');
    process.exit(1);
  }

  const localIP = getLocalIPAddress();

  // 2. Generate/Load SSL certificates
  const keyPath = path.join(__dirname, 'key.pem');
  const certPath = path.join(__dirname, 'cert.pem');

  let sslOptions = null;
  try {
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.log(`[JCMS SSL] Generating self-signed SSL certificates for IP ${localIP}...`);
      const attrs = [{ name: 'commonName', value: localIP }];
      const pems = await selfsigned.generate(attrs, { days: 365 });
      fs.writeFileSync(keyPath, pems.private);
      fs.writeFileSync(certPath, pems.cert);
      console.log('[JCMS SSL] Certificates generated successfully!');
    }
    sslOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  } catch (err) {
    console.error('[JCMS SSL] Failed to generate/load SSL certificates:', err.message);
  }

  // 3. Start Dual Servers (HTTP on 5000 & HTTPS on 5001)
  const HTTP_PORT = process.env.PORT || 5000;
  const HTTPS_PORT = 5001;
  const localHostname = os.hostname().toLowerCase();

  // A. Boot HTTP Server (Standard Laptop)
  const httpServer = app.listen(HTTP_PORT, () => {
    console.log('\n=============================================================');
    console.log(`[JCMS Server] 🟢 HTTP Server running on http://localhost:${HTTP_PORT}`);
    console.log(`[JCMS Server] Laptop Link (Normal Chrome): http://localhost:${HTTP_PORT}/auth.html`);
    console.log(`[JCMS Server] Wifi Link:                  http://${localIP}:${HTTP_PORT}/auth.html`);
    console.log(`[JCMS Server] Name Link:                  http://${localHostname}.local:${HTTP_PORT}/auth.html`);
    console.log('=============================================================\n');
  });

  // B. Boot HTTPS Server (Secure Mobile Camera)
  let httpsServer;
  if (sslOptions && !process.env.PORT) {
    httpsServer = https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
      console.log('=============================================================');
      console.log(`[JCMS Server] 🔒 HTTPS Server running on port ${HTTPS_PORT}`);
      console.log(`[JCMS Server] Laptop Link: https://localhost:${HTTPS_PORT}/auth.html`);
      console.log(`[JCMS Server] Mobile Link: https://${localIP}:${HTTPS_PORT}/auth.html`);
      console.log(`[JCMS Server] Name Link:   https://${localHostname}.local:${HTTPS_PORT}/auth.html`);
      console.log('=============================================================\n');
    });
  }

  // Handle asynchronous promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('[JCMS Unhandled Rejection]:', err.name, err.message);
    console.log('[JCMS Server] Closing servers due to unhandled promise rejection...');
    if (httpServer) httpServer.close();
    if (httpsServer) httpsServer.close();
    process.exit(1);
  });
};

startServer();
