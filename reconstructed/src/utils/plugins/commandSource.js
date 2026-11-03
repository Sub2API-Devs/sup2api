/**
 * utils/plugins/commandSource.ts
 *
 * 插件命令源（command source）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-21ppfwx8.js (56)
 * attribution: placement 56
 */
import { spawn } from "child_process";
import { join, join as join_2, isAbsolute, relative, sep, dirname, resolve } from "path";
import {
  readdir,
  readdir as readdir_2,
  stat,
  stat as stat_2,
  realpath,
  lstat,
  open,
  readlink,
  mkdir,
  symlink,
  writeFile,
  rename,
  readFile,
} from "fs/promises";
import { homedir, homedir as homedir_2 } from "os";
import { createHash, createHash as createHash_2 } from "crypto";
import { isEssentialTrafficOnly } from "../privacyLevel.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getPluginsDirectory } from "./pluginDirectories.js";
import { stripWin32DevicePrefix, isPathWithin } from "../fsJunctions.js";
import { projectPluginsDir, isFreshTimestamp, recordProducerDir } from "./pluginCachePaths.js";
import { getPlatform } from "../platform.js";
import {
  SLi,
  realpathAllowMissing,
  ck,
  eDe,
  resolvePathChain,
  traversesUntrustedLink,
} from "../pathResolution.js";
import { yl, Qg, foldCase } from "../networkPaths.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { getClaudeConfigDir, isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { uniq } from "../collections.js";
import {
  getOriginalCwd,
  getAdditionalDirectoriesForClaudeMd,
  isHomeDirectorySession,
  getHomeTrustDialogAccepted,
} from "../../bootstrap/state.js";
import { findGitRoot } from "../git.js";
import { dY } from "../settings/settingsStorage.js";
import { Tv, ije } from "../disklessSession.js";
import { Nd } from "../toolCgroup.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { killProcessGroup } from "../auth/lockHolderLiveness.js";
import { printableName } from "../printableName.js";
import { logForDebugging } from "../debug.js";
import { subprocessEnv } from "../subprocessEnv.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isENOENT,
  errorMessage,
} from "../errors.js";
import { classifyDirEntry, classifyDirEntrySafe, removeDirectoryTreeNoFollow } from "../fsRemove.js";
import { vkn, PLUGIN_LINK_FILE, CJr } from "./pluginLinks.js";
import { MAX_CONSENT_COMMAND_LENGTH } from "./schemas.js";
import { runCommandHint } from "../worktreeResumeHint.js";
import { $j } from "../pathClassification.js";
import { OCt } from "../pathSegments.js";
import { CACHE_META_FILES } from "./cacheUtils.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import {
  areCommandPluginSourcesDisabledByPolicy,
  noteHeldForTheAnswer,
  commandPluginSourcesDisabledMessage,
} from "./marketplacePolicy.js";
import { J_ } from "./marketplaceNames.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { isWorkspacePersistedTrusted } from "../config.js";
import { checkPluginBunOptions } from "../permissions/protectedSettingsPaths.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { jsonParse } from "../slowOperations.js";
import { isPlainObject } from "../isPlainObject.js";
import { listSecretEnvNames } from "../settings/policyHelper/helperEnv.js";
import { sanitizeEnvCredentials } from "../settings/policyHelper/helperExec.js";
import { logError } from "../log.js";
import { withDeadline } from "../sleep.js";

//@ chunk-21ppfwx8.js:1536-1597 placement
function HVt() {
  if (isEssentialTrafficOnly()) return !1;
  if (isPluginsDirOnLocalDisk()) return !1;
  return B();
}
//@ chunk-21ppfwx8.js:1597-1661 placement
function B() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_command_source_refresh", !0);
}
//@ chunk-21ppfwx8.js:1661-1674 placement
var Te = 30000;
/**
 * 判断插件目录是否在可信本地文件系统上（Windows 用 SLi，其他平台 yl）；否则对项目插件目录做 realpath 检查并缓存， 配置目录在其下返回 false，最后检查与已知可疑根（be()）是否互相包含。命令源安装、更新前调用。
 */
//@ chunk-21ppfwx8.js:1674-1979 placement
function isPluginsDirOnLocalDisk() {
  let e = getPluginsDirectory(),
    n = stripWin32DevicePrefix(projectPluginsDir());
  if (getPlatform() === "windows" ? SLi(e) : yl(e)) return !0;
  let provenLocalRoots = getPluginRegistry().provenLocalRoots,
    i = provenLocalRoots.get(n);
  if (i === void 0 || !isFreshTimestamp(i, Te)) {
    if (realpathAllowMissing(n, { allowLocalWsl: !0 })) return (provenLocalRoots.delete(n), !0);
    provenLocalRoots.set(n, Date.now());
  }
  if (isPathWithin(getClaudeConfigDir(), n)) return !1;
  return be().some((o) => isPathWithin(n, o, { foldCase: !0 }) || isPathWithin(o, n, { foldCase: !0 }));
}
//@ chunk-21ppfwx8.js:1979-2070 placement
function be() {
  return uniq(
    [getOriginalCwd(), ...getAdditionalDirectoriesForClaudeMd()].flatMap((e) =>
      [e, findGitRoot(e), dY(e)].filter((n) => n !== null),
    ),
  );
}
//@ chunk-21ppfwx8.js:2401-2478 placement
var Re = ["local", "npm", "github", "git", "subdir", "archive", "command", "unknown"];
/**
 * temp_<名>_<时间戳>_<随机串> 临时缓存目录名。
 */
