import {useMemo} from "react"
import {useListSearchParams} from "../utils/search.js"

export const useClientList = ({items, defaults, filterFn, sortFn}) => {
    const {params, updateParam} = useListSearchParams(defaults)

    const normalizedParams = useMemo(() => {
        const page = Number(params.page ?? defaults.page ?? 1) || 1
        const pageSize = Number(params.pageSize ?? defaults.pageSize ?? 10) || 10

        return {...defaults, ...params, page, pageSize}
    }, [defaults, params])

    const filteredItems = useMemo(() => {
        const baseItems = Array.isArray(items) ? items : []
        const filtered = filterFn ? filterFn(baseItems, normalizedParams) : [...baseItems]
        const preparedItems = Array.isArray(filtered) ? filtered : []

        return sortFn ? sortFn(preparedItems, normalizedParams) : preparedItems
    }, [items, normalizedParams, filterFn, sortFn])

    const total = filteredItems.length
    const totalPages = Math.max(1, Math.ceil(total / normalizedParams.pageSize))
    const safePage = Math.min(Math.max(1, normalizedParams.page), totalPages)

    const visibleItems = useMemo(() => {
        const start = (safePage - 1) * normalizedParams.pageSize
        return filteredItems.slice(start, start + normalizedParams.pageSize)
    }, [filteredItems, safePage, normalizedParams.pageSize])

    return {
        params: {...normalizedParams, page: safePage},
        updateParam, filteredItems, visibleItems, total, totalPages
    }
}