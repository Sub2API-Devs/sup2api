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
async function copyRepositoryForBuild(e, layout, signal, probes = currentGitBinaryState(), h = "linked") {
  let y = (Ne) =>
    listGitRefs(e, Ne, {
      hardened: true,
      layout,
      signal,
      probes,
    });
  let filtered = (await readdir(layout.gitDir).catch(() => [])).filter((Ne) => SHAREDINDEX_FILE_RE.test(Ne));
  let w = isShallowClone(layout, filtered);
  let [R] = await copyFilesChecked(layout, w);
  if (R !== undefined) return setupFailure(R.why, R.cause);
  if (layout.attributeSetting === undefined)
    return setupFailure("the layout records no attribute settings", "other");
  let x = findUnsupportedGitEnv(buildGitEnv(undefined)) ?? layout.attributeSetting;
  if (x !== null)
    return {
      kind: "failed",
      reason: "placement",
      cause: "attribute_source",
      source: x,
      detail: describeUnsupportedGitEnv(x),
      [Symbol.asyncDispose]: async () => {},
    };
  let P = async () =>
    cleanSingleLine(
      await readTextFileQuiet(join(layout.gitDir, "HEAD")).catch(() => {
        return;
      }),
    );
  let j = await P();
  let [G, L, q, ...Q] = await Promise.all([
    y(["rev-parse", "--show-object-format"]),
    y([
      "config",
      "-z",
      "--show-origin",
      "--no-includes",
      "--file",
      join(layout.commonDir, "config"),
      "--list",
    ]),
    y([
      "for-each-ref",
      "--format=%(objectname) %(refname) %(symref)",
      "refs/heads/",
      "refs/tags/",
      "refs/remotes/",
    ]),
    ...CHECKOUT_SHAPE_CONFIG_KEYS.map((Ne) =>
      y(["config", "-z", "--includes", "--show-scope", "--show-origin", "--type=path", "--get-all", Ne]),
    ),
  ]);
  let Z = G.code === 0 ? G.stdout.trim() : "";
  if (Z !== "sha1" && Z !== "sha256") return setupFailure("could not read the object format", "config");
  if (q.code !== 0)
    return setupFailure(
      `could not list the refs (${displayRepoPath(layout, join(layout.commonDir, "packed-refs"))} or a file under ${displayRepoPath(layout, join(layout.commonDir, "refs"))} is unreadable or broken)`,
      "refs",
    );
  let { carried, symbolic } = parsePackedRefs(q.stdout);
  if (carried.includes("\uFFFD"))
    return setupFailure(
      `a branch or tag name in ${displayRepoPath(layout, join(layout.commonDir, "packed-refs"))} or under ${displayRepoPath(layout, join(layout.commonDir, "refs"))} is not valid UTF-8`,
      "refs",
    );
  let se = (await probeEntryKind(join(layout.commonDir, "config"))) !== "absent";
  if (L.code !== 0 && se) return setupFailure("could not read the repository configuration", "config");
  let re =
    layout.checkout === "linked" ? false : await readWorktreeConfigExtension(e, layout, signal, probes);
  if (re === null) return setupFailure("could not read extensions.worktreeConfig", "config");
  let he = re
    ? await y([
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
    he !== null &&
    he.code !== 0 &&
    (await probeEntryKind(join(layout.gitDir, "config.worktree"))) !== "absent"
  )
    return setupFailure("could not read the per-worktree configuration", "config");
  let filtered_2 = [
    ...(L.code === 0 ? parseGitConfigNullList(L.stdout) : []),
    ...(he?.code === 0 ? parseGitConfigNullList(he.stdout) : []),
  ].filter(({ key }) => CHECKOUT_SHAPE_CONFIG_KEYS_2.has(key));
  if (Q.some((Ne) => Ne.code !== 0 && Ne.exitCode !== 1))
    return setupFailure(
      "could not read the core.excludesFile or core.attributesFile setting from this checkout's git configuration",
      "config",
    );
  let flattened = CHECKOUT_SHAPE_CONFIG_KEYS.flatMap((Ne, Je) => {
    let lt = Q[Je];
    if (lt === undefined || lt.code !== 0) return [];
    let { origin, value: ze, passedOver } = lastGlobalOrSystemValue(lt.stdout);
    if (passedOver)
      logForDebugging(
        `[builderGit] ${Ne} from the repository, a worktree or the command line is ignored under the private git directory: only the user's or the system's own value applies there`,
      );
    return origin?.startsWith("file:") === true &&
      ze !== undefined &&
      isAbsolute(ze) &&
      PRINTABLE_CONFIG_VALUE_RE.test(ze) &&
      !ze.includes("\uFFFD")
      ? [
          {
            key: Ne,
            value: ze,
          },
        ]
      : [];
  });
  if (
    j === null ||
    !(/^ref: refs\/heads\/[^\u0000-\u0020\u007f]+$/.test(j) || /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(j))
  )
    return setupFailure(headNotABranchMessage(layout), "head");
  if (symbolic.has(j.replace(/^ref: /, ""))) return setupFailure(SYMBOLIC_REF_CHECKOUT_NOTE, "symbolic_head");
  if (
    j.startsWith("ref: ") &&
    !carried.includes(` ${j.slice(5)}
`) &&
    (await P()) !== j
  )
    return setupFailure(
      `${displayRepoPath(layout, join(layout.gitDir, "HEAD"))} changed while the branches were being read: most likely a branch was switched, renamed or deleted meanwhile`,
      "other",
    );
  if (filtered.length > MAX_PLACEMENT_DEPTH)
    return setupFailure(tooManySplitIndexMessage(layout), "shared_index");
  if (
    (
      await Promise.all(
        filtered.map((Ne) =>
          lstat(join(layout.gitDir, Ne)).then(
            (Je) => (Je.isFile() ? Je.size : 0),
            () => 0,
          ),
        ),
      )
    ).reduce((acc, Je) => acc + Je, 0) > MAX_CONFIG_COPY_BYTES
  )
    return setupFailure(
      `the split-index files (sharedindex.*) in ${displayRepoPath(layout, layout.gitDir)} are too large to copy`,
      "shared_index",
    );
  let Ee = getPlatform_2() === "windows" ? "junction" : undefined;
  let enclosingTree = dirname(layout.commonDir);
  let ke = reachForBoundSession(layout);
  let Me = () =>
    buildGitEnvForReach(ke === undefined ? undefined : reachRootsOrUnreadable(ke), probes.screenMemo);
  let seedAdmin = await prepareSeedAdmin(
    {
      workTree: layout.workTree,
      gitDir: layout.gitDir,
      enclosingTree,
    },
    Me,
  );
  if (seedAdmin.kind === "failed")
    return seedAdmin.reason === "home"
      ? homeSetupFailure(seedAdmin.detail, seedAdmin.home)
      : setupFailure(seedAdmin.detail, seedAdmin.reason);
  let { root, configHome } = seedAdmin;
  let dir = seedAdmin.dir;
  try {
    let Ne = {
      left: MAX_CONFIG_COPY_BYTES + 2 * MAX_CONFIG_FILE_BYTES,
    };
    let settled = Promise.allSettled(
      w.map(([yt, At, un]) =>
        checkCopyBudget(join(yt, At), join(dir, At), Ne, displayRepoPath(layout, join(yt, At)), un),
      ),
    );
    let lt = Promise.allSettled([
      writeFile(
        join(dir, "config"),
        [
          "[core]",
          `	repositoryformatversion = ${Z === "sha256" ? 1 : 0}`,
          "\tbare = false",
          "\tlogallrefupdates = false",
          "[gc]",
          "\tauto = 0",
          "\tautodetach = false",
          "\tpruneexpire = never",
          "[maintenance]",
          "\tauto = false",
          "[core]",
          ...filtered_2.map(
            ({ key, value: At, valueless }) =>
              `	${key.slice(5)}${valueless ? "" : ` = ${quoteGitConfigValue(At)}`}`,
          ),
          ...flattened.map(
            ({ key, value: At }) => `	${key.slice(5)} = "${At.replace(/[\\"]/g, (un) => `\\${un}`)}"`,
          ),
          "\tlongpaths = true",
          ...(Z === "sha256" ? ["[extensions]", "\tobjectformat = sha256"] : []),
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
        j +
          `
`,
        {
          flag: "wx",
          mode: 384,
        },
      ),
      PRIVATE_GIT_DIR_ENTRIES.filter((yt) => yt !== "objects" || h !== "own").reduce(
        (acc, At) => acc.then(() => symlink(join(layout.commonDir, At), join(dir, At), Ee)),
        Promise.resolve(),
      ),
      ...(h === "own"
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
    ]).then((yt) => {
      let found = yt.find((un) => un.status === "rejected");
      return found === undefined
        ? null
        : {
            error: found.reason,
          };
    });
    let Ae = await settled;
    let ze = Ae.flatMap((yt) => (yt.status === "fulfilled" && yt.value !== null ? [yt.value] : []))[0];
    if (ze !== undefined) {
      await lt;
      await sweepPrivateGitDir(dir);
      return setupFailure(ze.why, ze.cause);
    }
    let found = Ae.find((yt) => yt.status === "rejected");
    if (found !== undefined) {
      await lt;
      throw found.reason;
    }
    let Nt = await lt;
    if (Nt !== null) {
      if (
        !READ_ONLY_ERRORS.includes(getErrnoCode(Nt.error) ?? "") ||
        !isSkippableCopyError(Nt.error, configHome, root)
      )
        throw Nt.error;
      await sweepPrivateGitDir(dir);
      return homeSetupFailure(errorMessage(Nt.error), configHome);
    }
    if (signal?.aborted) throw Error("aborted");
    let An = dir;
    let ln = async () => {
      await sweepPrivateGitDir(An);
    };
    return {
      kind: "made",
      path: An,
      ...(h === "own" && {
        borrowedObjects: join(layout.commonDir, "objects"),
      }),
      dispose: ln,
      [Symbol.asyncDispose]: ln,
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
function readAttributesConfig(keys, keys_2, gitConfigPaths, s) {
  let h = (P) => (getPlatform_2() === "windows" ? P.replaceAll("\\", "/").toLowerCase() : P);
  let y = (P) => gitConfigPaths.map(h).includes(h(resolveFileUrl(P.origin, s.workTree) ?? ""));
  let S = (P) => P.key.toLowerCase() === "core.attributesfile" && y(P) && isTildeOrAbsolutePath(P.value);
  let found = keys_2.find((P) => isAttributesConfigKey(P) || isIgnoreCaseConfigKey(P));
  let R = found ?? keys.find((P) => isAttributesConfigKey(P) && !S(P));
  if (R === undefined) return null;
  let lower = R.key.toLowerCase();
  return {
    ...(found === undefined &&
      lower === "core.attributesfile" &&
      y(R) && {
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
    where: displayRepoPath(s, resolveFileUrl(R.origin, s.workTree) ?? R.origin),
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
  let found = ["GIT_CONFIG_COUNT", "GIT_CONFIG_PARAMETERS"].find((x) => {
    let gitConfigFromEnv = readGitConfigFromEnv({
      ...gitEnv,
      [x === "GIT_CONFIG_COUNT" ? "GIT_CONFIG_PARAMETERS" : "GIT_CONFIG_COUNT"]: undefined,
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
  let r = getPlatform_2() === "windows";
  let s = (envCaseInsensitive) =>
    envCaseInsensitive !== undefined &&
    envCaseInsensitive !== "" &&
    !isSpelledAbsolutePath(envCaseInsensitive, r);
  let found_2 = COPY_RELEVANT_ENV_VARS.find((x) => s(getEnvCaseInsensitive(gitEnv, x)));
  let y = getEnvCaseInsensitive(gitEnv, "HOME") ? undefined : getHomeDirCandidates(gitEnv).find(s);
  let S =
    y === undefined
      ? undefined
      : y === `${getEnvCaseInsensitive(gitEnv, "HOMEDRIVE")}${getEnvCaseInsensitive(gitEnv, "HOMEPATH")}`
        ? "HOMEPATH"
        : "USERPROFILE";
  let w = r && s(getEnvCaseInsensitive(gitEnv, "PROGRAMDATA")) ? "PROGRAMDATA" : undefined;
  let R = found_2 ?? S ?? w;
  return R === undefined
    ? null
    : {
        kind: "config_location",
        setting: R,
      };
}
//@ chunk-s61vbvea.js:249295-249366 placement
function isSpelledAbsolutePath(e, n) {
  return n ? /^(?:[A-Za-z]:[\\/]|[\\/]{2})/.test(e) : isAbsolute(e);
}
//@ chunk-s61vbvea.js:249366-249439 placement
function isTildeOrAbsolutePath(e) {
  return e === "" || /^~[^/]*\//.test(e) || isSpelledAbsolutePath(e, getPlatform_2() === "windows");
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
function indexFileEnv(e) {
  return e === undefined
    ? {}
    : {
        GIT_INDEX_FILE: e,
      };
}
//@ chunk-s61vbvea.js:249791-249893 placement
/**
 * 关闭 split index、开启自动刷新的 -c 参数。
 */
function splitIndexOffArgs(e) {
  return e === undefined ? [] : ["-c", "core.splitIndex=false", "-c", "diff.autoRefreshIndex=true"];
}
//@ chunk-s61vbvea.js:249893-251035 placement
async function rewriteCopyAsSingleFile(gitRoot, signal, r = currentGitBinaryState()) {
  let s = await listGitRefs(gitRoot, ["rev-parse", "--absolute-git-dir", "--git-common-dir"], {
    hardened: false,
    signal,
  });
  let [h, y] = s.stdout.split(`
`);
  if (s.code !== 0 || h === undefined || !isAbsolute(h) || y === undefined)
    return {
      kind: "failed",
      cause: "git_dir",
      detail: "git could not say where its directory is",
    };
  let S = resolve(gitRoot, y);
  let seedAdmin = await prepareSeedAdmin(
    {
      workTree: gitRoot,
      gitDir: h,
      enclosingTree: dirname(S),
    },
    () => buildGitEnvForReach(undefined, r.screenMemo),
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
  let R = () =>
    rm(seedAdmin.dir, {
      recursive: true,
      force: true,
    }).catch(() => {});
  try {
    let x = await checkCopyBudget(
      join(h, "index"),
      join(seedAdmin.dir, "index"),
      {
        left: MAX_CONFIG_FILE_BYTES,
      },
      join(h, "index"),
      "index",
    );
    if (x !== null) {
      await R();
      return {
        kind: "failed",
        cause: "index",
        detail: x.why,
      };
    }
    let P = join(seedAdmin.dir, "index");
    let j = await listGitRefs(gitRoot, ["-c", "core.splitIndex=false", "update-index", "--no-split-index"], {
      hardened: false,
      signal,
      env: {
        GIT_INDEX_FILE: P,
      },
    });
    if (j.code !== 0) {
      await R();
      return {
        kind: "failed",
        cause: "index",
        detail: `git could not rewrite the copy as one file: ${getFirstLine(j.stderr)}`,
      };
    }
    return {
      kind: "made",
      indexFile: P,
      dispose: R,
    };
  } catch (error) {
    await R();
    return {
      kind: "failed",
      cause: "index",
      detail: getFirstLine(errorMessage(error)),
    };
  }
}
//@ chunk-s61vbvea.js:251035-252029 placement
async function rebuildCachedTree(gitRoot, indexFile, signal) {
  let s = (R) =>
    listGitRefs(gitRoot, [...splitIndexOffArgs(indexFile), "write-tree", "--missing-ok", ...R], {
      hardened: false,
      signal,
      env: indexFileEnv(indexFile),
    });
  let h = await lstat(indexFile, {
    bigint: true,
  }).catch((error) =>
    getErrnoCode(error) === "ENOENT"
      ? "absent"
      : {
          unexamined: getErrnoCode(error) ?? errorMessage(error),
        },
  );
  if (h !== "absent" && "unexamined" in h)
    return {
      kind: "failed",
      detail: `that copy could not be examined before its cached tree was rebuilt (${getFirstLine(h.unexamined)})`,
    };
  let y = await s(["--ignore-cache-tree"]);
  if (y.code !== 0)
    return {
      kind: "failed",
      detail: `git could not build a tree from it (${getFirstLine(y.stderr.trim())}) \u2014 an unfinished merge, with unmerged entries, does that: finish or abort it first`,
    };
  let S = await lstat(indexFile, {
    bigint: true,
  }).catch(() => null);
  if (S === null || (h !== "absent" && S.ino === h.ino))
    return {
      kind: "failed",
      detail: "its cached tree, rebuilt from its entries, could not be written back into the copy",
    };
  let w = await s([]);
  return w.code === 0 && w.stdout.trim() === y.stdout.trim()
    ? {
        kind: "honest",
        tree: y.stdout.trim(),
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
  let h =
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
    typeof h === "string" &&
    (isPathInside_2(configHome, h) || isPathInside_2(dirname(root), h))
  );
}
//@ chunk-s61vbvea.js:252402-252504 placement
function displayRepoPath(e, n) {
  let r = isPathInside_2(e.workTree, n) ? relative(e.workTree, n) : n;
  return r.length > 160 ? `\u2026${takeLastChars(r, 159)}` : r;
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
      let [, s, h, y] =
        /^([0-9a-f]{40}(?:[0-9a-f]{24})?) (refs\/[^\u0000-\u0020\u007f]+) (.*)$/s.exec(line) ?? [];
      return s === undefined || h === undefined
        ? []
        : [
            {
              id: s,
              name: h,
              target: y,
            },
          ];
    });
  return {
    carried: flattened
      .filter(({ target }) => target === "")
      .map(
        ({ id, name: s }) => `${id} ${s}
`,
      )
      .join(""),
    symbolic: new Set(flattened.filter(({ target }) => target !== "").map(({ name: r }) => r)),
  };
}
//@ chunk-s61vbvea.js:252869-252900 placement
var openCopySource = (e, n) => open(join(e, n), readOnlyNoFollowFlags());
//@ chunk-s61vbvea.js:252900-253874 placement
async function copyFileChecked(e, n, r, s) {
  let h = (R, x) => ({
    why: `${n} ${R}`,
    cause:
      x === "replaced"
        ? "other"
        : r === "index"
          ? `index_${x}`
          : r === "shared_index"
            ? x === "too_large"
              ? "shared_index_too_large"
              : r
            : x === "link" || x === "second_name"
              ? `shallow_${x}`
              : "shallow_other",
  });
  if (getPlatform_2() === "windows") {
    let R = await lstat(e).catch(() => null);
    if (R !== null && !R.isFile())
      return R.isSymbolicLink() ? h("is a symbolic link", "link") : h("is not a regular file", "other");
  }
  let y;
  try {
    y = await s(dirname(e), basename(e));
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return null;
    return errnoCode === "ELOOP" || errnoCode === "EMLINK"
      ? h("is a symbolic link", "link")
      : h(`cannot be opened (${errnoCode ?? "no error code"})`, "other");
  }
  let S = await y.stat().catch(() => null);
  let w =
    S === null || !S.isFile()
      ? h("is not a regular file", "other")
      : S.nlink > 1
        ? h("has a second name (a hard link)", "second_name")
        : S.nlink !== 1
          ? h("changed while it was read", "replaced")
          : S.size > MAX_CONFIG_FILE_BYTES
            ? h("is larger than 256 MiB, the most this upload copies", "too_large")
            : null;
  if (w !== null || S === null) {
    await y.close();
    return w;
  }
  return {
    source: y,
    entry: S,
  };
}
//@ chunk-s61vbvea.js:253874-253914 placement
var SHAREDINDEX_FILE_RE = /^sharedindex\.[0-9a-f]{40,64}$/;
//@ chunk-s61vbvea.js:253914-254014 placement
function tooManySplitIndexMessage(e) {
  return `more than ${MAX_PLACEMENT_DEPTH} split-index files (sharedindex.*) stand in ${displayRepoPath(e, e.gitDir)}`;
}
//@ chunk-s61vbvea.js:254155-254369 placement
async function copyFilesChecked(e, n, r = openCopySource) {
  return (
    await Promise.all(
      n.map(async ([h, y, S]) => {
        let w = await copyFileChecked(join(h, y), displayRepoPath(e, join(h, y)), S, r);
        if (w !== null && "source" in w) {
          await w.source.close();
          return null;
        }
        return w;
      }),
    )
  ).filter((h) => h !== null);
}
//@ chunk-s61vbvea.js:254369-254453 placement
function headNotABranchMessage(e) {
  return `${displayRepoPath(e, join(e.gitDir, "HEAD"))} is not a branch or an object id`;
}
//@ chunk-s61vbvea.js:254453-254577 placement
var SYMBOLIC_REF_CHECKOUT_NOTE =
  "it is checked out under a symbolic ref (a second name for another ref), and a branch is taken by its own name only";
//@ chunk-s61vbvea.js:254577-255205 placement
async function checkCopyBudget(e, n, r, s, h) {
  let y = await copyFileChecked(e, s, h, openCopySource);
  if (y === null || !("source" in y)) return y;
  let { source, entry } = y;
  try {
    r.left -= entry.size;
    if (r.left < 0)
      return {
        why: `${s} and the other files to copy grew past 1.5 GiB`,
        cause: h === "index" ? "index_too_large" : h === "shared_index" ? h : "shallow_other",
      };
    let R = await open(n, "wx", 384);
    try {
      let x = Buffer.allocUnsafe(1048576);
      let P = 0;
      while (P < entry.size) {
        let { bytesRead } = await source.read(x, 0, Math.min(x.length, entry.size - P), P);
        if (bytesRead === 0) break;
        await R.write(x, 0, bytesRead);
        P += bytesRead;
      }
      let date = new Date();
      let time = entry.mtime.getTime();
      let L = time >= 1000 && time <= date.getTime() ? entry.mtime : date;
      await R.utimes(L, L);
    } finally {
      await R.close();
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
async function sweepPrivateGitDir(dir, n = PRIVATE_GIT_DIR_ENTRIES) {
  try {
    if ((await scanDirectory(dir)) !== "directory") return true;
    let r = await n
      .toReversed()
      .reduce(
        (acc, h) =>
          acc.then(async () => {
            if (h === "objects") await scanDirectory(join(dir, h));
            else if ((await removePathEntry(join(dir, h))) === "directory")
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
    if (r !== null) {
      await Promise.allSettled(
        (await readdir(dir)).filter((s) => !n.some((h) => h === s)).map((s) => removePathEntry(join(dir, s))),
      );
      throw r.reason;
    }
    await rm(dir, {
      recursive: true,
      force: true,
    });
    return true;
  } catch (error) {
    logForDebugging(
      `[builderGit] a private git directory is left in place (${getErrnoCode(error) ?? errorMessage(error)}): ${dir}`,
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
async function stageSeedAdmin(root, fileIdentity, r) {
  let now = Date.now();
  let h = async () =>
    fileIdentity !== null &&
    (await getFileIdentity_2(root)) === fileIdentity &&
    isPrivateOwnedDir(await lstat(root));
  let y = async (P) => {
    let match = /^claude-seed-admin-([0-9]+)-([0-9a-z]*)-/.exec(P);
    if (match === null && !P.startsWith("claude-seed-stage-")) return "kept";
    let G = join(root, P);
    if (now - (await lstat(G)).mtimeMs < RECENT_GIT_DIR_MTIME_MS) return "kept";
    if (match !== null && isProcessAliveOrOwned(Number(match[1]))) {
      let L = match[2] ?? "";
      let q = L === "" ? "" : await procStartTag(Number(match[1]), r);
      if (q === "" || startTokensEqualOrCrossFormat(L, q)) return "held";
    }
    if (!(await h())) throw Error("seed-admin is no longer the directory that was checked");
    return (await sweepPrivateGitDir(G, match === null ? [] : PRIVATE_GIT_DIR_ENTRIES))
      ? "removed"
      : "failed";
  };
  let S = (P, error) => {
    logForDebugging(
      `[builderGit] sweeping ${root}: could not examine ${P} (${getErrnoCode(error) ?? errorMessage(error)})`,
      {
        level: "warn",
      },
    );
    return "failed";
  };
  let w = await readdir(root).catch((error) => S("the list of its entries", error));
  if (w === "failed")
    return {
      removed: 0,
      errors: 1,
      held: 0,
    };
  let results = await Promise.all(
    w.map((P) => y(P).catch((error) => (getErrnoCode(error) === "ENOENT" ? "kept" : S(P, error)))),
  );
  let x = count(results, (P) => P === "removed");
  if (x > 0) logForDebugging(`[builderGit] removed ${x} folder(s) that killed builds left under ${root}`);
  return {
    removed: x,
    errors: count(results, (P) => P === "failed"),
    held: count(results, (P) => P === "held"),
  };
}
//@ chunk-s61vbvea.js:257009-257088 placement
function isProcessAliveOrOwned(e) {
  try {
    process.kill(e, 0);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
//@ chunk-s61vbvea.js:257088-257197 placement
async function procStartTag(e, n) {
  return (
    (await getProcessStartTimeAsync(e, {
      env: n(),
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
