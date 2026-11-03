/**
 * commands/model/index.ts
 *
 * /model 命令对象（交互选择器与无头 <model>）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/model/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import { getMainLoopModel } from "../../utils/model/model.js";

//@ chunk-e6aww6q8.js:2040656-2041085 fingerprint = default (0.569)
/**
 * /model 命令对象（local）；描述：Set the AI model for Claude Code；isEnabled: ()=>_e()；isHidden: {return!_e()}；实现 chunk-0pmcg6nh.js 的 b。
 */
var modelNonInteractiveCommand = {
  type: "local",
  name: "model",
  supportsNonInteractive: true,
  description: "Set the AI model for Claude Code",
  argumentHint: "<model>",
  isEnabled: () => getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./chunk-0pmcg6nh.js"),
};
var modelCommand = {
  type: "local-jsx",
  name: "model",
  get description() {
    return `Set the AI model for Claude Code (currently ${renderModelName(getMainLoopModel())})`;
  },
  argumentHint: "[model]",
  immediate: true,
  requires: {
    ink: true,
  },
  thinClientDispatch: "control-request",
};
export { modelCommand, modelNonInteractiveCommand };
