/**
 * utils/fullscreenBootGuard.ts
 *
 * 2.1.316 新增：全屏模式启动守卫：检测启动失败并回退。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q5g0890f.js (19)
 * attribution: placement 19
 */
import { hostname } from "os";
import { getPlatform } from "./platform.js";
import { isProcessProvablyGone } from "./processIdentity.js";
import { getGlobalConfig, saveGlobalConfig, saveGlobalConfigSyncForExit } from "./config.js";
import {
  fullscreenProbeState,
  getFullscreenDecision,
  fullscreenDecisionMode,
  isFullscreenAutoDisabledForThisVersion,
  isFullscreenEnvEnabled,
} from "./fullscreen.js";
import { env } from "./env.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "./debug.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getIsInteractive } from "../bootstrap/state.js";
import { isShuttingDown } from "./gracefulShutdown.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { isExitExternallyClocked } from "./process.js";
import { profileCheckpoint } from "./startupProfiler.js";
import { logError } from "./log.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-q5g0890f.js:745-781 placement
var DEFAULT_STICKY_STRIKES = 2;
var DEFAULT_HEALTHY_AFTER_MS = 1e4;
var BOOT_RECORD_MAX_AGE_MS = 600000;
var BOOT_RECORD_MAX_AGE_LONG_MS = 2592000000;
//@ chunk-q5g0890f.js:781-832 placement
function safeHostname() {
  try {
    return hostname();
  } catch {
    return "unknown";
  }
}
//@ chunk-q5g0890f.js:832-1406 placement
/**
 * 构造启动守卫上下文（时间、版本、主机、平台、本进程 pid）。
 */
function bootGuardContext(now) {
  return {
    now,
    version: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    host: safeHostname(),
    platform: getPlatform(),
    ownPid: process.pid,
    isGone: isProcessProvablyGone,
  };
}
//@ chunk-q5g0890f.js:1406-2500 placement
/**
 * 根据全局配置中的全屏启动记录判断：清理过期记录、统计本版本未正常启动的次数，决定 none/pending_alive/strike/tripped/disabled。
 */
function evaluateBootRecords(config, context) {
  let stickyStrikes = context.stickyStrikes ?? DEFAULT_STICKY_STRIKES;
  let pending = {
    ...config.fullscreenBootPending,
  };
  let fullscreenAutoDisabled = config.fullscreenAutoDisabled;
  let count =
    config.fullscreenBootStrikes?.version === context.version ? config.fullscreenBootStrikes.count : 0;
  if (fullscreenAutoDisabled && fullscreenAutoDisabled.version !== context.version)
    fullscreenAutoDisabled = undefined;
  let newStrikes = 0;
  let hasAliveBoot = false;
  let POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
  for (let [key, value] of Object.entries(pending)) {
    let pid = Number(key);
    if (!Number.isInteger(pid) || pid < 1 || typeof value !== "object" || !value) {
      delete pending[key];
      continue;
    }
    let max = Math.max(0, context.now - value.startedAt);
    if (value.host !== context.host || value.platform !== context.platform) {
      if (max > BOOT_RECORD_MAX_AGE_LONG_MS) delete pending[key];
      continue;
    }
    if (value.died !== undefined || pid === context.ownPid || context.isGone(pid)) {
      delete pending[key];
      if (value.version === context.version) {
        newStrikes += 1;
        POSITIVE_INFINITY = Math.min(POSITIVE_INFINITY, max);
      }
    } else if (max > BOOT_RECORD_MAX_AGE_MS) delete pending[key];
    else hasAliveBoot = true;
  }
  let decision = {
    kind: "none",
  };
  if (fullscreenAutoDisabled)
    decision = {
      kind: "disabled",
    };
  else if (newStrikes > 0) {
    count += newStrikes;
    let pendingAgeMs = Number.isFinite(POSITIVE_INFINITY) ? POSITIVE_INFINITY : 0;
    if (count >= stickyStrikes) {
      fullscreenAutoDisabled = {
        version: context.version,
        at: context.now,
        strikes: count,
      };
      decision = {
        kind: "tripped",
        strikes: count,
        newStrikes,
        pendingAgeMs,
      };
      count = 0;
    } else
      decision = {
        kind: "strike",
        strikes: count,
        newStrikes,
        pendingAgeMs,
      };
  } else if (hasAliveBoot)
    decision = {
      kind: "pending_alive",
    };
  return {
    next: {
      fullscreenBootPending: Object.keys(pending).length > 0 ? pending : undefined,
      fullscreenBootStrikes:
        count > 0
          ? {
              count,
              version: context.version,
            }
          : undefined,
      fullscreenAutoDisabled,
    },
    decision,
  };
}
//@ chunk-q5g0890f.js:2500-2880 placement
/**
 * 判断启动记录是否变化（需要保存）。
 */
