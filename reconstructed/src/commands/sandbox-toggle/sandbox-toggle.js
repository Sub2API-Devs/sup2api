/**
 * commands/sandbox-toggle/sandbox-toggle.tsx
 *
 * /sandbox 实现：沙箱开关与自动放行设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/sandbox-toggle/sandbox-toggle.tsx
 * pieces: chunk-55w3ydvj.js (1)
 * attribution: fingerprint 1
 */
import { relative } from "path";
import { getSettings_DEPRECATED, getSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { getPlatform } from "../../utils/platform.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { color } from "../../components/design-system/color.js";
import { SandboxManager, addToExcludedCommands } from "../../utils/sandbox/sandbox-adapter.js";
import { isWindowsSandboxEnabled } from "../../utils/sandbox/windowsSandbox.js";
import { createSystemMessage } from "../../utils/messages.js";
import {
  WINDOWS_SANDBOX_SETUP_NOTICE,
  setupWindowsSandboxOnce,
} from "../../utils/sandbox/windowsSandboxSetup.js";
import { getWindowsSandboxUserStatus } from "../../utils/sandbox/windowsSandboxStatus.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SandboxSettings } from "../../components/sandbox/SandboxSettings.js";
import { getCwdState } from "../../bootstrap/state.js";

/**
 * /sandbox 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-55w3ydvj.js:30440-32799 fingerprint = call (0.739)
async function call(onDone, context, args) {
  let m = getSettings_DEPRECATED().theme || "light",
    platform = getPlatform();
  if (platform === "windows" && firstLineOf(args?.trim() ?? "", " ") === "uninstall")
    return (
      onDone(
        color(
          "warning",
          m,
        )(
          "The sandbox can't be removed from inside a session. Close every Claude Code session, then run claude sandbox uninstall in a terminal.",
        ),
      ),
      null
    );
  if (!SandboxManager.isSupportedPlatform()) {
    let a =
        platform === "wsl"
          ? "Error: Sandboxing requires WSL2. WSL1 is not supported."
          : "Error: Sandboxing is currently only supported on macOS, Linux, and WSL2.",
      message = color("error", m)(a);
    return (onDone(message), null);
  }
  if (!SandboxManager.isPlatformInEnabledList()) {
    let message = color(
      "error",
      m,
    )(`Error: Sandboxing is disabled for this platform (${platform}) via the enabledPlatforms setting.`);
    return (onDone(message), null);
  }
  let i = args?.trim() || "",
    p = firstLineOf(i, " ");
  if (p === "install" && platform === "windows" && isWindowsSandboxEnabled()) {
    if (i !== "install")
      return (onDone(color("error", m)("install takes no arguments. Run /sandbox install by itself.")), null);
    context.appendSystemMessage?.({
      ...createSystemMessage(WINDOWS_SANDBOX_SETUP_NOTICE, "notice"),
      persist: !1,
    });
    let a = await setupWindowsSandboxOnce(context.session.host);
    return (
      onDone(
        color(
          { ok: "success", cancelled: "warning", partial: "warning", error: "error" }[a.status],
          m,
        )(a.message),
      ),
      null
    );
  }
  if (SandboxManager.areSandboxSettingsLockedByPolicy()) {
    let a = SandboxManager.isSandboxEnabledInSettings() ? await getWindowsSandboxUserStatus() : void 0,
      c = color(
        "error",
        m,
      )(
        `Error: Sandbox settings are overridden by a higher-priority configuration and cannot be changed locally.${
          a === void 0
            ? ""
            : `
${a}`
        }`,
      );
    return (onDone(c), null);
  }
  if (!i) {
    let checkDependencies = SandboxManager.checkDependencies();
    return e(SandboxSettings, { onComplete: onDone, depCheck: checkDependencies });
  }
  if (i)
    if (p === "exclude") {
      let commandPattern = i.slice(8).trim();
      if (!commandPattern) {
        let message = color(
          "error",
          m,
        )('Error: Please provide a command pattern to exclude (e.g., /sandbox exclude "npm run test:*")');
        return (onDone(message), null);
      }
      let cleanPattern = commandPattern.replace(/^["']|["']$/g, ""),
        C = addToExcludedCommands(cleanPattern);
      if (C.outcome === "refused") {
        let v = color(
          "error",
          m,
        )(
          `Can't exclude "${cleanPattern}": this session's sandbox policy limits exclusions to trusted settings (managed policy, a --settings file, user settings), and user settings are turned off here (--setting-sources), so there is no settings file where the exclusion would take effect. Re-enable user settings, or add it to the managed or --settings configuration.`,
        );
        return (onDone(v), null);
      }
      let { settingsSource: settingsSource } = C,
        b = getSettingsFilePathForSource(settingsSource),
        x = b ? relative(getCwdState(), b) : ".claude/settings.local.json",
        P = b && x.startsWith("..") ? b : x,
        message = color("success", m)(`Added "${cleanPattern}" to excluded commands in ${P}`);
      return (onDone(message), null);
    } else {
      let message = color(
        "error",
        m,
      )(
        `Error: Unknown subcommand "${p}". Available: ${platform === "windows" && isWindowsSandboxEnabled() ? "install, exclude" : "exclude"}`,
      );
      return (onDone(message), null);
    }
  return null;
}
