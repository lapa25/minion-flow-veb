import {ErrorBanner} from "../ui/ErrorBanner.jsx"
import {InlineLoader} from "../ui/InlineLoader.jsx"
import {getApiErrorMessage} from "../../utils/getApiErrorMessage.js"
import {PageCard} from "../layout/PageCard.jsx"

export const QueryBoundary = ({isLoading, hasData, isError, error, onRetry,
    loadingLabel = "Загрузка...", errorTitle = "Не удалось загрузить данные",
    errorMessage, children}) => {
    if (isLoading && !hasData) {
        return (
            <PageCard as="section">
                <InlineLoader label={loadingLabel} />
            </PageCard>
        )
    }
    if (isError) {
        return (
            <PageCard as="section">
                <ErrorBanner
                    title={errorTitle}
                    message={errorMessage ?? getApiErrorMessage(error)}
                    onRetry={onRetry}
                />
            </PageCard>
        )
    }
    return children
}