/**
 * P2P DEVICE MANAGER
 * Handles local network discovery and device-to-device communication
 * 
 * Features:
 * - Host broadcasts itself on local network
 * - Clients discover and connect to host
 * - Real-time database sync between devices
 * - WiFi mesh network support
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class P2PManager {
    constructor(serverURL, dbPath) {
        this.serverURL = serverURL;
        this.dbPath = dbPath || path.join(__dirname, 'customers.db');
        this.connectedDevices = new Map();
        this.deviceId = this.generateDeviceId();
        this.isHost = false;
        this.hostInfo = null;
    }

    /**
     * Generate unique device ID based on MAC address
     */
    generateDeviceId() {
        const mac = this.getMacAddress();
        return 'DEVICE-' + crypto.createHash('sha256').update(mac).digest('hex').substring(0, 12);
    }

    /**
     * Get MAC address (used for unique device identification)
     */
    getMacAddress() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
                    return iface.mac;
                }
            }
        }
        return 'unknown';
    }

    /**
     * Get local IP address
     */
    getLocalIP() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }

    /**
     * BROADCAST THIS DEVICE AS HOST
     * Other devices can discover this
     */
    broadcastAsHost(port = 3000) {
        this.isHost = true;
        const localIP = this.getLocalIP();
        
        this.hostInfo = {
            deviceId: this.deviceId,
            deviceName: `UtilityPro-${os.hostname()}`,
            ip: localIP,
            port: port,
            url: `http://${localIP}:${port}`,
            timestamp: Date.now(),
            databaseVersion: this.getDatabaseHash(),
            role: 'HOST'
        };

        console.log('\n========================================');
        console.log('  P2P HOST BROADCASTING');
        console.log('========================================');
        console.log(`  Device ID: ${this.hostInfo.deviceId}`);
        console.log(`  Device Name: ${this.hostInfo.deviceName}`);
        console.log(`  URL: ${this.hostInfo.url}`);
        console.log(`  Waiting for clients to connect...`);
        console.log('========================================\n');

        return this.hostInfo;
    }

    /**
     * DISCOVER HOSTS ON LOCAL NETWORK
     * Scans for other UtilityPro servers
     */
    async discoverHosts(subnet = '192.168.1', timeout = 3000) {
        console.log('🔍 Scanning for UtilityPro hosts...');
        
        const hosts = [];
        const promises = [];

        // Scan common IP range
        for (let i = 1; i <= 254; i++) {
            const ip = `${subnet}.${i}`;
            promises.push(this.checkDevice(ip, 3000, timeout));
        }

        const results = await Promise.allSettled(promises);
        
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                hosts.push(result.value);
            }
        });

        console.log(`Found ${hosts.length} host(s)`);
        return hosts;
    }

    /**
     * Check if a device is running UtilityPro server
     */
    async checkDevice(ip, port, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(`http://${ip}:${port}/api/health`, {
                signal: controller.signal
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    ip,
                    port,
                    url: `http://${ip}:${port}`,
                    status: data.status
                };
            }
        } catch (error) {
            // Device not found or unreachable
        } finally {
            clearTimeout(timeoutId);
        }

        return null;
    }

    /**
     * CONNECT TO HOST
     * Register this device as client to a host
     */
    async connectToHost(hostURL) {
        try {
            const response = await fetch(`${hostURL}/api/p2p/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: this.deviceId,
                    deviceName: `UtilityPro-${os.hostname()}`,
                    role: 'CLIENT',
                    ip: this.getLocalIP(),
                    timestamp: Date.now()
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.hostInfo = {
                    ...result.hostInfo,
                    url: hostURL
                };
                console.log(`✓ Connected to host: ${hostURL}`);
                return result;
            }
        } catch (error) {
            console.error('Connection failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * SYNC DATABASE WITH HOST
     * Downloads database from host and merges changes
     */
    async syncDatabase(hostURL) {
        try {
            console.log('🔄 Syncing database with host...');

            // Get current database hash
            const localHash = this.getDatabaseHash();

            // Fetch remote database info
            const response = await fetch(`${hostURL}/api/p2p/db-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ localHash, deviceId: this.deviceId })
            });

            const result = await response.json();

            if (result.needsSync) {
                // Get all changes since last sync
                const changes = await this.fetchChanges(hostURL, result.lastSync);
                await this.applyChanges(changes);
                
                console.log(`✓ Synced ${changes.length} changes`);
                return { success: true, changeCount: changes.length };
            } else {
                console.log('✓ Already in sync');
                return { success: true, changeCount: 0 };
            }
        } catch (error) {
            console.error('Sync failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * PUSH CHANGES TO HOST
     * Send local changes to host for broadcasting
     */
    async pushChanges(hostURL, changes) {
        try {
            console.log(`📤 Pushing ${changes.length} changes to host...`);

            const response = await fetch(`${hostURL}/api/p2p/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: this.deviceId,
                    changes: changes,
                    timestamp: Date.now()
                })
            });

            const result = await response.json();
            if (result.success) {
                console.log(`✓ Pushed ${changes.length} changes`);
            }
            return result;
        } catch (error) {
            console.error('Push failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * BROADCAST TO ALL CONNECTED DEVICES
     * Host sends updates to all clients
     */
    broadcastToClients(data, excludeDeviceId = null) {
        const broadcast = {
            timestamp: Date.now(),
            from: this.deviceId,
            data: data
        };

        // Send to each connected device
        this.connectedDevices.forEach((device, deviceId) => {
            if (deviceId !== excludeDeviceId) {
                this.sendToDevice(device.url, broadcast);
            }
        });

        console.log(`📢 Broadcasted to ${this.connectedDevices.size} devices`);
    }

    /**
     * Send data to specific device
     */
    async sendToDevice(deviceURL, data) {
        try {
            await fetch(`${deviceURL}/api/p2p/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error(`Failed to send to ${deviceURL}:`, error.message);
        }
    }

    /**
     * Get database hash for change detection
     */
    getDatabaseHash() {
        const fs = require('fs');
        try {
            const stats = fs.statSync(this.dbPath);
            return crypto
                .createHash('sha256')
                .update(stats.mtime.toString() + stats.size.toString())
                .digest('hex')
                .substring(0, 16);
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Fetch changes from host
     */
    async fetchChanges(hostURL, since) {
        const response = await fetch(`${hostURL}/api/p2p/changes?since=${since}`);
        return response.json();
    }

    /**
     * Apply remote changes to local database
     */
    async applyChanges(changes) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);

            db.serialize(() => {
                changes.forEach(change => {
                    if (change.action === 'INSERT' || change.action === 'UPDATE') {
                        db.run(change.query, change.params);
                    } else if (change.action === 'DELETE') {
                        db.run(`DELETE FROM ${change.table} WHERE id = ?`, [change.id]);
                    }
                });
            });

            db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Get device info
     */
    getDeviceInfo() {
        return {
            deviceId: this.deviceId,
            deviceName: `UtilityPro-${os.hostname()}`,
            ip: this.getLocalIP(),
            role: this.isHost ? 'HOST' : 'CLIENT',
            connectedDevices: this.connectedDevices.size,
            databaseHash: this.getDatabaseHash(),
            timestamp: Date.now()
        };
    }

    /**
     * Register connected device (Host only)
     */
    registerDevice(deviceInfo) {
        this.connectedDevices.set(deviceInfo.deviceId, deviceInfo);
        console.log(`✓ Device registered: ${deviceInfo.deviceName}`);
        return true;
    }

    /**
     * Get all connected devices (Host only)
     */
    getConnectedDevices() {
        return Array.from(this.connectedDevices.values());
    }
}

module.exports = P2PManager;
