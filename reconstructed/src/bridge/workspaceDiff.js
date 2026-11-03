/**
 * bridge/workspaceDiff.ts
 *
 * 2.1.316 新增。为 Remote Control 生成工作区 diff：检查并复制 .git 到临时目录，在副本上按分支点计算 diff。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gfa3ceg6.js (52), chunk-vbr14wv4.js (1)
 * attribution: placement 53
 */
import { join, join as join_2, isAbsolute, dirname, basename } from "path";
import { mkdtemp, mkdir, rm, opendir, lstat, open, open as open_2, writeFile, realpath } from "fs/promises";
import { tmpdir } from "os";
import { constants, constants as constants_2 } from "fs";
import { createHash } from "crypto";
import {
  standardRepoLayout,
  GIT_DIFF_TIMEOUT_MS,
  isSafeRelativeDiffPath,
  UNSAFE_PATH_CHAR_PATTERN,
  unquoteGitPathBytes,
  $hn,
  fetchGitDiff,
  getRepoTopLevel,
  diffBaseRef,
  OVr,
} from "../utils/gitDiff.js";
import { ere } from "../utils/remoteEnvironment.js";
import { normalizePathForCompare } from "../utils/file.js";
import { errorMessage, isENOENT } from "../utils/errors.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "../utils/execFileNoThrow.js";
import { gitExe } from "../utils/git.js";
import { yti, parseGitVersion } from "../remote/tools/servedOwnerSettings.js";
import { env } from "../utils/env.js";
import { logForDebugging } from "../utils/debug.js";
import { HostScoped } from "../utils/hostScoped.js";
import {
  Wmo,
  CHANGES_PANE_PREFIX,
  jmo,
  zmo,
  Kmo,
  DCs,
} from "../services/selfHostedRunner/changesPaneRefusals.js";
import { firstLineOf } from "../utils/stringUtils.js";
import {
  getGitSafetyConfigPairs,
  buildGitConfigEnv,
  CLAUDE_CODE_FOUND_REPOSITORY_GIT,
  GitStartFolderError,
} from "../utils/gitSafeExec.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { GIT_FILES_REF_BACKEND_ENV } from "../utils/git/gitLanes.js";
import { subprocessEnv } from "../utils/subprocessEnv.js";
import { ISOLATED_GIT_CONFIG_ENV } from "../utils/git/gitIndexReader.js";
import { getPlatform } from "../utils/platform.js";
import { REMOTE_READ_OPEN_FLAGS, isCanonicalPathContained } from "../services/remoteTools/remoteFileRead.js";
import { stripTrailingDotsSpaces } from "../utils/ignorePatterns.js";
import { freeze } from "../utils/git/gitSafeEnv.js";
import { bindCanonicalPathToHandle, readHandleBounded } from "../utils/fsSafety/boundOpen.js";
import { isPathAllowed } from "../utils/permissions/pathValidation.js";
import { matchingRuleForInput } from "../utils/permissions/filesystem.js";
import { cH, NF } from "../utils/permissions/pathVetting.js";
import { P3 } from "../../vendor/diff/libesm/patch/create.js";
import { getWorkspaceDiffRoot } from "../utils/workspaceDiff.js";

/**
 * .git 复制的大小上限与条目处置表
 */
//@ chunk-gfa3ceg6.js:1452-2776 placement
var GIT_DIR_COPY_LIMITS = 65536,
  fe = 1e6,
  Ue = 33554432,
  We = 65536,
  ze = 65536,
  je = 1e6,
  Ye = 67108864,
  Ke = 256,
  Xe = 20000,
  Je = 4096,
  qe = [
    ["core.commitGraph", "false"],
    ["core.multiPackIndex", "false"],
  ],
  he = { disposition: "skip" },
  Ee = new Map([
    ["config", { disposition: "copy", kind: "file", maxBytes: fe }],
    ["config.worktree", { disposition: "copy", kind: "file", maxBytes: fe }],
    ["HEAD", { disposition: "copy", kind: "file", maxBytes: GIT_DIR_COPY_LIMITS }],
    ["packed-refs", { disposition: "copy", kind: "file", maxBytes: Ue }],
    ["shallow", { disposition: "copy", kind: "file", maxBytes: ze }],
    ["refs", { disposition: "copy", kind: "dir", maxFileBytes: We, entries: "all" }],
    [
      "info",
      {
        disposition: "copy",
        kind: "dir",
        maxFileBytes: je,
        entries: new Set(["exclude", "attributes", "sparse-checkout", "grafts"]),
      },
    ],
    ["objects", { disposition: "in-place", kind: "dir" }],
    ["index", { disposition: "in-place", kind: "file" }],
    ["commondir", { disposition: "refuse" }],
    ["gitdir", { disposition: "refuse" }],
    ["reftable", { disposition: "refuse" }],
    ...[
      "hooks",
      "logs",
      "branches",
      "remotes",
      "FETCH_HEAD",
      "ORIG_HEAD",
      "MERGE_HEAD",
      "AUTO_MERGE",
      "REBASE_HEAD",
      "CHERRY_PICK_HEAD",
      "REVERT_HEAD",
      "MERGE_AUTOSTASH",
      "COMMIT_EDITMSG",
      "MERGE_MSG",
      "MERGE_MODE",
      "MERGE_RR",
      "SQUASH_MSG",
      "TAG_EDITMSG",
      "rebase-merge",
      "rebase-apply",
      "sequencer",
      "rr-cache",
      "worktrees",
      "modules",
      "lfs",
      "gc.log",
      "gc.pid",
      "description",
      "gitk.cache",
    ].map((e) => [e, he]),
  ]),
  Ve = /^(?:BISECT_[A-Z_]+|fsmonitor--daemon.*|.+\.lock)$/;
