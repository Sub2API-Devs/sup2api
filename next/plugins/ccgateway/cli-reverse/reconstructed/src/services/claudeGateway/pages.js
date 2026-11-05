/**
 * services/claudeGateway/pages.ts
 *
 * 2.1.316 新增：网关 HTML 页面（登录/状态）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomBytes } from "crypto";
import { renderCallbackPage, brokenLinkSvg, checkmarkSvg } from "../oauth/callbackPage.js";
import { escapeHtml } from "../../../vendor/es-toolkit/dist/string/escape.mjs";

//@ chunk-1hnjmk23.js:1331651-1333202 placement
/**
 * 设备登录页样式与字符画 logo。
 */
var DEVICE_PAGE_CSS = `
:root{--err:#a63244}
@media (prefers-color-scheme:dark){:root{--err:#f08c99}}
.sub strong{display:block;margin:8px 0;color:var(--ink);font-weight:400;text-wrap:balance}
form{position:relative;max-width:360px;margin:28px auto 0}
.refused{position:absolute;top:100%;left:0;right:0;margin:12px 0 0;padding-bottom:24px;color:var(--err);text-wrap:pretty}
.code-input,.code-display{width:100%;overflow-wrap:anywhere;font:24px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.25em;text-indent:.25em;text-align:center;padding:18px 16px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);margin-bottom:12px}
.code-input{border-color:var(--ink2);text-transform:uppercase;outline:none}
.code-input:focus{border-color:#2A78D6;box-shadow:0 0 0 3px rgba(42,120,214,.18)}
button.go{appearance:none;border:none;width:100%;background:var(--ink);color:var(--bg);font:inherit;padding:13px 20px;border-radius:8px;cursor:pointer}
button.go:hover{opacity:.85}
button.deny{appearance:none;border:1px solid var(--line);width:100%;background:none;color:var(--ink);font:inherit;padding:12px 20px;border-radius:8px;cursor:pointer;margin-top:8px}
button.deny:hover{background:var(--card);border-color:var(--ink2)}
button.go:focus-visible,button.deny:focus-visible{outline:2px solid #2A78D6;outline-offset:2px}
@media (max-width:520px){.code-input,.code-display{font-size:22px}}`;
var CLAUDE_ASCII_LOGO = ` \u2590\u259B\u2588\u2588\u2588\u259B\u2588
\u259D\u259C\u2588\u2588\u2588\u2588\u2588\u2588\u2580
 \u259D\u259D   \u259D\u259D`;
//@ chunk-1hnjmk23.js:1333202-1333674 placement
/**
 * 渲染网关 HTML 页面（CSP、可选关闭标签脚本 nonce、禁止缓存）。
 */
function htmlPageResponse(body, options) {
  let nonce = options?.closeTab ? randomBytes(16).toString("base64url") : undefined;
  let formActionSource = options?.formAction ? `'self' ${options.formAction}` : "'self'";
  return new Response(
    renderCallbackPage(body, {
      css: DEVICE_PAGE_CSS,
      closeTab: nonce !== undefined && {
        nonce,
      },
    }),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; font-src data:; ${nonce ? `script-src 'nonce-${nonce}'; ` : ""}frame-ancestors 'none'; form-action ${formActionSource}; base-uri 'none'`,
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}
//@ chunk-1hnjmk23.js:1333674-1334760 placement
/**
 * 网关首页：版本、身份提供方与连接说明。
 */
function gatewayIndexPage(baseUrl, issuerUrl, version) {
  let baseUrlText = escapeHtml(baseUrl);
  let issuerHost =
    issuerUrl === null
      ? "(none \u2014 customer-routed inference only)"
      : escapeHtml(new URL(issuerUrl).hostname);
  return new Response(
    `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Claude gateway for Amazon Bedrock, Google Cloud, and Microsoft Foundry</title>
</head>
<body style="font-family: monospace; margin: 1em;">
<pre style="line-height: 1; margin: 0 0 1em 0;">${CLAUDE_ASCII_LOGO}</pre>
<pre style="margin: 0;">
<b>Claude gateway for Amazon Bedrock, Google Cloud, and Microsoft Foundry</b>

Running at ${baseUrlText}

To connect from Claude Code:
  Your admin provisions this gateway URL via managed settings
  (forceLoginGatewayUrl) \u2014 then /login connects here directly.

Identity provider   ${issuerHost}
Discovery           <a href="/.well-known/oauth-authorization-server">/.well-known/oauth-authorization-server</a>
Version             ${escapeHtml(version)}
</pre>
</body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'",
        "Cache-Control": "no-store",
      },
    },
  );
}
//@ chunk-1hnjmk23.js:1334760-1336025 placement
/**
 * 设备码页面：预填时确认/拒绝，否则输入码。
 */
