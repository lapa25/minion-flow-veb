export const getApiErrorMessage = (err, message = "Ошибка запроса") => {
    if (!err) {
        return message
    }
    const status = err?.status ?? err?.originalStatus
    const data = err?.data

    if (typeof data === "string" && data.trim()) {
        return data
    }

    if (data && typeof data === "object") {
        if (typeof data.message === "string" && data.message.trim()){
            return data.message
        }

        if (typeof data.error === "string" && data.error.trim()) {
            return data.error
        }
    }

    if (typeof err?.error === "string" && err.error.trim()) {
        if (status === "FETCH_ERROR") {
            return "Не удалось подключиться к серверу"
        }
        return err.error
    }

    if (status === 401) {
        return "Нужна авторизация"
    }
    if (status === 403) {
        return "Недостаточно прав"
    }
    if (typeof status === "number" && status >= 500) {
        return "Ошибка сервера";
    }
    return message
};
