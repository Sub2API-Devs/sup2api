/**
 * components/PackageManagerAutoUpdater.tsx
 *
 * 包管理器安装（brew/winget/mise 等）的更新提示命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PackageManagerAutoUpdater.tsx
 * pieces: chunk-tzghj6zv.js (7)
 * attribution: placement 6, fingerprint 1
 */
import { join } from "path";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { HostScoped } from "../utils/hostScoped.js";

//@ chunk-tzghj6zv.js:37733-37737 placement
init_react_production();
//@ chunk-tzghj6zv.js:37796-38184 placement
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
//@ chunk-tzghj6zv.js:38184-38210 placement
/**
 * 导出值：packageManagerAutoUpdaterSlot（包管理器自动更新器槽）；位于「包管理器安装（brew/winget/mise 等）的更新提示命令」模块。
 */
var packageManagerAutoUpdaterSlot = new HostScoped(() => new UpdaterSessionState());
//@ chunk-tzghj6zv.js:38210-38254 placement
function selectAutoUpdaterResult(state) {
  return state.autoUpdaterResult;
}
//@ chunk-tzghj6zv.js:38254-38359 placement
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
//@ chunk-tzghj6zv.js:38359-38669 placement
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
//@ chunk-tzghj6zv.js:38669-38943 fingerprint = PackageManagerAutoUpdater (0.442)
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
  packageManagerAutoUpdaterSlot,
  selectAutoUpdaterResult,
  clearFailedAutoUpdaterResult,
  getPackageManagerUpgradeCommand,
  PackageManagerAutoUpdater_2,
};
