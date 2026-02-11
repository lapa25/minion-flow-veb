import { Link } from "react-router";

export const ForgotPasswordPage = () => {
    return (
        <section className="authCard">
            <h2>Восстановление пароля</h2>
            <p>
                Come back soon
            </p>
            <p>
                <Link to="/login" className="line">К входу</Link>
            </p>
        </section>
    );
};
