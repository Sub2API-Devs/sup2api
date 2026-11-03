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
import { WARNING_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { workflowSizeSetting } from "../../utils/workflowSizeGuideline.js";
import { getGlobalConfig } from "../../utils/config.js";
import { workflowAgentHint } from "../../utils/workflows/workflowGates.js";
import { env } from "../../utils/env.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:433876-433892 placement
var defaultKeybindingBindings = parseBindings(DEFAULT_BINDINGS);
//@ chunk-18hwfzwa.js:433892-434027 placement
function useShortcutDisplayText(h, x, D) {
  let keybindingContext = useKeybindingContext();
  if (!keybindingContext) return D;
  let ee = pickDisplayChord(h, x, keybindingContext.bindings, defaultKeybindingBindings);
  if (ee) return chordToString(ee);
  return getActionChord(h, x, keybindingContext.bindings) === null ? "" : D;
}
//@ chunk-18hwfzwa.js:434027-434252 placement
function runningWorkflowTasks(tasks) {
  let x = [];
  for (let D of Object.values(tasks)) {
    if (D.type !== "local_workflow") continue;
    if (
      D.status === "running" ||
      (isTerminalTaskStatus_2(D.status) && (D.evictAfter !== undefined || !isTaskLoopSettled(D.id)))
    )
      x.push(D);
  }
  x.sort((D, L) => D.startTime - L.startTime);
  return x;
}
//@ chunk-18hwfzwa.js:434252-434415 placement
var DEFAULT_LARGE_WORKFLOW_AGENTS = 25;
var DEFAULT_LARGE_WORKFLOW_TOKENS = 1500000;
var DEFAULT_TOKENS_PER_AGENT = 70000;
var LARGE_WORKFLOW_STOP_HINT = `${WARNING_GLYPH} Large workflow \xB7 /workflows to stop`;
var LARGE_WORKFLOW_STOP_HINT_PLAIN = "Large workflow \xB7 /workflows to stop";
var LARGE_WORKFLOW_LABEL = `${WARNING_GLYPH} Large workflow`;
var LARGE_WORKFLOW_ICON = WARNING_GLYPH;
//@ chunk-18hwfzwa.js:434415-434491 placement
function positiveFinite(h) {
  return typeof h === "number" && Number.isFinite(h) && h > 0 ? h : undefined;
}
//@ chunk-18hwfzwa.js:434491-435124 placement
function workflowSizeSummary({ scheduledAgents, startedAgents, totalTokens, ultracodeActive }) {
  if (ultracodeActive) return;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_gantry", {});
  if (featureValue_CACHED_MAY_BE_STALE?.enabled === false) return;
  let ke = workflowSizeSetting(getGlobalConfig().workflowSizeGuideline);
  let Re = ke === undefined ? undefined : workflowAgentHint(ke);
  let Be = positiveFinite(env.CLAUDE_CODE_WORKFLOW_SIZE_WARNING_AGENTS);
  let He =
    Be ?? Re ?? positiveFinite(featureValue_CACHED_MAY_BE_STALE?.agents) ?? DEFAULT_LARGE_WORKFLOW_AGENTS;
  let We =
    positiveFinite(env.CLAUDE_CODE_WORKFLOW_SIZE_WARNING_TOKENS) ??
    positiveFinite(featureValue_CACHED_MAY_BE_STALE?.tokens) ??
    DEFAULT_LARGE_WORKFLOW_TOKENS;
  let ze = startedAgents > 0 ? totalTokens / startedAgents : DEFAULT_TOKENS_PER_AGENT;
  let max = Math.max(totalTokens, Math.round(ze * scheduledAgents));
  let rt = scheduledAgents > He;
  let kt = totalTokens > We || max > We;
  if (!rt && !kt) return;
  return {
    axis: rt && kt ? "both" : rt ? "agents" : "tokens",
    scheduledAgents,
    totalTokens,
    projectedTokens: max,
    agentCap: He,
    tokenCap: We,
    capFromGuideline: rt && Be === undefined && Re !== undefined,
  };
}
//@ chunk-18hwfzwa.js:435124-435128 placement
init_react_production();
//@ chunk-18hwfzwa.js:435128-435174 placement
function infoSegment(text) {
  return {
    text,
    isWarning: false,
  };
}
//@ chunk-18hwfzwa.js:435174-435231 placement
function emptyWorkflowBarSummary(Go) {
  return {
    barWidth: 0,
    segments: Go.map(infoSegment),
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
