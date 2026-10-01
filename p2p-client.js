/**
 * P2P CLIENT HELPER
 * Use this in your HTML files to connect to the P2P network
 * 
 * USAGE in HTML:
 * <script src="p2p-client.js"></script>
 * <script>
 *   const p2pClient = new P2PClient();
 *   
 *   // Discover hosts
 *   const hosts = await p2pClient.discoverHosts();
 *   
 *   // Connect to a host
 *   await p2pClient.connectToHost(hosts[0].url);
 *   
 *   // Sync database
 *   await p2pClient.syncDatabase();
 * </script>
 */

class P2PClient {
    constructor(localIP = null) {
        this.localIP = localIP || this.getLocalIP();
        this.hostURL = null;
        this.deviceId = this.generateDeviceId();
        this.isConnected = false;
        this.lastSync = Date.now();
        this.syncInterval = null;
        
        // OFFLINE QUEUE SYSTEM
        this.queueKey = 'p2p_pending_queue_' + this.deviceId;
        this.pendingQueue = this.loadQueue();
        this.connectionStatusCallbacks = [];
        this.retryInterval = null;
        this.lastConnectionCheck = 0;
        
        console.log(`✓ P2P Client initialized with device ID: ${this.deviceId}`);
    }

    /**
     * Generate device ID from browser fingerprint
     */
    generateDeviceId() {
        const fingerprint = navigator.userAgent + navigator.language + new Date().getTime();
        return 'DEVICE-' + this.hashCode(fingerprint).toString(16).substring(0, 12);
    }

    /**
     * Simple hash function
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Get local IP from server (when connected)
     */
    getLocalIP() {
        return localStorage.getItem('localIP') || '192.168.1';
    }

