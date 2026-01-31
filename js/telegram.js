/* ========================================
   Gaming Top-up Shop - Telegram Integration
   Telegram WebApp & Bot API
   ======================================== */

// ========================================
// Telegram WebApp Instance
// ========================================
const tg = window.Telegram?.WebApp;

// ========================================
// Telegram Manager Class
// ========================================
class TelegramManager {
    constructor() {
        this.webApp = tg;
        this.user = null;
        this.initData = null;
        this.isReady = false;
    }

    // Initialize Telegram WebApp
    init() {
        if (!this.webApp) {
            console.error('Telegram WebApp not available');
            return false;
        }

        // Expand to full height
        this.webApp.expand();

        // Enable closing confirmation
        this.webApp.enableClosingConfirmation();

        // Get init data
        this.initData = this.webApp.initData;
        this.user = this.webApp.initDataUnsafe?.user;

        // Set theme
        this.applyTheme();

        // Set header color
        this.webApp.setHeaderColor('#1E293B');
        this.webApp.setBackgroundColor('#0F172A');

        this.isReady = true;
        this.webApp.ready();

        console.log('Telegram WebApp initialized', this.user);
        return true;
    }

    // Check if running in Telegram
    isInTelegram() {
        return !!(this.webApp && this.initData && this.initData.length > 0);
    }

    // Get current user
    getUser() {
        return this.user;
    }

    // Get user ID
    getUserId() {
        return this.user?.id ? String(this.user.id) : null;
    }

    // Check if user is premium
    isPremium() {
        return this.user?.is_premium || false;
    }

    // Apply Telegram theme
    applyTheme() {
        if (!this.webApp) return;

        const colorScheme = this.webApp.colorScheme;
        if (colorScheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }

    // Show main button
    showMainButton(text, callback) {
        if (!this.webApp?.MainButton) return;

        this.webApp.MainButton.setText(text);
        this.webApp.MainButton.show();
        this.webApp.MainButton.onClick(callback);
    }

    // Hide main button
    hideMainButton() {
        if (!this.webApp?.MainButton) return;
        this.webApp.MainButton.hide();
    }

    // Show back button
    showBackButton(callback) {
        if (!this.webApp?.BackButton) return;

        this.webApp.BackButton.show();
        this.webApp.BackButton.onClick(callback);
    }

    // Hide back button
    hideBackButton() {
        if (!this.webApp?.BackButton) return;
        this.webApp.BackButton.hide();
    }

    // Show popup
    showPopup(params) {
        return new Promise((resolve) => {
            if (!this.webApp?.showPopup) {
                resolve(null);
                return;
            }

            this.webApp.showPopup(params, (buttonId) => {
                resolve(buttonId);
            });
        });
    }

    // Show confirm
    async showConfirm(message) {
        const result = await this.showPopup({
            message,
            buttons: [
                { id: 'cancel', type: 'cancel' },
                { id: 'ok', type: 'ok' }
            ]
        });
        return result === 'ok';
    }

    // Show alert
    showAlert(message) {
        return this.showPopup({
            message,
            buttons: [{ type: 'ok' }]
        });
    }

    // Haptic feedback
    haptic(type = 'impact', style = 'medium') {
        if (!this.webApp?.HapticFeedback) return;

        switch (type) {
            case 'impact':
                this.webApp.HapticFeedback.impactOccurred(style);
                break;
            case 'notification':
                this.webApp.HapticFeedback.notificationOccurred(style);
                break;
            case 'selection':
                this.webApp.HapticFeedback.selectionChanged();
                break;
        }
    }

    // Close WebApp
    close() {
        if (this.webApp?.close) {
            this.webApp.close();
        }
    }

    // Open link
    openLink(url, options = {}) {
        if (this.webApp?.openLink) {
            this.webApp.openLink(url, options);
        } else {
            window.open(url, '_blank');
        }
    }

    // Open Telegram link
    openTelegramLink(url) {
        if (this.webApp?.openTelegramLink) {
            this.webApp.openTelegramLink(url);
        }
    }

    // Share to Telegram
    switchInlineQuery(query, chatTypes = ['users', 'groups', 'channels']) {
        if (this.webApp?.switchInlineQuery) {
            this.webApp.switchInlineQuery(query, chatTypes);
        }
    }

    // Request contact
    requestContact(callback) {
        if (this.webApp?.requestContact) {
            this.webApp.requestContact(callback);
        }
    }

    // Cloud Storage
    async cloudStorageSet(key, value) {
        return new Promise((resolve, reject) => {
            if (!this.webApp?.CloudStorage) {
                reject(new Error('CloudStorage not available'));
                return;
            }

            this.webApp.CloudStorage.setItem(key, JSON.stringify(value), (error, success) => {
                if (error) reject(error);
                else resolve(success);
            });
        });
    }

    async cloudStorageGet(key) {
        return new Promise((resolve, reject) => {
            if (!this.webApp?.CloudStorage) {
                reject(new Error('CloudStorage not available'));
                return;
            }

            this.webApp.CloudStorage.getItem(key, (error, value) => {
                if (error) reject(error);
                else resolve(value ? JSON.parse(value) : null);
            });
        });
    }

    async cloudStorageRemove(key) {
        return new Promise((resolve, reject) => {
            if (!this.webApp?.CloudStorage) {
                reject(new Error('CloudStorage not available'));
                return;
            }

            this.webApp.CloudStorage.removeItem(key, (error, success) => {
                if (error) reject(error);
                else resolve(success);
            });
        });
    }

    async cloudStorageGetAll() {
        return new Promise((resolve, reject) => {
            if (!this.webApp?.CloudStorage) {
                reject(new Error('CloudStorage not available'));
                return;
            }

            this.webApp.CloudStorage.getKeys((error, keys) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (!keys || keys.length === 0) {
                    resolve({});
                    return;
                }

                this.webApp.CloudStorage.getItems(keys, (error, values) => {
                    if (error) reject(error);
                    else {
                        const result = {};
                        Object.keys(values).forEach(key => {
                            try {
                                result[key] = JSON.parse(values[key]);
                            } catch {
                                result[key] = values[key];
                            }
                        });
                        resolve(result);
                    }
                });
            });
        });
    }
}

