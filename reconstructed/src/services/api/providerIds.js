/**
 * services/api/providerIds.ts
 *
 * 2.1.316 新增：API 提供方标识常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-e6aww6q8.js:227039-227171 placement
var PROVIDER_ID_PREFIXES = [
  "msg_bdrk_",
  "msg_vrtx_",
  "bolt-inf-",
  "toolu_bdrk_",
  "toolu_vrtx_",
  "srvtoolu_bdrk_",
  "srvtoolu_vrtx_",
  "req_bdrk_",
  "req_vrtx_",
];
//@ chunk-e6aww6q8.js:227171-227223 placement
/**
 * 导出函数 `containsProviderId`：参数 e，返回 PROVIDER_ID_PREFIXES.some((n) => e.includes(n))。
 */
function containsProviderId(requestId) {
  return PROVIDER_ID_PREFIXES.some((prefix) => requestId.includes(prefix));
}
//@ chunk-e6aww6q8.js:227223-227298 placement
/**
 * 导出函数 `anyMessageHasProviderId`：参数 e，返回 e.some((n) => { try { return Uue(jsonStringify(n)); } catch { return !0; } }); } export { jbt, Uue }。
 */
function anyMessageHasProviderId(messages) {
  return messages.some((message) => {
    try {
      return containsProviderId(jsonStringify(message));
    } catch {
      return true;
    }
  });
}
export { anyMessageHasProviderId, containsProviderId };
