export const AuthInputField = ({type = "text", placeholder, autoComplete, registration,
    error, className, disabled = false}) => {
    return (
        <>
            <input
                className={className}
                type={type}
                autoComplete={autoComplete}
                placeholder={placeholder}
                disabled={disabled}
                {...registration}
            />
            <p className={error ? "instructions instructionsError" : ""}>
                {error?.message}
            </p>
        </>
    )
}