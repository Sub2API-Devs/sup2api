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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-j71j5cv7.js:793-886 placement
/**
 * 远程/云端入口点集合（remote、remote_cowork、remote_desktop、remote_mobile、remote_projects）。
 */
var REMOTE_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j71j5cv7.js:793", () => {
  REMOTE_ENTRYPOINTS = new Set([
    "remote",
    "remote_cowork",
    "remote_desktop",
    "remote_mobile",
    "remote_projects",
  ]);
});
//@ chunk-j71j5cv7.js:886-1214 placement
function detectSurfaces(isWatching) {
  if (isBgSession()) return new Set(["bg"]);
  let surfaces = new Set();
  if ((isWatching ?? isBeingWatched()) || getBgTakeover() !== null) surfaces.add("watched");
  if (hasCcrSurface()) surfaces.add("ccr");
  if (env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge" || isReplBridgeActive()) surfaces.add("bridge");
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  if (CLAUDE_CODE_ENTRYPOINT !== undefined && DESKTOP_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT))
    surfaces.add("desktop");
  if (isPostTurnSummaryVisibleInCli()) surfaces.add("cli");
  if (!getIsNonInteractiveSession() && isFullscreenEnvEnabled()) surfaces.add("repl");
  return surfaces;
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
async function watchedForSurfaces(storage) {
  return isStorageV5Enabled() && storage !== undefined ? isBeingWatchedV5(storage) : undefined;
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
  let sinks = new Set();
  let disabledSurfaces = disabledClassifierSurfaces();
  for (let surface of surfaces) {
    if (disabledSurfaces.has(surface)) continue;
    for (let sink of SURFACE_SINKS[surface]) sinks.add(sink);
  }
  if (surfaces.has("bg")) sinks.delete("summary");
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_classifier_summary_kill", false)) sinks.delete("summary");
  return sinks;
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
  let surfaces = new Set();
  for (let entry of featureValue_CACHED_MAY_BE_STALE.split(",")) {
    let trimmed = entry.trim();
    if (!trimmed) continue;
    if (trimmed in SURFACE_SINKS) surfaces.add(trimmed);
    else if (!currentSessionStatusState().warnedUnknownDisabledSurface) {
      currentSessionStatusState().warnedUnknownDisabledSurface = true;
      logForDebugging(
        `[classifier] tengu_classifier_disabled_surfaces: unknown surface '${trimmed}' ignored`,
      );
    }
  }
  return surfaces;
}
//@ chunk-j71j5cv7.js:2157-2435 placement
function engineFor(sinks) {
  if (sinks.size === 0) return null;
  let engine = sinks.has("state")
    ? "llm"
    : !sinks.has("summary")
      ? "heuristic"
      : process.env.CLAUDE_CODE_CLASSIFIER_SUMMARY !== undefined
        ? isEnvTruthy(process.env.CLAUDE_CODE_CLASSIFIER_SUMMARY)
          ? "llm"
          : "heuristic"
        : getClassifierSummaryMode();
  return engine === "llm" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_wren", false)
    ? "heuristic"
    : engine;
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
function projectsRecapEnabled(config) {
  return (
    hasRelaySourceForClients() &&
    hasUpdateStatusToolOnly(config) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_projects_thread_recap", false)
  );
}
//@ chunk-j71j5cv7.js:2621-2708 placement
var SUMMARY_STATE_TO_CATEGORY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j71j5cv7.js:2621", () => {
  SUMMARY_STATE_TO_CATEGORY = new Map([
    ["blocked", "blocked"],
    ["done", "completed"],
    ["working", "review_ready"],
  ]);
});
//@ chunk-j71j5cv7.js:2708-3195 placement (2.1.88 match: SDKPostTurnSummaryMessageSchema, 0.414)
/**
 * 把分类器结果转成回合后摘要；按界面（desktop/mobile/projects 等）决定是否显示。
 */
function classifiedToPostTurnSummary(input, opts) {
  if (input.recap)
    return {
      status_category:
        input.state === "failed" ? "failed" : (SUMMARY_STATE_TO_CATEGORY.get(input.state) ?? "review_ready"),
      status_detail: input.recap.headline,
      needs_action: input.state === "blocked" ? input.recap.needs : "",
      recent_action: input.recap.needsYou,
      description: input.recap.happened,
      reply: input.recap.reply,
    };
  return {
    status_category: SUMMARY_STATE_TO_CATEGORY.get(input.state) ?? "review_ready",
    status_detail: input.detail,
    needs_action: input.state === "blocked" ? (input.needs ?? "") : "",
    recent_action: input.output.result ?? "",
    ...(opts?.projectsRecap && {
      description: truncateContent(input.detail).text,
    }),
  };
}
//@ chunk-j71j5cv7.js:3195-3655 placement
function runClassifierSummaryForBlocked(event, config) {
  let sinks = sinksFor(detectSurfaces(false));
  if (!sinks.has("summary") || engineFor(sinks) === null) return;
  let mcpInfo = mcpInfoFromString(event.tool_name);
  let label =
    !mcpInfo?.toolName || mcpInfo.serverName === REMOTE_DEVICES
      ? identity(event.tool_name)
      : mcpServerLabel({
          serverName: mcpInfo.serverName,
          toolName: mcpInfo.toolName,
        });
  let summary = event.tool_name.startsWith("dialog:")
    ? {
        status_category: "blocked",
        status_detail: "Waiting on a user dialog",
        needs_action: event.action_description,
      }
    : {
        status_category: "blocked",
        status_detail: `Waiting on permission: ${label}`,
        needs_action: `Approve or deny ${label}`,
      };
  publishPostTurnSummary(config, summary);
}
export {
  hasCcrSurface,
  classifiedToPostTurnSummary,
  detectSurfaces,
  disabledClassifierSurfaces,
  engineFor,
  isPostTurnSummaryVisibleInCli,
  projectsRecapEnabled,
  runClassifierSummaryForBlocked,
  sinksFor,
  watchedForSurfaces,
};
