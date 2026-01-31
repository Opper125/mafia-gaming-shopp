/* ========================================
   Gaming Top-up Shop - Main Application
   ======================================== */

// App State
const AppState = {
    currentUser: null,
    currentPage: 'home',
    currentCategory: null,
    selectedProduct: null,
    selectedPayment: null,
    inputValues: {},
    bannerIndex: 0,
    bannerInterval: null,
    isInitialized: false
};

// ========================================
// Initialization
// ========================================
async function initApp() {
    console.log('=== Initializing App ===');

    // Initialize Telegram
    const telegramReady = TelegramManager.init();
    console.log('Telegram ready:', telegramReady);

    // Check if in Telegram
    if (!TelegramManager.isInTelegram()) {
        console.log('Not in Telegram, showing access denied');
        showAccessDenied();
        return;
    }

    // Get Telegram user
    const telegramUser = TelegramManager.getUser();
    console.log('Telegram User:', telegramUser);

    if (!telegramUser) {
        console.log('No Telegram user found');
        showAccessDenied();
        return;
    }

    // Show loading
    Loading.show('Loading...');

    // Initialize database
    const dbInitialized = await db.init();
    console.log('Database initialized:', dbInitialized);

    if (!dbInitialized) {
        Loading.hide();
        Toast.error('Failed to connect to database');
        return;
    }

    // Register/update user
    AppState.currentUser = await db.addUser({
        telegramId: telegramUser.id,
        username: telegramUser.username || '',
        firstName: telegramUser.first_name || '',
        lastName: telegramUser.last_name || '',
        photoUrl: telegramUser.photo_url || '',
        isPremium: telegramUser.is_premium || false
    });

    console.log('Current User:', AppState.currentUser);

    // Check if banned
    if (db.isUserBanned(telegramUser.id)) {
        Loading.hide();
        showBannedScreen();
        return;
    }

    Loading.hide();

    // Hide intro, show main app
    hideIntroShowApp();

    // Update UI
    updateUserUI();
    loadHomePage();
    initializeUI();

    AppState.isInitialized = true;
    console.log('=== App Initialized Successfully ===');
}

function showAccessDenied() {
    const introScreen = document.getElementById('intro-screen');
    const accessDenied = document.getElementById('access-denied');
    const mainApp = document.getElementById('main-app');

    if (introScreen) introScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.add('hidden');
    if (accessDenied) accessDenied.classList.remove('hidden');
}

function showBannedScreen() {
    showAccessDenied();
    const deniedContent = document.querySelector('.denied-content');
    if (deniedContent) {
        deniedContent.querySelector('h1').textContent = 'Account Banned';
        deniedContent.querySelector('p').textContent = 'Your account has been banned. Please contact support.';
    }
}

function hideIntroShowApp() {
    const introScreen = document.getElementById('intro-screen');
    const accessDenied = document.getElementById('access-denied');
    const mainApp = document.getElementById('main-app');

    if (introScreen) introScreen.classList.add('hidden');
    if (accessDenied) accessDenied.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
}

function updateUserUI() {
    const user = AppState.currentUser;
    const settings = db.getSettings();

    console.log('Updating UI - User:', user);
    console.log('Updating UI - Settings:', settings);

    const defaultLogo = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" width="100" height="100" rx="20"/><text x="50" y="65" font-size="50" fill="white" text-anchor="middle" font-weight="bold">G</text></svg>';

    // Header
    const headerLogo = document.getElementById('header-logo');
    const siteName = document.getElementById('site-name');
    if (headerLogo) headerLogo.src = settings.logoUrl || defaultLogo;
    if (siteName) siteName.textContent = settings.siteName || 'Gaming Shop';

    // Balance
    const balanceEl = document.getElementById('user-balance');
    if (balanceEl) balanceEl.textContent = formatCurrency(user?.balance || 0);

    // User info
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const premiumBadge = document.getElementById('premium-badge');

    if (userAvatar) userAvatar.src = getAvatarUrl(user);
    if (userName) userName.textContent = `${user?.firstName || 'User'} ${user?.lastName || ''}`.trim();
    if (premiumBadge) {
        premiumBadge.classList.toggle('hidden', !user?.isPremium);
    }

    // Admin access
    const adminAccess = document.getElementById('admin-access');
    if (adminAccess) {
        adminAccess.classList.toggle('hidden', !isAdmin(user?.telegramId));
    }
}

