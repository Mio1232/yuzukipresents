import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  let body = {};
  try { body = await req.json(); } catch {}
  const store = getStore("yuzuki");
  const raw = await store.get("data");
  const data = raw ? JSON.parse(raw) : { settings: { globalKeyword: "" }, articles: [] };
  const kw = (data.settings.globalKeyword || "").trim().toLowerCase();
  const input = (body.keyword || "").trim().toLowerCase();
  if (!kw || input !== kw) return new Response("unauthorized", { status: 401 });
  const articles = data.articles.filter((a) => a.status === "published");
  return Response.json({ articles });
};
