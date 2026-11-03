/**
 * utils/git/builderGit/gitEnv.ts
 *
 * builderGit：隔离 git 子进程环境（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (41)
 * attribution: placement 41
 */
import { isAbsolute, dirname, delimiter, sep, parse, resolve, join } from "path";
import { devNull, tmpdir } from "os";
import {
  collectRepoSettingsReachRoots,
  resolveReachRoots,
  mergeReachRoots,
  makeReachPredicate,
  isReachableOrUnsafe,
  lstatOrUndefined,
  filterSafePathEnv,
  reachForWorkTree,
} from "./sandboxReach.js";
import { GIT_FAILURE_CLASSIFIERS, seenStderr } from "./gitRun.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { sanitizePathEnv, stripPathQuotes } from "../../which.js";
import {
  PROTECTED_ENV_VARS,
  GIT_CONFIG_ENV_VARS,
  parseGitBoolEnv,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { Uo } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { jsonStringify } from "../../slowOperations.js";
import { listProgramNames, isProgramDirSafe, findXcodeGit, isProgramDirSafeFor } from "./gitBinary.js";
import { runInvocation } from "../../detectRepository.js";
import { uniq } from "../../collections.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../managedEnvApply.js";
import { getSettingsAppliedEnv } from "../../permissions/protectedSettingsPaths.js";
import { pickByHelper, GIT_ALLOW_PROTOCOL_VALUE } from "../gitSafeEnv.js";
import { firstLineOf } from "../../stringUtils.js";
import { describeUrlScheme } from "../../resultError.js";
import { isSuspiciousUrl, hasEncodedPathChars } from "../../fsBoundRead.js";
import {
  isCcrGitProxySession,
  isLocalHost,
  normalizeGitRemoteUrl,
  findGitRoot,
  findCanonicalGitRoot,
} from "../../git.js";
import { getCwd } from "../../cwd.js";
import { getOriginalCwd } from "../../../bootstrap/state.js";
import { noUncachedRoot } from "../../settings/settingsStorage.js";

//@ chunk-s61vbvea.js:210150-213675 placement
/**
 * 运行构建工具的敏感环境变量名单（PATH/PYTHONPATH/各类工具链与预加载变量）。
 */
var BUILD_TOOL_ENV_VARS = [
  "PATH",
  "PYTHONPATH",
  "NODE_PATH",
  "RUBYLIB",
  "PERL5LIB",
  "PERLLIB",
  "GEM_PATH",
  "CLASSPATH",
  "DYLD_LIBRARY_PATH",
  "DYLD_FRAMEWORK_PATH",
  "LD_LIBRARY_PATH",
  "LIBRARY_PATH",
  "CPATH",
  "C_INCLUDE_PATH",
  "CPLUS_INCLUDE_PATH",
  "R_LIBS",
  "R_LIBS_USER",
  "R_LIBS_SITE",
];
var DANGEROUS_ENV_NAME_LIST = new Set([
  "GOFLAGS",
  "RUSTFLAGS",
  "GIT_EDITOR",
  "GIT_SEQUENCE_EDITOR",
  "GIT_EXTERNAL_DIFF",
  "GIT_PROXY_COMMAND",
  "SUDO_ASKPASS",
  "ZDOTDIR",
  "NULLCMD",
  "READNULLCMD",
  "CDPATH",
  "GCONV_PATH",
  "NLSPATH",
  "DOTNET_STARTUP_HOOKS",
  "npm_config_node_options",
  "NPM_CONFIG_NODE_OPTIONS",
  "LESSOPEN",
  "LESSCLOSE",
  "MANPAGER",
  "MAVEN_OPTS",
  "MAVEN_ARGS",
  "MAVEN_CONFIG",
  "ANT_OPTS",
  "ANT_ARGS",
  "GRADLE_OPTS",
  "JAVA_OPTS",
  "JVM_OPTS",
  "LEIN_JVM_OPTS",
  "ES_JAVA_OPTS",
  "SBT_OPTS",
  "SONAR_SCANNER_OPTS",
  "SONAR_SCANNER_JAVA_OPTS",
  "MAKEFLAGS",
  "GNUMAKEFLAGS",
  "MFLAGS",
  "MAKEFILES",
  "AWKPATH",
  "AWKLIBPATH",
  "DEVELOPER_DIR",
  "CFLAGS",
  "CXXFLAGS",
  "CPPFLAGS",
  "LDFLAGS",
  "LDLIBS",
  "CC",
  "CXX",
  "CPP",
  "MAKE",
  "AR",
  "AS",
  "LD",
  "LEX",
  "YACC",
  "RANLIB",
  "ARFLAGS",
  "RANLIBFLAGS",
  "NM",
  "STRIP",
  "OBJCOPY",
  "OBJDUMP",
  "PKG_CONFIG",
  "FC",
  "F77",
  "FFLAGS",
  "FCFLAGS",
  "CGO_CFLAGS",
  "CGO_CPPFLAGS",
  "CGO_CXXFLAGS",
  "CGO_FFLAGS",
  "CGO_LDFLAGS",
  "HOST_CC",
  "HOST_CXX",
  "HOST_AR",
  "HOST_RANLIB",
  "HOST_ARFLAGS",
  "HOST_CFLAGS",
  "HOST_CXXFLAGS",
  "TARGET_RANLIB",
  "TARGET_ARFLAGS",
  "TARGET_CC",
  "TARGET_CXX",
  "TARGET_AR",
  "TARGET_CFLAGS",
  "TARGET_CXXFLAGS",
  "GCC_EXEC_PREFIX",
  "COMPILER_PATH",
  "DEPENDENCIES_OUTPUT",
  "SUNPRO_DEPENDENCIES",
  "GOAUTH",
  "GOTOOLCHAIN",
  "OPENSSL_ENGINES",
  "SHELLOPTS",
  "BASHOPTS",
  "PS4",
  "PROMPT_COMMAND",
  "GIT_SSH_COMMAND",
  "GIT_SSH",
  "GIT_EXEC_PATH",
  "GIT_ASKPASS",
  "SSH_ASKPASS",
  "GIT_PAGER",
  "PAGER",
  "EDITOR",
  "VISUAL",
  "BROWSER",
  "PYTHONWARNINGS",
  "PYTHONBREAKPOINT",
  "PERL5DB",
  "NODE_REPL_EXTERNAL_MODULE",
  "JAVA_TOOL_OPTIONS",
  "_JAVA_OPTIONS",
  "JDK_JAVA_OPTIONS",
  "IBM_JAVA_OPTIONS",
  "OPENJ9_JAVA_OPTIONS",
  "NODE_OPTIONS",
  "NODE_COMPILE_CACHE",
  "PYTHONSTARTUP",
  "PYTHONHOME",
  "PYTHONUSERBASE",
  "BASH_ENV",
  "ENV",
  "PERL5OPT",
  "RUBYOPT",
  "GEM_HOME",
  "RUBYGEMS_GEMDEPS",
  "BUNDLE_GEMFILE",
  "OPENSSL_CONF",
  "OPENSSL_CONF_INCLUDE",
  "OPENSSL_MODULES",
  "DYLD_INSERT_LIBRARIES",
  "LD_PRELOAD",
  "LD_AUDIT",
  "BUN_OPTIONS",
  "npm_config_script_shell",
  "NPM_CONFIG_SCRIPT_SHELL",
  "RUSTC",
  "RUSTC_WRAPPER",
  "RUSTC_WORKSPACE_WRAPPER",
  "RUSTDOC",
  "CARGO_BUILD_RUSTC",
  "CARGO_BUILD_RUSTC_WRAPPER",
  "CARGO_BUILD_RUSTC_WORKSPACE_WRAPPER",
  "CARGO_BUILD_RUSTDOC",
  "CARGO_BUILD_RUSTFLAGS",
  "RUSTDOCFLAGS",
  "CARGO_BUILD_RUSTDOCFLAGS",
  "CARGO_ENCODED_RUSTDOCFLAGS",
  "CARGO_ENCODED_RUSTFLAGS",
  "GOROOT",
  "PSModulePath",
  "PSMODULEPATH",
  "JAVA_HOME",
  "JAVACMD",
  "JDK_HOME",
  "DOTNET_ROOT",
  "COREPACK_HOME",
  "VIRTUAL_ENV",
  "CONDA_PREFIX",
  "PYENV_ROOT",
  "PYENV_VERSION",
  "VOLTA_HOME",
  "ASDF_DIR",
  "ASDF_DATA_DIR",
  "RBENV_ROOT",
  "RBENV_VERSION",
  "NODENV_ROOT",
  "NODENV_VERSION",
  "GOENV_ROOT",
  "GOENV_VERSION",
  "JENV_ROOT",
  "JENV_VERSION",
  "PLENV_ROOT",
  "PLENV_VERSION",
  "PERL5SHELL",
  "RUBYSHELL",
  "NODE_V8_COVERAGE",
  "NODE_REDIRECT_WARNINGS",
  "AWS_PAGER",
  "GH_PAGER",
  "CLOUDSDK_PYTHON",
  "CLOUDSDK_PYTHON_ARGS",
  "CLOUDSDK_GSUTIL_PYTHON",
  "CLOUDSDK_BQ_PYTHON",
  "UV_PYTHON",
  "GH_BROWSER",
  "SOPS_GPG_EXEC",
  "RSYNC_RSH",
  "CVS_RSH",
  "TAR_OPTIONS",
  "DOCKER_CLI_PLUGIN_EXTRA_DIRS",
  "R_PROFILE",
  "R_PROFILE_USER",
  "R_ENVIRON",
  "R_ENVIRON_USER",
]);
var DIRECTORY_ENV_NAMES = new Set([
  "GOROOT",
  "JAVA_HOME",
  "JDK_HOME",
  "DOTNET_ROOT",
  "COREPACK_HOME",
  "VIRTUAL_ENV",
  "CONDA_PREFIX",
  "PYENV_ROOT",
  "VOLTA_HOME",
  "ASDF_DIR",
  "ASDF_DATA_DIR",
  "RBENV_ROOT",
  "NODENV_ROOT",
  "GOENV_ROOT",
  "JENV_ROOT",
  "PLENV_ROOT",
  "ZDOTDIR",
]);
var FILE_ENV_NAMES = new Set([
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
  "JAVACMD",
  "CLOUDSDK_PYTHON",
  "CLOUDSDK_GSUTIL_PYTHON",
  "CLOUDSDK_BQ_PYTHON",
  "UV_PYTHON",
  "SOPS_GPG_EXEC",
  "R_PROFILE",
  "R_PROFILE_USER",
  "R_ENVIRON",
  "R_ENVIRON_USER",
]);
//@ chunk-s61vbvea.js:213675-213781 placement = normalizeSource (0.887)
/**
 * 环境变量名分类：路径列表类（PATH 等）→ directory，文件类 → file。名字配错，见 lead 建议。
 */
function normalizeSource(e) {
  let replaced = e.toUpperCase().replace(/-/g, "_");
  return DIRECTORY_ENV_NAMES.has(replaced) ? "directory" : FILE_ENV_NAMES.has(replaced) ? "file" : null;
}
//@ chunk-s61vbvea.js:213781-214191 placement
/**
 * 会影响 git 或编译器行为的危险环境变量名正则与额外名单。
 */
var DANGEROUS_ENV_NAME_RE =
  /^(?:DYLD_|LD_|BASH_FUNC_|GIT_CONFIG_|LUA_|TF_CLI_ARGS|CARGO_ALIAS_|CARGO_TARGET_[A-Z0-9_]+_(?:RUNNER|LINKER|RUSTFLAGS|RUSTDOCFLAGS)$|(?:CC|CXX|AR|RANLIB|(?:AR|RANLIB)FLAGS|FC?FLAGS|CFLAGS|CXXFLAGS|LDFLAGS)_(?:X86_64|I[3-6]86|AARCH64|ARM|RISCV|WASM|POWERPC|S390X|MIPS|SPARC|LOONGARCH|THUMB)[A-Z0-9_-]*$|[A-Z0-9][A-Z0-9_]*_(?:EXTERNAL_DIFF|PAGER|EDITOR)$)/;
var DANGEROUS_ENV_NAMES = new Set([...DANGEROUS_ENV_NAME_LIST].map((e) => e.toUpperCase()));
//@ chunk-s61vbvea.js:214191-214256 placement
/**
 * 判断变量名是否属于构建工具环境变量名单（大小写与连字符归一）。
 */
function isBuildToolEnvVar(e) {
  return BUILD_TOOL_ENV_VAR_SET.has(e.toUpperCase().replace(/-/g, "_"));
}
//@ chunk-s61vbvea.js:214256-214276 placement
var BUILD_TOOL_ENV_VAR_SET = new Set(BUILD_TOOL_ENV_VARS);
//@ chunk-s61vbvea.js:214276-214361 placement
/**
 * 判断环境变量名是否危险（命中危险名单或危险模式）。
 */
function isDangerousEnvName(e) {
  let replaced = e.toUpperCase().replace(/-/g, "_");
  return DANGEROUS_ENV_NAMES.has(replaced) || DANGEROUS_ENV_NAME_RE.test(replaced);
}
//@ chunk-s61vbvea.js:257197-257461 placement
/**
 * 检出内设置不可读的标记与提示。
 */
var IN_TREE_SETTINGS_UNREADABLE = Symbol("in-tree settings unreadable");
var EMPTY_VALUE = "";
var IN_TREE_SETTINGS_UNREADABLE_MESSAGE =
  "this checkout's .claude/settings.json or .claude/settings.local.json cannot be read or parsed: fix or remove it (see /status), then retry \u2014 what it may grant a bound session is unknown, so no git runs";
//@ chunk-s61vbvea.js:257461-257550 placement
/**
 * 把仓库可达根集合归一为可用的根列表；不可读时返回"不可读"标记。
 */
function reachRootsOrUnreadable(e) {
  let repoSettingsReachRoots = collectRepoSettingsReachRoots(e.tree);
  return repoSettingsReachRoots === "unreadable"
    ? IN_TREE_SETTINGS_UNREADABLE
    : resolveReachRoots([...e.roots, ...repoSettingsReachRoots], e.tree);
}
//@ chunk-s61vbvea.js:257550-257638 placement
/**
 * 以可达根和预设置环境构造隔离的 git 环境。
 */
function buildGitEnvForReach(e, screenMemo, r = GIT_FAILURE_CLASSIFIERS(getPreSettingsEnv())) {
  return buildGitEnv(
    e === undefined || e === IN_TREE_SETTINGS_UNREADABLE || screenMemo === undefined
      ? e
      : mergeReachRoots(screenMemo, e),
    screenMemo,
    r,
  );
}
//@ chunk-s61vbvea.js:257638-257718 placement
/**
 * 把 OPENSSL_CONF_INCLUDE 派生变量合并进环境。
 */
function applyOpenSslConfInclude(e) {
  let n = opensslConfIncludeEnv(e);
  return n.OPENSSL_CONF_INCLUDE === undefined
    ? e
    : {
        ...e,
        ...n,
      };
}
//@ chunk-s61vbvea.js:257718-257857 placement
function opensslConfIncludeEnv(e) {
  let envCaseInsensitive = getEnvCaseInsensitive(e, "OPENSSL_CONF");
  return envCaseInsensitive === undefined ||
    !isAbsolute(envCaseInsensitive) ||
    getEnvCaseInsensitive(e, "OPENSSL_CONF_INCLUDE") !== undefined
    ? {}
    : {
        OPENSSL_CONF_INCLUDE: dirname(envCaseInsensitive),
      };
}
//@ chunk-s61vbvea.js:257857-258041 placement
function sanitizePathVars(e) {
  let filtered = Object.keys(e).filter((key) =>
    getPlatform_2() === "windows" ? key.toUpperCase() === "PATH" : key === "PATH",
  );
  return {
    ...e,
    ...Object.fromEntries(filtered.map((r) => [r, e[r] === undefined ? undefined : sanitizePathEnv(e[r])])),
  };
}
//@ chunk-s61vbvea.js:258041-260207 placement
/**
 * 为隔离 git 子进程构造环境（清 GIT_CONFIG*、OPENSSL_CONF、PATH 等）
 */
function buildGitEnv(e, n, r = getPreSettingsEnv()) {
  let s = sanitizePathVars(applyOpenSslConfInclude(r));
  if (e === undefined) return s;
  let filtered = Object.keys(s).filter((key) =>
    getPlatform_2() === "windows" ? key.toUpperCase() === "PATH" : key === "PATH",
  );
  let flattened = Object.keys(s).flatMap((key) => {
    let Ee =
      getPlatform_2() === "windows"
        ? PROTECTED_ENV_VARS.find((Ie) => Ie === key.toUpperCase())
        : PROTECTED_ENV_VARS.find((Ie) => Ie === key);
    return Ee === undefined ? [] : [[key, Ee]];
  });
  let S = new Set(flattened.map(([ie]) => ie));
  let filtered_2 = Object.keys(s).filter(
    (key) => !S.has(key) && isDangerousEnvName(key) && key.toUpperCase() !== "GIT_CONFIG_NOSYSTEM",
  );
  let mapped = filtered_2.map((ie) => [ie, normalizeSource(ie)]);
  let flattened_2 = mapped.flatMap(([ie, Ee]) => (Ee === null ? [] : [[ie, Ee]]));
  let flattened_3 = mapped.flatMap(([ie, Ee]) => (Ee === null ? [ie] : []));
  let j = new Set(filtered_2);
  let filtered_3 = Object.keys(s).filter(
    (key) =>
      !S.has(key) &&
      !j.has(key) &&
      (getPlatform_2() === "windows" ? key.toUpperCase() !== "PATH" : key !== "PATH") &&
      isBuildToolEnvVar(key),
  );
  if (e === IN_TREE_SETTINGS_UNREADABLE)
    return {
      ...Uo(s, [...flattened.map(([ie]) => ie), ...filtered_3, ...filtered_2]),
      PATH: "",
      ...Object.fromEntries(filtered.map((ie) => [ie, ""])),
      ...blankClasspathEnv(s),
    };
  let L = jsonStringify(e);
  let q = (ie, Ee, Ie, ke) => {
    if (ie === undefined) return ke();
    let Me = jsonStringify([Ee, Ie]) + L;
    let We = ie.get(Me);
    if (We !== undefined) return We;
    let nt = ke();
    ie.set(Me, nt);
    return nt;
  };
  let reachPredicate = makeReachPredicate(e);
  let Z = listProgramNames(getEnvCaseInsensitive(s, "PATHEXT"));
  let ee = new Map();
  let ae = (ie, Ee) =>
    !isAbsolute(ie) ||
    hasShellVariableReference(Ee, ie) ||
    q(n?.loaders, `loader:${Ee}`, ie, () =>
      Ee === "GIT_EXEC_PATH"
        ? isProgramDirSafe(ie, reachPredicate, ee)
        : Ee === "DEVELOPER_DIR"
          ? findXcodeGit(ie, reachPredicate, ee)
          : INJECTION_ENV_VARS.includes(Ee)
            ? isReachableOrUnsafe(ie, reachPredicate, ee)
            : isProgramDirSafeFor(ie, reachPredicate, [], ee),
    );
  let flattened_4 = flattened.flatMap(([ie, Ee]) => {
    let Ie = s[ie];
    if (Ie === undefined || Ie === "") return [];
    let mapped = SCRUBBED_LOADER_ENV(Ee, Ie).map((We) => stripPathQuotes(We));
    let filtered = mapped.filter((We) => !ae(We, Ee));
    if (filtered.length === mapped.length) return [];
    return PATH_LIKE_GIT_ENV_VARS.includes(Ee)
      ? [[ie, null]]
      : [[ie, filtered.length === 0 ? null : filtered.join(PATH_LIST_DELIMITER)]];
  });
  let flattened_5 = flattened_2.flatMap(([ie, Ee]) => {
    let Ie = s[ie];
    if (Ie === undefined) return [];
    let ke = stripPathQuotes(Ie);
    return !(
      (getPlatform_2() !== "windows" &&
        ke === "/dev/null" &&
        !reachPredicate("/dev") &&
        lstatOrUndefined(ke)?.isCharacterDevice() === true) ||
      (Ie === "" && ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"].includes(ie.toUpperCase()))
    ) &&
      (!isAbsolute(ke) ||
        q(n?.loaders, `codepath:${ie}`, ke, () =>
          Ee === "file"
            ? isReachableOrUnsafe(ke, reachPredicate, ee)
            : isProgramDirSafeFor(ke, reachPredicate, [], ee),
        ))
      ? [ie]
      : [];
  });
  let flattened_6 = flattened_4.flatMap(([ie, Ee]) => (Ee === null ? [ie] : []));
  let Se = flattened_6.some((ie) => ie.toUpperCase() === "OPENSSL_CONF_INCLUDE")
    ? Object.keys(s).filter((key) => key.toUpperCase() === "OPENSSL_CONF")
    : [];
  let ce = [...flattened_6, ...filtered_3, ...flattened_3, ...flattened_5, ...Se];
  return {
    ...(ce.length === 0 ? s : Uo(s, ce)),
    ...Object.fromEntries(flattened_4.filter((ie) => ie[1] !== null)),
    ...blankClasspathEnv(s),
    ...Object.fromEntries(
      filtered.map((ie) => [
        ie,
        q(n?.paths, `path:${Z.join(";")}`, s[ie] ?? "", () => filterSafePathEnv(s[ie] ?? "", e, Z)),
      ]),
    ),
  };
}
//@ chunk-s61vbvea.js:260207-260217 placement
var PATH_LIST_DELIMITER = delimiter;
//@ chunk-s61vbvea.js:260217-260386 placement
function neutralCwd() {
  let e =
    getPlatform_2() === "windows" ? getEnvCaseInsensitive(buildGitEnv(undefined), "SystemRoot") : undefined;
  return e !== undefined && /^[A-Za-z]:[\\/]/.test(e)
    ? `${e.slice(0, 2)}${sep}`
    : parse(process.execPath).root || sep;
}
//@ chunk-s61vbvea.js:260386-260604 placement
/**
 * git 调用参数：项目外起点时用 -C 并去掉 PWD。
 */
function buildGitInvocation({ file, startsOutside }, r, { dir, env }) {
  if (!startsOutside)
    return {
      file,
      args: [...r],
      cwd: dir,
      env,
    };
  let filtered = Object.keys(env).filter((key) => /^(?:OLD)?PWD$/i.test(key));
  return {
    file,
    args: ["-C", resolve(dir), ...r],
    cwd: neutralCwd(),
    env: Uo(env, filtered),
  };
}
//@ chunk-s61vbvea.js:260604-260678 placement
/**
 * 用给定目录与环境运行一次 git 调用。
 */
function runGitWithEnv(e, n, { dir, env, ...h }) {
  return runInvocation(
    buildGitInvocation(e, n, {
      dir,
      env,
    }),
    h,
  );
}
//@ chunk-s61vbvea.js:260678-260761 placement
/**
 * 判断是否为 "fatal: cannot change to '…'"（退出码 128）错误。
 */
function isCannotChangeToError(e) {
  return e.exitCode === 128 && /^fatal: cannot change to '/m.test(seenStderr(e));
}
//@ chunk-s61vbvea.js:260761-260790 placement
var NO_CLASSPATH_SENTINEL = join(devNull, "no-classpath");
//@ chunk-s61vbvea.js:260790-260969 placement
function blankClasspathEnv(e) {
  let filtered = Object.keys(e).filter((key) => key.toUpperCase() === "CLASSPATH");
  let r = getPlatform_2() === "windows" && filtered.length > 0 ? filtered : uniq(["CLASSPATH", ...filtered]);
  return Object.fromEntries(r.map((s) => [s, NO_CLASSPATH_SENTINEL]));
}
//@ chunk-s61vbvea.js:260969-261377 placement
function SCRUBBED_LOADER_ENV(e, n) {
  if (e === "GIT_EXEC_PATH") return n.includes(delimiter) ? [n, ...n.split(delimiter)] : [n];
  if (
    e === "DEVELOPER_DIR" ||
    e === "GIT_TEXTDOMAINDIR" ||
    e === "OPENSSL_CONF" ||
    e === "OPENSSL_CONF_INCLUDE" ||
    e === "OPENSSL_MODULES" ||
    e === "OPENSSL_ENGINES"
  )
    return [n];
  if (getPlatform_2() === "windows") return n.split(delimiter);
  if (e === "LD_PRELOAD") return n.split(/[\s:]+/).filter((r) => r !== "");
  if (e === "LD_LIBRARY_PATH") return n.split(/[:;]/);
  return n.split(":");
}
//@ chunk-s61vbvea.js:261377-261575 placement
var PATH_LIKE_GIT_ENV_VARS = [
  "GIT_EXEC_PATH",
  "DEVELOPER_DIR",
  "GIT_TEXTDOMAINDIR",
  "OPENSSL_CONF_INCLUDE",
  "OPENSSL_MODULES",
  "OPENSSL_ENGINES",
];
var INJECTION_ENV_VARS = ["LD_PRELOAD", "LD_AUDIT", "DYLD_INSERT_LIBRARIES", "NLSPATH", "OPENSSL_CONF"];
//@ chunk-s61vbvea.js:261575-261663 placement
function hasShellVariableReference(e, n) {
  return (
    (EXPANSION_SENSITIVE_LOADER_VARS.includes(e) && n.includes("$")) || (e === "NLSPATH" && n.includes("%"))
  );
}
//@ chunk-s61vbvea.js:261663-261714 placement
var EXPANSION_SENSITIVE_LOADER_VARS = ["LD_PRELOAD", "LD_LIBRARY_PATH", "LD_AUDIT"];
//@ chunk-s61vbvea.js:261714-262069 placement
function scrubGitTrace2Env(e) {
  let n = (r, s) => {
    let envCaseInsensitive = getEnvCaseInsensitive(e, r);
    return envCaseInsensitive !== undefined && envCaseInsensitive !== "" ? envCaseInsensitive : s;
  };
  return {
    GIT_TRACE2: n("GIT_TRACE2", "0"),
    GIT_TRACE2_EVENT: n("GIT_TRACE2_EVENT", "0"),
    GIT_TRACE2_PERF: n("GIT_TRACE2_PERF", "0"),
    GIT_TRACE2_ENV_VARS: n("GIT_TRACE2_ENV_VARS", EMPTY_CONFIG_VALUE),
    GIT_TRACE2_CONFIG_PARAMS: n("GIT_TRACE2_CONFIG_PARAMS", EMPTY_CONFIG_VALUE),
    GIT_TRACE2_MAX_FILES: n("GIT_TRACE2_MAX_FILES", "0"),
  };
}
//@ chunk-s61vbvea.js:262069-262080 placement
var EMPTY_CONFIG_VALUE = "-";
//@ chunk-s61vbvea.js:262080-262238 placement
/**
 * 取 GIT_CONFIG_GLOBAL/SYSTEM。
 */
function gitConfigLocationEnv(e) {
  let envCaseInsensitive = getEnvCaseInsensitive(e, "GIT_CONFIG_GLOBAL");
  let envCaseInsensitive_2 = getEnvCaseInsensitive(e, "GIT_CONFIG_SYSTEM");
  return {
    ...(envCaseInsensitive !== undefined && {
      GIT_CONFIG_GLOBAL: envCaseInsensitive,
    }),
    ...(envCaseInsensitive_2 !== undefined && {
      GIT_CONFIG_SYSTEM: envCaseInsensitive_2,
    }),
  };
}
//@ chunk-s61vbvea.js:262238-262562 placement
function resolveTempDir() {
  let preSettingsEnv = getPreSettingsEnv();
  let envCaseInsensitive = getEnvCaseInsensitive(preSettingsEnv, "CLAUDE_CODE_TMPDIR");
  if (envCaseInsensitive !== undefined && envCaseInsensitive !== "") return envCaseInsensitive;
  let platform = getPlatform_2();
  if (platform === "windows") {
    let h = getEnvCaseInsensitive(preSettingsEnv, "TEMP") ?? getEnvCaseInsensitive(preSettingsEnv, "TMP");
    return h !== undefined && h !== "" ? h : tmpdir();
  }
  let s =
    platform === "macos"
      ? undefined
      : (getEnvCaseInsensitive(preSettingsEnv, "TMPDIR") ??
        getEnvCaseInsensitive(preSettingsEnv, "TMP") ??
        getEnvCaseInsensitive(preSettingsEnv, "TEMP"));
  return s !== undefined && s !== "" ? (s.length > 1 && s.endsWith("/") ? s.slice(0, -1) : s) : "/tmp";
}
//@ chunk-s61vbvea.js:262562-262779 placement
/**
 * 设置生效前锁存的环境（合并后续覆盖）。
 */
function getPreSettingsEnv() {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  if (latchedPreSettingsEnvSnapshot === undefined) return process.env;
  let settingsAppliedEnv = getSettingsAppliedEnv();
  if (getPlatform_2() !== "windows")
    return {
      ...latchedPreSettingsEnvSnapshot,
      ...settingsAppliedEnv,
    };
  let r = new Set(Object.keys(settingsAppliedEnv).map((key) => key.toUpperCase()));
  return {
    ...pickByHelper(latchedPreSettingsEnvSnapshot, (s, h) => !r.has(h.toUpperCase())),
    ...settingsAppliedEnv,
  };
}
//@ chunk-s61vbvea.js:262779-262838 placement
/**
 * 取绑定会话（bound session）的可达根。
 */
function boundSessionReachRoots(e) {
  let n = reachForBoundSession(e);
  return n === undefined ? undefined : reachRootsOrUnreadable(n);
}
//@ chunk-s61vbvea.js:262838-263048 placement
/**
 * 被设置改动的 git 配置位置变量。
 */
function findOverriddenGitConfigVar(layout, screenMemo) {
  let r = boundSessionReachRoots(layout);
  if (r === undefined) return;
  let gitEnv = buildGitEnv(undefined);
  let gitEnvForReach = buildGitEnvForReach(r === IN_TREE_SETTINGS_UNREADABLE ? [] : r, screenMemo);
  return GIT_CONFIG_ENV_VARS.find(
    (y) =>
      getEnvCaseInsensitive(gitEnv, y) !== undefined &&
      getEnvCaseInsensitive(gitEnvForReach, y) !== getEnvCaseInsensitive(gitEnv, y) &&
      !(y === "GIT_CONFIG_SYSTEM" && parseGitBoolEnv(getEnvCaseInsensitive(gitEnv, "GIT_CONFIG_NOSYSTEM"))),
  );
}
//@ chunk-s61vbvea.js:263048-263156 placement
/**
 * 绑定会话的工作树可达范围。
 */
function reachForBoundSession(e) {
  return e.bound === true
    ? {
        ...reachForWorkTree(e.workTree, e),
        ...(e.startsInProject && {
          startsInProject: true,
        }),
      }
    : undefined;
}
//@ chunk-s61vbvea.js:263156-263193 placement
/**
 * 取某工作树的可达根。
 */
function workTreeReachRoots(cwd, n) {
  return reachRootsOrUnreadable(reachForWorkTree(cwd, n));
}
//@ chunk-s61vbvea.js:288580-288653 placement
/**
 * 匹配 include/includeIf 的 path 配置键的正则。
 */
var INCLUDE_PATH_CONFIG_KEY_RE = String.raw`^(include|includeif\..*)\.path$`;
var regExp_7 = new RegExp(INCLUDE_PATH_CONFIG_KEY_RE, "s");
//@ chunk-s61vbvea.js:288653-289461 placement
/**
 * 隔离 git 用的常量组：条件 include 正则、C 语言环境、禁用诊断用测试变量、只读运行的环境与 -c 参数。
 */
var GIT_ISOLATION_CONFIG_ARGS = /^includeif\.(?:gitdir(?:\/i)?|hasconfig):/s;
var C_LOCALE_ENV = {
  LC_ALL: "C",
  LANGUAGE: "C",
};
var GIT_TEST_DISABLE_ENV = {
  GIT_TEST_COMMIT_GRAPH: "0",
  GIT_TEST_MULTI_PACK_INDEX: "0",
};
var GIT_READ_ENV = {
  ...GIT_TEST_DISABLE_ENV,
  GIT_ALLOW_PROTOCOL: GIT_ALLOW_PROTOCOL_VALUE,
  GIT_TERMINAL_PROMPT: "0",
  ...C_LOCALE_ENV,
  GIT_NO_LAZY_FETCH: "1",
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_GRAFT_FILE: getPlatform_2() === "windows" ? "\\\\.\\NUL\\no-grafts" : "/dev/null/no-grafts",
};
var GIT_REF_PARANOIA_ENV = {
  GIT_REF_PARANOIA: "1",
};
var GIT_LIST_ENV = {
  ...GIT_TEST_DISABLE_ENV,
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_GRAFT_FILE: getPlatform_2() === "windows" ? "\\\\.\\NUL\\no-grafts" : "/dev/null/no-grafts",
};
var REPLACE_REFS_CONFIG = ["core.useReplaceRefs", "false"];
var GIT_READ_CONFIG_OVERRIDES = [
  ["core.commitGraph", "false"],
  ["core.multiPackIndex", "false"],
  ["pack.useBitmaps", "false"],
  ["pack.readReverseIndex", "false"],
  REPLACE_REFS_CONFIG,
];
var configPairsToArgs = (e) => e.flatMap(([n, r]) => ["-c", `${n}=${r}`]);
var GIT_READ_CONFIG_ARGS = configPairsToArgs(GIT_READ_CONFIG_OVERRIDES);
var GIT_REPLACE_REFS_CONFIG_ARGS = configPairsToArgs([REPLACE_REFS_CONFIG]);
var SAFECRLF_ARGS = ["-c", "core.safecrlf=false"];
var GIT_READ_ARGS = ["-c", "submodule.recurse=false", ...SAFECRLF_ARGS, ...GIT_READ_CONFIG_ARGS];
var MAX_GIT_BUFFER_BYTES = 67108864;
//@ chunk-s61vbvea.js:289461-289530 placement
var ALLOWED_CCR_GIT_REMOTES = [];
var REPO_SLUG_RE = /^[a-z0-9.-]+(?::[0-9]+)?\/[a-z0-9._-]+\/[a-z0-9._-]+$/;
//@ chunk-s61vbvea.js:289530-290055 placement
/**
 * 远端 URL 是否为允许的仓库（含 CCR git 代理）。
 */
function isAllowedGitRemote(e) {
  if (!/^https?:\/\//.test(e) && !/^ssh:\/\//.test(e) && !/^git@/.test(e)) return false;
  if (/[?#\\]/.test(firstLineOf(e.replace(/^(?:https?|ssh):\/\//, ""), "/"))) return false;
  if (describeUrlScheme(e) || isSuspiciousUrl(e)) return false;
  let replaced = e
    .replace(/^https?:\/\//, "")
    .replace(/^ssh:\/\//, "")
    .replace(/^[^@/]+@/, "")
    .replace(/\/$/, "");
  if (isCcrGitProxySession() && isLocalHost(firstLineOf(replaced, "/"))) {
    let r = normalizeGitRemoteUrl(e);
    if (r && !replaced.includes("@") && REPO_SLUG_RE.test(r)) return ALLOWED_CCR_GIT_REMOTES.includes(r);
  }
  if (hasEncodedPathChars(replaced)) return false;
  return ALLOWED_CCR_GIT_REMOTES.some((r) => {
    if (!replaced.startsWith(r)) return false;
    let sliced = replaced.slice(r.length);
    return sliced === "" || sliced === ".git" || sliced.startsWith("/");
  });
}
//@ chunk-s61vbvea.js:290055-290100 placement
/**
 * 当前工作目录的 git 根（取不到时返回初始 cwd）。
 */
function cwdOrGitRoot() {
  let cwd = getCwd();
  return findGitRoot(cwd) ?? getOriginalCwd();
}
//@ chunk-s61vbvea.js:290100-290110 placement
var FORCE_NOT_IN_GIT_REPO = false;
//@ chunk-s61vbvea.js:290110-290149 placement
/**
 * 判断给定目录不在 git 仓库内。
 */
function isNotInGitRepo(e) {
  return FORCE_NOT_IN_GIT_REPO || findGitRoot(e) === null;
}
//@ chunk-s61vbvea.js:290149-290187 placement
/**
 * 取路径的规范 git 根，取不到时回退为网络挂载归一或原值。
 */
function canonicalRootOrSelf(e) {
  return noUncachedRoot(e) ?? findCanonicalGitRoot(e) ?? e;
}
export {
  isAllowedGitRemote,
  canonicalRootOrSelf,
  cwdOrGitRoot,
  isNotInGitRepo,
  buildGitEnv,
  GIT_READ_CONFIG_ARGS,
  GIT_LIST_ENV,
  isDangerousEnvName,
  isBuildToolEnvVar,
  resolveTempDir,
  BUILD_TOOL_ENV_VARS,
  IN_TREE_SETTINGS_UNREADABLE,
  buildGitEnvForReach,
  runGitWithEnv,
  C_LOCALE_ENV,
  IN_TREE_SETTINGS_UNREADABLE_MESSAGE,
  gitConfigLocationEnv,
  scrubGitTrace2Env,
  workTreeReachRoots,
  buildGitInvocation,
  getPreSettingsEnv,
  GIT_REPLACE_REFS_CONFIG_ARGS,
  DANGEROUS_ENV_NAME_LIST,
  reachForBoundSession,
  SAFECRLF_ARGS,
  findOverriddenGitConfigVar,
  reachRootsOrUnreadable,
  DIRECTORY_ENV_NAMES,
  boundSessionReachRoots,
  EMPTY_VALUE,
  GIT_READ_ARGS,
  MAX_GIT_BUFFER_BYTES,
  GIT_READ_ENV,
  GIT_REF_PARANOIA_ENV,
  opensslConfIncludeEnv,
  applyOpenSslConfInclude,
  INCLUDE_PATH_CONFIG_KEY_RE,
  isCannotChangeToError,
  regExp_7,
  GIT_ISOLATION_CONFIG_ARGS,
};
