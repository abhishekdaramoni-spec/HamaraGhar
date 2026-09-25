// =========================================================================
// HamaraGhar Frontend — Architectural & Financial Formatters
// =========================================================================

export function formatINR(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹ 0';
    const num = Number(amount);
    if (num >= 10000000) {
        return `₹ ${(num / 10000000).toFixed(2)} Crore`;
    }
    if (num >= 100000) {
        return `₹ ${(num / 100000).toFixed(1)} Lakhs`;
    }
    return `₹ ${num.toLocaleString('en-IN')}`;
}

export function formatArea(sqft) {
    if (sqft === null || sqft === undefined || isNaN(sqft)) return '0 sq.ft';
    return `${Number(sqft).toLocaleString('en-IN')} sq.ft`;
}

export function formatDimensions(w, h) {
    return `${Number(w).toFixed(1)}' × ${Number(h).toFixed(1)}'`;
}
