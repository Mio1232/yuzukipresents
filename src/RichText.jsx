import React, { useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ gfm: true, breaks: true });

// Markdown（表対応）を描画し、```mermaid ブロックは図としてレンダリングする。
export default function RichText({ md }) {
  const ref = useRef(null);
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(md || "")), [md]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const blocks = el.querySelectorAll("code.language-mermaid");
    if (!blocks.length) return;
    let cancelled = false;
    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
        let i = 0;
        for (const code of blocks) {
          const src = code.textContent || "";
          try {
            const { svg } = await mermaid.render("mmd-" + Date.now() + "-" + i++, src);
            if (cancelled) return;
            const wrap = document.createElement("div");
            wrap.className = "mermaid-fig";
            wrap.innerHTML = svg;
            (code.closest("pre") || code).replaceWith(wrap);
          } catch {
            /* 図の描画に失敗したらコードのまま残す */
          }
        }
      } catch {
        /* mermaid 読み込み失敗時もコードのまま残す */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [html]);

  return <div className="rich" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
