/**
 * _worker.js — Cloudflare Pages Functions
 * POST /collect
 * 
 * 地雷対策済み v2:
 * - 1イベント = 1ファイル（競合なし）
 * - Origin制限（nkm.press のみ）
 * - payloadサイズ制限（1KB以下）
 * - Fine-grained PAT 前提
 * 
 * decision_008準拠
 */

const ALLOWED_ORIGINS = [
  "https://nkm.press",
  "https://www.nkm.press",
  "https://nkm-7ve.pages.dev",  // 開発中のみ
];

const ALLOWED_EVENTS = new Set([
  "scan", "path_entry", "cta_click", "leave",
  "first_action", "read_30s", "pagehide"
]);

export async function onRequestPost(context) {
  const { request, env } = context;

  // ── Origin制限 ──────────────────────────────
  const origin = request.headers.get("Origin") || "";
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response("forbidden", { status: 403 });
  }

  // ── payloadサイズ制限（1KB） ─────────────────
  const contentLength = parseInt(request.headers.get("Content-Length") || "0");
  if (contentLength > 1024) {
    return new Response("payload too large", { status: 413 });
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return new Response("bad request", { status: 400 });
  }

  // ── イベント名バリデーション ──────────────────
  if (!ALLOWED_EVENTS.has(body.event)) {
    return new Response("unknown event", { status: 400 });
  }

  // ── フィールドをホワイトリスト化（余計なものは捨てる） ──
  const entry = {
    event:     String(body.event     || "").slice(0, 32),
    path:      String(body.path      || "").slice(0, 64),
    ch:        String(body.ch        || "").slice(0, 16),
    label:     String(body.label     || "").slice(0, 64),
    spent:     Number(body.spent)    || 0,
    ms:        Number(body.ms)       || 0,
    ts:        new Date().toISOString(),  // クライアント値は信用しない
  };

  // ── 1イベント1ファイルでGitHubへ（競合なし） ──
  context.waitUntil(writeToGitHub(entry, env));

  return new Response("ok", {
    status: 200,
    headers: corsHeaders(origin),
  });
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get("Origin") || "";
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// ────────────────────────────────────────────────────
// 1イベント = 1ファイル（logs/collect/YYYYMMDD/UUID.json）
// ────────────────────────────────────────────────────
async function writeToGitHub(entry, env) {
  const token = env.GITHUB_TOKEN;
  const owner = env.REPO_OWNER;
  const repo  = env.REPO_NAME;
  if (!token || !owner || !repo) return;

  const date = entry.ts.split("T")[0];
  const uuid = crypto.randomUUID();
  const path = `logs/collect/${date}/${uuid}.json`;

  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent":   "nkm-bot",
      },
      body: JSON.stringify({
        message: `[collect] ${entry.event} ${date}`,
        content: btoa(JSON.stringify(entry)),
      }),
    }
  );
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin":  allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
