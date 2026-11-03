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
function evaluateBootRecords(e, n) {
  let stickyStrikes = n.stickyStrikes ?? DEFAULT_STICKY_STRIKES;
  let s = {
    ...e.fullscreenBootPending,
  };
  let fullscreenAutoDisabled = e.fullscreenAutoDisabled;
  let count = e.fullscreenBootStrikes?.version === n.version ? e.fullscreenBootStrikes.count : 0;
  if (fullscreenAutoDisabled && fullscreenAutoDisabled.version !== n.version)
    fullscreenAutoDisabled = undefined;
  let r = 0;
  let f = false;
  let POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
  for (let [key, value] of Object.entries(s)) {
    let k = Number(key);
    if (!Number.isInteger(k) || k < 1 || typeof value !== "object" || !value) {
      delete s[key];
      continue;
    }
    let max = Math.max(0, n.now - value.startedAt);
    if (value.host !== n.host || value.platform !== n.platform) {
      if (max > BOOT_RECORD_MAX_AGE_LONG_MS) delete s[key];
      continue;
    }
    if (value.died !== undefined || k === n.ownPid || n.isGone(k)) {
      delete s[key];
      if (value.version === n.version) {
        r += 1;
        POSITIVE_INFINITY = Math.min(POSITIVE_INFINITY, max);
      }
    } else if (max > BOOT_RECORD_MAX_AGE_MS) delete s[key];
    else f = true;
  }
  let h = {
    kind: "none",
  };
  if (fullscreenAutoDisabled)
    h = {
      kind: "disabled",
    };
  else if (r > 0) {
    count += r;
    let pendingAgeMs = Number.isFinite(POSITIVE_INFINITY) ? POSITIVE_INFINITY : 0;
    if (count >= stickyStrikes) {
      fullscreenAutoDisabled = {
        version: n.version,
        at: n.now,
        strikes: count,
      };
      h = {
        kind: "tripped",
        strikes: count,
        newStrikes: r,
        pendingAgeMs,
      };
      count = 0;
    } else
      h = {
        kind: "strike",
        strikes: count,
        newStrikes: r,
        pendingAgeMs,
      };
  } else if (f)
    h = {
      kind: "pending_alive",
    };
  return {
    next: {
      fullscreenBootPending: Object.keys(s).length > 0 ? s : undefined,
      fullscreenBootStrikes:
        count > 0
          ? {
              count,
              version: n.version,
            }
          : undefined,
      fullscreenAutoDisabled,
    },
    decision: h,
  };
}
//@ chunk-q5g0890f.js:2500-2880 placement
/**
 * 判断启动记录是否变化（需要保存）。
 */
