export const getProjectFieldClass = (form, name, baseClass, validClass = "", invalidClass = "inputInvalid") => {
    const {errors, touchedFields, dirtyFields} = form.formState
    if (errors[name]) {
        return `${baseClass} ${invalidClass}`.trim()
    }
    if (validClass && touchedFields[name] && dirtyFields[name]) {
        return `${baseClass} ${validClass}`.trim()
    }
    return baseClass
}