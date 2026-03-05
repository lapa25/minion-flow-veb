import {Link, useParams} from "react-router-dom"
import "./ProjectsPages.css"

export const ProjectRunsPage = () => {
    const { projectId } = useParams()
    return (
        <section className="projectsPage">
            <div className="projectsHeader">
                <div>
                    <h2>Запуски</h2>
                    <p>
                        <Link to={`/projects/${projectId}`} className="line">← Назад к проекту</Link>
                    </p>
                </div>
            </div>
            <div className="projectsCard">
                <p className="projectsHint">
                    Come back soon
                </p>
            </div>
        </section>
    )
}