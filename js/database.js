/* ========================================
   Gaming Top-up Shop - Database Module
   JSONBin.io Integration
   ======================================== */

// Default Schema
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

// Database Class
class Database {
    constructor() {
        this.binId = Storage.get('JSONBIN_BIN_ID') || '';
        this.data = null;
        this.apiKey = CONFIG.JSONBIN_API_KEY;
        this.baseUrl = 'https://api.jsonbin.io/v3';
    }

    async init() {
        console.log('Initializing database...');
        
        if (!this.binId) {
            console.log('No bin ID, creating new bin...');
            await this.createBin();
        }

        try {
            await this.load();
            console.log('Database loaded:', this.data);
            return true;
        } catch (error) {
            console.error('Database init error:', error);
            // Try creating new bin
            await this.createBin();
            return true;
        }
    }

    async createBin() {
        try {
            const response = await fetch(`${this.baseUrl}/b`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey
                },
                body: JSON.stringify(DEFAULT_SCHEMA)
            });

            const result = await response.json();
            
            if (result.metadata?.id) {
                this.binId = result.metadata.id;
                this.data = DEFAULT_SCHEMA;
                Storage.set('JSONBIN_BIN_ID', this.binId);
                console.log('Created new bin:', this.binId);
                return this.binId;
            }
            
