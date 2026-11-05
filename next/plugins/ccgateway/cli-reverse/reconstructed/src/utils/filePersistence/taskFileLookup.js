/**
 * utils/filePersistence/taskFileLookup.ts
 *
 * 2.1.316 新增：任务文件查找辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h6gkxbpm.js (1)
 * attribution: placement 1
 */
import { filesPlacedByNameRegistry } from "../../bootstrap/state.js";
import { nfc } from "./placedByName.js";

//@ chunk-h6gkxbpm.js:1387-1533 placement
/**
 * 判断给定文件中是否有与"按名称放置的文件"同名但 uuid 不同的冲突项。
 */
function hasConflictingPlacedFile(files) {
  let registry = filesPlacedByNameRegistry();
  return (
    registry.size > 0 &&
    files.some(({ fileUuid, name: fileName }) => {
      let placed = registry.get(nfc(fileName));
      return placed !== undefined && placed.fileUuid !== fileUuid.toLowerCase();
    })
  );
}
export { hasConflictingPlacedFile };
