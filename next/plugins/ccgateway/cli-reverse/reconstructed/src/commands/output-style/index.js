/**
 * commands/output-style/index.ts
 *
 * /output-style 无头命令对象（切分另含一个提示词片段）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/output-style/index.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isSettingsMovedToConfig, isMovedToConfigCommandHidden } from "../createMovedToConfigCommand.js";
import { OUTPUT_STYLE_IDENTITY_LINE, DEFAULT_AGENT_IDENTITY_LINE } from "../../constants/prompts.js";

//@ chunk-5xgkngpb.js:1770019-1770308 placement
/**
 * /output-style 命令对象（local）；描述：List output styles or switch to one；isEnabled: ()=>_e()||!dRe()||ien()；isHidden: {return!_e()&&dRe()&&!ien()}；实现 chunk-1ehcpf9z.js 的 B。
 */
var outputStyleCommand = {
  type: "local",
  name: "output-style",
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  description: "List output styles or switch to one",
  argumentHint: "[style]",
  isEnabled: () =>
    getIsNonInteractiveSession() || !isSettingsMovedToConfig() || isMovedToConfigCommandHidden(),
  get isHidden() {
    return !getIsNonInteractiveSession() && isSettingsMovedToConfig() && !isMovedToConfigCommandHidden();
  },
  load: () => import("./CUSTOM_CURRENT_STYLE_PLACEHOLDER.lazy.js"),
};
//@ chunk-5xgkngpb.js:2312703-2312785 fingerprint (2.1.88 match: outputStyle, 0.559)
function outputStyle(arg) {
  switch (arg) {
    case "output-style":
      return OUTPUT_STYLE_IDENTITY_LINE;
    case "default":
      return DEFAULT_AGENT_IDENTITY_LINE;
  }
}
export { outputStyle, outputStyleCommand };
