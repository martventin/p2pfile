/**
 * GLOBAL CONFIGURATION
 * Static File Server: Port 8000 (always running)
 * API Server: Port 3000 (can restart/go down)
 * 
 * TO RUN BOTH SERVERS (in SEPARATE terminals):
 * Terminal 1: node server.js          (API server - port 3000)
 * Terminal 2: node static-server.js   (File server - port 8000)
 * 
 * Then access: http://192.168.1.105:8000
 */

// Get API server URL from localStorage or use default
const API_SERVER_URL = localStorage.getItem('apiServerURL') || 'http://192.168.1.105:3000';

// App is served from static server
const APP_URL = 'http://192.168.1.105:8000';

// SERVER_URL used for API calls
const SERVER_URL = API_SERVER_URL;

// Function to update API server URL if needed
function setApiServerURL(url) {
    localStorage.setItem('apiServerURL', url);
    console.log('✓ API Server URL updated:', url);
}

// Function to test server connection
async function testServerConnection() {
    try {
        const response = await fetch(`${API_SERVER_URL}/api/health`);
        const result = await response.json();
        console.log('✓ API Server connected:', result.status);
        return true;
    } catch (error) {
        console.warn('⚠️ API Server not reachable:', error.message);
        console.warn('   You can still use the app offline!');
        console.warn('   Data will sync when server comes back online.');
        return false;
    }
}

// Auto-check connection on page load
window.addEventListener('load', async () => {
    const connected = await testServerConnection();
    if (!connected) {
        console.warn(`⚠️ Could not connect to API: ${API_SERVER_URL}`);
        console.warn('Make sure to run: node server.js');
    }
});
