import {useEffect, useMemo, useRef} from "react"
import "../../styles/ProjectsStatus.css"

const padSeq = (value) => String(value ?? 0).padStart(2, "0")

const getLevelClassName = (level) => {
    switch (String(level ?? "").toUpperCase()) {
        case "ERROR":
            return "projectsLogLevel projectsLogLevelError"
        case "WARN":
        case "WARNING":
            return "projectsLogLevel projectsLogLevelWarn"
        case "DEBUG":
            return "projectsLogLevel projectsLogLevelDebug"
        default:
            return "projectsLogLevel projectsLogLevelInfo"
    }
}

export const LiveLogsConsole = ({logs, emptyText = "Логи пока не поступили", autoScroll = true}) => {
    const bodyRef = useRef(null)
    const preparedLogs = useMemo(
        () =>
            [...(logs ?? [])].sort(
                (a, b) => Number(a?.seq ?? 0) - Number(b?.seq ?? 0)
            ),
        [logs]
    )
    useEffect(() => {
        if (!autoScroll) {
            return
        }
        const element = bodyRef.current
        if (!element) {
            return
        }
        element.scrollTop = element.scrollHeight
    }, [preparedLogs, autoScroll])

    return (
        <div className="projectsLogsConsole">
            <div ref={bodyRef} className="projectsLogsConsoleBody">
                {preparedLogs.length ? (
                    preparedLogs.map((item) => (
                        <div
                            key={item?.seq ?? `${item?.timestamp}-${item?.message}`}
                            className="projectsLogsConsoleRow"
                        >
                            <div className="projectsLogsConsoleLineNo">
                                {padSeq(item?.seq)}
                            </div>
                            <div className="projectsLogsConsoleContent">
                                <span className={getLevelClassName(item?.loglevel)}>
                                    {String(item?.loglevel ?? "INFO").toUpperCase()}
                                </span>
                                <span className="projectsLogsConsoleMessage">
                                    {item?.message ?? ""}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="projectsLogsConsoleEmpty">{emptyText}</div>
                )}
            </div>
        </div>
    )
}