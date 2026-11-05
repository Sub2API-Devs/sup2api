/**
 * utils/nativeInstaller/downloadsClient.ts
 *
 * 2.1.316 新增：只允许访问公共 CDN（downloads.claude.ai）的 HTTP 客户端
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-69nawj1n.js (3)
 * attribution: placement 3
 */
import { isAnthropicOwnedHost } from "../anthropicHosts.js";
import { noteExternalHttpUse } from "../testNetworkGuard.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-69nawj1n.js:300-336 placement
var ABSOLUTE_URL_RE = /^([a-z][a-z\d+\-.]*:)?\/\//i;
//@ chunk-69nawj1n.js:336-708 placement
/**
 * 断言下载客户端的请求（url 或 baseURL）解析到公共 CDN downloads.claude.ai，否则抛错并提示改用 firstPartyApi 或 externalHttp。
 */
function assertPublicCdnRequest(url, config) {
  let baseURL = config?.baseURL;
  let matches = ABSOLUTE_URL_RE.test(url);
  let offender = null;
  if (matches && !isAnthropicOwnedHost(url)) offender = url;
  else if (baseURL != null && !isAnthropicOwnedHost(baseURL)) offender = baseURL;
  else if (!matches && baseURL == null) offender = url;
  if (offender !== null)
    throw Error(
      `downloads: request (url="${url}"` +
        (baseURL != null ? `, baseURL="${baseURL}"` : "") +
        ") does not resolve to the public CDN (downloads.claude.ai). Use firstPartyApi for api.anthropic.com (residency-gated) or externalHttp for non-Anthropic hosts.",
    );
}
//@ chunk-69nawj1n.js:708-759 placement
/**
 * 断言请求指向公共 CDN 后再转发的下载客户端。
 */
var publicCdnGuardedClient = {
  get(url, config) {
    assertPublicCdnRequest(url, config);
    noteExternalHttpUse();
    return axios_default.get(url, config);
  },
};
export { publicCdnGuardedClient };
