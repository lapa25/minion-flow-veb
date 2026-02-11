import { useSelector } from "react-redux";
import {selectCurrentPermissions, selectCurrentRoles} from "../store/auth/authSelectors.js";

const hasAny = (need = [], stack = []) =>
    need.some((v) => stack.includes(v))
const hasAll = (need = [], stack = []) =>
    need.every((v) => stack.includes(v))

export const Can = ({roles = [], permissions = [], any = true, children, fallback = null}) => {
    const currentRoles = useSelector(selectCurrentRoles)
    const currentPermissions = useSelector(selectCurrentPermissions)

    const roleOk = roles.length ? any ? hasAny(roles, currentRoles)
        : hasAll(roles, currentRoles) : true
    const permOk = permissions.length ? any ? hasAny(permissions, currentPermissions)
            : hasAll(permissions, currentPermissions) : true
    return roleOk && permOk ? children : fallback
};
