import {PageCard} from "../layout/PageCard.jsx"

export const ListSummaryCard = ({children}) => {
    return (
        <PageCard>
            <div className="projectsPills">
                {children}
            </div>
        </PageCard>
    )
}