//@ chunk-gfa3ceg6.js:2776-2832 placement
function Qe(e) {
  return Ee.get(e) ?? (Ve.test(e) ? he : void 0);
}
/**
 * （旧版名配错，切分错误）git 配置键白名单/敏感键模式与子模块更新模式，用于判断哪些 git config 可安全传递。
 */
//@ chunk-gfa3ceg6.js:2832-3642 placement = GIT_REBASE_RE (0.528)
var ACCEPTED_GIT_CONFIG_PATTERNS = [
    /^(?:commit|tag|pull|push|rebase|init|advice|color|column|help|status|fetch|user|branch)\..+$/,
    /^core\.(?:repositoryformatversion|filemode|bare|logallrefupdates|ignorecase|precomposeunicode|symlinks|autocrlf|eol|safecrlf|longpaths|sparsecheckout|sparsecheckoutcone|quotepath|abbrev|checkstat|trustctime|untrackedcache)$/,
    /^remote\..+\.(?:url|pushurl|fetch|promisor|partialclonefilter|tagopt|prune|mirror|gh-resolved)$/,
    /^submodule\.active$/,
    /^submodule\..+\.(?:active|branch|url)$/,
    /^http\.(?:.+\.)?extraheader$/,
    /^maintenance\..+$/,
    /^(?:extensions\.(?:objectformat|partialclone|worktreeconfig)|lfs\.repositoryformatversion)$/,
  ],
  tt = [
    /^http\.(?:.+\.)?(?:sslcainfo|sslcapath|sslverify|proxy)$/,
    /^lfs\..+\.(?:access|locksverify)$/,
    /^merge\.conflictstyle$/,
  ],
  nt = new Set(["checkout", "rebase", "merge", "none"]);
/**
 * 检查并复制仓库 .git，返回可用于 diff 的副本
 */
//@ chunk-gfa3ceg6.js:3642-4314 placement
async function prepareRepositoryCopy(e, n, o) {
  let s = standardRepoLayout(e);
  if (s === null || s.workTree === null) return null;
  if (ere() && normalizePathForCompare(s.workTree) !== normalizePathForCompare(e))
    return refuseDiscoveredRepository("a folder that is no longer the one that was checked", n);
  let { gitDir: gitDir, workTree: workTree } = s,
    u;
  try {
    let c = await vetGitDirEntries(gitDir);
    if (typeof c === "string") return refuseDiscoveredRepository(c, n);
    let f = await vetGitObjectsDir(join_2(gitDir, "objects"));
    if (f !== void 0) return refuseDiscoveredRepository(f, n);
    let l = await getDiffCopyRoot();
    if (l === null) return refuseDiscoveredRepository(_e, n);
    u = await mkdtemp(join_2(l, "ccdiff-"));
    let g = u,
      m = (await copyGitDir(gitDir, g, c)) ?? (await readUnacceptedGitConfig(g, c.has("config.worktree")));
    if (m !== void 0) return (await removeRecursiveQuietly(g), refuseDiscoveredRepository(m, n));
    let S = buildCopiedGitEnv(g, gitDir, workTree);
    if (!(await isGitVersionSupported(e, S, o)))
      return (await removeRecursiveQuietly(g), refuseDiscoveredRepository(Se, n));
    return { spawn: S, dispose: () => removeRecursiveQuietly(g) };
  } catch (error) {
    if (u !== void 0) await removeRecursiveQuietly(u);
    return refuseDiscoveredRepository(`unexpected error (${errorMessage(error)})`, n);
  }
}
//@ chunk-gfa3ceg6.js:4314-4366 placement
var Se = "git older than 2.32, or its version unread";
/**
 * git 版本是否 >= 2.32
 */
//@ chunk-gfa3ceg6.js:4366-4576 placement
async function isGitVersionSupported(e, n, o) {
  let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(gitExe(), ["version"], {
    ...n,
    cwd: e,
    timeout: GIT_DIFF_TIMEOUT_MS,
    abortSignal: o,
    preserveOutputOnError: !1,
    stdin: "ignore",
  }).catch(() => ({ stdout: "", code: 1 }));
  return code === 0 && yti(parseGitVersion(stdout));
}
//@ chunk-gfa3ceg6.js:4576-4608 placement
var _e = "no folder for the copy";
/**
 * 取 diff 复制用临时根目录（CLAUDE_CODE_DIFF_COPY_ROOT）
 */
//@ chunk-gfa3ceg6.js:4608-4763 placement
async function getDiffCopyRoot() {
  if (!ere()) return tmpdir();
  let CLAUDE_CODE_DIFF_COPY_ROOT = env.CLAUDE_CODE_DIFF_COPY_ROOT;
  if (CLAUDE_CODE_DIFF_COPY_ROOT === void 0 || !isAbsolute(CLAUDE_CODE_DIFF_COPY_ROOT)) return null;
  return (await mkdir(CLAUDE_CODE_DIFF_COPY_ROOT, { recursive: !0, mode: 448 }), CLAUDE_CODE_DIFF_COPY_ROOT);
}
//@ chunk-gfa3ceg6.js:4763-4839 placement = convertDirectoryToZipInPlace (1)
async function removeRecursiveQuietly(e) {
  await rm(e, { recursive: !0, force: !0 }).catch(() => {
    return;
  });
}
/**
 * 记录拒绝发现的仓库并上报进度，返回 null。
 */
