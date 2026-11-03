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
import { join, isAbsolute, dirname, basename } from "path";
import { mkdtemp, mkdir, rm, opendir, lstat, open, writeFile, realpath } from "fs/promises";
import { tmpdir } from "os";
import { constants } from "fs";
import { createHash } from "crypto";
import {
  standardRepoLayout,
  GIT_DIFF_TIMEOUT_MS,
  isSafeRelativeDiffPath,
  UNSAFE_PATH_CHAR_PATTERN,
  unquoteGitPathBytes,
  MAX_HUNK_LINE_COUNT,
  fetchGitDiff,
  getRepoTopLevel,
  diffBaseRef,
  MAX_SINGLE_FILE_DIFF_BYTES,
} from "../utils/gitDiff.js";
import { hasRunnerDeclaredNestedRepoDiff } from "../utils/remoteEnvironment.js";
import { normalizePathForCompare } from "../utils/file.js";
import { errorMessage, isENOENT } from "../utils/errors.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "../utils/execFileNoThrow.js";
import { gitExe } from "../utils/git.js";
import { isVersionAtLeast2_32b, parseGitVersion } from "../remote/tools/servedOwnerSettings.js";
import { env } from "../utils/env.js";
import { logForDebugging } from "../utils/debug.js";
import { HostScoped } from "../utils/hostScoped.js";
import {
  MAX_CHANGE_REASONS_SHOWN,
  CHANGES_PANE_PREFIX,
  HINT_DIFF_FINDS_NESTED,
  DIFF_COPY_ROOT_NOT_ABSOLUTE_TEXT,
  GIT_TOO_OLD_TEXT,
  matchesJoinedGitIgnorePattern,
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
import { GIT_SAFE_GLOBAL_ARGS } from "../utils/git/gitSafeEnv.js";
import { bindCanonicalPathToHandle, readHandleBounded } from "../utils/fsSafety/boundOpen.js";
import { isPathAllowed } from "../utils/permissions/pathValidation.js";
import { matchingRuleForInput } from "../utils/permissions/filesystem.js";
import { pathVettingReason, vetPathSpellingsOrChain } from "../utils/permissions/pathVetting.js";
import { P3 } from "../../vendor/diff/libesm/patch/create.js";
import { getWorkspaceDiffRoot } from "../utils/workspaceDiff.js";

//@ chunk-gfa3ceg6.js:1452-2776 placement
/**
 * .git 复制的大小上限与条目处置表
 */
var GIT_DIR_COPY_LIMITS = 65536;
var GIT_CONFIG_FILE_MAX_BYTES = 1e6;
var GIT_PACKED_REFS_MAX_BYTES = 33554432;
var GIT_REFS_FILE_MAX_BYTES = 65536;
var GIT_SHALLOW_MAX_BYTES = 65536;
var GIT_INFO_FILE_MAX_BYTES = 1e6;
var GIT_COPY_TOTAL_MAX_BYTES = 67108864;
var GIT_COPY_MAX_ENTRIES = 256;
var GIT_SCAN_MAX_ENTRIES = 20000;
var GIT_SCAN_MAX_DEPTH = 4096;
var GIT_COPY_EXTRA_CONFIG = [
  ["core.commitGraph", "false"],
  ["core.multiPackIndex", "false"],
];
var SKIP_GIT_ENTRY = {
  disposition: "skip",
};
var GIT_DIR_ENTRY_PLANS = new Map([
  [
    "config",
    {
      disposition: "copy",
      kind: "file",
      maxBytes: GIT_CONFIG_FILE_MAX_BYTES,
    },
  ],
  [
    "config.worktree",
    {
      disposition: "copy",
      kind: "file",
      maxBytes: GIT_CONFIG_FILE_MAX_BYTES,
    },
  ],
  [
    "HEAD",
    {
      disposition: "copy",
      kind: "file",
      maxBytes: GIT_DIR_COPY_LIMITS,
    },
  ],
  [
    "packed-refs",
    {
      disposition: "copy",
      kind: "file",
      maxBytes: GIT_PACKED_REFS_MAX_BYTES,
    },
  ],
  [
    "shallow",
    {
      disposition: "copy",
      kind: "file",
      maxBytes: GIT_SHALLOW_MAX_BYTES,
    },
  ],
  [
    "refs",
    {
      disposition: "copy",
      kind: "dir",
      maxFileBytes: GIT_REFS_FILE_MAX_BYTES,
      entries: "all",
    },
  ],
  [
    "info",
    {
      disposition: "copy",
      kind: "dir",
      maxFileBytes: GIT_INFO_FILE_MAX_BYTES,
      entries: new Set(["exclude", "attributes", "sparse-checkout", "grafts"]),
    },
  ],
  [
    "objects",
    {
      disposition: "in-place",
      kind: "dir",
    },
  ],
  [
    "index",
    {
      disposition: "in-place",
      kind: "file",
    },
  ],
  [
    "commondir",
    {
      disposition: "refuse",
    },
  ],
  [
    "gitdir",
    {
      disposition: "refuse",
    },
  ],
  [
    "reftable",
    {
      disposition: "refuse",
    },
  ],
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
  ].map((e) => [e, SKIP_GIT_ENTRY]),
]);
var VOLATILE_GIT_DIR_ENTRY_PATTERN = /^(?:BISECT_[A-Z_]+|fsmonitor--daemon.*|.+\.lock)$/;
//@ chunk-gfa3ceg6.js:2776-2832 placement
function gitDirEntryPlan(name) {
  return (
    GIT_DIR_ENTRY_PLANS.get(name) ?? (VOLATILE_GIT_DIR_ENTRY_PATTERN.test(name) ? SKIP_GIT_ENTRY : undefined)
  );
}
//@ chunk-gfa3ceg6.js:2832-3642 placement = GIT_REBASE_RE (0.528)
/**
 * （旧版名配错，切分错误）git 配置键白名单/敏感键模式与子模块更新模式，用于判断哪些 git config 可安全传递。
 */
