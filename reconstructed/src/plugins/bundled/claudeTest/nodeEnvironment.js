/**
 * plugins/bundled/claudeTest/nodeEnvironment.ts
 *
 * 2.1.316 新增：Claude Test 启动被测应用前检查 node 与 NODE_OPTIONS/LD_PRELOAD 等可被项目劫持的环境
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (23)
 * attribution: placement 23
 */
import { fileURLToPath } from "url";
import { isAbsolute, sep, dirname, join, delimiter } from "path";
import { lstat, realpath, readlink } from "fs/promises";
import { effectiveEnvSnapshot } from "../../../utils/settings/envSources.js";
import { subprocessEnv, agentProxyEnv, proxyEnvForSubprocess } from "../../../utils/subprocessEnv.js";
import { TEAMMATE_ENV_VARS } from "../../../utils/swarm/spawnUtils.js";
import { isEnvOverridden, portPortedFiles } from "./constants.js";
import { identity as identity_2 } from "../../../utils/identity.js";
import { getOriginalCwd, getCwdState, getProjectRootOrNull } from "../../../bootstrap/state.js";
import { getFsImplementation } from "../../../utils/fsOperations.js";
import { uniq } from "../../../utils/collections.js";
import { resolveOptions, realpathAllowMissing } from "../../../utils/hooks/hookCommandResolution.js";
import { normalizeCommandForPlatform, findCanonicalGitRoot } from "../../../utils/git.js";
import { anyPairMatches } from "../../../utils/settings/stickyRoots.js";
import { isBuildToolEnvVar, isDangerousEnvName } from "../../../utils/git/builderGit/gitEnv.js";
import { whichOnPath, sanitizePathEnv } from "../../../utils/which.js";
import { logForDebugging } from "../../../utils/debug.js";
import { execFileNoThrow } from "../../../utils/execFileNoThrow.js";
import { pickByHelper } from "../../../utils/git/gitSafeEnv.js";
import { getEnvCaseInsensitive } from "../../../utils/plugins/securityDefaultPlugin.js";
import { testPluginTexts, testPluginContentId } from "../../../services/pluginTest/claudeTestPlugin.js";

//@ chunk-ae5g0zb5.js:30268-30348 placement
/**
 * 返回需要透传的非空且被改动过的环境变量名。
 */
function getTeammateEnvVarsToForward() {
  let e = effectiveEnvSnapshot();
  let n = subprocessEnv();
  return TEAMMATE_ENV_VARS.filter((r) => n[r] !== "" && isEnvOverridden(r, n[r], e));
}
//@ chunk-ae5g0zb5.js:30583-30862 placement
/**
 * 启动被测应用前要拒绝的 node 选项（--import/--loader/--env-file 等），以及其中接受文件参数的子集。
 */
var UNSAFE_NODE_OPTION_FLAGS = new Set([
  "--import",
  "--loader",
  "--experimental-loader",
  "--env-file",
  "--env-file-if-exists",
  "--experimental-config-file",
  "--experimental-package-map",
  "--experimental-policy",
  "--openssl-config",
  "--snapshot-blob",
]);
var UNSAFE_FILE_OPTION_FLAGS = new Set(["--import", "--loader", "--experimental-loader"]);
//@ chunk-ae5g0zb5.js:30862-30934 placement
/**
 * 是否为规范化的绝对路径
 */
function isAbsoluteFilePath(file) {
  try {
    return fileURLToPath(new URL(file, "file:///")) === file;
  } catch {
    return false;
  }
}
//@ chunk-ae5g0zb5.js:30934-31006 placement
/**
 * 允许带文件的选项
 */
var SAFE_NODE_FILE_OPTIONS = new Set(["-r", "--require", "--experimental-default-config-file"]);
//@ chunk-ae5g0zb5.js:31006-31224 placement
/**
 * 把 NODE_OPTIONS 拆成 {option, file} 列表（--x_y 规范为 --x-y）。
 */
