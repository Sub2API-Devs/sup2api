/**
 * utils/stageFileRoots.ts
 *
 * 2.1.316 新增：阶段文件根目录（uploads/outputs 挂载路径）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (11)
 * attribution: placement 11
 */
import { posix } from "path";
import { env } from "./env.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:175470-175864 placement
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
var CLI_CONSUMED_STAGE_ROOT;
var DEFAULT_OUTPUTS_ROOT;
var DEFAULT_ATTACH_OUTPUTS_ROOT;
var ATTACHMENTS_ROOT;
var PROJECT_DOCS_ROOT;
var DEFAULT_HOME_FILES_ROOT;
var STAGE_FILE_HOME_MOUNT_PREFIX;
var STAGE_FILE_OUTPUTS_MOUNT_PREFIX;
var TOOL_CONTAINER_RESULTS_ROOT;
var STAGE_TMP_PREFIX;
deferInit("chunk-a2q0x549.js:175470", () => {
  ({ dirname, isAbsolute, join, normalize, relative, sep } = posix);
  DEFAULT_STAGE_FILE_ROOT = "/mnt/user-data/uploads";
  STAGE_FILE_MOUNT_PREFIX = "/uploads";
  CLI_CONSUMED_STAGE_MOUNT_PREFIX = "/uploads/cowork-folders/";
  CLI_CONSUMED_STAGE_ROOT = `${DEFAULT_STAGE_FILE_ROOT}${CLI_CONSUMED_STAGE_MOUNT_PREFIX.slice(STAGE_FILE_MOUNT_PREFIX.length)}`;
  DEFAULT_OUTPUTS_ROOT = join(dirname(DEFAULT_STAGE_FILE_ROOT), "outputs");
  DEFAULT_ATTACH_OUTPUTS_ROOT = "/mnt/attach/outputs";
  ATTACHMENTS_ROOT = join(dirname(DEFAULT_STAGE_FILE_ROOT), "attachments");
  PROJECT_DOCS_ROOT = join(dirname(DEFAULT_STAGE_FILE_ROOT), "project-docs");
  DEFAULT_HOME_FILES_ROOT = "/home/claude";
  STAGE_FILE_HOME_MOUNT_PREFIX = "/uploads/.home";
  STAGE_FILE_OUTPUTS_MOUNT_PREFIX = "/outputs";
  TOOL_CONTAINER_RESULTS_ROOT = "/tmp/claude-tool-results";
  STAGE_TMP_PREFIX = ".stage-tmp.";
});
//@ chunk-a2q0x549.js:175864-175982 placement
function resolveStageFileRoot(rootPath) {
  if (!rootPath) return DEFAULT_STAGE_FILE_ROOT;
  if (!isAbsolute(rootPath)) throw Error("CLAUDE_STAGE_FILE_ROOT must be an absolute path");
  return normalize(rootPath);
}
//@ chunk-a2q0x549.js:175982-176033 placement
function getStageFileRoot() {
  return resolveStageFileRoot(env.CLAUDE_STAGE_FILE_ROOT);
}
//@ chunk-a2q0x549.js:176033-176078 placement
function getOutputsRoot() {
  return join(dirname(getStageFileRoot()), "outputs");
}
//@ chunk-a2q0x549.js:176078-176103 placement
function getHomeFilesRoot() {
  return DEFAULT_HOME_FILES_ROOT;
}
//@ chunk-a2q0x549.js:176103-176128 placement
function getAttachmentsRoot() {
  return ATTACHMENTS_ROOT;
}
//@ chunk-a2q0x549.js:176128-176153 placement
function getProjectDocsRoot() {
  return PROJECT_DOCS_ROOT;
}
//@ chunk-a2q0x549.js:176153-176189 placement
/**
 * CLI 侧消费的 stage 挂载前缀（/mnt/project）。
 */
function getChatProjectRoot() {
  return "/mnt/project";
}
//@ chunk-a2q0x549.js:176189-176299 placement
var PROJECT_FILES_MOUNT_PATH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROJECT_FILES_LINK;
var FIXED_USER_DATA_ROOTS;
deferInit("chunk-a2q0x549.js:176189", () => {
  PROJECT_FILES_MOUNT_PATH = "/mnt/project-files";
  PROJECT_FILES_LINK = Object.freeze({
    product: PROJECT_FILES_MOUNT_PATH,
    attach: "/mnt/attach/project-files",
  });
  FIXED_USER_DATA_ROOTS = [DEFAULT_STAGE_FILE_ROOT, DEFAULT_OUTPUTS_ROOT];
});
//@ chunk-a2q0x549.js:176299-176325 placement
function getChatFileRoots() {
  return FIXED_USER_DATA_ROOTS;
}
//@ chunk-a2q0x549.js:176325-176405 placement
function isAtOrUnderRoot(path, root) {
  let relativePath = relative(path, root);
  return !(relativePath === ".." || relativePath.startsWith(".." + sep) || isAbsolute(relativePath));
}
export {
  getChatFileRoots,
  isAtOrUnderRoot,
  DEFAULT_ATTACH_OUTPUTS_ROOT,
  DEFAULT_STAGE_FILE_ROOT,
  getStageFileRoot,
  getProjectDocsRoot,
  PROJECT_FILES_MOUNT_PATH,
  TOOL_CONTAINER_RESULTS_ROOT,
  getAttachmentsRoot,
  STAGE_FILE_MOUNT_PREFIX,
  CLI_CONSUMED_STAGE_MOUNT_PREFIX,
  STAGE_FILE_HOME_MOUNT_PREFIX,
  getHomeFilesRoot,
  getChatProjectRoot,
  resolveStageFileRoot,
  FIXED_USER_DATA_ROOTS,
  getOutputsRoot,
  DEFAULT_OUTPUTS_ROOT,
  STAGE_FILE_OUTPUTS_MOUNT_PREFIX,
  STAGE_TMP_PREFIX,
  PROJECT_FILES_LINK,
  DEFAULT_HOME_FILES_ROOT,
  CLI_CONSUMED_STAGE_ROOT,
};
