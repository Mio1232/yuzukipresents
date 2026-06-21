# トレーダーゆずき｜プレゼント配布プラットフォーム

Xのプレゼント企画用サイト。公開ページ（受け取り側）と admin（記事作成側）を同梱。
ドル円・ゴールド・ビットコインの展望レポートを、共通あいことばで解錠して配布します。

## 構成
- フロント: React + Vite（`/`）
- 保存: Netlify Blobs（記事・共通あいことば）
- AI下書き: Netlify Function → Anthropic API（Web検索つき）
- admin: `ADMIN_TOKEN` でサーバー側認証。公開サイトに導線は出さない
  （隠し入口：フッターの「Au」を5回タップ → トークン入力）

## エンドポイント（Netlify Functions）
- `GET  /.netlify/functions/presents` 公開中記事のメタ（本文・あいことばは返さない）
- `POST /.netlify/functions/unlock`   あいことば照合 → 一致時のみ本文を返す
- `GET/POST /.netlify/functions/admin` ストア取得・保存（要 x-admin-token）
- `POST /.netlify/functions/ai-draft` 展望の下書き生成（要 x-admin-token）

## デプロイ手順（GitHub → Netlify）
1. このフォルダを Git リポジトリにして GitHub へ push
   ```bash
   git init && git add -A && git commit -m "init"
   git branch -M main
   git remote add origin <あなたのリポジトリURL>
   git push -u origin main
   ```
2. Netlify → Add new site → Import from Git で対象リポジトリを選択
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`（netlify.toml で設定済み）
3. Netlify の Site settings → Environment variables に追加
   - `ANTHROPIC_API_KEY`（Anthropic のAPIキー）
   - `ADMIN_TOKEN`（admin ログイン用の長いランダム文字列）
4. Deploy。Blobs は Netlify 上で自動有効（追加設定不要）

## 使い方
- 公開: トップで共通あいことばを入力 → 全記事が解錠
- admin: フッターの「Au」を5回タップ → `ADMIN_TOKEN` を入力 → 記事作成・公開、あいことば変更、AI下書き

## ローカル開発
```bash
npm install
npm install -g netlify-cli   # Functions/Blobs をローカルで動かす場合
netlify dev                  # フロント＋Functions を同時起動
```
`netlify dev` を使わず `npm run dev` だけだと Functions は動きません（フロントのみ）。

## admin を完全に別サイトへ分けたい場合
本リポジトリは1サイトに同梱（公開側に導線なし＋トークン認証）の構成です。
物理的に分離したい場合は、admin 用の最小フロントを別リポジトリ/別 Netlify サイトにし、
同じ `admin` / `ai-draft` Function を呼ぶ形に切り出してください。

## 注意
- 本サイトの情報は教育・情報提供が目的で、投資助言ではありません。
- `ADMIN_TOKEN` は十分に長いランダム文字列にしてください。
