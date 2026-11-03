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
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  symlink,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  rm,
  rm as rm_2,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
} from "fs/promises";
import {
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
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
} from "path";
import { HNe } from "./gitBinary.js";
import {
  listGitRefs,
  hy,
  parseGitConfigNullList,
  CHECKOUT_SHAPE_CONFIG_KEYS,
  lastGlobalOrSystemValue,
  nO,
  Ad,
  yy,
  Cd,
  quoteGitConfigValue,
  resolveFileUrl,
} from "./gitConfigAudit.js";
import { isShallowClone } from "../gitFilesystem.js";
import {
  setupFailure,
  lKt,
  readWorktreeConfigExtension,
  homeSetupFailure,
  getFileIdentity_2,
} from "./gitDirIdentity.js";
import { buildGitEnv, reachForBoundSession, oKt, ui } from "./gitEnv.js";
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
import { readGitConfigFromEnv, uS } from "./inTreeConfig.js";
import { $c } from "../../platformTargets.js";
import { removePathEntry } from "../../fsRemove.js";
import { startTokensEqualOrCrossFormat, getProcessStartTimeAsync } from "../../processIdentity.js";
import { count } from "../../collections.js";

/**
 * 为构建复制仓库（索引、属性、per-worktree 配置），供隔离 git 使用
 */
