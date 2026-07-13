const { spawn } = require('child_process');
const os = require('os');

// Get local IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
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
