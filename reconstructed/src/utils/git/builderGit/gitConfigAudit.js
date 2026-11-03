/**
 * utils/git/builderGit/gitConfigAudit.ts
 *
 * builderGit：审查仓库 git 配置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (37)
 * attribution: placement 37
 */
import {
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
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
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
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
} from "path";
import {
  realpath,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
} from "fs/promises";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  userInfo,
} from "os";
import { freeze as freeze_6, dre, regExp as regExp_17, BSr } from "../gitSafeEnv.js";
import {
  ui,
  rS,
  IN_TREE_SETTINGS_UNREADABLE,
  IN_TREE_SETTINGS_UNREADABLE_MESSAGE,
  oKt,
  buildGitEnv,
  EMPTY_VALUE,
  VI,
  Oy,
  gitConfigLocationEnv,
  scrubGitTrace2Env,
  WI,
  zI,
  eer,
  cSe,
  DNe,
  opensslConfIncludeEnv,
  tS,
  getPreSettingsEnv,
  reachForBoundSession,
  ES,
  xO,
  regExp_7,
  GIT_ISOLATION_CONFIG_ARGS,
} from "./gitEnv.js";
import { HNe, iKt, windowsGitNote, GitBinaryError } from "./gitBinary.js";
import {
  GIT_NOT_FOUND_MESSAGE,
  SANDBOX_REACH_TEXTS,
  homeInCheckoutNote,
  LVo,
  HO,
  findEnclosingRepos,
  Cvt,
  Lqr,
} from "./sandboxReach.js";
import { getRemoteHostSessionCount } from "../../../commands/insights.js";
import {
  gitDirEnv,
  checkSessionTempRoot,
  resolveGitFile,
  isSameGitDir,
  UI,
  pd,
  fd,
  gitDirChangedFailure,
  getFileIdentity_2,
  resolveLinkedWorktreeGitDir,
  sameIdentity,
  Dnt,
  classifyWorktreeConfig,
} from "./gitDirIdentity.js";
import { uy, withholdGitStderr, RVo, txe } from "./gitRun.js";
import { GIT_FILES_REF_BACKEND_ENV } from "../gitLanes.js";
import {
  PROTECTED_ENV_VARS,
  isPathInside as isPathInside_2,
  collectGitProtectedPaths,
  getGitConfigPaths,
  Yii,
  findReachableProtectedPath,
  isWindowsNonDrivePath,
  getHomeDirCandidates,
  resolveRelative,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { GIT_SAFETY_ENV } from "../gitSafeInvocation.js";
import { DEFAULT_INVOCATION_ENCODING } from "../../detectRepository.js";
import { execFileNoThrowWithCwd } from "../../execFileNoThrow.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../managedEnvApply.js";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { uniq, count } from "../../collections.js";
import { findCanonicalGitRootUncached } from "../../git.js";
import { rc } from "../../pathClassification.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";
import { logEvent } from "../../../services/analytics/index.js";
import {
  statDotGit,
  detectUnsupportedLayout,
  objectsDirFingerprint,
  statFingerprint,
  XP,
} from "./gitDirShape.js";
import { getFirstLine } from "../../stringUtils.js";
import { mapped } from "../../gitSafeExec.js";
import { readAttributesConfig } from "./repoCopy.js";
import { readGitConfigFromEnv } from "./inTreeConfig.js";

//@ chunk-s61vbvea.js:217511-218846 placement
function listGitRefs(e, n, r) {
  let s = r.input === void 0 ? {} : { input: r.input };
  if (!r.hardened)
    return runGitForAudit([...freeze_6, ...n], {
      cwd: e,
      abortSignal: r.signal,
      ...s,
      ...buildAuditEnv(r.env),
      ...(r.maxBuffer !== void 0 && { maxBuffer: r.maxBuffer }),
    });
  let h =
    r.reach ?? (r.reachRoots !== void 0 ? ui(r.reachRoots) : r.layout === void 0 ? void 0 : rS(r.layout));
  if (h === IN_TREE_SETTINGS_UNREADABLE)
    return Promise.resolve({ stdout: "", stderr: IN_TREE_SETTINGS_UNREADABLE_MESSAGE, code: 126 });
  let y = r.probes ?? HNe(),
    S = r.screenMemo ?? y.screenMemo,
    w = oKt(h, S),
    R = iKt(w, y);
  if (R === null)
    return Promise.resolve({
      stdout: "",
      stderr:
        h === void 0 || iKt(buildGitEnv(void 0), y) === null
          ? GIT_NOT_FOUND_MESSAGE
          : `${SANDBOX_REACH_TEXTS}${homeInCheckoutNote(r.layout?.workTree ?? e)}. ${LVo}`,
      code: 127,
    });
  let x = [];
  if (x === void 0) return Promise.resolve({ stdout: "", stderr: EMPTY_VALUE, code: 126 });
  let P = [
    {
      file: R,
      startsOutside:
        h !== void 0 && !(r.startsInProject || r.reachRoots?.startsInProject || r.layout?.startsInProject),
    },
    [...freeze_6, ...VI, ...x, ...n],
    {
      dir: r.layout?.workTree ?? e,
      abortSignal: r.signal,
      maxBuffer: Math.min(r.hardenedMaxBuffer ?? Oy, Oy),
      ...s,
      ...(r.stripFinalNewline === !1 && { stripFinalNewline: !1 }),
      ...(r.encoding !== void 0 && { encoding: r.encoding }),
      ...(r.stdoutFd !== void 0 && { stdout: r.stdoutFd }),
      env: {
        ...neutralizeGitConfigEnv(
          getRemoteHostSessionCount(
            {
              ...gitConfigLocationEnv(w),
              ...scrubGitTrace2Env(w),
              ...WI,
              ...(n[0] === "for-each-ref" && zI),
              ...(r.layout && gitDirEnv(r.layout)),
              ...(r.layout?.borrowedObjects !== void 0 && {
                GIT_ALTERNATE_OBJECT_DIRECTORIES: uy(r.layout.borrowedObjects),
              }),
              ...r.layout?.configPins,
              ...r.env,
            },
            { base: w },
          ),
        ),
        ...(r.layout && GIT_FILES_REF_BACKEND_ENV),
      },
    },
  ];
  return eer(...P).then(withholdGitStderr);
}
/**
 * 审查 git 时关注的环境变量集合与判断函数。
 */
//@ chunk-s61vbvea.js:218846-219554 placement
var AUDITED_ENV_VARS = new Set([
    ...dre,
    "GIT_CONFIG_NOSYSTEM",
    "GIT_REFERENCE_BACKEND",
    "GIT_EXEC_PATH",
    "GIT_ATTR_SOURCE",
    "GIT_SSH",
    "GIT_SSH_COMMAND",
    "GIT_ASKPASS",
    "SSH_ASKPASS",
    "HOME",
    "XDG_CONFIG_HOME",
    "USERPROFILE",
    "HOMEDRIVE",
    "HOMEPATH",
    "PROGRAMDATA",
    "PATH",
    "GIT_EXTERNAL_DIFF",
    "GIT_DIFF_OPTS",
    "GIT_PAGER",
    "GIT_TEMPLATE_DIR",
    "GIT_SSH_VARIANT",
    "SSH_ASKPASS_REQUIRE",
    "GIT_HTTP_PROXY_AUTHMETHOD",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "NO_PROXY",
    "CURL_CA_BUNDLE",
    "SSL_CERT_FILE",
    "SSL_CERT_DIR",
    "NIX_SSL_CERT_FILE",
    "SSLKEYLOGFILE",
    "GIT_ALLOW_PROTOCOL",
    ...PROTECTED_ENV_VARS,
    ...Object.keys(GIT_SAFETY_ENV),
  ]),
  GIT_TRACE_ENV_RE = /^GIT_(?:CURL_|LFS_|TRACE|TRANSFER_TRACE$|REDIRECT_STD)/i,
  isAuditedEnvVar = (e) =>
    AUDITED_ENV_VARS.has(e.toUpperCase()) ||
    regExp_17.test(e) ||
    GIT_TRACE_ENV_RE.test(e) ||
    BSr.test(e) ||
    cSe(e) ||
    DNe(e);
/**
 * 审查用 git 环境（恢复设置前的值与 OpenSSL include）。
 */
//@ chunk-s61vbvea.js:219554-219675 placement
function buildAuditEnv(e) {
  let n = { ...diffPreSettingsEnv(), ...e },
    r = opensslConfIncludeEnv({ ...process.env, ...n }),
    s = { ...n, ...r };
  return Object.keys(s).length > 0 ? { env: s } : {};
}
//@ chunk-s61vbvea.js:219675-219707 placement
function RP() {
  return iKt(Oqr());
}
/**
 * 运行 git（找不到时返回 127 并隐藏 stderr）。
 */
//@ chunk-s61vbvea.js:219707-219865 placement
function runGitForAudit(e, n) {
  let r = RP(),
    s = { ...n, encoding: n.encoding ?? DEFAULT_INVOCATION_ENCODING };
  return r === null
    ? Promise.resolve({ stdout: "", stderr: `${GIT_NOT_FOUND_MESSAGE}${windowsGitNote()}`, code: 127 })
    : execFileNoThrowWithCwd(r, e, s).then(withholdGitStderr);
}
//@ chunk-s61vbvea.js:219865-219916 placement
function Oqr() {
  return tS({ ...process.env, ...diffPreSettingsEnv() });
}
/**
 * 设置生效前后不同的被审查变量。
 */
//@ chunk-s61vbvea.js:219916-220321 placement
function diffPreSettingsEnv() {
  if (getLatchedPreSettingsEnvSnapshot() === void 0) return {};
  let e = getPreSettingsEnv(),
    env = process.env,
    r = getPlatform_2() === "windows" ? (y) => y.toUpperCase() : (y) => y,
    s = new Map(Object.keys(env).map((y) => [r(y), y])),
    h = new Map(Object.keys(e).map((y) => [r(y), y]));
  return Object.fromEntries(
    uniq([...s.keys(), ...h.keys()]).flatMap((y) => {
      let S = s.get(y),
        w = h.get(y),
        R = S ?? w ?? y,
        x = w === void 0 ? void 0 : e[w];
      if (!isAuditedEnvVar(R) || (S === void 0 ? void 0 : env[S]) === x) return [];
      return [[R, x ?? TP(R)]];
    }),
  );
}
//@ chunk-s61vbvea.js:220321-220395 placement
var xP = GIT_SAFETY_ENV,
  TP = (e) => xP[e.toUpperCase()],
  nKt = { GIT_REFERENCE_BACKEND: void 0 };
//@ chunk-s61vbvea.js:220395-220638 placement
function neutralizeGitConfigEnv(e) {
  let n = new Set(["GIT_CONFIG", "GIT_ATTR_SOURCE", ...Object.keys(nKt)]),
    filtered = Object.keys(e).filter((s) => n.has(s.toUpperCase()));
  return {
    ...e,
    ...Object.fromEntries(filtered.map((s) => [s, void 0])),
    GIT_CONFIG: void 0,
    GIT_ATTR_SOURCE: void 0,
    ...nKt,
  };
}
//@ chunk-s61vbvea.js:220638-220700 placement
function Hy(e) {
  return e !== void 0 && e !== "files" && e !== "reftable";
}
//@ chunk-s61vbvea.js:220700-220918 placement
function classifyConfigFile(e, n, r) {
  return {
    path: e,
    kind: n.includes(e) ? "user_level" : r.fixed.includes(e) ? "repository" : "included",
    ground: e.includes("\uFFFD")
      ? "not_text"
      : !r.fixed.includes(e) && r.roots.some((root) => isPathInside_2(root, e))
        ? "inside"
        : "indirect",
  };
}
//@ chunk-s61vbvea.js:220918-220984 placement
var AP = ["user_level", "system", "condition", "unknown", "repository"];
//@ chunk-s61vbvea.js:220984-221996 placement
function auditRefStorageSetting(e) {
  if (e === "ignored_setting")
    return "a git configuration file other than this repository\u2019s own config sets extensions.refStorage. git ignores that key there, but this upload does not start while git lists it with a location. The file is one of these: the system-wide git configuration, ~/.gitconfig, ~/.config/git/config (or $XDG_CONFIG_HOME/git/config), what GIT_CONFIG_GLOBAL or GIT_CONFIG_SYSTEM names, the repository\u2019s config.worktree, or a file that one of them or the repository\u2019s config includes. Remove the key from that file and retry";
  return e === "variable"
    ? "the variable GIT_REFERENCE_BACKEND tells git to keep branches and tags in another place, which this upload does not read; start claude without that variable (a Claude Code settings file may also set it, in its env block)"
    : "this repository\u2019s own git configuration (extensions.refStorage) keeps its branches and tags in another place, which this upload does not read; work from an ordinary clone of the repository";
}
/**
 * 检查仓库 git 布局（common dir、worktree、admin dir）是否可信
 */
//@ chunk-s61vbvea.js:221996-226988 placement
async function inspectGitLayout(
  e,
  n,
  {
    linkedTrees: r = !1,
    bound: s = r,
    startsInProject: h = !1,
    perWorktreeConfig: y = "refuse",
    notesBareRepository: S = !1,
    probes: w = HNe(),
    holder: R,
    namedCommonDirs: x = [],
    findKeyedFolder: P = findCanonicalGitRootUncached,
    keepsListedSettings: j = !1,
  } = {},
) {
  if (x.some((ke) => !isAbsolute_6(ke)))
    return { kind: "failed", detail: "a common directory named for this tree is not an absolute path" };
  let G = w.screenMemo === void 0 ? new GitBinaryError("operation") : w,
    L = rc(e) ? null : await realpath_3(e).catch(() => null);
  if (L === null)
    return {
      kind: "failed",
      detail: "the launch directory could not be resolved",
      cause: "launch_folder_unresolved",
    };
  if (s) {
    if ((await checkSessionTempRoot(L)).some((Me) => isPathInside_2(Me, L) || isPathInside_2(Me, e)))
      return { kind: "tampered", misplaced: "temp_root", gitDir: "", commonDir: "" };
  }
  if ([buildGitEnv(void 0), process.env].some((ke) => Hy(getEnvCaseInsensitive(ke, "GIT_REFERENCE_BACKEND"))))
    return { kind: "tampered", misplaced: "ref_storage", keptBy: "variable", gitDir: "", commonDir: "" };
  let q = await resolveGitFile(L);
  if (q.kind === "refuse" || (q.kind === "chain" && !r))
    return {
      kind: "tampered",
      misplaced: q.kind === "refuse" && q.why !== "git_file" ? "linked_worktree" : "git_file",
      gitDir: q.adminDir ?? "",
      commonDir: q.kind === "chain" ? q.commonDir : "",
      ...(q.kind === "refuse" && { detail: q.why }),
    };
  if (q.kind === "chain" && x.some((ke) => ke !== q.commonDir))
    return { kind: "tampered", misplaced: "common_dir", gitDir: q.adminDir, commonDir: q.commonDir };
  let Q = async (ke) => {
    let results = await Promise.all(uniq([e, L]).map((We) => isSameGitDir(ke, L, P(We))));
    return results.includes(!1) ? !1 : results.includes("unresolved") ? "unresolved" : !0;
  };
  if (q.kind === "chain") {
    let ke = await Q({ resolved: q.commonDir });
    if (ke !== !0)
      logEvent("tengu_git_layout_keyed_elsewhere", { bound: s, unresolved: ke === "unresolved" });
    if (ke === "unresolved" && s)
      return {
        kind: "failed",
        detail: "the folder that keeps this tree\u2019s trust could not be resolved",
        cause: "keyed_folder_unresolved",
      };
    if (ke === !1 && s)
      return {
        kind: "tampered",
        misplaced: "linked_worktree",
        gitDir: q.adminDir,
        commonDir: q.commonDir,
        detail: "keyed_elsewhere",
      };
  }
  if (q.kind === "not_file" && x.length > 0) {
    let ke = join_7(L, ".git"),
      Me = await statDotGit(L);
    if (Me.kind === "unreadable") return { kind: "failed", detail: Me.detail };
    return Me.kind === "directory"
      ? { kind: "tampered", misplaced: "git_dir", gitDir: ke, commonDir: ke }
      : { kind: "failed", detail: "this linked working tree's .git file is missing" };
  }
  let [Z = "not_held", ee = "not_held"] =
      R === void 0
        ? []
        : await Promise.all(
            (q.kind === "chain" ? [q.adminDir, q.commonDir] : [join_7(L, ".git")]).map((ke) => R.hold(ke)),
          ),
    ae = s ? HO(L, [...findEnclosingRepos(L), ...(q.kind === "chain" ? [Cvt(q.commonDir)] : [])]) : void 0,
    se = (ke) =>
      listGitRefs(e, ["rev-parse", ...ke], {
        hardened: !0,
        signal: n,
        probes: G,
        stripFinalNewline: !1,
        env: { GIT_CEILING_DIRECTORIES: UI(L, e) },
        ...(ae !== void 0 && { reach: ae, startsInProject: h }),
      }),
    [re, he, Se] = await Promise.all([
      se(["--absolute-git-dir"]),
      se(["--path-format=absolute", "--git-common-dir"]),
      se(["--show-toplevel"]),
    ]),
    ce = pd(re.stdout),
    we = pd(he.stdout),
    ie = pd(Se.stdout);
  if (
    [re, he, Se].some(({ code: code }) => code !== 0) ||
    ce === null ||
    we === null ||
    ie === null ||
    !isAbsolute_6(ce) ||
    !isAbsolute_6(ie)
  ) {
    let found = [re, he, Se].find(({ stderr: stderr }) => stderr !== ""),
      Me =
        re.exitCode === 126 || re.exitCode === 127
          ? ae !== void 0 && !h
            ? "git_did_not_run_from_outside"
            : "git_did_not_run"
          : found && RVo(txe(found));
    return {
      kind: "failed",
      detail: getFirstLine((found?.stderr ?? re.stdout).trim()),
      ...(Me !== void 0 && { cause: Me }),
      ...(re.code === 127 &&
        re.stderr.startsWith(GIT_NOT_FOUND_MESSAGE) && {
          why: "git_not_found",
          ...(re.stderr !== GIT_NOT_FOUND_MESSAGE && { withinReach: !0 }),
        }),
      ...(re.stderr === IN_TREE_SETTINGS_UNREADABLE_MESSAGE && { why: "settings_unreadable" }),
    };
  }
  if (getFirstLine(we) === "--path-format=absolute")
    return { kind: "tampered", misplaced: "old_git", gitDir: ce, commonDir: we };
  if (!isAbsolute_6(we)) return { kind: "tampered", misplaced: "common_dir", gitDir: ce, commonDir: we };
  let Ee = await statDotGit(e);
  if (Ee.kind === "unreadable") return { kind: "failed", detail: Ee.detail };
  if (Ee.kind === "directory") {
    if (!fd(Z, Ee.id)) return gitDirChangedFailure(Z);
    if (Ee.id !== (await getFileIdentity_2(ce)))
      return { kind: "tampered", misplaced: "git_dir", gitDir: ce, commonDir: we };
    if (we !== ce) return { kind: "tampered", misplaced: "common_dir", gitDir: ce, commonDir: we };
  }
  let Ie = await detectUnsupportedLayout(we);
  if (Ie !== null) return { kind: "tampered", misplaced: Ie, gitDir: ce, commonDir: we };
  if (Ee.kind === "not_a_directory") {
    if (!r || q.kind !== "chain")
      return { kind: "tampered", misplaced: "git_file", gitDir: ce, commonDir: we, detail: "git_file" };
    let ke = await resolveLinkedWorktreeGitDir(L, ce, we, q);
    if (ke.kind !== "vouched")
      return ke.kind === "unread"
        ? { kind: "failed", detail: ke.detail, why: "changed_under_read" }
        : {
            kind: "tampered",
            misplaced: ke.kind,
            gitDir: ce,
            commonDir: we,
            detail: ke.kind === "linked_worktree" ? ke.detail : "git_file",
          };
    let Me = { resolved: ke.commonDir, id: ke.commonDirId };
    if (
      s &&
      !(
        sameIdentity(Me, { id: await getFileIdentity_2(q.commonDir), resolved: q.commonDir }) &&
        (await Q(Me)) === !0
      )
    )
      return {
        kind: "failed",
        detail: "the git directory changed while it was read",
        why: "changed_under_read",
      };
    if (!fd(Z, ke.gitDirId) || !fd(ee, ke.commonDirId)) return gitDirChangedFailure(Z, ee);
    return auditGitDirConfig(
      e,
      {
        gitDir: ke.gitDir,
        gitDirId: ke.gitDirId,
        ...(ke.gitDirBorn !== void 0 && { gitDirBorn: ke.gitDirBorn }),
        commonDir: ke.commonDir,
        commonDirId: ke.commonDirId,
        ...(ke.commonDirBorn !== void 0 && { commonDirBorn: ke.commonDirBorn }),
        workTree: ie,
        checkout: "linked",
        bound: s,
        ...(h && { startsInProject: h }),
      },
      L,
      n,
      G,
      { perWorktreeConfig: y, notesBareRepository: S },
    );
  }
  return auditGitDirConfig(
    e,
    {
      gitDir: ce,
      gitDirId: Ee.id,
      ...(Ee.born !== void 0 && { gitDirBorn: Ee.born }),
      commonDir: we,
      workTree: ie,
      checkout: "main",
      bound: s,
      ...(h && { startsInProject: h }),
    },
    L,
    n,
    G,
    { keepsListedSettings: j },
  );
}
//@ chunk-s61vbvea.js:226988-228840 placement
async function auditGitDirConfig(
  e,
  n,
  r,
  s,
  h,
  {
    perWorktreeConfig: perWorktreeConfig = "refuse",
    notesBareRepository: notesBareRepository = !1,
    keepsListedSettings: keepsListedSettings = !1,
  },
) {
  let { gitDir: gitDir, commonDir: commonDir, workTree: workTree } = n,
    [j, G] = await (workTree === Dnt(r)
      ? getFileIdentity_2(r).then((re) => [re, re])
      : Promise.all([getFileIdentity_2(workTree), getFileIdentity_2(r)]));
  if (G === null || j !== G)
    return {
      kind: "tampered",
      misplaced: "work_tree",
      gitDir: gitDir,
      commonDir: commonDir,
      ...(G === null && { unexamined: !0 }),
    };
  let L = { ...n, workTree: Dnt(r), workTreeId: G, ...(workTree !== Dnt(r) && { workTreeRespelled: !0 }) },
    q = await objectsDirFingerprint(commonDir);
  if (q.info === "absent" || q.pack === "absent")
    return {
      kind: "failed",
      detail:
        "objects/info or objects/pack is missing from the git directory (running git init again in the checkout puts them back)",
      cause: "git_dir_objects_folder_missing",
    };
  let Q = L.checkout === "linked" ? await classifyWorktreeConfig(e, L, s, h) : "absent";
  if (Q === "unread") return { kind: "failed", detail: "could not read extensions.worktreeConfig" };
  if (Q === "file" || (Q !== "absent" && perWorktreeConfig === "refuse"))
    return {
      kind: "tampered",
      misplaced: "linked_worktree",
      gitDir: gitDir,
      commonDir: commonDir,
      detail: "worktree_config",
    };
  let Z = Q === "absent" ? L : { ...L, worktreeConfig: Q },
    ee = [join_7(commonDir, "config"), join_7(gitDir, "config.worktree")],
    ae = keepsListedSettings ? await statFingerprint(ee) : null,
    se = await listGitConfigInForce(e, Z, s, h);
  switch (se.kind) {
    case "unlistable":
      return { kind: "failed", detail: se.detail };
    case "many_includes":
      return { kind: "tampered", misplaced: "many_includes", gitDir: gitDir, commonDir: commonDir };
    case "ref_storage":
      return {
        kind: "tampered",
        misplaced: "ref_storage",
        keptBy: se.keptBy,
        gitDir: gitDir,
        commonDir: commonDir,
      };
    case "reftable":
      return { kind: "tampered", misplaced: "reftable", gitDir: gitDir, commonDir: commonDir };
    case "included":
      return {
        kind: "tampered",
        misplaced: "included_config",
        writable: `${se.configFile.kind}_${se.configFile.ground}`,
        configFile: se.configFile,
        ...(se.includedBy !== void 0 && { includedBy: se.includedBy }),
        gitDir: gitDir,
        commonDir: commonDir,
      };
    case "pins": {
      let he =
        ae === null || se.listed.some(({ key: key }) => key.startsWith("includeif.onbranch:"))
          ? null
          : await statFingerprint(se.settingsFiles);
      return { kind: "read", layout: { ...Z, storeStamps: q, ...se.pins, ...{}, ...{} } };
    }
  }
}
//@ chunk-s61vbvea.js:228840-228950 placement
function isCommonDirConfigFile(e, { commonDir: commonDir, workTree: workTree }) {
  let s = resolveFileUrl(e, workTree);
  return (
    s !== null &&
    basename_2(s) === "config" &&
    isPathInside_2(commonDir, s) &&
    isPathInside_2(dirname_2(s), commonDir)
  );
}
//@ chunk-s61vbvea.js:228950-229035 placement
var IP = /^hook\.(?:(.*)\.)?(?:command|event|enabled)$/s,
  MP = new Set(mapped.map(([e]) => e));
//@ chunk-s61vbvea.js:229035-229067 placement
function DP(e) {
  return MP.has(e);
}
//@ chunk-s61vbvea.js:229067-229142 placement
function NP(e) {
  let n = DP(e) ? null : IP.exec(e);
  return n === null ? void 0 : (n[1] ?? "");
}
//@ chunk-s61vbvea.js:229142-232019 placement
async function listGitConfigInForce(e, n, r, s) {
  let h = { kind: "unlistable", detail: "could not list the configuration in force" },
    y = reachForBoundSession(n),
    S = s.screenMemo ?? Lqr(),
    w = (Be) =>
      listGitRefs(e, Be, {
        hardened: !0,
        layout: n,
        signal: r,
        probes: s,
        ...(y !== void 0 && { reachRoots: y, screenMemo: S }),
      }),
    R = async (Be) => {
      let [Re, Ne] = await Promise.all([
          w(["config", "-z", "--show-origin", ...Be, "--list"]),
          w(["config", "-z", "--show-origin", "--type=path", ...Be, "--get-regexp", ES]),
        ]),
        Je = Be.length > 0 && Re.exitCode === 128 && !xO(Re);
      if ((Re.code !== 0 && !Je) || (Ne.code !== 0 && Ne.exitCode === void 0)) return null;
      let lt = Je ? [] : parseGitConfigNullList(Re.stdout),
        flattened = [
          ...lt.filter(({ key: key }) => regExp_7.test(key)),
          ...(Ne.code === 0 ? parseGitConfigNullList(Ne.stdout) : []),
        ].flatMap(({ origin: origin, key: key, value: Nt }) =>
          resolveIncludePaths(Nt, origin, n.workTree).map((An) => ({ holder: origin, key: key, target: An })),
        );
      return { keys: lt, targets: flattened.map(({ target: target }) => target), directives: flattened };
    },
    [x, P, j] = await Promise.all([R([]), w(["var", "GIT_CONFIG_GLOBAL"]), w(["var", "GIT_CONFIG_SYSTEM"])]);
  if (x === null) return h;
  let filtered = x.keys.filter(({ key: key }) => key === "extensions.refstorage"),
    L = (Be) => resolveFileUrl(Be, n.workTree) === null || isCommonDirConfigFile(Be, n),
    filtered_2 = filtered.filter(({ value: Be }) => Hy(Be));
  if (filtered_2.length > 0)
    return {
      kind: "ref_storage",
      keptBy: filtered_2.some(({ origin: origin }) => L(origin)) ? "setting" : "ignored_setting",
    };
  if (XP(filtered, L)) return { kind: "reftable" };
  let Q = await collectGitProtectedPaths(
    n.workTree,
    { GIT_DIR: n.gitDir, GIT_COMMON_DIR: n.commonDir },
    n.workTree,
  );
  if (Q === null) return h;
  let Z =
      j.code === 0
        ? j.stdout.split(`
`)
        : [],
    ee = null,
    ae = buildGitEnv(void 0),
    se = [n.workTree, ee, ae],
    re = getGitConfigPaths(
      [
        ...(P.code === 0
          ? P.stdout.split(`
`)
          : []),
        ...Z,
      ],
      ...se,
    ),
    he = Yii(Z, ...se),
    Se = [...x.keys.map(({ origin: origin }) => resolveFileUrl(origin, n.workTree)), ...re],
    ce = (Be) => ({
      kind: "included",
      configFile: classifyConfigFile(Be, re, Q),
      ...(!re.includes(Be) &&
        !Q.fixed.includes(Be) && {
          includedBy: attributeIncludeSource(Be, x.directives, {
            workTree: n.workTree,
            userFiles: re,
            systemFiles: he,
            fromOwnConfig: L,
          }),
        }),
    }),
    found = Se.find((Be) => Be?.includes("\uFFFD"));
  if (found !== void 0 && found !== null) return ce(found);
  let ie = await findReachableProtectedPath(Q, Se);
  if (ie !== void 0) return ie === null ? h : ce(ie);
  let Ee = await collectIncludedConfigs(
    x.targets,
    (Be) => R(["--file", Be]),
    (Be) => findReachableProtectedPath(Q, Be),
  );
  if (Ee === null) return h;
  if ("tooMany" in Ee) return { kind: "many_includes" };
  if ("contributes" in Ee) return ce(Ee.contributes);
  let Ie = [...x.keys, ...Ee.keys],
    Me = ((Be) =>
      uniq(
        Ie.flatMap(({ key: key }) => {
          let Ne = Be.exec(key)?.[1];
          return Ne === void 0 ? [] : [Ne];
        }),
      ))(/^filter\.(.*)\.(?:clean|smudge|process|required)$/s),
    We = uniq(Ie.flatMap(({ key: key }) => NP(key) ?? []));
  if ([...Me, ...We].some((Be) => Be.includes("\uFFFD"))) return { kind: "unlistable", detail: WP };
  let nt = [
    ...Me.flatMap((Be) => [
      [`filter.${Be}.clean`, ""],
      [`filter.${Be}.smudge`, ""],
      [`filter.${Be}.process`, ""],
      [`filter.${Be}.required`, "false"],
    ]),
    ...We.flatMap((Be) => [
      [`hook.${Be}.enabled`, "false"],
      [`hook.${Be}.event`, ""],
    ]),
  ];
  return {
    kind: "pins",
    listed: x.keys,
    settingsFiles: uniq([...Se, ...x.targets].filter((Be) => Be !== null)),
    pins: {
      filterDrivers: Me,
      attributeSetting: readAttributesConfig(x.keys, Ee.keys, re, n),
      configPins: Object.fromEntries([
        ["GIT_CONFIG_COUNT", String(nt.length)],
        ...nt.flatMap(([Be, Re], Ne) => [
          [`GIT_CONFIG_KEY_${Ne}`, Be],
          [`GIT_CONFIG_VALUE_${Ne}`, Re],
        ]),
      ]),
    },
  };
}
//@ chunk-s61vbvea.js:232019-232043 placement
var FP = 8,
  QZn = 32,
  HP = 4096;
/**
 * 判断 include 目标由哪类配置引入。
 */
//@ chunk-s61vbvea.js:232043-232461 placement
function attributeIncludeSource(
  e,
  n,
  { workTree: workTree, userFiles: userFiles, systemFiles: systemFiles, fromOwnConfig: fromOwnConfig },
) {
  let S = resolve_2(e),
    w = n.some(({ target: target }) => fromOwnConfig(`file:${target}`)) ? "unknown" : "repository",
    R = new Set(
      n
        .filter(({ target: target }) => resolve_2(target) === S)
        .map(({ holder: holder, key: key }) => {
          let j = resolveFileUrl(holder, workTree);
          if (j === null) return "unknown";
          if (!userFiles.includes(j)) return fromOwnConfig(holder) ? w : "unknown";
          if (GIT_ISOLATION_CONFIG_ARGS.test(key)) return "condition";
          return systemFiles.includes(j) ? "system" : "user_level";
        }),
    );
  return AP.find((x) => R.has(x)) ?? "unknown";
}
/**
 * 逐层追踪 include 的配置文件（限层数与数量）。
 */
//@ chunk-s61vbvea.js:232461-233138 placement
async function collectIncludedConfigs(e, n, r) {
  let s = (R) => R !== null,
    h = new Set(e.filter(s)),
    y = [],
    S = [...h],
    w = 0;
  for (let R = 0; S.length > 0; R += 1) {
    if (R === FP || h.size > HP) return { tooMany: !0 };
    let found = S.find((L) => L.includes("\uFFFD"));
    if (found !== void 0) return { contributes: found };
    let P = await r(S);
    if (P !== void 0) return P === null ? null : { contributes: P };
    let results = await Promise.all(
      S.map(async (L) =>
        !isWindowsNonDrivePath(L) && (await stat_5(L).catch(() => null))?.isFile() ? L : null,
      ),
    );
    if (((w += count(results, s)), w > QZn)) return { tooMany: !0 };
    let results_2 = await Promise.all(results.filter(s).map(n));
    if (results_2.some((L) => L === null)) return null;
    (y.push(...results_2.flatMap((L) => L?.keys ?? [])),
      (S = uniq(results_2.flatMap((L) => L?.targets ?? []).filter(s)).filter((L) => !h.has(L))),
      S.forEach((L) => h.add(L)));
  }
  return { files: [...h], keys: y };
}
//@ chunk-s61vbvea.js:233138-233352 placement
function parseGitConfigNullList(e) {
  let parts = e.split("\x00");
  return Array.from({ length: Math.floor(parts.length / 2) }, (r, s) => {
    let h = parts[2 * s + 1],
      index = h.indexOf(`
`);
    return {
      origin: parts[2 * s],
      key: index < 0 ? h : h.slice(0, index),
      value: index < 0 ? "" : h.slice(index + 1),
      valueless: index < 0,
    };
  });
}
//@ chunk-s61vbvea.js:233352-233520 placement
function resolveIncludePaths(e, n, r) {
  let match = /^~[^/]*\//.exec(e);
  if (match !== null)
    return getHomeDirCandidates(buildGitEnv(void 0)).map((y) =>
      resolveRelative(r, `${y}${sep_5}${e.slice(match[0].length)}`),
    );
  let h = resolveIncludePath(e, n, r);
  return isAbsolute_6(h) ? [h] : [];
}
//@ chunk-s61vbvea.js:233520-233589 placement = _temp2 (1)
function resolveFileUrl(e, n) {
  return e.startsWith("file:") ? resolveRelative(n, e.slice(5)) : null;
}
//@ chunk-s61vbvea.js:233589-233830 placement
function resolveIncludePath(e, n, r) {
  let match = /^~([^/]*)\//.exec(e);
  if (match !== null)
    return match[1] === "" || match[1] === KP() ? `${homedir()}${sep_5}${e.slice(match[0].length)}` : e;
  if (isAbsolute_6(e) || e.startsWith("%(prefix)/")) return e;
  return `${n.startsWith("file:") ? dirname_2(resolveRelative(r, n.slice(5))) : r}${sep_5}${e}`;
}
//@ chunk-s61vbvea.js:233830-233909 placement
var WP = "a configured filter driver or hook has a name that is not valid UTF-8";
//@ chunk-s61vbvea.js:233909-233949 placement
var zP = new Set(["unset", "unspecified"]);
/**
 * 涉及的 filter 驱动都是已知安全的。
 */
//@ chunk-s61vbvea.js:233949-234151 placement
function hasOnlyKnownFilterDrivers(e, n = buildGitEnv(void 0)) {
  let r = readGitConfigFromEnv(n);
  return (
    e.filterDrivers !== void 0 &&
    r !== null &&
    ![
      ...e.filterDrivers,
      ...r.flatMap(({ key: key }) => /^filter\.(.+)\.[^.]*$/is.exec(key.trim())?.[1] ?? []),
    ].some((s) => zP.has(s))
  );
}
//@ chunk-s61vbvea.js:234151-234209 placement
function KP() {
  try {
    return userInfo().username;
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:234209-234296 placement
async function VP(e) {
  return e.workTreeId !== void 0 && e.workTreeId !== (await getFileIdentity_2(e.workTree));
}
//@ chunk-s61vbvea.js:239490-239661 placement
var CHECKOUT_SHAPE_CONFIG_KEYS = new Set([
  "core.autocrlf",
  "core.eol",
  "core.safecrlf",
  "core.symlinks",
  "core.filemode",
  "core.ignorecase",
  "core.precomposeunicode",
  "core.checkstat",
  "core.trustctime",
]);
//@ chunk-s61vbvea.js:239661-239788 placement
function quoteGitConfigValue(e) {
  return `"${e
    .replace(/[\\"]/g, (n) => `\\${n}`)
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\x08/g, "\\b")}"`;
}
//@ chunk-s61vbvea.js:239788-239839 placement
var hy = ["core.excludesfile", "core.attributesfile"];
//@ chunk-s61vbvea.js:239839-240069 placement
function lastGlobalOrSystemValue(e) {
  let parts = e.split("\x00"),
    list = Array.from({ length: Math.floor((parts.length - 1) / 3) }, (y, S) =>
      parts.slice(3 * S, 3 * S + 3),
    ),
    s = ([y]) => y === "global" || y === "system",
    last = list.findLast(s);
  return { origin: last?.[1], value: last?.[2], passedOver: list.some((y) => !s(y)) };
}
//@ chunk-s61vbvea.js:240069-240144 placement
var nO = /^[^\u0000-\u001f\u007f]{1,4096}$/,
  Cd = 268435456,
  Ad = 64,
  yy = 1073741824;

export {
  listGitRefs,
  Ad,
  nKt,
  inspectGitLayout,
  runGitForAudit,
  buildAuditEnv,
  QZn,
  auditRefStorageSetting,
  hasOnlyKnownFilterDrivers,
  Oqr,
  VP,
  hy,
  parseGitConfigNullList,
  CHECKOUT_SHAPE_CONFIG_KEYS,
  lastGlobalOrSystemValue,
  nO,
  yy,
  Cd,
  quoteGitConfigValue,
  resolveFileUrl,
  resolveIncludePaths,
};
