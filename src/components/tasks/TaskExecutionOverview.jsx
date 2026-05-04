import "../../styles/ProjectsStatus.css"
import {ExecutionEntityGrid} from "./ExecutionEntityGrid.jsx"
import {getStatusToneClassName} from "../../utils/statuses.js"
import {asInt} from "../../utils/numbers.js";

const getDoneCount = (summary) =>
    asInt(summary?.succeeded, 0) +
    asInt(summary?.failed, 0) +
    asInt(summary?.timedOut, 0)

const getProgressPercent = (summary) => {
    const total = asInt(summary?.total, 0)
    if (!total) {
        return 0
    }
    return Math.min(100, Math.max(0, (getDoneCount(summary) / total) * 100))
}

const getSegments = (summary) => {
    const total = Math.max(0, asInt(summary?.total, 0))
    const succeeded = Math.max(0, asInt(summary?.succeeded, 0))
    const running = Math.max(0, asInt(summary?.running, 0))
    const failed = Math.max(0, asInt(summary?.failed, 0))
    const timedOut = Math.max(0, asInt(summary?.timedOut, 0))
    const queued = Math.max(0, asInt(summary?.queued, 0))

    if (!total) {
        return []
    }
    return [
        {key: "succeeded", status: "SUCCEEDED", value: succeeded, label: "Успешно"},
        {key: "running", status: "RUNNING", value: running, label: "Исполняется"},
        {key: "failed", status: "FAILED", value: failed, label: "Упала"},
        {key: "timedOut", status: "TIME_OUT", value: timedOut, label: "Таймаут"},
        {key: "queued", status: "QUEUED", value: queued, label: "В очереди"},
    ].filter((segment) => segment.value > 0)
        .map((segment) => ({
            ...segment,
            percent: (segment.value / total) * 100,
        }))
}

const formatRate = (value) => {
    const numeric = Number(value ?? 0)
    if (!Number.isFinite(numeric)) {
        return "0.00"
    }
    return numeric.toFixed(2)
}

const MetricCard = ({label, value, toneClassName = ""}) => (
    <div className={`projectsExecutionMetricCard ${toneClassName}`}>
        <div className="projectsExecutionMetricLabel">{label}</div>
        <div className="projectsExecutionMetricValue">{value ?? "—"}</div>
    </div>
)

export const TaskExecutionOverview = ({projectId, taskId, type, summary, items, config}) => {
    const isSwarm = type === "swarm"
    const progressPercent = getProgressPercent(summary)
    const segments = getSegments(summary)
    const entityType = isSwarm ? "agent" : "microtask"

    const linkBuilder = (item) => {
        if (isSwarm) {
            return `/projects/${projectId}/tasks/${taskId}/agents/${item.agentId}`
        }
        return `/projects/${projectId}/tasks/${taskId}/microtasks/${item.microtaskId}`
    }

    return (
        <section className="projectsExecutionOverview">
            <div className="projectsExecutionOverviewHeader">
                <p className="projectsExecutionOverviewHint">
                    {isSwarm
                        ? "Клик по любой ячейке открывает страницу с состоянием агента"
                        : "Клик по любой ячейке открывает страницу микрозадачи с live-логами"}
                </p>
            </div>
            <div className="projectsExecutionLegend">
                <span className={`projectsLegendChip ${getStatusToneClassName("QUEUED")}`}>
                    <span className="projectsLegendDot" />
                    <span>В очереди</span>
                </span>
                <span className={`projectsLegendChip ${getStatusToneClassName("RUNNING")}`}>
                    <span className="projectsLegendDot" />
                    <span>Исполняется</span>
                </span>
                <span className={`projectsLegendChip ${getStatusToneClassName("FAILED")}`}>
                    <span className="projectsLegendDot" />
                    <span>Упала</span>
                </span>
                <span className={`projectsLegendChip ${getStatusToneClassName("SUCCEEDED")}`}>
                    <span className="projectsLegendDot" />
                    <span>Успешно</span>
                </span>
                {asInt(summary?.timedOut, 0) > 0 ? (
                    <span className={`projectsLegendChip ${getStatusToneClassName("TIME_OUT")}`}>
                        <span className="projectsLegendDot" />
                        <span>Таймаут</span>
                    </span>
                ) : null}
            </div>
            <div className="projectsExecutionProgressMeta">
                <span className="projectsExecutionProgressLabel">Завершение пайплайна</span>
                <span className="projectsExecutionProgressValue">
                    {progressPercent.toFixed(0)}%
                </span>
            </div>
            <div className="projectsProgressBar">
                {segments.length ? (
                    segments.map((segment) => (
                        <div
                            key={segment.key}
                            className={`projectsProgressSegment ${getStatusToneClassName(segment.status)}`}
                            style={{
                                "--projects-progress-width": `${segment.percent}%`,
                            }}
                            title={`${segment.label}: ${segment.value}`}
                        />
                    ))
                ) : (
                    <div className="projectsProgressBarEmpty" />
                )}
            </div>
            <div className="projectsExecutionGridPanel">
                <ExecutionEntityGrid
                    entityType={entityType}
                    items={items}
                    linkBuilder={linkBuilder}
                />
            </div>
            <div className="projectsExecutionMetricsGrid">
                <MetricCard
                    label={isSwarm ? "Agents" : "Microtasks"}
                    value={summary?.total ?? 0}
                />
                <MetricCard
                    label="Succeeded"
                    value={summary?.succeeded ?? 0}
                    toneClassName={getStatusToneClassName("SUCCEEDED")}
                />
                <MetricCard
                    label="Failed"
                    value={summary?.failed ?? 0}
                    toneClassName={getStatusToneClassName("FAILED")}
                />
                <MetricCard
                    label="Timed out"
                    value={summary?.timedOut ?? 0}
                    toneClassName={getStatusToneClassName("TIME_OUT")}
                />
                <MetricCard
                    label="Running"
                    value={summary?.running ?? 0}
                    toneClassName={getStatusToneClassName("RUNNING")}
                />
                <MetricCard
                    label={isSwarm ? "Agents/sec" : "Tasks/sec"}
                    value={formatRate(summary?.tasksPerSec)}
                />
                {isSwarm ? (
                    <>
                        <MetricCard
                            label="Iteration"
                            value={`${summary?.currentIteration ?? "—"} / ${config?.swarm?.iterations ?? "—"}`}
                        />
                        <MetricCard
                            label="Phase"
                            value={summary?.currentPhase ?? "—"}
                        />
                    </>
                ) : null}
            </div>
        </section>
    )
}