/**
 * tools/FileReadTool/savedOutputPaths.ts
 *
 * 2.1.316 新增：已保存工具输出的路径识别
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sep } from "path";
import { toolResultsDirFor_2 } from "../../utils/toolResultStorage.js";
import { peekTaskOutputDir } from "../../utils/task/diskOutput.js";
import { logError } from "../../utils/log.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { getOriginalCwd, getAdditionalDirectoriesForClaudeMd, isDiskless } from "../../bootstrap/state.js";
import { isMemoryFilePath } from "../../utils/claudemd.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { getManagedFilePath } from "../../utils/settings/managedPath.js";
import { PathSpace } from "../../utils/resultError.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { buildEntriesFromLocalFiles } from "../../services/settingsSync/index.js";
import { isUnsupportedStorageError } from "../../utils/storage/storageErrors.js";
import { getFileModificationTimeAsync } from "../../utils/file.js";

//@ chunk-5xgkngpb.js:3242307-3242592 placement
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
//@ chunk-5xgkngpb.js:3242592-3242742 placement
function parseIntegerLike(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && /^[-+]?\d+$/.test(value.trim())) return Number(value);
  return;
}
//@ chunk-5xgkngpb.js:3346472-3346533 placement
/**
 * 判断路径是否位于某目录下（目录末尾补分隔符再比较）。
 */
function isPathWithin(filePath, directory) {
  return filePath.startsWith(directory.endsWith(sep) ? directory : directory + sep);
}
//@ chunk-5xgkngpb.js:3346533-3346657 placement
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
//@ chunk-5xgkngpb.js:3347277-3347401 placement
function toHostPathSpace(filePath) {
  if (isPathWithin(filePath, getClaudeConfigDir())) return;
  if (isPathWithin(filePath, getManagedFilePath())) return PathSpace.system(filePath);
  if (isWorkspacePath(filePath)) return PathSpace.workspace(filePath);
  return PathSpace.home(filePath);
}
//@ chunk-5xgkngpb.js:3347401-3347871 placement
/**
 * 计算读文件的时间戳：无需时或无盘模式用当前时间，启用存储 v5 时优先走存储层，否则读文件修改时间。
 */
async function getReadTimestamp(readEntry, useMtime, storageV5) {
  if (!useMtime) return Date.now();
  try {
    if (isDiskless()) return Date.now();
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      let entriesFromLocalFiles = buildEntriesFromLocalFiles(readEntry.path);
      if (entriesFromLocalFiles !== undefined) {
        let meta = await storageV5.statMeta(entriesFromLocalFiles);
        if (meta.ok) return Math.floor(meta.value.mtimeMs);
        if (!isUnsupportedStorageError(meta.error)) return Date.now();
      } else {
        let hostPathSpace = toHostPathSpace(readEntry.path);
        if (hostPathSpace !== undefined) {
          let stats = await storageV5.hostFiles.stat(hostPathSpace);
          if (stats.ok) return stats.value.kind === "absent" ? Date.now() : Math.floor(stats.value.mtimeMs);
          if (!isUnsupportedStorageError(stats.error)) return Date.now();
        }
      }
    }
    return await getFileModificationTimeAsync(readEntry.path);
  } catch {
    return Date.now();
  }
}
export { classifySavedOutputPath, getReadTimestamp, parseIntegerLike };
