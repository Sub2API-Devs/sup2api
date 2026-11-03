/**
 * services/artifacts/rejectBreaker.ts
 *
 * Artifact 重复被拒熔断提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bhxaz9j0.js (19)
 * attribution: placement 19
 */
import { STATUS_CODES } from "http";
import {
  ARTIFACT_LOGIN_ERROR_CODE,
  ARTIFACT_LOGIN_REASON_CODE,
  ARTIFACT_POLICY_UNOBTAINED_ERROR_CODE,
  TRANSIENT_PUBLISH_REASON,
  ArtifactInputError,
} from "../../tools/ArtifactTool/constants.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { logEvent } from "../analytics/index.js";
import { sanitizedMachineReasonForTelemetry } from "../../utils/errors.js";
import { gn } from "../../utils/shortHash.js";
import { A, _Vt } from "../../utils/mcpOutputStorage.js";
import { logForDebugging } from "../../utils/debug.js";
import { OUTPUT_SIZE_LIMITS } from "../../constants/outputLimits.js";

/**
 * 重复拒绝断路器的阈值、长度上限，以及不触发断路提示的原因码集合（登录/策略/暂时性发布错误）。
 */
//@ chunk-bhxaz9j0.js:7845-7968 placement
var REJECT_BREAKER_THRESHOLD = 3,
  REJECT_KEY_MAX = 1024,
  BREAKER_EXEMPT_REASONS = new Set([
    `ec_${ARTIFACT_LOGIN_ERROR_CODE}`,
    ARTIFACT_LOGIN_REASON_CODE,
    `ec_${ARTIFACT_POLICY_UNOBTAINED_ERROR_CODE}`,
    "policy_fetch_failed",
    "policy_route_missing",
    ...Object.values(TRANSIENT_PUBLISH_REASON),
  ]);
//@ chunk-bhxaz9j0.js:7968-8025 placement
function g(e) {
  return typeof e === "string" ? e.slice(0, REJECT_KEY_MAX) : "";
}
//@ chunk-bhxaz9j0.js:8025-8278 placement
function rejectKeyOf(e) {
  if (typeof e !== "object" || e === null) return "publish\x00\x00\x00";
  let r = "action" in e ? g(e.action) : "",
    n = "file_path" in e ? g(e.file_path) : "",
    i = "url" in e ? g(e.url) : "",
    o = "thread_id" in e ? g(e.thread_id) : "";
  return `${r || "publish"}\x00${n}\x00${i}\x00${o}`;
}
/**
 * 按调用键累计同一原因、同一指纹的连续拒绝次数，达到阈值时打点 tengu_artifact_reject_breaker；返回是否已达阈值。
 */
//@ chunk-bhxaz9j0.js:8278-8510 placement
function countRepeatedReject(e, r, n) {
  let rejectBreaker = getLiveState().rejectBreaker,
    o = rejectKeyOf(e),
    s = rejectBreaker.get(o),
    u = s !== void 0 && s.reason === r && s.fingerprint === n ? s.count + 1 : 1;
  if ((rejectBreaker.set(o, { count: u, reason: r, fingerprint: n }), u === REJECT_BREAKER_THRESHOLD))
    logEvent("tengu_artifact_reject_breaker", { reason: sanitizedMachineReasonForTelemetry(r) });
  return u >= REJECT_BREAKER_THRESHOLD;
}
//@ chunk-bhxaz9j0.js:8510-8824 placement
var ARTIFACT_REJECT_BREAKER_NOTICE = `IMPORTANT: Artifact calls for this target have now been rejected ${REJECT_BREAKER_THRESHOLD} or more times in this session for the same reason. Do not send the same call again: either make the specific change the error describes, or stop calling Artifact for this target and tell the user what is failing and why.`,
  Ekt = ARTIFACT_REJECT_BREAKER_NOTICE.length + 2;
//@ chunk-bhxaz9j0.js:8824-8892 placement
function vkt(e) {
  return e.startsWith(`${ARTIFACT_REJECT_BREAKER_NOTICE}

`)
    ? e.slice(ARTIFACT_REJECT_BREAKER_NOTICE.length + 2)
    : e;
}
//@ chunk-bhxaz9j0.js:8892-8919 placement
var LIVE_EDIT_CONFLICT = "live_edit_conflict";
/**
 * 同一调用因同一原因（live-edit 冲突还结合操作目标）被连续拒绝达到阈值且原因不在豁免表时，在错误消息前加"断路"提示。
 */
//@ chunk-bhxaz9j0.js:8919-9021 placement
function withRejectBreakerNotice(e, r, n) {
  let i = vkt(r),
    o = n === LIVE_EDIT_CONFLICT ? gn(i + liveEditTargetsKey(e, i)) : gn(i);
  return countRepeatedReject(e, n, o) && !BREAKER_EXEMPT_REASONS.has(n)
    ? `${ARTIFACT_REJECT_BREAKER_NOTICE}

${i}`
    : i;
}
/**
 * 为 live-edit 操作生成目标键（按错误消息中的 ops 下标只取对应操作），用于识别反复失败的同类编辑；不是 live-edit 返回空串。
 */