function initializeUI() {
    ThemeManager.init();

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    // Banner slider
    startBannerSlider();

    // Marquee
    updateMarquee();
}

// ========================================
// Navigation
// ========================================
function navigateTo(page) {
    console.log('Navigating to:', page);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    AppState.currentPage = page;
    TelegramManager.haptic('selection');

    switch (page) {
        case 'home': showHomePage(); break;
        case 'orders': showOrdersPage(); break;
        case 'history': showHistoryPage(); break;
        case 'profile': showProfilePage(); break;
    }
}

function showHomePage() {
    hideAllPages();
    document.getElementById('main-app').classList.remove('hidden');
    TelegramManager.hideBackButton();
    AppState.currentCategory = null;
    
    // Reload data from database
    db.reload().then(() => {
        loadHomePage();
        updateUserUI();
    });
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
}

function goBack() {
    if (AppState.currentCategory) {
        AppState.currentCategory = null;
        showHomePage();
    } else {
        showHomePage();
    }
}

// ========================================
// Home Page
// ========================================
function loadHomePage() {
    console.log('Loading home page...');
    console.log('Categories:', db.getCategories());
    console.log('Banners:', db.getBannersType1());
    
    loadBanners();
    loadCategories();
    updateMarquee();
}

function loadBanners() {
    const banners = db.getBannersType1();
    const track = document.getElementById('banner-track');
    const dots = document.getElementById('banner-dots');

    if (!track) return;

    console.log('Loading banners:', banners);

    if (!banners || banners.length === 0) {
        track.innerHTML = `
            <div class="banner-slide">
                <div style="width:100%;height:100%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:bold;border-radius:var(--radius-lg);">
                    🎮 Welcome to Gaming Shop!
                </div>
            </div>
        `;
        if (dots) dots.innerHTML = '';
        return;
    }

    track.innerHTML = banners.map(banner => `
        <div class="banner-slide">
            <img src="${banner.imageUrl}" alt="Banner" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-lg);" onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;color:white;\\'>Banner</div>'">
        </div>
    `).join('');

    if (dots && banners.length > 1) {
        dots.innerHTML = banners.map((_, index) => `
            <span class="banner-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>
        `).join('');

        dots.querySelectorAll('.banner-dot').forEach(dot => {
            dot.addEventListener('click', () => goToBanner(parseInt(dot.dataset.index)));
        });
    } else if (dots) {
        dots.innerHTML = '';
    }
}

function startBannerSlider() {
    if (AppState.bannerInterval) clearInterval(AppState.bannerInterval);

    const banners = db.getBannersType1();
    if (!banners || banners.length <= 1) return;

    AppState.bannerInterval = setInterval(() => {
        AppState.bannerIndex = (AppState.bannerIndex + 1) % banners.length;
        updateBannerPosition();
    }, CONFIG.BANNER_INTERVAL);
}

function goToBanner(index) {
    AppState.bannerIndex = index;
    updateBannerPosition();
    startBannerSlider();
}

function updateBannerPosition() {
    const track = document.getElementById('banner-track');
    const dots = document.querySelectorAll('.banner-dot');

    if (track) track.style.transform = `translateX(-${AppState.bannerIndex * 100}%)`;
    dots.forEach((dot, index) => dot.classList.toggle('active', index === AppState.bannerIndex));
}

function updateMarquee() {
    const settings = db.getSettings();
    const marqueeContent = document.getElementById('marquee-content');
    if (marqueeContent) {
        marqueeContent.textContent = settings.marqueeText || 'Welcome to Gaming Top-up Shop!';
    }
}

