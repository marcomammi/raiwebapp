import { createFileRoute } from "@tanstack/react-router";

const BACKEND_BASE_URL = "https://rai.marcomammi.com/api";

const PROXY_RESPONSE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
} as const;

export const Route = createFileRoute("/api-proxy/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: PROXY_RESPONSE_HEADERS }),
      GET: ({ request, params }) => proxyToBackend(request, params._splat),
      POST: ({ request, params }) => proxyToBackend(request, params._splat),
      PATCH: ({ request, params }) => proxyToBackend(request, params._splat),
      DELETE: ({ request, params }) => proxyToBackend(request, params._splat),
    },
  },
});

async function proxyToBackend(request: Request, splat: string | undefined): Promise<Response> {
  const targetUrl = buildBackendUrl(request.url, splat);
  const headers = buildForwardHeaders(request.headers);
  const method = request.method.toUpperCase();

  try {
    const backendResponse = await fetch(targetUrl, {
      method,
      headers,
      body: method === "GET" ? undefined : await request.arrayBuffer(),
      redirect: "follow",
    });

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: buildResponseHeaders(backendResponse.headers),
    });
  } catch {
    return Response.json(
      { ok: false, message: "Servizio backend non raggiungibile" },
      { status: 502, headers: PROXY_RESPONSE_HEADERS },
    );
  }
}

function buildBackendUrl(requestUrl: string, splat: string | undefined): string {
  const sourceUrl = new URL(requestUrl);
  const cleanPath = (splat ?? "").replace(/^\/+/, "");
  const target = new URL(`${BACKEND_BASE_URL}/${cleanPath}`);
  target.search = sourceUrl.search;
  return target.toString();
}

function buildForwardHeaders(sourceHeaders: Headers): Headers {
  const headers = new Headers();
  copyHeader(sourceHeaders, headers, "authorization");
  copyHeader(sourceHeaders, headers, "content-type");
  copyHeader(sourceHeaders, headers, "accept");
  return headers;
}

function buildResponseHeaders(sourceHeaders: Headers): Headers {
  const headers = new Headers(PROXY_RESPONSE_HEADERS);
  copyHeader(sourceHeaders, headers, "content-type");
  copyHeader(sourceHeaders, headers, "content-disposition");
  copyHeader(sourceHeaders, headers, "cache-control");
  return headers;
}

function copyHeader(source: Headers, target: Headers, name: string) {
  const value = source.get(name);
  if (value) target.set(name, value);
}