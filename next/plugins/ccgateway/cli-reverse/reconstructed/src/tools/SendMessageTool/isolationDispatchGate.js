/**
 * tools/SendMessageTool/isolationDispatchGate.ts
 *
 * 2.1.316 新增：isolatePeerMachines 开启时发消息前询问，并检查权限处理器是否改动接收方/输入形状；权限阶段是否已有重入标记。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vx0qz0bd.js (11)
 * attribution: placement 11
 */
import { randomUUID } from "crypto";
import { hasIsolatePeerMachines } from "../../utils/settings/settings.js";
import { parkOnUser } from "../../utils/sessionActivity.js";
import { isEmptyObject } from "../../utils/toolInputPlaceholder.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vx0qz0bd.js:409-461 placement
/**
 * 标记“本次权限阶段由隔离闸门自己铸造”的 Symbol。
 */
var MINTED_REENTRY_SYMBOL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vx0qz0bd.js:409", () => {
  MINTED_REENTRY_SYMBOL = Symbol("isolationDispatchGate.mintedReentry");
});
//@ chunk-vx0qz0bd.js:461-2173 placement
/**
 * isolatePeerMachines 开启时发消息前询问，并检查权限处理器是否改动接收方/输入形状。
 */
async function isolationDispatchGate({
  tool,
  input,
  ask,
  permissionPhase,
  alreadyApproved,
  recipientLabel,
  resolution,
  askUnconditionally = false,
  parse,
}) {
  if (!((askUnconditionally || hasIsolatePeerMachines()) && !alreadyApproved))
    return {
      proceed: true,
      input,
      asked: false,
    };
  let reentryContext = {
    ...permissionPhase,
    ...(resolution !== undefined && {
      dispatchResolution: {
        input,
        note: resolution,
      },
    }),
  };
  Object.defineProperty(reentryContext, MINTED_REENTRY_SYMBOL, {
    value: true,
    configurable: true,
  });
  let toolUseId = randomUUID();
  let releasePark = parkOnUser();
  let decision;
  try {
    decision = await ask(input, {
      toolUseId,
      reentry: reentryContext,
    });
  } finally {
    releasePark();
    Reflect.deleteProperty(reentryContext, MINTED_REENTRY_SYMBOL);
  }
  if (decision.behavior !== "allow")
    return {
      proceed: false,
      asked: true,
      reason: "denied",
      message:
        decision.behavior === "deny" && decision.message
          ? decision.message
          : askUnconditionally
            ? `Sending to ${recipientLabel} needs your approval \u2014 nothing was sent.`
            : `isolatePeerMachines is enabled: sending to ${recipientLabel} needs your approval \u2014 nothing was sent.`,
      ...(decision.behavior === "deny" &&
        decision.decisionReason && {
          decisionReason: decision.decisionReason,
        }),
    };
  if (decision.updatedInput === undefined || isEmptyObject(decision.updatedInput))
    return {
      proceed: true,
      input,
      asked: true,
      ...(decision.decisionReason && {
        decisionReason: decision.decisionReason,
      }),
    };
  let narrowedInput = isUnrecognizedKeysIssue(parse, decision.updatedInput);
  if (!narrowedInput.success)
    return {
      proceed: false,
      asked: true,
      reason: "bad_shape",
      message: `The permission handler narrowed the input to a shape ${tool.name} does not accept \u2014 nothing was sent.`,
    };
  if (narrowedInput.data.to !== input.to)
    return {
      proceed: false,
      asked: true,
      reason: "recipient_changed",
      message: `The permission handler changed the recipient (from ${recipientLabel}) after this send was resolved \u2014 nothing was sent. Send again to the recipient you intend.`,
    };
  if (narrowedInput.data.message !== undefined && typeof narrowedInput.data.message !== "string")
    return {
      proceed: false,
      asked: true,
      reason: "non_text_message",
      message:
        "The permission handler rewrote the message into a structured (non-text) form, which cannot be sent to another session \u2014 nothing was sent.",
    };
  return {
    proceed: true,
    input: narrowedInput.data,
    asked: true,
    ...(decision.decisionReason && {
      decisionReason: decision.decisionReason,
    }),
  };
}
//@ chunk-vx0qz0bd.js:2173-2380 placement
/**
 * 判断权限阶段是否已对相同输入询问过（且符合给定条件）。
 */
