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
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { getPlatform } from "../../utils/platform.js";
import { isWindowsSandboxEnabled } from "../../utils/sandbox/windowsSandbox.js";
import { firstLineOf } from "../../utils/stringUtils.js";

/**
 * /sandbox 命令对象（local-jsx）；描述：{let e=Ke.isSandboxingEnabled(),n=Ke.isAutoAllowBashIfSandboxedEnabled(),r=Ke.areUnsandboxedCommandsAllowed(),s=Ke.areSandboxSettingsLockedB；isHidden: {return!Ke.isSupportedPlatform()||!Ke.isPlatformInEnabledList()}；实现 chunk-55w3ydvj.js 的 Hn。
 */
//@ chunk-e6aww6q8.js:2033747-2034576 fingerprint = command (0.871)
var sandboxCommandDefinition = {
    name: "sandbox",
    get description() {
      let isSandboxingEnabled = SandboxManager.isSandboxingEnabled(),
        isAutoAllowBashIfSandboxedEnabled = SandboxManager.isAutoAllowBashIfSandboxedEnabled(),
        areUnsandboxedCommandsAllowed = SandboxManager.areUnsandboxedCommandsAllowed(),
        s =
          SandboxManager.areSandboxSettingsLockedByPolicy() ||
          SandboxManager.areUnsandboxedCommandsForbiddenByPolicy(),
        h = SandboxManager.passesCheapSandboxGates()
          ? SandboxManager.checkDependencies().errors.length === 0
          : !0,
        y;
      if (!h) y = re.warning;
      else y = isSandboxingEnabled ? re.tick : re.circle;
      let S = "sandbox disabled";
      if (isSandboxingEnabled)
        ((S = isAutoAllowBashIfSandboxedEnabled ? "sandbox enabled (auto-allow)" : "sandbox enabled"),
          (S += areUnsandboxedCommandsAllowed ? ", fallback allowed" : ""));
      if (s) S += " (managed)";
      return `${y} ${S} (\u23CE to configure)`;
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
    requires: { workspace: !1, ink: !0 },
  },
  sandboxCommand = sandboxCommandDefinition;

export { sandboxCommand };
