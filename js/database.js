/* ========================================
   Gaming Top-up Shop - Database Module
   Supabase Integration
   ======================================== */

// Supabase Client Initialization
const SUPABASE_URL = 'https://dvxgytiknttrrotqairdjv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2eGd5dGlrbnR0cm90cWFpcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4ODgzMTksImV4cCI6MjA4NTQ2NDMxOX0.WwhxdeLP-yoc-zXbcUIdZcEmt3-WyJZHDhV2irI8ul0';

// Declare variables
const DEFAULT_SCHEMA = {
    settings: {},
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

function generateId(prefix) {
    return `${prefix}${Math.random().toString(36).substr(2, 9)}`;
}

function generateOrderId() {
    return generateId('order_');
}

// Database Class
class Database {
    constructor() {
        this.supabaseUrl = SUPABASE_URL;
        this.supabaseKey = SUPABASE_KEY;
        this.data = { ...DEFAULT_SCHEMA }; // Initialize data with DEFAULT_SCHEMA
    }

    async init() {
        console.log('Initializing Supabase database...');
        
        try {
            await this.load();
            console.log('Database initialized successfully');
            return true;
        } catch (error) {
            console.error('Database init error:', error);
            return false;
        }
    }

    async makeRequest(table, method = 'GET', data = null, filters = {}) {
        try {
            let url = `${this.supabaseUrl}/rest/v1/${table}`;
            
            // Add filters
            const filterParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    filterParams.append(`${key}=eq.${value}`);
                }
            });
            if (filterParams.toString()) {
                url += `?${filterParams.toString()}`;
            }

            const options = {
                method,
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Database request error for ${table}:`, error);
            throw error;
        }
    }

    async load() {
        console.log('[v0] Loading database from Supabase');
        return true;
    }

    // Settings
    async getSettings() {
        try {
            const result = await this.makeRequest('settings', 'GET');
            return result && result.length > 0 ? result[0] : {
                siteName: 'MAFIA GAMING',
                logoUrl: 'https://raw.githubusercontent.com/Opper125/mafia-gaming-shopp/899070bd925bd55226b6ca3aec90b615279190b4/20260201_033108.png',
                marqueeText: 'Welcome to Gaming Top-up Shop! 🎮 Best prices for PUBG Mobile UC & Mobile Legends Diamonds!',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching settings:', error);
            return {};
        }
    }

    async updateSettings(updates) {
        try {
            const settings = await this.getSettings();
            const updated = {
                ...settings,
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            if (settings.id) {
                await this.makeRequest('settings', 'PATCH', updated, { id: settings.id });
            } else {
                await this.makeRequest('settings', 'POST', updated);
            }
            
            return updated;
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    }

    // Users
    async getUsers() {
        try {
            return await this.makeRequest('users', 'GET') || [];
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    }

    async getUser(telegramId) {
        try {
            const result = await this.makeRequest('users', 'GET', null, { telegram_id: telegramId });
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    async addUser(userData) {
        try {
            const existing = await this.getUser(userData.telegramId);
            if (existing) {
                return this.updateUser(userData.telegramId, userData);
            }

            const newUser = {
                telegram_id: String(userData.telegramId),
                username: userData.username || '',
                first_name: userData.firstName || userData.first_name || '',
                last_name: userData.lastName || userData.last_name || '',
                photo_url: userData.photoUrl || userData.photo_url || '',
                is_premium: userData.isPremium || userData.is_premium || false,
                balance: 0,
                total_spent: 0,
                total_orders: 0,
                approved_orders: 0,
                rejected_orders: 0,
                total_deposits: 0,
                deposit_count: 0,
                failed_purchase_attempts: 0,
                last_failed_attempt_date: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const result = await this.makeRequest('users', 'POST', newUser);
            return result && result.length > 0 ? result[0] : newUser;
        } catch (error) {
            console.error('Error adding user:', error);
            throw error;
        }
    }

    async updateUser(telegramId, updates) {
        try {
            const user = await this.getUser(telegramId);
            if (!user) return null;

            const updateData = {
                username: updates.username || user.username,
                first_name: updates.firstName || updates.first_name || user.first_name,
                last_name: updates.lastName || updates.last_name || user.last_name,
                photo_url: updates.photoUrl || updates.photo_url || user.photo_url,
                is_premium: updates.isPremium !== undefined ? updates.isPremium : user.is_premium,
                balance: updates.balance !== undefined ? updates.balance : user.balance,
                total_spent: updates.totalSpent || updates.total_spent || user.total_spent,
                total_orders: updates.totalOrders || updates.total_orders || user.total_orders,
                approved_orders: updates.approvedOrders || updates.approved_orders || user.approved_orders,
                rejected_orders: updates.rejectedOrders || updates.rejected_orders || user.rejected_orders,
                total_deposits: updates.totalDeposits || updates.total_deposits || user.total_deposits,
                deposit_count: updates.depositCount || updates.deposit_count || user.deposit_count,
                failed_purchase_attempts: updates.failedPurchaseAttempts || updates.failed_purchase_attempts || user.failed_purchase_attempts,
                last_failed_attempt_date: updates.lastFailedAttemptDate || updates.last_failed_attempt_date || user.last_failed_attempt_date,
                updated_at: new Date().toISOString()
            };

            const result = await this.makeRequest('users', 'PATCH', updateData, { telegram_id: telegramId });
            return result && result.length > 0 ? result[0] : updateData;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async updateUserBalance(telegramId, amount, operation = 'add') {
        try {
            const user = await this.getUser(telegramId);
            if (!user) return null;

            let newBalance = user.balance || 0;
            if (operation === 'add') newBalance += amount;
            else if (operation === 'subtract') newBalance -= amount;
            else if (operation === 'set') newBalance = amount;

            return this.updateUser(telegramId, { balance: Math.max(0, newBalance) });
        } catch (error) {
            console.error('Error updating balance:', error);
            throw error;
        }
    }

    // Categories
    async getCategories() {
        try {
            return await this.makeRequest('categories', 'GET') || [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    async getCategory(categoryId) {
        try {
            const result = await this.makeRequest('categories', 'GET', null, { id: categoryId });
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error fetching category:', error);
            return null;
        }
    }

    async addCategory(categoryData) {
        try {
            const newCategory = {
                name: categoryData.name,
                icon_url: categoryData.iconUrl || '',
                flag: categoryData.flag || '',
                has_discount: categoryData.hasDiscount || false,
                total_sold: 0,
                created_at: new Date().toISOString()
            };

            const result = await this.makeRequest('categories', 'POST', newCategory);
            return result && result.length > 0 ? result[0] : newCategory;
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    }

    async updateCategory(categoryId, updates) {
        try {
            const updateData = {
                name: updates.name,
                icon_url: updates.iconUrl || updates.icon_url,
                flag: updates.flag,
                has_discount: updates.hasDiscount !== undefined ? updates.hasDiscount : updates.has_discount,
                total_sold: updates.totalSold || updates.total_sold
            };

            const result = await this.makeRequest('categories', 'PATCH', updateData, { id: categoryId });
            return result && result.length > 0 ? result[0] : updateData;
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    }

    async deleteCategory(categoryId) {
        try {
            await this.makeRequest('products', 'DELETE', null, { category_id: categoryId });
            await this.makeRequest('input_tables', 'DELETE', null, { category_id: categoryId });
            await this.makeRequest('categories', 'DELETE', null, { id: categoryId });
            return true;
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    }

    // Products
    async getProducts() {
        try {
            return await this.makeRequest('products', 'GET') || [];
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }

    async getProduct(productId) {
        try {
            const result = await this.makeRequest('products', 'GET', null, { id: productId });
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error fetching product:', error);
            return null;
        }
    }

    async getProductsByCategory(categoryId) {
        try {
            return await this.makeRequest('products', 'GET', null, { category_id: categoryId }) || [];
        } catch (error) {
            console.error('Error fetching products by category:', error);
            return [];
        }
    }

    async addProduct(productData) {
        try {
            const newProduct = {
                category_id: productData.categoryId,
                name: productData.name,
                price: parseFloat(productData.price),
                currency: productData.currency || 'MMK',
                discount: parseFloat(productData.discount) || 0,
                icon_url: productData.iconUrl || '',
                delivery_type: productData.deliveryType || 'instant',
                delivery_time: productData.deliveryTime || '',
                total_sold: 0,
                created_at: new Date().toISOString()
            };

            const result = await this.makeRequest('products', 'POST', newProduct);
            return result && result.length > 0 ? result[0] : newProduct;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    async updateProduct(productId, updates) {
        try {
            const updateData = {
                name: updates.name,
                price: updates.price,
                currency: updates.currency,
                discount: updates.discount,
                icon_url: updates.iconUrl || updates.icon_url,
                delivery_type: updates.deliveryType || updates.delivery_type,
                delivery_time: updates.deliveryTime || updates.delivery_time,
                total_sold: updates.totalSold || updates.total_sold
            };

            const result = await this.makeRequest('products', 'PATCH', updateData, { id: productId });
            return result && result.length > 0 ? result[0] : updateData;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    async deleteProduct(productId) {
        try {
            await this.makeRequest('products', 'DELETE', null, { id: productId });
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    // Input Tables
    async getInputTables() {
        try {
            return await this.makeRequest('input_tables', 'GET') || [];
        } catch (error) {
            console.error('Error fetching input tables:', error);
            return [];
        }
    }

    async getInputTablesByCategory(categoryId) {
        try {
            return await this.makeRequest('input_tables', 'GET', null, { category_id: categoryId }) || [];
        } catch (error) {
            console.error('Error fetching input tables by category:', error);
            return [];
        }
    }

    async addInputTable(inputData) {
        try {
            const newInput = {
                category_id: inputData.categoryId,
                name: inputData.name,
                placeholder: inputData.placeholder || '',
                created_at: new Date().toISOString()
            };

            const result = await this.makeRequest('input_tables', 'POST', newInput);
            return result && result.length > 0 ? result[0] : newInput;
        } catch (error) {
            console.error('Error adding input table:', error);
            throw error;
        }
    }

    async updateInputTable(inputId, updates) {
        try {
            const updateData = {
                name: updates.name,
                placeholder: updates.placeholder
            };

            const result = await this.makeRequest('input_tables', 'PATCH', updateData, { id: inputId });
            return result && result.length > 0 ? result[0] : updateData;
        } catch (error) {
            console.error('Error updating input table:', error);
            throw error;
        }
    }

    async deleteInputTable(inputId) {
        try {
            await this.makeRequest('input_tables', 'DELETE', null, { id: inputId });
            return true;
        } catch (error) {
            console.error('Error deleting input table:', error);
            throw error;
        }
    }

    // Banners
    async getBannersType1() {
        try {
            return await this.makeRequest('banners_type1', 'GET') || [];
        } catch (error) {
            console.error('Error fetching Type 1 banners:', error);
            return [];
        }
    }

    async getBannersType2(categoryId = null) {
        try {
            let result;
            if (categoryId) {
                result = await this.makeRequest('banners_type2', 'GET', null, { category_id: categoryId }) || [];
            } else {
                result = await this.makeRequest('banners_type2', 'GET') || [];
            }
            return result;
        } catch (error) {
            console.error('Error fetching Type 2 banners:', error);
            return [];
        }
    }

    async addBannerType1(bannerData) {
        try {
            const newBanner = {
                image_url: bannerData.imageUrl,
                created_at: new Date().toISOString()
            };

            const result = await this.makeRequest('banners_type1', 'POST', newBanner);
            return result && result.length > 0 ? result[0] : newBanner;
        } catch (error) {
            console.error('Error adding Type 1 banner:', error);
            throw error;
        }
    }

    async addBannerType2(bannerData) {
        try {
            const newBanner = {
                category_id: bannerData.categoryId,
                image_url: bannerData.imageUrl,
                guide_text: bannerData.guideText || '',
                created_at: new Date().toISOString()
            };

            const result = await this.makeRequest('banners_type2', 'POST', newBanner);
            return result && result.length > 0 ? result[0] : newBanner;
        } catch (error) {
            console.error('Error adding Type 2 banner:', error);
            throw error;
        }
    }

    async deleteBanner(bannerId, type) {
        try {
            const table = type === 'type1' ? 'banners_type1' : 'banners_type2';
            await this.makeRequest(table, 'DELETE', null, { id: bannerId });
            return true;
        } catch (error) {
            console.error('Error deleting banner:', error);
            throw error;
        }
    }

    // Payment Methods
    async getPaymentMethods() {
        try {
            return await this.makeRequest('payment_methods', 'GET') || [];
        } catch (error) {
            console.error('Error fetching payment methods:', error);
            return [];
        }
    }

    async getPaymentMethod(paymentId) {
        try {
            const result = await this.makeRequest('payment_methods', 'GET', null, { id: paymentId });
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error fetching payment method:', error);
            return null;
        }
    }

    async addPaymentMethod(paymentData) {
        try {
            const newPayment = {
                name: paymentData.name,
                address: paymentData.address,
                receiver_name: paymentData.receiverName,
                note: paymentData.note || '',
                icon_url: paymentData.iconUrl || '',
                created_at: new Date().toISOString()
            };

            const result = await this.makeRequest('payment_methods', 'POST', newPayment);
            return result && result.length > 0 ? result[0] : newPayment;
        } catch (error) {
            console.error('Error adding payment method:', error);
            throw error;
        }
    }

    async updatePaymentMethod(paymentId, updates) {
        try {
            const updateData = {
                name: updates.name,
                address: updates.address,
                receiver_name: updates.receiverName || updates.receiver_name,
                note: updates.note,
                icon_url: updates.iconUrl || updates.icon_url
            };

            const result = await this.makeRequest('payment_methods', 'PATCH', updateData, { id: paymentId });
            return result && result.length > 0 ? result[0] : updateData;
        } catch (error) {
            console.error('Error updating payment method:', error);
            throw error;
        }
    }

    async deletePaymentMethod(paymentId) {
        try {
            await this.makeRequest('payment_methods', 'DELETE', null, { id: paymentId });
            return true;
        } catch (error) {
            console.error('Error deleting payment method:', error);
            throw error;
        }
    }

    // Orders
    async getOrders() {
        try {
            return await this.makeRequest('orders', 'GET') || [];
        } catch (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
    }

    async getOrder(orderId) {
        try {
            const result = await this.makeRequest('orders', 'GET', null, { id: orderId });
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error fetching order:', error);
            return null;
        }
    }

    async getOrdersByUser(telegramId) {
        try {
            return await this.makeRequest('orders', 'GET', null, { user_id: telegramId }) || [];
        } catch (error) {
            console.error('Error fetching orders by user:', error);
            return [];
        }
    }

    async getPendingOrders() {
        try {
            return await this.makeRequest('orders', 'GET', null, { status: 'pending' }) || [];
        } catch (error) {
            console.error('Error fetching pending orders:', error);
            return [];
        }
    }

    async addOrder(orderData) {
        try {
            const newOrder = {
                order_number: generateOrderId(),
                user_id: String(orderData.userId),
                user_info: orderData.userInfo,
                product_id: orderData.productId,
                product_info: orderData.productInfo,
                category_id: orderData.categoryId,
                input_values: orderData.inputValues || {},
                amount: parseFloat(orderData.amount),
                currency: orderData.currency || 'MMK',
                status: 'pending',
                created_at: new Date().toISOString()
            };

            const result = await this.makeRequest('orders', 'POST', newOrder);
            return result && result.length > 0 ? result[0] : newOrder;
        } catch (error) {
            console.error('Error adding order:', error);
            throw error;
        }
    }

    async updateOrder(orderId, updates) {
        try {
            const updateData = {
                status: updates.status
            };

            const result = await this.makeRequest('orders', 'PATCH', updateData, { id: orderId });
            return result && result.length > 0 ? result[0] : updateData;
        } catch (error) {
            console.error('Error updating order:', error);
            throw error;
        }
    }

    async approveOrder(orderId) {
        try {
            const order = await this.updateOrder(orderId, { status: 'approved' });
            if (order) {
                const user = await this.getUser(order.user_id);
                if (user) {
                    await this.updateUser(order.user_id, {
                        approvedOrders: (user.approved_orders || 0) + 1,
                        totalSpent: (user.total_spent || 0) + order.amount
                    });
                }
                // Update category sold
                await this.updateCategory(order.category_id, {
                    totalSold: (await this.getCategory(order.category_id))?.total_sold + 1 || 1
                });
            }
            return order;
        } catch (error) {
            console.error('Error approving order:', error);
            throw error;
        }
    }

    async rejectOrder(orderId) {
        try {
            const order = await this.updateOrder(orderId, { status: 'rejected' });
            if (order) {
                await this.updateUserBalance(order.user_id, order.amount, 'add');
                const user = await this.getUser(order.user_id);
                if (user) {
                    await this.updateUser(order.user_id, {
                        rejectedOrders: (user.rejected_orders || 0) + 1
                    });
                }
            }
            return order;
        } catch (error) {
            console.error('Error rejecting order:', error);
            throw error;
        }
    }

    // Topup Requests
    async getTopupRequests() {
        try {
            return await this.makeRequest('topup_requests', 'GET') || [];
        } catch (error) {
            console.error('Error fetching topup requests:', error);
            return [];
        }
    }

    async getTopupRequest(requestId) {
        try {
            const result = await this.makeRequest('topup_requests', 'GET', null, { id: requestId });
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error fetching topup request:', error);
            return null;
        }
    }

    async getTopupRequestsByUser(telegramId) {
        try {
            return await this.makeRequest('topup_requests', 'GET', null, { user_id: telegramId }) || [];
        } catch (error) {
            console.error('Error fetching topup requests by user:', error);
            return [];
        }
    }

    async getPendingTopupRequests() {
        try {
            return await this.makeRequest('topup_requests', 'GET', null, { status: 'pending' }) || [];
        } catch (error) {
            console.error('Error fetching pending topup requests:', error);
            return [];
        }
    }

    async addTopupRequest(requestData) {
        try {
            const newRequest = {
                user_id: String(requestData.userId),
                user_info: requestData.userInfo,
                payment_method_id: requestData.paymentMethodId,
                payment_info: requestData.paymentInfo,
                amount: parseFloat(requestData.amount),
                receipt_url: requestData.receiptUrl,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            const result = await this.makeRequest('topup_requests', 'POST', newRequest);
            return result && result.length > 0 ? result[0] : newRequest;
        } catch (error) {
            console.error('Error adding topup request:', error);
            throw error;
        }
    }

    async approveTopupRequest(requestId) {
        try {
            const request = await this.getTopupRequest(requestId);
            if (!request) return null;

            await this.updateRequest(requestId, { status: 'approved' });
            
            const user = await this.getUser(request.user_id);
            if (user) {
                await this.updateUser(request.user_id, {
                    balance: (user.balance || 0) + request.amount,
                    totalDeposits: (user.total_deposits || 0) + request.amount,
                    depositCount: (user.deposit_count || 0) + 1
                });
            }

            return await this.getTopupRequest(requestId);
        } catch (error) {
            console.error('Error approving topup request:', error);
            throw error;
        }
    }

    async updateRequest(requestId, updates) {
        try {
            const result = await this.makeRequest('topup_requests', 'PATCH', { status: updates.status }, { id: requestId });
            return result && result.length > 0 ? result[0] : updates;
        } catch (error) {
            console.error('Error updating topup request:', error);
            throw error;
        }
    }

    async rejectTopupRequest(requestId) {
        try {
            const result = await this.makeRequest('topup_requests', 'PATCH', { status: 'rejected' }, { id: requestId });
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error rejecting topup request:', error);
            throw error;
        }
    }

    // Banned Users
    async getBannedUsers() {
        try {
            return await this.makeRequest('banned_users', 'GET') || [];
        } catch (error) {
            console.error('Error fetching banned users:', error);
            return [];
        }
    }

    isUserBanned(telegramId) {
        return this.getBannedUsers().some(b => String(b.telegram_id) === String(telegramId));
    }

    async banUser(telegramId, reason = '') {
        try {
            const isBanned = this.isUserBanned(telegramId);
            if (isBanned) return false;

            const user = await this.getUser(telegramId);
            const banData = {
                telegram_id: String(telegramId),
                user_info: user || {},
                reason,
                banned_at: new Date().toISOString()
            };

            await this.makeRequest('banned_users', 'POST', banData);
            return true;
        } catch (error) {
            console.error('Error banning user:', error);
            throw error;
        }
    }

    async unbanUser(telegramId) {
        try {
            await this.makeRequest('banned_users', 'DELETE', null, { telegram_id: telegramId });
            return true;
        } catch (error) {
            console.error('Error unbanning user:', error);
            throw error;
        }
    }

    // Stats
    async getStats() {
        try {
            const users = await this.getUsers();
            const orders = await this.getOrders();
            const topups = await this.getTopupRequests();
            const bannedUsers = await this.getBannedUsers();

            return {
                totalUsers: users.length,
                totalOrders: orders.length,
                pendingOrders: orders.filter(o => o.status === 'pending').length,
                approvedOrders: orders.filter(o => o.status === 'approved').length,
                totalRevenue: orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + o.amount, 0),
                pendingTopups: topups.filter(t => t.status === 'pending').length,
                bannedUsers: bannedUsers.length
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return {
                totalUsers: 0,
                totalOrders: 0,
                pendingOrders: 0,
                approvedOrders: 0,
                totalRevenue: 0,
                pendingTopups: 0,
                bannedUsers: 0
            };
        }
    }
}

// Create instance
const db = new Database();

// Make global
window.Database = Database;
window.db = db;
