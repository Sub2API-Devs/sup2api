/**
 * utils/git/gitDirResolution.ts
 *
 * 2.1.316 新增：解析目录的 gitDir、workTree、commonDir（.git 文件、worktree、bare）；目录是否为裸仓库等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dgqyqzy0.js (25)
 * attribution: placement 25
 */
import { join, resolve, dirname, basename } from "path";
import { devNull } from "os";
import { lstatSync, statSync, realpathSync } from "fs";
import { parseGitConfig, Uhs, eOi, hasNulByte } from "./gitConfigParser.js";
import { isENOENT } from "../errors.js";
import {
  getCommonDir_2,
  readLinkTextSafe,
  readBoundedSync,
  GIT_POINTER_MAX_BYTES,
  rawPointerPathIsUnsafe,
  readPositionIsUnsafe,
  GIT_CONFIG_MAX_BYTES,
  pointerFileIsSuspect,
} from "./gitFilesystem.js";
import { isOnForeignMount } from "../networkPaths.js";
import { e9 } from "../permissions/protectedDirs.js";
import { Rke } from "../fsJunctions.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { buildSafeGitEnvForRepo, Lut } from "./gitSafeEnv.js";
import { getPlatform } from "../platform.js";
import { Cp } from "../pathIdentity.js";
import { uniq } from "../collections.js";

//@ chunk-dgqyqzy0.js:686-697 placement
var b = 4096;
/**
 * 解析 git 配置中的 core.worktree/bare 等关键项。
 */
