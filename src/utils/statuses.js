export const TASK_STATUS_LABELS = {
    CREATED: "Создано",
    STARTING: "Запускается",
    RUNNING: "Выполняется",
    FINISHED: "Исполнение завершено",
    TIME_OUT: "Таймаут",
    CANCELED: "Отменено",
    FAILED: "Ошибка",
    DONE: "Готово",
}

export const MICROTASK_STATUS_LABELS = {
    CREATED: "Создана",
    STARTING: "Запускается",
    RUNNING: "Выполняется",
    SUCCEEDED: "Успешно",
    TIME_OUT: "Таймаут",
    FAILED: "Ошибка",
}

const STATUS_TONE_CLASS_MAP = {
    QUEUED: "projectsStatusToneQueued",
    CREATED: "projectsStatusToneCreated",
    STARTING: "projectsStatusToneStarting",
    RUNNING: "projectsStatusToneRunning",
    FINISHED: "projectsStatusToneFinished",
    TIME_OUT: "projectsStatusToneTimeOut",
    TIMED_OUT: "projectsStatusToneTimeOut",
    CANCELED: "projectsStatusToneCanceled",
    CANCELLED: "projectsStatusToneCanceled",
    FAILED: "projectsStatusToneFailed",
    DONE: "projectsStatusToneDone",
    SUCCEEDED: "projectsStatusToneSucceeded",
}

export const getStatusToneClassName = (status) => {
    const toneClass = STATUS_TONE_CLASS_MAP[status]
    return toneClass ? `projectsStatusTone ${toneClass}` : "projectsStatusTone"
}

export const getTaskStatusLabel = (status) => {
    if (!status) {
        return "—"
    }
    return TASK_STATUS_LABELS[status] ?? status
}

export const getMicrotaskStatusLabel = (status, taskStatus) => {
    if (!status) {
        return "—"
    }
    if (status === "CREATED" && taskStatus === "CANCELED") {
        return "Не запущена (запуск отменен)"
    }
    return MICROTASK_STATUS_LABELS[status] ?? status
}
export const TERMINAL_TASK_STATUSES = ["FINISHED", "TIME_OUT", "CANCELED", "FAILED", "DONE"]