var ACCEPTED_GIT_CONFIG_PATTERNS = [
  /^(?:commit|tag|pull|push|rebase|init|advice|color|column|help|status|fetch|user|branch)\..+$/,
  /^core\.(?:repositoryformatversion|filemode|bare|logallrefupdates|ignorecase|precomposeunicode|symlinks|autocrlf|eol|safecrlf|longpaths|sparsecheckout|sparsecheckoutcone|quotepath|abbrev|checkstat|trustctime|untrackedcache)$/,
  /^remote\..+\.(?:url|pushurl|fetch|promisor|partialclonefilter|tagopt|prune|mirror|gh-resolved)$/,
  /^submodule\.active$/,
  /^submodule\..+\.(?:active|branch|url)$/,
  /^http\.(?:.+\.)?extraheader$/,
  /^maintenance\..+$/,
  /^(?:extensions\.(?:objectformat|partialclone|worktreeconfig)|lfs\.repositoryformatversion)$/,
];
var OPT_IN_GIT_CONFIG_PATTERNS = [
  /^http\.(?:.+\.)?(?:sslcainfo|sslcapath|sslverify|proxy)$/,
  /^lfs\..+\.(?:access|locksverify)$/,
  /^merge\.conflictstyle$/,
];
var SUBMODULE_UPDATE_MODES = new Set(["checkout", "rebase", "merge", "none"]);
//@ chunk-gfa3ceg6.js:3642-4314 placement
/**
 * 检查并复制仓库 .git，返回可用于 diff 的副本
 */
async function prepareRepositoryCopy(cwd, n, abortSignal) {
  let s = standardRepoLayout(cwd);
  if (s === null || s.workTree === null) return null;
  if (
    hasRunnerDeclaredNestedRepoDiff() &&
    normalizePathForCompare(s.workTree) !== normalizePathForCompare(cwd)
  )
    return refuseDiscoveredRepository("a folder that is no longer the one that was checked", n);
  let { gitDir, workTree } = s;
  let u;
  try {
    let c = await vetGitDirEntries(gitDir);
    if (typeof c === "string") return refuseDiscoveredRepository(c, n);
    let f = await vetGitObjectsDir(join(gitDir, "objects"));
    if (f !== undefined) return refuseDiscoveredRepository(f, n);
    let diffCopyRoot = await getDiffCopyRoot();
    if (diffCopyRoot === null) return refuseDiscoveredRepository(NO_DIFF_COPY_ROOT_REFUSAL, n);
    u = await mkdtemp(join(diffCopyRoot, "ccdiff-"));
    let g = u;
    let m = (await copyGitDir(gitDir, g, c)) ?? (await readUnacceptedGitConfig(g, c.has("config.worktree")));
    if (m !== undefined) {
      await removeRecursiveQuietly(g);
      return refuseDiscoveredRepository(m, n);
    }
    let copiedGitEnv = buildCopiedGitEnv(g, gitDir, workTree);
    if (!(await isGitVersionSupported(cwd, copiedGitEnv, abortSignal))) {
      await removeRecursiveQuietly(g);
      return refuseDiscoveredRepository(GIT_VERSION_REFUSAL, n);
    }
    return {
      spawn: copiedGitEnv,
      dispose: () => removeRecursiveQuietly(g),
    };
  } catch (error) {
    if (u !== undefined) await removeRecursiveQuietly(u);
    return refuseDiscoveredRepository(`unexpected error (${errorMessage(error)})`, n);
  }
}
//@ chunk-gfa3ceg6.js:4314-4366 placement
var GIT_VERSION_REFUSAL = "git older than 2.32, or its version unread";
//@ chunk-gfa3ceg6.js:4366-4576 placement
/**
 * git 版本是否 >= 2.32
 */
async function isGitVersionSupported(cwd, copiedGitEnv, abortSignal) {
  let { stdout, code } = await execFileNoThrowWithCwd(gitExe(), ["version"], {
    ...copiedGitEnv,
    cwd,
    timeout: GIT_DIFF_TIMEOUT_MS,
    abortSignal,
    preserveOutputOnError: false,
    stdin: "ignore",
  }).catch(() => ({
    stdout: "",
    code: 1,
  }));
  return code === 0 && isVersionAtLeast2_32b(parseGitVersion(stdout));
}
//@ chunk-gfa3ceg6.js:4576-4608 placement
var NO_DIFF_COPY_ROOT_REFUSAL = "no folder for the copy";
//@ chunk-gfa3ceg6.js:4608-4763 placement
/**
 * 取 diff 复制用临时根目录（CLAUDE_CODE_DIFF_COPY_ROOT）
 */
