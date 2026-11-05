/**
 * services/api/providerIds.ts
 *
 * 2.1.316 新增：API 提供方标识常量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 3, layout 1
 */
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-5xgkngpb.js:227605-227737 placement
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
//@ chunk-5xgkngpb.js:227737-227788 placement
/**
 * 导出函数 `containsProviderId`：参数 e，返回 PROVIDER_ID_PREFIXES.some((n) => e.includes(n))。
 */
function containsProviderId(requestId) {
  return PROVIDER_ID_PREFIXES.some((prefix) => requestId.includes(prefix));
}
//@ chunk-5xgkngpb.js:227788-227993 layout
function hasProviderIdInMessage(event) {
  let message = isPlainObject_6(event.message) ? event.message : undefined;
  let content = Array.isArray(message?.content) ? message.content : [];
  return [
    event.requestId,
    message?.id,
    ...content.flatMap((block) => (isPlainObject_6(block) ? [block.id, block.tool_use_id] : [])),
  ].some((candidate) => typeof candidate === "string" && containsProviderId(candidate));
}
//@ chunk-5xgkngpb.js:227993-228067 placement
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
export { containsProviderId, anyMessageHasProviderId, hasProviderIdInMessage };