// ========================================
// Telegram Bot API Class
// ========================================
class TelegramBot {
    constructor(token) {
        this.token = token;
        this.baseUrl = `https://api.telegram.org/bot${token}`;
    }

    // Make API request
    async request(method, params = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/${method}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });

            const result = await response.json();
            
            if (!result.ok) {
                throw new Error(result.description || 'API request failed');
            }

            return result.result;
        } catch (error) {
            console.error('Telegram API error:', error);
            throw error;
        }
    }

    // Send message
    async sendMessage(chatId, text, options = {}) {
        return this.request('sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            ...options
        });
    }

    // Send photo
    async sendPhoto(chatId, photo, caption = '', options = {}) {
        return this.request('sendPhoto', {
            chat_id: chatId,
            photo,
            caption,
            parse_mode: 'HTML',
            ...options
        });
    }

    // Edit message
    async editMessage(chatId, messageId, text, options = {}) {
        return this.request('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: 'HTML',
            ...options
        });
    }

    // Delete message
    async deleteMessage(chatId, messageId) {
        return this.request('deleteMessage', {
            chat_id: chatId,
            message_id: messageId
        });
    }

    // Send notification to admin
    async notifyAdmin(message, options = {}) {
        return this.sendMessage(CONFIG.ADMIN_TELEGRAM_ID, message, options);
    }

    // Send order notification to admin
    async sendOrderNotification(order, user) {
        const message = `
🛒 <b>New Order Received!</b>

📋 <b>Order ID:</b> <code>${order.id}</code>
👤 <b>User:</b> ${user.firstName} ${user.lastName || ''} (@${user.username || 'N/A'})
🆔 <b>User ID:</b> <code>${user.telegramId}</code>

📦 <b>Product:</b> ${order.productInfo?.name || 'N/A'}
💰 <b>Amount:</b> ${formatCurrency(order.amount, order.currency)}

📝 <b>Input Values:</b>
${Object.entries(order.inputValues || {}).map(([key, value]) => `• ${key}: <code>${value}</code>`).join('\n')}

⏰ <b>Time:</b> ${formatDate(order.createdAt, 'long')}
        `.trim();

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Approve', callback_data: `approve_order_${order.id}` },
                    { text: '❌ Reject', callback_data: `reject_order_${order.id}` }
                ]
            ]
        };

        return this.sendMessage(CONFIG.ADMIN_TELEGRAM_ID, message, { reply_markup: keyboard });
    }

    // Send topup notification to admin
    async sendTopupNotification(request, user) {
        const message = `
💳 <b>New Top-up Request!</b>

🆔 <b>Request ID:</b> <code>${request.id}</code>
👤 <b>User:</b> ${user.firstName} ${user.lastName || ''} (@${user.username || 'N/A'})
🆔 <b>User ID:</b> <code>${user.telegramId}</code>

💰 <b>Amount:</b> ${formatCurrency(request.amount)}
💳 <b>Payment Method:</b> ${request.paymentInfo?.name || 'N/A'}

⏰ <b>Time:</b> ${formatDate(request.createdAt, 'long')}
        `.trim();

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Approve', callback_data: `approve_topup_${request.id}` },
                    { text: '❌ Reject', callback_data: `reject_topup_${request.id}` }
                ]
            ]
        };

        // Send with receipt image if available
        if (request.receiptUrl) {
            await this.sendPhoto(CONFIG.ADMIN_TELEGRAM_ID, request.receiptUrl, message, { reply_markup: keyboard });
        } else {
            await this.sendMessage(CONFIG.ADMIN_TELEGRAM_ID, message, { reply_markup: keyboard });
        }
    }

    // Send notification to user
    async sendUserNotification(userId, message) {
        return this.sendMessage(userId, message);
    }

    // Send order status update to user
    async sendOrderStatusUpdate(userId, order, status) {
        let emoji, statusText, additionalText = '';

        if (status === 'approved') {
            emoji = '✅';
            statusText = 'Approved';
            additionalText = '\n\n🎮 Your order has been processed successfully! Please check your game account.';
        } else if (status === 'rejected') {
            emoji = '❌';
            statusText = 'Rejected';
            additionalText = '\n\n💰 Your balance has been refunded.';
        } else {
            emoji = '⏳';
            statusText = 'Pending';
        }

        const message = `
${emoji} <b>Order ${statusText}</b>

📋 <b>Order ID:</b> <code>${order.id}</code>
📦 <b>Product:</b> ${order.productInfo?.name || 'N/A'}
💰 <b>Amount:</b> ${formatCurrency(order.amount, order.currency)}
${additionalText}
        `.trim();

        return this.sendMessage(userId, message);
    }

    // Send topup status update to user
    async sendTopupStatusUpdate(userId, request, status) {
        let emoji, statusText, additionalText = '';

        if (status === 'approved') {
            emoji = '✅';
            statusText = 'Approved';
            additionalText = `\n\n💰 ${formatCurrency(request.amount)} has been added to your balance.`;
        } else if (status === 'rejected') {
            emoji = '❌';
            statusText = 'Rejected';
            additionalText = '\n\n❗ Please check your payment details and try again.';
        } else {
            emoji = '⏳';
            statusText = 'Pending';
        }

        const message = `
${emoji} <b>Top-up Request ${statusText}</b>

🆔 <b>Request ID:</b> <code>${request.id}</code>
💰 <b>Amount:</b> ${formatCurrency(request.amount)}
💳 <b>Payment Method:</b> ${request.paymentInfo?.name || 'N/A'}
${additionalText}
        `.trim();

        return this.sendMessage(userId, message);
    }

    // Broadcast message to all users
    async broadcastMessage(users, message, imageUrl = null) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const user of users) {
            try {
                if (imageUrl) {
                    await this.sendPhoto(user.telegramId, imageUrl, message);
                } else {
                    await this.sendMessage(user.telegramId, message);
                }
                results.success++;
                
                // Rate limiting - wait 50ms between messages
                await sleep(50);
            } catch (error) {
                results.failed++;
                results.errors.push({
                    userId: user.telegramId,
                    error: error.message
                });
            }
        }

        return results;
    }

    // Send verification code
    async sendVerificationCode(userId, code) {
        const message = `
🔐 <b>Payment Verification Code</b>

Your verification code is: <code>${code}</code>

⚠️ Do not share this code with anyone.
This code expires in 5 minutes.
        `.trim();

        return this.sendMessage(userId, message);
    }
}