async function getDiffCopyRoot() {
  if (!hasRunnerDeclaredNestedRepoDiff()) return tmpdir();
  let CLAUDE_CODE_DIFF_COPY_ROOT = env.CLAUDE_CODE_DIFF_COPY_ROOT;
  if (CLAUDE_CODE_DIFF_COPY_ROOT === undefined || !isAbsolute(CLAUDE_CODE_DIFF_COPY_ROOT)) return null;
  await mkdir(CLAUDE_CODE_DIFF_COPY_ROOT, {
    recursive: true,
    mode: 448,
  });
  return CLAUDE_CODE_DIFF_COPY_ROOT;
}
//@ chunk-gfa3ceg6.js:4763-4839 placement = convertDirectoryToZipInPlace (1)
async function removeRecursiveQuietly(dirPath) {
  await rm(dirPath, {
    recursive: true,
    force: true,
  }).catch(() => {
    return;
  });
}
//@ chunk-gfa3ceg6.js:4839-4969 placement
/**
 * 记录拒绝发现的仓库并上报进度，返回 null。
 */
function refuseDiscoveredRepository(e, n) {
  logForDebugging(`workspace diff: discovered repository refused (${e})`, {
    level: "warn",
  });
  if (n !== undefined) reportDiffProgress(e, REPORTED_DIFF_REFUSALS_SLOT.of(n));
  return null;
}
//@ chunk-gfa3ceg6.js:4969-5061 placement
var REPORTED_DIFF_REFUSALS_SLOT = new HostScoped(() => new Set());
var MAX_REPORTED_DIFF_REFUSALS = 8;
var LAST_REPORTED_REFUSAL = "";
var GIT_CONFIG_KEY_DISPLAY_PATTERN = /^[a-z0-9-]{1,40}(?:\.<\.\.\.>)?\.[a-z0-9-]{1,40}$/;
//@ chunk-gfa3ceg6.js:5061-5243 placement
/**
 * 调试模式下把进度写 stderr
 */
function reportDiffProgress(e, n) {
  if (!hasRunnerDeclaredNestedRepoDiff()) return;
  let o = describeRefusalForUser(e);
  if (n.has(o)) return;
  if (n.size >= MAX_REPORTED_DIFF_REFUSALS) {
    if (!n.has(LAST_REPORTED_REFUSAL)) {
      n.add(LAST_REPORTED_REFUSAL);
      process.stderr.write(`${MAX_CHANGE_REASONS_SHOWN}
`);
    }
    return;
  }
  n.add(o);
  process.stderr.write(`${o}
`);
}
//@ chunk-gfa3ceg6.js:5243-5289 placement
function describeRefusalForUser(e) {
  return `${CHANGES_PANE_PREFIX} ${describeGitDirRefusal(e)} ${HINT_DIFF_FINDS_NESTED}`;
}
//@ chunk-gfa3ceg6.js:5289-6491 placement
/**
 * 把 .git 检查拒绝原因转成用户可读文字
 */
