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

//@ chunk-fp6aqx1j.js:25628-25921 fingerprint = convertWsUrlToPostUrl (0.356)
function convertWsUrlToPostUrl(e, n) {
  if (e.protocol !== "http:" && e.protocol !== "https:") {
    let r = plainServiceText(e.protocol, "session_url_protocol");
    throw Error(`CCRClient: Expected http(s) URL${r === void 0 ? "" : `, got ${r}`}`);
  }
  let replaced = e.pathname.replace(/\/$/, "");
  return { sessionBaseUrl: `${e.protocol}//${e.host}${replaced}`, getAuthHeaders: n };
}

export { convertWsUrlToPostUrl };
