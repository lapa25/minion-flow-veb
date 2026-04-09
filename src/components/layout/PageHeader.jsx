import {Link} from "react-router-dom"

export const PageHeader = ({title, backTo, backLabel, actions, children}) => {
    return (
        <div className="projectsHeader">
            <div>
                <h2>{title}</h2>
                {backTo ? (
                    <p>
                        <Link to={backTo} className="line">
                            ← {backLabel}
                        </Link>
                    </p>
                ) : null}
                {children}
            </div>
            {actions ? <div className="projectsActions">{actions}</div> : null}
        </div>
    )
}