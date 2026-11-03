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
var D = 2,
  O = 1e4,
  R = 600000,
  P = 2592000000;
//@ chunk-q5g0890f.js:781-832 placement
function C() {
  try {
    return hostname();
  } catch {
    return "unknown";
  }
}
/**
 * 构造启动守卫上下文（时间、版本、主机、平台、本进程 pid）。
 */
//@ chunk-q5g0890f.js:832-1406 placement
function bootGuardContext(e) {
  return {
    now: e,
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
    host: C(),
    platform: getPlatform(),
    ownPid: process.pid,
    isGone: isProcessProvablyGone,
  };
}
/**
 * 根据全局配置中的全屏启动记录判断：清理过期记录、统计本版本未正常启动的次数，决定 none/pending_alive/strike/tripped/disabled。
 */
//@ chunk-q5g0890f.js:1406-2500 placement
function evaluateBootRecords(e, n) {
  let o = n.stickyStrikes ?? D,
    s = { ...e.fullscreenBootPending },
    fullscreenAutoDisabled = e.fullscreenAutoDisabled,
    d = e.fullscreenBootStrikes?.version === n.version ? e.fullscreenBootStrikes.count : 0;
  if (fullscreenAutoDisabled && fullscreenAutoDisabled.version !== n.version) fullscreenAutoDisabled = void 0;
  let r = 0,
    f = !1,
    POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
  for (let [m, p] of Object.entries(s)) {
    let k = Number(m);
    if (!Number.isInteger(k) || k < 1 || typeof p !== "object" || !p) {
      delete s[m];
      continue;
    }
    let max = Math.max(0, n.now - p.startedAt);
    if (p.host !== n.host || p.platform !== n.platform) {
      if (max > P) delete s[m];
      continue;
    }
    if (p.died !== void 0 || k === n.ownPid || n.isGone(k)) {
      if ((delete s[m], p.version === n.version))
        ((r += 1), (POSITIVE_INFINITY = Math.min(POSITIVE_INFINITY, max)));
    } else if (max > R) delete s[m];
    else f = !0;
  }
  let h = { kind: "none" };
  if (fullscreenAutoDisabled) h = { kind: "disabled" };
  else if (r > 0) {
    d += r;
    let m = Number.isFinite(POSITIVE_INFINITY) ? POSITIVE_INFINITY : 0;
    if (d >= o)
      ((fullscreenAutoDisabled = { version: n.version, at: n.now, strikes: d }),
        (h = { kind: "tripped", strikes: d, newStrikes: r, pendingAgeMs: m }),
        (d = 0));
    else h = { kind: "strike", strikes: d, newStrikes: r, pendingAgeMs: m };
  } else if (f) h = { kind: "pending_alive" };
  return {
    next: {
      fullscreenBootPending: Object.keys(s).length > 0 ? s : void 0,
      fullscreenBootStrikes: d > 0 ? { count: d, version: n.version } : void 0,
      fullscreenAutoDisabled: fullscreenAutoDisabled,
    },
    decision: h,
  };
}
/**
 * 判断启动记录是否变化（需要保存）。
 */
//@ chunk-q5g0890f.js:2500-2880 placement
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
/**
 * 本版本是否因启动失败而自动关闭了全屏，或有启动失败记录。
 */
//@ chunk-q5g0890f.js:2880-3992 placement
function hasFullscreenBootFailures() {
  let e = getGlobalConfig();
  return (
    e.fullscreenAutoDisabled?.version ===
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
    (e.fullscreenBootStrikes?.version ===
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
      e.fullscreenBootStrikes.count > 0)
  );
}
/**
 * 全屏渲染器启动失败后回退经典渲染器的提示文字（一次与持续两种）。
 */
//@ chunk-q5g0890f.js:3992-4405 placement
var FULLSCREEN_SKIPPED_ONCE_TEXT = `Claude Code's fullscreen renderer didn't finish starting last time on this machine, so this launch is using the classic renderer. It will try fullscreen again next launch; /tui default keeps the classic renderer.
`,
  M = `Claude Code's fullscreen renderer has repeatedly failed to start on this machine, so it has been turned off here. Run /tui fullscreen to try it again (this also resets after an update).
`;
/**
 * 启动时检查全屏渲染器的启动失败记录：必要时关闭本次全屏并提示（连续失败会持续关闭直到更新或 /tui fullscreen）。
 */
