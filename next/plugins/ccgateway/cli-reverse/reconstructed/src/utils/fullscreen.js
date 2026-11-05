/**
 * utils/fullscreen.ts
 *
 * 全屏（alt-screen）模式判定：环境变量/设置/tmux -CC/Windows SSH 自动关闭、鼠标追踪模式与 tmux 鼠标提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fullscreen.ts
 * pieces: chunk-7jxyna5q.js (2), chunk-yenb1r87.js (36)
 * attribution: placement 14, sole-consumer 1, affinity 1, fingerprint 4, layout 17, callgraph-witnessed 1
 */
import { spawnSync } from "child_process";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { isDiffPanelEnabled } from "./task/framework.js";
import { hasRemoteSdkUrl } from "../services/ccrAgentProxy/agentProxy.js";
import { getIsRemoteMode, getRootSession, getIsInteractive } from "../bootstrap/state.js";
import { env } from "./env.js";
import { resolveExecutableSafely } from "./findExecutableWindows.js";
import { getPlatform } from "./platform.js";
import { HostScoped } from "./hostScoped.js";
import { getGlobalConfig } from "./config.js";
import {
  isGrowthBookEnabled,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import { getEntrypointKind } from "./entrypointKinds.js";
import { isScreenReaderMode } from "./accessibility/screenReader.js";
import { logForDebugging } from "./debug.js";
import { getInitialSettings } from "./settings/settings.js";
import { createSignal } from "./signal.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:378154-378254 placement
function resolveRenderMode(mode, dispatchedAsImmediate = false) {
  if (isRemoteSessionAvailable() || mode !== "fullscreen") return "inline";
  return isDiffPanelEnabled() || dispatchedAsImmediate ? "fullscreen" : "inline";
}
//@ chunk-7jxyna5q.js:378254-378287 placement
/**
 * 判断是否处于远程 SDK 或远程模式会话。
 */
function isRemoteSdkOrRemoteMode() {
  return hasRemoteSdkUrl() || getIsRemoteMode();
}
//@ chunk-yenb1r87.js:671-979 sole-consumer
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
//@ chunk-yenb1r87.js:979-990 affinity
var fullscreenProbeState; // deferred: uses createFullscreenProbeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-yenb1r87.js:979", () => {
  fullscreenProbeState = createFullscreenProbeState();
});
//@ chunk-yenb1r87.js:990-1134 fingerprint (2.1.88 match: isTmuxControlModeEnvHeuristic, 1)
function isTmuxControlModeEnvHeuristic() {
  if (!env.TMUX) return false;
  if (env.TERM_PROGRAM !== "iTerm.app") return false;
  let term = env.TERM ?? "";
  return !term.startsWith("screen") && !term.startsWith("tmux");
}
//@ chunk-yenb1r87.js:1134-1511 fingerprint (2.1.88 match: probeTmuxControlModeSync, 0.896)
function probeTmuxControlModeSync(state) {
  state.tmuxControlModeProbed = isTmuxControlModeEnvHeuristic();
  if (state.tmuxControlModeProbed) return;
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
  state.tmuxControlModeProbed = result.stdout.trim() === "1";
}
//@ chunk-yenb1r87.js:1511-1606 layout
function isTmuxControlMode(state = fullscreenProbeState) {
  if (state.tmuxControlModeProbed === undefined) probeTmuxControlModeSync(state);
  return state.tmuxControlModeProbed ?? false;
}
//@ chunk-yenb1r87.js:1606-1705 layout (2.1.88 match: isSSHSession, 1)
function isSSHSession() {
  if (getPlatform() !== "windows") return false;
  return Boolean(env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY);
}
//@ chunk-yenb1r87.js:1705-1930 placement
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
//@ chunk-yenb1r87.js:1930-1953 layout
var fullscreenTrialRegistry; // deferred: uses FullscreenTrialState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-yenb1r87.js:1930", () => {
  fullscreenTrialRegistry = new HostScoped(() => new FullscreenTrialState());
});
//@ chunk-yenb1r87.js:1953-1990 placement
/**
 * 取当前宿主的全屏试用状态。
 */
function currentFullscreenTrialState() {
  return fullscreenTrialRegistry.of(getRootSession().host);
}
//@ chunk-yenb1r87.js:1990-2026 placement
/**
 * 从环境变量锁定全屏试用状态。
 */
function latchFullscreenTrialFromEnv() {
  currentFullscreenTrialState().latchFromEnv();
}
//@ chunk-yenb1r87.js:2026-2084 placement
/**
 * 解析当前全屏模式（先按环境变量锁定，再取状态）。
 */
function resolveFullscreenMode() {
  let trialState = currentFullscreenTrialState();
  trialState.latchFromEnv();
  return trialState.mode;
}
//@ chunk-yenb1r87.js:2084-2632 placement
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
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION
  );
}
//@ chunk-yenb1r87.js:2632-2722 placement
function isFullscreenDisabledByEnv() {
  return env.CLAUDE_CODE_NO_FLICKER === false || env.CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN;
}
//@ chunk-yenb1r87.js:2722-2732 placement
/**
 * 全屏推销提示最多显示次数。
 */
