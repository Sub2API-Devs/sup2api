/**
 * utils/git/builderGit/repoCopy.ts
 *
 * builderGit：为构建复制仓库（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (33)
 * attribution: placement 33
 */
import { readdir, lstat, writeFile, symlink, mkdir, rm, open } from "fs/promises";
import { join, isAbsolute, dirname, resolve, relative, basename } from "path";
import { currentGitBinaryState } from "./gitBinary.js";
import {
  listGitRefs,
  CHECKOUT_SHAPE_CONFIG_KEYS,
  parseGitConfigNullList,
  CHECKOUT_SHAPE_CONFIG_KEYS_2,
  lastGlobalOrSystemValue,
  PRINTABLE_CONFIG_VALUE_RE,
  MAX_PLACEMENT_DEPTH,
  MAX_CONFIG_COPY_BYTES,
  MAX_CONFIG_FILE_BYTES,
  quoteGitConfigValue,
  resolveFileUrl,
} from "./gitConfigAudit.js";
import { isShallowClone } from "../gitFilesystem.js";
import {
  setupFailure,
  readTextFileQuiet,
  readWorktreeConfigExtension,
  homeSetupFailure,
  getFileIdentity_2,
} from "./gitDirIdentity.js";
import { buildGitEnv, reachForBoundSession, buildGitEnvForReach, reachRootsOrUnreadable } from "./gitEnv.js";
import {
  cleanSingleLine,
  getHomeDirCandidates,
  isPathInside as isPathInside_2,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { probeEntryKind } from "./gitDirShape.js";
import { logForDebugging } from "../../debug.js";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { prepareSeedAdmin, isPrivateOwnedDir } from "./seedAdmin.js";
import { getErrnoCode, errorMessage } from "../../errors.js";
import { getFirstLine, takeLastChars } from "../../stringUtils.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";
import { readGitConfigFromEnv, inTreeConfigFileKeys } from "./inTreeConfig.js";
import { readOnlyNoFollowFlags } from "../../platformTargets.js";
import { removePathEntry } from "../../fsRemove.js";
import { startTokensEqualOrCrossFormat, getProcessStartTimeAsync } from "../../processIdentity.js";
import { count } from "../../collections.js";

//@ chunk-s61vbvea.js:242152-247707 placement
/**
 * 为构建复制仓库（索引、属性、per-worktree 配置），供隔离 git 使用
 */
async function copyRepositoryForBuild(
  gitRoot,
  layout,
  signal,
  probes = currentGitBinaryState(),
  objectsMode = "linked",
) {
  let gitRefs = (args) =>
    listGitRefs(gitRoot, args, {
      hardened: true,
      layout,
      signal,
      probes,
    });
  let sharedIndexNames = (await readdir(layout.gitDir).catch(() => [])).filter((name) =>
    SHAREDINDEX_FILE_RE.test(name),
  );
  let copyCandidates = isShallowClone(layout, sharedIndexNames);
  let [failure] = await copyFilesChecked(layout, copyCandidates);
  if (failure !== undefined) return setupFailure(failure.why, failure.cause);
  if (layout.attributeSetting === undefined)
    return setupFailure("the layout records no attribute settings", "other");
  let unsupportedSetting = findUnsupportedGitEnv(buildGitEnv(undefined)) ?? layout.attributeSetting;
  if (unsupportedSetting !== null)
    return {
      kind: "failed",
      reason: "placement",
      cause: "attribute_source",
      source: unsupportedSetting,
      detail: describeUnsupportedGitEnv(unsupportedSetting),
      [Symbol.asyncDispose]: async () => {},
    };
  let readHead = async () =>
    cleanSingleLine(
      await readTextFileQuiet(join(layout.gitDir, "HEAD")).catch(() => {
        return;
      }),
    );
  let head = await readHead();
  let [objectFormatResult, repoConfigResult, refsResult, ...configValueResults] = await Promise.all([
    gitRefs(["rev-parse", "--show-object-format"]),
    gitRefs([
      "config",
      "-z",
      "--show-origin",
      "--no-includes",
      "--file",
      join(layout.commonDir, "config"),
      "--list",
    ]),
    gitRefs([
      "for-each-ref",
      "--format=%(objectname) %(refname) %(symref)",
      "refs/heads/",
      "refs/tags/",
      "refs/remotes/",
    ]),
    ...CHECKOUT_SHAPE_CONFIG_KEYS.map((key) =>
      gitRefs([
        "config",
        "-z",
        "--includes",
        "--show-scope",
        "--show-origin",
        "--type=path",
        "--get-all",
        key,
      ]),
    ),
  ]);
  let objectFormat = objectFormatResult.code === 0 ? objectFormatResult.stdout.trim() : "";
  if (objectFormat !== "sha1" && objectFormat !== "sha256")
    return setupFailure("could not read the object format", "config");
  if (refsResult.code !== 0)
    return setupFailure(
      `could not list the refs (${displayRepoPath(layout, join(layout.commonDir, "packed-refs"))} or a file under ${displayRepoPath(layout, join(layout.commonDir, "refs"))} is unreadable or broken)`,
      "refs",
    );
  let { carried, symbolic } = parsePackedRefs(refsResult.stdout);
  if (carried.includes("\uFFFD"))
    return setupFailure(
      `a branch or tag name in ${displayRepoPath(layout, join(layout.commonDir, "packed-refs"))} or under ${displayRepoPath(layout, join(layout.commonDir, "refs"))} is not valid UTF-8`,
      "refs",
    );
  let hasRepoConfig = (await probeEntryKind(join(layout.commonDir, "config"))) !== "absent";
  if (repoConfigResult.code !== 0 && hasRepoConfig)
    return setupFailure("could not read the repository configuration", "config");
  let worktreeConfigOn =
    layout.checkout === "linked" ? false : await readWorktreeConfigExtension(gitRoot, layout, signal, probes);
  if (worktreeConfigOn === null) return setupFailure("could not read extensions.worktreeConfig", "config");
  let worktreeConfigResult = worktreeConfigOn
    ? await gitRefs([
        "config",
        "-z",
        "--show-origin",
        "--no-includes",
        "--file",
        join(layout.gitDir, "config.worktree"),
        "--list",
      ])
    : null;
  if (
    worktreeConfigResult !== null &&
    worktreeConfigResult.code !== 0 &&
    (await probeEntryKind(join(layout.gitDir, "config.worktree"))) !== "absent"
  )
    return setupFailure("could not read the per-worktree configuration", "config");
  let filtered = [
    ...(repoConfigResult.code === 0 ? parseGitConfigNullList(repoConfigResult.stdout) : []),
    ...(worktreeConfigResult?.code === 0 ? parseGitConfigNullList(worktreeConfigResult.stdout) : []),
  ].filter(({ key }) => CHECKOUT_SHAPE_CONFIG_KEYS_2.has(key));
  if (configValueResults.some((result) => result.code !== 0 && result.exitCode !== 1))
    return setupFailure(
      "could not read the core.excludesFile or core.attributesFile setting from this checkout's git configuration",
      "config",
    );
  let flattened = CHECKOUT_SHAPE_CONFIG_KEYS.flatMap((key, index) => {
    let result = configValueResults[index];
    if (result === undefined || result.code !== 0) return [];
    let { origin, value, passedOver } = lastGlobalOrSystemValue(result.stdout);
    if (passedOver)
      logForDebugging(
        `[builderGit] ${key} from the repository, a worktree or the command line is ignored under the private git directory: only the user's or the system's own value applies there`,
      );
    return origin?.startsWith("file:") === true &&
      value !== undefined &&
      isAbsolute(value) &&
      PRINTABLE_CONFIG_VALUE_RE.test(value) &&
      !value.includes("\uFFFD")
      ? [
          {
            key,
            value,
          },
        ]
      : [];
  });
  if (
    head === null ||
    !(
      /^ref: refs\/heads\/[^\u0000-\u0020\u007f]+$/.test(head) || /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(head)
    )
  )
    return setupFailure(headNotABranchMessage(layout), "head");
  if (symbolic.has(head.replace(/^ref: /, "")))
    return setupFailure(SYMBOLIC_REF_CHECKOUT_NOTE, "symbolic_head");
  if (
    head.startsWith("ref: ") &&
    !carried.includes(` ${head.slice(5)}
`) &&
    (await readHead()) !== head
  )
    return setupFailure(
      `${displayRepoPath(layout, join(layout.gitDir, "HEAD"))} changed while the branches were being read: most likely a branch was switched, renamed or deleted meanwhile`,
      "other",
    );
  if (sharedIndexNames.length > MAX_PLACEMENT_DEPTH)
    return setupFailure(tooManySplitIndexMessage(layout), "shared_index");
  if (
    (
      await Promise.all(
        sharedIndexNames.map((name) =>
          lstat(join(layout.gitDir, name)).then(
            (stats) => (stats.isFile() ? stats.size : 0),
            () => 0,
          ),
        ),
      )
    ).reduce((acc, size) => acc + size, 0) > MAX_CONFIG_COPY_BYTES
  )
    return setupFailure(
      `the split-index files (sharedindex.*) in ${displayRepoPath(layout, layout.gitDir)} are too large to copy`,
      "shared_index",
    );
  let linkType = getPlatform_2() === "windows" ? "junction" : undefined;
  let enclosingTree = dirname(layout.commonDir);
  let reach = reachForBoundSession(layout);
  let gitEnvForReach = () =>
    buildGitEnvForReach(reach === undefined ? undefined : reachRootsOrUnreadable(reach), probes.screenMemo);
  let seedAdmin = await prepareSeedAdmin(
    {
      workTree: layout.workTree,
      gitDir: layout.gitDir,
      enclosingTree,
    },
    gitEnvForReach,
  );
  if (seedAdmin.kind === "failed")
    return seedAdmin.reason === "home"
      ? homeSetupFailure(seedAdmin.detail, seedAdmin.home)
      : setupFailure(seedAdmin.detail, seedAdmin.reason);
  let { root, configHome } = seedAdmin;
  let dir = seedAdmin.dir;
  try {
    let budget = {
      left: MAX_CONFIG_COPY_BYTES + 2 * MAX_CONFIG_FILE_BYTES,
    };
    let settled = Promise.allSettled(
      copyCandidates.map(([baseDir, name, copyKind]) =>
        checkCopyBudget(
          join(baseDir, name),
          join(dir, name),
          budget,
          displayRepoPath(layout, join(baseDir, name)),
          copyKind,
        ),
      ),
    );
    let writePhase = Promise.allSettled([
      writeFile(
        join(dir, "config"),
        [
          "[core]",
          `	repositoryformatversion = ${objectFormat === "sha256" ? 1 : 0}`,
          "\tbare = false",
          "\tlogallrefupdates = false",
          "[gc]",
          "\tauto = 0",
          "\tautodetach = false",
          "\tpruneexpire = never",
          "[maintenance]",
          "\tauto = false",
          "[core]",
          ...filtered.map(
            ({ key, value, valueless }) =>
              `	${key.slice(5)}${valueless ? "" : ` = ${quoteGitConfigValue(value)}`}`,
          ),
          ...flattened.map(
            ({ key, value }) => `	${key.slice(5)} = "${value.replace(/[\\"]/g, (char) => `\\${char}`)}"`,
          ),
          "\tlongpaths = true",
          ...(objectFormat === "sha256" ? ["[extensions]", "\tobjectformat = sha256"] : []),
          "",
        ].join(`
`),
        {
          flag: "wx",
          mode: 384,
        },
      ),
      writeFile(
        join(dir, "HEAD"),
        head +
          `
`,
        {
          flag: "wx",
          mode: 384,
        },
      ),
      PRIVATE_GIT_DIR_ENTRIES.filter((name) => name !== "objects" || objectsMode !== "own").reduce(
        (acc, name) => acc.then(() => symlink(join(layout.commonDir, name), join(dir, name), linkType)),
        Promise.resolve(),
      ),
      ...(objectsMode === "own"
        ? [
            mkdir(join(dir, "objects"), {
              mode: 448,
            }),
          ]
        : []),
      mkdir(join(dir, "refs"), {
        mode: 448,
      }),
      writeFile(join(dir, "packed-refs"), carried, {
        flag: "wx",
        mode: 384,
      }),
    ]).then((results) => {
      let found = results.find((result) => result.status === "rejected");
      return found === undefined
        ? null
        : {
            error: found.reason,
          };
    });
    let copyResults = await settled;
    let copyFailure = copyResults.flatMap((result) =>
      result.status === "fulfilled" && result.value !== null ? [result.value] : [],
    )[0];
    if (copyFailure !== undefined) {
      await writePhase;
      await sweepPrivateGitDir(dir);
      return setupFailure(copyFailure.why, copyFailure.cause);
    }
    let found = copyResults.find((rejected) => rejected.status === "rejected");
    if (found !== undefined) {
      await writePhase;
      throw found.reason;
    }
    let writeResult = await writePhase;
    if (writeResult !== null) {
      if (
        !READ_ONLY_ERRORS.includes(getErrnoCode(writeResult.error) ?? "") ||
        !isSkippableCopyError(writeResult.error, configHome, root)
      )
        throw writeResult.error;
      await sweepPrivateGitDir(dir);
      return homeSetupFailure(errorMessage(writeResult.error), configHome);
    }
    if (signal?.aborted) throw Error("aborted");
    let dirPath = dir;
    let dispose = async () => {
      await sweepPrivateGitDir(dirPath);
    };
    return {
      kind: "made",
      path: dirPath,
      ...(objectsMode === "own" && {
        borrowedObjects: join(layout.commonDir, "objects"),
      }),
      dispose,
      [Symbol.asyncDispose]: dispose,
    };
  } catch (error) {
    if (dir !== null) await sweepPrivateGitDir(dir);
    return setupFailure(
      `${getFirstLine(errorMessage(error))} \u2014 while writing under ${join(configHome, "seed-admin")}, where the copies take up to 1.5 GiB`,
      "other",
    );
  }
}
//@ chunk-s61vbvea.js:247707-247750 placement
var ATTRIBUTES_CONFIG_KEYS = ["core.attributesfile", "attr.tree"];
//@ chunk-s61vbvea.js:247750-247807 placement
function isAttributesConfigKey({ key }) {
  return ATTRIBUTES_CONFIG_KEYS.includes(key.toLowerCase());
}
//@ chunk-s61vbvea.js:247807-247871 placement
function isIgnoreCaseConfigKey({ key }) {
  return key.toLowerCase() === "core.ignorecase";
}
//@ chunk-s61vbvea.js:247871-247945 placement
var COPY_RELEVANT_ENV_VARS = ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "XDG_CONFIG_HOME", "HOME"];
//@ chunk-s61vbvea.js:247945-248568 placement
function readAttributesConfig(keys, keys_2, gitConfigPaths, layout) {
  let normalizePath = (path) =>
    getPlatform_2() === "windows" ? path.replaceAll("\\", "/").toLowerCase() : path;
  let isGitConfigPath = (entry) =>
    gitConfigPaths
      .map(normalizePath)
      .includes(normalizePath(resolveFileUrl(entry.origin, layout.workTree) ?? ""));
  let isOwnAttributesFile = (entry) =>
    entry.key.toLowerCase() === "core.attributesfile" &&
    isGitConfigPath(entry) &&
    isTildeOrAbsolutePath(entry.value);
  let found = keys_2.find((keyEntry) => isAttributesConfigKey(keyEntry) || isIgnoreCaseConfigKey(keyEntry));
  let chosen =
    found ?? keys.find((keyEntry) => isAttributesConfigKey(keyEntry) && !isOwnAttributesFile(keyEntry));
  if (chosen === undefined) return null;
  let lower = chosen.key.toLowerCase();
  return {
    ...(found === undefined &&
      lower === "core.attributesfile" &&
      isGitConfigPath(chosen) && {
        relative: true,
      }),
    ...(lower === "attr.tree"
      ? {
          kind: "attr_tree",
          setting: "attr.tree",
        }
      : lower === "core.ignorecase"
        ? {
            kind: "ignore_case",
            setting: "core.ignoreCase",
          }
        : {
            kind: "attributes_file",
            setting: "core.attributesFile",
          }),
    where: displayRepoPath(layout, resolveFileUrl(chosen.origin, layout.workTree) ?? chosen.origin),
  };
}
//@ chunk-s61vbvea.js:248568-249295 placement
/**
 * 环境中会让私有 git 目录读法不同的设置。
 */
