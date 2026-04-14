import {PageCard} from "../layout/PageCard.jsx"

export const ListSummaryCard = ({children}) => {
    return (
        <PageCard>
            <div className="projectsPills" style={{marginBottom: "0"}}>
                {children}
            </div>
        </PageCard>
    )
}