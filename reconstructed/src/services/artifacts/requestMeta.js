/**
 * services/artifacts/requestMeta.ts
 *
 * Artifact 请求元数据（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5v4t11fy.js (9)
 * attribution: placement 9
 */
import { getEntrypointKind, isAgentSdkEntrypoint } from "../../utils/entrypointKinds.js";
import { G3o, formatFrameErrorBody, UNKNOWN_FIELD_ERROR_RE, STt } from "./frameApi.js";
import { getLiveState } from "../liveReplica/liveReplica.js";

//@ chunk-5v4t11fy.js:314-393 placement
function I1t() {
  let n = getEntrypointKind();
  return n ? { entrypoint: n.toLowerCase().slice(0, 64) } : {};
}
//@ chunk-5v4t11fy.js:393-454 placement
function qFr() {
  let n = G3o();
  return n && !isAgentSdkEntrypoint() ? { session_id: n } : {};
}
//@ chunk-5v4t11fy.js:454-470 placement
var lNo = 3600000;
/**
 * 返回发送给 artifact 服务的会话提示元数据；最近被服务端拒绝过（冷却期内）时返回空对象。
 */
//@ chunk-5v4t11fy.js:470-585 placement
function getSessionHintHeaders() {
  let sessionHintsRefusedAt = getLiveState().sessionHintsRefusedAt;
  if (sessionHintsRefusedAt !== void 0 && Date.now() - sessionHintsRefusedAt < lNo) return {};
  return { ...I1t(), ...qFr() };
}
//@ chunk-5v4t11fy.js:585-638 placement
function q5n() {
  getLiveState().sessionHintsRefusedAt = Date.now();
}
//@ chunk-5v4t11fy.js:638-702 placement
var YFr = ["entrypoint", "session_id", "request_id"],
  u = new Set(YFr);
/**
 * 根据 400 响应里"未知字段/不在允许列表"的错误判断哪些会话提示字段被拒绝：能从消息中识别的返回这些字段，消息只提到其他字段时返回空，否则返回全部已发送的提示字段。
 */
//@ chunk-5v4t11fy.js:702-941 placement
function findRejectedHintFields(n, s, i) {
  let filtered = YFr.filter((t) => i[t] !== void 0);
  if (n !== 400 || filtered.length === 0) return [];
  let e = formatFrameErrorBody(s);
  if (!UNKNOWN_FIELD_ERROR_RE.test(e)) return [];
  let filtered_2 = filtered.filter((t) => STt(e, t));
  if (filtered_2.length > 0) return filtered_2;
  return Object.keys(i).some((t) => !u.has(t) && STt(e, t)) ? [] : filtered;
}
//@ chunk-5v4t11fy.js:941-1015 placement
function yun(n) {
  return n.includes("entrypoint") || n.includes("session_id");
}
//@ chunk-5v4t11fy.js:1015-1091 placement
function iKs(n) {
  let { entrypoint: entrypoint, session_id: session_id, request_id: request_id, ...e } = n;
  return e;
}

export { lNo, I1t, qFr, getSessionHintHeaders, findRejectedHintFields, yun, q5n, YFr, iKs };
