// ==========================================
// UtilityPro - Master Sidebar Injector
// ==========================================

const sidebarContent = `
    <div class="overlay" id="mobile-overlay" onclick="toggleSidebar()"></div>

    <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">UtilityPro</div>
        <ul class="nav-links">
            <li style="margin-top: 10px; font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; padding-left: 15px;">Main Hubs</li>
            <li><a href="universal-search.html" data-page="universal-search.html">🌍 Universal Search</a></li>
            <li><a href="links.html" data-page="links.html">🌐 Digital Service Hub</a></li>
            <li><a href="customer-manager.html" data-page="customer-manager.html">📇 Customer CRM</a></li>
            <li><a href="services.html" data-page="services.html">📋 Services & Forms</a></li>
            <li><a href="index.html" data-page="index.html">🖼️ File Tools</a></li>
            
            <li style="margin-top: 15px; font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; padding-left: 15px;">Banking & Utils</li>
            <li><a href="customer-info-form.html" data-page="customer-info-form.html">📋 Customer Form</a></li>
            <li><a href="bank-deposit.html" data-page="bank-deposit.html">🏦 Deposit Slip</a></li>
            <li><a href="passbook-maker.html" data-page="passbook-maker.html">📔 Passbook Print</a></li>
            <li><a href="receipt-maker.html" data-page="receipt-maker.html">🧾 AEPS Receipt</a></li>
            <li><a href="receiving-receipt.html" data-page="receiving-receipt.html">📝 Order Receipt</a></li>
            
            <li style="margin-top: 15px; font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; padding-left: 15px;">Image & Files</li>
            <li><a href="smart-resizer.html" data-page="smart-resizer.html">✂️ Govt Resizer</a></li>
            <li><a href="image-text-overlayer.html" data-page="image-text-overlayer.html">✍️ Image Text</a></li>
            <li><a href="file-drop.html" data-page="file-drop.html">🚀 Local Drop</a></li>
            
            <li style="margin-top: 15px; font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; padding-left: 15px;">P2P Network</li>
            <li><a href="p2p-test.html" data-page="p2p-test.html">📡 P2P Dashboard</a></li>
            
            <li style="margin-top: 15px; font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; padding-left: 15px;">Security & Data</li>
            <li><a href="data-tools.html" data-page="data-tools.html">🔐 Data & Security</a></li>
            <li><a href="password-vault.html" data-page="password-vault.html">🏦 Password Vault</a></li>
            <li><a href="stealth-cipher.html" data-page="stealth-cipher.html">🥷 Stealth Cipher</a></li>
            <li><a href="analytics.html" data-page="analytics.html">📊 Business Insights</a></li>
         
        </ul>
    </aside>
`;

// ==========================================
// SMART TOGGLE: Mobile & Laptop Logic
// ==========================================
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    if (window.innerWidth <= 768) {
        if(sidebar) sidebar.classList.toggle('active');
        if(overlay) overlay.classList.toggle('active');
    } 
    else {
        document.body.classList.toggle('desktop-sidebar-hidden');
    }
};

// ==========================================
// INITIALIZE SIDEBAR ON PAGE LOAD
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('sidebar-container');
    if (container) {
        container.innerHTML = sidebarContent;
    }

    let currentPage = window.location.pathname.split("/").pop();
    if (!currentPage || currentPage === "") currentPage = "index.html"; 

    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
        if (link.getAttribute('data-page') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});