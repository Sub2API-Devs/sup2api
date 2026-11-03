/**
 * plugins/functionHooks/sites/agentSites.ts
 *
 * 钩子站点规则：agent.offer/agent.spawn（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (13)
 * attribution: placement 13
 */
import { isAbsolute, isAbsolute as isAbsolute_2, isAbsolute as isAbsolute_3 } from "path";
import {
  restoreMissingKeys,
  checkPinnedKeys,
  M,
  checkPinnedKeysWith,
  checkValueOrDeny,
  denyAfterNext,
} from "./siteRules.js";
import { CSi } from "../builtinHooksModule.js";

//@ chunk-4121qate.js:205042-205597 placement
var AGENT_OFFER_SITE = {
  event: "agent.offer",
  restoreArgument: (e, o) => restoreMissingKeys(["provider"], e, o),
  checkArgument: (e, o) => {
    if (typeof e.agent !== "string") return "no { agent }";
    if (e.agent !== o.agent) return "a changed agent (the hooks beneath match on it)";
    if (typeof e.description !== "string") return "no { description }";
    if (e.source !== o.source) return "a changed source (the hooks beneath match on it)";
    return checkPinnedKeys(["provider"], e, o) === void 0
      ? void 0
      : "a changed provider (pinned: who provides the agent is a fact)";
  },
  check: M((e) => (typeof e.isOffered === "boolean" ? void 0 : "no { isOffered } (a boolean)")),
};
/**
 * agent.spawn 中不可被钩子改写的身份字段（tool_use_id、name、fork、isTeammate、workflow、resume、父模型、权限模式、父代理、提供者）。
 */
//@ chunk-4121qate.js:205597-205726 placement
var AGENT_SPAWN_PINNED_KEYS = [
  "tool_use_id",
  "name",
  "fork",
  "isTeammate",
  "workflow",
  "resume",
  "parentModel",
  "permissionMode",
  "parentAgentId",
  "provider",
];
//@ chunk-4121qate.js:205726-205795 placement
var ep = ["isTeammate", "workflow", "resume", "parentAgentId", "provider"];
//@ chunk-4121qate.js:205830-206436 placement
function checkAgentSpawnPrompt(e, o) {
  let { prompt: prompt, model: model, cwd: cwd } = e;
  return [
    ["prompt", typeof prompt === "string" && prompt.trim() !== "", "no { prompt } (a non-empty string)"],
    ["description", typeof e.description === "string", "a description that is not a string"],
    ["subagentType", typeof e.subagentType === "string", "a subagentType that is not a string"],
    [
      "model",
      model === void 0 || typeof model === "string",
      "a model that is neither a string nor undefined",
    ],
    ["background", typeof e.background === "boolean", "a background that is not a boolean"],
    [
      "cwd",
      cwd === void 0 || (typeof cwd === "string" && isAbsolute_3(cwd)),
      "a cwd that is not an absolute path",
    ],
  ].find(([p, f]) => !f && e[p] !== o[p])?.[2];
}
//@ chunk-4121qate.js:206436-206510 placement
var op = ["prompt", "description", "subagentType", "model", "background", "cwd"];
//@ chunk-4121qate.js:206510-206538 placement
var rp = ["background", "cwd"];
//@ chunk-4121qate.js:206538-206595 placement
var np = ["description", "subagentType", "background", "cwd"];
/**
 * 恢复、工作流、队友三类派生各自不可改写的字段集合。
 */
//@ chunk-4121qate.js:206595-206772 placement
function spawnKindKeys(e) {
  let o = e.resume !== void 0,
    r = e.workflow !== void 0,
    n = e.isTeammate === !0;
  return o
    ? { keys: op, kind: "resume" }
    : r
      ? { keys: np, kind: "workflow" }
      : n
        ? { keys: rp, kind: "teammate" }
        : void 0;
}
/**
 * 恢复派生类型的固定字段（钩子改动时还原）。
 */
//@ chunk-4121qate.js:206772-206907 placement
function restoreSpawnKindKeys(e, o) {
  let r = spawnKindKeys(o);
  return r !== void 0 && r.keys.some((key) => e[key] !== o[key])
    ? Object.assign({ ...e }, ...r.keys.map((key) => ({ [key]: o[key] })))
    : e;
}
//@ chunk-4121qate.js:206907-207349 placement
function checkResumedAgentRefusal(e, o) {
  let r = spawnKindKeys(o);
  if (r === void 0) return;
  let mapped = r.keys.filter((key) => Object.hasOwn(e, key) && e[key] !== o[key]).map((p) => `\`${p}\``);
  if (mapped.length === 0) return;
  let s = mapped.length > 1,
    joined = mapped.join(", ");
  switch (r.kind) {
    case "resume":
      return `${joined} ${s ? "were" : "was"} ignored: a hook can only refuse a resumed agent's run`;
    case "teammate":
      return `${joined} ${s ? "do" : "does"} not apply to a teammate`;
    case "workflow":
      return `${joined} ${s ? "do" : "does"} not apply to a workflow agent`;
  }
}
/**
 * agent.spawn 站点规则：恢复与校验固定身份字段与提示词，结果须带 model 或 deny。
 */
//@ chunk-4121qate.js:207349-207693 placement
var AGENT_SPAWN_SITE = {
  event: "agent.spawn",
  unappliedArgument: checkResumedAgentRefusal,
  restoreArgument: (e, o) => restoreSpawnKindKeys(restoreMissingKeys(ep, e, o), o),
  checkArgument(e, o) {
    return (
      checkPinnedKeysWith({
        keys: AGENT_SPAWN_PINNED_KEYS,
        passed: e,
        received: o,
        explanation: `the identity of the spawn and its parent is pinned; a rewrite keeps ${AGENT_SPAWN_PINNED_KEYS.join(", ")}`,
      }) ?? checkAgentSpawnPrompt(e, o)
    );
  },
  check: M(
    (e, o, r) =>
      checkValueOrDeny(e, "{ model }", (n) => typeof n.model === "string") ?? denyAfterNext("deny", e, r),
  ),
};
//@ chunk-4121qate.js:207693-207783 placement
function pp(e, o) {
  let { ceiling: ceiling, ...n } = e,
    { ceiling: ceiling_2 } = o;
  return ceiling_2 === void 0 ? n : { ...n, ceiling: ceiling_2 };
}
//@ chunk-4121qate.js:207783-207816 placement
var ap = (e) => CSi.some((o) => o === e);

export {
  AGENT_OFFER_SITE,
  AGENT_SPAWN_SITE,
  AGENT_SPAWN_PINNED_KEYS,
  ep,
  op,
  rp,
  np,
  pp,
  spawnKindKeys,
  ap,
  checkAgentSpawnPrompt,
  restoreSpawnKindKeys,
  checkResumedAgentRefusal,
};
