import {DebouncedSearchInput} from "../components/ui/DebouncedSearchInput.jsx"
import {InputUploadForm} from "../components/inputs/InputUploadForm.jsx"
import {PageHeader} from "../components/layout/PageHeader.jsx"
import {RefreshButton} from "../components/ui/RefreshButton.jsx"
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {ListPageShell} from "../components/lists/ListPageShell.jsx"
import {ListSummaryCard} from "../components/lists/ListSummaryCard.jsx"
import {ListFiltersCard} from "../components/lists/ListFiltersCard.jsx"
import {ListTableCard} from "../components/lists/ListTableCard.jsx"
import {ListPagination} from "../components/lists/ListPagination.jsx"
import {PageCard} from "../components/layout/PageCard.jsx"
import {useCreateProjectInputMutation, useDeleteProjectInputMutation, useLazyGetProjectInputContentQuery,
    useLazyGetProjectInputsQuery, useUpdateProjectInputContentMutation, useUpdateProjectInputMetaMutation}
    from "../store/inputs/inputsApiSlice.js"
import {PROJECT_ROLE} from "../utils/projectRole.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {formatDateTime} from "../utils/datetime.js"
import {formatFileSize} from "../utils/fileSize.js"
import {useProjectResourceList} from "../hooks/useProjectResourceList.js"
import {ProjectGuardedPage} from "../components/projects/ProjectGuardedPage.jsx"
import "../styles/ProjectsPages.css"

const inputsResourceConfig = {
    useLazyListQuery: useLazyGetProjectInputsQuery,
    useLazyDownloadQuery: useLazyGetProjectInputContentQuery,
    useCreateMutation: useCreateProjectInputMutation,
    useUpdateMetaMutation: useUpdateProjectInputMetaMutation,
    useUpdateContentMutation: useUpdateProjectInputContentMutation,
    useDeleteMutation: useDeleteProjectInputMutation,

    createPayload: ({projectId, values}) => ({
        projectId,
        alias: values.alias,
        inputType: values.inputType,
        file: values.file,
    }),

    renamePayload: ({projectId, item, artifactId, alias}) => ({
        projectId,
        artifactId,
        alias,
        inputType: item?.inputType ?? "JSONL",
    }),

    replacePayload: ({projectId, artifactId, file}) => ({
        projectId,
        artifactId,
        file,
    }),

    deletePayload: {
        confirmMessage: "Удалить input? Действие необратимо",
        build: ({projectId, artifactId}) => ({
            projectId,
            artifactId,
        }),
    },

    replaceAccept: ".jsonl,application/json,text/plain",

    getDownloadFilename: (item) =>
        item?.artifact?.originalName ??
        `${item?.alias ?? item?.artifact?.artifactId ?? "input"}.jsonl`,
}

