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
import { isEnvOverridden, testPluginTexts, testPluginContentId, portPortedFiles } from "./constants.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-ae5g0zb5.js:30268-30348 placement
/**
 * 返回需要透传的非空且被改动过的环境变量名。
 */
function getTeammateEnvVarsToForward() {
  let snapshot = effectiveEnvSnapshot();
  let env = subprocessEnv();
  return TEAMMATE_ENV_VARS.filter((name) => env[name] !== "" && isEnvOverridden(name, env[name], snapshot));
}
//@ chunk-ae5g0zb5.js:30583-30862 placement
/**
 * 启动被测应用前要拒绝的 node 选项（--import/--loader/--env-file 等），以及其中接受文件参数的子集。
 */
var UNSAFE_NODE_OPTION_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var UNSAFE_FILE_OPTION_FLAGS;
deferInit("chunk-ae5g0zb5.js:30583", () => {
  UNSAFE_NODE_OPTION_FLAGS = new Set([
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
  UNSAFE_FILE_OPTION_FLAGS = new Set(["--import", "--loader", "--experimental-loader"]);
});
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
var SAFE_NODE_FILE_OPTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ae5g0zb5.js:30934", () => {
  SAFE_NODE_FILE_OPTIONS = new Set(["-r", "--require", "--experimental-default-config-file"]);
});
//@ chunk-ae5g0zb5.js:31006-31224 placement
/**
 * 把 NODE_OPTIONS 拆成 {option, file} 列表（--x_y 规范为 --x-y）。
 */
function parseNodeOptions(optionsText) {
  let filtered = optionsText.split(" ").filter((part) => part !== "");
  return filtered.map((part, index) => {
    let [name = "", ...valueParts] = part.split("=");
    return {
      option: name.startsWith("--") ? `--${name.slice(2).replaceAll("_", "-")}` : name,
      file: valueParts.length > 0 ? valueParts.join("=") : (filtered[index + 1] ?? ""),
    };
  });
}
//@ chunk-ae5g0zb5.js:31224-31379 placement
/**
 * NODE_OPTIONS 是否安全：无引号、无禁用项，需要文件的选项只能指向安全的绝对路径。
 */
function isSafeNodeOptions(optionsText) {
  return (
    !optionsText.includes('"') &&
    parseNodeOptions(optionsText).every(
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
function filesFromUnsafeNodeOptions(optionsText) {
  return parseNodeOptions(optionsText).flatMap(({ option, file }) =>
    UNSAFE_NODE_OPTION_FLAGS.has(option) ? [file] : [],
  );
}
//@ chunk-ae5g0zb5.js:31454-31520 placement
/**
 * LD_PRELOAD 等
 */
var PRELOAD_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ae5g0zb5.js:31454", () => {
  PRELOAD_ENV_VARS = new Set(["LD_PRELOAD", "LD_AUDIT", "DYLD_INSERT_LIBRARIES"]);
});
//@ chunk-ae5g0zb5.js:31520-31638 placement
/**
 * 从目录向上找所有含 .git 的祖先目录。
 */
async function findGitDirsUpward(dir) {
  let parentDir = dirname(dir);
  return [
    ...((await lstat(join(dir, ".git")).then(
      () => true,
      () => false,
    ))
      ? [dir]
      : []),
    ...(parentDir === dir ? [] : await findGitDirsUpward(parentDir)),
  ];
}
//@ chunk-ae5g0zb5.js:31638-31685 placement
/**
 * 取真实路径，失败原样返回
 */
async function realpathOrSelf(path) {
  return realpath(path).catch(() => path);
}
//@ chunk-ae5g0zb5.js:31685-31719 placement
/**
 * 收集原始 cwd、当前 cwd 与文件系统 cwd，作为“项目内”判定的根。
 */
var projectRoots; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ae5g0zb5.js:31685", () => {
  projectRoots = identity_2(new Set(), (roots) => roots.clear());
});
//@ chunk-ae5g0zb5.js:31719-32066 placement
/**
 * 收集项目相关根目录（原始/当前 cwd、项目根、git 根）及其真实路径。
 */
