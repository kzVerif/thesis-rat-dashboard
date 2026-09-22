/** Validate without echoing URLs, which can contain secrets. */
function endpoint(value, name) {
  let url;
  // try { url = new URL(value); } catch { throw new Error(name + " must be an absolute URL"); }
  if (url.username || url.password || url.search || url.hash || !url.hostname) {
    throw new Error(name + " must not contain credentials, query or fragment");
  }
  return url;
}

/** API_URL is server-side. Plain HTTP is permitted only for a same-host origin. */
export function validateAPIURL(value, production) {
  const url = endpoint(value, "API_URL");
  const loopback = url.hostname === "localhost" || url.hostname === "[::1]" ||
    /^127\.(\d{1,3}\.){2}\d{1,3}$/.test(url.hostname);
  if (url.protocol !== "https:" && (url.protocol !== "http:" || (production && !loopback))) {
    throw new Error("production API_URL must use HTTPS or HTTP on a trusted same-host loopback origin");
  }
  return value.replace(/\/+$/, "");
}

/** NEXT_PUBLIC values are frozen by next build: fail before publishing a bundle. */
export function validateProductionConfig(env) {
  validateAPIURL(env.API_URL, true);
  const publicOrigin = endpoint(env.PUBLIC_DASHBOARD_ORIGIN, "PUBLIC_DASHBOARD_ORIGIN");
  if (publicOrigin.protocol !== "https:" || publicOrigin.pathname !== "/") {
    throw new Error("PUBLIC_DASHBOARD_ORIGIN must be an HTTPS origin without a path");
  }
  const socket = endpoint(env.NEXT_PUBLIC_FRONTEND_WS_URL, "NEXT_PUBLIC_FRONTEND_WS_URL");
  if (socket.protocol !== "wss:") {
    throw new Error("production NEXT_PUBLIC_FRONTEND_WS_URL must use WSS");
  }
  if (socket.hostname !== publicOrigin.hostname) {
    throw new Error("frontend WebSocket must share the Dashboard hostname for the __Host-session cookie");
  }
}

export function isProductionAuthOrigin(origin, configuredOrigin) {
  try {
    const expected = endpoint(configuredOrigin, "PUBLIC_DASHBOARD_ORIGIN");
    return expected.protocol === "https:" && expected.pathname === "/" && origin === expected.origin;
  } catch { return false; }
}