function bootRecordsChanged(e, n) {
  let o = (s) =>
    Object.keys(s.fullscreenBootPending ?? {})
      .sort()
      .join(",");
  return (
    o(e) !== o(n) ||
    (e.fullscreenBootStrikes?.count ?? 0) !== (n.fullscreenBootStrikes?.count ?? 0) ||
    e.fullscreenBootStrikes?.version !== n.fullscreenBootStrikes?.version ||
    e.fullscreenAutoDisabled?.version !== n.fullscreenAutoDisabled?.version ||
    e.fullscreenAutoDisabled?.at !== n.fullscreenAutoDisabled?.at
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
function checkFullscreenBootGuard(e) {
  let state = e?.state ?? fullscreenProbeState;
  let fullscreenDecision = getFullscreenDecision(state);
  if (
    fullscreenDecision === "env_on" ||
    fullscreenDecision === "bg_forced_on" ||
    env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER
  )
    return {
      kind: "none",
    };
  let s = bootGuardContext(e?.now ?? Date.now());
  let globalConfig = getGlobalConfig();
  let { next: d, decision } = evaluateBootRecords(globalConfig, s);
  if (bootRecordsChanged(globalConfig, d))
    saveGlobalConfig((f) => {
      let y = evaluateBootRecords(f, s).next;
      return bootRecordsChanged(f, y)
        ? {
            ...f,
            ...y,
          }
        : f;
    }, e?.storageV5);
  if (decision.kind === "strike" || decision.kind === "tripped" || decision.kind === "disabled") {
    state.crashAutoOff = true;
    let f = fullscreenDecisionMode(fullscreenDecision) === "fullscreen";
    if (decision.kind !== "disabled") {
      logEvent("tengu_fullscreen_crash_auto_off", {
        sticky: decision.kind === "tripped",
        strikes: decision.strikes,
        new_strikes: decision.newStrikes,
        pending_age_ms: decision.pendingAgeMs,
        would_be_entry_path: fromEnum(fullscreenDecision),
        overrides_fullscreen: f,
      });
      if (f)
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
    (n) =>
      n.fullscreenAutoDisabled === undefined && n.fullscreenBootStrikes === undefined
        ? n
        : {
            ...n,
            fullscreenAutoDisabled: undefined,
            fullscreenBootStrikes: undefined,
          },
    storageV5,
  );
}
//@ chunk-q5g0890f.js:5467-5571 placement
var CANARY_DECISIONS = new Set([
  "settings_on",
  "upsell_trial_on",
  "ant_default",
  "fresh_install_on",
  "downsell_on",
  "gb_on",
]);
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
var bootCanaryRegistry = new HostScoped(() => new BootCanaryState());
//@ chunk-q5g0890f.js:5932-5967 placement
function currentBootCanaryState() {
  return bootCanaryRegistry.of(getRootSession().host);
}
//@ chunk-q5g0890f.js:5967-6275 placement
/**
 * 从配置中清除某进程的启动记录（健康时一并清零失败计数）。
 */
function clearBootRecord(e, n, o) {
  let s = e.fullscreenBootPending?.[String(n)] !== undefined;
  if (!s && !(o && e.fullscreenBootStrikes)) return e;
  let fullscreenBootPending = e.fullscreenBootPending;
  if (s && fullscreenBootPending) {
    let { [String(n)]: d, ...r } = fullscreenBootPending;
    fullscreenBootPending = Object.keys(r).length > 0 ? r : undefined;
  }
  return {
    ...e,
    fullscreenBootPending,
    fullscreenBootStrikes: o ? undefined : e.fullscreenBootStrikes,
  };
}
//@ chunk-q5g0890f.js:6275-6452 placement
function installCanaryExitHook(e) {
  if (e.exitHook !== undefined) return;
  e.exitHook = () => {
    if (e.recordMaybeOnDisk !== undefined && isShuttingDown()) {
      let recordMaybeOnDisk = e.recordMaybeOnDisk;
      saveGlobalConfigSyncForExit((o) => clearBootRecord(o, recordMaybeOnDisk, false));
    }
  };
  process.on("exit", e.exitHook);
}
//@ chunk-q5g0890f.js:6452-8041 placement
/**
 * 进入全屏前布下启动金丝雀：在全局配置中记录本进程的待定启动，退出时根据是否健康清理或保留。
 */
async function armFullscreenBootCanary(e) {
  let state = e?.state ?? fullscreenProbeState;
  let o = currentBootCanaryState();
  if (o.canary.status !== "idle") return o.canary.status === "armed";
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
  let u = {
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
      o,
      o.canary.status === "armed" &&
        o.canary.firstFrameAt !== undefined &&
        (process.exitCode === undefined || process.exitCode === 0) &&
        !isExitExternallyClocked()
        ? "healthy"
        : "withdrawn",
    ),
  );
  installCanaryExitHook(o);
  o.canary = {
    status: "armed",
    pid,
    cleanup,
    onHealthy: e?.onHealthy,
    healthyAfterMs: e?.healthyAfterMs ?? DEFAULT_HEALTHY_AFTER_MS,
    firstFrameAt: undefined,
    timer: undefined,
    storageV5: e?.storageV5,
  };
  o.recordMaybeOnDisk = pid;
  profileCheckpoint("fullscreen_canary_arm_start");
  try {
    await saveGlobalConfig(
      (r) => ({
        ...r,
        fullscreenBootPending: {
          ...r.fullscreenBootPending,
          [String(pid)]: u,
        },
      }),
      e?.storageV5,
    );
  } catch (error) {
    logError(error);
  } finally {
    profileCheckpoint("fullscreen_canary_armed");
  }
  return o.canary.status === "armed";
}
//@ chunk-q5g0890f.js:8041-8279 placement
/**
 * 记录全屏首帧时间，并在健康期后把金丝雀标为健康。
 */
function noteFirstFullscreenFrame(firstFrameAt = Date.now()) {
  let n = currentBootCanaryState();
  if (n.canary.status !== "armed" || n.canary.firstFrameAt !== undefined) return;
  n.canary.firstFrameAt = firstFrameAt;
  n.canary.timer = setTimeout(
    (o) => {
      settleBootCanary(o, "healthy").catch(logError);
    },
    n.canary.healthyAfterMs,
    n,
  );
  n.canary.timer.unref?.();
}
//@ chunk-q5g0890f.js:8279-8636 placement
/**
 * 结算金丝雀：清理、写回配置，健康时调用回调。
 */
async function settleBootCanary(e, n) {
  if (e.canary.status !== "armed") return;
  let { pid, cleanup, timer, onHealthy, storageV5 } = e.canary;
  e.canary = {
    status: "settled",
  };
  cleanup();
  if (timer !== undefined) clearTimeout(timer);
  await saveGlobalConfig((f) => clearBootRecord(f, pid, n === "healthy"), storageV5);
  if (e.recordMaybeOnDisk === pid) e.recordMaybeOnDisk = undefined;
  logForDebugging(`fullscreen boot canary: ${n}`);
  if (n === "healthy" && onHealthy)
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
  let e = currentBootCanaryState();
  if (e.canary.status !== "armed") return false;
  let { pid, cleanup, timer, storageV5 } = e.canary;
  e.canary = {
    status: "settled",
  };
  cleanup();
  if (timer !== undefined) clearTimeout(timer);
  if (e.recordMaybeOnDisk === pid) e.recordMaybeOnDisk = undefined;
  let d = false;
  await saveGlobalConfig((r) => {
    let f = r.fullscreenBootPending?.[String(pid)];
    if (f === undefined || f.died !== undefined) return r;
    d = true;
    return {
      ...r,
      fullscreenBootPending: {
        ...r.fullscreenBootPending,
        [String(pid)]: {
          ...f,
          died: "render_error",
        },
      },
    };
  }, storageV5);
  logForDebugging("fullscreen boot canary: failure recorded");
  return d;
}
export {
  checkFullscreenBootGuard,
  hasFullscreenBootFailures,
  resetFullscreenAutoDisable,
  noteFirstFullscreenFrame,
  armFullscreenBootCanary,
  recordFullscreenRenderFailure,
};