var MAX_FULLSCREEN_UPSELL_SHOWS = 3;
//@ chunk-yenb1r87.js:2732-2865 placement
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
//@ chunk-yenb1r87.js:2865-3000 layout
function isFreshInstallCached(state) {
  if (state.freshInstallCached !== undefined) return state.freshInstallCached;
  let freshInstall = isFreshInstallForFullscreen();
  if (freshInstall !== undefined) state.freshInstallCached = freshInstall;
  return freshInstall ?? false;
}
//@ chunk-yenb1r87.js:3000-3812 callgraph-witnessed (2.1.88 match: isFullscreenEnvEnabled, 0.273)
function isFullscreenEnvEnabled(state = fullscreenProbeState) {
  if (getEntrypointKind() === "local-agent") return false;
  if (env.CLAUDE_CODE_SESSION_KIND === "bg") return true;
  if (isScreenReaderMode()) return false;
  if (isFullscreenDisabledByEnv()) return false;
  if (env.CLAUDE_CODE_NO_FLICKER === true) return true;
  if (state.crashAutoOff) return false;
  if (isTmuxControlMode(state)) {
    if (!state.loggedTmuxCcDisable) {
      state.loggedTmuxCcDisable = true;
      logForDebugging(
        "fullscreen disabled: tmux -CC (iTerm2 integration mode) detected \xB7 set CLAUDE_CODE_NO_FLICKER=1 to override",
      );
    }
    return false;
  }
  if (isSSHSession()) {
    if (!state.loggedWinSshDisable) {
      state.loggedWinSshDisable = true;
      logForDebugging(
        "fullscreen disabled: Windows over SSH (ConPTY re-rendering) detected \xB7 set CLAUDE_CODE_NO_FLICKER=1 to override",
      );
    }
    return false;
  }
  switch (getInitialSettings().tui ?? resolveFullscreenMode()) {
    case "fullscreen":
      return true;
    case "default":
      return false;
  }
  if (isFreshInstallCached(state)) return true;
  if (isFullscreenDownsellGateOn(state)) return true;
  if (state.gbGateCached === undefined) {
    let featureValue = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_pewter_brook", false);
    state.gbGateCached = featureValue.value;
    state.gbGateSource = featureValue.source;
  }
  return state.gbGateCached;
}
//@ chunk-yenb1r87.js:3812-3906 layout
function isFullscreenDownsellGateOn(state = fullscreenProbeState) {
  state.downsellGateCached ??= getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_creek", false);
  return state.downsellGateCached;
}
//@ chunk-yenb1r87.js:3906-4144 layout
function shouldUseFullscreenByDefault(state = fullscreenProbeState) {
  if (isScreenReaderMode()) return false;
  if (isFullscreenDisabledByEnv()) return false;
  if (env.CLAUDE_CODE_NO_FLICKER === true) return true;
  if (state.crashAutoOff || isFullscreenAutoDisabledForThisVersion()) return false;
  if (isSSHSession()) return false;
  if (isTmuxControlMode(state)) return false;
  switch (getInitialSettings().tui) {
    case "fullscreen":
      return true;
    case "default":
      return false;
  }
  return true;
}
//@ chunk-yenb1r87.js:4144-4759 layout
function getFullscreenDecision(state = fullscreenProbeState) {
  if (env.CLAUDE_CODE_SESSION_KIND === "bg") return "bg_forced_on";
  if (isScreenReaderMode()) return "sr_auto_off";
  if (isFullscreenDisabledByEnv()) return "env_off";
  if (env.CLAUDE_CODE_NO_FLICKER === true) return "env_on";
  if (state.crashAutoOff) return "crash_auto_off";
  if (isTmuxControlMode(state)) return "tmux_cc_auto_off";
  if (isSSHSession()) return "win_ssh_auto_off";
  let tui = getInitialSettings().tui;
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
//@ chunk-yenb1r87.js:4759-5095 layout
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
//@ chunk-yenb1r87.js:5095-5199 layout
function isAutoOffDecision(fullscreenDecision) {
  return (
    fullscreenDecision === "env_off" ||
    fullscreenDecision === "sr_auto_off" ||
    fullscreenDecision === "tmux_cc_auto_off" ||
    fullscreenDecision === "win_ssh_auto_off"
  );
}
//@ chunk-yenb1r87.js:5199-5259 layout
/**
 * 判断全屏开关是否来自 GrowthBook 回退值。
 */
function isFullscreenGateFromFallback(state = fullscreenProbeState) {
  return isGrowthBookEnabled() && state.gbGateSource === "fallback";
}
//@ chunk-yenb1r87.js:5259-5370 layout
function getNoFlickerEnvOverride() {
  if (env.CLAUDE_CODE_NO_FLICKER === true) return "on";
  if (env.CLAUDE_CODE_NO_FLICKER === false) return "off";
  return;
}
//@ chunk-yenb1r87.js:5370-5590 fingerprint (2.1.88 match: isMouseTrackingEnabled, 0.31)
function isMouseTrackingEnabled() {
  if (env.CLAUDE_CODE_DISABLE_MOUSE !== undefined) return env.CLAUDE_CODE_DISABLE_MOUSE ? "off" : "full";
  if (env.CLAUDE_CODE_DISABLE_MOUSE_CLICKS !== undefined)
    return env.CLAUDE_CODE_DISABLE_MOUSE_CLICKS ? "scroll" : "full";
  return "full";
}
//@ chunk-yenb1r87.js:5590-5764 layout
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
//@ chunk-yenb1r87.js:5764-5787 layout
var fullscreenObservationRegistry; // deferred: uses _ of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-yenb1r87.js:5764", () => {
  fullscreenObservationRegistry = new HostScoped(() => new _());
});
//@ chunk-yenb1r87.js:5787-5824 layout
/**
 * 记录一次"观察到全屏"事件。
 */
