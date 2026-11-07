import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

async function proxyRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetPath = path.join("/");
  const search = req.nextUrl.search || "";
  const url = `${BACKEND_URL.replace(/\/$/, "")}/${targetPath}${search}`;

  const headers = new Headers();
  const forwardHeaders = [
    "content-type",
    "x-web-password",
    "x-api-key",
    "x-origem",
    "authorization",
  ];
  for (const name of forwardHeaders) {
    const val = req.headers.get(name);
    if (val) headers.set(name, val);
  }
  headers.set("X-No-Basic-Challenge", "1");

  let body: BodyInit | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });

    const respHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) respHeaders.set("Content-Type", contentType);
    respHeaders.set("Cache-Control", "no-store");

    const data = await upstream.arrayBuffer();
    return new NextResponse(data, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Servidor Python de IA indisponível no momento." },
      { status: 502 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(req, context);
}
