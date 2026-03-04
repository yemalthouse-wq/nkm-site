# nkm-site

.nkm Web Magazine — Cloudflare Pages 本体

## 運用ルール

- `main` へのpushで自動Deploy（Cloudflare Pages）
- 現行号のみ公開（毎号 `index.html` を上書き）
- 過去号は `/archive` → Passport誘導

## URL構造

| URL | 内容 |
|---|---|
| `/` | 現行号トップ |
| `/ye` | Ye Malthouse |
| `/bar` | Bar（準備中） |
| `/passport` | Passport |
| `/hidden` | QR限定ページ |
| `/go?ch=*` | QRリダイレクター |
| `/street` | Street記事 |
| `/archive` | 過去号（Passport必要） |

## 関連リポジトリ

- `Avengers-log` — /collect ログ追記先
- `nkm-protocol` — 仕様書・Decision
- `the-garage` — 運用・土台

## decision参照

- decision_007: QR URL確定
- decision_008: ルーティング
- decision_009: GitHub構成
