/**
 * utils/fullscreen.ts
 *
 * 全屏（alt-screen）模式判定：环境变量/设置/tmux -CC/Windows SSH 自动关闭、鼠标追踪模式与 tmux 鼠标提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fullscreen.ts
 * pieces: chunk-cxdk9p3j.js (35), chunk-s61vbvea.js (2)
 * attribution: sole-consumer 1, affinity 2, fingerprint 4, placement 14, layout 15, callgraph-witnessed 1
 */
import { spawnSync } from "child_process";
import { env, isSSHSession } from "./env.js";
import { resolveExecutableSafely } from "./findExecutableWindows.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getIsInteractive, getIsRemoteMode } from "../bootstrap/state.js";
import { getGlobalConfig } from "./config.js";
import {
  isGrowthBookEnabled,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import { getEntrypointKind } from "./entrypointKinds.js";
import { isScreenReaderMode } from "./accessibility/screenReader.js";
import { logForDebugging } from "./debug.js";
import { getInitialSettings_2 } from "./settings/settings.js";
import { createSignal } from "./signal.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { isDiffPanelEnabled } from "./task/framework.js";
import { hasRemoteSdkUrl } from "../services/ccrAgentProxy/agentProxy.js";

//@ chunk-cxdk9p3j.js:671-979 sole-consumer
/**
 * 创建全屏模式探测状态：tmux 控制模式、鼠标与焦点提示是否已检查等。
 */
function createFullscreenProbeState() {
  return {
    loggedTmuxCcDisable: false,
    loggedWinSshDisable: false,
    checkedTmuxMouseHint: false,
    checkedTmuxFocusHint: false,
    tmuxControlModeProbed: undefined,
    tmuxMouseOptionProbe: undefined,
    tmuxFocusOptionProbe: undefined,
    gbGateCached: undefined,
    gbGateSource: undefined,
    downsellGateCached: undefined,
    freshInstallCached: undefined,
    crashAutoOff: false,
  };
}
//@ chunk-cxdk9p3j.js:979-990 affinity
var fullscreenProbeState = createFullscreenProbeState();
//@ chunk-cxdk9p3j.js:990-1134 fingerprint = isTmuxControlModeEnvHeuristic (1)
function isTmuxControlModeEnvHeuristic() {
  if (!env.TMUX) return false;
  if (env.TERM_PROGRAM !== "iTerm.app") return false;
  let term = env.TERM ?? "";
  return !term.startsWith("screen") && !term.startsWith("tmux");
}
//@ chunk-cxdk9p3j.js:1134-1511 fingerprint = probeTmuxControlModeSync (0.896)
function probeTmuxControlModeSync(e) {
  e.tmuxControlModeProbed = isTmuxControlModeEnvHeuristic();
  if (e.tmuxControlModeProbed) return;
  if (!env.TMUX) return;
  if (env.TERM_PROGRAM) return;
  let executable = resolveExecutableSafely("tmux");
  if (executable === null) return;
  let result;
  try {
    result = spawnSync(executable, ["display-message", "-p", "#{client_control_mode}"], {
      encoding: "utf8",
      timeout: 2000,
      cwd: undefined,
      env: process.env,
      windowsHide: true,
    });
  } catch {
    return;
  }
  if (result.status !== 0) return;
  e.tmuxControlModeProbed = result.stdout.trim() === "1";
}
//@ chunk-cxdk9p3j.js:1511-1606 affinity
function isTmuxControlMode(e = fullscreenProbeState) {
  if (e.tmuxControlModeProbed === undefined) probeTmuxControlModeSync(e);
  return e.tmuxControlModeProbed ?? false;
}
//@ chunk-cxdk9p3j.js:1705-1930 placement
class FullscreenTrialState {
  latched = false;
  mode = undefined;
  persisted = false;
  upsellImpression = undefined;
  latchFromEnv() {
    if (this.latched) return;
    this.latched = true;
    this.mode = env.CLAUDE_CODE_TUI_TRIAL === "fullscreen" ? "fullscreen" : undefined;
    env.unset("CLAUDE_CODE_TUI_TRIAL");
  }
}
//@ chunk-cxdk9p3j.js:1930-1953 layout
var fullscreenTrialRegistry = new HostScoped(() => new FullscreenTrialState());
//@ chunk-cxdk9p3j.js:1953-1990 placement
/**
 * 取当前宿主的全屏试用状态。
 */
function currentFullscreenTrialState() {
  return fullscreenTrialRegistry.of(getRootSession().host);
}
//@ chunk-cxdk9p3j.js:1990-2026 placement
/**
 * 从环境变量锁定全屏试用状态。
 */
function latchFullscreenTrialFromEnv() {
  currentFullscreenTrialState().latchFromEnv();
}
//@ chunk-cxdk9p3j.js:2026-2084 placement
/**
 * 解析当前全屏模式（先按环境变量锁定，再取状态）。
 */
function resolveFullscreenMode() {
  let e = currentFullscreenTrialState();
  e.latchFromEnv();
  return e.mode;
}
//@ chunk-cxdk9p3j.js:2084-2632 placement
/**
 * 判断全屏模式是否在当前版本被自动关闭过。
 */
function isFullscreenAutoDisabledForThisVersion() {
  return (
    getGlobalConfig().fullscreenAutoDisabled?.version ===
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
    }.VERSION
  );
}
//@ chunk-cxdk9p3j.js:2632-2722 placement
function isFullscreenDisabledByEnv() {
  return env.CLAUDE_CODE_NO_FLICKER === false || env.CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN;
}
//@ chunk-cxdk9p3j.js:2722-2732 placement
/**
 * 全屏推销提示最多显示次数。
 */
