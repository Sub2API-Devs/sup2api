/**
 * services/plugins/publish/validationCopy.ts
 *
 * 2.1.316 新增：插件校验副本的创建与清理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9cjx5pnm.js (32)
 * attribution: placement 32
 */
import { dirname, join, basename } from "path";
import { rm, lstat } from "fs/promises";
import { identityPath_2 } from "../../../skills/loadSkillsDir.js";
import { PLUGIN_MANIFEST_PATH } from "../../../utils/plugins/commandSource.js";
import { errorMessage, getErrnoCode } from "../../../utils/errors.js";
import { refusalResult } from "../../../tools/PublishPluginTool/constants.js";
import { sleep } from "../../../utils/sleep.js";
import { logForDebugging } from "../../../utils/debug.js";
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_ignore } from "../../../../vendor/ignore/index.js";
import { ignorePatternError, splitNonEmptyLines } from "../../../utils/ignorePatterns.js";
import { readSmallFileText } from "../../../utils/plugins/safeFileRead.js";
import {
  isSensitiveNameOrVariant,
  isSensitiveBasenameWithVariants,
  segmentReadingsFlat,
} from "../../../utils/permissions/sensitivePaths.js";
import { relativePosixPathOf } from "./publishSnapshot.js";
import { WATCH_IGNORED_DIRS } from "../../../plugins/functionHooks/devModsWatch.js";

//@ chunk-9cjx5pnm.js:1531-1584 placement
var draftManifestOf = (publishFolder) =>
  publishFolder.kind === "needs-manifest" ? publishFolder.draft : undefined;
//@ chunk-9cjx5pnm.js:1710-1732 placement
/**
 * manifest 所在目录名（.claude-plugin）。
 */
var MANIFEST_DIR_NAME = identityPath_2(dirname(join(PLUGIN_MANIFEST_PATH)));
//@ chunk-9cjx5pnm.js:1732-1841 placement
function errorDetails(error) {
  let cause = error instanceof Error ? error.cause : undefined;
  return [errorMessage(error), typeof cause === "string" ? cause : ""].filter(Boolean);
}
//@ chunk-9cjx5pnm.js:1841-1891 placement
var unreadableOnError = (promise) =>
  promise.catch((error) => refusalResult("unreadable", errorDetails(error)));
//@ chunk-9cjx5pnm.js:1925-1934 placement
/**
 * 删除校验副本的最多尝试次数（3）。
 */
var MAX_REMOVE_RETRIES = 3;
//@ chunk-9cjx5pnm.js:1934-1945 placement
/**
 * 删除重试的等待（100 毫秒）。
 */
var REMOVE_RETRY_DELAY_MS = 100;
//@ chunk-9cjx5pnm.js:1945-2188 placement
async function removeValidationCopy(dirPath, retriesLeft = MAX_REMOVE_RETRIES) {
  let lastError = await rm(dirPath, {
    recursive: true,
    force: true,
  }).then(
    () => {
      return;
    },
    (error) => error,
  );
  if (lastError === undefined) return;
  if (retriesLeft > 0) {
    await sleep(REMOVE_RETRY_DELAY_MS);
    return removeValidationCopy(dirPath, retriesLeft - 1);
  }
  logForDebugging(
    `A copy made to validate a plugin could not be removed: ${getErrnoCode(lastError) ?? "no code"}`,
    {
      level: "warn",
    },
  );
}
//@ chunk-9cjx5pnm.js:2188-2258 placement
var processEndingError = () => Error("The copy to validate was ended as the process ends");
//@ chunk-9cjx5pnm.js:2258-2305 placement
var byPath = (left, right) => left.path.localeCompare(right.path, "en");
//@ chunk-9cjx5pnm.js:2410-2507 placement
/**
 * 取目录项的类型（link/folder/file/special）。
 */
var entryKind = (stats) =>
  (stats.isSymbolicLink() && "link") ||
  (stats.isDirectory() && "folder") ||
  (stats.isFile() && "file") ||
  "special";
//@ chunk-9cjx5pnm.js:2507-2611 placement
async function statEntry(filePath) {
  let stats = await lstat(filePath);
  return {
    path: filePath,
    kind: entryKind(stats),
    bytes: stats.size,
    mode: stats.mode,
    links: stats.nlink,
  };
}
//@ chunk-9cjx5pnm.js:2611-2620 placement
var MAX_COPY_DEPTH = 32;
//@ chunk-9cjx5pnm.js:2649-2669 placement
/**
 * .gitignore 文件名。
 */
var GITIGNORE_FILENAME = ".gitignore";
//@ chunk-9cjx5pnm.js:2669-2688 placement
/**
 * 懒加载的 gitignore 模块。
 */
var gitignoreModule = __toESM(require_ignore(), 1);
//@ chunk-9cjx5pnm.js:2717-2832 placement
var firstNegatedGitignoreLine = (text) =>
  text
    .split(/\r?\n/)
    .map((line, index) => ({
      line,
      named: `line ${index + 1}: ${line}`,
    }))
    .find((entry) => ignorePatternError(entry.line) !== null)?.named;
//@ chunk-9cjx5pnm.js:2869-2912 placement
var IGNORABLE_FS_ERROR_CODES = Object.freeze(["ENOENT", "ENOTDIR"]);
//@ chunk-9cjx5pnm.js:2912-2946 placement
/**
 * 判断错误码是否可忽略。
 */
