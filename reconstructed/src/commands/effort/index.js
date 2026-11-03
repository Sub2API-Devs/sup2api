/**
 * commands/effort/index.ts
 *
 * /effort 命令对象（交互与无头两版）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/effort/index.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: sole-consumer 1, fingerprint 1
 */
import { getMainLoopModel } from "../../utils/model/model.js";
import { isUltracodeAvailable, getAllowedEffortLevels } from "../../utils/effort.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

/**
 * formatEffortArgumentHint：[low|medium|high|...|auto|ultracode [on|off]]。
 */
//@ chunk-e6aww6q8.js:2050093-2050200 sole-consumer
function formatEffortArgumentHint(e, n) {
  let r = getMainLoopModel(),
    s = isUltracodeAvailable(r) ? "|ultracode [on|off]" : "";
  return `${e}${getAllowedEffortLevels(r).join("|")}|auto${s}${n}`;
}
/**
 * /effort 命令对象（local-jsx）；描述：Set effort level for model usage；实现 chunk-3rwvzn82.js 的 ls。
 */
//@ chunk-e6aww6q8.js:2050200-2050636 fingerprint = default (0.602)
var effortCommandDefinition = {
    type: "local-jsx",
    name: "effort",
    description: "Set effort level for model usage",
    get argumentHint() {
      return formatEffortArgumentHint("[", "]");
    },
    immediate: !0,
    requires: { ink: !0 },
    thinClientDispatch: "control-request",
  },
  effortNonInteractiveCommand = {
    type: "local",
    name: "effort",
    supportsNonInteractive: !0,
    description: "Set effort level for model usage",
    get argumentHint() {
      return formatEffortArgumentHint("<", ">");
    },
    isEnabled: () => getIsNonInteractiveSession(),
    get isHidden() {
      return !getIsNonInteractiveSession();
    },
    load: () => import("./chunk-mtkg11k6.js"),
  },
  effortCommand = effortCommandDefinition;

export { effortCommand, effortNonInteractiveCommand };
