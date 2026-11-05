/**
 * utils/swarm/backends/registry.ts
 *
 * pane 后端注册表：按 teammateMode 与环境检测选 tmux/iTerm2，或回退到同进程（in-process）teammate
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/backends/registry.ts
 * pieces: chunk-q0aehp15.js (11)
 * attribution: facade-exports 7, fingerprint 3, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  backendRegistryState,
  isInITerm2,
  isIt2CliAvailable as isIt2CliAvailable_2,
  isInsideTmux,
  isTmuxAvailable,
  isInsideTmuxSync,
} from "./detection.js";
import { logForDebugging } from "../../debug.js";
import { getTeammateModeFromSnapshot } from "./teammateModeSnapshot.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { getPreferTmuxOverIterm2 } from "./it2Setup.js";
import { getPlatform } from "../../platform.js";
import { getIsNonInteractiveSession } from "../../../bootstrap/state.js";

//@ chunk-q0aehp15.js:3070-3302 facade-exports
async function ensureBackendsRegistered(state = backendRegistryState) {
  if (state.backendsRegistered) return;
  let { TmuxBackend } = await import("./TmuxBackend.js");
  let { ITermBackend } = await import("./ITermBackend.js");
  state.TmuxBackendClass = TmuxBackend;
  state.ITermBackendClass = ITermBackend;
  state.backendsRegistered = true;
}
//@ chunk-q0aehp15.js:3302-3527 fingerprint (2.1.88 match: createTmuxBackend, 0.664)
/**
 * 懒创建 tmux 后端实例（类须先注册）。
 */
function createTmuxBackend(state) {
  if (state.tmuxBackend) return state.tmuxBackend;
  if (!state.TmuxBackendClass)
    throw Error("TmuxBackend not registered. Import TmuxBackend.ts before using the registry.");
  state.tmuxBackend = new state.TmuxBackendClass();
  return state.tmuxBackend;
}
//@ chunk-q0aehp15.js:3527-3760 fingerprint (2.1.88 match: createITermBackend, 0.664)
/**
 * 懒创建 iTerm2 后端实例。
 */
function createITermBackend(state) {
  if (state.itermBackend) return state.itermBackend;
  if (!state.ITermBackendClass)
    throw Error("ITermBackend not registered. Import ITermBackend.ts before using the registry.");
  state.itermBackend = new state.ITermBackendClass();
  return state.itermBackend;
}
//@ chunk-q0aehp15.js:3760-6374 facade-exports (2.1.88 match: detectAndGetBackend, 0.743)
/**
 * 检测并返回 pane 后端：teammateMode=iterm2 时强制 iTerm2（不满足即报错）；在 tmux 内用 tmux；在 iTerm2 中优先 it2，否则回退 tmux（提示安装 it2）；都不在时有 tmux 就用外部 claude-swarm 会话；否则报错并给安装说明。结果缓存。
 */
async function detectAndGetBackend(state = backendRegistryState) {
  await ensureBackendsRegistered(state);
  if (state.cachedDetectionResult) {
    logForDebugging(`[BackendRegistry] Using cached backend: ${state.cachedDetectionResult.backend.type}`);
    return state.cachedDetectionResult;
  }
  logForDebugging("[BackendRegistry] Starting backend detection...");
  if (getTeammateModeFromSnapshot() === "iterm2") {
    if (!isInITerm2(state)) {
      logFeatureBad("swarm_backend_detect", "iterm2_explicit_not_in_iterm2");
      throw Error(
        'teammateMode is set to "iterm2" but this session is not running inside iTerm2. Launch Claude from iTerm2, or change teammateMode in settings.',
      );
    }
    if (!(await isIt2CliAvailable_2(state))) {
      logFeatureBad("swarm_backend_detect", "iterm2_explicit_no_it2");
      throw Error(
        'teammateMode is set to "iterm2" but the it2 CLI is not reachable. Install it with `pip install it2` and enable the Python API in iTerm2 (Preferences > General > Magic > Enable Python API).',
      );
    }
    logForDebugging("[BackendRegistry] Selected: iterm2 (explicit teammateMode)");
    let backend = createITermBackend(state);
    state.cachedDetectionResult = {
      backend,
      isNative: true,
      needsIt2Setup: false,
    };
    logFeatureOk("swarm_backend_detect");
    return state.cachedDetectionResult;
  }
  let insideTmux = await isInsideTmux();
  let inITerm2 = isInITerm2(state);
  logForDebugging(`[BackendRegistry] Environment: insideTmux=${insideTmux}, inITerm2=${inITerm2}`);
  if (insideTmux) {
    logForDebugging("[BackendRegistry] Selected: tmux (running inside tmux session)");
    let backend = createTmuxBackend(state);
    state.cachedDetectionResult = {
      backend,
      isNative: true,
      needsIt2Setup: false,
    };
    logFeatureOk("swarm_backend_detect");
    return state.cachedDetectionResult;
  }
  if (inITerm2) {
    let preferTmux = getPreferTmuxOverIterm2();
    if (preferTmux)
      logForDebugging("[BackendRegistry] User prefers tmux over iTerm2, skipping iTerm2 detection");
    else {
      let it2Available = await isIt2CliAvailable_2(state);
      logForDebugging(`[BackendRegistry] iTerm2 detected, it2 CLI available: ${it2Available}`);
      if (it2Available) {
        logForDebugging("[BackendRegistry] Selected: iterm2 (native iTerm2 with it2 CLI)");
        let backend = createITermBackend(state);
        state.cachedDetectionResult = {
          backend,
          isNative: true,
          needsIt2Setup: false,
        };
        logFeatureOk("swarm_backend_detect");
        return state.cachedDetectionResult;
      }
    }
    let tmuxAvailable = await isTmuxAvailable();
    logForDebugging(`[BackendRegistry] it2 not available, tmux available: ${tmuxAvailable}`);
    if (tmuxAvailable) {
      logForDebugging("[BackendRegistry] Selected: tmux (fallback in iTerm2, it2 setup recommended)");
      let backend = createTmuxBackend(state);
      state.cachedDetectionResult = {
        backend,
        isNative: false,
        needsIt2Setup: !preferTmux,
      };
      logFeatureSad("swarm_backend_detect", preferTmux ? "fallback_to_tmux" : "needs_it2_setup");
      return state.cachedDetectionResult;
    }
    logForDebugging("[BackendRegistry] ERROR: iTerm2 detected but no it2 CLI and no tmux");
    logFeatureBad("swarm_backend_detect", "iterm2_no_it2_no_tmux");
    throw Error("iTerm2 detected but it2 CLI not installed. Install it2 with: pip install it2");
  }
  let tmuxAvailable = await isTmuxAvailable();
  logForDebugging(`[BackendRegistry] Not in tmux or iTerm2, tmux available: ${tmuxAvailable}`);
  if (tmuxAvailable) {
    logForDebugging("[BackendRegistry] Selected: tmux (external session mode)");
    let backend = createTmuxBackend(state);
    state.cachedDetectionResult = {
      backend,
      isNative: false,
      needsIt2Setup: false,
    };
    logFeatureOk("swarm_backend_detect");
    return state.cachedDetectionResult;
  }
  logForDebugging("[BackendRegistry] ERROR: No pane backend available");
  logFeatureBad("swarm_backend_detect", "no_backend_available");
  throw Error(getTmuxInstallInstructions());
}
//@ chunk-q0aehp15.js:6374-7118 fingerprint (2.1.88 match: getTmuxInstallInstructions, 1)
/**
 * 按平台给出 tmux 安装说明。
 */
