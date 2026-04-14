import {useCallback} from "react"
import {useAsyncList} from "./useAsyncList.js"
import {useClientList} from "./useClientList.js"
import {loadAllPages} from "../utils/loadAllPages.js"
import {downloadBlob} from "../utils/downloadBlob.js"

const DEFAULTS = {
    q: "",
    sort: "created_desc",
    page: 1,
    pageSize: 10,
}

const SORTERS = {
    created_desc: (a, b) =>
        String(b?.artifact?.createdAt ?? "").localeCompare(String(a?.artifact?.createdAt ?? "")),
    created_asc: (a, b) =>
        String(a?.artifact?.createdAt ?? "").localeCompare(String(b?.artifact?.createdAt ?? "")),
    alias_asc: (a, b) =>
        String(a?.alias ?? "").localeCompare(String(b?.alias ?? "")),
    alias_desc: (a, b) =>
        String(b?.alias ?? "").localeCompare(String(a?.alias ?? "")),
}

const defaultFilter = (items, {q}) => {
    const needle = String(q ?? "").trim().toLowerCase()

    if (!needle) {
        return [...items]
    }

    return items.filter((item) =>
        String(item?.alias ?? "").toLowerCase().includes(needle) ||
        String(item?.artifact?.originalName ?? "").toLowerCase().includes(needle) ||
        String(item?.artifact?.artifactId ?? "").toLowerCase().includes(needle)
    )
}

const defaultSort = (items, {sort}) => {
    const sorter = SORTERS[sort]
    return sorter ? [...items].sort(sorter) : [...items]
}

export const useProjectResourceList = ({projectId, canManage, canDownload = true,
    useLazyListQuery, useLazyDownloadQuery, useCreateMutation, useUpdateMetaMutation,
    useUpdateContentMutation, useDeleteMutation, createPayload, renamePayload,
    replacePayload, deletePayload, replaceAccept, renamePrompt = "Новый alias",
    getDownloadFilename, filterFn = defaultFilter, sortFn = defaultSort}) => {

    const [triggerList] = useLazyListQuery()
    const [triggerDownload] = useLazyDownloadQuery()

    const [createItem, createState] = useCreateMutation()
    const [updateMeta, renameState] = useUpdateMetaMutation()
    const [updateContent, replaceState] = useUpdateContentMutation()
    const [deleteItem, deleteState] = useDeleteMutation()

    const loadData = useCallback(async () => {
        if (!projectId) {
            return []
        }
        return loadAllPages((params) =>
            triggerList({projectId, ...params}).unwrap()
        )
    }, [projectId, triggerList])

    const {items: allItems, isLoading: isLoadingAll, error: loadError, reload} = useAsyncList({
        enabled: Boolean(projectId), loader: loadData})

    const {params: {q, sort, page, pageSize}, updateParam, visibleItems, total, totalPages} = useClientList({
        items: allItems, defaults: DEFAULTS, filterFn, sortFn})

    const handleCreate = async (values) => {
        await createItem(createPayload({projectId, values})).unwrap()
        await reload()
    }

    const handleRename = async (item) => {
        if (!canManage) {
            return
        }
        const artifactId = item?.artifact?.artifactId
        const currentAlias = item?.alias ?? ""
        const nextAlias = window.prompt(renamePrompt, currentAlias)

        if (!artifactId || nextAlias === null) {
            return
        }
        const preparedAlias = nextAlias.trim()
        if (!preparedAlias || preparedAlias === currentAlias) {
            return
        }
        await updateMeta(renamePayload({projectId, item, artifactId, alias: preparedAlias})).unwrap()
        await reload()
    }

    const handleReplace = async (item) => {
        if (!canManage) {
            return
        }
        const artifactId = item?.artifact?.artifactId

        if (!artifactId) {
            return
        }
        const input = document.createElement("input")
        input.type = "file"
        input.accept = replaceAccept

        input.onchange = async (e) => {
            const file = e.target.files?.[0]
            if (!file) {
                return
            }
            await updateContent(replacePayload({projectId, item, artifactId, file})).unwrap()
            await reload()
        }
        input.click()
    }

    const handleDelete = async (item) => {
        if (!canManage) {
            return
        }
        const artifactId = item?.artifact?.artifactId
        if (!artifactId) {
            return
        }
        const confirmed = window.confirm(deletePayload.confirmMessage)
        if (!confirmed) {
            return
        }
        await deleteItem(deletePayload.build({projectId, item, artifactId})).unwrap()
        await reload()
    }

    const handleDownload = async (item) => {
        if (!canDownload) {
            return
        }
        const artifactId = item?.artifact?.artifactId
        if (!artifactId) {
            return
        }
        const blob = await triggerDownload({projectId, artifactId}).unwrap()
        downloadBlob(blob, getDownloadFilename(item))
    }

    return {q, sort, page, pageSize, total, totalPages, visibleItems, updateParam,
        isLoadingAll, loadError, reload,
        handleCreate, handleRename, handleReplace, handleDelete, handleDownload,
        isCreating: createState.isLoading,
        isRenaming: renameState.isLoading,
        isReplacing: replaceState.isLoading,
        isDeleting: deleteState.isLoading,
        createError: createState.isError ? createState.error : null,
        operationError: renameState.error ?? replaceState.error ?? deleteState.error ?? null
    }
}