function noteFullscreenObserved() {
  fullscreenObservationRegistry.of(getRootSession().host).note();
}
//@ chunk-yenb1r87.js:5824-5873 layout
/**
 * 判断是否已观察到全屏模式正常工作。
 */
function hasFullscreenBeenObserved() {
  return fullscreenObservationRegistry.of(getRootSession().host).hasObserved;
}
//@ chunk-yenb1r87.js:5873-5924 layout
/**
 * 订阅"已观察到全屏"事件。
 */
function subscribeFullscreenObserved(listener) {
  return fullscreenObservationRegistry.of(getRootSession().host).subscribe(listener);
}
//@ chunk-yenb1r87.js:5924-5961 layout
function isFullscreenActive(state = fullscreenProbeState) {
  return getIsInteractive() && isFullscreenEnvEnabled(state);
}
//@ chunk-yenb1r87.js:5961-6274 fingerprint (2.1.88 match: maybeGetTmuxMouseHint, 0.566)
async function maybeGetTmuxMouseHint(state = fullscreenProbeState) {
  if (!env.TMUX) return null;
  if (!isFullscreenActive(state) || isTmuxControlMode(state)) return null;
  if (state.checkedTmuxMouseHint) return null;
  state.checkedTmuxMouseHint = true;
  let mouseOption = await probeTmuxOption(state, "mouse");
  if (mouseOption === null || mouseOption === "on") return null;
  return "tmux detected \xB7 scroll with PgUp/PgDn \xB7 or add 'set -g mouse on' to ~/.tmux.conf for wheel scroll";
}
//@ chunk-yenb1r87.js:6274-6434 placement
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
//@ chunk-yenb1r87.js:6434-6587 placement
function probeTmuxOption(state, optionName) {
  let { cacheKey, args } = TMUX_OPTION_PROBES[optionName];
  state[cacheKey] ??= execFileNoThrow("tmux", [...args], {
    useCwd: false,
    timeout: 2000,
  }).then(({ stdout, code }) => (code === 0 ? stdout.trim() : null));
  return state[cacheKey];
}
//@ chunk-yenb1r87.js:6587-6662 placement
/**
 * 在 tmux 中探测 mouse 与 focus-events 选项（仅 tmux 且非控制模式时）。
 */
function probeTmuxOptionsForFullscreen(state = fullscreenProbeState) {
  if (!env.TMUX || isTmuxControlModeEnvHeuristic()) return;
  probeTmuxOption(state, "mouse");
  probeTmuxOption(state, "focus-events");
}
//@ chunk-yenb1r87.js:6662-6974 placement
/**
 * 在 tmux 中检查 focus-events 选项，未开启时返回提示（只检查一次）。
 */
async function maybeGetTmuxFocusHint(state = fullscreenProbeState) {
  if (!env.TMUX) return null;
  if (isTmuxControlMode(state)) return null;
  if (state.checkedTmuxFocusHint) return null;
  state.checkedTmuxFocusHint = true;
  let focusOption = await probeTmuxOption(state, "focus-events");
  if (focusOption === null || focusOption === "on") return null;
  return "tmux focus-events off \xB7 add 'set -g focus-events on' to ~/.tmux.conf and reattach for focus tracking";
}
export {
  getNoFlickerEnvOverride,
  getFullscreenDecision,
  latchFullscreenTrialFromEnv,
  isTmuxControlMode,
  isFullscreenEnvEnabled,
  noteFullscreenObserved,
  fullscreenDecisionMode,
  isMouseTrackingEnabled,
  resolveRenderMode,
  isRemoteSdkOrRemoteMode,
  isAutoOffDecision,
  isFullscreenActive,
  fullscreenProbeState,
  isFullscreenAutoDisabledForThisVersion,
  probeTmuxOptionsForFullscreen,
  shouldUseFullscreenByDefault,
  subscribeFullscreenObserved,
  hasFullscreenBeenObserved,
  resolveFullscreenMode,
  isFullscreenGateFromFallback,
  MAX_FULLSCREEN_UPSELL_SHOWS,
  maybeGetTmuxMouseHint,
  maybeGetTmuxFocusHint,
  currentFullscreenTrialState,
};