//@ chunk-gfa3ceg6.js:4839-4969 placement
function refuseDiscoveredRepository(e, n) {
  if (
    (logForDebugging(`workspace diff: discovered repository refused (${e})`, { level: "warn" }), n !== void 0)
  )
    reportDiffProgress(e, st.of(n));
  return null;
}
//@ chunk-gfa3ceg6.js:4969-5061 placement
var st = new HostScoped(() => new Set()),
  at = 8,
  le = "",
  ct = /^[a-z0-9-]{1,40}(?:\.<\.\.\.>)?\.[a-z0-9-]{1,40}$/;
/**
 * 调试模式下把进度写 stderr
 */
//@ chunk-gfa3ceg6.js:5061-5243 placement
function reportDiffProgress(e, n) {
  if (!ere()) return;
  let o = ft(e);
  if (n.has(o)) return;
  if (n.size >= at) {
    if (!n.has(le))
      (n.add(le),
        process.stderr.write(`${Wmo}
`));
    return;
  }
  (n.add(o),
    process.stderr.write(`${o}
`));
}
//@ chunk-gfa3ceg6.js:5243-5289 placement
function ft(e) {
  return `${CHANGES_PANE_PREFIX} ${describeGitDirRefusal(e)} ${jmo}`;
}
/**
 * 把 .git 检查拒绝原因转成用户可读文字
 */
//@ chunk-gfa3ceg6.js:5289-6491 placement
function describeGitDirRefusal(e) {
  let match = /^(config entry|config value of|multi-line value for) (.+)$/.exec(e);
  if (match !== null) {
    let s = match[2] ?? "";
    if (!ct.test(s))
      return "Its own git settings (.git/config or .git/config.worktree) have a setting whose name is not shown: it is too long, or not plain letters, digits and dashes.";
    let r = s.includes("<...>")
      ? 'shown in lower case, "<...>" for the middle of its name'
      : "shown in lower case";
    if (match[1] === "config entry")
      return `Its own git settings (.git/config or .git/config.worktree) have the setting "${s}" (${r}), which is not one Claude Code accepts there.`;
    return match[1] === "config value of"
      ? `Its own git settings (.git/config or .git/config.worktree) give the setting "${s}" (${r}) a value that is not one Claude Code accepts there.`
      : `Its own git settings (.git/config or .git/config.worktree) give the setting "${s}" (${r}) a value that runs over several lines.`;
  }
  if (e === _e) return zmo;
  if (e === Se) return Kmo;
  let o = firstLineOf(e, " (");
  if (o === "unexpected error")
    return "An unexpected error stopped the check of its .git folder; the session's debug log has the details.";
  return DCs(o)
    ? `The check of its .git folder stopped at: ${o}.`
    : "The check of its .git folder stopped for a reason that is not shown.";
}
//@ chunk-gfa3ceg6.js:6491-6528 placement
function ye() {
  return [...getGitSafetyConfigPairs(), ...qe];
}
/**
 * 为复制的 .git 构造 git 环境变量
 */
//@ chunk-gfa3ceg6.js:6528-6775 placement
function buildCopiedGitEnv(e, n, o) {
  return {
    env: {
      ...getRemoteHostSessionCount(GIT_FILES_REF_BACKEND_ENV, {
        base: subprocessEnv(),
        repository: { gitDir: e, workTree: o, commonDir: e },
      }),
      ...ISOLATED_GIT_CONFIG_ENV,
      ...buildGitConfigEnv(void 0, ye()),
      GIT_OBJECT_DIRECTORY: join_2(n, "objects"),
      GIT_INDEX_FILE: join_2(n, "index"),
      [CLAUDE_CODE_FOUND_REPOSITORY_GIT]: "1",
    },
    extendEnv: !1,
    gitStartsIn: GitStartFolderError.filesystemRoot(),
  };
}
/**
 * 检查 .git 顶层条目，返回拒绝原因
 */
//@ chunk-gfa3ceg6.js:6775-7343 placement
async function vetGitDirEntries(e) {
  let n = new Set(),
    o = 0;
  for await (let s of await opendir(e)) {
    if (++o > Ke) return "oversized .git";
    let r = Qe(s.name);
    if (r === void 0) return "unknown .git entry";
    switch (r.disposition) {
      case "skip":
        continue;
      case "refuse":
        return `.git/${s.name}`;
      case "copy":
      case "in-place":
        if (s.name === "index") {
          let a = await lstat(join_2(e, s.name));
          if (!a.isFile() || a.nlink > 1) return "symlinked, hardlinked or unexpected .git/index";
        } else if ((await classifyDirent(e, s)) !== r.kind) return `symlinked or unexpected .git/${s.name}`;
        n.add(s.name);
    }
  }
  if (!n.has("config") || !n.has("HEAD")) return "no .git/config or .git/HEAD";
  return n;
}
/**
 * 检查 .git/objects 无符号链接且无 alternates
 */
