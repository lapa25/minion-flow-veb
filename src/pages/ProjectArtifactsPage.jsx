import {DebouncedSearchInput} from "../components/ui/DebouncedSearchInput.jsx"
import {ArtifactUploadForm} from "../components/artifacts/ArtifactUploadForm.jsx"
import {PageHeader} from "../components/layout/PageHeader.jsx"
import {RefreshButton} from "../components/ui/RefreshButton.jsx"
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {ListPageShell} from "../components/lists/ListPageShell.jsx"
import {ListSummaryCard} from "../components/lists/ListSummaryCard.jsx"
import {ListFiltersCard} from "../components/lists/ListFiltersCard.jsx"
import {ListTableCard} from "../components/lists/ListTableCard.jsx"
import {ListPagination} from "../components/lists/ListPagination.jsx"
import {PageCard} from "../components/layout/PageCard.jsx"
import {useCreateProjectArtifactMutation, useDeleteProjectArtifactMutation, useLazyGetProjectArtifactContentQuery,
    useLazyGetProjectArtifactsQuery, useUpdateProjectArtifactContentMutation, useUpdateProjectArtifactMetaMutation}
    from "../store/artifacts/artifactsApiSlice.js"
import {PROJECT_ROLE} from "../utils/projectRole.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {formatDateTime} from "../utils/datetime.js"
import {formatFileSize} from "../utils/fileSize.js"
import {useProjectResourceList,} from "../hooks/useProjectResourceList.js"
import {ProjectGuardedPage} from "../components/projects/ProjectGuardedPage.jsx"
import "../styles/ProjectsPages.css"

const artifactsResourceConfig = {
    useLazyListQuery: useLazyGetProjectArtifactsQuery,
    useLazyDownloadQuery: useLazyGetProjectArtifactContentQuery,
    useCreateMutation: useCreateProjectArtifactMutation,
    useUpdateMetaMutation: useUpdateProjectArtifactMetaMutation,
    useUpdateContentMutation: useUpdateProjectArtifactContentMutation,
    useDeleteMutation: useDeleteProjectArtifactMutation,

    createPayload: ({projectId, values}) => ({
        projectId,
        alias: values.alias,
        file: values.file,
    }),

    renamePayload: ({projectId, artifactId, alias}) => ({
        projectId,
        artifactId,
        alias,
    }),

    replacePayload: ({projectId, artifactId, file}) => ({
        projectId,
        artifactId,
        file,
    }),

    deletePayload: {
        confirmMessage: "Удалить артефакт? Действие необратимо",
        build: ({projectId, artifactId}) => ({
            projectId,
            artifactId,
        }),
    },

    replaceAccept: ".jar,application/java-archive",

    getDownloadFilename: (item) =>
        item?.artifact?.originalName ??
        `${item?.alias ?? item?.artifact?.artifactId ?? "artifact"}.jar`,
}

const ProjectArtifactsContent = ({projectId, project, projectRole, permissions}) => {

    const {q, sort, page, pageSize, total, totalPages, visibleItems, updateParam,
        isLoadingAll, loadError, reload,
        handleCreate, handleRename, handleReplace, handleDelete, handleDownload,
        isCreating, isRenaming, isReplacing, isDeleting,
        createError, operationError} = useProjectResourceList({projectId,
        canManage: permissions?.canManageArtifacts,
        canDownload: permissions?.canDownloadArtifacts,
        ...artifactsResourceConfig})

    return (
        <ListPageShell>
            <PageHeader
                title="Артефакты"
                backTo={`/projects/${projectId}`}
                backLabel="Назад к проекту"
                actions={<RefreshButton onClick={reload} isLoading={isLoadingAll} />}
            />
            <ListSummaryCard>
                <span className="pill">Проект: {project?.projectName ?? "—"}</span>
                <span className="pill">Моя роль: {PROJECT_ROLE[projectRole]}</span>
                <span className="pill">Всего артефактов: {total}</span>
            </ListSummaryCard>
            {permissions?.canManageArtifacts ? (
                <PageCard title="Загрузить JAR">
                    {createError ? (
                        <ErrorBanner
                            title="Не удалось загрузить артефакт"
                            message={getApiErrorMessage(createError)}
                        />
                    ) : null}
                    <ArtifactUploadForm
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
                errorTitle="Не удалось загрузить артефакты"
                onRetry={reload}
                isEmpty={!isLoadingAll && !visibleItems.length}
                emptyText="Артефактов пока нет"
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
                            <th>Файл</th>
                            <th>Размер</th>
                            <th>Тип</th>
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
                                    <td>{item?.artifact?.originalName ?? "—"}</td>
                                    <td>{formatFileSize(item?.artifact?.size)}</td>
                                    <td>{item?.artifact?.contentType ?? "—"}</td>
                                    <td>{formatDateTime(item?.artifact?.createdAt)}</td>
                                    <td>
                                        <div className="projectsActions">
                                            {permissions?.canDownloadArtifacts ? (
                                                <button
                                                    className="projectsBtn projectsBtnSecondary"
                                                    type="button"
                                                    onClick={() => handleDownload(item)}
                                                >
                                                    Скачать
                                                </button>
                                            ) : null}
                                            {permissions?.canManageArtifacts ? (
                                                <button
                                                    className="projectsBtn projectsBtnSecondary"
                                                    type="button"
                                                    disabled={isRenaming}
                                                    onClick={() => handleRename(item)}
                                                >
                                                    Alias
                                                </button>
                                            ) : null}
                                            {permissions?.canManageArtifacts ? (
                                                <button
                                                    className="projectsBtn projectsBtnSecondary"
                                                    type="button"
                                                    disabled={isReplacing}
                                                    onClick={() => handleReplace(item)}
                                                >
                                                    Заменить
                                                </button>
                                            ) : null}
                                            {permissions?.canManageArtifacts ? (
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

export const ProjectArtifactsPage = () => {
    return (
        <ProjectGuardedPage
            permission="canViewArtifacts"
            deniedMessage="У вас нет доступа к артефактам проекта"
        >
            {(props) => <ProjectArtifactsContent {...props} />}
        </ProjectGuardedPage>
    )
}