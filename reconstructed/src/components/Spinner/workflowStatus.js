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
import { Gg } from "../../utils/permissions/autoModeRulesPrompt.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { workflowSizeSetting } from "../../utils/workflowSizeGuideline.js";
import { getGlobalConfig } from "../../utils/config.js";
import { Chi } from "../../utils/workflows/workflowGates.js";
import { env } from "../../utils/env.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:433876-433892 placement
var WHt = parseBindings(DEFAULT_BINDINGS);
//@ chunk-18hwfzwa.js:433892-434027 placement
function useShortcutDisplayText(h, x, D) {
  let L = useKeybindingContext();
  if (!L) return D;
  let ee = pickDisplayChord(h, x, L.bindings, WHt);
  if (ee) return chordToString(ee);
  return getActionChord(h, x, L.bindings) === null ? "" : D;
}
//@ chunk-18hwfzwa.js:434027-434252 placement
function runningWorkflowTasks(h) {
  let x = [];
  for (let D of Object.values(h)) {
    if (D.type !== "local_workflow") continue;
    if (
      D.status === "running" ||
      (isTerminalTaskStatus_2(D.status) && (D.evictAfter !== void 0 || !isTaskLoopSettled(D.id)))
    )
      x.push(D);
  }
  return (x.sort((D, L) => D.startTime - L.startTime), x);
}
//@ chunk-18hwfzwa.js:434252-434415 placement
var DEFAULT_LARGE_WORKFLOW_AGENTS = 25,
  DEFAULT_LARGE_WORKFLOW_TOKENS = 1500000,
  DEFAULT_TOKENS_PER_AGENT = 70000,
  LARGE_WORKFLOW_STOP_HINT = `${Gg} Large workflow \xB7 /workflows to stop`,
  LARGE_WORKFLOW_STOP_HINT_PLAIN = "Large workflow \xB7 /workflows to stop",
  LARGE_WORKFLOW_LABEL = `${Gg} Large workflow`,
  LARGE_WORKFLOW_ICON = Gg;
//@ chunk-18hwfzwa.js:434415-434491 placement
function yz(h) {
  return typeof h === "number" && Number.isFinite(h) && h > 0 ? h : void 0;
}
//@ chunk-18hwfzwa.js:434491-435124 placement
function workflowSizeSummary({
  scheduledAgents: scheduledAgents,
  startedAgents: startedAgents,
  totalTokens: totalTokens,
  ultracodeActive: ultracodeActive,
}) {
  if (ultracodeActive) return;
  let ee = getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_gantry", {});
  if (ee?.enabled === !1) return;
  let ke = workflowSizeSetting(getGlobalConfig().workflowSizeGuideline),
    Re = ke === void 0 ? void 0 : Chi(ke),
    Be = yz(env.CLAUDE_CODE_WORKFLOW_SIZE_WARNING_AGENTS),
    He = Be ?? Re ?? yz(ee?.agents) ?? DEFAULT_LARGE_WORKFLOW_AGENTS,
    We = yz(env.CLAUDE_CODE_WORKFLOW_SIZE_WARNING_TOKENS) ?? yz(ee?.tokens) ?? DEFAULT_LARGE_WORKFLOW_TOKENS,
    ze = startedAgents > 0 ? totalTokens / startedAgents : DEFAULT_TOKENS_PER_AGENT,
    max = Math.max(totalTokens, Math.round(ze * scheduledAgents)),
    rt = scheduledAgents > He,
    kt = totalTokens > We || max > We;
  if (!rt && !kt) return;
  return {
    axis: rt && kt ? "both" : rt ? "agents" : "tokens",
    scheduledAgents: scheduledAgents,
    totalTokens: totalTokens,
    projectedTokens: max,
    agentCap: He,
    tokenCap: We,
    capFromGuideline: rt && Be === void 0 && Re !== void 0,
  };
}
//@ chunk-18hwfzwa.js:435124-435128 placement
j();
//@ chunk-18hwfzwa.js:435128-435174 placement
function dUt(bn) {
  return { text: bn, isWarning: !1 };
}
//@ chunk-18hwfzwa.js:435174-435231 placement
function lUt(Go) {
  return { barWidth: 0, segments: Go.map(dUt) };
}

export {
  runningWorkflowTasks,
  workflowSizeSummary,
  LARGE_WORKFLOW_STOP_HINT_PLAIN,
  useShortcutDisplayText,
  lUt,
  LARGE_WORKFLOW_STOP_HINT,
  LARGE_WORKFLOW_LABEL,
  LARGE_WORKFLOW_ICON,
};
