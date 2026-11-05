/**
 * utils/shell/shellPaths.ts
 *
 * 2.1.316 新增。shell 路径。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3yhwrhy0.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3yhwrhy0.js:735-1025 placement
class ShellPathsState {
  shellConfig = null;
  bashToolShellPath = null;
  resolvedBashToolShellPath = undefined;
  powerShellProvider = null;
  powerShellPluginBinPaths = null;
  powerShellPath = null;
  resolvedPowerShellPath = undefined;
  organizationsPowerShellPath = null;
  gitBashPath = undefined;
  windowsShellLauncherUsable = null;
  warnedShortTmpDir = false;
}
//@ chunk-3yhwrhy0.js:1025-1048 placement
var shellPathsByHost; // deferred: uses ShellPathsState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3yhwrhy0.js:1025", () => {
  shellPathsByHost = new HostScoped(() => new ShellPathsState());
});
//@ chunk-3yhwrhy0.js:1048-1085 placement
/**
 * 按宿主缓存的 shell 路径状态。
 */
function shellPaths() {
  return shellPathsByHost.of(getRootSession().host);
}
//@ chunk-3yhwrhy0.js:1085-1139 placement
/**
 * 取已解析的 Bash 工具 shell 路径。
 */
function getResolvedBashShellPath() {
  return shellPaths().resolvedBashToolShellPath;
}
export { getResolvedBashShellPath, shellPaths };
