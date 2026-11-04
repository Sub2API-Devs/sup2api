/**
 * commands/context/index.ts
 *
 * /context 命令对象（交互版彩色网格、无头版文本）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/context/index.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:1694938-1694962 affinity
/**
 * isContextGridDisabled：构建期常量 false。
 */
function isContextCommandForceHidden() {
  return false;
}
//@ chunk-e6aww6q8.js:1694962-1695347 fingerprint = contextNonInteractive (0.582)
/**
 * /context 命令对象（local-jsx）；描述：Visualize current context usage as a colored grid；isEnabled: ()=>!_e()&&!aen()；实现 chunk-10q8r8ck.js 的 Yn。
 */
var contextCommand = {
  name: "context",
  description: "Visualize current context usage as a colored grid",
  argumentHint: "[all]",
  isEnabled: () => !getIsNonInteractiveSession() && !isContextCommandForceHidden(),
  type: "local-jsx",
  thinClientDispatch: "control-request",
};
var contextNonInteractiveCommand = {
  type: "local",
  name: "context",
  supportsNonInteractive: true,
  description: "Show current context usage",
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  isEnabled() {
    return getIsNonInteractiveSession();
  },
  load: () => import("./context-noninteractive.js"),
};
export { contextCommand, contextNonInteractiveCommand };
