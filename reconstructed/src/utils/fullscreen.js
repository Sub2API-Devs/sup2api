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
import { wt } from "../remote/remoteMode.js";
import { OVe } from "./task/framework.js";
import { hasRemoteSdkUrl } from "../services/ccrAgentProxy/agentProxy.js";

/**
 * 创建全屏模式探测状态：tmux 控制模式、鼠标与焦点提示是否已检查等。
 */
//@ chunk-cxdk9p3j.js:671-979 sole-consumer
function createFullscreenProbeState() {
  return {
    loggedTmuxCcDisable: !1,
    loggedWinSshDisable: !1,
    checkedTmuxMouseHint: !1,
    checkedTmuxFocusHint: !1,
    tmuxControlModeProbed: void 0,
    tmuxMouseOptionProbe: void 0,
    tmuxFocusOptionProbe: void 0,
    gbGateCached: void 0,
    gbGateSource: void 0,
    downsellGateCached: void 0,
    freshInstallCached: void 0,
    crashAutoOff: !1,
  };
}
//@ chunk-cxdk9p3j.js:979-990 affinity
var fullscreenProbeState = createFullscreenProbeState();
//@ chunk-cxdk9p3j.js:990-1134 fingerprint = isTmuxControlModeEnvHeuristic (1)
function isTmuxControlModeEnvHeuristic() {
  if (!env.TMUX) return !1;
  if (env.TERM_PROGRAM !== "iTerm.app") return !1;
  let term = env.TERM ?? "";
  return !term.startsWith("screen") && !term.startsWith("tmux");
}
//@ chunk-cxdk9p3j.js:1134-1511 fingerprint = probeTmuxControlModeSync (0.896)
function probeTmuxControlModeSync(e) {
  if (((e.tmuxControlModeProbed = isTmuxControlModeEnvHeuristic()), e.tmuxControlModeProbed)) return;
  if (!env.TMUX) return;
  if (env.TERM_PROGRAM) return;
  let n = resolveExecutableSafely("tmux");
  if (n === null) return;
  let result;
  try {
    result = spawnSync(n, ["display-message", "-p", "#{client_control_mode}"], {
      encoding: "utf8",
      timeout: 2000,
      cwd: void 0,
      env: process.env,
      windowsHide: !0,
    });
  } catch {
    return;
  }
  if (result.status !== 0) return;
  e.tmuxControlModeProbed = result.stdout.trim() === "1";
}
//@ chunk-cxdk9p3j.js:1511-1606 affinity
function isTmuxControlMode(e = fullscreenProbeState) {
  if (e.tmuxControlModeProbed === void 0) probeTmuxControlModeSync(e);
  return e.tmuxControlModeProbed ?? !1;
}
//@ chunk-cxdk9p3j.js:1705-1930 placement
class FullscreenTrialState {
  latched = !1;
  mode = void 0;
  persisted = !1;
  upsellImpression = void 0;
  latchFromEnv() {
    if (this.latched) return;
    ((this.latched = !0),
      (this.mode = env.CLAUDE_CODE_TUI_TRIAL === "fullscreen" ? "fullscreen" : void 0),
      env.unset("CLAUDE_CODE_TUI_TRIAL"));
  }
}
//@ chunk-cxdk9p3j.js:1930-1953 layout
var x = new HostScoped(() => new FullscreenTrialState());
//@ chunk-cxdk9p3j.js:1953-1990 placement
function SZn() {
  return x.of(getRootSession().host);
}
//@ chunk-cxdk9p3j.js:1990-2026 placement
function i7s() {
  SZn().latchFromEnv();
}
//@ chunk-cxdk9p3j.js:2026-2084 placement
function P2t() {
  let e = SZn();
  return (e.latchFromEnv(), e.mode);
}
/**
 * 判断全屏模式是否在当前版本被自动关闭过。
 */