function parseNodeOptions(e) {
  let filtered = e.split(" ").filter((r) => r !== "");
  return filtered.map((r, o) => {
    let [s = "", ...a] = r.split("=");
    return {
      option: s.startsWith("--") ? `--${s.slice(2).replaceAll("_", "-")}` : s,
      file: a.length > 0 ? a.join("=") : (filtered[o + 1] ?? ""),
    };
  });
}
//@ chunk-ae5g0zb5.js:31224-31379 placement
/**
 * NODE_OPTIONS 是否安全：无引号、无禁用项，需要文件的选项只能指向安全的绝对路径。
 */
function isSafeNodeOptions(e) {
  return (
    !e.includes('"') &&
    parseNodeOptions(e).every(
      ({ option, file }) =>
        !SAFE_NODE_FILE_OPTIONS.has(option) &&
        (!UNSAFE_NODE_OPTION_FLAGS.has(option) ||
          (isAbsolute(file) &&
            !file.split(sep).includes("..") &&
            (!UNSAFE_FILE_OPTION_FLAGS.has(option) || isAbsoluteFilePath(file)))),
    )
  );
}
//@ chunk-ae5g0zb5.js:31379-31454 placement
/**
 * 从 NODE_OPTIONS 里挑出属于“可注入代码”选项的文件参数。
 */
function filesFromUnsafeNodeOptions(e) {
  return parseNodeOptions(e).flatMap(({ option, file }) =>
    UNSAFE_NODE_OPTION_FLAGS.has(option) ? [file] : [],
  );
}
//@ chunk-ae5g0zb5.js:31454-31520 placement
/**
 * LD_PRELOAD 等
 */
var PRELOAD_ENV_VARS = new Set(["LD_PRELOAD", "LD_AUDIT", "DYLD_INSERT_LIBRARIES"]);
//@ chunk-ae5g0zb5.js:31520-31638 placement
/**
 * 从目录向上找所有含 .git 的祖先目录。
 */
async function findGitDirsUpward(e) {
  let n = dirname(e);
  return [
    ...((await lstat(join(e, ".git")).then(
      () => true,
      () => false,
    ))
      ? [e]
      : []),
    ...(n === e ? [] : await findGitDirsUpward(n)),
  ];
}
//@ chunk-ae5g0zb5.js:31638-31685 placement
/**
 * 取真实路径，失败原样返回
 */
async function realpathOrSelf(e) {
  return realpath(e).catch(() => e);
}
//@ chunk-ae5g0zb5.js:31685-31719 placement
/**
 * 收集原始 cwd、当前 cwd 与文件系统 cwd，作为“项目内”判定的根。
 */
var projectRoots = identity_2(new Set(), (e) => e.clear());
//@ chunk-ae5g0zb5.js:31719-32066 placement
/**
 * 收集项目相关根目录（原始/当前 cwd、项目根、git 根）及其真实路径。
 */
async function listProjectRoots() {
  for (let a of [getOriginalCwd(), getCwdState(), getFsImplementation().cwd()]) projectRoots.add(a);
  let projectRootOrNull = getProjectRootOrNull();
  let n = uniq([...(projectRootOrNull === null ? [] : [projectRootOrNull]), ...projectRoots]);
  let options = resolveOptions(effectiveEnvSnapshot());
  let o = isAbsolute(options) ? normalizeCommandForPlatform(await realpathOrSelf(options)) : undefined;
  let results = await Promise.all(
    uniq([
      ...n,
      ...(await Promise.all(n.map(findGitDirsUpward))).flat(),
      ...n.flatMap((a) => findCanonicalGitRoot(a) ?? []),
    ]).map(async (a) => [a, await realpathOrSelf(a)].map(normalizeCommandForPlatform)),
  );
  return uniq(results.filter((a) => o === undefined || !anyPairMatches([o], a)).flat());
}
//@ chunk-ae5g0zb5.js:32066-32421 placement
/**
 * 路径（跟随符号链接，最多 8 层）是否落在项目目录内。
 */
