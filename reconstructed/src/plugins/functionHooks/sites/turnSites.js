/**
 * plugins/functionHooks/sites/turnSites.ts
 *
 * 钩子站点规则：turn.start/step/complete（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (10)
 * attribution: placement 10
 */
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { Sr, keepLongTexts, Hs, Ie, checkPinnedKeys, M } from "./siteRules.js";
import { _r } from "./promptContextSites.js";
import { EFFORT_LEVELS } from "../../../utils/effort.js";

//@ chunk-4121qate.js:213329-213458 placement
var STOP_REASONS = [
  "end_turn",
  "max_tokens",
  "stop_sequence",
  "tool_use",
  "pause_turn",
  "compaction",
  "refusal",
  "model_context_window_exceeded",
];
//@ chunk-4121qate.js:213458-213596 placement = getTokenCountFromUsage (0.911)
var getTokenCountFromUsage_2 = (usage) =>
  isPlainObject(usage) &&
  [
    usage.input_tokens,
    usage.output_tokens,
    usage.cache_read_input_tokens,
    usage.cache_creation_input_tokens,
  ].every((o) => Number.isFinite(o));
/**
 * 按种类校验 turn.step 流的块：text/thinking、tool、input、stop（停止原因与用量）、engine（引用不可改）。
 */
//@ chunk-4121qate.js:213596-214347 placement
function checkTurnStepChunkFields(e) {
  let o = typeof e.index === "number" && e.index >= 0;
  switch (e.kind) {
    case "text":
    case "thinking":
      return o && typeof e.text === "string" ? void 0 : "{ index, text }";
    case "tool":
      return o && typeof e.id === "string" && /^[\w-]+$/.test(e.id) && typeof e.name === "string"
        ? void 0
        : "{ index, id, name } (an id of letters, digits, _ or -)";
    case "input":
      return o && typeof e.json === "string" ? void 0 : "{ index, json } (json a string)";
    case "stop": {
      let r = e.stopReason === null || STOP_REASONS.some((i) => i === e.stopReason),
        n = e.usage === null || getTokenCountFromUsage_2(e.usage);
      return r && n ? void 0 : "{ stopReason, usage } (usage null, or its four token counts)";
    }
    case "engine":
      return typeof e.ref === "number" ? void 0 : "ref (pass engine chunks on unchanged)";
    default:
      return "known kind (text, thinking, tool, input, stop, engine)";
  }
}
/**
 * 描述 turn.step 块的问题（不是对象或字段不符合种类）。
 */
//@ chunk-4121qate.js:214347-214517 placement
function describeTurnStepChunkProblem(e) {
  if (!isPlainObject(e)) return `no kind (a chunk is an object; got ${e === null ? "null" : typeof e})`;
  let o = checkTurnStepChunkFields(e);
  return o === void 0 ? void 0 : `kind ${String(e.kind)} but no ${o}`;
}
/**
 * 取引擎块的引用与种类。
 */
//@ chunk-4121qate.js:214517-214629 placement
function engineChunkRef(e) {
  if (!isPlainObject(e)) return;
  let { ref: ref, kind: kind } = e;
  return typeof ref === "number" && typeof kind === "string" ? [ref, kind] : void 0;
}
//@ chunk-4121qate.js:214629-214720 placement
function Tp(e) {
  let o = isPlainObject(e) && e.kind === "tool" ? e.id : void 0;
  return typeof o === "string" ? o : void 0;
}
//@ chunk-4121qate.js:214720-215323 placement
function checkTurnStepChunk() {
  let e = new Map(),
    o = new Set(),
    r = new Set();
  function n(i) {
    if (e.get(i) !== "engine")
      return "kind engine but a ref this link never pulled as an engine chunk (pass engine chunks on unchanged)";
    if (o.has(i)) return "kind engine but a ref already passed on (pass each on once)";
    o.add(i);
    return;
  }
  function s(i) {
    if (r.has(i)) return `kind tool but an id this step already used (${i})`;
    r.add(i);
    return;
  }
  return {
    pulled: (i) => {
      let p = engineChunkRef(i);
      if (p !== void 0) e.set(p[0], p[1]);
    },
    yielded: (i, p) => {
      let f = p ? void 0 : describeTurnStepChunkProblem(i);
      if (f !== void 0) return f;
      let a = engineChunkRef(i);
      if (a?.[1] === "engine") return n(a[0]);
      let m = Tp(i);
      return m === void 0 ? void 0 : s(m);
    },
  };
}
//@ chunk-4121qate.js:215323-215740 placement
var TURN_COMPLETE_SITE = {
  ...Sr({
    event: "turn.complete",
    check: (e) => (typeof e.text === "string" ? void 0 : "no { text }"),
    checkArgument: (e, o) => {
      if (typeof e.answer !== "string") return "no { answer }";
      return e.agentId === o.agentId ? void 0 : "a changed agentId (the loop the turn ran in is pinned)";
    },
  }),
  keptResult: (e, o, r) => keepLongTexts(e, ["text"], [{ text: o.answer }, ...r]),
  unappliedArgument: (e, o) => keepLongTexts(e, ["answer"], [o])?.why,
  restoreArgument: _r(["agentId"], ["answer"]),
};
/**
 * turn.start 站点规则：agentId 不可改。
 */
//@ chunk-4121qate.js:215740-215954 placement
var TURN_START_SITE = {
  ...Sr({
    event: "turn.start",
    check: Hs,
    checkArgument: (e, o) => {
      let r = e.agentId === o.agentId;
      return Hs(e, o) ?? (r ? void 0 : "a changed agentId (the loop the turn runs in is pinned)");
    },
  }),
  restoreArgument: Ie(["agentId"]),
};
//@ chunk-4121qate.js:215954-216757 placement
var TURN_STEP_SITE = {
  event: "turn.step",
  chunkChecker: checkTurnStepChunk,
  restoreArgument: Ie(["agentId"]),
  checkArgument: (e, o) => {
    let r = checkPinnedKeys(["turnId", "index", "messageCount", "agentId"], e, o);
    if (r !== void 0) return r;
    let { model: model, effort: effort } = e;
    if (!(typeof model === "string" && model.trim() !== "")) return "no { model } (a non-empty model name)";
    let p = !1;
    return effort === void 0 ||
      effort === o.effort ||
      (typeof effort === "number" && p) ||
      EFFORT_LEVELS.some((a) => a === effort)
      ? void 0
      : `an effort that is not one of ${EFFORT_LEVELS.join(", ")}` +
          (p ? " or a number" : " (a number is internal-only)");
  },
  check: M((e, o) => {
    if (!(e.turnId === o.turnId && e.index === o.index))
      return "a { turnId, index } other than the step it answers for";
    if (!(typeof e.answer === "string" && Array.isArray(e.toolUses))) return "no { answer, toolUses }";
    let { serverToolUses: serverToolUses } = e;
    return serverToolUses === void 0 || Array.isArray(serverToolUses)
      ? void 0
      : "a serverToolUses that is not a list";
  }),
};

export {
  STOP_REASONS,
  TURN_COMPLETE_SITE,
  TURN_START_SITE,
  TURN_STEP_SITE,
  checkTurnStepChunk,
  describeTurnStepChunkProblem,
  checkTurnStepChunkFields,
  getTokenCountFromUsage_2,
  engineChunkRef,
  Tp,
};