//@ chunk-gfa3ceg6.js:7343-7618 placement
async function vetGitObjectsDir(e) {
  let o = await listPlainSubdirs(e);
  if (o === null) return "symlinked or oversized .git/objects entry";
  for (let s of o)
    if ((await listPlainSubdirs(join_2(e, s))) === null) return "symlinked or oversized .git/objects entry";
  if (await isNonEmptyOrIrregularFile(join_2(e, "info", "alternates"))) return ".git/objects/info/alternates";
  return;
}
/**
 * 把 .git 需要的部分复制到临时目录
 */
//@ chunk-gfa3ceg6.js:7618-8052 placement
async function copyGitDir(e, n, o) {
  await mkdir(join_2(n, "refs"), { recursive: !0 });
  let s = { entries: 0, bytes: 0 };
  for (let [r, a] of Ee) {
    if (a.disposition !== "copy" || !o.has(r)) continue;
    let u = join_2(e, r),
      c = join_2(n, r);
    if (a.kind === "file") {
      if ((await copyBoundedGitFile(u, c, a.maxBytes, s)) !== "copied")
        return `unreadable, linked or oversized .git/${r}`;
      continue;
    }
    if ((await mkdir(c, { recursive: !0 }), !(await copyGitDirEntries(u, c, a.maxFileBytes, s, a.entries))))
      return `unreadable, linked or oversized entry under .git/${r}`;
  }
  return;
}
/**
 * 列出仓库 config 中不被接受的条目
 */
//@ chunk-gfa3ceg6.js:8052-8773 placement
async function readUnacceptedGitConfig(e, n) {
  let o = new Set(ye().map(([r]) => r.toLowerCase())),
    s = n ? ["config", "config.worktree"] : ["config"];
  for (let r of s) {
    let a = await execFileNoThrow(
      gitExe(),
      ["config", "--file", join_2(e, r), "--no-includes", "-z", "--list"],
      {
        cwd: GitStartFolderError.filesystemRoot().path,
        gitStartsIn: GitStartFolderError.filesystemRoot(),
        timeout: GIT_DIFF_TIMEOUT_MS,
        maxBuffer: 4000000,
        env: {
          ...getRemoteHostSessionCount(GIT_FILES_REF_BACKEND_ENV, { base: subprocessEnv() }),
          ...ISOLATED_GIT_CONFIG_ENV,
          GIT_DIR: join_2(e, "no-repository-here"),
          [CLAUDE_CODE_FOUND_REPOSITORY_GIT]: "1",
        },
        extendEnv: !1,
        stdin: "ignore",
      },
    );
    if (a.code !== 0) return `config ${r} unlistable`;
    for (let u of a.stdout.split("\x00")) {
      if (u === "") continue;
      let index = u.indexOf(`
`),
        f = index === -1 ? u : u.slice(0, index),
        l = index === -1 ? "" : u.slice(index + 1);
      if (
        l.includes(`
`)
      )
        return `multi-line value for ${de(f)}`;
      if (!isAcceptedGitConfigKey(f, l, o)) return `${wt(f) ? "config value of" : "config entry"} ${de(f)}`;
    }
  }
  return;
}
//@ chunk-gfa3ceg6.js:8773-8806 placement
var ke = /^submodule\..+\.update$/;
//@ chunk-gfa3ceg6.js:8806-8868 placement
function wt(e) {
  return e === "extensions.refstorage" || ke.test(e);
}
/**
 * git config 键是否在可接受列表
 */
//@ chunk-gfa3ceg6.js:8868-9041 placement
function isAcceptedGitConfigKey(e, n, o) {
  if (e === "extensions.refstorage") return n === "files";
  if (ke.test(e)) return nt.has(n);
  return (
    o.has(e) || ACCEPTED_GIT_CONFIG_PATTERNS.some((s) => s.test(e)) || (ere() && tt.some((s) => s.test(e)))
  );
}
//@ chunk-gfa3ceg6.js:9041-9124 placement
function de(e) {
  let parts = e.split(".");
  return parts.length <= 2 ? e : `${parts[0]}.<...>.${parts.at(-1)}`;
}
/**
 * 按白名单递归复制 .git 目录条目
 */
//@ chunk-gfa3ceg6.js:9124-9503 placement
async function copyGitDirEntries(e, n, o, s, r) {
  let a;
  try {
    a = await opendir(e);
  } catch (error) {
    return isENOENT(error);
  }
  for await (let u of a) {
    if (++s.entries > Xe) return !1;
    if (r !== "all" && !r.has(u.name)) continue;
    let c = join_2(e, u.name),
      f = join_2(n, u.name),
      l = await classifyDirent(e, u);
    if (l === "dir" && r === "all") {
      if ((await mkdir(f, { recursive: !0 }), !(await copyGitDirEntries(c, f, o, s, "all")))) return !1;
    } else if (l === "file") {
      if ((await copyBoundedGitFile(c, f, o, s)) !== "copied") return !1;
    } else return !1;
  }
  return !0;
}
/**
 * 目录项分类 dir/file/reject（符号链接拒绝）
 */
//@ chunk-gfa3ceg6.js:9503-9758 placement
async function classifyDirent(e, n) {
  if (n.isSymbolicLink()) return "reject";
  if (n.isDirectory()) return "dir";
  if (n.isFile()) return "file";
  try {
    let o = await lstat(join_2(e, n.name));
    return o.isSymbolicLink() ? "reject" : o.isDirectory() ? "dir" : o.isFile() ? "file" : "reject";
  } catch {
    return "reject";
  }
}
/**
 * 列出子目录，遇符号链接或超量返回 null
 */