//@ chunk-21ppfwx8.js:2478-2590 placement
function makeTempCachePathName(e) {
  let padded = Math.random()
    .toString(36)
    .slice(2, 2 + Q)
    .padEnd(1, "0");
  return `${TEMP}${e}_${Date.now()}_${padded}`;
}
//@ chunk-21ppfwx8.js:2590-2722 placement
var TEMP = "temp_",
  Q = 6,
  Kqe = "_x",
  Q5o = ".clone",
  regExp = new RegExp(`^${TEMP}(?:${Re.join("|")})_(\\d{10,})_[a-z0-9]{1,${Q}}(?:${Kqe}|\\${Q5o})?$`);
//@ chunk-21ppfwx8.js:2722-2761 placement
function ee(e, n) {
  return `${e}${ne}${n}`;
}
//@ chunk-21ppfwx8.js:2761-2813 placement
var ne = ".linking-",
  regExp_2 = new RegExp(`\\${ne}(\\d+)$`);
//@ chunk-21ppfwx8.js:2852-2864 placement
var re = 2000;
//@ chunk-21ppfwx8.js:2864-4508 placement
function spawnCommandSource(
  e,
  {
    cwd: cwd,
    env: env,
    timeoutMs: timeoutMs,
    maxStdoutBytes: maxStdoutBytes,
    maxStderrBytes: maxStderrBytes,
  },
) {
  if (Tv()) return Promise.resolve({ kind: "spawn-error", message: ije, stdout: "", stderr: "" });
  return new Promise((c) => {
    let s = "",
      u = "",
      h = 0,
      p = 0,
      w = !1,
      S = !1,
      A,
      b,
      _ = spawn(e, [], {
        shell: !0,
        cwd: cwd,
        env: env,
        stdio: ["ignore", "pipe", "pipe"],
        detached: getPlatform() !== "windows",
        windowsHide: !0,
        ...Nd("plugin"),
      }),
      Ae = registerCleanup(async () => {
        if (!w && _.pid !== void 0) await killProcessGroup(_.pid, "SIGKILL");
      });
    function P(y) {
      if (w) return;
      if (((w = !0), Ae(), clearTimeout(V), b)) clearTimeout(b);
      (_.stdout?.removeAllListeners("data"),
        _.stderr?.removeAllListeners("data"),
        _.stdout?.destroy(),
        _.stderr?.destroy(),
        c(y));
    }
    function q(y) {
      if (A) return;
      ((A = y),
        _.stdout?.removeAllListeners("data"),
        _.stderr?.removeAllListeners("data"),
        _.stdout?.pause(),
        _.stderr?.pause());
      let T = { kind: y, stdout: s, stderr: u },
        N = () => {
          if (w) return;
          if (S) {
            P(T);
            return;
          }
          let x = () => P(T);
          if ((_.once("exit", x), (b = setTimeout((G) => G(), re, x)), typeof b === "object")) b.unref();
        };
      if (_.pid === void 0) {
        P(T);
        return;
      }
      killProcessGroup(_.pid, "SIGKILL").then(N, N);
    }
    let V = setTimeout((y) => y("timed-out"), timeoutMs, q);
    (_.stdout?.setEncoding("utf8"),
      _.stderr?.setEncoding("utf8"),
      _.stdout?.on("data", (y) => {
        if (((h += Buffer.byteLength(y)), h > maxStdoutBytes)) {
          q("stdout-overflow");
          return;
        }
        s += y;
      }),
      _.stderr?.on("data", (y) => {
        if (p >= maxStderrBytes) return;
        ((p += Buffer.byteLength(y)), (u += y));
      }),
      _.once("error", (y) => {
        P({ kind: "spawn-error", message: y.message, stdout: s, stderr: u });
      }));
    function J(y, T) {
      if (A) return;
      if (typeof y === "number") P({ kind: "exited", exitCode: y, stdout: s, stderr: u });
      else P({ kind: "signaled", signal: T ?? "unknown", stdout: s, stderr: u });
    }
    (_.once("exit", (y, T) => {
      if (((S = !0), w || A)) return;
      if ((clearTimeout(V), (b = setTimeout((N, x, G) => N(x, G), re, J, y, T)), typeof b === "object"))
        b.unref();
    }),
      _.once("close", (y, T) => {
        J(y, T);
      }));
  });
}
/**
 * 插件布局常量：.claude-plugin 目录、其中的 plugin.json 与 marketplace.json 相对路径、组件目录（commands/skills/agents/…）、 根目录识别文件（SKILL.md、.mcp.json、.lsp.json）与它们的合集。
 */
