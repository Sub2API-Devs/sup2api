/**
 * services/remoteTools/attachedComputers.ts
 *
 * 2.1.316 新增：判断是否已有附加的远程电脑
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xssqvf8d.js (1)
 * attribution: placement 1
 */
import { RemoteBackgroundCommands } from "./backgroundCommands.js";

//@ chunk-xssqvf8d.js:4427-4571 placement
/**
 * 判断会话是否有已附加的电脑。
 */
function hasAttachedComputers(appState) {
  let entries = appState.get(RemoteBackgroundCommands).entries();
  if (!Array.isArray(entries)) throw TypeError("the record of attached computers gave no list");
  return entries.length > 0;
}
export { hasAttachedComputers };