function loadCategories() {
    const categories = db.getCategories();
    const grid = document.getElementById('categories-grid');

    if (!grid) return;

    console.log('Loading categories:', categories);

    if (!categories || categories.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon"><i class="fas fa-gamepad"></i></div>
                <h3>No Categories</h3>
                <p>Categories will appear here</p>
            </div>
        `;
        return;
    }

    const defaultIcon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" width="100" height="100" rx="15"/><text x="50" y="65" font-size="40" fill="white" text-anchor="middle">🎮</text></svg>';

    grid.innerHTML = categories.map(category => `
        <div class="category-card" onclick="openCategory('${category.id}')">
            ${category.flag ? `<span class="category-flag">${category.flag}</span>` : ''}
            ${category.hasDiscount ? '<span class="discount-mark">SALE</span>' : ''}
            <img src="${category.iconUrl || defaultIcon}" alt="${category.name}" class="category-icon" onerror="this.src='${defaultIcon}'">
            <div class="category-name">${category.name}</div>
            <div class="category-sold">
                <i class="fas fa-shopping-cart"></i>
                ${formatNumber(category.totalSold || 0)} sold
            </div>
        </div>
    `).join('');
}

// ========================================
// Category Page
// ========================================
function openCategory(categoryId) {
    const category = db.getCategory(categoryId);
    if (!category) {
        Toast.error('Category not found');
        return;
    }

    console.log('Opening category:', category);

    AppState.currentCategory = category;
    AppState.inputValues = {};
    AppState.selectedProduct = null;

    const titleEl = document.getElementById('category-title');
    if (titleEl) titleEl.textContent = category.name;

    loadInputTables(categoryId);
    loadProducts(categoryId);
    loadCategoryBanner(categoryId);

    document.getElementById('main-app').classList.add('hidden');
    hideAllPages();
    document.getElementById('category-page').classList.remove('hidden');

    TelegramManager.showBackButton(goBack);
    TelegramManager.haptic('impact', 'light');
}

function loadInputTables(categoryId) {
    const inputTables = db.getInputTablesByCategory(categoryId);
    const section = document.getElementById('input-tables-section');

    if (!section) return;

    if (!inputTables || inputTables.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    section.innerHTML = inputTables.map(input => `
        <div class="input-table-item">
            <label>${input.name}</label>
            <input type="text" 
                   id="input-${input.id}" 
                   placeholder="${input.placeholder || `Enter ${input.name}`}"
                   oninput="handleInputChange('${input.id}', '${input.name}', this.value)">
        </div>
    `).join('');
}

function handleInputChange(inputId, inputName, value) {
    AppState.inputValues[inputName] = value;
}

function loadProducts(categoryId) {
    const products = db.getProductsByCategory(categoryId);
    const grid = document.getElementById('products-grid');

    if (!grid) return;

    console.log('Loading products for category:', categoryId, products);

    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon"><i class="fas fa-box-open"></i></div>
                <h3>No Products</h3>
                <p>Products will appear here</p>
            </div>
        `;
        return;
    }

    const defaultIcon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" width="100" height="100" rx="15"/></svg>';

    grid.innerHTML = products.map(product => {
        const hasDiscount = product.discount > 0;
        const finalPrice = hasDiscount ? calculateDiscount(product.price, product.discount) : product.price;

        return `
            <div class="product-card" onclick="selectProduct('${product.id}')" id="product-${product.id}">
                ${hasDiscount ? `<span class="product-discount-badge">-${product.discount}%</span>` : ''}
                <img src="${product.iconUrl || defaultIcon}" alt="${product.name}" class="product-icon" onerror="this.src='${defaultIcon}'">
                <div class="product-name">${product.name}</div>
                <div class="product-price">
                    ${hasDiscount ? `<span class="original-price">${formatCurrency(product.price, product.currency)}</span>` : ''}
                    <span class="final-price">${formatCurrency(finalPrice, product.currency)}</span>
                </div>
                <div class="delivery-time">
                    <i class="fas fa-bolt"></i>
                    ${product.deliveryType === 'instant' ? 'အမြန်ရသည်' : product.deliveryTime || 'Processing'}
                </div>
            </div>
        `;
    }).join('');
}