//@ chunk-21ppfwx8.js:4586-4837 placement
var PLUGIN_MANIFEST_DIR = ".claude-plugin",
  PLUGIN_MANIFEST_PATH = join_2(PLUGIN_MANIFEST_DIR, "plugin.json"),
  PLUGIN_JSON = "plugin.json",
  MARKETPLACE_MANIFEST_PATH = join_2(PLUGIN_MANIFEST_DIR, "marketplace.json"),
  PLUGIN_COMPONENT_DIRS = [
    "commands",
    "skills",
    "agents",
    "hooks",
    "themes",
    "output-styles",
    "monitors",
    "workflows",
  ],
  PLUGIN_ROOT_MARKER_FILES = ["SKILL.md", ".mcp.json", ".lsp.json"],
  PLUGIN_ROOT_MARKERS = [PLUGIN_MANIFEST_DIR, ...PLUGIN_COMPONENT_DIRS, ...PLUGIN_ROOT_MARKER_FILES];
//@ chunk-21ppfwx8.js:4837-4909 placement
async function $kt(e) {
  return (await readdir_2(e)).filter((r) => !ae(r)).some(j5r);
}
/**
 * 定位解压后的插件根：本层有 .claude-plugin 就返回本层；只有一个子目录且其中有 .claude-plugin（或像插件根）则返回子目录。
 */
//@ chunk-21ppfwx8.js:4909-5199 placement
async function findPluginRootInExtracted(e) {
  let filtered = (await readdir_2(e, { withFileTypes: !0 })).filter((r) => !ae(r.name));
  if (filtered.some((r) => r.name === ".claude-plugin")) return e;
  if (filtered.length === 1 && filtered[0].isDirectory()) {
    let r = join_2(e, filtered[0].name);
    if (await Me(join_2(r, ".claude-plugin"))) return r;
    if (!j5r(filtered[0].name) && (await $kt(r))) return r;
  }
  return e;
}
//@ chunk-21ppfwx8.js:5199-5238 placement
function j5r(e) {
  return PLUGIN_ROOT_MARKERS.includes(e);
}
//@ chunk-21ppfwx8.js:5238-5277 placement
function yii(e) {
  return PLUGIN_COMPONENT_DIRS.includes(e);
}
//@ chunk-21ppfwx8.js:5277-5340 placement
async function Me(e) {
  try {
    return (await stat_2(e), !0);
  } catch {
    return !1;
  }
}
//@ chunk-21ppfwx8.js:5340-5394 placement
function ae(e) {
  return e === "__MACOSX" || e === ".DS_Store";
}
//@ chunk-21ppfwx8.js:5394-5467 placement
var Ge = 60,
  le = 65536,
  Be = 65536,
  de = 500,
  ce = 268435456,
  ue = 20000,
  Ke = new Set(PLUGIN_ROOT_MARKERS);
/**
 * 运行插件的命令源（command source）生成插件目录，带超时
 */
