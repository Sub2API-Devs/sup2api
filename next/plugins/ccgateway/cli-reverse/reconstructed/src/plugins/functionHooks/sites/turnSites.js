/**
 * plugins/functionHooks/sites/turnSites.ts
 *
 * 钩子站点规则：turn.start/step/complete（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPlainObject } from "../../../utils/isPlainObject.js";
import {
  simpleSite,
  keepLongTexts,
  hasTurnId,
  restoreMissingKeys,
  checkPinnedKeys,
  checkResultObject,
} from "./siteRules.js";
import { restoreKeepLongTexts } from "./promptContextSites.js";
import { EFFORT_LEVELS } from "../../../utils/effort.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:194514-194643 placement
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
//@ chunk-j8f885h1.js:194643-194781 placement (2.1.88 match: getTokenCountFromUsage, 1)
var getTokenCountFromUsage_2 = (usage) =>
  isPlainObject(usage) &&
  [
    usage.input_tokens,
    usage.output_tokens,
    usage.cache_read_input_tokens,
    usage.cache_creation_input_tokens,
  ].every((count) => Number.isFinite(count));
//@ chunk-j8f885h1.js:194781-195532 placement
/**
 * 按种类校验 turn.step 流的块：text/thinking、tool、input、stop（停止原因与用量）、engine（引用不可改）。
 */
function checkTurnStepChunkFields(chunk) {
  let hasIndex = typeof chunk.index === "number" && chunk.index >= 0;
  switch (chunk.kind) {
    case "text":
    case "thinking":
      return hasIndex && typeof chunk.text === "string" ? undefined : "{ index, text }";
    case "tool":
      return hasIndex &&
        typeof chunk.id === "string" &&
        /^[\w-]+$/.test(chunk.id) &&
        typeof chunk.name === "string"
        ? undefined
        : "{ index, id, name } (an id of letters, digits, _ or -)";
    case "input":
      return hasIndex && typeof chunk.json === "string" ? undefined : "{ index, json } (json a string)";
    case "stop": {
      let hasStopReason =
        chunk.stopReason === null || STOP_REASONS.some((reason) => reason === chunk.stopReason);
      let hasUsage = chunk.usage === null || getTokenCountFromUsage_2(chunk.usage);
      return hasStopReason && hasUsage
        ? undefined
        : "{ stopReason, usage } (usage null, or its four token counts)";
    }
    case "engine":
      return typeof chunk.ref === "number" ? undefined : "ref (pass engine chunks on unchanged)";
    default:
      return "known kind (text, thinking, tool, input, stop, engine)";
  }
}
//@ chunk-j8f885h1.js:195532-195702 placement
/**
 * 描述 turn.step 块的问题（不是对象或字段不符合种类）。
 */
function describeTurnStepChunkProblem(chunk) {
  if (!isPlainObject(chunk))
    return `no kind (a chunk is an object; got ${chunk === null ? "null" : typeof chunk})`;
  let fieldsProblem = checkTurnStepChunkFields(chunk);
  return fieldsProblem === undefined ? undefined : `kind ${String(chunk.kind)} but no ${fieldsProblem}`;
}
//@ chunk-j8f885h1.js:195702-195814 placement
/**
 * 取引擎块的引用与种类。
 */
function engineChunkRef(chunk) {
  if (!isPlainObject(chunk)) return;
  let { ref, kind } = chunk;
  return typeof ref === "number" && typeof kind === "string" ? [ref, kind] : undefined;
}
//@ chunk-j8f885h1.js:195814-195905 placement
/**
 * 工具步骤 id
 */