async function listProjectRoots() {
  for (let cwd of [getOriginalCwd(), getCwdState(), getFsImplementation().cwd()]) projectRoots.add(cwd);
  let projectRootOrNull = getProjectRootOrNull();
  let roots = uniq([...(projectRootOrNull === null ? [] : [projectRootOrNull]), ...projectRoots]);
  let path = resolveOptions(effectiveEnvSnapshot());
  let commandPath = isAbsolute(path) ? normalizeCommandForPlatform(await realpathOrSelf(path)) : undefined;
  let results = await Promise.all(
    uniq([
      ...roots,
      ...(await Promise.all(roots.map(findGitDirsUpward))).flat(),
      ...roots.flatMap((root) => findCanonicalGitRoot(root) ?? []),
    ]).map(async (root) => [root, await realpathOrSelf(root)].map(normalizeCommandForPlatform)),
  );
  return uniq(
    results.filter((pair) => commandPath === undefined || !anyPairMatches([commandPath], pair)).flat(),
  );
}
//@ chunk-ae5g0zb5.js:32066-32421 placement
/**
 * 路径（跟随符号链接，最多 8 层）是否落在项目目录内。
 */
async function isInsideProject(filePath, roots, depth = 0) {
  let replaced = filePath.replace(/\/{2,}/g, "/");
  let normalizedPath = replaced.length > 1 && replaced.endsWith("/") ? replaced.slice(0, -1) : replaced;
  let realPath = await realpathAllowMissing(normalizedPath);
  if (
    realPath === "unreadable" ||
    anyPairMatches(
      [normalizedPath, ...(realPath === "absent" ? [] : [realPath])].map(normalizeCommandForPlatform),
      roots,
    )
  )
    return true;
  let linkTarget = await readlink(normalizedPath).catch(() => {
    return;
  });
  let linkPath =
    linkTarget === undefined || isAbsolute(linkTarget)
      ? linkTarget
      : `${dirname(normalizedPath)}${sep}${linkTarget}`;
  if (linkPath !== undefined && (depth > 8 || (await isInsideProject(linkPath, roots, depth + 1))))
    return true;
  let parentDir = dirname(normalizedPath);
  return parentDir !== normalizedPath && isInsideProject(parentDir, roots, depth);
}
//@ chunk-ae5g0zb5.js:32421-32495 placement
/**
 * 绝对路径且不含 .. 与 shell 符号
 */
function isCleanAbsolutePath(path) {
  return isAbsolute(path) && !path.split(sep).includes("..") && !/[;$]/.test(path);
}
//@ chunk-ae5g0zb5.js:32495-32540 placement
/**
 * 判断路径是否不属于干净绝对路径，或位于项目目录之外。
 */
async function isOutsideProject(path, roots) {
  return !isCleanAbsolutePath(path) || isInsideProject(path, roots);
}
//@ chunk-ae5g0zb5.js:32540-32683 placement
/**
 * 过滤 PATH 类变量：只保留不在项目内的条目。
 */