//@ chunk-21ppfwx8.js:5467-8893 placement
async function runPluginCommandSource(e) {
  let n = (e.timeout ?? Ge) * 1000,
    r = printableName(e.command, 200);
  logForDebugging(`Plugin command source: running \`${r}\` (timeout ${n}ms)`);
  let i = await spawnCommandSource(e.command, {
      cwd: homedir(),
      env: subprocessEnv(),
      timeoutMs: n,
      maxStdoutBytes: le,
      maxStderrBytes: Be,
    }),
    o = printableName(i.stderr.trim(), de),
    a = o ? ` (stderr: ${o})` : "";
  switch (i.kind) {
    case "exited":
      if (i.exitCode !== 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin source command \`${r}\` exited with code ${i.exitCode}` +
            (o ? `: ${o}` : " and no error output."),
          "plugin command source exited non-zero",
        );
      break;
    case "timed-out":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${r}\` did not finish within ${n / 1000}s and was stopped.${a}`,
        "plugin command source timed out",
      );
    case "stdout-overflow":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${r}\` printed more than ${le / 1024} KB and was stopped; it must print a single absolute path.`,
        "plugin command source exceeded the stdout cap",
      );
    case "signaled":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${r}\` was killed by ${i.signal} before it finished.${a}`,
        "plugin command source killed by a signal",
      );
    case "spawn-error":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${r}\` could not be started: ` + printableName(i.message, de),
        "plugin command source failed to spawn",
      );
  }
  let filtered = i.stdout
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (filtered.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed nothing; it must print the absolute path of the plugin directory.`,
      "plugin command source printed nothing",
    );
  if (filtered.length > 1)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed ${filtered.length} lines; it must print exactly one absolute path.`,
      "plugin command source printed multiple lines",
    );
  let s = filtered[0];
  if (!isAbsolute(s))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, which is not an absolute path.`,
      "plugin command source printed a relative path",
    );
  if ((getPlatform() === "windows" && ck(s)) || Qg(s))
    throw new Bd(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, a network path (UNC or automount), which is not supported as a plugin directory.`,
      "plugin command source printed a network path",
    );
  if (eDe(s))
    throw new Bd(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, which is reached through a link onto a network location (or one that cannot be trusted); that is not supported as a plugin directory.`,
      "plugin command source printed a path through a suspect link",
    );
  let u;
  try {
    u = await realpath(s);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, but that path could not be resolved (${getErrnoCode(error) ?? "unknown error"}).`,
      "plugin command source path does not resolve",
    );
  }
  if (Qg(u) || (getPlatform() === "windows" && ck(u)))
    throw new Bd(
      `Plugin source command \`${r}\` printed a path that resolves to a network location, which is not supported as a plugin directory.`,
      "plugin command source path resolves to a network path",
    );
  let h;
  try {
    h = await readdir(u);
  } catch (error) {
    let w = getErrnoCode(error);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, ` +
        (w === "ENOTDIR"
          ? "which is not a directory."
          : `which could not be read as a directory (${w ?? "unknown error"}).`),
      "plugin command source path is not a readable directory",
    );
  }
  if (!h.some((p) => Ke.has(p)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, but that directory has no plugin content (expected .claude-plugin/ or a commands/, skills/, agents/, hooks/, themes/, output-styles/, monitors/, workflows/, SKILL.md, .mcp.json, or .lsp.json at the top level). Nothing was installed.`,
      "plugin command source directory has no plugin content",
    );
  return (logForDebugging(`Plugin command source: resolved plugin directory ${u}`), u);
}
//@ chunk-21ppfwx8.js:8893-9573 placement
async function checkPluginDirSize(e, n, r) {
  let i = [],
    o = 0,
    a = 0;
  async function c(s) {
    let u = await readdir(s, { withFileTypes: !0 });
    for (let h of u) {
      if ((a++, a > ue))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin directory has more than ${ue} entries; refusing to install it as a plugin.`,
          "plugin command source directory has too many files",
        );
      let p = join(s, h.name),
        w = await classifyDirEntry(s, h);
      if (w.isDirectory) {
        if (s === e && h.name === ".git") continue;
        await c(p);
      } else if (w.isFile) {
        let S = w.size ?? (await lstat(p)).size;
        if ((r?.set(p, S), (o += S), o > ce))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Plugin directory is larger than ${ce / 1048576} MB; refusing to install it as a plugin.`,
            "plugin command source directory too large",
          );
        i.push(p);
      } else if (w.isSymbolicLink) n?.push(p);
    }
  }
  return (await c(e), n?.sort(), i.sort());
}
/**
 * 计算插件目录内容摘要：按相对路径与大小逐个文件流式哈希（不足部分补零），再加入符号链接及其目标，返回 hex。
 */
//@ chunk-21ppfwx8.js:9573-10063 placement
async function hashPluginDirectoryContents(root) {
  let symlinks = [],
    fileSizes = new Map(),
    files = await checkPluginDirSize(root, symlinks, fileSizes),
    hash = createHash_2("sha256");
  for (let a of files) {
    let c = fileSizes.get(a) ?? 0;
    hash.update(`f ${relative(root, a).split(sep).join("/")}\x00${c}\x00`);
    let s = c;
    if (c > 0) {
      let u = await open(a, "r");
      try {
        for await (let h of u.createReadStream({ start: 0, end: c - 1 })) (hash.update(h), (s -= h.length));
      } finally {
        await u.close();
      }
    }
    if (s > 0) hash.update(Buffer.alloc(s));
  }
  for (let a of symlinks) {
    let c = await readlink(a);
    (hash.update(`l ${relative(root, a).split(sep).join("/")}\x00`),
      hash.update(`${Buffer.byteLength(c)}\x00${c}`));
  }
  return hash.digest("hex");
}
/**
 * Windows 不支持 mode link 的提示。
 */
//@ chunk-21ppfwx8.js:10063-10194 placement
var LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE =
  'This plugin source uses mode "link", which is not supported on Windows yet; the marketplace can use mode "copy" instead.';
//@ chunk-21ppfwx8.js:10194-10263 placement
function o1(e) {
  return e.mode === "link" ? `${e.command}${vkn}` : e.command;
}
/**
 * 说明 link/copy 两种模式对输出目录的处理。
 */