//@ chunk-s61vbvea.js:242152-247707 placement
async function copyRepositoryForBuild(e, n, r, s = HNe(), h = "linked") {
  let y = (Ne) => listGitRefs(e, Ne, { hardened: !0, layout: n, signal: r, probes: s }),
    filtered = (await readdir_3(n.gitDir).catch(() => [])).filter((Ne) => pO.test(Ne)),
    w = isShallowClone(n, filtered),
    [R] = await copyFilesChecked(n, w);
  if (R !== void 0) return setupFailure(R.why, R.cause);
  if (n.attributeSetting === void 0) return setupFailure("the layout records no attribute settings", "other");
  let x = findUnsupportedGitEnv(buildGitEnv(void 0)) ?? n.attributeSetting;
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
        await lKt(join_7(n.gitDir, "HEAD")).catch(() => {
          return;
        }),
      ),
    j = await P(),
    [G, L, q, ...Q] = await Promise.all([
      y(["rev-parse", "--show-object-format"]),
      y([
        "config",
        "-z",
        "--show-origin",
        "--no-includes",
        "--file",
        join_7(n.commonDir, "config"),
        "--list",
      ]),
      y([
        "for-each-ref",
        "--format=%(objectname) %(refname) %(symref)",
        "refs/heads/",
        "refs/tags/",
        "refs/remotes/",
      ]),
      ...hy.map((Ne) =>
        y(["config", "-z", "--includes", "--show-scope", "--show-origin", "--type=path", "--get-all", Ne]),
      ),
    ]),
    Z = G.code === 0 ? G.stdout.trim() : "";
  if (Z !== "sha1" && Z !== "sha256") return setupFailure("could not read the object format", "config");
  if (q.code !== 0)
    return setupFailure(
      `could not list the refs (${displayRepoPath(n, join_7(n.commonDir, "packed-refs"))} or a file under ${displayRepoPath(n, join_7(n.commonDir, "refs"))} is unreadable or broken)`,
      "refs",
    );
  let { carried: carried, symbolic: symbolic } = parsePackedRefs(q.stdout);
  if (carried.includes("\uFFFD"))
    return setupFailure(
      `a branch or tag name in ${displayRepoPath(n, join_7(n.commonDir, "packed-refs"))} or under ${displayRepoPath(n, join_7(n.commonDir, "refs"))} is not valid UTF-8`,
      "refs",
    );
  let se = (await probeEntryKind(join_7(n.commonDir, "config"))) !== "absent";
  if (L.code !== 0 && se) return setupFailure("could not read the repository configuration", "config");
  let re = n.checkout === "linked" ? !1 : await readWorktreeConfigExtension(e, n, r, s);
  if (re === null) return setupFailure("could not read extensions.worktreeConfig", "config");
  let he = re
    ? await y([
        "config",
        "-z",
        "--show-origin",
        "--no-includes",
        "--file",
        join_7(n.gitDir, "config.worktree"),
        "--list",
      ])
    : null;
  if (
    he !== null &&
    he.code !== 0 &&
    (await probeEntryKind(join_7(n.gitDir, "config.worktree"))) !== "absent"
  )
    return setupFailure("could not read the per-worktree configuration", "config");
  let filtered_2 = [
    ...(L.code === 0 ? parseGitConfigNullList(L.stdout) : []),
    ...(he?.code === 0 ? parseGitConfigNullList(he.stdout) : []),
  ].filter(({ key: key }) => CHECKOUT_SHAPE_CONFIG_KEYS.has(key));
  if (Q.some((Ne) => Ne.code !== 0 && Ne.exitCode !== 1))
    return setupFailure(
      "could not read the core.excludesFile or core.attributesFile setting from this checkout's git configuration",
      "config",
    );
  let flattened = hy.flatMap((Ne, Je) => {
    let lt = Q[Je];
    if (lt === void 0 || lt.code !== 0) return [];
    let { origin: origin, value: ze, passedOver: passedOver } = lastGlobalOrSystemValue(lt.stdout);
    if (passedOver)
      logForDebugging(
        `[builderGit] ${Ne} from the repository, a worktree or the command line is ignored under the private git directory: only the user's or the system's own value applies there`,
      );
    return origin?.startsWith("file:") === !0 &&
      ze !== void 0 &&
      isAbsolute_6(ze) &&
      nO.test(ze) &&
      !ze.includes("\uFFFD")
      ? [{ key: Ne, value: ze }]
      : [];
  });
  if (
    j === null ||
    !(/^ref: refs\/heads\/[^\u0000-\u0020\u007f]+$/.test(j) || /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(j))
  )
    return setupFailure(yO(n), "head");
  if (symbolic.has(j.replace(/^ref: /, ""))) return setupFailure(SYMBOLIC_REF_CHECKOUT_NOTE, "symbolic_head");
  if (
    j.startsWith("ref: ") &&
    !carried.includes(` ${j.slice(5)}
`) &&
    (await P()) !== j
  )
    return setupFailure(
      `${displayRepoPath(n, join_7(n.gitDir, "HEAD"))} changed while the branches were being read: most likely a branch was switched, renamed or deleted meanwhile`,
      "other",
    );
  if (filtered.length > Ad) return setupFailure(tooManySplitIndexMessage(n), "shared_index");
  if (
    (
      await Promise.all(
        filtered.map((Ne) =>
          lstat_2(join_7(n.gitDir, Ne)).then(
            (Je) => (Je.isFile() ? Je.size : 0),
            () => 0,
          ),
        ),
      )
    ).reduce((Ne, Je) => Ne + Je, 0) > yy
  )
    return setupFailure(
      `the split-index files (sharedindex.*) in ${displayRepoPath(n, n.gitDir)} are too large to copy`,
      "shared_index",
    );
  let Ee = getPlatform_2() === "windows" ? "junction" : void 0,
    Ie = dirname_2(n.commonDir),
    ke = reachForBoundSession(n),
    Me = () => oKt(ke === void 0 ? void 0 : ui(ke), s.screenMemo),
    We = await prepareSeedAdmin({ workTree: n.workTree, gitDir: n.gitDir, enclosingTree: Ie }, Me);
  if (We.kind === "failed")
    return We.reason === "home" ? homeSetupFailure(We.detail, We.home) : setupFailure(We.detail, We.reason);
  let { root: root, configHome: configHome } = We,
    dir = We.dir;
  try {
    let Ne = { left: yy + 2 * Cd },
      settled = Promise.allSettled(
        w.map(([yt, At, un]) =>
          checkCopyBudget(join_7(yt, At), join_7(dir, At), Ne, displayRepoPath(n, join_7(yt, At)), un),
        ),
      ),
      lt = Promise.allSettled([
        writeFile_2(
          join_7(dir, "config"),
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
              ({ key: key, value: At, valueless: valueless }) =>
                `	${key.slice(5)}${valueless ? "" : ` = ${quoteGitConfigValue(At)}`}`,
            ),
            ...flattened.map(
              ({ key: key, value: At }) => `	${key.slice(5)} = "${At.replace(/[\\"]/g, (un) => `\\${un}`)}"`,
            ),
            "\tlongpaths = true",
            ...(Z === "sha256" ? ["[extensions]", "\tobjectformat = sha256"] : []),
            "",
          ].join(`
`),
          { flag: "wx", mode: 384 },
        ),
        writeFile_2(
          join_7(dir, "HEAD"),
          j +
            `
`,
          { flag: "wx", mode: 384 },
        ),
        Id.filter((yt) => yt !== "objects" || h !== "own").reduce(
          (yt, At) => yt.then(() => symlink(join_7(n.commonDir, At), join_7(dir, At), Ee)),
          Promise.resolve(),
        ),
        ...(h === "own" ? [mkdir_3(join_7(dir, "objects"), { mode: 448 })] : []),
        mkdir_3(join_7(dir, "refs"), { mode: 448 }),
        writeFile_2(join_7(dir, "packed-refs"), carried, { flag: "wx", mode: 384 }),
      ]).then((yt) => {
        let found = yt.find((un) => un.status === "rejected");
        return found === void 0 ? null : { error: found.reason };
      }),
      Ae = await settled,
      ze = Ae.flatMap((yt) => (yt.status === "fulfilled" && yt.value !== null ? [yt.value] : []))[0];
    if (ze !== void 0) return (await lt, await sweepPrivateGitDir(dir), setupFailure(ze.why, ze.cause));
    let found = Ae.find((yt) => yt.status === "rejected");
    if (found !== void 0) throw (await lt, found.reason);
    let Nt = await lt;
    if (Nt !== null) {
      if (
        !READ_ONLY_ERRORS.includes(getErrnoCode(Nt.error) ?? "") ||
        !isSkippableCopyError(Nt.error, configHome, root)
      )
        throw Nt.error;
      return (await sweepPrivateGitDir(dir), homeSetupFailure(errorMessage(Nt.error), configHome));
    }
    if (r?.aborted) throw Error("aborted");
    let An = dir,
      ln = async () => {
        await sweepPrivateGitDir(An);
      };
    return {
      kind: "made",
      path: An,
      ...(h === "own" && { borrowedObjects: join_7(n.commonDir, "objects") }),
      dispose: ln,
      [Symbol.asyncDispose]: ln,
    };
  } catch (error) {
    if (dir !== null) await sweepPrivateGitDir(dir);
    return setupFailure(
      `${getFirstLine(errorMessage(error))} \u2014 while writing under ${join_7(configHome, "seed-admin")}, where the copies take up to 1.5 GiB`,
      "other",
    );
  }
}
//@ chunk-s61vbvea.js:247707-247750 placement
var rO = ["core.attributesfile", "attr.tree"];
//@ chunk-s61vbvea.js:247750-247807 placement
function wd({ key: key }) {
  return rO.includes(key.toLowerCase());
}
//@ chunk-s61vbvea.js:247807-247871 placement
function zy({ key: key }) {
  return key.toLowerCase() === "core.ignorecase";
}
//@ chunk-s61vbvea.js:247871-247945 placement
var oO = ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "XDG_CONFIG_HOME", "HOME"];
//@ chunk-s61vbvea.js:247945-248568 placement
function readAttributesConfig(e, n, r, s) {
  let h = (P) => (getPlatform_2() === "windows" ? P.replaceAll("\\", "/").toLowerCase() : P),
    y = (P) => r.map(h).includes(h(resolveFileUrl(P.origin, s.workTree) ?? "")),
    S = (P) => P.key.toLowerCase() === "core.attributesfile" && y(P) && lO(P.value),
    found = n.find((P) => wd(P) || zy(P)),
    R = found ?? e.find((P) => wd(P) && !S(P));
  if (R === void 0) return null;
  let lower = R.key.toLowerCase();
  return {
    ...(found === void 0 && lower === "core.attributesfile" && y(R) && { relative: !0 }),
    ...(lower === "attr.tree"
      ? { kind: "attr_tree", setting: "attr.tree" }
      : lower === "core.ignorecase"
        ? { kind: "ignore_case", setting: "core.ignoreCase" }
        : { kind: "attributes_file", setting: "core.attributesFile" }),
    where: displayRepoPath(s, resolveFileUrl(R.origin, s.workTree) ?? R.origin),
  };
}
/**
 * 环境中会让私有 git 目录读法不同的设置。
 */