var MAX_FULLSCREEN_UPSELL_SHOWS = 3;
//@ chunk-cxdk9p3j.js:2732-2865 placement
function isFreshInstallForFullscreen() {
  try {
    if (isGrowthBookEnabled()) return false;
    let globalConfig = getGlobalConfig();
    return (
      globalConfig.firstStartVersion !== undefined &&
      (globalConfig.fullscreenUpsellSeenCount ?? 0) < MAX_FULLSCREEN_UPSELL_SHOWS
    );
  } catch {
    return;
  }
}
//@ chunk-cxdk9p3j.js:2865-3000 layout
function isFreshInstallCached(e) {
  if (e.freshInstallCached !== undefined) return e.freshInstallCached;
  let n = isFreshInstallForFullscreen();
  if (n !== undefined) e.freshInstallCached = n;
  return n ?? false;
}
//@ chunk-cxdk9p3j.js:3000-3812 callgraph-witnessed = isFullscreenEnvEnabled (0.273)
function isFullscreenEnvEnabled(e = fullscreenProbeState) {
  if (getEntrypointKind() === "local-agent") return false;
  if (env.CLAUDE_CODE_SESSION_KIND === "bg") return true;
  if (isScreenReaderMode()) return false;
  if (isFullscreenDisabledByEnv()) return false;
  if (env.CLAUDE_CODE_NO_FLICKER === true) return true;
  if (e.crashAutoOff) return false;
  if (isTmuxControlMode(e)) {
    if (!e.loggedTmuxCcDisable) {
      e.loggedTmuxCcDisable = true;
      logForDebugging(
        "fullscreen disabled: tmux -CC (iTerm2 integration mode) detected \xB7 set CLAUDE_CODE_NO_FLICKER=1 to override",
      );
    }
    return false;
  }
  if (isSSHSession()) {
    if (!e.loggedWinSshDisable) {
      e.loggedWinSshDisable = true;
      logForDebugging(
        "fullscreen disabled: Windows over SSH (ConPTY re-rendering) detected \xB7 set CLAUDE_CODE_NO_FLICKER=1 to override",
      );
    }
    return false;
  }
  switch (getInitialSettings_2().tui ?? resolveFullscreenMode()) {
    case "fullscreen":
      return true;
    case "default":
      return false;
  }
  if (isFreshInstallCached(e)) return true;
  if (isFullscreenDownsellGateOn(e)) return true;
  if (e.gbGateCached === undefined) {
    let n = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_pewter_brook", false);
    e.gbGateCached = n.value;
    e.gbGateSource = n.source;
  }
  return e.gbGateCached;
}
//@ chunk-cxdk9p3j.js:3812-3906 layout
function isFullscreenDownsellGateOn(e = fullscreenProbeState) {
  e.downsellGateCached ??= getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_creek", false);
  return e.downsellGateCached;
}
//@ chunk-cxdk9p3j.js:3906-4144 layout
function shouldUseFullscreenByDefault(e = fullscreenProbeState) {
  if (isScreenReaderMode()) return false;
  if (isFullscreenDisabledByEnv()) return false;
  if (env.CLAUDE_CODE_NO_FLICKER === true) return true;
  if (e.crashAutoOff || isFullscreenAutoDisabledForThisVersion()) return false;
  if (isSSHSession()) return false;
  if (isTmuxControlMode(e)) return false;
  switch (getInitialSettings_2().tui) {
    case "fullscreen":
      return true;
    case "default":
      return false;
  }
  return true;
}
//@ chunk-cxdk9p3j.js:4144-4759 layout
function getFullscreenDecision(state = fullscreenProbeState) {
  if (env.CLAUDE_CODE_SESSION_KIND === "bg") return "bg_forced_on";
  if (isScreenReaderMode()) return "sr_auto_off";
  if (isFullscreenDisabledByEnv()) return "env_off";
  if (env.CLAUDE_CODE_NO_FLICKER === true) return "env_on";
  if (state.crashAutoOff) return "crash_auto_off";
  if (isTmuxControlMode(state)) return "tmux_cc_auto_off";
  if (isSSHSession()) return "win_ssh_auto_off";
  let tui = getInitialSettings_2().tui;
  switch (tui ?? resolveFullscreenMode()) {
    case "fullscreen":
      return tui === "fullscreen" ? "settings_on" : "upsell_trial_on";
    case "default":
      return "settings_off";
  }
  if (state.freshInstallCached ?? isFreshInstallForFullscreen()) return "fresh_install_on";
  if (state.downsellGateCached ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_creek", false))
    return "downsell_on";
  return (state.gbGateCached ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_pewter_brook", false))
    ? "gb_on"
    : "gb_off";
}
//@ chunk-cxdk9p3j.js:4759-5095 layout
/**
 * 把全屏决策原因归类为开启、关闭等模式。
 */
function fullscreenDecisionMode(fullscreenDecision) {
  switch (fullscreenDecision) {
    case "env_on":
    case "bg_forced_on":
    case "settings_on":
    case "upsell_trial_on":
    case "ant_default":
    case "fresh_install_on":
    case "downsell_on":
    case "gb_on":
      return "fullscreen";
    case "env_off":
    case "sr_auto_off":
    case "crash_auto_off":
    case "tmux_cc_auto_off":
    case "win_ssh_auto_off":
    case "settings_off":
    case "gb_off":
      return "default";
  }
}
//@ chunk-cxdk9p3j.js:5095-5199 layout
function isAutoOffDecision(fullscreenDecision) {
  return (
    fullscreenDecision === "env_off" ||
    fullscreenDecision === "sr_auto_off" ||
    fullscreenDecision === "tmux_cc_auto_off" ||
    fullscreenDecision === "win_ssh_auto_off"
  );
}
//@ chunk-cxdk9p3j.js:5199-5259 layout
/**
 * 判断全屏开关是否来自 GrowthBook 回退值。
 */
function isFullscreenGateFromFallback(e = fullscreenProbeState) {
  return isGrowthBookEnabled() && e.gbGateSource === "fallback";
}
//@ chunk-cxdk9p3j.js:5259-5370 layout
function getNoFlickerEnvOverride() {
  if (env.CLAUDE_CODE_NO_FLICKER === true) return "on";
  if (env.CLAUDE_CODE_NO_FLICKER === false) return "off";
  return;
}
//@ chunk-cxdk9p3j.js:5370-5590 fingerprint = isMouseTrackingEnabled (0.31)
function isMouseTrackingEnabled() {
  if (env.CLAUDE_CODE_DISABLE_MOUSE !== undefined) return env.CLAUDE_CODE_DISABLE_MOUSE ? "off" : "full";
  if (env.CLAUDE_CODE_DISABLE_MOUSE_CLICKS !== undefined)
    return env.CLAUDE_CODE_DISABLE_MOUSE_CLICKS ? "scroll" : "full";
  return "full";
}
//@ chunk-cxdk9p3j.js:5590-5764 layout
class _ {
  observed = false;
  changed = createSignal();
  subscribe = this.changed.subscribe;
  get hasObserved() {
    return this.observed;
  }
  note() {
    if (this.observed) return;
    this.observed = true;
    this.changed.emit();
  }
}
//@ chunk-cxdk9p3j.js:5764-5787 layout
var fullscreenObservationRegistry = new HostScoped(() => new _());
//@ chunk-cxdk9p3j.js:5787-5824 layout
/**
 * 记录一次"观察到全屏"事件。
 */
function noteFullscreenObserved() {
  fullscreenObservationRegistry.of(getRootSession().host).note();
}
//@ chunk-cxdk9p3j.js:5824-5873 layout
/**
 * 判断是否已观察到全屏模式正常工作。
 */
function hasFullscreenBeenObserved() {
  return fullscreenObservationRegistry.of(getRootSession().host).hasObserved;
}
//@ chunk-cxdk9p3j.js:5873-5924 layout
/**
 * 订阅"已观察到全屏"事件。
 */
function subscribeFullscreenObserved(e) {
  return fullscreenObservationRegistry.of(getRootSession().host).subscribe(e);
}
//@ chunk-cxdk9p3j.js:5924-5961 layout
function isFullscreenActive(e = fullscreenProbeState) {
  return getIsInteractive() && isFullscreenEnvEnabled(e);
}
//@ chunk-cxdk9p3j.js:5961-6274 fingerprint = maybeGetTmuxMouseHint (0.566)
async function maybeGetTmuxMouseHint(e = fullscreenProbeState) {
  if (!env.TMUX) return null;
  if (!isFullscreenActive(e) || isTmuxControlMode(e)) return null;
  if (e.checkedTmuxMouseHint) return null;
  e.checkedTmuxMouseHint = true;
  let n = await probeTmuxOption(e, "mouse");
  if (n === null || n === "on") return null;
  return "tmux detected \xB7 scroll with PgUp/PgDn \xB7 or add 'set -g mouse on' to ~/.tmux.conf for wheel scroll";
}
//@ chunk-cxdk9p3j.js:6274-6434 placement
var TMUX_OPTION_PROBES = {
  mouse: {
    cacheKey: "tmuxMouseOptionProbe",
    args: ["show", "-Av", "mouse"],
  },
  "focus-events": {
    cacheKey: "tmuxFocusOptionProbe",
    args: ["show", "-gv", "focus-events"],
  },
};
//@ chunk-cxdk9p3j.js:6434-6587 placement
function probeTmuxOption(e, n) {
  let { cacheKey, args } = TMUX_OPTION_PROBES[n];
  e[cacheKey] ??= execFileNoThrow("tmux", [...args], {
    useCwd: false,
    timeout: 2000,
  }).then(({ stdout, code }) => (code === 0 ? stdout.trim() : null));
  return e[cacheKey];
}
//@ chunk-cxdk9p3j.js:6587-6662 placement
/**
 * 在 tmux 中探测 mouse 与 focus-events 选项（仅 tmux 且非控制模式时）。
 */
function probeTmuxOptionsForFullscreen(e = fullscreenProbeState) {
  if (!env.TMUX || isTmuxControlModeEnvHeuristic()) return;
  probeTmuxOption(e, "mouse");
  probeTmuxOption(e, "focus-events");
}
//@ chunk-cxdk9p3j.js:6662-6974 placement
/**
 * 在 tmux 中检查 focus-events 选项，未开启时返回提示（只检查一次）。
 */
async function maybeGetTmuxFocusHint(e = fullscreenProbeState) {
  if (!env.TMUX) return null;
  if (isTmuxControlMode(e)) return null;
  if (e.checkedTmuxFocusHint) return null;
  e.checkedTmuxFocusHint = true;
  let n = await probeTmuxOption(e, "focus-events");
  if (n === null || n === "on") return null;
  return "tmux focus-events off \xB7 add 'set -g focus-events on' to ~/.tmux.conf and reattach for focus tracking";
}
//@ chunk-s61vbvea.js:460728-460828 placement
function resolveRenderMode(presentation, dispatchedAsImmediate = false) {
  if (isRemoteSessionAvailable() || presentation !== "fullscreen") return "inline";
  return isDiffPanelEnabled() || dispatchedAsImmediate ? "fullscreen" : "inline";
}
//@ chunk-s61vbvea.js:460828-460861 placement
/**
 * 判断是否处于远程 SDK 或远程模式会话。
 */
function isRemoteSdkOrRemoteMode() {
  return hasRemoteSdkUrl() || getIsRemoteMode();
}
export {
  latchFullscreenTrialFromEnv,
  getNoFlickerEnvOverride,
  getFullscreenDecision,
  isFullscreenActive,
  isFullscreenEnvEnabled,
  subscribeFullscreenObserved,
  hasFullscreenBeenObserved,
  isMouseTrackingEnabled,
  resolveFullscreenMode,
  isAutoOffDecision,
  isFullscreenGateFromFallback,
  MAX_FULLSCREEN_UPSELL_SHOWS,
  isFullscreenAutoDisabledForThisVersion,
  fullscreenProbeState,
  maybeGetTmuxMouseHint,
  maybeGetTmuxFocusHint,
  isTmuxControlMode,
  fullscreenDecisionMode,
  resolveRenderMode,
  currentFullscreenTrialState,
  isRemoteSdkOrRemoteMode,
  shouldUseFullscreenByDefault,
  noteFullscreenObserved,
  probeTmuxOptionsForFullscreen,
};
