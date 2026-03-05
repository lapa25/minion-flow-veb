import { Link } from "react-router-dom";

export const NotFoundPage = () => {
    return (
        <section>
            <h2>Страница не найдена</h2>
            <p>Похоже, вы перешли по неверной ссылке</p>
            <Link to="/" className="line">На главную</Link>
        </section>
    );
};
