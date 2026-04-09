export const getFormFieldClass = (form, name, baseClass = "input") => {
    const {errors, touchedFields, dirtyFields} = form.formState
    if (errors[name]) {
        return "inputInvalid"
    }
    if (touchedFields[name] && dirtyFields[name]) {
        return "inputValid"
    }
    return baseClass
}