function findUnsupportedGitEnv(gitEnv) {
  if (getEnvCaseInsensitive(gitEnv, "GIT_ATTR_SOURCE") !== undefined)
    return {
      kind: "attr_source_env",
      setting: "GIT_ATTR_SOURCE",
    };
  let found = ["GIT_CONFIG_COUNT", "GIT_CONFIG_PARAMETERS"].find((envVar) => {
    let gitConfigFromEnv = readGitConfigFromEnv({
      ...gitEnv,
      [envVar === "GIT_CONFIG_COUNT" ? "GIT_CONFIG_PARAMETERS" : "GIT_CONFIG_COUNT"]: undefined,
    });
    return (
      gitConfigFromEnv === null ||
      gitConfigFromEnv.some(
        ({ key }) =>
          inTreeConfigFileKeys(key.toLowerCase()) ||
          isAttributesConfigKey({
            key,
          }) ||
          isIgnoreCaseConfigKey({
            key,
          }),
      )
    );
  });
  if (found !== undefined)
    return {
      kind: "env_config",
      setting: found,
    };
  let isWindows = getPlatform_2() === "windows";
  let isRelativeSetting = (path) =>
    path !== undefined && path !== "" && !isSpelledAbsolutePath(path, isWindows);
  let found_2 = COPY_RELEVANT_ENV_VARS.find((envVar) =>
    isRelativeSetting(getEnvCaseInsensitive(gitEnv, envVar)),
  );
  let homeCandidate = getEnvCaseInsensitive(gitEnv, "HOME")
    ? undefined
    : getHomeDirCandidates(gitEnv).find(isRelativeSetting);
  let homeSetting =
    homeCandidate === undefined
      ? undefined
      : homeCandidate ===
          `${getEnvCaseInsensitive(gitEnv, "HOMEDRIVE")}${getEnvCaseInsensitive(gitEnv, "HOMEPATH")}`
        ? "HOMEPATH"
        : "USERPROFILE";
  let programDataSetting =
    isWindows && isRelativeSetting(getEnvCaseInsensitive(gitEnv, "PROGRAMDATA")) ? "PROGRAMDATA" : undefined;
  let setting = found_2 ?? homeSetting ?? programDataSetting;
  return setting === undefined
    ? null
    : {
        kind: "config_location",
        setting,
      };
}
//@ chunk-s61vbvea.js:249295-249366 placement
function isSpelledAbsolutePath(path, isWindows) {
  return isWindows ? /^(?:[A-Za-z]:[\\/]|[\\/]{2})/.test(path) : isAbsolute(path);
}
//@ chunk-s61vbvea.js:249366-249439 placement
function isTildeOrAbsolutePath(value) {
  return (
    value === "" || /^~[^/]*\//.test(value) || isSpelledAbsolutePath(value, getPlatform_2() === "windows")
  );
}
//@ chunk-s61vbvea.js:249439-249735 placement
function describeUnsupportedGitEnv({ kind, setting, where }) {
  return kind === "config_location"
    ? `${setting} is a relative path, which git under the private git directory resolves from another directory`
    : `${setting} is set in ${where ?? "Claude Code\u2019s environment"}, which git does not read the same way under the private git directory`;
}
//@ chunk-s61vbvea.js:249735-249791 placement
/**
 * 有索引文件路径时返回 GIT_INDEX_FILE 环境项。
 */
