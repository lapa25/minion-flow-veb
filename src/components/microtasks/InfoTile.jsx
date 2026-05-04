export const InfoTile = ({label, value}) => (
    <div className="projectsInfoTile">
        <div className="projectsInfoLabel">{label}</div>
        <div className="projectsInfoValue">{value ?? "—"}</div>
    </div>
)