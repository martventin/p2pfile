/**
 * CouchDB Database Server for UtilityPro
 * Distributed Peer-to-Peer Replication with CouchDB
 * 
 * SETUP:
 * 1. Install Node.js (if not already installed)
 * 2. npm install
 * 3. Make sure CouchDB is running (default: http://localhost:5984)
 * 4. Run: node server.js
 * 5. Server will run on http://YOUR_IP:3000
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const CouchDBManager = require('./couchdb-init');
const P2PManager = require('./p2p-manager');

const app = express();
const PORT = 3000;
const COUCHDB_URL = process.env.COUCHDB_URL || 'http://localhost:5984';

// Initialize CouchDB Manager
const dbManager = new CouchDBManager(COUCHDB_URL);

// Initialize P2P Manager
const p2pManager = new P2PManager(`http://${os.hostname()}:${PORT}`);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// ==========================================
// SERVER INITIALIZATION
// ==========================================

async function startServer() {
    console.log('🚀 Starting UtilityPro Server with CouchDB...\n');

    // Initialize CouchDB connection
    const connected = await dbManager.initialize();
    
    if (!connected) {
        console.error('\n❌ FATAL: Could not connect to CouchDB');
        console.error('Please ensure CouchDB is running:');
        console.error('  Windows: Run couchdb-start.bat or "couchdb"');
        console.error('  Mac: brew services start couchdb');
        console.error('  Linux: sudo systemctl start couchdb\n');
        process.exit(1);
    }

    const localIP = getLocalIPAddress();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n✓ Server running on: http://${localIP}:${PORT}`);
        console.log(`✓ CouchDB connected: ${COUCHDB_URL}`);
        console.log(`✓ Device ID: ${p2pManager.deviceId}`);
        console.log(`✓ P2P Hosting Active\n`);
        
        // Start P2P broadcasting
        p2pManager.broadcastAsHost(PORT);
    });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function getLocalIPAddress() {
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

async function logActivity(type, description, details = {}) {
    try {
        await dbManager.saveCustomer({
            type: 'activity_log',
            timestamp: new Date().toISOString(),
            activityType: type,
            description: description,
            details: details,
            user: 'local-user'
        });
    } catch (error) {
        console.error('Logging error:', error.message);
    }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Handle favicon requests (prevent 404 errors)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        database: dbManager.isConnected ? 'connected' : 'disconnected',
        couchdb: COUCHDB_URL
    });
});

// ==========================================
// CUSTOMER ENDPOINTS
// ==========================================

// Save new customer
app.post('/api/customers/save', async (req, res) => {
    try {
        const data = req.body;
        const firstName = data.first_name || data.firstName || '';
        const lastName = data.last_name || data.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();

        const customerData = {
            type: 'customer',
            date_time: new Date().toLocaleString('en-IN'),
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            email: data.email || '',
            mobile: data.phone || data.mobile || '',
            father_name: data.father_name || data.fatherName || '',
            mother_name: data.mother_name || data.motherName || '',
            spouse_name: data.spouse_name || data.spouseName || '',
            dob: data.dob || '',
            gender: data.gender || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            pin_code: data.pin_code || data.pincode || '',
            aadhar: data.aadhar || '',
            pan: data.pan || '',
            voter_id: data.voter_id || data.voterID || '',
            driving_license: data.driving_license || data.drivingLicense || '',
            bank_name: data.bank_name || data.bankName || '',
            account_number: data.account_number || data.accountNumber || '',
            ifsc_code: data.ifsc_code || data.ifscCode || '',
            account_holder: data.account_holder || data.accountHolder || '',
            business_name: data.business_name || data.businessName || '',
            business_type: data.business_type || data.businessType || '',
            services: data.services || '',
            notes: data.notes || '',
            status: 'Active'
        };

        const result = await dbManager.saveCustomer(customerData);
        
        if (result.success) {
            await logActivity('CUSTOMER_SAVED', fullName, { phone: data.mobile || data.phone });
        }

        res.json(result);
    } catch (error) {
        console.error('Save error:', error);
        await logActivity('ERROR', 'Failed to save customer', { error: error.message });
        res.json({ success: false, error: error.message });
    }
});

// Get customer by ID
app.get('/api/customers/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const result = await dbManager.getCustomer(customerId);
        res.json(result);
    } catch (error) {
        console.error('Retrieve error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Search customers
app.post('/api/customers/search', async (req, res) => {
    try {
        const { search } = req.body;
        
        // Try multiple search fields
        const nameResults = await dbManager.searchCustomers(search, 'name');
        const phoneResults = await dbManager.searchCustomers(search, 'phone');
        
        // Combine and deduplicate
        const results = new Map();
        [...nameResults.customers, ...phoneResults.customers].forEach(customer => {
            results.set(customer._id, customer);
        });

        res.json({ 
            success: true, 
            results: Array.from(results.values())
        });
    } catch (error) {
        console.error('Search error:', error);
        res.json({ success: false, error: error.message, results: [] });
    }
});

// Get all customers
app.get('/api/customers', async (req, res) => {
    try {
        const limit = req.query.limit || 100;
        const result = await dbManager.getAllCustomers(limit);
        res.json(result);
    } catch (error) {
        console.error('Retrieve error:', error);
        res.json({ success: false, error: error.message, customers: [] });
    }
});

// Update customer
app.put('/api/customers/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const updates = req.body;

        const result = await dbManager.updateCustomer(customerId, updates);
        
        if (result.success) {
            await logActivity('CUSTOMER_UPDATED', customerId, updates);
        }

        res.json(result);
    } catch (error) {
        console.error('Update error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Delete customer
app.delete('/api/customers/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const result = await dbManager.deleteCustomer(customerId);
        
        if (result.success) {
            await logActivity('CUSTOMER_DELETED', customerId, {});
        }

        res.json(result);
    } catch (error) {
        console.error('Delete error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const info = await dbManager.getInfo();
        const customers = await dbManager.getAllCustomers(10000);
        
        const activeCount = customers.customers.filter(c => c.status === 'Active').length;

        res.json({
            success: true,
            totalCustomers: customers.total || 0,
            activeCustomers: activeCount,
            lastUpdated: new Date().toLocaleString('en-IN'),
            databaseInfo: {
                docs: info.doc_count,
                deletedDocs: info.doc_del_count,
                dataSize: info.data_size
            }
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Export customers as JSON (backup)
app.get('/api/export/json', async (req, res) => {
    try {
        const result = await dbManager.exportAllData();
        res.json(result);
    } catch (error) {
        console.error('Export error:', error);
        res.json({ success: false, error: error.message });
    }
});

// ==========================================
// P2P NETWORKING ENDPOINTS
// ==========================================

// Get device info
app.get('/api/p2p/info', (req, res) => {
    res.json({
        success: true,
        device: p2pManager.getDeviceInfo(),
        hostInfo: p2pManager.hostInfo,
        database: {
            type: 'CouchDB',
            url: COUCHDB_URL,
            connected: dbManager.isConnected
        }
    });
});

// Register client device
app.post('/api/p2p/register', (req, res) => {
    const deviceInfo = req.body;
    p2pManager.registerDevice(deviceInfo);
    
    res.json({
        success: true,
        message: 'Device registered',
        hostInfo: p2pManager.hostInfo,
        deviceId: p2pManager.deviceId,
        couchdbUrl: COUCHDB_URL
    });
});

// Get database sync info
app.post('/api/p2p/db-info', async (req, res) => {
    try {
        const info = await dbManager.getInfo();
        res.json({
            success: true,
            databaseInfo: info,
            couchdbUrl: COUCHDB_URL
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// CouchDB Replication endpoint (for P2P sync)
app.post('/api/p2p/replicate', async (req, res) => {
    try {
        const { remoteUrl } = req.body;
        const result = await dbManager.replicateTo(`${remoteUrl}`);
        
        res.json({
            success: true,
            message: 'Replication started',
            replicationInfo: result
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// List connected devices
app.get('/api/p2p/devices', (req, res) => {
    res.json({
        success: true,
        isHost: p2pManager.isHost,
        deviceCount: p2pManager.connectedDevices.size,
        devices: p2pManager.getConnectedDevices()
    });
});

// Start hosting
app.post('/api/p2p/start-host', (req, res) => {
    const hostInfo = p2pManager.broadcastAsHost(PORT);
    res.json({
        success: true,
        message: 'Now hosting with CouchDB',
        hostInfo,
        couchdbUrl: COUCHDB_URL
    });
});

// Connect to host
app.post('/api/p2p/connect-host', async (req, res) => {
    try {
        const { hostURL } = req.body;
        
        // Also setup replication with the host's CouchDB
        const hostCouchURL = `${hostURL.replace(/:\d+/, ':5984')}`;
        await dbManager.syncBidirectional(hostCouchURL);
        
        res.json({
            success: true,
            message: 'Connected to host and started replication',
            hostURL,
            couchdbUrl: hostCouchURL
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});


// ==========================================
// START SERVER
// ==========================================

startServer();