//@ chunk-q5g0890f.js:4405-5297 placement
function checkFullscreenBootGuard(e) {
  let n = e?.state ?? fullscreenProbeState,
    o = getFullscreenDecision(n);
  if (o === "env_on" || o === "bg_forced_on" || env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER)
    return { kind: "none" };
  let s = bootGuardContext(e?.now ?? Date.now()),
    u = getGlobalConfig(),
    { next: d, decision: decision } = evaluateBootRecords(u, s);
  if (bootRecordsChanged(u, d))
    saveGlobalConfig((f) => {
      let y = evaluateBootRecords(f, s).next;
      return bootRecordsChanged(f, y) ? { ...f, ...y } : f;
    }, e?.storageV5);
  if (decision.kind === "strike" || decision.kind === "tripped" || decision.kind === "disabled") {
    n.crashAutoOff = !0;
    let f = fullscreenDecisionMode(o) === "fullscreen";
    if (decision.kind !== "disabled") {
      if (
        (logEvent("tengu_fullscreen_crash_auto_off", {
          sticky: decision.kind === "tripped",
          strikes: decision.strikes,
          new_strikes: decision.newStrikes,
          pending_age_ms: decision.pendingAgeMs,
          would_be_entry_path: fromEnum(o),
          overrides_fullscreen: f,
        }),
        f)
      )
        process.stderr.write(decision.kind === "tripped" ? M : FULLSCREEN_SKIPPED_ONCE_TEXT);
    }
    logForDebugging(
      `fullscreen disabled: a previous fullscreen launch on this machine died before it was healthy (${decision.kind}) \xB7 /tui fullscreen or CLAUDE_CODE_NO_FLICKER=1 to override`,
    );
  } else if (decision.kind !== "none") logForDebugging(`fullscreen boot canary: ${decision.kind}`);
  return decision;
}
/**
 * 清除全屏自动关闭与失败计数（/tui fullscreen 使用）。
 */
