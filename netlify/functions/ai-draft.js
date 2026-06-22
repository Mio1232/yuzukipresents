// netlify/functions/ai-draft.js
// レポート種別（outlook=今後の展望 / indicator=経済指標の予想展望）で分岐。
// 本文 bodyMd は Markdown（GFMの表）で返し、必要に応じて ```mermaid 図も含める。
// Web検索なし・Haikuで高速生成（10秒制限内）。最新の確定値はadmin側で確認・追記する運用。

const ok = (req) =>
  !!process.env.ADMIN_TOKEN && req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN;

const LABELS = {
  usdjpy: "ドル円 USD/JPY",
  xauusd: "ゴールド XAU/USD",
  btcusd: "ビットコイン BTC/USD",
};

function buildPrompt(label, type, indicatorName) {
  const common = `出力は必ず次のキーのJSONのみ（前置き・コードブロック記号なし）:
{"title":"30字以内の見出し","teaser":"解錠前に見せる1文の煽り","conclusion":"結論を2文","bodyMd":"本文(Markdown)","cautions":"注意点・リスク管理を1〜2文"}
bodyMd の中では Markdown を使い、必ず1つ以上の「表」を含めること。GFMの表記法（| 見出し | ... | と区切り行 |---|）を使う。確定していない数値・日付は「（要確認）」と書く。`;

  if (type === "indicator") {
    const target = indicatorName
      ? `対象の経済指標は「${indicatorName}」とする。`
      : `${label} に影響する重要な経済指標を1つ選ぶ。`;
    return `あなたは日本語のFXアナリストです。${target} この指標の発表前「予想展望レポート」のたたき台を、${label} への影響を中心に作成してください。
bodyMd には次を含めること:
1) 「## 指標サマリー」: 指標名／発表予定／前回／市場予想／重要度 を表で（数値は「（要確認）」可）
2) 「## 結果別シナリオ」: 上振れ／予想通り／下振れ の3行で、${label}の想定反応と対応を表で
3) 任意で結果分岐の図を mermaid（flowchart）で1つ
${common}`;
  }
  return `あなたは日本語のFXアナリストです。${label} の「今後の展望レポート」のたたき台を作成してください。
bodyMd には次を含めること:
1) 「## 注目ポイント」: 金利・インフレ・中銀・地政学・需給などの観点を箇条書き
2) 「## チェックすべき指標」: 指標名／着眼点／方向への影響 を表で
3) 「## シナリオ」: メイン／サブ の想定を表で（条件→方向→対応）
${common}`;
}

export default async (req) => {
  if (!ok(req)) return new Response("unauthorized", { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json({ error: "ANTHROPIC_API_KEY 未設定" }, { status: 500 });

  let body = {};
  try { body = await req.json(); } catch {}
  const label = LABELS[body.instrument] || "ドル円 USD/JPY";
  const type = body.type === "indicator" ? "indicator" : "outlook";
  const indicatorName = typeof body.indicatorName === "string" ? body.indicatorName.trim() : "";

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
        max_tokens: 1600,
        messages: [{ role: "user", content: buildPrompt(label, type, indicatorName) }],
      }),
    });
    const data = await r.json();
    if (!r.ok || data.error) {
      const detail = data?.error?.message || JSON.stringify(data).slice(0, 400);
      console.error("[ai-draft] anthropic error", r.status, detail);
      return Response.json({ error: "anthropic_error", status: r.status, detail }, { status: 502 });
    }
    rawText = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();
    const m = rawText.match(/\{[\s\S]*\}/);
    if (!m) return Response.json({ error: "no_json", detail: rawText.slice(0, 300) }, { status: 502 });
    return Response.json(JSON.parse(m[0]));
  } catch (e) {
    console.error("[ai-draft] exception", e?.name, e?.message);
    return Response.json({ error: "exception", detail: `${e?.name}: ${e?.message}` }, { status: 502 });
  }
};
