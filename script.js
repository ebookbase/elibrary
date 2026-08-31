// =======================================================
// MASTER STUDENT UI & DATABASE ENGINE (script.js)
// Google Drive Linked Output Processor & User Handler
// =======================================================

const GOOGLE_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyem-MfyTC-Gku7VTa2BfHrl9pYHI0ys9UEPDUmDN3_xJCT_7bhA5UbrOhdbgXHW7Sw5g/exec";

// Library is completely empty by default! Everything injects securely strictly from database queries over the cloud.
let allPortalBooks = []; 
let activeSubjectFilter = "All";
const bookGrid = document.getElementById('book-grid');

// =========================================================
// UI NOTIFICATION (TOAST MODULE)
// =========================================================
function showToast(title, message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container'; 
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { 
        success: 'fa-solid fa-circle-check', 
        error: 'fa-solid fa-circle-xmark', 
        warning: 'fa-solid fa-triangle-exclamation', 
        info: 'fa-solid fa-circle-info' 
    };

    toast.innerHTML = `
        <i class="${icons[type] || icons.info} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${message}</div>
        </div>
        <button type="button" class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(toast); 
    setTimeout(() => toast.classList.add('show'), 15);
    setTimeout(() => { 
        toast.classList.remove('show'); 
        setTimeout(() => toast.remove(), 350); 
    }, duration);
}

// =========================================================
// HTML BOOK COMPONENT BUILDER
// =========================================================
function renderBooks(filterSubject = "All") {
    const grid = document.getElementById('book-grid');
    if (!grid) return;
    
    activeSubjectFilter = filterSubject;
    grid.innerHTML = '';

    const filteredBooks = filterSubject === "All" 
        ? allPortalBooks 
        : allPortalBooks.filter(book => (book.subject || '').toLowerCase() === filterSubject.toLowerCase());

    if (filteredBooks.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 4rem; font-size:0.8rem;"><i class="fa-brands fa-google-drive"></i> Grid space is clear. Server matrix output waiting for Admin upload.</div>`;
        return;
    }

    filteredBooks.forEach(book => {
        // Detects if cover is an image link (Google Drive) or just a solid color fallback
        const isImageUrl = book.coverColor && book.coverColor.includes('google.com');
        const coverStyle = isImageUrl 
            ? `background-image: url('${book.coverColor}'); background-size: cover; background-position: center;`
            : `background: ${book.coverColor || '#0ea5e9'}; color: #fff;`;

        grid.insertAdjacentHTML('beforeend', `
            <div class="card" data-id="${book.id}">
                <div class="card-top">
                    <div class="card-img-placeholder" style="${coverStyle}">
                        ${!isImageUrl ? book.title : ''}
                    </div>
                    <div class="card-info">
                        <div class="card-header-row">
                            <span class="card-title">${book.title}</span>
                            <span class="tag" style="background-color: var(--c-english); border: 1px solid rgba(2, 132, 199, 0.4);">${book.tag || book.subject}</span>
                        </div>
                        <p class="card-desc">${book.desc}</p>
                        <span class="ebook-badge">EBOOK</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-card-primary" onclick="openModalById('${book.id}')">VIEW EBOOK</button>
                    <div class="card-actions-row">
                        <button class="btn-card-secondary" onclick="openPdfDirect('${book.previewUrl}')">PREVIEW PDF</button>
                        <button class="btn-card-secondary" onclick="downloadPdfDirect('${book.downloadUrl || book.previewUrl}')">DOWNLOAD PDF</button>
                    </div>
                </div>
            </div>
        `);
    });
}

// =========================================================
// AUTH SECURITY & FILE EXECUTION (Google Drive Handler)
// =========================================================
function isAuthenticated() { 
    return localStorage.getItem('portalUser') ? JSON.parse(localStorage.getItem('portalUser')) : null; 
}

function openPdfDirect(url) {
    const user = isAuthenticated();
    if (!user) { 
        showToast("Access Locked", "You must log in to view this curriculum file.", "error", 4500); 
        return; 
    }
    if (!url || url === '#' || url.trim() === '') { 
        showToast("404 Error", "Document URL has not arrived to client machine.", "warning"); 
        return; 
    }
    
    // Drive's pure web viewer executes in New Window bypassing "Too large to preview" error cleanly!
    showToast("Authorizing View", "Launching fully embedded digital PDF...", "info");
    window.open(url, '_blank');
}

