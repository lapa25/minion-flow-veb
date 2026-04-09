import {InlineLoader} from "./InlineLoader.jsx"

export const RefreshButton = ({onClick, isLoading, label = "Обновить",
    loadingLabel = "Обновляем...", className = "projectsBtn projectsBtnSecondary"}) => {
    return (
        <button
            className={className}
            onClick={onClick}
            disabled={isLoading}
            type="button">
            {isLoading ? <InlineLoader label={loadingLabel} /> : label}
        </button>
    )
}