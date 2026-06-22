import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore("yuzuki");
  const raw = await store.get("data");
  const data = raw ? JSON.parse(raw) : { settings: { globalKeyword: "" }, articles: [] };
  const presents = data.articles
    .filter((a) => a.status === "published")
    .map(({ id, instrument, title, teaser, type, indicatorName }) => ({
      id, instrument, title, teaser, type: type || "outlook", indicatorName: indicatorName || "",
    }));
  return Response.json({ presents });
};
