/**
 * services/artifacts/requestMeta.ts
 *
 * Artifact 请求元数据（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0br1jecm.js (9)
 * attribution: placement 9
 */
import { getEntrypointKind, isAgentSdkEntrypoint } from "../../utils/entrypointKinds.js";
import { frameSessionId, formatFrameErrorBody, UNKNOWN_FIELD_ERROR_RE, mentionsField } from "./frameApi.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0br1jecm.js:314-393 placement
/**
 * 导出函数 `entrypointHint`：返回 n ? { entrypoint: n.toLowerCase().slice(0, 64) } : {}。
 */
function entrypointHint() {
  let entrypointKind = getEntrypointKind();
  return entrypointKind
    ? {
        entrypoint: entrypointKind.toLowerCase().slice(0, 64),
      }
    : {};
}
//@ chunk-0br1jecm.js:393-454 placement
/**
 * 导出函数 `sessionIdHint`：返回 n && !isAgentSdkEntrypoint() ? { session_id: n } : {}。
 */
function sessionIdHint() {
  let sessionId = frameSessionId();
  return sessionId && !isAgentSdkEntrypoint()
    ? {
        session_id: sessionId,
      }
    : {};
}
//@ chunk-0br1jecm.js:454-470 placement
/**
 * 会话提示头被服务端拒绝后的冷却时长 1 小时。
 */
var SESSION_HINT_COOLDOWN_MS = 3600000;
//@ chunk-0br1jecm.js:470-585 placement
/**
 * 返回发送给 artifact 服务的会话提示元数据；最近被服务端拒绝过（冷却期内）时返回空对象。
 */
function getSessionHintHeaders() {
  let sessionHintsRefusedAt = getLiveState().sessionHintsRefusedAt;
  if (sessionHintsRefusedAt !== undefined && Date.now() - sessionHintsRefusedAt < SESSION_HINT_COOLDOWN_MS)
    return {};
  return {
    ...entrypointHint(),
    ...sessionIdHint(),
  };
}
//@ chunk-0br1jecm.js:585-638 placement
/**
 * 导出函数 `noteSessionHintsRefused`。
 */
function noteSessionHintsRefused() {
  getLiveState().sessionHintsRefusedAt = Date.now();
}
//@ chunk-0br1jecm.js:638-702 placement
/**
 * 导出常量或表 `SESSION_HINT_FIELDS`：值为 ["entrypoint", "session_id", "request_id"], u = new Set(YFr)。
 */
var SESSION_HINT_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SESSION_HINT_FIELD_SET;
deferInit("chunk-0br1jecm.js:638", () => {
  SESSION_HINT_FIELDS = ["entrypoint", "session_id", "request_id"];
  SESSION_HINT_FIELD_SET = new Set(SESSION_HINT_FIELDS);
});
//@ chunk-0br1jecm.js:702-941 placement
/**
 * 根据 400 响应里"未知字段/不在允许列表"的错误判断哪些会话提示字段被拒绝：能从消息中识别的返回这些字段，消息只提到其他字段时返回空，否则返回全部已发送的提示字段。
 */
function findRejectedHintFields(status, httpStatus, hints) {
  let filtered = SESSION_HINT_FIELDS.filter((field) => hints[field] !== undefined);
  if (status !== 400 || filtered.length === 0) return [];
  let body = formatFrameErrorBody(httpStatus);
  if (!UNKNOWN_FIELD_ERROR_RE.test(body)) return [];
  let filtered_2 = filtered.filter((field) => mentionsField(body, field));
  if (filtered_2.length > 0) return filtered_2;
  return Object.keys(hints).some((key) => !SESSION_HINT_FIELD_SET.has(key) && mentionsField(body, key))
    ? []
    : filtered;
}
//@ chunk-0br1jecm.js:941-1015 placement
/**
 * 导出函数 `mentionsSessionHintField`：参数 n，返回 n.includes("entrypoint") || n.includes("session_id")。
 */
function mentionsSessionHintField(hints) {
  return hints.includes("entrypoint") || hints.includes("session_id");
}
//@ chunk-0br1jecm.js:1015-1091 placement
/**
 * 导出函数 `stripSessionHints`：参数 n，返回 e; } export { lNo, I1t, qFr, getSessionHintHeaders, findRejectedHintFields, yun, q5n, YFr, iKs }。
 */
function stripSessionHints(hints) {
  let { entrypoint, session_id: sessionId, request_id: requestId, ...rest } = hints;
  return rest;
}
export {
  SESSION_HINT_COOLDOWN_MS,
  entrypointHint,
  sessionIdHint,
  getSessionHintHeaders,
  findRejectedHintFields,
  mentionsSessionHintField,
  noteSessionHintsRefused,
  stripSessionHints,
  SESSION_HINT_FIELDS,
};
