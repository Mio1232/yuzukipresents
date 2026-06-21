import { getStore } from "@netlify/blobs";

const ok = (req) =>
  !!process.env.ADMIN_TOKEN && req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN;

const DEFAULT = { settings: { globalKeyword: "yuzuki" }, articles: [] };

export default async (req) => {
  if (!ok(req)) return new Response("unauthorized", { status: 401 });
  const store = getStore("yuzuki");

  if (req.method === "GET") {
    const raw = await store.get("data");
    return Response.json(raw ? JSON.parse(raw) : DEFAULT);
  }
  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return new Response("bad request", { status: 400 }); }
    if (!body || !Array.isArray(body.articles)) return new Response("bad request", { status: 400 });
    await store.set("data", JSON.stringify(body));
    return Response.json({ ok: true });
  }
  return new Response("method not allowed", { status: 405 });
};
