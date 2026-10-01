/**
 * CouchDB INITIALIZATION & MANAGEMENT
 * Centralized CouchDB setup for UtilityPro
 * 
 * Replaces SQLite with PouchDB (CouchDB-compatible)
 * All devices sync automatically through CouchDB replication
 */

const PouchDB = require('pouchdb');
const { v4: uuidv4 } = require('uuid');

// Use HTTP adapter for remote CouchDB
PouchDB.plugin(require('pouchdb-adapter-http'));

class CouchDBManager {
    constructor(serverUrl = 'http://localhost:5984') {
        this.serverUrl = serverUrl;
        this.dbName = 'utilitypro-customers';
        this.db = null;
        this.isConnected = false;
    }

    /**
     * Initialize connection to CouchDB server
     */
    async initialize() {
        try {
            // Create/connect to database
            const dbUrl = `${this.serverUrl}/${this.dbName}`;
            this.db = new PouchDB(dbUrl);

            // Verify connection
            const info = await this.db.info();
            console.log('✓ CouchDB connected:', info);
            this.isConnected = true;

            // Create design documents for queries
            await this.createDesignDocs();

            return true;
        } catch (error) {
            console.error('✗ CouchDB connection failed:', error.message);
            console.log('📌 Make sure CouchDB is running on', this.serverUrl);
            console.log('   Windows: Run couchdb-start.bat');
            console.log('   Mac/Linux: brew services start couchdb');
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Create design documents for queries
     */
    async createDesignDocs() {
        try {
            // Design document for customer queries
            const designDoc = {
                _id: '_design/customers',
                views: {
                    // Query by name
                    by_name: {
                        map: `function(doc) {
                            if (doc.type === 'customer') {
                                emit(doc.full_name, doc);
                            }
                        }`
                    },
                    // Query by phone
                    by_phone: {
                        map: `function(doc) {
                            if (doc.type === 'customer' && doc.mobile) {
                                emit(doc.mobile, doc);
                            }
                        }`
                    },
                    // Query by date
                    by_date: {
                        map: `function(doc) {
                            if (doc.type === 'customer') {
                                emit(doc.date_time, doc);
                            }
                        }`
                    },
                    // All customers
                    all: {
                        map: `function(doc) {
                            if (doc.type === 'customer') {
                                emit(doc._id, doc);
                            }
                        }`
                    }
                }
            };

            try {
                await this.db.put(designDoc);
                console.log('✓ Design documents created');
            } catch (err) {
                if (err.status === 409) {
                    // Document already exists
                    console.log('✓ Design documents already exist');
                } else {
                    throw err;
                }
            }
        } catch (error) {
            console.error('Error creating design docs:', error.message);
        }
    }

    /**
     * SAVE CUSTOMER
     */
    async saveCustomer(customerData) {
        try {
            const doc = {
                type: 'customer',
                timestamp: new Date().toISOString(),
                ...customerData
            };

            // Add ID if not present
            if (!doc._id) {
                doc._id = 'customer-' + uuidv4();
            }

            const result = await this.db.put(doc);
            return {
                success: true,
                customerId: result.id,
                rev: result.rev,
                message: 'Customer saved successfully'
            };
        } catch (error) {
            console.error('Error saving customer:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * GET ALL CUSTOMERS
     */
    async getAllCustomers(limit = 100) {
        try {
            const result = await this.db.query('customers/all', {
                include_docs: true,
                limit: limit
            });

            const customers = result.rows.map(row => row.doc);
            return {
                success: true,
                customers: customers,
                total: customers.length
            };
        } catch (error) {
            console.error('Error fetching customers:', error);
            return {
                success: false,
                error: error.message,
                customers: []
            };
        }
    }

    /**
     * SEARCH CUSTOMERS
     */
    async searchCustomers(query, searchField = 'full_name') {
        try {
            let viewName;
            if (searchField === 'phone' || searchField === 'mobile') {
                viewName = 'customers/by_phone';
            } else if (searchField === 'date') {
                viewName = 'customers/by_date';
            } else {
                viewName = 'customers/by_name';
            }

            const result = await this.db.query(viewName, {
                include_docs: true,
                startkey: query,
                endkey: query + '\ufff0'
            });

            const customers = result.rows.map(row => row.doc);
            return {
                success: true,
                customers: customers,
                total: customers.length
            };
        } catch (error) {
            console.error('Error searching customers:', error);
            return {
                success: false,
                error: error.message,
                customers: []
            };
        }
    }

    /**
     * GET SINGLE CUSTOMER
     */
    async getCustomer(customerId) {
        try {
            const doc = await this.db.get(customerId);
            return {
                success: true,
                customer: doc
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * UPDATE CUSTOMER
     */
    async updateCustomer(customerId, updateData) {
        try {
            const doc = await this.db.get(customerId);
            const updated = {
                ...doc,
                ...updateData,
                timestamp: new Date().toISOString()
            };

            const result = await this.db.put(updated);
            return {
                success: true,
                message: 'Customer updated',
                rev: result.rev
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * DELETE CUSTOMER
     */
    async deleteCustomer(customerId) {
        try {
            const doc = await this.db.get(customerId);
            await this.db.remove(doc);
            return {
                success: true,
                message: 'Customer deleted'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * REPLICATE TO ANOTHER DEVICE (Peer-to-Peer)
     */
    async replicateTo(remoteUrl) {
        try {
            const remoteDb = new PouchDB(`${remoteUrl}/${this.dbName}`);
            
            const result = await PouchDB.replicate(this.db, remoteDb, {
                live: true,
                retry: true
            });

            console.log('✓ Replication started to', remoteUrl);
            return result;
        } catch (error) {
            console.error('Replication error:', error.message);
            return null;
        }
    }

    /**
     * SYNC FROM ANOTHER DEVICE (Two-way sync)
     */
    async syncBidirectional(remoteUrl) {
        try {
            const remoteDb = new PouchDB(`${remoteUrl}/${this.dbName}`);

            const result = await this.db.sync(remoteDb, {
                live: true,
                retry: true
            });

            console.log('✓ Bidirectional sync established with', remoteUrl);
            return result;
        } catch (error) {
            console.error('Sync error:', error.message);
            return null;
        }
    }

    /**
     * GET DATABASE INFO
     */
    async getInfo() {
        try {
            return await this.db.info();
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * EXPORT ALL DATA (Backup)
     */
    async exportAllData() {
        try {
            const result = await this.db.allDocs({
                include_docs: true
            });

            return {
                success: true,
                data: result.rows,
                count: result.rows.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * IMPORT DATA (Restore from backup)
     */
    async importData(documents) {
        try {
            const result = await this.db.bulkDocs(documents);
            return {
                success: true,
                message: `Imported ${result.length} documents`,
                results: result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = CouchDBManager;
