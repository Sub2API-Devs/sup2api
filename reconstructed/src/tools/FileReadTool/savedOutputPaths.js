/**
 * tools/FileReadTool/savedOutputPaths.ts
 *
 * 2.1.316 新增：已保存工具输出的路径识别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { sep } from "path";
import { getOriginalCwd, getAdditionalDirectoriesForClaudeMd, isDiskless } from "../../bootstrap/state.js";
import { isMemoryFilePath } from "../../utils/claudemd.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getManagedFilePath } from "../../utils/settings/managedPath.js";
import { PathSpace } from "../../utils/resultError.js";
import { buildEntriesFromLocalFiles } from "../../services/settingsSync/index.js";
import { isUnsupportedStorageError } from "../../utils/storage/storageErrors.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getFileModificationTimeAsync } from "../../utils/file.js";
import { toolResultsDirFor_2 } from "../../utils/toolResultStorage.js";
import { peekTaskOutputDir } from "../../utils/task/diskOutput.js";
import { logError } from "../../utils/log.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";

//@ chunk-e6aww6q8.js:3155731-3155792 placement
/**
 * 判断路径是否位于某目录下（目录末尾补分隔符再比较）。
 */
function isPathWithin(e, n) {
  return e.startsWith(n.endsWith(sep) ? n : n + sep);
}
//@ chunk-e6aww6q8.js:3155792-3155916 placement
function isWorkspacePath(filePath) {
  let originalCwd = getOriginalCwd();
  if (
    isPathWithin(filePath, originalCwd) ||
    getAdditionalDirectoriesForClaudeMd().some((s) => isPathWithin(filePath, s))
  )
    return true;
  let r = isMemoryFilePath(filePath);
  return r !== undefined && (originalCwd === r || isPathWithin(originalCwd, r));
}
//@ chunk-e6aww6q8.js:3156535-3156659 placement
function toHostPathSpace(e) {
  if (isPathWithin(e, getClaudeConfigDir())) return;
  if (isPathWithin(e, getManagedFilePath())) return PathSpace.system(e);
  if (isWorkspacePath(e)) return PathSpace.workspace(e);
  return PathSpace.home(e);
}
//@ chunk-e6aww6q8.js:3156659-3157007 placement
/**
 * 通过存储层取文件修改时间：本地文件直接 stat，其他按路径空间走宿主文件服务；不提供的返回 'unserved'。
 */
async function statViaStorage(projectId, n) {
  let entriesFromLocalFiles = buildEntriesFromLocalFiles(projectId);
  if (entriesFromLocalFiles !== undefined) {
    let y = await n.statMeta(entriesFromLocalFiles);
    if (y.ok) return Math.floor(y.value.mtimeMs);
    return isUnsupportedStorageError(y.error) ? "unserved" : undefined;
  }
  let hostPathSpace = toHostPathSpace(projectId);
  if (hostPathSpace === undefined) return "unserved";
  let stats = await n.hostFiles.stat(hostPathSpace);
  if (!stats.ok) return isUnsupportedStorageError(stats.error) ? "unserved" : undefined;
  return stats.value.kind === "absent" ? undefined : Math.floor(stats.value.mtimeMs);
}
//@ chunk-e6aww6q8.js:3157007-3157220 placement
/**
 * 计算读文件的时间戳：无需时或无盘模式用当前时间，启用存储 v5 时优先走存储层，否则读文件修改时间。
 */
async function getReadTimestamp(e, n, storageV5) {
  if (!n) return Date.now();
  try {
    if (isDiskless()) return Date.now();
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      let s = await statViaStorage(e.path, storageV5);
      if (s !== "unserved") return s ?? Date.now();
    }
    return await getFileModificationTimeAsync(e.path);
  } catch {
    return Date.now();
  }
}
//@ chunk-e6aww6q8.js:3157249-3157534 placement
function classifySavedOutputPath(e, session) {
  if (session.root.project === null) return;
  let r;
  let s;
  try {
    r = toolResultsDirFor_2(session);
    s = peekTaskOutputDir();
  } catch {
    logError(Error("The folders of saved output could not be looked up"));
    return;
  }
  let included = e.includes(s + sep);
  if (r !== null && e.includes(r + sep)) return included ? lit_2("both") : lit_2("saved_result");
  return included ? lit_2("background_output") : undefined;
}
//@ chunk-e6aww6q8.js:3157534-3157684 placement
function parseIntegerLike(e) {
  if (typeof e === "number") return Number.isFinite(e) ? e : undefined;
  if (typeof e === "string" && /^[-+]?\d+$/.test(e.trim())) return Number(e);
  return;
}
export { getReadTimestamp, statViaStorage, classifySavedOutputPath, parseIntegerLike };
