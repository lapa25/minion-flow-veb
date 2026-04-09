import {PageCard} from "../layout/PageCard.jsx"
import {ErrorBanner} from "../ui/ErrorBanner.jsx"
import {getApiErrorMessage} from "../../utils/getApiErrorMessage.js"

export const ListTableCard = ({title = "Список", error, errorTitle, onRetry, isEmpty,
                                  emptyText, children, footer}) => {
    return (
        <PageCard title={title}>
            {error ? (
                <ErrorBanner
                    title={errorTitle}
                    message={getApiErrorMessage(error)}
                    onRetry={onRetry}
                />
            ) : null}
            {isEmpty ? (
                <p className="projectsHint">{emptyText}</p>
            ) : (
                children
            )}
            {footer}
        </PageCard>
    )
}