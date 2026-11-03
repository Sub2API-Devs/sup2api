/**
 * utils/swarm/backends/registry.ts
 *
 * pane 后端注册表：按 teammateMode 与环境检测选 tmux/iTerm2，或回退到同进程（in-process）teammate
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/backends/registry.ts
 * pieces: chunk-78rbfds1.js (11)
 * attribution: facade-exports 7, fingerprint 3, layout 1
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

//@ chunk-78rbfds1.js:3095-3327 facade-exports
async function ensureBackendsRegistered(e = backendRegistryState) {
  if (e.backendsRegistered) return;
  let { TmuxBackend: TmuxBackend } = await import("./chunk-wcewyth1.js"),
    { ITermBackend: ITermBackend } = await import("./chunk-vdskh52v.js");
  ((e.TmuxBackendClass = TmuxBackend), (e.ITermBackendClass = ITermBackend), (e.backendsRegistered = !0));
}
/**
 * 懒创建 tmux 后端实例（类须先注册）。
 */
//@ chunk-78rbfds1.js:3327-3552 fingerprint = createTmuxBackend (0.664)
function createTmuxBackend(e) {
  if (e.tmuxBackend) return e.tmuxBackend;
  if (!e.TmuxBackendClass)
    throw Error("TmuxBackend not registered. Import TmuxBackend.ts before using the registry.");
  return ((e.tmuxBackend = new e.TmuxBackendClass()), e.tmuxBackend);
}
/**
 * 懒创建 iTerm2 后端实例。
 */
//@ chunk-78rbfds1.js:3552-3785 fingerprint = createITermBackend (0.664)
function createITermBackend(e) {
  if (e.itermBackend) return e.itermBackend;
  if (!e.ITermBackendClass)
    throw Error("ITermBackend not registered. Import ITermBackend.ts before using the registry.");
  return ((e.itermBackend = new e.ITermBackendClass()), e.itermBackend);
}
/**
 * 检测并返回 pane 后端：teammateMode=iterm2 时强制 iTerm2（不满足即报错）；在 tmux 内用 tmux；在 iTerm2 中优先 it2，否则回退 tmux（提示安装 it2）；都不在时有 tmux 就用外部 claude-swarm 会话；否则报错并给安装说明。结果缓存。
 */
//@ chunk-78rbfds1.js:3785-6399 facade-exports = detectAndGetBackend (0.743)
async function detectAndGetBackend(e = backendRegistryState) {
  if ((await ensureBackendsRegistered(e), e.cachedDetectionResult))
    return (
      logForDebugging(`[BackendRegistry] Using cached backend: ${e.cachedDetectionResult.backend.type}`),
      e.cachedDetectionResult
    );
  if (
    (logForDebugging("[BackendRegistry] Starting backend detection..."),
    getTeammateModeFromSnapshot() === "iterm2")
  ) {
    if (!isInITerm2(e))
      throw (
        logFeatureBad("swarm_backend_detect", "iterm2_explicit_not_in_iterm2"),
        Error(
          'teammateMode is set to "iterm2" but this session is not running inside iTerm2. Launch Claude from iTerm2, or change teammateMode in settings.',
        )
      );
    if (!(await isIt2CliAvailable_2(e)))
      throw (
        logFeatureBad("swarm_backend_detect", "iterm2_explicit_no_it2"),
        Error(
          'teammateMode is set to "iterm2" but the it2 CLI is not reachable. Install it with `pip install it2` and enable the Python API in iTerm2 (Preferences > General > Magic > Enable Python API).',
        )
      );
    logForDebugging("[BackendRegistry] Selected: iterm2 (explicit teammateMode)");
    let i = createITermBackend(e);
    return (
      (e.cachedDetectionResult = { backend: i, isNative: !0, needsIt2Setup: !1 }),
      logFeatureOk("swarm_backend_detect"),
      e.cachedDetectionResult
    );
  }
  let insideTmux = await isInsideTmux(),
    inITerm2 = isInITerm2(e);
  if (
    (logForDebugging(`[BackendRegistry] Environment: insideTmux=${insideTmux}, inITerm2=${inITerm2}`),
    insideTmux)
  ) {
    logForDebugging("[BackendRegistry] Selected: tmux (running inside tmux session)");
    let i = createTmuxBackend(e);
    return (
      (e.cachedDetectionResult = { backend: i, isNative: !0, needsIt2Setup: !1 }),
      logFeatureOk("swarm_backend_detect"),
      e.cachedDetectionResult
    );
  }
  if (inITerm2) {
    let inITerm2 = getPreferTmuxOverIterm2();
    if (inITerm2)
      logForDebugging("[BackendRegistry] User prefers tmux over iTerm2, skipping iTerm2 detection");
    else {
      let r = await isIt2CliAvailable_2(e);
      if ((logForDebugging(`[BackendRegistry] iTerm2 detected, it2 CLI available: ${r}`), r)) {
        logForDebugging("[BackendRegistry] Selected: iterm2 (native iTerm2 with it2 CLI)");
        let p = createITermBackend(e);
        return (
          (e.cachedDetectionResult = { backend: p, isNative: !0, needsIt2Setup: !1 }),
          logFeatureOk("swarm_backend_detect"),
          e.cachedDetectionResult
        );
      }
    }
    let it2Available = await isTmuxAvailable();
    if (
      (logForDebugging(`[BackendRegistry] it2 not available, tmux available: ${it2Available}`), it2Available)
    ) {
      logForDebugging("[BackendRegistry] Selected: tmux (fallback in iTerm2, it2 setup recommended)");
      let r = createTmuxBackend(e);
      return (
        (e.cachedDetectionResult = { backend: r, isNative: !1, needsIt2Setup: !inITerm2 }),
        logFeatureSad("swarm_backend_detect", inITerm2 ? "fallback_to_tmux" : "needs_it2_setup"),
        e.cachedDetectionResult
      );
    }
    throw (
      logForDebugging("[BackendRegistry] ERROR: iTerm2 detected but no it2 CLI and no tmux"),
      logFeatureBad("swarm_backend_detect", "iterm2_no_it2_no_tmux"),
      Error("iTerm2 detected but it2 CLI not installed. Install it2 with: pip install it2")
    );
  }
  let tmuxAvailable = await isTmuxAvailable();
  if (
    (logForDebugging(`[BackendRegistry] Not in tmux or iTerm2, tmux available: ${tmuxAvailable}`),
    tmuxAvailable)
  ) {
    logForDebugging("[BackendRegistry] Selected: tmux (external session mode)");
    let i = createTmuxBackend(e);
    return (
      (e.cachedDetectionResult = { backend: i, isNative: !1, needsIt2Setup: !1 }),
      logFeatureOk("swarm_backend_detect"),
      e.cachedDetectionResult
    );
  }
  throw (
    logForDebugging("[BackendRegistry] ERROR: No pane backend available"),
    logFeatureBad("swarm_backend_detect", "no_backend_available"),
    Error(getTmuxInstallInstructions())
  );
}
/**
 * 按平台给出 tmux 安装说明。
 */
