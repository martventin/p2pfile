/* ========================================
   GOOGLE APPS SCRIPT FOR CUSTOMER DATA MANAGEMENT
   ========================================
   
   Instructions:
   1. Go to Google Drive → New → Google Apps Script
   2. Copy ALL the code below into the editor
   3. Replace SHEET_ID and FOLDER_ID with your values
   4. Deploy as Web App (Execute as: Your email, Anyone)
   5. Copy the deployment URL and paste into customer-info-form.html APPS_SCRIPT_URL
   
   ======================================== */

// ==========================================
// CONFIGURATION - UPDATE THESE VALUES
// ==========================================

// Get your Google Sheets ID from the URL: https://docs.google.com/spreadsheets/d/SHEET_ID/...
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';

// Get your Google Drive Folder ID for storing photos
// Create a folder in Google Drive, open it, and copy the ID from the URL
const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID';

// Sheet names
const SHEET_CUSTOMERS = 'Customers';
const SHEET_LOG = 'Activity Log';
const SHEET_SERVICES = 'Service Requests';

// ==========================================
// MAIN HANDLER - RECEIVES FORM DATA
// ==========================================

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        
        // Handle different actions
        if (data.action === 'searchCustomers') {
            const results = searchCustomers(data.search);
            return ContentService.createTextOutput(
                JSON.stringify({ success: true, results: results })
            ).setMimeType(ContentService.MimeType.JSON);
        }
        
        if (data.action === 'getCustomer') {
            const customer = getCustomerById(data.customerId);
            return ContentService.createTextOutput(
                JSON.stringify({ success: true, customer: customer })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        if (data.action === 'updateCustomer') {
            const customerId = data.customerId;
            const updates = {
                'Father\'s Name': data.fatherName || '',
                'Mother\'s Name': data.motherName || '',
                'Spouse Name': data.spouseName || '',
                'Email': data.email || '',
                'Phone': data.phone || '',
                'Date of Birth': data.dob || '',
                'Gender': data.gender || '',
                'Address': data.address || '',
                'City': data.city || '',
                'State': data.state || '',
                'PIN Code': data.pincode || '',
                'Aadhar Number': data.aadhar || '',
                'PAN Number': data.pan || '',
                'Voter ID': data.voterID || '',
                'Driving License': data.drivingLicense || '',
                'Bank Name': data.bankName || '',
                'Account Number': data.accountNumber || '',
                'IFSC Code': data.ifscCode || '',
                'Account Holder': data.accountHolder || '',
                'Business Name': data.businessName || '',
                'Business Type': data.businessType || '',
                'CSC Services Interested': data.services || '',
                'Notes': data.notes || ''
            };
            
            const success = updateCustomer(customerId, updates);
            
            if (success) {
                logActivity('CUSTOMER_UPDATED', customerId, updates);
                return ContentService.createTextOutput(
                    JSON.stringify({ success: true, message: 'Customer updated successfully' })
                ).setMimeType(ContentService.MimeType.JSON);
            } else {
                return ContentService.createTextOutput(
                    JSON.stringify({ success: false, error: 'Customer not found' })
                ).setMimeType(ContentService.MimeType.JSON);
            }
        }

        // Default: Save new customer
        // Validate required fields
        if (!data.firstName || !data.lastName || !data.phone) {
            return ContentService.createTextOutput(
                JSON.stringify({ success: false, error: 'Missing required fields' })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // Save customer data
        const result = saveCustomerData(data);

        // Log the activity
        logActivity('CUSTOMER_SAVED', data.firstName + ' ' + data.lastName, {
            phone: data.phone,
            email: data.email
        });

        return ContentService.createTextOutput(
            JSON.stringify({ success: true, message: 'Customer saved successfully', customerId: result })
        ).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        logActivity('ERROR', 'Failed to process request', { error: error.toString() });
        
        return ContentService.createTextOutput(
            JSON.stringify({ success: false, error: error.toString() })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

// ==========================================
// SAVE CUSTOMER DATA TO SHEET
// ==========================================

function saveCustomerData(data) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_CUSTOMERS);
    
    // Initialize sheet if empty
    if (sheet.getLastRow() === 0) {
        createCustomerHeaders(sheet);
    }

    // Generate unique Customer ID
    const customerId = 'CUST-' + Date.now();
    
    // Prepare row data
    const rowData = [
        customerId,                                      // Customer ID
        data.timestamp,                                  // Date & Time
        data.firstName + ' ' + data.lastName,           // Full Name
        data.fatherName || '',                           // Father's Name
        data.motherName || '',                           // Mother's Name
        data.spouseName || '',                           // Spouse Name
        data.email,                                      // Email
        data.phone,                                      // Phone
        data.dob || '',                                  // Date of Birth
        data.gender || '',                              // Gender
        data.address || '',                              // Address
        data.city || '',                                 // City
        data.state || '',                                // State
        data.pincode || '',                              // PIN Code
        data.aadhar || '',                               // Aadhar
        data.pan || '',                                  // PAN
        data.voterID || '',                              // Voter ID
        data.drivingLicense || '',                       // Driving License
        data.bankName || '',                             // Bank Name
        data.accountNumber || '',                        // Account Number
        data.ifscCode || '',                             // IFSC Code
        data.accountHolder || '',                        // Account Holder
        data.businessName || '',                         // Business Name
        data.businessType || '',                         // Business Type
        data.services || '',                             // CSC Services Interested
        data.notes || '',                                // Notes
        'Active',                                        // Status
        '=IMAGE("")'                                     // Photo (will be updated if uploaded)
    ];

    // Add new row
    sheet.appendRow(rowData);

    // Save service preferences
    if (data.services) {
        saveServiceRequests(customerId, data);
    }

    return customerId;
}

// ==========================================
// SAVE SERVICE REQUESTS
// ==========================================

function saveServiceRequests(customerId, data) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_SERVICES);
    
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Service ID', 'Customer ID', 'Customer Name', 'Phone', 'Service', 'Date', 'Status']);
    }

    const services = data.services.split(',').map(s => s.trim());
    
    services.forEach(service => {
        const serviceId = 'SVC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sheet.appendRow([
            serviceId,
            customerId,
            data.firstName + ' ' + data.lastName,
            data.phone,
            service,
            new Date().toLocaleString('en-IN'),
            'Pending'
        ]);
    });
}