function toolStepId(chunk) {
  let id = isPlainObject(chunk) && chunk.kind === "tool" ? chunk.id : undefined;
  return typeof id === "string" ? id : undefined;
}
//@ chunk-j8f885h1.js:195905-196508 placement
function checkTurnStepChunk() {
  let pulledKinds = new Map();
  let passedRefs = new Set();
  let usedToolIds = new Set();
  function checkEngineRef(ref) {
    if (pulledKinds.get(ref) !== "engine")
      return "kind engine but a ref this link never pulled as an engine chunk (pass engine chunks on unchanged)";
    if (passedRefs.has(ref)) return "kind engine but a ref already passed on (pass each on once)";
    passedRefs.add(ref);
    return;
  }
  function checkToolId(id) {
    if (usedToolIds.has(id)) return `kind tool but an id this step already used (${id})`;
    usedToolIds.add(id);
    return;
  }
  return {
    pulled: (chunk) => {
      let ref = engineChunkRef(chunk);
      if (ref !== undefined) pulledKinds.set(ref[0], ref[1]);
    },
    yielded: (chunk, isFinal) => {
      let problem = isFinal ? undefined : describeTurnStepChunkProblem(chunk);
      if (problem !== undefined) return problem;
      let ref = engineChunkRef(chunk);
      if (ref?.[1] === "engine") return checkEngineRef(ref[0]);
      let toolId = toolStepId(chunk);
      return toolId === undefined ? undefined : checkToolId(toolId);
    },
  };
}
//@ chunk-j8f885h1.js:196508-196925 placement
var TURN_COMPLETE_SITE; // deferred: uses simpleSite (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:196508", () => {
  TURN_COMPLETE_SITE = {
    ...simpleSite({
      event: "turn.complete",
      check: (answer) => (typeof answer.text === "string" ? undefined : "no { text }"),
      checkArgument: (passed, received) => {
        if (typeof passed.answer !== "string") return "no { answer }";
        return passed.agentId === received.agentId
          ? undefined
          : "a changed agentId (the loop the turn ran in is pinned)";
      },
    }),
    keptResult: (answer, request, answers) =>
      keepLongTexts(
        answer,
        ["text"],
        [
          {
            text: request.answer,
          },
          ...answers,
        ],
      ),
    unappliedArgument: (answer, request) => keepLongTexts(answer, ["answer"], [request])?.why,
    restoreArgument: restoreKeepLongTexts(["agentId"], ["answer"]),
  };
});
//@ chunk-j8f885h1.js:196925-197139 placement
/**
 * turn.start 站点规则：agentId 不可改。
 */
var TURN_START_SITE; // deferred: uses simpleSite (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:196925", () => {
  TURN_START_SITE = {
    ...simpleSite({
      event: "turn.start",
      check: hasTurnId,
      checkArgument: (passed, received) => {
        let isSameAgent = passed.agentId === received.agentId;
        return (
          hasTurnId(passed, received) ??
          (isSameAgent ? undefined : "a changed agentId (the loop the turn runs in is pinned)")
        );
      },
    }),
    restoreArgument: restoreMissingKeys(["agentId"]),
  };
});
//@ chunk-j8f885h1.js:197139-197942 placement
var TURN_STEP_SITE; // deferred: uses restoreMissingKeys (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:197139", () => {
  TURN_STEP_SITE = {
    event: "turn.step",
    chunkChecker: checkTurnStepChunk,
    restoreArgument: restoreMissingKeys(["agentId"]),
    checkArgument: (passed, received) => {
      let pinnedProblem = checkPinnedKeys(["turnId", "index", "messageCount", "agentId"], passed, received);
      if (pinnedProblem !== undefined) return pinnedProblem;
      let { model, effort } = passed;
      if (!(typeof model === "string" && model.trim() !== "")) return "no { model } (a non-empty model name)";
      let allowsNumericEffort = false;
      return effort === undefined ||
        effort === received.effort ||
        (typeof effort === "number" && allowsNumericEffort) ||
        EFFORT_LEVELS.some((level) => level === effort)
        ? undefined
        : `an effort that is not one of ${EFFORT_LEVELS.join(", ")}` +
            (allowsNumericEffort ? " or a number" : " (a number is internal-only)");
    },
    check: checkResultObject((answer, request) => {
      if (!(answer.turnId === request.turnId && answer.index === request.index))
        return "a { turnId, index } other than the step it answers for";
      if (!(typeof answer.answer === "string" && Array.isArray(answer.toolUses)))
        return "no { answer, toolUses }";
      let { serverToolUses } = answer;
      return serverToolUses === undefined || Array.isArray(serverToolUses)
        ? undefined
        : "a serverToolUses that is not a list";
    }),
  };
});
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
  toolStepId,
};