//@ chunk-gfa3ceg6.js:9758-9972 placement
async function listPlainSubdirs(e) {
  let n;
  try {
    n = await opendir(e);
  } catch (error) {
    return isENOENT(error) ? [] : null;
  }
  let o = [],
    s = 0;
  for await (let r of n) {
    if (++s > Je) return null;
    let a = await classifyDirent(e, r);
    if (a === "reject") return null;
    if (a === "dir") o.push(r.name);
  }
  return o;
}
//@ chunk-gfa3ceg6.js:9972-10057 placement
function Te() {
  return getPlatform() === "windows"
    ? constants_2.O_RDONLY
    : constants_2.O_RDONLY | constants_2.O_NONBLOCK | constants_2.O_NOFOLLOW;
}
/**
 * 有界复制 .git 中的单个文件
 */
//@ chunk-gfa3ceg6.js:10057-10516 placement
async function copyBoundedGitFile(e, n, o, s) {
  let r;
  try {
    r = await open_2(e, Te());
  } catch (error) {
    return isENOENT(error) ? "absent" : "refused";
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile() || stats.nlink > 1 || stats.size > o) return "refused";
    if (((s.bytes += stats.size), s.bytes > Ye)) return "refused";
    let alloc = Buffer.alloc(stats.size),
      c = 0;
    while (c < stats.size) {
      let { bytesRead: bytesRead } = await r.read(alloc, c, stats.size - c, c);
      if (bytesRead === 0) break;
      c += bytesRead;
    }
    if (c !== stats.size) return "refused";
    return (await writeFile(n, alloc), "copied");
  } catch {
    return "refused";
  } finally {
    await r.close().catch(() => {
      return;
    });
  }
}
/**
 * 文件是否非空或非普通文件
 */
//@ chunk-gfa3ceg6.js:10516-10685 placement
async function isNonEmptyOrIrregularFile(e) {
  let n;
  try {
    n = await open_2(e, Te());
  } catch (error) {
    return !isENOENT(error);
  }
  try {
    let stats = await n.stat();
    return !stats.isFile() || stats.size > 0;
  } finally {
    await n.close().catch(() => {
      return;
    });
  }
}
/**
 * 向上找到存在的祖先再拼回路径
 */
//@ chunk-gfa3ceg6.js:10685-10882 placement
async function resolveMissingPath(e) {
  let n = dirname(e),
    o = [basename(e)];
  for (let s = 0; s < 64; s++) {
    try {
      let a = await realpath(n);
      return join(a, ...o);
    } catch (error) {
      if (error?.code !== "ENOENT") return;
    }
    let r = dirname(n);
    if (r === n) return;
    (o.unshift(basename(n)), (n = r));
  }
  return;
}
//@ chunk-gfa3ceg6.js:10882-11009 placement
var MAX_DIFF_BLOB_BYTES = 2000000,
  REGULAR_FILE_MODES = new Set(["100644", "100755", "100664"]),
  MAX_TOTAL_DIFF_BYTES = 1e7,
  MAX_DIFF_FILES = 1e4,
  DIFF_READ_TIMEOUTS = { perFileMs: 5000, totalMs: 1e4 },
  NOFOLLOW_READ_FLAGS = REMOTE_READ_OPEN_FLAGS | (constants.O_NOFOLLOW ?? 0);
/**
 * 路径是否为可安全传给 git 的普通相对路径
 */
//@ chunk-gfa3ceg6.js:11009-11266 placement
function isPlainRepoPath(e) {
  if (e.length === 0 || e.startsWith('"')) return !1;
  if (/[\u0000-\u001f\u007f\uFFFD]/.test(e)) return !1;
  if (
    e.startsWith("-") ||
    e.startsWith(":") ||
    e.includes(" => ") ||
    e.includes("\\") ||
    !isSafeRelativeDiffPath(e)
  )
    return !1;
  return e.split("/").every((n) => n !== "" && stripTrailingDotsSpaces(n) !== ".");
}
/**
 * 含不安全字符的路径：去掉 git 的引号转义后重新按 git 规则加引号。
 */
//@ chunk-gfa3ceg6.js:11266-11415 placement
function normalizeDiffPath(e) {
  if (!UNSAFE_PATH_CHAR_PATTERN.test(e)) return e;
  let n = e.length > 1 && e.startsWith('"') && e.endsWith('"') && !e.includes('" => ');
  return quoteGitPath(n ? unquoteGitPathBytes(e.slice(1, -1)) : e);
}
//@ chunk-gfa3ceg6.js:11415-11442 placement
var Ie = /^[0-9a-f]{40,64}$/;
//@ chunk-gfa3ceg6.js:11442-11497 placement
function O(e) {
  return ["--literal-pathspecs", ...freeze, ...e];
}
//@ chunk-gfa3ceg6.js:11497-11569 placement
function F(e, n) {
  return { ...n, cwd: e, timeout: GIT_DIFF_TIMEOUT_MS, preserveOutputOnError: !1 };
}
/**
 * git ls-tree 读取提交中的文件条目
 */