function indexFileEnv(indexFile) {
  return indexFile === undefined
    ? {}
    : {
        GIT_INDEX_FILE: indexFile,
      };
}
//@ chunk-s61vbvea.js:249791-249893 placement
/**
 * 关闭 split index、开启自动刷新的 -c 参数。
 */
function splitIndexOffArgs(indexFile) {
  return indexFile === undefined ? [] : ["-c", "core.splitIndex=false", "-c", "diff.autoRefreshIndex=true"];
}
//@ chunk-s61vbvea.js:249893-251035 placement
async function rewriteCopyAsSingleFile(gitRoot, signal, probes = currentGitBinaryState()) {
  let gitDirResult = await listGitRefs(gitRoot, ["rev-parse", "--absolute-git-dir", "--git-common-dir"], {
    hardened: false,
    signal,
  });
  let [gitDir, commonDirRel] = gitDirResult.stdout.split(`
`);
  if (gitDirResult.code !== 0 || gitDir === undefined || !isAbsolute(gitDir) || commonDirRel === undefined)
    return {
      kind: "failed",
      cause: "git_dir",
      detail: "git could not say where its directory is",
    };
  let commonDir = resolve(gitRoot, commonDirRel);
  let seedAdmin = await prepareSeedAdmin(
    {
      workTree: gitRoot,
      gitDir,
      enclosingTree: dirname(commonDir),
    },
    () => buildGitEnvForReach(undefined, probes.screenMemo),
  );
  if (seedAdmin.kind === "failed")
    return seedAdmin.reason === "home"
      ? {
          kind: "failed",
          cause: "home",
          detail: seedAdmin.detail,
          home: seedAdmin.home,
        }
      : {
          kind: "failed",
          cause: seedAdmin.reason,
          detail: seedAdmin.detail,
        };
  let dispose = () =>
    rm(seedAdmin.dir, {
      recursive: true,
      force: true,
    }).catch(() => {});
  try {
    let budgetFailure = await checkCopyBudget(
      join(gitDir, "index"),
      join(seedAdmin.dir, "index"),
      {
        left: MAX_CONFIG_FILE_BYTES,
      },
      join(gitDir, "index"),
      "index",
    );
    if (budgetFailure !== null) {
      await dispose();
      return {
        kind: "failed",
        cause: "index",
        detail: budgetFailure.why,
      };
    }
    let indexPath = join(seedAdmin.dir, "index");
    let rewriteResult = await listGitRefs(
      gitRoot,
      ["-c", "core.splitIndex=false", "update-index", "--no-split-index"],
      {
        hardened: false,
        signal,
        env: {
          GIT_INDEX_FILE: indexPath,
        },
      },
    );
    if (rewriteResult.code !== 0) {
      await dispose();
      return {
        kind: "failed",
        cause: "index",
        detail: `git could not rewrite the copy as one file: ${getFirstLine(rewriteResult.stderr)}`,
      };
    }
    return {
      kind: "made",
      indexFile: indexPath,
      dispose,
    };
  } catch (error) {
    await dispose();
    return {
      kind: "failed",
      cause: "index",
      detail: getFirstLine(errorMessage(error)),
    };
  }
}
//@ chunk-s61vbvea.js:251035-252029 placement
async function rebuildCachedTree(gitRoot, indexFile, signal) {
  let writeTree = (extraArgs) =>
    listGitRefs(gitRoot, [...splitIndexOffArgs(indexFile), "write-tree", "--missing-ok", ...extraArgs], {
      hardened: false,
      signal,
      env: indexFileEnv(indexFile),
    });
  let beforeStats = await lstat(indexFile, {
    bigint: true,
  }).catch((error) =>
    getErrnoCode(error) === "ENOENT"
      ? "absent"
      : {
          unexamined: getErrnoCode(error) ?? errorMessage(error),
        },
  );
  if (beforeStats !== "absent" && "unexamined" in beforeStats)
    return {
      kind: "failed",
      detail: `that copy could not be examined before its cached tree was rebuilt (${getFirstLine(beforeStats.unexamined)})`,
    };
  let treeResult = await writeTree(["--ignore-cache-tree"]);
  if (treeResult.code !== 0)
    return {
      kind: "failed",
      detail: `git could not build a tree from it (${getFirstLine(treeResult.stderr.trim())}) \u2014 an unfinished merge, with unmerged entries, does that: finish or abort it first`,
    };
  let afterStats = await lstat(indexFile, {
    bigint: true,
  }).catch(() => null);
  if (afterStats === null || (beforeStats !== "absent" && afterStats.ino === beforeStats.ino))
    return {
      kind: "failed",
      detail: "its cached tree, rebuilt from its entries, could not be written back into the copy",
    };
  let recheckResult = await writeTree([]);
  return recheckResult.code === 0 && recheckResult.stdout.trim() === treeResult.stdout.trim()
    ? {
        kind: "honest",
        tree: treeResult.stdout.trim(),
      }
    : {
        kind: "failed",
        detail: "its cached tree could not be replaced by the one its entries give",
      };
}
//@ chunk-s61vbvea.js:252029-252181 placement
var COPY_SKIPPABLE_ERRORS = [
  "EACCES",
  "EPERM",
  "EROFS",
  "EEXIST",
  "ENOTDIR",
  "ELOOP",
  "ENAMETOOLONG",
  "EOPNOTSUPP",
  "ENOTSUP",
];
var READ_ONLY_ERRORS = ["EACCES", "EPERM", "EROFS", "EOPNOTSUPP", "ENOTSUP"];
//@ chunk-s61vbvea.js:252181-252402 placement
function isSkippableCopyError(error, configHome, root) {
  let errnoCode = getErrnoCode(error);
  let destPath =
    typeof error !== "object" || error === null
      ? undefined
      : "dest" in error && typeof error.dest === "string"
        ? error.dest
        : "path" in error
          ? error.path
          : undefined;
  return (
    errnoCode !== undefined &&
    COPY_SKIPPABLE_ERRORS.includes(errnoCode) &&
    typeof destPath === "string" &&
    (isPathInside_2(configHome, destPath) || isPathInside_2(dirname(root), destPath))
  );
}
//@ chunk-s61vbvea.js:252402-252504 placement
function displayRepoPath(layout, path) {
  let shownPath = isPathInside_2(layout.workTree, path) ? relative(layout.workTree, path) : path;
  return shownPath.length > 160 ? `\u2026${takeLastChars(shownPath, 159)}` : shownPath;
}
//@ chunk-s61vbvea.js:252504-252869 placement
/**
 * 解析 ref 列表：直接 ref 文本与符号 ref 集合。
 */
