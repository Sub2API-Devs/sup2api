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
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import { getOriginalCwd, getAdditionalDirectoriesForClaudeMd, isDiskless } from "../../bootstrap/state.js";
import { isMemoryFilePath } from "../../utils/claudemd.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getManagedFilePath } from "../../utils/settings/managedPath.js";
import { PathSpace } from "../../utils/resultError.js";
import { buildEntriesFromLocalFiles } from "../../services/settingsSync/index.js";
import { kDt } from "../../utils/storage/storageErrors.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getFileModificationTimeAsync } from "../../utils/file.js";
import { toolResultsDirFor } from "../../utils/toolResultStorage.js";
import { peekTaskOutputDir } from "../../utils/task/diskOutput.js";
import { logError } from "../../utils/log.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";

//@ chunk-e6aww6q8.js:3155731-3155792 placement
function Lne(e, n) {
  return e.startsWith(n.endsWith(sep_48) ? n : n + sep_48);
}
//@ chunk-e6aww6q8.js:3155792-3155916 placement
function isWorkspacePath(e) {
  let n = getOriginalCwd();
  if (Lne(e, n) || getAdditionalDirectoriesForClaudeMd().some((s) => Lne(e, s))) return !0;
  let r = isMemoryFilePath(e);
  return r !== void 0 && (n === r || Lne(n, r));
}
//@ chunk-e6aww6q8.js:3156535-3156659 placement
function toHostPathSpace(e) {
  if (Lne(e, getClaudeConfigDir())) return;
  if (Lne(e, getManagedFilePath())) return PathSpace.system(e);
  if (isWorkspacePath(e)) return PathSpace.workspace(e);
  return PathSpace.home(e);
}
/**
 * 通过存储层取文件修改时间：本地文件直接 stat，其他按路径空间走宿主文件服务；不提供的返回 'unserved'。
 */
//@ chunk-e6aww6q8.js:3156659-3157007 placement
async function statViaStorage(e, n) {
  let r = buildEntriesFromLocalFiles(e);
  if (r !== void 0) {
    let statMeta = await n.statMeta(r);
    if (statMeta.ok) return Math.floor(statMeta.value.mtimeMs);
    return kDt(statMeta.error) ? "unserved" : void 0;
  }
  let s = toHostPathSpace(e);
  if (s === void 0) return "unserved";
  let stats = await n.hostFiles.stat(s);
  if (!stats.ok) return kDt(stats.error) ? "unserved" : void 0;
  return stats.value.kind === "absent" ? void 0 : Math.floor(stats.value.mtimeMs);
}
/**
 * 计算读文件的时间戳：无需时或无盘模式用当前时间，启用存储 v5 时优先走存储层，否则读文件修改时间。
 */
//@ chunk-e6aww6q8.js:3157007-3157220 placement
async function getReadTimestamp(e, n, r) {
  if (!n) return Date.now();
  try {
    if (isDiskless()) return Date.now();
    if (isStorageV5Enabled() && r !== void 0) {
      let s = await statViaStorage(e.path, r);
      if (s !== "unserved") return s ?? Date.now();
    }
    return await getFileModificationTimeAsync(e.path);
  } catch {
    return Date.now();
  }
}
//@ chunk-e6aww6q8.js:3157249-3157534 placement
function classifySavedOutputPath(e, n) {
  if (n.root.project === null) return;
  let r, s;
  try {
    ((r = toolResultsDirFor(n)), (s = peekTaskOutputDir()));
  } catch {
    logError(Error("The folders of saved output could not be looked up"));
    return;
  }
  let included = e.includes(s + sep_49);
  if (r !== null && e.includes(r + sep_49)) return included ? lit_2("both") : lit_2("saved_result");
  return included ? lit_2("background_output") : void 0;
}
//@ chunk-e6aww6q8.js:3157534-3157684 placement
function parseIntegerLike(e) {
  if (typeof e === "number") return Number.isFinite(e) ? e : void 0;
  if (typeof e === "string" && /^[-+]?\d+$/.test(e.trim())) return Number(e);
  return;
}

export { getReadTimestamp, statViaStorage, classifySavedOutputPath, parseIntegerLike };
