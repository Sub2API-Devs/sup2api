/**
 * components/Spinner/workflowStatus.ts
 *
 * 2.1.316 新增。工作流运行状态文本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (11)
 * attribution: placement 9, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { parseBindings, chordToString } from "../../keybindings/parser.js";
import { DEFAULT_BINDINGS } from "../../keybindings/defaultBindings.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { pickDisplayChord, getActionChord } from "../../keybindings/resolver.js";
import { isTerminalTaskStatus as isTerminalTaskStatus_2 } from "../../tasks/taskStatus.js";
import { isTaskLoopSettled } from "../../tasks/taskLoopRegistry.js";
import { isWorkflowsAvailable, workflowAgentHint } from "../../utils/workflows/workflowGates.js";
import { WARNING_GLYPH } from "../../constants/figures.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { workflowSizeSetting } from "../../utils/workflowSizeGuideline.js";
import { getGlobalConfig } from "../../utils/config.js";
import { env } from "../../utils/env.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:458479-458483 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:458479", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:458709-458725 placement
var defaultKeybindingBindings; // deferred: uses platform (../../keybindings/defaultBindings.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:458709", () => {
  defaultKeybindingBindings = parseBindings(DEFAULT_BINDINGS);
});
//@ chunk-czq1j3j2.js:458725-458860 placement
function useShortcutDisplayText(action, context, fallback) {
  let keybindingContext = useKeybindingContext();
  if (!keybindingContext) return fallback;
  let chord = pickDisplayChord(action, context, keybindingContext.bindings, defaultKeybindingBindings);
  if (chord) return chordToString(chord);
  return getActionChord(action, context, keybindingContext.bindings) === null ? "" : fallback;
}
//@ chunk-czq1j3j2.js:458860-459085 placement
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
//@ chunk-czq1j3j2.js:459085-459196 layout
function runningRemoteWorkflows(remoteWorkflowRuns) {
  let filtered = remoteWorkflowRuns.filter((run) => run.status === "running" && run.presence !== "unlisted");
  return filtered.length > 0 && isWorkflowsAvailable() ? filtered : [];
}
//@ chunk-czq1j3j2.js:459196-459339 layout
function selectWorkflowFooterTask({ tasks, remoteWorkflowRuns, workflowFooterIndex, workflowFooterRunId }) {
  return workflowFooterRunId === undefined
    ? runningWorkflowTasks(tasks)[workflowFooterIndex]
    : runningRemoteWorkflows(remoteWorkflowRuns).find((run) => run.id === workflowFooterRunId);
}
//@ chunk-czq1j3j2.js:459339-459502 placement
var DEFAULT_LARGE_WORKFLOW_AGENTS = 25;
var DEFAULT_LARGE_WORKFLOW_TOKENS = 1500000;
var DEFAULT_TOKENS_PER_AGENT = 70000;
var LARGE_WORKFLOW_STOP_HINT = `${WARNING_GLYPH} Large workflow \xB7 /workflows to stop`;
var LARGE_WORKFLOW_STOP_HINT_PLAIN = "Large workflow \xB7 /workflows to stop";
var LARGE_WORKFLOW_LABEL = `${WARNING_GLYPH} Large workflow`;
var LARGE_WORKFLOW_ICON = WARNING_GLYPH;
//@ chunk-czq1j3j2.js:459502-459578 placement
function positiveFinite(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
//@ chunk-czq1j3j2.js:459578-460211 placement
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
//@ chunk-czq1j3j2.js:460215-460261 placement
function infoSegment(text) {
  return {
    text,
    isWarning: false,
  };
}
//@ chunk-czq1j3j2.js:460261-460318 placement
function emptyWorkflowBarSummary(segments) {
  return {
    barWidth: 0,
    segments: segments.map(infoSegment),
  };
}
export {
  emptyWorkflowBarSummary,
  LARGE_WORKFLOW_STOP_HINT,
  LARGE_WORKFLOW_LABEL,
  LARGE_WORKFLOW_ICON,
  selectWorkflowFooterTask,
  runningWorkflowTasks,
  runningRemoteWorkflows,
  workflowSizeSummary,
  LARGE_WORKFLOW_STOP_HINT_PLAIN,
  useShortcutDisplayText,
};
