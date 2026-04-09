import {InlineLoader} from "../ui/InlineLoader.jsx"

export const AuthSubmitButton = ({type = "submit", disabled, isLoading, loadingLabel, children, onClick, label}) => {
    return (
        <button type={type} disabled={disabled} onClick={onClick}>
            {label ? label : isLoading ? <InlineLoader label={loadingLabel} /> : children}
        </button>
    )
}