function bootRecordsChanged(previous, next) {
  let pendingKeyList = (config) =>
    Object.keys(config.fullscreenBootPending ?? {})
      .sort()
      .join(",");
  return (
    pendingKeyList(previous) !== pendingKeyList(next) ||
    (previous.fullscreenBootStrikes?.count ?? 0) !== (next.fullscreenBootStrikes?.count ?? 0) ||
    previous.fullscreenBootStrikes?.version !== next.fullscreenBootStrikes?.version ||
    previous.fullscreenAutoDisabled?.version !== next.fullscreenAutoDisabled?.version ||
    previous.fullscreenAutoDisabled?.at !== next.fullscreenAutoDisabled?.at
  );
}
//@ chunk-q5g0890f.js:2880-3992 placement
/**
 * 本版本是否因启动失败而自动关闭了全屏，或有启动失败记录。
 */
function hasFullscreenBootFailures() {
  let globalConfig = getGlobalConfig();
  return (
    globalConfig.fullscreenAutoDisabled?.version ===
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION ||
    (globalConfig.fullscreenBootStrikes?.version ===
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION &&
      globalConfig.fullscreenBootStrikes.count > 0)
  );
}
//@ chunk-q5g0890f.js:3992-4405 placement
/**
 * 全屏渲染器启动失败后回退经典渲染器的提示文字（一次与持续两种）。
 */
var FULLSCREEN_SKIPPED_ONCE_TEXT = `Claude Code's fullscreen renderer didn't finish starting last time on this machine, so this launch is using the classic renderer. It will try fullscreen again next launch; /tui default keeps the classic renderer.
`;
var FULLSCREEN_SKIPPED_FOREVER_TEXT = `Claude Code's fullscreen renderer has repeatedly failed to start on this machine, so it has been turned off here. Run /tui fullscreen to try it again (this also resets after an update).
`;
//@ chunk-q5g0890f.js:4405-5297 placement
/**
 * 启动时检查全屏渲染器的启动失败记录：必要时关闭本次全屏并提示（连续失败会持续关闭直到更新或 /tui fullscreen）。
 */
function checkFullscreenBootGuard(options) {
  let state = options?.state ?? fullscreenProbeState;
  let fullscreenDecision = getFullscreenDecision(state);
  if (
    fullscreenDecision === "env_on" ||
    fullscreenDecision === "bg_forced_on" ||
    env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER
  )
    return {
      kind: "none",
    };
  let context = bootGuardContext(options?.now ?? Date.now());
  let globalConfig = getGlobalConfig();
  let { next: nextConfig, decision } = evaluateBootRecords(globalConfig, context);
  if (bootRecordsChanged(globalConfig, nextConfig))
    saveGlobalConfig((currentConfig) => {
      let freshNext = evaluateBootRecords(currentConfig, context).next;
      return bootRecordsChanged(currentConfig, freshNext)
        ? {
            ...currentConfig,
            ...freshNext,
          }
        : currentConfig;
    }, options?.storageV5);
  if (decision.kind === "strike" || decision.kind === "tripped" || decision.kind === "disabled") {
    state.crashAutoOff = true;
    let wouldOpenFullscreen = fullscreenDecisionMode(fullscreenDecision) === "fullscreen";
    if (decision.kind !== "disabled") {
      logEvent("tengu_fullscreen_crash_auto_off", {
        sticky: decision.kind === "tripped",
        strikes: decision.strikes,
        new_strikes: decision.newStrikes,
        pending_age_ms: decision.pendingAgeMs,
        would_be_entry_path: fromEnum(fullscreenDecision),
        overrides_fullscreen: wouldOpenFullscreen,
      });
      if (wouldOpenFullscreen)
        process.stderr.write(
          decision.kind === "tripped" ? FULLSCREEN_SKIPPED_FOREVER_TEXT : FULLSCREEN_SKIPPED_ONCE_TEXT,
        );
    }
    logForDebugging(
      `fullscreen disabled: a previous fullscreen launch on this machine died before it was healthy (${decision.kind}) \xB7 /tui fullscreen or CLAUDE_CODE_NO_FLICKER=1 to override`,
    );
  } else if (decision.kind !== "none") logForDebugging(`fullscreen boot canary: ${decision.kind}`);
  return decision;
}
//@ chunk-q5g0890f.js:5297-5467 placement
/**
 * 清除全屏自动关闭与失败计数（/tui fullscreen 使用）。
 */
