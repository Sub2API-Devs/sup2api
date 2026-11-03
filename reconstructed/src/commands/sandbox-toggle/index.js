/**
 * commands/sandbox-toggle/index.ts
 *
 * /sandbox 命令对象（描述反映沙箱状态，平台不支持时隐藏）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/sandbox-toggle/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { getPlatform } from "../../utils/platform.js";
import { isWindowsSandboxEnabled } from "../../utils/sandbox/windowsSandbox.js";
import { firstLineOf } from "../../utils/stringUtils.js";

//@ chunk-e6aww6q8.js:2033747-2034576 fingerprint = command (0.871)
/**
 * /sandbox 命令对象（local-jsx）；描述：{let e=Ke.isSandboxingEnabled(),n=Ke.isAutoAllowBashIfSandboxedEnabled(),r=Ke.areUnsandboxedCommandsAllowed(),s=Ke.areSandboxSettingsLockedB；isHidden: {return!Ke.isSupportedPlatform()||!Ke.isPlatformInEnabledList()}；实现 chunk-55w3ydvj.js 的 Hn。
 */
var sandboxCommandDefinition = {
  name: "sandbox",
  get description() {
    let currentlyEnabled = SandboxManager.isSandboxingEnabled();
    let autoAllow = SandboxManager.isAutoAllowBashIfSandboxedEnabled();
    let allowUnsandboxed = SandboxManager.areUnsandboxedCommandsAllowed();
    let isLocked =
      SandboxManager.areSandboxSettingsLockedByPolicy() ||
      SandboxManager.areUnsandboxedCommandsForbiddenByPolicy();
    let hasDeps = SandboxManager.passesCheapSandboxGates()
      ? SandboxManager.checkDependencies().errors.length === 0
      : true;
    let icon;
    if (!hasDeps) icon = figures_default.warning;
    else icon = currentlyEnabled ? figures_default.tick : figures_default.circle;
    let statusText = "sandbox disabled";
    if (currentlyEnabled) {
      statusText = autoAllow ? "sandbox enabled (auto-allow)" : "sandbox enabled";
      statusText += allowUnsandboxed ? ", fallback allowed" : "";
    }
    if (isLocked) statusText += " (managed)";
    return `${icon} ${statusText} (\u23CE to configure)`;
  },
  get argumentHint() {
    return getPlatform() === "windows" && isWindowsSandboxEnabled()
      ? 'install | exclude "command pattern"'
      : 'exclude "command pattern"';
  },
  get isHidden() {
    return !SandboxManager.isSupportedPlatform() || !SandboxManager.isPlatformInEnabledList();
  },
  immediate: (args) => firstLineOf(args.trim(), " ") !== "install",
  type: "local-jsx",
  requires: {
    workspace: false,
    ink: true,
  },
};
var sandboxCommand = sandboxCommandDefinition;
export { sandboxCommand };
