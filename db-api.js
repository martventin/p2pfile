/**
 * UNIVERSAL DATABASE API LIBRARY
 * Centralized wrapper for all P2P SQLite database operations with automatic sync
 * 
 * Usage:
 *   const db = new DatabaseAPI();
 *   
 *   // Save customer
 *   const result = await db.saveCustomer(customerData);
 *   
 *   // Fetch customers
 *   const customers = await db.getAllCustomers();
 *   
 *   // Search
 *   const results = await db.searchCustomers('john');
 */

class DatabaseAPI {
    constructor(serverUrl = SERVER_URL, p2pClient = null) {
        this.serverUrl = serverUrl;
        this.p2pClient = p2pClient || (typeof p2pClient !== 'undefined' ? p2pClient : null);
        this.lastSync = Date.now();
        this.syncQueue = [];
        this.isSyncing = false;
    }

    /**
     * Test server connection
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.serverUrl}/api/health`);
            return response.ok;
        } catch (error) {
            console.warn('Server not reachable:', error.message);
            return false;
        }
    }

    /**
     * CUSTOMER OPERATIONS
     */

    // Save new customer
    async saveCustomer(data) {
        try {
            const response = await fetch(`${this.serverUrl}/api/customers/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success && this.p2pClient) {
                // Push to P2P network
                this.syncQueue.push({
                    action: 'INSERT',
                    table: 'customers',
                    customerId: result.customerId,
                    data: data,
                    timestamp: Date.now()
                });
                this.flushSyncQueue();
            }

            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get all customers
    async getAllCustomers(limit = 100) {
        try {
            const response = await fetch(`${this.serverUrl}/api/customers?limit=${limit}`);
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            return { success: false, error: error.message, customers: [] };
        }
    }

    // Get customer by ID
    async getCustomer(customerId) {
        try {
            const response = await fetch(`${this.serverUrl}/api/customers/${customerId}`);
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Search customers
    async searchCustomers(searchTerm) {
        try {
            const response = await fetch(`${this.serverUrl}/api/customers/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ search: searchTerm })
            });
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message, results: [] };
        }
    }

    // Update customer
    async updateCustomer(customerId, data) {
        try {
            const response = await fetch(`${this.serverUrl}/api/customers/${customerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success && this.p2pClient) {
                this.syncQueue.push({
                    action: 'UPDATE',
                    table: 'customers',
                    customerId: customerId,
                    data: data,
                    timestamp: Date.now()
                });
                this.flushSyncQueue();
            }

            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Delete customer
    async deleteCustomer(customerId) {
        try {
            const response = await fetch(`${this.serverUrl}/api/customers/${customerId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success && this.p2pClient) {
                this.syncQueue.push({
                    action: 'DELETE',
                    table: 'customers',
                    customerId: customerId,
                    timestamp: Date.now()
                });
                this.flushSyncQueue();
            }

            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * STATISTICS
     */

    async getStats() {
        try {
            const response = await fetch(`${this.serverUrl}/api/stats`);
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * EXPORT
     */

    async exportJSON() {
        try {
            const response = await fetch(`${this.serverUrl}/api/export/json`);
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * P2P SYNC OPERATIONS
     */

    async getP2PStatus() {
        try {
            const response = await fetch(`${this.serverUrl}/api/p2p/info`);
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getConnectedDevices() {
        try {
            const response = await fetch(`${this.serverUrl}/api/p2p/devices`);
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message, devices: [] };
        }
    }

    /**
     * QUEUE & SYNC MANAGEMENT
     */

    async flushSyncQueue() {
        if (this.isSyncing || this.syncQueue.length === 0 || !this.p2pClient) {
            return;
        }

        this.isSyncing = true;

        try {
            const changes = [...this.syncQueue];
            this.syncQueue = [];

            await this.p2pClient.pushChanges(changes);
            this.lastSync = Date.now();
        } catch (error) {
            console.error('Sync error:', error);
            // Re-add to queue on failure
            this.syncQueue.push(...changes);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * UTILITY HELPERS
     */

    // Format data for display
    static formatCustomer(customer) {
        return {
            id: customer.id || customer['Customer ID'],
            name: customer.full_name || customer['Full Name'] || `${customer.first_name} ${customer.last_name}`,
            phone: customer.phone || customer['Phone'],
            email: customer.email || customer['Email'],
            address: customer.address || customer['Address'],
            city: customer.city || customer['City'],
            status: customer.status || 'Active'
        };
    }

    // Validate email
    static isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Validate phone
    static isValidPhone(phone) {
        return /^\d{10}$/.test(phone.replace(/\D/g, ''));
    }

    // Format currency
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseAPI;
}
