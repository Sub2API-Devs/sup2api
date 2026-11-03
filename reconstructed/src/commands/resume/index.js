/**
 * commands/resume/index.ts
 *
 * /resume（别名 continue）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/resume/index.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { getIsRemoteMode } from "../../bootstrap/state.js";
import { getRemoteCaps } from "../../remote/remoteMode.js";
import { isCommandEnabled } from "../../commands.js";

//@ chunk-e6aww6q8.js:1734080-1734104 affinity
/**
 * isResumeEnabled：恒 true。
 */
function isResumeEnabled() {
  return true;
}
//@ chunk-e6aww6q8.js:1734104-1734426 fingerprint = resume (0.868)
/**
 * /resume 命令对象（local-jsx）；描述：{return"Resume a previous conversation"}；别名 ["continue"]；isEnabled: L9o；isHidden: {if(!On())return!1;let e=Jn();if(!Ud(this)||e?.sessionId===void 0||e.viewerOnly)return!0;return!1}；实现 chunk-74n7apcd.js 的 De。
 */
var resumeCommandDefinition = {
  type: "local-jsx",
  name: "resume",
  get description() {
    return "Resume a previous conversation";
  },
  aliases: ["continue"],
  get argumentHint() {
    return "[conversation id or search term]";
  },
  isEnabled: isResumeEnabled,
  ...{},
  get isHidden() {
    if (!getIsRemoteMode()) return false;
    let remoteCaps = getRemoteCaps();
    if (!isCommandEnabled(this) || remoteCaps?.sessionId === undefined || remoteCaps.viewerOnly) return true;
    return false;
  },
};
var resumeCommand = resumeCommandDefinition;
export { resumeCommand };
