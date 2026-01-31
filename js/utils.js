/* ========================================
   Gaming Top-up Shop - Utility Functions
   Helper functions and utilities
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
    // These will be set from admin panel
    JSONBIN_BIN_ID: localStorage.getItem('JSONBIN_BIN_ID') || '',
    COLLECTION_ID: localStorage.getItem('COLLECTION_ID') || '',
    SCHEMA_DOC_ID: localStorage.getItem('SCHEMA_DOC_ID') || '',
    INTRO_DURATION: 5000, // 5 seconds
    BANNER_INTERVAL: 7000, // 7 seconds
    MARQUEE_SPEED: 20, // seconds for full scroll
    MAX_FAILED_PURCHASES: 5,
};

// ========================================
// Theme Management
// ========================================
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
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
    },

    get current() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }
};

// ========================================
// Toast Notifications
// ========================================
const Toast = {
    show(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('.toast-icon');
        const msg = toast.querySelector('.toast-message');

        // Set icon based on type
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-times-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };

        icon.innerHTML = icons[type] || icons.info;
        msg.textContent = message;

        // Remove all type classes and add new one
        toast.className = 'toast';
        toast.classList.add(type);

        // Show toast
        toast.classList.remove('hidden');
        toast.classList.add('show');

        // Hide after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 400);
        }, duration);
    },

    success(message, duration) {
        this.show(message, 'success', duration);
    },

    error(message, duration) {
        this.show(message, 'error', duration);
    },

    warning(message, duration) {
        this.show(message, 'warning', duration);
    },

    info(message, duration) {
        this.show(message, 'info', duration);
    }
};

// ========================================
// Loading Overlay
// ========================================
const Loading = {
    show(text = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.textContent = text;
        overlay.classList.remove('hidden');
    },

    hide() {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('hidden');
    },

    update(text) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.textContent = text;
    }
};

// ========================================
// Utility Functions
// ========================================

// Format currency
function formatCurrency(amount, currency = 'MMK') {
    const num = parseFloat(amount) || 0;
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

// Format number
function formatNumber(num) {
    return parseInt(num || 0).toLocaleString('en-US');
}

// Format date
function formatDate(date, format = 'short') {
    const d = new Date(date);
    if (format === 'short') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (format === 'long') {
        return d.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (format === 'time') {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toISOString();
}

// Format relative time
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

// Generate unique ID
function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}${random}`;
}

// Generate order ID
function generateOrderId() {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `ORD-${year}${month}${day}-${random}`;
}

// Calculate discount price
function calculateDiscount(originalPrice, discountPercent) {
    const discount = (originalPrice * discountPercent) / 100;
    return originalPrice - discount;
}

// Copy text to clipboard
function copyText(element) {
    const text = element.textContent || element.innerText;
    navigator.clipboard.writeText(text).then(() => {
        Toast.success('Copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        Toast.success('Copied to clipboard!');
    });
}

// Validate image (check for 18+ content - basic implementation)
async function validateImage(file) {
    return new Promise((resolve, reject) => {
        // Basic file type validation
        if (!file.type.startsWith('image/')) {
            reject(new Error('File must be an image'));
            return;
        }

        // File size validation (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            reject(new Error('Image size must be less than 10MB'));
            return;
        }

        // For actual 18+ content detection, you would need to integrate
        // with a content moderation API like Google Cloud Vision, AWS Rekognition, etc.
        // This is a placeholder that always passes
        resolve(true);
    });
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Compress image
async function compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                blob => resolve(blob),
                'image/jpeg',
                quality
            );
        };

        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

// Debounce function
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

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if user is admin
function isAdmin(telegramId) {
    return String(telegramId) === CONFIG.ADMIN_TELEGRAM_ID;
}

// Sanitize HTML
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Parse markdown-like text
function parseText(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

// Get avatar URL or placeholder
function getAvatarUrl(user) {
    if (user && user.photo_url) {
        return user.photo_url;
    }
    // Generate a placeholder avatar with initials
    const name = user?.first_name || 'U';
    const initial = name.charAt(0).toUpperCase();
    return `https://ui-avatars.com/api/?name=${initial}&background=8B5CF6&color=fff&size=128`;
}

// Validate Telegram WebApp data
function validateTelegramData(initData) {
    // In production, this should be validated server-side
    // This is a basic client-side check
    return initData && initData.length > 0;
}

// Local storage helpers
const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    }
};

// Session storage helpers
const Session = {
    set(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Session set error:', e);
            return false;
        }
    },

    get(key, defaultValue = null) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Session get error:', e);
            return defaultValue;
        }
    },

    remove(key) {
        sessionStorage.removeItem(key);
    },

    clear() {
        sessionStorage.clear();
    }
};

// Ripple effect for buttons
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add('ripple-effect');
    
    button.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

// Add ripple effect to elements
function addRippleEffect() {
    document.querySelectorAll('.ripple').forEach(element => {
        element.addEventListener('click', createRipple);
    });
}

// Lazy load images
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Scroll to top
function scrollToTop(smooth = true) {
    window.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto'
    });
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Export utilities
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
window.validateImage = validateImage;
window.fileToBase64 = fileToBase64;
window.compressImage = compressImage;
window.debounce = debounce;
window.throttle = throttle;
window.sleep = sleep;
window.isAdmin = isAdmin;
window.sanitizeHTML = sanitizeHTML;
window.parseText = parseText;
window.getAvatarUrl = getAvatarUrl;
window.addRippleEffect = addRippleEffect;
window.lazyLoadImages = lazyLoadImages;
window.scrollToTop = scrollToTop;
