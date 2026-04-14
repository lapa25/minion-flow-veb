import {useEffect, useRef, useState} from "react"

export const DebouncedSearchInput = ({initialValue = "", onCommit, delay = 350,
                                         className = "projectsInput", placeholder = "Поиск",
                                         type = "text"}) => {
    const [value, setValue] = useState(initialValue)
    const isFirstRender = useRef(true)

    useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }

        const timer = setTimeout(() => {
            onCommit(value.trim())
        }, delay)

        return () => clearTimeout(timer)
    }, [value, delay, onCommit])

    return (
        <input
            className={className}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
        />
    )
}