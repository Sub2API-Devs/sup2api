/**
 * commands/goal/index.ts
 *
 * /goal 命令定义：设置 Claude 停止前检查的目标（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nn4xbsmj.js (1)
 * attribution: placement 1
 */
import { getIsNonInteractiveSession, getIsRemoteMode } from "../../bootstrap/state.js";

//@ chunk-nn4xbsmj.js:454-850 placement
/**
 * /goal 命令对象（local-jsx）；描述：Set a goal Claude checks before stopping；实现 chunk-hgfnw8bk.js 的 At。
 */
var goalCommandDefinition = {
  type: "local-jsx",
  name: "goal",
  description: "Set a goal Claude checks before stopping",
  argumentHint: "[<condition> | clear]",
  immediate: true,
};
var goalNonInteractiveCommand = {
  type: "local",
  name: "goal",
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  description: "Set a goal \u2014 keep working until the condition is met",
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  isEnabled: () => getIsNonInteractiveSession() || getIsRemoteMode(),
  load: () => import("./goal.js"),
};
var goalCommand = goalCommandDefinition;
export { goalCommand, goalNonInteractiveCommand };