    /**
     * DISCOVER HOSTS ON NETWORK
     * Scans common IP range for UtilityPro servers
     */
    async discoverHosts(subnet = '192.168.1') {
        console.log('🔍 Discovering P2P hosts...');
        const hosts = [];
        const promises = [];

        // Scan common IP range (e.g., 192.168.1.1 to .254)
        const baseIP = subnet.split('.').slice(0, 3).join('.');

        for (let i = 1; i <= 254; i += 4) {  // Skip some IPs for speed
            const ip = `${baseIP}.${i}`;
            promises.push(this.checkHost(ip));
        }

        const results = await Promise.allSettled(promises);

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                hosts.push(result.value);
            }
        });

        console.log(`✓ Found ${hosts.length} host(s)`);
        return hosts;
    }

    /**
     * Check if a host is running UtilityPro
     */
    async checkHost(ip, port = 3000, timeout = 1500) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(`http://${ip}:${port}/api/health`, {
                signal: controller.signal,
                method: 'GET',
                mode: 'no-cors'
            });

            if (response.ok || response.type === 'opaque') {
                clearTimeout(timeoutId);
                return {
                    ip,
                    port,
                    url: `http://${ip}:${port}`
                };
            }
        } catch (error) {
            // Host not found
        }

        clearTimeout(timeoutId);
        return null;
    }

    /**
     * CONNECT TO HOST
     */
    async connectToHost(hostURL) {
        try {
            console.log(`🔗 Connecting to host: ${hostURL}`);

            const response = await fetch(`${hostURL}/api/p2p/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: this.deviceId,
                    deviceName: this.getDeviceName(),
                    role: 'CLIENT',
                    ip: this.localIP,
                    timestamp: Date.now()
                })
            });

            const result = await response.json();

            if (result.success) {
                this.hostURL = hostURL;
                this.isConnected = true;
                console.log(`✓ Connected to host`);
                
                // Save connection info
                localStorage.setItem('hostURL', hostURL);
                localStorage.setItem('deviceId', this.deviceId);
                
                // Notify listeners
                this.notifyConnectionStatus('connected');
                
                // RETRY PENDING QUEUE if any
                if (this.pendingQueue.length > 0) {
                    console.log(`⏳ Found ${this.pendingQueue.length} pending item(s), retrying...`);
                    setTimeout(() => this.retryPendingQueue(), 2000);
                }
                
                // Start auto-sync
                this.startAutoSync(5000); // Sync every 5 seconds
                
                return result;
            } else {
                console.error('Connection failed:', result.error);
                this.notifyConnectionStatus('disconnected');
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Connection error:', error.message);
            this.notifyConnectionStatus('disconnected');
            return { success: false, error: error.message };
        }
    }

    /**
     * SYNC DATABASE WITH HOST
     */
    async syncDatabase() {
        if (!this.hostURL) {
            console.warn('Not connected to any host');
            return { success: false, error: 'Not connected' };
        }

        try {
            console.log('🔄 Syncing database...');

            // Get database info
            const response = await fetch(`${this.hostURL}/api/p2p/db-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: this.deviceId,
                    lastSync: this.lastSync
                })
            });

            const result = await response.json();

            if (result.needsSync) {
                // Fetch changes from host
                const changesResponse = await fetch(
                    `${this.hostURL}/api/p2p/changes?since=${this.lastSync}`
                );
                const changes = await changesResponse.json();

                console.log(`✓ Synced ${changes.changes?.length || 0} changes`);
                this.lastSync = Date.now();
                
                return {
                    success: true,
                    changeCount: changes.changes?.length || 0,
                    changes: changes.changes
                };
            } else {
                console.log('✓ Already in sync');
                return { success: true, changeCount: 0 };
            }
        } catch (error) {
            console.error('Sync error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * PUSH LOCAL CHANGES TO HOST
     */
    async pushChanges(changes) {
        if (!this.hostURL) {
            console.warn('❌ Not connected to host - queuing changes...');
            this.addToQueue(changes, { action: 'PUSH_CHANGES' });
            return { success: false, queued: true, error: 'Not connected' };
        }

        try {
            console.log(`📤 Pushing ${changes.length} changes to host...`);

            const response = await fetch(`${this.hostURL}/api/p2p/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: this.deviceId,
                    changes: changes,
                    timestamp: Date.now()
                })
            });

            const result = await response.json();
            console.log(`✓ Pushed to host`);
            return result;
        } catch (error) {
            console.error('Push error:', error.message);
            // Queue the changes for later retry
            console.warn('⏸️ Changes queued for retry when connection restored');
            this.addToQueue(changes, { action: 'PUSH_CHANGES', error: error.message });
            return { success: false, queued: true, error: error.message };
        }
    }

    /**
     * GET DEVICE INFO
     */
    async getDeviceInfo() {
        if (!this.hostURL) return null;

        try {
            const response = await fetch(`${this.hostURL}/api/p2p/info`);
            return response.json();
        } catch (error) {
            console.error('Error getting device info:', error.message);
            return null;
        }
    }

    /**
     * GET ALL CONNECTED DEVICES (from host)
     */
    async getConnectedDevices() {
        if (!this.hostURL) return [];

        try {
            const response = await fetch(`${this.hostURL}/api/p2p/devices`);
            const result = await response.json();
            return result.devices || [];
        } catch (error) {
            console.error('Error getting devices:', error.message);
            return [];
        }
    }

    /**
     * AUTO-SYNC at intervals
     */
    startAutoSync(interval = 5000) {
        if (this.syncInterval) clearInterval(this.syncInterval);

        this.syncInterval = setInterval(() => {
            if (this.isConnected) {
                this.syncDatabase();
            }
        }, interval);

        console.log(`✓ Auto-sync started (every ${interval}ms)`);
    }

    /**
     * STOP AUTO-SYNC
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('Auto-sync stopped');
        }
    }

    /**
     * DISCONNECT FROM HOST
     */
    disconnect() {
        this.stopAutoSync();
        this.isConnected = false;
        this.hostURL = null;
        localStorage.removeItem('hostURL');
        console.log('Disconnected from host');
    }

    /**
     * Get device name
     */
    getDeviceName() {
        const userAgent = navigator.userAgent;
        if (/Windows/.test(userAgent)) return 'Windows-Device';
        if (/Mac/.test(userAgent)) return 'Mac-Device';
        if (/iPhone|iPad/.test(userAgent)) return 'iOS-Device';
        if (/Android/.test(userAgent)) return 'Android-Device';
        if (/Linux/.test(userAgent)) return 'Linux-Device';
        return 'Unknown-Device';
    }

    /**
     * BROADCAST MESSAGE TO ALL DEVICES
     */
    async broadcast(message) {
        if (!this.hostURL) {
            console.warn('Not connected');
            return;
        }

        // Send as a change/update
        await this.pushChanges([{
            action: 'BROADCAST',
            data: message,
            timestamp: Date.now()
        }]);
    }

    /**
     * Check connection status
     */
    isHostConnected() {
        return this.isConnected && this.hostURL !== null;
    }

    /**
     * ====== OFFLINE QUEUE SYSTEM ======
     */

    /**
     * Load pending queue from localStorage
     */
    loadQueue() {
        try {
            const queue = localStorage.getItem(this.queueKey) || '[]';
            return JSON.parse(queue);
        } catch (error) {
            console.error('Error loading queue:', error);
            return [];
        }
    }

    /**
     * Save pending queue to localStorage
     */
    saveQueue() {
        try {
            localStorage.setItem(this.queueKey, JSON.stringify(this.pendingQueue));
            console.log(`✓ Queue saved (${this.pendingQueue.length} items)`);
        } catch (error) {
            console.error('Error saving queue:', error);
        }
    }

    /**
     * Add changes to pending queue
     */
    addToQueue(changes, metadata = {}) {
        const queueItem = {
            id: 'QUEUE-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            changes: changes,
            queuedAt: Date.now(),
            retryCount: 0,
            metadata: metadata
        };

        this.pendingQueue.push(queueItem);
        this.saveQueue();
        
        console.log(`📦 Added to queue: ${queueItem.id}`);
        this.notifyConnectionStatus('queued', queueItem);
        
        return queueItem.id;
    }

    /**
     * Get pending queue size
     */
    getQueueSize() {
        return this.pendingQueue.length;
    }

    /**
     * Get pending queue
     */
    getPendingQueue() {
        return this.pendingQueue;
    }

    /**
     * RETRY: Push pending changes when connection is restored
     */
    async retryPendingQueue() {
        if (this.pendingQueue.length === 0) return;

        console.log(`🔄 Retrying ${this.pendingQueue.length} pending changes...`);
        
        const itemsToRetry = [...this.pendingQueue];
        let successCount = 0;

        for (const item of itemsToRetry) {
            try {
                item.retryCount++;
                console.log(`📤 Retrying: ${item.id} (attempt ${item.retryCount})`);

                const response = await fetch(`${this.hostURL}/api/p2p/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        deviceId: this.deviceId,
                        changes: item.changes,
                        timestamp: Date.now(),
                        fromQueue: true,
                        queueItemId: item.id
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // Remove from queue
                    this.pendingQueue = this.pendingQueue.filter(x => x.id !== item.id);
                    successCount++;
                    console.log(`✅ Synced: ${item.id}`);
                    this.notifyConnectionStatus('synced', item);
                } else {
                    console.warn(`❌ Failed: ${item.id} - ${result.error}`);
                }
            } catch (error) {
                console.error(`Error retrying ${item.id}:`, error.message);
            }
        }

        this.saveQueue();
        
        if (successCount > 0) {
            console.log(`✓ Successfully synced ${successCount}/${itemsToRetry.length} queued items`);
        }
    }

    /**
     * Subscribe to connection status changes
     */
    onConnectionStatusChange(callback) {
        this.connectionStatusCallbacks.push(callback);
    }

    /**
     * Notify all listeners about connection status
     */
    notifyConnectionStatus(status, data = null) {
        this.connectionStatusCallbacks.forEach(callback => {
            try {
                callback({
                    status: status,  // 'connected', 'disconnected', 'queued', 'synced'
                    queueSize: this.pendingQueue.length,
                    isConnected: this.isConnected,
                    data: data
                });
            } catch (error) {
                console.error('Error in connection status callback:', error);
            }
        });
    }

    /**
     * Check connection status
     */
    isHostConnected() {
        return this.isConnected && this.hostURL !== null;
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            deviceId: this.deviceId,
            isConnected: this.isConnected,
            hostURL: this.hostURL,
            lastSync: new Date(this.lastSync).toLocaleString(),
            autoSyncActive: this.syncInterval !== null
        };
    }
}

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = P2PClient;
}
