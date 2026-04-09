import {PageCard} from "../layout/PageCard.jsx"

export const ListFiltersCard = ({children, title = "Фильтры"}) => {
    return (
        <PageCard title={title}>
            <div className="projectsFilters">
                {children}
            </div>
        </PageCard>
    )
}