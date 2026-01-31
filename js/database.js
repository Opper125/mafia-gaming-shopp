/* ========================================
   Gaming Top-up Shop - Database Module
   JSONBin.io Integration with Persistence
   ======================================== */

// Default Schema
const DEFAULT_SCHEMA = {
    settings: {
        siteName: 'MAFIA GAMING',
        logoUrl: 'https://raw.githubusercontent.com/Opper125/mafia-gaming-shopp/899070bd925bd55226b6ca3aec90b615279190b4/20260201_033108.png',
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

// Database Class with Full Persistence
class Database {
    constructor() {
        this.binId = null;
        this.data = null;
        this.apiKey = '$2a$10$nweVi.eOGDsyC7uEsN/OxeLcIr8uhyN8x86AiIo8koJ.B7MX1I5Bu';
        this.baseUrl = 'https://api.jsonbin.io/v3';
        this.isInitialized = false;
        this.isSaving = false;
    }

    // Initialize database
    async init() {
        console.log('=== Database Initializing ===');
        
        // Try to get existing BIN_ID
        this.binId = this.getSavedBinId();
        console.log('Saved BIN_ID:', this.binId);

        if (this.binId) {
            // Load existing data
            const loaded = await this.load();
            if (loaded) {
                this.isInitialized = true;
                console.log('Database loaded successfully');
                return true;
            }
        }

        // Create new bin if no existing one
        console.log('Creating new database bin...');
        const created = await this.createBin();
        if (created) {
            this.isInitialized = true;
            console.log('New database created successfully');
            return true;
        }

        console.error('Failed to initialize database');
        return false;
    }

    // Get saved BIN_ID from multiple storage locations
    getSavedBinId() {
        // Try localStorage first
        let binId = localStorage.getItem('JSONBIN_BIN_ID');
        if (binId) return binId;

        // Try sessionStorage
        binId = sessionStorage.getItem('JSONBIN_BIN_ID');
        if (binId) {
            localStorage.setItem('JSONBIN_BIN_ID', binId);
            return binId;
        }

        return null;
    }

    // Save BIN_ID to multiple storage locations
    saveBinId(binId) {
        localStorage.setItem('JSONBIN_BIN_ID', binId);
        sessionStorage.setItem('JSONBIN_BIN_ID', binId);
        this.binId = binId;
        console.log('BIN_ID saved:', binId);
    }

    // Create new bin
    async createBin() {
        try {
            console.log('Creating new JSONBin...');
            
            const response = await fetch(`${this.baseUrl}/b`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey,
                    'X-Bin-Name': 'gaming-topup-database'
                },
                body: JSON.stringify(DEFAULT_SCHEMA)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Create bin error response:', errorText);
                throw new Error('Failed to create bin');
            }

            const result = await response.json();
            console.log('Create bin result:', result);
            
            if (result.metadata?.id) {
                this.saveBinId(result.metadata.id);
                this.data = { ...DEFAULT_SCHEMA };
                console.log('New bin created with ID:', this.binId);
                return true;
            }
            
            throw new Error('No bin ID in response');
        } catch (error) {
            console.error('Create bin error:', error);
            return false;
        }
    }

    // Load data from bin
    async load() {
        if (!this.binId) {
            console.log('No BIN_ID to load from');
            return false;
        }

        try {
            console.log('Loading data from bin:', this.binId);
            
            const response = await fetch(`${this.baseUrl}/b/${this.binId}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.apiKey
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Load error response:', errorText);
                
                // If bin not found, create new one
                if (response.status === 404) {
                    console.log('Bin not found, creating new one...');
                    localStorage.removeItem('JSONBIN_BIN_ID');
                    sessionStorage.removeItem('JSONBIN_BIN_ID');
                    return await this.createBin();
                }
                
                throw new Error('Failed to load data');
            }

            const result = await response.json();
            console.log('Load result:', result);
            
            this.data = result.record || { ...DEFAULT_SCHEMA };
            this.ensureSchema();
            
            console.log('Data loaded:', this.data);
            return true;
        } catch (error) {
            console.error('Load error:', error);
            return false;
        }
    }

    // Save data to bin
    async save() {
        if (!this.binId) {
            console.error('No BIN_ID to save to');
            return false;
        }

        if (this.isSaving) {
            console.log('Already saving, queuing...');
            await this.waitForSave();
        }

        this.isSaving = true;

        try {
            console.log('Saving data to bin:', this.binId);
            
            this.data.settings.updatedAt = new Date().toISOString();

            const response = await fetch(`${this.baseUrl}/b/${this.binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey
                },
                body: JSON.stringify(this.data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Save error response:', errorText);
                throw new Error('Failed to save data');
            }

            const result = await response.json();
            console.log('Save successful:', result.metadata);
            
            this.isSaving = false;
            return true;
        } catch (error) {
            console.error('Save error:', error);
            this.isSaving = false;
            return false;
        }
    }

    // Wait for current save to complete
    waitForSave() {
        return new Promise(resolve => {
            const checkSave = () => {
                if (!this.isSaving) {
                    resolve();
                } else {
                    setTimeout(checkSave, 100);
                }
            };
            checkSave();
        });
    }

    // Ensure all schema fields exist
    ensureSchema() {
        if (!this.data) {
            this.data = { ...DEFAULT_SCHEMA };
            return;
        }

        Object.keys(DEFAULT_SCHEMA).forEach(key => {
            if (!(key in this.data)) {
                this.data[key] = Array.isArray(DEFAULT_SCHEMA[key]) ? [] : { ...DEFAULT_SCHEMA[key] };
            }
        });
    }

    // Force reload from server
    async reload() {
        return await this.load();
    }

    // ========================================
    // Settings Operations
    // ========================================
    getSettings() {
        return this.data?.settings || DEFAULT_SCHEMA.settings;
    }

    async updateSettings(settings) {
        if (!this.data) this.data = { ...DEFAULT_SCHEMA };
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
        if (!this.data) this.data = { ...DEFAULT_SCHEMA };
        if (!this.data.users) this.data.users = [];

        const existing = this.getUser(userData.telegramId);
        if (existing) {
            return await this.updateUser(userData.telegramId, userData);
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
        if (!this.data?.users) return null;
        
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

        return await this.updateUser(telegramId, { balance: Math.max(0, newBalance) });
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

    async addCategory(categoryData) {
        if (!this.data) this.data = { ...DEFAULT_SCHEMA };
        if (!this.data.categories) this.data.categories = [];

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
        const saved = await this.save();
        console.log('Category added and saved:', saved, newCategory);
        return newCategory;
    }

    async updateCategory(categoryId, updates) {
        if (!this.data?.categories) return null;
        
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
        if (!this.data) return false;
        
        this.data.categories = (this.data.categories || []).filter(c => c.id !== categoryId);
        this.data.products = (this.data.products || []).filter(p => p.categoryId !== categoryId);
        this.data.inputTables = (this.data.inputTables || []).filter(i => i.categoryId !== categoryId);
        this.data.bannersType2 = (this.data.bannersType2 || []).filter(b => b.categoryId !== categoryId);
        
        await this.save();
        return true;
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
        if (!this.data) this.data = { ...DEFAULT_SCHEMA };
        if (!this.data.products) this.data.products = [];

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
        const saved = await this.save();
        console.log('Product added and saved:', saved, newProduct);
        return newProduct;
    }

    async updateProduct(productId, updates) {
        if (!this.data?.products) return null;
        
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
        if (!this.data?.products) return false;
        
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
        if (!this.data) this.data = { ...DEFAULT_SCHEMA };
        if (!this.data.inputTables) this.data.inputTables = [];

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
        if (!this.data?.inputTables) return null;
        
        const index = this.data.inputTables.findIndex(i => i.id === inputId);
        if (index === -1) return null;

        this.data.inputTables[index] = { ...this.data.inputTables[index], ...updates };
        await this.save();
        return this.data.inputTables[index];
    }

    async deleteInputTable(inputId) {
        if (!this.data?.inputTables) return false;
        
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
        if (categoryId) return banners.filter(b => b.categoryId === categoryId);
        return banners;
    }

    async addBannerType1(bannerData) {
        if (!this.data) this.data = { ...DEFAULT_SCHEMA };
        if (!this.data.bannersType1) this.data.bannersType1 = [];

        const newBanner = {
            id: generateId('banner1_'),
            imageUrl: bannerData.imageUrl,
            createdAt: new Date().toISOString()
        };

        this.data.bannersType1.push(newBanner);
        const saved = await this.save();
        console.log('Banner Type1 added and saved:', saved, newBanner);
        return newBanner;
    }

    async addBannerType2(bannerData) {
        if (!this.data) this.data = { ...DEFAULT_SCHEMA };
        if (!this.data.bannersType2) this.data.bannersType2 = [];

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
        if (!this.data) return false;
        
        if (type === 'type1') {
            this.data.bannersType1 = (this.data.bannersType1 || []).filter(b => b.id !== bannerId);
        } else {
            this.data.bannersType2 = (this.data.bannersType2 || []).filter(b => b.id !== bannerId);
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
        if (!this.data) this.data = { ...DEFAULT_SCHEMA };
        if (!this.data.paymentMethods) this.data.paymentMethods = [];

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
        const saved = await this.save();
        console.log('Payment method added and saved:', saved, newPayment);
        return newPayment;
    }

    async updatePaymentMethod(paymentId, updates) {
        if (!this.data?.paymentMethods) return null;
        
        const index = this.data.paymentMethods.findIndex(p => p.id === paymentId);
        if (index === -1) return null;

        this.data.paymentMethods[index] = { ...this.data.paymentMethods[index], ...updates };
        await this.save();
        return this.data.paymentMethods[index];
    }

    async deletePaymentMethod(paymentId) {
        if (!this.data?.paymentMethods) return false;
        
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
        if (!this.data) this.data = { ...DEFAULT_SCHEMA };
        if (!this.data.orders) this.data.orders = [];

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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.orders.push(newOrder);
        await this.save();
        return newOrder;
    }

    async updateOrder(orderId, updates) {
        if (!this.data?.orders) return null;
        
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
        const order = this.getOrder(orderId);
        if (!order) return null;

        order.status = 'approved';
        order.updatedAt = new Date().toISOString();

        // Update user stats
        const user = this.getUser(order.userId);
        if (user) {
            const userIndex = this.data.users.findIndex(u => String(u.telegramId) === String(order.userId));
            if (userIndex !== -1) {
                this.data.users[userIndex].approvedOrders = (this.data.users[userIndex].approvedOrders || 0) + 1;
                this.data.users[userIndex].totalSpent = (this.data.users[userIndex].totalSpent || 0) + order.amount;
            }
        }

        // Update category sold count
        const catIndex = this.data.categories?.findIndex(c => c.id === order.categoryId);
        if (catIndex !== -1 && catIndex !== undefined) {
            this.data.categories[catIndex].totalSold = (this.data.categories[catIndex].totalSold || 0) + 1;
        }

        // Update product sold count
        const prodIndex = this.data.products?.findIndex(p => p.id === order.productId);
        if (prodIndex !== -1 && prodIndex !== undefined) {
            this.data.products[prodIndex].totalSold = (this.data.products[prodIndex].totalSold || 0) + 1;
        }

        await this.save();
        return order;
    }

    async rejectOrder(orderId) {
        const order = this.getOrder(orderId);
        if (!order) return null;

        order.status = 'rejected';
        order.updatedAt = new Date().toISOString();

        // Refund user
        await this.updateUserBalance(order.userId, order.amount, 'add');

        // Update user stats
        const userIndex = this.data.users?.findIndex(u => String(u.telegramId) === String(order.userId));
        if (userIndex !== -1 && userIndex !== undefined) {
            this.data.users[userIndex].rejectedOrders = (this.data.users[userIndex].rejectedOrders || 0) + 1;
        }

        await this.save();
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
        if (!this.data) this.data = { ...DEFAULT_SCHEMA };
        if (!this.data.topupRequests) this.data.topupRequests = [];

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

        request.status = 'approved';
        request.updatedAt = new Date().toISOString();

        // Add balance to user
        const user = this.getUser(request.userId);
        if (user) {
            const userIndex = this.data.users.findIndex(u => String(u.telegramId) === String(request.userId));
            if (userIndex !== -1) {
                this.data.users[userIndex].balance = (this.data.users[userIndex].balance || 0) + request.amount;
                this.data.users[userIndex].totalDeposits = (this.data.users[userIndex].totalDeposits || 0) + request.amount;
                this.data.users[userIndex].depositCount = (this.data.users[userIndex].depositCount || 0) + 1;
            }
        }

        await this.save();
        return request;
    }

    async rejectTopupRequest(requestId) {
        const request = this.getTopupRequest(requestId);
        if (!request) return null;

        request.status = 'rejected';
        request.updatedAt = new Date().toISOString();

        await this.save();
        return request;
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
        if (!this.data) this.data = { ...DEFAULT_SCHEMA };
        if (!this.data.bannedUsers) this.data.bannedUsers = [];
        
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
        if (!this.data?.bannedUsers) return false;
        
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
            totalRevenue: orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + (o.amount || 0), 0),
            pendingTopups: topups.filter(t => t.status === 'pending').length,
            totalDeposits: topups.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.amount || 0), 0),
            bannedUsers: this.getBannedUsers().length
        };
    }

    // Get current BIN_ID for display
    getBinId() {
        return this.binId;
    }
}

// Create database instance
const db = new Database();

// Make global
window.Database = Database;
window.db = db;
window.DEFAULT_SCHEMA = DEFAULT_SCHEMA;
