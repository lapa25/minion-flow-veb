import {useEffect, useMemo, useRef, useState} from "react"
import {Link} from "react-router-dom"
import {Check, Clock3, X, Zap} from "lucide-react"
import "../../styles/ProjectsStatus.css"
import {getStatusToneClassName} from "../../utils/statuses.js"

const MicrotaskStatusIcon = ({status}) => {
    switch (status) {
        case "SUCCEEDED":
            return <Check size={20} strokeWidth={2.4} />
        case "FAILED":
            return <X size={20} strokeWidth={2.4} />
        case "RUNNING":
            return <Zap size={20} strokeWidth={2.2} />
        case "TIME_OUT":
        case "CREATED":
        case "STARTING":
        default:
            return <Clock3 size={20} strokeWidth={2.1} />
    }
}

export const MicrotaskGrid = ({projectId, taskId, microtasks, maxRows = 7, minRows = 1,
                                  cellSize = 40, gap = 6}) => {
    const wrapperRef = useRef(null)
    const [rowsPerColumn, setRowsPerColumn] = useState(maxRows)

    const orderedMicrotasks = useMemo(
        () =>
            [...microtasks].sort(
                (a, b) => Number(a?.displayIndex ?? 0) - Number(b?.displayIndex ?? 0)
            ),
        [microtasks]
    )

    useEffect(() => {
        const element = wrapperRef.current
        if (!element) {
            return
        }
        const updateLayout = () => {
            const width = element.clientWidth
            const count = orderedMicrotasks.length
            if (!width || !count) {
                setRowsPerColumn(maxRows)
                return
            }
            const fullCellWidth = cellSize + gap
            const visibleCols = Math.max(1, Math.floor((width + gap) / fullCellWidth))
            const rowsNeededToFillWidth = Math.ceil(count / visibleCols)
            const nextRows = Math.max(
                minRows,
                Math.min(maxRows, rowsNeededToFillWidth)
            )
            setRowsPerColumn(nextRows)
        }
        updateLayout()
        const observer = new ResizeObserver(() => {
            updateLayout()
        })
        observer.observe(element)
        window.addEventListener("resize", updateLayout)
        return () => {
            observer.disconnect()
            window.removeEventListener("resize", updateLayout)
        }
    }, [orderedMicrotasks.length, maxRows, minRows, cellSize, gap])

    const serpentineMicrotasks = useMemo(() => {
        if (!orderedMicrotasks.length) {
            return []
        }
        const chunks = []
        for (let i = 0; i < orderedMicrotasks.length; i += rowsPerColumn) {
            const chunk = orderedMicrotasks.slice(i, i + rowsPerColumn)
            const columnIndex = Math.floor(i / rowsPerColumn)
            chunks.push(columnIndex % 2 === 0 ? chunk : [...chunk].reverse())
        }
        return chunks.flat()
    }, [orderedMicrotasks, rowsPerColumn])

    if (!serpentineMicrotasks.length) {
        return <p className="projectsHint">Данные о микрозадачах пока не поступили</p>
    }
    return (
        <div
            ref={wrapperRef}
            className="projectsMicrotaskGridWrap"
        >
            <div
                className="projectsMicrotaskGrid"
                style={{
                    "--projects-microtask-rows": rowsPerColumn,
                    "--projects-microtask-cell-size": `${cellSize}px`,
                    "--projects-microtask-gap": `${gap}px`,
                }}
            >
                {serpentineMicrotasks.map((item) => {
                    const toneClassName = getStatusToneClassName(item?.status)
                    const hasLink = Boolean(item?.microtaskId)
                    const title = `#${item?.displayIndex ?? "—"} • ${item?.status ?? "—"}`
                    if (!hasLink) {
                        return (
                            <div
                                key={`${item?.displayIndex}:empty`}
                                title={title}
                                className={`projectsMicrotaskCell projectsMicrotaskCellStatic ${toneClassName}`}
                            >
                                <MicrotaskStatusIcon status={item?.status} />
                            </div>
                        )
                    }
                    return (
                        <Link
                            key={`${item?.displayIndex}:${item?.microtaskId}`}
                            to={`/projects/${projectId}/tasks/${taskId}/microtasks/${item?.microtaskId}`}
                            title={title}
                            className={`projectsMicrotaskCell ${toneClassName}`}
                        >
                            <MicrotaskStatusIcon status={item?.status} />
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}