/* ========================================
   Gaming Top-up Shop - Admin Panel
   ======================================== */

// ========================================
// Admin State
// ========================================
const AdminState = {
    isAuthenticated: false,
    currentSection: 'dashboard',
    editingItem: null,
    bannerType: 'type1'
};

// ========================================
// Admin Initialization
// ========================================
async function initAdmin() {
    console.log('=== Initializing Admin Panel ===');

    // Initialize Telegram
    const telegramReady = TelegramManager.init();
    console.log('Telegram ready:', telegramReady);

    // Check if in Telegram
    if (!TelegramManager.isInTelegram()) {
        console.log('Not in Telegram');
        showAdminAccessDenied();
        return;
    }

    // Get user
    const user = TelegramManager.getUser();
    console.log('Telegram User:', user);

    if (!user) {
        console.log('No user found');
        showAdminAccessDenied();
        return;
    }

    // Check if admin
    console.log('User ID:', user.id);
    console.log('Admin ID:', CONFIG.ADMIN_TELEGRAM_ID);
    console.log('Is Admin:', isAdmin(user.id));

    if (!isAdmin(user.id)) {
        console.log('User is not admin');
        showAdminAccessDenied();
        return;
    }

    // Show auth screen
    showAdminAuth();
}

function showAdminAccessDenied() {
    const authEl = document.getElementById('admin-auth');
    const dashboardEl = document.getElementById('admin-dashboard');
    const deniedEl = document.getElementById('access-denied');

    if (authEl) authEl.classList.add('hidden');
    if (dashboardEl) dashboardEl.classList.add('hidden');
    if (deniedEl) deniedEl.classList.remove('hidden');
}

function showAdminAuth() {
    const authEl = document.getElementById('admin-auth');
    const dashboardEl = document.getElementById('admin-dashboard');
    const deniedEl = document.getElementById('access-denied');

    if (deniedEl) deniedEl.classList.add('hidden');
    if (dashboardEl) dashboardEl.classList.add('hidden');
    if (authEl) authEl.classList.remove('hidden');
}

async function authenticateAdmin() {
    const passwordInput = document.getElementById('admin-password');
    const password = passwordInput?.value?.trim();

    if (!password) {
        Toast.warning('Please enter password');
        return;
    }

    Loading.show('Authenticating...');

    try {
        // Initialize database
        await db.init();

        AdminState.isAuthenticated = true;
        Session.set('admin_auth', true);

        Loading.hide();
        showAdminDashboard();

    } catch (error) {
        Loading.hide();
        console.error('Auth error:', error);
        Toast.error('Authentication failed');
    }
}

async function showAdminDashboard() {
    const authEl = document.getElementById('admin-auth');
    const dashboardEl = document.getElementById('admin-dashboard');
    const deniedEl = document.getElementById('access-denied');

    if (authEl) authEl.classList.add('hidden');
    if (deniedEl) deniedEl.classList.add('hidden');
    if (dashboardEl) dashboardEl.classList.remove('hidden');

    // Initialize navigation
    initAdminNavigation();

    // Load dashboard
    await loadDashboardData();

    TelegramManager.haptic('notification', 'success');
    console.log('Admin dashboard loaded');
}

function initAdminNavigation() {
    // Section navigation
    document.querySelectorAll('.admin-nav .nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            switchSection(section);
        });
    });

    // Banner type tabs
    document.querySelectorAll('.banner-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchBannerType(btn.dataset.type);
        });
    });

    // Delivery type change handler
    const deliveryType = document.getElementById('delivery-type');
    if (deliveryType) {
        deliveryType.addEventListener('change', () => {
            const customGroup = document.getElementById('custom-time-group');
            if (customGroup) {
                customGroup.classList.toggle('hidden', deliveryType.value === 'instant');
            }
        });
    }

    // File preview handlers
    setupFilePreviewHandlers();
}

function setupFilePreviewHandlers() {
    // Category icon
    const categoryIconInput = document.getElementById('category-icon-file');
    if (categoryIconInput) {
        categoryIconInput.addEventListener('change', function() {
            if (this.files[0]) {
                fileToBase64(this.files[0]).then(base64 => {
                    const preview = document.getElementById('category-icon-preview');
                    if (preview) preview.src = base64;
                });
            }
        });
    }

    // Product icon
    const productIconInput = document.getElementById('product-icon-file');
    if (productIconInput) {
        productIconInput.addEventListener('change', function() {
            if (this.files[0]) {
                fileToBase64(this.files[0]).then(base64 => {
                    const preview = document.getElementById('product-icon-preview');
                    if (preview) preview.src = base64;
                });
            }
        });
    }

    // Payment icon
    const paymentIconInput = document.getElementById('payment-icon-file');
    if (paymentIconInput) {
        paymentIconInput.addEventListener('change', function() {
            if (this.files[0]) {
                fileToBase64(this.files[0]).then(base64 => {
                    const preview = document.getElementById('payment-icon-preview');
                    if (preview) preview.src = base64;
                });
            }
        });
    }

    // Banner
    const bannerInput = document.getElementById('banner-file');
    if (bannerInput) {
        bannerInput.addEventListener('change', function() {
            if (this.files[0]) {
                fileToBase64(this.files[0]).then(base64 => {
                    const preview = document.getElementById('banner-preview');
                    if (preview) preview.src = base64;
                });
            }
        });
    }

    // Broadcast image
    const broadcastInput = document.getElementById('broadcast-image-file');
    if (broadcastInput) {
        broadcastInput.addEventListener('change', function() {
            if (this.files[0]) {
                fileToBase64(this.files[0]).then(base64 => {
                    const preview = document.getElementById('broadcast-image-preview');
                    if (preview) preview.src = base64;
                });
            }
        });
    }
}

