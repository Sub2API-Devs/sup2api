/**
 * services/plugins/publish/validationCopy.ts
 *
 * 2.1.316 新增：插件校验副本的创建与清理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9cjx5pnm.js (35)
 * attribution: placement 35
 */
import { dirname, join, relative, basename } from "path";
import { rm, lstat } from "fs/promises";
import { identityPath_2 } from "../../../skills/loadSkillsDir.js";
import { PLUGIN_MANIFEST_PATH } from "../../../utils/plugins/commandSource.js";
import { errorMessage, getErrnoCode } from "../../../utils/errors.js";
import { refusalResult } from "../../../tools/PublishPluginTool/constants.js";
import { sleep } from "../../../utils/sleep.js";
import { logForDebugging } from "../../../utils/debug.js";
import { Re } from "../../../../runtime/bun-runtime.js";
import { require_ignore } from "../../../../vendor/ignore/index.js";
import { ignorePatternError, splitNonEmptyLines } from "../../../utils/ignorePatterns.js";
import { mcpAuthCacheContent } from "../../../utils/plugins/safeFileRead.js";
import {
  isSensitiveNameOrVariant,
  isSensitiveBasenameWithVariants,
  segmentReadingsFlat,
} from "../../../utils/permissions/sensitivePaths.js";
import { WATCH_IGNORED_DIRS, isInsideTypesDir } from "../../../plugins/functionHooks/devModsWatch.js";
import { firstTruthy } from "../../../utils/auth/authUnavailableReason.js";

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
var unreadableOnError = (e) => e.catch((error) => refusalResult("unreadable", errorDetails(error)));
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
async function removeValidationCopy(e, r = MAX_REMOVE_RETRIES) {
  let s = await rm(e, {
    recursive: true,
    force: true,
  }).then(
    () => {
      return;
    },
    (error) => error,
  );
  if (s === undefined) return;
  if (r > 0) {
    await sleep(REMOVE_RETRY_DELAY_MS);
    return removeValidationCopy(e, r - 1);
  }
  logForDebugging(`A copy made to validate a plugin could not be removed: ${getErrnoCode(s) ?? "no code"}`, {
    level: "warn",
  });
}
//@ chunk-9cjx5pnm.js:2188-2258 placement
var processEndingError = () => Error("The copy to validate was ended as the process ends");
//@ chunk-9cjx5pnm.js:2258-2305 placement
var byPath = (e, r) => e.path.localeCompare(r.path, "en");
//@ chunk-9cjx5pnm.js:2410-2507 placement
/**
 * 取目录项的类型（link/folder/file/special）。
 */
var entryKind = (e) =>
  (e.isSymbolicLink() && "link") || (e.isDirectory() && "folder") || (e.isFile() && "file") || "special";