function deviceCodePage(options) {
  let { prefill, error, idpOrigin } = options;
  let errorHtml = error ? `<p class="refused" id="e" role="alert">${escapeHtml(error)}</p>` : "";
  if (prefill)
    return htmlPageResponse(
      `<h1>Approve sign-in?</h1>
<p class="sub">A device is requesting access to Claude Code. <strong>Only continue if this code matches the one shown on your device.</strong> If you didn't start this, select Deny.</p>
<form method="post" action="/device">
  <div class="code-display">${escapeHtml(prefill)}</div>
  <input type="hidden" name="user_code" value="${escapeHtml(prefill)}">
  <button class="go" type="submit">This matches my device \u2014 continue</button>
  <button class="deny" type="submit" formaction="/device/deny">Deny</button>
${errorHtml}</form>`,
      {
        formAction: idpOrigin,
      },
    );
  return htmlPageResponse(
    `<h1 id="h">Enter the code from your device.</h1>
<p class="sub">Claude Code shows a short code when you sign in. Enter it here to connect \u2014 then you'll sign in with your company identity provider.</p>
<form method="post" action="/device">
  <input class="code-input" name="user_code" aria-labelledby="h"${error ? ' aria-describedby="e"' : ""} inputmode="latin" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="XXXX-XXXX" maxlength="9" autofocus required>
  <button class="go" type="submit">Continue</button>
${errorHtml}</form>`,
    {
      formAction: idpOrigin,
    },
  );
}
//@ chunk-1hnjmk23.js:1336025-1336551 placement
/**
 * 拒绝登录后的页面（或未在等待批准）。
 */
function deviceDeniedPage(denied) {
  if (!denied)
    return htmlPageResponse(`<h1>This sign-in isn&rsquo;t waiting for approval.</h1>
<p class="sub">It may have expired, or already been approved or stopped. If you approved a sign-in you didn&rsquo;t start, tell your IT administrator now.</p>`);
  return htmlPageResponse(`${brokenLinkSvg()}
<h1>You stopped this sign-in.</h1>
<p class="sub">No access was granted, and the code is no longer valid. If you didn&rsquo;t start this sign-in, tell your IT administrator. If you stopped your own sign-in by mistake, start it again from your device.</p>`);
}
//@ chunk-1hnjmk23.js:1336551-1336995 placement
/**
 * 登录完成或失败页面。
 */
function signInResultPage(errorMessage) {
  if (errorMessage)
    return htmlPageResponse(`${brokenLinkSvg()}
<h1>We couldn&rsquo;t finish signing you in.</h1>
<p class="sub">Close this tab and try signing in again. If the error persists, share the message below with your IT administrator.</p>
<div class="detail">${escapeHtml(errorMessage)}</div>`);
  return htmlPageResponse(
    `${checkmarkSvg()}
<h1>You&rsquo;re signed in.</h1>
<p class="sub">Return to your device \u2014 it should connect within a few seconds. You can close this tab.</p>`,
    {
      closeTab: true,
    },
  );
}
export { gatewayIndexPage, deviceCodePage, deviceDeniedPage, signInResultPage };