function describeGitDirRefusal(e) {
  let match = /^(config entry|config value of|multi-line value for) (.+)$/.exec(e);
  if (match !== null) {
    let s = match[2] ?? "";
    if (!GIT_CONFIG_KEY_DISPLAY_PATTERN.test(s))
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
  if (e === NO_DIFF_COPY_ROOT_REFUSAL) return DIFF_COPY_ROOT_NOT_ABSOLUTE_TEXT;
  if (e === GIT_VERSION_REFUSAL) return GIT_TOO_OLD_TEXT;
  let o = firstLineOf(e, " (");
  if (o === "unexpected error")
    return "An unexpected error stopped the check of its .git folder; the session's debug log has the details.";
  return matchesJoinedGitIgnorePattern(o)
    ? `The check of its .git folder stopped at: ${o}.`
    : "The check of its .git folder stopped for a reason that is not shown.";
}
//@ chunk-gfa3ceg6.js:6491-6528 placement
function gitConfigPairsForCopy() {
  return [...getGitSafetyConfigPairs(), ...GIT_COPY_EXTRA_CONFIG];
}
//@ chunk-gfa3ceg6.js:6528-6775 placement
/**
 * 为复制的 .git 构造 git 环境变量
 */
function buildCopiedGitEnv(e, gitDir, workTree) {
  return {
    env: {
      ...getRemoteHostSessionCount(GIT_FILES_REF_BACKEND_ENV, {
        base: subprocessEnv(),
        repository: {
          gitDir: e,
          workTree,
          commonDir: e,
        },
      }),
      ...ISOLATED_GIT_CONFIG_ENV,
      ...buildGitConfigEnv(undefined, gitConfigPairsForCopy()),
      GIT_OBJECT_DIRECTORY: join(gitDir, "objects"),
      GIT_INDEX_FILE: join(gitDir, "index"),
      [CLAUDE_CODE_FOUND_REPOSITORY_GIT]: "1",
    },
    extendEnv: false,
    gitStartsIn: GitStartFolderError.filesystemRoot(),
  };
}
//@ chunk-gfa3ceg6.js:6775-7343 placement
/**
 * 检查 .git 顶层条目，返回拒绝原因
 */
async function vetGitDirEntries(gitDir) {
  let n = new Set();
  let o = 0;
  for await (let s of await opendir(gitDir)) {
    if (++o > GIT_COPY_MAX_ENTRIES) return "oversized .git";
    let r = gitDirEntryPlan(s.name);
    if (r === undefined) return "unknown .git entry";
    switch (r.disposition) {
      case "skip":
        continue;
      case "refuse":
        return `.git/${s.name}`;
      case "copy":
      case "in-place":
        if (s.name === "index") {
          let a = await lstat(join(gitDir, s.name));
          if (!a.isFile() || a.nlink > 1) return "symlinked, hardlinked or unexpected .git/index";
        } else if ((await classifyDirent(gitDir, s)) !== r.kind)
          return `symlinked or unexpected .git/${s.name}`;
        n.add(s.name);
    }
  }
  if (!n.has("config") || !n.has("HEAD")) return "no .git/config or .git/HEAD";
  return n;
}
//@ chunk-gfa3ceg6.js:7343-7618 placement
/**
 * 检查 .git/objects 无符号链接且无 alternates
 */
async function vetGitObjectsDir(e) {
  let o = await listPlainSubdirs(e);
  if (o === null) return "symlinked or oversized .git/objects entry";
  for (let s of o)
    if ((await listPlainSubdirs(join(e, s))) === null) return "symlinked or oversized .git/objects entry";
  if (await isNonEmptyOrIrregularFile(join(e, "info", "alternates"))) return ".git/objects/info/alternates";
  return;
}
//@ chunk-gfa3ceg6.js:7618-8052 placement
/**
 * 把 .git 需要的部分复制到临时目录
 */
async function copyGitDir(gitDir, n, o) {
  await mkdir(join(n, "refs"), {
    recursive: true,
  });
  let s = {
    entries: 0,
    bytes: 0,
  };
  for (let [r, a] of GIT_DIR_ENTRY_PLANS) {
    if (a.disposition !== "copy" || !o.has(r)) continue;
    let u = join(gitDir, r);
    let c = join(n, r);
    if (a.kind === "file") {
      if ((await copyBoundedGitFile(u, c, a.maxBytes, s)) !== "copied")
        return `unreadable, linked or oversized .git/${r}`;
      continue;
    }
    await mkdir(c, {
      recursive: true,
    });
    if (!(await copyGitDirEntries(u, c, a.maxFileBytes, s, a.entries)))
      return `unreadable, linked or oversized entry under .git/${r}`;
  }
  return;
}
//@ chunk-gfa3ceg6.js:8052-8773 placement
/**
 * 列出仓库 config 中不被接受的条目
 */
async function readUnacceptedGitConfig(e, n) {
  let o = new Set(gitConfigPairsForCopy().map(([r]) => r.toLowerCase()));
  let s = n ? ["config", "config.worktree"] : ["config"];
  for (let r of s) {
    let a = await execFileNoThrow(
      gitExe(),
      ["config", "--file", join(e, r), "--no-includes", "-z", "--list"],
      {
        cwd: GitStartFolderError.filesystemRoot().path,
        gitStartsIn: GitStartFolderError.filesystemRoot(),
        timeout: GIT_DIFF_TIMEOUT_MS,
        maxBuffer: 4000000,
        env: {
          ...getRemoteHostSessionCount(GIT_FILES_REF_BACKEND_ENV, {
            base: subprocessEnv(),
          }),
          ...ISOLATED_GIT_CONFIG_ENV,
          GIT_DIR: join(e, "no-repository-here"),
          [CLAUDE_CODE_FOUND_REPOSITORY_GIT]: "1",
        },
        extendEnv: false,
        stdin: "ignore",
      },
    );
    if (a.code !== 0) return `config ${r} unlistable`;
    for (let u of a.stdout.split("\x00")) {
      if (u === "") continue;
      let index = u.indexOf(`
`);
      let f = index === -1 ? u : u.slice(0, index);
      let l = index === -1 ? "" : u.slice(index + 1);
      if (
        l.includes(`
`)
      )
        return `multi-line value for ${abbreviateConfigKey(f)}`;
      if (!isAcceptedGitConfigKey(f, l, o))
        return `${isSubmoduleOrRefStorageKey(f) ? "config value of" : "config entry"} ${abbreviateConfigKey(f)}`;
    }
  }
  return;
}
//@ chunk-gfa3ceg6.js:8773-8806 placement
var SUBMODULE_UPDATE_CONFIG_PATTERN = /^submodule\..+\.update$/;
//@ chunk-gfa3ceg6.js:8806-8868 placement
function isSubmoduleOrRefStorageKey(e) {
  return e === "extensions.refstorage" || SUBMODULE_UPDATE_CONFIG_PATTERN.test(e);
}
//@ chunk-gfa3ceg6.js:8868-9041 placement
/**
 * git config 键是否在可接受列表
 */
function isAcceptedGitConfigKey(e, n, o) {
  if (e === "extensions.refstorage") return n === "files";
  if (SUBMODULE_UPDATE_CONFIG_PATTERN.test(e)) return SUBMODULE_UPDATE_MODES.has(n);
  return (
    o.has(e) ||
    ACCEPTED_GIT_CONFIG_PATTERNS.some((s) => s.test(e)) ||
    (hasRunnerDeclaredNestedRepoDiff() && OPT_IN_GIT_CONFIG_PATTERNS.some((s) => s.test(e)))
  );
}
//@ chunk-gfa3ceg6.js:9041-9124 placement
function abbreviateConfigKey(e) {
  let parts = e.split(".");
  return parts.length <= 2 ? e : `${parts[0]}.<...>.${parts.at(-1)}`;
}
//@ chunk-gfa3ceg6.js:9124-9503 placement
/**
 * 按白名单递归复制 .git 目录条目
 */
async function copyGitDirEntries(e, n, o, s, r) {
  let a;
  try {
    a = await opendir(e);
  } catch (error) {
    return isENOENT(error);
  }
  for await (let u of a) {
    if (++s.entries > GIT_SCAN_MAX_ENTRIES) return false;
    if (r !== "all" && !r.has(u.name)) continue;
    let c = join(e, u.name);
    let f = join(n, u.name);
    let l = await classifyDirent(e, u);
    if (l === "dir" && r === "all") {
      await mkdir(f, {
        recursive: true,
      });
      if (!(await copyGitDirEntries(c, f, o, s, "all"))) return false;
    } else if (l === "file") {
      if ((await copyBoundedGitFile(c, f, o, s)) !== "copied") return false;
    } else return false;
  }
  return true;
}
//@ chunk-gfa3ceg6.js:9503-9758 placement
/**
 * 目录项分类 dir/file/reject（符号链接拒绝）
 */
async function classifyDirent(e, n) {
  if (n.isSymbolicLink()) return "reject";
  if (n.isDirectory()) return "dir";
  if (n.isFile()) return "file";
  try {
    let o = await lstat(join(e, n.name));
    return o.isSymbolicLink() ? "reject" : o.isDirectory() ? "dir" : o.isFile() ? "file" : "reject";
  } catch {
    return "reject";
  }
}
//@ chunk-gfa3ceg6.js:9758-9972 placement
/**
 * 列出子目录，遇符号链接或超量返回 null
 */
async function listPlainSubdirs(e) {
  let n;
  try {
    n = await opendir(e);
  } catch (error) {
    return isENOENT(error) ? [] : null;
  }
  let o = [];
  let s = 0;
  for await (let r of n) {
    if (++s > GIT_SCAN_MAX_DEPTH) return null;
    let a = await classifyDirent(e, r);
    if (a === "reject") return null;
    if (a === "dir") o.push(r.name);
  }
  return o;
}
//@ chunk-gfa3ceg6.js:9972-10057 placement
function readOnlyOpenFlags() {
  return getPlatform() === "windows"
    ? constants.O_RDONLY
    : constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW;
}
//@ chunk-gfa3ceg6.js:10057-10516 placement
/**
 * 有界复制 .git 中的单个文件
 */
async function copyBoundedGitFile(e, n, o, s) {
  let r;
  try {
    r = await open(e, readOnlyOpenFlags());
  } catch (error) {
    return isENOENT(error) ? "absent" : "refused";
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile() || stats.nlink > 1 || stats.size > o) return "refused";
    s.bytes += stats.size;
    if (s.bytes > GIT_COPY_TOTAL_MAX_BYTES) return "refused";
    let u = Buffer.alloc(stats.size);
    let c = 0;
    while (c < stats.size) {
      let { bytesRead } = await r.read(u, c, stats.size - c, c);
      if (bytesRead === 0) break;
      c += bytesRead;
    }
    if (c !== stats.size) return "refused";
    await writeFile(n, u);
    return "copied";
  } catch {
    return "refused";
  } finally {
    await r.close().catch(() => {
      return;
    });
  }
}
//@ chunk-gfa3ceg6.js:10516-10685 placement
/**
 * 文件是否非空或非普通文件
 */
