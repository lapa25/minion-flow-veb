const getDefaultWsUrl = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${window.location.host}`
}

const WS_URL = String(import.meta.env.VITE_WS_URL || getDefaultWsUrl()).replace(/\/+$/, "")

export const buildArtifactWsUrl = () => `${WS_URL}/artifact-service/ws/v1`

export const createArtifactWebSocket = (jwt) => {
    const tokenCarrier = encodeURIComponent(
        `quarkus-http-upgrade#Authorization#Bearer ${jwt}`
    )
    return new WebSocket(buildArtifactWsUrl(), [
        "bearer-token-carrier",
        tokenCarrier,
    ])
}