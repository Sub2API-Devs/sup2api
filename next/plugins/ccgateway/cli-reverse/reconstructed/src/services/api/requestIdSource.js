/**
 * services/api/requestIdSource.ts
 *
 * 请求 id 来源判定（Anthropic 源站/网络边缘）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e89b3gwy.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isSessionsToken } from "../oauth/sessionsBearerHooks.js";

//@ chunk-e89b3gwy.js:227-247 placement
var CLOUDFLARE_SERVER_RE = /cloudflare/i;
//@ chunk-e89b3gwy.js:247-477 placement
function readRequestIdSource(getter) {
  let requestId = getter("request-id");
  if (typeof requestId === "string" && isSessionsToken(requestId.trim())) return "origin";
  let ray = getter("cf-ray");
  let server = getter("server");
  if (
    (typeof ray === "string" && ray !== "") ||
    (typeof server === "string" && CLOUDFLARE_SERVER_RE.test(server))
  )
    return "nonorigin_cf";
  return "nonorigin_other";
}
//@ chunk-e89b3gwy.js:477-542 placement
/**
 * 导出函数 `isNonOriginSource`：参数 e，返回 e === "nonorigin_cf" || e === "nonorigin_other"。
 */
function isNonOriginSource(source) {
  return source === "nonorigin_cf" || source === "nonorigin_other";
}
//@ chunk-e89b3gwy.js:542-1004 placement
function describeNonOriginRefusal(source) {
  switch (source) {
    case "nonorigin_cf":
      return "a network edge refused the connection before it reached Anthropic's server (HTTP 403 \u2014 Anthropic's CDN enforcing a region or network policy, or a Cloudflare gateway on this network) rather than this session; this often follows a VPN or network change";
    case "nonorigin_other":
      return "the connection was refused before it reached Anthropic (HTTP 403) \u2014 usually a proxy, VPN or firewall on this network";
  }
}
export { isNonOriginSource, describeNonOriginRefusal, readRequestIdSource };
