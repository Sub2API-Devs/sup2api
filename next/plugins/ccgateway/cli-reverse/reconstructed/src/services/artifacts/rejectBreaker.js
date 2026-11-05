/**
 * services/artifacts/rejectBreaker.ts
 *
 * Artifact 重复被拒熔断提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1jwzj2da.js (19)
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
import { hasPipelineReplyOrigin, hasChainPublishId } from "./autoEditAttribution.js";
import { logForDebugging } from "../../utils/debug.js";
import { OUTPUT_SIZE_LIMITS } from "../../constants/outputLimits.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1jwzj2da.js:5443-5566 placement
/**
 * 重复拒绝断路器的阈值、长度上限，以及不触发断路提示的原因码集合（登录/策略/暂时性发布错误）。
 */
var REJECT_BREAKER_THRESHOLD; // deferred: uses ARTIFACT_LOGIN_MESSAGE_LEAD (../../tools/ArtifactTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var REJECT_KEY_MAX;
var BREAKER_EXEMPT_REASONS;
deferInit("chunk-1jwzj2da.js:5443", () => {
  REJECT_BREAKER_THRESHOLD = 3;
  REJECT_KEY_MAX = 1024;
  BREAKER_EXEMPT_REASONS = new Set([
    `ec_${ARTIFACT_LOGIN_ERROR_CODE}`,
    ARTIFACT_LOGIN_REASON_CODE,
    `ec_${ARTIFACT_POLICY_UNOBTAINED_ERROR_CODE}`,
    "policy_fetch_failed",
    "policy_route_missing",
    ...Object.values(TRANSIENT_PUBLISH_REASON),
  ]);
});
//@ chunk-1jwzj2da.js:5566-5623 placement
function boundedRejectKey(value) {
  return typeof value === "string" ? value.slice(0, REJECT_KEY_MAX) : "";
}
//@ chunk-1jwzj2da.js:5623-5876 placement
function rejectKeyOf(input) {
  if (typeof input !== "object" || input === null) return "publish\x00\x00\x00";
  let action = "action" in input ? boundedRejectKey(input.action) : "";
  let filePath = "file_path" in input ? boundedRejectKey(input.file_path) : "";
  let url = "url" in input ? boundedRejectKey(input.url) : "";
  let threadId = "thread_id" in input ? boundedRejectKey(input.thread_id) : "";
  return `${action || "publish"}\x00${filePath}\x00${url}\x00${threadId}`;
}
//@ chunk-1jwzj2da.js:5876-6108 placement
/**
 * 按调用键累计同一原因、同一指纹的连续拒绝次数，达到阈值时打点 tengu_artifact_reject_breaker；返回是否已达阈值。
 */
function countRepeatedReject(input, scope, id) {
  let rejectBreaker = getLiveState().rejectBreaker;
  let key = rejectKeyOf(input);
  let state = rejectBreaker.get(key);
  let reminder =
    state !== undefined && state.reason === scope && state.fingerprint === id ? state.count + 1 : 1;
  rejectBreaker.set(key, {
    count: reminder,
    reason: scope,
    fingerprint: id,
  });
  if (reminder === REJECT_BREAKER_THRESHOLD)
    logEvent("tengu_artifact_reject_breaker", {
      reason: sanitizedMachineReasonForTelemetry(scope),
    });
  return reminder >= REJECT_BREAKER_THRESHOLD;
}
//@ chunk-1jwzj2da.js:6108-6422 placement
/**
 * 重复拒绝断路提示：同一目标因同一原因被拒多次后，告知模型不要再重发同一调用。
 */
var ARTIFACT_REJECT_BREAKER_NOTICE; // deferred: uses REJECT_BREAKER_THRESHOLD of its import cycle while loading; runs once the cycle is complete
var REJECT_NOTICE_LENGTH;
deferInit("chunk-1jwzj2da.js:6108", () => {
  ARTIFACT_REJECT_BREAKER_NOTICE = `IMPORTANT: Artifact calls for this target have now been rejected ${REJECT_BREAKER_THRESHOLD} or more times in this session for the same reason. Do not send the same call again: either make the specific change the error describes, or stop calling Artifact for this target and tell the user what is failing and why.`;
  REJECT_NOTICE_LENGTH = ARTIFACT_REJECT_BREAKER_NOTICE.length + 2;
});
//@ chunk-1jwzj2da.js:6422-6490 placement
/**
 * 导出函数 `stripRejectBreakerNotice`：参数 e，返回 e.startsWith(`${ARTIFACT_REJECT_BREAKER_NOTICE} `) ? e.slice(ARTIFACT_REJECT_BREAKER_NOTICE.length + 2) : e。
 */
function stripRejectBreakerNotice(message) {
  return message.startsWith(`${ARTIFACT_REJECT_BREAKER_NOTICE}

`)
    ? message.slice(ARTIFACT_REJECT_BREAKER_NOTICE.length + 2)
    : message;
}
//@ chunk-1jwzj2da.js:6490-6517 placement
var LIVE_EDIT_CONFLICT = "live_edit_conflict";
//@ chunk-1jwzj2da.js:6517-6619 placement
/**
 * 同一调用因同一原因（live-edit 冲突还结合操作目标）被连续拒绝达到阈值且原因不在豁免表时，在错误消息前加"断路"提示。
 */
function withRejectBreakerNotice(input, message, messageText) {
  let stripped = stripRejectBreakerNotice(message);
  let reminder =
    messageText === LIVE_EDIT_CONFLICT
      ? shortHash(stripped + liveEditTargetsKey(input, stripped))
      : shortHash(stripped);
  return countRepeatedReject(input, messageText, reminder) && !BREAKER_EXEMPT_REASONS.has(messageText)
    ? `${ARTIFACT_REJECT_BREAKER_NOTICE}

${stripped}`
    : stripped;
}
//@ chunk-1jwzj2da.js:6619-7056 placement
/**
 * 为 live-edit 操作生成目标键（按错误消息中的 ops 下标只取对应操作），用于识别反复失败的同类编辑；不是 live-edit 返回空串。
 */