// ========================================
// Verification Manager
// ========================================
class VerificationManager {
    constructor() {
        this.codes = new Map();
        this.codeExpiry = 5 * 60 * 1000; // 5 minutes
    }

    // Generate verification code
    generateCode(userId) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        this.codes.set(userId, {
            code,
            expiresAt: Date.now() + this.codeExpiry
        });
        return code;
    }

    // Verify code
    verifyCode(userId, inputCode) {
        const stored = this.codes.get(userId);
        
        if (!stored) {
            return { valid: false, error: 'No verification code found' };
        }

        if (Date.now() > stored.expiresAt) {
            this.codes.delete(userId);
            return { valid: false, error: 'Verification code expired' };
        }

        if (stored.code !== inputCode) {
            return { valid: false, error: 'Invalid verification code' };
        }

        this.codes.delete(userId);
        return { valid: true };
    }

    // Clear code
    clearCode(userId) {
        this.codes.delete(userId);
    }
}

// ========================================
// Create instances
// ========================================
const telegramManager = new TelegramManager();
const telegramBot = new TelegramBot(CONFIG.BOT_TOKEN);
const verificationManager = new VerificationManager();

// ========================================
// Export
// ========================================
window.tg = tg;
window.TelegramManager = TelegramManager;
window.TelegramBot = TelegramBot;
window.VerificationManager = VerificationManager;
window.telegramManager = telegramManager;
window.telegramBot = telegramBot;
window.verificationManager = verificationManager;