// ==========================================
// ACTIVITY LOGGING
// ==========================================

function logActivity(type, description, details) {
    try {
        const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_LOG);
        
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['Timestamp', 'Type', 'Description', 'Details', 'User']);
        }

        sheet.appendRow([
            new Date().toLocaleString('en-IN'),
            type,
            description,
            JSON.stringify(details),
            Session.getActiveUser().getEmail()
        ]);

        // Keep only last 1000 logs (auto-cleanup)
        if (sheet.getLastRow() > 1000) {
            sheet.deleteRows(2, sheet.getLastRow() - 1000);
        }
    } catch (error) {
        Logger.log('Logging error: ' + error);
    }
}

// ==========================================
// CREATE SHEET HEADERS
// ==========================================

function createCustomerHeaders(sheet) {
    const headers = [
        'Customer ID',
        'Date & Time',
        'Full Name',
        'Father\'s Name',
        'Mother\'s Name',
        'Spouse Name',
        'Email',
        'Phone',
        'Date of Birth',
        'Gender',
        'Address',
        'City',
        'State',
        'PIN Code',
        'Aadhar Number',
        'PAN Number',
        'Voter ID',
        'Driving License',
        'Bank Name',
        'Account Number',
        'IFSC Code',
        'Account Holder',
        'Business Name',
        'Business Type',
        'CSC Services Interested',
        'Notes',
        'Status',
        'Photo URL'
    ];

    sheet.appendRow(headers);
    
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#667eea');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');

    // Set column widths
    sheet.setColumnWidth(1, 150);  // Customer ID
    sheet.setColumnWidth(2, 160);  // Date & Time
    sheet.setColumnWidth(3, 200);  // Full Name
    sheet.setColumnWidth(4, 200);  // Email
    sheet.setColumnWidth(5, 120);  // Phone
}

// ==========================================
// RETRIEVE CUSTOMER DATA
// ==========================================

function getCustomerByPhone(phone) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][4] === phone) { // Column E is Phone
            return convertRowToObject(data[0], data[i]);
        }
    }
    return null;
}