function getTmuxInstallInstructions() {
  switch (getPlatform()) {
    case "macos":
      return `To use agent swarms, install tmux:
  brew install tmux
Then start a tmux session with: tmux new-session -s claude`;
    case "linux":
    case "wsl":
      return `To use agent swarms, install tmux:
  sudo apt install tmux    # Ubuntu/Debian
  sudo dnf install tmux    # Fedora/RHEL
Then start a tmux session with: tmux new-session -s claude`;
    case "windows":
      return `To use agent swarms, you need tmux which requires WSL (Windows Subsystem for Linux).
Install WSL first, then inside WSL run:
  sudo apt install tmux
Then start a tmux session with: tmux new-session -s claude`;
    default:
      return `To use agent swarms, install tmux using your system's package manager.
Then start a tmux session with: tmux new-session -s claude`;
  }
}
//@ chunk-q0aehp15.js:7118-7199 facade-exports (2.1.88 match: getBackendByType, 1)
/**
 * 按类型取 pane 后端实例（tmux / iterm2）。
 */
function getBackendByType(type, state = backendRegistryState) {
  switch (type) {
    case "tmux":
      return createTmuxBackend(state);
    case "iterm2":
      return createITermBackend(state);
  }
}
//@ chunk-q0aehp15.js:7199-7250 facade-exports
/**
 * 已缓存的后端检测结果。
 */
function getCachedDetectionResult(state = backendRegistryState) {
  return state.cachedDetectionResult;
}
//@ chunk-q0aehp15.js:7250-7360 facade-exports (2.1.88 match: markInProcessFallback, 0.806)
/**
 * 标记 pane 后端不可用、已回退到同进程 teammate。
 */
function markInProcessFallback(state = backendRegistryState) {
  logForDebugging("[BackendRegistry] Marking in-process fallback as active");
  state.inProcessFallbackActive = true;
}
//@ chunk-q0aehp15.js:7360-7386 layout
function getTeammateMode() {
  return getTeammateModeFromSnapshot();
}
//@ chunk-q0aehp15.js:7386-7847 facade-exports (2.1.88 match: isInProcessEnabled, 0.92)
/**
 * 是否使用同进程 teammate：非交互会话总是；teammateMode=in-process 是；tmux/iterm2 否；auto 时已回退或既不在 tmux 也不在 iTerm2 才是。
 */
function isInProcessEnabled(state = backendRegistryState) {
  if (getIsNonInteractiveSession()) {
    logForDebugging("[BackendRegistry] isInProcessEnabled: true (non-interactive session)");
    return true;
  }
  let mode = getTeammateMode();
  let enabled;
  if (mode === "in-process") enabled = true;
  else if (mode === "tmux" || mode === "iterm2") enabled = false;
  else {
    if (state.inProcessFallbackActive) {
      logForDebugging("[BackendRegistry] isInProcessEnabled: true (fallback after pane backend unavailable)");
      return true;
    }
    let insideTmux = isInsideTmuxSync();
    let inITerm2 = isInITerm2(state);
    enabled = !insideTmux && !inITerm2;
  }
  logForDebugging(
    `[BackendRegistry] isInProcessEnabled: ${enabled} (mode=${mode}, insideTmux=${isInsideTmuxSync()}, inITerm2=${isInITerm2(state)})`,
  );
  return enabled;
}
//@ chunk-q0aehp15.js:7847-7949 facade-exports
function resetBackendDetection(state = backendRegistryState) {
  state.cachedDetectionResult = null;
  state.backendsRegistered = false;
  state.inProcessFallbackActive = false;
}
export {
  detectAndGetBackend,
  resetBackendDetection,
  getBackendByType,
  isInProcessEnabled,
  markInProcessFallback,
  getCachedDetectionResult,
  ensureBackendsRegistered,
};
