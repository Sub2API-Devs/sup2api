/**
 * utils/stageFileRoots.ts
 *
 * 2.1.316 新增：阶段文件根目录（uploads/outputs 挂载路径）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (10)
 * attribution: placement 10
 */
import { posix } from "path";
import { env } from "./env.js";

//@ chunk-g54kbxqw.js:37993-38354 placement
var {
    dirname: dirname,
    isAbsolute: isAbsolute,
    join: join,
    normalize: normalize,
    relative: relative,
    sep: sep,
  } = posix,
  DEFAULT_STAGE_FILE_ROOT = "/mnt/user-data/uploads",
  STAGE_FILE_MOUNT_PREFIX = "/uploads",
  CLI_CONSUMED_STAGE_MOUNT_PREFIX = "/uploads/cowork-folders/",
  DEFAULT_OUTPUTS_ROOT = join(dirname(DEFAULT_STAGE_FILE_ROOT), "outputs"),
  DEFAULT_ATTACH_OUTPUTS_ROOT = "/mnt/attach/outputs",
  Yi = join(dirname(DEFAULT_STAGE_FILE_ROOT), "attachments"),
  Xi = join(dirname(DEFAULT_STAGE_FILE_ROOT), "project-docs"),
  Qi = "/home/claude",
  STAGE_FILE_HOME_MOUNT_PREFIX = "/uploads/.home",
  STAGE_FILE_OUTPUTS_MOUNT_PREFIX = "/outputs",
  TOOL_CONTAINER_RESULTS_ROOT = "/tmp/claude-tool-results",
  STAGE_TMP_PREFIX = ".stage-tmp.";
//@ chunk-g54kbxqw.js:38354-38473 placement
function resolveStageFileRoot(e) {
  if (!e) return DEFAULT_STAGE_FILE_ROOT;
  if (!isAbsolute(e)) throw Error("CLAUDE_STAGE_FILE_ROOT must be an absolute path");
  return normalize(e);
}
//@ chunk-g54kbxqw.js:38473-38524 placement
function getStageFileRoot() {
  return resolveStageFileRoot(env.CLAUDE_STAGE_FILE_ROOT);
}
//@ chunk-g54kbxqw.js:38524-38568 placement
function getOutputsRoot() {
  return join(dirname(getStageFileRoot()), "outputs");
}
//@ chunk-g54kbxqw.js:38568-38592 placement
function getHomeFilesRoot() {
  return Qi;
}
//@ chunk-g54kbxqw.js:38592-38617 placement
function getAttachmentsRoot() {
  return Yi;
}
//@ chunk-g54kbxqw.js:38617-38642 placement
function getProjectDocsRoot() {
  return Xi;
}
//@ chunk-g54kbxqw.js:38642-38753 placement
var PROJECT_FILES_MOUNT_PATH = "/mnt/project-files",
  PROJECT_FILES_LINK = Object.freeze({
    product: PROJECT_FILES_MOUNT_PATH,
    attach: "/mnt/attach/project-files",
  }),
  FIXED_USER_DATA_ROOTS = [DEFAULT_STAGE_FILE_ROOT, DEFAULT_OUTPUTS_ROOT];
//@ chunk-g54kbxqw.js:38753-38779 placement
function getChatFileRoots() {
  return FIXED_USER_DATA_ROOTS;
}
//@ chunk-g54kbxqw.js:38779-38859 placement
function isAtOrUnderRoot(e, n) {
  let s = relative(e, n);
  return !(s === ".." || s.startsWith(".." + sep) || isAbsolute(s));
}

export {
  DEFAULT_OUTPUTS_ROOT,
  DEFAULT_ATTACH_OUTPUTS_ROOT,
  PROJECT_FILES_LINK,
  resolveStageFileRoot,
  getHomeFilesRoot,
  STAGE_TMP_PREFIX,
  getStageFileRoot,
  PROJECT_FILES_MOUNT_PATH,
  getOutputsRoot,
  STAGE_FILE_HOME_MOUNT_PREFIX,
  STAGE_FILE_MOUNT_PREFIX,
  STAGE_FILE_OUTPUTS_MOUNT_PREFIX,
  CLI_CONSUMED_STAGE_MOUNT_PREFIX,
  TOOL_CONTAINER_RESULTS_ROOT,
  DEFAULT_STAGE_FILE_ROOT,
  FIXED_USER_DATA_ROOTS,
  getChatFileRoots,
  getProjectDocsRoot,
  getAttachmentsRoot,
  isAtOrUnderRoot,
};