function downloadPdfDirect(url) {
    const user = isAuthenticated();
    if (!user) { 
        showToast("Access Locked", "Secure handshake strictly required. Sign in first.", "error", 5500); 
        return; 
    }
    
    // 🛡️ Admin Security Gate: Checks specific Admin-Table download constraints before releasing block
    if (user.canDownload === false || user.canDownload === "No") {
        showToast("Policy Violation Warning", "Administration has restricted your PDF download rights. You may ONLY VIEW streams online. Offline extraction locked.", "error", 8500);
        return; 
    }
    
    if (!url || url === '#' || url.trim() === '') {
        showToast("Null Warning", "Download target is currently empty.", "warning");
        return;
    }

    showToast("Extraction Unlocked", "Downloading Pdf..", "success", 4000);
    
    // 📡 PING LOGGER OVER CLOUD (Tells Database exactly who downloaded to increment their tally)
    fetch(GOOGLE_APP_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
            action: 'logDownload', 
            email: user.email, 
            name: user.name, 
            fileName: url 
        })
    }).catch(console.error);

    // Forces Download natively! Code.gs built link strictly as ...&export=download
    const a = document.createElement('a');
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// =========================================================
// SYSTEM MODULE (Book Details Component Injection)
// =========================================================
function openModalById(bookId) {
    const book = allPortalBooks.find(b => b.id.toString() === bookId.toString());
    if (!book) return;
    
    const modal = document.getElementById('modal'); 
    const mImg = document.getElementById('modal-img');
    const isImageUrl = book.coverColor && book.coverColor.includes('google.com');
    
    if (isImageUrl) { 
        mImg.style.backgroundImage = `url('${book.coverColor}')`; 
        mImg.style.backgroundSize = 'cover'; 
        mImg.innerText = ''; 
    } else { 
        mImg.style.backgroundImage = 'none'; 
        mImg.style.background = book.coverColor || '#0ea5e9'; 
        mImg.innerText = book.title; 
    }

    document.getElementById('modal-title').innerText = book.title; 
    document.getElementById('modal-desc').innerText = book.fullDesc; 
    document.getElementById('modal-chapters').innerText = book.chapters || 'COnnecting To Database.';
    document.getElementById('modal-tags').innerHTML = `<span class="tag-label">Sub Category</span><span class="tag" style="background-color: rgba(30, 41, 59, 1); border: 1px solid rgba(255,255,255,0.1)">${book.subject}</span>`;
    
    document.querySelector('.modal-actions').innerHTML = `
        <button class="btn-outline-wide" onclick="openPdfDirect('${book.previewUrl}')" style="background:var(--btn-blue-accent);border:none;">Launch Online Drive Viewer </button>
        <button class="btn-outline-wide" onclick="downloadPdfDirect('${book.downloadUrl}')"><i class="fa-solid fa-cloud-arrow-down"></i> Download Hard Copy </button>
    `;
    modal.classList.add('active');
}

const closeModalBtn = document.getElementById('close-modal');
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => document.getElementById('modal').classList.remove('active'));
}

if (document.getElementById('modal')) {
    document.getElementById('modal').addEventListener('click', (e) => { 
        if (e.target === document.getElementById('modal')) document.getElementById('modal').classList.remove('active'); 
    });
}

// =========================================================
// GOOGLE SHEETS LIVE LIFECYCLE REFRESHER & SEARCH 
// =========================================================
async function syncPortalWithBackend() {
    const grid = document.getElementById('book-grid');
    if (grid && allPortalBooks.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--btn-blue-accent); padding: 3rem;font-size:0.8rem;">Connecting To Database...</div>`;
    }
    
    try {
        // cacheFix forces the browser to pull FRESH data every load (avoids stale books)
        const cacheFix = new Date().getTime(); 
        const [subRes, bookRes] = await Promise.all([ 
            fetch(`${GOOGLE_APP_SCRIPT_URL}?action=getPublicSubjects&t=${cacheFix}`), 
            fetch(`${GOOGLE_APP_SCRIPT_URL}?action=getPublicBooks&t=${cacheFix}`) 
        ]);
        
        const subData = await subRes.json(); 
        const bookData = await bookRes.json();
        
        if (subData.success) {
            updateSidebarSubjects(subData.subjects);
        }
        
        if (bookData.success && Array.isArray(bookData.books)) { 
            allPortalBooks = bookData.books; 
            renderBooks(activeSubjectFilter); 
        }
    } catch (e) {
        if (allPortalBooks.length === 0 && grid) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 3rem; font-size:0.8rem;"><i class="fa-solid fa-triangle-exclamation fa-beat"></i>Unable to read database structure. Check network.</div>`;
        }
    }
}

function updateSidebarSubjects(subjects) {
    const fList = document.getElementById('subject-filter'); 
    if (!fList) return;
    
    fList.innerHTML = `<li class="${activeSubjectFilter === 'All' ? 'active' : ''}" data-subject="All">All Books</li>`;
    
    subjects.forEach(s => {
        fList.innerHTML += `<li class="${activeSubjectFilter.toLowerCase() === s.toLowerCase() ? 'active' : ''}" data-subject="${s}">${s}</li>`;
    });
    
    document.querySelectorAll('#subject-filter li').forEach(item => { 
        item.addEventListener('click', (e) => {
            document.querySelectorAll('#subject-filter li').forEach(li => li.classList.remove('active')); 
            e.target.classList.add('active'); 
            renderBooks(e.target.getAttribute('data-subject'));
        });
    });
}

