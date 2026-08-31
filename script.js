const GOOGLE_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyem-MfyTC-Gku7VTa2BfHrl9pYHI0ys9UEPDUmDN3_xJCT_7bhA5UbrOhdbgXHW7Sw5g/exec";

// =========================================================
// 1. DYNAMIC BOOKS (Starts empty, populated strictly by DB)
// =========================================================
let allPortalBooks = [];
let activeSubjectFilter = "All";
const bookGrid = document.getElementById('book-grid');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('close-modal');

// =========================================================
// 2. SELF-HEALING THEMED TOAST NOTIFICATION ENGINE
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
        <button type="button" class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 15);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, duration);
}

// =========================================================
// 3. RENDER BOOKS GRID
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
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 4rem; font-size: 0.82rem;"><i class="fa-solid fa-book-open" style="font-size: 1.5rem; color: #38bdf8; display: block; margin-bottom: 8px;"></i> No books uploaded in this category yet.</div>`;
        return;
    }

    filteredBooks.forEach(book => {
        const isImageUrl = book.coverColor && (book.coverColor.startsWith('http') || book.coverColor.startsWith('data:'));
        const coverStyle = isImageUrl 
            ? `background-image: url('${book.coverColor}'); background-size: cover; background-position: center;`
            : `background: ${book.coverColor || '#0284c7'}; color: ${book.coverText || '#fff'};`;

        grid.insertAdjacentHTML('beforeend', `
            <div class="card" data-id="${book.id}">
                <div class="card-top">
                    <div class="card-img-placeholder" style="${coverStyle}">
                        ${!isImageUrl ? book.title : ''}
                    </div>
                    <div class="card-info">
                        <div class="card-header-row">
                            <span class="card-title">${book.title}</span>
                            <span class="tag" style="background-color: ${book.tagColor || '#0284c7'}">${book.tag || book.subject}</span>
                        </div>
                        <p class="card-desc">${book.desc}</p>
                        <span class="ebook-badge">EBOOK</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-card-primary open-modal-btn" onclick="openModalById('${book.id}')">
                       <b> VIEW EBOOK </b>
                    </button>
                    <div class="card-actions-row">
                        <button class="btn-card-secondary" onclick="openPdfDirect('${book.previewUrl || '#'}')">
                             READ PDF
                        </button>
                        <button class="btn-card-secondary" onclick="downloadPdfDirect('${book.downloadUrl || '#'}')">
                             DOWNLOAD
                        </button>
                    </div>
                </div>
            </div>
        `);
    });
}

// =========================================================
// 4. AUTH-PROTECTED PDF & DOWNLOAD HANDLERS
// =========================================================
function isAuthenticated() {
    return localStorage.getItem('portalUser') ? JSON.parse(localStorage.getItem('portalUser')) : null;
}

function openPdfDirect(url) {
    const user = isAuthenticated();
    if (!user) {
        showToast("Authentication Required", "Please Log In to open this secure e-book.", "warning", 5000);
        return;
    }
    if (!url || url === '#' || url.trim() === '') {
        showToast("Notice", "PDF stream is coming soon for this title!", "info");
        return;
    }
    
    // Natively opens Google Drive /preview link in new tab without "too large" popups
    showToast("Launching Reader", "Opening document stream in new tab...", "success", 2000);
    window.open(url, '_blank');
}

function downloadPdfDirect(url) {
    const user = isAuthenticated();
    if (!user) {
        showToast("Authentication Required", "Please Log In to securely download e-books.", "warning", 5000);
        return;
    }

    // Checking if the Admin has blocked download permissions for this user
    if (user.canDownload === false || user.canDownload === "No") {
        showToast("Permission Denied", "Your download privileges have been disabled by the administrator. You may only view files.", "error", 6000);
        return;
    }

    if (!url || url === '#' || url.trim() === '') {
        showToast("Notice", "Download file is coming soon for this title!", "info");
        return;
    }

    showToast("Download Authorized", "Beginning file download...", "success", 3000);

    // Logs the download instance to Google Sheets Backend
    fetch(GOOGLE_APP_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'logDownload',
            name: user.name,
            email: user.email,
            fileName: url
        })
    }).catch(console.error);

    // Initiates download immediately
    window.open(url, '_blank');
}

