export const AuthCard = ({title, children}) => {
    return (
        <section className="authCard">
            {title ? <h2>{title}</h2> : null}
            {children}
        </section>
    )
}