/**
 * utils/nativeInstaller/downloadsClient.ts
 *
 * 2.1.316 新增：只允许访问公共 CDN（downloads.claude.ai）的 HTTP 客户端
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9kawk9wc.js (3)
 * attribution: placement 3
 */
import { isAnthropicOwnedHost } from "../anthropicHosts.js";
import { noteExternalHttpUse } from "../testNetworkGuard.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-9kawk9wc.js:300-336 placement
var i = /^([a-z][a-z\d+\-.]*:)?\/\//i;
/**
 * 断言下载客户端的请求（url 或 baseURL）解析到公共 CDN downloads.claude.ai，否则抛错并提示改用 firstPartyApi 或 externalHttp。
 */
//@ chunk-9kawk9wc.js:336-708 placement
function assertPublicCdnRequest(o, e) {
  let s = e?.baseURL,
    matches = i.test(o),
    t = null;
  if (matches && !isAnthropicOwnedHost(o)) t = o;
  else if (s != null && !isAnthropicOwnedHost(s)) t = s;
  else if (!matches && s == null) t = o;
  if (t !== null)
    throw Error(
      `downloads: request (url="${o}"` +
        (s != null ? `, baseURL="${s}"` : "") +
        ") does not resolve to the public CDN (downloads.claude.ai). Use firstPartyApi for api.anthropic.com (residency-gated) or externalHttp for non-Anthropic hosts.",
    );
}
//@ chunk-9kawk9wc.js:708-759 placement
var t3 = {
  get(o, e) {
    return (assertPublicCdnRequest(o, e), noteExternalHttpUse(), Dt.get(o, e));
  },
};

export { t3 };
