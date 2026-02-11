import { Link } from "react-router";

export const ConfirmEmailPage = () => {
    return (
        <section className="authCard">
            <h2>Подтверждение почты</h2>
            <p>
                Come back soon
            </p>
            <p>
                <Link to="/login" className="line">К входу</Link>
            </p>
        </section>
    );
};
