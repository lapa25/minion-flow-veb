import {useCallback, useEffect, useRef, useState} from "react"

export const useAsyncList = ({enabled = true, loader}) => {
    const requestIdRef = useRef(0)

    const [items, setItems] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    const reload = useCallback(async () => {
        if (!enabled) {
            return []
        }
        const requestId = ++requestIdRef.current
        setIsLoading(true)
        setError(null)
        try {
            const result = await loader()
            if (requestId === requestIdRef.current) {
                setItems(Array.isArray(result) ? result : [])
            }
            return result ?? []
        } catch (e) {
            if (requestId === requestIdRef.current) {
                setError(e)
            }
            return []
        } finally {
            if (requestId === requestIdRef.current) {
                setIsLoading(false)
            }
        }
    }, [enabled, loader])

    useEffect(() => {
        if (!enabled) {
            ++requestIdRef.current
            setItems([])
            setError(null)
            setIsLoading(false)
            return
        }
        void reload()
    }, [enabled, reload])

    return {items, setItems, isLoading, error, reload}
}