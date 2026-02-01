/* ========================================
   Gaming Top-up Shop - Telegram Integration
   ======================================== */

// Telegram WebApp Instance
const tg = window.Telegram?.WebApp;

// Configuration and utility imports
const CONFIG = {
    BOT_TOKEN: 'your_bot_token_here',
    ADMIN_TELEGRAM_ID: 'admin_telegram_id_here'
};

const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
};

// ========================================
// Telegram Manager
// ========================================
const TelegramManager = {
    webApp: null,
    user: null,
    isReady: false,

    init() {
        console.log('Initializing Telegram WebApp...');
        
        this.webApp = window.Telegram?.WebApp;
        
        if (!this.webApp) {
            console.error('Telegram WebApp not available');
            return false;
        }

        // Expand to full height
        this.webApp.expand();
        this.webApp.enableClosingConfirmation();

        // Get user data
        this.user = this.webApp.initDataUnsafe?.user || null;
        
        console.log('Telegram User:', this.user);
        console.log('Init Data:', this.webApp.initData);

        // Set colors
        try {
            this.webApp.setHeaderColor('#1E293B');
            this.webApp.setBackgroundColor('#0F172A');
        } catch (e) {
            console.log('Could not set colors');
        }

        this.isReady = true;
        this.webApp.ready();

        return true;
    },

    isInTelegram() {
        // Check if running inside Telegram
        if (!this.webApp) return false;
        if (!this.webApp.initData) return false;
        if (this.webApp.initData.length === 0) return false;
        return true;
    },

    getUser() {
        return this.user;
    },

    getUserId() {
        return this.user?.id ? String(this.user.id) : null;
    },

    isPremium() {
        return this.user?.is_premium || false;
    },

    showBackButton(callback) {
        if (this.webApp?.BackButton) {
            this.webApp.BackButton.show();
            this.webApp.BackButton.onClick(callback);
        }
    },

    hideBackButton() {
        if (this.webApp?.BackButton) {
            this.webApp.BackButton.hide();
        }
    },

    haptic(type = 'impact', style = 'medium') {
        if (this.webApp?.HapticFeedback) {
            try {
                if (type === 'impact') {
                    this.webApp.HapticFeedback.impactOccurred(style);
                } else if (type === 'notification') {
                    this.webApp.HapticFeedback.notificationOccurred(style);
                } else if (type === 'selection') {
                    this.webApp.HapticFeedback.selectionChanged();
                }
            } catch (e) {}
        }
    },

    async showConfirm(message) {
        return new Promise((resolve) => {
            if (this.webApp?.showConfirm) {
                this.webApp.showConfirm(message, (confirmed) => {
                    resolve(confirmed);
                });
            } else {
                resolve(confirm(message));
            }
        });
    },

    showAlert(message) {
        if (this.webApp?.showAlert) {
            this.webApp.showAlert(message);
        } else {
            alert(message);
        }
    },

    close() {
        if (this.webApp?.close) {
            this.webApp.close();
        }
    }
};

// ========================================
// Telegram Bot API
// ========================================
const TelegramBot = {
    token: CONFIG.BOT_TOKEN,
    baseUrl: `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}`,

    async request(method, params = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/${method}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            const result = await response.json();
            return result.ok ? result.result : null;
        } catch (error) {
            console.error('Telegram API error:', error);
            return null;
        }
    },

    async sendMessage(chatId, text, options = {}) {
        return this.request('sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            ...options
        });
    },

    async sendPhoto(chatId, photo, caption = '', options = {}) {
        return this.request('sendPhoto', {
            chat_id: chatId,
            photo,
            caption,
            parse_mode: 'HTML',
            ...options
        });
    },

    async notifyAdmin(message) {
        return this.sendMessage(CONFIG.ADMIN_TELEGRAM_ID, message);
    },

    async sendOrderNotification(order, user) {
        const message = `
🛒 <b>New Order!</b>

📋 <b>Order ID:</b> <code>${order.order_number || order.id}</code>
👤 <b>User:</b> ${user.first_name || 'User'} (@${user.username || 'N/A'})
🆔 <b>User ID:</b> <code>${user.telegram_id}</code>

📦 <b>Product:</b> ${order.product_info?.name || 'N/A'}
💰 <b>Amount:</b> ${formatCurrency(order.amount, order.currency)}

📝 <b>Input Values:</b>
${Object.entries(order.input_values || {}).map(([key, value]) => `• ${key}: <code>${value}</code>`).join('\n') || 'None'}

⏰ <b>Time:</b> ${new Date().toLocaleString()}
        `.trim();

        return this.sendMessage(CONFIG.ADMIN_TELEGRAM_ID, message);
    },

    async sendTopupNotification(request, user) {
        const message = `
💳 <b>New Top-up Request!</b>

🆔 <b>Request ID:</b> <code>${request.id}</code>
👤 <b>User:</b> ${user.first_name || 'User'} (@${user.username || 'N/A'})

💰 <b>Amount:</b> ${formatCurrency(request.amount)}
💳 <b>Payment:</b> ${request.payment_info?.name || 'N/A'}

⏰ <b>Time:</b> ${new Date().toLocaleString()}
        `.trim();

        return this.sendMessage(CONFIG.ADMIN_TELEGRAM_ID, message);
    },

    async sendUserNotification(userId, message) {
        return this.sendMessage(userId, message);
    },

    async sendVerificationCode(userId, code) {
        const message = `
🔐 <b>Verification Code</b>

Your code is: <code>${code}</code>

⚠️ Do not share this code.
        `.trim();

        return this.sendMessage(userId, message);
    }
};

// Verification Manager
const VerificationManager = {
    codes: new Map(),

    generateCode(userId) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        this.codes.set(String(userId), {
            code,
            expiresAt: Date.now() + 5 * 60 * 1000
        });
        return code;
    },

    verifyCode(userId, inputCode) {
        const stored = this.codes.get(String(userId));
        
        if (!stored) {
            return { valid: false, error: 'No code found' };
        }

        if (Date.now() > stored.expiresAt) {
            this.codes.delete(String(userId));
            return { valid: false, error: 'Code expired' };
        }

        if (stored.code !== inputCode) {
            return { valid: false, error: 'Invalid code' };
        }

        this.codes.delete(String(userId));
        return { valid: true };
    },

    clearCode(userId) {
        this.codes.delete(String(userId));
    }
};

// Make global
window.tg = tg;
window.TelegramManager = TelegramManager;
window.TelegramBot = TelegramBot;
window.VerificationManager = VerificationManager;
