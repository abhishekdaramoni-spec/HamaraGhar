// Utility functions used across the app
const Utils = {
  // Format Indian Rupee
  formatCurrency(amount) { 
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  },
  
  formatNumber(n) { 
    return new Intl.NumberFormat('en-IN').format(n);
  },
  
  // Storage helpers
  saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); },
  loadLocal(key) { return JSON.parse(localStorage.getItem(key) || 'null'); },
  clearLocal(key) { localStorage.removeItem(key); },
  
  // DOM helpers
  $(selector) { return document.querySelector(selector); },
  $$(selector) { return document.querySelectorAll(selector); },
  show(el) { el && (el.style.display = ''); },
  hide(el) { el && (el.style.display = 'none'); },
  showBlock(el) { el && (el.style.display = 'block'); },
  showFlex(el) { el && (el.style.display = 'flex'); },
  
  // Notifications
  notify(message, type='info') {
    let toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '10px 20px';
    toast.style.background = type === 'error' ? '#f44336' : (type === 'success' ? '#4caf50' : '#2196f3');
    toast.style.color = 'white';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  },
  
  // Validate
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  validateNumber(val, min, max) { 
    const n = Number(val);
    if (isNaN(n)) return false;
    if (min !== undefined && n < min) return false;
    if (max !== undefined && n > max) return false;
    return true;
  },
  
  // Debounce
  debounce(fn, delay) { 
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  },
  
  // Format sqft area
  formatArea(sqft) { return sqft.toLocaleString('en-IN') + ' sq.ft'; },
  
  // Color helpers (from existing code - preserve exactly)
  lighten(hex, factor) {
    let rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    rgb.r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
    rgb.g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
    rgb.b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));
    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  },
  darken(hex, factor) {
    let rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    rgb.r = Math.max(0, Math.round(rgb.r * (1 - factor)));
    rgb.g = Math.max(0, Math.round(rgb.g * (1 - factor)));
    rgb.b = Math.max(0, Math.round(rgb.b * (1 - factor)));
    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  },
  hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
  },
  rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }
};