function resetFullscreenAutoDisable(storageV5) {
  return saveGlobalConfig(
    (currentConfig) =>
      currentConfig.fullscreenAutoDisabled === undefined && currentConfig.fullscreenBootStrikes === undefined
        ? currentConfig
        : {
            ...currentConfig,
            fullscreenAutoDisabled: undefined,
            fullscreenBootStrikes: undefined,
          },
    storageV5,
  );
}
//@ chunk-q5g0890f.js:5467-5571 placement
var CANARY_DECISIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-q5g0890f.js:5467", () => {
  CANARY_DECISIONS = new Set([
    "settings_on",
    "upsell_trial_on",
    "ant_default",
    "fresh_install_on",
    "downsell_on",
    "gb_on",
  ]);
});
//@ chunk-q5g0890f.js:5571-5909 placement
/**
 * 启动金丝雀状态：canary、待写盘记录与退出钩子。
 */
class BootCanaryState {
  canary = {
    status: "idle",
  };
  recordMaybeOnDisk = undefined;
  exitHook = undefined;
  retire() {
    if (this.canary.status === "armed") {
      this.canary.cleanup();
      if (this.canary.timer !== undefined) clearTimeout(this.canary.timer);
    }
    this.canary = {
      status: "idle",
    };
    this.recordMaybeOnDisk = undefined;
    if (this.exitHook !== undefined) {
      process.off("exit", this.exitHook);
      this.exitHook = undefined;
    }
  }
}
//@ chunk-q5g0890f.js:5909-5932 placement
var bootCanaryRegistry; // deferred: uses BootCanaryState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-q5g0890f.js:5909", () => {
  bootCanaryRegistry = new HostScoped(() => new BootCanaryState());
});
//@ chunk-q5g0890f.js:5932-5967 placement
function currentBootCanaryState() {
  return bootCanaryRegistry.of(getRootSession().host);
}
//@ chunk-q5g0890f.js:5967-6275 placement
/**
 * 从配置中清除某进程的启动记录（健康时一并清零失败计数）。
 */
function clearBootRecord(config, pid, clearStrikes) {
  let hasPendingRecord = config.fullscreenBootPending?.[String(pid)] !== undefined;
  if (!hasPendingRecord && !(clearStrikes && config.fullscreenBootStrikes)) return config;
  let fullscreenBootPending = config.fullscreenBootPending;
  if (hasPendingRecord && fullscreenBootPending) {
    let { [String(pid)]: removedRecord, ...restPending } = fullscreenBootPending;
    fullscreenBootPending = Object.keys(restPending).length > 0 ? restPending : undefined;
  }
  return {
    ...config,
    fullscreenBootPending,
    fullscreenBootStrikes: clearStrikes ? undefined : config.fullscreenBootStrikes,
  };
}
//@ chunk-q5g0890f.js:6275-6452 placement
function installCanaryExitHook(canaryState) {
  if (canaryState.exitHook !== undefined) return;
  canaryState.exitHook = () => {
    if (canaryState.recordMaybeOnDisk !== undefined && isShuttingDown()) {
      let recordMaybeOnDisk = canaryState.recordMaybeOnDisk;
      saveGlobalConfigSyncForExit((config) => clearBootRecord(config, recordMaybeOnDisk, false));
    }
  };
  process.on("exit", canaryState.exitHook);
}
//@ chunk-q5g0890f.js:6452-8041 placement
/**
 * 进入全屏前布下启动金丝雀：在全局配置中记录本进程的待定启动，退出时根据是否健康清理或保留。
 */