function selectProduct(productId) {
    const product = db.getProduct(productId);
    if (!product) {
        Toast.error('Product not found');
        return;
    }

    // Check input tables
    const inputTables = db.getInputTablesByCategory(AppState.currentCategory?.id);
    if (inputTables && inputTables.length > 0) {
        const missingInputs = inputTables.filter(input => !AppState.inputValues[input.name]?.trim());
        if (missingInputs.length > 0) {
            Toast.warning(`Please fill in: ${missingInputs.map(i => i.name).join(', ')}`);
            TelegramManager.haptic('notification', 'warning');
            return;
        }
    }

    document.querySelectorAll('.product-card').forEach(card => card.classList.remove('selected'));
    document.getElementById(`product-${productId}`)?.classList.add('selected');

    AppState.selectedProduct = product;
    TelegramManager.haptic('selection');
    openProductModal(product);
}

function loadCategoryBanner(categoryId) {
    const banners = db.getBannersType2(categoryId);
    const bannerSection = document.getElementById('category-banner-section');
    const guideSection = document.getElementById('category-guide');

    if (bannerSection) {
        if (banners && banners.length > 0 && banners[0].imageUrl) {
            bannerSection.classList.remove('hidden');
            bannerSection.innerHTML = `<img src="${banners[0].imageUrl}" alt="Banner" style="width:100%;border-radius:var(--radius-lg);">`;
        } else {
            bannerSection.classList.add('hidden');
        }
    }

    if (guideSection) {
        if (banners && banners.length > 0 && banners[0].guideText) {
            guideSection.classList.remove('hidden');
            guideSection.innerHTML = `
                <h3><i class="fas fa-info-circle"></i> Instructions</h3>
                <p>${parseText(banners[0].guideText)}</p>
            `;
        } else {
            guideSection.classList.add('hidden');
        }
    }
}

// ========================================
// Product Modal
// ========================================
function openProductModal(product) {
    const modal = document.getElementById('product-modal');
    if (!modal) return;

    const user = AppState.currentUser;
    const hasDiscount = product.discount > 0;
    const finalPrice = hasDiscount ? calculateDiscount(product.price, product.discount) : product.price;
    const defaultIcon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" width="100" height="100" rx="15"/></svg>';

    document.getElementById('product-modal-title').textContent = 'Order Details';
    document.getElementById('product-modal-icon').src = product.iconUrl || defaultIcon;
    document.getElementById('product-modal-name').textContent = product.name;
    
    const originalPriceEl = document.getElementById('product-original-price');
    const finalPriceEl = document.getElementById('product-final-price');
    const discountBadgeEl = document.getElementById('product-discount-badge');
    
    if (originalPriceEl) {
        originalPriceEl.textContent = hasDiscount ? formatCurrency(product.price, product.currency) : '';
        originalPriceEl.style.display = hasDiscount ? 'inline' : 'none';
    }
    if (finalPriceEl) finalPriceEl.textContent = formatCurrency(finalPrice, product.currency);
    if (discountBadgeEl) {
        discountBadgeEl.textContent = hasDiscount ? `-${product.discount}%` : '';
        discountBadgeEl.style.display = hasDiscount ? 'inline' : 'none';
    }

    const deliveryTimeEl = document.getElementById('product-delivery-time');
    if (deliveryTimeEl) {
        deliveryTimeEl.innerHTML = `<i class="fas fa-bolt"></i> ${product.deliveryType === 'instant' ? 'အမြန်ရသည်' : product.deliveryTime || 'Processing'}`;
    }

    const modalBalance = document.getElementById('modal-balance');
    const modalPrice = document.getElementById('modal-price');
    const modalRemaining = document.getElementById('modal-remaining');
    
    if (modalBalance) modalBalance.textContent = formatCurrency(user?.balance || 0);
    if (modalPrice) modalPrice.textContent = formatCurrency(finalPrice, product.currency);
    if (modalRemaining) modalRemaining.textContent = formatCurrency((user?.balance || 0) - finalPrice);

    const inputReview = document.getElementById('input-review');
    if (inputReview) {
        if (Object.keys(AppState.inputValues).length > 0) {
            inputReview.innerHTML = `
                <h4><i class="fas fa-list-check"></i> Your Information</h4>
                ${Object.entries(AppState.inputValues).map(([key, value]) => `
                    <div class="input-review-item">
                        <span>${key}:</span>
                        <span>${value}</span>
                    </div>
                `).join('')}
            `;
            inputReview.classList.remove('hidden');
        } else {
            inputReview.classList.add('hidden');
        }
    }

    modal.classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('product-modal')?.classList.add('hidden');
}

