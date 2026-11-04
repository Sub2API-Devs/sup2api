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
import { isAbsolute } from "path";
import {
  restoreMissingKeys_2,
  checkPinnedKeys,
  checkResultObject,
  checkPinnedKeysWith,
  checkValueOrDeny,
  denyAfterNext,
} from "./siteRules.js";
import { DECISION_ORDER } from "../builtinHooksModule.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4121qate.js:205042-205597 placement
var AGENT_OFFER_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:205042", () => {
  AGENT_OFFER_SITE = {
    event: "agent.offer",
    restoreArgument: (passed, received) => restoreMissingKeys_2(["provider"], passed, received),
    checkArgument: (passed, received) => {
      if (typeof passed.agent !== "string") return "no { agent }";
      if (passed.agent !== received.agent) return "a changed agent (the hooks beneath match on it)";
      if (typeof passed.description !== "string") return "no { description }";
      if (passed.source !== received.source) return "a changed source (the hooks beneath match on it)";
      return checkPinnedKeys(["provider"], passed, received) === undefined
        ? undefined
        : "a changed provider (pinned: who provides the agent is a fact)";
    },
    check: checkResultObject((result) =>
      typeof result.isOffered === "boolean" ? undefined : "no { isOffered } (a boolean)",
    ),
  };
});
//@ chunk-4121qate.js:205597-205726 placement
/**
 * agent.spawn 中不可被钩子改写的身份字段（tool_use_id、name、fork、isTeammate、workflow、resume、父模型、权限模式、父代理、提供者）。
 */
