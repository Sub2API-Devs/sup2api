/**
 * commands/config/index.ts
 *
 * /config（别名 settings）命令对象（交互版打开设置，无头版按键设置）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/config/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:1769156-1769681 fingerprint (2.1.88 match: config, 0.309)
/**
 * /config 命令对象（local-jsx）；描述：Open settings；别名 ["settings"]；实现 chunk-ak1qv1dp.js 的 _。
 */
var configCommandDefinition = {
  aliases: ["settings"],
  type: "local-jsx",
  name: "config",
  description: "Open settings",
  argumentHint: "[key=value]",
  immediate: (args, presentation) => args.trim() !== "" || presentation === "fullscreen",
  requires: {
    ink: true,
  },
  getArgumentCompletions: (arg, context) =>
    import("./configShorthand.js").then((configModule) =>
      configModule.getConfigArgumentCompletions(arg, context),
    ),
};
var configNonInteractiveCommand = {
  type: "local",
  name: "config",
  aliases: ["settings"],
  supportsNonInteractive: true,
  description: "Set a setting by key",
  argumentHint: "key=value",
  isEnabled: () => getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./call.lazy.js"),
};
var configCommand = configCommandDefinition;
export { configCommand, configNonInteractiveCommand };
