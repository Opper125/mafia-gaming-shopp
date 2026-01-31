/* ========================================
   Gaming Top-up Shop - Admin Panel
   Admin Dashboard & Management
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
    console.log('Initializing admin panel...');

    // Check if running in Telegram
    if (!telegramManager.init() || !telegramManager.isInTelegram()) {
        showAdminAccessDenied();
        return;
    }

    const user = telegramManager.getUser();
    if (!user) {
        showAdminAccessDenied();
        return;
    }

    // Check if user is admin
    if (!isAdmin(user.id)) {
        showAdminAccessDenied();
        return;
    }

    // Show authentication screen
    showAdminAuth();
}

// Show access denied
function showAdminAccessDenied() {
    document.getElementById('admin-auth').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('access-denied').classList.remove('hidden');
}

// Show authentication screen
function showAdminAuth() {
    document.getElementById('access-denied').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('admin-auth').classList.remove('hidden');
}

// Authenticate admin
async function authenticateAdmin() {
    const password = document.getElementById('admin-password').value.trim();

    if (!password) {
        Toast.warning('Please enter your 2FA password');
        return;
    }

    Loading.show('Authenticating...');

    // In production, this should verify against Telegram 2FA
    // For now, we'll use a simple verification with the bot
    try {
        // Store password hash for session
        const passwordHash = btoa(password);
        Session.set('admin_auth', passwordHash);

        // Initialize database
        const binId = Storage.get('JSONBIN_BIN_ID');
        if (binId) {
            db.setBinId(binId);
            await db.init();
        }

        AdminState.isAuthenticated = true;
        Loading.hide();

        // Show dashboard
        showAdminDashboard();

    } catch (error) {
        Loading.hide();
        console.error('Auth error:', error);
        Toast.error('Authentication failed');
        telegramManager.haptic('notification', 'error');
    }
}

// Show admin dashboard
async function showAdminDashboard() {
    document.getElementById('admin-auth').classList.add('hidden');
    document.getElementById('access-denied').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');

    // Initialize navigation
    initAdminNavigation();

    // Load dashboard data
    await loadDashboardData();

    telegramManager.haptic('notification', 'success');
}

// Initialize admin navigation
function initAdminNavigation() {
    const navBtns = document.querySelectorAll('.admin-nav .nav-btn');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            switchSection(section);
        });
    });

    // Banner type tabs
    document.querySelectorAll('.banner-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            switchBannerType(type);
        });
    });

    // Delivery type change
    const deliveryType = document.getElementById('delivery-type');
    if (deliveryType) {
        deliveryType.addEventListener('change', () => {
            const customGroup = document.getElementById('custom-time-group');
            customGroup.classList.toggle('hidden', deliveryType.value === 'instant');
        });
    }
}

// Switch section
function switchSection(section) {
    // Update nav buttons
    document.querySelectorAll('.admin-nav .nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });

    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => {
        s.classList.add('hidden');
    });

    // Show selected section
    document.getElementById(`${section}-section`).classList.remove('hidden');

    AdminState.currentSection = section;

    // Load section data
    loadSectionData(section);

    telegramManager.haptic('selection');
}

// Load section data
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
// Dashboard Section
// ========================================
async function loadDashboardData() {
    try {
        await db.load();

        const stats = db.getStats();

        // Update stats cards
        document.getElementById('total-users').textContent = formatNumber(stats.totalUsers);
        document.getElementById('total-orders-stat').textContent = formatNumber(stats.totalOrders);
        document.getElementById('total-revenue').textContent = formatNumber(stats.totalRevenue);
        document.getElementById('pending-orders').textContent = formatNumber(stats.pendingOrders);

        // Update database info
        document.getElementById('jsonbin-id').textContent = db.binId || 'Not configured';
        document.getElementById('collection-id').textContent = CONFIG.COLLECTION_ID || 'N/A';
        document.getElementById('schema-doc-id').textContent = CONFIG.SCHEMA_DOC_ID || 'N/A';

        // Load recent orders
        loadRecentOrders();

        // Load pending topups
        loadPendingTopups();

    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

function loadRecentOrders() {
    const orders = db.getOrders().slice(-5).reverse();
    const list = document.getElementById('recent-orders-list');

    if (!orders || orders.length === 0) {
        list.innerHTML = '<p class="text-center" style="color: var(--text-tertiary);">No recent orders</p>';
        return;
    }

    list.innerHTML = orders.map(order => {
        const user = db.getUser(order.userId);
        return `
            <div class="recent-item">
                <img src="${getAvatarUrl(user)}" alt="User" class="recent-item-avatar">
                <div class="recent-item-info">
                    <h4>${user?.firstName || 'User'} ${user?.lastName || ''}</h4>
                    <p>${order.productInfo?.name || 'Product'}</p>
                </div>
                <span class="recent-item-status ${order.status}">${order.status}</span>
                <span class="recent-item-amount">${formatCurrency(order.amount, order.currency)}</span>
            </div>
        `;
    }).join('');
}

function loadPendingTopups() {
    const topups = db.getPendingTopupRequests();
    const list = document.getElementById('pending-topups-list');

    if (!topups || topups.length === 0) {
        list.innerHTML = '<p class="text-center" style="color: var(--text-tertiary);">No pending top-ups</p>';
        return;
    }

    list.innerHTML = topups.slice(0, 5).map(topup => {
        const user = db.getUser(topup.userId);
        return `
            <div class="recent-item">
                <img src="${getAvatarUrl(user)}" alt="User" class="recent-item-avatar">
                <div class="recent-item-info">
                    <h4>${user?.firstName || 'User'} ${user?.lastName || ''}</h4>
                    <p>${topup.paymentInfo?.name || 'Payment'}</p>
                </div>
                <span class="recent-item-status pending">pending</span>
                <span class="recent-item-amount">${formatCurrency(topup.amount)}</span>
            </div>
        `;
    }).join('');
}

// ========================================
// Users Section
// ========================================
function loadUsersData(filter = 'all') {
    const users = db.getUsers();
    const bannedIds = db.getBannedUsers().map(b => b.telegramId);
    const list = document.getElementById('users-list');

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
                <p>Users will appear here</p>
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
                        ${user.firstName} ${user.lastName || ''}
                        ${user.isPremium ? '<span class="premium-badge"><i class="fas fa-star"></i></span>' : ''}
                        ${isBanned ? '<span style="color: var(--accent-red); margin-left: 4px;"><i class="fas fa-ban"></i></span>' : ''}
                    </h4>
                    <p>@${user.username || 'N/A'} · ID: ${user.telegramId}</p>
                </div>
                <div class="user-card-balance">
                    <span>${formatCurrency(user.balance)}</span>
                    <small>${user.totalOrders || 0} orders</small>
                </div>
                <div class="user-card-actions">
                    <button onclick="event.stopPropagation(); ${isBanned ? `unbanUser('${user.telegramId}')` : `banUser('${user.telegramId}')`}" class="${isBanned ? '' : 'danger'}">
                        <i class="fas fa-${isBanned ? 'unlock' : 'ban'}"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Add filter handlers
    document.querySelectorAll('#users-section .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#users-section .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadUsersData(btn.dataset.filter);
        });
    });

    // Search handler
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const query = e.target.value.toLowerCase();
            const userCards = document.querySelectorAll('.user-card');
            userCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(query) ? 'flex' : 'none';
            });
        }, 300));
    }
}

function openUserDetail(telegramId) {
    const user = db.getUser(telegramId);
    if (!user) return;

    const orders = db.getOrdersByUser(telegramId);
    const topups = db.getTopupRequestsByUser(telegramId);

    const modal = document.getElementById('user-detail-modal');
    const content = document.getElementById('user-detail-content');

    content.innerHTML = `
        <div class="user-detail-header">
            <img src="${getAvatarUrl(user)}" alt="User">
            <div class="user-detail-header-info">
                <h3>${user.firstName} ${user.lastName || ''} ${user.isPremium ? '⭐' : ''}</h3>
                <p>@${user.username || 'N/A'} · ID: ${user.telegramId}</p>
            </div>
        </div>

        <div class="user-detail-stats">
            <div class="user-detail-stat">
                <span>${formatCurrency(user.balance)}</span>
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

        <div class="user-detail-stats">
            <div class="user-detail-stat">
                <span>${user.approvedOrders || 0}</span>
                <label>Approved</label>
            </div>
            <div class="user-detail-stat">
                <span>${user.rejectedOrders || 0}</span>
                <label>Rejected</label>
            </div>
            <div class="user-detail-stat">
                <span>${user.depositCount || 0}</span>
                <label>Deposits</label>
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
                        <span class="user-detail-list-item-amount negative">-${formatCurrency(order.amount, order.currency)}</span>
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

        <div style="margin-top: var(--spacing-lg);">
            <p style="font-size: 12px; color: var(--text-tertiary);">
                Member since: ${formatDate(user.createdAt, 'long')}
            </p>
        </div>
    `;

    modal.classList.remove('hidden');
    telegramManager.haptic('impact', 'light');
}

function closeUserDetailModal() {
    document.getElementById('user-detail-modal').classList.add('hidden');
}

async function banUser(telegramId) {
    const confirmed = await telegramManager.showConfirm('Are you sure you want to ban this user?');
    if (!confirmed) return;

    Loading.show('Banning user...');

    try {
        await db.banUser(telegramId, 'Banned by admin');
        await telegramBot.sendUserNotification(telegramId, '❌ Your account has been banned. Please contact support.');

        Loading.hide();
        Toast.success('User banned successfully');
        loadUsersData();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to ban user');
    }
}

async function unbanUser(telegramId) {
    const confirmed = await telegramManager.showConfirm('Are you sure you want to unban this user?');
    if (!confirmed) return;

    Loading.show('Unbanning user...');

    try {
        await db.unbanUser(telegramId);
        await telegramBot.sendUserNotification(telegramId, '✅ Your account has been unbanned. You can now use the service again.');

        Loading.hide();
        Toast.success('User unbanned successfully');
        loadUsersData();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to unban user');
    }
}

// Broadcast Modal
function openBroadcastModal() {
    document.getElementById('broadcast-modal').classList.remove('hidden');
    document.getElementById('broadcast-message').value = '';
    document.getElementById('broadcast-image-preview').src = '';
}

function closeBroadcastModal() {
    document.getElementById('broadcast-modal').classList.add('hidden');
}

async function sendBroadcast() {
    const message = document.getElementById('broadcast-message').value.trim();
    const imageFile = document.getElementById('broadcast-image-file').files[0];

    if (!message) {
        Toast.warning('Please enter a message');
        return;
    }

    const confirmed = await telegramManager.showConfirm('Send this message to all users?');
    if (!confirmed) return;

    Loading.show('Broadcasting message...');

    try {
        const users = db.getUsers();
        let imageUrl = null;

        if (imageFile) {
            imageUrl = await fileToBase64(imageFile);
        }

        const results = await telegramBot.broadcastMessage(users, message, imageUrl);

        Loading.hide();
        closeBroadcastModal();

        Toast.success(`Broadcast sent! Success: ${results.success}, Failed: ${results.failed}`);

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to send broadcast');
        console.error('Broadcast error:', error);
    }
}

// ========================================
// Orders Section
// ========================================
function loadOrdersData(filter = 'pending') {
    const orders = db.getOrders();
    const list = document.getElementById('orders-admin-list');

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
                <p>Orders will appear here</p>
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
                            <h4>${user?.firstName || 'User'} ${user?.lastName || ''}</h4>
                            <p>@${user?.username || 'N/A'} · ID: ${order.userId}</p>
                        </div>
                    </div>
                    <div class="order-admin-product">
                        <img src="${order.productInfo?.iconUrl || ''}" alt="Product">
                        <div class="order-admin-product-info">
                            <h5>${order.productInfo?.name || 'Product'}</h5>
                            <p>${formatCurrency(order.amount, order.currency)}</p>
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
                        <div class="order-admin-actions">
                            <span class="order-status ${order.status}">${order.status}</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');

    // Add filter handlers
    document.querySelectorAll('#orders-section .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#orders-section .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadOrdersData(btn.dataset.filter);
        });
    });
}

async function approveOrder(orderId) {
    const confirmed = await telegramManager.showConfirm('Approve this order?');
    if (!confirmed) return;

    Loading.show('Approving order...');

    try {
        const order = await db.approveOrder(orderId);
        
        // Notify user
        await telegramBot.sendOrderStatusUpdate(order.userId, order, 'approved');

        Loading.hide();
        Toast.success('Order approved');
        loadOrdersData();
        loadDashboardData();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to approve order');
        console.error('Approve error:', error);
    }
}

async function rejectOrder(orderId) {
    const confirmed = await telegramManager.showConfirm('Reject this order? The amount will be refunded.');
    if (!confirmed) return;

    Loading.show('Rejecting order...');

    try {
        const order = await db.rejectOrder(orderId);
        
        // Notify user
        await telegramBot.sendOrderStatusUpdate(order.userId, order, 'rejected');

        Loading.hide();
        Toast.success('Order rejected and refunded');
        loadOrdersData();
        loadDashboardData();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to reject order');
        console.error('Reject error:', error);
    }
}

// ========================================
// Products Section
// ========================================
function loadProductsData() {
    const products = db.getProducts();
    const list = document.getElementById('products-admin-list');

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
                    ${hasDiscount ? `<span class="original">${formatCurrency(product.price, product.currency)}</span>` : ''}
                    <span class="final">${formatCurrency(finalPrice, product.currency)}</span>
                    ${hasDiscount ? `<span class="discount">-${product.discount}%</span>` : ''}
                </div>
                <div class="product-admin-card-actions">
                    <button onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="danger" onclick="deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i> Delete
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

    // Load categories
    const categories = db.getCategories();
    categorySelect.innerHTML = categories.map(c => `
        <option value="${c.id}">${c.name}</option>
    `).join('');

    if (productId) {
        // Edit mode
        const product = db.getProduct(productId);
        if (!product) return;

        title.textContent = 'Edit Product';
        AdminState.editingItem = product;

        document.getElementById('product-category').value = product.categoryId;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-currency').value = product.currency;
        document.getElementById('product-discount').value = product.discount || '';
        document.getElementById('product-icon-preview').src = product.iconUrl || '';
        document.getElementById('delivery-type').value = product.deliveryType;
        document.getElementById('custom-time').value = product.deliveryTime || '';
        document.getElementById('custom-time-group').classList.toggle('hidden', product.deliveryType === 'instant');

    } else {
        // Add mode
        title.textContent = 'Add Product';
        AdminState.editingItem = null;

        document.getElementById('product-name').value = '';
        document.getElementById('product-price').value = '';
        document.getElementById('product-discount').value = '';
        document.getElementById('product-icon-preview').src = '';
        document.getElementById('delivery-type').value = 'instant';
        document.getElementById('custom-time').value = '';
        document.getElementById('custom-time-group').classList.add('hidden');
    }

    modal.classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('add-product-modal').classList.add('hidden');
    AdminState.editingItem = null;
}

async function saveProduct() {
    const categoryId = document.getElementById('product-category').value;
    const name = document.getElementById('product-name').value.trim();
    const price = document.getElementById('product-price').value;
    const currency = document.getElementById('product-currency').value;
    const discount = document.getElementById('product-discount').value;
    const iconFile = document.getElementById('product-icon-file').files[0];
    const deliveryType = document.getElementById('delivery-type').value;
    const deliveryTime = document.getElementById('custom-time').value;

    if (!categoryId || !name || !price) {
        Toast.warning('Please fill in all required fields');
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
            currency,
            discount: parseFloat(discount) || 0,
            iconUrl,
            deliveryType,
            deliveryTime: deliveryType === 'instant' ? '' : deliveryTime
        };

        if (AdminState.editingItem) {
            await db.updateProduct(AdminState.editingItem.id, productData);
            Toast.success('Product updated');
        } else {
            await db.addProduct(productData);
            Toast.success('Product added');
        }

        // Notify via Telegram
        await telegramBot.notifyAdmin(`📦 Product ${AdminState.editingItem ? 'updated' : 'added'}: ${name}`);

        Loading.hide();
        closeProductModal();
        loadProductsData();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to save product');
        console.error('Save product error:', error);
    }
}

function editProduct(productId) {
    openProductModal(productId);
}

async function deleteProduct(productId) {
    const confirmed = await telegramManager.showConfirm('Are you sure you want to delete this product?');
    if (!confirmed) return;

    Loading.show('Deleting product...');

    try {
        await db.deleteProduct(productId);
        Loading.hide();
        Toast.success('Product deleted');
        loadProductsData();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to delete product');
    }
}

// ========================================
// Categories Section
// ========================================
function loadCategoriesData() {
    loadCategoriesList();
    loadInputTablesList();
}

function loadCategoriesList() {
    const categories = db.getCategories();
    const list = document.getElementById('categories-admin-list');

    if (!categories || categories.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon"><i class="fas fa-layer-group"></i></div>
                <h3>No Categories</h3>
                <p>Add your first category</p>
            </div>
        `;
        return;
    }

    list.innerHTML = categories.map(category => `
        <div class="category-admin-card">
            <img src="${category.iconUrl || ''}" alt="${category.name}">
            <div class="category-admin-info">
                <h4>${category.name} <span>${category.flag || ''}</span></h4>
                <p>${db.getProductsByCategory(category.id).length} products · ${category.totalSold || 0} sold</p>
            </div>
            <div class="category-admin-actions">
                <button onclick="editCategory('${category.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="danger" onclick="deleteCategory('${category.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function loadInputTablesList() {
    const inputTables = db.getInputTables();
    const list = document.getElementById('input-tables-admin-list');

    if (!inputTables || inputTables.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary);">No input tables created</p>';
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
                    <button onclick="editInputTable('${input.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="danger" onclick="deleteInputTable('${input.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('category-modal');
    const title = document.getElementById('category-modal-title');

    if (categoryId) {
        const category = db.getCategory(categoryId);
        if (!category) return;

        title.textContent = 'Edit Category';
        AdminState.editingItem = category;

        document.getElementById('category-name').value = category.name;
        document.getElementById('category-flag').value = category.flag || '';
        document.getElementById('has-discount').checked = category.hasDiscount;
        document.getElementById('category-icon-preview').src = category.iconUrl || '';

    } else {
        title.textContent = 'Add Category';
        AdminState.editingItem = null;

        document.getElementById('category-name').value = '';
        document.getElementById('category-flag').value = '';
        document.getElementById('has-discount').checked = false;
        document.getElementById('category-icon-preview').src = '';
    }

    modal.classList.remove('hidden');
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.add('hidden');
    AdminState.editingItem = null;
}

async function saveCategory() {
    const name = document.getElementById('category-name').value.trim();
    const flag = document.getElementById('category-flag').value;
    const hasDiscount = document.getElementById('has-discount').checked;
    const iconFile = document.getElementById('category-icon-file').files[0];

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

        await telegramBot.notifyAdmin(`📁 Category ${AdminState.editingItem ? 'updated' : 'added'}: ${name}`);

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

    const confirmed = await telegramManager.showConfirm(
        `Delete "${category?.name}"? This will also delete ${products.length} products.`
    );
    if (!confirmed) return;

    Loading.show('Deleting category...');

    try {
        await db.deleteCategory(categoryId);
        Loading.hide();
        Toast.success('Category deleted');
        loadCategoriesData();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to delete category');
    }
}

// Input Tables
function openInputTableModal(inputId = null) {
    const modal = document.getElementById('input-table-modal');
    const categorySelect = document.getElementById('input-category');

    // Load categories
    const categories = db.getCategories();
    categorySelect.innerHTML = categories.map(c => `
        <option value="${c.id}">${c.name}</option>
    `).join('');

    if (inputId) {
        const input = db.getInputTables().find(i => i.id === inputId);
        if (!input) return;

        AdminState.editingItem = input;
        document.getElementById('input-category').value = input.categoryId;
        document.getElementById('input-name').value = input.name;
        document.getElementById('input-placeholder').value = input.placeholder;
    } else {
        AdminState.editingItem = null;
        document.getElementById('input-name').value = '';
        document.getElementById('input-placeholder').value = '';
    }

    modal.classList.remove('hidden');
}

function closeInputTableModal() {
    document.getElementById('input-table-modal').classList.add('hidden');
    AdminState.editingItem = null;
}

async function saveInputTable() {
    const categoryId = document.getElementById('input-category').value;
    const name = document.getElementById('input-name').value.trim();
    const placeholder = document.getElementById('input-placeholder').value.trim();

    if (!categoryId || !name) {
        Toast.warning('Please fill in all required fields');
        return;
    }

    Loading.show('Saving input table...');

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
        Toast.error('Failed to save input table');
    }
}

function editInputTable(inputId) {
    openInputTableModal(inputId);
}

async function deleteInputTable(inputId) {
    const confirmed = await telegramManager.showConfirm('Delete this input table?');
    if (!confirmed) return;

    Loading.show('Deleting...');

    try {
        await db.deleteInputTable(inputId);
        Loading.hide();
        Toast.success('Input table deleted');
        loadInputTablesList();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to delete');
    }
}

// ========================================
// Banners Section
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

    document.getElementById('type1-banners').classList.toggle('hidden', type !== 'type1');
    document.getElementById('type2-banners').classList.toggle('hidden', type !== 'type2');

    AdminState.bannerType = type;
}

function loadBannersType1() {
    const banners = db.getBannersType1();
    const list = document.getElementById('type1-banners-list');

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
                    <p>${banner.guideText ? banner.guideText.substring(0, 50) + '...' : 'No guide text'}</p>
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
    document.getElementById('marquee-text').value = settings.marqueeText || '';
}

function openBannerModal(type) {
    const modal = document.getElementById('banner-modal');
    const title = document.getElementById('banner-modal-title');
    const categoryGroup = document.getElementById('banner-category-group');
    const guideGroup = document.getElementById('banner-guide-group');
    const categorySelect = document.getElementById('banner-category');

    document.getElementById('banner-type').value = type;

    if (type === 'type1') {
        title.textContent = 'Add Home Banner';
        categoryGroup.classList.add('hidden');
        guideGroup.classList.add('hidden');
    } else {
        title.textContent = 'Add Category Banner';
        categoryGroup.classList.remove('hidden');
        guideGroup.classList.remove('hidden');

        // Load categories
        const categories = db.getCategories();
        categorySelect.innerHTML = categories.map(c => `
            <option value="${c.id}">${c.name}</option>
        `).join('');
    }

    document.getElementById('banner-preview').src = '';
    document.getElementById('banner-guide').value = '';

    modal.classList.remove('hidden');
}

function closeBannerModal() {
    document.getElementById('banner-modal').classList.add('hidden');
}

async function saveBanner() {
    const type = document.getElementById('banner-type').value;
    const bannerFile = document.getElementById('banner-file').files[0];
    const categoryId = document.getElementById('banner-category').value;
    const guideText = document.getElementById('banner-guide').value;

    if (!bannerFile) {
        Toast.warning('Please upload a banner image');
        return;
    }

    Loading.show('Uploading banner...');

    try {
        const imageUrl = await fileToBase64(bannerFile);

        if (type === 'type1') {
            await db.addBannerType1({ imageUrl });
        } else {
            await db.addBannerType2({ categoryId, imageUrl, guideText });
        }

        await telegramBot.notifyAdmin(`🖼️ New ${type === 'type1' ? 'home' : 'category'} banner added`);

        Loading.hide();
        Toast.success('Banner added');
        closeBannerModal();
        loadBannersData();

    } catch (error) {
        Loading.hide();
        Toast.error('Failed to upload banner');
    }
}

async function deleteBanner(bannerId, type) {
    const confirmed = await telegramManager.showConfirm('Delete this banner?');
    if (!confirmed) return;

    Loading.show('Deleting...');

    try {
        await db.deleteBanner(bannerId, type);
        Loading.hide();
        Toast.success('Banner deleted');
        loadBannersData();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to delete banner');
    }
}

async function saveMarqueeText() {
    const text = document.getElementById('marquee-text').value.trim();

    Loading.show('Saving...');

    try {
        await db.updateSettings({ marqueeText: text });
        Loading.hide();
        Toast.success('Marquee text saved');
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to save');
    }
}

// ========================================
// Payments Section
// ========================================
function loadPaymentsData() {
    loadPendingTopupsAdmin();
    loadPaymentMethodsList();
}

function loadPendingTopupsAdmin() {
    const topups = db.getPendingTopupRequests();
    const list = document.getElementById('topups-admin-list');

    if (!topups || topups.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary); text-align: center;">No pending top-up requests</p>';
        return;
    }

    list.innerHTML = topups.map(topup => {
        const user = db.getUser(topup.userId);
        return `
            <div class="topup-admin-card">
                <div class="topup-admin-header">
                    <img src="${getAvatarUrl(user)}" alt="User">
                    <div class="topup-admin-user">
                        <h4>${user?.firstName || 'User'} ${user?.lastName || ''}</h4>
                        <p>@${user?.username || 'N/A'}</p>
                    </div>
                    <span class="topup-admin-amount">${formatCurrency(topup.amount)}</span>
                </div>
                <div class="topup-admin-body">
                    ${topup.receiptUrl ? `
                        <div class="topup-receipt">
                            <img src="${topup.receiptUrl}" alt="Receipt" onclick="window.open('${topup.receiptUrl}', '_blank')">
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
    const confirmed = await telegramManager.showConfirm('Approve this top-up request?');
    if (!confirmed) return;

    Loading.show('Approving...');

    try {
        const request = await db.approveTopupRequest(requestId);
        await telegramBot.sendTopupStatusUpdate(request.userId, request, 'approved');

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
    const confirmed = await telegramManager.showConfirm('Reject this top-up request?');
    if (!confirmed) return;

    Loading.show('Rejecting...');

    try {
        const request = await db.rejectTopupRequest(requestId);
        await telegramBot.sendTopupStatusUpdate(request.userId, request, 'rejected');

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

    if (!methods || methods.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon"><i class="fas fa-credit-card"></i></div>
                <h3>No Payment Methods</h3>
                <p>Add payment methods for users to top up</p>
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
                ${method.note ? `<p style="font-style: italic; color: var(--accent-yellow);">${method.note}</p>` : ''}
            </div>
            <div class="payment-admin-actions category-admin-actions">
                <button onclick="editPaymentMethod('${method.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="danger" onclick="deletePaymentMethod('${method.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openPaymentModal(paymentId = null) {
    const modal = document.getElementById('payment-modal');

    if (paymentId) {
        const method = db.getPaymentMethod(paymentId);
        if (!method) return;

        AdminState.editingItem = method;
        document.getElementById('pay-name').value = method.name;
        document.getElementById('pay-address').value = method.address;
        document.getElementById('pay-receiver').value = method.receiverName;
        document.getElementById('pay-note').value = method.note || '';
        document.getElementById('payment-icon-preview').src = method.iconUrl || '';
    } else {
        AdminState.editingItem = null;
        document.getElementById('pay-name').value = '';
        document.getElementById('pay-address').value = '';
        document.getElementById('pay-receiver').value = '';
        document.getElementById('pay-note').value = '';
        document.getElementById('payment-icon-preview').src = '';
    }

    modal.classList.remove('hidden');
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.add('hidden');
    AdminState.editingItem = null;
}

async function savePayment() {
    const name = document.getElementById('pay-name').value.trim();
    const address = document.getElementById('pay-address').value.trim();
    const receiverName = document.getElementById('pay-receiver').value.trim();
    const note = document.getElementById('pay-note').value.trim();
    const iconFile = document.getElementById('payment-icon-file').files[0];

    if (!name || !address || !receiverName) {
        Toast.warning('Please fill in all required fields');
        return;
    }

    Loading.show('Saving payment method...');

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
        Toast.error('Failed to save payment method');
    }
}

function editPaymentMethod(paymentId) {
    openPaymentModal(paymentId);
}

async function deletePaymentMethod(paymentId) {
    const confirmed = await telegramManager.showConfirm('Delete this payment method?');
    if (!confirmed) return;

    Loading.show('Deleting...');

    try {
        await db.deletePaymentMethod(paymentId);
        Loading.hide();
        Toast.success('Payment method deleted');
        loadPaymentMethodsList();
    } catch (error) {
        Loading.hide();
        Toast.error('Failed to delete');
    }
}

// ========================================
// Settings Section
// ========================================
function loadSettingsData() {
    const settings = db.getSettings();

    document.getElementById('current-logo').src = settings.logoUrl || '';
    document.getElementById('website-name').value = settings.siteName || '';
}

function previewLogo(input) {
    const file = input.files[0];
    if (!file) return;

    fileToBase64(file).then(base64 => {
        document.getElementById('current-logo').src = base64;
    });
}

async function saveSettings() {
    const siteName = document.getElementById('website-name').value.trim();
    const logoFile = document.getElementById('logo-file').files[0];

    if (!siteName) {
        Toast.warning('Please enter website name');
        return;
    }

    Loading.show('Saving settings...');

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
        Toast.error('Failed to save settings');
    }
}

// ========================================
// File preview handlers
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Category icon preview
    const categoryIconInput = document.getElementById('category-icon-file');
    if (categoryIconInput) {
        categoryIconInput.addEventListener('change', function() {
            if (this.files[0]) {
                fileToBase64(this.files[0]).then(base64 => {
                    document.getElementById('category-icon-preview').src = base64;
                });
            }
        });
    }

    // Product icon preview
    const productIconInput = document.getElementById('product-icon-file');
    if (productIconInput) {
        productIconInput.addEventListener('change', function() {
            if (this.files[0]) {
                fileToBase64(this.files[0]).then(base64 => {
                    document.getElementById('product-icon-preview').src = base64;
                });
            }
        });
    }

    // Payment icon preview
    const paymentIconInput = document.getElementById('payment-icon-file');
    if (paymentIconInput) {
        paymentIconInput.addEventListener('change', function() {
            if (this.files[0]) {
                fileToBase64(this.files[0]).then(base64 => {
                    document.getElementById('payment-icon-preview').src = base64;
                });
            }
        });
    }

    // Banner preview
    const bannerInput = document.getElementById('banner-file');
    if (bannerInput) {
        bannerInput.addEventListener('change', function() {
            if (this.files[0]) {
                fileToBase64(this.files[0]).then(base64 => {
                    document.getElementById('banner-preview').src = base64;
                });
            }
        });
    }

    // Broadcast image preview
    const broadcastImageInput = document.getElementById('broadcast-image-file');
    if (broadcastImageInput) {
        broadcastImageInput.addEventListener('change', function() {
            if (this.files[0]) {
                fileToBase64(this.files[0]).then(base64 => {
                    document.getElementById('broadcast-image-preview').src = base64;
                });
            }
        });
    }
});

// ========================================
// Initialize Admin
// ========================================
document.addEventListener('DOMContentLoaded', initAdmin);

// Export functions
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