//@ chunk-s61vbvea.js:248568-249295 placement
function findUnsupportedGitEnv(e) {
  if (getEnvCaseInsensitive(e, "GIT_ATTR_SOURCE") !== void 0)
    return { kind: "attr_source_env", setting: "GIT_ATTR_SOURCE" };
  let found = ["GIT_CONFIG_COUNT", "GIT_CONFIG_PARAMETERS"].find((x) => {
    let P = readGitConfigFromEnv({
      ...e,
      [x === "GIT_CONFIG_COUNT" ? "GIT_CONFIG_PARAMETERS" : "GIT_CONFIG_COUNT"]: void 0,
    });
    return (
      P === null || P.some(({ key: key }) => uS(key.toLowerCase()) || wd({ key: key }) || zy({ key: key }))
    );
  });
  if (found !== void 0) return { kind: "env_config", setting: found };
  let r = getPlatform_2() === "windows",
    s = (x) => x !== void 0 && x !== "" && !Ky(x, r),
    found_2 = oO.find((x) => s(getEnvCaseInsensitive(e, x))),
    y = getEnvCaseInsensitive(e, "HOME") ? void 0 : getHomeDirCandidates(e).find(s),
    S =
      y === void 0
        ? void 0
        : y === `${getEnvCaseInsensitive(e, "HOMEDRIVE")}${getEnvCaseInsensitive(e, "HOMEPATH")}`
          ? "HOMEPATH"
          : "USERPROFILE",
    w = r && s(getEnvCaseInsensitive(e, "PROGRAMDATA")) ? "PROGRAMDATA" : void 0,
    R = found_2 ?? S ?? w;
  return R === void 0 ? null : { kind: "config_location", setting: R };
}
//@ chunk-s61vbvea.js:249295-249366 placement
function Ky(e, n) {
  return n ? /^(?:[A-Za-z]:[\\/]|[\\/]{2})/.test(e) : isAbsolute_6(e);
}
//@ chunk-s61vbvea.js:249366-249439 placement
function lO(e) {
  return e === "" || /^~[^/]*\//.test(e) || Ky(e, getPlatform_2() === "windows");
}
//@ chunk-s61vbvea.js:249439-249735 placement
function describeUnsupportedGitEnv({ kind: kind, setting: setting, where: where }) {
  return kind === "config_location"
    ? `${setting} is a relative path, which git under the private git directory resolves from another directory`
    : `${setting} is set in ${where ?? "Claude Code\u2019s environment"}, which git does not read the same way under the private git directory`;
}
//@ chunk-s61vbvea.js:249735-249791 placement
function rKt(e) {
  return e === void 0 ? {} : { GIT_INDEX_FILE: e };
}
/**
 * 关闭 split index、开启自动刷新的 -c 参数。
 */
