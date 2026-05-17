import {useCallback, useMemo, useState} from "react"
import {useNavigate} from "react-router-dom"
import {PageCard} from "../layout/PageCard.jsx"
import {InlineLoader} from "../ui/InlineLoader.jsx"
import {ErrorBanner} from "../ui/ErrorBanner.jsx"
import {useLazyGetProjectArtifactsQuery} from "../../store/artifacts/artifactsApiSlice.js"
import {useLazyGetProjectInputsQuery} from "../../store/inputs/inputsApiSlice.js"
import {useGetProjectConfigQuery, useLazyGetProjectConfigsQuery} from "../../store/configs/configsApiSlice.js"
import {useCreateProjectTaskMutation} from "../../store/tasks/tasksApiSlice.js"
import {useAsyncList} from "../../hooks/useAsyncList.js"
import {loadAllPages} from "../../utils/loadAllPages.js"
import {getApiErrorMessage} from "../../utils/getApiErrorMessage.js"

export const LaunchTaskDialog = ({isOpen, projectId, configId: presetConfigId = "", configAlias: presetConfigAlias = "",
                                     lockConfig = false, onClose}) => {
    const navigate = useNavigate()

    const [selectedJarId, setSelectedJarId] = useState("")
    const [selectedInputId, setSelectedInputId] = useState("")
    const [selectedConfigId, setSelectedConfigId] = useState(presetConfigId)

    const [triggerGetProjectArtifacts] = useLazyGetProjectArtifactsQuery()
    const [triggerGetProjectInputs] = useLazyGetProjectInputsQuery()
    const [triggerGetProjectConfigs] = useLazyGetProjectConfigsQuery()

    const [createProjectTask, {isLoading: isCreatingTask, isError: isCreateTaskError,
            error: createTaskError}] = useCreateProjectTaskMutation()

    const loadArtifactsData = useCallback(async () => {
        if (!projectId) {
            return []
        }
        return loadAllPages((params) =>
            triggerGetProjectArtifacts({projectId, ...params}).unwrap()
        )
    }, [projectId, triggerGetProjectArtifacts])

    const loadInputsData = useCallback(async () => {
        if (!projectId) {
            return []
        }
        return loadAllPages((params) =>
            triggerGetProjectInputs({projectId, ...params}).unwrap()
        )
    }, [projectId, triggerGetProjectInputs])

    const loadConfigsData = useCallback(async () => {
        if (!projectId) {
            return []
        }
        return loadAllPages((params) =>
            triggerGetProjectConfigs({projectId, ...params}).unwrap()
        )
    }, [projectId, triggerGetProjectConfigs])

    const {items: artifacts, isLoading: isLoadingArtifacts, error: artifactsError, reload: reloadArtifacts} =
        useAsyncList({enabled: Boolean(projectId) && isOpen, loader: loadArtifactsData})

    const {items: inputs, isLoading: isLoadingInputs, error: inputsError, reload: reloadInputs} =
        useAsyncList({enabled: Boolean(projectId) && isOpen, loader: loadInputsData})

    const {items: configs, isLoading: isLoadingConfigs, error: configsError, reload: reloadConfigs} =
        useAsyncList({enabled: Boolean(projectId) && isOpen, loader: loadConfigsData})

    const effectiveJarId = selectedJarId || artifacts[0]?.artifact?.artifactId || ""
    const effectiveInputId = selectedInputId || inputs[0]?.artifact?.artifactId || ""
    const effectiveConfigId = lockConfig ? presetConfigId : selectedConfigId || configs[0]?.configId || ""

    const selectedArtifact = useMemo(
        () =>
            artifacts.find((item) => item?.artifact?.artifactId === effectiveJarId) ?? null,
        [artifacts, effectiveJarId]
    )

    const selectedInput = useMemo(
        () =>
            inputs.find((item) => item?.artifact?.artifactId === effectiveInputId) ?? null,
        [inputs, effectiveInputId]
    )

    const selectedConfig = useMemo(() => {
        if (lockConfig && presetConfigId) {
            return (
                configs.find((item) => item?.configId === presetConfigId) ?? {
                    configId: presetConfigId,
                    alias: presetConfigAlias || presetConfigId,
                }
            )
        }
        return configs.find((item) => item?.configId === effectiveConfigId) ?? null
    }, [configs, effectiveConfigId, lockConfig, presetConfigId, presetConfigAlias])

    const {data: selectedConfigDetails, isFetching: isConfigDetailsFetching,
        isError: isConfigDetailsError, error: configDetailsError,
        refetch: refetchConfigDetails} = useGetProjectConfigQuery(
        {projectId, configId: effectiveConfigId},
        {
            skip: !isOpen || !projectId || !effectiveConfigId,
        }
    )

    const selectedConfigMeta = selectedConfigDetails ?? selectedConfig
    const selectedExecutionType = selectedConfigDetails?.config?.type ?? "stateless"

    const isLoadingOptions = isLoadingArtifacts || isLoadingInputs || isLoadingConfigs || isConfigDetailsFetching
    const hasOptionsError = Boolean(artifactsError || inputsError || configsError || isConfigDetailsError)

    const canSubmit = Boolean(effectiveJarId && effectiveInputId && effectiveConfigId &&
        selectedConfigDetails && !isCreatingTask && !isConfigDetailsFetching)

    const handleLaunch = async (event) => {
        event.preventDefault()
        if (!canSubmit) {
            return
        }
        const result = await createProjectTask({projectId,
            jarId: effectiveJarId,
            inputId: effectiveInputId,
            configId: effectiveConfigId,
        }).unwrap()

        onClose?.()
        if (result?.taskId) {
            navigate(`/projects/${projectId}/tasks/${result.taskId}`)
        } else {
            navigate(`/projects/${projectId}/tasks`)
        }
    }
    if (!isOpen) {
        return null
    }
    return (
        <PageCard
            title="Новый запуск"
            actions={
                <button
                    className="projectsBtn projectsBtnSecondary"
                    type="button"
                    onClick={onClose}
                >
                    Закрыть
                </button>
            }
        >
            {selectedConfigMeta ? (
                <div className="projectsPills">
                    <span className="pill">Config ID: {selectedConfigMeta?.configId ?? "—"}</span>
                    <span className="pill">Alias: {selectedConfigMeta?.alias ?? "—"}</span>
                    <span className="pill">Тип запуска: {selectedExecutionType}</span>
                </div>
            ) : null}
            {hasOptionsError ? (
                <ErrorBanner
                    title="Не удалось загрузить данные для запуска"
                    message={getApiErrorMessage(artifactsError ?? inputsError ?? configsError ?? configDetailsError)}
                    onRetry={async () => {
                        await Promise.all([reloadArtifacts(), reloadInputs(), reloadConfigs(),
                            effectiveConfigId ? refetchConfigDetails() : Promise.resolve()])
                    }}
                />
            ) : null}
            {isCreateTaskError ? (
                <ErrorBanner
                    title="Не удалось создать запуск"
                    message={getApiErrorMessage(createTaskError)}
                />
            ) : null}
            {isLoadingOptions ? (
                <InlineLoader label="Загружаем артефакты, input-ы и конфигурации..." />
            ) : (
                <form className="projectsForm" onSubmit={handleLaunch}>
                    <div className="projectsTwoCols">
                        {!lockConfig ? (
                            <label className="projectsField">
                                <span>Конфигурация *</span>
                                <select
                                    className="projectsSelect"
                                    value={selectedConfigId}
                                    disabled={isCreatingTask || !configs.length}
                                    onChange={(e) => setSelectedConfigId(e.target.value)}
                                >
                                    {!configs.length ? (
                                        <option value="">Нет доступных конфигураций</option>
                                    ) : null}
                                    {configs.map((item) => (
                                        <option key={item?.configId} value={item?.configId}>
                                            {item?.alias ?? item?.configId}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : (
                            <label className="projectsField">
                                <span>Конфигурация *</span>
                                <input
                                    className="projectsInput"
                                    value={selectedConfigMeta?.alias ?? presetConfigAlias ?? "—"}
                                    disabled
                                    readOnly
                                />
                            </label>
                        )}
                        <label className="projectsField">
                            <span>JAR артефакт *</span>
                            <select
                                className="projectsSelect"
                                value={selectedJarId}
                                disabled={isCreatingTask || !artifacts.length}
                                onChange={(e) => setSelectedJarId(e.target.value)}
                            >
                                {!artifacts.length ? (
                                    <option value="">Нет доступных артефактов</option>
                                ) : null}
                                {artifacts.map((item) => {
                                    const artifactId = item?.artifact?.artifactId
                                    return (
                                        <option key={artifactId} value={artifactId}>
                                            {item?.alias ?? artifactId}
                                        </option>
                                    )
                                })}
                            </select>
                        </label>
                    </div>
                    <div className="projectsTwoCols">
                        <label className="projectsField">
                            <span>Input *</span>
                            <select
                                className="projectsSelect"
                                value={selectedInputId}
                                disabled={isCreatingTask || !inputs.length}
                                onChange={(e) => setSelectedInputId(e.target.value)}
                            >
                                {!inputs.length ? (
                                    <option value="">Нет доступных input-ов</option>
                                ) : null}
                                {inputs.map((item) => {
                                    const artifactId = item?.artifact?.artifactId
                                    return (
                                        <option key={artifactId} value={artifactId}>
                                            {item?.alias ?? artifactId}
                                        </option>
                                    )
                                })}
                            </select>
                        </label>
                    </div>
                    <div className="projectsPills">
                        <span className="pill">JAR: {selectedArtifact?.artifact?.originalName ?? "—"}</span>
                        <span className="pill">Input: {selectedInput?.artifact?.originalName ?? "—"}</span>
                        <span className="pill">Тип input: {selectedInput?.inputType ?? "—"}</span>
                    </div>
                    <div className="projectsActions">
                        <button
                            className="projectsBtn"
                            type="submit"
                            disabled={!canSubmit}
                        >
                            {isCreatingTask ? <InlineLoader label="Запускаем..." /> : "Запустить"}
                        </button>
                    </div>
                </form>
            )}
        </PageCard>
    )
}