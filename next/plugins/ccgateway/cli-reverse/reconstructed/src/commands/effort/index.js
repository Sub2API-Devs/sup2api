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

//@ chunk-e6aww6q8.js:2050093-2050200 sole-consumer
/**
 * formatEffortArgumentHint：[low|medium|high|...|auto|ultracode [on|off]]。
 */
function formatEffortArgumentHint(state, args) {
  let mainLoopModel = getMainLoopModel();
  let ultracodeHint = isUltracodeAvailable(mainLoopModel) ? "|ultracode [on|off]" : "";
  return `${state}${getAllowedEffortLevels(mainLoopModel).join("|")}|auto${ultracodeHint}${args}`;
}
//@ chunk-e6aww6q8.js:2050200-2050636 fingerprint (2.1.88 match: default, 0.602)
/**
 * /effort 命令对象（local-jsx）；描述：Set effort level for model usage；实现 chunk-3rwvzn82.js 的 ls。
 */
var effortCommandDefinition = {
  type: "local-jsx",
  name: "effort",
  description: "Set effort level for model usage",
  get argumentHint() {
    return formatEffortArgumentHint("[", "]");
  },
  immediate: true,
  requires: {
    ink: true,
  },
  thinClientDispatch: "control-request",
};
var effortNonInteractiveCommand = {
  type: "local",
  name: "effort",
  supportsNonInteractive: true,
  description: "Set effort level for model usage",
  get argumentHint() {
    return formatEffortArgumentHint("<", ">");
  },
  isEnabled: () => getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./call_2.lazy.js"),
};
var effortCommand = effortCommandDefinition;
export { effortCommand, effortNonInteractiveCommand };
