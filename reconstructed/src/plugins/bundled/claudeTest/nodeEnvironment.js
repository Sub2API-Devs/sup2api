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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  sep,
  sep as sep_2,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  delimiter,
  delimiter as delimiter_2,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  realpath,
  realpath as realpath_2,
  readlink,
} from "fs/promises";
import { cte } from "../../../utils/settings/envSources.js";
import { subprocessEnv, agentProxyEnv, proxyEnvForSubprocess } from "../../../utils/subprocessEnv.js";
import { TEAMMATE_ENV_VARS } from "../../../utils/swarm/spawnUtils.js";
import { isEnvOverridden, yt } from "./constants.js";
import { ge } from "../../../utils/identity.js";
import { getOriginalCwd, getCwdState, getProjectRootOrNull } from "../../../bootstrap/state.js";
import { getFsImplementation } from "../../../utils/fsOperations.js";
import { uniq } from "../../../utils/collections.js";
import { resolveOptions, realpathAllowMissing } from "../../../utils/hooks/hookCommandResolution.js";
import { normalizeCommandForPlatform, findCanonicalGitRoot } from "../../../utils/git.js";
import { m_ } from "../../../utils/settings/stickyRoots.js";
import { DNe, cSe } from "../../../utils/git/builderGit/gitEnv.js";
import { whichOnPath, sanitizePathEnv } from "../../../utils/which.js";
import { logForDebugging } from "../../../utils/debug.js";
import { execFileNoThrow } from "../../../utils/execFileNoThrow.js";
import { Do } from "../../../utils/git/gitSafeEnv.js";
import { getEnvCaseInsensitive } from "../../../utils/plugins/securityDefaultPlugin.js";
import { V6n, testPluginContentId } from "../../../services/pluginTest/claudeTestPlugin.js";

/**
 * 返回需要透传的非空且被改动过的环境变量名。
 */
//@ chunk-ae5g0zb5.js:30268-30348 placement
function getTeammateEnvVarsToForward() {
  let e = cte(),
    n = subprocessEnv();
  return TEAMMATE_ENV_VARS.filter((r) => n[r] !== "" && isEnvOverridden(r, n[r], e));
}
/**
 * NODE_OPTIONS 里会加载额外代码的选项（--import、--loader、--require 等）。
 */
//@ chunk-ae5g0zb5.js:30583-30862 placement
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
  ]),
  Va = new Set(["--import", "--loader", "--experimental-loader"]);
//@ chunk-ae5g0zb5.js:30862-30934 placement
function Xa(e) {
  try {
    return fileURLToPath(new URL(e, "file:///")) === e;
  } catch {
    return !1;
  }
}
//@ chunk-ae5g0zb5.js:30934-31006 placement
var za = new Set(["-r", "--require", "--experimental-default-config-file"]);
/**
 * 把 NODE_OPTIONS 拆成 {option, file} 列表（--x_y 规范为 --x-y）。
 */
//@ chunk-ae5g0zb5.js:31006-31224 placement
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
/**
 * NODE_OPTIONS 是否安全：无引号、无禁用项，需要文件的选项只能指向安全的绝对路径。
 */
//@ chunk-ae5g0zb5.js:31224-31379 placement
function isSafeNodeOptions(e) {
  return (
    !e.includes('"') &&
    parseNodeOptions(e).every(
      ({ option: option, file: file }) =>
        !za.has(option) &&
        (!UNSAFE_NODE_OPTION_FLAGS.has(option) ||
          (isAbsolute_2(file) && !file.split(sep_2).includes("..") && (!Va.has(option) || Xa(file)))),
    )
  );
}
//@ chunk-ae5g0zb5.js:31379-31454 placement
function rr(e) {
  return parseNodeOptions(e).flatMap(({ option: option, file: file }) =>
    UNSAFE_NODE_OPTION_FLAGS.has(option) ? [file] : [],
  );
}
//@ chunk-ae5g0zb5.js:31454-31520 placement
var Za = new Set(["LD_PRELOAD", "LD_AUDIT", "DYLD_INSERT_LIBRARIES"]);
/**
 * 从目录向上找所有含 .git 的祖先目录。
 */
