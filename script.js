const GOOGLE_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrL3y_70KEpMYrSDgExO35ZZdy-JNdQ4p8EZWu3DCHMcnozFiUORYzbga5LsMobihvmg/exec";

let allPortalBooks = [];
let activeSubjectFilter = "All";
const bookGrid = document.getElementById('book-grid');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('close-modal');

function toggleMobileMenu() {
    const drawer = document.getElementById('mobileSideDrawer');
    const overlay = document.getElementById('mobileMenuOverlay');
    if (drawer && overlay) {
        drawer.classList.toggle('open');
        overlay.classList.toggle('open');
    }
}

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
    
    showToast("Launching Reader", "Opening document stream in new tab...", "success", 2000);
    window.open(url, '_blank');
}

function downloadPdfDirect(url) {
    const user = isAuthenticated();
    if (!user) { 
        showToast("Access Locked", "Secure handshake strictly required. Sign in first.", "error", 5500); 
        return; 
    }
    
    if (user.canDownload === false || user.canDownload === "No") {
        showToast("Policy Violation Warning", "Administration has restricted your PDF download rights. You may ONLY VIEW streams online. Offline extraction locked.", "error", 8500);
        return; 
    }
    
    if (!url || url === '#' || url.trim() === '') {
        showToast("Null Warning", "Download target is currently empty.", "warning");
        return;
    }

    showToast("Extraction Unlocked", "Downloading Pdf..", "success", 4000);
    
    fetch(GOOGLE_APP_SCRIPT_URL, {
        method: 'POST',
        keepalive: true, 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
            action: 'logDownload', 
            email: user.email, 
            name: user.name, 
            fileName: url 
        })
    }).catch(console.error);

    sendSilentTelemetryPing(user, "Download Triggered");

    setTimeout(() => {
        const a = document.createElement('a');
        a.href = url;
        a.target = "_blank";
        a.download = "ebook.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, 500);
}

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

function initSearchBar() {
    const searchInputs = document.querySelectorAll('.search-box input');
    if (searchInputs.length === 0) return;

    searchInputs.forEach(searchInput => {
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
                            <button class="btn-card-primary" onclick="openModalById('${book.id}')">VIEW EBOOK</button>
                        </div>
                    </div>
                `);
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderBooks();           
    attachFilterListeners(); 
    syncPortalWithBackend(); 
    initSearchBar();         
    initUserSession();       
});

function initUserSession() {
    const rawUser = localStorage.getItem('portalUser');
    const navRight = document.getElementById('navRight');
    const drawerActions = document.getElementById('drawerActions');
    const mobileUserSlot = document.getElementById('mobileUserSlot');

    if (!rawUser) return;
    const user = JSON.parse(rawUser);
    const initial = user.name.charAt(0).toUpperCase();

    if (navRight) {
        navRight.innerHTML = `
            <div class="search-box">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" placeholder="Search for Books...">
            </div>
            <div class="user-dropdown-wrapper" id="userDropdownWrapper">
                <button type="button" class="user-greeting-btn" onclick="toggleUserDropdown(event, 'userDropdownMenu', 'userDropdownWrapper')">
                    <span>Hi, ${user.name}</span>
                    <i class="fa-solid fa-chevron-down dropdown-arrow"></i>
                </button>
                <div class="user-dropdown-menu" id="userDropdownMenu">
                    <a href="manage.html" class="dropdown-item"><i class="fa-solid fa-user-gear"></i> Manage Account</a>
                    <div class="dropdown-divider"></div>
                    <button type="button" class="dropdown-item dropdown-logout" onclick="handleLogout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out</button>
                </div>
            </div>
        `;
    }

    if (drawerActions) {
        drawerActions.innerHTML = `
            <div class="search-box" style="width: 100%;">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" placeholder="Search for Books...">
            </div>
        `;
    }

    if (mobileUserSlot) {
        mobileUserSlot.innerHTML = `
            <div class="user-dropdown-wrapper" id="mobileUserDropdownWrapper">
                <div class="clean-mobile-avatar" style="cursor: pointer; border: 2px solid #ffffff !important; color: #ffffff !important; background: transparent !important; width: 34px !important; height: 34px !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; font-weight: bold !important; font-size: 16px !important; font-family: Arial, sans-serif !important; text-shadow: none !important; box-shadow: none !important; position: relative;" onclick="toggleUserDropdown(event, 'mobileUserDropdownMenu', 'mobileUserDropdownWrapper')">
                    ${initial}
                </div>
                <div class="user-dropdown-menu mobile-dropdown" id="mobileUserDropdownMenu">
                    <div class="mobile-user-name">${user.name}</div>
                    <div class="mobile-user-email">${user.email}</div>
                    <div class="dropdown-divider"></div>
                    <a href="manage.html" class="dropdown-item"><i class="fa-solid fa-user-gear"></i> Manage Account</a>
                    <button type="button" class="dropdown-item dropdown-logout" onclick="handleLogout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out</button>
                </div>
            </div>
        `;
    }

    document.addEventListener('click', (e) => {
        const w1 = document.getElementById('userDropdownWrapper');
        const m1 = document.getElementById('userDropdownMenu');
        const w2 = document.getElementById('mobileUserDropdownWrapper');
        const m2 = document.getElementById('mobileUserDropdownMenu');
        
        if (w1 && m1 && !w1.contains(e.target)) { w1.classList.remove('active'); m1.classList.remove('show'); }
        if (w2 && m2 && !w2.contains(e.target)) { w2.classList.remove('active'); m2.classList.remove('show'); }
    });

    checkRestrictedStatus(user);
    setInterval(() => checkRestrictedStatus(user), 30000);
    sendSilentTelemetryPing(user, "User Grid Access Event Start"); 
    window.addEventListener('beforeunload', () => sendSilentTelemetryPing(user, "Event Halt")); 
    
    initSearchBar(); 
}

function toggleUserDropdown(event, menuId, wrapperId) {
    event.stopPropagation();
    const w = document.getElementById(wrapperId);
    const m = document.getElementById(menuId);
    if (w) w.classList.toggle('active');
    if (m) m.classList.toggle('show');
}

async function checkRestrictedStatus(user) {
    try {
        const res = await fetch(`${GOOGLE_APP_SCRIPT_URL}?action=checkStatus&email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        
        if (data.success === false) {
            localStorage.removeItem('portalUser');
            window.location.href = "login.html?removed=1";
            return;
        }

        if (data.success) {
            const currentStatus = (data.status || '').toLowerCase();
            if (currentStatus === 'restricted' || currentStatus === 'deleted' || currentStatus === 'removed') {
                localStorage.removeItem('portalUser');
                window.location.href = "login.html?restricted=1";
                return;
            }

            user.canDownload = data.canDownload;
            localStorage.setItem('portalUser', JSON.stringify(user));
        }
    } catch(e) {
        console.warn("Status check network error, retrying on next interval...");
    }
}

function sendSilentTelemetryPing(user, status) {
    fetch(GOOGLE_APP_SCRIPT_URL, { 
        method: 'POST', 
        keepalive: true, 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ 
            action: 'logSession', 
            name: user.name, 
            email: user.email, 
            ip: 'Not Tracked',
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