async function filterSafePathEntries(entries, roots, allowRelative) {
  return (
    await Promise.all(
      entries.map(async (entry) =>
        (allowRelative && entry !== "" && !/[/;$]/.test(entry)) ||
        (isCleanAbsolutePath(entry) && !(await isInsideProject(entry, roots)))
          ? [entry]
          : [],
      ),
    )
  )
    .flat()
    .join(delimiter);
}
//@ chunk-ae5g0zb5.js:32683-33079 placement
async function findUnsafeInheritedEnv(appEnvironment, roots) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(appEnvironment).map(async ([key, value]) => {
        if (isBuildToolEnvVar(key))
          return [key, await filterSafePathEntries(value.split(delimiter), roots, false)];
        if (key === "NODE_OPTIONS") {
          let results = await Promise.all(
            filesFromUnsafeNodeOptions(value).map((file) => isOutsideProject(file, roots)),
          );
          return [key, results.includes(true) ? "" : value];
        }
        if (key === "CHROME_DEVEL_SANDBOX") return [key, await filterSafePathEntries([value], roots, false)];
        return PRELOAD_ENV_VARS.has(key)
          ? [key, await filterSafePathEntries(value.split(key === "LD_PRELOAD" ? /[ :]+/ : ":"), roots, true)]
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
async function resolveTrustedNode(unsafeInheritedEnv, roots, timeoutMs = RESOLVE_NODE_TIMEOUT_MS) {
  let nodePath = whichOnPath("node", unsafeInheritedEnv.PATH ?? "");
  if (nodePath === null || (await isOutsideProject(nodePath, roots))) {
    logForDebugging(
      "Claude Test: the first node on your own PATH is missing, or leads into this project or one of its checkouts (PATH from the shell that started Claude Code, or your user settings; a project's settings are not used)",
      {
        level: "error",
      },
    );
    return;
  }
  let { code, stdout, timedOut } = await execFileNoThrow(nodePath, ["-p", "process.execPath"], {
    cwd: "/",
    env: {
      ...subprocessEnv(),
      ...unsafeInheritedEnv,
    },
    extendEnv: false,
    stdin: "ignore",
    timeout: timeoutMs,
    maxBuffer: 65536,
  });
  let path = stdout.slice(
    stdout.lastIndexOf(`
`) + 1,
  );
  if (code === 0 && !(await isOutsideProject(path, roots))) return path;
  logForDebugging(
    `Claude Test: ${nodePath} -p process.execPath gave no usable path (${timedOut ? `no answer within ${timeoutMs} ms` : code === 0 ? "exit 0, but its last line was no plain full path outside this project" : `exit ${code}`})`,
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
  let effectiveEnv = effectiveEnvSnapshot();
  let proxyEnv = {
    ...effectiveEnv,
    ...pickByHelper(
      agentProxyEnv(),
      (value, name) => !isDangerousEnvName(name) && !isEnvOverridden(name, value, effectiveEnv),
    ),
  };
  let withProxyEnv = {
    ...proxyEnv,
    ...proxyEnvForSubprocess(proxyEnv),
  };
  return Object.fromEntries([
    ...Object.entries(subprocessEnv()).flatMap(([key, value]) => {
      if (isBuildToolEnvVar(key)) return [sanitizeEnvEntry(key, getEnvCaseInsensitive(effectiveEnv, key))];
      return key.startsWith("CLAUDE") || value === getEnvCaseInsensitive(withProxyEnv, key)
        ? []
        : [sanitizeEnvEntry(key)];
    }),
    ...SCRUBBED_APP_ENV_VARS.map((name) => sanitizeEnvEntry(name, getEnvCaseInsensitive(effectiveEnv, name))),
    ...TEAMMATE_ENV_VARS.map((name) =>
      sanitizeEnvEntry(
        name,
        getEnvCaseInsensitive(withProxyEnv, name) ??
          withProxyEnv[name.toUpperCase()] ??
          withProxyEnv[name.toLowerCase()],
      ),
    ),
  ]);
}
//@ chunk-ae5g0zb5.js:34703-34876 placement
/**
 * 清理单个环境变量：不安全的 NODE_OPTIONS 置空，PATH 类去掉含分号和 ${ 的条目。
 */
function sanitizeEnvEntry(name, envCaseInsensitive = "") {
  if (name === "NODE_OPTIONS" && !isSafeNodeOptions(envCaseInsensitive)) return [name, ""];
  return [
    name,
    (isBuildToolEnvVar(name)
      ? sanitizePathEnv(envCaseInsensitive)
          .split(delimiter)
          .filter((entry) => !entry.includes(";"))
      : [envCaseInsensitive]
    )
      .filter((part) => !part.includes("${"))
      .join(delimiter),
  ];
}
//@ chunk-ae5g0zb5.js:34956-35065 placement
/**
 * 动态加载 Claude Test 安装文件模块并缓存名称。
 */
async function loadInstalledFiles() {
  let installedFilesModule = await import("../../../skills/bundled/INSTALLED_FILES.lazy.js");
  testPluginTexts.name ??= testPluginContentId(portPortedFiles(installedFilesModule.INSTALLED_FILES));
  return installedFilesModule;
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