async function isInsideProject(e, n, r = 0) {
  let replaced = e.replace(/\/{2,}/g, "/");
  let s = replaced.length > 1 && replaced.endsWith("/") ? replaced.slice(0, -1) : replaced;
  let a = await realpathAllowMissing(s);
  if (
    a === "unreadable" ||
    anyPairMatches([s, ...(a === "absent" ? [] : [a])].map(normalizeCommandForPlatform), n)
  )
    return true;
  let i = await readlink(s).catch(() => {
    return;
  });
  let c = i === undefined || isAbsolute(i) ? i : `${dirname(s)}${sep}${i}`;
  if (c !== undefined && (r > 8 || (await isInsideProject(c, n, r + 1)))) return true;
  let _ = dirname(s);
  return _ !== s && isInsideProject(_, n, r);
}
//@ chunk-ae5g0zb5.js:32421-32495 placement
/**
 * 绝对路径且不含 .. 与 shell 符号
 */
function isCleanAbsolutePath(e) {
  return isAbsolute(e) && !e.split(sep).includes("..") && !/[;$]/.test(e);
}
//@ chunk-ae5g0zb5.js:32495-32540 placement
/**
 * 判断路径是否不属于干净绝对路径，或位于项目目录之外。
 */
async function isOutsideProject(e, n) {
  return !isCleanAbsolutePath(e) || isInsideProject(e, n);
}
//@ chunk-ae5g0zb5.js:32540-32683 placement
/**
 * 过滤 PATH 类变量：只保留不在项目内的条目。
 */
async function filterSafePathEntries(e, n, r) {
  return (
    await Promise.all(
      e.map(async (s) =>
        (r && s !== "" && !/[/;$]/.test(s)) || (isCleanAbsolutePath(s) && !(await isInsideProject(s, n)))
          ? [s]
          : [],
      ),
    )
  )
    .flat()
    .join(delimiter);
}
//@ chunk-ae5g0zb5.js:32683-33079 placement
async function findUnsafeInheritedEnv(appEnvironment, n) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(appEnvironment).map(async ([key, value]) => {
        if (isBuildToolEnvVar(key))
          return [key, await filterSafePathEntries(value.split(delimiter), n, false)];
        if (key === "NODE_OPTIONS") {
          let results = await Promise.all(
            filesFromUnsafeNodeOptions(value).map((a) => isOutsideProject(a, n)),
          );
          return [key, results.includes(true) ? "" : value];
        }
        if (key === "CHROME_DEVEL_SANDBOX") return [key, await filterSafePathEntries([value], n, false)];
        return PRELOAD_ENV_VARS.has(key)
          ? [key, await filterSafePathEntries(value.split(key === "LD_PRELOAD" ? /[ :]+/ : ":"), n, true)]
          : [key, value];
      }),
    ),
  );
}
//@ chunk-ae5g0zb5.js:33079-33091 placement
/**
 * 5000
 */
var RESOLVE_NODE_TIMEOUT_MS = 5000;
//@ chunk-ae5g0zb5.js:33091-33845 placement
/**
 * 找到 PATH 上第一个 node，拒绝位于项目或其检出目录内的 node。
 */