//@ chunk-dgqyqzy0.js:697-1050 placement
function parseGitConfigFlags(n) {
  let t,
    r =
      n.includes("\x00") ||
      n
        .split(/\r?\n/)
        .map((e) => e.replace(/^[ \t]+/, ""))
        .some((e) => !/^[#;]/.test(e) && /[\r\t]|(?:^|[^\\])(?:\\\\)*\\$/.test(e));
  return (
    parseGitConfig(
      n,
      {
        entry: (e, i, o) => {
          if (e?.name === "core" && !e.quoted && i === "worktree")
            ((t = o), (r ||= o === void 0 || o === "" || o.length > b || /^(?:~|%\(|:\()/.test(o)));
        },
        malformed: () => {
          r = !0;
        },
      },
      { maxLines: 1 / 0 },
    ),
    r ? null : t
  );
}
/**
 * 非 git 仓库占位与布尔值集合。
 */
//@ chunk-dgqyqzy0.js:1050-1116 placement
var NOT_A_GIT_REPO_PATH = join(devNull, "not-a-git-repository"),
  GIT_TRUE_VALUES = new Set(["true", "yes", "on"]);
//@ chunk-dgqyqzy0.js:1116-1234 placement
function isGitConfigTrue(n) {
  let lower = n.trim().toLowerCase(),
    match = /^[+-]?(\d+)[kmg]?$/.exec(lower);
  return GIT_TRUE_VALUES.has(lower) || (match !== null && Number(match[1]) !== 0);
}
//@ chunk-dgqyqzy0.js:1234-1285 placement
var WORKTREE_CONFIG_KEY_PATTERN = /(^|\])[^\S\n\r\u2028\u2029]*worktree\s*=/im;
/**
 * 解析目录的仓库布局 {gitDir, workTree, commonDir}：.git 目录、.git 文件（linked worktree，需通过回指校验）或 bare 仓库；不是仓库返回 null。
 */
//@ chunk-dgqyqzy0.js:1285-1804 placement
function resolveGitDirs(n) {
  let t = join(n, ".git"),
    r;
  try {
    r = lstatSync(t);
  } catch (error) {
    let u = isENOENT(error) && isBareRepository(n) ? realpathOrNull(n) : null;
    return u === null ? null : { gitDir: u, workTree: null, commonDir: u };
  }
  let e = realpathOrNull(n);
  if (e === null) return null;
  if (r.isDirectory()) {
    let s = join(e, ".git");
    return getCommonDir_2(s) ? { gitDir: s, workTree: e, commonDir: s } : null;
  }
  let i;
  if (r.isSymbolicLink()) i = readLinkTextSafe(t);
  else if (r.isFile()) {
    let s = readBoundedSync(t, GIT_POINTER_MAX_BYTES)?.trim();
    i = s !== void 0 && s.startsWith("gitdir:") ? s.slice(7).trim() : null;
  } else return null;
  if (i === null || i === "" || isOnForeignMount(i, n) || rawPointerPathIsUnsafe(i, n)) return null;
  let o = e9(resolve(n, i));
  return o === null ? null : resolveLinkedWorktreeLayout(o, e);
}
//@ chunk-dgqyqzy0.js:1804-2100 placement = resolveGitDir (0.775)
function resolveGitDir(startPath) {
  let t = join(startPath, ".git"),
    r;
  try {
    r = lstatSync(t);
  } catch {
    return !1;
  }
  let e = null;
  if (r.isSymbolicLink()) e = readLinkTextSafe(t);
  else if (r.isFile()) {
    let o = readBoundedSync(t, GIT_POINTER_MAX_BYTES)?.trim();
    e = o !== void 0 && o.startsWith("gitdir:") ? o.slice(7).trim() : null;
  }
  if (e === null || e === "" || isOnForeignMount(e, startPath) || rawPointerPathIsUnsafe(e, startPath))
    return !1;
  let cwd = e9(resolve(startPath, e));
  return cwd !== null && isBareRepository(cwd);
}
//@ chunk-dgqyqzy0.js:2100-2144 placement
var MISSING_PATH_ERRNOS = new Set(["ENOENT", "ENOTDIR", "ELOOP"]);
//@ chunk-dgqyqzy0.js:2144-2245 placement
function realpathOrNull(n) {
  let { real: real, code: code } = Rke(n);
  if (real !== void 0) return real;
  return code !== void 0 && MISSING_PATH_ERRNOS.has(code) ? null : resolve(n);
}
//@ chunk-dgqyqzy0.js:2245-2467 placement
function resolveLinkedWorktreeLayout(n, t) {
  let r = readWorktreeGitdirFile(n, t);
  if (r !== null) {
    let i = dirname(dirname(n));
    return basename(dirname(n)) === "worktrees" && getFileIdentity(r, t) && isCommondirConsistent(n, i, t)
      ? { gitDir: n, workTree: t, commonDir: i }
      : null;
  }
  let e = readCoreWorktree(n);
  return e !== null && getFileIdentity(e, t) && getCommonDir_2(n)
    ? { gitDir: n, workTree: t, commonDir: n }
    : null;
}
/**
 * 解析 git 目录，失败时返回占位。
 */
//@ chunk-dgqyqzy0.js:2467-2532 placement
function resolveGitDirsOrPlaceholder(n) {
  return resolveGitDirs(n) ?? { gitDir: NOT_A_GIT_REPO_PATH, workTree: n, commonDir: NOT_A_GIT_REPO_PATH };
}
/**
 * 为在某目录运行的 git 子进程构造环境：固定 GIT_DIR/GIT_WORK_TREE/GIT_COMMON_DIR（无仓库时指向 /dev/null/not-a-git-repository），防止继承的 GIT_* 变量或恶意布局改变 git 行为。
 */
//@ chunk-dgqyqzy0.js:2532-2612 placement
function buildGitEnvForRepo(n, t, { userLocale: r } = {}) {
  return getRemoteHostSessionCount(t, { repository: resolveGitDirsOrPlaceholder(n), userLocale: r });
}
//@ chunk-dgqyqzy0.js:2612-2663 placement
function buildGitEnvVarsForRepo(n, t) {
  return buildSafeGitEnvForRepo(t, { repository: resolveGitDirsOrPlaceholder(n) });
}
/**
 * 清除继承的 GIT_* 环境变量并写入解析出的 GIT_DIR/GIT_WORK_TREE/GIT_COMMON_DIR。
 */
//@ chunk-dgqyqzy0.js:2663-2914 placement
function withPinnedGitDirEnv(n, t) {
  let { gitDir: gitDir, workTree: workTree, commonDir: commonDir } = resolveGitDirsOrPlaceholder(t),
    o = new Set(Lut),
    s = {};
  for (let u of Object.keys(n)) if (o.has(u.toUpperCase())) s[u] = void 0;
  return {
    ...n,
    ...s,
    GIT_DIR: gitDir,
    ...(workTree !== null ? { GIT_WORK_TREE: workTree } : { GIT_IMPLICIT_WORK_TREE: "0" }),
    GIT_COMMON_DIR: commonDir,
  };
}
/**
 * 目录是否为裸仓库。
 */
//@ chunk-dgqyqzy0.js:2914-3269 placement
function isBareRepository(n) {
  try {
    if (
      !lstatSync(join(n, "HEAD")).isFile() ||
      !lstatSync(join(n, "refs")).isDirectory() ||
      !lstatErrnoOrFalse(n, "commondir")
    )
      return !1;
  } catch {
    return !1;
  }
  let t = getGitConfigFilesToRead(n);
  if (
    t === null ||
    t.read.some((e) => WORKTREE_CONFIG_KEY_PATTERN.test(e)) ||
    (t.unread !== void 0 &&
      (WORKTREE_CONFIG_KEY_PATTERN.test(t.unread) ||
        Uhs(t.unread, "core", null, "bare").some((e) => !isGitConfigTrue(e))))
  )
    return !1;
  let at = t.read.flatMap((e) => Uhs(e, "core", null, "bare")).at(-1);
  return at !== void 0 && isGitConfigTrue(at);
}
/**
 * 确定要读的 git config 文件：config，若 extensions.worktreeConfig 为真再加 config.worktree。
 */
//@ chunk-dgqyqzy0.js:3269-3567 placement
function getGitConfigFilesToRead(n) {
  let t = readGitDirFileSafe(n, "config");
  if (t === void 0) return null;
  if (lstatErrnoOrFalse(n, "config.worktree")) return { read: [t], unread: void 0 };
  let r = readGitDirFileSafe(n, "config.worktree");
  if (r === void 0) return null;
  let at = eOi(t, "extensions", null, "worktreeConfig").at(-1);
  return at !== void 0 && isGitConfigTrue(at) ? { read: [t, r], unread: void 0 } : { read: [t], unread: r };
}
//@ chunk-dgqyqzy0.js:3567-3659 placement
function readGitDirFileSafe(n, t) {
  let r = join(n, t),
    e = readPositionIsUnsafe(r, n) ? void 0 : readBoundedSync(r, GIT_CONFIG_MAX_BYTES);
  return e !== void 0 && hasNulByte(e) ? void 0 : e;
}
//@ chunk-dgqyqzy0.js:3659-3681 placement
var GIT_CONFIG_INCLUDE_PATTERN = /\[\s*include/i;
//@ chunk-dgqyqzy0.js:3681-3870 placement
function readGitConfigTexts(n) {
  let t = [];
  for (let r of ["config", "config.worktree"]) {
    let e = readGitDirFileSafe(n, r);
    if (e === void 0) {
      if (r === "config.worktree" && lstatErrnoOrFalse(n, r)) continue;
      return null;
    }
    t.push(e);
  }
  return t.some((r) => GIT_CONFIG_INCLUDE_PATTERN.test(r));
}
//@ chunk-dgqyqzy0.js:3908-3970 placement
function lstatErrnoOrFalse(n, t) {
  try {
    return (lstatSync(join(n, t)), !1);
  } catch (error) {
    return isENOENT(error);
  }
}
//@ chunk-dgqyqzy0.js:3970-4126 placement
function isCommondirConsistent(n, t, r) {
  let e = join(n, "commondir");
  if (pointerFileIsSuspect(e, n)) return !1;
  let i = readBoundedSync(e, GIT_POINTER_MAX_BYTES)?.trim();
  if (i === void 0 || i === "" || isOnForeignMount(i, r) || rawPointerPathIsUnsafe(i, n, r)) return !1;
  return getFileIdentity(resolve(n, i), t);
}
//@ chunk-dgqyqzy0.js:4126-4334 placement = getFileIdentity (0.817)
function getFileIdentity(n, t) {
  try {
    let r = statSync(n, { bigint: !0 }),
      e = statSync(t, { bigint: !0 });
    if (!r.isDirectory() || r.dev !== e.dev) return !1;
    if (r.ino !== 0n && e.ino !== 0n) return r.ino === e.ino;
    return (
      normalizePathForPlatform(realpathSync.native(n)) === normalizePathForPlatform(realpathSync.native(t))
    );
  } catch {
    return !1;
  }
}
//@ chunk-dgqyqzy0.js:4334-4447 placement = setCwdState (0.757)
function normalizePathForPlatform(cwd) {
  switch (getPlatform()) {
    case "macos":
      return Cp(cwd.normalize("NFC"));
    case "windows":
      return Cp(cwd);
    default:
      return cwd;
  }
}
//@ chunk-dgqyqzy0.js:4447-4621 placement
function readWorktreeGitdirFile(n, t) {
  let r = join(n, "gitdir");
  if (pointerFileIsSuspect(r, n)) return null;
  let e = readBoundedSync(r, GIT_POINTER_MAX_BYTES)?.trim();
  if (e === void 0 || isOnForeignMount(e, t) || rawPointerPathIsUnsafe(e, n, t)) return null;
  let i = resolve(n, e);
  return basename(i) === ".git" ? dirname(i) : null;
}
//@ chunk-dgqyqzy0.js:4621-4876 placement
function readCoreWorktree(n) {
  let t = getGitConfigFilesToRead(n),
    r =
      t === null || (t.unread !== void 0 && WORKTREE_CONFIG_KEY_PATTERN.test(t.unread))
        ? [null]
        : t.read.map((o) => parseGitConfigFlags(o)),
    [e, ...i] = uniq(r.filter((o) => o !== void 0)).map((o) =>
      o === null || isOnForeignMount(o, n) || rawPointerPathIsUnsafe(o, n) ? null : resolve(n, o),
    );
  return typeof e === "string" && i.every((o) => o !== null && getFileIdentity(e, o)) ? e : null;
}

export {
  withPinnedGitDirEnv,
  buildGitEnvForRepo,
  resolveGitDirs,
  readGitConfigTexts,
  buildGitEnvVarsForRepo,
  resolveGitDirsOrPlaceholder,
  NOT_A_GIT_REPO_PATH,
  resolveGitDir,
  lstatErrnoOrFalse,
};
