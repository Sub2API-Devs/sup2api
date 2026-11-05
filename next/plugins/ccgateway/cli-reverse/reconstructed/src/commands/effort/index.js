/**
 * commands/effort/index.ts
 *
 * /effort 命令对象（交互与无头两版）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/effort/index.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: sole-consumer 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getMainLoopModel } from "../../utils/model/model.js";
import { isUltracodeAvailable, getAllowedEffortLevels } from "../../utils/effort.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:2106235-2106342 sole-consumer
/**
 * formatEffortArgumentHint：[low|medium|high|...|auto|ultracode [on|off]]。
 */
function formatEffortArgumentHint(state, args) {
  let mainLoopModel = getMainLoopModel();
  let ultracodeHint = isUltracodeAvailable(mainLoopModel) ? "|ultracode [on|off]" : "";
  return `${state}${getAllowedEffortLevels(mainLoopModel).join("|")}|auto${ultracodeHint}${args}`;
}
//@ chunk-5xgkngpb.js:2106342-2106778 fingerprint (2.1.88 match: default, 0.602)
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
  load: () => import("./call.lazy.js"),
};
var effortNonInteractiveCommand2 = effortCommandDefinition;
export { effortNonInteractiveCommand2, effortNonInteractiveCommand };