function liveEditTargetsKey(input, path) {
  if (
    typeof input !== "object" ||
    input === null ||
    !("action" in input) ||
    input.action !== "live-edit" ||
    !("ops" in input) ||
    !Array.isArray(input.ops)
  )
    return "";
  let match = /\bops\[(\d+)\]/.exec(path);
  let ops = match === null ? input.ops : [input.ops[Number.parseInt(match[1], 10)]];
  let keys = new Set();
  for (let op of ops) {
    if (typeof op !== "object" || op === null) continue;
    for (let field of ["target", "before", "after", "parent"])
      if (field in op) {
        let key = boundedRejectKey(op[field]);
        if (key !== "") keys.add(key);
      }
  }
  return keys.size === 0 ? "" : `\x00${[...keys].sort().join("\x00")}`;
}
//@ chunk-1jwzj2da.js:7056-7071 placement
var SCHEMA = "schema";
//@ chunk-1jwzj2da.js:7071-7275 placement (2.1.88 match: isUnrecognizedKeysIssue, 0.804)
function isUnrecognizedKeysIssue(issue) {
  if (issue === undefined) return "";
  return issue.issues
    .map((issue) => {
      let keys = issue.code === "unrecognized_keys" ? [...issue.keys].sort().join(",") : "";
      return `${issue.code}:${issue.path.map(String).join(".")}:${keys}`;
    })
    .sort()
    .join("|");
}
//@ chunk-1jwzj2da.js:7275-7329 placement
function isBreakerEligibleCall(input) {
  return hasPipelineReplyOrigin(input.toolUseId) || hasChainPublishId(input.toolUseId);
}
//@ chunk-1jwzj2da.js:7329-7687 placement
/**
 * 包装 Artifact 工具：校验错误引导、validateInput 与 call 都加上重复拒绝断路提示（无人值守时不改消息），其余属性原样保留。
 */
function wrapToolWithRejectBreaker(tool, options = {}) {
  let { validationErrorSteer, validateInput, call: original } = tool;
  let wrapped = {
    validationErrorSteer: (input, issue) =>
      schemaSteerWithBreaker(
        input,
        issue,
        options.schemaSteerOverride?.(input) ?? null,
        validationErrorSteer?.(input, issue) ?? null,
      ),
    ...(validateInput !== undefined && {
      validateInput: wrapValidateInput(validateInput, options.onValidateReject),
    }),
    call: wrapToolCall(original),
  };
  return Object.defineProperties(
    Object.defineProperties({}, Object.getOwnPropertyDescriptors(tool)),
    Object.getOwnPropertyDescriptors(wrapped),
  );
}
//@ chunk-1jwzj2da.js:7687-7849 placement
function schemaSteerWithBreaker(input, issue, issueArg, options) {
  let key = (issueArg !== null ? "override|" : "") + isUnrecognizedKeysIssue(issue);
  let count = countRepeatedReject(input, SCHEMA, key);
  if (issueArg !== null) return issueArg;
  let joined = [count ? ARTIFACT_REJECT_BREAKER_NOTICE : null, options].filter((value) => value !== null)
    .join(`

`);
  return joined === "" ? null : joined;
}
//@ chunk-1jwzj2da.js:7849-8145 placement
function wrapValidateInput(validateInput, onValidateReject) {
  return async (input, options) => {
    let result = await validateInput(input, options);
    if (result.result) return result;
    let eligible = isBreakerEligibleCall(options);
    try {
      onValidateReject?.(
        input,
        {
          ...result,
        },
        {
          unattended: eligible,
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
    if (eligible) return result;
    return {
      ...result,
      message: withRejectBreakerNotice(input, result.message, `ec_${result.errorCode}`),
    };
  };
}
//@ chunk-1jwzj2da.js:8145-8342 placement
function wrapToolCall(tool) {
  return async (input, options, ...rest) => {
    if (isBreakerEligibleCall(options)) return tool(input, options, ...rest);
    let out;
    try {
      out = await tool(input, options, ...rest);
    } catch (error) {
      if (error instanceof ArtifactInputError)
        error.message = withRejectBreakerNotice(input, error.message, error.reasonCode ?? "unknown");
      throw error;
    }
    clearBreaker();
    return out;
  };
}
//@ chunk-1jwzj2da.js:8342-8382 placement
function clearBreaker() {
  getLiveState().rejectBreaker.clear();
}
//@ chunk-1jwzj2da.js:8418-8442 placement
/**
 * 导出常量或表 `MAX_REJECT_KEY_CHARS`：值为 1e5, Cbn = OUTPUT_SIZE_LIMITS - 2000。
 */
var MAX_REJECT_KEY_CHARS = 1e5;
var BREAKER_OUTPUT_LIMIT = OUTPUT_SIZE_LIMITS - 2000;
//@ chunk-1jwzj2da.js:8442-8488 placement
/**
 * 导出函数 `statusText`：参数 e，返回 STATUS_CODES[e] ?? "Unknown Status"; } export { Ekt, Tnr, yie, Cbn, withRejectBreakerNotice, wrapToolWithRejec…。
 */
function statusText(status) {
  return STATUS_CODES[status] ?? "Unknown Status";
}
export {
  withRejectBreakerNotice,
  REJECT_NOTICE_LENGTH,
  wrapToolWithRejectBreaker,
  stripRejectBreakerNotice,
  MAX_REJECT_KEY_CHARS,
  BREAKER_OUTPUT_LIMIT,
  statusText,
};
