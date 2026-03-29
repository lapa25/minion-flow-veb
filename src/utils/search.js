import {useCallback, useMemo} from "react"
import {useSearchParams} from "react-router-dom"

import {asInt} from "./numbers.js"

const readParam = (sp, key, defaultValue) => {
    const v = sp.get(key)

    if (v == null) {
        return defaultValue
    }

    if (typeof defaultValue === "number") {
        return asInt(v, defaultValue)
    }

    return v
}

export const useListSearchParams = (defaults) => {
    const [sp, setSp] = useSearchParams()

    const params = useMemo(() => {
        return Object.fromEntries(
            Object.entries(defaults).map(([key, defaultValue]) => [
                key,
                readParam(sp, key, defaultValue)
            ])
        )
    }, [sp, defaults])

    const updateParam = useCallback((key, value) => {
        const next = new URLSearchParams(sp)

        const shouldDelete = value === undefined || value === null || value === "" || value === defaults[key]

        if (shouldDelete) {
            next.delete(key)
        } else {
            next.set(key, String(value))
        }

        if (key !== "page") {
            next.set("page", "1")
        }

        setSp(next, {replace: true})
    }, [sp, setSp, defaults])

    return {params, updateParam}
}