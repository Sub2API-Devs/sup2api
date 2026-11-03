/**
 * services/classifierSummary.ts
 *
 * 2.1.316 新增。把分类器结果转成回合后摘要；按界面（desktop/mobile/projects 等）决定是否显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j71j5cv7.js (15)
 * attribution: placement 15
 */
import { isBgSession, isBeingWatched, getBgTakeover, isBeingWatchedV5 } from "../utils/concurrentSessions.js";
import { env } from "../utils/env.js";
import { isReplBridgeActive, getIsNonInteractiveSession } from "../bootstrap/state.js";
import { DESKTOP_ENTRYPOINTS } from "../utils/entrypointKinds.js";
import { isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import { hasRemoteCap } from "../remote/remoteMode.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";
import { currentSessionStatusState } from "./sessionStatus/sessionStateClassifier.js";
import { logForDebugging } from "../utils/debug.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { hasRelaySourceForClients, hasUpdateStatusToolOnly } from "./projects/threadRows.js";
import { truncateContent } from "../utils/telemetry/betaSessionTracing.js";
import { mcpInfoFromString } from "./mcp/mcpStringUtils.js";
import { REMOTE_DEVICES } from "./mcp/firstPartyServerIds.js";
import { identity } from "../tools/REPLTool/constants.js";
import { mcpServerLabel } from "../utils/permissions/approvalPayloadSerialization.js";
import { publishPostTurnSummary } from "../bridge/replBridgeHandle.js";

//@ chunk-j71j5cv7.js:793-886 placement
/**
 * 远程/云端入口点集合（remote、remote_cowork、remote_desktop、remote_mobile、remote_projects）。
 */
var REMOTE_ENTRYPOINTS = new Set([
  "remote",
  "remote_cowork",
  "remote_desktop",
  "remote_mobile",
  "remote_projects",
]);
//@ chunk-j71j5cv7.js:886-1214 placement
function detectSurfaces(e) {
  if (isBgSession()) return new Set(["bg"]);
  let r = new Set();
  if ((e ?? isBeingWatched()) || getBgTakeover() !== null) r.add("watched");
  if (hasCcrSurface()) r.add("ccr");
  if (env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge" || isReplBridgeActive()) r.add("bridge");
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  if (CLAUDE_CODE_ENTRYPOINT !== undefined && DESKTOP_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT))
    r.add("desktop");
  if (isPostTurnSummaryVisibleInCli()) r.add("cli");
  if (!getIsNonInteractiveSession() && isFullscreenEnvEnabled()) r.add("repl");
  return r;
}
//@ chunk-j71j5cv7.js:1214-1417 placement
function hasCcrSurface() {
  if (hasRemoteCap("fanout")) return true;
  if (env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc") return true;
  if (env.CLAUDE_CODE_REMOTE)
    return REMOTE_ENTRYPOINTS.has(env.CLAUDE_CODE_ENTRYPOINT ?? "") && !process.env.BUGHUNTER_FLEET_SIZE;
  return false;
}
//@ chunk-j71j5cv7.js:1417-1476 placement
async function watchedForSurfaces(e) {
  return isStorageV5Enabled() && e !== undefined ? isBeingWatchedV5(e) : undefined;
}
//@ chunk-j71j5cv7.js:1476-1604 placement
var SURFACE_SINKS = {
  bg: ["state"],
  watched: ["state"],
  ccr: ["summary"],
  bridge: ["summary"],
  desktop: ["summary"],
  cli: ["summary"],
  repl: ["headline"],
};
//@ chunk-j71j5cv7.js:1604-1811 placement
function sinksFor(surfaces) {
  let r = new Set();
  let s = disabledClassifierSurfaces();
  for (let n of surfaces) {
    if (s.has(n)) continue;
    for (let o of SURFACE_SINKS[n]) r.add(o);
  }
  if (surfaces.has("bg")) r.delete("summary");
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_classifier_summary_kill", false)) r.delete("summary");
  return r;
}
//@ chunk-j71j5cv7.js:1811-1879 placement
function disabledClassifierSurfaces() {
  return parseDisabledSurfaces(getFeatureValue_CACHED_MAY_BE_STALE("tengu_classifier_disabled_surfaces", ""));
}
//@ chunk-j71j5cv7.js:1879-2157 placement
/**
 * 解析禁用的分类器摘要界面列表
 */
function parseDisabledSurfaces(featureValue_CACHED_MAY_BE_STALE) {
  let r = new Set();
  for (let s of featureValue_CACHED_MAY_BE_STALE.split(",")) {
    let trimmed = s.trim();
    if (!trimmed) continue;
    if (trimmed in SURFACE_SINKS) r.add(trimmed);
    else if (!currentSessionStatusState().warnedUnknownDisabledSurface) {
      currentSessionStatusState().warnedUnknownDisabledSurface = true;
      logForDebugging(
        `[classifier] tengu_classifier_disabled_surfaces: unknown surface '${trimmed}' ignored`,
      );
    }
  }
  return r;
}
//@ chunk-j71j5cv7.js:2157-2435 placement
function engineFor(e) {
  if (e.size === 0) return null;
  let r = e.has("state")
    ? "llm"
    : !e.has("summary")
      ? "heuristic"
      : process.env.CLAUDE_CODE_CLASSIFIER_SUMMARY !== undefined
        ? isEnvTruthy(process.env.CLAUDE_CODE_CLASSIFIER_SUMMARY)
          ? "llm"
          : "heuristic"
        : getClassifierSummaryMode();
  return r === "llm" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_wren", false) ? "heuristic" : r;
}
//@ chunk-j71j5cv7.js:2435-2523 placement
/**
 * 分类器摘要的生成方式：开关 tengu_classifier_summary_llm_emit 打开为 "llm"，否则 "heuristic"。
 */
function getClassifierSummaryMode() {
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_classifier_summary_llm_emit", false)) return "llm";
  return "heuristic";
}
//@ chunk-j71j5cv7.js:2523-2547 placement
function isPostTurnSummaryVisibleInCli() {
  return false;
}
//@ chunk-j71j5cv7.js:2547-2621 placement
function projectsRecapEnabled(e) {
  return (
    hasRelaySourceForClients() &&
    hasUpdateStatusToolOnly(e) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_projects_thread_recap", false)
  );
}
//@ chunk-j71j5cv7.js:2621-2708 placement
var SUMMARY_STATE_TO_CATEGORY = new Map([
  ["blocked", "blocked"],
  ["done", "completed"],
  ["working", "review_ready"],
]);
//@ chunk-j71j5cv7.js:2708-3195 placement = SDKPostTurnSummaryMessageSchema (0.414)
/**
 * 把分类器结果转成回合后摘要；按界面（desktop/mobile/projects 等）决定是否显示。
 */
function classifiedToPostTurnSummary(e, r) {
  if (e.recap)
    return {
      status_category:
        e.state === "failed" ? "failed" : (SUMMARY_STATE_TO_CATEGORY.get(e.state) ?? "review_ready"),
      status_detail: e.recap.headline,
      needs_action: e.state === "blocked" ? e.recap.needs : "",
      recent_action: e.recap.needsYou,
      description: e.recap.happened,
      reply: e.recap.reply,
    };
  return {
    status_category: SUMMARY_STATE_TO_CATEGORY.get(e.state) ?? "review_ready",
    status_detail: e.detail,
    needs_action: e.state === "blocked" ? (e.needs ?? "") : "",
    recent_action: e.output.result ?? "",
    ...(r?.projectsRecap && {
      description: truncateContent(e.detail).text,
    }),
  };
}
//@ chunk-j71j5cv7.js:3195-3655 placement
function runClassifierSummaryForBlocked(e, r) {
  let s = sinksFor(detectSurfaces(false));
  if (!s.has("summary") || engineFor(s) === null) return;
  let n = mcpInfoFromString(e.tool_name);
  let o =
    !n?.toolName || n.serverName === REMOTE_DEVICES
      ? identity(e.tool_name)
      : mcpServerLabel({
          serverName: n.serverName,
          toolName: n.toolName,
        });
  let c = e.tool_name.startsWith("dialog:")
    ? {
        status_category: "blocked",
        status_detail: "Waiting on a user dialog",
        needs_action: e.action_description,
      }
    : {
        status_category: "blocked",
        status_detail: `Waiting on permission: ${o}`,
        needs_action: `Approve or deny ${o}`,
      };
  publishPostTurnSummary(r, c);
}
export { hasCcrSurface };
