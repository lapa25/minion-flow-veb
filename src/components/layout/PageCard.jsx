export const PageCard = ({title, actions, children, as: Tag = "div"}) => {
    return (
        <Tag className="projectsCard">
            {title || actions ? (
                <div className="projectsHeader">
                    <div>{title ? <h3>{title}</h3> : null}</div>
                    {actions ? <div className="projectsActions">{actions}</div> : null}
                </div>
            ) : null}
            {children}
        </Tag>
    );
};