// =========================================================
// 5. MODAL CONTROLLER
// =========================================================
function openModalById(bookId) {
    const book = allPortalBooks.find(b => b.id.toString() === bookId.toString());
    if (!book) return;

    const modal = document.getElementById('modal');
    const mImg = document.getElementById('modal-img');
    const isImageUrl = book.coverColor && (book.coverColor.startsWith('http') || book.coverColor.startsWith('data:'));
    
    if (isImageUrl) {
        mImg.style.backgroundImage = `url('${book.coverColor}')`;
        mImg.style.backgroundSize = 'cover';
        mImg.innerText = '';
    } else {
        mImg.style.backgroundImage = 'none';
        mImg.style.background = book.coverColor || '#0284c7';
        mImg.style.color = book.coverText || '#fff';
        mImg.innerText = book.title;
    }

    document.getElementById('modal-title').innerText = book.title;
    document.getElementById('modal-desc').innerText = book.fullDesc || book.desc;
    document.getElementById('modal-chapters').innerText = book.chapters || 'Complete textbook chapters included.';

    let tagBuilder = `<span class="tag-label">SUBJECT</span><span class="tag" style="background-color: #21262d; border: 1px solid var(--btn-outline-border)">${book.subject}</span>`;
    document.getElementById('modal-tags').innerHTML = tagBuilder;

    const actions = document.querySelector('.modal-actions');
    if (actions) {
        actions.innerHTML = `
            <button class="btn-outline-wide" onclick="openPdfDirect('${book.previewUrl || '#'}')">
             <b> View PDF (New Tab) </b>
            </button>
            <button class="btn-outline-wide" onclick="downloadPdfDirect('${book.downloadUrl || '#'}')">
             <b> Download PDF (Offline Access) </b>
            </button>
        `;
    }

    modal.classList.add('active');
}

if (closeModalBtn) closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
if (document.getElementById('modal')) document.getElementById('modal').addEventListener('click', (e) => { 
    if (e.target === document.getElementById('modal')) document.getElementById('modal').classList.remove('active'); 
});

// =========================================================
// 6. BACKEND SYNCHRONIZATION
// =========================================================
async function syncPortalWithBackend() {
    const grid = document.getElementById('book-grid');
    if (grid && allPortalBooks.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--btn-blue-accent); padding: 3rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading e-books database...</div>`;
    }

    try {
        const cacheBuster = new Date().getTime();

        const [subRes, bookRes] = await Promise.all([
            fetch(`${GOOGLE_APP_SCRIPT_URL}?action=getPublicSubjects&t=${cacheBuster}`),
            fetch(`${GOOGLE_APP_SCRIPT_URL}?action=getPublicBooks&t=${cacheBuster}`)
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
        console.error("Backend Sync Error:", e);
        if (allPortalBooks.length === 0 && grid) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 3rem;"><i class="fa-solid fa-triangle-exclamation"></i> Could not connect to book database. Check network.</div>`;
        }
    }
}

function updateSidebarSubjects(subjects) {
    const filterList = document.getElementById('subject-filter');
    if (!filterList) return;
    
    filterList.innerHTML = `<li class="${activeSubjectFilter === 'All' ? 'active' : ''}" data-subject="All">All Books</li>`;
    subjects.forEach(s => {
        filterList.innerHTML += `<li class="${activeSubjectFilter.toLowerCase() === s.toLowerCase() ? 'active' : ''}" data-subject="${s}">${s}</li>`;
    });
    attachFilterListeners();
}

function attachFilterListeners() {
    document.querySelectorAll('#subject-filter li').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('#subject-filter li').forEach(li => li.classList.remove('active'));
            e.target.classList.add('active');
            renderBooks(e.target.getAttribute('data-subject'));
        });
    });
}

