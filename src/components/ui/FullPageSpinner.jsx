import '../../styles/LoadersErrors.css'

export const FullPageSpinner = ({ label = "Загрузка..." }) => {
    return (
        <div className="fullPageSpinner">
            <div className="spinner" aria-hidden="true" />
            <div className="spinnerLabel">{label}</div>
        </div>
    );
};
