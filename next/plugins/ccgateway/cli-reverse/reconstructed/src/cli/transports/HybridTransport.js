/**
 * cli/transports/HybridTransport.ts
 *
 * 混合传输（SSE 收、HTTP POST 发）；本切分里只剩把 ws(s) 地址换成 POST 地址的 convertWsUrlToPostUrl
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/transports/HybridTransport.ts
 * pieces: chunk-fp6aqx1j.js (1)
 * attribution: fingerprint 1
 */
import { plainServiceText } from "../../bridge/debugUtils.js";

//@ chunk-fp6aqx1j.js:25628-25921 fingerprint (2.1.88 match: convertWsUrlToPostUrl, 0.356)
function convertWsUrlToPostUrl(url, getAuthHeaders) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    let text = plainServiceText(url.protocol, "session_url_protocol");
    throw Error(`CCRClient: Expected http(s) URL${text === undefined ? "" : `, got ${text}`}`);
  }
  let replaced = url.pathname.replace(/\/$/, "");
  return {
    sessionBaseUrl: `${url.protocol}//${url.host}${replaced}`,
    getAuthHeaders,
  };
}
export { convertWsUrlToPostUrl };
