import {useEffect, useMemo, useRef, useState} from "react"
import {Link} from "react-router-dom"
import {Check, Clock3, X, Zap} from "lucide-react"
import "../../styles/ProjectsStatus.css"
import {getStatusToneClassName} from "../../utils/statuses.js"

const ExecutionStatusIcon = ({status}) => {
    switch (status) {
        case "SUCCEEDED":
            return <Check size={20} strokeWidth={2.4} />
        case "FAILED":
            return <X size={20} strokeWidth={2.4} />
        case "RUNNING":
        case "STARTING":
            return <Zap size={20} strokeWidth={2.2} />
        case "TIME_OUT":
        case "TIMED_OUT":
        case "CREATED":
        case "QUEUED":
        default:
            return <Clock3 size={20} strokeWidth={2.1} />
    }
}

export const ExecutionEntityGrid = ({items, entityType = "microtask", linkBuilder,
    maxRows = 7, minRows = 1, cellSize = 40, gap = 6}) => {

    const wrapperRef = useRef(null)
    const [rowsPerColumn, setRowsPerColumn] = useState(maxRows)

    const idKey = entityType === "agent" ? "agentId" : "microtaskId"
    const emptyText = entityType === "agent"
        ? "Данные об агентах пока не поступили"
        : "Данные о микрозадачах пока не поступили"

    const orderedItems = useMemo(
        () =>
            [...(items ?? [])].sort(
                (a, b) => Number(a?.displayIndex ?? 0) - Number(b?.displayIndex ?? 0)
            ),
        [items]
    )

    useEffect(() => {
        const element = wrapperRef.current
        if (!element) {
            return
        }
        const updateLayout = () => {
            const width = element.clientWidth
            const count = orderedItems.length
            if (!width || !count) {
                setRowsPerColumn(maxRows)
                return
            }
            const fullCellWidth = cellSize + gap
            const visibleCols = Math.max(1, Math.floor((width + gap) / fullCellWidth))
            const rowsNeededToFillWidth = Math.ceil(count / visibleCols)
            setRowsPerColumn(
                Math.max(minRows, Math.min(maxRows, rowsNeededToFillWidth))
            )
        }
        updateLayout()
        const observer = new ResizeObserver(updateLayout)
        observer.observe(element)
        window.addEventListener("resize", updateLayout)

        return () => {
            observer.disconnect()
            window.removeEventListener("resize", updateLayout)
        }
    }, [orderedItems.length, maxRows, minRows, cellSize, gap])

    const serpentineItems = useMemo(() => {
        if (!orderedItems.length) {
            return []
        }
        const chunks = []
        for (let i = 0; i < orderedItems.length; i += rowsPerColumn) {
            const chunk = orderedItems.slice(i, i + rowsPerColumn)
            const columnIndex = Math.floor(i / rowsPerColumn)

            chunks.push(columnIndex % 2 === 0 ? chunk : [...chunk].reverse())
        }
        return chunks.flat()
    }, [orderedItems, rowsPerColumn])

    if (!serpentineItems.length) {
        return <p className="projectsHint">{emptyText}</p>
    }

    return (
        <div ref={wrapperRef} className="projectsMicrotaskGridWrap">
            <div
                className="projectsMicrotaskGrid"
                style={{
                    "--projects-microtask-rows": rowsPerColumn,
                    "--projects-microtask-cell-size": `${cellSize}px`,
                    "--projects-microtask-gap": `${gap}px`,
                }}
            >
                {serpentineItems.map((item) => {
                    const toneClassName = getStatusToneClassName(item?.status)
                    const entityId = item?.[idKey]
                    const href = entityId && typeof linkBuilder === "function"
                        ? linkBuilder(item)
                        : null
                    const title = `#${item?.displayIndex ?? "—"} • ${item?.status ?? "—"}`

                    if (!href) {
                        return (
                            <div
                                key={`${item?.displayIndex}:static`}
                                title={title}
                                className={`projectsMicrotaskCell projectsMicrotaskCellStatic ${toneClassName}`}
                            >
                                <ExecutionStatusIcon status={item?.status} />
                            </div>
                        )
                    }
                    return (
                        <Link
                            key={`${item?.displayIndex}:${entityId}`}
                            to={href}
                            title={title}
                            className={`projectsMicrotaskCell ${toneClassName}`}
                        >
                            <ExecutionStatusIcon status={item?.status} />
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}