//@ chunk-s61vbvea.js:249791-249893 placement
function splitIndexOffArgs(e) {
  return e === void 0 ? [] : ["-c", "core.splitIndex=false", "-c", "diff.autoRefreshIndex=true"];
}
//@ chunk-s61vbvea.js:249893-251035 placement
async function rewriteCopyAsSingleFile(e, n, r = HNe()) {
  let s = await listGitRefs(e, ["rev-parse", "--absolute-git-dir", "--git-common-dir"], {
      hardened: !1,
      signal: n,
    }),
    [h, y] = s.stdout.split(`
`);
  if (s.code !== 0 || h === void 0 || !isAbsolute_6(h) || y === void 0)
    return { kind: "failed", cause: "git_dir", detail: "git could not say where its directory is" };
  let S = resolve_2(e, y),
    w = await prepareSeedAdmin({ workTree: e, gitDir: h, enclosingTree: dirname_2(S) }, () =>
      oKt(void 0, r.screenMemo),
    );
  if (w.kind === "failed")
    return w.reason === "home"
      ? { kind: "failed", cause: "home", detail: w.detail, home: w.home }
      : { kind: "failed", cause: w.reason, detail: w.detail };
  let R = () => rm_2(w.dir, { recursive: !0, force: !0 }).catch(() => {});
  try {
    let x = await checkCopyBudget(
      join_7(h, "index"),
      join_7(w.dir, "index"),
      { left: Cd },
      join_7(h, "index"),
      "index",
    );
    if (x !== null) return (await R(), { kind: "failed", cause: "index", detail: x.why });
    let P = join_7(w.dir, "index"),
      j = await listGitRefs(e, ["-c", "core.splitIndex=false", "update-index", "--no-split-index"], {
        hardened: !1,
        signal: n,
        env: { GIT_INDEX_FILE: P },
      });
    if (j.code !== 0)
      return (
        await R(),
        {
          kind: "failed",
          cause: "index",
          detail: `git could not rewrite the copy as one file: ${getFirstLine(j.stderr)}`,
        }
      );
    return { kind: "made", indexFile: P, dispose: R };
  } catch (error) {
    return (await R(), { kind: "failed", cause: "index", detail: getFirstLine(errorMessage(error)) });
  }
}
//@ chunk-s61vbvea.js:251035-252029 placement
async function rebuildCachedTree(e, n, r) {
  let s = (R) =>
      listGitRefs(e, [...splitIndexOffArgs(n), "write-tree", "--missing-ok", ...R], {
        hardened: !1,
        signal: r,
        env: rKt(n),
      }),
    h = await lstat_2(n, { bigint: !0 }).catch((R) =>
      getErrnoCode(R) === "ENOENT" ? "absent" : { unexamined: getErrnoCode(R) ?? errorMessage(R) },
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
  let S = await lstat_2(n, { bigint: !0 }).catch(() => null);
  if (S === null || (h !== "absent" && S.ino === h.ino))
    return {
      kind: "failed",
      detail: "its cached tree, rebuilt from its entries, could not be written back into the copy",
    };
  let w = await s([]);
  return w.code === 0 && w.stdout.trim() === y.stdout.trim()
    ? { kind: "honest", tree: y.stdout.trim() }
    : { kind: "failed", detail: "its cached tree could not be replaced by the one its entries give" };
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
  ],
  READ_ONLY_ERRORS = ["EACCES", "EPERM", "EROFS", "EOPNOTSUPP", "ENOTSUP"];
//@ chunk-s61vbvea.js:252181-252402 placement
function isSkippableCopyError(e, n, r) {
  let s = getErrnoCode(e),
    h =
      typeof e !== "object" || e === null
        ? void 0
        : "dest" in e && typeof e.dest === "string"
          ? e.dest
          : "path" in e
            ? e.path
            : void 0;
  return (
    s !== void 0 &&
    COPY_SKIPPABLE_ERRORS.includes(s) &&
    typeof h === "string" &&
    (isPathInside_2(n, h) || isPathInside_2(dirname_2(r), h))
  );
}
//@ chunk-s61vbvea.js:252402-252504 placement
function displayRepoPath(e, n) {
  let r = isPathInside_2(e.workTree, n) ? relative_5(e.workTree, n) : n;
  return r.length > 160 ? `\u2026${takeLastChars(r, 159)}` : r;
}
/**
 * 解析 ref 列表：直接 ref 文本与符号 ref 集合。
 */
//@ chunk-s61vbvea.js:252504-252869 placement
function parsePackedRefs(e) {
  let flattened = e
    .split(
      `
`,
    )
    .flatMap((r) => {
      let [, s, h, y] =
        /^([0-9a-f]{40}(?:[0-9a-f]{24})?) (refs\/[^\u0000-\u0020\u007f]+) (.*)$/s.exec(r) ?? [];
      return s === void 0 || h === void 0 ? [] : [{ id: s, name: h, target: y }];
    });
  return {
    carried: flattened
      .filter(({ target: target }) => target === "")
      .map(
        ({ id: id, name: s }) => `${id} ${s}
`,
      )
      .join(""),
    symbolic: new Set(flattened.filter(({ target: target }) => target !== "").map(({ name: r }) => r)),
  };
}
//@ chunk-s61vbvea.js:252869-252900 placement
var Yy = (e, n) => open_4(join_7(e, n), $c());
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
    let R = await lstat_2(e).catch(() => null);
    if (R !== null && !R.isFile())
      return R.isSymbolicLink() ? h("is a symbolic link", "link") : h("is not a regular file", "other");
  }
  let y;
  try {
    y = await s(dirname_2(e), basename_2(e));
  } catch (error) {
    let x = getErrnoCode(error);
    if (x === "ENOENT") return null;
    return x === "ELOOP" || x === "EMLINK"
      ? h("is a symbolic link", "link")
      : h(`cannot be opened (${x ?? "no error code"})`, "other");
  }
  let S = await y.stat().catch(() => null),
    w =
      S === null || !S.isFile()
        ? h("is not a regular file", "other")
        : S.nlink > 1
          ? h("has a second name (a hard link)", "second_name")
          : S.nlink !== 1
            ? h("changed while it was read", "replaced")
            : S.size > Cd
              ? h("is larger than 256 MiB, the most this upload copies", "too_large")
              : null;
  if (w !== null || S === null) return (await y.close(), w);
  return { source: y, entry: S };
}
//@ chunk-s61vbvea.js:253874-253914 placement
var pO = /^sharedindex\.[0-9a-f]{40,64}$/;
//@ chunk-s61vbvea.js:253914-254014 placement
function tooManySplitIndexMessage(e) {
  return `more than ${Ad} split-index files (sharedindex.*) stand in ${displayRepoPath(e, e.gitDir)}`;
}
//@ chunk-s61vbvea.js:254155-254369 placement
async function copyFilesChecked(e, n, r = Yy) {
  return (
    await Promise.all(
      n.map(async ([h, y, S]) => {
        let w = await copyFileChecked(join_7(h, y), displayRepoPath(e, join_7(h, y)), S, r);
        if (w !== null && "source" in w) return (await w.source.close(), null);
        return w;
      }),
    )
  ).filter((h) => h !== null);
}
//@ chunk-s61vbvea.js:254369-254453 placement
function yO(e) {
  return `${displayRepoPath(e, join_7(e.gitDir, "HEAD"))} is not a branch or an object id`;
}
//@ chunk-s61vbvea.js:254453-254577 placement
var SYMBOLIC_REF_CHECKOUT_NOTE =
  "it is checked out under a symbolic ref (a second name for another ref), and a branch is taken by its own name only";