async function isNonEmptyOrIrregularFile(e) {
  let n;
  try {
    n = await open(e, readOnlyOpenFlags());
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
//@ chunk-gfa3ceg6.js:10685-10882 placement
/**
 * 向上找到存在的祖先再拼回路径
 */
async function resolveMissingPath(e) {
  let n = dirname(e);
  let o = [basename(e)];
  for (let j = 0; j < 64; j++) {
    try {
      let a = await realpath(n);
      return join(a, ...o);
    } catch (error) {
      if (error?.code !== "ENOENT") return;
    }
    let r = dirname(n);
    if (r === n) return;
    o.unshift(basename(n));
    n = r;
  }
  return;
}
//@ chunk-gfa3ceg6.js:10882-11009 placement
var MAX_DIFF_BLOB_BYTES = 2000000;
var REGULAR_FILE_MODES = new Set(["100644", "100755", "100664"]);
var MAX_TOTAL_DIFF_BYTES = 1e7;
var MAX_DIFF_FILES = 1e4;
var DIFF_READ_TIMEOUTS = {
  perFileMs: 5000,
  totalMs: 1e4,
};
var NOFOLLOW_READ_FLAGS = REMOTE_READ_OPEN_FLAGS | (constants.O_NOFOLLOW ?? 0);
//@ chunk-gfa3ceg6.js:11009-11266 placement
/**
 * 路径是否为可安全传给 git 的普通相对路径
 */
function isPlainRepoPath(e) {
  if (e.length === 0 || e.startsWith('"')) return false;
  if (/[\u0000-\u001f\u007f\uFFFD]/.test(e)) return false;
  if (
    e.startsWith("-") ||
    e.startsWith(":") ||
    e.includes(" => ") ||
    e.includes("\\") ||
    !isSafeRelativeDiffPath(e)
  )
    return false;
  return e.split("/").every((n) => n !== "" && stripTrailingDotsSpaces(n) !== ".");
}
//@ chunk-gfa3ceg6.js:11266-11415 placement
/**
 * 含不安全字符的路径：去掉 git 的引号转义后重新按 git 规则加引号。
 */
function normalizeDiffPath(e) {
  if (!UNSAFE_PATH_CHAR_PATTERN.test(e)) return e;
  let n = e.length > 1 && e.startsWith('"') && e.endsWith('"') && !e.includes('" => ');
  return quoteGitPath(n ? unquoteGitPathBytes(e.slice(1, -1)) : e);
}
//@ chunk-gfa3ceg6.js:11415-11442 placement
var GIT_OBJECT_ID_PATTERN = /^[0-9a-f]{40,64}$/;
//@ chunk-gfa3ceg6.js:11442-11497 placement
function gitArgs(e) {
  return ["--literal-pathspecs", ...GIT_SAFE_GLOBAL_ARGS, ...e];
}
//@ chunk-gfa3ceg6.js:11497-11569 placement
function gitExecOptions(cwd, n) {
  return {
    ...n,
    cwd,
    timeout: GIT_DIFF_TIMEOUT_MS,
    preserveOutputOnError: false,
  };
}
//@ chunk-gfa3ceg6.js:11569-11994 placement
/**
 * git ls-tree 读取提交中的文件条目
 */
async function readTreeEntries(e, n, o, s) {
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    gitArgs(["ls-tree", "-r", "-l", "-z", "--full-tree", n, "--", ...o]),
    {
      ...gitExecOptions(e, s),
      maxBuffer: 1e7,
    },
  );
  if (code !== 0) return null;
  let u = new Map();
  for (let c of stdout.split("\x00")) {
    if (!c) continue;
    let match = c.match(/^(\d{6}) (\S+) ([0-9a-f]{40,64}) +(\d+|-)\t(.+)$/s);
    if (!match) continue;
    let [, l = "", g, m = "", S, v] = match;
    if (v === undefined) continue;
    u.set(v, {
      mode: l,
      oid: m,
      size: g === "blob" && S !== "-" ? Number(S) : -1,
    });
  }
  return u;
}
//@ chunk-gfa3ceg6.js:11994-12372 placement
/**
 * git ls-files --stage 读取索引条目
 */
async function readIndexEntries(e, n, o) {
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    gitArgs(["ls-files", "--stage", "-v", "-z", "--", ...n]),
    {
      ...gitExecOptions(e, o),
      maxBuffer: 1e7,
    },
  );
  if (code !== 0) return null;
  let a = new Map();
  for (let u of stdout.split("\x00")) {
    let match = u.match(/^(\S) (\d{6}) ([0-9a-f]{40,64}) (\d)\t(.+)$/s);
    if (!match) continue;
    let [, f = "", , l = "", g, m = ""] = match;
    a.set(m, {
      entryIsNewSide: g === "0" && (f === "S" || /[a-z]/.test(f)),
      oid: l,
    });
  }
  return a;
}
//@ chunk-gfa3ceg6.js:12372-12535 placement
/**
 * 计算 git blob 哈希（sha1/sha256）
 */
