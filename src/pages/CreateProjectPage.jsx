import {Link, useNavigate} from "react-router-dom"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"

import {useCreateProjectMutation} from "../store/projects/projectsApiSlice.js"
import {projectUpsertSchema} from "../validation/projectSchemas.js"

import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"

import "./ProjectsPages.css"

export const CreateProjectPage = () => {
    const navigate = useNavigate()

    const [createProject, { isLoading, isError, error }] = useCreateProjectMutation()

    const form = useForm({
        resolver: zodResolver(projectUpsertSchema),
        mode: "onChange",
        defaultValues: {
            name: "",
            description: "",
            is_active: true,
        },
    })

    const fieldClass = (name) => {
        const { errors, touchedFields, dirtyFields } = form.formState
        return errors[name]
            ? "projectsInput inputInvalid" : touchedFields[name] && dirtyFields[name]
                ? "projectsInput inputValid" : "projectsInput"
    }

    const onSubmit = async (values) => {
        const payload = {
            name: values.name.trim(),
            description: values.description?.trim() ? values.description.trim() : null,
            is_active: Boolean(values.is_active),
        }
        const res = await createProject(payload)
        if ("data" in res && res.data?.id) {
            navigate(`/projects/${res.data.id}`)
        } else if ("data" in res) {
            navigate("/projects")
        }
    }

    return (
        <section className="projectsPage">
            <div className="projectsHeader">
                <div>
                    <h2>Создание проекта</h2>
                    <p>
                        <Link to="/projects" className="line">← Назад к проектам</Link>
                    </p>
                </div>
            </div>

            {isError ? (
                <ErrorBanner
                    title="Не удалось создать проект"
                    message={getApiErrorMessage(error)}
                />
            ) : null}

            <div className="projectsCard">
                <h3>Данные проекта</h3>

                <form className="projectsForm" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="projectsFormRow">
                        <label>Название *</label>
                        <input
                            className={fieldClass("name")}
                            type="text"
                            placeholder="Проект"
                            disabled={isLoading}
                            {...form.register("name")}
                        />
                        <p className={form.formState.errors.name ? "instructions instructionsError" : ""}>
                            {form.formState.errors.name?.message}
                        </p>
                    </div>

                    <div className="projectsFormRow">
                        <label>Описание</label>
                        <textarea
                            className={"projectsTextarea" + (form.formState.errors.description ? " inputInvalid" : "")}
                            placeholder="Коротко опишите проект (опционально)"
                            disabled={isLoading}
                            {...form.register("description")}
                        />
                        <p className={form.formState.errors.description ? "instructions instructionsError" : ""}>
                            {form.formState.errors.description?.message}
                        </p>
                    </div>

                    <label className="projectsPills">
                        <input
                            type="checkbox"
                            disabled={isLoading}
                            {...form.register("is_active")}
                        />
                        <span>Проект активен</span>
                    </label>

                    <div className="projectsActions">
                        <button
                            className="projectsBtn"
                            type="submit"
                            disabled={!form.formState.isValid || isLoading || form.formState.isSubmitting}>
                            {isLoading ? <InlineLoader label="Создаём..." /> : "Создать"}
                        </button>
                        <Link className="projectsBtn projectsBtnSecondary" to="/projects">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </section>
    )
}