async function armFullscreenBootCanary(options) {
  let state = options?.state ?? fullscreenProbeState;
  let canaryState = currentBootCanaryState();
  if (canaryState.canary.status !== "idle") return canaryState.canary.status === "armed";
  if (!getIsInteractive() || env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER) return false;
  if (
    !state.crashAutoOff &&
    isFullscreenAutoDisabledForThisVersion() &&
    CANARY_DECISIONS.has(getFullscreenDecision(state))
  ) {
    state.crashAutoOff = true;
    logForDebugging(
      "fullscreen disabled: turned off on this machine after repeated failed starts (recorded sticky auto-disable, honoured at REPL mount) \xB7 /tui fullscreen or CLAUDE_CODE_NO_FLICKER=1 to override",
    );
  }
  if (!isFullscreenEnvEnabled(state)) return false;
  if (!CANARY_DECISIONS.has(getFullscreenDecision(state))) return false;
  let pid = process.pid;
  let bootRecord = {
    startedAt: Date.now(),
    version: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    host: safeHostname(),
    platform: getPlatform(),
  };
  let cleanup = registerCleanup(() =>
    settleBootCanary(
      canaryState,
      canaryState.canary.status === "armed" &&
        canaryState.canary.firstFrameAt !== undefined &&
        (process.exitCode === undefined || process.exitCode === 0) &&
        !isExitExternallyClocked()
        ? "healthy"
        : "withdrawn",
    ),
  );
  installCanaryExitHook(canaryState);
  canaryState.canary = {
    status: "armed",
    pid,
    cleanup,
    onHealthy: options?.onHealthy,
    healthyAfterMs: options?.healthyAfterMs ?? DEFAULT_HEALTHY_AFTER_MS,
    firstFrameAt: undefined,
    timer: undefined,
    storageV5: options?.storageV5,
  };
  canaryState.recordMaybeOnDisk = pid;
  profileCheckpoint("fullscreen_canary_arm_start");
  try {
    await saveGlobalConfig(
      (config) => ({
        ...config,
        fullscreenBootPending: {
          ...config.fullscreenBootPending,
          [String(pid)]: bootRecord,
        },
      }),
      options?.storageV5,
    );
  } catch (error) {
    logError(error);
  } finally {
    profileCheckpoint("fullscreen_canary_armed");
  }
  return canaryState.canary.status === "armed";
}
//@ chunk-q5g0890f.js:8041-8279 placement
/**
 * 记录全屏首帧时间，并在健康期后把金丝雀标为健康。
 */
function noteFirstFullscreenFrame(firstFrameAt = Date.now()) {
  let canaryState = currentBootCanaryState();
  if (canaryState.canary.status !== "armed" || canaryState.canary.firstFrameAt !== undefined) return;
  canaryState.canary.firstFrameAt = firstFrameAt;
  canaryState.canary.timer = setTimeout(
    (state) => {
      settleBootCanary(state, "healthy").catch(logError);
    },
    canaryState.canary.healthyAfterMs,
    canaryState,
  );
  canaryState.canary.timer.unref?.();
}
//@ chunk-q5g0890f.js:8279-8636 placement
/**
 * 结算金丝雀：清理、写回配置，健康时调用回调。
 */
async function settleBootCanary(canaryState, outcome) {
  if (canaryState.canary.status !== "armed") return;
  let { pid, cleanup, timer, onHealthy, storageV5 } = canaryState.canary;
  canaryState.canary = {
    status: "settled",
  };
  cleanup();
  if (timer !== undefined) clearTimeout(timer);
  await saveGlobalConfig((config) => clearBootRecord(config, pid, outcome === "healthy"), storageV5);
  if (canaryState.recordMaybeOnDisk === pid) canaryState.recordMaybeOnDisk = undefined;
  logForDebugging(`fullscreen boot canary: ${outcome}`);
  if (outcome === "healthy" && onHealthy)
    try {
      await onHealthy();
    } catch (error) {
      logError(error);
    }
}
//@ chunk-q5g0890f.js:8636-9146 placement
/**
 * 全屏渲染出错时结束金丝雀，并把本进程的启动记录标为 render_error。
 */
async function recordFullscreenRenderFailure() {
  let canaryState = currentBootCanaryState();
  if (canaryState.canary.status !== "armed") return false;
  let { pid, cleanup, timer, storageV5 } = canaryState.canary;
  canaryState.canary = {
    status: "settled",
  };
  cleanup();
  if (timer !== undefined) clearTimeout(timer);
  if (canaryState.recordMaybeOnDisk === pid) canaryState.recordMaybeOnDisk = undefined;
  let recorded = false;
  await saveGlobalConfig((config) => {
    let existingRecord = config.fullscreenBootPending?.[String(pid)];
    if (existingRecord === undefined || existingRecord.died !== undefined) return config;
    recorded = true;
    return {
      ...config,
      fullscreenBootPending: {
        ...config.fullscreenBootPending,
        [String(pid)]: {
          ...existingRecord,
          died: "render_error",
        },
      },
    };
  }, storageV5);
  logForDebugging("fullscreen boot canary: failure recorded");
  return recorded;
}
export {
  checkFullscreenBootGuard,
  hasFullscreenBootFailures,
  resetFullscreenAutoDisable,
  noteFirstFullscreenFrame,
  armFullscreenBootCanary,
  recordFullscreenRenderFailure,
};