//@ chunk-gfa3ceg6.js:11569-11994 placement
async function readTreeEntries(e, n, o, s) {
  let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(
    gitExe(),
    O(["ls-tree", "-r", "-l", "-z", "--full-tree", n, "--", ...o]),
    { ...F(e, s), maxBuffer: 1e7 },
  );
  if (code !== 0) return null;
  let u = new Map();
  for (let c of stdout.split("\x00")) {
    if (!c) continue;
    let match = c.match(/^(\d{6}) (\S+) ([0-9a-f]{40,64}) +(\d+|-)\t(.+)$/s);
    if (!match) continue;
    let [, l = "", g, m = "", S, v] = match;
    if (v === void 0) continue;
    u.set(v, { mode: l, oid: m, size: g === "blob" && S !== "-" ? Number(S) : -1 });
  }
  return u;
}
/**
 * git ls-files --stage 读取索引条目
 */
//@ chunk-gfa3ceg6.js:11994-12372 placement
async function readIndexEntries(e, n, o) {
  let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(
    gitExe(),
    O(["ls-files", "--stage", "-v", "-z", "--", ...n]),
    { ...F(e, o), maxBuffer: 1e7 },
  );
  if (code !== 0) return null;
  let a = new Map();
  for (let u of stdout.split("\x00")) {
    let match = u.match(/^(\S) (\d{6}) ([0-9a-f]{40,64}) (\d)\t(.+)$/s);
    if (!match) continue;
    let [, f = "", , l = "", g, m = ""] = match;
    a.set(m, { entryIsNewSide: g === "0" && (f === "S" || /[a-z]/.test(f)), oid: l });
  }
  return a;
}
/**
 * 计算 git blob 哈希（sha1/sha256）
 */
//@ chunk-gfa3ceg6.js:12372-12535 placement
function gitBlobHash(e, n) {
  let o = typeof e === "string" ? Buffer.from(e, "utf-8") : e;
  return createHash(n.length === 64 ? "sha256" : "sha1")
    .update(`blob ${o.length}\x00`)
    .update(o)
    .digest("hex");
}
/**
 * 文本的 git blob 哈希与目标一致则返回；否则试把 CRLF 换成 LF 再比，仍不符返回 null。
 */
//@ chunk-gfa3ceg6.js:12535-12664 placement
function matchBlobAllowingCrlf(e, n) {
  if (gitBlobHash(e, n) === n) return e;
  if (
    !e.includes(`\r
`)
  )
    return null;
  let replaced = e.replaceAll(
    `\r
`,
    `
`,
  );
  return gitBlobHash(replaced, n) === n ? replaced : null;
}
/**
 * git cat-file 读取 blob 并核对哈希
 */
//@ chunk-gfa3ceg6.js:12664-12940 placement
async function readGitBlob(e, n, o) {
  if (!Ie.test(n)) return null;
  let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(gitExe(), O(["cat-file", "blob", n]), {
    ...F(e, o),
    maxBuffer: MAX_TOTAL_DIFF_BYTES + 65536,
    stripFinalNewline: !1,
    encoding: "latin1",
  });
  if (code !== 0) return null;
  let buffer = Buffer.from(stdout, "latin1");
  return gitBlobHash(buffer, n) === n ? buffer.toString("utf-8") : null;
}
/**
 * 有界读取工作区文件，区分缺失/受限/非普通文件
 */
//@ chunk-gfa3ceg6.js:12940-13757 placement
async function readWorkingFileForDiff(e, n, o) {
  let s;
  try {
    s = await open(e, NOFOLLOW_READ_FLAGS);
  } catch (error) {
    return error?.code === "ENOENT" ? { kind: "missing" } : { kind: "restricted" };
  }
  try {
    let stats = await s.stat({ bigint: !0 });
    if (!stats.isFile()) return { kind: "not-regular-file" };
    if (stats.nlink !== 1n || stats.dev === 0n || stats.ino === 0n) return { kind: "restricted" };
    let a;
    try {
      a = await realpath(e);
    } catch {
      return { kind: "restricted" };
    }
    let u = await bindCanonicalPathToHandle(s, stats, a);
    if (u === void 0) return { kind: "restricted" };
    if (((a = u), !isPathAllowed(a, o, "read").allowed || matchingRuleForInput(a, o, "read", "ask") !== null))
      return { kind: "restricted" };
    if (cH(a, o.trustedNetworkDirectories) !== void 0) return { kind: "restricted" };
    if (!(await isCanonicalPathContained(a, o))) return { kind: "restricted" };
    if (a !== n) return { kind: "off-path" };
    let c = await readHandleBounded(s, MAX_TOTAL_DIFF_BYTES, stats.size);
    if (c.overLimit) return { kind: "too-large" };
    return { kind: "ok", content: c.bytes.toString("utf-8") };
  } catch {
    return { kind: "restricted" };
  } finally {
    await s.close().catch(() => {});
  }
}
/**
 * 仓库根是否在受信网络目录内且通过校验
 */
//@ chunk-gfa3ceg6.js:13757-13930 placement
async function isTrustedRepositoryRoot(e, n) {
  let o;
  try {
    o = await realpath(e);
  } catch (error) {
    o = error?.code === "ENOENT" ? await resolveMissingPath(e) : void 0;
  }
  return (
    o !== void 0 && cH(o, n.trustedNetworkDirectories) === void 0 && (await isCanonicalPathContained(o, n))
  );
}
/**
 * git check-attr 读取各路径的 text/eol 属性
 */
