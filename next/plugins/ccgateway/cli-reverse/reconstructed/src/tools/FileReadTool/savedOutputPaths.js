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
function isPathWithin(filePath, directory) {
  return filePath.startsWith(directory.endsWith(sep) ? directory : directory + sep);
}
//@ chunk-e6aww6q8.js:3155792-3155916 placement
function isWorkspacePath(filePath) {
  let originalCwd = getOriginalCwd();
  if (
    isPathWithin(filePath, originalCwd) ||
    getAdditionalDirectoriesForClaudeMd().some((extraDirectory) => isPathWithin(filePath, extraDirectory))
  )
    return true;
  let memoryDir = isMemoryFilePath(filePath);
  return memoryDir !== undefined && (originalCwd === memoryDir || isPathWithin(originalCwd, memoryDir));
}
//@ chunk-e6aww6q8.js:3156535-3156659 placement
function toHostPathSpace(filePath) {
  if (isPathWithin(filePath, getClaudeConfigDir())) return;
  if (isPathWithin(filePath, getManagedFilePath())) return PathSpace.system(filePath);
  if (isWorkspacePath(filePath)) return PathSpace.workspace(filePath);
  return PathSpace.home(filePath);
}
//@ chunk-e6aww6q8.js:3156659-3157007 placement
/**
 * 通过存储层取文件修改时间：本地文件直接 stat，其他按路径空间走宿主文件服务；不提供的返回 'unserved'。
 */
async function statViaStorage(filePath, storage) {
  let entriesFromLocalFiles = buildEntriesFromLocalFiles(filePath);
  if (entriesFromLocalFiles !== undefined) {
    let statResult = await storage.statMeta(entriesFromLocalFiles);
    if (statResult.ok) return Math.floor(statResult.value.mtimeMs);
    return isUnsupportedStorageError(statResult.error) ? "unserved" : undefined;
  }
  let hostPathSpace = toHostPathSpace(filePath);
  if (hostPathSpace === undefined) return "unserved";
  let stats = await storage.hostFiles.stat(hostPathSpace);
  if (!stats.ok) return isUnsupportedStorageError(stats.error) ? "unserved" : undefined;
  return stats.value.kind === "absent" ? undefined : Math.floor(stats.value.mtimeMs);
}
//@ chunk-e6aww6q8.js:3157007-3157220 placement
/**
 * 计算读文件的时间戳：无需时或无盘模式用当前时间，启用存储 v5 时优先走存储层，否则读文件修改时间。
 */
async function getReadTimestamp(readEntry, useMtime, storage) {
  if (!useMtime) return Date.now();
  try {
    if (isDiskless()) return Date.now();
    if (isStorageV5Enabled() && storage !== undefined) {
      let storageMtime = await statViaStorage(readEntry.path, storage);
      if (storageMtime !== "unserved") return storageMtime ?? Date.now();
    }
    return await getFileModificationTimeAsync(readEntry.path);
  } catch {
    return Date.now();
  }
}
//@ chunk-e6aww6q8.js:3157249-3157534 placement
function classifySavedOutputPath(filePath, session) {
  if (session.root.project === null) return;
  let toolResultsDir;
  let backgroundOutputDir;
  try {
    toolResultsDir = toolResultsDirFor_2(session);
    backgroundOutputDir = peekTaskOutputDir();
  } catch {
    logError(Error("The folders of saved output could not be looked up"));
    return;
  }
  let included = filePath.includes(backgroundOutputDir + sep);
  if (toolResultsDir !== null && filePath.includes(toolResultsDir + sep))
    return included ? lit_2("both") : lit_2("saved_result");
  return included ? lit_2("background_output") : undefined;
}
//@ chunk-e6aww6q8.js:3157534-3157684 placement
function parseIntegerLike(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && /^[-+]?\d+$/.test(value.trim())) return Number(value);
  return;
}
export { getReadTimestamp, statViaStorage, classifySavedOutputPath, parseIntegerLike };
