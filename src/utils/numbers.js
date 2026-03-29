export const asInt = (v, fallback) => {
    const n = parseInt(String(v ?? ""), 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
}