/**
 * utils/shell/shellToolUtils.ts
 *
 * PowerShell 工具是否启用（CLAUDE_CODE_USE_POWERSHELL_TOOL、Windows 下 Git Bash 缺失、GrowthBook tengu_cobalt_ridge）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/shellToolUtils.ts
 * pieces: chunk-g54kbxqw.js (10)
 * attribution: placement 9, fingerprint 1
 */
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { env } from "../env.js";
import { getPlatform } from "../platform.js";
import { getGitBashPathCached } from "../windowsPaths.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getIsInteractive, getPendingConversationEditKinds, getRootSession } from "../../bootstrap/state.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { HostScoped } from "../hostScoped.js";
import { createStore } from "../../state/store.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g54kbxqw.js:145685-145700 placement
var SHELL_TOOL_NAMES = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME];
//@ chunk-g54kbxqw.js:145700-145869 fingerprint (2.1.88 match: isPowerShellToolEnabled, 0.301)
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
//@ chunk-g54kbxqw.js:145869-145931 placement
function isBashAvailable() {
  if (getPlatform() !== "windows") return true;
  return getGitBashPathCached() !== null;
}
//@ chunk-g54kbxqw.js:145931-146008 placement
function shouldUseShellTool(forceShellTool, hasSpendCap) {
  return (
    getIsInteractive() ||
    forceShellTool ||
    hasSpendCap ||
    !isRemoteManagedEnvironment() ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_wiggly_locket", false) !== true
  );
}
//@ chunk-g54kbxqw.js:146008-146274 placement
var WINDOWS_SHELL_REQUIRED_TEXT = `Claude Code on Windows requires either Git for Windows (for bash) or PowerShell. Install one of:
  - Git for Windows: https://git-scm.com/downloads/win
  - PowerShell 7: https://aka.ms/powershell
Or set CLAUDE_CODE_GIT_BASH_PATH to your bash.exe location.`;
//@ chunk-g54kbxqw.js:146274-146320 placement
function defaultShellKind() {
  return isBashAvailable() ? "bash" : "powershell";
}
//@ chunk-g54kbxqw.js:146320-146349 placement
function notePendingConversationEdit(editKind) {
  getPendingConversationEditKinds().add(editKind);
}
//@ chunk-g54kbxqw.js:146349-146431 placement
function takePendingConversationEdits() {
  let pendingConversationEditKinds = getPendingConversationEditKinds();
  if (pendingConversationEditKinds.size === 0) return [];
  let kinds = [...pendingConversationEditKinds];
  pendingConversationEditKinds.clear();
  return kinds;
}
//@ chunk-g54kbxqw.js:146431-146456 placement
var microCompactFlagStoreByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-g54kbxqw.js:146431", () => {
  microCompactFlagStoreByHost = new HostScoped(() => createStore(false));
});
//@ chunk-g54kbxqw.js:146456-146493 placement
function microCompactFlagStore() {
  return microCompactFlagStoreByHost.of(getRootSession().host);
}
export {
  isBashAvailable,
  isPowerShellToolEnabled,
  SHELL_TOOL_NAMES,
  defaultShellKind,
  notePendingConversationEdit,
  shouldUseShellTool,
  WINDOWS_SHELL_REQUIRED_TEXT,
  takePendingConversationEdits,
  microCompactFlagStore,
};