//@ chunk-ae5g0zb5.js:31520-31638 placement
async function findGitDirsUpward(e) {
  let n = dirname(e);
  return [
    ...((await lstat(join(e, ".git")).then(
      () => !0,
      () => !1,
    ))
      ? [e]
      : []),
    ...(n === e ? [] : await findGitDirsUpward(n)),
  ];
}
//@ chunk-ae5g0zb5.js:31638-31685 placement
async function rs(e) {
  return realpath(e).catch(() => e);
}
//@ chunk-ae5g0zb5.js:31685-31719 placement
var os = ge(new Set(), (e) => e.clear());
/**
 * 收集项目相关根目录（原始/当前 cwd、项目根、git 根）及其真实路径。
 */
//@ chunk-ae5g0zb5.js:31719-32066 placement
async function listProjectRoots() {
  for (let a of [getOriginalCwd(), getCwdState(), getFsImplementation().cwd()]) os.add(a);
  let e = getProjectRootOrNull(),
    n = uniq([...(e === null ? [] : [e]), ...os]),
    r = resolveOptions(cte()),
    o = isAbsolute(r) ? normalizeCommandForPlatform(await rs(r)) : void 0,
    results = await Promise.all(
      uniq([
        ...n,
        ...(await Promise.all(n.map(findGitDirsUpward))).flat(),
        ...n.flatMap((a) => findCanonicalGitRoot(a) ?? []),
      ]).map(async (a) => [a, await rs(a)].map(normalizeCommandForPlatform)),
    );
  return uniq(results.filter((a) => o === void 0 || !m_([o], a)).flat());
}
/**
 * 路径（跟随符号链接，最多 8 层）是否落在项目目录内。
 */
//@ chunk-ae5g0zb5.js:32066-32421 placement
async function isInsideProject(e, n, r = 0) {
  let replaced = e.replace(/\/{2,}/g, "/"),
    s = replaced.length > 1 && replaced.endsWith("/") ? replaced.slice(0, -1) : replaced,
    a = await realpathAllowMissing(s);
  if (a === "unreadable" || m_([s, ...(a === "absent" ? [] : [a])].map(normalizeCommandForPlatform), n))
    return !0;
  let i = await readlink(s).catch(() => {
      return;
    }),
    c = i === void 0 || isAbsolute(i) ? i : `${dirname(s)}${sep}${i}`;
  if (c !== void 0 && (r > 8 || (await isInsideProject(c, n, r + 1)))) return !0;
  let _ = dirname(s);
  return _ !== s && isInsideProject(_, n, r);
}
//@ chunk-ae5g0zb5.js:32421-32495 placement
function ls(e) {
  return isAbsolute(e) && !e.split(sep).includes("..") && !/[;$]/.test(e);
}
//@ chunk-ae5g0zb5.js:32495-32540 placement
async function Tt(e, n) {
  return !ls(e) || isInsideProject(e, n);
}
/**
 * 过滤 PATH 类变量：只保留不在项目内的条目。
 */
//@ chunk-ae5g0zb5.js:32540-32683 placement
async function filterSafePathEntries(e, n, r) {
  return (
    await Promise.all(
      e.map(async (s) =>
        (r && s !== "" && !/[/;$]/.test(s)) || (ls(s) && !(await isInsideProject(s, n))) ? [s] : [],
      ),
    )
  )
    .flat()
    .join(delimiter);
}
//@ chunk-ae5g0zb5.js:32683-33079 placement
async function findUnsafeInheritedEnv(e, n) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(e).map(async ([r, o]) => {
        if (DNe(r)) return [r, await filterSafePathEntries(o.split(delimiter), n, !1)];
        if (r === "NODE_OPTIONS") {
          let results = await Promise.all(rr(o).map((a) => Tt(a, n)));
          return [r, results.includes(!0) ? "" : o];
        }
        if (r === "CHROME_DEVEL_SANDBOX") return [r, await filterSafePathEntries([o], n, !1)];
        return Za.has(r)
          ? [r, await filterSafePathEntries(o.split(r === "LD_PRELOAD" ? /[ :]+/ : ":"), n, !0)]
          : [r, o];
      }),
    ),
  );
}
//@ chunk-ae5g0zb5.js:33079-33091 placement
var Qa = 5000;
/**
 * 找到 PATH 上第一个 node，拒绝位于项目或其检出目录内的 node。
 */
