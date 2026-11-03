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
import { shortHash } from "../../utils/shortHash.js";
import { hasPipelineReplyOrigin, hasChainPublishId } from "../../utils/mcpOutputStorage.js";
import { logForDebugging } from "../../utils/debug.js";
import { OUTPUT_SIZE_LIMITS } from "../../constants/outputLimits.js";

//@ chunk-bhxaz9j0.js:7845-7968 placement
/**
 * 重复拒绝断路器的阈值、长度上限，以及不触发断路提示的原因码集合（登录/策略/暂时性发布错误）。
 */
var REJECT_BREAKER_THRESHOLD = 3;
var REJECT_KEY_MAX = 1024;
var BREAKER_EXEMPT_REASONS = new Set([
  `ec_${ARTIFACT_LOGIN_ERROR_CODE}`,
  ARTIFACT_LOGIN_REASON_CODE,
  `ec_${ARTIFACT_POLICY_UNOBTAINED_ERROR_CODE}`,
  "policy_fetch_failed",
  "policy_route_missing",
  ...Object.values(TRANSIENT_PUBLISH_REASON),
]);
//@ chunk-bhxaz9j0.js:7968-8025 placement
function boundedRejectKey(e) {
  return typeof e === "string" ? e.slice(0, REJECT_KEY_MAX) : "";
}
//@ chunk-bhxaz9j0.js:8025-8278 placement
function rejectKeyOf(e) {
  if (typeof e !== "object" || e === null) return "publish\x00\x00\x00";
  let r = "action" in e ? boundedRejectKey(e.action) : "";
  let n = "file_path" in e ? boundedRejectKey(e.file_path) : "";
  let i = "url" in e ? boundedRejectKey(e.url) : "";
  let o = "thread_id" in e ? boundedRejectKey(e.thread_id) : "";
  return `${r || "publish"}\x00${n}\x00${i}\x00${o}`;
}
//@ chunk-bhxaz9j0.js:8278-8510 placement
/**
 * 按调用键累计同一原因、同一指纹的连续拒绝次数，达到阈值时打点 tengu_artifact_reject_breaker；返回是否已达阈值。
 */
function countRepeatedReject(e, r, n) {
  let rejectBreaker = getLiveState().rejectBreaker;
  let o = rejectKeyOf(e);
  let s = rejectBreaker.get(o);
  let u = s !== undefined && s.reason === r && s.fingerprint === n ? s.count + 1 : 1;
  rejectBreaker.set(o, {
    count: u,
    reason: r,
    fingerprint: n,
  });
  if (u === REJECT_BREAKER_THRESHOLD)
    logEvent("tengu_artifact_reject_breaker", {
      reason: sanitizedMachineReasonForTelemetry(r),
    });
  return u >= REJECT_BREAKER_THRESHOLD;
}
//@ chunk-bhxaz9j0.js:8510-8824 placement
/**
 * 重复拒绝断路提示：同一目标因同一原因被拒多次后，告知模型不要再重发同一调用。
 */
var ARTIFACT_REJECT_BREAKER_NOTICE = `IMPORTANT: Artifact calls for this target have now been rejected ${REJECT_BREAKER_THRESHOLD} or more times in this session for the same reason. Do not send the same call again: either make the specific change the error describes, or stop calling Artifact for this target and tell the user what is failing and why.`;
var REJECT_NOTICE_LENGTH = ARTIFACT_REJECT_BREAKER_NOTICE.length + 2;
//@ chunk-bhxaz9j0.js:8824-8892 placement
/**
 * 导出函数 `stripRejectBreakerNotice`：参数 e，返回 e.startsWith(`${ARTIFACT_REJECT_BREAKER_NOTICE} `) ? e.slice(ARTIFACT_REJECT_BREAKER_NOTICE.length + 2) : e。
 */
function stripRejectBreakerNotice(e) {
  return e.startsWith(`${ARTIFACT_REJECT_BREAKER_NOTICE}

`)
    ? e.slice(ARTIFACT_REJECT_BREAKER_NOTICE.length + 2)
    : e;
}
//@ chunk-bhxaz9j0.js:8892-8919 placement
var LIVE_EDIT_CONFLICT = "live_edit_conflict";
//@ chunk-bhxaz9j0.js:8919-9021 placement
/**
 * 同一调用因同一原因（live-edit 冲突还结合操作目标）被连续拒绝达到阈值且原因不在豁免表时，在错误消息前加"断路"提示。
 */
