// netlify/functions/ai-draft.js
// 有料プラン向け：同期タイムアウト26秒前提（netlify.toml で [functions."ai-draft"] timeout = 26）。
// Web検索を最大2回に絞り、Sonnetで生成。24秒で打ち切ってエラーを返す。

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

  // 26秒制限の手前（24秒）で打ち切る
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 24000);

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

    const data = await r.json();
    if (data.error) return Response.json({ error: "API応答エラー" }, { status: 502 });

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : text);
    return Response.json(parsed);
  } catch (e) {
    clearTimeout(t);
    const msg = e.name === "AbortError" ? "生成が時間内に終わりませんでした" : "生成に失敗しました";
    return Response.json({ error: msg }, { status: 502 });
  }
};
