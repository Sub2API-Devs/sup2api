/**
 * utils/shell/shellToolUtils.ts
 *
 * PowerShell 工具是否启用（CLAUDE_CODE_USE_POWERSHELL_TOOL、Windows 下 Git Bash 缺失、GrowthBook tengu_cobalt_ridge）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/shellToolUtils.ts
 * pieces: chunk-5d1nwe9e.js (7), chunk-5xgkngpb.js (4)
 * attribution: placement 9, fingerprint 1, layout 1
 */
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { env } from "../env.js";
import { getPlatform } from "../platform.js";
import { getGitBashPathCached } from "../windowsPaths.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { findShellOnPath } from "../Shell.js";
import { getIsInteractive, getPendingConversationEditKinds, getRootSession } from "../../bootstrap/state.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { HostScoped } from "../hostScoped.js";
import { createStore } from "../../state/store.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5d1nwe9e.js:2079-2094 placement
var SHELL_TOOL_NAMES = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME];
//@ chunk-5d1nwe9e.js:2094-2263 fingerprint (2.1.88 match: isPowerShellToolEnabled, 0.301)
/**
 * PowerShell 工具是否启用：非 Windows 只在 CLAUDE_CODE_USE_POWERSHELL_TOOL 为真时开；Windows 上 env 显式设置优先，否则没有 Git Bash 时默认开，再否则看 GrowthBook tengu_cobalt_ridge。
 */
function isPowerShellToolEnabled() {
  let CLAUDE_CODE_USE_POWERSHELL_TOOL = env.CLAUDE_CODE_USE_POWERSHELL_TOOL;
  if (getPlatform() !== "windows") return CLAUDE_CODE_USE_POWERSHELL_TOOL === true;
  if (CLAUDE_CODE_USE_POWERSHELL_TOOL !== undefined) return CLAUDE_CODE_USE_POWERSHELL_TOOL;
  if (getGitBashPathCached() === null) return true;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_ridge", false);
}
//@ chunk-5d1nwe9e.js:2263-2325 placement
function isBashAvailable() {
  if (getPlatform() !== "windows") return true;
  return getGitBashPathCached() !== null;
}
//@ chunk-5d1nwe9e.js:2325-2486 layout
function bashTeachesHeredocOnStdin() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.bashTeachesHeredocOnStdin ??=
    env.platform === "darwin" &&
    findShellOnPath() === "/bin/bash" &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_anvil", true);
  return sessionFeatureValues.bashTeachesHeredocOnStdin;
}
//@ chunk-5d1nwe9e.js:2486-2563 placement
function shouldUseShellTool(forceShellTool, hasSpendCap) {
  return (
    getIsInteractive() ||
    forceShellTool ||
    hasSpendCap ||
    !isRemoteManagedEnvironment() ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_wiggly_locket", false) !== true
  );
}
//@ chunk-5d1nwe9e.js:2563-2829 placement
var WINDOWS_SHELL_REQUIRED_TEXT = `Claude Code on Windows requires either Git for Windows (for bash) or PowerShell. Install one of:
  - Git for Windows: https://git-scm.com/downloads/win
  - PowerShell 7: https://aka.ms/powershell
Or set CLAUDE_CODE_GIT_BASH_PATH to your bash.exe location.`;
//@ chunk-5d1nwe9e.js:2829-2875 placement (2.1.88 match: FRONTMATTER_SHELLS, 1)
function defaultShellKind() {
  return isBashAvailable() ? "bash" : "powershell";
}
//@ chunk-5xgkngpb.js:1589952-1589981 placement
function notePendingConversationEdit(editKind) {
  getPendingConversationEditKinds().add(editKind);
}
//@ chunk-5xgkngpb.js:1589981-1590063 placement
function takePendingConversationEdits() {
  let pendingConversationEditKinds = getPendingConversationEditKinds();
  if (pendingConversationEditKinds.size === 0) return [];
  let kinds = [...pendingConversationEditKinds];
  pendingConversationEditKinds.clear();
  return kinds;
}
//@ chunk-5xgkngpb.js:1590063-1590089 placement
var microCompactFlagStoreByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1590063", () => {
  microCompactFlagStoreByHost = new HostScoped(() => createStore(false));
});
//@ chunk-5xgkngpb.js:1590089-1590128 placement
function microCompactFlagStore() {
  return microCompactFlagStoreByHost.of(getRootSession().host);
}
export {
  isBashAvailable,
  isPowerShellToolEnabled,
  SHELL_TOOL_NAMES,
  defaultShellKind,
  shouldUseShellTool,
  takePendingConversationEdits,
  bashTeachesHeredocOnStdin,
  microCompactFlagStore,
  notePendingConversationEdit,
  WINDOWS_SHELL_REQUIRED_TEXT,
};