function gitBlobHash(e, n) {
  let o = typeof e === "string" ? Buffer.from(e, "utf-8") : e;
  return createHash(n.length === 64 ? "sha256" : "sha1")
    .update(`blob ${o.length}\x00`)
    .update(o)
    .digest("hex");
}
//@ chunk-gfa3ceg6.js:12535-12664 placement
/**
 * 文本的 git blob 哈希与目标一致则返回；否则试把 CRLF 换成 LF 再比，仍不符返回 null。
 */
function matchBlobAllowingCrlf(content, n) {
  if (gitBlobHash(content, n) === n) return content;
  if (
    !content.includes(`\r
`)
  )
    return null;
  let replaced = content.replaceAll(
    `\r
`,
    `
`,
  );
  return gitBlobHash(replaced, n) === n ? replaced : null;
}
//@ chunk-gfa3ceg6.js:12664-12940 placement
/**
 * git cat-file 读取 blob 并核对哈希
 */
async function readGitBlob(e, n, o) {
  if (!GIT_OBJECT_ID_PATTERN.test(n)) return null;
  let { stdout, code } = await execFileNoThrowWithCwd(gitExe(), gitArgs(["cat-file", "blob", n]), {
    ...gitExecOptions(e, o),
    maxBuffer: MAX_TOTAL_DIFF_BYTES + 65536,
    stripFinalNewline: false,
    encoding: "latin1",
  });
  if (code !== 0) return null;
  let buffer = Buffer.from(stdout, "latin1");
  return gitBlobHash(buffer, n) === n ? buffer.toString("utf-8") : null;
}
//@ chunk-gfa3ceg6.js:12940-13757 placement
/**
 * 有界读取工作区文件，区分缺失/受限/非普通文件
 */
