/**
 * bridge/workspaceDiff.ts
 *
 * 2.1.316 新增。为 Remote Control 生成工作区 diff：检查并复制 .git 到临时目录，在副本上按分支点计算 diff。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-76nr5kns.js (1), chunk-hma1b5gv.js (45), chunk-y7x9ddxy.js (22)
 * attribution: placement 68
 */
import { join, isAbsolute, resolve, basename, dirname } from "path";
import {
  mkdtemp,
  mkdir,
  rm,
  opendir,
  lstat,
  open,
  writeFile,
  readdir,
  appendFile,
  access,
  realpath,
} from "fs/promises";
import { tmpdir } from "os";
import { constants } from "fs";
import { createHash } from "crypto";
import {
  standardRepoLayout,
  GIT_DIFF_TIMEOUT_MS,
  getDiffCwd,
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
import { errorMessage, isENOENT, isPathAbsent } from "../utils/errors.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "../utils/execFileNoThrow.js";
import { gitExe, findGitRootUncached } from "../utils/git.js";
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
import { firstLineOf, urlPatternToRegex, trimEndChars } from "../utils/stringUtils.js";
import {
  getGitSafetyConfigPairs,
  buildGitConfigEnv,
  CLAUDE_CODE_FOUND_REPOSITORY_GIT,
  GitStartFolderError,
} from "../utils/gitSafeExec.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { GIT_FILES_REF_BACKEND_ENV } from "../utils/git/gitLanes.js";
import { subprocessEnv } from "../utils/subprocessEnv.js";
import { ISOLATED_GIT_CONFIG_ENV, DEV_NULL } from "../utils/git/gitIndexReader.js";
import { getPlatform } from "../utils/platform.js";
import {
  BACKUP_OR_COPY_SUFFIX_RE,
  SENSITIVE_DIR_NAMES,
  SENSITIVE_DIR_PATHS,
  CREDENTIAL_CONFIG_PATHS,
  MAX_NAME_READING_LENGTH,
  getPathNormalizationVariants,
  nameReadingFns,
  stripTrailingJunk,
  expandNameReadings,
  MAX_NAME_VARIANTS,
  isSensitiveBasename,
  isSensitiveFileNameLike,
  segmentReadingsFlat,
  pathSeparatorRegex,
  exceedsPathVariantBudget,
  containsSegmentSequence,
  isClaudeStatePathVariant,
  hasConfigUnderGitDir,
  getUnicodeFoldVariants,
  getPathAliasVariants,
  segmentReadingsCaseFolded,
  isCredentialConfigPath_2,
  isSensitiveBasenameWithVariants,
  isInGlobalClaudeFolder,
  isSensitiveWithGitConfig,
} from "../utils/permissions/sensitivePaths.js";
import { normalizeCaseForComparison_2, matchingRuleForInput } from "../utils/permissions/filesystem.js";
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { claudeStateGlobEntriesExact } from "../utils/permissions/claudeStatePaths.js";
import { GIT_FILES_ALWAYS_ALLOWED, isGitRepoDir } from "../utils/git/gitDirProbe.js";
import {
  shouldUseMultiRepoDiff,
  claudeConfigPrefixesFor,
  getWorkspaceDiffRoot,
} from "../utils/workspaceDiff.js";
import { claimOnceStore } from "../services/api/verificationRequired.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { getGitRepoCache } from "../utils/git/gitRepoCache.js";
import { yieldToEventLoop } from "../native-ts/file-index/index.js";
import { chunk_default } from "../../vendor/lodash-es/chunk.js";
import { getSessionStartTime } from "../bootstrap/state.js";
import { isPathAllowed } from "../utils/permissions/pathValidation.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../utils/git/gitSafeEnv.js";
import { REMOTE_READ_OPEN_FLAGS, isCanonicalPathContained } from "../services/remoteTools/remoteFileRead.js";
import { stripTrailingDotsSpaces } from "../utils/ignorePatterns.js";
import { bindCanonicalPathToHandle, readHandleBounded } from "../utils/fsSafety/boundOpen.js";
import { pathVettingReason, vetPathSpellingsOrChain } from "../utils/permissions/pathVetting.js";
import { structuredPatch } from "../../vendor/diff/libesm/patch/create.js";

//@ chunk-hma1b5gv.js:4964-6288 placement
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
//@ chunk-hma1b5gv.js:6288-6344 placement
function gitDirEntryPlan(name) {
  return (
    GIT_DIR_ENTRY_PLANS.get(name) ?? (VOLATILE_GIT_DIR_ENTRY_PATTERN.test(name) ? SKIP_GIT_ENTRY : undefined)
  );
}
//@ chunk-hma1b5gv.js:6344-7154 placement (2.1.88 match: GIT_REBASE_RE, 0.529)
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
//@ chunk-hma1b5gv.js:7154-7825 placement
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
//@ chunk-hma1b5gv.js:7825-7877 placement
var GIT_VERSION_REFUSAL = "git older than 2.32, or its version unread";
//@ chunk-hma1b5gv.js:7877-8085 placement
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
//@ chunk-hma1b5gv.js:8085-8117 placement
var NO_DIFF_COPY_ROOT_REFUSAL = "no folder for the copy";
//@ chunk-hma1b5gv.js:8117-8272 placement
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
//@ chunk-hma1b5gv.js:8272-8348 placement (2.1.88 match: convertDirectoryToZipInPlace, 1)
async function removeRecursiveQuietly(dirPath) {
  await rm(dirPath, {
    recursive: true,
    force: true,
  }).catch(() => {
    return;
  });
}
//@ chunk-hma1b5gv.js:8348-8478 placement
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
//@ chunk-hma1b5gv.js:8478-8570 placement
var REPORTED_DIFF_REFUSALS_SLOT = new HostScoped(() => new Set());
var MAX_REPORTED_DIFF_REFUSALS = 8;
var LAST_REPORTED_REFUSAL = "";
var GIT_CONFIG_KEY_DISPLAY_PATTERN = /^[a-z0-9-]{1,40}(?:\.<\.\.\.>)?\.[a-z0-9-]{1,40}$/;
//@ chunk-hma1b5gv.js:8570-8752 placement
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
//@ chunk-hma1b5gv.js:8752-8798 placement
function describeRefusalForUser(reason) {
  return `${CHANGES_PANE_PREFIX} ${describeGitDirRefusal(reason)} ${HINT_DIFF_FINDS_NESTED}`;
}
//@ chunk-hma1b5gv.js:8798-10000 placement
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
//@ chunk-hma1b5gv.js:10000-10037 placement
function gitConfigPairsForCopy() {
  return [...getGitSafetyConfigPairs(), ...GIT_COPY_EXTRA_CONFIG];
}
//@ chunk-hma1b5gv.js:10037-10283 placement
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
//@ chunk-hma1b5gv.js:10283-10852 placement
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
//@ chunk-hma1b5gv.js:10852-11127 placement
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
//@ chunk-hma1b5gv.js:11127-11561 placement
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
//@ chunk-hma1b5gv.js:11561-12281 placement
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
//@ chunk-hma1b5gv.js:12281-12314 placement
var SUBMODULE_UPDATE_CONFIG_PATTERN = /^submodule\..+\.update$/;
//@ chunk-hma1b5gv.js:12314-12376 placement
function isSubmoduleOrRefStorageKey(key) {
  return key === "extensions.refstorage" || SUBMODULE_UPDATE_CONFIG_PATTERN.test(key);
}
//@ chunk-hma1b5gv.js:12376-12549 placement
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
//@ chunk-hma1b5gv.js:12549-12632 placement
function abbreviateConfigKey(key) {
  let parts = key.split(".");
  return parts.length <= 2 ? key : `${parts[0]}.<...>.${parts.at(-1)}`;
}
//@ chunk-hma1b5gv.js:12632-13012 placement
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
//@ chunk-hma1b5gv.js:13012-13268 placement
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
//@ chunk-hma1b5gv.js:13268-13483 placement
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
//@ chunk-hma1b5gv.js:13483-13568 placement
function readOnlyOpenFlags() {
  return getPlatform() === "windows"
    ? constants.O_RDONLY
    : constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW;
}
//@ chunk-hma1b5gv.js:13568-14027 placement
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
//@ chunk-hma1b5gv.js:14027-14196 placement
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
//@ chunk-hma1b5gv.js:14231-14777 placement
/**
 * 判断“像密钥/凭据”的路径正则集合与环境文件、settings/config 白名单。
 */
var regExp = new RegExp(
  String.raw`^[#.]*(\.env(\..*)?|\.envrc|.*\.(pem|key|p12|pfx|p8|ppk|keystore|jks)|.*_(rsa|dsa|ecdsa|ed25519)(_sk(_rk(_.*)?)?)?|.*credentials.*|device-keys\.json.*|.*secrets?\.(ya?ml|json|toml)|terraform\.tfvars(\.json)?|\.netrc|\.npmrc|\.pypirc|deploykey|kubeconfig(\.(ya?ml|json))?)(` +
    BACKUP_OR_COPY_SUFFIX_RE +
    String.raw`|#)*$`,
  "is",
);
var SENSITIVE_SEGMENTS = [...SENSITIVE_DIR_NAMES.map((name) => [name]), ...SENSITIVE_DIR_PATHS];
var filtered = SENSITIVE_SEGMENTS.filter(
  ([first, second]) => first !== ".claude" || second !== "settings.json",
);
var GIT_CONFIG_NAMES = ["config", "config.worktree", "config.lock", "config.worktree.lock"];
var max = Math.max(...SENSITIVE_SEGMENTS.map((segment) => segment.length));
var ASCII_ONLY = /^[\x00-\x7f]*$/;
//@ chunk-hma1b5gv.js:14777-14831 placement
function toGlobTail(text) {
  return text.slice(0, 1) + firstLineOf(text.slice(1), ".");
}
//@ chunk-hma1b5gv.js:14831-14926 placement
var regExp_2 = new RegExp(
  normalizeCaseForComparison_2([
    ...SENSITIVE_SEGMENTS.map(([pair]) => toGlobTail(pair ?? "")),
    ...CREDENTIAL_CONFIG_PATHS.map(([, entry]) => toGlobTail(entry)),
  ])
    .map(urlPatternToRegex)
    .join("|"),
);
//@ chunk-hma1b5gv.js:14926-15220 placement
function isSensitiveName(name) {
  if (name.length > MAX_NAME_READING_LENGTH) return true;
  let pathNormalizationVariants = getPathNormalizationVariants(name);
  if (pathNormalizationVariants === null) return true;
  let mapped = [
    ...nameReadingFns(name).map((reader) => reader(stripTrailingJunk(name))),
    name.toLowerCase(),
  ].map((variant) => expandNameReadings(variant));
  return (
    regExp.test(name) ||
    mapped.some((readings) => readings.length > MAX_NAME_VARIANTS) ||
    normalizeCaseForComparison_2([
      ...mapped.flat(),
      ...pathNormalizationVariants.map((pathNormalizationVariant) => pathNormalizationVariant.toLowerCase()),
    ]).some(
      (candidate) =>
        regExp.test(candidate) ||
        (isSensitiveBasename(candidate) && name !== ".mcp.json") ||
        isSensitiveFileNameLike(candidate),
    )
  );
}
//@ chunk-hma1b5gv.js:15220-17188 placement
/**
 * 把 diff 文件清单过滤成可展示的集合：剔除 .git、settings.json、node_modules 等噪声路径。
 */
function makeSensitivePathMatcher(rootPath) {
  let readingsOf = memoizeAlias((name) => segmentReadingsFlat(name));
  let filtered_2 = rootPath.split(pathSeparatorRegex()).filter((_) => _ !== "");
  let joined = [...filtered_2, "x"].join("/");
  let pathNormalizationVariants = getPathNormalizationVariants(joined);
  let mapped = [joined, ...(pathNormalizationVariants ?? [])].map((candidate) =>
    candidate.split("/").slice(0, -1),
  );
  let mapped_2 = mapped.map((segments) => segments.map((segment) => readingsOf(segment)));
  let rootPrefix = `${/^[a-z]:/i.test(rootPath) ? "" : "/"}${filtered_2.map((segment) => `${segment}/`).join("")}`;
  let canUseStatePaths =
    pathNormalizationVariants !== null && isAbsolute(rootPath) && !exceedsPathVariantBudget(`${rootPrefix}x`);
  if (
    mapped_2.some((segments) =>
      SENSITIVE_SEGMENTS.some((sensitive) => containsSegmentSequence(segments, sensitive)),
    ) ||
    (canUseStatePaths && isClaudeStatePathVariant(`${rootPrefix}x`))
  )
    return () => true;
  let stateTails = canUseStatePaths
    ? claudeStateGlobEntriesExact().flatMap(({ literal, tail }) => {
        let mapped_2 = literal
          .split(/[\\/]/)
          .filter((literal) => literal !== "")
          .map((segment) => segment.toLowerCase());
        let found = tail
          .toLowerCase()
          .split(/[*?[\]/]/)
          .find((part) => part !== "");
        return mapped
          .filter((candidate) =>
            candidate
              .slice(0, mapped_2.length)
              .every(
                (candidateSegment, index) =>
                  candidateSegment.toLowerCase() === mapped_2[index] ||
                  readingsOf(candidateSegment).includes(mapped_2[index] ?? ""),
              ),
          )
          .map((candidate) => toGlobTail(mapped_2[candidate.length] ?? found ?? ""));
      })
    : [];
  let stateTailPattern =
    stateTails.length === 0
      ? null
      : new RegExp(normalizeCaseForComparison_2(stateTails).map(urlPatternToRegex).join("|"));
  let any = mapped_2.some((segments) => hasConfigUnderGitDir([...segments, ["config"]]));
  let flattened = mapped_2.flatMap((segments) =>
    Array.from(
      {
        length: max - 1,
      },
      (unused, depth) => segments.slice(-(depth + 1)),
    ).filter((tailSegments) =>
      SENSITIVE_SEGMENTS.some(
        (sensitive) =>
          sensitive.length > tailSegments.length &&
          containsSegmentSequence(tailSegments, sensitive.slice(0, tailSegments.length)),
      ),
    ),
  );
  let credentialConfigNames = normalizeCaseForComparison_2(
    mapped_2.flatMap((segments) =>
      CREDENTIAL_CONFIG_PATHS.map(([literal]) => literal).filter((literal) =>
        segments.at(-1)?.includes(literal),
      ),
    ),
  );
  let simplePrefix = flattened.length === 0 && credentialConfigNames.length === 0;
  return (inputPath) => {
    if (exceedsPathVariantBudget(inputPath)) return true;
    let lower = inputPath.toLowerCase();
    let matches = ASCII_ONLY.test(inputPath);
    let caseFoldings = [inputPath, ...getUnicodeFoldVariants(inputPath)];
    let flattened_2 = caseFoldings.flatMap(getPathAliasVariants);
    let allForms = [...caseFoldings, ...flattened_2];
    let mapped = flattened_2.map((variant) => `/${trimEndChars(variant, "/")}`);
    if (
      normalizeCaseForComparison_2(
        allForms.map(
          (form) =>
            form
              .split("/")
              .filter((part) => part !== "")
              .at(-1) ?? "",
        ),
      ).some(
        (basename) =>
          isSensitiveName(basename) ||
          (basename === ".mcp.json" && !inputPath.endsWith(basename)) ||
          segmentReadingsCaseFolded(basename).some(
            (variant) => isSensitiveFileNameLike(variant) || (any && GIT_CONFIG_NAMES.includes(variant)),
          ),
      ) ||
      mapped.some((mappedPath) => mappedPath.endsWith("/.mcp.json")) ||
      (stateTailPattern !== null &&
        (!matches || stateTailPattern.test(lower)) &&
        caseFoldings.some((form) => isClaudeStatePathVariant(`${rootPrefix}${form}`)))
    )
      return true;
    let index = lower.indexOf(".git");
    let gitSlashIndex = index === -1 ? -1 : lower.indexOf("/", index);
    if (
      simplePrefix &&
      matches &&
      !regExp_2.test(lower) &&
      (gitSlashIndex === -1 || !lower.includes("config", gitSlashIndex))
    )
      return false;
    let effectiveSegments =
      `/${rootPrefix}${inputPath}`.endsWith("/.claude/settings.json") &&
      !mapped.some((mappedPath) => mappedPath.endsWith("/.claude/settings.json"))
        ? filtered
        : SENSITIVE_SEGMENTS;
    let pathNormalizationVariants = getPathNormalizationVariants(inputPath);
    return (
      pathNormalizationVariants === null ||
      ["", ...credentialConfigNames.map((name) => `${name}/`)].some((prefix) =>
        caseFoldings.some((form) => isCredentialConfigPath_2(`${prefix}${form}`)),
      ) ||
      normalizeCaseForComparison_2([...allForms, ...pathNormalizationVariants]).some((form) => {
        let segments = form
          .split("/")
          .filter((part) => part !== "")
          .map((part, index, parts) =>
            index === parts.length - 1 ? segmentReadingsCaseFolded(part) : readingsOf(part),
          );
        return (
          segments.some((readings) => readings.length > MAX_NAME_VARIANTS) ||
          isSensitiveBasenameWithVariants(form) ||
          hasConfigUnderGitDir(segments) ||
          [[], ...flattened].some(
            (variant) =>
              effectiveSegments.some((sensitive) =>
                containsSegmentSequence([...variant, ...segments], sensitive),
              ) || isInGlobalClaudeFolder([...variant, ...segments]),
          )
        );
      })
    );
  };
}
//@ chunk-hma1b5gv.js:17188-17764 placement
/**
 * diff 相关常量：空 blob/tree 的 SHA、UUID 与项目路径正则、默认忽略目录。
 */
var E69DE29BB2D1D6434B8B29AE775AD8C2E48C5391 = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
var EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
var MAX_LISTED_FILES = 1e4;
var BATCH_SIZE = 256;
var MAX_DEPTH = 32;
var regExp_3 = new RegExp(`^(?:[^/]*/){${MAX_DEPTH + 1}}`);
var CREDENTIAL_LIKE_NAMES = [
  ...GIT_CONFIG_NAMES,
  "head",
  ...GIT_FILES_ALWAYS_ALLOWED.map((name) => name.toLowerCase()),
];
var UUID_SOURCE = "[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}";
var regExp_4 = new RegExp(`^((?:[^]*\\/)?)projects\\/[^/]+\\/${UUID_SOURCE}\\.jsonl$`);
var regExp_5 = new RegExp(`^${UUID_SOURCE}\\.jsonl$`);
var MAX_PROJECT_DIRS = 256;
var NEEDS_QUOTING = /[^\x20-\x7e]|["\\]/;
var MAX_FILE_BYTES = 20000000;
var BYTE_BUDGET = 1e8;
var KEPT_DOTFILES = [".gitignore", ".gitattributes"];
var IGNORED_DIRS = ["node_modules", "site-packages", "__pycache__"];
var joined = [
  "/.*",
  ...KEPT_DOTFILES.map((name) => `!/${name}`),
  ".*/",
  ...IGNORED_DIRS.map((name) => `${name}/`),
  "",
].join(`
`);
//@ chunk-hma1b5gv.js:17764-17900 placement
function isIgnoredPath(path) {
  let sliced = path.split("/").slice(0, -1);
  return (
    (path.startsWith(".") && !KEPT_DOTFILES.includes(path)) ||
    sliced.some((segment) => segment.startsWith(".") || IGNORED_DIRS.includes(segment))
  );
}
//@ chunk-hma1b5gv.js:17900-18161 placement
var SCRATCH_GIT_CONFIG = `[core]
	repositoryformatversion = 0
	bare = false
	excludesFile = ${DEV_NULL}
	attributesFile = ${DEV_NULL}
`;
var COMMIT_IDENTITY = {
  GIT_AUTHOR_NAME: "Claude Code",
  GIT_AUTHOR_EMAIL: "noreply@anthropic.com",
  GIT_COMMITTER_NAME: "Claude Code",
  GIT_COMMITTER_EMAIL: "noreply@anthropic.com",
};
//@ chunk-hma1b5gv.js:18161-18184 placement
function isWorkspaceDiffOn() {
  return false;
}
//@ chunk-hma1b5gv.js:18184-18731 placement
/**
 * 启动目录不在 git 仓库里时的降级：给出 no-repository/diff-failed 原因并记一条 warn 日志。
 */
function planEmptyRepoDiff(session) {
  if (shouldUseMultiRepoDiff())
    return {
      listed: null,
      noDiffReason: "no-repository",
    };
  let diffCwd = getDiffCwd();
  if (findGitRootUncached(diffCwd) !== null)
    return {
      listed: null,
      noDiffReason: "diff-failed",
    };
  try {
    return isWorkspaceDiffOn()
      ? {
          listed: diffCwd,
        }
      : {
          listed: null,
          noDiffReason: "no-repository",
        };
  } catch {
    logForDebugging(
      "workspace diff (launch folder not in a git repository): reading the settings that switch this listing on threw an error, so no listing was made",
      {
        level: "warn",
      },
    );
    if (session !== undefined && claimOnceStore.of(session).claim("workspace_diff_no_repository:failed"))
      logFeatureBad("workspace_diff_no_repository", "failed");
    return {
      listed: null,
      noDiffReason: "diff-failed",
    };
  }
}
//@ chunk-hma1b5gv.js:18731-20102 placement
/**
 * 在无仓库时用临时 git 目录（独立 objects/refs、ccdiff 前缀）算出文件清单，git 太旧或版本读不出时降级。
 */
async function diffWithoutRepository(session, rules, listed, buildDiff) {
  let gitDir;
  let launchDirLeftOut = false;
  let outcome = {
    diff: null,
    noDiffReason: "diff-failed",
  };
  try {
    if (!isWorkspaceDiffOn()) return null;
    gitDir = await mkdtemp(join(tmpdir(), "ccdiff-empty-"));
    for (let subdir of ["objects", join("refs", "heads"), "info"])
      await mkdir(join(gitDir, subdir), {
        recursive: true,
      });
    let copiedGitEnv = buildCopiedGitEnv(gitDir, gitDir, listed);
    for (let [fileName, content] of [
      [
        "HEAD",
        `ref: refs/heads/main
`,
      ],
      ["config", SCRATCH_GIT_CONFIG],
      [join("info", "exclude"), joined],
    ])
      await writeFile(join(gitDir, fileName), content, {
        flag: "wx",
      });
    if (!(await isGitVersionSupported(listed, copiedGitEnv, undefined))) {
      logForDebugging(
        "workspace diff (launch folder not in a git repository): files not listed: this needs git 2.32 or later, and git here is older or its version could not be read",
        {
          level: "warn",
        },
      );
      if (claimOnceStore.of(session).claim("workspace_diff_no_repository:old_or_unknown_git"))
        logFeatureBad("workspace_diff_no_repository", "old_or_unknown_git");
      return null;
    }
    let listing = await listUntrackedFiles(copiedGitEnv, listed, gitDir);
    if (listing === null) return null;
    launchDirLeftOut = listing.launchDirLeftOut;
    await stageEmptyBlobs(copiedGitEnv, listed, gitDir, listing.files, rules);
    outcome = await buildDiff(copiedGitEnv);
  } catch {
    logForDebugging(
      "workspace diff (launch folder not in a git repository): a step failed; its error is not logged because it can contain file names",
      {
        level: "warn",
      },
    );
  } finally {
    if (gitDir !== undefined) {
      let gitDirByCwd = getGitRepoCache().gitDirByCwd;
      let resolvedCwd = resolve(listed);
      if (gitDirByCwd.get(resolvedCwd) === null) gitDirByCwd.delete(resolvedCwd);
      await rm(gitDir, {
        recursive: true,
        force: true,
      }).catch(() => {
        return;
      });
    }
  }
  let status = outcome.diff === null ? "failed" : launchDirLeftOut ? "launch_directory_left_out" : "ok";
  if (claimOnceStore.of(session).claim(`workspace_diff_no_repository:${status}`))
    if (status === "ok") logFeatureOk("workspace_diff_no_repository");
    else if (status === "failed") logFeatureBad("workspace_diff_no_repository", status);
    else logFeatureSad("workspace_diff_no_repository", status);
  return outcome;
}
//@ chunk-hma1b5gv.js:20102-21381 placement
/**
 * 用 ls-files --others --exclude-standard 列出未跟踪文件并应用忽略规则。
 */
async function listUntrackedFiles(gitEnv, repoPath, gitDir) {
  let filtered = (await runGitStep(gitEnv, repoPath, ["ls-files", "-z", "--others", "--exclude-standard"]))
    .split("\x00")
    .filter((file) => file !== "" && !regExp_3.test(file) && !isIgnoredPath(file));
  let filtered_2 = filtered.filter((file) => !file.endsWith("/"));
  if (filtered.some((entry) => /^[^/]+\/$/.test(entry)) || filtered_2.length > MAX_LISTED_FILES) return null;
  let excluded = new Set();
  let seenDirs = new Set([""]);
  let settingsDirs = new Set();
  let startTime = performance.now();
  for (let file of filtered_2) {
    let index = file.lastIndexOf("/");
    if (GIT_FILES_ALWAYS_ALLOWED.includes(file.slice(index + 1))) excluded.add(file.slice(0, index + 1));
    let projectDir = regExp_4.exec(file)?.[1];
    if (projectDir !== undefined) excluded.add(projectDir);
    if (file.slice(index + 1) === "settings.json") settingsDirs.add(file.slice(0, index + 1));
    for (let index = file.lastIndexOf("/"); index > 0; index = file.lastIndexOf("/", index - 1)) {
      let sliced = file.slice(0, index + 1);
      if (seenDirs.has(sliced)) break;
      seenDirs.add(sliced);
    }
    if (performance.now() - startTime >= 10) {
      await yieldToEventLoop();
      startTime = performance.now();
    }
  }
  for (let batch of chunk_default(Array.from(seenDirs), BATCH_SIZE))
    await Promise.all(
      batch.map(async (dir) => {
        if (await isGitRepoDir(join(repoPath, dir))) excluded.add(dir);
      }),
    );
  for (let dir of settingsDirs) {
    let projectsDir = join(repoPath, dir, "projects");
    let projectNames = await readdir(projectsDir).catch((error) => (isPathAbsent(error) ? [] : null));
    let hasTranscript = projectNames === null || projectNames.length > MAX_PROJECT_DIRS;
    for (let projectName of projectNames?.slice(0, MAX_PROJECT_DIRS) ?? []) {
      if (hasTranscript) break;
      hasTranscript = await readdir(join(projectsDir, projectName)).then(
        (entries) => entries.some((entry) => regExp_5.test(entry)),
        (error) => !isPathAbsent(error),
      );
    }
    if (hasTranscript) excluded.add(dir);
  }
  for (let prefix of claudeConfigPrefixesFor(repoPath)) excluded.add(prefix);
  if (excluded.size === 0)
    return {
      files: filtered_2,
      launchDirLeftOut: false,
    };
  await appendFile(join(gitDir, "info", "exclude"), Array.from(excluded, toGitPathspec).join(""));
  let launchDirExcluded = excluded.has("");
  return {
    launchDirLeftOut: launchDirExcluded,
    files: launchDirExcluded
      ? []
      : filtered_2.filter(
          (file) =>
            !Array.from(file.matchAll(/\//g), (match) => file.slice(0, match.index + 1)).some((prefix) =>
              excluded.has(prefix),
            ),
        ),
  };
}
//@ chunk-hma1b5gv.js:21381-22352 placement
/**
 * 用 commit-tree 造一个空提交、再用 update-index --index-info 把文件按 100644 写入，得到无仓库下的 diff 基线。
 */
async function stageEmptyBlobs(gitEnv, gitCwd, gitDir, files, rules) {
  let trimmed = (
    await runGitStep(
      {
        ...gitEnv,
        env: {
          ...gitEnv.env,
          ...COMMIT_IDENTITY,
        },
      },
      gitCwd,
      ["commit-tree", EMPTY_TREE_SHA, "-m", "empty"],
    )
  ).trim();
  await writeFile(
    join(gitDir, "refs", "heads", "main"),
    `${trimmed}
`,
    {
      flag: "wx",
    },
  );
  let sessionStartTime = getSessionStartTime();
  let results = await Promise.all(
    files.map(async (file) => {
      let filePath = join(gitCwd, file);
      let stats = await lstat(filePath).catch(() => null);
      if (stats !== null && Math.max(stats.mtimeMs, stats.ctimeMs) < sessionStartTime) return "untouched";
      if (!stats?.isFile() || stats.nlink !== 1 || stats.size > MAX_FILE_BYTES) return null;
      return access(filePath, constants.R_OK).then(
        () => stats.size,
        () => null,
      );
    }),
  );
  await appendFile(
    join(gitDir, "info", "exclude"),
    files
      .filter((file, index) => results[index] === "untouched" && NEEDS_QUOTING.test(file))
      .map(toGitPathspec)
      .join(""),
  );
  let byteBudget = BYTE_BUDGET;
  let staged = [];
  let isSensitive = makeSensitivePathMatcher(gitCwd);
  let startTime = performance.now();
  for (let [index, file] of files.entries()) {
    let fileSize = results[index];
    if (typeof fileSize !== "number" || fileSize > byteBudget) continue;
    if (performance.now() - startTime >= 10) {
      await yieldToEventLoop();
      startTime = performance.now();
    }
    let filePath = join(gitCwd, file);
    if (
      !segmentReadingsFlat(basename(file)).some((reading) => CREDENTIAL_LIKE_NAMES.includes(reading)) &&
      !isSensitiveBasenameWithVariants(file) &&
      !isCredentialConfigPath_2(file) &&
      !isSensitiveWithGitConfig(file) &&
      !isSensitive(file) &&
      isPathAllowed(filePath, rules, "read").allowed &&
      matchingRuleForInput(filePath, rules, "read", "ask") === null
    ) {
      byteBudget -= fileSize;
      staged.push(file);
    }
  }
  if (staged.length > 0)
    await runGitStep(
      gitEnv,
      gitCwd,
      ["update-index", "-z", "--index-info"],
      staged.map((file) => `100644 ${E69DE29BB2D1D6434B8B29AE775AD8C2E48C5391} 0	${file}\x00`).join(""),
    );
}
//@ chunk-hma1b5gv.js:22352-22743 placement
/**
 * 跑一步 git 并在失败/超时时记 warn 日志、抛统一错误（超时写毫秒数）。
 */
async function runGitStep(gitEnv, cwd, gitArgs, stdinData) {
  let { code, stdout, timedOut } = await execFileNoThrow(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...gitArgs], {
    ...gitEnv,
    cwd,
    ...(stdinData === undefined
      ? {
          stdin: "ignore",
        }
      : {
          input: stdinData,
        }),
    timeout: GIT_DIFF_TIMEOUT_MS,
    preserveOutputOnError: false,
    maxBuffer: 50000000,
  });
  if (code === 0) return stdout;
  logForDebugging(
    `workspace diff (launch folder not in a git repository): git ${gitArgs[0]} ${timedOut ? `timed out after ${GIT_DIFF_TIMEOUT_MS} ms` : `exited with code ${code}`}`,
    {
      level: "warn",
    },
  );
  throw Error("a git step failed");
}
//@ chunk-hma1b5gv.js:22743-22901 placement
/**
 * 把路径转成 gitignore 风格的一行（转义 *?[、行尾空格与 
），含换行时返回空。
 */
function toGitPathspec(filePath) {
  if (
    filePath.includes(`
`)
  )
    return "";
  return `/${
    filePath
      .replace(/[\\*?[]/g, "\\$&")
      .replace(/ +$/, (trailingSpaces) => trailingSpaces.replaceAll(" ", "\\ "))
      .replaceAll("\r", "[\r]") || "*"
  }
`;
}
//@ chunk-76nr5kns.js:191-540 placement
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
//@ chunk-y7x9ddxy.js:825-1018 placement
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
//@ chunk-y7x9ddxy.js:1018-1145 placement
var MAX_DIFF_BLOB_BYTES = 2000000;
var REGULAR_FILE_MODES = new Set(["100644", "100755", "100664"]);
var MAX_TOTAL_DIFF_BYTES = 1e7;
var MAX_DIFF_FILES = 1e4;
var DIFF_READ_TIMEOUTS = {
  perFileMs: 5000,
  totalMs: 1e4,
};
var NOFOLLOW_READ_FLAGS = REMOTE_READ_OPEN_FLAGS | (constants.O_NOFOLLOW ?? 0);
//@ chunk-y7x9ddxy.js:1145-1402 placement
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
//@ chunk-y7x9ddxy.js:1402-1551 placement
/**
 * 含不安全字符的路径：去掉 git 的引号转义后重新按 git 规则加引号。
 */
function normalizeDiffPath(rawPath) {
  if (!UNSAFE_PATH_CHAR_PATTERN.test(rawPath)) return rawPath;
  let quoted =
    rawPath.length > 1 && rawPath.startsWith('"') && rawPath.endsWith('"') && !rawPath.includes('" => ');
  return quoteGitPath(quoted ? unquoteGitPathBytes(rawPath.slice(1, -1)) : rawPath);
}
//@ chunk-y7x9ddxy.js:1551-1578 placement
var GIT_OBJECT_ID_PATTERN = /^[0-9a-f]{40,64}$/;
//@ chunk-y7x9ddxy.js:1578-1633 placement
function gitArgs(args) {
  return ["--literal-pathspecs", ...GIT_SAFE_GLOBAL_ARGS, ...args];
}
//@ chunk-y7x9ddxy.js:1633-1704 placement
function gitExecOptions(cwd, options) {
  return {
    ...options,
    cwd,
    timeout: GIT_DIFF_TIMEOUT_MS,
    preserveOutputOnError: false,
  };
}
//@ chunk-y7x9ddxy.js:1704-2129 placement
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
//@ chunk-y7x9ddxy.js:2129-2507 placement
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
//@ chunk-y7x9ddxy.js:2507-2670 placement
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
//@ chunk-y7x9ddxy.js:2670-2799 placement
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
//@ chunk-y7x9ddxy.js:2799-3075 placement
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
//@ chunk-y7x9ddxy.js:3075-3892 placement
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
//@ chunk-y7x9ddxy.js:3892-4065 placement
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
//@ chunk-y7x9ddxy.js:4065-4572 placement
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
//@ chunk-y7x9ddxy.js:4572-4775 placement
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
//@ chunk-y7x9ddxy.js:4775-4830 placement
function hasNulByte(content) {
  return content.slice(0, 8000).includes("\x00");
}
//@ chunk-y7x9ddxy.js:4830-5214 placement
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
//@ chunk-y7x9ddxy.js:5214-5504 placement
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
//@ chunk-y7x9ddxy.js:5504-5633 placement
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
//@ chunk-y7x9ddxy.js:5633-6078 placement
/**
 * 为桥接生成工作区 diff：先检查并复制 .git，再在副本上计算相对分支点的 diff。
 */
async function buildWorkspaceDiffResponse(host, settings, budget = DIFF_READ_TIMEOUTS) {
  let workspaceDiffRoot = await getWorkspaceDiffRoot();
  if (workspaceDiffRoot === null) {
    let listing = planEmptyRepoDiff(host);
    if (listing.listed === null)
      return {
        diff: null,
        noDiffReason: listing.noDiffReason,
      };
    let listed = listing.listed;
    return (
      (await diffWithoutRepository(host, settings, listed, (reason) =>
        computeWorkspaceDiff(host, settings, budget, listed, listed, reason),
      )) ?? {
        diff: null,
        noDiffReason: "no-repository",
      }
    );
  }
  let root = workspaceDiffRoot.nested ? workspaceDiffRoot.root : null;
  let copy = root === null ? null : await prepareRepositoryCopy(root, host);
  if (root !== null && copy === null)
    return {
      diff: null,
      noDiffReason: "repository-refused",
    };
  try {
    return await computeWorkspaceDiff(host, settings, budget, workspaceDiffRoot.root, root, copy?.spawn);
  } finally {
    await copy?.dispose();
  }
}
//@ chunk-y7x9ddxy.js:6078-8750 placement
/**
 * 计算工作区相对分支点的 diff 与逐文件统计
 */
async function computeWorkspaceDiff(host, settings, budget, root, nestedRoot, diffOptions) {
  let nestedRoot_2 = nestedRoot ?? undefined;
  let gitOptions = diffOptions ?? {};
  let noDiffReason = "diff-failed";
  let gitDiff = await fetchGitDiff(host, undefined, "branch-point", nestedRoot_2, diffOptions, (reason) => {
    noDiffReason = reason;
  });
  if (gitDiff === null)
    return {
      diff: null,
      noDiffReason,
    };
  let topLevel = nestedRoot ?? (await getRepoTopLevel());
  if (topLevel === null || topLevel !== root)
    return {
      diff: null,
      noDiffReason: "root-moved",
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
export { buildWorkspaceDiffResponse, planEmptyRepoDiff };