function wasAskedForSameInput(deps, input, dedupeKey, isIsolatePeerAsk) {
  let pipeline = deps.permissionPhase?.pipeline;
  if (pipeline === undefined) return false;
  let askResult = pipeline.result.behavior === "ask" ? pipeline.result : pipeline.answered;
  if (askResult === undefined || askResult.behavior !== "ask" || !isIsolatePeerAsk(askResult)) return false;
  return sameJson(dedupeKey(pipeline.input), dedupeKey(input));
}
//@ chunk-vx0qz0bd.js:2380-2496 placement
/**
 * 若输入与已检查的输入相同，返回已有的检查结果。
 */
function getCheckedResultForInput(deps, input, sendFileDedupeKey) {
  let checked = deps.permissionPhase?.checked;
  if (checked === undefined) return;
  return sameJson(sendFileDedupeKey(checked.input), sendFileDedupeKey(input)) ? checked.result : undefined;
}
//@ chunk-vx0qz0bd.js:2496-2625 placement
/**
 * 若输入与已检查的输入相同，返回检查附带的说明。
 */
function getCheckedNoteForInput(deps, input, dedupeKey) {
  let checked = deps.permissionPhase?.checked;
  if (checked === undefined || !("note" in checked)) return;
  return sameJson(dedupeKey(checked.input), dedupeKey(input)) ? checked.note : undefined;
}
//@ chunk-vx0qz0bd.js:2625-2861 placement
/**
 * 输入被改写后，把权限阶段中与原输入相同的记录改为新输入。
 */
function rebasePermissionPhase(permissionPhase, previousInput, input, getToAndMessageFields) {
  if (permissionPhase === undefined) return;
  let toAndMessage = getToAndMessageFields(previousInput);
  let rebased = {
    ...permissionPhase,
  };
  if (
    permissionPhase.checked !== undefined &&
    sameJson(getToAndMessageFields(permissionPhase.checked.input), toAndMessage)
  )
    rebased.checked = {
      ...permissionPhase.checked,
      input,
    };
  if (
    permissionPhase.pipeline !== undefined &&
    sameJson(getToAndMessageFields(permissionPhase.pipeline.input), toAndMessage)
  )
    rebased.pipeline = {
      ...permissionPhase.pipeline,
      input,
    };
  return rebased;
}
//@ chunk-vx0qz0bd.js:2861-2986 placement
/**
 * 若输入与派发解析时相同，返回派发说明。
 */
function getDispatchNoteForInput(deps, input, getToField) {
  let dispatchResolution = deps.permissionPhase?.dispatchResolution;
  if (dispatchResolution === undefined) return;
  return sameJson(getToField(dispatchResolution.input), getToField(input))
    ? dispatchResolution.note
    : undefined;
}
//@ chunk-vx0qz0bd.js:2986-3064 placement
/**
 * 权限阶段是否已有重入标记。
 */
function hasMintedReentry(deps) {
  let permissionPhase = deps.permissionPhase;
  return permissionPhase !== undefined && Object.hasOwn(permissionPhase, MINTED_REENTRY_SYMBOL);
}
//@ chunk-vx0qz0bd.js:3064-3203 placement
/**
 * 判断权限结果是否为"隔离对等机器"熔断引起的询问。
 */
function isIsolatePeerAsk(result) {
  return (
    result.behavior === "ask" &&
    result.decisionReason?.type === "safetyCheck" &&
    result.decisionReason.circuitBreaker === "isolatePeerMachines"
  );
}
//@ chunk-vx0qz0bd.js:3203-3238 placement
/**
 * 比较两个值序列化后是否相同（判断输入是否被改写）。
 */
function sameJson(left, right) {
  return jsonStringify(left) === jsonStringify(right);
}
//@ chunk-vx0qz0bd.js:3238-3521 placement = isUnrecognizedKeysIssue (0.804)
function isUnrecognizedKeysIssue(parse, updatedInput) {
  let parsed = parse(updatedInput);
  if (parsed.success || parsed.error === undefined) return parsed;
  let unrecognizedKeys = new Set();
  for (let issue of parsed.error.issues) {
    if (issue.code !== "unrecognized_keys" || issue.path.length > 0) return parsed;
    for (let key of issue.keys) unrecognizedKeys.add(key);
  }
  if (unrecognizedKeys.size === 0 || typeof updatedInput !== "object" || updatedInput === null) return parsed;
  return parse(import_reject(updatedInput, (value, key) => unrecognizedKeys.has(key)));
}
export {
  hasMintedReentry,
  getDispatchNoteForInput,
  wasAskedForSameInput,
  isIsolatePeerAsk,
  isolationDispatchGate,
  getCheckedNoteForInput,
  rebasePermissionPhase,
  getCheckedResultForInput,
};
