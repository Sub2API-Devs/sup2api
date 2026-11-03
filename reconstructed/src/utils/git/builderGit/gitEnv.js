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
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  delimiter,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
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
} from "path";
import { devNull, tmpdir } from "os";
import {
  collectRepoSettingsReachRoots,
  resolveReachRoots,
  mergeReachRoots,
  makeReachPredicate,
  isReachableOrUnsafe,
  el,
  filterSafePathEnv,
  reachForWorkTree,
} from "./sandboxReach.js";
import { Pqr, txe } from "./gitRun.js";
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
import { listProgramNames, yS, findXcodeGit, xd } from "./gitBinary.js";
import { runInvocation } from "../../detectRepository.js";
import { uniq } from "../../collections.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../managedEnvApply.js";
import { getSettingsAppliedEnv } from "../../permissions/protectedSettingsPaths.js";
import { Do, kMe } from "../gitSafeEnv.js";
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
import { dY } from "../../settings/settingsStorage.js";

//@ chunk-s61vbvea.js:210150-213675 placement
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
  ],
  CVo = new Set([
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
  ]),
  id = new Set([
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
  ]),
  JA = new Set([
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
/**
 * 环境变量名分类：路径列表类（PATH 等）→ directory，文件类 → file。名字配错，见 lead 建议。
 */
//@ chunk-s61vbvea.js:213675-213781 placement = normalizeSource (0.887)
function normalizeSource(e) {
  let replaced = e.toUpperCase().replace(/-/g, "_");
  return id.has(replaced) ? "directory" : JA.has(replaced) ? "file" : null;
}
/**
 * 会影响 git 或编译器行为的危险环境变量名正则与额外名单。
 */
//@ chunk-s61vbvea.js:213781-214191 placement
var DANGEROUS_ENV_NAME_RE =
    /^(?:DYLD_|LD_|BASH_FUNC_|GIT_CONFIG_|LUA_|TF_CLI_ARGS|CARGO_ALIAS_|CARGO_TARGET_[A-Z0-9_]+_(?:RUNNER|LINKER|RUSTFLAGS|RUSTDOCFLAGS)$|(?:CC|CXX|AR|RANLIB|(?:AR|RANLIB)FLAGS|FC?FLAGS|CFLAGS|CXXFLAGS|LDFLAGS)_(?:X86_64|I[3-6]86|AARCH64|ARM|RISCV|WASM|POWERPC|S390X|MIPS|SPARC|LOONGARCH|THUMB)[A-Z0-9_-]*$|[A-Z0-9][A-Z0-9_]*_(?:EXTERNAL_DIFF|PAGER|EDITOR)$)/,
  DANGEROUS_ENV_NAMES = new Set([...CVo].map((e) => e.toUpperCase()));
//@ chunk-s61vbvea.js:214191-214256 placement
function DNe(e) {
  return eP.has(e.toUpperCase().replace(/-/g, "_"));
}
//@ chunk-s61vbvea.js:214256-214276 placement
var eP = new Set(BUILD_TOOL_ENV_VARS);
//@ chunk-s61vbvea.js:214276-214361 placement
function cSe(e) {
  let replaced = e.toUpperCase().replace(/-/g, "_");
  return DANGEROUS_ENV_NAMES.has(replaced) || DANGEROUS_ENV_NAME_RE.test(replaced);
}
/**
 * 检出内设置不可读的标记与提示。
 */
//@ chunk-s61vbvea.js:257197-257461 placement
var IN_TREE_SETTINGS_UNREADABLE = Symbol("in-tree settings unreadable"),
  EMPTY_VALUE = "",
  IN_TREE_SETTINGS_UNREADABLE_MESSAGE =
    "this checkout's .claude/settings.json or .claude/settings.local.json cannot be read or parsed: fix or remove it (see /status), then retry \u2014 what it may grant a bound session is unknown, so no git runs";
//@ chunk-s61vbvea.js:257461-257550 placement
function ui(e) {
  let n = collectRepoSettingsReachRoots(e.tree);
  return n === "unreadable" ? IN_TREE_SETTINGS_UNREADABLE : resolveReachRoots([...e.roots, ...n], e.tree);
}
//@ chunk-s61vbvea.js:257550-257638 placement
function oKt(e, n, r = Pqr(getPreSettingsEnv())) {
  return buildGitEnv(
    e === void 0 || e === IN_TREE_SETTINGS_UNREADABLE || n === void 0 ? e : mergeReachRoots(n, e),
    n,
    r,
  );
}
//@ chunk-s61vbvea.js:257638-257718 placement
function tS(e) {
  let n = opensslConfIncludeEnv(e);
  return n.OPENSSL_CONF_INCLUDE === void 0 ? e : { ...e, ...n };
}
//@ chunk-s61vbvea.js:257718-257857 placement
function opensslConfIncludeEnv(e) {
  let n = getEnvCaseInsensitive(e, "OPENSSL_CONF");
  return n === void 0 || !isAbsolute_6(n) || getEnvCaseInsensitive(e, "OPENSSL_CONF_INCLUDE") !== void 0
    ? {}
    : { OPENSSL_CONF_INCLUDE: dirname_2(n) };
}
//@ chunk-s61vbvea.js:257857-258041 placement
function sanitizePathVars(e) {
  let filtered = Object.keys(e).filter((r) =>
    getPlatform_2() === "windows" ? r.toUpperCase() === "PATH" : r === "PATH",
  );
  return {
    ...e,
    ...Object.fromEntries(filtered.map((r) => [r, e[r] === void 0 ? void 0 : sanitizePathEnv(e[r])])),
  };
}
/**
 * 为隔离 git 子进程构造环境（清 GIT_CONFIG*、OPENSSL_CONF、PATH 等）
 */
//@ chunk-s61vbvea.js:258041-260207 placement
function buildGitEnv(e, n, r = getPreSettingsEnv()) {
  let s = sanitizePathVars(tS(r));
  if (e === void 0) return s;
  let filtered = Object.keys(s).filter((ie) =>
      getPlatform_2() === "windows" ? ie.toUpperCase() === "PATH" : ie === "PATH",
    ),
    flattened = Object.keys(s).flatMap((ie) => {
      let Ee =
        getPlatform_2() === "windows"
          ? PROTECTED_ENV_VARS.find((Ie) => Ie === ie.toUpperCase())
          : PROTECTED_ENV_VARS.find((Ie) => Ie === ie);
      return Ee === void 0 ? [] : [[ie, Ee]];
    }),
    S = new Set(flattened.map(([ie]) => ie)),
    filtered_2 = Object.keys(s).filter(
      (ie) => !S.has(ie) && cSe(ie) && ie.toUpperCase() !== "GIT_CONFIG_NOSYSTEM",
    ),
    mapped = filtered_2.map((ie) => [ie, normalizeSource(ie)]),
    flattened_2 = mapped.flatMap(([ie, Ee]) => (Ee === null ? [] : [[ie, Ee]])),
    flattened_3 = mapped.flatMap(([ie, Ee]) => (Ee === null ? [ie] : [])),
    j = new Set(filtered_2),
    filtered_3 = Object.keys(s).filter(
      (ie) =>
        !S.has(ie) &&
        !j.has(ie) &&
        (getPlatform_2() === "windows" ? ie.toUpperCase() !== "PATH" : ie !== "PATH") &&
        DNe(ie),
    );
  if (e === IN_TREE_SETTINGS_UNREADABLE)
    return {
      ...Uo(s, [...flattened.map(([ie]) => ie), ...filtered_3, ...filtered_2]),
      PATH: "",
      ...Object.fromEntries(filtered.map((ie) => [ie, ""])),
      ...blankClasspathEnv(s),
    };
  let L = jsonStringify(e),
    q = (ie, Ee, Ie, ke) => {
      if (ie === void 0) return ke();
      let Me = jsonStringify([Ee, Ie]) + L,
        We = ie.get(Me);
      if (We !== void 0) return We;
      let nt = ke();
      return (ie.set(Me, nt), nt);
    },
    Q = makeReachPredicate(e),
    Z = listProgramNames(getEnvCaseInsensitive(s, "PATHEXT")),
    ee = new Map(),
    ae = (ie, Ee) =>
      !isAbsolute_6(ie) ||
      MO(Ee, ie) ||
      q(n?.loaders, `loader:${Ee}`, ie, () =>
        Ee === "GIT_EXEC_PATH"
          ? yS(ie, Q, ee)
          : Ee === "DEVELOPER_DIR"
            ? findXcodeGit(ie, Q, ee)
            : INJECTION_ENV_VARS.includes(Ee)
              ? isReachableOrUnsafe(ie, Q, ee)
              : xd(ie, Q, [], ee),
      ),
    flattened_4 = flattened.flatMap(([ie, Ee]) => {
      let Ie = s[ie];
      if (Ie === void 0 || Ie === "") return [];
      let mapped = SCRUBBED_LOADER_ENV(Ee, Ie).map((We) => stripPathQuotes(We)),
        filtered = mapped.filter((We) => !ae(We, Ee));
      if (filtered.length === mapped.length) return [];
      return PATH_LIKE_GIT_ENV_VARS.includes(Ee)
        ? [[ie, null]]
        : [[ie, filtered.length === 0 ? null : filtered.join(EO)]];
    }),
    flattened_5 = flattened_2.flatMap(([ie, Ee]) => {
      let Ie = s[ie];
      if (Ie === void 0) return [];
      let ke = stripPathQuotes(Ie);
      return !(
        (getPlatform_2() !== "windows" &&
          ke === "/dev/null" &&
          !Q("/dev") &&
          el(ke)?.isCharacterDevice() === !0) ||
        (Ie === "" && ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"].includes(ie.toUpperCase()))
      ) &&
        (!isAbsolute_6(ke) ||
          q(n?.loaders, `codepath:${ie}`, ke, () =>
            Ee === "file" ? isReachableOrUnsafe(ke, Q, ee) : xd(ke, Q, [], ee),
          ))
        ? [ie]
        : [];
    }),
    flattened_6 = flattened_4.flatMap(([ie, Ee]) => (Ee === null ? [ie] : [])),
    Se = flattened_6.some((ie) => ie.toUpperCase() === "OPENSSL_CONF_INCLUDE")
      ? Object.keys(s).filter((ie) => ie.toUpperCase() === "OPENSSL_CONF")
      : [],
    ce = [...flattened_6, ...filtered_3, ...flattened_3, ...flattened_5, ...Se];
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
var EO = delimiter;
//@ chunk-s61vbvea.js:260217-260386 placement
function neutralCwd() {
  let e = getPlatform_2() === "windows" ? getEnvCaseInsensitive(buildGitEnv(void 0), "SystemRoot") : void 0;
  return e !== void 0 && /^[A-Za-z]:[\\/]/.test(e)
    ? `${e.slice(0, 2)}${sep_5}`
    : parse_2(process.execPath).root || sep_5;
}
/**
 * git 调用参数：项目外起点时用 -C 并去掉 PWD。
 */
//@ chunk-s61vbvea.js:260386-260604 placement
function buildGitInvocation({ file: file, startsOutside: startsOutside }, r, { dir: dir, env: env }) {
  if (!startsOutside) return { file: file, args: [...r], cwd: dir, env: env };
  let filtered = Object.keys(env).filter((S) => /^(?:OLD)?PWD$/i.test(S));
  return { file: file, args: ["-C", resolve_2(dir), ...r], cwd: neutralCwd(), env: Uo(env, filtered) };
}
//@ chunk-s61vbvea.js:260604-260678 placement
function eer(e, n, { dir: dir, env: env, ...h }) {
  return runInvocation(buildGitInvocation(e, n, { dir: dir, env: env }), h);
}
//@ chunk-s61vbvea.js:260678-260761 placement
function xO(e) {
  return e.exitCode === 128 && /^fatal: cannot change to '/m.test(txe(e));
}
//@ chunk-s61vbvea.js:260761-260790 placement
var CO = join_7(devNull, "no-classpath");
//@ chunk-s61vbvea.js:260790-260969 placement
function blankClasspathEnv(e) {
  let filtered = Object.keys(e).filter((s) => s.toUpperCase() === "CLASSPATH"),
    r = getPlatform_2() === "windows" && filtered.length > 0 ? filtered : uniq(["CLASSPATH", ...filtered]);
  return Object.fromEntries(r.map((s) => [s, CO]));
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
  ],
  INJECTION_ENV_VARS = ["LD_PRELOAD", "LD_AUDIT", "DYLD_INSERT_LIBRARIES", "NLSPATH", "OPENSSL_CONF"];
//@ chunk-s61vbvea.js:261575-261663 placement
function MO(e, n) {
  return (DO.includes(e) && n.includes("$")) || (e === "NLSPATH" && n.includes("%"));
}
//@ chunk-s61vbvea.js:261663-261714 placement
var DO = ["LD_PRELOAD", "LD_LIBRARY_PATH", "LD_AUDIT"];
//@ chunk-s61vbvea.js:261714-262069 placement
function scrubGitTrace2Env(e) {
  let n = (r, s) => {
    let h = getEnvCaseInsensitive(e, r);
    return h !== void 0 && h !== "" ? h : s;
  };
  return {
    GIT_TRACE2: n("GIT_TRACE2", "0"),
    GIT_TRACE2_EVENT: n("GIT_TRACE2_EVENT", "0"),
    GIT_TRACE2_PERF: n("GIT_TRACE2_PERF", "0"),
    GIT_TRACE2_ENV_VARS: n("GIT_TRACE2_ENV_VARS", by),
    GIT_TRACE2_CONFIG_PARAMS: n("GIT_TRACE2_CONFIG_PARAMS", by),
    GIT_TRACE2_MAX_FILES: n("GIT_TRACE2_MAX_FILES", "0"),
  };
}
//@ chunk-s61vbvea.js:262069-262080 placement
var by = "-";
/**
 * 取 GIT_CONFIG_GLOBAL/SYSTEM。
 */
//@ chunk-s61vbvea.js:262080-262238 placement
function gitConfigLocationEnv(e) {
  let n = getEnvCaseInsensitive(e, "GIT_CONFIG_GLOBAL"),
    r = getEnvCaseInsensitive(e, "GIT_CONFIG_SYSTEM");
  return { ...(n !== void 0 && { GIT_CONFIG_GLOBAL: n }), ...(r !== void 0 && { GIT_CONFIG_SYSTEM: r }) };
}
//@ chunk-s61vbvea.js:262238-262562 placement
function resolveTempDir() {
  let e = getPreSettingsEnv(),
    n = getEnvCaseInsensitive(e, "CLAUDE_CODE_TMPDIR");
  if (n !== void 0 && n !== "") return n;
  let r = getPlatform_2();
  if (r === "windows") {
    let h = getEnvCaseInsensitive(e, "TEMP") ?? getEnvCaseInsensitive(e, "TMP");
    return h !== void 0 && h !== "" ? h : tmpdir();
  }
  let s =
    r === "macos"
      ? void 0
      : (getEnvCaseInsensitive(e, "TMPDIR") ??
        getEnvCaseInsensitive(e, "TMP") ??
        getEnvCaseInsensitive(e, "TEMP"));
  return s !== void 0 && s !== "" ? (s.length > 1 && s.endsWith("/") ? s.slice(0, -1) : s) : "/tmp";
}
/**
 * 设置生效前锁存的环境（合并后续覆盖）。
 */
//@ chunk-s61vbvea.js:262562-262779 placement
function getPreSettingsEnv() {
  let e = getLatchedPreSettingsEnvSnapshot();
  if (e === void 0) return process.env;
  let n = getSettingsAppliedEnv();
  if (getPlatform_2() !== "windows") return { ...e, ...n };
  let r = new Set(Object.keys(n).map((s) => s.toUpperCase()));
  return { ...Do(e, (s, h) => !r.has(h.toUpperCase())), ...n };
}
//@ chunk-s61vbvea.js:262779-262838 placement
function rS(e) {
  let n = reachForBoundSession(e);
  return n === void 0 ? void 0 : ui(n);
}
/**
 * 被设置改动的 git 配置位置变量。
 */
//@ chunk-s61vbvea.js:262838-263048 placement
function findOverriddenGitConfigVar(e, n) {
  let r = rS(e);
  if (r === void 0) return;
  let s = buildGitEnv(void 0),
    h = oKt(r === IN_TREE_SETTINGS_UNREADABLE ? [] : r, n);
  return GIT_CONFIG_ENV_VARS.find(
    (y) =>
      getEnvCaseInsensitive(s, y) !== void 0 &&
      getEnvCaseInsensitive(h, y) !== getEnvCaseInsensitive(s, y) &&
      !(y === "GIT_CONFIG_SYSTEM" && parseGitBoolEnv(getEnvCaseInsensitive(s, "GIT_CONFIG_NOSYSTEM"))),
  );
}
/**
 * 绑定会话的工作树可达范围。
 */
//@ chunk-s61vbvea.js:263048-263156 placement
function reachForBoundSession(e) {
  return e.bound === !0
    ? { ...reachForWorkTree(e.workTree, e), ...(e.startsInProject && { startsInProject: !0 }) }
    : void 0;
}
//@ chunk-s61vbvea.js:263156-263193 placement
function MVo(e, n) {
  return ui(reachForWorkTree(e, n));
}
//@ chunk-s61vbvea.js:288580-288653 placement
var ES = String.raw`^(include|includeif\..*)\.path$`,
  regExp_7 = new RegExp(ES, "s");
//@ chunk-s61vbvea.js:288653-289461 placement
var GIT_ISOLATION_CONFIG_ARGS = /^includeif\.(?:gitdir(?:\/i)?|hasconfig):/s,
  Hyn = { LC_ALL: "C", LANGUAGE: "C" },
  RS = { GIT_TEST_COMMIT_GRAPH: "0", GIT_TEST_MULTI_PACK_INDEX: "0" },
  WI = {
    ...RS,
    GIT_ALLOW_PROTOCOL: kMe,
    GIT_TERMINAL_PROMPT: "0",
    ...Hyn,
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_GRAFT_FILE: getPlatform_2() === "windows" ? "\\\\.\\NUL\\no-grafts" : "/dev/null/no-grafts",
  },
  zI = { GIT_REF_PARANOIA: "1" },
  Lnt = {
    ...RS,
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_GRAFT_FILE: getPlatform_2() === "windows" ? "\\\\.\\NUL\\no-grafts" : "/dev/null/no-grafts",
  },
  xS = ["core.useReplaceRefs", "false"],
  KI = [
    ["core.commitGraph", "false"],
    ["core.multiPackIndex", "false"],
    ["pack.useBitmaps", "false"],
    ["pack.readReverseIndex", "false"],
    xS,
  ],
  TS = (e) => e.flatMap(([n, r]) => ["-c", `${n}=${r}`]),
  mee = TS(KI),
  dKt = TS([xS]),
  UVo = ["-c", "core.safecrlf=false"],
  VI = ["-c", "submodule.recurse=false", ...UVo, ...mee],
  Oy = 67108864;
//@ chunk-s61vbvea.js:289461-289530 placement
var CS = [],
  JI = /^[a-z0-9.-]+(?::[0-9]+)?\/[a-z0-9._-]+\/[a-z0-9._-]+$/;
/**
 * 远端 URL 是否为允许的仓库（含 CCR git 代理）。
 */
//@ chunk-s61vbvea.js:289530-290055 placement
function isAllowedGitRemote(e) {
  if (!/^https?:\/\//.test(e) && !/^ssh:\/\//.test(e) && !/^git@/.test(e)) return !1;
  if (/[?#\\]/.test(firstLineOf(e.replace(/^(?:https?|ssh):\/\//, ""), "/"))) return !1;
  if (describeUrlScheme(e) || isSuspiciousUrl(e)) return !1;
  let replaced = e
    .replace(/^https?:\/\//, "")
    .replace(/^ssh:\/\//, "")
    .replace(/^[^@/]+@/, "")
    .replace(/\/$/, "");
  if (isCcrGitProxySession() && isLocalHost(firstLineOf(replaced, "/"))) {
    let r = normalizeGitRemoteUrl(e);
    if (r && !replaced.includes("@") && JI.test(r)) return CS.includes(r);
  }
  if (hasEncodedPathChars(replaced)) return !1;
  return CS.some((r) => {
    if (!replaced.startsWith(r)) return !1;
    let sliced = replaced.slice(r.length);
    return sliced === "" || sliced === ".git" || sliced.startsWith("/");
  });
}
//@ chunk-s61vbvea.js:290055-290100 placement
function Nnt() {
  let e = getCwd();
  return findGitRoot(e) ?? getOriginalCwd();
}
//@ chunk-s61vbvea.js:290100-290110 placement
var QI = !1;
//@ chunk-s61vbvea.js:290110-290149 placement
function ZI(e) {
  return QI || findGitRoot(e) === null;
}
//@ chunk-s61vbvea.js:290149-290187 placement
function eM(e) {
  return dY(e) ?? findCanonicalGitRoot(e) ?? e;
}

export {
  isAllowedGitRemote,
  eM,
  Nnt,
  ZI,
  buildGitEnv,
  mee,
  Lnt,
  cSe,
  DNe,
  resolveTempDir,
  BUILD_TOOL_ENV_VARS,
  IN_TREE_SETTINGS_UNREADABLE,
  oKt,
  eer,
  Hyn,
  IN_TREE_SETTINGS_UNREADABLE_MESSAGE,
  gitConfigLocationEnv,
  scrubGitTrace2Env,
  MVo,
  buildGitInvocation,
  getPreSettingsEnv,
  dKt,
  CVo,
  reachForBoundSession,
  UVo,
  findOverriddenGitConfigVar,
  ui,
  id,
  rS,
  EMPTY_VALUE,
  VI,
  Oy,
  WI,
  zI,
  opensslConfIncludeEnv,
  tS,
  ES,
  xO,
  regExp_7,
  GIT_ISOLATION_CONFIG_ARGS,
};
