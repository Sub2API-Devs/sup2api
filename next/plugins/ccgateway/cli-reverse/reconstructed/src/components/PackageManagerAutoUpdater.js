/**
 * components/PackageManagerAutoUpdater.tsx
 *
 * 包管理器安装（brew/winget/mise 等）的更新提示命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PackageManagerAutoUpdater.tsx
 * pieces: chunk-18rrbwq1.js (7)
 * attribution: placement 6, fingerprint 1
 */
import { join } from "path";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { HostScoped } from "../utils/hostScoped.js";

//@ chunk-18rrbwq1.js:31071-31075 placement
init_react_production();
//@ chunk-18rrbwq1.js:37801-38189 placement
/**
 * 进程内的少量会话状态：包管理器更新上次失败时间与最新版本、fast 图标提示是否已显示、记忆选择器上次路径。
 */
class UpdaterSessionState {
  packageManagerUpdateLastFailedAt = 0;
  packageManagerLatestVersion = null;
  fastIconHintShown = false;
  memorySelectorLastPath = undefined;
  recordPackageManagerUpdateFailure(packageManagerUpdateLastFailedAt) {
    this.packageManagerUpdateLastFailedAt = packageManagerUpdateLastFailedAt;
  }
  recordPackageManagerLatestVersion(packageManagerLatestVersion) {
    this.packageManagerLatestVersion = packageManagerLatestVersion;
  }
  markFastIconHintShown() {
    this.fastIconHintShown = true;
  }
  rememberMemorySelectorPath(memorySelectorLastPath) {
    this.memorySelectorLastPath = memorySelectorLastPath;
  }
}
//@ chunk-18rrbwq1.js:38189-38215 placement
/**
 * 导出值：packageManagerAutoUpdaterSlot（包管理器自动更新器槽）；位于「包管理器安装（brew/winget/mise 等）的更新提示命令」模块。
 */
var packageManagerAutoUpdaterSlot = new HostScoped(() => new UpdaterSessionState());
//@ chunk-18rrbwq1.js:38215-38259 placement
function selectAutoUpdaterResult(state) {
  return state.autoUpdaterResult;
}
//@ chunk-18rrbwq1.js:38259-38364 placement
/**
 * 自动更新结果是 install_failed 时把它清掉，返回新状态；否则原样返回。
 */
function clearFailedAutoUpdaterResult(state) {
  return state.autoUpdaterResult?.status === "install_failed"
    ? {
        ...state,
        autoUpdaterResult: null,
      }
    : state;
}
//@ chunk-18rrbwq1.js:38364-38674 placement
/**
 * 返回包管理器的升级命令 argv：homebrew 用 brew upgrade --cask，winget 用 LOCALAPPDATA 下的 winget.exe 静默升级 Anthropic.ClaudeCode；其他返回 null。
 */
function getPackageManagerUpgradeCommand(packageManager, pkgName) {
  switch (packageManager) {
    case "homebrew":
      return ["brew", "upgrade", "--cask", pkgName ?? "claude-code"];
    case "winget": {
      let envLocalappdata = process.env.LOCALAPPDATA;
      return [
        envLocalappdata ? join(envLocalappdata, "Microsoft", "WindowsApps", "winget.exe") : "winget",
        "upgrade",
        "--id",
        "Anthropic.ClaudeCode",
        "--exact",
        "--silent",
        "--disable-interactivity",
      ];
    }
    default:
      return null;
  }
}
//@ chunk-18rrbwq1.js:38674-38948 fingerprint (2.1.88 match: PackageManagerAutoUpdater, 0.44)
function PackageManagerAutoUpdater_2(packageManager, pkgName) {
  switch (packageManager) {
    case "homebrew":
      return `brew upgrade ${pkgName ?? "claude-code"}`;
    case "winget":
      return "winget upgrade Anthropic.ClaudeCode";
    case "mise":
      return "mise upgrade claude";
    case "apk":
      return "apk upgrade claude-code";
    default:
      return "your package manager update command";
  }
}
export {
  selectAutoUpdaterResult,
  packageManagerAutoUpdaterSlot,
  clearFailedAutoUpdaterResult,
  getPackageManagerUpgradeCommand,
  PackageManagerAutoUpdater_2,
};