            throw new Error('Failed to create bin');
        } catch (error) {
            console.error('Create bin error:', error);
            // Use local storage as fallback
            this.data = Storage.get('LOCAL_DATABASE') || DEFAULT_SCHEMA;
            return null;
        }
    }

    async load() {
        if (!this.binId) {
            this.data = Storage.get('LOCAL_DATABASE') || DEFAULT_SCHEMA;
            return this.data;
        }

        try {
            const response = await fetch(`${this.baseUrl}/b/${this.binId}/latest`, {
                headers: {
                    'X-Master-Key': this.apiKey
                }
            });

            const result = await response.json();
            this.data = result.record || DEFAULT_SCHEMA;
            this.ensureSchema();
            
            // Also save locally
            Storage.set('LOCAL_DATABASE', this.data);
            
            return this.data;
        } catch (error) {
            console.error('Load error:', error);
            this.data = Storage.get('LOCAL_DATABASE') || DEFAULT_SCHEMA;
            return this.data;
        }
    }

    async save() {
        // Always save locally first
        Storage.set('LOCAL_DATABASE', this.data);

        if (!this.binId) {
            return true;
        }

        try {
            this.data.settings.updatedAt = new Date().toISOString();

            const response = await fetch(`${this.baseUrl}/b/${this.binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey
                },
                body: JSON.stringify(this.data)
            });

            return response.ok;
        } catch (error) {
            console.error('Save error:', error);
            return false;
        }
    }

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

    // Settings
    getSettings() {
        return this.data?.settings || DEFAULT_SCHEMA.settings;
    }

    async updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        await this.save();
        return this.data.settings;
    }

    // Users
    getUsers() {
        return this.data?.users || [];
    }

    getUser(telegramId) {
        return this.getUsers().find(u => String(u.telegramId) === String(telegramId));
    }

    async addUser(userData) {
        const existing = this.getUser(userData.telegramId);
        if (existing) {
            return this.updateUser(userData.telegramId, userData);
        }

        const newUser = {
            id: generateId('user_'),
            telegramId: String(userData.telegramId),
            username: userData.username || '',
            firstName: userData.firstName || userData.first_name || '',
            lastName: userData.lastName || userData.last_name || '',
            photoUrl: userData.photoUrl || userData.photo_url || '',
            isPremium: userData.isPremium || userData.is_premium || false,
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

        let newBalance = user.balance || 0;
        if (operation === 'add') newBalance += amount;
        else if (operation === 'subtract') newBalance -= amount;
        else if (operation === 'set') newBalance = amount;

        return this.updateUser(telegramId, { balance: Math.max(0, newBalance) });
    }

    // Categories
    getCategories() {
        return this.data?.categories || [];
    }

    getCategory(categoryId) {
        return this.getCategories().find(c => c.id === categoryId);
    }

    async addCategory(categoryData) {
        const newCategory = {
            id: generateId('cat_'),
            name: categoryData.name,
            iconUrl: categoryData.iconUrl || '',
            flag: categoryData.flag || '',
            hasDiscount: categoryData.hasDiscount || false,
            totalSold: 0,
            createdAt: new Date().toISOString()
        };

        this.data.categories.push(newCategory);
        await this.save();
        return newCategory;
    }

    async updateCategory(categoryId, updates) {
        const index = this.data.categories.findIndex(c => c.id === categoryId);
        if (index === -1) return null;

        this.data.categories[index] = { ...this.data.categories[index], ...updates };
        await this.save();
        return this.data.categories[index];
    }

    async deleteCategory(categoryId) {
        this.data.categories = this.data.categories.filter(c => c.id !== categoryId);
        this.data.products = this.data.products.filter(p => p.categoryId !== categoryId);
        this.data.inputTables = this.data.inputTables.filter(i => i.categoryId !== categoryId);
        await this.save();
        return true;
    }

    // Products
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
            createdAt: new Date().toISOString()
        };

        this.data.products.push(newProduct);
        await this.save();
        return newProduct;
    }

    async updateProduct(productId, updates) {
        const index = this.data.products.findIndex(p => p.id === productId);
        if (index === -1) return null;

        this.data.products[index] = { ...this.data.products[index], ...updates };
        await this.save();
        return this.data.products[index];
    }

    async deleteProduct(productId) {
        this.data.products = this.data.products.filter(p => p.id !== productId);
        await this.save();
        return true;
    }

    // Input Tables
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
            createdAt: new Date().toISOString()
        };

        this.data.inputTables.push(newInput);
        await this.save();
        return newInput;
    }

    async updateInputTable(inputId, updates) {
        const index = this.data.inputTables.findIndex(i => i.id === inputId);
        if (index === -1) return null;

        this.data.inputTables[index] = { ...this.data.inputTables[index], ...updates };
        await this.save();
        return this.data.inputTables[index];
    }

    async deleteInputTable(inputId) {
        this.data.inputTables = this.data.inputTables.filter(i => i.id !== inputId);
        await this.save();
        return true;
    }

    // Banners
    getBannersType1() {
        return this.data?.bannersType1 || [];
    }

    getBannersType2(categoryId = null) {
        const banners = this.data?.bannersType2 || [];
        if (categoryId) return banners.filter(b => b.categoryId === categoryId);
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

    // Payment Methods
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

        this.data.paymentMethods[index] = { ...this.data.paymentMethods[index], ...updates };
        await this.save();
        return this.data.paymentMethods[index];
    }

    async deletePaymentMethod(paymentId) {
        this.data.paymentMethods = this.data.paymentMethods.filter(p => p.id !== paymentId);
        await this.save();
        return true;
    }

    // Orders
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
            id: generateOrderId(),
            userId: String(orderData.userId),
            userInfo: orderData.userInfo,
            productId: orderData.productId,
            productInfo: orderData.productInfo,
            categoryId: orderData.categoryId,
            inputValues: orderData.inputValues || {},
            amount: parseFloat(orderData.amount),
            currency: orderData.currency || 'MMK',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        this.data.orders.push(newOrder);
        await this.save();
        return newOrder;
    }

    async updateOrder(orderId, updates) {
        const index = this.data.orders.findIndex(o => o.id === orderId);
        if (index === -1) return null;

        this.data.orders[index] = { ...this.data.orders[index], ...updates };
        await this.save();
        return this.data.orders[index];
    }

    async approveOrder(orderId) {
        const order = await this.updateOrder(orderId, { status: 'approved' });
        if (order) {
            const user = this.getUser(order.userId);
            if (user) {
                await this.updateUser(order.userId, {
                    approvedOrders: (user.approvedOrders || 0) + 1,
                    totalSpent: (user.totalSpent || 0) + order.amount
                });
            }
            // Update category sold
            const catIndex = this.data.categories.findIndex(c => c.id === order.categoryId);
            if (catIndex !== -1) {
                this.data.categories[catIndex].totalSold = (this.data.categories[catIndex].totalSold || 0) + 1;
            }
            await this.save();
        }
        return order;
    }

    async rejectOrder(orderId) {
        const order = await this.updateOrder(orderId, { status: 'rejected' });
        if (order) {
            await this.updateUserBalance(order.userId, order.amount, 'add');
            const user = this.getUser(order.userId);
            if (user) {
                await this.updateUser(order.userId, {
                    rejectedOrders: (user.rejectedOrders || 0) + 1
                });
            }
        }
        return order;
    }

    // Topup Requests
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
            createdAt: new Date().toISOString()
        };

        this.data.topupRequests.push(newRequest);
        await this.save();
        return newRequest;
    }

    async approveTopupRequest(requestId) {
        const request = this.getTopupRequest(requestId);
        if (!request) return null;

        request.status = 'approved';
        
        const user = this.getUser(request.userId);
        if (user) {
            await this.updateUser(request.userId, {
                balance: (user.balance || 0) + request.amount,
                totalDeposits: (user.totalDeposits || 0) + request.amount,
                depositCount: (user.depositCount || 0) + 1
            });
        }

        await this.save();
        return request;
    }

    async rejectTopupRequest(requestId) {
        const request = this.getTopupRequest(requestId);
        if (!request) return null;

        request.status = 'rejected';
        await this.save();
        return request;
    }

    // Banned Users
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

    // Stats
    getStats() {
        const users = this.getUsers();
        const orders = this.getOrders();
        const topups = this.getTopupRequests();

        return {
            totalUsers: users.length,
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'pending').length,
            approvedOrders: orders.filter(o => o.status === 'approved').length,
            totalRevenue: orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + o.amount, 0),
            pendingTopups: topups.filter(t => t.status === 'pending').length,
            bannedUsers: this.getBannedUsers().length
        };
    }
}

// Create instance
const db = new Database();

// Make global
window.Database = Database;
window.db = db;
window.DEFAULT_SCHEMA = DEFAULT_SCHEMA;