async function confirmPurchase() {
    const user = AppState.currentUser;
    const product = AppState.selectedProduct;

    if (!product) {
        Toast.error('Please select a product');
        return;
    }

    const hasDiscount = product.discount > 0;
    const finalPrice = hasDiscount ? calculateDiscount(product.price, product.discount) : product.price;

    if ((user?.balance || 0) < finalPrice) {
        Toast.warning('Insufficient balance. Please top up first.');
        TelegramManager.haptic('notification', 'warning');
        return;
    }

    openVerificationModal();
}

function openVerificationModal() {
    document.getElementById('verification-modal')?.classList.remove('hidden');

    const user = AppState.currentUser;
    const code = VerificationManager.generateCode(user.telegramId);
    TelegramBot.sendVerificationCode(user.telegramId, code);
    TelegramManager.haptic('notification', 'success');
}

function cancelVerification() {
    document.getElementById('verification-modal')?.classList.add('hidden');
    document.getElementById('verification-code').value = '';
    VerificationManager.clearCode(AppState.currentUser?.telegramId);
}

async function verifyPayment() {
    const inputCode = document.getElementById('verification-code')?.value?.trim();
    const user = AppState.currentUser;
    const product = AppState.selectedProduct;

    if (!inputCode) {
        Toast.warning('Please enter the verification code');
        return;
    }

    Loading.show('Verifying...');

    const verification = VerificationManager.verifyCode(user.telegramId, inputCode);

    if (!verification.valid) {
        Loading.hide();
        Toast.error(verification.error);
        TelegramManager.haptic('notification', 'error');
        return;
    }

    try {
        const hasDiscount = product.discount > 0;
        const finalPrice = hasDiscount ? calculateDiscount(product.price, product.discount) : product.price;

        await db.updateUserBalance(user.telegramId, finalPrice, 'subtract');

        const order = await db.addOrder({
            userId: user.telegramId,
            userInfo: { firstName: user.firstName, lastName: user.lastName, username: user.username },
            productId: product.id,
            productInfo: { name: product.name, iconUrl: product.iconUrl },
            categoryId: product.categoryId,
            inputValues: AppState.inputValues,
            amount: finalPrice,
            currency: product.currency
        });

        await db.updateUser(user.telegramId, { totalOrders: (user.totalOrders || 0) + 1 });

        AppState.currentUser = db.getUser(user.telegramId);
        TelegramBot.sendOrderNotification(order, AppState.currentUser);

        Loading.hide();
        closeProductModal();
        cancelVerification();

        Toast.success('Order placed successfully!');
        TelegramManager.haptic('notification', 'success');
        updateUserUI();

        setTimeout(() => showHomePage(), 2000);

    } catch (error) {
        Loading.hide();
        console.error('Order error:', error);
        Toast.error('Failed to place order');
        TelegramManager.haptic('notification', 'error');
    }
}

// ========================================
// Orders Page
// ========================================
function showOrdersPage() {
    const page = document.getElementById('orders-page');
    const list = document.getElementById('orders-list');

    if (!page || !list) return;

    hideAllPages();
    document.getElementById('main-app').classList.add('hidden');
    page.classList.remove('hidden');

    const orders = db.getOrdersByUser(AppState.currentUser?.telegramId);

    if (!orders || orders.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-shopping-bag"></i></div>
                <h3>No Orders</h3>
                <p>Your orders will appear here</p>
            </div>
        `;
    } else {
        list.innerHTML = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-status ${order.status}">${order.status}</span>
                </div>
                <div class="order-details">
                    <img src="${order.productInfo?.iconUrl || ''}" alt="${order.productInfo?.name}">
                    <div class="order-info">
                        <h4>${order.productInfo?.name || 'Product'}</h4>
                        <p>${formatRelativeTime(order.createdAt)}</p>
                    </div>
                    <span class="order-price">${formatCurrency(order.amount, order.currency)}</span>
                </div>
            </div>
        `).join('');
    }

    TelegramManager.showBackButton(() => navigateTo('home'));
}