async function readWorkingFileForDiff(e, n, o) {
  let s;
  try {
    s = await open(e, NOFOLLOW_READ_FLAGS);
  } catch (error) {
    return error?.code === "ENOENT"
      ? {
          kind: "missing",
        }
      : {
          kind: "restricted",
        };
  }
  try {
    let stats = await s.stat({
      bigint: true,
    });
    if (!stats.isFile())
      return {
        kind: "not-regular-file",
      };
    if (stats.nlink !== 1n || stats.dev === 0n || stats.ino === 0n)
      return {
        kind: "restricted",
      };
    let a;
    try {
      a = await realpath(e);
    } catch {
      return {
        kind: "restricted",
      };
    }
    let u = await bindCanonicalPathToHandle(s, stats, a);
    if (u === undefined)
      return {
        kind: "restricted",
      };
    a = u;
    if (!isPathAllowed(a, o, "read").allowed || matchingRuleForInput(a, o, "read", "ask") !== null)
      return {
        kind: "restricted",
      };
    if (pathVettingReason(a, o.trustedNetworkDirectories) !== undefined)
      return {
        kind: "restricted",
      };
    if (!(await isCanonicalPathContained(a, o)))
      return {
        kind: "restricted",
      };
    if (a !== n)
      return {
        kind: "off-path",
      };
    let handleBounded = await readHandleBounded(s, MAX_TOTAL_DIFF_BYTES, stats.size);
    if (handleBounded.overLimit)
      return {
        kind: "too-large",
      };
    return {
      kind: "ok",
      content: handleBounded.bytes.toString("utf-8"),
    };
  } catch {
    return {
      kind: "restricted",
    };
  } finally {
    await s.close().catch(() => {});
  }
}
//@ chunk-gfa3ceg6.js:13757-13930 placement
/**
 * 仓库根是否在受信网络目录内且通过校验
 */
async function isTrustedRepositoryRoot(e, n) {
  let o;
  try {
    o = await realpath(e);
  } catch (error) {
    o = error?.code === "ENOENT" ? await resolveMissingPath(e) : undefined;
  }
  return (
    o !== undefined &&
    pathVettingReason(o, n.trustedNetworkDirectories) === undefined &&
    (await isCanonicalPathContained(o, n))
  );
}
//@ chunk-gfa3ceg6.js:13930-14437 placement
/**
 * git check-attr 读取各路径的 text/eol 属性
 */
async function readGitAttributes(e, n, o) {
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    gitArgs(["check-attr", "-z", "-a", "--", ...n]),
    {
      ...gitExecOptions(e, o),
      maxBuffer: 1e7,
    },
  );
  if (code !== 0) return null;
  let a = new Map(
    n.map((c) => [
      c,
      {
        text: "unspecified",
        eol: "unspecified",
        converted: false,
      },
    ]),
  );
  let parts = stdout.split("\x00");
  for (let c = 0; c + 2 < parts.length; c += 3) {
    let f = parts[c];
    let l = parts[c + 1];
    let g = parts[c + 2];
    if (f === undefined || l === undefined || g === undefined) continue;
    let m = a.get(f);
    if (!m) continue;
    if (l === "text") m.text = g;
    else if (l === "eol") m.eol = g;
    else if (l === "filter" || l === "working-tree-encoding") m.converted = true;
  }
  return a;
}
//@ chunk-gfa3ceg6.js:14437-14640 placement
/**
 * 读取 core.autocrlf
 */
async function readCoreAutocrlf(e, n) {
  let { stdout, exitCode } = await execFileNoThrowWithCwd(
    gitExe(),
    gitArgs(["config", "--get", "core.autocrlf"]),
    gitExecOptions(e, n),
  );
  if (exitCode !== 0) return false;
  let lower = stdout.trim().toLowerCase();
  return lower === "true" ? "true" : lower === "input" ? "input" : false;
}
//@ chunk-gfa3ceg6.js:14640-14695 placement
function hasNulByte(e) {
  return e.slice(0, 8000).includes("\x00");
}
//@ chunk-gfa3ceg6.js:14695-15079 placement
/**
 * 按 gitattributes text/eol 与 autocrlf 判定是否换行转换
 */