// =========================================================
// 7. REAL-TIME SEARCH BAR
// =========================================================
function initSearchBar() {
    const searchInput = document.querySelector('.search-box input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (!term) {
            renderBooks(activeSubjectFilter);
            return;
        }

        const matched = allPortalBooks.filter(b => 
            b.title.toLowerCase().includes(term) || 
            b.subject.toLowerCase().includes(term) || 
            b.desc.toLowerCase().includes(term)
        );

        const grid = document.getElementById('book-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        if (matched.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No matching books found.</div>`;
            return;
        }

        matched.forEach(book => {
            const isImageUrl = book.coverColor && (book.coverColor.startsWith('http') || book.coverColor.startsWith('data:'));
            const coverStyle = isImageUrl 
                ? `background-image: url('${book.coverColor}'); background-size: cover;` 
                : `background: ${book.coverColor || '#0284c7'}; color: ${book.coverText || '#fff'};`;

            grid.insertAdjacentHTML('beforeend', `
                <div class="card" data-id="${book.id}">
                    <div class="card-top">
                        <div class="card-img-placeholder" style="${coverStyle}">${!isImageUrl ? book.title : ''}</div>
                        <div class="card-info">
                            <span class="card-title">${book.title}</span>
                            <p class="card-desc">${book.desc}</p>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn-card-primary" onclick="openModalById('${book.id}')"><i class="fa-regular fa-eye"></i> VIEW EBOOK</button>
                    </div>
                </div>
            `);
        });
    });
}

// =========================================================
// 8. LIFECYCLE & USER SESSION ENGINE
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    renderBooks();           
    attachFilterListeners(); 
    syncPortalWithBackend(); 
    initSearchBar();         
    initUserSession();       
});

function initUserSession() {
    const rawUser = localStorage.getItem('portalUser');
    const navRight = document.querySelector('.nav-right');

    if (!rawUser || !navRight) return;

    const user = JSON.parse(rawUser);

    navRight.innerHTML = `
        <div class="search-box">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" placeholder="Search for Books, e.g. Maths, Science">
        </div>
        <div class="user-dropdown-wrapper" id="userDropdownWrapper">
            <button type="button" class="user-greeting-btn" onclick="toggleUserDropdown(event)">
                <span>Hi, ${user.name}</span>
                <i class="fa-solid fa-chevron-down dropdown-arrow"></i>
            </button>
            <div class="user-dropdown-menu" id="userDropdownMenu">
                <a href="manage.html" class="dropdown-item">
                    <i class="fa-solid fa-user-gear"></i> Manage Account
                </a>
                <div class="dropdown-divider"></div>
                <button type="button" class="dropdown-item dropdown-logout" onclick="handleLogout()">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
                </button>
            </div>
        </div>
    `;

    document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('userDropdownWrapper');
        const menu = document.getElementById('userDropdownMenu');
        if (wrapper && menu && !wrapper.contains(e.target)) {
            wrapper.classList.remove('active');
            menu.classList.remove('show');
        }
    });

    checkRestrictedStatus(user);
    setInterval(() => checkRestrictedStatus(user), 30000);

    logSilentTelemetry(user, "Online");
    window.addEventListener('online', () => sendSilentTelemetryPing(user, "Online"));
    window.addEventListener('offline', () => sendSilentTelemetryPing(user, "Offline"));
    window.addEventListener('beforeunload', () => sendSilentTelemetryPing(user, "Offline (Tab Closed)"));

    initSearchBar();
}

function toggleUserDropdown(event) {
    event.stopPropagation();
    const wrapper = document.getElementById('userDropdownWrapper');
    const menu = document.getElementById('userDropdownMenu');
    if (wrapper && menu) {
        wrapper.classList.toggle('active');
        menu.classList.toggle('show');
    }
}

async function checkRestrictedStatus(user) {
    try {
        const res = await fetch(`${GOOGLE_APP_SCRIPT_URL}?action=checkStatus&email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (data.success) {
            if (data.status.toLowerCase() === 'restricted') {
                localStorage.removeItem('portalUser');
                window.location.href = "login.html?restricted=1";
                return;
            }
            // Update permissions locally in real-time
            user.canDownload = data.canDownload;
            localStorage.setItem('portalUser', JSON.stringify(user));
        }
    } catch(e) {}
}

async function logSilentTelemetry(user, status) {
    let clientIp = 'Unknown IP';
    try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        clientIp = ipData.ip;
    } catch(e) {}

    fetch(GOOGLE_APP_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'logSession',
            name: user.name,
            email: user.email,
            ip: clientIp,
            device: navigator.userAgent,
            networkStatus: status,
            sessionDuration: `${Math.floor((Date.now() - (user.loginTimestamp || Date.now())) / 60000)} mins`
        })
    }).catch(() => {});
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
    const rawUser = localStorage.getItem('portalUser');
    if (rawUser) sendSilentTelemetryPing(JSON.parse(rawUser), "Logged Out");
    localStorage.removeItem('portalUser');
    window.location.href = "login.html";
}
