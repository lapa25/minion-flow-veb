import {useNavigate} from "react-router-dom"
import {useCreateProjectMutation} from "../store/projects/projectsApiSlice.js"
import {ProjectForm} from "../components/projects/ProjectForm.jsx";
import {PageHeader} from "../components/layout/PageHeader.jsx";
import "./ProjectsPages.css"

export const CreateProjectPage = () => {
    const navigate = useNavigate()

    const [createProject, { isLoading, isError, error }] = useCreateProjectMutation()

    const onSubmit = async (values) => {
        const payload = {
            name: values.name.trim(),
            description: values.description?.trim() ? values.description.trim() : ""
        }
        const createdProject = await createProject(payload).unwrap()
        navigate(`/projects/${createdProject.projectId}`)
    }

    return (
        <section className="projectsPage">
            <PageHeader
                title="Создание проекта"
                backTo="/projects"
                backLabel="Назад к проектам"
            />
            <ProjectForm
                initialValues={{
                    name: "",
                    description: ""
                }}
                onSubmit={onSubmit}
                isSubmitting={isLoading}
                submitError={isError ? error : null}
                submitErrorTitle="Не удалось создать проект"
                submitLabel="Создать"
                submitLoadingLabel="Создаём..."
                cancelTo="/projects"
            />
        </section>
    )
}