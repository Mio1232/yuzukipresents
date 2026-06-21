// netlify/functions/ai-draft.js  — Web検索なし・診断つき
// まずこれで通るか確認。通れば原因はWeb検索。通らなければ Response 本文 / Netlifyログに detail が出る。

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

  const prompt = `あなたは日本語のFXアナリストです。${label} について、一般的な経済指標（金利・インフレ・中央銀行スタンス・地政学・需給）の観点から、初心者向けの「今後の展望レポート」のたたき台を作成してください。具体的な数値や日付は断定しないこと。
必ず次のキーのJSONのみを返すこと（前置き・マークダウン記号・コードブロック禁止）:
{"title":"30字以内の見出し","teaser":"解錠前に見せる1文の煽り","conclusion":"結論を2文","drivers":"確認すべき指標・根拠を3点、改行区切り","scenarios":"想定シナリオを2〜3点、改行区切り","cautions":"注意点・リスク管理を1〜2文"}`;

  let httpStatus = 0;
  let rawText = "";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    httpStatus = r.status;
    const data = await r.json();

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
      console.error("[ai-draft] no JSON:", rawText.slice(0, 300));
      return Response.json({ error: "no_json", detail: rawText.slice(0, 300) }, { status: 502 });
    }
    return Response.json(JSON.parse(m[0]));
  } catch (e) {
    console.error("[ai-draft] exception", e?.name, e?.message);
    return Response.json(
      { error: "exception", detail: `${e?.name || "error"}: ${e?.message || ""}`, raw: rawText.slice(0, 200) },
      { status: 502 }
    );
  }
};
