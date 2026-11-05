/**
 * utils/fleetGates.ts
 *
 * fleet 特性开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qc14bnm7.js (22)
 * attribution: placement 22
 */
import { env, antEnv } from "./env.js";
import { mergedCommandNames } from "./settings/commandSyncNames.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
} from "../services/analytics/growthbook.js";
import { capitalize } from "./stringUtils.js";
import { isEnvTruthy } from "./envUtils.js";

//@ chunk-qc14bnm7.js:375-408 placement
/**
 * 判断 agent 视图是否被禁用。
 */
function isAgentViewDisabled() {
  return agentViewDisabledReason() !== null;
}
//@ chunk-qc14bnm7.js:408-617 placement
function agentViewDisabledReason() {
  if (env.CLAUDE_CODE_DISABLE_AGENT_VIEW) return "is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";
  if (mergedCommandNames()?.settings.disableAgentView === true)
    return "is disabled by the 'disableAgentView' setting";
  return null;
}
//@ chunk-qc14bnm7.js:617-644 placement
function isAgentsFleetEnabled() {
  return !isAgentViewDisabled();
}
//@ chunk-qc14bnm7.js:644-675 placement
var TENGU_FLEETVIEW_SIMPLE = "tengu_fleetview_simple";
//@ chunk-qc14bnm7.js:675-737 placement
function isAgentsSimpleViewEnabled() {
  return (
    env.CLAUDE_CODE_FLEETVIEW_SIMPLE || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FLEETVIEW_SIMPLE, false)
  );
}
//@ chunk-qc14bnm7.js:737-891 placement
async function ensureFleetGateHydrated(options = {}) {
  if (mergedCommandNames() === null) {
    let { getSettingsWithErrors } = await import("./settings/settings.js");
    getSettingsWithErrors();
  }
  if (options.kickGrowthBook !== false) initializeGrowthBook().catch(() => {});
}
//@ chunk-qc14bnm7.js:891-988 placement
function isPastSessionsExperimentEnabled() {
  return (
    antEnv.CLAUDE_CODE_FLEET_PAST_SESSIONS === true ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_fleet_past_sessions", false)
  );
}
//@ chunk-qc14bnm7.js:988-1015 placement
function isDaemonCliEnabled() {
  return isAgentsFleetEnabled();
}
//@ chunk-qc14bnm7.js:1015-1039 placement
function isDaemonWorkerRegistryEnabled() {
  return false;
}
//@ chunk-qc14bnm7.js:1039-1088 placement
function isDaemonServiceInstallEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_anchor", false);
}
//@ chunk-qc14bnm7.js:1088-1139 placement
function isDaemonServiceRecalled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_lantern", false);
}
//@ chunk-qc14bnm7.js:1139-1204 placement
function transientRejectionKind() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_harbor", false) ? "ask" : "transient";
}
//@ chunk-qc14bnm7.js:1204-1377 placement
function getDaemonColdStart() {
  let envClaudeCodeDaemonColdStart = process.env.CLAUDE_CODE_DAEMON_COLD_START;
  if (envClaudeCodeDaemonColdStart === "transient" || envClaudeCodeDaemonColdStart === "ask")
    return envClaudeCodeDaemonColdStart;
  let daemonColdStart = mergedCommandNames()?.settings.daemonColdStart;
  if (daemonColdStart !== undefined) return daemonColdStart;
  return transientRejectionKind();
}
//@ chunk-qc14bnm7.js:1377-1434 placement
function bgSupervisorNoun() {
  return isDaemonServiceInstallEnabled() ? "daemon" : "background service";
}
//@ chunk-qc14bnm7.js:1434-1465 placement
function bgSupervisorNounCap() {
  return capitalize(bgSupervisorNoun());
}
//@ chunk-qc14bnm7.js:1465-1532 placement
function daemonHint(subcommand) {
  return isDaemonCliEnabled() ? ` \u2014 run 'claude daemon ${subcommand}'` : "";
}
//@ chunk-qc14bnm7.js:1532-1714 placement
function bgSupervisorStalledMessage() {
  let baseMessage = `${bgSupervisorNoun()} did not respond \u2014 it may be stalled`;
  if (!isDaemonCliEnabled()) return baseMessage;
  return isDaemonServiceInstallEnabled()
    ? `${baseMessage}${daemonHint("restart")}`
    : `${baseMessage}${daemonHint("stop --any")} (ends background sessions)`;
}
//@ chunk-qc14bnm7.js:1714-1839 placement
function fleetGateRejected(featureName, reason) {
  let rejectionReason = reason ?? agentViewDisabledReason() ?? "is not available in this environment";
  process.stderr.write(`'${featureName}' ${rejectionReason}.
`);
  process.exit(1);
}
//@ chunk-qc14bnm7.js:1839-1881 placement
var AGENT_VIEW_RELAUNCH_ENV_KEY = "CLAUDE_CODE_AGENT_VIEW_RELAUNCH";
//@ chunk-qc14bnm7.js:1881-1905 placement
function isLaunchComposerEnabled() {
  return false;
}
//@ chunk-qc14bnm7.js:1905-1951 placement
function isListReturnRelaunch() {
  return !!env.CLAUDE_AGENTS_SELECT;
}
//@ chunk-qc14bnm7.js:1951-2026 placement
function consumeAgentViewRelaunchMarker() {
  let wasSet = isEnvTruthy(process.env[AGENT_VIEW_RELAUNCH_ENV_KEY]);
  delete process.env[AGENT_VIEW_RELAUNCH_ENV_KEY];
  return wasSet;
}
export {
  isAgentsFleetEnabled,
  isPastSessionsExperimentEnabled,
  isDaemonWorkerRegistryEnabled,
  isAgentViewDisabled,
  bgSupervisorNoun,
  bgSupervisorNounCap,
  isAgentsSimpleViewEnabled,
  AGENT_VIEW_RELAUNCH_ENV_KEY,
  bgSupervisorStalledMessage,
  isDaemonServiceRecalled,
  isDaemonServiceInstallEnabled,
  ensureFleetGateHydrated,
  isDaemonCliEnabled,
  fleetGateRejected,
  daemonHint,
  consumeAgentViewRelaunchMarker,
  isListReturnRelaunch,
  getDaemonColdStart,
  isLaunchComposerEnabled,
};
