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
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  relative,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
} from "path";
import {
  rm,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
} from "fs/promises";
import { _P } from "../../../skills/loadSkillsDir.js";
import { PLUGIN_MANIFEST_PATH } from "../../../utils/plugins/commandSource.js";
import { errorMessage, getErrnoCode } from "../../../utils/errors.js";
import { Qh } from "../../../tools/PublishPluginTool/constants.js";
import { sleep } from "../../../utils/sleep.js";
import { logForDebugging } from "../../../utils/debug.js";
import { Re } from "../../../../runtime/bun-runtime.js";
import { Vpe } from "../../../../vendor/ignore/index.js";
import { _9r, wAt } from "../../../utils/ignorePatterns.js";
import { ZB } from "../../../utils/plugins/safeFileRead.js";
import { _H, B$e, Eai } from "../../../utils/permissions/sensitivePaths.js";
import { xXn, ZWt } from "../../../plugins/functionHooks/devModsWatch.js";
import { wAo } from "../../../utils/auth/authUnavailableReason.js";

//@ chunk-9cjx5pnm.js:1531-1584 placement
var draftManifestOf = (e) => (e.kind === "needs-manifest" ? e.draft : void 0);
//@ chunk-9cjx5pnm.js:1710-1732 placement
var De = _P(dirname(join_2(PLUGIN_MANIFEST_PATH)));
//@ chunk-9cjx5pnm.js:1732-1841 placement
function errorDetails(e) {
  let r = e instanceof Error ? e.cause : void 0;
  return [errorMessage(e), typeof r === "string" ? r : ""].filter(Boolean);
}
//@ chunk-9cjx5pnm.js:1841-1891 placement
var unreadableOnError = (e) => e.catch((r) => Qh("unreadable", errorDetails(r)));
//@ chunk-9cjx5pnm.js:1925-1934 placement
var xs = 3;
//@ chunk-9cjx5pnm.js:1934-1945 placement
var Rs = 100;
//@ chunk-9cjx5pnm.js:1945-2188 placement
async function removeValidationCopy(e, r = xs) {
  let s = await rm(e, { recursive: !0, force: !0 }).then(
    () => {
      return;
    },
    (n) => n,
  );
  if (s === void 0) return;
  if (r > 0) return (await sleep(Rs), removeValidationCopy(e, r - 1));
  logForDebugging(`A copy made to validate a plugin could not be removed: ${getErrnoCode(s) ?? "no code"}`, {
    level: "warn",
  });
}
//@ chunk-9cjx5pnm.js:2188-2258 placement
var processEndingError = () => Error("The copy to validate was ended as the process ends");
//@ chunk-9cjx5pnm.js:2258-2305 placement
var byPath = (e, r) => e.path.localeCompare(r.path, "en");
//@ chunk-9cjx5pnm.js:2410-2507 placement
var Ps = (e) =>
  (e.isSymbolicLink() && "link") || (e.isDirectory() && "folder") || (e.isFile() && "file") || "special";
//@ chunk-9cjx5pnm.js:2507-2611 placement
async function statEntry(e) {
  let r = await lstat(e);
  return { path: e, kind: Ps(r), bytes: r.size, mode: r.mode, links: r.nlink };
}
//@ chunk-9cjx5pnm.js:2611-2620 placement
var MAX_COPY_DEPTH = 32;
//@ chunk-9cjx5pnm.js:2649-2669 placement
var We = ".gitignore";
//@ chunk-9cjx5pnm.js:2669-2688 placement
var Ve = Re(Vpe(), 1);
//@ chunk-9cjx5pnm.js:2717-2832 placement
var firstNegatedGitignoreLine = (e) =>
  e
    .split(/\r?\n/)
    .map((r, s) => ({ line: r, named: `line ${s + 1}: ${r}` }))
    .find((r) => _9r(r.line) !== null)?.named;
//@ chunk-9cjx5pnm.js:2869-2912 placement
var freeze = Object.freeze(["ENOENT", "ENOTDIR"]);
//@ chunk-9cjx5pnm.js:2912-2946 placement
var $e = (e) => freeze.includes(getErrnoCode(e) ?? "");
//@ chunk-9cjx5pnm.js:2946-3064 placement
var rejectIfGitignoreExists = (e) =>
  lstat_2(e).then(
    () => Promise.reject(Error("A .gitignore here cannot be read")),
    (r) => ($e(r) ? "" : Promise.reject(r)),
  );
//@ chunk-9cjx5pnm.js:3064-3288 placement
async function readGitignoreSafely(e) {
  let r = join_5(e, We),
    s = (await ZB(r)) ?? (await rejectIfGitignoreExists(r)),
    n = firstNegatedGitignoreLine(s);
  if (n !== void 0) throw Error("A .gitignore line cannot be read", { cause: `${r} ${n}` });
  let a = wAt(s);
  return a.length > 0 ? [{ base: e, rules: Ve.default().add(a) }] : [];
}
//@ chunk-9cjx5pnm.js:3288-3452 placement
async function assertGitignoreNotHardlinked(e, r) {
  let s = join_4(e, We);
  if (r.some((a) => a.path === s && a.kind === "file" && a.links > 1))
    throw Error("A .gitignore here cannot be read", { cause: s });
  return readGitignoreSafely(e);
}
/**
 * 计算条目相对搜索根的路径（归属疑似错误，属插件/文件打包扫描）。
 */
