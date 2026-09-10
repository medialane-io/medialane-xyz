import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/src/lib/portal-session";

const apiUrl = process.env.MEDIALANE_API_URL;

async function backendFetch(subpath: string, apiKey: string, init?: RequestInit) {
  return rawFetch(`/v1/portal/${subpath}`, apiKey, init);
}

async function rawFetch(path: string, apiKey: string, init?: RequestInit) {
  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function handler(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!apiUrl) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 500 });
  }

  const { path } = await context.params;
  if (path.some((seg) => seg === ".." || seg === "." || seg.includes("/"))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const [resource, id] = path;
  const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined;

  if (resource === "credits" && !id && req.method === "GET") {
    const [me, history] = await Promise.all([
      backendFetch("me", session.apiKey),
      backendFetch("credits/history", session.apiKey),
    ]);
    if (me.status >= 400) return NextResponse.json(me.json ?? {}, { status: me.status });
    const balance = (me.json as { data?: { creditBalance?: number } })?.data?.creditBalance ?? 0;
    const historyRows = history.status < 400 ? (history.json as { data?: unknown[] })?.data ?? [] : [];
    return NextResponse.json({ data: { balance, history: historyRows } });
  }

  if (resource === "usage" && !id && req.method === "GET") {
    const keys = await backendFetch("keys", session.apiKey);
    if (keys.status >= 400) return NextResponse.json(keys.json ?? {}, { status: keys.status });
    return NextResponse.json({ data: { keys: (keys.json as { data?: unknown[] })?.data ?? [] } });
  }

  if (resource === "paymaster") {
    const rest = path.slice(1).join("/");
    if (rest !== "deploy/build") {
      return NextResponse.json({ error: "Not allowed through this proxy" }, { status: 403 });
    }
    const upstream = await rawFetch(`/v1/paymaster/${rest}`, session.apiKey, {
      method: req.method,
      body,
    });
    return NextResponse.json(upstream.json ?? {}, { status: upstream.status });
  }

  if (resource === "collections" && req.method === "GET") {
    const qs = new URLSearchParams({ chain: "STARKNET", owner: session.address, limit: "100" });
    const service = req.nextUrl.searchParams.get("service");
    if (service) qs.set("service", service);
    const upstream = await rawFetch(`/v1/collections?${qs.toString()}`, session.apiKey);
    return NextResponse.json(upstream.json ?? {}, { status: upstream.status });
  }

  if (resource === "intents") {
    const rest = path.slice(1).join("/");
    if (rest !== "build") {
      return NextResponse.json({ error: "Not allowed through this proxy" }, { status: 403 });
    }
    const upstream = await rawFetch("/v1/intents/build", session.apiKey, {
      method: req.method,
      body,
    });
    return NextResponse.json(upstream.json ?? {}, { status: upstream.status });
  }

  if (resource === "issuance") {
    const rest = path.slice(1).join("/");
    if (rest !== "mint-calls") {
      return NextResponse.json({ error: "Not allowed through this proxy" }, { status: 403 });
    }
    const upstream = await rawFetch("/v1/business/issuance/mint-calls", session.apiKey, {
      method: req.method,
      body,
    });
    return NextResponse.json(upstream.json ?? {}, { status: upstream.status });
  }

  if (resource === "metadata") {
    const rest = path.slice(1).join("/");
    if (rest !== "upload") {
      return NextResponse.json({ error: "Not allowed through this proxy" }, { status: 403 });
    }
    const upstream = await rawFetch("/v1/metadata/upload", session.apiKey, {
      method: req.method,
      body,
    });
    return NextResponse.json(upstream.json ?? {}, { status: upstream.status });
  }

  if (resource === "provisioning") {
    const rest = path.slice(1).join("/");
    const upstream = await rawFetch(
      `/v1/business/provisioning${rest ? `/${rest}` : ""}`,
      session.apiKey,
      { method: req.method, body },
    );
    return NextResponse.json(upstream.json ?? {}, { status: upstream.status });
  }

  const subpath = path.join("/");
  const upstream = await backendFetch(subpath, session.apiKey, { method: req.method, body });
  return NextResponse.json(upstream.json ?? {}, { status: upstream.status });
}

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
export const PATCH = handler;