async function resolveTrustedNode(unsafeInheritedEnv, n, r = RESOLVE_NODE_TIMEOUT_MS) {
  let o = whichOnPath("node", unsafeInheritedEnv.PATH ?? "");
  if (o === null || (await isOutsideProject(o, n))) {
    logForDebugging(
      "Claude Test: the first node on your own PATH is missing, or leads into this project or one of its checkouts (PATH from the shell that started Claude Code, or your user settings; a project's settings are not used)",
      {
        level: "error",
      },
    );
    return;
  }
  let { code, stdout, timedOut } = await execFileNoThrow(o, ["-p", "process.execPath"], {
    cwd: "/",
    env: {
      ...subprocessEnv(),
      ...unsafeInheritedEnv,
    },
    extendEnv: false,
    stdin: "ignore",
    timeout: r,
    maxBuffer: 65536,
  });
  let sliced = stdout.slice(
    stdout.lastIndexOf(`
`) + 1,
  );
  if (code === 0 && !(await isOutsideProject(sliced, n))) return sliced;
  logForDebugging(
    `Claude Test: ${o} -p process.execPath gave no usable path (${timedOut ? `no answer within ${r} ms` : code === 0 ? "exit 0, but its last line was no plain full path outside this project" : `exit ${code}`})`,
    {
      level: "error",
    },
  );
  return;
}
//@ chunk-ae5g0zb5.js:33879-34350 placement
var SCRUBBED_APP_ENV_VARS = [
  "PATH",
  "NODE_OPTIONS",
  "NODE_PATH",
  "LD_PRELOAD",
  "LD_AUDIT",
  "LD_LIBRARY_PATH",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "DYLD_FRAMEWORK_PATH",
  "OPENSSL_CONF",
  "OPENSSL_CONF_INCLUDE",
  "OPENSSL_MODULES",
  "OPENSSL_ENGINES",
  "GCONV_PATH",
  "NLSPATH",
  "BASH_ENV",
  "ENV",
  "SHELLOPTS",
  "BASHOPTS",
  "PS4",
  "NODE_COMPILE_CACHE",
  "NODE_V8_COVERAGE",
  "NODE_REDIRECT_WARNINGS",
  "NODE_REPL_EXTERNAL_MODULE",
  "CHROME_DEVEL_SANDBOX",
  "DBUS_SESSION_BUS_ADDRESS",
  "XDG_CONFIG_DIRS",
  "XDG_DATA_DIRS",
];
//@ chunk-ae5g0zb5.js:34350-34703 placement
/**
 * 生成被测应用的环境变量：清掉 CLAUDE* 与代理差异项，处理 PATH/NODE_OPTIONS 等可劫持变量。
 */
function buildAppEnvironment() {
  let e = effectiveEnvSnapshot();
  let n = {
    ...e,
    ...pickByHelper(agentProxyEnv(), (o, s) => !isDangerousEnvName(s) && !isEnvOverridden(s, o, e)),
  };
  let r = {
    ...n,
    ...proxyEnvForSubprocess(n),
  };
  return Object.fromEntries([
    ...Object.entries(subprocessEnv()).flatMap(([key, value]) => {
      if (isBuildToolEnvVar(key)) return [sanitizeEnvEntry(key, getEnvCaseInsensitive(e, key))];
      return key.startsWith("CLAUDE") || value === getEnvCaseInsensitive(r, key)
        ? []
        : [sanitizeEnvEntry(key)];
    }),
    ...SCRUBBED_APP_ENV_VARS.map((o) => sanitizeEnvEntry(o, getEnvCaseInsensitive(e, o))),
    ...TEAMMATE_ENV_VARS.map((o) =>
      sanitizeEnvEntry(o, getEnvCaseInsensitive(r, o) ?? r[o.toUpperCase()] ?? r[o.toLowerCase()]),
    ),
  ]);
}
//@ chunk-ae5g0zb5.js:34703-34876 placement
/**
 * 清理单个环境变量：不安全的 NODE_OPTIONS 置空，PATH 类去掉含分号和 ${ 的条目。
 */
function sanitizeEnvEntry(e, envCaseInsensitive = "") {
  if (e === "NODE_OPTIONS" && !isSafeNodeOptions(envCaseInsensitive)) return [e, ""];
  return [
    e,
    (isBuildToolEnvVar(e)
      ? sanitizePathEnv(envCaseInsensitive)
          .split(delimiter)
          .filter((r) => !r.includes(";"))
      : [envCaseInsensitive]
    )
      .filter((r) => !r.includes("${"))
      .join(delimiter),
  ];
}
//@ chunk-ae5g0zb5.js:34956-35065 placement
/**
 * 动态加载 Claude Test 安装文件模块并缓存名称。
 */
async function loadInstalledFiles() {
  let e = await import("./chunk-thddg15d.js");
  testPluginTexts.name ??= testPluginContentId(portPortedFiles(e.INSTALLED_FILES));
  return e;
}
export {
  SCRUBBED_APP_ENV_VARS,
  getTeammateEnvVarsToForward,
  isOutsideProject,
  loadInstalledFiles,
  filesFromUnsafeNodeOptions,
  isSafeNodeOptions,
  resolveTrustedNode,
  findUnsafeInheritedEnv,
  buildAppEnvironment,
  listProjectRoots,
};
