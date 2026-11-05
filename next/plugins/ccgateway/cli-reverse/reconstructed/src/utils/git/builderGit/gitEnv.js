/**
 * utils/git/builderGit/gitEnv.ts
 *
 * builderGit：隔离 git 子进程环境（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (6), chunk-fepf8jp6.js (35)
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
import { getPlatform } from "../../platform.js";
import { sanitizePathEnv, stripPathQuotes } from "../../which.js";
import {
  PROTECTED_ENV_VARS,
  GIT_CONFIG_ENV_VARS,
  parseGitBoolEnv,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { omitAlias } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { jsonStringify } from "../../slowOperations.js";
import { listProgramNames, isProgramDirSafe, findXcodeGit, isProgramDirSafeFor } from "./gitBinary.js";
import { runInvocation } from "../../detectRepository.js";
import { normalizeCaseForComparison_2 } from "../../permissions/filesystem.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-fepf8jp6.js:4735-8260 placement
/**
 * 运行构建工具的敏感环境变量名单（PATH/PYTHONPATH/各类工具链与预加载变量）。
 */
var BUILD_TOOL_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DANGEROUS_ENV_NAME_LIST;
var DIRECTORY_ENV_NAMES;
var FILE_ENV_NAMES;
deferInit("chunk-fepf8jp6.js:4735", () => {
  BUILD_TOOL_ENV_VARS = [
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
  DANGEROUS_ENV_NAME_LIST = new Set([
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
  DIRECTORY_ENV_NAMES = new Set([
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
  FILE_ENV_NAMES = new Set([
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
});
//@ chunk-fepf8jp6.js:8260-8366 placement (2.1.88 match: normalizeSource, 0.887)
/**
 * 环境变量名分类：路径列表类（PATH 等）→ directory，文件类 → file。名字配错，见 lead 建议。
 */
function normalizeSource_2(varName) {
  let replaced = varName.toUpperCase().replace(/-/g, "_");
  return DIRECTORY_ENV_NAMES.has(replaced) ? "directory" : FILE_ENV_NAMES.has(replaced) ? "file" : null;
}
//@ chunk-fepf8jp6.js:8366-8776 placement
/**
 * 会影响 git 或编译器行为的危险环境变量名正则与额外名单。
 */
var DANGEROUS_ENV_NAME_RE; // deferred: uses BUILD_TOOL_ENV_VARS of its import cycle while loading; runs once the cycle is complete
var DANGEROUS_ENV_NAMES;
deferInit("chunk-fepf8jp6.js:8366", () => {
  DANGEROUS_ENV_NAME_RE =
    /^(?:DYLD_|LD_|BASH_FUNC_|GIT_CONFIG_|LUA_|TF_CLI_ARGS|CARGO_ALIAS_|CARGO_TARGET_[A-Z0-9_]+_(?:RUNNER|LINKER|RUSTFLAGS|RUSTDOCFLAGS)$|(?:CC|CXX|AR|RANLIB|(?:AR|RANLIB)FLAGS|FC?FLAGS|CFLAGS|CXXFLAGS|LDFLAGS)_(?:X86_64|I[3-6]86|AARCH64|ARM|RISCV|WASM|POWERPC|S390X|MIPS|SPARC|LOONGARCH|THUMB)[A-Z0-9_-]*$|[A-Z0-9][A-Z0-9_]*_(?:EXTERNAL_DIFF|PAGER|EDITOR)$)/;
  DANGEROUS_ENV_NAMES = new Set([...DANGEROUS_ENV_NAME_LIST].map((name) => name.toUpperCase()));
});
//@ chunk-fepf8jp6.js:8776-8841 placement
/**
 * 判断变量名是否属于构建工具环境变量名单（大小写与连字符归一）。
 */
function isBuildToolEnvVar(name) {
  return BUILD_TOOL_ENV_VAR_SET.has(name.toUpperCase().replace(/-/g, "_"));
}
//@ chunk-fepf8jp6.js:8841-8861 placement
var BUILD_TOOL_ENV_VAR_SET; // deferred: uses BUILD_TOOL_ENV_VARS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fepf8jp6.js:8841", () => {
  BUILD_TOOL_ENV_VAR_SET = new Set(BUILD_TOOL_ENV_VARS);
});
//@ chunk-fepf8jp6.js:8861-8946 placement
/**
 * 判断环境变量名是否危险（命中危险名单或危险模式）。
 */
function isDangerousEnvName(name) {
  let replaced = name.toUpperCase().replace(/-/g, "_");
  return DANGEROUS_ENV_NAMES.has(replaced) || DANGEROUS_ENV_NAME_RE.test(replaced);
}
//@ chunk-fepf8jp6.js:51263-51525 placement
/**
 * 检出内设置不可读的标记与提示。
 */
var IN_TREE_SETTINGS_UNREADABLE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_VALUE;
var IN_TREE_SETTINGS_UNREADABLE_MESSAGE;
deferInit("chunk-fepf8jp6.js:51263", () => {
  IN_TREE_SETTINGS_UNREADABLE = Symbol("in-tree settings unreadable");
  EMPTY_VALUE = "";
  IN_TREE_SETTINGS_UNREADABLE_MESSAGE =
    "this checkout's .claude/settings.json or .claude/settings.local.json cannot be read or parsed: fix or remove it (see /status), then retry \u2014 what it may grant a bound session is unknown, so no git runs";
});
//@ chunk-fepf8jp6.js:51525-51613 placement
/**
 * 把仓库可达根集合归一为可用的根列表；不可读时返回"不可读"标记。
 */
function reachRootsOrUnreadable(reach) {
  let repoSettingsReachRoots = collectRepoSettingsReachRoots(reach.tree);
  return repoSettingsReachRoots === "unreadable"
    ? IN_TREE_SETTINGS_UNREADABLE
    : resolveReachRoots([...reach.roots, ...repoSettingsReachRoots], reach.tree);
}
//@ chunk-fepf8jp6.js:51613-51697 placement
/**
 * 以可达根和预设置环境构造隔离的 git 环境。
 */
function buildGitEnvForReach(
  reachRoots,
  screenMemo,
  classifiers = GIT_FAILURE_CLASSIFIERS(getPreSettingsEnv()),
) {
  return buildGitEnv(
    reachRoots === undefined || reachRoots === IN_TREE_SETTINGS_UNREADABLE || screenMemo === undefined
      ? reachRoots
      : mergeReachRoots(screenMemo, reachRoots),
    screenMemo,
    classifiers,
  );
}
//@ chunk-fepf8jp6.js:51697-51777 placement
/**
 * 把 OPENSSL_CONF_INCLUDE 派生变量合并进环境。
 */
function applyOpenSslConfInclude(env) {
  let confIncludeEnv = opensslConfIncludeEnv(env);
  return confIncludeEnv.OPENSSL_CONF_INCLUDE === undefined
    ? env
    : {
        ...env,
        ...confIncludeEnv,
      };
}
//@ chunk-fepf8jp6.js:51777-51914 placement
function opensslConfIncludeEnv(env) {
  let envCaseInsensitive = getEnvCaseInsensitive(env, "OPENSSL_CONF");
  return envCaseInsensitive === undefined ||
    !isAbsolute(envCaseInsensitive) ||
    getEnvCaseInsensitive(env, "OPENSSL_CONF_INCLUDE") !== undefined
    ? {}
    : {
        OPENSSL_CONF_INCLUDE: dirname(envCaseInsensitive),
      };
}
//@ chunk-fepf8jp6.js:51914-52098 placement
function sanitizePathVars(env) {
  let filtered = Object.keys(env).filter((key) =>
    getPlatform() === "windows" ? key.toUpperCase() === "PATH" : key === "PATH",
  );
  return {
    ...env,
    ...Object.fromEntries(
      filtered.map((key) => [key, env[key] === undefined ? undefined : sanitizePathEnv(env[key])]),
    ),
  };
}
//@ chunk-fepf8jp6.js:52098-54110 placement
/**
 * 为隔离 git 子进程构造环境（清 GIT_CONFIG*、OPENSSL_CONF、PATH 等）
 */
function buildGitEnv(reach, loaders, baseEnv = getPreSettingsEnv()) {
  let env = sanitizePathVars(applyOpenSslConfInclude(baseEnv));
  if (reach === undefined) return env;
  let filtered = Object.keys(env).filter((key) =>
    getPlatform() === "windows" ? key.toUpperCase() === "PATH" : key === "PATH",
  );
  let flattened = Object.keys(env).flatMap((key) => {
    let protectedName =
      getPlatform() === "windows"
        ? PROTECTED_ENV_VARS.find((name) => name === key.toUpperCase())
        : PROTECTED_ENV_VARS.find((name) => name === key);
    return protectedName === undefined ? [] : [[key, protectedName]];
  });
  let protectedKeys = new Set(flattened.map(([key]) => key));
  let filtered_2 = Object.keys(env).filter(
    (key) =>
      !protectedKeys.has(key) && isDangerousEnvName(key) && key.toUpperCase() !== "GIT_CONFIG_NOSYSTEM",
  );
  let mapped = filtered_2.map((key) => [key, normalizeSource_2(key)]);
  let flattened_2 = mapped.flatMap(([kind, kind_2]) => (kind_2 === null ? [] : [[kind, kind_2]]));
  let flattened_3 = mapped.flatMap(([key, kind]) => (kind === null ? [key] : []));
  let dangerousKeys = new Set(filtered_2);
  let filtered_3 = Object.keys(env).filter(
    (key) =>
      !protectedKeys.has(key) &&
      !dangerousKeys.has(key) &&
      (getPlatform() === "windows" ? key.toUpperCase() !== "PATH" : key !== "PATH") &&
      isBuildToolEnvVar(key),
  );
  if (reach === IN_TREE_SETTINGS_UNREADABLE)
    return {
      ...omitAlias(env, [...flattened.map(([key]) => key), ...filtered_3, ...filtered_2]),
      PATH: "",
      ...Object.fromEntries(filtered.map((key) => [key, ""])),
      ...blankClasspathEnv(env),
    };
  let reachJson = jsonStringify(reach);
  let memoize = (cache, keyPart, valuePart, compute) => {
    if (cache === undefined) return compute();
    let cacheKey = jsonStringify([keyPart, valuePart]) + reachJson;
    let cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;
    let computed = compute();
    cache.set(cacheKey, computed);
    return computed;
  };
  let reachPredicate = makeReachPredicate(reach);
  let programNames = listProgramNames(getEnvCaseInsensitive(env, "PATHEXT"));
  let probeMemo = new Map();
  let isLoaderPathSafe = (path, varName) =>
    !isAbsolute(path) ||
    hasShellVariableReference(varName, path) ||
    memoize(loaders?.loaders, `loader:${varName}`, path, () =>
      varName === "GIT_EXEC_PATH"
        ? isProgramDirSafe(path, reachPredicate, probeMemo)
        : varName === "DEVELOPER_DIR"
          ? findXcodeGit(path, reachPredicate, probeMemo)
          : INJECTION_ENV_VARS.includes(varName)
            ? isReachableOrUnsafe(path, reachPredicate, probeMemo)
            : isProgramDirSafeFor(path, reachPredicate, [], probeMemo),
    );
  let flattened_4 = flattened.flatMap(([varName, varName_2]) => {
    let value = env[varName];
    if (value === undefined || value === "") return [];
    let mapped = SCRUBBED_LOADER_ENV(varName_2, value).map((part) => stripPathQuotes(part));
    let filtered = mapped.filter((part) => !isLoaderPathSafe(part, varName_2));
    if (filtered.length === mapped.length) return [];
    return PATH_LIKE_GIT_ENV_VARS.includes(varName_2)
      ? [[varName, null]]
      : [[varName, filtered.length === 0 ? null : filtered.join(PATH_LIST_DELIMITER)]];
  });
  let flattened_5 = flattened_2.flatMap(([varName, varName_2]) => {
    let value = env[varName];
    if (value === undefined) return [];
    let path = stripPathQuotes(value);
    return !(
      (getPlatform() !== "windows" &&
        path === "/dev/null" &&
        !reachPredicate("/dev") &&
        lstatOrUndefined(path)?.isCharacterDevice() === true) ||
      (value === "" && ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"].includes(varName.toUpperCase()))
    ) &&
      (!isAbsolute(path) ||
        memoize(loaders?.loaders, `codepath:${varName}`, path, () =>
          varName_2 === "file"
            ? isReachableOrUnsafe(path, reachPredicate, probeMemo)
            : isProgramDirSafeFor(path, reachPredicate, [], probeMemo),
        ))
      ? [varName]
      : [];
  });
  let flattened_6 = flattened_4.flatMap(([varName, varName_2]) => (varName_2 === null ? [varName] : []));
  let opensslConfKeys = flattened_6.some((key) => key.toUpperCase() === "OPENSSL_CONF_INCLUDE")
    ? Object.keys(env).filter((key) => key.toUpperCase() === "OPENSSL_CONF")
    : [];
  let droppedKeys = [...flattened_6, ...filtered_3, ...flattened_3, ...flattened_5, ...opensslConfKeys];
  return {
    ...(droppedKeys.length === 0 ? env : omitAlias(env, droppedKeys)),
    ...Object.fromEntries(flattened_4.filter((entry) => entry[1] !== null)),
    ...blankClasspathEnv(env),
    ...Object.fromEntries(
      filtered.map((key) => [
        key,
        memoize(loaders?.paths, `path:${programNames.join(";")}`, env[key] ?? "", () =>
          filterSafePathEnv(env[key] ?? "", reach, programNames),
        ),
      ]),
    ),
  };
}
//@ chunk-fepf8jp6.js:54110-54120 placement
var PATH_LIST_DELIMITER = delimiter;
//@ chunk-fepf8jp6.js:54120-54289 placement
function neutralCwd() {
  let systemRoot =
    getPlatform() === "windows" ? getEnvCaseInsensitive(buildGitEnv(undefined), "SystemRoot") : undefined;
  return systemRoot !== undefined && /^[A-Za-z]:[\\/]/.test(systemRoot)
    ? `${systemRoot.slice(0, 2)}${sep}`
    : parse(process.execPath).root || sep;
}
//@ chunk-fepf8jp6.js:54289-54506 placement
/**
 * git 调用参数：项目外起点时用 -C 并去掉 PWD。
 */
function buildGitInvocation({ file, startsOutside }, args, { dir, env }) {
  if (!startsOutside)
    return {
      file,
      args: [...args],
      cwd: dir,
      env,
    };
  let filtered = Object.keys(env).filter((key) => /^(?:OLD)?PWD$/i.test(key));
  return {
    file,
    args: ["-C", resolve(dir), ...args],
    cwd: neutralCwd(),
    env: omitAlias(env, filtered),
  };
}
//@ chunk-fepf8jp6.js:54506-54578 placement
/**
 * 用给定目录与环境运行一次 git 调用。
 */
function runGitWithEnv(invocation, args, { dir, env, ...runOptions }) {
  return runInvocation(
    buildGitInvocation(invocation, args, {
      dir,
      env,
    }),
    runOptions,
  );
}
//@ chunk-fepf8jp6.js:54578-54661 placement
/**
 * 判断是否为 "fatal: cannot change to '…'"（退出码 128）错误。
 */
function isCannotChangeToError(result) {
  return result.exitCode === 128 && /^fatal: cannot change to '/m.test(seenStderr(result));
}
//@ chunk-fepf8jp6.js:54661-54689 placement
var NO_CLASSPATH_SENTINEL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fepf8jp6.js:54661", () => {
  NO_CLASSPATH_SENTINEL = join(devNull, "no-classpath");
});
//@ chunk-fepf8jp6.js:54689-54868 placement
function blankClasspathEnv(env) {
  let filtered = Object.keys(env).filter((key) => key.toUpperCase() === "CLASSPATH");
  let classpathKeys =
    getPlatform() === "windows" && filtered.length > 0
      ? filtered
      : normalizeCaseForComparison_2(["CLASSPATH", ...filtered]);
  return Object.fromEntries(classpathKeys.map((key) => [key, NO_CLASSPATH_SENTINEL]));
}
//@ chunk-fepf8jp6.js:54868-55276 placement
function SCRUBBED_LOADER_ENV(varName, value) {
  if (varName === "GIT_EXEC_PATH")
    return value.includes(delimiter) ? [value, ...value.split(delimiter)] : [value];
  if (
    varName === "DEVELOPER_DIR" ||
    varName === "GIT_TEXTDOMAINDIR" ||
    varName === "OPENSSL_CONF" ||
    varName === "OPENSSL_CONF_INCLUDE" ||
    varName === "OPENSSL_MODULES" ||
    varName === "OPENSSL_ENGINES"
  )
    return [value];
  if (getPlatform() === "windows") return value.split(delimiter);
  if (varName === "LD_PRELOAD") return value.split(/[\s:]+/).filter((part) => part !== "");
  if (varName === "LD_LIBRARY_PATH") return value.split(/[:;]/);
  return value.split(":");
}
//@ chunk-fepf8jp6.js:55276-55474 placement
var PATH_LIKE_GIT_ENV_VARS = [
  "GIT_EXEC_PATH",
  "DEVELOPER_DIR",
  "GIT_TEXTDOMAINDIR",
  "OPENSSL_CONF_INCLUDE",
  "OPENSSL_MODULES",
  "OPENSSL_ENGINES",
];
var INJECTION_ENV_VARS = ["LD_PRELOAD", "LD_AUDIT", "DYLD_INSERT_LIBRARIES", "NLSPATH", "OPENSSL_CONF"];
//@ chunk-fepf8jp6.js:55474-55562 placement
function hasShellVariableReference(varName, value) {
  return (
    (EXPANSION_SENSITIVE_LOADER_VARS.includes(varName) && value.includes("$")) ||
    (varName === "NLSPATH" && value.includes("%"))
  );
}
//@ chunk-fepf8jp6.js:55562-55613 placement
var EXPANSION_SENSITIVE_LOADER_VARS = ["LD_PRELOAD", "LD_LIBRARY_PATH", "LD_AUDIT"];
//@ chunk-fepf8jp6.js:55613-55967 placement
function scrubGitTrace2Env(env) {
  let readOrDefault = (varName, fallback) => {
    let envCaseInsensitive = getEnvCaseInsensitive(env, varName);
    return envCaseInsensitive !== undefined && envCaseInsensitive !== "" ? envCaseInsensitive : fallback;
  };
  return {
    GIT_TRACE2: readOrDefault("GIT_TRACE2", "0"),
    GIT_TRACE2_EVENT: readOrDefault("GIT_TRACE2_EVENT", "0"),
    GIT_TRACE2_PERF: readOrDefault("GIT_TRACE2_PERF", "0"),
    GIT_TRACE2_ENV_VARS: readOrDefault("GIT_TRACE2_ENV_VARS", EMPTY_CONFIG_VALUE),
    GIT_TRACE2_CONFIG_PARAMS: readOrDefault("GIT_TRACE2_CONFIG_PARAMS", EMPTY_CONFIG_VALUE),
    GIT_TRACE2_MAX_FILES: readOrDefault("GIT_TRACE2_MAX_FILES", "0"),
  };
}
//@ chunk-fepf8jp6.js:55967-55978 placement
var EMPTY_CONFIG_VALUE = "-";
//@ chunk-fepf8jp6.js:55978-56135 placement
/**
 * 取 GIT_CONFIG_GLOBAL/SYSTEM。
 */
function gitConfigLocationEnv(env) {
  let envCaseInsensitive = getEnvCaseInsensitive(env, "GIT_CONFIG_GLOBAL");
  let envCaseInsensitive_2 = getEnvCaseInsensitive(env, "GIT_CONFIG_SYSTEM");
  return {
    ...(envCaseInsensitive !== undefined && {
      GIT_CONFIG_GLOBAL: envCaseInsensitive,
    }),
    ...(envCaseInsensitive_2 !== undefined && {
      GIT_CONFIG_SYSTEM: envCaseInsensitive_2,
    }),
  };
}
//@ chunk-fepf8jp6.js:56135-56458 placement
function resolveTempDir() {
  let preSettingsEnv = getPreSettingsEnv();
  let envCaseInsensitive = getEnvCaseInsensitive(preSettingsEnv, "CLAUDE_CODE_TMPDIR");
  if (envCaseInsensitive !== undefined && envCaseInsensitive !== "") return envCaseInsensitive;
  let platform = getPlatform();
  if (platform === "windows") {
    let tempDir =
      getEnvCaseInsensitive(preSettingsEnv, "TEMP") ?? getEnvCaseInsensitive(preSettingsEnv, "TMP");
    return tempDir !== undefined && tempDir !== "" ? tempDir : tmpdir();
  }
  let tmpDirValue =
    platform === "macos"
      ? undefined
      : (getEnvCaseInsensitive(preSettingsEnv, "TMPDIR") ??
        getEnvCaseInsensitive(preSettingsEnv, "TMP") ??
        getEnvCaseInsensitive(preSettingsEnv, "TEMP"));
  return tmpDirValue !== undefined && tmpDirValue !== ""
    ? tmpDirValue.length > 1 && tmpDirValue.endsWith("/")
      ? tmpDirValue.slice(0, -1)
      : tmpDirValue
    : "/tmp";
}
//@ chunk-fepf8jp6.js:56458-56674 placement
/**
 * 设置生效前锁存的环境（合并后续覆盖）。
 */
function getPreSettingsEnv() {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  if (latchedPreSettingsEnvSnapshot === undefined) return process.env;
  let settingsAppliedEnv = getSettingsAppliedEnv();
  if (getPlatform() !== "windows")
    return {
      ...latchedPreSettingsEnvSnapshot,
      ...settingsAppliedEnv,
    };
  let settingsKeys = new Set(Object.keys(settingsAppliedEnv).map((key) => key.toUpperCase()));
  return {
    ...pickByHelper(latchedPreSettingsEnvSnapshot, (value, key) => !settingsKeys.has(key.toUpperCase())),
    ...settingsAppliedEnv,
  };
}
//@ chunk-fepf8jp6.js:56674-56733 placement
/**
 * 取绑定会话（bound session）的可达根。
 */
function boundSessionReachRoots(layout) {
  let reach = reachForBoundSession(layout);
  return reach === undefined ? undefined : reachRootsOrUnreadable(reach);
}
//@ chunk-fepf8jp6.js:56733-56941 placement
/**
 * 被设置改动的 git 配置位置变量。
 */
function findOverriddenGitConfigVar(layout, screenMemo) {
  let reach = boundSessionReachRoots(layout);
  if (reach === undefined) return;
  let gitEnv = buildGitEnv(undefined);
  let gitEnvForReach = buildGitEnvForReach(reach === IN_TREE_SETTINGS_UNREADABLE ? [] : reach, screenMemo);
  return GIT_CONFIG_ENV_VARS.find(
    (varName) =>
      getEnvCaseInsensitive(gitEnv, varName) !== undefined &&
      getEnvCaseInsensitive(gitEnvForReach, varName) !== getEnvCaseInsensitive(gitEnv, varName) &&
      !(
        varName === "GIT_CONFIG_SYSTEM" &&
        parseGitBoolEnv(getEnvCaseInsensitive(gitEnv, "GIT_CONFIG_NOSYSTEM"))
      ),
  );
}
//@ chunk-fepf8jp6.js:56941-57049 placement
/**
 * 绑定会话的工作树可达范围。
 */
function reachForBoundSession(layout) {
  return layout.bound === true
    ? {
        ...reachForWorkTree(layout.workTree, layout),
        ...(layout.startsInProject && {
          startsInProject: true,
        }),
      }
    : undefined;
}
//@ chunk-fepf8jp6.js:57049-57085 placement
/**
 * 取某工作树的可达根。
 */
function workTreeReachRoots(workTree, layout) {
  return reachRootsOrUnreadable(reachForWorkTree(workTree, layout));
}
//@ chunk-fepf8jp6.js:82210-82283 placement
/**
 * 匹配 include/includeIf 的 path 配置键的正则。
 */
var INCLUDE_PATH_CONFIG_KEY_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp;
deferInit("chunk-fepf8jp6.js:82210", () => {
  INCLUDE_PATH_CONFIG_KEY_RE = String.raw`^(include|includeif\..*)\.path$`;
  regExp = new RegExp(INCLUDE_PATH_CONFIG_KEY_RE, "s");
});
//@ chunk-fepf8jp6.js:82283-83091 placement
/**
 * 隔离 git 用的常量组：条件 include 正则、C 语言环境、禁用诊断用测试变量、只读运行的环境与 -c 参数。
 */
var GIT_ISOLATION_CONFIG_ARGS; // deferred: uses getPlatform (../../platform.js) of its import cycle while loading; runs once the cycle is complete
var C_LOCALE_ENV;
var GIT_TEST_DISABLE_ENV;
var GIT_READ_ENV;
var GIT_REF_PARANOIA_ENV;
var GIT_LIST_ENV;
var REPLACE_REFS_CONFIG;
var GIT_READ_CONFIG_OVERRIDES;
var configPairsToArgs;
var GIT_READ_CONFIG_ARGS;
var GIT_REPLACE_REFS_CONFIG_ARGS;
var SAFECRLF_ARGS;
var GIT_READ_ARGS;
var MAX_GIT_BUFFER_BYTES;
deferInit("chunk-fepf8jp6.js:82283", () => {
  GIT_ISOLATION_CONFIG_ARGS = /^includeif\.(?:gitdir(?:\/i)?|hasconfig):/s;
  C_LOCALE_ENV = {
    LC_ALL: "C",
    LANGUAGE: "C",
  };
  GIT_TEST_DISABLE_ENV = {
    GIT_TEST_COMMIT_GRAPH: "0",
    GIT_TEST_MULTI_PACK_INDEX: "0",
  };
  GIT_READ_ENV = {
    ...GIT_TEST_DISABLE_ENV,
    GIT_ALLOW_PROTOCOL: GIT_ALLOW_PROTOCOL_VALUE,
    GIT_TERMINAL_PROMPT: "0",
    ...C_LOCALE_ENV,
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_GRAFT_FILE: getPlatform() === "windows" ? "\\\\.\\NUL\\no-grafts" : "/dev/null/no-grafts",
  };
  GIT_REF_PARANOIA_ENV = {
    GIT_REF_PARANOIA: "1",
  };
  GIT_LIST_ENV = {
    ...GIT_TEST_DISABLE_ENV,
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_GRAFT_FILE: getPlatform() === "windows" ? "\\\\.\\NUL\\no-grafts" : "/dev/null/no-grafts",
  };
  REPLACE_REFS_CONFIG = ["core.useReplaceRefs", "false"];
  GIT_READ_CONFIG_OVERRIDES = [
    ["core.commitGraph", "false"],
    ["core.multiPackIndex", "false"],
    ["pack.useBitmaps", "false"],
    ["pack.readReverseIndex", "false"],
    REPLACE_REFS_CONFIG,
  ];
  configPairsToArgs = (pairs) => pairs.flatMap(([key, value]) => ["-c", `${key}=${value}`]);
  GIT_READ_CONFIG_ARGS = configPairsToArgs(GIT_READ_CONFIG_OVERRIDES);
  GIT_REPLACE_REFS_CONFIG_ARGS = configPairsToArgs([REPLACE_REFS_CONFIG]);
  SAFECRLF_ARGS = ["-c", "core.safecrlf=false"];
  GIT_READ_ARGS = ["-c", "submodule.recurse=false", ...SAFECRLF_ARGS, ...GIT_READ_CONFIG_ARGS];
  MAX_GIT_BUFFER_BYTES = 67108864;
});
//@ chunk-7jxyna5q.js:212879-212948 placement
var ALLOWED_CCR_GIT_REMOTES = [];
var REPO_SLUG_RE = /^[a-z0-9.-]+(?::[0-9]+)?\/[a-z0-9._-]+\/[a-z0-9._-]+$/;
//@ chunk-7jxyna5q.js:212948-213474 placement
/**
 * 远端 URL 是否为允许的仓库（含 CCR git 代理）。
 */
function isAllowedGitRemote(remoteUrl) {
  if (!/^https?:\/\//.test(remoteUrl) && !/^ssh:\/\//.test(remoteUrl) && !/^git@/.test(remoteUrl))
    return false;
  if (/[?#\\]/.test(firstLineOf(remoteUrl.replace(/^(?:https?|ssh):\/\//, ""), "/"))) return false;
  if (describeUrlScheme(remoteUrl) || isSuspiciousUrl(remoteUrl)) return false;
  let text = remoteUrl
    .replace(/^https?:\/\//, "")
    .replace(/^ssh:\/\//, "")
    .replace(/^[^@/]+@/, "")
    .replace(/\/$/, "");
  if (isCcrGitProxySession() && isLocalHost(firstLineOf(text, "/"))) {
    let normalized = normalizeGitRemoteUrl(remoteUrl);
    if (normalized && !text.includes("@") && REPO_SLUG_RE.test(normalized))
      return ALLOWED_CCR_GIT_REMOTES.includes(normalized);
  }
  if (hasEncodedPathChars(text)) return false;
  return ALLOWED_CCR_GIT_REMOTES.some((prefix) => {
    if (!text.startsWith(prefix)) return false;
    let sliced = text.slice(prefix.length);
    return sliced === "" || sliced === ".git" || sliced.startsWith("/");
  });
}
//@ chunk-7jxyna5q.js:213474-213519 placement
/**
 * 当前工作目录的 git 根（取不到时返回初始 cwd）。
 */
function cwdOrGitRoot() {
  let cwd = getCwd();
  return findGitRoot(cwd) ?? getOriginalCwd();
}
//@ chunk-7jxyna5q.js:213519-213529 placement
var FORCE_NOT_IN_GIT_REPO = false;
//@ chunk-7jxyna5q.js:213529-213568 placement
/**
 * 判断给定目录不在 git 仓库内。
 */
function isNotInGitRepo(startPath) {
  return FORCE_NOT_IN_GIT_REPO || findGitRoot(startPath) === null;
}
//@ chunk-7jxyna5q.js:213568-213606 placement
/**
 * 取路径的规范 git 根，取不到时回退为网络挂载归一或原值。
 */
function canonicalRootOrSelf(path) {
  return noUncachedRoot(path) ?? findCanonicalGitRoot(path) ?? path;
}
export {
  cwdOrGitRoot,
  BUILD_TOOL_ENV_VARS,
  isAllowedGitRemote,
  isDangerousEnvName,
  isBuildToolEnvVar,
  IN_TREE_SETTINGS_UNREADABLE,
  runGitWithEnv,
  GIT_REPLACE_REFS_CONFIG_ARGS,
  GIT_READ_CONFIG_ARGS,
  DANGEROUS_ENV_NAME_LIST,
  canonicalRootOrSelf,
  isNotInGitRepo,
  buildGitEnv,
  GIT_LIST_ENV,
  reachRootsOrUnreadable,
  DIRECTORY_ENV_NAMES,
  boundSessionReachRoots,
  IN_TREE_SETTINGS_UNREADABLE_MESSAGE,
  buildGitEnvForReach,
  EMPTY_VALUE,
  GIT_READ_ARGS,
  MAX_GIT_BUFFER_BYTES,
  gitConfigLocationEnv,
  scrubGitTrace2Env,
  GIT_READ_ENV,
  GIT_REF_PARANOIA_ENV,
  opensslConfIncludeEnv,
  applyOpenSslConfInclude,
  getPreSettingsEnv,
  reachForBoundSession,
  INCLUDE_PATH_CONFIG_KEY_RE,
  isCannotChangeToError,
  regExp,
  GIT_ISOLATION_CONFIG_ARGS,
  C_LOCALE_ENV,
  workTreeReachRoots,
  buildGitInvocation,
  resolveTempDir,
  SAFECRLF_ARGS,
  findOverriddenGitConfigVar,
};
