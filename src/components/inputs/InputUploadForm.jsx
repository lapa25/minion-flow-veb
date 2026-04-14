import {useRef, useState} from "react"
import {InlineLoader} from "../ui/InlineLoader.jsx"
import {FileField} from "../ui/FileField.jsx"

export const InputUploadForm = ({isSubmitting = false, onSubmit}) => {
    const fileInputRef = useRef(null)

    const [alias, setAlias] = useState("")
    const [inputType, setInputType] = useState("JSONL")
    const [file, setFile] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        const preparedAlias = alias.trim()
        if (!preparedAlias || !file || typeof onSubmit !== "function") {
            return
        }
        await onSubmit({alias: preparedAlias, inputType, file})

        setAlias("")
        setInputType("JSONL")
        setFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }
    return (
        <form className="projectsForm" onSubmit={handleSubmit}>
            <div className="projectsTwoCols">
                <label className="projectsField">
                    <span>Alias *</span>
                    <input
                        className="projectsInput"
                        value={alias}
                        disabled={isSubmitting}
                        onChange={(e) => setAlias(e.target.value)}
                    />
                </label>
                <label className="projectsField">
                    <span>Тип *</span>
                    <select
                        className="projectsSelect"
                        value={inputType}
                        disabled={isSubmitting}
                        onChange={(e) => setInputType(e.target.value)}
                    >
                        <option value="JSONL">JSONL</option>
                    </select>
                </label>
            </div>
            <FileField
                label="Файл *"
                accept=".jsonl,application/json,text/plain"
                file={file}
                disabled={isSubmitting}
                onChange={setFile}
                buttonText="Выбрать файл"
            />
            <div className="projectsActions">
                <button
                    className="projectsBtn"
                    type="submit"
                    disabled={isSubmitting || !alias.trim() || !file}
                >
                    {isSubmitting ? <InlineLoader label="Загружаем..." /> : "Загрузить"}
                </button>
            </div>
        </form>
    )
}