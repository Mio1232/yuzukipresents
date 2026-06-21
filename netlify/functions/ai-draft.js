// netlify/functions/ai-draft.js  — 診断版
// 502の原因を特定するため、Anthropic APIの実際のエラー内容を画面とログに出す。
// 原因が分かったら、detail返却部分は本番用に簡略化してOK。

const ok = (req) =>
  !!process.env.ADMIN_TOKEN && req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN;

const LABELS = {
  usdjpy: "ドル円 USD/JPY",
  xauusd: "ゴールド XAU/USD",
  btcusd: "ビットコイン BTC/USD",
};

export default async (req) => {
  if (!ok(req)) return new Response("unauthorized", { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json({ error: "ANTHROPIC_API_KEY 未設定" }, { status: 500 });

  let body = {};
  try { body = await req.json(); } catch {}
  const label = LABELS[body.instrument] || "ドル円 USD/JPY";

  const prompt = `あなたは日本語のFXアナリストです。${label} について、最新の経済指標・中央銀行スタンス・地政学イベントを踏まえ、初心者向けの「今後の展望レポート」を作成してください。最新情報の確認が必要な点はWeb検索を使ってください（検索は2回まで）。
最後に必ず次のキーのJSONのみを返すこと（前置き・マークダウン記号・コードブロック禁止）:
{"title":"30字以内の見出し","teaser":"解錠前に見せる1文の煽り","conclusion":"結論を2文","drivers":"指標・根拠を3点、改行区切り","scenarios":"想定シナリオを2〜3点、改行区切り","cautions":"注意点・リスク管理を1〜2文"}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 24000);

  let httpStatus = 0;
  let rawText = "";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
      }),
    });
    clearTimeout(t);
    httpStatus = r.status;

    const data = await r.json();

    // Anthropic がエラーを返した場合（モデル名/ツール/権限/クレジット 等）
    if (!r.ok || data.error) {
      const detail = data?.error?.message || JSON.stringify(data).slice(0, 400);
      console.error("[ai-draft] anthropic error", httpStatus, detail);
      return Response.json({ error: "anthropic_error", status: httpStatus, detail }, { status: 502 });
    }

    rawText = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();

    const m = rawText.match(/\{[\s\S]*\}/);
    if (!m) {
      console.error("[ai-draft] no JSON in response:", rawText.slice(0, 300));
      return Response.json({ error: "no_json", detail: rawText.slice(0, 300) }, { status: 502 });
    }
    const parsed = JSON.parse(m[0]);
    return Response.json(parsed);
  } catch (e) {
    clearTimeout(t);
    console.error("[ai-draft] exception", e?.name, e?.message);
    const detail =
      e?.name === "AbortError" ? "timeout(24s)" : `${e?.name || "error"}: ${e?.message || ""}`;
    return Response.json({ error: "exception", detail, raw: rawText.slice(0, 200) }, { status: 502 });
  }
};