//@ chunk-21ppfwx8.js:10263-10444 placement
function describeCommandSourceMode(e) {
  return e.mode === "link"
    ? 'mode "link": its output directory is used in place (linked, not copied)'
    : 'mode "copy": its output directory is copied into the plugin cache';
}
//@ chunk-21ppfwx8.js:10444-10464 placement
class Bd extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-21ppfwx8.js:10464-12145 placement
function describePluginSourceMode(e, n) {
  if (n && n.kind !== "none" && n.command === o1(e)) return;
  let r = printableName(e.command, MAX_CONSENT_COMMAND_LENGTH) + (e.mode === "link" ? " [mode: link]" : ""),
    i = n?.pluginId !== void 0 ? printableName(n.pluginId, 200) : void 0,
    o = i ?? "This plugin",
    a = i ?? "";
  if (n?.kind === "recorded" && n.command !== void 0)
    throw new Bd(
      `${o}'s marketplace changed the command that installs it, or how its output is used (now \`${r}\`), since it was accepted, so it was not run. Review and accept the new command: ${runCommandHint("plugin update", a, { tail: "in a terminal (add `--scope` for a project/local install)", fallback: "an explicit plugin update in a terminal reviews it" })}.`,
      "plugin command source command changed since consent",
    );
  if (n?.kind === "recorded")
    throw new Bd(
      `${o}'s marketplace entry now installs it by running a command on this machine (\`${r}\`) that has not been reviewed yet, so it was not run. Review and accept it: ${runCommandHint("plugin update", a, { tail: "in a terminal (add `--scope` for a project/local install)", fallback: "an explicit plugin update in a terminal reviews it" })}.`,
      "plugin command source never consented for an installed plugin",
    );
  if (n?.kind === "shown")
    throw new Bd(
      `${o}'s marketplace entry changed while it was being installed (it now declares \`${r}\`, not the command that was shown), so nothing was run. Re-run the install/update to review the current command.`,
      "plugin command source changed between display and run",
    );
  throw new Bd(
    `${o} is installed by running a command on this machine (\`${r}\`) that has not been reviewed yet, so it was not run. Review and accept it from its /plugin details pane, or in a terminal: ${runCommandHint("plugin install", a, { fallback: "an explicit plugin install reviews it" })}.`,
    "plugin command source without consent",
  );
}
/**
 * 在 n 下为源目录 e 的每一项创建符号链接（目标先经安全检查），写入 PLUGIN_LINK_FILE 标记（wx 独占）， 返回由源路径与各链接名/目标计算的 sha256。
 */
//@ chunk-21ppfwx8.js:12145-12605 placement
async function createLinkFarm(e, n) {
  let sorted = (await readdir(e)).filter((a) => !nSn(a)).sort(),
    i = await checkPluginEntryLinks(
      e,
      sorted.map((a) => ({ name: a, path: join(e, a) })),
    );
  await mkdir(n, { recursive: !0 });
  for (let { name: a, target: target, isDirectory: isDirectory } of i)
    await symlink(target, join(n, a), isDirectory ? "dir" : "file");
  await writeFile(join(n, PLUGIN_LINK_FILE), JSON.stringify({ target: e }), { flag: "wx" });
  let o = createHash_2("sha256");
  o.update(`${e}\x00`);
  for (let { name: a, target: target } of i)
    (o.update(`${Buffer.byteLength(a)}\x00${a}`), o.update(`${Buffer.byteLength(target)}\x00${target}`));
  return o.digest("hex");
}
//@ chunk-21ppfwx8.js:12605-13459 placement
async function checkPluginEntryLinks(e, n) {
  let r = [];
  for (let { name: i, path: path } of n) {
    if (resolvePathChain(path, dirname(path)))
      throw new Bd(
        `A top-level entry of the plugin directory (${printableName(i, 100)}) points at a network location or through a link that cannot be trusted; refusing to link it.`,
        "plugin command source entry traverses a suspect link",
      );
    let a, c;
    try {
      ((a = await realpath(path)), (c = (await stat(a)).isDirectory()));
    } catch {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `A top-level entry of the plugin directory its command produced could not be resolved (${printableName(i, 80)}); refusing to link it.`,
        "plugin command source link entry unresolvable",
      );
    }
    let s = relative(e, a);
    if (s === "" || s === ".." || s.startsWith(`..${sep}`) || isAbsolute(s))
      throw new Bd(
        `A top-level entry of the plugin directory its command produced (${printableName(i, 80)}) points outside that directory; refusing to link it.`,
        "plugin command source link escapes producer directory",
      );
    r.push({ name: i, target: a, isDirectory: c });
  }
  return r;
}
//@ chunk-21ppfwx8.js:13459-14892 placement
async function checkRelinkTarget(e, n) {
  let r = resolve(getOriginalCwd(), e),
    i = resolve(getOriginalCwd(), n),
    o = await readLinkFarmMarker(join(r, PLUGIN_LINK_FILE)),
    target = CJr().parse(JSON.parse(o)).target;
  if (traversesUntrustedLink(target))
    throw new Bd(
      "The link farm points at a producer reached through a link that cannot be trusted; refusing to relink it.",
      "plugin command source relink target traverses a suspect link",
    );
  let c = await realpath(target);
  if (ck(c))
    throw new Bd(
      "The link farm points at a producer that now resolves to a network location; refusing to relink it.",
      "plugin command source relink target resolves to a network path",
    );
  let s = [];
  for (let w of await readdir(r, { withFileTypes: !0 })) {
    if (nSn(w.name)) continue;
    if ((await classifyDirEntrySafe(r, w))?.isSymbolicLink) s.push(w);
  }
  let u = [];
  for (let w of s) {
    let S;
    try {
      S = await readlink(join(r, w.name));
    } catch (error) {
      if (isENOENT(error)) continue;
      throw new Bd(
        `A link in the staged farm could not be read (${printableName(errorMessage(error), 120)}); refusing to relink it.`,
        "plugin command source relink entry unreadable",
      );
    }
    if ($j(S))
      throw new Bd(
        "A link in the staged farm is not in canonical form; refusing to relink it.",
        "plugin command source relink entry not canonical",
      );
    u.push(w);
  }
  let h = await checkPluginEntryLinks(
    c,
    u.map((w) => ({ name: w.name, path: join(r, w.name) })),
  );
  await mkdir(dirname(i), { recursive: !0 });
  let p = ee(i, process.pid);
  (await removeDirectoryTreeNoFollow(p), await mkdir(p));
  try {
    for (let { name: w, target: target, isDirectory: isDirectory } of h)
      await symlink(target, join(p, w), isDirectory ? "dir" : "file");
    (await writeFile(join(p, PLUGIN_LINK_FILE), o, { flag: "wx" }), await rename(p, i));
  } catch (error) {
    await removeDirectoryTreeNoFollow(p).catch(() => {});
    let S = getErrnoCode(error);
    if (
      (S === "ENOTEMPTY" || S === "EEXIST") &&
      (await classifyLinkFarm(i)) === "live" &&
      !(await hasEntriesOutsideTarget(i, c))
    )
      return;
    throw error;
  }
}
/**
 * 删掉缓存目录中应忽略的项（可保留 .git）。
 */
