import React, { useState, useEffect, useCallback, useRef } from "react";
import RichText from "./RichText.jsx";

/* =========================================================================
   トレーダーゆずき｜ゴールドXAUUSD革命  — プレゼント配布プラットフォーム（本番）
   ─ データ保存: Netlify Blobs（/.netlify/functions/admin, presents, unlock）
   ─ AI下書き  : Netlify Function 経由で Anthropic API（ANTHROPIC_API_KEY）
   ─ admin     : ADMIN_TOKEN でサーバー側認証。公開サイトに導線は出さない
                 （隠し入口：フッターの印を5回タップ）
   ========================================================================= */

const INSTRUMENTS = {
  usdjpy: { label: "ドル円 USD/JPY", short: "USD/JPY" },
  xauusd: { label: "ゴールド XAU/USD", short: "XAU/USD" },
  btcusd: { label: "ビットコイン BTC/USD", short: "BTC/USD" },
};
const TYPES = {
  outlook: { label: "今後の展望", short: "展望" },
  indicator: { label: "経済指標の予想展望", short: "指標予想" },
};
const INDICATORS = [
  "米雇用統計（NFP）",
  "米CPI（消費者物価指数）",
  "米PCE（個人消費支出物価）",
  "FOMC（米金融政策）",
  "米ISM製造業景況指数",
  "米ISM非製造業景況指数",
  "JOLTS（求人件数）",
  "米小売売上高",
  "米GDP",
  "ミシガン大消費者信頼感",
  "日銀金融政策決定会合",
  "日本CPI",
  "ECB理事会",
];
const FN = "/.netlify/functions";

export default function App() {
  const [view, setView] = useState("public");
  return (
    <div>
      {view === "admin" ? (
        <AdminApp exit={() => setView("public")} />
      ) : (
        <PublicApp openAdmin={() => setView("admin")} />
      )}
    </div>
  );
}

/* =========================================================================
   公開アプリ
   ========================================================================= */