//@ chunk-78rbfds1.js:6399-7143 fingerprint = getTmuxInstallInstructions (1)
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
/**
 * 按类型取 pane 后端实例（tmux / iterm2）。
 */
//@ chunk-78rbfds1.js:7143-7224 facade-exports = getBackendByType (1)
function getBackendByType(type, state = backendRegistryState) {
  switch (type) {
    case "tmux":
      return createTmuxBackend(state);
    case "iterm2":
      return createITermBackend(state);
  }
}
/**
 * 已缓存的后端检测结果。
 */
//@ chunk-78rbfds1.js:7224-7275 facade-exports
function getCachedDetectionResult(e = backendRegistryState) {
  return e.cachedDetectionResult;
}
/**
 * 标记 pane 后端不可用、已回退到同进程 teammate。
 */
//@ chunk-78rbfds1.js:7275-7385 facade-exports = markInProcessFallback (0.806)
function markInProcessFallback(e = backendRegistryState) {
  (logForDebugging("[BackendRegistry] Marking in-process fallback as active"),
    (e.inProcessFallbackActive = !0));
}
//@ chunk-78rbfds1.js:7385-7411 layout
function getTeammateMode() {
  return getTeammateModeFromSnapshot();
}
/**
 * 是否使用同进程 teammate：非交互会话总是；teammateMode=in-process 是；tmux/iterm2 否；auto 时已回退或既不在 tmux 也不在 iTerm2 才是。
 */
//@ chunk-78rbfds1.js:7411-7872 facade-exports = isInProcessEnabled (0.92)
function isInProcessEnabled(e = backendRegistryState) {
  if (getIsNonInteractiveSession())
    return (logForDebugging("[BackendRegistry] isInProcessEnabled: true (non-interactive session)"), !0);
  let mode = getTeammateMode(),
    enabled;
  if (mode === "in-process") enabled = !0;
  else if (mode === "tmux" || mode === "iterm2") enabled = !1;
  else {
    if (e.inProcessFallbackActive)
      return (
        logForDebugging(
          "[BackendRegistry] isInProcessEnabled: true (fallback after pane backend unavailable)",
        ),
        !0
      );
    let insideTmux = isInsideTmuxSync(),
      i = isInITerm2(e);
    enabled = !insideTmux && !i;
  }
  return (
    logForDebugging(
      `[BackendRegistry] isInProcessEnabled: ${enabled} (mode=${mode}, insideTmux=${isInsideTmuxSync()}, inITerm2=${isInITerm2(e)})`,
    ),
    enabled
  );
}
//@ chunk-78rbfds1.js:7872-7974 facade-exports
function resetBackendDetection(e = backendRegistryState) {
  ((e.cachedDetectionResult = null), (e.backendsRegistered = !1), (e.inProcessFallbackActive = !1));
}

export {
  isInProcessEnabled,
  getCachedDetectionResult,
  ensureBackendsRegistered,
  getBackendByType,
  detectAndGetBackend,
  resetBackendDetection,
  markInProcessFallback,
};
