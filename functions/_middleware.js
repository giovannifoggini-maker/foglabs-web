const BACKEND_PATHS = ["/api/", "/auth/", "/audio/"];

function shouldProxy(pathname) {
  return BACKEND_PATHS.some((prefix) => pathname.startsWith(prefix))
    || pathname === "/api"
    || pathname === "/health";
}

function jsonError(status, error, message) {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const incomingUrl = new URL(request.url);

  // Serve ordinary pages, styles, scripts, images, and downloads from Pages.
  if (!shouldProxy(incomingUrl.pathname)) {
    return context.next();
  }

  const configuredBackend = String(env.BACKEND_URL || "").trim();
  if (!configuredBackend) {
    return jsonError(
      503,
      "backend_unavailable",
      "BACKEND_URL is not configured for this Cloudflare Pages environment."
    );
  }

  let backendBase;
  try {
    backendBase = new URL(configuredBackend);
  } catch {
    return jsonError(500, "backend_configuration_invalid", "BACKEND_URL must be a valid absolute URL.");
  }

  const localDevelopmentHost = ["localhost", "127.0.0.1", "::1"].includes(backendBase.hostname);
  if (backendBase.protocol !== "https:" && !localDevelopmentHost) {
    return jsonError(500, "backend_configuration_invalid", "Use an HTTPS URL for the production backend.");
  }

  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, backendBase);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.slice(0, -1));

  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  let upstreamResponse;
  try {
    const init = {
      method: request.method,
      headers,
      redirect: "manual"
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      // Node-based local tooling requires duplex for streamed request bodies.
      // Cloudflare Workers ignores this Node extension while preserving streaming.
      init.duplex = "half";
    }
    upstreamResponse = await fetch(new Request(targetUrl.toString(), init));
  } catch {
    return jsonError(502, "backend_unavailable", "The configured backend could not be reached.");
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  if (incomingUrl.pathname.startsWith("/api/") || incomingUrl.pathname.startsWith("/auth/")) {
    responseHeaders.set("Cache-Control", "no-store");
  }
  responseHeaders.set("X-Content-Type-Options", "nosniff");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders
  });
}
