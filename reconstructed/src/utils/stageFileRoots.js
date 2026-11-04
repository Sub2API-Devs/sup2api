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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-g54kbxqw.js:37993-38354 placement
/**
 * 阶段文件根目录常量组：用户数据根、outputs/attachments/project-docs、家目录、mount 前缀与临时前缀。
 */
var dirname; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var isAbsolute;
var join;
var normalize;
var relative;
var sep;
var DEFAULT_STAGE_FILE_ROOT;
var STAGE_FILE_MOUNT_PREFIX;
var CLI_CONSUMED_STAGE_MOUNT_PREFIX;
var DEFAULT_OUTPUTS_ROOT;
var DEFAULT_ATTACH_OUTPUTS_ROOT;
var ATTACHMENTS_ROOT;
var PROJECT_DOCS_ROOT;
var CLAUDE_HOME_DIR;
var STAGE_FILE_HOME_MOUNT_PREFIX;
var STAGE_FILE_OUTPUTS_MOUNT_PREFIX;
var TOOL_CONTAINER_RESULTS_ROOT;
var STAGE_TMP_PREFIX;
deferInit("chunk-g54kbxqw.js:37993", () => {
  ({ dirname, isAbsolute, join, normalize, relative, sep } = posix);
  DEFAULT_STAGE_FILE_ROOT = "/mnt/user-data/uploads";
  STAGE_FILE_MOUNT_PREFIX = "/uploads";
  CLI_CONSUMED_STAGE_MOUNT_PREFIX = "/uploads/cowork-folders/";
  DEFAULT_OUTPUTS_ROOT = join(dirname(DEFAULT_STAGE_FILE_ROOT), "outputs");
  DEFAULT_ATTACH_OUTPUTS_ROOT = "/mnt/attach/outputs";
  ATTACHMENTS_ROOT = join(dirname(DEFAULT_STAGE_FILE_ROOT), "attachments");
  PROJECT_DOCS_ROOT = join(dirname(DEFAULT_STAGE_FILE_ROOT), "project-docs");
  CLAUDE_HOME_DIR = "/home/claude";
  STAGE_FILE_HOME_MOUNT_PREFIX = "/uploads/.home";
  STAGE_FILE_OUTPUTS_MOUNT_PREFIX = "/outputs";
  TOOL_CONTAINER_RESULTS_ROOT = "/tmp/claude-tool-results";
  STAGE_TMP_PREFIX = ".stage-tmp.";
});
//@ chunk-g54kbxqw.js:38354-38473 placement
function resolveStageFileRoot(rootPath) {
  if (!rootPath) return DEFAULT_STAGE_FILE_ROOT;
  if (!isAbsolute(rootPath)) throw Error("CLAUDE_STAGE_FILE_ROOT must be an absolute path");
  return normalize(rootPath);
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
  return CLAUDE_HOME_DIR;
}
//@ chunk-g54kbxqw.js:38592-38617 placement
function getAttachmentsRoot() {
  return ATTACHMENTS_ROOT;
}
//@ chunk-g54kbxqw.js:38617-38642 placement
function getProjectDocsRoot() {
  return PROJECT_DOCS_ROOT;
}
//@ chunk-g54kbxqw.js:38642-38753 placement
var PROJECT_FILES_MOUNT_PATH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROJECT_FILES_LINK;
var FIXED_USER_DATA_ROOTS;
deferInit("chunk-g54kbxqw.js:38642", () => {
  PROJECT_FILES_MOUNT_PATH = "/mnt/project-files";
  PROJECT_FILES_LINK = Object.freeze({
    product: PROJECT_FILES_MOUNT_PATH,
    attach: "/mnt/attach/project-files",
  });
  FIXED_USER_DATA_ROOTS = [DEFAULT_STAGE_FILE_ROOT, DEFAULT_OUTPUTS_ROOT];
});
//@ chunk-g54kbxqw.js:38753-38779 placement
function getChatFileRoots() {
  return FIXED_USER_DATA_ROOTS;
}
//@ chunk-g54kbxqw.js:38779-38859 placement
function isAtOrUnderRoot(path, root) {
  let relativePath = relative(path, root);
  return !(relativePath === ".." || relativePath.startsWith(".." + sep) || isAbsolute(relativePath));
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
