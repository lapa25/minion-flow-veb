import '../../styles/LoadersErrors.css'

export const ErrorBanner = ({ title = "Ошибка", message, onRetry }) => {
    return (
        <div className="errorBanner" role="alert">
            <div className="errorBannerTitle">{title}</div>
            {message ? <div className="errorBannerMessage">{message}</div> : null}
            {onRetry ? (
                <button className="errorBannerRetry" onClick={onRetry}>
                    Повторить
                </button>
            ) : null}
        </div>
    );
};