//@ chunk-s61vbvea.js:254577-255205 placement
async function checkCopyBudget(e, n, r, s, h) {
  let y = await copyFileChecked(e, s, h, Yy);
  if (y === null || !("source" in y)) return y;
  let { source: source, entry: entry } = y;
  try {
    if (((r.left -= entry.size), r.left < 0))
      return {
        why: `${s} and the other files to copy grew past 1.5 GiB`,
        cause: h === "index" ? "index_too_large" : h === "shared_index" ? h : "shallow_other",
      };
    let R = await open_4(n, "wx", 384);
    try {
      let allocUnsafe = Buffer.allocUnsafe(1048576),
        P = 0;
      while (P < entry.size) {
        let { bytesRead: bytesRead } = await source.read(
          allocUnsafe,
          0,
          Math.min(allocUnsafe.length, entry.size - P),
          P,
        );
        if (bytesRead === 0) break;
        (await R.write(allocUnsafe, 0, bytesRead), (P += bytesRead));
      }
      let date = new Date(),
        time = entry.mtime.getTime(),
        L = time >= 1000 && time <= date.getTime() ? entry.mtime : date;
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
var Id = ["info", "objects"];
//@ chunk-s61vbvea.js:255231-255378 placement = scanDirectory (0.766)
async function scanDirectory(dirPath) {
  try {
    return await removePathEntry(dirPath);
  } catch (error) {
    if (
      getPlatform_2() === "windows" ||
      !(await lstat_2(dirPath).then(
        (entry) => entry.isDirectory(),
        () => !1,
      ))
    )
      throw error;
    return "directory";
  }
}
//@ chunk-s61vbvea.js:255378-255974 placement
async function sweepPrivateGitDir(e, n = Id) {
  try {
    if ((await scanDirectory(e)) !== "directory") return !0;
    let r = await n
      .toReversed()
      .reduce(
        (s, h) =>
          s.then(async () => {
            if (h === "objects") await scanDirectory(join_7(e, h));
            else if ((await removePathEntry(join_7(e, h))) === "directory")
              throw Error("info is a non-empty directory, not a link");
          }),
        Promise.resolve(),
      )
      .then(
        () => null,
        (s) => ({ reason: s }),
      );
    if (r !== null)
      throw (
        await Promise.allSettled(
          (await readdir_3(e))
            .filter((s) => !n.some((h) => h === s))
            .map((s) => removePathEntry(join_7(e, s))),
        ),
        r.reason
      );
    return (await rm_2(e, { recursive: !0, force: !0 }), !0);
  } catch (error) {
    return (
      logForDebugging(
        `[builderGit] a private git directory is left in place (${getErrnoCode(error) ?? errorMessage(error)}): ${e}`,
        { level: "warn" },
      ),
      !1
    );
  }
}
//@ chunk-s61vbvea.js:255974-255989 placement
var _O = 3600000;
//@ chunk-s61vbvea.js:255989-257009 placement
async function stageSeedAdmin(e, n, r) {
  let now = Date.now(),
    h = async () => n !== null && (await getFileIdentity_2(e)) === n && isPrivateOwnedDir(await lstat_2(e)),
    y = async (P) => {
      let match = /^claude-seed-admin-([0-9]+)-([0-9a-z]*)-/.exec(P);
      if (match === null && !P.startsWith("claude-seed-stage-")) return "kept";
      let G = join_7(e, P);
      if (now - (await lstat_2(G)).mtimeMs < _O) return "kept";
      if (match !== null && bO(Number(match[1]))) {
        let L = match[2] ?? "",
          q = L === "" ? "" : await procStartTag(Number(match[1]), r);
        if (q === "" || startTokensEqualOrCrossFormat(L, q)) return "held";
      }
      if (!(await h())) throw Error("seed-admin is no longer the directory that was checked");
      return (await sweepPrivateGitDir(G, match === null ? [] : Id)) ? "removed" : "failed";
    },
    S = (P, j) => (
      logForDebugging(
        `[builderGit] sweeping ${e}: could not examine ${P} (${getErrnoCode(j) ?? errorMessage(j)})`,
        { level: "warn" },
      ),
      "failed"
    ),
    w = await readdir_3(e).catch((P) => S("the list of its entries", P));
  if (w === "failed") return { removed: 0, errors: 1, held: 0 };
  let results = await Promise.all(
      w.map((P) => y(P).catch((j) => (getErrnoCode(j) === "ENOENT" ? "kept" : S(P, j)))),
    ),
    x = count(results, (P) => P === "removed");
  if (x > 0) logForDebugging(`[builderGit] removed ${x} folder(s) that killed builds left under ${e}`);
  return {
    removed: x,
    errors: count(results, (P) => P === "failed"),
    held: count(results, (P) => P === "held"),
  };
}
//@ chunk-s61vbvea.js:257009-257088 placement
function bO(e) {
  try {
    return (process.kill(e, 0), !0);
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
//@ chunk-s61vbvea.js:257088-257197 placement
async function procStartTag(e, n) {
  return ((await getProcessStartTimeAsync(e, { env: n() })) ?? "")
    .replace(/[^0-9a-z]/gi, "")
    .toLowerCase()
    .slice(0, 24);
}

export {
  splitIndexOffArgs,
  rKt,
  rewriteCopyAsSingleFile,
  rebuildCachedTree,
  findUnsupportedGitEnv,
  copyRepositoryForBuild,
  readAttributesConfig,
  stageSeedAdmin,
  procStartTag,
  isSkippableCopyError,
};