var isIgnorableErrno = (error) => IGNORABLE_FS_ERROR_CODES.includes(getErrnoCode(error) ?? "");
//@ chunk-9cjx5pnm.js:2946-3064 placement
var rejectIfGitignoreExists = (dir) =>
  lstat(dir).then(
    () => Promise.reject(Error("A .gitignore here cannot be read")),
    (error) => (isIgnorableErrno(error) ? "" : Promise.reject(error)),
  );
//@ chunk-9cjx5pnm.js:3064-3288 placement
async function readGitignoreSafely(dir) {
  let ignorePath = join(dir, GITIGNORE_FILENAME);
  let text = (await readSmallFileText(ignorePath)) ?? (await rejectIfGitignoreExists(ignorePath));
  let badLine = firstNegatedGitignoreLine(text);
  if (badLine !== undefined)
    throw Error("A .gitignore line cannot be read", {
      cause: `${ignorePath} ${badLine}`,
    });
  let lines = splitNonEmptyLines(text);
  return lines.length > 0
    ? [
        {
          base: dir,
          rules: gitignoreModule.default().add(lines),
        },
      ]
    : [];
}
//@ chunk-9cjx5pnm.js:3288-3452 placement
async function assertGitignoreNotHardlinked(dir, entries) {
  let ignorePath = join(dir, GITIGNORE_FILENAME);
  if (entries.some((entry) => entry.path === ignorePath && entry.kind === "file" && entry.links > 1))
    throw Error("A .gitignore here cannot be read", {
      cause: ignorePath,
    });
  return readGitignoreSafely(dir);
}
//@ chunk-9cjx5pnm.js:3581-3618 placement
/**
 * 例外文件 .mcp.json（不当作机密文件）。
 */
var MCP_CONFIG_FILES = Object.freeze([".mcp.json"]);
//@ chunk-9cjx5pnm.js:3618-3700 placement
var isSecretPath = (root, relativePath) =>
  !MCP_CONFIG_FILES.includes(relativePath) &&
  (isSensitiveNameOrVariant(`/${relativePath}`) ||
    isSensitiveNameOrVariant(`/${basename(root)}/${relativePath}`) ||
    isSensitiveBasenameWithVariants(`/${relativePath}`));
//@ chunk-9cjx5pnm.js:3743-3805 placement
var EMPTY_FILE_KINDS = Object.freeze({
  file: "",
  folder: "/",
  link: "",
  special: "",
});
//@ chunk-9cjx5pnm.js:3805-3932 placement
var isIgnoredByRules = (scope, entry) =>
  scope
    .toReversed()
    .map(({ base, rules }) => rules.test(relativePosixPathOf(base, entry) + EMPTY_FILE_KINDS[entry.kind]))
    .find((result) => result.ignored || result.unignored)?.ignored ?? false;
//@ chunk-9cjx5pnm.js:3932-4100 placement
function isIgnoredEntry(root, folder, entry) {
  let manifestPath = join(root, PLUGIN_MANIFEST_PATH);
  let manifestDir = dirname(manifestPath);
  return (
    !(entry.path === manifestPath || entry.path === manifestDir) &&
    (isIgnoredByRules(folder.scope, entry) ||
      (folder.path === manifestDir &&
        isIgnoredByRules(
          folder.scope.filter((layer) => layer.base !== manifestDir),
          {
            ...entry,
            path: manifestDir,
            kind: "folder",
          },
        )))
  );
}
//@ chunk-9cjx5pnm.js:4133-4181 placement = VCS_DIRECTORIES_TO_EXCLUDE (0.937)
var VCS_DIRECTORIES_TO_EXCLUDE = [...WATCH_IGNORED_DIRS, ".hg", ".svn", ".jj", ".sl", ".bzr"];
//@ chunk-9cjx5pnm.js:4181-4321 placement
function isNeverBundledPath(entry) {
  let names = [basename(entry.path), ...segmentReadingsFlat(basename(entry.path))];
  return (
    (entry.kind === "folder" && names.some((name) => name.endsWith(".git"))) ||
    names.some((name) => VCS_DIRECTORIES_TO_EXCLUDE.includes(name))
  );
}
//@ chunk-9cjx5pnm.js:4641-4654 placement
var FILE_MODE_RW = 33188;
//@ chunk-9cjx5pnm.js:4654-4664 placement
/**
 * 文件模式里表示可执行的位掩码（73）。
 */
var EXEC_BIT_MASK = 73;
//@ chunk-9cjx5pnm.js:4664-4678 placement
var FILE_MODE_RWX = 33261;
//@ chunk-9cjx5pnm.js:4678-4722 placement
/**
 * 按可执行位选择文件权限（755 或 644）。
 */
function normalizeFileMode(entry) {
  return (entry.mode & EXEC_BIT_MASK) !== 0 ? FILE_MODE_RWX : FILE_MODE_RW;
}
//@ chunk-9cjx5pnm.js:4722-4777 placement
var listingEntry = (root, entry) => ({
  path: relativePosixPathOf(root, entry),
  bytes: entry.bytes,
  mode: normalizeFileMode(entry),
});
export {
  isNeverBundledPath,
  isSecretPath,
  isIgnoredEntry,
  listingEntry,
  MAX_COPY_DEPTH,
  statEntry,
  assertGitignoreNotHardlinked,
  isIgnorableErrno,
  readGitignoreSafely,
  byPath,
  processEndingError,
  removeValidationCopy,
  errorDetails,
  MANIFEST_DIR_NAME,
  unreadableOnError,
  FILE_MODE_RW,
  draftManifestOf,
  MCP_CONFIG_FILES,
  FILE_MODE_RWX,
};
