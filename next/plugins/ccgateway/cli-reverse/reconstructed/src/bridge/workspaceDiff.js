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
  MAX_REASONS_SHOWN_TEXT,
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
import { structuredPatch } from "../../vendor/diff/libesm/patch/create.js";
import { getWorkspaceDiffRoot } from "../utils/workspaceDiff.js";

//@ chunk-vbr14wv4.js:191-540 placement
/**
 * 按 git 规则给非 ASCII 或特殊字符路径加引号转义
 */
function quoteGitPath(filePath) {
  let bytes = new TextEncoder().encode(filePath);
  if (bytes.every((byte) => byte >= 32 && byte < 127 && byte !== 34 && byte !== 92)) return filePath;
  return `"${Array.from(bytes, (byte) => {
    switch (byte) {
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
        return byte >= 32 && byte <= 126
          ? String.fromCharCode(byte)
          : `\\${byte.toString(8).padStart(3, "0")}`;
    }
  }).join("")}"`;
}
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
  ].map((entryName) => [entryName, SKIP_GIT_ENTRY]),
]);
var VOLATILE_GIT_DIR_ENTRY_PATTERN = /^(?:BISECT_[A-Z_]+|fsmonitor--daemon.*|.+\.lock)$/;
//@ chunk-gfa3ceg6.js:2776-2832 placement
function gitDirEntryPlan(name) {
  return (
    GIT_DIR_ENTRY_PLANS.get(name) ?? (VOLATILE_GIT_DIR_ENTRY_PATTERN.test(name) ? SKIP_GIT_ENTRY : undefined)
  );
}
//@ chunk-gfa3ceg6.js:2832-3642 placement (2.1.88 match: GIT_REBASE_RE, 0.528)
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
async function prepareRepositoryCopy(root, refusalReport, abortSignal) {
  let layout = standardRepoLayout(root);
  if (layout === null || layout.workTree === null) return null;
  if (
    hasRunnerDeclaredNestedRepoDiff() &&
    normalizePathForCompare(layout.workTree) !== normalizePathForCompare(root)
  )
    return refuseDiscoveredRepository("a folder that is no longer the one that was checked", refusalReport);
  let { gitDir, workTree } = layout;
  let copyDir;
  try {
    let vetResult = await vetGitDirEntries(gitDir);
    if (typeof vetResult === "string") return refuseDiscoveredRepository(vetResult, refusalReport);
    let objectsRefusal = await vetGitObjectsDir(join(gitDir, "objects"));
    if (objectsRefusal !== undefined) return refuseDiscoveredRepository(objectsRefusal, refusalReport);
    let diffCopyRoot = await getDiffCopyRoot();
    if (diffCopyRoot === null) return refuseDiscoveredRepository(NO_DIFF_COPY_ROOT_REFUSAL, refusalReport);
    copyDir = await mkdtemp(join(diffCopyRoot, "ccdiff-"));
    let copiedGitDir = copyDir;
    let configRefusal =
      (await copyGitDir(gitDir, copiedGitDir, vetResult)) ??
      (await readUnacceptedGitConfig(copiedGitDir, vetResult.has("config.worktree")));
    if (configRefusal !== undefined) {
      await removeRecursiveQuietly(copiedGitDir);
      return refuseDiscoveredRepository(configRefusal, refusalReport);
    }
    let copiedGitEnv = buildCopiedGitEnv(copiedGitDir, gitDir, workTree);
    if (!(await isGitVersionSupported(root, copiedGitEnv, abortSignal))) {
      await removeRecursiveQuietly(copiedGitDir);
      return refuseDiscoveredRepository(GIT_VERSION_REFUSAL, refusalReport);
    }
    return {
      spawn: copiedGitEnv,
      dispose: () => removeRecursiveQuietly(copiedGitDir),
    };
  } catch (error) {
    if (copyDir !== undefined) await removeRecursiveQuietly(copyDir);
    return refuseDiscoveredRepository(`unexpected error (${errorMessage(error)})`, refusalReport);
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
//@ chunk-gfa3ceg6.js:4763-4839 placement (2.1.88 match: convertDirectoryToZipInPlace, 1)
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
function refuseDiscoveredRepository(reason, reportTarget) {
  logForDebugging(`workspace diff: discovered repository refused (${reason})`, {
    level: "warn",
  });
  if (reportTarget !== undefined) reportDiffProgress(reason, REPORTED_DIFF_REFUSALS_SLOT.of(reportTarget));
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
function reportDiffProgress(reason, reported) {
  if (!hasRunnerDeclaredNestedRepoDiff()) return;
  let line = describeRefusalForUser(reason);
  if (reported.has(line)) return;
  if (reported.size >= MAX_REPORTED_DIFF_REFUSALS) {
    if (!reported.has(LAST_REPORTED_REFUSAL)) {
      reported.add(LAST_REPORTED_REFUSAL);
      process.stderr.write(`${MAX_REASONS_SHOWN_TEXT}
`);
    }
    return;
  }
  reported.add(line);
  process.stderr.write(`${line}
`);
}
//@ chunk-gfa3ceg6.js:5243-5289 placement
function describeRefusalForUser(reason) {
  return `${CHANGES_PANE_PREFIX} ${describeGitDirRefusal(reason)} ${HINT_DIFF_FINDS_NESTED}`;
}
//@ chunk-gfa3ceg6.js:5289-6491 placement
/**
 * 把 .git 检查拒绝原因转成用户可读文字
 */
function describeGitDirRefusal(reason) {
  let match = /^(config entry|config value of|multi-line value for) (.+)$/.exec(reason);
  if (match !== null) {
    let key = match[2] ?? "";
    if (!GIT_CONFIG_KEY_DISPLAY_PATTERN.test(key))
      return "Its own git settings (.git/config or .git/config.worktree) have a setting whose name is not shown: it is too long, or not plain letters, digits and dashes.";
    let howShown = key.includes("<...>")
      ? 'shown in lower case, "<...>" for the middle of its name'
      : "shown in lower case";
    if (match[1] === "config entry")
      return `Its own git settings (.git/config or .git/config.worktree) have the setting "${key}" (${howShown}), which is not one Claude Code accepts there.`;
    return match[1] === "config value of"
      ? `Its own git settings (.git/config or .git/config.worktree) give the setting "${key}" (${howShown}) a value that is not one Claude Code accepts there.`
      : `Its own git settings (.git/config or .git/config.worktree) give the setting "${key}" (${howShown}) a value that runs over several lines.`;
  }
  if (reason === NO_DIFF_COPY_ROOT_REFUSAL) return DIFF_COPY_ROOT_NOT_ABSOLUTE_TEXT;
  if (reason === GIT_VERSION_REFUSAL) return GIT_TOO_OLD_TEXT;
  let head = firstLineOf(reason, " (");
  if (head === "unexpected error")
    return "An unexpected error stopped the check of its .git folder; the session's debug log has the details.";
  return matchesJoinedGitIgnorePattern(head)
    ? `The check of its .git folder stopped at: ${head}.`
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
function buildCopiedGitEnv(copiedGitDir, gitDir, workTree) {
  return {
    env: {
      ...getRemoteHostSessionCount(GIT_FILES_REF_BACKEND_ENV, {
        base: subprocessEnv(),
        repository: {
          gitDir: copiedGitDir,
          workTree,
          commonDir: copiedGitDir,
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
async function vetGitDirEntries(dir) {
  let present = new Set();
  let entryCount = 0;
  for await (let entry of await opendir(dir)) {
    if (++entryCount > GIT_COPY_MAX_ENTRIES) return "oversized .git";
    let plan = gitDirEntryPlan(entry.name);
    if (plan === undefined) return "unknown .git entry";
    switch (plan.disposition) {
      case "skip":
        continue;
      case "refuse":
        return `.git/${entry.name}`;
      case "copy":
      case "in-place":
        if (entry.name === "index") {
          let stat = await lstat(join(dir, entry.name));
          if (!stat.isFile() || stat.nlink > 1) return "symlinked, hardlinked or unexpected .git/index";
        } else if ((await classifyDirent(dir, entry)) !== plan.kind)
          return `symlinked or unexpected .git/${entry.name}`;
        present.add(entry.name);
    }
  }
  if (!present.has("config") || !present.has("HEAD")) return "no .git/config or .git/HEAD";
  return present;
}
//@ chunk-gfa3ceg6.js:7343-7618 placement
/**
 * 检查 .git/objects 无符号链接且无 alternates
 */
async function vetGitObjectsDir(objectsDir) {
  let subdirs = await listPlainSubdirs(objectsDir);
  if (subdirs === null) return "symlinked or oversized .git/objects entry";
  for (let subdir of subdirs)
    if ((await listPlainSubdirs(join(objectsDir, subdir))) === null)
      return "symlinked or oversized .git/objects entry";
  if (await isNonEmptyOrIrregularFile(join(objectsDir, "info", "alternates")))
    return ".git/objects/info/alternates";
  return;
}
//@ chunk-gfa3ceg6.js:7618-8052 placement
/**
 * 把 .git 需要的部分复制到临时目录
 */
async function copyGitDir(gitDir, destGitDir, present) {
  await mkdir(join(destGitDir, "refs"), {
    recursive: true,
  });
  let counter = {
    entries: 0,
    bytes: 0,
  };
  for (let [entryName, plan] of GIT_DIR_ENTRY_PLANS) {
    if (plan.disposition !== "copy" || !present.has(entryName)) continue;
    let srcPath = join(gitDir, entryName);
    let destPath = join(destGitDir, entryName);
    if (plan.kind === "file") {
      if ((await copyBoundedGitFile(srcPath, destPath, plan.maxBytes, counter)) !== "copied")
        return `unreadable, linked or oversized .git/${entryName}`;
      continue;
    }
    await mkdir(destPath, {
      recursive: true,
    });
    if (!(await copyGitDirEntries(srcPath, destPath, plan.maxFileBytes, counter, plan.entries)))
      return `unreadable, linked or oversized entry under .git/${entryName}`;
  }
  return;
}
//@ chunk-gfa3ceg6.js:8052-8773 placement
/**
 * 列出仓库 config 中不被接受的条目
 */
async function readUnacceptedGitConfig(gitDir, hasWorktreeConfig) {
  let acceptedKeys = new Set(gitConfigPairsForCopy().map(([key]) => key.toLowerCase()));
  let configFiles = hasWorktreeConfig ? ["config", "config.worktree"] : ["config"];
  for (let fileName of configFiles) {
    let result = await execFileNoThrow(
      gitExe(),
      ["config", "--file", join(gitDir, fileName), "--no-includes", "-z", "--list"],
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
          GIT_DIR: join(gitDir, "no-repository-here"),
          [CLAUDE_CODE_FOUND_REPOSITORY_GIT]: "1",
        },
        extendEnv: false,
        stdin: "ignore",
      },
    );
    if (result.code !== 0) return `config ${fileName} unlistable`;
    for (let record of result.stdout.split("\x00")) {
      if (record === "") continue;
      let index = record.indexOf(`
`);
      let key = index === -1 ? record : record.slice(0, index);
      let value = index === -1 ? "" : record.slice(index + 1);
      if (
        value.includes(`
`)
      )
        return `multi-line value for ${abbreviateConfigKey(key)}`;
      if (!isAcceptedGitConfigKey(key, value, acceptedKeys))
        return `${isSubmoduleOrRefStorageKey(key) ? "config value of" : "config entry"} ${abbreviateConfigKey(key)}`;
    }
  }
  return;
}
//@ chunk-gfa3ceg6.js:8773-8806 placement
var SUBMODULE_UPDATE_CONFIG_PATTERN = /^submodule\..+\.update$/;
//@ chunk-gfa3ceg6.js:8806-8868 placement
function isSubmoduleOrRefStorageKey(key) {
  return key === "extensions.refstorage" || SUBMODULE_UPDATE_CONFIG_PATTERN.test(key);
}
//@ chunk-gfa3ceg6.js:8868-9041 placement
/**
 * git config 键是否在可接受列表
 */
function isAcceptedGitConfigKey(key, value, acceptedKeys) {
  if (key === "extensions.refstorage") return value === "files";
  if (SUBMODULE_UPDATE_CONFIG_PATTERN.test(key)) return SUBMODULE_UPDATE_MODES.has(value);
  return (
    acceptedKeys.has(key) ||
    ACCEPTED_GIT_CONFIG_PATTERNS.some((pattern) => pattern.test(key)) ||
    (hasRunnerDeclaredNestedRepoDiff() && OPT_IN_GIT_CONFIG_PATTERNS.some((pattern) => pattern.test(key)))
  );
}
//@ chunk-gfa3ceg6.js:9041-9124 placement
function abbreviateConfigKey(key) {
  let parts = key.split(".");
  return parts.length <= 2 ? key : `${parts[0]}.<...>.${parts.at(-1)}`;
}
//@ chunk-gfa3ceg6.js:9124-9503 placement
/**
 * 按白名单递归复制 .git 目录条目
 */
async function copyGitDirEntries(srcDir, destDir, maxFileBytes, counter, allowList) {
  let dir;
  try {
    dir = await opendir(srcDir);
  } catch (error) {
    return isENOENT(error);
  }
  for await (let entry of dir) {
    if (++counter.entries > GIT_SCAN_MAX_ENTRIES) return false;
    if (allowList !== "all" && !allowList.has(entry.name)) continue;
    let srcPath = join(srcDir, entry.name);
    let destPath = join(destDir, entry.name);
    let kind = await classifyDirent(srcDir, entry);
    if (kind === "dir" && allowList === "all") {
      await mkdir(destPath, {
        recursive: true,
      });
      if (!(await copyGitDirEntries(srcPath, destPath, maxFileBytes, counter, "all"))) return false;
    } else if (kind === "file") {
      if ((await copyBoundedGitFile(srcPath, destPath, maxFileBytes, counter)) !== "copied") return false;
    } else return false;
  }
  return true;
}
//@ chunk-gfa3ceg6.js:9503-9758 placement
/**
 * 目录项分类 dir/file/reject（符号链接拒绝）
 */
async function classifyDirent(dir, entry) {
  if (entry.isSymbolicLink()) return "reject";
  if (entry.isDirectory()) return "dir";
  if (entry.isFile()) return "file";
  try {
    let stat = await lstat(join(dir, entry.name));
    return stat.isSymbolicLink() ? "reject" : stat.isDirectory() ? "dir" : stat.isFile() ? "file" : "reject";
  } catch {
    return "reject";
  }
}
//@ chunk-gfa3ceg6.js:9758-9972 placement
/**
 * 列出子目录，遇符号链接或超量返回 null
 */
async function listPlainSubdirs(dir) {
  let handle;
  try {
    handle = await opendir(dir);
  } catch (error) {
    return isENOENT(error) ? [] : null;
  }
  let names = [];
  let count = 0;
  for await (let entry of handle) {
    if (++count > GIT_SCAN_MAX_DEPTH) return null;
    let kind = await classifyDirent(dir, entry);
    if (kind === "reject") return null;
    if (kind === "dir") names.push(entry.name);
  }
  return names;
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
async function copyBoundedGitFile(srcPath, destPath, maxBytes, counter) {
  let handle;
  try {
    handle = await open(srcPath, readOnlyOpenFlags());
  } catch (error) {
    return isENOENT(error) ? "absent" : "refused";
  }
  try {
    let stats = await handle.stat();
    if (!stats.isFile() || stats.nlink > 1 || stats.size > maxBytes) return "refused";
    counter.bytes += stats.size;
    if (counter.bytes > GIT_COPY_TOTAL_MAX_BYTES) return "refused";
    let buffer = Buffer.alloc(stats.size);
    let offset = 0;
    while (offset < stats.size) {
      let { bytesRead } = await handle.read(buffer, offset, stats.size - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== stats.size) return "refused";
    await writeFile(destPath, buffer);
    return "copied";
  } catch {
    return "refused";
  } finally {
    await handle.close().catch(() => {
      return;
    });
  }
}
//@ chunk-gfa3ceg6.js:10516-10685 placement
/**
 * 文件是否非空或非普通文件
 */
async function isNonEmptyOrIrregularFile(filePath) {
  let handle;
  try {
    handle = await open(filePath, readOnlyOpenFlags());
  } catch (error) {
    return !isENOENT(error);
  }
  try {
    let stats = await handle.stat();
    return !stats.isFile() || stats.size > 0;
  } finally {
    await handle.close().catch(() => {
      return;
    });
  }
}
//@ chunk-gfa3ceg6.js:10685-10882 placement
/**
 * 向上找到存在的祖先再拼回路径
 */
async function resolveMissingPath(filePath) {
  let current = dirname(filePath);
  let tailParts = [basename(filePath)];
  for (let j = 0; j < 64; j++) {
    try {
      let realDir = await realpath(current);
      return join(realDir, ...tailParts);
    } catch (error) {
      if (error?.code !== "ENOENT") return;
    }
    let parent = dirname(current);
    if (parent === current) return;
    tailParts.unshift(basename(current));
    current = parent;
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
function isPlainRepoPath(repoPath) {
  if (repoPath.length === 0 || repoPath.startsWith('"')) return false;
  if (/[\u0000-\u001f\u007f\uFFFD]/.test(repoPath)) return false;
  if (
    repoPath.startsWith("-") ||
    repoPath.startsWith(":") ||
    repoPath.includes(" => ") ||
    repoPath.includes("\\") ||
    !isSafeRelativeDiffPath(repoPath)
  )
    return false;
  return repoPath.split("/").every((segment) => segment !== "" && stripTrailingDotsSpaces(segment) !== ".");
}
//@ chunk-gfa3ceg6.js:11266-11415 placement
/**
 * 含不安全字符的路径：去掉 git 的引号转义后重新按 git 规则加引号。
 */
function normalizeDiffPath(rawPath) {
  if (!UNSAFE_PATH_CHAR_PATTERN.test(rawPath)) return rawPath;
  let quoted =
    rawPath.length > 1 && rawPath.startsWith('"') && rawPath.endsWith('"') && !rawPath.includes('" => ');
  return quoteGitPath(quoted ? unquoteGitPathBytes(rawPath.slice(1, -1)) : rawPath);
}
//@ chunk-gfa3ceg6.js:11415-11442 placement
var GIT_OBJECT_ID_PATTERN = /^[0-9a-f]{40,64}$/;
//@ chunk-gfa3ceg6.js:11442-11497 placement
function gitArgs(args) {
  return ["--literal-pathspecs", ...GIT_SAFE_GLOBAL_ARGS, ...args];
}
//@ chunk-gfa3ceg6.js:11497-11569 placement
function gitExecOptions(cwd, options) {
  return {
    ...options,
    cwd,
    timeout: GIT_DIFF_TIMEOUT_MS,
    preserveOutputOnError: false,
  };
}
//@ chunk-gfa3ceg6.js:11569-11994 placement
/**
 * git ls-tree 读取提交中的文件条目
 */
async function readTreeEntries(cwd, rev, paths, options) {
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    gitArgs(["ls-tree", "-r", "-l", "-z", "--full-tree", rev, "--", ...paths]),
    {
      ...gitExecOptions(cwd, options),
      maxBuffer: 1e7,
    },
  );
  if (code !== 0) return null;
  let entries = new Map();
  for (let record of stdout.split("\x00")) {
    if (!record) continue;
    let match = record.match(/^(\d{6}) (\S+) ([0-9a-f]{40,64}) +(\d+|-)\t(.+)$/s);
    if (!match) continue;
    let [, mode = "", type, oid = "", sizeText, path] = match;
    if (path === undefined) continue;
    entries.set(path, {
      mode,
      oid,
      size: type === "blob" && sizeText !== "-" ? Number(sizeText) : -1,
    });
  }
  return entries;
}
//@ chunk-gfa3ceg6.js:11994-12372 placement
/**
 * git ls-files --stage 读取索引条目
 */
async function readIndexEntries(cwd, paths, options) {
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    gitArgs(["ls-files", "--stage", "-v", "-z", "--", ...paths]),
    {
      ...gitExecOptions(cwd, options),
      maxBuffer: 1e7,
    },
  );
  if (code !== 0) return null;
  let entries = new Map();
  for (let record of stdout.split("\x00")) {
    let match = record.match(/^(\S) (\d{6}) ([0-9a-f]{40,64}) (\d)\t(.+)$/s);
    if (!match) continue;
    let [, flags = "", , oid = "", stage, path = ""] = match;
    entries.set(path, {
      entryIsNewSide: stage === "0" && (flags === "S" || /[a-z]/.test(flags)),
      oid,
    });
  }
  return entries;
}
//@ chunk-gfa3ceg6.js:12372-12535 placement
/**
 * 计算 git blob 哈希（sha1/sha256）
 */
function gitBlobHash(content, oid) {
  let buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
  return createHash(oid.length === 64 ? "sha256" : "sha1")
    .update(`blob ${buffer.length}\x00`)
    .update(buffer)
    .digest("hex");
}
//@ chunk-gfa3ceg6.js:12535-12664 placement
/**
 * 文本的 git blob 哈希与目标一致则返回；否则试把 CRLF 换成 LF 再比，仍不符返回 null。
 */
function matchBlobAllowingCrlf(content, oid) {
  if (gitBlobHash(content, oid) === oid) return content;
  if (
    !content.includes(`\r
`)
  )
    return null;
  let content_2 = content.replaceAll(
    `\r
`,
    `
`,
  );
  return gitBlobHash(content_2, oid) === oid ? content_2 : null;
}
//@ chunk-gfa3ceg6.js:12664-12940 placement
/**
 * git cat-file 读取 blob 并核对哈希
 */
async function readGitBlob(cwd, oid, options) {
  if (!GIT_OBJECT_ID_PATTERN.test(oid)) return null;
  let { stdout, code } = await execFileNoThrowWithCwd(gitExe(), gitArgs(["cat-file", "blob", oid]), {
    ...gitExecOptions(cwd, options),
    maxBuffer: MAX_TOTAL_DIFF_BYTES + 65536,
    stripFinalNewline: false,
    encoding: "latin1",
  });
  if (code !== 0) return null;
  let buffer = Buffer.from(stdout, "latin1");
  return gitBlobHash(buffer, oid) === oid ? buffer.toString("utf-8") : null;
}
//@ chunk-gfa3ceg6.js:12940-13757 placement
/**
 * 有界读取工作区文件，区分缺失/受限/非普通文件
 */
async function readWorkingFileForDiff(filePath, canonicalPath, settings) {
  let handle;
  try {
    handle = await open(filePath, NOFOLLOW_READ_FLAGS);
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
    let expectedIdentity = await handle.stat({
      bigint: true,
    });
    if (!expectedIdentity.isFile())
      return {
        kind: "not-regular-file",
      };
    if (expectedIdentity.nlink !== 1n || expectedIdentity.dev === 0n || expectedIdentity.ino === 0n)
      return {
        kind: "restricted",
      };
    let resolvedPath;
    try {
      resolvedPath = await realpath(filePath);
    } catch {
      return {
        kind: "restricted",
      };
    }
    let boundPath = await bindCanonicalPathToHandle(handle, expectedIdentity, resolvedPath);
    if (boundPath === undefined)
      return {
        kind: "restricted",
      };
    resolvedPath = boundPath;
    if (
      !isPathAllowed(resolvedPath, settings, "read").allowed ||
      matchingRuleForInput(resolvedPath, settings, "read", "ask") !== null
    )
      return {
        kind: "restricted",
      };
    if (pathVettingReason(resolvedPath, settings.trustedNetworkDirectories) !== undefined)
      return {
        kind: "restricted",
      };
    if (!(await isCanonicalPathContained(resolvedPath, settings)))
      return {
        kind: "restricted",
      };
    if (resolvedPath !== canonicalPath)
      return {
        kind: "off-path",
      };
    let handleBounded = await readHandleBounded(handle, MAX_TOTAL_DIFF_BYTES, expectedIdentity.size);
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
    await handle.close().catch(() => {});
  }
}
//@ chunk-gfa3ceg6.js:13757-13930 placement
/**
 * 仓库根是否在受信网络目录内且通过校验
 */
async function isTrustedRepositoryRoot(dir, settings) {
  let real;
  try {
    real = await realpath(dir);
  } catch (error) {
    real = error?.code === "ENOENT" ? await resolveMissingPath(dir) : undefined;
  }
  return (
    real !== undefined &&
    pathVettingReason(real, settings.trustedNetworkDirectories) === undefined &&
    (await isCanonicalPathContained(real, settings))
  );
}
//@ chunk-gfa3ceg6.js:13930-14437 placement
/**
 * git check-attr 读取各路径的 text/eol 属性
 */
async function readGitAttributes(cwd, paths, options) {
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    gitArgs(["check-attr", "-z", "-a", "--", ...paths]),
    {
      ...gitExecOptions(cwd, options),
      maxBuffer: 1e7,
    },
  );
  if (code !== 0) return null;
  let attributes = new Map(
    paths.map((path) => [
      path,
      {
        text: "unspecified",
        eol: "unspecified",
        converted: false,
      },
    ]),
  );
  let parts = stdout.split("\x00");
  for (let index = 0; index + 2 < parts.length; index += 3) {
    let path = parts[index];
    let attribute = parts[index + 1];
    let value = parts[index + 2];
    if (path === undefined || attribute === undefined || value === undefined) continue;
    let record = attributes.get(path);
    if (!record) continue;
    if (attribute === "text") record.text = value;
    else if (attribute === "eol") record.eol = value;
    else if (attribute === "filter" || attribute === "working-tree-encoding") record.converted = true;
  }
  return attributes;
}
//@ chunk-gfa3ceg6.js:14437-14640 placement
/**
 * 读取 core.autocrlf
 */
async function readCoreAutocrlf(cwd, options) {
  let { stdout, exitCode } = await execFileNoThrowWithCwd(
    gitExe(),
    gitArgs(["config", "--get", "core.autocrlf"]),
    gitExecOptions(cwd, options),
  );
  if (exitCode !== 0) return false;
  let lower = stdout.trim().toLowerCase();
  return lower === "true" ? "true" : lower === "input" ? "input" : false;
}
//@ chunk-gfa3ceg6.js:14640-14695 placement
function hasNulByte(content) {
  return content.slice(0, 8000).includes("\x00");
}
//@ chunk-gfa3ceg6.js:14695-15079 placement
/**
 * 按 gitattributes text/eol 与 autocrlf 判定是否换行转换
 */
function shouldNormalizeEol(content, attributes, coreAutocrlf, baseContent) {
  if (!attributes || attributes.converted) return "unsupported";
  if (attributes.text === "unset") return content;
  let normalize;
  if (attributes.text === "set") normalize = false;
  else if (attributes.text === "auto") normalize = true;
  else if (attributes.text === "unspecified") {
    if (coreAutocrlf === "true" || coreAutocrlf === "input") normalize = true;
    else if (attributes.eol === "crlf" || attributes.eol === "lf") normalize = true;
    else return content;
  } else return content;
  if (
    !content.includes(`\r
`)
  )
    return content;
  if (
    normalize &&
    (hasNulByte(content) ||
      baseContent.includes(`\r
`))
  )
    return content;
  return content.replaceAll(
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
function buildDiffHunks(oldContent, newContent, timeout) {
  let patch = structuredPatch("a", "b", oldContent, newContent, "", "", {
    context: 3,
    maxEditLength: MAX_DIFF_FILES,
    timeout,
  });
  if (!patch) return null;
  return patch.hunks
    .map((hunk) => ({
      oldStart: hunk.oldStart,
      oldLines: hunk.oldLines,
      newStart: hunk.newStart,
      newLines: hunk.newLines,
      lines: hunk.lines.filter((line) => !line.startsWith("\\")),
    }))
    .filter((hunk) => hunk.lines.length > 0);
}
//@ chunk-gfa3ceg6.js:15369-15498 placement
/**
 * 按全局行数上限截断 diff hunk 的行。
 */
function capHunkLines(diffHunks) {
  let remaining = MAX_HUNK_LINE_COUNT;
  let capped = [];
  for (let hunk of diffHunks) {
    if (remaining <= 0) break;
    let sliced = hunk.lines.slice(0, remaining);
    remaining -= sliced.length;
    capped.push({
      ...hunk,
      lines: sliced,
    });
  }
  return capped;
}
//@ chunk-gfa3ceg6.js:15498-15745 placement
/**
 * 为桥接生成工作区 diff：先检查并复制 .git，再在副本上计算相对分支点的 diff。
 */
async function buildWorkspaceDiffResponse(host, settings, budget = DIFF_READ_TIMEOUTS) {
  let workspaceDiffRoot = await getWorkspaceDiffRoot();
  if (workspaceDiffRoot === null)
    return {
      diff: null,
    };
  let root = workspaceDiffRoot.nested ? workspaceDiffRoot.root : null;
  let copy = root === null ? null : await prepareRepositoryCopy(root, host);
  if (root !== null && copy === null)
    return {
      diff: null,
    };
  try {
    return await computeWorkspaceDiff(host, settings, budget, workspaceDiffRoot.root, root, copy?.spawn);
  } finally {
    await copy?.dispose();
  }
}
//@ chunk-gfa3ceg6.js:15745-18379 placement
/**
 * 计算工作区相对分支点的 diff 与逐文件统计
 */
async function computeWorkspaceDiff(host, settings, budget, root, root_2, diffOptions) {
  let nestedRoot = root_2 ?? undefined;
  let gitOptions = diffOptions ?? {};
  let gitDiff = await fetchGitDiff(host, undefined, "branch-point", nestedRoot, diffOptions);
  if (gitDiff === null)
    return {
      diff: null,
    };
  let topLevel = root_2 ?? (await getRepoTopLevel());
  if (topLevel === null || topLevel !== root)
    return {
      diff: null,
    };
  let baseRef = diffBaseRef(gitDiff);
  let buildResponse = (result) => ({
    diff: {
      stats: gitDiff.stats,
      perFileStats: Array.from(gitDiff.perFileStats, ([path, stats]) => ({
        path: normalizeDiffPath(path),
        ...stats,
      })),
      hunks: result.hunks.map((hunk) => ({
        ...hunk,
        path: normalizeDiffPath(hunk.path),
      })),
      skippedLarge: result.skippedLarge.map(normalizeDiffPath),
      restricted: result.restricted.map(normalizeDiffPath),
      source: gitDiff.source,
    },
  });
  let candidates = [];
  for (let [key, stat] of gitDiff.perFileStats) {
    let newPath = stat.newPath ?? key;
    let previousPath = stat.previousPath ?? newPath;
    if (
      stat.status === undefined ||
      stat.isUntracked ||
      stat.isBinary ||
      !isPlainRepoPath(previousPath) ||
      !isPlainRepoPath(newPath)
    )
      continue;
    candidates.push({
      key,
      oldPath: previousPath,
      newPath,
      removed: stat.status === "removed",
    });
  }
  if (candidates.length === 0)
    return buildResponse({
      hunks: [],
      skippedLarge: [],
      restricted: [],
    });
  let staged = baseRef === "--cached";
  if (!staged && baseRef !== "HEAD" && !GIT_OBJECT_ID_PATTERN.test(baseRef))
    return buildResponse({
      hunks: [],
      skippedLarge: [],
      restricted: [],
    });
  let paths = candidates.map((entry) => entry.newPath);
  let [treeEntries, indexEntries] = await Promise.all([
    staged
      ? new Map()
      : readTreeEntries(
          topLevel,
          baseRef,
          candidates.map((entry) => entry.oldPath),
          gitOptions,
        ),
    readIndexEntries(topLevel, paths, gitOptions),
  ]);
  if (treeEntries === null || indexEntries === null)
    return buildResponse({
      hunks: [],
      skippedLarge: [],
      restricted: [],
    });
  let realTopLevel;
  try {
    realTopLevel = await realpath(topLevel);
  } catch {
    return buildResponse({
      hunks: [],
      skippedLarge: [],
      restricted: [],
    });
  }
  let gitAttributes = await readGitAttributes(topLevel, paths, gitOptions);
  let coreAutocrlf = await readCoreAutocrlf(topLevel, gitOptions);
  let skippedLarge = [];
  let restricted = [];
  let hunks = [];
  let remainingBytes = MAX_DIFF_BLOB_BYTES;
  let totalMs = budget.totalMs;
  for (let { key, oldPath, newPath, removed } of candidates) {
    await new Promise((resolve) => setImmediate(resolve));
    let newFullPath = join(topLevel, newPath);
    let oldFullPath = join(topLevel, oldPath);
    let pathsToCheck = [];
    for (let fullPath of new Set([newFullPath, oldFullPath])) {
      let vet = vetPathSpellingsOrChain(fullPath, fullPath, settings.trustedNetworkDirectories);
      if (!vet.ok) {
        pathsToCheck = null;
        break;
      }
      pathsToCheck.push(...vet.pathsToCheck);
    }
    if (pathsToCheck === null) {
      restricted.push(key);
      continue;
    }
    if (
      !pathsToCheck.every(
        (spelling) =>
          isPathAllowed(spelling, settings, "read").allowed &&
          matchingRuleForInput(spelling, settings, "read", "ask") === null,
      )
    ) {
      restricted.push(key);
      continue;
    }
    let oldEntry = treeEntries.get(oldPath);
    if (oldEntry && !REGULAR_FILE_MODES.has(oldEntry.mode)) continue;
    if (oldEntry && (oldEntry.size < 0 || oldEntry.size > MAX_TOTAL_DIFF_BYTES)) {
      skippedLarge.push(key);
      continue;
    }
    let workingContent = null;
    let indexEntry = indexEntries.get(newPath);
    if (indexEntry === undefined && !oldEntry) {
      restricted.push(key);
      continue;
    }
    let readResult =
      removed || indexEntry === undefined
        ? {
            kind: "missing",
          }
        : await readWorkingFileForDiff(newFullPath, join(realTopLevel, newPath), settings);
    if (readResult.kind === "restricted") {
      restricted.push(key);
      continue;
    }
    if (readResult.kind === "not-regular-file" || readResult.kind === "off-path") continue;
    if (readResult.kind === "too-large") {
      skippedLarge.push(key);
      continue;
    }
    let matchedBlob =
      indexEntry?.entryIsNewSide && readResult.kind === "ok"
        ? matchBlobAllowingCrlf(readResult.content, indexEntry.oid)
        : null;
    if (indexEntry?.entryIsNewSide && matchedBlob === null) continue;
    if (readResult.kind === "missing") {
      if (!oldEntry) continue;
      if (!(await isTrustedRepositoryRoot(oldFullPath, settings))) {
        restricted.push(key);
        continue;
      }
    } else {
      workingContent = readResult.content;
      if (oldEntry && oldPath !== newPath && !(await isTrustedRepositoryRoot(oldFullPath, settings))) {
        restricted.push(key);
        continue;
      }
    }
    if (totalMs <= 0) {
      skippedLarge.push(key);
      continue;
    }
    let oldContent = oldEntry ? await readGitBlob(topLevel, oldEntry.oid, gitOptions) : "";
    if (oldContent === null) continue;
    let baseContent = oldContent;
    let newContent;
    if (workingContent === null) newContent = "";
    else {
      let normalized = shouldNormalizeEol(
        workingContent,
        gitAttributes?.get(newPath),
        coreAutocrlf,
        baseContent,
      );
      if (normalized === "unsupported") continue;
      newContent = matchedBlob ?? normalized;
    }
    let now = Date.now();
    let diffHunks = buildDiffHunks(baseContent, newContent, Math.min(budget.perFileMs, totalMs));
    totalMs -= Date.now() - now;
    if (diffHunks === null) {
      skippedLarge.push(key);
      continue;
    }
    let cappedHunks = capHunkLines(diffHunks);
    if (cappedHunks.length === 0) continue;
    let reduced = cappedHunks.reduce(
      (acc, hunk) => acc + hunk.lines.reduce((acc, line) => acc + line.length + 1, 0),
      0,
    );
    if (reduced > MAX_SINGLE_FILE_DIFF_BYTES || reduced > remainingBytes) {
      skippedLarge.push(key);
      continue;
    }
    remainingBytes -= reduced;
    hunks.push({
      path: key,
      hunks: cappedHunks,
    });
  }
  return buildResponse({
    hunks,
    skippedLarge,
    restricted,
  });
}
export { buildWorkspaceDiffResponse };