const ProjectInputsContent = ({projectId, project, projectRole, permissions}) => {
    const {q, sort, page, pageSize, total, totalPages, visibleItems, updateParam,
        isLoadingAll, loadError, reload,
        handleCreate, handleRename, handleReplace, handleDelete, handleDownload,
        isCreating, isRenaming, isReplacing, isDeleting,
        createError, operationError} = useProjectResourceList({projectId,
        canManage: permissions?.canManageInputs,
        canDownload: true,
        ...inputsResourceConfig,
    })

    return (
        <ListPageShell>
            <PageHeader
                title="Входные данные"
                backTo={`/projects/${projectId}`}
                backLabel="Назад к проекту"
                actions={<RefreshButton onClick={reload} isLoading={isLoadingAll} />}
            />
            <ListSummaryCard>
                <span className="pill">Проект: {project?.projectName ?? "—"}</span>
                <span className="pill">Моя роль: {PROJECT_ROLE[projectRole]}</span>
                <span className="pill">Всего input-ов: {total}</span>
            </ListSummaryCard>
            {permissions?.canManageInputs ? (
                <PageCard title="Загрузить input">
                    {createError ? (
                        <ErrorBanner
                            title="Не удалось загрузить input"
                            message={getApiErrorMessage(createError)}
                        />
                    ) : null}
                    <InputUploadForm
                        isSubmitting={isCreating}
                        onSubmit={handleCreate}
                    />
                </PageCard>
            ) : null}
            {operationError ? (
                <PageCard>
                    <ErrorBanner
                        title="Операция не выполнена"
                        message={getApiErrorMessage(operationError)}
                    />
                </PageCard>
            ) : null}
            <ListFiltersCard>
                <DebouncedSearchInput
                    initialValue={q}
                    placeholder="Поиск по alias / имени файла / artifactId"
                    className="projectsInput"
                    onCommit={(value) => updateParam("q", value)}
                />
                <select
                    className="projectsSelect"
                    value={sort}
                    onChange={(e) => updateParam("sort", e.target.value)}
                >
                    <option value="created_desc">Сначала новые</option>
                    <option value="created_asc">Сначала старые</option>
                    <option value="alias_asc">Alias A-Z</option>
                    <option value="alias_desc">Alias Z-A</option>
                </select>

                <div />
            </ListFiltersCard>
            <ListTableCard
                title="Список"
                error={loadError}
                errorTitle="Не удалось загрузить input-ы"
                onRetry={reload}
                isEmpty={!isLoadingAll && !visibleItems.length}
                emptyText="Input-ов пока нет"
                footer={
                    <ListPagination
                        page={page}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        isLoading={isLoadingAll}
                        onPrev={() => updateParam("page", Math.max(1, page - 1))}
                        onNext={() => updateParam("page", Math.min(totalPages, page + 1))}
                    />
                }
            >
                <div className="projectsTableWrap">
                    <table className="projectsTable">
                        <thead>
                        <tr>
                            <th>Alias</th>
                            <th>Тип</th>
                            <th>Файл</th>
                            <th>Размер</th>
                            <th>Создан</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {visibleItems.map((item) => {
                            const artifactId = item?.artifact?.artifactId
                            return (
                                <tr key={artifactId ?? item?.alias}>
                                    <td>{item?.alias ?? "—"}</td>
                                    <td>{item?.inputType ?? "—"}</td>
                                    <td>{item?.artifact?.originalName ?? "—"}</td>
                                    <td>{formatFileSize(item?.artifact?.size)}</td>
                                    <td>{formatDateTime(item?.artifact?.createdAt)}</td>
                                    <td>
                                        <div className="projectsActions">
                                            <button
                                                className="projectsBtn projectsBtnSecondary"
                                                type="button"
                                                onClick={() => handleDownload(item)}
                                            >
                                                Скачать
                                            </button>
                                            {permissions?.canManageInputs ? (
                                                <button
                                                    className="projectsBtn projectsBtnSecondary"
                                                    type="button"
                                                    disabled={isRenaming}
                                                    onClick={() => handleRename(item)}
                                                >
                                                    Alias
                                                </button>
                                            ) : null}
                                            {permissions?.canManageInputs ? (
                                                <button
                                                    className="projectsBtn projectsBtnSecondary"
                                                    type="button"
                                                    disabled={isReplacing}
                                                    onClick={() => handleReplace(item)}
                                                >
                                                    Заменить
                                                </button>
                                            ) : null}
                                            {permissions?.canManageInputs ? (
                                                <button
                                                    className="projectsBtn projectsBtnSecondary"
                                                    type="button"
                                                    disabled={isDeleting}
                                                    onClick={() => handleDelete(item)}
                                                >
                                                    Удалить
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            </ListTableCard>
        </ListPageShell>
    )
}

export const ProjectInputsPage = () => {
    return (
        <ProjectGuardedPage
            permission="canViewInputs"
            deniedMessage="У вас нет доступа к входным данным проекта"
        >
            {(props) => <ProjectInputsContent {...props} />}
        </ProjectGuardedPage>
    )
}