//@ chunk-gfa3ceg6.js:13930-14437 placement
async function readGitAttributes(e, n, o) {
  let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(
    gitExe(),
    O(["check-attr", "-z", "-a", "--", ...n]),
    { ...F(e, o), maxBuffer: 1e7 },
  );
  if (code !== 0) return null;
  let a = new Map(n.map((c) => [c, { text: "unspecified", eol: "unspecified", converted: !1 }])),
    parts = stdout.split("\x00");
  for (let c = 0; c + 2 < parts.length; c += 3) {
    let f = parts[c],
      l = parts[c + 1],
      g = parts[c + 2];
    if (f === void 0 || l === void 0 || g === void 0) continue;
    let m = a.get(f);
    if (!m) continue;
    if (l === "text") m.text = g;
    else if (l === "eol") m.eol = g;
    else if (l === "filter" || l === "working-tree-encoding") m.converted = !0;
  }
  return a;
}
/**
 * 读取 core.autocrlf
 */
//@ chunk-gfa3ceg6.js:14437-14640 placement
async function readCoreAutocrlf(e, n) {
  let { stdout: stdout, exitCode: exitCode } = await execFileNoThrowWithCwd(
    gitExe(),
    O(["config", "--get", "core.autocrlf"]),
    F(e, n),
  );
  if (exitCode !== 0) return !1;
  let lower = stdout.trim().toLowerCase();
  return lower === "true" ? "true" : lower === "input" ? "input" : !1;
}
//@ chunk-gfa3ceg6.js:14640-14695 placement
function Bt(e) {
  return e.slice(0, 8000).includes("\x00");
}
/**
 * 按 gitattributes text/eol 与 autocrlf 判定是否换行转换
 */
//@ chunk-gfa3ceg6.js:14695-15079 placement
function shouldNormalizeEol(e, n, o, s) {
  if (!n || n.converted) return "unsupported";
  if (n.text === "unset") return e;
  let r;
  if (n.text === "set") r = !1;
  else if (n.text === "auto") r = !0;
  else if (n.text === "unspecified")
    if (o === "true" || o === "input") r = !0;
    else if (n.eol === "crlf" || n.eol === "lf") r = !0;
    else return e;
  else return e;
  if (
    !e.includes(`\r
`)
  )
    return e;
  if (
    r &&
    (Bt(e) ||
      s.includes(`\r
`))
  )
    return e;
  return e.replaceAll(
    `\r
`,
    `
`,
  );
}
/**
 * 生成结构化 diff hunk
 */
//@ chunk-gfa3ceg6.js:15079-15369 placement
function buildDiffHunks(e, n, o) {
  let s = P3("a", "b", e, n, "", "", { context: 3, maxEditLength: MAX_DIFF_FILES, timeout: o });
  if (!s) return null;
  return s.hunks
    .map((hunk) => ({
      oldStart: hunk.oldStart,
      oldLines: hunk.oldLines,
      newStart: hunk.newStart,
      newLines: hunk.newLines,
      lines: hunk.lines.filter((line) => !line.startsWith("\\")),
    }))
    .filter((r) => r.lines.length > 0);
}
/**
 * 按全局行数上限截断 diff hunk 的行。
 */
//@ chunk-gfa3ceg6.js:15369-15498 placement
function capHunkLines(e) {
  let n = $hn,
    o = [];
  for (let s of e) {
    if (n <= 0) break;
    let sliced = s.lines.slice(0, n);
    ((n -= sliced.length), o.push({ ...s, lines: sliced }));
  }
  return o;
}
/**
 * 为桥接生成工作区 diff：先检查并复制 .git，再在副本上计算相对分支点的 diff。
 */
//@ chunk-gfa3ceg6.js:15498-15745 placement
async function buildWorkspaceDiffResponse(e, n, o = DIFF_READ_TIMEOUTS) {
  let s = await getWorkspaceDiffRoot();
  if (s === null) return { diff: null };
  let r = s.nested ? s.root : null,
    a = r === null ? null : await prepareRepositoryCopy(r, e);
  if (r !== null && a === null) return { diff: null };
  try {
    return await computeWorkspaceDiff(e, n, o, s.root, r, a?.spawn);
  } finally {
    await a?.dispose();
  }
}
/**
 * 计算工作区相对分支点的 diff 与逐文件统计
 */
