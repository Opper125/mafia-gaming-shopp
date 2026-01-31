/* ========================================
   Gaming Top-up Shop - Main Application
   User Dashboard & Functionality
   ======================================== */

// ========================================
// App State
// ========================================
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
// App Initialization
// ========================================
async function initApp() {
    console.log('Initializing app...');

    // Check if running in Telegram
    if (!telegramManager.init() || !telegramManager.isInTelegram()) {
        showAccessDenied();
        return;
    }

    // Check if user is banned
    const user = telegramManager.getUser();
    if (!user) {
        showAccessDenied();
        return;
    }

    // Show intro screen
    await showIntro();

    // Initialize database
    Loading.show('Connecting to database...');
    
    try {
        const binId = Storage.get('JSONBIN_BIN_ID');
        if (binId) {
            db.setBinId(binId);
            await db.init();
        } else {
            // Try to create new bin if none exists
            console.log('No database found, waiting for admin setup...');
        }
    } catch (error) {
        console.error('Database init error:', error);
    }

    // Register/update user
    await registerUser(user);

    // Check if user is banned
    if (db.isUserBanned(user.id)) {
        Loading.hide();
        showBannedScreen();
        return;
    }

    // Load app data
    await loadAppData();

    Loading.hide();

    // Show main app
    showMainApp();

    // Initialize UI
    initializeUI();

    AppState.isInitialized = true;
    console.log('App initialized successfully');
}

// Show access denied screen
function showAccessDenied() {
    document.getElementById('intro-screen').classList.add('hidden');
    document.getElementById('access-denied').classList.remove('hidden');
}

// Show banned screen
function showBannedScreen() {
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('access-denied').classList.remove('hidden');
    document.querySelector('.denied-content h1').textContent = 'Account Banned';
    document.querySelector('.denied-content p').textContent = 'Your account has been banned. Please contact support.';
}

// Show intro screen
async function showIntro() {
    return new Promise((resolve) => {
        const introScreen = document.getElementById('intro-screen');
        const settings = db.data?.settings || {};

        // Set logo and name
        const logo = document.getElementById('intro-logo');
        const siteName = document.getElementById('site-name-intro');

        if (settings.logoUrl) {
            logo.src = settings.logoUrl;
        } else {
            logo.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" width="100" height="100" rx="20"/><text x="50" y="60" font-size="40" fill="white" text-anchor="middle" font-weight="bold">G</text></svg>';
        }

        siteName.textContent = settings.siteName || 'Gaming Shop';

        // Wait for intro duration
        setTimeout(() => {
            introScreen.classList.add('hidden');
            resolve();
        }, CONFIG.INTRO_DURATION);
    });
}

// Register/update user in database
async function registerUser(telegramUser) {
    try {
        const userData = {
            telegramId: telegramUser.id,
            username: telegramUser.username || '',
            firstName: telegramUser.first_name || '',
            lastName: telegramUser.last_name || '',
            photoUrl: telegramUser.photo_url || '',
            isPremium: telegramUser.is_premium || false
        };

        const user = await db.addUser(userData);
        AppState.currentUser = user;

        return user;
    } catch (error) {
        console.error('Register user error:', error);
        return null;
    }
}

// Load app data
async function loadAppData() {
    try {
        await db.load();
    } catch (error) {
        console.error('Load app data error:', error);
    }
}

// Show main app
function showMainApp() {
    const mainApp = document.getElementById('main-app');
    mainApp.classList.remove('hidden');
    mainApp.classList.add('animate-fadeIn');

    // Update UI with user data
    updateUserUI();

    // Load home page content
    loadHomePage();
}