function initSearchBar() {
    const searchInp = document.querySelector('.search-box input'); 
    if (!searchInp) return;
    
    searchInp.addEventListener('input', (e) => {
        const t = e.target.value.toLowerCase().trim();
        if (!t) { 
            renderBooks(activeSubjectFilter); 
            return; 
        }
        
        const matched = allPortalBooks.filter(b => 
            b.title.toLowerCase().includes(t) || 
            b.subject.toLowerCase().includes(t) ||
            b.desc.toLowerCase().includes(t)
        );
        
        const grid = document.getElementById('book-grid');
        grid.innerHTML = '';
        
        if (matched.length === 0) { 
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No Books Found..</div>`; 
            return; 
        }
        
        matched.forEach(book => {
            const isImg = book.coverColor && book.coverColor.includes('google.com');
            const cStyle = isImg ? `background-image: url('${book.coverColor}'); background-size: cover;` : `background: ${book.coverColor || '#0ea5e9'};`;
            
            grid.insertAdjacentHTML('beforeend', `
                <div class="card" data-id="${book.id}"> 
                    <div class="card-top"> 
                        <div class="card-img-placeholder" style="${cStyle}">${!isImg ? book.title : ''}</div> 
                        <div class="card-info"> 
                            <span class="card-title">${book.title}</span> 
                            <p class="card-desc">${book.desc}</p> 
                        </div> 
                    </div> 
                    <div class="card-actions"> 
                        <button class="btn-card-primary" onclick="openModalById('${book.id}')"><i class="fa-regular fa-eye"></i> View PDF</button> 
                    </div> 
                </div>
            `);
        });
    });
}

// =========================================================
// RUN SEQUENCE ENGINE (Telemetry & Session verification)
// =========================================================
document.addEventListener('DOMContentLoaded', () => { 
    syncPortalWithBackend(); 
    initUserSession(); 
});

function initUserSession() {
    const rawUser = localStorage.getItem('portalUser'); 
    const navRight = document.querySelector('.nav-right');
    
    if (!rawUser || !navRight) return; 
    
    const user = JSON.parse(rawUser);

    navRight.innerHTML = `
        <div class="search-box"><i class="fa-solid fa-magnifying-glass"></i> <input type="text" placeholder="Search Books Maths, Science etc."></div>
        <div class="user-dropdown-wrapper" id="userDropdownWrapper">
            <button type="button" class="user-greeting-btn" onclick="toggleUserDropdown(event)">
                <span>${user.name}</span>
                <i class="fa-solid fa-server dropdown-arrow" style="margin-left:4px;"></i>
            </button>
            <div class="user-dropdown-menu" id="userDropdownMenu">
                <a href="manage.html" class="dropdown-item"><i class="fa-solid fa-fingerprint"></i>Manage Account</a>
                <div class="dropdown-divider"></div>
                <button type="button" class="dropdown-item dropdown-logout" onclick="handleLogout()"><i class="fa-solid fa-ghost"></i>Logout</button>
            </div>
        </div>
    `;
    
    document.addEventListener('click', (e) => { 
        const w = document.getElementById('userDropdownWrapper'); 
        const m = document.getElementById('userDropdownMenu'); 
        if (w && m && !w.contains(e.target)) { 
            w.classList.remove('active'); 
            m.classList.remove('show'); 
        } 
    });
    
    // Telemetry Sync ensures checking Live Restricted and Download Parameters silently!
    checkAuthSyncParams(user); 
    setInterval(() => checkAuthSyncParams(user), 30000);
    
    sendSilentTelemetryPing(user, "Securig Stream"); 
    window.addEventListener('beforeunload', () => sendSilentTelemetryPing(user, "Event Halt")); 
    
    initSearchBar();
}

function toggleUserDropdown(event) { 
    event.stopPropagation(); 
    const w = document.getElementById('userDropdownWrapper');
    const m = document.getElementById('userDropdownMenu');
    if(w) w.classList.toggle('active'); 
    if(m) m.classList.toggle('show'); 
}

// Security Heartbeat: Checks API for status flag / download permission changes!
async function checkAuthSyncParams(userObj) {
    try {
        const res = await fetch(`${GOOGLE_APP_SCRIPT_URL}?action=checkStatus&email=${encodeURIComponent(userObj.email)}`); 
        const data = await res.json();
        
        if (data.success) {
            // Kick user if Admin restricted them
            if (data.status.toLowerCase() === 'restricted') { 
                localStorage.removeItem('portalUser'); 
                window.location.href = "login.html?restricted=1"; 
                return; 
            }
            // Update local memory with fresh DL permissions
            userObj.canDownload = data.canDownload; 
            localStorage.setItem('portalUser', JSON.stringify(userObj));
        }
    } catch(e) {
        console.error("Auth sync failed silently.");
    }
}

function sendSilentTelemetryPing(user, status) {
    fetch(GOOGLE_APP_SCRIPT_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ 
            action: 'logSession', 
            name: user.name, 
            email: user.email, 
            networkStatus: status, 
            sessionDuration: `${Math.floor((Date.now() - (user.loginTimestamp || Date.now())) / 60000)} mins` 
        }) 
    }).catch(() => {});
}

function handleLogout() {
    const u = localStorage.getItem('portalUser'); 
    if (u) sendSilentTelemetryPing(JSON.parse(u), "Terminated Session"); 
    localStorage.removeItem('portalUser'); 
    window.location.href = "login.html";
}