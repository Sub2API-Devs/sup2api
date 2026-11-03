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
import { j } from "../../vendor/react/cjs/react.production.js";
import { HostScoped } from "../utils/hostScoped.js";

//@ chunk-tzghj6zv.js:37733-37737 placement
j();
/**
 * 进程内的少量会话状态：包管理器更新上次失败时间与最新版本、fast 图标提示是否已显示、记忆选择器上次路径。
 */
//@ chunk-tzghj6zv.js:37796-38184 placement
class UpdaterSessionState {
  packageManagerUpdateLastFailedAt = 0;
  packageManagerLatestVersion = null;
  fastIconHintShown = !1;
  memorySelectorLastPath = void 0;
  recordPackageManagerUpdateFailure(d) {
    this.packageManagerUpdateLastFailedAt = d;
  }
  recordPackageManagerLatestVersion(d) {
    this.packageManagerLatestVersion = d;
  }
  markFastIconHintShown() {
    this.fastIconHintShown = !0;
  }
  rememberMemorySelectorPath(d) {
    this.memorySelectorLastPath = d;
  }
}
//@ chunk-tzghj6zv.js:38184-38210 placement
var Ipt = new HostScoped(() => new UpdaterSessionState());
//@ chunk-tzghj6zv.js:38210-38254 placement
function Hi(Tt) {
  return Tt.autoUpdaterResult;
}
/**
 * 自动更新结果是 install_failed 时把它清掉，返回新状态；否则原样返回。
 */
//@ chunk-tzghj6zv.js:38254-38359 placement
function clearFailedAutoUpdaterResult(cr) {
  return cr.autoUpdaterResult?.status === "install_failed" ? { ...cr, autoUpdaterResult: null } : cr;
}
/**
 * 返回包管理器的升级命令 argv：homebrew 用 brew upgrade --cask，winget 用 LOCALAPPDATA 下的 winget.exe 静默升级 Anthropic.ClaudeCode；其他返回 null。
 */
//@ chunk-tzghj6zv.js:38359-38669 placement
function getPackageManagerUpgradeCommand(d, h) {
  switch (d) {
    case "homebrew":
      return ["brew", "upgrade", "--cask", h ?? "claude-code"];
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
function PackageManagerAutoUpdater_2(d, h) {
  switch (d) {
    case "homebrew":
      return `brew upgrade ${h ?? "claude-code"}`;
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
  Ipt,
  Hi,
  clearFailedAutoUpdaterResult,
  getPackageManagerUpgradeCommand,
  PackageManagerAutoUpdater_2,
};
