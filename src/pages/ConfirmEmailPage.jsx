import {Link, useSearchParams} from "react-router-dom"
import { getApiErrorMessage } from "../utils/getApiErrorMessage.js"
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx"
import {useActivateAccountMutation} from "../store/auth/authApiSlice.js";
import {AuthCard} from "../components/auth/AuthCard.jsx";
import {AuthSubmitButton} from "../components/auth/AuthSubmitButton.jsx";

export const ConfirmEmailPage = () => {
    const [searchParams] = useSearchParams()
    const accountId = searchParams.get("accountId") || ""
    const activationToken = searchParams.get("activationToken") || ""

    const [activateAccount, {isLoading, isSuccess, isError, error}] = useActivateAccountMutation()

    const canActivate = Boolean(accountId && activationToken)

    const onActivate = async () => {
        if (!canActivate) {
            return
        }
        await activateAccount({accountId, activationToken}).unwrap()
    }

    return (
        <AuthCard title="Подтверждение почты">
            {isSuccess ? (
                <>
                    <p className="instructions instructionsSuccess">
                        Аккаунт успешно активирован. Теперь можно войти.
                    </p>
                    <p>
                        <Link to="/login" className="line">
                            К входу
                        </Link>
                    </p>
                </>
            ) : canActivate ? (
                <>
                    <p>Для завершения регистрации нажмите кнопку активации.</p>
                    {isError ? (
                        <ErrorBanner
                            title="Не удалось активировать аккаунт"
                            message={getApiErrorMessage(error)}
                        />
                    ) : null}
                    <AuthSubmitButton
                        type="button"
                        onClick={onActivate}
                        disabled={isLoading}
                        isLoading={isLoading}
                        loadingLabel="Активируем..."
                    >
                        Активировать аккаунт
                    </AuthSubmitButton>
                </>
            ) : (
                <>
                    <p>
                        Мы отправили письмо со ссылкой для активации аккаунта.
                        Перейдите по ссылке из письма.
                    </p>
                    <p>
                        <Link to="/login" className="line">
                            К входу
                        </Link>
                    </p>
                </>
            )}
        </AuthCard>
    )
}