//@ chunk-21ppfwx8.js:14892-14999 placement
async function removeIgnoredEntries(e, { keepGit: keepGit }) {
  for (let r of await readdir(e))
    if (nSn(r) && !(keepGit && foldCase(r) === ".git")) await removeDirectoryTreeNoFollow(join(e, r));
}
//@ chunk-21ppfwx8.js:14999-15032 placement
function nSn(e) {
  return OCt(e, qe);
}
//@ chunk-21ppfwx8.js:15032-15064 placement
var qe = new Set([...CACHE_META_FILES, ".git"]);
/**
 * 链接农场是否仍是 live（无法判定时按参数决定）。
 */
//@ chunk-21ppfwx8.js:15064-15179 placement
async function isLiveLinkFarm(e, { unclassifiableIsFarm: n = !1 } = {}) {
  let r = await classifyLinkFarm(e);
  return r === "live" || (r === "unclassifiable" && n);
}
/**
 * 读取链接标记并校验；目录中存在指向绝对路径的符号链接则为 live，否则 not-live；读取错误按 errno 归为 not-live 或 unclassifiable。
 */
//@ chunk-21ppfwx8.js:15179-15632 placement
async function classifyLinkFarm(e) {
  try {
    CJr().parse(JSON.parse(await readLinkFarmMarker(join(e, PLUGIN_LINK_FILE))));
  } catch (error) {
    if (getErrnoCode(error) !== void 0) return n(error);
  }
  try {
    for (let r of await readdir(e, { withFileTypes: !0 })) {
      if (nSn(r.name)) continue;
      try {
        let i = await classifyDirEntry(e, r);
        if (i.isSymbolicLink && isAbsolute(i.linkTarget ?? (await readlink(join(e, r.name))))) return "live";
      } catch (error) {
        if (getErrnoCode(error) === "ENOENT") continue;
        return n(error);
      }
    }
    return "not-live";
  } catch (error) {
    return n(error);
  }
  function n(r) {
    let i = getErrnoCode(r);
    return i === "ENOENT" || i === "ENOTDIR" ? "not-live" : "unclassifiable";
  }
}
//@ chunk-21ppfwx8.js:15632-15697 placement
var Ve = new Set([".ds_store", "thumbs.db", "desktop.ini", "icon\r"]);
//@ chunk-21ppfwx8.js:15697-15761 placement
function Je(e) {
  let n = foldCase(e);
  return Ve.has(n) || n.startsWith("._");
}
//@ chunk-21ppfwx8.js:15761-15794 placement
function Ze(e) {
  return CACHE_META_FILES.has(e);
}
/**
 * 检查缓存目录 e：跳过忽略项与缓存元数据文件，若有普通文件/目录或指向 n 之外（或可疑）路径的符号链接则返回 true。
 */
