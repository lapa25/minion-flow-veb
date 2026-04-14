import {useRef, useState} from "react"
import {InlineLoader} from "../ui/InlineLoader.jsx"
import {FileField} from "../ui/FileField.jsx"

export const ArtifactUploadForm = ({isSubmitting = false, onSubmit}) => {
    const fileInputRef = useRef(null)

    const [alias, setAlias] = useState("")
    const [file, setFile] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        const preparedAlias = alias.trim()
        if (!preparedAlias || !file || typeof onSubmit !== "function") {
            return
        }
        await onSubmit({alias: preparedAlias, file})

        setAlias("")
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
                <FileField
                    label="JAR файл *"
                    accept=".jar,application/java-archive"
                    file={file}
                    disabled={isSubmitting}
                    onChange={setFile}
                    buttonText="Выбрать JAR"
                />
            </div>
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