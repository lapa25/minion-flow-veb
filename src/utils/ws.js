const WS_URL = String(import.meta.env.VITE_WS_URL ?? "").replace(/\/+$/, "")

export const buildTaskProgressWsUrl = (taskId) =>
    `${WS_URL}/artifact-service/ws/tasks/${taskId}/progress`

export const buildMicrotaskLogsWsUrl = (microtaskId) =>
    `${WS_URL}/artifact-service/ws/microtasks/${microtaskId}/logs`