/**
 * commands/diff/index.ts
 *
 * /diff 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/diff/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { isDiffPaneAvailable } from "../../plugins/bundled/diffPane/index.js";
import { resolveRenderMode, isFullscreenEnvEnabled } from "../../utils/fullscreen.js";

//@ chunk-e6aww6q8.js:1695347-1695654 fingerprint (2.1.88 match: default, 0.51)
/**
 * /diff 命令对象（local-jsx）；描述：{return m_n(wd()?"fullscreen":"inline")==="fullscreen"?"Toggle the diff panel showing uncommitted changes":"View uncommitted changes and per；isEnabled: ()=>!Q7n()；实现 chunk-19av2vh6.js 的 C。
 */
var diffCommand = {
  type: "local-jsx",
  name: "diff",
  isEnabled: () => !isDiffPaneAvailable(),
  get description() {
    return resolveRenderMode(isFullscreenEnvEnabled() ? "fullscreen" : "inline") === "fullscreen"
      ? "Toggle the diff panel showing uncommitted changes"
      : "View uncommitted changes and per-turn diffs";
  },
  immediate: (args, presentation) => resolveRenderMode(presentation) === "fullscreen",
  thinClientDispatch: "control-request",
};
export { diffCommand };