//@ chunk-cxdk9p3j.js:2084-2632 placement
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
function s() {
  return env.CLAUDE_CODE_NO_FLICKER === !1 || env.CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN;
}
//@ chunk-cxdk9p3j.js:2722-2732 placement
var I2t = 3;
//@ chunk-cxdk9p3j.js:2732-2865 placement
function isFreshInstallForFullscreen() {
  try {
    if (isGrowthBookEnabled()) return !1;
    let e = getGlobalConfig();
    return e.firstStartVersion !== void 0 && (e.fullscreenUpsellSeenCount ?? 0) < I2t;
  } catch {
    return;
  }
}
//@ chunk-cxdk9p3j.js:2865-3000 layout
function isFreshInstallCached(e) {
  if (e.freshInstallCached !== void 0) return e.freshInstallCached;
  let n = isFreshInstallForFullscreen();
  if (n !== void 0) e.freshInstallCached = n;
  return n ?? !1;
}
//@ chunk-cxdk9p3j.js:3000-3812 callgraph-witnessed = isFullscreenEnvEnabled (0.273)
function isFullscreenEnvEnabled(e = fullscreenProbeState) {
  if (getEntrypointKind() === "local-agent") return !1;
  if (env.CLAUDE_CODE_SESSION_KIND === "bg") return !0;
  if (isScreenReaderMode()) return !1;
  if (s()) return !1;
  if (env.CLAUDE_CODE_NO_FLICKER === !0) return !0;
  if (e.crashAutoOff) return !1;
  if (isTmuxControlMode(e)) {
    if (!e.loggedTmuxCcDisable)
      ((e.loggedTmuxCcDisable = !0),
        logForDebugging(
          "fullscreen disabled: tmux -CC (iTerm2 integration mode) detected \xB7 set CLAUDE_CODE_NO_FLICKER=1 to override",
        ));
    return !1;
  }
  if (isSSHSession()) {
    if (!e.loggedWinSshDisable)
      ((e.loggedWinSshDisable = !0),
        logForDebugging(
          "fullscreen disabled: Windows over SSH (ConPTY re-rendering) detected \xB7 set CLAUDE_CODE_NO_FLICKER=1 to override",
        ));
    return !1;
  }
  switch (getInitialSettings_2().tui ?? P2t()) {
    case "fullscreen":
      return !0;
    case "default":
      return !1;
  }
  if (isFreshInstallCached(e)) return !0;
  if (p(e)) return !0;
  if (e.gbGateCached === void 0) {
    let n = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_pewter_brook", !1);
    ((e.gbGateCached = n.value), (e.gbGateSource = n.source));
  }
  return e.gbGateCached;
}
//@ chunk-cxdk9p3j.js:3812-3906 layout
function p(e = fullscreenProbeState) {
  return (
    (e.downsellGateCached ??= getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_creek", !1)),
    e.downsellGateCached
  );
}
//@ chunk-cxdk9p3j.js:3906-4144 layout
function shouldUseFullscreenByDefault(e = fullscreenProbeState) {
  if (isScreenReaderMode()) return !1;
  if (s()) return !1;
  if (env.CLAUDE_CODE_NO_FLICKER === !0) return !0;
  if (e.crashAutoOff || isFullscreenAutoDisabledForThisVersion()) return !1;
  if (isSSHSession()) return !1;
  if (isTmuxControlMode(e)) return !1;
  switch (getInitialSettings_2().tui) {
    case "fullscreen":
      return !0;
    case "default":
      return !1;
  }
  return !0;
}
//@ chunk-cxdk9p3j.js:4144-4759 layout
function getFullscreenDecision(e = fullscreenProbeState) {
  if (env.CLAUDE_CODE_SESSION_KIND === "bg") return "bg_forced_on";
  if (isScreenReaderMode()) return "sr_auto_off";
  if (s()) return "env_off";
  if (env.CLAUDE_CODE_NO_FLICKER === !0) return "env_on";
  if (e.crashAutoOff) return "crash_auto_off";
  if (isTmuxControlMode(e)) return "tmux_cc_auto_off";
  if (isSSHSession()) return "win_ssh_auto_off";
  let tui = getInitialSettings_2().tui;
  switch (tui ?? P2t()) {
    case "fullscreen":
      return tui === "fullscreen" ? "settings_on" : "upsell_trial_on";
    case "default":
      return "settings_off";
  }
  if (e.freshInstallCached ?? isFreshInstallForFullscreen()) return "fresh_install_on";
  if (e.downsellGateCached ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_creek", !1))
    return "downsell_on";
  return (e.gbGateCached ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_pewter_brook", !1))
    ? "gb_on"
    : "gb_off";
}
/**
 * 把全屏决策原因归类为开启、关闭等模式。
 */
//@ chunk-cxdk9p3j.js:4759-5095 layout
function fullscreenDecisionMode(e) {
  switch (e) {
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
function isAutoOffDecision(e) {
  return e === "env_off" || e === "sr_auto_off" || e === "tmux_cc_auto_off" || e === "win_ssh_auto_off";
}
//@ chunk-cxdk9p3j.js:5199-5259 layout
function a7s(e = fullscreenProbeState) {
  return isGrowthBookEnabled() && e.gbGateSource === "fallback";
}
//@ chunk-cxdk9p3j.js:5259-5370 layout
function getNoFlickerEnvOverride() {
  if (env.CLAUDE_CODE_NO_FLICKER === !0) return "on";
  if (env.CLAUDE_CODE_NO_FLICKER === !1) return "off";
  return;
}
//@ chunk-cxdk9p3j.js:5370-5590 fingerprint = isMouseTrackingEnabled (0.31)
function isMouseTrackingEnabled() {
  if (env.CLAUDE_CODE_DISABLE_MOUSE !== void 0) return env.CLAUDE_CODE_DISABLE_MOUSE ? "off" : "full";
  if (env.CLAUDE_CODE_DISABLE_MOUSE_CLICKS !== void 0)
    return env.CLAUDE_CODE_DISABLE_MOUSE_CLICKS ? "scroll" : "full";
  return "full";
}
//@ chunk-cxdk9p3j.js:5590-5764 layout
class _ {
  observed = !1;
  changed = createSignal();
  subscribe = this.changed.subscribe;
  get hasObserved() {
    return this.observed;
  }
  note() {
    if (this.observed) return;
    ((this.observed = !0), this.changed.emit());
  }
}
//@ chunk-cxdk9p3j.js:5764-5787 layout
var l = new HostScoped(() => new _());
//@ chunk-cxdk9p3j.js:5787-5824 layout
function EKo() {
  l.of(getRootSession().host).note();
}
//@ chunk-cxdk9p3j.js:5824-5873 layout
function FVe() {
  return l.of(getRootSession().host).hasObserved;
}
//@ chunk-cxdk9p3j.js:5873-5924 layout
function UVe(e) {
  return l.of(getRootSession().host).subscribe(e);
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
  e.checkedTmuxMouseHint = !0;
  let n = await probeTmuxOption(e, "mouse");
  if (n === null || n === "on") return null;
  return "tmux detected \xB7 scroll with PgUp/PgDn \xB7 or add 'set -g mouse on' to ~/.tmux.conf for wheel scroll";
}
//@ chunk-cxdk9p3j.js:6274-6434 placement
var TMUX_OPTION_PROBES = {
  mouse: { cacheKey: "tmuxMouseOptionProbe", args: ["show", "-Av", "mouse"] },
  "focus-events": { cacheKey: "tmuxFocusOptionProbe", args: ["show", "-gv", "focus-events"] },
};
//@ chunk-cxdk9p3j.js:6434-6587 placement
function probeTmuxOption(e, n) {
  let { cacheKey: cacheKey, args: args } = TMUX_OPTION_PROBES[n];
  return (
    (e[cacheKey] ??= execFileNoThrow("tmux", [...args], { useCwd: !1, timeout: 2000 }).then(
      ({ stdout: stdout, code: code }) => (code === 0 ? stdout.trim() : null),
    )),
    e[cacheKey]
  );
}
//@ chunk-cxdk9p3j.js:6587-6662 placement
function c7s(e = fullscreenProbeState) {
  if (!env.TMUX || isTmuxControlModeEnvHeuristic()) return;
  (probeTmuxOption(e, "mouse"), probeTmuxOption(e, "focus-events"));
}
/**
 * 在 tmux 中检查 focus-events 选项，未开启时返回提示（只检查一次）。
 */
//@ chunk-cxdk9p3j.js:6662-6974 placement
async function maybeGetTmuxFocusHint(e = fullscreenProbeState) {
  if (!env.TMUX) return null;
  if (isTmuxControlMode(e)) return null;
  if (e.checkedTmuxFocusHint) return null;
  e.checkedTmuxFocusHint = !0;
  let n = await probeTmuxOption(e, "focus-events");
  if (n === null || n === "on") return null;
  return "tmux focus-events off \xB7 add 'set -g focus-events on' to ~/.tmux.conf and reattach for focus tracking";
}
//@ chunk-s61vbvea.js:460728-460828 placement
function resolveRenderMode(e, n = !1) {
  if (wt() || e !== "fullscreen") return "inline";
  return OVe() || n ? "fullscreen" : "inline";
}
//@ chunk-s61vbvea.js:460828-460861 placement
function g_n() {
  return hasRemoteSdkUrl() || getIsRemoteMode();
}

export {
  i7s,
  getNoFlickerEnvOverride,
  getFullscreenDecision,
  isFullscreenEnvEnabled,
  UVe,
  FVe,
  isMouseTrackingEnabled,
  P2t,
  isAutoOffDecision,
  a7s,
  I2t,
  isFullscreenAutoDisabledForThisVersion,
  fullscreenProbeState,
  maybeGetTmuxMouseHint,
  maybeGetTmuxFocusHint,
  isTmuxControlMode,
  fullscreenDecisionMode,
  isFullscreenActive,
  resolveRenderMode,
  SZn,
  g_n,
  shouldUseFullscreenByDefault,
  EKo,
  c7s,
};
