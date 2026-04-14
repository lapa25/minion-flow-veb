import {useId, useRef} from "react"

export const FileField = ({label, accept, file, disabled = false, onChange, buttonText = "Выбрать файл"}) => {
    const inputId = useId()
    const inputRef = useRef(null)

    const handleOpen = () => {
        if (!disabled) {
            inputRef.current?.click()
        }
    }

    const handleFileChange = (e) => {
        const nextFile = e.target.files?.[0] ?? null
        onChange?.(nextFile)
    }

    return (
        <label className="projectsField" htmlFor={inputId}>
            <span>{label}</span>
            <input
                id={inputId}
                ref={inputRef}
                className="projectsFileInputNative"
                type="file"
                accept={accept}
                disabled={disabled}
                onChange={handleFileChange}
            />
            <div className={`projectsFileField ${disabled ? "isDisabled" : ""}`}>
                <button
                    className="projectsBtn projectsBtnSecondary"
                    type="button"
                    disabled={disabled}
                    onClick={handleOpen}
                >
                    {buttonText}
                </button>
                <span className={`projectsFileName ${file ? "hasFile" : ""}`}>
                    {file?.name ?? "Файл не выбран"}
                </span>
            </div>
        </label>
    )
}