function withRejectBreakerNotice(e, message, n) {
  let i = stripRejectBreakerNotice(message);
  let o = n === LIVE_EDIT_CONFLICT ? shortHash(i + liveEditTargetsKey(e, i)) : shortHash(i);
  return countRepeatedReject(e, n, o) && !BREAKER_EXEMPT_REASONS.has(n)
    ? `${ARTIFACT_REJECT_BREAKER_NOTICE}

${i}`
    : i;
}
//@ chunk-bhxaz9j0.js:9021-9458 placement
/**
 * 为 live-edit 操作生成目标键（按错误消息中的 ops 下标只取对应操作），用于识别反复失败的同类编辑；不是 live-edit 返回空串。
 */
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
  let match = /\bops\[(\d+)\]/.exec(r);
  let i = match === null ? e.ops : [e.ops[Number.parseInt(match[1], 10)]];
  let o = new Set();
  for (let s of i) {
    if (typeof s !== "object" || s === null) continue;
    for (let u of ["target", "before", "after", "parent"])
      if (u in s) {
        let d = boundedRejectKey(s[u]);
        if (d !== "") o.add(d);
      }
  }
  return o.size === 0 ? "" : `\x00${[...o].sort().join("\x00")}`;
}
//@ chunk-bhxaz9j0.js:9458-9473 placement
var SCHEMA = "schema";
//@ chunk-bhxaz9j0.js:9473-9677 placement = isUnrecognizedKeysIssue (0.804)
function isUnrecognizedKeysIssue(issue) {
  if (issue === undefined) return "";
  return issue.issues
    .map((issue) => {
      let n = issue.code === "unrecognized_keys" ? [...issue.keys].sort().join(",") : "";
      return `${issue.code}:${issue.path.map(String).join(".")}:${n}`;
    })
    .sort()
    .join("|");
}
//@ chunk-bhxaz9j0.js:9677-9731 placement
function isBreakerEligibleCall(e) {
  return hasPipelineReplyOrigin(e.toolUseId) || hasChainPublishId(e.toolUseId);
}
//@ chunk-bhxaz9j0.js:9731-10089 placement
/**
 * 包装 Artifact 工具：校验错误引导、validateInput 与 call 都加上重复拒绝断路提示（无人值守时不改消息），其余属性原样保留。
 */
function wrapToolWithRejectBreaker(tool, options = {}) {
  let { validationErrorSteer, validateInput, call: o } = tool;
  let s = {
    validationErrorSteer: (u, d) =>
      schemaSteerWithBreaker(
        u,
        d,
        options.schemaSteerOverride?.(u) ?? null,
        validationErrorSteer?.(u, d) ?? null,
      ),
    ...(validateInput !== undefined && {
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
function schemaSteerWithBreaker(e, issue, n, i) {
  let o = (n !== null ? "override|" : "") + isUnrecognizedKeysIssue(issue);
  let s = countRepeatedReject(e, SCHEMA, o);
  if (n !== null) return n;
  let joined = [s ? ARTIFACT_REJECT_BREAKER_NOTICE : null, i].filter((p) => p !== null).join(`

`);
  return joined === "" ? null : joined;
}
//@ chunk-bhxaz9j0.js:10251-10547 placement
function wrapValidateInput(validateInput, onValidateReject) {
  return async (n, i) => {
    let o = await validateInput(n, i);
    if (o.result) return o;
    let s = isBreakerEligibleCall(i);
    try {
      onValidateReject?.(
        n,
        {
          ...o,
        },
        {
          unattended: s,
        },
      );
    } catch (error) {
      logForDebugging(
        `artifact reject observer threw: ${error instanceof Error ? error.message : typeof error}`,
        {
          level: "error",
        },
      );
    }
    if (s) return o;
    return {
      ...o,
      message: withRejectBreakerNotice(n, o.message, `ec_${o.errorCode}`),
    };
  };
}
//@ chunk-bhxaz9j0.js:10547-10744 placement
function wrapToolCall(e) {
  return async (r, n, ...i) => {
    if (isBreakerEligibleCall(n)) return e(r, n, ...i);
    let o;
    try {
      o = await e(r, n, ...i);
    } catch (error) {
      if (error instanceof ArtifactInputError)
        error.message = withRejectBreakerNotice(r, error.message, error.reasonCode ?? "unknown");
      throw error;
    }
    clearBreaker();
    return o;
  };
}
//@ chunk-bhxaz9j0.js:10744-10784 placement
function clearBreaker() {
  getLiveState().rejectBreaker.clear();
}
//@ chunk-bhxaz9j0.js:10820-10844 placement
/**
 * 导出常量或表 `MAX_REJECT_KEY_CHARS`：值为 1e5, Cbn = OUTPUT_SIZE_LIMITS - 2000。
 */
var MAX_REJECT_KEY_CHARS = 1e5;
var BREAKER_OUTPUT_LIMIT = OUTPUT_SIZE_LIMITS - 2000;
//@ chunk-bhxaz9j0.js:10844-10890 placement
/**
 * 导出函数 `statusText`：参数 e，返回 STATUS_CODES[e] ?? "Unknown Status"; } export { Ekt, Tnr, yie, Cbn, withRejectBreakerNotice, wrapToolWithRejec…。
 */
function statusText(e) {
  return STATUS_CODES[e] ?? "Unknown Status";
}
export {
  REJECT_NOTICE_LENGTH,
  MAX_REJECT_KEY_CHARS,
  statusText,
  BREAKER_OUTPUT_LIMIT,
  withRejectBreakerNotice,
  wrapToolWithRejectBreaker,
  stripRejectBreakerNotice,
};
