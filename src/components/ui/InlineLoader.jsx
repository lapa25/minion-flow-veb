import '../../styles/LoadersErrors.css'

export const InlineLoader = ({ label = "Загрузка..." }) => {
    return (
        <span className="inlineLoader">
          <span className="spinner spinnerSm" aria-hidden="true" />
          <span>{label}</span>
        </span>
    );
};