//@ chunk-9cjx5pnm.js:2507-2611 placement
async function statEntry(e) {
  let r = await lstat(e);
  return {
    path: e,
    kind: entryKind(r),
    bytes: r.size,
    mode: r.mode,
    links: r.nlink,
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
var gitignoreModule = Re(require_ignore(), 1);
//@ chunk-9cjx5pnm.js:2717-2832 placement
var firstNegatedGitignoreLine = (e) =>
  e
    .split(/\r?\n/)
    .map((line, s) => ({
      line,
      named: `line ${s + 1}: ${line}`,
    }))
    .find((r) => ignorePatternError(r.line) !== null)?.named;
//@ chunk-9cjx5pnm.js:2869-2912 placement
var As = Object.freeze(["ENOENT", "ENOTDIR"]);
//@ chunk-9cjx5pnm.js:2912-2946 placement
/**
 * 判断错误码是否可忽略。
 */
var isIgnorableErrno = (error) => As.includes(getErrnoCode(error) ?? "");
//@ chunk-9cjx5pnm.js:2946-3064 placement
var rejectIfGitignoreExists = (e) =>
  lstat(e).then(
    () => Promise.reject(Error("A .gitignore here cannot be read")),
    (error) => (isIgnorableErrno(error) ? "" : Promise.reject(error)),
  );
//@ chunk-9cjx5pnm.js:3064-3288 placement
async function readGitignoreSafely(e) {
  let r = join(e, GITIGNORE_FILENAME);
  let s = (await mcpAuthCacheContent(r)) ?? (await rejectIfGitignoreExists(r));
  let n = firstNegatedGitignoreLine(s);
  if (n !== undefined)
    throw Error("A .gitignore line cannot be read", {
      cause: `${r} ${n}`,
    });
  let a = splitNonEmptyLines(s);
  return a.length > 0
    ? [
        {
          base: e,
          rules: gitignoreModule.default().add(a),
        },
      ]
    : [];
}
//@ chunk-9cjx5pnm.js:3288-3452 placement
async function assertGitignoreNotHardlinked(path, r) {
  let s = join(path, GITIGNORE_FILENAME);
  if (r.some((a) => a.path === s && a.kind === "file" && a.links > 1))
    throw Error("A .gitignore here cannot be read", {
      cause: s,
    });
  return readGitignoreSafely(path);
}
//@ chunk-9cjx5pnm.js:3485-3515 placement
/**
 * 计算条目相对搜索根的路径（归属疑似错误，属插件/文件打包扫描）。
 */
var relativePosixPathOf = (e, r) => identityPath_2(relative(e, r.path));
//@ chunk-9cjx5pnm.js:3581-3618 placement
/**
 * 例外文件 .mcp.json（不当作机密文件）。
 */
var X0s = Object.freeze([".mcp.json"]);
//@ chunk-9cjx5pnm.js:3618-3700 placement
var isSecretPath = (e, r) =>
  !X0s.includes(r) &&
  (isSensitiveNameOrVariant(`/${r}`) ||
    isSensitiveNameOrVariant(`/${basename(e)}/${r}`) ||
    isSensitiveBasenameWithVariants(`/${r}`));
//@ chunk-9cjx5pnm.js:3743-3805 placement
var Ds = Object.freeze({
  file: "",
  folder: "/",
  link: "",
  special: "",
});
//@ chunk-9cjx5pnm.js:3805-3932 placement
var isIgnoredByRules = (e, r) =>
  e
    .toReversed()
    .map(({ base, rules }) => rules.test(relativePosixPathOf(base, r) + Ds[r.kind]))
    .find((s) => s.ignored || s.unignored)?.ignored ?? false;
//@ chunk-9cjx5pnm.js:3932-4100 placement
function isIgnoredEntry(e, r, s) {
  let n = join(e, PLUGIN_MANIFEST_PATH);
  let a = dirname(n);
  return (
    !(s.path === n || s.path === a) &&
    (isIgnoredByRules(r.scope, s) ||
      (r.path === a &&
        isIgnoredByRules(
          r.scope.filter((m) => m.base !== a),
          {
            ...s,
            path: a,
            kind: "folder",
          },
        )))
  );
}
//@ chunk-9cjx5pnm.js:4133-4181 placement = VCS_DIRECTORIES_TO_EXCLUDE (0.937)
var VCS_DIRECTORIES_TO_EXCLUDE = [...WATCH_IGNORED_DIRS, ".hg", ".svn", ".jj", ".sl", ".bzr"];
//@ chunk-9cjx5pnm.js:4181-4321 placement
function isNeverBundledPath(e) {
  let r = [basename(e.path), ...segmentReadingsFlat(basename(e.path))];
  return (
    (e.kind === "folder" && r.some((s) => s.endsWith(".git"))) ||
    r.some((s) => VCS_DIRECTORIES_TO_EXCLUDE.includes(s))
  );
}
//@ chunk-9cjx5pnm.js:4321-4563 placement
var getExclusionReason = (e, r, s) =>
  firstTruthy([
    s.kind === "link" && "link",
    s.kind === "special" && "special",
    s.kind === "file" && s.links > 1 && "hard-link",
    basename(s.path).includes("\\") && "backslash",
    isNeverBundledPath(s) && "never",
    isInsideTypesDir(e, s.path) && "generated",
    isSecretPath(e, relativePosixPathOf(e, s)) && "secret",
    isIgnoredEntry(e, r, s) && "ignored",
  ]);
//@ chunk-9cjx5pnm.js:4563-4641 placement
/**
 * 给出某条目被排除的原因（link/special/hard-link/backslash/never/generated/secret/ignored），用于打包/上传扫描；归属疑似错误。
 */
function exclusionEntriesFor(e, r, s) {
  let exclusionReason = getExclusionReason(e, r, s);
  return exclusionReason === undefined
    ? []
    : [
        {
          path: relativePosixPathOf(e, s),
          why: exclusionReason,
        },
      ];
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
function normalizeFileMode(e) {
  return (e.mode & EXEC_BIT_MASK) !== 0 ? FILE_MODE_RWX : FILE_MODE_RW;
}
//@ chunk-9cjx5pnm.js:4722-4777 placement
var listingEntry = (e, r) => ({
  path: relativePosixPathOf(e, r),
  bytes: r.bytes,
  mode: normalizeFileMode(r),
});
export {
  exclusionEntriesFor,
  relativePosixPathOf,
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
  X0s,
  FILE_MODE_RWX,
};