function parsePackedRefs(stdout) {
  let flattened = stdout
    .split(
      `
`,
    )
    .flatMap((line) => {
      let [, id, name, target] =
        /^([0-9a-f]{40}(?:[0-9a-f]{24})?) (refs\/[^\u0000-\u0020\u007f]+) (.*)$/s.exec(line) ?? [];
      return id === undefined || name === undefined
        ? []
        : [
            {
              id,
              name,
              target,
            },
          ];
    });
  return {
    carried: flattened
      .filter(({ target }) => target === "")
      .map(
        ({ id, name }) => `${id} ${name}
`,
      )
      .join(""),
    symbolic: new Set(flattened.filter(({ target }) => target !== "").map(({ name }) => name)),
  };
}
//@ chunk-s61vbvea.js:252869-252900 placement
var openCopySource = (dirPath, fileName) => open(join(dirPath, fileName), readOnlyNoFollowFlags());
//@ chunk-s61vbvea.js:252900-253874 placement
async function copyFileChecked(sourcePath, label, copyKind, openSource) {
  let failureOf = (reason, cause) => ({
    why: `${label} ${reason}`,
    cause:
      cause === "replaced"
        ? "other"
        : copyKind === "index"
          ? `index_${cause}`
          : copyKind === "shared_index"
            ? cause === "too_large"
              ? "shared_index_too_large"
              : copyKind
            : cause === "link" || cause === "second_name"
              ? `shallow_${cause}`
              : "shallow_other",
  });
  if (getPlatform_2() === "windows") {
    let sourceStats = await lstat(sourcePath).catch(() => null);
    if (sourceStats !== null && !sourceStats.isFile())
      return sourceStats.isSymbolicLink()
        ? failureOf("is a symbolic link", "link")
        : failureOf("is not a regular file", "other");
  }
  let source;
  try {
    source = await openSource(dirname(sourcePath), basename(sourcePath));
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return null;
    return errnoCode === "ELOOP" || errnoCode === "EMLINK"
      ? failureOf("is a symbolic link", "link")
      : failureOf(`cannot be opened (${errnoCode ?? "no error code"})`, "other");
  }
  let stats = await source.stat().catch(() => null);
  let failure =
    stats === null || !stats.isFile()
      ? failureOf("is not a regular file", "other")
      : stats.nlink > 1
        ? failureOf("has a second name (a hard link)", "second_name")
        : stats.nlink !== 1
          ? failureOf("changed while it was read", "replaced")
          : stats.size > MAX_CONFIG_FILE_BYTES
            ? failureOf("is larger than 256 MiB, the most this upload copies", "too_large")
            : null;
  if (failure !== null || stats === null) {
    await source.close();
    return failure;
  }
  return {
    source,
    entry: stats,
  };
}
//@ chunk-s61vbvea.js:253874-253914 placement
var SHAREDINDEX_FILE_RE = /^sharedindex\.[0-9a-f]{40,64}$/;
//@ chunk-s61vbvea.js:253914-254014 placement
function tooManySplitIndexMessage(layout) {
  return `more than ${MAX_PLACEMENT_DEPTH} split-index files (sharedindex.*) stand in ${displayRepoPath(layout, layout.gitDir)}`;
}
//@ chunk-s61vbvea.js:254155-254369 placement
async function copyFilesChecked(layout, candidates, openSource = openCopySource) {
  return (
    await Promise.all(
      candidates.map(async ([baseDir, name, copyKind]) => {
        let result = await copyFileChecked(
          join(baseDir, name),
          displayRepoPath(layout, join(baseDir, name)),
          copyKind,
          openSource,
        );
        if (result !== null && "source" in result) {
          await result.source.close();
          return null;
        }
        return result;
      }),
    )
  ).filter((failure) => failure !== null);
}
//@ chunk-s61vbvea.js:254369-254453 placement
function headNotABranchMessage(layout) {
  return `${displayRepoPath(layout, join(layout.gitDir, "HEAD"))} is not a branch or an object id`;
}
//@ chunk-s61vbvea.js:254453-254577 placement
var SYMBOLIC_REF_CHECKOUT_NOTE =
  "it is checked out under a symbolic ref (a second name for another ref), and a branch is taken by its own name only";