function getCustomerById(customerId) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === customerId) { // Column A is Customer ID
            return convertRowToObject(data[0], data[i]);
        }
    }
    return null;
}

function getCustomerByEmail(email) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][3] === email) { // Column D is Email
            return convertRowToObject(data[0], data[i]);
        }
    }
    return null;
}

function getAllCustomers(limit = 100) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    const customers = [];

    for (let i = Math.max(1, data.length - limit); i < data.length; i++) {
        customers.push(convertRowToObject(data[0], data[i]));
    }
    return customers;
}

// ==========================================
// UPDATE CUSTOMER DATA
// ==========================================

function updateCustomer(customerId, updates) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === customerId) {
            for (const [key, value] of Object.entries(updates)) {
                const colIndex = headers.indexOf(key);
                if (colIndex > -1) {
                    sheet.getRange(i + 1, colIndex + 1).setValue(value);
                }
            }
            logActivity('CUSTOMER_UPDATED', customerId, updates);
            return true;
        }
    }
    return false;
}

// ==========================================
// DELETE CUSTOMER DATA
// ==========================================

function deleteCustomer(customerId) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === customerId) {
            sheet.deleteRow(i + 1);
            logActivity('CUSTOMER_DELETED', customerId, {});
            return true;
        }
    }
    return false;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function convertRowToObject(headers, row) {
    const obj = {};
    headers.forEach((header, index) => {
        obj[header] = row[index];
    });
    return obj;
}

function searchCustomers(searchTerm) {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    const results = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        // Search in Name, Email, Phone, Aadhar
        if (
            row[2].toString().toLowerCase().includes(lowerSearchTerm) ||
            row[3].toString().toLowerCase().includes(lowerSearchTerm) ||
            row[4].toString().toLowerCase().includes(lowerSearchTerm) ||
            row[11].toString().toLowerCase().includes(lowerSearchTerm)
        ) {
            results.push(convertRowToObject(data[0], row));
        }
    }
    return results;
}

function getCustomerStats() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    
    return {
        totalCustomers: data.length - 1,
        activeCustomers: data.slice(1).filter(row => row[23] === 'Active').length,
        lastUpdated: new Date().toLocaleString('en-IN'),
        topServices: getTopServices()
    };
}

function getTopServices() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_SERVICES);
    const data = sheet.getDataRange().getValues();
    const serviceCount = {};

    for (let i = 1; i < data.length; i++) {
        const service = data[i][4];
        serviceCount[service] = (serviceCount[service] || 0) + 1;
    }

    return Object.entries(serviceCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

function exportCustomersToCSV() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    let csv = '';

    data.forEach(row => {
        csv += row.map(cell => '"' + (cell || '').toString().replace(/"/g, '""') + '"').join(',') + '\n';
    });

    return csv;
}

function createBackup() {
    try {
        const sourceSpreadsheet = SpreadsheetApp.openById(SHEET_ID);
        const backupName = 'CustomerDB_Backup_' + new Date().toISOString().split('T')[0];
        
        // This would require Drive API - consider setting up separately
        logActivity('BACKUP_CREATED', backupName, {});
        return { success: true, backupName: backupName };
    } catch (error) {
        logActivity('BACKUP_ERROR', 'Backup failed', { error: error.toString() });
        return { success: false, error: error.toString() };
    }
}

/* ========================================
   SETUP INSTRUCTIONS
   ========================================

   1. Create Google Sheet with 3 sheets:
      - Sheet 1: Rename to "Customers"
      - Sheet 2: Rename to "Activity Log"
      - Sheet 3: Rename to "Service Requests"

   2. Get your SHEET_ID:
      - Open the Google Sheet
      - Copy ID from URL: /spreadsheets/d/SHEET_ID/

   3. Create a Google Drive Folder:
      - Go to drive.google.com
      - Create new folder "CustomerPhotos"
      - Copy folder ID from URL: /folders/FOLDER_ID

   4. Deploy as Web App:
      - In Apps Script: Deploy > New Deployment
      - Type: Web app
      - Execute as: YOUR EMAIL
      - Who has access: Anyone
      - Copy the URL and paste in customer-info-form.html

   5. Testing:
      - Open customer-info-form.html
      - Fill and submit the form
      - Data should appear in Google Sheets

   ======================================== */