function PublicApp({ openAdmin }) {
  const [presents, setPresents] = useState([]);
  const [full, setFull] = useState(null); // 解錠後の本文つき配列
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const unlocked = !!full;

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${FN}/presents`);
        const d = await r.json();
        setPresents(d.presents || []);
      } catch {
        setErr("読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tryUnlock = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`${FN}/unlock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword: val }),
      });
      if (r.status === 401) {
        setErr("あいことばが違うみたい。DMの文面をもう一度みてね。");
        return;
      }
      const d = await r.json();
      setFull(d.articles || []);
    } catch {
      setErr("通信に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  const byId = (id) => (full || []).find((a) => a.id === id);

  return (
    <div>
      <PublicHeader />
      <main>
        <section style={S.hero}>
          <Sparkles />
          <div style={S.eyebrow}>♡ FX初心者のための無料プレゼント ♡</div>
          <h1 style={S.heroTitle}>
            「値動きを当てる」を手放して
            <br />
            <em style={S.heroEm}>勝てる相場環境</em>を受け取る
          </h1>
          <p style={S.lead}>
            ドル円・ゴールド・ビットコインの今後の展望を、指標から読み解いてまとめました。
            Xで受け取った<strong style={{ color: "var(--rose)" }}>あいことば</strong>で、
            ぜんぶの記事をひらけます。
          </p>
          <div style={S.statRow}>
            <Stat n={presents.length} l="配布中" />
            <Heart />
            <Stat n="280日" l="EA連続利益" />
            <Heart />
            <Stat n="3" l="マーケット" />
          </div>
        </section>

        {!unlocked && (
          <section style={S.gateBar}>
            <Bow size={34} />
            <div style={S.gateBarText}>
              <div style={S.gateBarTitle}>あいことばで全部うけとる</div>
              <div style={S.gateBarSub}>DMで届いたあいことばを入力してね</div>
            </div>
            <div style={S.gateBarForm}>
              <input
                style={S.input}
                value={val}
                onChange={(e) => {
                  setVal(e.target.value);
                  setErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && !busy && tryUnlock()}
                placeholder="あいことば"
                aria-label="あいことば"
              />
              <button style={S.unlockBtn} onClick={tryUnlock} disabled={busy}>
                {busy ? "…" : "ひらく"}
              </button>
            </div>
            {err && <div style={S.errText}>{err}</div>}
          </section>
        )}

        <section style={S.list}>
          <div style={S.listHead}>
            <span style={S.listLabel}>♡ PRESENTS ♡</span>
            <h2 style={S.listTitle}>受け取れる展望レポート</h2>
          </div>
          {loading ? (
            <div style={S.empty}>読み込み中…</div>
          ) : presents.length === 0 ? (
            <div style={S.empty}>いまは公開中のプレゼントがありません。</div>
          ) : (
            <div style={S.grid}>
              {presents.map((p) => (
                <PresentCard key={p.id} a={p} unlocked={unlocked} onOpen={() => setOpen(p)} />
              ))}
            </div>
          )}
        </section>
      </main>

      {open && (
        <ReadModal
          meta={open}
          article={byId(open.id)}
          unlocked={unlocked}
          onUnlockRequest={tryUnlock}
          keywordVal={val}
          setKeywordVal={setVal}
          err={err}
          setErr={setErr}
          busy={busy}
          onClose={() => setOpen(null)}
        />
      )}

      <Footer onSecret={openAdmin} />
    </div>
  );
}

function PublicHeader() {
  return (
    <header style={S.pubHead}>
      <div style={S.brand}>
        <Seal />
        <div>
          <div style={S.brandName}>トレーダーゆずき</div>
          <div style={S.brandSub}>ゴールドXAUUSD革命 ・ @yuzuki_kakumei</div>
        </div>
      </div>
    </header>
  );
}

function Stat({ n, l }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={S.statN}>{n}</div>
      <div style={S.statL}>{l}</div>
    </div>
  );
}

function PresentCard({ a, unlocked, onOpen }) {
  const ins = INSTRUMENTS[a.instrument] || { short: a.instrument };
  return (
    <button className="card" style={S.card} onClick={onOpen}>
      <div style={S.bowCorner}>
        <Bow size={30} />
      </div>
      <div style={S.cardTop}>
        <span style={S.chip}>{ins.short}</span>
        <span style={S.lockTag}>{unlocked ? "♡ ひらける" : "🎀 あいことば"}</span>
      </div>
      <span style={S.typeBadge}>
        {(TYPES[a.type] || TYPES.outlook).label}
        {a.type === "indicator" && a.indicatorName ? `・${a.indicatorName}` : ""}
      </span>
      <h3 style={S.cardTitle}>{a.title}</h3>
      <p style={S.cardTeaser}>{a.teaser}</p>
      <span style={S.cardCta}>{unlocked ? "記事をよむ →" : "うけとる →"}</span>
    </button>
  );
}

function ReadModal({
  meta,
  article,
  unlocked,
  onUnlockRequest,
  keywordVal,
  setKeywordVal,
  err,
  setErr,
  busy,
  onClose,
}) {
  const ins = INSTRUMENTS[meta.instrument] || { short: meta.instrument };
  return (
    <div style={S.overlay} onClick={onClose}>
      <div className="pop" style={S.modal} onClick={(e) => e.stopPropagation()}>
        <button style={S.close} onClick={onClose} aria-label="閉じる">
          ×
        </button>
        <span style={S.chip}>{ins.short}</span>
        <span style={S.typeBadge}>
          {(TYPES[meta.type] || TYPES.outlook).label}
          {meta.type === "indicator" && meta.indicatorName ? `・${meta.indicatorName}` : ""}
        </span>
        <h3 style={S.modalTitle}>{meta.title}</h3>

        {unlocked && article ? (
          <div className="reveal">
            <Block label="結論" body={article.conclusion} accent />
            {article.bodyMd ? (
              <div style={S.block}>
                <RichText md={article.bodyMd} />
              </div>
            ) : (
              <>
                <Block label="指標・根拠からの展望" body={article.drivers} />
                <Block label="シナリオ" body={article.scenarios} />
              </>
            )}
            <Block label="注意点" body={article.cautions} />
            <div style={S.disclaimer}>
              ※本レポートは教育・情報提供を目的としたもので、投資助言ではありません。
              最終的な投資判断はご自身の責任で行ってください。
            </div>
          </div>
        ) : (
          <div>
            <p style={S.modalTeaser}>{meta.teaser}</p>
            <div style={S.gate}>
              <div style={S.gateNote}>Xで受け取ったあいことばを入力してね</div>
              <input
                style={S.input}
                value={keywordVal}
                autoFocus
                onChange={(e) => {
                  setKeywordVal(e.target.value);
                  setErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && !busy && onUnlockRequest()}
                placeholder="あいことば"
              />
              {err && <div style={S.errText}>{err}</div>}
              <button style={S.unlockBtn} onClick={onUnlockRequest} disabled={busy}>
                {busy ? "…" : "ひらく"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Block({ label, body, accent }) {
  if (!body) return null;
  return (
    <div style={S.block}>
      <div style={{ ...S.blockLabel, ...(accent ? S.blockLabelAccent : {}) }}>♡ {label}</div>
      <div style={S.blockBody}>{body}</div>
    </div>
  );
}

/* =========================================================================
   admin アプリ（ADMIN_TOKEN 認証）
   ========================================================================= */
function AdminApp({ exit }) {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [store, setStore] = useState(null);
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null);

  const api = useCallback(
    (path, opts = {}) =>
      fetch(`${FN}/${path}`, {
        ...opts,
        headers: { "content-type": "application/json", "x-admin-token": token, ...(opts.headers || {}) },
      }),
    [token]
  );

  const login = async () => {
    setErr("");
    try {
      const r = await fetch(`${FN}/admin`, { headers: { "x-admin-token": pass } });
      if (r.status === 401) {
        setErr("トークンが違います");
        return;
      }
      const d = await r.json();
      setToken(pass);
      setStore(d);
      setAuthed(true);
    } catch {
      setErr("通信に失敗しました");
    }
  };

  const save = useCallback(
    async (next) => {
      setStore(next);
      await api("admin", { method: "POST", body: JSON.stringify(next) });
    },
    [api]
  );

  if (!authed) {
    return (
      <div style={S.adminGate}>
        <div style={S.adminGateCard}>
          <Seal />
          <h2 style={S.adminGateTitle}>admin ログイン</h2>
          <p style={S.adminGateNote}>ADMIN_TOKEN を入力してください。</p>
          <input
            style={S.input}
            type="password"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              setErr("");
            }}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="ADMIN_TOKEN"
          />
          {err && <div style={S.errText}>{err}</div>}
          <button style={S.unlockBtn} onClick={login}>
            ログイン
          </button>
          <button style={S.linkBtn} onClick={exit}>
            ← 受け取りページに戻る
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <Editor
        api={api}
        initial={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onSave={async (art) => {
          const exists = store.articles.some((x) => x.id === art.id);
          const articles = exists
            ? store.articles.map((x) => (x.id === art.id ? art : x))
            : [art, ...store.articles];
          await save({ ...store, articles });
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div style={S.admin}>
      <div style={S.adminTop}>
        <div style={S.brand}>
          <Seal />
          <div>
            <div style={S.brandName}>admin</div>
            <div style={S.brandSub}>プレゼント記事の管理</div>
          </div>
        </div>
        <button style={S.linkBtn} onClick={exit}>
          受け取りページを見る →
        </button>
      </div>

      <KeywordSetting store={store} save={save} />
      <Funnel keyword={store.settings.globalKeyword} />

      <div style={S.adminHead}>
        <h2 style={S.adminTitle}>記事一覧（{store.articles.length}）</h2>
        <button style={S.primaryBtn} onClick={() => setEditing("new")}>
          ＋ 新規作成
        </button>
      </div>

      <div style={S.rows}>
        {store.articles.map((a) => (
          <div key={a.id} style={S.row}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={S.rowMeta}>
                <span style={S.chipSm}>{(INSTRUMENTS[a.instrument] || {}).short || a.instrument}</span>
                <span style={{ ...S.status, ...(a.status === "published" ? S.statusOn : {}) }}>
                  {a.status === "published" ? "公開中" : "下書き"}
                </span>
              </div>
              <div style={S.rowTitle}>{a.title || "（無題）"}</div>
            </div>
            <div style={S.rowActions}>
              <button style={S.ghostBtn} onClick={() => setEditing(a)}>
                編集
              </button>
              <button
                style={S.ghostBtn}
                onClick={() =>
                  save({
                    ...store,
                    articles: store.articles.map((x) =>
                      x.id === a.id
                        ? { ...x, status: x.status === "published" ? "draft" : "published" }
                        : x
                    ),
                  })
                }
              >
                {a.status === "published" ? "非公開" : "公開"}
              </button>
              <button
                style={{ ...S.ghostBtn, color: "var(--rose)" }}
                onClick={() =>
                  confirm("削除しますか？") &&
                  save({ ...store, articles: store.articles.filter((x) => x.id !== a.id) })
                }
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeywordSetting({ store, save }) {
  const [kw, setKw] = useState(store.settings.globalKeyword || "");
  const [saved, setSaved] = useState(false);
  return (
    <div style={S.kwCard}>
      <div style={S.kwLabel}>🎀 共通あいことば（全記事の解錠キー）</div>
      <div style={S.kwRow}>
        <input
          style={S.input}
          value={kw}
          onChange={(e) => {
            setKw(e.target.value);
            setSaved(false);
          }}
          placeholder="例：yuzuki"
        />
        <button
          style={S.primaryBtn}
          onClick={async () => {
            await save({ ...store, settings: { ...store.settings, globalKeyword: kw } });
            setSaved(true);
          }}
        >
          保存
        </button>
      </div>
      {saved && <div style={S.savedText}>保存しました</div>}
    </div>
  );
}

function Funnel({ keyword }) {
  return (
    <div style={S.funnel}>
      <div style={S.funnelTitle}>配布の流れ</div>
      <div style={S.funnelSteps}>
        {[
          "Xでフォロー＋固定ポストにリプ／RT",
          `DMであいことば「${keyword || "—"}」を自動返信`,
          "サイトであいことばを入力→全記事を解錠",
        ].map((t, i) => (
          <div key={i} style={S.funnelStep}>
            <span style={S.funnelNum}>{i + 1}</span>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

function Editor({ api, initial, onCancel, onSave }) {
  const blank = {
    id: "a" + Date.now(),
    type: "outlook",
    instrument: "xauusd",
    indicatorName: "",
    title: "",
    teaser: "",
    conclusion: "",
    bodyMd: "",
    drivers: "",
    scenarios: "",
    cautions: "",
    status: "draft",
    updatedAt: Date.now(),
  };
  const [f, setF] = useState(initial || blank);
  const [customInd, setCustomInd] = useState(
    !!(initial && initial.indicatorName && !INDICATORS.includes(initial.indicatorName))
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function aiDraft() {
    setAiLoading(true);
    setAiErr("");
    try {
      const r = await api("ai-draft", {
        method: "POST",
        body: JSON.stringify({ instrument: f.instrument, type: f.type, indicatorName: f.indicatorName }),
      });
      const p = await r.json();
      if (p.error) throw new Error(p.error);
      setF((prev) => ({
        ...prev,
        title: p.title || prev.title,
        teaser: p.teaser || prev.teaser,
        conclusion: p.conclusion || prev.conclusion,
        bodyMd: p.bodyMd || prev.bodyMd,
        cautions: p.cautions || prev.cautions,
      }));
    } catch {
      setAiErr("AI下書きの生成に失敗しました。もう一度お試しください。");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div style={S.editor}>
      <div style={S.editorHead}>
        <h2 style={S.adminTitle}>{initial ? "記事を編集" : "新規プレゼント記事"}</h2>
        <button style={S.ghostBtn} onClick={onCancel}>
          ← 一覧へ
        </button>
      </div>

      <div style={S.field}>
        <label style={S.label}>レポート種別</label>
        <div style={S.segWrap}>
          {Object.entries(TYPES).map(([k, v]) => (
            <button
              key={k}
              style={{ ...S.seg, ...(f.type === k ? S.segOn : {}) }}
              onClick={() => setF({ ...f, type: k })}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div style={S.field}>
        <label style={S.label}>マーケット</label>
        <div style={S.segWrap}>
          {Object.entries(INSTRUMENTS).map(([k, v]) => (
            <button
              key={k}
              style={{ ...S.seg, ...(f.instrument === k ? S.segOn : {}) }}
              onClick={() => setF({ ...f, instrument: k })}
            >
              {v.short}
            </button>
          ))}
        </div>
      </div>

      {f.type === "indicator" && (
        <div style={S.field}>
          <label style={S.label}>対象の経済指標</label>
          <select
            style={{ ...S.input, appearance: "auto" }}
            value={customInd ? "__custom__" : f.indicatorName || ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__custom__") {
                setCustomInd(true);
                if (INDICATORS.includes(f.indicatorName)) setF({ ...f, indicatorName: "" });
              } else {
                setCustomInd(false);
                setF({ ...f, indicatorName: v });
              }
            }}
          >
            <option value="">指標を選択…</option>
            {INDICATORS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
            <option value="__custom__">その他（自由入力）</option>
          </select>
          {customInd && (
            <input
              style={{ ...S.input, marginTop: 8 }}
              value={f.indicatorName}
              onChange={(e) => setF({ ...f, indicatorName: e.target.value })}
              placeholder="指標名を入力（例：米貿易収支）"
            />
          )}
        </div>
      )}

      <button style={S.aiBtn} onClick={aiDraft} disabled={aiLoading}>
        {aiLoading
          ? "生成中…"
          : `✦ AIで「${(TYPES[f.type] || TYPES.outlook).label}」を下書き`}
      </button>
      {aiErr && <div style={S.errText}>{aiErr}</div>}

      <Field label="タイトル" v={f.title} onChange={set("title")} />
      <Field label="ティザー（解錠前に見せる1文）" v={f.teaser} onChange={set("teaser")} />
      <Field label="結論" v={f.conclusion} onChange={set("conclusion")} area />
      <div style={S.field}>
        <label style={S.label}>本文（Markdown・表や図が使えます）</label>
        <textarea
          style={{ ...S.input, minHeight: 220, resize: "vertical", fontFamily: "ui-monospace,monospace" }}
          value={f.bodyMd}
          onChange={set("bodyMd")}
          placeholder={"## 見出し\n\n| 項目 | 内容 |\n|---|---|\n| 前回 | ... |\n| 予想 | ... |\n\n図を入れる場合:\n```mermaid\nflowchart LR\n  A[上振れ] --> B[ドル円↑]\n```"}
        />
        <div style={S.hint}>
          GFMの表（| 見出し |、区切り行 |---|）と、```mermaid 図に対応。AI下書きが自動で表を入れます。
        </div>
      </div>
      <Field label="注意点" v={f.cautions} onChange={set("cautions")} area />

      <div style={S.field}>
        <label style={S.label}>公開状態</label>
        <div style={S.segWrap}>
          {[
            ["draft", "下書き"],
            ["published", "公開"],
          ].map(([k, v]) => (
            <button
              key={k}
              style={{ ...S.seg, ...(f.status === k ? S.segOn : {}) }}
              onClick={() => setF({ ...f, status: k })}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={S.editorActions}>
        <button style={S.ghostBtn} onClick={onCancel}>
          キャンセル
        </button>
        <button style={S.primaryBtn} onClick={() => onSave({ ...f, updatedAt: Date.now() })}>
          保存する
        </button>
      </div>
    </div>
  );
}

function Field({ label, v, onChange, area, placeholder }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      {area ? (
        <textarea
          style={{ ...S.input, minHeight: 90, resize: "vertical" }}
          value={v}
          onChange={onChange}
          placeholder={placeholder}
        />
      ) : (
        <input style={S.input} value={v} onChange={onChange} placeholder={placeholder} />
      )}
    </div>
  );
}

function Footer({ onSecret }) {
  const taps = useRef(0);
  const timer = useRef(null);
  const onTap = () => {
    taps.current += 1;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => (taps.current = 0), 1200);
    if (taps.current >= 5) {
      taps.current = 0;
      onSecret();
    }
  };
  return (
    <footer style={S.footer}>
      <span style={S.footSeal} onClick={onTap}>
        Au
      </span>
      <div>
        トレーダーゆずき｜ゴールドXAUUSD革命 ・ 投資は自己責任で。
        <br />
        本サイトの情報は投資助言ではありません。
      </div>
    </footer>
  );
}

function Seal() {
  return <span style={S.seal}>Au</span>;
}
function Heart() {
  return <span style={S.heartSep}>♡</span>;
}
function Bow({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <defs>
        <linearGradient id="bowg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6B8CF" />
          <stop offset="1" stopColor="#E08FB0" />
        </linearGradient>
      </defs>
      <path d="M20 20c-5-8-16-9-16-2 0 6 9 7 16 2Z" fill="url(#bowg)" />
      <path d="M20 20c5-8 16-9 16-2 0 6-9 7-16 2Z" fill="url(#bowg)" />
      <circle cx="20" cy="20" r="3.4" fill="#D9B26A" />
      <path d="M19 22l-5 9 5-3 1-6Z" fill="url(#bowg)" opacity=".9" />
      <path d="M21 22l5 9-5-3-1-6Z" fill="url(#bowg)" opacity=".9" />
    </svg>
  );
}
function Sparkles() {
  return (
    <div style={S.sparkles} aria-hidden>
      {[
        [8, 12, 10],
        [82, 8, 8],
        [20, 70, 7],
        [90, 60, 9],
        [50, 4, 6],
        [70, 80, 7],
      ].map(([l, t, s], i) => (
        <span
          key={i}
          className="sparkle"
          style={{ left: l + "%", top: t + "%", fontSize: s, animationDelay: i * 0.4 + "s" }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}

const soft = "0 10px 30px rgba(20,12,40,.4)";
const S = {
  pubHead: { padding: "16px 20px", borderBottom: "1px solid var(--line)" },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandName: { fontFamily: "var(--serif)", fontSize: 17, letterSpacing: ".02em" },
  brandSub: { fontSize: 11, color: "var(--muted)", marginTop: 2 },
  seal: { width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(145deg,var(--rose),var(--gold))", color: "#3a1b2a", fontFamily: "var(--serif)", fontWeight: 700, fontSize: 15, boxShadow: "0 4px 14px rgba(244,166,192,.4)" },
  hero: { position: "relative", padding: "58px 20px 36px", maxWidth: 880, margin: "0 auto", textAlign: "center" },
  sparkles: { position: "absolute", inset: 0, pointerEvents: "none" },
  eyebrow: { color: "var(--rose)", fontSize: 12, letterSpacing: ".18em", fontWeight: 600 },
  heroTitle: { fontFamily: "var(--serif)", fontSize: "clamp(26px,5vw,42px)", lineHeight: 1.4, margin: "16px 0", fontWeight: 600 },
  heroEm: { fontStyle: "italic", background: "linear-gradient(90deg,var(--rose),var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  lead: { color: "var(--muted)", lineHeight: 2, maxWidth: 560, margin: "0 auto", fontSize: 14.5 },
  statRow: { display: "flex", justifyContent: "center", alignItems: "center", gap: 18, marginTop: 30, flexWrap: "wrap" },
  statN: { fontFamily: "var(--serif)", fontSize: 26, color: "var(--gold)" },
  statL: { fontSize: 11, color: "var(--muted)", marginTop: 4 },
  heartSep: { color: "var(--rose)", opacity: 0.7, fontSize: 13 },
  gateBar: { maxWidth: 720, margin: "8px auto 0", background: "linear-gradient(135deg, rgba(244,166,192,.16), rgba(227,192,122,.12))", border: "1px solid var(--rose-deep)", borderRadius: 22, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", boxShadow: soft },
  gateBarText: { flex: "1 1 180px", minWidth: 0 },
  gateBarTitle: { fontFamily: "var(--serif)", fontSize: 17 },
  gateBarSub: { fontSize: 12, color: "var(--muted)", marginTop: 3 },
  gateBarForm: { display: "flex", gap: 8, flex: "1 1 240px" },
  list: { maxWidth: 1000, margin: "0 auto", padding: "30px 20px 50px" },
  listHead: { marginBottom: 20, textAlign: "center" },
  listLabel: { color: "var(--rose)", fontSize: 11, letterSpacing: ".2em", fontWeight: 600 },
  listTitle: { fontFamily: "var(--serif)", fontSize: 24, margin: "6px 0 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 18 },
  empty: { border: "1px dashed var(--line)", borderRadius: 18, padding: 40, textAlign: "center", color: "var(--muted)" },
  card: { position: "relative", textAlign: "left", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 22, padding: "22px 20px 20px", display: "flex", flexDirection: "column", gap: 10, color: "var(--text)", boxShadow: soft },
  bowCorner: { position: "absolute", top: -12, right: 16 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  chip: { fontSize: 11, fontWeight: 600, color: "var(--gold)", border: "1px solid var(--gold)", borderRadius: 999, padding: "3px 11px" },
  chipSm: { fontSize: 10, fontWeight: 600, color: "var(--gold)", border: "1px solid var(--line)", borderRadius: 999, padding: "2px 8px" },
  lockTag: { fontSize: 11, color: "var(--rose)" },
  typeBadge: { alignSelf: "flex-start", fontSize: 10, fontWeight: 700, color: "var(--rose-deep)", background: "rgba(244,166,192,.15)", border: "1px solid var(--rose-deep)", borderRadius: 999, padding: "2px 9px" },
  hint: { fontSize: 11, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 },
  cardTitle: { fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.5, margin: 0 },
  cardTeaser: { fontSize: 13, color: "var(--muted)", lineHeight: 1.7, flex: 1 },
  cardCta: { fontSize: 13, color: "var(--rose)", fontWeight: 700 },
  overlay: { position: "fixed", inset: 0, background: "rgba(12,8,26,.72)", backdropFilter: "blur(5px)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 },
  modal: { position: "relative", background: "var(--bg2)", border: "1px solid var(--rose-deep)", borderRadius: 24, padding: 28, width: "100%", maxWidth: 560, maxHeight: "86vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(224,123,160,.3)" },
  close: { position: "absolute", top: 14, right: 16, background: "transparent", color: "var(--muted)", fontSize: 24, lineHeight: 1 },
  modalTitle: { fontFamily: "var(--serif)", fontSize: 21, margin: "12px 0 14px", lineHeight: 1.5 },
  modalTeaser: { color: "var(--muted)", lineHeight: 1.85, fontSize: 14 },
  gate: { marginTop: 20, background: "var(--surface)", borderRadius: 18, padding: 18, border: "1px solid var(--line)" },
  gateNote: { fontSize: 13, color: "var(--muted)", marginBottom: 10 },
  errText: { color: "var(--rose)", fontSize: 12, marginTop: 8, width: "100%" },
  block: { marginTop: 18 },
  blockLabel: { fontSize: 12, letterSpacing: ".1em", color: "var(--muted)", fontWeight: 700, marginBottom: 6 },
  blockLabelAccent: { color: "var(--rose)" },
  blockBody: { whiteSpace: "pre-wrap", lineHeight: 1.9, fontSize: 14 },
  disclaimer: { marginTop: 24, paddingTop: 14, borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 },
  input: { width: "100%", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "11px 14px", color: "var(--text)", fontSize: 14 },
  unlockBtn: { background: "linear-gradient(135deg,var(--rose),var(--rose-deep))", color: "#fff", fontWeight: 700, padding: "11px 20px", borderRadius: 12, fontSize: 15, boxShadow: "0 6px 16px rgba(224,123,160,.4)", whiteSpace: "nowrap" },
  adminGate: { display: "grid", placeItems: "center", padding: "60px 20px" },
  adminGateCard: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 22, padding: 28, width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 12, boxShadow: soft },
  adminGateTitle: { fontFamily: "var(--serif)", fontSize: 20, margin: 0 },
  adminGateNote: { color: "var(--muted)", fontSize: 13, margin: 0 },
  linkBtn: { background: "transparent", color: "var(--muted)", fontSize: 13, padding: 4 },
  admin: { maxWidth: 920, margin: "0 auto", padding: "24px 20px 60px" },
  adminTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 12, flexWrap: "wrap" },
  kwCard: { background: "linear-gradient(135deg, rgba(244,166,192,.12), rgba(227,192,122,.08))", border: "1px solid var(--rose-deep)", borderRadius: 18, padding: 18, marginBottom: 16 },
  kwLabel: { fontSize: 13, color: "var(--rose)", fontWeight: 700, marginBottom: 10 },
  kwRow: { display: "flex", gap: 8 },
  savedText: { color: "var(--gold)", fontSize: 12, marginTop: 8 },
  funnel: { background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 18, padding: 18, marginBottom: 22 },
  funnelTitle: { fontSize: 12, letterSpacing: ".12em", color: "var(--rose)", fontWeight: 700, marginBottom: 12 },
  funnelSteps: { display: "flex", gap: 12, flexWrap: "wrap" },
  funnelStep: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)", flex: "1 1 220px" },
  funnelNum: { width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,var(--rose),var(--gold))", color: "#3a1b2a", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  adminHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" },
  adminTitle: { fontFamily: "var(--serif)", fontSize: 22, margin: 0 },
  primaryBtn: { background: "linear-gradient(135deg,var(--rose),var(--rose-deep))", color: "#fff", fontWeight: 700, padding: "10px 18px", borderRadius: 12, fontSize: 14, whiteSpace: "nowrap" },
  ghostBtn: { background: "transparent", color: "var(--text)", border: "1px solid var(--line)", padding: "8px 14px", borderRadius: 10, fontSize: 13 },
  rows: { display: "flex", flexDirection: "column", gap: 10 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px", flexWrap: "wrap" },
  rowMeta: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  status: { fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#3a3160", color: "var(--muted)" },
  statusOn: { background: "rgba(244,166,192,.2)", color: "var(--rose)" },
  rowTitle: { fontFamily: "var(--serif)", fontSize: 15 },
  rowActions: { display: "flex", gap: 8 },
  editor: { maxWidth: 720, margin: "0 auto", padding: "26px 20px 60px" },
  editorHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 7, fontWeight: 600 },
  segWrap: { display: "flex", gap: 6 },
  seg: { flex: 1, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--muted)", padding: "9px", borderRadius: 10, fontSize: 13 },
  segOn: { background: "linear-gradient(135deg,var(--rose),var(--gold))", color: "#3a1b2a", fontWeight: 700, borderColor: "transparent" },
  aiBtn: { width: "100%", background: "var(--bg2)", border: "1px solid var(--rose)", color: "var(--rose)", padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: 14, marginBottom: 18 },
  editorActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 },
  footer: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center", padding: "26px 20px", borderTop: "1px solid var(--line)", color: "var(--muted)", fontSize: 11, lineHeight: 1.8 },
  footSeal: { width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--bg2)", color: "var(--muted)", fontFamily: "var(--serif)", fontSize: 12, userSelect: "none", flexShrink: 0, cursor: "default" },
};
