const { spawn } = require('child_process');
const os = require('os');

// Get local IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  let fallbackIP = null;
  let wifiOrEthernetIP = null;

  // Sort network interface names to check physical adapters first
  const names = Object.keys(interfaces).sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    // De-prioritize virtual adapters
    const isAVirtual = aLower.includes('virtual') || aLower.includes('wsl') || aLower.includes('vbox') || aLower.includes('vmware') || aLower.includes('docker') || aLower.includes('hyper-v');
    const isBVirtual = bLower.includes('virtual') || bLower.includes('wsl') || bLower.includes('vbox') || bLower.includes('vmware') || bLower.includes('docker') || bLower.includes('hyper-v');
    
    if (isAVirtual && !isBVirtual) return 1;
    if (!isAVirtual && isBVirtual) return -1;
    
    // Prioritize Wi-Fi and physical LAN adapters
    const isAWifi = aLower.includes('wi-fi') || aLower.includes('wlan') || aLower.includes('wireless') || aLower.includes('ethernet');
    const isBWifi = bLower.includes('wi-fi') || bLower.includes('wlan') || bLower.includes('wireless') || bLower.includes('ethernet');
    
    if (isAWifi && !isBWifi) return -1;
    if (!isAWifi && isBWifi) return 1;
    
    return 0;
  });

  for (const name of names) {
    const nameLower = name.toLowerCase();
    const isVirtual = nameLower.includes('virtual') || nameLower.includes('wsl') || nameLower.includes('vbox') || nameLower.includes('vmware') || nameLower.includes('docker') || nameLower.includes('hyper-v');
    
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        // If it's a known physical-sounding interface, return it immediately
        if (!isVirtual && (nameLower.includes('wi-fi') || nameLower.includes('wlan') || nameLower.includes('wireless') || nameLower.includes('ethernet'))) {
          return net.address;
        }
        
        // Prioritize standard local networks (192.168.x.x) over 172.x.x.x (which is virtual/Docker/WSL)
        if (!isVirtual && net.address.startsWith('192.168.')) {
          wifiOrEthernetIP = net.address;
        } else if (!isVirtual && net.address.startsWith('10.')) {
          if (!wifiOrEthernetIP) wifiOrEthernetIP = net.address;
        } else {
          if (!fallbackIP) fallbackIP = net.address;
        }
      }
    }
  }
  
  return wifiOrEthernetIP || fallbackIP || 'localhost';
}

const localIp = getLocalIp();

console.clear();
console.log('=============================================================');
console.log('      JAIN COURIER MANAGEMENT SYSTEM (JCMS) ONLINE MANAGER');
console.log('=============================================================');
console.log('\n[1/2] Starting backend server...');

// Start backend server
const serverProcess = spawn('npm', ['start'], { stdio: 'inherit', shell: true });

console.log('\n[2/2] Connecting to public internet tunnel...');
console.log('-------------------------------------------------------------');

// Start localtunnel on HTTP port 5000 (which localtunnel exposes as HTTPS!)
const tunnelProcess = spawn('npx', ['localtunnel', '--port', '5000'], { shell: true });

tunnelProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output.includes('your url is:')) {
    const publicUrl = output.replace('your url is:', '').trim();
    
    // Print beautiful URL summary
    console.log('\n=============================================================');
    console.log('   🎉 JCMS IS ONLINE AND ACCESSIBLE FOR ALL STAFF! 🎉');
    console.log('=============================================================');
    console.log(`\n  1. FOR OFFICE STAFF (Connected to same Wi-Fi):`);
    console.log(`     💻 Laptop Link: http://${localIp}:5000`);
    console.log(`     📱 Mobile Scanner Link: https://${localIp}:5001`);
    console.log(`     *(Self-signed warning will appear on local HTTPS, click Proceed)*`);
    console.log(`\n  2. FOR OUTSIDE STAFF (Anywhere in the world):`);
    console.log(`     🌐 Laptop & Mobile Scanner Link:`);
    console.log(`     👉 ${publicUrl}`);
    console.log(`     *(No warning will appear on this link, camera works automatically)*`);
    console.log('\n=============================================================');
    console.log('Press Ctrl + C to stop the server and close sharing.');
    console.log('=============================================================\n');
  }
});

tunnelProcess.stderr.on('data', (data) => {
  // Silent fail or print errors
});

// Handle termination gracefully
process.on('SIGINT', () => {
  console.log('\nStopping servers and closing tunnel...');
  tunnelProcess.kill();
  serverProcess.kill();
  process.exit();
});
