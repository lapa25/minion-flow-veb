export const formatDateTime = (value, fallback = "—") => {
    if (!value) {
        return fallback;
    }
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
        return String(value);
    }
    return d.toLocaleString();
};