//@ chunk-q5g0890f.js:5297-5467 placement
function resetFullscreenAutoDisable(e) {
  return saveGlobalConfig(
    (n) =>
      n.fullscreenAutoDisabled === void 0 && n.fullscreenBootStrikes === void 0
        ? n
        : { ...n, fullscreenAutoDisabled: void 0, fullscreenBootStrikes: void 0 },
    e,
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
/**
 * 启动金丝雀状态：canary、待写盘记录与退出钩子。
 */
//@ chunk-q5g0890f.js:5571-5909 placement
class BootCanaryState {
  canary = { status: "idle" };
  recordMaybeOnDisk = void 0;
  exitHook = void 0;
  retire() {
    if (this.canary.status === "armed") {
      if ((this.canary.cleanup(), this.canary.timer !== void 0)) clearTimeout(this.canary.timer);
    }
    if (((this.canary = { status: "idle" }), (this.recordMaybeOnDisk = void 0), this.exitHook !== void 0))
      (process.off("exit", this.exitHook), (this.exitHook = void 0));
  }
}
//@ chunk-q5g0890f.js:5909-5932 placement
var N = new HostScoped(() => new BootCanaryState());
//@ chunk-q5g0890f.js:5932-5967 placement
function b() {
  return N.of(getRootSession().host);
}
/**
 * 从配置中清除某进程的启动记录（健康时一并清零失败计数）。
 */
//@ chunk-q5g0890f.js:5967-6275 placement
function clearBootRecord(e, n, o) {
  let s = e.fullscreenBootPending?.[String(n)] !== void 0;
  if (!s && !(o && e.fullscreenBootStrikes)) return e;
  let fullscreenBootPending = e.fullscreenBootPending;
  if (s && fullscreenBootPending) {
    let { [String(n)]: d, ...r } = fullscreenBootPending;
    fullscreenBootPending = Object.keys(r).length > 0 ? r : void 0;
  }
  return {
    ...e,
    fullscreenBootPending: fullscreenBootPending,
    fullscreenBootStrikes: o ? void 0 : e.fullscreenBootStrikes,
  };
}
//@ chunk-q5g0890f.js:6275-6452 placement
function installCanaryExitHook(e) {
  if (e.exitHook !== void 0) return;
  ((e.exitHook = () => {
    if (e.recordMaybeOnDisk !== void 0 && isShuttingDown()) {
      let recordMaybeOnDisk = e.recordMaybeOnDisk;
      saveGlobalConfigSyncForExit((o) => clearBootRecord(o, recordMaybeOnDisk, !1));
    }
  }),
    process.on("exit", e.exitHook));
}
/**
 * 进入全屏前布下启动金丝雀：在全局配置中记录本进程的待定启动，退出时根据是否健康清理或保留。
 */
//@ chunk-q5g0890f.js:6452-8041 placement
async function armFullscreenBootCanary(e) {
  let n = e?.state ?? fullscreenProbeState,
    o = b();
  if (o.canary.status !== "idle") return o.canary.status === "armed";
  if (!getIsInteractive() || env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER) return !1;
  if (
    !n.crashAutoOff &&
    isFullscreenAutoDisabledForThisVersion() &&
    CANARY_DECISIONS.has(getFullscreenDecision(n))
  )
    ((n.crashAutoOff = !0),
      logForDebugging(
        "fullscreen disabled: turned off on this machine after repeated failed starts (recorded sticky auto-disable, honoured at REPL mount) \xB7 /tui fullscreen or CLAUDE_CODE_NO_FLICKER=1 to override",
      ));
  if (!isFullscreenEnvEnabled(n)) return !1;
  if (!CANARY_DECISIONS.has(getFullscreenDecision(n))) return !1;
  let pid = process.pid,
    u = {
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
      host: C(),
      platform: getPlatform(),
    },
    d = registerCleanup(() =>
      settleBootCanary(
        o,
        o.canary.status === "armed" &&
          o.canary.firstFrameAt !== void 0 &&
          (process.exitCode === void 0 || process.exitCode === 0) &&
          !isExitExternallyClocked()
          ? "healthy"
          : "withdrawn",
      ),
    );
  (installCanaryExitHook(o),
    (o.canary = {
      status: "armed",
      pid: pid,
      cleanup: d,
      onHealthy: e?.onHealthy,
      healthyAfterMs: e?.healthyAfterMs ?? O,
      firstFrameAt: void 0,
      timer: void 0,
      storageV5: e?.storageV5,
    }),
    (o.recordMaybeOnDisk = pid),
    profileCheckpoint("fullscreen_canary_arm_start"));
  try {
    await saveGlobalConfig(
      (r) => ({ ...r, fullscreenBootPending: { ...r.fullscreenBootPending, [String(pid)]: u } }),
      e?.storageV5,
    );
  } catch (error) {
    logError(error);
  } finally {
    profileCheckpoint("fullscreen_canary_armed");
  }
  return o.canary.status === "armed";
}
/**
 * 记录全屏首帧时间，并在健康期后把金丝雀标为健康。
 */
//@ chunk-q5g0890f.js:8041-8279 placement
function noteFirstFullscreenFrame(e = Date.now()) {
  let n = b();
  if (n.canary.status !== "armed" || n.canary.firstFrameAt !== void 0) return;
  ((n.canary.firstFrameAt = e),
    (n.canary.timer = setTimeout(
      (o) => {
        settleBootCanary(o, "healthy").catch(logError);
      },
      n.canary.healthyAfterMs,
      n,
    )),
    n.canary.timer.unref?.());
}
/**
 * 结算金丝雀：清理、写回配置，健康时调用回调。
 */
//@ chunk-q5g0890f.js:8279-8636 placement
async function settleBootCanary(e, n) {
  if (e.canary.status !== "armed") return;
  let { pid: pid, cleanup: cleanup, timer: timer, onHealthy: onHealthy, storageV5: storageV5 } = e.canary;
  if (((e.canary = { status: "settled" }), cleanup(), timer !== void 0)) clearTimeout(timer);
  if (
    (await saveGlobalConfig((f) => clearBootRecord(f, pid, n === "healthy"), storageV5),
    e.recordMaybeOnDisk === pid)
  )
    e.recordMaybeOnDisk = void 0;
  if ((logForDebugging(`fullscreen boot canary: ${n}`), n === "healthy" && onHealthy))
    try {
      await onHealthy();
    } catch (error) {
      logError(error);
    }
}
/**
 * 全屏渲染出错时结束金丝雀，并把本进程的启动记录标为 render_error。
 */
//@ chunk-q5g0890f.js:8636-9146 placement
async function recordFullscreenRenderFailure() {
  let e = b();
  if (e.canary.status !== "armed") return !1;
  let { pid: pid, cleanup: cleanup, timer: timer, storageV5: storageV5 } = e.canary;
  if (((e.canary = { status: "settled" }), cleanup(), timer !== void 0)) clearTimeout(timer);
  if (e.recordMaybeOnDisk === pid) e.recordMaybeOnDisk = void 0;
  let d = !1;
  return (
    await saveGlobalConfig((r) => {
      let f = r.fullscreenBootPending?.[String(pid)];
      if (f === void 0 || f.died !== void 0) return r;
      return (
        (d = !0),
        {
          ...r,
          fullscreenBootPending: {
            ...r.fullscreenBootPending,
            [String(pid)]: { ...f, died: "render_error" },
          },
        }
      );
    }, storageV5),
    logForDebugging("fullscreen boot canary: failure recorded"),
    d
  );
}

export {
  checkFullscreenBootGuard,
  hasFullscreenBootFailures,
  resetFullscreenAutoDisable,
  noteFirstFullscreenFrame,
  armFullscreenBootCanary,
  recordFullscreenRenderFailure,
};
