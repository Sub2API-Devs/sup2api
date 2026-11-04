/**
 * components/Spinner/workflowStatus.ts
 *
 * 2.1.316 新增。工作流运行状态文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: placement 9
 */
import { parseBindings, chordToString } from "../../keybindings/parser.js";
import { DEFAULT_BINDINGS } from "../../keybindings/defaultBindings.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { pickDisplayChord, getActionChord } from "../../keybindings/resolver.js";
import { isTerminalTaskStatus as isTerminalTaskStatus_2 } from "../../tasks/taskStatus.js";
import { isTaskLoopSettled } from "../../tasks/taskLoopRegistry.js";
import { WARNING_GLYPH } from "../../constants/figures.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { workflowSizeSetting } from "../../utils/workflowSizeGuideline.js";
import { getGlobalConfig } from "../../utils/config.js";
import { workflowAgentHint } from "../../utils/workflows/workflowGates.js";
import { env } from "../../utils/env.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:433876-433892 placement
var defaultKeybindingBindings; // deferred: uses parseBindings (../../keybindings/parser.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:433876", () => {
  defaultKeybindingBindings = parseBindings(DEFAULT_BINDINGS);
});
//@ chunk-18hwfzwa.js:433892-434027 placement
function useShortcutDisplayText(action, context, fallback) {
  let keybindingContext = useKeybindingContext();
  if (!keybindingContext) return fallback;
  let chord = pickDisplayChord(action, context, keybindingContext.bindings, defaultKeybindingBindings);
  if (chord) return chordToString(chord);
  return getActionChord(action, context, keybindingContext.bindings) === null ? "" : fallback;
}
//@ chunk-18hwfzwa.js:434027-434252 placement
function runningWorkflowTasks(tasks) {
  let running = [];
  for (let task of Object.values(tasks)) {
    if (task.type !== "local_workflow") continue;
    if (
      task.status === "running" ||
      (isTerminalTaskStatus_2(task.status) && (task.evictAfter !== undefined || !isTaskLoopSettled(task.id)))
    )
      running.push(task);
  }
  running.sort((a, b) => a.startTime - b.startTime);
  return running;
}
//@ chunk-18hwfzwa.js:434252-434415 placement
var DEFAULT_LARGE_WORKFLOW_AGENTS; // deferred: uses DIAMOND_GLYPH (../../constants/figures.js) of its import cycle while loading; runs once the cycle is complete
var DEFAULT_LARGE_WORKFLOW_TOKENS;
var DEFAULT_TOKENS_PER_AGENT;
var LARGE_WORKFLOW_STOP_HINT;
var LARGE_WORKFLOW_STOP_HINT_PLAIN;
var LARGE_WORKFLOW_LABEL;
var LARGE_WORKFLOW_ICON;
deferInit("chunk-18hwfzwa.js:434252", () => {
  DEFAULT_LARGE_WORKFLOW_AGENTS = 25;
  DEFAULT_LARGE_WORKFLOW_TOKENS = 1500000;
  DEFAULT_TOKENS_PER_AGENT = 70000;
  LARGE_WORKFLOW_STOP_HINT = `${WARNING_GLYPH} Large workflow \xB7 /workflows to stop`;
  LARGE_WORKFLOW_STOP_HINT_PLAIN = "Large workflow \xB7 /workflows to stop";
  LARGE_WORKFLOW_LABEL = `${WARNING_GLYPH} Large workflow`;
  LARGE_WORKFLOW_ICON = WARNING_GLYPH;
});
//@ chunk-18hwfzwa.js:434415-434491 placement
function positiveFinite(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
//@ chunk-18hwfzwa.js:434491-435124 placement
function workflowSizeSummary({ scheduledAgents, startedAgents, totalTokens, ultracodeActive }) {
  if (ultracodeActive) return;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_gantry", {});
  if (featureValue_CACHED_MAY_BE_STALE?.enabled === false) return;
  let sizeSetting = workflowSizeSetting(getGlobalConfig().workflowSizeGuideline);
  let guidelineHint = sizeSetting === undefined ? undefined : workflowAgentHint(sizeSetting);
  let envAgentCap = positiveFinite(env.CLAUDE_CODE_WORKFLOW_SIZE_WARNING_AGENTS);
  let agentCap =
    envAgentCap ??
    guidelineHint ??
    positiveFinite(featureValue_CACHED_MAY_BE_STALE?.agents) ??
    DEFAULT_LARGE_WORKFLOW_AGENTS;
  let tokenCap =
    positiveFinite(env.CLAUDE_CODE_WORKFLOW_SIZE_WARNING_TOKENS) ??
    positiveFinite(featureValue_CACHED_MAY_BE_STALE?.tokens) ??
    DEFAULT_LARGE_WORKFLOW_TOKENS;
  let tokensPerAgent = startedAgents > 0 ? totalTokens / startedAgents : DEFAULT_TOKENS_PER_AGENT;
  let max = Math.max(totalTokens, Math.round(tokensPerAgent * scheduledAgents));
  let overAgents = scheduledAgents > agentCap;
  let overTokens = totalTokens > tokenCap || max > tokenCap;
  if (!overAgents && !overTokens) return;
  return {
    axis: overAgents && overTokens ? "both" : overAgents ? "agents" : "tokens",
    scheduledAgents,
    totalTokens,
    projectedTokens: max,
    agentCap,
    tokenCap,
    capFromGuideline: overAgents && envAgentCap === undefined && guidelineHint !== undefined,
  };
}
//@ chunk-18hwfzwa.js:435124-435128 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:435124", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:435128-435174 placement
function infoSegment(text) {
  return {
    text,
    isWarning: false,
  };
}
//@ chunk-18hwfzwa.js:435174-435231 placement
function emptyWorkflowBarSummary(segments) {
  return {
    barWidth: 0,
    segments: segments.map(infoSegment),
  };
}
export {
  runningWorkflowTasks,
  emptyWorkflowBarSummary,
  LARGE_WORKFLOW_STOP_HINT,
  LARGE_WORKFLOW_LABEL,
  LARGE_WORKFLOW_ICON,
  workflowSizeSummary,
  LARGE_WORKFLOW_STOP_HINT_PLAIN,
  useShortcutDisplayText,
};
