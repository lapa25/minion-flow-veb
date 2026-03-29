import {useMemo} from "react"
import {Link, Navigate, useNavigate, useParams} from "react-router-dom"
import {useSelector} from "react-redux"

import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {ConfigForm} from "../components/configs/ConfigForm.jsx"

import {selectCurrentUser} from "../store/auth/authSelectors.js"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useCreateProjectConfigMutation} from "../store/configs/configsApiSlice.js"

import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {getProjectRole} from "../utils/projectRole.js"
import {getProjectPermissions} from "../utils/projectPermissions.js"

import {configFormDefaultValues, toConfigPayload} from "../validation/configsSchemas.js"

import "./ProjectsPages.css"

export const CreateConfigPage = () => {
    const {projectId} = useParams()
    const navigate = useNavigate()
    const currentUser = useSelector(selectCurrentUser)

    const {data: project, isFetching, isError, error, refetch} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true
    })

    const [createProjectConfig, {isLoading, isError: isSaveError, error: saveError}] =
        useCreateProjectConfigMutation()

    const projectRole = getProjectRole(project, currentUser)
    const permissions = getProjectPermissions(projectRole)

    const initialValues = useMemo(
        () => ({
            ...configFormDefaultValues,
            spec: {
                ...configFormDefaultValues.spec,
                projectId: String(projectId),
                userId: String(
                    currentUser?.id ??
                    currentUser?.user_id ??
                    currentUser?.email ??
                    ""
                ),
            },
        }),
        [projectId, currentUser]
    )

    if (isFetching && !project) {
        return (
            <section className="projectsCard">
                <InlineLoader label="Загружаем проект..." />
            </section>
        )
    }

    if (isError) {
        return (
            <section className="projectsCard">
                <div className="projectsHead">
                    <h2>Новая конфигурация</h2>
                    <Link className="line" to={`/projects/${projectId}/configs`}>
                        ← К списку конфигураций
                    </Link>
                </div>

                <ErrorBanner
                    title="Не удалось загрузить проект"
                    message={getApiErrorMessage(error, "Ошибка загрузки проекта")}
                    onRetry={refetch}
                />
            </section>
        )
    }

    if (!permissions.canManageConfigs) {
        return <Navigate to={`/projects/${projectId}/configs`} replace />
    }

    const onSubmit = async (values) => {
        const payload = toConfigPayload(values)
        const res = await createProjectConfig({
            projectId,
            ...payload,
        })

        if ("data" in res && res.data?.id) {
            navigate(`/projects/${projectId}/configs/${res.data.id}`)
            return
        }

        if ("data" in res) {
            navigate(`/projects/${projectId}/configs`)
        }
    }

    return (
        <section className="projectsPage">
            <div className="projectsHeader">
                <div>
                    <h2>Новая конфигурация</h2>

                    <div className="projectsActions">
                        <p>
                            <Link to={`/projects/${projectId}/configs`} className="line">
                                ← К списку конфигураций
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        <section className="projectsCard">
            {isSaveError ? (
                <ErrorBanner
                    title="Не удалось создать конфигурацию"
                    message={getApiErrorMessage(saveError, "Ошибка создания конфигурации")}
                />
            ) : null}

            <ConfigForm
                mode="create"
                initialValues={initialValues}
                isSubmitting={isLoading}
                onSubmit={onSubmit}
            />
        </section>
        </section>
    )
}