// Update user UI
function updateUserUI() {
    const user = AppState.currentUser;
    const settings = db.getSettings();

    // Header
    document.getElementById('header-logo').src = settings.logoUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" width="100" height="100" rx="20"/><text x="50" y="60" font-size="40" fill="white" text-anchor="middle" font-weight="bold">G</text></svg>';
    document.getElementById('site-name').textContent = settings.siteName || 'Gaming Shop';
    document.getElementById('user-balance').textContent = formatCurrency(user?.balance || 0);

    // User info bar
    document.getElementById('user-avatar').src = getAvatarUrl(user);
    document.getElementById('user-name').textContent = `${user?.firstName || 'User'} ${user?.lastName || ''}`.trim();

    // Premium badge
    const premiumBadge = document.getElementById('premium-badge');
    if (user?.isPremium) {
        premiumBadge.classList.remove('hidden');
    } else {
        premiumBadge.classList.add('hidden');
    }

    // Admin access
    const adminAccess = document.getElementById('admin-access');
    if (isAdmin(user?.telegramId)) {
        adminAccess.classList.remove('hidden');
    } else {
        adminAccess.classList.add('hidden');
    }
}

// Initialize UI
function initializeUI() {
    // Theme
    ThemeManager.init();

    // Navigation
    initNavigation();

    // Banner slider
    initBannerSlider();

    // Marquee
    initMarquee();

    // Add ripple effects
    addRippleEffect();
}

// Initialize navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}

// Navigate to page
function navigateTo(page) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('main-app').classList.add('hidden');

    // Show selected page
    switch (page) {
        case 'home':
            showHomePage();
            break;
        case 'orders':
            showOrdersPage();
            break;
        case 'history':
            showHistoryPage();
            break;
        case 'profile':
            showProfilePage();
            break;
    }

    AppState.currentPage = page;
    telegramManager.haptic('selection');
}

// ========================================
// Home Page
// ========================================
function loadHomePage() {
    loadBanners();
    loadCategories();
}

function showHomePage() {
    document.getElementById('main-app').classList.remove('hidden');
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    telegramManager.hideBackButton();
}

// Load banners
function loadBanners() {
    const banners = db.getBannersType1();
    const track = document.getElementById('banner-track');
    const dots = document.getElementById('banner-dots');

    if (!banners || banners.length === 0) {
        // Show placeholder
        track.innerHTML = `
            <div class="banner-slide">
                <div style="width:100%;height:100%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;color:white;font-size:24px;font-weight:bold;">
                    Welcome to Gaming Shop!
                </div>
            </div>
        `;
        dots.innerHTML = '';
        return;
    }

    // Render banners
    track.innerHTML = banners.map(banner => `
        <div class="banner-slide">
            <img src="${banner.imageUrl}" alt="Banner" loading="lazy">
        </div>
    `).join('');

    // Render dots
    dots.innerHTML = banners.map((_, index) => `
        <span class="banner-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>
    `).join('');

    // Add dot click handlers
    dots.querySelectorAll('.banner-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            goToBanner(parseInt(dot.dataset.index));
        });
    });
}

// Initialize banner slider
function initBannerSlider() {
    const banners = db.getBannersType1();
    if (!banners || banners.length <= 1) return;

    // Auto slide
    AppState.bannerInterval = setInterval(() => {
        nextBanner();
    }, CONFIG.BANNER_INTERVAL);
}

function nextBanner() {
    const banners = db.getBannersType1();
    if (!banners || banners.length <= 1) return;

    AppState.bannerIndex = (AppState.bannerIndex + 1) % banners.length;
    updateBannerPosition();
}

function goToBanner(index) {
    AppState.bannerIndex = index;
    updateBannerPosition();

    // Reset interval
    clearInterval(AppState.bannerInterval);
    AppState.bannerInterval = setInterval(nextBanner, CONFIG.BANNER_INTERVAL);
}

function updateBannerPosition() {
    const track = document.getElementById('banner-track');
    const dots = document.querySelectorAll('.banner-dot');

    track.style.transform = `translateX(-${AppState.bannerIndex * 100}%)`;

    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === AppState.bannerIndex);
    });
}

// Initialize marquee
function initMarquee() {
    const settings = db.getSettings();
    const marqueeContent = document.getElementById('marquee-content');

    if (marqueeContent) {
        marqueeContent.textContent = settings.marqueeText || 'Welcome to Gaming Top-up Shop!';
    }
}

