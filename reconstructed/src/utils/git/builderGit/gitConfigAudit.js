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
import { isAbsolute, join, basename, dirname, resolve, sep } from "path";
import { realpath, stat } from "fs/promises";
import { homedir, userInfo } from "os";
import {
  GIT_SAFE_GLOBAL_ARGS,
  GIT_ENV_VARS_TO_CLEAR,
  regExp as regExp_17,
  GIT_TRANSPORT_ENV_RE,
} from "../gitSafeEnv.js";
import {
  reachRootsOrUnreadable,
  boundSessionReachRoots,
  IN_TREE_SETTINGS_UNREADABLE,
  IN_TREE_SETTINGS_UNREADABLE_MESSAGE,
  buildGitEnvForReach,
  buildGitEnv,
  EMPTY_VALUE,
  GIT_READ_ARGS,
  MAX_GIT_BUFFER_BYTES,
  gitConfigLocationEnv,
  scrubGitTrace2Env,
  GIT_READ_ENV,
  GIT_REF_PARANOIA_ENV,
  runGitWithEnv,
  isDangerousEnvName,
  isBuildToolEnvVar,
  opensslConfIncludeEnv,
  applyOpenSslConfInclude,
  getPreSettingsEnv,
  reachForBoundSession,
  INCLUDE_PATH_CONFIG_KEY_RE,
  isCannotChangeToError,
  regExp_7,
  GIT_ISOLATION_CONFIG_ARGS,
} from "./gitEnv.js";
import { currentGitBinaryState, gitExeOnPathInEnv, windowsGitNote, GitBinaryError } from "./gitBinary.js";
import {
  GIT_NOT_FOUND_MESSAGE,
  SANDBOX_REACH_TEXTS,
  homeInCheckoutNote,
  UNEXAMINABLE_REACH_NOTE,
  reachRootsForRepo,
  findEnclosingRepos,
  checkoutDirOfGitDir,
  createReachCollector,
} from "./sandboxReach.js";
import { getRemoteHostSessionCount } from "../../../commands/insights.js";
import {
  gitDirEnv,
  checkSessionTempRoot,
  resolveGitFile,
  isSameGitDir,
  gitDirComparisonKey,
  stripLineEnding,
  gitDirIdentityHeld,
  gitDirChangedFailure,
  getFileIdentity_2,
  resolveLinkedWorktreeGitDir,
  sameIdentity,
  toPosixSpelling,
  classifyWorktreeConfig,
} from "./gitDirIdentity.js";
import { annotateStderr, withholdGitStderr, firstGitFailureClass, seenStderr } from "./gitRun.js";
import { GIT_FILES_REF_BACKEND_ENV } from "../gitLanes.js";
import {
  PROTECTED_ENV_VARS,
  isPathInside as isPathInside_2,
  collectGitProtectedPaths,
  getGitConfigPaths,
  systemGitConfigPaths,
  findReachableProtectedPath,
  isWindowsNonDrivePath,
  getHomeDirCandidates,
  resolveRelative,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { GIT_SAFETY_ENV as GIT_SAFETY_ENV_2 } from "../gitSafeInvocation.js";
import { DEFAULT_INVOCATION_ENCODING } from "../../detectRepository.js";
import { execFileNoThrowWithCwd } from "../../execFileNoThrow.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../managedEnvApply.js";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { uniq, count } from "../../collections.js";
import { findCanonicalGitRootUncached } from "../../git.js";
import { hasBackslash } from "../../pathClassification.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";
import { logEvent } from "../../../services/analytics/index.js";
import {
  statDotGit,
  detectUnsupportedLayout,
  objectsDirFingerprint,
  statFingerprint,
  hasReftableOrigin,
} from "./gitDirShape.js";
import { getFirstLine } from "../../stringUtils.js";
import { mapped } from "../../gitSafeExec.js";
import { readAttributesConfig } from "./repoCopy.js";
import { readGitConfigFromEnv } from "./inTreeConfig.js";

//@ chunk-s61vbvea.js:217511-218846 placement
function listGitRefs(e, n, r) {
  let s =
    r.input === undefined
      ? {}
      : {
          input: r.input,
        };
  if (!r.hardened)
    return runGitForAudit([...GIT_SAFE_GLOBAL_ARGS, ...n], {
      cwd: e,
      abortSignal: r.signal,
      ...s,
      ...buildAuditEnv(r.env),
      ...(r.maxBuffer !== undefined && {
        maxBuffer: r.maxBuffer,
      }),
    });
  let h =
    r.reach ??
    (r.reachRoots !== undefined
      ? reachRootsOrUnreadable(r.reachRoots)
      : r.layout === undefined
        ? undefined
        : boundSessionReachRoots(r.layout));
  if (h === IN_TREE_SETTINGS_UNREADABLE)
    return Promise.resolve({
      stdout: "",
      stderr: IN_TREE_SETTINGS_UNREADABLE_MESSAGE,
      code: 126,
    });
  let y = r.probes ?? currentGitBinaryState();
  let screenMemo = r.screenMemo ?? y.screenMemo;
  let gitEnvForReach = buildGitEnvForReach(h, screenMemo);
  let R = gitExeOnPathInEnv(gitEnvForReach, y);
  if (R === null)
    return Promise.resolve({
      stdout: "",
      stderr:
        h === undefined || gitExeOnPathInEnv(buildGitEnv(undefined), y) === null
          ? GIT_NOT_FOUND_MESSAGE
          : `${SANDBOX_REACH_TEXTS}${homeInCheckoutNote(r.layout?.workTree ?? e)}. ${UNEXAMINABLE_REACH_NOTE}`,
      code: 127,
    });
  let x = [];
  if (x === undefined)
    return Promise.resolve({
      stdout: "",
      stderr: EMPTY_VALUE,
      code: 126,
    });
  let P = [
    {
      file: R,
      startsOutside:
        h !== undefined && !(r.startsInProject || r.reachRoots?.startsInProject || r.layout?.startsInProject),
    },
    [...GIT_SAFE_GLOBAL_ARGS, ...GIT_READ_ARGS, ...x, ...n],
    {
      dir: r.layout?.workTree ?? e,
      abortSignal: r.signal,
      maxBuffer: Math.min(r.hardenedMaxBuffer ?? MAX_GIT_BUFFER_BYTES, MAX_GIT_BUFFER_BYTES),
      ...s,
      ...(r.stripFinalNewline === false && {
        stripFinalNewline: false,
      }),
      ...(r.encoding !== undefined && {
        encoding: r.encoding,
      }),
      ...(r.stdoutFd !== undefined && {
        stdout: r.stdoutFd,
      }),
      env: {
        ...neutralizeGitConfigEnv(
          getRemoteHostSessionCount(
            {
              ...gitConfigLocationEnv(gitEnvForReach),
              ...scrubGitTrace2Env(gitEnvForReach),
              ...GIT_READ_ENV,
              ...(n[0] === "for-each-ref" && GIT_REF_PARANOIA_ENV),
              ...(r.layout && gitDirEnv(r.layout)),
              ...(r.layout?.borrowedObjects !== undefined && {
                GIT_ALTERNATE_OBJECT_DIRECTORIES: annotateStderr(r.layout.borrowedObjects),
              }),
              ...r.layout?.configPins,
              ...r.env,
            },
            {
              base: gitEnvForReach,
            },
          ),
        ),
        ...(r.layout && GIT_FILES_REF_BACKEND_ENV),
      },
    },
  ];
  return runGitWithEnv(...P).then(withholdGitStderr);
}
//@ chunk-s61vbvea.js:218846-219554 placement
/**
 * 审查 git 时关注的环境变量集合与判断函数。
 */
var AUDITED_ENV_VARS = new Set([
  ...GIT_ENV_VARS_TO_CLEAR,
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
  ...Object.keys(GIT_SAFETY_ENV_2),
]);
var GIT_TRACE_ENV_RE = /^GIT_(?:CURL_|LFS_|TRACE|TRANSFER_TRACE$|REDIRECT_STD)/i;
var isAuditedEnvVar = (e) =>
  AUDITED_ENV_VARS.has(e.toUpperCase()) ||
  regExp_17.test(e) ||
  GIT_TRACE_ENV_RE.test(e) ||
  GIT_TRANSPORT_ENV_RE.test(e) ||
  isDangerousEnvName(e) ||
  isBuildToolEnvVar(e);
//@ chunk-s61vbvea.js:219554-219675 placement
/**
 * 审查用 git 环境（恢复设置前的值与 OpenSSL include）。
 */
function buildAuditEnv(e) {
  let n = {
    ...diffPreSettingsEnv(),
    ...e,
  };
  let r = opensslConfIncludeEnv({
    ...process.env,
    ...n,
  });
  let s = {
    ...n,
    ...r,
  };
  return Object.keys(s).length > 0
    ? {
        env: s,
      }
    : {};
}
//@ chunk-s61vbvea.js:219675-219707 placement
function gitExeForAudit() {
  return gitExeOnPathInEnv(auditEnvironment());
}
//@ chunk-s61vbvea.js:219707-219865 placement
/**
 * 运行 git（找不到时返回 127 并隐藏 stderr）。
 */
function runGitForAudit(e, n) {
  let r = gitExeForAudit();
  let s = {
    ...n,
    encoding: n.encoding ?? DEFAULT_INVOCATION_ENCODING,
  };
  return r === null
    ? Promise.resolve({
        stdout: "",
        stderr: `${GIT_NOT_FOUND_MESSAGE}${windowsGitNote()}`,
        code: 127,
      })
    : execFileNoThrowWithCwd(r, e, s).then(withholdGitStderr);
}
//@ chunk-s61vbvea.js:219865-219916 placement
/**
 * 构造 git 审查用的环境（进程环境叠加设置生效后的差异）。
 */
function auditEnvironment() {
  return applyOpenSslConfInclude({
    ...process.env,
    ...diffPreSettingsEnv(),
  });
}
//@ chunk-s61vbvea.js:219916-220321 placement
/**
 * 设置生效前后不同的被审查变量。
 */
function diffPreSettingsEnv() {
  if (getLatchedPreSettingsEnvSnapshot() === undefined) return {};
  let preSettingsEnv = getPreSettingsEnv();
  let env = process.env;
  let r = getPlatform_2() === "windows" ? (y) => y.toUpperCase() : (y) => y;
  let s = new Map(Object.keys(env).map((key) => [r(key), key]));
  let h = new Map(Object.keys(preSettingsEnv).map((key) => [r(key), key]));
  return Object.fromEntries(
    uniq([...s.keys(), ...h.keys()]).flatMap((y) => {
      let S = s.get(y);
      let w = h.get(y);
      let R = S ?? w ?? y;
      let x = w === undefined ? undefined : preSettingsEnv[w];
      if (!isAuditedEnvVar(R) || (S === undefined ? undefined : env[S]) === x) return [];
      return [[R, x ?? gitSafetyEnvValue(R)]];
    }),
  );
}
//@ chunk-s61vbvea.js:220321-220395 placement
/**
 * git 安全相关环境变量的基准表及其取值函数，以及需要额外清空的变量。
 */
var GIT_SAFETY_ENV = GIT_SAFETY_ENV_2;
var gitSafetyEnvValue = (e) => GIT_SAFETY_ENV[e.toUpperCase()];
var UNSET_REFERENCE_BACKEND_ENV = {
  GIT_REFERENCE_BACKEND: undefined,
};
//@ chunk-s61vbvea.js:220395-220638 placement
function neutralizeGitConfigEnv(remoteHostSessionCount) {
  let n = new Set(["GIT_CONFIG", "GIT_ATTR_SOURCE", ...Object.keys(UNSET_REFERENCE_BACKEND_ENV)]);
  let filtered = Object.keys(remoteHostSessionCount).filter((key) => n.has(key.toUpperCase()));
  return {
    ...remoteHostSessionCount,
    ...Object.fromEntries(filtered.map((s) => [s, undefined])),
    GIT_CONFIG: undefined,
    GIT_ATTR_SOURCE: undefined,
    ...UNSET_REFERENCE_BACKEND_ENV,
  };
}
//@ chunk-s61vbvea.js:220638-220700 placement
function isUnsafeReferenceBackend(e) {
  return e !== undefined && e !== "files" && e !== "reftable";
}
//@ chunk-s61vbvea.js:220700-220918 placement
function classifyConfigFile(e, gitConfigPaths, gitProtectedPaths) {
  return {
    path: e,
    kind: gitConfigPaths.includes(e)
      ? "user_level"
      : gitProtectedPaths.fixed.includes(e)
        ? "repository"
        : "included",
    ground: e.includes("\uFFFD")
      ? "not_text"
      : !gitProtectedPaths.fixed.includes(e) &&
          gitProtectedPaths.roots.some((root) => isPathInside_2(root, e))
        ? "inside"
        : "indirect",
  };
}
//@ chunk-s61vbvea.js:220918-220984 placement
var CONFIG_SCOPE_ORDER = ["user_level", "system", "condition", "unknown", "repository"];
//@ chunk-s61vbvea.js:220984-221996 placement
function auditRefStorageSetting(e) {
  if (e === "ignored_setting")
    return "a git configuration file other than this repository\u2019s own config sets extensions.refStorage. git ignores that key there, but this upload does not start while git lists it with a location. The file is one of these: the system-wide git configuration, ~/.gitconfig, ~/.config/git/config (or $XDG_CONFIG_HOME/git/config), what GIT_CONFIG_GLOBAL or GIT_CONFIG_SYSTEM names, the repository\u2019s config.worktree, or a file that one of them or the repository\u2019s config includes. Remove the key from that file and retry";
  return e === "variable"
    ? "the variable GIT_REFERENCE_BACKEND tells git to keep branches and tags in another place, which this upload does not read; start claude without that variable (a Claude Code settings file may also set it, in its env block)"
    : "this repository\u2019s own git configuration (extensions.refStorage) keeps its branches and tags in another place, which this upload does not read; work from an ordinary clone of the repository";
}
//@ chunk-s61vbvea.js:221996-226988 placement
/**
 * 检查仓库 git 布局（common dir、worktree、admin dir）是否可信
 */
async function inspectGitLayout(
  e,
  n,
  {
    linkedTrees: r = false,
    bound: s = r,
    startsInProject: h = false,
    perWorktreeConfig: y = "refuse",
    notesBareRepository: S = false,
    probes: w = currentGitBinaryState(),
    holder: R,
    namedCommonDirs: x = [],
    findKeyedFolder: P = findCanonicalGitRootUncached,
    keepsListedSettings: j = false,
  } = {},
) {
  if (x.some((ke) => !isAbsolute(ke)))
    return {
      kind: "failed",
      detail: "a common directory named for this tree is not an absolute path",
    };
  let G = w.screenMemo === undefined ? new GitBinaryError("operation") : w;
  let L = hasBackslash(e) ? null : await realpath(e).catch(() => null);
  if (L === null)
    return {
      kind: "failed",
      detail: "the launch directory could not be resolved",
      cause: "launch_folder_unresolved",
    };
  if (s) {
    if ((await checkSessionTempRoot(L)).some((Me) => isPathInside_2(Me, L) || isPathInside_2(Me, e)))
      return {
        kind: "tampered",
        misplaced: "temp_root",
        gitDir: "",
        commonDir: "",
      };
  }
  if (
    [buildGitEnv(undefined), process.env].some((ke) =>
      isUnsafeReferenceBackend(getEnvCaseInsensitive(ke, "GIT_REFERENCE_BACKEND")),
    )
  )
    return {
      kind: "tampered",
      misplaced: "ref_storage",
      keptBy: "variable",
      gitDir: "",
      commonDir: "",
    };
  let gitFile = await resolveGitFile(L);
  if (gitFile.kind === "refuse" || (gitFile.kind === "chain" && !r))
    return {
      kind: "tampered",
      misplaced: gitFile.kind === "refuse" && gitFile.why !== "git_file" ? "linked_worktree" : "git_file",
      gitDir: gitFile.adminDir ?? "",
      commonDir: gitFile.kind === "chain" ? gitFile.commonDir : "",
      ...(gitFile.kind === "refuse" && {
        detail: gitFile.why,
      }),
    };
  if (gitFile.kind === "chain" && x.some((ke) => ke !== gitFile.commonDir))
    return {
      kind: "tampered",
      misplaced: "common_dir",
      gitDir: gitFile.adminDir,
      commonDir: gitFile.commonDir,
    };
  let Q = async (ke) => {
    let results = await Promise.all(uniq([e, L]).map((We) => isSameGitDir(ke, L, P(We))));
    return results.includes(false) ? false : results.includes("unresolved") ? "unresolved" : true;
  };
  if (gitFile.kind === "chain") {
    let ke = await Q({
      resolved: gitFile.commonDir,
    });
    if (ke !== true)
      logEvent("tengu_git_layout_keyed_elsewhere", {
        bound: s,
        unresolved: ke === "unresolved",
      });
    if (ke === "unresolved" && s)
      return {
        kind: "failed",
        detail: "the folder that keeps this tree\u2019s trust could not be resolved",
        cause: "keyed_folder_unresolved",
      };
    if (ke === false && s)
      return {
        kind: "tampered",
        misplaced: "linked_worktree",
        gitDir: gitFile.adminDir,
        commonDir: gitFile.commonDir,
        detail: "keyed_elsewhere",
      };
  }
  if (gitFile.kind === "not_file" && x.length > 0) {
    let ke = join(L, ".git");
    let Me = await statDotGit(L);
    if (Me.kind === "unreadable")
      return {
        kind: "failed",
        detail: Me.detail,
      };
    return Me.kind === "directory"
      ? {
          kind: "tampered",
          misplaced: "git_dir",
          gitDir: ke,
          commonDir: ke,
        }
      : {
          kind: "failed",
          detail: "this linked working tree's .git file is missing",
        };
  }
  let [Z = "not_held", ee = "not_held"] =
    R === undefined
      ? []
      : await Promise.all(
          (gitFile.kind === "chain" ? [gitFile.adminDir, gitFile.commonDir] : [join(L, ".git")]).map((ke) =>
            R.hold(ke),
          ),
        );
  let ae = s
    ? reachRootsForRepo(L, [
        ...findEnclosingRepos(L),
        ...(gitFile.kind === "chain" ? [checkoutDirOfGitDir(gitFile.commonDir)] : []),
      ])
    : undefined;
  let se = (ke) =>
    listGitRefs(e, ["rev-parse", ...ke], {
      hardened: true,
      signal: n,
      probes: G,
      stripFinalNewline: false,
      env: {
        GIT_CEILING_DIRECTORIES: gitDirComparisonKey(L, e),
      },
      ...(ae !== undefined && {
        reach: ae,
        startsInProject: h,
      }),
    });
  let [re, he, Se] = await Promise.all([
    se(["--absolute-git-dir"]),
    se(["--path-format=absolute", "--git-common-dir"]),
    se(["--show-toplevel"]),
  ]);
  let ce = stripLineEnding(re.stdout);
  let we = stripLineEnding(he.stdout);
  let ie = stripLineEnding(Se.stdout);
  if (
    [re, he, Se].some(({ code }) => code !== 0) ||
    ce === null ||
    we === null ||
    ie === null ||
    !isAbsolute(ce) ||
    !isAbsolute(ie)
  ) {
    let found = [re, he, Se].find(({ stderr }) => stderr !== "");
    let Me =
      re.exitCode === 126 || re.exitCode === 127
        ? ae !== undefined && !h
          ? "git_did_not_run_from_outside"
          : "git_did_not_run"
        : found && firstGitFailureClass(seenStderr(found));
    return {
      kind: "failed",
      detail: getFirstLine((found?.stderr ?? re.stdout).trim()),
      ...(Me !== undefined && {
        cause: Me,
      }),
      ...(re.code === 127 &&
        re.stderr.startsWith(GIT_NOT_FOUND_MESSAGE) && {
          why: "git_not_found",
          ...(re.stderr !== GIT_NOT_FOUND_MESSAGE && {
            withinReach: true,
          }),
        }),
      ...(re.stderr === IN_TREE_SETTINGS_UNREADABLE_MESSAGE && {
        why: "settings_unreadable",
      }),
    };
  }
  if (getFirstLine(we) === "--path-format=absolute")
    return {
      kind: "tampered",
      misplaced: "old_git",
      gitDir: ce,
      commonDir: we,
    };
  if (!isAbsolute(we))
    return {
      kind: "tampered",
      misplaced: "common_dir",
      gitDir: ce,
      commonDir: we,
    };
  let Ee = await statDotGit(e);
  if (Ee.kind === "unreadable")
    return {
      kind: "failed",
      detail: Ee.detail,
    };
  if (Ee.kind === "directory") {
    if (!gitDirIdentityHeld(Z, Ee.id)) return gitDirChangedFailure(Z);
    if (Ee.id !== (await getFileIdentity_2(ce)))
      return {
        kind: "tampered",
        misplaced: "git_dir",
        gitDir: ce,
        commonDir: we,
      };
    if (we !== ce)
      return {
        kind: "tampered",
        misplaced: "common_dir",
        gitDir: ce,
        commonDir: we,
      };
  }
  let unsupportedLayout = await detectUnsupportedLayout(we);
  if (unsupportedLayout !== null)
    return {
      kind: "tampered",
      misplaced: unsupportedLayout,
      gitDir: ce,
      commonDir: we,
    };
  if (Ee.kind === "not_a_directory") {
    if (!r || gitFile.kind !== "chain")
      return {
        kind: "tampered",
        misplaced: "git_file",
        gitDir: ce,
        commonDir: we,
        detail: "git_file",
      };
    let linkedWorktreeGitDir = await resolveLinkedWorktreeGitDir(L, ce, we, gitFile);
    if (linkedWorktreeGitDir.kind !== "vouched")
      return linkedWorktreeGitDir.kind === "unread"
        ? {
            kind: "failed",
            detail: linkedWorktreeGitDir.detail,
            why: "changed_under_read",
          }
        : {
            kind: "tampered",
            misplaced: linkedWorktreeGitDir.kind,
            gitDir: ce,
            commonDir: we,
            detail:
              linkedWorktreeGitDir.kind === "linked_worktree" ? linkedWorktreeGitDir.detail : "git_file",
          };
    let Me = {
      resolved: linkedWorktreeGitDir.commonDir,
      id: linkedWorktreeGitDir.commonDirId,
    };
    if (
      s &&
      !(
        sameIdentity(Me, {
          id: await getFileIdentity_2(gitFile.commonDir),
          resolved: gitFile.commonDir,
        }) && (await Q(Me)) === true
      )
    )
      return {
        kind: "failed",
        detail: "the git directory changed while it was read",
        why: "changed_under_read",
      };
    if (
      !gitDirIdentityHeld(Z, linkedWorktreeGitDir.gitDirId) ||
      !gitDirIdentityHeld(ee, linkedWorktreeGitDir.commonDirId)
    )
      return gitDirChangedFailure(Z, ee);
    return auditGitDirConfig(
      e,
      {
        gitDir: linkedWorktreeGitDir.gitDir,
        gitDirId: linkedWorktreeGitDir.gitDirId,
        ...(linkedWorktreeGitDir.gitDirBorn !== undefined && {
          gitDirBorn: linkedWorktreeGitDir.gitDirBorn,
        }),
        commonDir: linkedWorktreeGitDir.commonDir,
        commonDirId: linkedWorktreeGitDir.commonDirId,
        ...(linkedWorktreeGitDir.commonDirBorn !== undefined && {
          commonDirBorn: linkedWorktreeGitDir.commonDirBorn,
        }),
        workTree: ie,
        checkout: "linked",
        bound: s,
        ...(h && {
          startsInProject: h,
        }),
      },
      L,
      n,
      G,
      {
        perWorktreeConfig: y,
        notesBareRepository: S,
      },
    );
  }
  return auditGitDirConfig(
    e,
    {
      gitDir: ce,
      gitDirId: Ee.id,
      ...(Ee.born !== undefined && {
        gitDirBorn: Ee.born,
      }),
      commonDir: we,
      workTree: ie,
      checkout: "main",
      bound: s,
      ...(h && {
        startsInProject: h,
      }),
    },
    L,
    n,
    G,
    {
      keepsListedSettings: j,
    },
  );
}
//@ chunk-s61vbvea.js:226988-228840 placement
async function auditGitDirConfig(
  e,
  n,
  r,
  signal,
  probes,
  { perWorktreeConfig = "refuse", notesBareRepository = false, keepsListedSettings = false },
) {
  let { gitDir, commonDir, workTree } = n;
  let [j, G] = await (workTree === toPosixSpelling(r)
    ? getFileIdentity_2(r).then((fileIdentity) => [fileIdentity, fileIdentity])
    : Promise.all([getFileIdentity_2(workTree), getFileIdentity_2(r)]));
  if (G === null || j !== G)
    return {
      kind: "tampered",
      misplaced: "work_tree",
      gitDir,
      commonDir,
      ...(G === null && {
        unexamined: true,
      }),
    };
  let L = {
    ...n,
    workTree: toPosixSpelling(r),
    workTreeId: G,
    ...(workTree !== toPosixSpelling(r) && {
      workTreeRespelled: true,
    }),
  };
  let q = await objectsDirFingerprint(commonDir);
  if (q.info === "absent" || q.pack === "absent")
    return {
      kind: "failed",
      detail:
        "objects/info or objects/pack is missing from the git directory (running git init again in the checkout puts them back)",
      cause: "git_dir_objects_folder_missing",
    };
  let Q = L.checkout === "linked" ? await classifyWorktreeConfig(e, L, signal, probes) : "absent";
  if (Q === "unread")
    return {
      kind: "failed",
      detail: "could not read extensions.worktreeConfig",
    };
  if (Q === "file" || (Q !== "absent" && perWorktreeConfig === "refuse"))
    return {
      kind: "tampered",
      misplaced: "linked_worktree",
      gitDir,
      commonDir,
      detail: "worktree_config",
    };
  let Z =
    Q === "absent"
      ? L
      : {
          ...L,
          worktreeConfig: Q,
        };
  let ee = [join(commonDir, "config"), join(gitDir, "config.worktree")];
  let ae = keepsListedSettings ? await statFingerprint(ee) : null;
  let se = await listGitConfigInForce(e, Z, signal, probes);
  switch (se.kind) {
    case "unlistable":
      return {
        kind: "failed",
        detail: se.detail,
      };
    case "many_includes":
      return {
        kind: "tampered",
        misplaced: "many_includes",
        gitDir,
        commonDir,
      };
    case "ref_storage":
      return {
        kind: "tampered",
        misplaced: "ref_storage",
        keptBy: se.keptBy,
        gitDir,
        commonDir,
      };
    case "reftable":
      return {
        kind: "tampered",
        misplaced: "reftable",
        gitDir,
        commonDir,
      };
    case "included":
      return {
        kind: "tampered",
        misplaced: "included_config",
        writable: `${se.configFile.kind}_${se.configFile.ground}`,
        configFile: se.configFile,
        ...(se.includedBy !== undefined && {
          includedBy: se.includedBy,
        }),
        gitDir,
        commonDir,
      };
    case "pins": {
      let he =
        ae === null || se.listed.some(({ key }) => key.startsWith("includeif.onbranch:"))
          ? null
          : await statFingerprint(se.settingsFiles);
      return {
        kind: "read",
        layout: {
          ...Z,
          storeStamps: q,
          ...se.pins,
          ...{},
          ...{},
        },
      };
    }
  }
}
//@ chunk-s61vbvea.js:228840-228950 placement
function isCommonDirConfigFile(e, { commonDir, workTree }) {
  let fileUrl = resolveFileUrl(e, workTree);
  return (
    fileUrl !== null &&
    basename(fileUrl) === "config" &&
    isPathInside_2(commonDir, fileUrl) &&
    isPathInside_2(dirname(fileUrl), commonDir)
  );
}
//@ chunk-s61vbvea.js:228950-229035 placement
var HOOK_CONFIG_KEY_RE = /^hook\.(?:(.*)\.)?(?:command|event|enabled)$/s;
var declaredHookNames = new Set(mapped.map(([e]) => e));
//@ chunk-s61vbvea.js:229035-229067 placement
function isDeclaredHookName(e) {
  return declaredHookNames.has(e);
}
//@ chunk-s61vbvea.js:229067-229142 placement
function hookOwnerOfKey(key) {
  let n = isDeclaredHookName(key) ? null : HOOK_CONFIG_KEY_RE.exec(key);
  return n === null ? undefined : (n[1] ?? "");
}
//@ chunk-s61vbvea.js:229142-232019 placement
async function listGitConfigInForce(e, n, signal, s) {
  let h = {
    kind: "unlistable",
    detail: "could not list the configuration in force",
  };
  let y = reachForBoundSession(n);
  let screenMemo = s.screenMemo ?? createReachCollector();
  let w = (Be) =>
    listGitRefs(e, Be, {
      hardened: true,
      layout: n,
      signal,
      probes: s,
      ...(y !== undefined && {
        reachRoots: y,
        screenMemo,
      }),
    });
  let R = async (Be) => {
    let [Re, Ne] = await Promise.all([
      w(["config", "-z", "--show-origin", ...Be, "--list"]),
      w(["config", "-z", "--show-origin", "--type=path", ...Be, "--get-regexp", INCLUDE_PATH_CONFIG_KEY_RE]),
    ]);
    let Je = Be.length > 0 && Re.exitCode === 128 && !isCannotChangeToError(Re);
    if ((Re.code !== 0 && !Je) || (Ne.code !== 0 && Ne.exitCode === undefined)) return null;
    let lt = Je ? [] : parseGitConfigNullList(Re.stdout);
    let flattened = [
      ...lt.filter(({ key }) => regExp_7.test(key)),
      ...(Ne.code === 0 ? parseGitConfigNullList(Ne.stdout) : []),
    ].flatMap(({ origin, key, value: Nt }) =>
      resolveIncludePaths(Nt, origin, n.workTree).map((target) => ({
        holder: origin,
        key,
        target,
      })),
    );
    return {
      keys: lt,
      targets: flattened.map(({ target }) => target),
      directives: flattened,
    };
  };
  let [x, P, j] = await Promise.all([
    R([]),
    w(["var", "GIT_CONFIG_GLOBAL"]),
    w(["var", "GIT_CONFIG_SYSTEM"]),
  ]);
  if (x === null) return h;
  let filtered = x.keys.filter(({ key }) => key === "extensions.refstorage");
  let L = (origin) => resolveFileUrl(origin, n.workTree) === null || isCommonDirConfigFile(origin, n);
  let filtered_2 = filtered.filter(({ value: Be }) => isUnsafeReferenceBackend(Be));
  if (filtered_2.length > 0)
    return {
      kind: "ref_storage",
      keptBy: filtered_2.some(({ origin }) => L(origin)) ? "setting" : "ignored_setting",
    };
  if (hasReftableOrigin(filtered, L))
    return {
      kind: "reftable",
    };
  let gitProtectedPaths = await collectGitProtectedPaths(
    n.workTree,
    {
      GIT_DIR: n.gitDir,
      GIT_COMMON_DIR: n.commonDir,
    },
    n.workTree,
  );
  if (gitProtectedPaths === null) return h;
  let Z =
    j.code === 0
      ? j.stdout.split(`
`)
      : [];
  let ee = null;
  let gitEnv = buildGitEnv(undefined);
  let se = [n.workTree, ee, gitEnv];
  let gitConfigPaths = getGitConfigPaths(
    [
      ...(P.code === 0
        ? P.stdout.split(`
`)
        : []),
      ...Z,
    ],
    ...se,
  );
  let systemFiles = systemGitConfigPaths(Z, ...se);
  let Se = [...x.keys.map(({ origin }) => resolveFileUrl(origin, n.workTree)), ...gitConfigPaths];
  let ce = (Be) => ({
    kind: "included",
    configFile: classifyConfigFile(Be, gitConfigPaths, gitProtectedPaths),
    ...(!gitConfigPaths.includes(Be) &&
      !gitProtectedPaths.fixed.includes(Be) && {
        includedBy: attributeIncludeSource(Be, x.directives, {
          workTree: n.workTree,
          userFiles: gitConfigPaths,
          systemFiles,
          fromOwnConfig: L,
        }),
      }),
  });
  let found = Se.find((Be) => Be?.includes("\uFFFD"));
  if (found !== undefined && found !== null) return ce(found);
  let reachableProtectedPath = await findReachableProtectedPath(gitProtectedPaths, Se);
  if (reachableProtectedPath !== undefined)
    return reachableProtectedPath === null ? h : ce(reachableProtectedPath);
  let includedConfigs = await collectIncludedConfigs(
    x.targets,
    (Be) => R(["--file", Be]),
    (Be) => findReachableProtectedPath(gitProtectedPaths, Be),
  );
  if (includedConfigs === null) return h;
  if ("tooMany" in includedConfigs)
    return {
      kind: "many_includes",
    };
  if ("contributes" in includedConfigs) return ce(includedConfigs.contributes);
  let Ie = [...x.keys, ...includedConfigs.keys];
  let Me = ((Be) =>
    uniq(
      Ie.flatMap(({ key }) => {
        let Ne = Be.exec(key)?.[1];
        return Ne === undefined ? [] : [Ne];
      }),
    ))(/^filter\.(.*)\.(?:clean|smudge|process|required)$/s);
  let We = uniq(Ie.flatMap(({ key }) => hookOwnerOfKey(key) ?? []));
  if ([...Me, ...We].some((Be) => Be.includes("\uFFFD")))
    return {
      kind: "unlistable",
      detail: INVALID_UTF8_NAME_DETAIL,
    };
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
      attributeSetting: readAttributesConfig(x.keys, includedConfigs.keys, gitConfigPaths, n),
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
/**
 * include 展开的轮数上限、文件数上限与集合大小上限。
 */
var MAX_INCLUDE_ROUNDS = 8;
var MAX_INCLUDE_FILES = 32;
var MAX_INCLUDE_SET_SIZE = 4096;
//@ chunk-s61vbvea.js:232043-232461 placement
/**
 * 判断 include 目标由哪类配置引入。
 */
function attributeIncludeSource(e, directives, { workTree, userFiles, systemFiles, fromOwnConfig }) {
  let S = resolve(e);
  let w = directives.some(({ target }) => fromOwnConfig(`file:${target}`)) ? "unknown" : "repository";
  let R = new Set(
    directives
      .filter(({ target }) => resolve(target) === S)
      .map(({ holder, key }) => {
        let fileUrl = resolveFileUrl(holder, workTree);
        if (fileUrl === null) return "unknown";
        if (!userFiles.includes(fileUrl)) return fromOwnConfig(holder) ? w : "unknown";
        if (GIT_ISOLATION_CONFIG_ARGS.test(key)) return "condition";
        return systemFiles.includes(fileUrl) ? "system" : "user_level";
      }),
  );
  return CONFIG_SCOPE_ORDER.find((x) => R.has(x)) ?? "unknown";
}
//@ chunk-s61vbvea.js:232461-233138 placement
/**
 * 逐层追踪 include 的配置文件（限层数与数量）。
 */
async function collectIncludedConfigs(targets, n, r) {
  let s = (R) => R !== null;
  let h = new Set(targets.filter(s));
  let y = [];
  let S = [...h];
  let w = 0;
  for (let R = 0; S.length > 0; R += 1) {
    if (R === MAX_INCLUDE_ROUNDS || h.size > MAX_INCLUDE_SET_SIZE)
      return {
        tooMany: true,
      };
    let found = S.find((L) => L.includes("\uFFFD"));
    if (found !== undefined)
      return {
        contributes: found,
      };
    let P = await r(S);
    if (P !== undefined)
      return P === null
        ? null
        : {
            contributes: P,
          };
    let results = await Promise.all(
      S.map(async (L) =>
        !isWindowsNonDrivePath(L) && (await stat(L).catch(() => null))?.isFile() ? L : null,
      ),
    );
    w += count(results, s);
    if (w > MAX_INCLUDE_FILES)
      return {
        tooMany: true,
      };
    let results_2 = await Promise.all(results.filter(s).map(n));
    if (results_2.some((L) => L === null)) return null;
    y.push(...results_2.flatMap((L) => L?.keys ?? []));
    S = uniq(results_2.flatMap((L) => L?.targets ?? []).filter(s)).filter((L) => !h.has(L));
    S.forEach((L) => h.add(L));
  }
  return {
    files: [...h],
    keys: y,
  };
}
//@ chunk-s61vbvea.js:233138-233352 placement
function parseGitConfigNullList(stdout) {
  let parts = stdout.split("\x00");
  return Array.from(
    {
      length: Math.floor(parts.length / 2),
    },
    (r, s) => {
      let h = parts[2 * s + 1];
      let index = h.indexOf(`
`);
      return {
        origin: parts[2 * s],
        key: index < 0 ? h : h.slice(0, index),
        value: index < 0 ? "" : h.slice(index + 1),
        valueless: index < 0,
      };
    },
  );
}
//@ chunk-s61vbvea.js:233352-233520 placement
function resolveIncludePaths(e, n, r) {
  let match = /^~[^/]*\//.exec(e);
  if (match !== null)
    return getHomeDirCandidates(buildGitEnv(undefined)).map((y) =>
      resolveRelative(r, `${y}${sep}${e.slice(match[0].length)}`),
    );
  let includePath = resolveIncludePath(e, n, r);
  return isAbsolute(includePath) ? [includePath] : [];
}
//@ chunk-s61vbvea.js:233520-233589 placement = _temp2 (1)
function resolveFileUrl(origin, workTree) {
  return origin.startsWith("file:") ? resolveRelative(workTree, origin.slice(5)) : null;
}
//@ chunk-s61vbvea.js:233589-233830 placement
function resolveIncludePath(e, n, r) {
  let match = /^~([^/]*)\//.exec(e);
  if (match !== null)
    return match[1] === "" || match[1] === currentUserName()
      ? `${homedir()}${sep}${e.slice(match[0].length)}`
      : e;
  if (isAbsolute(e) || e.startsWith("%(prefix)/")) return e;
  return `${n.startsWith("file:") ? dirname(resolveRelative(r, n.slice(5))) : r}${sep}${e}`;
}
//@ chunk-s61vbvea.js:233830-233909 placement
var INVALID_UTF8_NAME_DETAIL = "a configured filter driver or hook has a name that is not valid UTF-8";
//@ chunk-s61vbvea.js:233909-233949 placement
var KNOWN_SAFE_FILTER_DRIVERS = new Set(["unset", "unspecified"]);
//@ chunk-s61vbvea.js:233949-234151 placement
/**
 * 涉及的 filter 驱动都是已知安全的。
 */
function hasOnlyKnownFilterDrivers(layout, n = buildGitEnv(undefined)) {
  let gitConfigFromEnv = readGitConfigFromEnv(n);
  return (
    layout.filterDrivers !== undefined &&
    gitConfigFromEnv !== null &&
    ![
      ...layout.filterDrivers,
      ...gitConfigFromEnv.flatMap(({ key }) => /^filter\.(.+)\.[^.]*$/is.exec(key.trim())?.[1] ?? []),
    ].some((s) => KNOWN_SAFE_FILTER_DRIVERS.has(s))
  );
}
//@ chunk-s61vbvea.js:234151-234209 placement
function currentUserName() {
  try {
    return userInfo().username;
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:234209-234296 placement
/**
 * 判断记录中的工作树 id 与当前实际身份不一致（工作树已被替换）。
 */
async function workTreeReplacedSinceRecorded(e) {
  return e.workTreeId !== undefined && e.workTreeId !== (await getFileIdentity_2(e.workTree));
}
//@ chunk-s61vbvea.js:239490-239661 placement
var CHECKOUT_SHAPE_CONFIG_KEYS_2 = new Set([
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
/**
 * 影响检出形态的 git 配置键（core.excludesfile、core.attributesfile）。
 */
var CHECKOUT_SHAPE_CONFIG_KEYS = ["core.excludesfile", "core.attributesfile"];
//@ chunk-s61vbvea.js:239839-240069 placement
function lastGlobalOrSystemValue(stdout) {
  let parts = stdout.split("\x00");
  let list = Array.from(
    {
      length: Math.floor((parts.length - 1) / 3),
    },
    (y, S) => parts.slice(3 * S, 3 * S + 3),
  );
  let s = ([y]) => y === "global" || y === "system";
  let last = list.findLast(s);
  return {
    origin: last?.[1],
    value: last?.[2],
    passedOver: list.some((y) => !s(y)),
  };
}
//@ chunk-s61vbvea.js:240069-240144 placement
/**
 * 合法的可打印 git 配置值正则，以及配置文件大小、层级与总拷贝上限。
 */
var PRINTABLE_CONFIG_VALUE_RE = /^[^\u0000-\u001f\u007f]{1,4096}$/;
var MAX_CONFIG_FILE_BYTES = 268435456;
var MAX_PLACEMENT_DEPTH = 64;
var MAX_CONFIG_COPY_BYTES = 1073741824;
export {
  listGitRefs,
  MAX_PLACEMENT_DEPTH,
  UNSET_REFERENCE_BACKEND_ENV,
  inspectGitLayout,
  runGitForAudit,
  buildAuditEnv,
  MAX_INCLUDE_FILES,
  auditRefStorageSetting,
  hasOnlyKnownFilterDrivers,
  auditEnvironment,
  workTreeReplacedSinceRecorded,
  CHECKOUT_SHAPE_CONFIG_KEYS,
  parseGitConfigNullList,
  CHECKOUT_SHAPE_CONFIG_KEYS_2,
  lastGlobalOrSystemValue,
  PRINTABLE_CONFIG_VALUE_RE,
  MAX_CONFIG_COPY_BYTES,
  MAX_CONFIG_FILE_BYTES,
  quoteGitConfigValue,
  resolveFileUrl,
  resolveIncludePaths,
};