var AGENT_SPAWN_PINNED_KEYS_2 = [
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
/**
 * agent.offer 固定键
 */
var AGENT_OFFER_PINNED_KEYS = ["isTeammate", "workflow", "resume", "parentAgentId", "provider"];
//@ chunk-4121qate.js:205830-206436 placement
function checkAgentSpawnPrompt(args, received) {
  let { prompt, model, cwd } = args;
  return [
    ["prompt", typeof prompt === "string" && prompt.trim() !== "", "no { prompt } (a non-empty string)"],
    ["description", typeof args.description === "string", "a description that is not a string"],
    ["subagentType", typeof args.subagentType === "string", "a subagentType that is not a string"],
    [
      "model",
      model === undefined || typeof model === "string",
      "a model that is neither a string nor undefined",
    ],
    ["background", typeof args.background === "boolean", "a background that is not a boolean"],
    [
      "cwd",
      cwd === undefined || (typeof cwd === "string" && isAbsolute(cwd)),
      "a cwd that is not an absolute path",
    ],
  ].find(([key, isValid]) => !isValid && args[key] !== received[key])?.[2];
}
//@ chunk-4121qate.js:206436-206510 placement
/**
 * agent.spawn 固定键
 */
var AGENT_SPAWN_PINNED_KEYS = ["prompt", "description", "subagentType", "model", "background", "cwd"];
//@ chunk-4121qate.js:206510-206538 placement
/**
 * background/cwd
 */
var AGENT_SPAWN_BACKGROUND_KEYS = ["background", "cwd"];
//@ chunk-4121qate.js:206538-206595 placement
/**
 * 恢复可改键
 */
var AGENT_SPAWN_RESUME_KEYS = ["description", "subagentType", "background", "cwd"];
//@ chunk-4121qate.js:206595-206772 placement
/**
 * 恢复、工作流、队友三类派生各自不可改写的字段集合。
 */
function spawnKindKeys(args) {
  let isResume = args.resume !== undefined;
  let isWorkflow = args.workflow !== undefined;
  let isTeammate = args.isTeammate === true;
  return isResume
    ? {
        keys: AGENT_SPAWN_PINNED_KEYS,
        kind: "resume",
      }
    : isWorkflow
      ? {
          keys: AGENT_SPAWN_RESUME_KEYS,
          kind: "workflow",
        }
      : isTeammate
        ? {
            keys: AGENT_SPAWN_BACKGROUND_KEYS,
            kind: "teammate",
          }
        : undefined;
}
//@ chunk-4121qate.js:206772-206907 placement
/**
 * 恢复派生类型的固定字段（钩子改动时还原）。
 */
function restoreSpawnKindKeys(passed, received) {
  let kindKeys = spawnKindKeys(received);
  return kindKeys !== undefined && kindKeys.keys.some((key) => passed[key] !== received[key])
    ? Object.assign(
        {
          ...passed,
        },
        ...kindKeys.keys.map((key) => ({
          [key]: received[key],
        })),
      )
    : passed;
}
//@ chunk-4121qate.js:206907-207349 placement
function checkResumedAgentRefusal(passed, received) {
  let kindKeys = spawnKindKeys(received);
  if (kindKeys === undefined) return;
  let mapped = kindKeys.keys
    .filter((key) => Object.hasOwn(passed, key) && passed[key] !== received[key])
    .map((key) => `\`${key}\``);
  if (mapped.length === 0) return;
  let isPlural = mapped.length > 1;
  let joined = mapped.join(", ");
  switch (kindKeys.kind) {
    case "resume":
      return `${joined} ${isPlural ? "were" : "was"} ignored: a hook can only refuse a resumed agent's run`;
    case "teammate":
      return `${joined} ${isPlural ? "do" : "does"} not apply to a teammate`;
    case "workflow":
      return `${joined} ${isPlural ? "do" : "does"} not apply to a workflow agent`;
  }
}
//@ chunk-4121qate.js:207349-207693 placement
/**
 * agent.spawn 站点规则：恢复与校验固定身份字段与提示词，结果须带 model 或 deny。
 */
var AGENT_SPAWN_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:207349", () => {
  AGENT_SPAWN_SITE = {
    event: "agent.spawn",
    unappliedArgument: checkResumedAgentRefusal,
    restoreArgument: (passed, received) =>
      restoreSpawnKindKeys(restoreMissingKeys_2(AGENT_OFFER_PINNED_KEYS, passed, received), received),
    checkArgument(passed, received) {
      return (
        checkPinnedKeysWith({
          keys: AGENT_SPAWN_PINNED_KEYS_2,
          passed,
          received,
          explanation: `the identity of the spawn and its parent is pinned; a rewrite keeps ${AGENT_SPAWN_PINNED_KEYS_2.join(", ")}`,
        }) ?? checkAgentSpawnPrompt(passed, received)
      );
    },
    check: checkResultObject(
      (result, next, deny) =>
        checkValueOrDeny(result, "{ model }", (value) => typeof value.model === "string") ??
        denyAfterNext("deny", result, deny),
    ),
  };
});
//@ chunk-4121qate.js:207693-207783 placement
/**
 * 覆盖 ceiling
 */
function withCeiling(next, origin) {
  let { ceiling, ...rest } = next;
  let { ceiling: ceiling_2 } = origin;
  return ceiling_2 === undefined
    ? rest
    : {
        ...rest,
        ceiling: ceiling_2,
      };
}
//@ chunk-4121qate.js:207783-207816 placement
/**
 * 合法权限决定
 */
var isPermissionDecisionValue = (decision) => DECISION_ORDER.some((level) => level === decision);
export {
  AGENT_OFFER_SITE,
  AGENT_SPAWN_SITE,
  AGENT_SPAWN_PINNED_KEYS_2,
  AGENT_OFFER_PINNED_KEYS,
  AGENT_SPAWN_PINNED_KEYS,
  AGENT_SPAWN_BACKGROUND_KEYS,
  AGENT_SPAWN_RESUME_KEYS,
  withCeiling,
  spawnKindKeys,
  isPermissionDecisionValue,
  checkAgentSpawnPrompt,
  restoreSpawnKindKeys,
  checkResumedAgentRefusal,
};
