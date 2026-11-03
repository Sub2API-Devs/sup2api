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
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SandboxSettings } from "../../components/sandbox/SandboxSettings.js";
import { getCwdState } from "../../bootstrap/state.js";

//@ chunk-55w3ydvj.js:30440-32799 fingerprint = call (0.739)
/**
 * /sandbox 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context, args) {
  let theme = getSettings_DEPRECATED().theme || "light";
  let platform = getPlatform();
  if (platform === "windows" && firstLineOf(args?.trim() ?? "", " ") === "uninstall") {
    onDone(
      color(
        "warning",
        theme,
      )(
        "The sandbox can't be removed from inside a session. Close every Claude Code session, then run claude sandbox uninstall in a terminal.",
      ),
    );
    return null;
  }
  if (!SandboxManager.isSupportedPlatform()) {
    let errorMessage =
      platform === "wsl"
        ? "Error: Sandboxing requires WSL2. WSL1 is not supported."
        : "Error: Sandboxing is currently only supported on macOS, Linux, and WSL2.";
    let message = color("error", theme)(errorMessage);
    onDone(message);
    return null;
  }
  if (!SandboxManager.isPlatformInEnabledList()) {
    let message = color(
      "error",
      theme,
    )(`Error: Sandboxing is disabled for this platform (${platform}) via the enabledPlatforms setting.`);
    onDone(message);
    return null;
  }
  let i = args?.trim() || "";
  let p = firstLineOf(i, " ");
  if (p === "install" && platform === "windows" && isWindowsSandboxEnabled()) {
    if (i !== "install") {
      onDone(color("error", theme)("install takes no arguments. Run /sandbox install by itself."));
      return null;
    }
    context.appendSystemMessage?.({
      ...createSystemMessage(WINDOWS_SANDBOX_SETUP_NOTICE, "notice"),
      persist: false,
    });
    let a = await setupWindowsSandboxOnce(context.session.host);
    onDone(
      color(
        {
          ok: "success",
          cancelled: "warning",
          partial: "warning",
          error: "error",
        }[a.status],
        theme,
      )(a.message),
    );
    return null;
  }
  if (SandboxManager.areSandboxSettingsLockedByPolicy()) {
    let message = SandboxManager.isSandboxEnabledInSettings()
      ? await getWindowsSandboxUserStatus()
      : undefined;
    let c = color(
      "error",
      theme,
    )(
      `Error: Sandbox settings are overridden by a higher-priority configuration and cannot be changed locally.${
        message === undefined
          ? ""
          : `
${message}`
      }`,
    );
    onDone(c);
    return null;
  }
  if (!i) {
    let depCheck = SandboxManager.checkDependencies();
    return jsxProd_default(SandboxSettings, {
      onComplete: onDone,
      depCheck,
    });
  }
  if (i)
    if (p === "exclude") {
      let commandPattern = i.slice(8).trim();
      if (!commandPattern) {
        let message = color(
          "error",
          theme,
        )('Error: Please provide a command pattern to exclude (e.g., /sandbox exclude "npm run test:*")');
        onDone(message);
        return null;
      }
      let cleanPattern = commandPattern.replace(/^["']|["']$/g, "");
      let C = addToExcludedCommands(cleanPattern);
      if (C.outcome === "refused") {
        let v = color(
          "error",
          theme,
        )(
          `Can't exclude "${cleanPattern}": this session's sandbox policy limits exclusions to trusted settings (managed policy, a --settings file, user settings), and user settings are turned off here (--setting-sources), so there is no settings file where the exclusion would take effect. Re-enable user settings, or add it to the managed or --settings configuration.`,
        );
        onDone(v);
        return null;
      }
      let { settingsSource } = C;
      let settingsFilePathForSource = getSettingsFilePathForSource(settingsSource);
      let x = settingsFilePathForSource
        ? relative(getCwdState(), settingsFilePathForSource)
        : ".claude/settings.local.json";
      let P = settingsFilePathForSource && x.startsWith("..") ? settingsFilePathForSource : x;
      let message = color("success", theme)(`Added "${cleanPattern}" to excluded commands in ${P}`);
      onDone(message);
      return null;
    } else {
      let message = color(
        "error",
        theme,
      )(
        `Error: Unknown subcommand "${p}". Available: ${platform === "windows" && isWindowsSandboxEnabled() ? "install, exclude" : "exclude"}`,
      );
      onDone(message);
      return null;
    }
  return null;
}
