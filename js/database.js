/* ========================================
   Gaming Top-up Shop - Database Module
   JSONBin.io Integration
   ======================================== */

// ========================================
// Database Configuration
// ========================================
const DB_CONFIG = {
    baseUrl: 'https://api.jsonbin.io/v3',
    headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': CONFIG.JSONBIN_API_KEY,
        'X-Access-Key': CONFIG.JSONBIN_ACCESS_KEY
    }
};

// ========================================
// Default Database Schema
// ========================================
const DEFAULT_SCHEMA = {
    settings: {
        siteName: 'Gaming Top-up Shop',
        logoUrl: '',
        marqueeText: 'Welcome to Gaming Top-up Shop! 🎮 Best prices for PUBG Mobile UC & Mobile Legends Diamonds!',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    users: [],
    categories: [],
    products: [],
    inputTables: [],
    bannersType1: [],
    bannersType2: [],
    paymentMethods: [],
    orders: [],
    topupRequests: [],
    bannedUsers: []
};

// ========================================
// Database Class
// ========================================
class Database {
    constructor() {
        this.binId = CONFIG.JSONBIN_BIN_ID || Storage.get('JSONBIN_BIN_ID');
        this.data = null;
        this.lastSync = null;
    }

    // Initialize database
    async init() {
        if (!this.binId) {
            console.log('No bin ID found, need to create or set one');
            return false;
        }

        try {
            await this.load();
            return true;
        } catch (error) {
            console.error('Database init error:', error);
            return false;
        }
    }

    // Create new bin
    async createBin() {
        try {
            const response = await fetch(`${DB_CONFIG.baseUrl}/b`, {
                method: 'POST',
                headers: DB_CONFIG.headers,
                body: JSON.stringify(DEFAULT_SCHEMA)
            });

            if (!response.ok) {
                throw new Error('Failed to create bin');
            }

            const result = await response.json();
            this.binId = result.metadata.id;
            this.data = DEFAULT_SCHEMA;

            // Save bin ID
            Storage.set('JSONBIN_BIN_ID', this.binId);
            CONFIG.JSONBIN_BIN_ID = this.binId;

            console.log('Created new bin:', this.binId);
            return this.binId;
        } catch (error) {
            console.error('Create bin error:', error);
            throw error;
        }
    }

    // Load data from bin
    async load() {
        try {
            const response = await fetch(`${DB_CONFIG.baseUrl}/b/${this.binId}/latest`, {
                headers: DB_CONFIG.headers
            });

            if (!response.ok) {
                throw new Error('Failed to load data');
            }

            const result = await response.json();
            this.data = result.record;
            this.lastSync = new Date();

            // Ensure all required fields exist
            this.ensureSchema();

            return this.data;
        } catch (error) {
            console.error('Load error:', error);
            throw error;
        }
    }

    // Save data to bin
    async save() {
        try {
            if (!this.binId || !this.data) {
                throw new Error('No bin ID or data');
            }

            this.data.settings.updatedAt = new Date().toISOString();

            const response = await fetch(`${DB_CONFIG.baseUrl}/b/${this.binId}`, {
                method: 'PUT',
                headers: DB_CONFIG.headers,
                body: JSON.stringify(this.data)
            });

            if (!response.ok) {
                throw new Error('Failed to save data');
            }

            this.lastSync = new Date();
            return true;
        } catch (error) {
            console.error('Save error:', error);
            throw error;
        }
    }

    // Ensure all schema fields exist
    ensureSchema() {
        if (!this.data) {
            this.data = { ...DEFAULT_SCHEMA };
            return;
        }

        Object.keys(DEFAULT_SCHEMA).forEach(key => {
            if (!(key in this.data)) {
                this.data[key] = DEFAULT_SCHEMA[key];
            }
        });
    }

    // Set bin ID manually
    setBinId(binId) {
        this.binId = binId;
        Storage.set('JSONBIN_BIN_ID', binId);
        CONFIG.JSONBIN_BIN_ID = binId;
    }

    // ========================================
    // Settings Operations
    // ========================================
    getSettings() {
        return this.data?.settings || DEFAULT_SCHEMA.settings;
    }

    async updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        await this.save();
        return this.data.settings;
    }

    // ========================================
    // Users Operations
    // ========================================
    getUsers() {
        return this.data?.users || [];
    }

    getUser(telegramId) {
        return this.getUsers().find(u => String(u.telegramId) === String(telegramId));
    }

    async addUser(userData) {
        const existingUser = this.getUser(userData.telegramId);
        if (existingUser) {
            return this.updateUser(userData.telegramId, userData);
        }

        const newUser = {
            id: generateId('user_'),
            telegramId: String(userData.telegramId),
            username: userData.username || '',
            firstName: userData.first_name || userData.firstName || '',
            lastName: userData.last_name || userData.lastName || '',
            photoUrl: userData.photo_url || userData.photoUrl || '',
            isPremium: userData.is_premium || userData.isPremium || false,
            balance: 0,
            totalSpent: 0,
            totalOrders: 0,
            approvedOrders: 0,
            rejectedOrders: 0,
            totalDeposits: 0,
            depositCount: 0,
            failedPurchaseAttempts: 0,
            lastFailedAttemptDate: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.users.push(newUser);
        await this.save();
        return newUser;
    }

    async updateUser(telegramId, updates) {
        const index = this.data.users.findIndex(u => String(u.telegramId) === String(telegramId));
        if (index === -1) return null;

        this.data.users[index] = {
            ...this.data.users[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.save();
        return this.data.users[index];
    }

    async updateUserBalance(telegramId, amount, operation = 'add') {
        const user = this.getUser(telegramId);
        if (!user) return null;

        let newBalance = user.balance;
        if (operation === 'add') {
            newBalance += amount;
        } else if (operation === 'subtract') {
            newBalance -= amount;
        } else if (operation === 'set') {
            newBalance = amount;
        }

        return this.updateUser(telegramId, { balance: Math.max(0, newBalance) });
    }

    // ========================================
    // Categories Operations
    // ========================================
    getCategories() {
        return this.data?.categories || [];
    }

    getCategory(categoryId) {
        return this.getCategories().find(c => c.id === categoryId);
    }

    getCategoryByName(name) {
        return this.getCategories().find(c => c.name.toLowerCase() === name.toLowerCase());
    }

    async addCategory(categoryData) {
        const newCategory = {
            id: generateId('cat_'),
            name: categoryData.name,
            iconUrl: categoryData.iconUrl || '',
            flag: categoryData.flag || '',
            hasDiscount: categoryData.hasDiscount || false,
            totalSold: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.categories.push(newCategory);
        await this.save();
        return newCategory;
    }

    async updateCategory(categoryId, updates) {
        const index = this.data.categories.findIndex(c => c.id === categoryId);
        if (index === -1) return null;

        this.data.categories[index] = {
            ...this.data.categories[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.save();
        return this.data.categories[index];
    }

    async deleteCategory(categoryId) {
        this.data.categories = this.data.categories.filter(c => c.id !== categoryId);
        // Also delete related products and input tables
        this.data.products = this.data.products.filter(p => p.categoryId !== categoryId);
        this.data.inputTables = this.data.inputTables.filter(i => i.categoryId !== categoryId);
        await this.save();
        return true;
    }

    async incrementCategorySold(categoryId) {
        const category = this.getCategory(categoryId);
        if (category) {
            await this.updateCategory(categoryId, { totalSold: (category.totalSold || 0) + 1 });
        }
    }

    // ========================================
    // Products Operations
    // ========================================
    getProducts() {
        return this.data?.products || [];
    }

    getProduct(productId) {
        return this.getProducts().find(p => p.id === productId);
    }

    getProductsByCategory(categoryId) {
        return this.getProducts().filter(p => p.categoryId === categoryId);
    }

    async addProduct(productData) {
        const newProduct = {
            id: generateId('prod_'),
            categoryId: productData.categoryId,
            name: productData.name,
            price: parseFloat(productData.price),
            currency: productData.currency || 'MMK',
            discount: parseFloat(productData.discount) || 0,
            iconUrl: productData.iconUrl || '',
            deliveryType: productData.deliveryType || 'instant',
            deliveryTime: productData.deliveryTime || '',
            totalSold: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.products.push(newProduct);
        await this.save();
        return newProduct;
    }

    async updateProduct(productId, updates) {
        const index = this.data.products.findIndex(p => p.id === productId);
        if (index === -1) return null;

        this.data.products[index] = {
            ...this.data.products[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.save();
        return this.data.products[index];
    }

    async deleteProduct(productId) {
        this.data.products = this.data.products.filter(p => p.id !== productId);
        await this.save();
        return true;
    }

    // ========================================
    // Input Tables Operations
    // ========================================
    getInputTables() {
        return this.data?.inputTables || [];
    }

    getInputTablesByCategory(categoryId) {
        return this.getInputTables().filter(i => i.categoryId === categoryId);
    }

    async addInputTable(inputData) {
        const newInput = {
            id: generateId('input_'),
            categoryId: inputData.categoryId,
            name: inputData.name,
            placeholder: inputData.placeholder || '',
            required: true,
            createdAt: new Date().toISOString()
        };

        this.data.inputTables.push(newInput);
        await this.save();
        return newInput;
    }

    async updateInputTable(inputId, updates) {
        const index = this.data.inputTables.findIndex(i => i.id === inputId);
        if (index === -1) return null;

        this.data.inputTables[index] = {
            ...this.data.inputTables[index],
            ...updates
        };

        await this.save();
        return this.data.inputTables[index];
    }

    async deleteInputTable(inputId) {
        this.data.inputTables = this.data.inputTables.filter(i => i.id !== inputId);
        await this.save();
        return true;
    }

    // ========================================
    // Banners Operations
    // ========================================
    getBannersType1() {
        return this.data?.bannersType1 || [];
    }

    getBannersType2(categoryId = null) {
        const banners = this.data?.bannersType2 || [];
        if (categoryId) {
            return banners.filter(b => b.categoryId === categoryId);
        }
        return banners;
    }

    async addBannerType1(bannerData) {
        const newBanner = {
            id: generateId('banner1_'),
            imageUrl: bannerData.imageUrl,
            createdAt: new Date().toISOString()
        };

        this.data.bannersType1.push(newBanner);
        await this.save();
        return newBanner;
    }

    async addBannerType2(bannerData) {
        const newBanner = {
            id: generateId('banner2_'),
            categoryId: bannerData.categoryId,
            imageUrl: bannerData.imageUrl,
            guideText: bannerData.guideText || '',
            createdAt: new Date().toISOString()
        };

        this.data.bannersType2.push(newBanner);
        await this.save();
        return newBanner;
    }

    async deleteBanner(bannerId, type) {
        if (type === 'type1') {
            this.data.bannersType1 = this.data.bannersType1.filter(b => b.id !== bannerId);
        } else {
            this.data.bannersType2 = this.data.bannersType2.filter(b => b.id !== bannerId);
        }
        await this.save();
        return true;
    }

    // ========================================
    // Payment Methods Operations
    // ========================================
    getPaymentMethods() {
        return this.data?.paymentMethods || [];
    }

    getPaymentMethod(paymentId) {
        return this.getPaymentMethods().find(p => p.id === paymentId);
    }

    async addPaymentMethod(paymentData) {
        const newPayment = {
            id: generateId('pay_'),
            name: paymentData.name,
            address: paymentData.address,
            receiverName: paymentData.receiverName,
            note: paymentData.note || '',
            iconUrl: paymentData.iconUrl || '',
            createdAt: new Date().toISOString()
        };

        this.data.paymentMethods.push(newPayment);
        await this.save();
        return newPayment;
    }

    async updatePaymentMethod(paymentId, updates) {
        const index = this.data.paymentMethods.findIndex(p => p.id === paymentId);
        if (index === -1) return null;

        this.data.paymentMethods[index] = {
            ...this.data.paymentMethods[index],
            ...updates
        };

        await this.save();
        return this.data.paymentMethods[index];
    }

    async deletePaymentMethod(paymentId) {
        this.data.paymentMethods = this.data.paymentMethods.filter(p => p.id !== paymentId);
        await this.save();
        return true;
    }

    // ========================================
    // Orders Operations
    // ========================================
    getOrders() {
        return this.data?.orders || [];
    }

    getOrder(orderId) {
        return this.getOrders().find(o => o.id === orderId);
    }

    getOrdersByUser(telegramId) {
        return this.getOrders().filter(o => String(o.userId) === String(telegramId));
    }

    getPendingOrders() {
        return this.getOrders().filter(o => o.status === 'pending');
    }

    async addOrder(orderData) {
        const newOrder = {
            id: orderData.orderId || generateOrderId(),
            oderId: orderData.orderId || generateOrderId(),
            userId: String(orderData.userId),
            userInfo: orderData.userInfo,
            productId: orderData.productId,
            productInfo: orderData.productInfo,
            categoryId: orderData.categoryId,
            inputValues: orderData.inputValues || {},
            amount: parseFloat(orderData.amount),
            currency: orderData.currency || 'MMK',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.orders.push(newOrder);
        await this.save();
        return newOrder;
    }

    async updateOrder(orderId, updates) {
        const index = this.data.orders.findIndex(o => o.id === orderId);
        if (index === -1) return null;

        this.data.orders[index] = {
            ...this.data.orders[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.save();
        return this.data.orders[index];
    }

    async approveOrder(orderId) {
        const order = await this.updateOrder(orderId, { status: 'approved' });
        if (order) {
            // Update user stats
            const user = this.getUser(order.userId);
            if (user) {
                await this.updateUser(order.userId, {
                    approvedOrders: (user.approvedOrders || 0) + 1,
                    totalSpent: (user.totalSpent || 0) + order.amount
                });
            }
            // Update category sold count
            await this.incrementCategorySold(order.categoryId);
            // Update product sold count
            const product = this.getProduct(order.productId);
            if (product) {
                await this.updateProduct(order.productId, { totalSold: (product.totalSold || 0) + 1 });
            }
        }
        return order;
    }

    async rejectOrder(orderId) {
        const order = await this.updateOrder(orderId, { status: 'rejected' });
        if (order) {
            // Refund the user
            await this.updateUserBalance(order.userId, order.amount, 'add');
            // Update user stats
            const user = this.getUser(order.userId);
            if (user) {
                await this.updateUser(order.userId, {
                    rejectedOrders: (user.rejectedOrders || 0) + 1
                });
            }
        }
        return order;
    }

    // ========================================
    // Topup Requests Operations
    // ========================================
    getTopupRequests() {
        return this.data?.topupRequests || [];
    }

    getTopupRequest(requestId) {
        return this.getTopupRequests().find(t => t.id === requestId);
    }

    getTopupRequestsByUser(telegramId) {
        return this.getTopupRequests().filter(t => String(t.userId) === String(telegramId));
    }

    getPendingTopupRequests() {
        return this.getTopupRequests().filter(t => t.status === 'pending');
    }

    async addTopupRequest(requestData) {
        const newRequest = {
            id: generateId('topup_'),
            userId: String(requestData.userId),
            userInfo: requestData.userInfo,
            paymentMethodId: requestData.paymentMethodId,
            paymentInfo: requestData.paymentInfo,
            amount: parseFloat(requestData.amount),
            receiptUrl: requestData.receiptUrl,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.topupRequests.push(newRequest);
        await this.save();
        return newRequest;
    }

    async approveTopupRequest(requestId) {
        const request = this.getTopupRequest(requestId);
        if (!request) return null;

        // Update request status
        const updatedRequest = await this.updateTopupRequest(requestId, { status: 'approved' });

        // Add balance to user
        const user = this.getUser(request.userId);
        if (user) {
            await this.updateUser(request.userId, {
                balance: (user.balance || 0) + request.amount,
                totalDeposits: (user.totalDeposits || 0) + request.amount,
                depositCount: (user.depositCount || 0) + 1
            });
        }

        return updatedRequest;
    }

    async rejectTopupRequest(requestId) {
        return this.updateTopupRequest(requestId, { status: 'rejected' });
    }

    async updateTopupRequest(requestId, updates) {
        const index = this.data.topupRequests.findIndex(t => t.id === requestId);
        if (index === -1) return null;

        this.data.topupRequests[index] = {
            ...this.data.topupRequests[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.save();
        return this.data.topupRequests[index];
    }

    // ========================================
    // Banned Users Operations
    // ========================================
    getBannedUsers() {
        return this.data?.bannedUsers || [];
    }

    isUserBanned(telegramId) {
        return this.getBannedUsers().some(b => String(b.telegramId) === String(telegramId));
    }

    async banUser(telegramId, reason = '') {
        if (this.isUserBanned(telegramId)) return false;

        const user = this.getUser(telegramId);
        this.data.bannedUsers.push({
            telegramId: String(telegramId),
            userInfo: user || {},
            reason,
            bannedAt: new Date().toISOString()
        });

        await this.save();
        return true;
    }

    async unbanUser(telegramId) {
        this.data.bannedUsers = this.data.bannedUsers.filter(
            b => String(b.telegramId) !== String(telegramId)
        );
        await this.save();
        return true;
    }

    // ========================================
    // Statistics
    // ========================================
    getStats() {
        const users = this.getUsers();
        const orders = this.getOrders();
        const topups = this.getTopupRequests();

        return {
            totalUsers: users.length,
            premiumUsers: users.filter(u => u.isPremium).length,
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'pending').length,
            approvedOrders: orders.filter(o => o.status === 'approved').length,
            rejectedOrders: orders.filter(o => o.status === 'rejected').length,
            totalRevenue: orders
                .filter(o => o.status === 'approved')
                .reduce((sum, o) => sum + o.amount, 0),
            pendingTopups: topups.filter(t => t.status === 'pending').length,
            totalDeposits: topups
                .filter(t => t.status === 'approved')
                .reduce((sum, t) => sum + t.amount, 0),
            bannedUsers: this.getBannedUsers().length
        };
    }
}

// Create database instance
const db = new Database();

// Export
window.Database = Database;
window.db = db;
window.DEFAULT_SCHEMA = DEFAULT_SCHEMA;
