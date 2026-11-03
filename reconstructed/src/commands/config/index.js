/**
 * commands/config/index.ts
 *
 * /config（别名 settings）命令对象（交互版打开设置，无头版按键设置）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/config/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

/**
 * /config 命令对象（local-jsx）；描述：Open settings；别名 ["settings"]；实现 chunk-ak1qv1dp.js 的 _。
 */
//@ chunk-e6aww6q8.js:1693786-1694311 fingerprint = config (0.309)
var configCommandDefinition = {
    aliases: ["settings"],
    type: "local-jsx",
    name: "config",
    description: "Open settings",
    argumentHint: "[key=value]",
    immediate: (args, presentation) => args.trim() !== "" || presentation === "fullscreen",
    requires: { ink: !0 },
    getArgumentCompletions: (e, n) =>
      import("./chunk-7qydycm2.js").then((r) => r.getConfigArgumentCompletions(e, n)),
  },
  configNonInteractiveCommand = {
    type: "local",
    name: "config",
    aliases: ["settings"],
    supportsNonInteractive: !0,
    description: "Set a setting by key",
    argumentHint: "key=value",
    isEnabled: () => getIsNonInteractiveSession(),
    get isHidden() {
      return !getIsNonInteractiveSession();
    },
    load: () => import("./chunk-8ncxevqn.js"),
  },
  configCommand = configCommandDefinition;

export { configCommand, configNonInteractiveCommand };