//@ chunk-s61vbvea.js:254577-255205 placement
async function checkCopyBudget(sourcePath, destPath, budget, label, copyKind) {
  let opened = await copyFileChecked(sourcePath, label, copyKind, openCopySource);
  if (opened === null || !("source" in opened)) return opened;
  let { source, entry } = opened;
  try {
    budget.left -= entry.size;
    if (budget.left < 0)
      return {
        why: `${label} and the other files to copy grew past 1.5 GiB`,
        cause:
          copyKind === "index" ? "index_too_large" : copyKind === "shared_index" ? copyKind : "shallow_other",
      };
    let destHandle = await open(destPath, "wx", 384);
    try {
      let buffer = Buffer.allocUnsafe(1048576);
      let offset = 0;
      while (offset < entry.size) {
        let { bytesRead } = await source.read(
          buffer,
          0,
          Math.min(buffer.length, entry.size - offset),
          offset,
        );
        if (bytesRead === 0) break;
        await destHandle.write(buffer, 0, bytesRead);
        offset += bytesRead;
      }
      let date = new Date();
      let time = entry.mtime.getTime();
      let mtime = time >= 1000 && time <= date.getTime() ? entry.mtime : date;
      await destHandle.utimes(mtime, mtime);
    } finally {
      await destHandle.close();
    }
    return null;
  } finally {
    await source.close();
  }
}
//@ chunk-s61vbvea.js:255205-255231 placement
var PRIVATE_GIT_DIR_ENTRIES = ["info", "objects"];
//@ chunk-s61vbvea.js:255231-255378 placement = scanDirectory (0.766)
async function scanDirectory(dirPath) {
  try {
    return await removePathEntry(dirPath);
  } catch (error) {
    if (
      getPlatform_2() === "windows" ||
      !(await lstat(dirPath).then(
        (entry) => entry.isDirectory(),
        () => false,
      ))
    )
      throw error;
    return "directory";
  }
}
//@ chunk-s61vbvea.js:255378-255974 placement
async function sweepPrivateGitDir(dirPath, entries = PRIVATE_GIT_DIR_ENTRIES) {
  try {
    if ((await scanDirectory(dirPath)) !== "directory") return true;
    let failure = await entries
      .toReversed()
      .reduce(
        (acc, name) =>
          acc.then(async () => {
            if (name === "objects") await scanDirectory(join(dirPath, name));
            else if ((await removePathEntry(join(dirPath, name))) === "directory")
              throw Error("info is a non-empty directory, not a link");
          }),
        Promise.resolve(),
      )
      .then(
        () => null,
        (reason) => ({
          reason,
        }),
      );
    if (failure !== null) {
      await Promise.allSettled(
        (await readdir(dirPath))
          .filter((name) => !entries.some((protectedName) => protectedName === name))
          .map((name) => removePathEntry(join(dirPath, name))),
      );
      throw failure.reason;
    }
    await rm(dirPath, {
      recursive: true,
      force: true,
    });
    return true;
  } catch (error) {
    logForDebugging(
      `[builderGit] a private git directory is left in place (${getErrnoCode(error) ?? errorMessage(error)}): ${dirPath}`,
      {
        level: "warn",
      },
    );
    return false;
  }
}
//@ chunk-s61vbvea.js:255974-255989 placement
var RECENT_GIT_DIR_MTIME_MS = 3600000;
//@ chunk-s61vbvea.js:255989-257009 placement
async function stageSeedAdmin(root, fileIdentity, opts) {
  let now = Date.now();
  let stillCheckedDir = async () =>
    fileIdentity !== null &&
    (await getFileIdentity_2(root)) === fileIdentity &&
    isPrivateOwnedDir(await lstat(root));
  let sweepEntry = async (name) => {
    let match = /^claude-seed-admin-([0-9]+)-([0-9a-z]*)-/.exec(name);
    if (match === null && !name.startsWith("claude-seed-stage-")) return "kept";
    let path = join(root, name);
    if (now - (await lstat(path)).mtimeMs < RECENT_GIT_DIR_MTIME_MS) return "kept";
    if (match !== null && isProcessAliveOrOwned(Number(match[1]))) {
      let startTag = match[2] ?? "";
      let currentStartTag = startTag === "" ? "" : await procStartTag(Number(match[1]), opts);
      if (currentStartTag === "" || startTokensEqualOrCrossFormat(startTag, currentStartTag)) return "held";
    }
    if (!(await stillCheckedDir())) throw Error("seed-admin is no longer the directory that was checked");
    return (await sweepPrivateGitDir(path, match === null ? [] : PRIVATE_GIT_DIR_ENTRIES))
      ? "removed"
      : "failed";
  };
  let logListFailure = (detail, error) => {
    logForDebugging(
      `[builderGit] sweeping ${root}: could not examine ${detail} (${getErrnoCode(error) ?? errorMessage(error)})`,
      {
        level: "warn",
      },
    );
    return "failed";
  };
  let names = await readdir(root).catch((error) => logListFailure("the list of its entries", error));
  if (names === "failed")
    return {
      removed: 0,
      errors: 1,
      held: 0,
    };
  let results = await Promise.all(
    names.map((name) =>
      sweepEntry(name).catch((error) =>
        getErrnoCode(error) === "ENOENT" ? "kept" : logListFailure(name, error),
      ),
    ),
  );
  let removedCount = count(results, (result) => result === "removed");
  if (removedCount > 0)
    logForDebugging(`[builderGit] removed ${removedCount} folder(s) that killed builds left under ${root}`);
  return {
    removed: removedCount,
    errors: count(results, (result) => result === "failed"),
    held: count(results, (result) => result === "held"),
  };
}
//@ chunk-s61vbvea.js:257009-257088 placement
function isProcessAliveOrOwned(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
//@ chunk-s61vbvea.js:257088-257197 placement
async function procStartTag(pid, options) {
  return (
    (await getProcessStartTimeAsync(pid, {
      env: options(),
    })) ?? ""
  )
    .replace(/[^0-9a-z]/gi, "")
    .toLowerCase()
    .slice(0, 24);
}
export {
  splitIndexOffArgs,
  indexFileEnv,
  rewriteCopyAsSingleFile,
  rebuildCachedTree,
  findUnsupportedGitEnv,
  copyRepositoryForBuild,
  readAttributesConfig,
  stageSeedAdmin,
  procStartTag,
  isSkippableCopyError,
};