//@ chunk-gfa3ceg6.js:15745-18379 placement
async function computeWorkspaceDiff(e, n, o, s, r, a) {
  let u = r ?? void 0,
    c = a ?? {},
    f = await fetchGitDiff(e, void 0, "branch-point", u, a);
  if (f === null) return { diff: null };
  let l = r ?? (await getRepoTopLevel());
  if (l === null || l !== s) return { diff: null };
  let g = diffBaseRef(f),
    m = (p) => ({
      diff: {
        stats: f.stats,
        perFileStats: Array.from(f.perFileStats, ([h, _]) => ({ path: normalizeDiffPath(h), ..._ })),
        hunks: p.hunks.map((hunk) => ({ ...hunk, path: normalizeDiffPath(hunk.path) })),
        skippedLarge: p.skippedLarge.map(normalizeDiffPath),
        restricted: p.restricted.map(normalizeDiffPath),
        source: f.source,
      },
    }),
    S = [];
  for (let [p, h] of f.perFileStats) {
    let _ = h.newPath ?? p,
      P = h.previousPath ?? _;
    if (h.status === void 0 || h.isUntracked || h.isBinary || !isPlainRepoPath(P) || !isPlainRepoPath(_))
      continue;
    S.push({ key: p, oldPath: P, newPath: _, removed: h.status === "removed" });
  }
  if (S.length === 0) return m({ hunks: [], skippedLarge: [], restricted: [] });
  let v = g === "--cached";
  if (!v && g !== "HEAD" && !Ie.test(g)) return m({ hunks: [], skippedLarge: [], restricted: [] });
  let mapped = S.map((p) => p.newPath),
    [ee, te] = await Promise.all([
      v
        ? new Map()
        : readTreeEntries(
            l,
            g,
            S.map((p) => p.oldPath),
            c,
          ),
      readIndexEntries(l, mapped, c),
    ]);
  if (ee === null || te === null) return m({ hunks: [], skippedLarge: [], restricted: [] });
  let ne;
  try {
    ne = await realpath(l);
  } catch {
    return m({ hunks: [], skippedLarge: [], restricted: [] });
  }
  let Pe = await readGitAttributes(l, mapped, c),
    Ae = await readCoreAutocrlf(l, c),
    D = [],
    R = [],
    ie = [],
    re = MAX_DIFF_BLOB_BYTES,
    totalMs = o.totalMs;
  for (let { key: key, oldPath: oldPath, newPath: newPath, removed: removed } of S) {
    await new Promise((w) => setImmediate(w));
    let oe = join(l, newPath),
      U = join(l, oldPath),
      A = [];
    for (let w of new Set([oe, U])) {
      let N = NF(w, w, n.trustedNetworkDirectories);
      if (!N.ok) {
        A = null;
        break;
      }
      A.push(...N.pathsToCheck);
    }
    if (A === null) {
      R.push(key);
      continue;
    }
    if (
      !A.every(
        (w) => isPathAllowed(w, n, "read").allowed && matchingRuleForInput(w, n, "read", "ask") === null,
      )
    ) {
      R.push(key);
      continue;
    }
    let y = ee.get(oldPath);
    if (y && !REGULAR_FILE_MODES.has(y.mode)) continue;
    if (y && (y.size < 0 || y.size > MAX_TOTAL_DIFF_BYTES)) {
      D.push(key);
      continue;
    }
    let j = null,
      b = te.get(newPath);
    if (b === void 0 && !y) {
      R.push(key);
      continue;
    }
    let k =
      removed || b === void 0 ? { kind: "missing" } : await readWorkingFileForDiff(oe, join(ne, newPath), n);
    if (k.kind === "restricted") {
      R.push(key);
      continue;
    }
    if (k.kind === "not-regular-file" || k.kind === "off-path") continue;
    if (k.kind === "too-large") {
      D.push(key);
      continue;
    }
    let se = b?.entryIsNewSide && k.kind === "ok" ? matchBlobAllowingCrlf(k.content, b.oid) : null;
    if (b?.entryIsNewSide && se === null) continue;
    if (k.kind === "missing") {
      if (!y) continue;
      if (!(await isTrustedRepositoryRoot(U, n))) {
        R.push(key);
        continue;
      }
    } else if (((j = k.content), y && oldPath !== newPath && !(await isTrustedRepositoryRoot(U, n)))) {
      R.push(key);
      continue;
    }
    if (totalMs <= 0) {
      D.push(key);
      continue;
    }
    let ae = y ? await readGitBlob(l, y.oid, c) : "";
    if (ae === null) continue;
    let ce = ae,
      Y;
    if (j === null) Y = "";
    else {
      let w = shouldNormalizeEol(j, Pe?.get(newPath), Ae, ce);
      if (w === "unsupported") continue;
      Y = se ?? w;
    }
    let now = Date.now(),
      ue = buildDiffHunks(ce, Y, Math.min(o.perFileMs, totalMs));
    if (((totalMs -= Date.now() - now), ue === null)) {
      D.push(key);
      continue;
    }
    let K = capHunkLines(ue);
    if (K.length === 0) continue;
    let reduced = K.reduce((w, N) => w + N.lines.reduce((xe, Ge) => xe + Ge.length + 1, 0), 0);
    if (reduced > OVr || reduced > re) {
      D.push(key);
      continue;
    }
    ((re -= reduced), ie.push({ path: key, hunks: K }));
  }
  return m({ hunks: ie, skippedLarge: D, restricted: R });
}
/**
 * 按 git 规则给非 ASCII 或特殊字符路径加引号转义
 */
//@ chunk-vbr14wv4.js:191-540 placement
function quoteGitPath(n) {
  let encode = new TextEncoder().encode(n);
  if (encode.every((r) => r >= 32 && r < 127 && r !== 34 && r !== 92)) return n;
  return `"${Array.from(encode, (r) => {
    switch (r) {
      case 34:
        return '\\"';
      case 92:
        return "\\\\";
      case 9:
        return "\\t";
      case 10:
        return "\\n";
      case 13:
        return "\\r";
      default:
        return r >= 32 && r <= 126 ? String.fromCharCode(r) : `\\${r.toString(8).padStart(3, "0")}`;
    }
  }).join("")}"`;
}

export { buildWorkspaceDiffResponse };