function switchSection(section) {
    console.log('Switching to section:', section);

    // Update nav
    document.querySelectorAll('.admin-nav .nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });

    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => {
        s.classList.add('hidden');
    });

    // Show selected section
    const sectionEl = document.getElementById(`${section}-section`);
    if (sectionEl) {
        sectionEl.classList.remove('hidden');
    }

    AdminState.currentSection = section;

    // Load section data
    loadSectionData(section);

    TelegramManager.haptic('selection');
}

async function loadSectionData(section) {
    switch (section) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'orders':
            loadOrdersData();
            break;
        case 'products':
            loadProductsData();
            break;
        case 'categories':
            loadCategoriesData();
            break;
        case 'banners':
            loadBannersData();
            break;
        case 'payments':
            loadPaymentsData();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}

// ========================================
// Dashboard
// ========================================
async function loadDashboardData() {
    try {
        await db.load();

        const stats = db.getStats();

        // Update stats
        const totalUsersEl = document.getElementById('total-users');
        const totalOrdersEl = document.getElementById('total-orders-stat');
        const totalRevenueEl = document.getElementById('total-revenue');
        const pendingOrdersEl = document.getElementById('pending-orders');

        if (totalUsersEl) totalUsersEl.textContent = formatNumber(stats.totalUsers);
        if (totalOrdersEl) totalOrdersEl.textContent = formatNumber(stats.totalOrders);
        if (totalRevenueEl) totalRevenueEl.textContent = formatNumber(stats.totalRevenue);
        if (pendingOrdersEl) pendingOrdersEl.textContent = formatNumber(stats.pendingOrders);

        // Database info
        const jsonbinIdEl = document.getElementById('jsonbin-id');
        if (jsonbinIdEl) jsonbinIdEl.textContent = db.binId || 'Not configured';

        // Recent orders
        loadRecentOrders();

        // Pending topups
        loadPendingTopupsDashboard();

    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

function loadRecentOrders() {
    const orders = db.getOrders().slice(-5).reverse();
    const list = document.getElementById('recent-orders-list');

    if (!list) return;

    if (!orders || orders.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary); text-align: center;">No recent orders</p>';
        return;
    }

    list.innerHTML = orders.map(order => {
        const user = db.getUser(order.userId);
        return `
            <div class="recent-item">
                <img src="${getAvatarUrl(user)}" alt="User" class="recent-item-avatar">
                <div class="recent-item-info">
                    <h4>${user?.firstName || 'User'}</h4>
                    <p>${order.productInfo?.name || 'Product'}</p>
                </div>
                <span class="recent-item-status ${order.status}">${order.status}</span>
                <span class="recent-item-amount">${formatCurrency(order.amount)}</span>
            </div>
        `;
    }).join('');
}

function loadPendingTopupsDashboard() {
    const topups = db.getPendingTopupRequests();
    const list = document.getElementById('pending-topups-list');

    if (!list) return;

    if (!topups || topups.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary); text-align: center;">No pending top-ups</p>';
        return;
    }

    list.innerHTML = topups.slice(0, 5).map(topup => {
        const user = db.getUser(topup.userId);
        return `
            <div class="recent-item">
                <img src="${getAvatarUrl(user)}" alt="User" class="recent-item-avatar">
                <div class="recent-item-info">
                    <h4>${user?.firstName || 'User'}</h4>
                    <p>${topup.paymentInfo?.name || 'Payment'}</p>
                </div>
                <span class="recent-item-status pending">pending</span>
                <span class="recent-item-amount">${formatCurrency(topup.amount)}</span>
            </div>
        `;
    }).join('');
}

// ========================================
// Users
// ========================================
function loadUsersData(filter = 'all') {
    const users = db.getUsers();
    const bannedIds = db.getBannedUsers().map(b => b.telegramId);
    const list = document.getElementById('users-list');

    if (!list) return;

    let filteredUsers = users;

    if (filter === 'premium') {
        filteredUsers = users.filter(u => u.isPremium);
    } else if (filter === 'banned') {
        filteredUsers = users.filter(u => bannedIds.includes(u.telegramId));
    }

    if (!filteredUsers || filteredUsers.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-users"></i></div>
                <h3>No Users</h3>
            </div>
        `;
        return;
    }

    list.innerHTML = filteredUsers.map(user => {
        const isBanned = bannedIds.includes(user.telegramId);
        return `
            <div class="user-card" onclick="openUserDetail('${user.telegramId}')">
                <img src="${getAvatarUrl(user)}" alt="User" class="user-card-avatar">
                <div class="user-card-info">
                    <h4>
                        ${user.firstName || 'User'} ${user.lastName || ''}
                        ${user.isPremium ? '<span class="premium-badge"><i class="fas fa-star"></i></span>' : ''}
                        ${isBanned ? '<span style="color: var(--accent-red);"><i class="fas fa-ban"></i></span>' : ''}
                    </h4>
                    <p>@${user.username || 'N/A'} · ID: ${user.telegramId}</p>
                </div>
                <div class="user-card-balance">
                    <span>${formatCurrency(user.balance || 0)}</span>
                    <small>${user.totalOrders || 0} orders</small>
                </div>
                <div class="user-card-actions">
                    <button onclick="event.stopPropagation(); ${isBanned ? `unbanUser('${user.telegramId}')` : `banUser('${user.telegramId}')`}">
                        <i class="fas fa-${isBanned ? 'unlock' : 'ban'}"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Filter handlers
    document.querySelectorAll('#users-section .filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('#users-section .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadUsersData(btn.dataset.filter);
        };
    });

    // Search handler
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.oninput = debounce((e) => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.user-card').forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(query) ? 'flex' : 'none';
            });
        }, 300);
    }
}