function shouldNormalizeEol(e, n, coreAutocrlf, s) {
  if (!n || n.converted) return "unsupported";
  if (n.text === "unset") return e;
  let r;
  if (n.text === "set") r = false;
  else if (n.text === "auto") r = true;
  else if (n.text === "unspecified") {
    if (coreAutocrlf === "true" || coreAutocrlf === "input") r = true;
    else if (n.eol === "crlf" || n.eol === "lf") r = true;
    else return e;
  } else return e;
  if (
    !e.includes(`\r
`)
  )
    return e;
  if (
    r &&
    (hasNulByte(e) ||
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
//@ chunk-gfa3ceg6.js:15079-15369 placement
/**
 * 生成结构化 diff hunk
 */
function buildDiffHunks(e, n, timeout) {
  let s = P3("a", "b", e, n, "", "", {
    context: 3,
    maxEditLength: MAX_DIFF_FILES,
    timeout,
  });
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
//@ chunk-gfa3ceg6.js:15369-15498 placement
/**
 * 按全局行数上限截断 diff hunk 的行。
 */
function capHunkLines(diffHunks) {
  let n = MAX_HUNK_LINE_COUNT;
  let o = [];
  for (let s of diffHunks) {
    if (n <= 0) break;
    let sliced = s.lines.slice(0, n);
    n -= sliced.length;
    o.push({
      ...s,
      lines: sliced,
    });
  }
  return o;
}
//@ chunk-gfa3ceg6.js:15498-15745 placement
/**
 * 为桥接生成工作区 diff：先检查并复制 .git，再在副本上计算相对分支点的 diff。
 */
async function buildWorkspaceDiffResponse(host, n, workspaceDiffComputeBudget = DIFF_READ_TIMEOUTS) {
  let workspaceDiffRoot = await getWorkspaceDiffRoot();
  if (workspaceDiffRoot === null)
    return {
      diff: null,
    };
  let root = workspaceDiffRoot.nested ? workspaceDiffRoot.root : null;
  let a = root === null ? null : await prepareRepositoryCopy(root, host);
  if (root !== null && a === null)
    return {
      diff: null,
    };
  try {
    return await computeWorkspaceDiff(
      host,
      n,
      workspaceDiffComputeBudget,
      workspaceDiffRoot.root,
      root,
      a?.spawn,
    );
  } finally {
    await a?.dispose();
  }
}
//@ chunk-gfa3ceg6.js:15745-18379 placement
/**
 * 计算工作区相对分支点的 diff 与逐文件统计
 */
async function computeWorkspaceDiff(e, n, o, root, root_2, spawn) {
  let u = root_2 ?? undefined;
  let c = spawn ?? {};
  let gitDiff = await fetchGitDiff(e, undefined, "branch-point", u, spawn);
  if (gitDiff === null)
    return {
      diff: null,
    };
  let l = root_2 ?? (await getRepoTopLevel());
  if (l === null || l !== root)
    return {
      diff: null,
    };
  let g = diffBaseRef(gitDiff);
  let m = (p) => ({
    diff: {
      stats: gitDiff.stats,
      perFileStats: Array.from(gitDiff.perFileStats, ([h, _]) => ({
        path: normalizeDiffPath(h),
        ..._,
      })),
      hunks: p.hunks.map((hunk) => ({
        ...hunk,
        path: normalizeDiffPath(hunk.path),
      })),
      skippedLarge: p.skippedLarge.map(normalizeDiffPath),
      restricted: p.restricted.map(normalizeDiffPath),
      source: gitDiff.source,
    },
  });
  let S = [];
  for (let [p, h] of gitDiff.perFileStats) {
    let newPath = h.newPath ?? p;
    let previousPath = h.previousPath ?? newPath;
    if (
      h.status === undefined ||
      h.isUntracked ||
      h.isBinary ||
      !isPlainRepoPath(previousPath) ||
      !isPlainRepoPath(newPath)
    )
      continue;
    S.push({
      key: p,
      oldPath: previousPath,
      newPath,
      removed: h.status === "removed",
    });
  }
  if (S.length === 0)
    return m({
      hunks: [],
      skippedLarge: [],
      restricted: [],
    });
  let v = g === "--cached";
  if (!v && g !== "HEAD" && !GIT_OBJECT_ID_PATTERN.test(g))
    return m({
      hunks: [],
      skippedLarge: [],
      restricted: [],
    });
  let mapped = S.map((p) => p.newPath);
  let [ee, indexEntries] = await Promise.all([
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
  if (ee === null || indexEntries === null)
    return m({
      hunks: [],
      skippedLarge: [],
      restricted: [],
    });
  let ne;
  try {
    ne = await realpath(l);
  } catch {
    return m({
      hunks: [],
      skippedLarge: [],
      restricted: [],
    });
  }
  let gitAttributes = await readGitAttributes(l, mapped, c);
  let coreAutocrlf = await readCoreAutocrlf(l, c);
  let D = [];
  let R = [];
  let ie = [];
  let re = MAX_DIFF_BLOB_BYTES;
  let totalMs = o.totalMs;
  for (let { key, oldPath, newPath, removed } of S) {
    await new Promise((resolve) => setImmediate(resolve));
    let oe = join(l, newPath);
    let U = join(l, oldPath);
    let A = [];
    for (let w of new Set([oe, U])) {
      let N = vetPathSpellingsOrChain(w, w, n.trustedNetworkDirectories);
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
    let j = null;
    let b = indexEntries.get(newPath);
    if (b === undefined && !y) {
      R.push(key);
      continue;
    }
    let k =
      removed || b === undefined
        ? {
            kind: "missing",
          }
        : await readWorkingFileForDiff(oe, join(ne, newPath), n);
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
    } else {
      j = k.content;
      if (y && oldPath !== newPath && !(await isTrustedRepositoryRoot(U, n))) {
        R.push(key);
        continue;
      }
    }
    if (totalMs <= 0) {
      D.push(key);
      continue;
    }
    let ae = y ? await readGitBlob(l, y.oid, c) : "";
    if (ae === null) continue;
    let ce = ae;
    let Y;
    if (j === null) Y = "";
    else {
      let w = shouldNormalizeEol(j, gitAttributes?.get(newPath), coreAutocrlf, ce);
      if (w === "unsupported") continue;
      Y = se ?? w;
    }
    let now = Date.now();
    let diffHunks = buildDiffHunks(ce, Y, Math.min(o.perFileMs, totalMs));
    totalMs -= Date.now() - now;
    if (diffHunks === null) {
      D.push(key);
      continue;
    }
    let K = capHunkLines(diffHunks);
    if (K.length === 0) continue;
    let reduced = K.reduce((acc, N) => acc + N.lines.reduce((acc, line) => acc + line.length + 1, 0), 0);
    if (reduced > MAX_SINGLE_FILE_DIFF_BYTES || reduced > re) {
      D.push(key);
      continue;
    }
    re -= reduced;
    ie.push({
      path: key,
      hunks: K,
    });
  }
  return m({
    hunks: ie,
    skippedLarge: D,
    restricted: R,
  });
}
//@ chunk-vbr14wv4.js:191-540 placement
/**
 * 按 git 规则给非 ASCII 或特殊字符路径加引号转义
 */
function quoteGitPath(n) {
  let e = new TextEncoder().encode(n);
  if (e.every((r) => r >= 32 && r < 127 && r !== 34 && r !== 92)) return n;
  return `"${Array.from(e, (r) => {
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