//@ chunk-9cjx5pnm.js:3485-3515 placement
var relativePosixPathOf = (e, r) => _P(relative(e, r.path));
/**
 * 例外文件 .mcp.json（不当作机密文件）。
 */
//@ chunk-9cjx5pnm.js:3581-3618 placement
var freeze_2 = Object.freeze([".mcp.json"]);
//@ chunk-9cjx5pnm.js:3618-3700 placement
var isSecretPath = (e, r) =>
  !freeze_2.includes(r) && (_H(`/${r}`) || _H(`/${basename_2(e)}/${r}`) || B$e(`/${r}`));
//@ chunk-9cjx5pnm.js:3743-3805 placement
var freeze_3 = Object.freeze({ file: "", folder: "/", link: "", special: "" });
//@ chunk-9cjx5pnm.js:3805-3932 placement
var isIgnoredByRules = (e, r) =>
  e
    .toReversed()
    .map(({ base: base, rules: rules }) => rules.test(relativePosixPathOf(base, r) + freeze_3[r.kind]))
    .find((s) => s.ignored || s.unignored)?.ignored ?? !1;
//@ chunk-9cjx5pnm.js:3932-4100 placement
function isIgnoredEntry(e, r, s) {
  let n = join_6(e, PLUGIN_MANIFEST_PATH),
    a = dirname_2(n);
  return (
    !(s.path === n || s.path === a) &&
    (isIgnoredByRules(r.scope, s) ||
      (r.path === a &&
        isIgnoredByRules(
          r.scope.filter((m) => m.base !== a),
          { ...s, path: a, kind: "folder" },
        )))
  );
}
//@ chunk-9cjx5pnm.js:4133-4181 placement = VCS_DIRECTORIES_TO_EXCLUDE (0.937)
var VCS_DIRECTORIES_TO_EXCLUDE = [...xXn, ".hg", ".svn", ".jj", ".sl", ".bzr"];
//@ chunk-9cjx5pnm.js:4181-4321 placement
function isNeverBundledPath(e) {
  let r = [basename_3(e.path), ...Eai(basename_3(e.path))];
  return (
    (e.kind === "folder" && r.some((s) => s.endsWith(".git"))) ||
    r.some((s) => VCS_DIRECTORIES_TO_EXCLUDE.includes(s))
  );
}
//@ chunk-9cjx5pnm.js:4321-4563 placement
var getExclusionReason = (e, r, s) =>
  wAo([
    s.kind === "link" && "link",
    s.kind === "special" && "special",
    s.kind === "file" && s.links > 1 && "hard-link",
    basename(s.path).includes("\\") && "backslash",
    isNeverBundledPath(s) && "never",
    ZWt(e, s.path) && "generated",
    isSecretPath(e, relativePosixPathOf(e, s)) && "secret",
    isIgnoredEntry(e, r, s) && "ignored",
  ]);
/**
 * 给出某条目被排除的原因（link/special/hard-link/backslash/never/generated/secret/ignored），用于打包/上传扫描；归属疑似错误。
 */
//@ chunk-9cjx5pnm.js:4563-4641 placement
function exclusionEntriesFor(e, r, s) {
  let n = getExclusionReason(e, r, s);
  return n === void 0 ? [] : [{ path: relativePosixPathOf(e, s), why: n }];
}
//@ chunk-9cjx5pnm.js:4641-4654 placement
var FILE_MODE_RW = 33188;
//@ chunk-9cjx5pnm.js:4654-4664 placement
var $s = 73;
//@ chunk-9cjx5pnm.js:4664-4678 placement
var FILE_MODE_RWX = 33261;
//@ chunk-9cjx5pnm.js:4678-4722 placement
function Gs(e) {
  return (e.mode & $s) !== 0 ? FILE_MODE_RWX : FILE_MODE_RW;
}
//@ chunk-9cjx5pnm.js:4722-4777 placement
var listingEntry = (e, r) => ({ path: relativePosixPathOf(e, r), bytes: r.bytes, mode: Gs(r) });

export {
  exclusionEntriesFor,
  relativePosixPathOf,
  listingEntry,
  MAX_COPY_DEPTH,
  statEntry,
  assertGitignoreNotHardlinked,
  $e,
  readGitignoreSafely,
  byPath,
  processEndingError,
  removeValidationCopy,
  errorDetails,
  De,
  unreadableOnError,
  FILE_MODE_RW,
  draftManifestOf,
  freeze_2,
  FILE_MODE_RWX,
};
