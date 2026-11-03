/**
 * utils/fleetGates.ts
 *
 * fleet 特性开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rm2h7nfx.js (22)
 * attribution: placement 22
 */
import { env, antEnv } from "./env.js";
import { DU } from "./settings/commandSyncNames.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
} from "../services/analytics/growthbook.js";
import { capitalize } from "./stringUtils.js";
import { isEnvTruthy } from "./envUtils.js";

//@ chunk-rm2h7nfx.js:375-408 placement
function C2t() {
  return agentViewDisabledReason() !== null;
}
//@ chunk-rm2h7nfx.js:408-617 placement
function agentViewDisabledReason() {
  if (env.CLAUDE_CODE_DISABLE_AGENT_VIEW) return "is disabled by CLAUDE_CODE_DISABLE_AGENT_VIEW";
  if (DU()?.settings.disableAgentView === !0) return "is disabled by the 'disableAgentView' setting";
  return null;
}
//@ chunk-rm2h7nfx.js:617-644 placement
function isAgentsFleetEnabled() {
  return !C2t();
}
//@ chunk-rm2h7nfx.js:644-675 placement
var TENGU_FLEETVIEW_SIMPLE = "tengu_fleetview_simple";
//@ chunk-rm2h7nfx.js:675-737 placement
function isAgentsSimpleViewEnabled() {
  return env.CLAUDE_CODE_FLEETVIEW_SIMPLE || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FLEETVIEW_SIMPLE, !1);
}
//@ chunk-rm2h7nfx.js:737-891 placement
async function ensureFleetGateHydrated(e = {}) {
  if (DU() === null) {
    let { getSettingsWithErrors: getSettingsWithErrors } = await import("./chunk-0crvnfjy.js");
    getSettingsWithErrors();
  }
  if (e.kickGrowthBook !== !1) initializeGrowthBook().catch(() => {});
}
//@ chunk-rm2h7nfx.js:891-988 placement
function isPastSessionsExperimentEnabled() {
  return (
    antEnv.CLAUDE_CODE_FLEET_PAST_SESSIONS === !0 ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_fleet_past_sessions", !1)
  );
}
//@ chunk-rm2h7nfx.js:988-1015 placement
function isDaemonCliEnabled() {
  return isAgentsFleetEnabled();
}
//@ chunk-rm2h7nfx.js:1015-1039 placement
function isDaemonWorkerRegistryEnabled() {
  return !1;
}
//@ chunk-rm2h7nfx.js:1039-1088 placement
function isDaemonServiceInstallEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_anchor", !1);
}
//@ chunk-rm2h7nfx.js:1088-1139 placement
function isDaemonServiceRecalled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_lantern", !1);
}
//@ chunk-rm2h7nfx.js:1139-1204 placement
function a() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_harbor", !1) ? "ask" : "transient";
}
//@ chunk-rm2h7nfx.js:1204-1377 placement
function getDaemonColdStart() {
  let envClaudeCodeDaemonColdStart = process.env.CLAUDE_CODE_DAEMON_COLD_START;
  if (envClaudeCodeDaemonColdStart === "transient" || envClaudeCodeDaemonColdStart === "ask")
    return envClaudeCodeDaemonColdStart;
  let t = DU()?.settings.daemonColdStart;
  if (t !== void 0) return t;
  return a();
}
//@ chunk-rm2h7nfx.js:1377-1434 placement
function bgSupervisorNoun() {
  return isDaemonServiceInstallEnabled() ? "daemon" : "background service";
}
//@ chunk-rm2h7nfx.js:1434-1465 placement
function bgSupervisorNounCap() {
  return capitalize(bgSupervisorNoun());
}
//@ chunk-rm2h7nfx.js:1465-1532 placement
function daemonHint(e) {
  return isDaemonCliEnabled() ? ` \u2014 run 'claude daemon ${e}'` : "";
}
//@ chunk-rm2h7nfx.js:1532-1714 placement
function bgSupervisorStalledMessage() {
  let e = `${bgSupervisorNoun()} did not respond \u2014 it may be stalled`;
  if (!isDaemonCliEnabled()) return e;
  return isDaemonServiceInstallEnabled()
    ? `${e}${daemonHint("restart")}`
    : `${e}${daemonHint("stop --any")} (ends background sessions)`;
}
//@ chunk-rm2h7nfx.js:1714-1839 placement
function fleetGateRejected(e, t) {
  let o = t ?? agentViewDisabledReason() ?? "is not available in this environment";
  (process.stderr.write(`'${e}' ${o}.
`),
    process.exit(1));
}
//@ chunk-rm2h7nfx.js:1839-1881 placement
var AGENT_VIEW_RELAUNCH_ENV_KEY = "CLAUDE_CODE_AGENT_VIEW_RELAUNCH";
//@ chunk-rm2h7nfx.js:1881-1905 placement
function isLaunchComposerEnabled() {
  return !1;
}
//@ chunk-rm2h7nfx.js:1905-1951 placement
function isListReturnRelaunch() {
  return !!env.CLAUDE_AGENTS_SELECT;
}
//@ chunk-rm2h7nfx.js:1951-2026 placement
function consumeAgentViewRelaunchMarker() {
  let e = isEnvTruthy(process.env[AGENT_VIEW_RELAUNCH_ENV_KEY]);
  return (delete process.env[AGENT_VIEW_RELAUNCH_ENV_KEY], e);
}

export {
  C2t,
  isAgentsFleetEnabled,
  isPastSessionsExperimentEnabled,
  bgSupervisorStalledMessage,
  isDaemonWorkerRegistryEnabled,
  isLaunchComposerEnabled,
  isAgentsSimpleViewEnabled,
  AGENT_VIEW_RELAUNCH_ENV_KEY,
  bgSupervisorNoun,
  daemonHint,
  bgSupervisorNounCap,
  getDaemonColdStart,
  isDaemonServiceInstallEnabled,
  isDaemonCliEnabled,
  isDaemonServiceRecalled,
  ensureFleetGateHydrated,
  fleetGateRejected,
  consumeAgentViewRelaunchMarker,
  isListReturnRelaunch,
};
