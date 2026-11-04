/**
 * commands/add-dir/index.ts
 *
 * /add-dir 命令对象（local-jsx 交互版与 local 无头版）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/add-dir/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isDesktopTopNonClaudecode } from "../../utils/sessionShape.js";

//@ chunk-e6aww6q8.js:1683961-1684398 fingerprint = addDir (0.589)
/**
 * /add-dir 命令对象（local）；描述：Add a new working directory；isEnabled: ()=>_e()&&WMi()；isHidden: {return!_e()}；实现 chunk-efagea6a.js 的 d。
 */
var addDirNonInteractiveCommand = {
  type: "local",
  name: "add-dir",
  description: "Add a new working directory",
  argumentHint: "<path>",
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  isEnabled: () => getIsNonInteractiveSession() && isDesktopTopNonClaudecode(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./call.lazy.js"),
};
var addDirCommandDefinition = {
  type: "local-jsx",
  name: "add-dir",
  description: "Add a new working directory",
  argumentHint: "<path>",
  immediate: (args, presentation) => args.trim() !== "" || presentation === "fullscreen",
  thinClientDispatch: "twin",
};
var addDirCommand = addDirCommandDefinition;
export { addDirCommand, addDirNonInteractiveCommand };