// ========================================
// History Page
// ========================================
function showHistoryPage() {
    const page = document.getElementById('history-page');
    if (!page) return;

    hideAllPages();
    document.getElementById('main-app').classList.add('hidden');
    page.classList.remove('hidden');

    loadHistoryTab('deposits');

    page.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            page.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadHistoryTab(btn.dataset.tab);
        };
    });

    TelegramManager.showBackButton(() => navigateTo('home'));
}

function loadHistoryTab(tab) {
    const list = document.getElementById('history-list');
    if (!list) return;

    const user = AppState.currentUser;

    if (tab === 'deposits') {
        const topups = db.getTopupRequestsByUser(user?.telegramId);
        
        if (!topups || topups.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-wallet"></i></div><h3>No Deposits</h3></div>`;
        } else {
            list.innerHTML = topups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(topup => `
                <div class="history-item">
                    <div class="history-icon deposit"><i class="fas fa-arrow-down"></i></div>
                    <div class="history-info">
                        <h4>Deposit - ${topup.paymentInfo?.name || 'Payment'}</h4>
                        <p>${formatRelativeTime(topup.createdAt)} · ${topup.status}</p>
                    </div>
                    <span class="history-amount ${topup.status === 'approved' ? 'positive' : ''}">${topup.status === 'approved' ? '+' : ''}${formatCurrency(topup.amount)}</span>
                </div>
            `).join('');
        }
    } else {
        const orders = db.getOrdersByUser(user?.telegramId);
        
        if (!orders || orders.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-shopping-cart"></i></div><h3>No Purchases</h3></div>`;
        } else {
            list.innerHTML = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => `
                <div class="history-item">
                    <div class="history-icon purchase"><i class="fas fa-shopping-cart"></i></div>
                    <div class="history-info">
                        <h4>${order.productInfo?.name || 'Product'}</h4>
                        <p>${formatRelativeTime(order.createdAt)} · ${order.status}</p>
                    </div>
                    <span class="history-amount negative">-${formatCurrency(order.amount, order.currency)}</span>
                </div>
            `).join('');
        }
    }
}

// ========================================
// Profile Page
// ========================================
function showProfilePage() {
    const page = document.getElementById('profile-page');
    if (!page) return;

    hideAllPages();
    document.getElementById('main-app').classList.add('hidden');
    page.classList.remove('hidden');

    const user = AppState.currentUser;

    document.getElementById('profile-avatar').src = getAvatarUrl(user);
    document.getElementById('profile-name').textContent = `${user?.firstName || 'User'} ${user?.lastName || ''}`.trim();
    document.getElementById('profile-username').textContent = user?.username ? `@${user.username}` : 'No username';
    document.getElementById('total-orders').textContent = formatNumber(user?.totalOrders || 0);
    document.getElementById('total-spent').textContent = formatNumber(user?.totalSpent || 0);
    document.getElementById('member-since').textContent = user?.createdAt ? formatDate(user.createdAt, 'short') : '-';

    TelegramManager.showBackButton(() => navigateTo('home'));
}

function toggleTheme() {
    const newTheme = ThemeManager.toggle();
    Toast.info(`Switched to ${newTheme} mode`);
    TelegramManager.haptic('selection');
}