//@ chunk-21ppfwx8.js:15794-16232 placement
async function hasEntriesOutsideTarget(e, n) {
  let r = n.replace(/[\\/]+$/, "") + sep;
  try {
    for (let i of await readdir(e, { withFileTypes: !0 })) {
      if (Ze(i.name)) continue;
      let o;
      try {
        let a = await classifyDirEntry(e, i);
        if (a.isFile && (Je(i.name) || OCt(i.name, CACHE_META_FILES))) continue;
        if (!a.isSymbolicLink) return !0;
        o = a.linkTarget ?? (await readlink(join(e, i.name)));
      } catch (error) {
        if (getErrnoCode(error) === "ENOENT") continue;
        return !0;
      }
      if (!isAbsolute(o) || $j(o) || ck(o) || !o.startsWith(r)) return !0;
    }
    return !1;
  } catch (error) {
    let o = getErrnoCode(error);
    return o !== "ENOENT" && o !== "ENOTDIR";
  }
}
//@ chunk-21ppfwx8.js:16232-16329 placement
async function Sii(e) {
  try {
    return CJr().parse(JSON.parse(await readLinkFarmMarker(join(e, PLUGIN_LINK_FILE)))).target;
  } catch {
    return;
  }
}
//@ chunk-21ppfwx8.js:16329-16342 placement
var Qe = 16384;
//@ chunk-21ppfwx8.js:16342-16574 placement
async function readLinkFarmMarker(e) {
  let n = await lstat(e);
  if (!n.isFile() || n.size > Qe)
    throw new Bd(
      "The link-farm marker is not a small regular file; refusing to read it.",
      "plugin command source link marker not a small regular file",
    );
  return readFile(e, "utf8");
}
//@ chunk-21ppfwx8.js:16574-16648 placement
function wpe(e) {
  return typeof e === "object" && e.source === "command" ? e : void 0;
}
//@ chunk-21ppfwx8.js:16648-16693 placement
function Nee(e) {
  return wpe(e)?.mode === "link";
}
//@ chunk-21ppfwx8.js:16693-17682 placement
async function holdCommandSourceForOrg(e, n, r, i) {
  if (isHttpMcpServeInvocation())
    throw new Bd(
      "A tool server doesn't run a plugin's command on its own. The plugin was not installed or updated and its command was not run.",
      "plugin command source not started by a tool server daemon",
    );
  if (areCommandPluginSourcesDisabledByPolicy())
    throw (
      noteHeldForTheAnswer(),
      new Bd(
        commandPluginSourcesDisabledMessage(),
        J_() === "unanswered"
          ? "plugin command source held for the organization answer"
          : "plugin command source disabled by managed policy",
      )
    );
  if (e.mode === "link" && getPlatform() === "windows")
    throw new Bd(
      LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE,
      "plugin command source link mode unsupported on windows",
    );
  return (
    describePluginSourceMode(e, i),
    withFeatureTelemetry("plugin_command_install", async () => {
      let o = await runPluginCommandSource(e);
      if (isPathWithin(o, getOriginalCwd(), { foldCase: !0 }))
        throw new Bd(
          `Plugin source command printed the working directory or one of its parents (${printableName(o, 300)}); refusing to use it as a plugin.`,
          "plugin command source printed cwd or an ancestor",
        );
      if ((recordProducerDir(o), e.mode === "link"))
        return { contentSha256: await createLinkFarm(o, n), producerDirectory: o };
      return (
        await checkPluginDirSize(o),
        await r(o, n),
        await removeIgnoredEntries(n, { keepGit: !1 }),
        { contentSha256: await hashPluginDirectoryContents(n), producerDirectory: o }
      );
    })
  );
}
//@ chunk-21ppfwx8.js:17712-17730 placement
var tt = 1e4,
  nt = 1e6;
//@ chunk-21ppfwx8.js:17730-17805 placement
function rt(e) {
  if (isWorkspacePersistedTrusted(e)) return !0;
  return (e === void 0 || e === homedir_2()) && isHomeDirectorySession() && getHomeTrustDialogAccepted();
}
//@ chunk-21ppfwx8.js:17805-18559 placement
async function classifyCommandSourceFailure(e) {
  if (e.isRepoResidentConfig && !rt(e.repoResidentOrigin)) return { ok: !1, reason: "missing_trust" };
  let n =
      e.readEnvAsStarts !== void 0
        ? e.readEnvAsStarts(() => ({
            env: buildCommandSourceEnv(e),
            withoutContextEnv: buildCommandSourceEnv({ ...e, env: void 0 }),
          }))
        : { env: buildCommandSourceEnv(e), withoutContextEnv: void 0 },
    env = n.env;
  if (e.pluginId !== void 0)
    checkPluginBunOptions(
      e.pluginId,
      env,
      n.withoutContextEnv ?? buildCommandSourceEnv({ ...e, env: void 0 }),
    );
  let i = await execFileNoThrowWithCwd(e.command, [], {
    shell: !0,
    timeout: tt,
    maxBuffer: nt,
    cwd: e.cwd,
    env: env,
    extendEnv: !1,
  });
  if (i.code !== 0 || !i.stdout) return { ok: !1, reason: "exec_failed" };
  let o;
  try {
    o = jsonParse(i.stdout.trim());
  } catch {
    return { ok: !1, reason: "parse_failed" };
  }
  if (!isPlainObject(o)) return { ok: !1, reason: "non_object" };
  let a = {};
  for (let [c, s] of Object.entries(o)) {
    if (typeof s !== "string") return { ok: !1, reason: "non_string_value" };
    a[c] = s;
  }
  return { ok: !0, headers: a };
}
/**
 * 构造命令源构建命令的环境：不擦除时直接合并 e.env；擦除时删掉凭证类变量，收集其值， 并把 e.env 中出现的凭证值替换为 REDACTED（等于 cwd 的值除外）。
 */
