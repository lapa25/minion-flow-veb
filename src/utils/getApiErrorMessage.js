export const getApiErrorMessage = (err, message = "Ошибка запроса") => {
    if (!err) {
        return message
    }
    const data = err?.data;
    return data.message;
};
