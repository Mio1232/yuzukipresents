import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore("yuzuki");
  const raw = await store.get("data");
  const data = raw ? JSON.parse(raw) : { settings: { globalKeyword: "" }, articles: [] };
  const presents = data.articles
    .filter((a) => a.status === "published")
    .map(({ id, instrument, title, teaser }) => ({ id, instrument, title, teaser }));
  return Response.json({ presents });
};
