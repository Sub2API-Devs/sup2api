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
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-vx0qz0bd.js:409-461 placement
var c = Symbol("isolationDispatchGate.mintedReentry");
/**
 * isolatePeerMachines 开启时发消息前询问，并检查权限处理器是否改动接收方/输入形状。
 */
//@ chunk-vx0qz0bd.js:461-2173 placement
async function isolationDispatchGate({
  tool: tool,
  input: input,
  ask: ask,
  permissionPhase: permissionPhase,
  alreadyApproved: alreadyApproved,
  recipientLabel: recipientLabel,
  resolution: resolution,
  askUnconditionally: askUnconditionally = !1,
  parse: parse,
}) {
  if (!((askUnconditionally || hasIsolatePeerMachines()) && !alreadyApproved))
    return { proceed: !0, input: input, asked: !1 };
  let u = {
    ...permissionPhase,
    ...(resolution !== void 0 && { dispatchResolution: { input: input, note: resolution } }),
  };
  Object.defineProperty(u, c, { value: !0, configurable: !0 });
  let h = randomUUID(),
    f = parkOnUser(),
    t;
  try {
    t = await ask(input, { toolUseId: h, reentry: u });
  } finally {
    (f(), Reflect.deleteProperty(u, c));
  }
  if (t.behavior !== "allow")
    return {
      proceed: !1,
      asked: !0,
      reason: "denied",
      message:
        t.behavior === "deny" && t.message
          ? t.message
          : askUnconditionally
            ? `Sending to ${recipientLabel} needs your approval \u2014 nothing was sent.`
            : `isolatePeerMachines is enabled: sending to ${recipientLabel} needs your approval \u2014 nothing was sent.`,
      ...(t.behavior === "deny" && t.decisionReason && { decisionReason: t.decisionReason }),
    };
  if (t.updatedInput === void 0 || isEmptyObject(t.updatedInput))
    return {
      proceed: !0,
      input: input,
      asked: !0,
      ...(t.decisionReason && { decisionReason: t.decisionReason }),
    };
  let d = isUnrecognizedKeysIssue(parse, t.updatedInput);
  if (!d.success)
    return {
      proceed: !1,
      asked: !0,
      reason: "bad_shape",
      message: `The permission handler narrowed the input to a shape ${tool.name} does not accept \u2014 nothing was sent.`,
    };
  if (d.data.to !== input.to)
    return {
      proceed: !1,
      asked: !0,
      reason: "recipient_changed",
      message: `The permission handler changed the recipient (from ${recipientLabel}) after this send was resolved \u2014 nothing was sent. Send again to the recipient you intend.`,
    };
  if (d.data.message !== void 0 && typeof d.data.message !== "string")
    return {
      proceed: !1,
      asked: !0,
      reason: "non_text_message",
      message:
        "The permission handler rewrote the message into a structured (non-text) form, which cannot be sent to another session \u2014 nothing was sent.",
    };
  return {
    proceed: !0,
    input: d.data,
    asked: !0,
    ...(t.decisionReason && { decisionReason: t.decisionReason }),
  };
}
/**
 * 判断权限阶段是否已对相同输入询问过（且符合给定条件）。
 */
//@ chunk-vx0qz0bd.js:2173-2380 placement
function wasAskedForSameInput(e, n, o, s) {
  let i = e.permissionPhase?.pipeline;
  if (i === void 0) return !1;
  let r = i.result.behavior === "ask" ? i.result : i.answered;
  if (r === void 0 || r.behavior !== "ask" || !s(r)) return !1;
  return a(o(i.input), o(n));
}
/**
 * 若输入与已检查的输入相同，返回已有的检查结果。
 */
//@ chunk-vx0qz0bd.js:2380-2496 placement
function getCheckedResultForInput(e, n, o) {
  let s = e.permissionPhase?.checked;
  if (s === void 0) return;
  return a(o(s.input), o(n)) ? s.result : void 0;
}
/**
 * 若输入与已检查的输入相同，返回检查附带的说明。
 */
//@ chunk-vx0qz0bd.js:2496-2625 placement
function getCheckedNoteForInput(e, n, o) {
  let s = e.permissionPhase?.checked;
  if (s === void 0 || !("note" in s)) return;
  return a(o(s.input), o(n)) ? s.note : void 0;
}
/**
 * 输入被改写后，把权限阶段中与原输入相同的记录改为新输入。
 */
//@ chunk-vx0qz0bd.js:2625-2861 placement
function rebasePermissionPhase(e, n, o, s) {
  if (e === void 0) return;
  let i = s(n),
    r = { ...e };
  if (e.checked !== void 0 && a(s(e.checked.input), i)) r.checked = { ...e.checked, input: o };
  if (e.pipeline !== void 0 && a(s(e.pipeline.input), i)) r.pipeline = { ...e.pipeline, input: o };
  return r;
}
/**
 * 若输入与派发解析时相同，返回派发说明。
 */
//@ chunk-vx0qz0bd.js:2861-2986 placement
function getDispatchNoteForInput(e, n, o) {
  let s = e.permissionPhase?.dispatchResolution;
  if (s === void 0) return;
  return a(o(s.input), o(n)) ? s.note : void 0;
}
/**
 * 权限阶段是否已有重入标记。
 */
//@ chunk-vx0qz0bd.js:2986-3064 placement
function hasMintedReentry(e) {
  let permissionPhase = e.permissionPhase;
  return permissionPhase !== void 0 && Object.hasOwn(permissionPhase, c);
}
/**
 * 判断权限结果是否为"隔离对等机器"熔断引起的询问。
 */
//@ chunk-vx0qz0bd.js:3064-3203 placement
function isIsolatePeerAsk(e) {
  return (
    e.behavior === "ask" &&
    e.decisionReason?.type === "safetyCheck" &&
    e.decisionReason.circuitBreaker === "isolatePeerMachines"
  );
}
//@ chunk-vx0qz0bd.js:3203-3238 placement
function a(e, n) {
  return jsonStringify(e) === jsonStringify(n);
}
//@ chunk-vx0qz0bd.js:3238-3521 placement = isUnrecognizedKeysIssue (0.804)
function isUnrecognizedKeysIssue(e, n) {
  let o = e(n);
  if (o.success || o.error === void 0) return o;
  let s = new Set();
  for (let issue of o.error.issues) {
    if (issue.code !== "unrecognized_keys" || issue.path.length > 0) return o;
    for (let key of issue.keys) s.add(key);
  }
  if (s.size === 0 || typeof n !== "object" || n === null) return o;
  return e(wi(n, (i, r) => s.has(r)));
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