//@ chunk-21ppfwx8.js:18559-19129 placement
function buildCommandSourceEnv(options) {
  let env = { ...subprocessEnv() };
  if (!options.scrubCredentialEnv) return { ...env, ...options.env };
  let secrets = [];
  for (let c of listSecretEnvNames()) {
    let s = process.env[c] ?? env[c];
    if (s !== void 0 && s !== "" && !isEnvTruthy(s) && !isEnvDefinedFalsy(s)) secrets.push(s);
    delete env[c];
  }
  let env_2 = process.env,
    o = {};
  for (let c of new Set([...Object.keys(env), ...Object.keys(env_2)])) o[c] = env_2[c] ?? env[c];
  for (let c of sanitizeEnvCredentials(o).lostCredential) {
    let s = o[c];
    if (s !== void 0 && s !== "") secrets.push(s);
  }
  (Object.assign(env, sanitizeEnvCredentials(env).respelled), secrets.sort((c, s) => s.length - c.length));
  let extraEnv = {};
  for (let [c, s] of Object.entries(options.env ?? {}))
    extraEnv[c] = s === options.cwd ? s : secrets.reduce((u, h) => u.split(h).join("REDACTED"), s);
  return { ...env, ...extraEnv };
}
//@ chunk-21ppfwx8.js:19129-19176 placement
var zW = { wait: void 0, ask: void 0, fetches: void 0 };
/**
 * 等待托管设置的组织答复：先等 zW.wait，状态仍为 unanswered 时调用 zW.ask；进行中的 Promise 共享，结束后清空。
 */
//@ chunk-21ppfwx8.js:19176-19371 placement
function askOrganizationOnce() {
  let organizationAsk = getPluginRegistry().organizationAsk;
  return (
    (organizationAsk.asking ??= Promise.resolve()
      .then(() => zW.wait?.())
      .then(() => (J_() === "unanswered" ? zW.ask?.() : void 0))
      .catch(logError)
      .finally(() => {
        organizationAsk.asking = null;
      })),
    organizationAsk.asking
  );
}
//@ chunk-21ppfwx8.js:19371-19385 placement
var z5r = 30000;
//@ chunk-21ppfwx8.js:19385-19398 placement
var K5r = 3000;
/**
 * 带截止时间等待组织答复（共享）。
 */
//@ chunk-21ppfwx8.js:19398-19505 placement
function waitForOrganizationAnswer(e) {
  let organizationAsk = getPluginRegistry().organizationAsk;
  return (
    (organizationAsk.answerWait ??= withDeadline(askOrganizationOnce(), K5r, e).then(() => {})),
    organizationAsk.answerWait
  );
}
//@ chunk-21ppfwx8.js:19505-19578 placement
var Oxe = 268435456,
  FVt = 5242880,
  lt = 120000,
  CLAUDE_CODE_PLUGIN_MANAGER = "Claude-Code-Plugin-Manager";

export {
  z5r,
  askOrganizationOnce,
  zW,
  HVt,
  o1,
  Bd,
  LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE,
  isPluginsDirOnLocalDisk,
  describeCommandSourceMode,
  wpe,
  classifyCommandSourceFailure,
  PLUGIN_JSON,
  Nee,
  isLiveLinkFarm,
  makeTempCachePathName,
  Kqe,
  hasEntriesOutsideTarget,
  CLAUDE_CODE_PLUGIN_MANAGER,
  lt,
  Oxe,
  waitForOrganizationAnswer,
  B,
  classifyLinkFarm,
  Sii,
  nSn,
  checkRelinkTarget,
  Q5o,
  holdCommandSourceForOrg,
  removeIgnoredEntries,
  findPluginRootInExtracted,
  $kt,
  PLUGIN_MANIFEST_PATH,
  MARKETPLACE_MANIFEST_PATH,
  PLUGIN_ROOT_MARKERS,
  K5r,
  FVt,
  PLUGIN_MANIFEST_DIR,
  j5r,
  yii,
  regExp,
  regExp_2,
  PLUGIN_COMPONENT_DIRS,
};