// ========================================
// Topup Modal
// ========================================
function openTopupModal() {
    const modal = document.getElementById('topup-modal');
    if (!modal) return;

    const methodsContainer = document.getElementById('payment-methods');
    const detailsContainer = document.getElementById('payment-details');

    AppState.selectedPayment = null;
    if (detailsContainer) detailsContainer.classList.add('hidden');
    document.getElementById('topup-amount').value = '';
    document.getElementById('receipt-preview')?.classList.add('hidden');

    const methods = db.getPaymentMethods();
    const defaultIcon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%233B82F6" width="100" height="100" rx="15"/><text x="50" y="60" font-size="40" fill="white" text-anchor="middle">💳</text></svg>';

    if (!methods || methods.length === 0) {
        methodsContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><p>No payment methods available</p></div>`;
    } else {
        methodsContainer.innerHTML = methods.map(method => `
            <div class="payment-method" onclick="selectPaymentMethod('${method.id}')" id="pay-${method.id}">
                <img src="${method.iconUrl || defaultIcon}" alt="${method.name}" onerror="this.src='${defaultIcon}'">
                <span>${method.name}</span>
            </div>
        `).join('');
    }

    modal.classList.remove('hidden');
}

function closeTopupModal() {
    document.getElementById('topup-modal')?.classList.add('hidden');
}

function selectPaymentMethod(paymentId) {
    const method = db.getPaymentMethod(paymentId);
    if (!method) return;

    AppState.selectedPayment = method;

    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
    document.getElementById(`pay-${paymentId}`)?.classList.add('selected');

    const details = document.getElementById('payment-details');
    if (!details) return;

    document.getElementById('payment-icon').src = method.iconUrl || '';
    document.getElementById('payment-name').textContent = method.name;
    document.getElementById('payment-address').querySelector('span').textContent = method.address;
    document.getElementById('payment-receiver').textContent = `Receiver: ${method.receiverName}`;
    document.getElementById('payment-note').textContent = method.note || '';

    details.classList.remove('hidden');
    TelegramManager.haptic('selection');
}

function previewReceipt(input) {
    const file = input.files[0];
    if (!file) return;

    fileToBase64(file).then(base64 => {
        document.getElementById('preview-img').src = base64;
        document.getElementById('receipt-preview')?.classList.remove('hidden');
    });
}

function removeReceipt() {
    document.getElementById('receipt-file').value = '';
    document.getElementById('receipt-preview')?.classList.add('hidden');
}

async function submitTopup() {
    const user = AppState.currentUser;
    const payment = AppState.selectedPayment;
    const amount = parseFloat(document.getElementById('topup-amount')?.value || 0);
    const receiptFile = document.getElementById('receipt-file')?.files[0];

    if (!payment) { Toast.warning('Please select a payment method'); return; }
    if (!amount || amount <= 0) { Toast.warning('Please enter a valid amount'); return; }
    if (!receiptFile) { Toast.warning('Please upload payment receipt'); return; }

    Loading.show('Submitting...');

    try {
        const receiptBase64 = await fileToBase64(receiptFile);

        const request = await db.addTopupRequest({
            userId: user.telegramId,
            userInfo: { firstName: user.firstName, lastName: user.lastName, username: user.username },
            paymentMethodId: payment.id,
            paymentInfo: { name: payment.name, iconUrl: payment.iconUrl },
            amount,
            receiptUrl: receiptBase64
        });

        TelegramBot.sendTopupNotification(request, user);

        Loading.hide();
        closeTopupModal();
        Toast.success('Top-up request submitted!');
        TelegramManager.haptic('notification', 'success');

    } catch (error) {
        Loading.hide();
        console.error('Topup error:', error);
        Toast.error('Failed to submit request');
    }
}

function openAdminPanel() {
    window.location.href = 'admin.html';
}

// ========================================
// Initialize
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    setTimeout(initApp, 100);
});

// Global exports
window.initApp = initApp;
window.navigateTo = navigateTo;
window.showHomePage = showHomePage;
window.showOrdersPage = showOrdersPage;
window.showHistoryPage = showHistoryPage;
window.showProfilePage = showProfilePage;
window.goBack = goBack;
window.openCategory = openCategory;
window.handleInputChange = handleInputChange;
window.selectProduct = selectProduct;
window.closeProductModal = closeProductModal;
window.confirmPurchase = confirmPurchase;
window.cancelVerification = cancelVerification;
window.verifyPayment = verifyPayment;
window.toggleTheme = toggleTheme;
window.openTopupModal = openTopupModal;
window.closeTopupModal = closeTopupModal;
window.selectPaymentMethod = selectPaymentMethod;
window.previewReceipt = previewReceipt;
window.removeReceipt = removeReceipt;
window.submitTopup = submitTopup;
window.openAdminPanel = openAdminPanel;
