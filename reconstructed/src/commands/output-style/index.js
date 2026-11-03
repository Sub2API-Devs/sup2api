/**
 * commands/output-style/index.ts
 *
 * /output-style 无头命令对象（切分另含一个提示词片段）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/output-style/index.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isSettingsMovedToConfig, ien } from "../createMovedToConfigCommand.js";
import { OUTPUT_STYLE_IDENTITY_LINE, DEFAULT_AGENT_IDENTITY_LINE } from "../../constants/prompts.js";

/**
 * /output-style 命令对象（local）；描述：List output styles or switch to one；isEnabled: ()=>_e()||!dRe()||ien()；isHidden: {return!_e()&&dRe()&&!ien()}；实现 chunk-1ehcpf9z.js 的 B。
 */
//@ chunk-e6aww6q8.js:1694649-1694938 placement
var outputStyleCommand = {
  type: "local",
  name: "output-style",
  supportsNonInteractive: !0,
  thinClientDispatch: "post-text",
  description: "List output styles or switch to one",
  argumentHint: "[style]",
  isEnabled: () => getIsNonInteractiveSession() || !isSettingsMovedToConfig() || ien(),
  get isHidden() {
    return !getIsNonInteractiveSession() && isSettingsMovedToConfig() && !ien();
  },
  load: () => import("./chunk-1ehcpf9z.js"),
};
//@ chunk-e6aww6q8.js:2257483-2257565 fingerprint = outputStyle (0.559)
function outputStyle(e) {
  switch (e) {
    case "output-style":
      return OUTPUT_STYLE_IDENTITY_LINE;
    case "default":
      return DEFAULT_AGENT_IDENTITY_LINE;
  }
}

export { outputStyle, outputStyleCommand };
