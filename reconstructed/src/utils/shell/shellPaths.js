/**
 * utils/shell/shellPaths.ts
 *
 * 2.1.316 新增。shell 路径。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-648vry02.js (4)
 * attribution: placement 4
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-648vry02.js:735-1025 placement
class ShellPathsState {
  shellConfig = null;
  bashToolShellPath = null;
  resolvedBashToolShellPath = void 0;
  powerShellProvider = null;
  powerShellPluginBinPaths = null;
  powerShellPath = null;
  resolvedPowerShellPath = void 0;
  organizationsPowerShellPath = null;
  gitBashPath = void 0;
  windowsShellLauncherUsable = null;
  warnedShortTmpDir = !1;
}
//@ chunk-648vry02.js:1025-1048 placement
var b = new HostScoped(() => new ShellPathsState());
//@ chunk-648vry02.js:1048-1085 placement
function pre() {
  return b.of(getRootSession().host);
}
//@ chunk-648vry02.js:1085-1139 placement
function ZSr() {
  return pre().resolvedBashToolShellPath;
}

export { ZSr, pre };
