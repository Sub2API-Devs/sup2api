/**
 * services/api/requestIdSource.ts
 *
 * 请求 id 来源判定（Anthropic 源站/网络边缘）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-949rqstz.js (4)
 * attribution: placement 4
 */
import { isSessionsToken } from "../oauth/sessionsBearerHooks.js";

//@ chunk-949rqstz.js:227-247 placement
var CLOUDFLARE_SERVER_RE = /cloudflare/i;
//@ chunk-949rqstz.js:247-477 placement
function readRequestIdSource(e) {
  let n = e("request-id");
  if (typeof n === "string" && isSessionsToken(n.trim())) return "origin";
  let r = e("cf-ray");
  let o = e("server");
  if ((typeof r === "string" && r !== "") || (typeof o === "string" && CLOUDFLARE_SERVER_RE.test(o)))
    return "nonorigin_cf";
  return "nonorigin_other";
}
//@ chunk-949rqstz.js:477-542 placement
/**
 * 导出函数 `isNonOriginSource`：参数 e，返回 e === "nonorigin_cf" || e === "nonorigin_other"。
 */
function isNonOriginSource(e) {
  return e === "nonorigin_cf" || e === "nonorigin_other";
}
//@ chunk-949rqstz.js:542-1004 placement
function describeNonOriginRefusal(e) {
  switch (e) {
    case "nonorigin_cf":
      return "a network edge refused the connection before it reached Anthropic's server (HTTP 403 \u2014 Anthropic's CDN enforcing a region or network policy, or a Cloudflare gateway on this network) rather than this session; this often follows a VPN or network change";
    case "nonorigin_other":
      return "the connection was refused before it reached Anthropic (HTTP 403) \u2014 usually a proxy, VPN or firewall on this network";
  }
}
export { readRequestIdSource, isNonOriginSource, describeNonOriginRefusal };