//@ chunk-bhxaz9j0.js:9021-9458 placement
function liveEditTargetsKey(e, r) {
  if (
    typeof e !== "object" ||
    e === null ||
    !("action" in e) ||
    e.action !== "live-edit" ||
    !("ops" in e) ||
    !Array.isArray(e.ops)
  )
    return "";
  let match = /\bops\[(\d+)\]/.exec(r),
    i = match === null ? e.ops : [e.ops[Number.parseInt(match[1], 10)]],
    o = new Set();
  for (let s of i) {
    if (typeof s !== "object" || s === null) continue;
    for (let u of ["target", "before", "after", "parent"])
      if (u in s) {
        let d = g(s[u]);
        if (d !== "") o.add(d);
      }
  }
  return o.size === 0 ? "" : `\x00${[...o].sort().join("\x00")}`;
}
//@ chunk-bhxaz9j0.js:9458-9473 placement
var SCHEMA = "schema";
//@ chunk-bhxaz9j0.js:9473-9677 placement = isUnrecognizedKeysIssue (0.804)
function isUnrecognizedKeysIssue(issue) {
  if (issue === void 0) return "";
  return issue.issues
    .map((issue) => {
      let n = issue.code === "unrecognized_keys" ? [...issue.keys].sort().join(",") : "";
      return `${issue.code}:${issue.path.map(String).join(".")}:${n}`;
    })
    .sort()
    .join("|");
}
//@ chunk-bhxaz9j0.js:9677-9731 placement
function P(e) {
  return A(e.toolUseId) || _Vt(e.toolUseId);
}
/**
 * 包装 Artifact 工具：校验错误引导、validateInput 与 call 都加上重复拒绝断路提示（无人值守时不改消息），其余属性原样保留。
 */
//@ chunk-bhxaz9j0.js:9731-10089 placement
function wrapToolWithRejectBreaker(tool, options = {}) {
  let { validationErrorSteer: validationErrorSteer, validateInput: validateInput, call: o } = tool,
    s = {
      validationErrorSteer: (u, d) =>
        schemaSteerWithBreaker(
          u,
          d,
          options.schemaSteerOverride?.(u) ?? null,
          validationErrorSteer?.(u, d) ?? null,
        ),
      ...(validateInput !== void 0 && {
        validateInput: wrapValidateInput(validateInput, options.onValidateReject),
      }),
      call: wrapToolCall(o),
    };
  return Object.defineProperties(
    Object.defineProperties({}, Object.getOwnPropertyDescriptors(tool)),
    Object.getOwnPropertyDescriptors(s),
  );
}
//@ chunk-bhxaz9j0.js:10089-10251 placement
function schemaSteerWithBreaker(e, r, n, i) {
  let o = (n !== null ? "override|" : "") + isUnrecognizedKeysIssue(r),
    s = countRepeatedReject(e, SCHEMA, o);
  if (n !== null) return n;
  let joined = [s ? ARTIFACT_REJECT_BREAKER_NOTICE : null, i].filter((p) => p !== null).join(`

`);
  return joined === "" ? null : joined;
}
//@ chunk-bhxaz9j0.js:10251-10547 placement
function wrapValidateInput(e, r) {
  return async (n, i) => {
    let o = await e(n, i);
    if (o.result) return o;
    let s = P(i);
    try {
      r?.(n, { ...o }, { unattended: s });
    } catch (error) {
      logForDebugging(
        `artifact reject observer threw: ${error instanceof Error ? error.message : typeof error}`,
        { level: "error" },
      );
    }
    if (s) return o;
    return { ...o, message: withRejectBreakerNotice(n, o.message, `ec_${o.errorCode}`) };
  };
}
//@ chunk-bhxaz9j0.js:10547-10744 placement
function wrapToolCall(e) {
  return async (r, n, ...i) => {
    if (P(n)) return e(r, n, ...i);
    let o;
    try {
      o = await e(r, n, ...i);
    } catch (error) {
      if (error instanceof ArtifactInputError)
        error.message = withRejectBreakerNotice(r, error.message, error.reasonCode ?? "unknown");
      throw error;
    }
    return (K(), o);
  };
}
//@ chunk-bhxaz9j0.js:10744-10784 placement
function K() {
  getLiveState().rejectBreaker.clear();
}
//@ chunk-bhxaz9j0.js:10820-10844 placement
var Tnr = 1e5,
  Cbn = OUTPUT_SIZE_LIMITS - 2000;
//@ chunk-bhxaz9j0.js:10844-10890 placement
function yie(e) {
  return STATUS_CODES[e] ?? "Unknown Status";
}

export { Ekt, Tnr, yie, Cbn, withRejectBreakerNotice, wrapToolWithRejectBreaker, vkt };
