/**
 * SQLITE SERVER CONFIGURATION
 * 
 * Update your HTML files with this configuration
 * 
 * IMPORTANT: Replace 192.168.x.x with your actual local IP address
 * You can find it in the server startup message or using: ipconfig (Windows)
 */

// ==========================================
// CONFIGURATION
// ==========================================

// YOUR LOCAL IP ADDRESS (from server startup or ipconfig)
const LOCAL_IP = '192.168.x.x';  // CHANGE THIS!

// Server URL
const APPS_SCRIPT_URL = `http://${LOCAL_IP}:3000`;

// ==========================================
// EXAMPLE: How to use in your HTML files
// ==========================================

/*

In customer-info-form.html, replace the entire fetch section with:

async function handleCustomerSubmit(event) {
    event.preventDefault();
    
    const formData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        // ... other fields
        services: document.getElementById('services').value
    };

    try {
        const response = await fetch(`${APPS_SCRIPT_URL}/api/customers/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Customer saved: ' + result.customerId);
            // Clear form
            document.getElementById('customerForm').reset();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        alert('Connection error: ' + error.message);
    }
}

*/

// ==========================================
// UPDATED API ENDPOINTS FOR FRONTEND
// ==========================================

const API = {
    // Save new customer
    saveCustomer: async (data) => {
        const response = await fetch(`${APPS_SCRIPT_URL}/api/customers/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },

    // Get all customers
    getAllCustomers: async (limit = 100) => {
        const response = await fetch(`${APPS_SCRIPT_URL}/api/customers?limit=${limit}`);
        return response.json();
    },

    // Get customer by ID
    getCustomer: async (customerId) => {
        const response = await fetch(`${APPS_SCRIPT_URL}/api/customers/${customerId}`);
        return response.json();
    },

    // Search customers
    searchCustomers: async (searchTerm) => {
        const response = await fetch(`${APPS_SCRIPT_URL}/api/customers/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ search: searchTerm })
        });
        return response.json();
    },

    // Update customer
    updateCustomer: async (customerId, data) => {
        const response = await fetch(`${APPS_SCRIPT_URL}/api/customers/${customerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },

    // Delete customer
    deleteCustomer: async (customerId) => {
        const response = await fetch(`${APPS_SCRIPT_URL}/api/customers/${customerId}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    // Get statistics
    getStats: async () => {
        const response = await fetch(`${APPS_SCRIPT_URL}/api/stats`);
        return response.json();
    },

    // Export data
    exportJSON: async () => {
        const response = await fetch(`${APPS_SCRIPT_URL}/api/export/json`);
        return response.json();
    }
};

// ==========================================
// EXAMPLE USAGE
// ==========================================

/*

// Add a customer
const newCustomer = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '9999999999',
    address: '123 Main St',
    services: 'Passport, Aadhar'
};

const result = await API.saveCustomer(newCustomer);
console.log(result);


// Search customers
const searchResults = await API.searchCustomers('john');
console.log(searchResults);


// Get statistics
const stats = await API.getStats();
console.log(stats);

*/