function openUserDetail(telegramId) {
    const user = db.getUser(telegramId);
    if (!user) return;

    const orders = db.getOrdersByUser(telegramId);
    const topups = db.getTopupRequestsByUser(telegramId);

    const modal = document.getElementById('user-detail-modal');
    const content = document.getElementById('user-detail-content');

    if (!modal || !content) return;

    content.innerHTML = `
        <div class="user-detail-header">
            <img src="${getAvatarUrl(user)}" alt="User">
            <div class="user-detail-header-info">
                <h3>${user.firstName || 'User'} ${user.lastName || ''} ${user.isPremium ? '⭐' : ''}</h3>
                <p>@${user.username || 'N/A'} · ID: ${user.telegramId}</p>
            </div>
        </div>

        <div class="user-detail-stats">
            <div class="user-detail-stat">
                <span>${formatCurrency(user.balance || 0)}</span>
                <label>Balance</label>
            </div>
            <div class="user-detail-stat">
                <span>${user.totalOrders || 0}</span>
                <label>Orders</label>
            </div>
            <div class="user-detail-stat">
                <span>${formatCurrency(user.totalSpent || 0)}</span>
                <label>Spent</label>
            </div>
        </div>

        <div class="user-detail-section">
            <h4><i class="fas fa-shopping-cart"></i> Recent Orders</h4>
            <div class="user-detail-list">
                ${orders.slice(-5).reverse().map(order => `
                    <div class="user-detail-list-item">
                        <div class="user-detail-list-item-info">
                            <h5>${order.productInfo?.name || 'Product'}</h5>
                            <p>${formatRelativeTime(order.createdAt)} · ${order.status}</p>
                        </div>
                        <span class="user-detail-list-item-amount negative">-${formatCurrency(order.amount)}</span>
                    </div>
                `).join('') || '<p style="color: var(--text-tertiary);">No orders</p>'}
            </div>
        </div>

        <div class="user-detail-section">
            <h4><i class="fas fa-wallet"></i> Recent Deposits</h4>
            <div class="user-detail-list">
                ${topups.slice(-5).reverse().map(topup => `
                    <div class="user-detail-list-item">
                        <div class="user-detail-list-item-info">
                            <h5>${topup.paymentInfo?.name || 'Payment'}</h5>
                            <p>${formatRelativeTime(topup.createdAt)} · ${topup.status}</p>
                        </div>
                        <span class="user-detail-list-item-amount ${topup.status === 'approved' ? 'positive' : ''}">
                            ${topup.status === 'approved' ? '+' : ''}${formatCurrency(topup.amount)}
                        </span>
                    </div>
                `).join('') || '<p style="color: var(--text-tertiary);">No deposits</p>'}
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeUserDetailModal() {
    const modal = document.getElementById('user-detail-modal');
    if (modal) modal.classList.add('hidden');
}

async function banUser(telegramId) {
    const confirmed = await TelegramManager.showConfirm('Ban this user?');
    if (!confirmed) return;

    Loading.show('Banning user...');

    try {
        await db.banUser(telegramId, 'Banned by admin');
        TelegramBot.sendUserNotification(telegramId, '❌ Your account has been banned.');

        Loading.hide();
        Toast.success('User banned');
        loadUsersData();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to ban user');
    }
}

async function unbanUser(telegramId) {
    const confirmed = await TelegramManager.showConfirm('Unban this user?');
    if (!confirmed) return;

    Loading.show('Unbanning user...');

    try {
        await db.unbanUser(telegramId);
        TelegramBot.sendUserNotification(telegramId, '✅ Your account has been unbanned.');

        Loading.hide();
        Toast.success('User unbanned');
        loadUsersData();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to unban user');
    }
}

// Broadcast
function openBroadcastModal() {
    const modal = document.getElementById('broadcast-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeBroadcastModal() {
    const modal = document.getElementById('broadcast-modal');
    if (modal) modal.classList.add('hidden');
}

async function sendBroadcast() {
    const messageEl = document.getElementById('broadcast-message');
    const message = messageEl?.value?.trim();
    const imageFile = document.getElementById('broadcast-image-file')?.files[0];

    if (!message) {
        Toast.warning('Please enter a message');
        return;
    }

    const confirmed = await TelegramManager.showConfirm('Send to all users?');
    if (!confirmed) return;

    Loading.show('Broadcasting...');

    try {
        const users = db.getUsers();
        let successCount = 0;

        for (const user of users) {
            try {
                await TelegramBot.sendMessage(user.telegramId, message);
                successCount++;
                await sleep(50);
            } catch (e) {}
        }

        Loading.hide();
        closeBroadcastModal();
        Toast.success(`Sent to ${successCount} users`);

    } catch (error) {
        Loading.hide();
        Toast.error('Broadcast failed');
    }
}

// ========================================
// Orders
// ========================================
function loadOrdersData(filter = 'pending') {
    const orders = db.getOrders();
    const list = document.getElementById('orders-admin-list');

    if (!list) return;

    let filteredOrders = orders;
    if (filter !== 'all') {
        filteredOrders = orders.filter(o => o.status === filter);
    }

    filteredOrders = filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!filteredOrders || filteredOrders.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-shopping-cart"></i></div>
                <h3>No Orders</h3>
            </div>
        `;
        return;
    }

    list.innerHTML = filteredOrders.map(order => {
        const user = db.getUser(order.userId);
        return `
            <div class="order-admin-card">
                <div class="order-admin-header">
                    <span class="order-admin-id">#${order.id}</span>
                    <span class="order-admin-time">${formatRelativeTime(order.createdAt)}</span>
                </div>
                <div class="order-admin-body">
                    <div class="order-admin-user">
                        <img src="${getAvatarUrl(user)}" alt="User">
                        <div class="order-admin-user-info">
                            <h4>${user?.firstName || 'User'}</h4>
                            <p>@${user?.username || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="order-admin-product">
                        <img src="${order.productInfo?.iconUrl || ''}" alt="Product">
                        <div class="order-admin-product-info">
                            <h5>${order.productInfo?.name || 'Product'}</h5>
                            <p>${formatCurrency(order.amount)}</p>
                        </div>
                    </div>
                    ${Object.keys(order.inputValues || {}).length > 0 ? `
                        <div class="order-admin-inputs">
                            ${Object.entries(order.inputValues).map(([key, value]) => `
                                <p><span>${key}:</span> <code>${value}</code></p>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${order.status === 'pending' ? `
                        <div class="order-admin-actions">
                            <button class="approve-btn" onclick="approveOrder('${order.id}')">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="reject-btn" onclick="rejectOrder('${order.id}')">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 10px;">
                            <span class="order-status ${order.status}" style="padding: 8px 16px; border-radius: 20px;">${order.status.toUpperCase()}</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');

    // Filter handlers
    document.querySelectorAll('#orders-section .filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('#orders-section .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadOrdersData(btn.dataset.filter);
        };
    });
}

async function approveOrder(orderId) {
    const confirmed = await TelegramManager.showConfirm('Approve this order?');
    if (!confirmed) return;

    Loading.show('Approving...');

    try {
        const order = await db.approveOrder(orderId);
        
        TelegramBot.sendUserNotification(order.userId, `
✅ <b>Order Approved!</b>

📋 Order ID: <code>${order.id}</code>
📦 Product: ${order.productInfo?.name}
💰 Amount: ${formatCurrency(order.amount)}

🎮 Please check your game account.
        `.trim());

        Loading.hide();
        Toast.success('Order approved');
        loadOrdersData();
        loadDashboardData();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to approve');
    }
}

async function rejectOrder(orderId) {
    const confirmed = await TelegramManager.showConfirm('Reject this order? Amount will be refunded.');
    if (!confirmed) return;

    Loading.show('Rejecting...');

    try {
        const order = await db.rejectOrder(orderId);
        
        TelegramBot.sendUserNotification(order.userId, `
❌ <b>Order Rejected</b>

📋 Order ID: <code>${order.id}</code>
📦 Product: ${order.productInfo?.name}
💰 Amount: ${formatCurrency(order.amount)}

💵 Your balance has been refunded.
        `.trim());

        Loading.hide();
        Toast.success('Order rejected, balance refunded');
        loadOrdersData();
        loadDashboardData();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to reject');
    }
}

// ========================================
// Products
// ========================================
function loadProductsData() {
    const products = db.getProducts();
    const list = document.getElementById('products-admin-list');

    if (!list) return;

    if (!products || products.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon"><i class="fas fa-box"></i></div>
                <h3>No Products</h3>
                <p>Add your first product</p>
            </div>
        `;
        return;
    }

    list.innerHTML = products.map(product => {
        const category = db.getCategory(product.categoryId);
        const hasDiscount = product.discount > 0;
        const finalPrice = hasDiscount ? calculateDiscount(product.price, product.discount) : product.price;

        return `
            <div class="product-admin-card">
                <div class="product-admin-card-header">
                    <img src="${product.iconUrl || ''}" alt="${product.name}">
                    <div class="product-admin-card-info">
                        <h4>${product.name}</h4>
                        <span class="category-tag">${category?.name || 'Unknown'}</span>
                    </div>
                </div>
                <div class="product-admin-card-price">
                    ${hasDiscount ? `<span class="original">${formatCurrency(product.price)}</span>` : ''}
                    <span class="final">${formatCurrency(finalPrice)}</span>
                    ${hasDiscount ? `<span class="discount">-${product.discount}%</span>` : ''}
                </div>
                <div class="product-admin-card-actions">
                    <button onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="danger" onclick="deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openProductModal(productId = null) {
    const modal = document.getElementById('add-product-modal');
    const title = document.getElementById('product-modal-admin-title');
    const categorySelect = document.getElementById('product-category');

    if (!modal) return;

    // Load categories
    const categories = db.getCategories();
    if (categorySelect) {
        categorySelect.innerHTML = categories.map(c => `
            <option value="${c.id}">${c.name}</option>
        `).join('');
    }

    if (productId) {
        const product = db.getProduct(productId);
        if (!product) return;

        if (title) title.textContent = 'Edit Product';
        AdminState.editingItem = product;

        if (categorySelect) categorySelect.value = product.categoryId;
        
        const nameEl = document.getElementById('product-name');
        const priceEl = document.getElementById('product-price');
        const currencyEl = document.getElementById('product-currency');
        const discountEl = document.getElementById('product-discount');
        const iconPreview = document.getElementById('product-icon-preview');
        const deliveryEl = document.getElementById('delivery-type');
        const customTimeEl = document.getElementById('custom-time');
        const customTimeGroup = document.getElementById('custom-time-group');

        if (nameEl) nameEl.value = product.name;
        if (priceEl) priceEl.value = product.price;
        if (currencyEl) currencyEl.value = product.currency;
        if (discountEl) discountEl.value = product.discount || '';
        if (iconPreview) iconPreview.src = product.iconUrl || '';
        if (deliveryEl) deliveryEl.value = product.deliveryType;
        if (customTimeEl) customTimeEl.value = product.deliveryTime || '';
        if (customTimeGroup) customTimeGroup.classList.toggle('hidden', product.deliveryType === 'instant');

    } else {
        if (title) title.textContent = 'Add Product';
        AdminState.editingItem = null;

        // Reset form
        const nameEl = document.getElementById('product-name');
        const priceEl = document.getElementById('product-price');
        const discountEl = document.getElementById('product-discount');
        const iconPreview = document.getElementById('product-icon-preview');
        const deliveryEl = document.getElementById('delivery-type');
        const customTimeEl = document.getElementById('custom-time');
        const customTimeGroup = document.getElementById('custom-time-group');

        if (nameEl) nameEl.value = '';
        if (priceEl) priceEl.value = '';
        if (discountEl) discountEl.value = '';
        if (iconPreview) iconPreview.src = '';
        if (deliveryEl) deliveryEl.value = 'instant';
        if (customTimeEl) customTimeEl.value = '';
        if (customTimeGroup) customTimeGroup.classList.add('hidden');
    }

    modal.classList.remove('hidden');
}

function closeProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (modal) modal.classList.add('hidden');
    AdminState.editingItem = null;
}

async function saveProduct() {
    const categoryId = document.getElementById('product-category')?.value;
    const name = document.getElementById('product-name')?.value?.trim();
    const price = document.getElementById('product-price')?.value;
    const currency = document.getElementById('product-currency')?.value;
    const discount = document.getElementById('product-discount')?.value;
    const iconFile = document.getElementById('product-icon-file')?.files[0];
    const deliveryType = document.getElementById('delivery-type')?.value;
    const deliveryTime = document.getElementById('custom-time')?.value;

    if (!categoryId || !name || !price) {
        Toast.warning('Please fill in required fields');
        return;
    }

    Loading.show('Saving product...');

    try {
        let iconUrl = AdminState.editingItem?.iconUrl || '';

        if (iconFile) {
            iconUrl = await fileToBase64(iconFile);
        }

        const productData = {
            categoryId,
            name,
            price: parseFloat(price),
            currency: currency || 'MMK',
            discount: parseFloat(discount) || 0,
            iconUrl,
            deliveryType: deliveryType || 'instant',
            deliveryTime: deliveryType === 'instant' ? '' : deliveryTime
        };

        if (AdminState.editingItem) {
            await db.updateProduct(AdminState.editingItem.id, productData);
            Toast.success('Product updated');
        } else {
            await db.addProduct(productData);
            Toast.success('Product added');
        }

        TelegramBot.notifyAdmin(`📦 Product ${AdminState.editingItem ? 'updated' : 'added'}: ${name}`);

        Loading.hide();
        closeProductModal();
        loadProductsData();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to save product');
    }
}

function editProduct(productId) {
    openProductModal(productId);
}

async function deleteProduct(productId) {
    const confirmed = await TelegramManager.showConfirm('Delete this product?');
    if (!confirmed) return;

    Loading.show('Deleting...');

    try {
        await db.deleteProduct(productId);
        Loading.hide();
        Toast.success('Product deleted');
        loadProductsData();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to delete');
    }
}

// ========================================
// Categories
// ========================================
function loadCategoriesData() {
    loadCategoriesList();
    loadInputTablesList();
}

function loadCategoriesList() {
    const categories = db.getCategories();
    const list = document.getElementById('categories-admin-list');

    if (!list) return;

    if (!categories || categories.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon"><i class="fas fa-layer-group"></i></div>
                <h3>No Categories</h3>
            </div>
        `;
        return;
    }

    list.innerHTML = categories.map(category => `
        <div class="category-admin-card">
            <img src="${category.iconUrl || ''}" alt="${category.name}">
            <div class="category-admin-info">
                <h4>${category.name} ${category.flag || ''}</h4>
                <p>${db.getProductsByCategory(category.id).length} products · ${category.totalSold || 0} sold</p>
            </div>
            <div class="category-admin-actions">
                <button onclick="editCategory('${category.id}')"><i class="fas fa-edit"></i></button>
                <button class="danger" onclick="deleteCategory('${category.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function loadInputTablesList() {
    const inputTables = db.getInputTables();
    const list = document.getElementById('input-tables-admin-list');

    if (!list) return;

    if (!inputTables || inputTables.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary);">No input tables</p>';
        return;
    }

    list.innerHTML = inputTables.map(input => {
        const category = db.getCategory(input.categoryId);
        return `
            <div class="input-table-admin-item">
                <div class="input-table-admin-item-info">
                    <h5>${input.name}</h5>
                    <p>${category?.name || 'Unknown'} · "${input.placeholder}"</p>
                </div>
                <div class="category-admin-actions">
                    <button onclick="editInputTable('${input.id}')"><i class="fas fa-edit"></i></button>
                    <button class="danger" onclick="deleteInputTable('${input.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('category-modal');
    const title = document.getElementById('category-modal-title');

    if (!modal) return;

    if (categoryId) {
        const category = db.getCategory(categoryId);
        if (!category) return;

        if (title) title.textContent = 'Edit Category';
        AdminState.editingItem = category;

        const nameEl = document.getElementById('category-name');
        const flagEl = document.getElementById('category-flag');
        const discountEl = document.getElementById('has-discount');
        const iconPreview = document.getElementById('category-icon-preview');

        if (nameEl) nameEl.value = category.name;
        if (flagEl) flagEl.value = category.flag || '';
        if (discountEl) discountEl.checked = category.hasDiscount;
        if (iconPreview) iconPreview.src = category.iconUrl || '';

    } else {
        if (title) title.textContent = 'Add Category';
        AdminState.editingItem = null;

        const nameEl = document.getElementById('category-name');
        const flagEl = document.getElementById('category-flag');
        const discountEl = document.getElementById('has-discount');
        const iconPreview = document.getElementById('category-icon-preview');

        if (nameEl) nameEl.value = '';
        if (flagEl) flagEl.value = '';
        if (discountEl) discountEl.checked = false;
        if (iconPreview) iconPreview.src = '';
    }

    modal.classList.remove('hidden');
}

function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) modal.classList.add('hidden');
    AdminState.editingItem = null;
}

async function saveCategory() {
    const name = document.getElementById('category-name')?.value?.trim();
    const flag = document.getElementById('category-flag')?.value;
    const hasDiscount = document.getElementById('has-discount')?.checked;
    const iconFile = document.getElementById('category-icon-file')?.files[0];

    if (!name) {
        Toast.warning('Please enter category name');
        return;
    }

    Loading.show('Saving category...');

    try {
        let iconUrl = AdminState.editingItem?.iconUrl || '';

        if (iconFile) {
            iconUrl = await fileToBase64(iconFile);
        }

        const categoryData = { name, flag, hasDiscount, iconUrl };

        if (AdminState.editingItem) {
            await db.updateCategory(AdminState.editingItem.id, categoryData);
            Toast.success('Category updated');
        } else {
            await db.addCategory(categoryData);
            Toast.success('Category added');
        }

        TelegramBot.notifyAdmin(`📁 Category ${AdminState.editingItem ? 'updated' : 'added'}: ${name}`);

        Loading.hide();
        closeCategoryModal();
        loadCategoriesData();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to save category');
    }
}

function editCategory(categoryId) {
    openCategoryModal(categoryId);
}

async function deleteCategory(categoryId) {
    const category = db.getCategory(categoryId);
    const products = db.getProductsByCategory(categoryId);

    const confirmed = await TelegramManager.showConfirm(`Delete "${category?.name}"? This will also delete ${products.length} products.`);
    if (!confirmed) return;

    Loading.show('Deleting...');

    try {
        await db.deleteCategory(categoryId);
        Loading.hide();
        Toast.success('Category deleted');
        loadCategoriesData();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to delete');
    }
}

// Input Tables
function openInputTableModal(inputId = null) {
    const modal = document.getElementById('input-table-modal');
    const categorySelect = document.getElementById('input-category');

    if (!modal) return;

    // Load categories
    const categories = db.getCategories();
    if (categorySelect) {
        categorySelect.innerHTML = categories.map(c => `
            <option value="${c.id}">${c.name}</option>
        `).join('');
    }

    if (inputId) {
        const input = db.getInputTables().find(i => i.id === inputId);
        if (!input) return;

        AdminState.editingItem = input;
        if (categorySelect) categorySelect.value = input.categoryId;
        
        const nameEl = document.getElementById('input-name');
        const placeholderEl = document.getElementById('input-placeholder');
        
        if (nameEl) nameEl.value = input.name;
        if (placeholderEl) placeholderEl.value = input.placeholder;
    } else {
        AdminState.editingItem = null;
        
        const nameEl = document.getElementById('input-name');
        const placeholderEl = document.getElementById('input-placeholder');
        
        if (nameEl) nameEl.value = '';
        if (placeholderEl) placeholderEl.value = '';
    }

    modal.classList.remove('hidden');
}

function closeInputTableModal() {
    const modal = document.getElementById('input-table-modal');
    if (modal) modal.classList.add('hidden');
    AdminState.editingItem = null;
}

async function saveInputTable() {
    const categoryId = document.getElementById('input-category')?.value;
    const name = document.getElementById('input-name')?.value?.trim();
    const placeholder = document.getElementById('input-placeholder')?.value?.trim();

    if (!categoryId || !name) {
        Toast.warning('Please fill in required fields');
        return;
    }

    Loading.show('Saving...');

    try {
        const inputData = { categoryId, name, placeholder };

        if (AdminState.editingItem) {
            await db.updateInputTable(AdminState.editingItem.id, inputData);
            Toast.success('Input table updated');
        } else {
            await db.addInputTable(inputData);
            Toast.success('Input table added');
        }

        Loading.hide();
        closeInputTableModal();
        loadInputTablesList();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to save');
    }
}

function editInputTable(inputId) {
    openInputTableModal(inputId);
}

async function deleteInputTable(inputId) {
    const confirmed = await TelegramManager.showConfirm('Delete this input table?');
    if (!confirmed) return;

    Loading.show('Deleting...');

    try {
        await db.deleteInputTable(inputId);
        Loading.hide();
        Toast.success('Deleted');
        loadInputTablesList();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to delete');
    }
}

// ========================================
// Banners
// ========================================
function loadBannersData() {
    loadBannersType1();
    loadBannersType2();
    loadMarqueeText();
}

function switchBannerType(type) {
    document.querySelectorAll('.banner-tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    const type1El = document.getElementById('type1-banners');
    const type2El = document.getElementById('type2-banners');

    if (type1El) type1El.classList.toggle('hidden', type !== 'type1');
    if (type2El) type2El.classList.toggle('hidden', type !== 'type2');

    AdminState.bannerType = type;
}

function loadBannersType1() {
    const banners = db.getBannersType1();
    const list = document.getElementById('type1-banners-list');

    if (!list) return;

    if (!banners || banners.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary);">No home banners</p>';
        return;
    }

    list.innerHTML = banners.map(banner => `
        <div class="banner-admin-card">
            <img src="${banner.imageUrl}" alt="Banner">
            <div class="banner-admin-card-info">
                <p>Added: ${formatRelativeTime(banner.createdAt)}</p>
                <div class="banner-admin-card-actions">
                    <button class="danger" onclick="deleteBanner('${banner.id}', 'type1')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function loadBannersType2() {
    const banners = db.getBannersType2();
    const list = document.getElementById('type2-banners-list');

    if (!list) return;

    if (!banners || banners.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary);">No category banners</p>';
        return;
    }

    list.innerHTML = banners.map(banner => {
        const category = db.getCategory(banner.categoryId);
        return `
            <div class="banner-admin-card">
                <img src="${banner.imageUrl}" alt="Banner">
                <div class="banner-admin-card-info">
                    <p>Category: ${category?.name || 'Unknown'}</p>
                    <div class="banner-admin-card-actions">
                        <button class="danger" onclick="deleteBanner('${banner.id}', 'type2')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadMarqueeText() {
    const settings = db.getSettings();
    const textEl = document.getElementById('marquee-text');
    if (textEl) textEl.value = settings.marqueeText || '';
}

function openBannerModal(type) {
    const modal = document.getElementById('banner-modal');
    const title = document.getElementById('banner-modal-title');
    const categoryGroup = document.getElementById('banner-category-group');
    const guideGroup = document.getElementById('banner-guide-group');
    const categorySelect = document.getElementById('banner-category');
    const typeInput = document.getElementById('banner-type');
    const bannerPreview = document.getElementById('banner-preview');
    const guideText = document.getElementById('banner-guide');

    if (!modal) return;

    if (typeInput) typeInput.value = type;
    if (bannerPreview) bannerPreview.src = '';
    if (guideText) guideText.value = '';

    if (type === 'type1') {
        if (title) title.textContent = 'Add Home Banner';
        if (categoryGroup) categoryGroup.classList.add('hidden');
        if (guideGroup) guideGroup.classList.add('hidden');
    } else {
        if (title) title.textContent = 'Add Category Banner';
        if (categoryGroup) categoryGroup.classList.remove('hidden');
        if (guideGroup) guideGroup.classList.remove('hidden');

        const categories = db.getCategories();
        if (categorySelect) {
            categorySelect.innerHTML = categories.map(c => `
                <option value="${c.id}">${c.name}</option>
            `).join('');
        }
    }

    modal.classList.remove('hidden');
}

function closeBannerModal() {
    const modal = document.getElementById('banner-modal');
    if (modal) modal.classList.add('hidden');
}

async function saveBanner() {
    const type = document.getElementById('banner-type')?.value;
    const bannerFile = document.getElementById('banner-file')?.files[0];
    const categoryId = document.getElementById('banner-category')?.value;
    const guideText = document.getElementById('banner-guide')?.value;

    if (!bannerFile) {
        Toast.warning('Please upload a banner image');
        return;
    }

    Loading.show('Uploading...');

    try {
        const imageUrl = await fileToBase64(bannerFile);

        if (type === 'type1') {
            await db.addBannerType1({ imageUrl });
        } else {
            await db.addBannerType2({ categoryId, imageUrl, guideText });
        }

        TelegramBot.notifyAdmin(`🖼️ New ${type === 'type1' ? 'home' : 'category'} banner added`);

        Loading.hide();
        Toast.success('Banner added');
        closeBannerModal();
        loadBannersData();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to upload');
    }
}

async function deleteBanner(bannerId, type) {
    const confirmed = await TelegramManager.showConfirm('Delete this banner?');
    if (!confirmed) return;

    Loading.show('Deleting...');

    try {
        await db.deleteBanner(bannerId, type);
        Loading.hide();
        Toast.success('Banner deleted');
        loadBannersData();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to delete');
    }
}

async function saveMarqueeText() {
    const text = document.getElementById('marquee-text')?.value?.trim();

    Loading.show('Saving...');

    try {
        await db.updateSettings({ marqueeText: text });
        Loading.hide();
        Toast.success('Saved');
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to save');
    }
}

// ========================================
// Payments
// ========================================
function loadPaymentsData() {
    loadPendingTopupsAdmin();
    loadPaymentMethodsList();
}

function loadPendingTopupsAdmin() {
    const topups = db.getPendingTopupRequests();
    const list = document.getElementById('topups-admin-list');

    if (!list) return;

    if (!topups || topups.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary); text-align: center;">No pending requests</p>';
        return;
    }

    list.innerHTML = topups.map(topup => {
        const user = db.getUser(topup.userId);
        return `
            <div class="topup-admin-card">
                <div class="topup-admin-header">
                    <img src="${getAvatarUrl(user)}" alt="User">
                    <div class="topup-admin-user">
                        <h4>${user?.firstName || 'User'}</h4>
                        <p>@${user?.username || 'N/A'}</p>
                    </div>
                    <span class="topup-admin-amount">${formatCurrency(topup.amount)}</span>
                </div>
                <div class="topup-admin-body">
                    ${topup.receiptUrl ? `
                        <div class="topup-receipt">
                            <img src="${topup.receiptUrl}" alt="Receipt" style="max-height: 200px; width: 100%; object-fit: contain; border-radius: 8px; cursor: pointer;" onclick="window.open('${topup.receiptUrl}', '_blank')">
                        </div>
                    ` : ''}
                    <div class="topup-payment-info">
                        <p><span>Payment:</span> ${topup.paymentInfo?.name || 'N/A'}</p>
                        <p><span>Time:</span> ${formatDate(topup.createdAt, 'long')}</p>
                    </div>
                    <div class="topup-admin-actions">
                        <button class="approve-btn" onclick="approveTopup('${topup.id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="reject-btn" onclick="rejectTopup('${topup.id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function approveTopup(requestId) {
    const confirmed = await TelegramManager.showConfirm('Approve this top-up?');
    if (!confirmed) return;

    Loading.show('Approving...');

    try {
        const request = await db.approveTopupRequest(requestId);
        
        TelegramBot.sendUserNotification(request.userId, `
✅ <b>Top-up Approved!</b>

💰 Amount: ${formatCurrency(request.amount)}
💳 Payment: ${request.paymentInfo?.name}

Your balance has been updated.
        `.trim());

        Loading.hide();
        Toast.success('Top-up approved');
        loadPaymentsData();
        loadDashboardData();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to approve');
    }
}

async function rejectTopup(requestId) {
    const confirmed = await TelegramManager.showConfirm('Reject this top-up?');
    if (!confirmed) return;

    Loading.show('Rejecting...');

    try {
        const request = await db.rejectTopupRequest(requestId);
        
        TelegramBot.sendUserNotification(request.userId, `
❌ <b>Top-up Rejected</b>

💰 Amount: ${formatCurrency(request.amount)}
💳 Payment: ${request.paymentInfo?.name}

Please check your payment details and try again.
        `.trim());

        Loading.hide();
        Toast.success('Top-up rejected');
        loadPaymentsData();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to reject');
    }
}

function loadPaymentMethodsList() {
    const methods = db.getPaymentMethods();
    const list = document.getElementById('payment-methods-admin-list');

    if (!list) return;

    if (!methods || methods.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon"><i class="fas fa-credit-card"></i></div>
                <h3>No Payment Methods</h3>
            </div>
        `;
        return;
    }

    list.innerHTML = methods.map(method => `
        <div class="payment-admin-card">
            <img src="${method.iconUrl || ''}" alt="${method.name}">
            <div class="payment-admin-info">
                <h4>${method.name}</h4>
                <p>${method.address}</p>
                <p>Receiver: ${method.receiverName}</p>
            </div>
            <div class="payment-admin-actions category-admin-actions">
                <button onclick="editPaymentMethod('${method.id}')"><i class="fas fa-edit"></i></button>
                <button class="danger" onclick="deletePaymentMethod('${method.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function openPaymentModal(paymentId = null) {
    const modal = document.getElementById('payment-modal');

    if (!modal) return;

    if (paymentId) {
        const method = db.getPaymentMethod(paymentId);
        if (!method) return;

        AdminState.editingItem = method;
        
        const nameEl = document.getElementById('pay-name');
        const addressEl = document.getElementById('pay-address');
        const receiverEl = document.getElementById('pay-receiver');
        const noteEl = document.getElementById('pay-note');
        const iconPreview = document.getElementById('payment-icon-preview');

        if (nameEl) nameEl.value = method.name;
        if (addressEl) addressEl.value = method.address;
        if (receiverEl) receiverEl.value = method.receiverName;
        if (noteEl) noteEl.value = method.note || '';
        if (iconPreview) iconPreview.src = method.iconUrl || '';
    } else {
        AdminState.editingItem = null;
        
        const nameEl = document.getElementById('pay-name');
        const addressEl = document.getElementById('pay-address');
        const receiverEl = document.getElementById('pay-receiver');
        const noteEl = document.getElementById('pay-note');
        const iconPreview = document.getElementById('payment-icon-preview');

        if (nameEl) nameEl.value = '';
        if (addressEl) addressEl.value = '';
        if (receiverEl) receiverEl.value = '';
        if (noteEl) noteEl.value = '';
        if (iconPreview) iconPreview.src = '';
    }

    modal.classList.remove('hidden');
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.classList.add('hidden');
    AdminState.editingItem = null;
}

async function savePayment() {
    const name = document.getElementById('pay-name')?.value?.trim();
    const address = document.getElementById('pay-address')?.value?.trim();
    const receiverName = document.getElementById('pay-receiver')?.value?.trim();
    const note = document.getElementById('pay-note')?.value?.trim();
    const iconFile = document.getElementById('payment-icon-file')?.files[0];

    if (!name || !address || !receiverName) {
        Toast.warning('Please fill in required fields');
        return;
    }

    Loading.show('Saving...');

    try {
        let iconUrl = AdminState.editingItem?.iconUrl || '';

        if (iconFile) {
            iconUrl = await fileToBase64(iconFile);
        }

        const paymentData = { name, address, receiverName, note, iconUrl };

        if (AdminState.editingItem) {
            await db.updatePaymentMethod(AdminState.editingItem.id, paymentData);
            Toast.success('Payment method updated');
        } else {
            await db.addPaymentMethod(paymentData);
            Toast.success('Payment method added');
        }

        Loading.hide();
        closePaymentModal();
        loadPaymentMethodsList();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to save');
    }
}

function editPaymentMethod(paymentId) {
    openPaymentModal(paymentId);
}

async function deletePaymentMethod(paymentId) {
    const confirmed = await TelegramManager.showConfirm('Delete this payment method?');
    if (!confirmed) return;

    Loading.show('Deleting...');

    try {
        await db.deletePaymentMethod(paymentId);
        Loading.hide();
        Toast.success('Deleted');
        loadPaymentMethodsList();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to delete');
    }
}

// ========================================
// Settings
// ========================================
function loadSettingsData() {
    const settings = db.getSettings();

    const logoEl = document.getElementById('current-logo');
    const nameEl = document.getElementById('website-name');

    if (logoEl) logoEl.src = settings.logoUrl || '';
    if (nameEl) nameEl.value = settings.siteName || '';
}

function previewLogo(input) {
    const file = input.files[0];
    if (!file) return;

    fileToBase64(file).then(base64 => {
        const preview = document.getElementById('current-logo');
        if (preview) preview.src = base64;
    });
}

async function saveSettings() {
    const siteName = document.getElementById('website-name')?.value?.trim();
    const logoFile = document.getElementById('logo-file')?.files[0];

    if (!siteName) {
        Toast.warning('Please enter website name');
        return;
    }

    Loading.show('Saving...');

    try {
        const settingsData = { siteName };

        if (logoFile) {
            settingsData.logoUrl = await fileToBase64(logoFile);
        }

        await db.updateSettings(settingsData);

        Loading.hide();
        Toast.success('Settings saved');

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to save');
    }
}

// ========================================
// Initialize
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin DOM loaded');
    setTimeout(() => {
        initAdmin();
    }, 100);
});

// Make functions global
window.authenticateAdmin = authenticateAdmin;
window.switchSection = switchSection;
window.openUserDetail = openUserDetail;
window.closeUserDetailModal = closeUserDetailModal;
window.banUser = banUser;
window.unbanUser = unbanUser;
window.openBroadcastModal = openBroadcastModal;
window.closeBroadcastModal = closeBroadcastModal;
window.sendBroadcast = sendBroadcast;
window.approveOrder = approveOrder;
window.rejectOrder = rejectOrder;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.saveProduct = saveProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.saveCategory = saveCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.openInputTableModal = openInputTableModal;
window.closeInputTableModal = closeInputTableModal;
window.saveInputTable = saveInputTable;
window.editInputTable = editInputTable;
window.deleteInputTable = deleteInputTable;
window.switchBannerType = switchBannerType;
window.openBannerModal = openBannerModal;
window.closeBannerModal = closeBannerModal;
window.saveBanner = saveBanner;
window.deleteBanner = deleteBanner;
window.saveMarqueeText = saveMarqueeText;
window.approveTopup = approveTopup;
window.rejectTopup = rejectTopup;
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.savePayment = savePayment;
window.editPaymentMethod = editPaymentMethod;
window.deletePaymentMethod = deletePaymentMethod;
window.previewLogo = previewLogo;
window.saveSettings = saveSettings;