// Load categories
function loadCategories() {
    const categories = db.getCategories();
    const grid = document.getElementById('categories-grid');

    if (!categories || categories.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">
                    <i class="fas fa-gamepad"></i>
                </div>
                <h3>No Categories</h3>
                <p>Categories will appear here</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = categories.map((category, index) => `
        <div class="category-card animate-fadeInUp stagger-${index + 1}" onclick="openCategory('${category.id}')">
            ${category.flag ? `<span class="category-flag">${category.flag}</span>` : ''}
            ${category.hasDiscount ? '<span class="discount-mark">SALE</span>' : ''}
            <img src="${category.iconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" width="100" height="100" rx="15"/></svg>'}" alt="${category.name}" class="category-icon">
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
    if (!category) return;

    AppState.currentCategory = category;
    AppState.inputValues = {};
    AppState.selectedProduct = null;

    // Update page
    document.getElementById('category-title').textContent = category.name;

    // Load input tables
    loadInputTables(categoryId);

    // Load products
    loadProducts(categoryId);

    // Load category banner (Type 2)
    loadCategoryBanner(categoryId);

    // Show page
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('category-page').classList.remove('hidden');

    // Show back button
    telegramManager.showBackButton(goBack);

    telegramManager.haptic('impact', 'light');
}

function loadInputTables(categoryId) {
    const inputTables = db.getInputTablesByCategory(categoryId);
    const section = document.getElementById('input-tables-section');

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
                   oninput="updateInputValue('${input.id}', this.value)">
        </div>
    `).join('');
}

function updateInputValue(inputId, value) {
    const inputTable = db.getInputTables().find(i => i.id === inputId);
    if (inputTable) {
        AppState.inputValues[inputTable.name] = value;
    }
}

function loadProducts(categoryId) {
    const products = db.getProductsByCategory(categoryId);
    const grid = document.getElementById('products-grid');

    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">
                    <i class="fas fa-box-open"></i>
                </div>
                <h3>No Products</h3>
                <p>Products will appear here</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(product => {
        const hasDiscount = product.discount > 0;
        const finalPrice = hasDiscount ? calculateDiscount(product.price, product.discount) : product.price;

        return `
            <div class="product-card" onclick="selectProduct('${product.id}')" id="product-${product.id}">
                ${hasDiscount ? `<span class="product-discount-badge">-${product.discount}%</span>` : ''}
                <button class="share-btn" onclick="event.stopPropagation(); shareProduct('${product.id}')">
                    <i class="fas fa-share-alt"></i>
                </button>
                <img src="${product.iconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238B5CF6" width="100" height="100" rx="15"/></svg>'}" alt="${product.name}" class="product-icon">
                <div class="product-name">${product.name}</div>
                <div class="product-price">
                    ${hasDiscount ? `<span class="original-price">${formatCurrency(product.price, product.currency)}</span>` : ''}
                    <span class="final-price">${formatCurrency(finalPrice, product.currency)}</span>
                </div>
                <div class="delivery-time">
                    <i class="fas fa-bolt"></i>
                    ${product.deliveryType === 'instant' ? 'အမြန်ရသည်' : product.deliveryTime}
                </div>
            </div>
        `;
    }).join('');
}

function selectProduct(productId) {
    const product = db.getProduct(productId);
    if (!product) return;

    // Check input tables
    const inputTables = db.getInputTablesByCategory(AppState.currentCategory.id);
    if (inputTables.length > 0) {
        const missingInputs = inputTables.filter(input => !AppState.inputValues[input.name]?.trim());
        if (missingInputs.length > 0) {
            Toast.warning(`Please fill in: ${missingInputs.map(i => i.name).join(', ')}`);
            telegramManager.haptic('notification', 'warning');
            return;
        }
    }

    // Update selection UI
    document.querySelectorAll('.product-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById(`product-${productId}`).classList.add('selected');

    AppState.selectedProduct = product;
    telegramManager.haptic('selection');

    // Open product modal
    openProductModal(product);
}

function loadCategoryBanner(categoryId) {
    const banners = db.getBannersType2(categoryId);
    const bannerSection = document.getElementById('category-banner-section');
    const guideSection = document.getElementById('category-guide');

    if (!banners || banners.length === 0) {
        bannerSection.classList.add('hidden');
        guideSection.classList.add('hidden');
        return;
    }

    const banner = banners[0]; // Use first banner

    if (banner.imageUrl) {
        bannerSection.classList.remove('hidden');
        bannerSection.innerHTML = `<img src="${banner.imageUrl}" alt="Banner">`;
    } else {
        bannerSection.classList.add('hidden');
    }

    if (banner.guideText) {
        guideSection.classList.remove('hidden');
        guideSection.innerHTML = `
            <h3><i class="fas fa-info-circle"></i> Instructions</h3>
            <p>${parseText(banner.guideText)}</p>
        `;
    } else {
        guideSection.classList.add('hidden');
    }
}

function goBack() {
    if (AppState.currentPage === 'home' && AppState.currentCategory) {
        // Go back from category to home
        AppState.currentCategory = null;
        showHomePage();
    } else {
        showHomePage();
    }
}

// Share product
function shareProduct(productId) {
    const product = db.getProduct(productId);
    const category = db.getCategory(product.categoryId);
    
    if (!product) return;

    const shareText = `🎮 ${product.name}\n💰 ${formatCurrency(product.price, product.currency)}\n\n📱 Order now via @${CONFIG.BOT_USERNAME}`;
    
    telegramManager.switchInlineQuery(shareText);
    telegramManager.haptic('impact', 'medium');
}

// ========================================
// Product Modal
// ========================================
function openProductModal(product) {
    const modal = document.getElementById('product-modal');
    const user = AppState.currentUser;

    const hasDiscount = product.discount > 0;
    const finalPrice = hasDiscount ? calculateDiscount(product.price, product.discount) : product.price;

    document.getElementById('product-modal-title').textContent = 'Order Details';
    document.getElementById('product-modal-icon').src = product.iconUrl || '';
    document.getElementById('product-modal-name').textContent = product.name;
    
    document.getElementById('product-original-price').textContent = hasDiscount ? formatCurrency(product.price, product.currency) : '';
    document.getElementById('product-original-price').style.display = hasDiscount ? 'inline' : 'none';
    document.getElementById('product-final-price').textContent = formatCurrency(finalPrice, product.currency);
    document.getElementById('product-discount-badge').textContent = hasDiscount ? `-${product.discount}%` : '';
    document.getElementById('product-discount-badge').style.display = hasDiscount ? 'inline' : 'none';
    document.getElementById('product-delivery-time').innerHTML = `<i class="fas fa-bolt"></i> ${product.deliveryType === 'instant' ? 'အမြန်ရသည်' : product.deliveryTime}`;

    // Order summary
    document.getElementById('modal-balance').textContent = formatCurrency(user.balance);
    document.getElementById('modal-price').textContent = formatCurrency(finalPrice, product.currency);
    document.getElementById('modal-remaining').textContent = formatCurrency(user.balance - finalPrice);

    // Input review
    const inputReview = document.getElementById('input-review');
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

    modal.classList.remove('hidden');
    telegramManager.haptic('impact', 'light');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
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

    // Check balance
    if (user.balance < finalPrice) {
        // Track failed attempts
        const today = new Date().toDateString();
        if (user.lastFailedAttemptDate !== today) {
            await db.updateUser(user.telegramId, {
                failedPurchaseAttempts: 1,
                lastFailedAttemptDate: today
            });
        } else {
            const attempts = (user.failedPurchaseAttempts || 0) + 1;
            await db.updateUser(user.telegramId, { failedPurchaseAttempts: attempts });

            if (attempts >= CONFIG.MAX_FAILED_PURCHASES) {
                await db.banUser(user.telegramId, 'Too many failed purchase attempts');
                Toast.error('Your account has been banned due to multiple failed attempts.');
                telegramManager.haptic('notification', 'error');
                setTimeout(() => location.reload(), 2000);
                return;
            }
        }

        Toast.warning('Insufficient balance. Please top up first.');
        telegramManager.haptic('notification', 'warning');
        return;
    }

    // Show verification modal
    openVerificationModal();
}

function openVerificationModal() {
    document.getElementById('verification-modal').classList.remove('hidden');
    
    // Generate and send verification code
    const user = AppState.currentUser;
    const code = verificationManager.generateCode(user.telegramId);
    
    telegramBot.sendVerificationCode(user.telegramId, code).catch(err => {
        console.error('Failed to send verification code:', err);
    });

    telegramManager.haptic('notification', 'success');
}

function cancelVerification() {
    document.getElementById('verification-modal').classList.add('hidden');
    document.getElementById('verification-code').value = '';
    verificationManager.clearCode(AppState.currentUser.telegramId);
}

async function verifyPayment() {
    const inputCode = document.getElementById('verification-code').value.trim();
    const user = AppState.currentUser;
    const product = AppState.selectedProduct;

    if (!inputCode) {
        Toast.warning('Please enter the verification code');
        return;
    }

    Loading.show('Verifying...');

    const verification = verificationManager.verifyCode(user.telegramId, inputCode);

    if (!verification.valid) {
        Loading.hide();
        Toast.error(verification.error);
        telegramManager.haptic('notification', 'error');
        return;
    }

    // Process order
    try {
        const hasDiscount = product.discount > 0;
        const finalPrice = hasDiscount ? calculateDiscount(product.price, product.discount) : product.price;

        // Deduct balance
        await db.updateUserBalance(user.telegramId, finalPrice, 'subtract');

        // Create order
        const order = await db.addOrder({
            userId: user.telegramId,
            userInfo: {
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username
            },
            productId: product.id,
            productInfo: {
                name: product.name,
                iconUrl: product.iconUrl
            },
            categoryId: product.categoryId,
            inputValues: AppState.inputValues,
            amount: finalPrice,
            currency: product.currency
        });

        // Update user stats
        await db.updateUser(user.telegramId, {
            totalOrders: (user.totalOrders || 0) + 1
        });

        // Reload user data
        AppState.currentUser = db.getUser(user.telegramId);

        // Send notification to admin
        await telegramBot.sendOrderNotification(order, AppState.currentUser);

        Loading.hide();
        closeProductModal();
        cancelVerification();

        Toast.success('Order placed successfully!');
        telegramManager.haptic('notification', 'success');

        // Update UI
        updateUserUI();

        // Go back to home after 2 seconds
        setTimeout(() => {
            showHomePage();
        }, 2000);

    } catch (error) {
        Loading.hide();
        console.error('Order error:', error);
        Toast.error('Failed to place order. Please try again.');
        telegramManager.haptic('notification', 'error');
    }
}

// ========================================
// Orders Page
// ========================================
function showOrdersPage() {
    const page = document.getElementById('orders-page');
    const list = document.getElementById('orders-list');

    const orders = db.getOrdersByUser(AppState.currentUser.telegramId);

    if (!orders || orders.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-shopping-bag"></i>
                </div>
                <h3>No Orders</h3>
                <p>Your orders will appear here</p>
            </div>
        `;
    } else {
        list.innerHTML = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-status ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
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

    document.getElementById('main-app').classList.add('hidden');
    page.classList.remove('hidden');
    telegramManager.showBackButton(() => navigateTo('home'));
}

// ========================================
// History Page
// ========================================
function showHistoryPage() {
    const page = document.getElementById('history-page');
    
    document.getElementById('main-app').classList.add('hidden');
    page.classList.remove('hidden');
    
    loadHistoryTab('deposits');
    
    // Tab handlers
    page.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            page.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadHistoryTab(btn.dataset.tab);
        });
    });

    telegramManager.showBackButton(() => navigateTo('home'));
}

function loadHistoryTab(tab) {
    const list = document.getElementById('history-list');
    const user = AppState.currentUser;

    if (tab === 'deposits') {
        const topups = db.getTopupRequestsByUser(user.telegramId);
        
        if (!topups || topups.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-wallet"></i>
                    </div>
                    <h3>No Deposits</h3>
                    <p>Your deposit history will appear here</p>
                </div>
            `;
        } else {
            list.innerHTML = topups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(topup => `
                <div class="history-item">
                    <div class="history-icon deposit">
                        <i class="fas fa-arrow-down"></i>
                    </div>
                    <div class="history-info">
                        <h4>Deposit - ${topup.paymentInfo?.name || 'Payment'}</h4>
                        <p>${formatRelativeTime(topup.createdAt)} · ${topup.status}</p>
                    </div>
                    <span class="history-amount ${topup.status === 'approved' ? 'positive' : ''}">
                        ${topup.status === 'approved' ? '+' : ''}${formatCurrency(topup.amount)}
                    </span>
                </div>
            `).join('');
        }
    } else {
        const orders = db.getOrdersByUser(user.telegramId);
        
        if (!orders || orders.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <h3>No Purchases</h3>
                    <p>Your purchase history will appear here</p>
                </div>
            `;
        } else {
            list.innerHTML = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => `
                <div class="history-item">
                    <div class="history-icon purchase">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="history-info">
                        <h4>${order.productInfo?.name || 'Product'}</h4>
                        <p>${formatRelativeTime(order.createdAt)} · ${order.status}</p>
                    </div>
                    <span class="history-amount negative">
                        -${formatCurrency(order.amount, order.currency)}
                    </span>
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
    const user = AppState.currentUser;

    document.getElementById('profile-avatar').src = getAvatarUrl(user);
    document.getElementById('profile-name').textContent = `${user.firstName} ${user.lastName || ''}`.trim();
    document.getElementById('profile-username').textContent = user.username ? `@${user.username}` : 'No username';
    document.getElementById('total-orders').textContent = formatNumber(user.totalOrders || 0);
    document.getElementById('total-spent').textContent = formatNumber(user.totalSpent || 0);
    document.getElementById('member-since').textContent = formatDate(user.createdAt, 'short');

    document.getElementById('main-app').classList.add('hidden');
    page.classList.remove('hidden');
    telegramManager.showBackButton(() => navigateTo('home'));
}

function toggleTheme() {
    const newTheme = ThemeManager.toggle();
    Toast.info(`Switched to ${newTheme} mode`);
    telegramManager.haptic('selection');
}

// ========================================
// Top-up Modal
// ========================================
function openTopupModal() {
    const modal = document.getElementById('topup-modal');
    const methodsContainer = document.getElementById('payment-methods');
    const detailsContainer = document.getElementById('payment-details');

    // Reset state
    AppState.selectedPayment = null;
    detailsContainer.classList.add('hidden');
    document.getElementById('topup-amount').value = '';
    document.getElementById('receipt-preview').classList.add('hidden');

    // Load payment methods
    const methods = db.getPaymentMethods();

    if (!methods || methods.length === 0) {
        methodsContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <p>No payment methods available</p>
            </div>
        `;
    } else {
        methodsContainer.innerHTML = methods.map(method => `
            <div class="payment-method" onclick="selectPaymentMethod('${method.id}')" id="pay-${method.id}">
                <img src="${method.iconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%233B82F6" width="100" height="100" rx="15"/><text x="50" y="60" font-size="40" fill="white" text-anchor="middle">💳</text></svg>'}" alt="${method.name}">
                <span>${method.name}</span>
            </div>
        `).join('');
    }

    modal.classList.remove('hidden');
    telegramManager.haptic('impact', 'light');
}

function closeTopupModal() {
    document.getElementById('topup-modal').classList.add('hidden');
}

function selectPaymentMethod(paymentId) {
    const method = db.getPaymentMethod(paymentId);
    if (!method) return;

    AppState.selectedPayment = method;

    // Update selection UI
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
    document.getElementById(`pay-${paymentId}`).classList.add('selected');

    // Show payment details
    const details = document.getElementById('payment-details');
    document.getElementById('payment-icon').src = method.iconUrl || '';
    document.getElementById('payment-name').textContent = method.name;
    document.getElementById('payment-address').querySelector('span').textContent = method.address;
    document.getElementById('payment-receiver').textContent = `Receiver: ${method.receiverName}`;
    document.getElementById('payment-note').textContent = method.note || '';

    details.classList.remove('hidden');
    telegramManager.haptic('selection');
}

function previewReceipt(input) {
    const file = input.files[0];
    if (!file) return;

    validateImage(file)
        .then(() => {
            return fileToBase64(file);
        })
        .then(base64 => {
            const preview = document.getElementById('receipt-preview');
            document.getElementById('preview-img').src = base64;
            preview.classList.remove('hidden');
        })
        .catch(error => {
            Toast.error(error.message || 'Invalid image');
            input.value = '';
        });
}

function removeReceipt() {
    document.getElementById('receipt-file').value = '';
    document.getElementById('receipt-preview').classList.add('hidden');
}

async function submitTopup() {
    const user = AppState.currentUser;
    const payment = AppState.selectedPayment;
    const amount = parseFloat(document.getElementById('topup-amount').value);
    const receiptFile = document.getElementById('receipt-file').files[0];

    // Validation
    if (!payment) {
        Toast.warning('Please select a payment method');
        return;
    }

    if (!amount || amount <= 0) {
        Toast.warning('Please enter a valid amount');
        return;
    }

    if (!receiptFile) {
        Toast.warning('Please upload payment receipt');
        return;
    }

    Loading.show('Submitting top-up request...');

    try {
        // Validate image for 18+ content
        await validateImage(receiptFile);

        // Convert to base64
        const receiptBase64 = await fileToBase64(receiptFile);

        // Create top-up request
        const request = await db.addTopupRequest({
            userId: user.telegramId,
            userInfo: {
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username
            },
            paymentMethodId: payment.id,
            paymentInfo: {
                name: payment.name,
                iconUrl: payment.iconUrl
            },
            amount,
            receiptUrl: receiptBase64
        });

        // Send notification to admin
        await telegramBot.sendTopupNotification(request, user);

        Loading.hide();
        closeTopupModal();

        Toast.success('Top-up request submitted! Waiting for approval.');
        telegramManager.haptic('notification', 'success');

    } catch (error) {
        Loading.hide();
        console.error('Topup error:', error);

        if (error.message.includes('18+') || error.message.includes('inappropriate')) {
            // Ban user for inappropriate content
            await db.banUser(user.telegramId, 'Uploaded inappropriate content');
            Toast.error('Your account has been banned for uploading inappropriate content.');
            setTimeout(() => location.reload(), 2000);
        } else {
            Toast.error('Failed to submit request. Please try again.');
        }

        telegramManager.haptic('notification', 'error');
    }
}

// ========================================
// Admin Panel Navigation
// ========================================
function openAdminPanel() {
    window.location.href = 'admin.html';
}

// ========================================
// Initialize App on Load
// ========================================
document.addEventListener('DOMContentLoaded', initApp);

// Export functions for HTML onclick handlers
window.openCategory = openCategory;
window.selectProduct = selectProduct;
window.shareProduct = shareProduct;
window.closeProductModal = closeProductModal;
window.confirmPurchase = confirmPurchase;
window.cancelVerification = cancelVerification;
window.verifyPayment = verifyPayment;
window.goBack = goBack;
window.showHomePage = showHomePage;
window.showOrdersPage = showOrdersPage;
window.showHistoryPage = showHistoryPage;
window.showProfilePage = showProfilePage;
window.toggleTheme = toggleTheme;
window.openTopupModal = openTopupModal;
window.closeTopupModal = closeTopupModal;
window.selectPaymentMethod = selectPaymentMethod;
window.previewReceipt = previewReceipt;
window.removeReceipt = removeReceipt;
window.submitTopup = submitTopup;
window.openAdminPanel = openAdminPanel;
window.updateInputValue = updateInputValue;
window.navigateTo = navigateTo;
