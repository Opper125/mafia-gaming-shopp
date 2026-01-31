/* ========================================
   Gaming Top-up Shop - Utility Functions
   ======================================== */

// ========================================
// Constants
// ========================================
const CONFIG = {
    ADMIN_TELEGRAM_ID: '1538232799',
    ADMIN_USERNAME: 'OPPER101',
    BOT_TOKEN: '8506121473:AAE6LXKDj6J8GR9HKYNzkq47EVa7tV8BBUM',
    BOT_USERNAME: 'mafia_gamingshopbot',
    JSONBIN_API_KEY: '$2a$10$nweVi.eOGDsyC7uEsN/OxeLcIr8uhyN8x86AiIo8koJ.B7MX1I5Bu',
    JSONBIN_ACCESS_KEY: '$2a$10$tNEyDbr/ez8kUETcZBK.6OwFCcaAE4bjDV8EHQtjz3jbgjs8jqbrS',
    JSONBIN_BIN_ID: '697e5ee143b1c97be95b835f',
    INTRO_DURATION: 5000,
    BANNER_INTERVAL: 7000,
    MAX_FAILED_PURCHASES: 5,
};

// ========================================
// Theme Management
// ========================================
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.setTheme(savedTheme);
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.updateToggle(theme);
    },

    toggle() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        return newTheme;
    },

    updateToggle(theme) {
        const toggle = document.getElementById('theme-toggle');
        const icon = document.getElementById('theme-icon');
        if (toggle) {
            toggle.classList.toggle('active', theme === 'dark');
        }
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
};

// ========================================
// Toast Notifications
// ========================================
const Toast = {
    show(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        const icon = toast.querySelector('.toast-icon');
        const msg = toast.querySelector('.toast-message');

        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-times-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };

        if (icon) icon.innerHTML = icons[type] || icons.info;
        if (msg) msg.textContent = message;

        toast.className = 'toast ' + type;
        toast.classList.remove('hidden');
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 400);
        }, duration);
    },

    success(message, duration) { this.show(message, 'success', duration); },
    error(message, duration) { this.show(message, 'error', duration); },
    warning(message, duration) { this.show(message, 'warning', duration); },
    info(message, duration) { this.show(message, 'info', duration); }
};

// ========================================
// Loading Overlay
// ========================================
const Loading = {
    show(text = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.textContent = text;
        if (overlay) overlay.classList.remove('hidden');
    },

    hide() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    }
};

// ========================================
// Utility Functions
// ========================================
function formatCurrency(amount, currency = 'MMK') {
    const num = parseFloat(amount) || 0;
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
}

function formatNumber(num) {
    return parseInt(num || 0).toLocaleString('en-US');
}

function formatDate(date, format = 'short') {
    const d = new Date(date);
    if (format === 'short') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (format === 'long') {
        return d.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return d.toISOString();
}

function formatRelativeTime(date) {
    const now = new Date();
    const d = new Date(date);
    const diff = now - d;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return formatDate(date, 'short');
}

function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}${random}`;
}

function generateOrderId() {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `ORD-${year}${month}${day}-${random}`;
}

function calculateDiscount(originalPrice, discountPercent) {
    const discount = (originalPrice * discountPercent) / 100;
    return originalPrice - discount;
}

function copyText(element) {
    const text = element.textContent || element.innerText;
    navigator.clipboard.writeText(text).then(() => {
        Toast.success('Copied!');
    }).catch(() => {
        Toast.error('Failed to copy');
    });
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isAdmin(telegramId) {
    return String(telegramId) === String(CONFIG.ADMIN_TELEGRAM_ID);
}

function getAvatarUrl(user) {
    if (user && user.photoUrl) {
        return user.photoUrl;
    }
    if (user && user.photo_url) {
        return user.photo_url;
    }
    const name = user?.firstName || user?.first_name || 'U';
    const initial = name.charAt(0).toUpperCase();
    return `https://ui-avatars.com/api/?name=${initial}&background=8B5CF6&color=fff&size=128`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function parseText(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

// Storage helpers
const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    },
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    remove(key) {
        localStorage.removeItem(key);
    }
};

const Session = {
    set(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    },
    get(key, defaultValue = null) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
};

// Make functions global
window.CONFIG = CONFIG;
window.ThemeManager = ThemeManager;
window.Toast = Toast;
window.Loading = Loading;
window.Storage = Storage;
window.Session = Session;
window.formatCurrency = formatCurrency;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.formatRelativeTime = formatRelativeTime;
window.generateId = generateId;
window.generateOrderId = generateOrderId;
window.calculateDiscount = calculateDiscount;
window.copyText = copyText;
window.fileToBase64 = fileToBase64;
window.sleep = sleep;
window.isAdmin = isAdmin;
window.getAvatarUrl = getAvatarUrl;
window.debounce = debounce;
window.parseText = parseText;
