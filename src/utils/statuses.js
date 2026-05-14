export const TASK_STATUS_LABELS = {
    CREATED: "Создано",
    STARTING: "Запускается",
    RUNNING: "Выполняется",
    FINISHED: "Исполнение завершено",
    TIME_OUT: "Таймаут",
    CANCELED: "Отменено",
    FAILED: "Ошибка",
    DONE: "Готово",
    SUCCEEDED: "Успешно",
}

export const MICROTASK_STATUS_LABELS = {
    QUEUED: "В очереди",
    STARTING: "Запускается",
    RUNNING: "Выполняется",
    SUCCEEDED: "Успешно",
    FAILED: "Ошибка",
    TIMED_OUT: "Таймаут",
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
    if (status === "QUEUED" && taskStatus === "CANCELED") {
        return "Не запущена (запуск отменен)"
    }
    return MICROTASK_STATUS_LABELS[status] ?? status
}
export const TERMINAL_TASK_STATUSES = ["FINISHED", "TIME_OUT", "CANCELED", "FAILED", "DONE"]