//@ chunk-ae5g0zb5.js:33091-33845 placement
async function resolveTrustedNode(e, n, r = Qa) {
  let o = whichOnPath("node", e.PATH ?? "");
  if (o === null || (await Tt(o, n))) {
    logForDebugging(
      "Claude Test: the first node on your own PATH is missing, or leads into this project or one of its checkouts (PATH from the shell that started Claude Code, or your user settings; a project's settings are not used)",
      { level: "error" },
    );
    return;
  }
  let {
      code: code,
      stdout: stdout,
      timedOut: timedOut,
    } = await execFileNoThrow(o, ["-p", "process.execPath"], {
      cwd: "/",
      env: { ...subprocessEnv(), ...e },
      extendEnv: !1,
      stdin: "ignore",
      timeout: r,
      maxBuffer: 65536,
    }),
    sliced = stdout.slice(
      stdout.lastIndexOf(`
`) + 1,
    );
  if (code === 0 && !(await Tt(sliced, n))) return sliced;
  logForDebugging(
    `Claude Test: ${o} -p process.execPath gave no usable path (${timedOut ? `no answer within ${r} ms` : code === 0 ? "exit 0, but its last line was no plain full path outside this project" : `exit ${code}`})`,
    { level: "error" },
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
/**
 * 生成被测应用的环境变量：清掉 CLAUDE* 与代理差异项，处理 PATH/NODE_OPTIONS 等可劫持变量。
 */
//@ chunk-ae5g0zb5.js:34350-34703 placement
function buildAppEnvironment() {
  let e = cte(),
    n = { ...e, ...Do(agentProxyEnv(), (o, s) => !cSe(s) && !isEnvOverridden(s, o, e)) },
    r = { ...n, ...proxyEnvForSubprocess(n) };
  return Object.fromEntries([
    ...Object.entries(subprocessEnv()).flatMap(([o, s]) => {
      if (DNe(o)) return [sanitizeEnvEntry(o, getEnvCaseInsensitive(e, o))];
      return o.startsWith("CLAUDE") || s === getEnvCaseInsensitive(r, o) ? [] : [sanitizeEnvEntry(o)];
    }),
    ...SCRUBBED_APP_ENV_VARS.map((o) => sanitizeEnvEntry(o, getEnvCaseInsensitive(e, o))),
    ...TEAMMATE_ENV_VARS.map((o) =>
      sanitizeEnvEntry(o, getEnvCaseInsensitive(r, o) ?? r[o.toUpperCase()] ?? r[o.toLowerCase()]),
    ),
  ]);
}
/**
 * 清理单个环境变量：不安全的 NODE_OPTIONS 置空，PATH 类去掉含分号和 ${ 的条目。
 */
//@ chunk-ae5g0zb5.js:34703-34876 placement
function sanitizeEnvEntry(e, n = "") {
  if (e === "NODE_OPTIONS" && !isSafeNodeOptions(n)) return [e, ""];
  return [
    e,
    (DNe(e)
      ? sanitizePathEnv(n)
          .split(delimiter_2)
          .filter((r) => !r.includes(";"))
      : [n]
    )
      .filter((r) => !r.includes("${"))
      .join(delimiter_2),
  ];
}
/**
 * 动态加载 Claude Test 安装文件模块并缓存名称。
 */
//@ chunk-ae5g0zb5.js:34956-35065 placement
async function loadInstalledFiles() {
  let e = await import("./chunk-thddg15d.js");
  return ((V6n.name ??= testPluginContentId(yt(e.INSTALLED_FILES))), e);
}

export {
  SCRUBBED_APP_ENV_VARS,
  getTeammateEnvVarsToForward,
  Tt,
  loadInstalledFiles,
  rr,
  isSafeNodeOptions,
  resolveTrustedNode,
  findUnsafeInheritedEnv,
  buildAppEnvironment,
  listProjectRoots,
};
