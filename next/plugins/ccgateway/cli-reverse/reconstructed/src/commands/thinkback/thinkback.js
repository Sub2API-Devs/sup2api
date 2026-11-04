/**
 * commands/thinkback/thinkback.tsx
 *
 * （切分有误）实际是 /advisor 模型选择界面
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/thinkback/thinkback.tsx
 * pieces: chunk-axmbhcjg.js (1)
 * attribution: fingerprint 1
 */
import { foldName } from "../../utils/permissions/protectedDirNames.js";
import { SYNCED_DIR } from "../../utils/plugins/syncedItems.js";

//@ chunk-axmbhcjg.js:10353-10434 fingerprint = getThinkbackSkillDir (1)
function getThinkbackSkillDir(pathParts) {
  let [firstSegment, secondSegment] = pathParts.split("/");
  return foldName(firstSegment ?? "") === "skills" && foldName(secondSegment ?? "") === SYNCED_DIR;
}
export { getThinkbackSkillDir };
