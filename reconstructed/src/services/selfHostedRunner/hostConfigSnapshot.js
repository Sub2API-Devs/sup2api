/**
 * services/selfHostedRunner/hostConfigSnapshot.ts
 *
 * 2.1.316 新增：自托管 runner 启动时把宿主 ~/.claude 配置拍成快照，按会话种入每个会话的配置目录，并校验快照未被篡改
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (62)
 * attribution: placement 62
 */
import { constants, constants as constants_2, constants as constants_4 } from "fs";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  sep,
  sep as sep_2,
  sep as sep_3,
  relative,
  relative as relative_2,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  basename,
  basename as basename_2,
  basename as basename_3,
} from "path";
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3, createHash } from "crypto";
import { homedir, homedir as homedir_2, homedir as homedir_3, hostname, hostname as hostname_2 } from "os";
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  rm,
  rm as rm_2,
  rm as rm_3,
  stat,
  stat as stat_2,
  readdir,
  readdir as readdir_2,
  mkdtemp,
  mkdtemp as mkdtemp_2,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  rename,
  rename as rename_2,
  access,
  constants as constants_3,
} from "fs/promises";
import {
  SYNCED_MANIFEST_FILE,
  SKILLS_SYNC_DIR,
  GYe,
  xdr,
  cU,
  LFe,
  stripInvisibleChars,
  y5t,
  parseSkillsSyncManifest,
} from "../../utils/plugins/syncedItems.js";
import { signatureFileFor, signatureIatFileFor } from "../../utils/settings/policyCertificates.js";
import { aat } from "../policyLimits/cacheStamp.js";
import { oYe, REMOTE_SETTINGS_CONSENT_FILE } from "../remoteManagedSettings/consentRecords.js";
import { HELPER_CONSENT_STATE_ID } from "../remoteManagedSettings/remoteSettingsState.js";
import { CCR_HOME_SEED_JSON } from "../../utils/teleport/homeSeed.js";
import { ATOMIC_WRITE_DIRNAME, AI } from "../../utils/plugins/safeCopy.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isENOENT,
  getErrnoCode,
  isFsInaccessible_2,
} from "../../utils/errors.js";
import { isTempFileName, retryFsOp } from "../../utils/atomicPublishWrite.js";
import { eie } from "../memorySync/syncFiles.js";
import { withBoundedTimeout, BoundedTimeoutError, Hln } from "../../utils/boundedTimeout.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { fileSuffixForOauthConfig, OAUTH_GLOBAL_FILE_SUFFIXES } from "../../constants/oauth.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getGlobalClaudeFile } from "../../utils/env.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { cet } from "../../utils/claudeAiSync/skillsSync.js";
import { throwIfHostConfigCancelled } from "../../entrypoints/sdk/controlSchemas.js";
import { uniq } from "../../utils/collections.js";
import { dre } from "../../utils/git/gitSafeEnv.js";
import { che } from "../../utils/managedEnvConstants.js";

/**
 * 宿主配置快照目录名前缀 ".host-config-snapshot-"。
 */
//@ chunk-hm0ce8vc.js:14506-14578 placement
var HOST_CONFIG_CAPTURE_TIMEOUT_MS = 300000,
  rl = 300000,
  sl = 60000,
  ol = ".host-config-snapshot-",
  ia = 1048576;
/**
 * 打开文件的标志：Windows 只读，其他平台加 O_NOFOLLOW|O_NONBLOCK，防止跟随符号链接或阻塞在 FIFO 上。
 */
//@ chunk-hm0ce8vc.js:14578-14672 placement
function getNoFollowReadFlags(platform = "linux") {
  return platform === "win32"
    ? constants_2.O_RDONLY
    : constants_2.O_RDONLY | constants_2.O_NOFOLLOW | constants_2.O_NONBLOCK;
}
/**
 * 宿主配置目录里的 skills 子目录；同一声明还定义了快照时要排除的会话态文件集合（.claude.json、凭据、projects、sessions、logs 等）。
 */
//@ chunk-hm0ce8vc.js:14672-15834 placement
var HOST_SKILLS_CLAIMS_FILE = join_2("skills", SYNCED_MANIFEST_FILE),
  il = new Set([SKILLS_SYNC_DIR, GYe, xdr, HOST_SKILLS_CLAIMS_FILE, cU, LFe]),
  al = new Set([
    ".claude.json",
    ".claude.json.backup",
    ".credentials.json",
    "projects",
    "sessions",
    "todos",
    "shell-snapshots",
    "statsig",
    "file-history",
    "history.jsonl",
    "ide",
    "logs",
    "backups",
    ".session_ingress_token",
    "policy-limits.json",
    "remote-settings.json",
    ...["policy-limits.json", "remote-settings.json"].flatMap((e) => [
      signatureFileFor(e),
      signatureIatFileFor(e),
    ]),
    aat("policy-limits.json"),
    oYe("remote-settings.json"),
    HELPER_CONSENT_STATE_ID,
    REMOTE_SETTINGS_CONSENT_FILE,
    "hfi-auth.json",
    CCR_HOME_SEED_JSON,
    "daemon",
    "jobs",
    "teams",
    "usage-data",
    "shares",
    "state",
    "uploads",
    "feedback",
    "feedback-bundles",
    "plans",
    "telemetry",
    "dump-prompts",
    "debug",
    "traces",
    "startup-perf",
    "cache",
    "mcp-discovery-cache",
    "mcp-needs-auth-cache.json",
    "gh-pr-status-cache.json",
    "tasks",
    "local",
    "antproto.json",
    "ccr",
    "session-env",
    "bridge-spawn",
    "active-time.json",
    "loop.md",
    "server-sessions.json",
    "image-cache",
    "paste-cache",
    "file-transfers",
    "mcp-skill-archives",
    "stats-cache.json",
    "computer-use.lock",
    "server.lock",
    "api-dumps",
    "chrome",
    "downloads",
    "local-settings",
    "project-settings",
    "remote",
    "remote-control",
    "scratch",
    "seed-admin",
    "storage-v2",
    "systemd",
    ATOMIC_WRITE_DIRNAME,
  ]),
  dl = new Set(["settings.json", "settings.local.json", "claude.md"]);
/**
 * 判断快照条目是否位于 hooks 目录（或是顶层 hooks 文件），这类文件读入内存而非复制。
 */
//@ chunk-hm0ce8vc.js:15834-15954 placement
function isHookPathEntry(relPath) {
  let index = relPath.indexOf(sep);
  if (index === -1) return dl.has(relPath.toLowerCase());
  return relPath.slice(0, index).toLowerCase() === "hooks";
}
/**
 * 宿主配置超过快照大小上限时抛出，提示减小或设置 SELF_HOSTED_RUNNER_HOST_CONFIG_DIR。
 */
//@ chunk-hm0ce8vc.js:15954-16350 placement
class HostConfigOverCapError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e, n) {
    super(
      `host config exceeds ${e} bytes at ${n} \u2014 reduce it or set SELF_HOSTED_RUNNER_HOST_CONFIG_DIR to a slimmer dir (the limit covers the whole directory with --host-config-snapshot memory, and only settings*.json, CLAUDE.md and hooks/ with --host-config-snapshot disk)`,
      "host config exceeds the snapshot size limit",
    );
    this.name = "HostConfigOverCapError";
  }
}
/**
 * runner 启动后快照被改动时抛出；runner 拒绝再开会话直到重启。
 */
//@ chunk-hm0ce8vc.js:16350-16651 placement
class HostConfigSnapshotTamperedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  rel;
  what;
  constructor(e, n) {
    super(
      `Host config snapshot was modified after runner startup (${e}: ${n}) \u2014 restart the runner; it will not start sessions until then`,
      "host config snapshot modified after startup",
    );
    ((this.name = "HostConfigSnapshotTamperedError"), (this.rel = e), (this.what = n));
  }
}
/**
 * 会话配置路径已存在且不是普通目录/文件时抛出，拒绝穿透写入。
 */
//@ chunk-hm0ce8vc.js:16651-17105 placement
class HostConfigSeedTargetError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  target;
  constructor(e, n = "directory") {
    super(
      `Session config path ${e} exists and is not a plain ${n} \u2014 refusing to write session config through it; this session was not started. Remove that entry (most likely an earlier pickup of the session left it there). The runner keeps serving other sessions and does not need a restart`,
      "host config seed target is not a plain directory",
    );
    ((this.name = "HostConfigSeedTargetError"), (this.target = e));
  }
}
/**
 * 向会话种配置超时（多为 --base-dir 挂载不健康）。
 */
//@ chunk-hm0ce8vc.js:17105-17337 placement
class HostConfigSeedTimeoutError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e, n) {
    super(
      `Seeding host config into ${e} did not finish (${n.message}; check --base-dir mount health) \u2014 session not started`,
      "host config seed timed out",
    );
    this.name = "HostConfigSeedTimeoutError";
  }
}
/**
 * 快照条目读失败，本会话不启动，下个会话重试。
 */
//@ chunk-hm0ce8vc.js:17337-17582 placement
class HostConfigSnapshotReadError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e, n) {
    super(
      `Host config snapshot entry ${e} could not be read (${n}) \u2014 session not started; it will be retried on the next session`,
      "host config snapshot read failed",
    );
    this.name = "HostConfigSnapshotReadError";
  }
}
/**
 * 是否为上面四类快照/种入错误。
 */
//@ chunk-hm0ce8vc.js:17582-17671 placement
function isHostConfigSnapshotError(error) {
  return (
    error instanceof HostConfigSnapshotTamperedError ||
    error instanceof HostConfigSeedTargetError ||
    error instanceof HostConfigSeedTimeoutError ||
    error instanceof HostConfigSnapshotReadError
  );
}
/**
 * 生成"宿主配置未应用"的会话提示文本。
 */
//@ chunk-hm0ce8vc.js:17671-18015 placement
function formatHostConfigNotAppliedNotice(e, n) {
  return makeInformationalWarningMessage(
    e,
    `Host config from ${n.sourceDir} was not applied: ${n.message}. This session has none of the runner operator's user-level settings, skills, plugins or MCP servers. Operators: see --host-config-snapshot in the self-hosted runner guide; large plugin sets can also be pre-populated with CLAUDE_CODE_PLUGIN_SEED_DIR.`,
  );
}
/**
 * 生成"宿主配置只部分应用"的会话提示文本。
 */
//@ chunk-hm0ce8vc.js:18015-18288 placement
function formatHostConfigPartiallyAppliedNotice(e, n, r) {
  return makeInformationalWarningMessage(
    e,
    `Host config from ${n} was only partially applied: ${r}. Some of the runner operator's user-level settings, skills, plugins or MCP servers may be missing from this session. Operators: check free space and health of the runner's --base-dir.`,
  );
}
/**
 * 构造 system/informational 级别 warning 的 SDK 消息。
 */
//@ chunk-hm0ce8vc.js:18288-18400 placement
function makeInformationalWarningMessage(sessionId, content) {
  return {
    type: "system",
    subtype: "informational",
    level: "warning",
    uuid: randomUUID(),
    session_id: sessionId,
    content: content,
  };
}
/**
 * 顶层条目过滤：排除会话态文件、点文件、daemon/agent-memory、.claude*.json 及其备份等。
 */
//@ chunk-hm0ce8vc.js:18400-18705 placement
function shouldSnapshotTopLevelEntry(name) {
  let n = stripInvisibleChars(name);
  return (
    !al.has(n) &&
    !n.startsWith(".") &&
    !n.startsWith("daemon") &&
    !n.startsWith("agent-memory") &&
    !/^\.claude(-[a-z-]+)?\.json(\.backup)?$/.test(n) &&
    !/^\.config\.json(\.|$)/.test(n) &&
    !/^\.claude(-[a-z-]+)?\.json\./.test(n) &&
    !n.startsWith(".session_ingress_token") &&
    !isTempFileName(n) &&
    !eie(n)
  );
}
/**
 * 判断条目是否由宿主 skills 认领（claim-all 或在认领集合中）而应跳过。
 */
//@ chunk-hm0ce8vc.js:18705-18810 placement
function isClaimedByHostSkills(e, n, r, s) {
  if (il.has(stripInvisibleChars(e))) return !0;
  return stripInvisibleChars(n) === "skills" && (s === "claim-all" || s.has(y5t(r)));
}
/**
 * runner 启动时捕获宿主配置：校验 --base-dir 不在配置目录内，按 disk/memory 两种存储模式生成快照。
 */
//@ chunk-hm0ce8vc.js:18810-21863 placement
async function captureHostConfigSnapshot(e, n) {
  let storageV5 = n.storageV5,
    s = n.maxMemoryBytes ?? HOST_CONFIG_SNAPSHOT_MAX_BYTES,
    a =
      process.env.SELF_HOSTED_RUNNER_HOST_CONFIG_DIR ||
      process.env.CLAUDE_CONFIG_DIR ||
      join_2(homedir_2(), ".claude"),
    o = new Map(),
    l = { bytes: 0 },
    u = { mode: "memory" },
    h = new Set();
  try {
    let w = n.storage.mode === "memory";
    if (n.storage.mode === "disk" && isPathInside(n.storage.baseDir, a))
      (e(
        `[runner:startup] host config dir ${a} contains --base-dir ${n.storage.baseDir}; using --host-config-snapshot memory for this run`,
      ),
        (w = !0));
    else if (n.storage.mode === "disk") {
      let { baseDir: baseDir } = n.storage,
        A = { cancelled: !1 },
        G = captureHostConfigToDisk(a, baseDir, o, l, s, e, A),
        K = await withBoundedTimeout(
          G,
          rl,
          `[runner:stuck] host config disk snapshot ${a} \u2192 ${baseDir}`,
        ).catch((L) => {
          if (L instanceof BoundedTimeoutError) ((A.cancelled = !0), removeCapturedSnapshot(G));
          throw L;
        });
      if (K.outcome === "absent");
      else if (K.outcome === "disk_unavailable")
        (e(
          `[runner:startup] host config disk snapshot under ${baseDir} failed (${errorMessage(K.error)}); falling back to memory mode`,
        ),
          logFeatureSad("self_hosted_host_config", "host_config_disk_fallback"),
          o.clear(),
          (l.bytes = 0),
          (w = !0));
      else
        ((u = { mode: "disk", snapshotDir: K.snapshotDir, manifest: K.manifest }),
          (h = K.legacySkillsClaims));
    }
    if (w)
      h = await withBoundedTimeout(
        (async () => {
          let E = await readHostSkillsClaims(a);
          return (await walkHostConfigDir(a, "", o, l, s, E), E);
        })(),
        sl,
        `[runner:stuck] host config snapshot ${a}`,
      );
    if (h === "claim-all")
      e(
        `[runner:startup] ${join_2(a, HOST_SKILLS_CLAIMS_FILE)} exists but is unreadable or malformed \u2014 cannot tell org-synced skills from your own, so NO skills were seeded into sessions; delete that file (bookkeeping from an older skills-sync layout) to seed ${join_2(a, "skills")} again`,
      );
  } catch (error) {
    if (!isENOENT(error)) {
      e(
        `[runner:startup] host config snapshot from ${a} failed (sessions will start with empty config): ${error}`,
      );
      let E = error instanceof HostConfigOverCapError ? "over_cap" : "read_error";
      return (
        logFeatureBad(
          "self_hosted_host_config",
          E === "over_cap" ? "host_config_over_cap" : "host_config_read_error",
        ),
        { notApplied: { sourceDir: a, reason: E, message: errorMessage(error) } }
      );
    }
  }
  let envSelfHostedRunnerHostConfigDir = process.env.SELF_HOSTED_RUNNER_HOST_CONFIG_DIR,
    S;
  try {
    let E = envSelfHostedRunnerHostConfigDir
        ? await (async (G) => {
            for (let K of G)
              try {
                let L = await readFile_2(join_2(a, K), "utf8");
                if (L !== "") return L;
              } catch (error) {
                let D = getErrnoCode(error);
                if (D !== "ENOENT" && D !== "EISDIR" && D !== "ELOOP") throw error;
              }
            throw Object.assign(Error("ENOENT"), { code: "ENOENT" });
          })([
            ".config.json",
            `.claude${fileSuffixForOauthConfig()}.json`,
            ...OAUTH_GLOBAL_FILE_SUFFIXES.map((G) => `.claude${G}.json`),
          ])
        : isStorageV5Enabled() && storageV5 !== void 0
          ? await readGlobalConfigViaStorage(storageV5)
          : await readFile_2(getGlobalClaudeFile(), "utf8"),
      A = await jsonParse(E);
    if (A !== null && typeof A === "object") {
      let mcpServers = A.mcpServers;
      if (mcpServers !== null && typeof mcpServers === "object" && Object.keys(mcpServers).length > 0)
        S = mcpServers;
    }
  } catch {}
  if (S) {
    for (let [w, E] of Object.entries(S)) {
      let A = describeMcpServerShapeProblem(E);
      if (A !== void 0)
        (e(
          `[runner:warn] host mcpServers entry "${w}" has ${A} \u2014 ignoring (the Claude child would drop it silently)`,
        ),
          delete S[w]);
    }
    if (Object.keys(S).length === 0) S = void 0;
  }
  let T = o.size + (u.mode === "disk" ? u.manifest.size : 0);
  if (T === 0 && !S) {
    if (u.mode === "disk") await rm_2(u.snapshotDir, { recursive: !0, force: !0 }).catch(() => {});
    return;
  }
  let y = S ? `, ${Object.keys(S).length} mcpServer(s)` : "",
    toFixed = (l.bytes / 1024).toFixed(1);
  return (
    e(
      u.mode === "disk"
        ? `[runner:startup] host config snapshot (disk): ${T} file(s), ${toFixed} KiB from ${a} \u2192 ${u.snapshotDir}${y}`
        : `[runner:startup] host config snapshot: ${T} file(s), ${toFixed} KiB from ${a}${y}`,
    ),
    logFeatureOk("self_hosted_host_config"),
    { snapshot: { sourceDir: a, files: o, mcpServers: S, storage: u } }
  );
}
/**
 * 通过存储层读取全局配置 ~/.claude.json，缺失时抛 ENOENT。
 */
//@ chunk-hm0ce8vc.js:21863-22099 placement
async function readGlobalConfigViaStorage(storage) {
  let text = await storage.readText([STORAGE_SPACES.globalConfig()]);
  if (!text.ok) throw Error("global config not readable through storage");
  let r = text.value.items[0];
  if (!r?.found) throw Object.assign(Error("ENOENT"), { code: "ENOENT" });
  return r.value;
}
/**
 * 已知 MCP 传输类型集合（stdio/sse/http/streamable-http/ws/sdk/claudeai-proxy）。
 */
//@ chunk-hm0ce8vc.js:22099-22184 placement
var KNOWN_MCP_TRANSPORT_TYPES = new Set([
  "stdio",
  "sse",
  "http",
  "streamable-http",
  "ws",
  "sdk",
  "claudeai-proxy",
]);
/**
 * 检查 MCP 服务器条目形状，返回问题描述（无问题返回 undefined）。
 */
//@ chunk-hm0ce8vc.js:22184-22581 placement
function describeMcpServerShapeProblem(server) {
  if (server === null || typeof server !== "object" || Array.isArray(server))
    return `a non-object value (${server === null ? "null" : Array.isArray(server) ? "array" : typeof server})`;
  let n = server.type;
  if (n === void 0) {
    if ("url" in server && !("command" in server))
      return 'a "url" but no "type" (add "type": "http", "sse", or "ws")';
    return;
  }
  if (typeof n !== "string") return `a non-string type (${typeof n})`;
  if (!KNOWN_MCP_TRANSPORT_TYPES.has(n)) return `unsupported type "${n}"`;
  return;
}
//@ chunk-hm0ce8vc.js:22581-22597 placement
var HOST_CONFIG_SNAPSHOT_MAX_BYTES = 67108864;
/**
 * 读取宿主 skills 认领文件；过大或读失败返回 "claim-all"。
 */
//@ chunk-hm0ce8vc.js:22597-22808 placement
async function readHostSkillsClaims(hostDir) {
  let n = join_2(hostDir, HOST_SKILLS_CLAIMS_FILE),
    r;
  try {
    if ((await stat(n)).size > cet) return "claim-all";
    r = await readFile_2(n, "utf8");
  } catch (error) {
    let a = getErrnoCode(error);
    return a === "ENOENT" || a === "ENOTDIR" ? new Set() : "claim-all";
  }
  return parseSkillsSyncManifest(r, join_2(hostDir, "skills"));
}
/**
 * 递归遍历宿主配置目录，累计字节并收集要快照的文件。
 */
//@ chunk-hm0ce8vc.js:22808-23237 placement
async function walkHostConfigDir(e, n, r, s, a, o) {
  let l = await readdir(join_2(e, n), { withFileTypes: !0 });
  for (let u of l) {
    if (n === "" && !shouldSnapshotTopLevelEntry(u.name)) continue;
    let h = n === "" ? u.name : join_2(n, u.name);
    if (isClaimedByHostSkills(h, n, u.name, o)) continue;
    if (u.isDirectory()) await walkHostConfigDir(e, h, r, s, a, o);
    else if (u.isFile()) {
      let p = join_2(e, h),
        S = await stat(p);
      if (((s.bytes += S.size), s.bytes > a)) throw new HostConfigOverCapError(a, h);
      let T = await readFile_2(p);
      if (((s.bytes += T.length - S.size), s.bytes > a)) throw new HostConfigOverCapError(a, h);
      r.set(h, { buf: T, mode: S.mode & 511 });
    }
  }
}
/**
 * 若快照已落盘，删除其目录（尽力而为）。
 */
//@ chunk-hm0ce8vc.js:23237-23358 placement
async function removeCapturedSnapshot(snapshotPromise) {
  try {
    let n = await snapshotPromise;
    if (n.outcome === "captured") await rm_2(n.snapshotDir, { recursive: !0, force: !0 });
  } catch {}
}
//@ chunk-hm0ce8vc.js:23358-23440 placement
function isPathInside(parent, child) {
  let r = relative(resolve_2(child), resolve_2(parent));
  return r === "" || (!r.startsWith("..") && !isAbsolute(r));
}
/**
 * 快照目录写失败。
 */
//@ chunk-hm0ce8vc.js:23608-23759 placement
class SnapshotDirWriteError extends Error {
  original;
  constructor(e) {
    super("host config snapshot directory write failed");
    this.original = e;
    this.name = "SnapshotDirWriteError";
  }
}
/**
 * 匹配快照目录名（主机名-pid-随机串），用于清理陈旧快照。
 */
//@ chunk-hm0ce8vc.js:23759-23836 placement
var HOST_CONFIG_SNAPSHOT_DIR_PATTERN = /^\.host-config-snapshot-([A-Za-z0-9_.]{1,64})-(\d+)-[A-Za-z0-9]{6}$/;
//@ chunk-hm0ce8vc.js:23836-23927 placement
function getSanitizedHostname() {
  let sliced = hostname_2()
    .replace(/[^A-Za-z0-9_.]/g, "_")
    .slice(0, 64);
  return sliced === "" ? "host" : sliced;
}
//@ chunk-hm0ce8vc.js:23927-23978 placement
function getSnapshotDirPrefixForThisProcess() {
  return `${ol}${getSanitizedHostname()}-${process.pid}-`;
}
//@ chunk-hm0ce8vc.js:23978-23993 placement
var Sa = new Set();
//@ chunk-hm0ce8vc.js:23993-24072 placement
function isProcessAlive(pid) {
  try {
    return (process.kill(pid, 0), !0);
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
/**
 * 启动时删除本机已退出 runner 留下的快照目录；其他主机的快照只提示，不删除。
 */
//@ chunk-hm0ce8vc.js:24072-24631 placement
async function removeStaleHostConfigSnapshots(e, n) {
  let r = await readdir(e),
    s = getSanitizedHostname(),
    a = 0;
  for (let o of r) {
    let match = HOST_CONFIG_SNAPSHOT_DIR_PATTERN.exec(o);
    if (!match) continue;
    if (match[1] !== s) {
      a++;
      continue;
    }
    let u = join_2(e, o),
      h = Number(match[2]);
    if (Sa.has(u) || (h !== process.pid && isProcessAlive(h))) continue;
    try {
      (await rm_2(u, { recursive: !0, force: !0 }),
        n(`[runner:startup] removed stale host config snapshot ${u}`));
    } catch (error) {
      n(`[runner:warn] could not remove stale host config snapshot ${u}: ${errorMessage(error)}`);
    }
  }
  if (a > 0)
    n(
      `[runner:warn] kept ${a} host config snapshot dir(s) from other hosts under ${e} \u2014 concurrently running runners should not share a --base-dir filesystem`,
    );
}
//@ chunk-hm0ce8vc.js:24631-24736 placement
async function writeAll(e, n) {
  let r = 0;
  while (r < n.length) {
    let { bytesWritten: bytesWritten } = await e.write(n, r, n.length - r);
    r += bytesWritten;
  }
}
/**
 * 以 disk 模式把宿主配置复制到快照目录，捕获期间目录变化则报错。
 */
//@ chunk-hm0ce8vc.js:24736-25540 placement
async function captureHostConfigToDisk(e, n, r, s, a, o, l) {
  try {
    await removeStaleHostConfigSnapshots(n, o);
  } catch (error) {
    return { outcome: "disk_unavailable", error: error };
  }
  try {
    await readdir(e);
  } catch (error) {
    if (isENOENT(error)) return { outcome: "absent" };
    throw error;
  }
  let u = await readHostSkillsClaims(e),
    h;
  try {
    h = await mkdtemp(join_2(n, getSnapshotDirPrefixForThisProcess()));
  } catch (error) {
    return { outcome: "disk_unavailable", error: error };
  }
  let p = {
    hostDir: e,
    snapshotDir: h,
    files: r,
    acc: s,
    heapBytes: 0,
    maxHeapBytes: a,
    legacySkillsClaims: u,
    manifest: new Map(),
    chunk: Buffer.allocUnsafe(ia),
    onStatus: o,
    cancel: l,
  };
  try {
    await copyHostConfigTree(p, "");
  } catch (error) {
    if ((await rm_2(h, { recursive: !0, force: !0 }).catch(() => {}), error instanceof SnapshotDirWriteError))
      return { outcome: "disk_unavailable", error: error.original };
    if (isENOENT(error))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `host config dir changed while it was being captured (${errorMessage(error)})`,
        "host config dir changed during capture",
      );
    throw error;
  }
  return (Sa.add(h), { outcome: "captured", snapshotDir: h, manifest: p.manifest, legacySkillsClaims: u });
}
/**
 * 递归复制配置树：hooks 读入内存，其余写入快照。
 */
//@ chunk-hm0ce8vc.js:25540-25851 placement
async function copyHostConfigTree(ctx, relDir) {
  let r = await readdir(join_2(ctx.hostDir, relDir), { withFileTypes: !0 });
  for (let s of r) {
    if ((throwIfHostConfigCancelled(ctx.cancel), relDir === "" && !shouldSnapshotTopLevelEntry(s.name)))
      continue;
    let a = relDir === "" ? s.name : join_2(relDir, s.name);
    if (isClaimedByHostSkills(a, relDir, s.name, ctx.legacySkillsClaims)) continue;
    if (s.isDirectory()) await copyHostConfigTree(ctx, a);
    else if (s.isFile())
      if (isHookPathEntry(a)) await readHookFileIntoMemory(ctx, a);
      else await copyFileIntoSnapshot(ctx, a);
  }
}
//@ chunk-hm0ce8vc.js:25851-25964 placement
function reportEntryDisappearedDuringCapture(e, n) {
  e.onStatus(`[runner:startup] host config snapshot: skipping ${n} (disappeared during capture)`);
}
/**
 * 把 hooks 下的文件读入内存（计入内存上限）。
 */
//@ chunk-hm0ce8vc.js:25964-26318 placement
async function readHookFileIntoMemory(e, n) {
  let r = join_2(e.hostDir, n),
    s,
    a;
  try {
    if (((s = await stat(r)), (e.heapBytes += s.size), e.heapBytes > e.maxHeapBytes))
      throw new HostConfigOverCapError(e.maxHeapBytes, n);
    a = await readFile_2(r);
  } catch (error) {
    if (isENOENT(error)) {
      reportEntryDisappearedDuringCapture(e, n);
      return;
    }
    throw error;
  }
  if (((e.heapBytes += a.length - s.size), e.heapBytes > e.maxHeapBytes))
    throw new HostConfigOverCapError(e.maxHeapBytes, n);
  (e.files.set(n, { buf: a, mode: s.mode & 511 }), (e.acc.bytes += a.length));
}
/**
 * 以不跟随链接方式打开源文件，复制到快照并计算 sha256。
 */
//@ chunk-hm0ce8vc.js:26318-27009 placement
async function copyFileIntoSnapshot(e, n) {
  let r;
  try {
    r = await open_2(join_2(e.hostDir, n), getNoFollowReadFlags());
  } catch (error) {
    if (isENOENT(error)) {
      reportEntryDisappearedDuringCapture(e, n);
      return;
    }
    throw error;
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile()) return;
    let a = stats.mode & 511,
      o = join_2(e.snapshotDir, n),
      l;
    try {
      (await mkdir_2(dirname_2(o), { recursive: !0 }), (l = await open_2(o, "wx", 384)));
    } catch (error) {
      throw new SnapshotDirWriteError(error);
    }
    let u = createHash("sha256"),
      h = 0;
    try {
      let { chunk: chunk } = e;
      for (;;) {
        throwIfHostConfigCancelled(e.cancel);
        let { bytesRead: bytesRead } = await r.read(chunk, 0, chunk.length, null);
        if (bytesRead === 0) break;
        let chunk_2 = chunk.subarray(0, bytesRead);
        u.update(chunk_2);
        try {
          await writeAll(l, chunk_2);
        } catch (error) {
          throw new SnapshotDirWriteError(error);
        }
        h += bytesRead;
      }
    } catch (error) {
      throw (await l.close().catch(() => {}), error);
    }
    try {
      await l.close();
    } catch (error) {
      throw new SnapshotDirWriteError(error);
    }
    (e.manifest.set(n, { sha256: u.digest("hex"), size: h, mode: a }), (e.acc.bytes += h));
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-hm0ce8vc.js:27009-27051 placement
var CCR_GIT_DIR_NAME = ".ccr-git",
  Tl = [".ccr-launcher", CCR_GIT_DIR_NAME];
/**
 * 检查 git 目录下的 hooks 是否为普通目录（是其他类型时记日志并返回 false），文件系统操作有卡住超时。
 */
//@ chunk-hm0ce8vc.js:27051-27354 placement
async function isHooksDirSafe(e, n, r = Hln) {
  let s = join_2(e, "hooks"),
    a = await withBoundedTimeout(
      lstat_2(s).catch((o) => (isENOENT(o) ? void 0 : Promise.reject(o))),
      r,
      `[runner:stuck] fs op 'lstat ${s}' (check mount health)`,
    );
  if (a !== void 0 && !a.isDirectory())
    return (n(`[runner:session] ${s} exists and is not a plain directory \u2014 not following`), !1);
  return !0;
}
/**
 * 记录已发现快照问题的 WeakMap，后续会话直接复用错误。
 */
//@ chunk-hm0ce8vc.js:27354-27387 placement
var seededSnapshotErrors = new WeakMap(),
  yl = 1e4,
  bl = 1e4;
/**
 * 把快照种入会话配置目录；发现篡改时记录并拒绝。
 */
//@ chunk-hm0ce8vc.js:27387-28773 placement
async function seedHostConfigForSession(e, n, r, s, a = fileSuffixForOauthConfig()) {
  if (!n) return { outcome: "seeded" };
  let o = seededSnapshotErrors.get(n);
  if (o !== void 0) {
    let h = new HostConfigSnapshotTamperedError(
      o.rel,
      `${o.what}; found by an earlier session on this runner`,
    );
    throw (
      s(`[runner:error] ${h.message}`),
      logFeatureBad("self_hosted_host_config", "host_config_tampered"),
      h
    );
  }
  let l = {
      files: 0,
      bytes: 0,
      names: [],
      published: [],
      cancelTakesBack: n.storage.mode === "disk",
      cancel: { cancelled: !1 },
    },
    u = `[runner:stuck] seed write \u2192 ${e}`;
  try {
    if (
      (await withBoundedTimeout(seedHostConfigFromMemory(e, n, a, l, s), HOST_CONFIG_CAPTURE_TIMEOUT_MS, u),
      l.files > 0 || n.mcpServers)
    ) {
      let h = n.mcpServers ? `.claude.json[mcpServers\xD7${Object.keys(n.mcpServers).length}]` : void 0,
        p =
          n.storage.mode === "disk"
            ? [`${l.files} file(s), ${(l.bytes / 1024).toFixed(1)} KiB`, ...(h ? [h] : [])].join(", ")
            : [...l.names, ...(h ? [h] : [])].join(", ");
      r(`[runner:session] Seeded ${p} from host config snapshot (${n.sourceDir})`);
    }
    return { outcome: "seeded" };
  } catch (error) {
    let p = error;
    if (error instanceof BoundedTimeoutError && n.storage.mode === "disk")
      ((l.cancel.cancelled = !0),
        (p = new HostConfigSeedTimeoutError(e, error)),
        s(`[runner:error] ${errorMessage(p)}`),
        logFeatureBad("self_hosted_host_config", "host_config_seed_timeout"));
    if (isHostConfigSnapshotError(p)) {
      if (l.published.length > 0)
        await withBoundedTimeout(
          unlinkAllReverse(l.published),
          bl,
          `[runner:stuck] remove the files seeded into ${e}`,
        ).catch((S) => s(`[runner:error] could not remove the files seeded into ${e}: ${errorMessage(S)}`));
      throw p;
    }
    return (
      s(`[runner:session] Seed write to ${e} failed (best-effort): ${error}`),
      (l.cancel.cancelled = !0),
      logFeatureSad("self_hosted_host_config", "host_config_seed_partial"),
      { outcome: "partial", error: errorMessage(error) }
    );
  }
}
/**
 * memory 模式：把内存中的文件逐个写入会话配置目录。
 */
//@ chunk-hm0ce8vc.js:28773-30278 placement
async function seedHostConfigFromMemory(e, n, r, s, a) {
  let o = n.storage.mode === "disk",
    { cancel: cancel } = s;
  try {
    let u = new Set();
    (await ensurePlainDirectory(e), throwIfHostConfigCancelled(cancel));
    let h = await isHooksDirSafe(e, a, yl);
    if ((throwIfHostConfigCancelled(cancel), !h)) throw new HostConfigSeedTargetError(join_2(e, "hooks"));
    for (let [p, { buf: S, mode: T }] of n.files) {
      throwIfHostConfigCancelled(cancel);
      let lower = p.toLowerCase();
      if (Tl.some((v) => lower.startsWith("hooks" + sep + v + sep) || lower === "hooks" + sep + v)) continue;
      if (
        (await ensureParentDirsPlain(e, p, u, cancel),
        await writeViaTempAndRename(e, p, T, s, (v) => writeAll(v, S)),
        !o)
      )
        s.names.push(p);
      (s.files++, (s.bytes += S.length));
    }
    if (n.storage.mode === "disk") {
      let { snapshotDir: snapshotDir, manifest: manifest } = n.storage;
      if (manifest.size > 0) {
        let y = await lstat_2(snapshotDir).catch((v) => {
          if (isENOENT(v)) return;
          throw new HostConfigSnapshotReadError(basename(snapshotDir), getErrnoCode(v) ?? errorMessage(v));
        });
        if (y === void 0 || !y.isDirectory())
          throw new HostConfigSnapshotTamperedError(
            basename(snapshotDir),
            `the snapshot directory ${snapshotDir} was removed or replaced after runner startup (another runner or a cleanup job sharing --base-dir?)`,
          );
      }
      let allocUnsafe = Buffer.allocUnsafe(ia);
      for (let [y, v] of manifest)
        (throwIfHostConfigCancelled(cancel),
          await ensureParentDirsPlain(e, y, u, cancel),
          await verifyAndCopySnapshotEntry(snapshotDir, e, y, v, allocUnsafe, s),
          s.files++,
          (s.bytes += v.size));
    }
    if (n.mcpServers) {
      throwIfHostConfigCancelled(cancel);
      let p = await jsonStringify({ mcpServers: n.mcpServers }),
        S = `.claude${r}.json`;
      await writeViaTempAndRename(e, S, 384, s, (T) => writeAll(T, Buffer.from(p)));
    }
  } catch (error) {
    if (error instanceof HostConfigSnapshotTamperedError) {
      let h = !seededSnapshotErrors.has(n);
      if (h) seededSnapshotErrors.set(n, { rel: error.rel, what: error.what });
      if ((a(`[runner:error] ${error.message}`), h))
        a("[runner:error] this runner now refuses to start sessions until it is restarted \u2014 replace it");
      logFeatureBad("self_hosted_host_config", "host_config_tampered");
    } else if (error instanceof HostConfigSeedTargetError)
      (a(`[runner:error] ${error.message}`),
        logFeatureBad("self_hosted_host_config", "host_config_seed_target"));
    else if (error instanceof HostConfigSnapshotReadError)
      (a(`[runner:error] ${error.message}`), logFeatureBad("self_hosted_host_config", "host_config_seed_io"));
    throw error;
  }
}
/**
 * 确保路径是普通目录（不存在则 0700 创建），否则抛 HostConfigSeedTargetError。
 */
//@ chunk-hm0ce8vc.js:30278-30514 placement
async function ensurePlainDirectory(path) {
  let r = await lstat_2(path).catch((s) => (isENOENT(s) ? void 0 : Promise.reject(s)));
  if (r === void 0)
    try {
      return (await mkdir_2(path, { mode: 448 }), "made");
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
      r = await lstat_2(path);
    }
  if (!r.isDirectory()) throw new HostConfigSeedTargetError(path);
  return "found";
}
//@ chunk-hm0ce8vc.js:30514-30722 placement
async function ensureSessionConfigDirs(e, n) {
  await mkdir_2(e, { recursive: !0, mode: 448 });
  try {
    let r = [];
    for (let s of n) r.push(await ensurePlainDirectory(s));
    return r;
  } catch (error) {
    if (error instanceof HostConfigSeedTargetError)
      logFeatureBad("self_hosted_host_config", "host_config_seed_target");
    throw error;
  }
}
/**
 * 逐级确认父目录是普通目录。
 */
//@ chunk-hm0ce8vc.js:30722-31054 placement
async function ensureParentDirsPlain(e, n, r, s) {
  let sliced = n.split(sep).slice(0, -1),
    o = "";
  for (let l of sliced) {
    if (((o = o === "" ? l : join_2(o, l)), r.has(o))) continue;
    throwIfHostConfigCancelled(s);
    let u = join_2(e, o),
      h = await lstat_2(u).catch((p) => (isENOENT(p) ? void 0 : Promise.reject(p)));
    if (h === void 0)
      try {
        await mkdir_2(u);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        h = await lstat_2(u);
      }
    if (h !== void 0 && !h.isDirectory()) throw new HostConfigSeedTargetError(u);
    r.add(o);
  }
}
/**
 * 原子写会话配置文件（先写 .seed- 临时文件再改名）。
 */
//@ chunk-hm0ce8vc.js:31054-31264 placement
async function writeSessionFileAtomically(e, n, r, s, a = { cancelled: !1 }) {
  let o = { cancel: a, published: [], cancelTakesBack: !0 };
  (await ensurePlainDirectory(e), await ensureParentDirsPlain(e, n, new Set(), o.cancel));
  let l = typeof r === "string" ? Buffer.from(r) : r;
  await writeViaTempAndRename(e, n, s, o, (u) => writeAll(u, l));
}
//@ chunk-hm0ce8vc.js:31264-31744 placement
async function writeViaTempAndRename(e, n, r, s, a) {
  let { cancel: cancel } = s,
    l = join_2(e, n),
    u = await lstat_2(l).catch((S) => (isENOENT(S) ? void 0 : Promise.reject(S)));
  if (u !== void 0 && !u.isFile() && !u.isSymbolicLink()) throw new HostConfigSeedTargetError(l, "file");
  let h = join_2(dirname_2(l), `.${basename(l)}.seed-${randomUUID().slice(0, 8)}`);
  throwIfHostConfigCancelled(cancel);
  let p = await open_2(h, "wx", r);
  try {
    if (
      (await a(p),
      await p.close(),
      throwIfHostConfigCancelled(cancel),
      await renameOverPlainFile(h, l),
      s.published.push(l),
      cancel.cancelled)
    ) {
      if (s.cancelTakesBack) await unlink(l).catch(() => {});
      throwIfHostConfigCancelled(cancel);
    }
  } catch (error) {
    throw (await p.close().catch(() => {}), await unlink(h).catch(() => {}), error);
  }
}
//@ chunk-hm0ce8vc.js:31744-31866 placement
async function unlinkAllReverse(e) {
  let n;
  for (let r = e.length - 1; r >= 0; r--)
    try {
      await unlink(e[r]);
    } catch (error) {
      if (!isENOENT(error)) n ??= error;
    }
  if (n !== void 0) throw n;
}
//@ chunk-hm0ce8vc.js:31866-32169 placement
async function renameOverPlainFile(e, n) {
  try {
    await retryFsOp(e, n, rename);
    return;
  } catch (error) {
    let a = getErrnoCode(error);
    if (!(a !== void 0 && a !== "EXDEV" && (AI.has(a) || (a === "EACCES" && !1)))) throw error;
  }
  let r = await lstat_2(n).catch((s) => (isENOENT(s) ? void 0 : Promise.reject(s)));
  if (r !== void 0) {
    if (!r.isFile() && !r.isSymbolicLink()) throw new HostConfigSeedTargetError(n, "file");
    await unlink(n);
  }
  await retryFsOp(e, n, rename);
}
/**
 * 描述快照条目被替换成什么（socket、设备节点、非普通文件）。
 */
//@ chunk-hm0ce8vc.js:32240-32475 placement
async function describeChangedEntry(e) {
  let n;
  try {
    n = await lstat_2(e);
  } catch {
    return;
  }
  if (n.isFile()) return;
  if (n.isSocket()) return "replaced by a socket";
  if (n.isCharacterDevice() || n.isBlockDevice()) return "replaced by a device node";
  return "no longer a regular file";
}
//@ chunk-hm0ce8vc.js:32475-32727 placement
function describeOpenErrno(code) {
  switch (code) {
    case "ENOENT":
      return "missing";
    case "ELOOP":
      return "replaced by a symlink";
    case "ENOTDIR":
      return "a parent directory was replaced";
    case "EISDIR":
      return "replaced by a directory";
    default:
      return `no longer readable by the runner (${code})`;
  }
}
/**
 * 以快照为准逐个校验条目（大小、sha256、类型），检测被替换/截断/内容变化。
 */
//@ chunk-hm0ce8vc.js:32727-33548 placement
async function verifyAndCopySnapshotEntry(e, n, r, s, a, o) {
  let { cancel: cancel } = o,
    u;
  try {
    u = await open_2(join_2(e, r), getNoFollowReadFlags());
  } catch (error) {
    let p = getErrnoCode(error);
    if (p !== void 0 && isFsInaccessible_2.has(p))
      throw new HostConfigSnapshotTamperedError(r, describeOpenErrno(p));
    let S = await describeChangedEntry(join_2(e, r));
    if (S !== void 0) throw new HostConfigSnapshotTamperedError(r, S);
    throw new HostConfigSnapshotReadError(r, p ?? errorMessage(error));
  }
  try {
    let h;
    try {
      h = await u.stat();
    } catch (error) {
      throw new HostConfigSnapshotReadError(r, getErrnoCode(error) ?? errorMessage(error));
    }
    if (!h.isFile()) throw new HostConfigSnapshotTamperedError(r, "no longer a regular file");
    if (h.size !== s.size)
      throw new HostConfigSnapshotTamperedError(r, `size is ${h.size} bytes, was ${s.size}`);
    await writeViaTempAndRename(n, r, s.mode, o, async (p) => {
      let S = createHash("sha256"),
        size = s.size;
      while (size > 0) {
        throwIfHostConfigCancelled(cancel);
        let y;
        try {
          ({ bytesRead: y } = await u.read(a, 0, Math.min(a.length, size), null));
        } catch (error) {
          throw new HostConfigSnapshotReadError(r, getErrnoCode(error) ?? errorMessage(error));
        }
        if (y === 0) throw new HostConfigSnapshotTamperedError(r, "shrank while being copied");
        let chunk = a.subarray(0, y);
        (S.update(chunk), await writeAll(p, chunk), (size -= y));
      }
      if (S.digest("hex") !== s.sha256) throw new HostConfigSnapshotTamperedError(r, "content changed");
    });
  } finally {
    await u.close().catch(() => {});
  }
}
/**
 * 公版构建里的空实现（runner 令牌续期）。
 */
//@ chunk-hm0ce8vc.js:33548-33731 placement
function startRunnerTokenRefresher({
  baseUrl: baseUrl,
  getRunnerToken: getRunnerToken,
  renewRunnerToken: renewRunnerToken,
  renewSessionTokens: renewSessionTokens,
  isThawing: isThawing,
  getRetireAtMs: getRetireAtMs,
  isStopping: isStopping,
  isHeldOff: isHeldOff,
  onGranted: onGranted,
  clock: clock,
  onStatus: onStatus,
  onDebug: onDebug,
}) {
  return;
}
/**
 * 公版构建里的空实现。
 */
//@ chunk-hm0ce8vc.js:33731-33772 placement
function startClockSkewMonitor({ clock: clock, onStatus: onStatus }) {
  return;
}
//@ chunk-hm0ce8vc.js:33838-33849 placement
var Ll = 1e4;
/**
 * 带超时检查 --base-dir 可创建且可写，失败时提示 NFS/CSI 挂载健康或设置 SELF_HOSTED_RUNNER_BASE_DIR。
 */
//@ chunk-hm0ce8vc.js:33849-34271 placement
async function checkBaseDirWritable(e, n = Ll, r = (s) => console.error(s)) {
  try {
    await withBoundedTimeout(
      mkdir_3(e, { recursive: !0 }).then(() => access(e, constants_3.W_OK | constants_3.X_OK)),
      n,
      `base directory check for ${e}`,
    );
  } catch (error) {
    let a = errorMessage(error);
    if (a.includes("timed out after"))
      (r(`[runner:fatal] ${a} \u2014 check NFS/CSI mount health`), process.exit(1));
    throw Error(
      `cannot create or write to base directory ${e} (${getErrnoCode(error) ?? a}); pass --base-dir <writable path> or set SELF_HOSTED_RUNNER_BASE_DIR`,
    );
  }
}
//@ chunk-hm0ce8vc.js:34371-34393 placement
function Wo(e) {
  return;
}
//@ chunk-hm0ce8vc.js:34393-34464 placement
function Oa(e, n) {
  return uniq([join_3(e, "git"), Wo(n)].filter((r) => r !== void 0));
}
/**
 * 启动会话子进程前清除的 git 全局环境变量。
 */
//@ chunk-hm0ce8vc.js:34464-34601 placement
var GIT_ENV_VARS_TO_CLEAR = new Set([
  ...dre.filter((e) => e !== "GIT_CONFIG_GLOBAL"),
  "GIT_TEMPLATE_DIR",
  "GIT_EXEC_PATH",
  "GIT_GRAFT_FILE",
  "GIT_REPLACE_REF_BASE",
]);
//@ chunk-hm0ce8vc.js:34601-34693 placement
var CODE_REVIEW_TOKEN_HANDOFF_FD = 4,
  Na = 5,
  CODE_REVIEW_TOKEN_HANDOFF = "code_review_token_handoff",
  Ma = ["pipe", "pipe", "pipe", "pipe", "pipe", "pipe"];
/**
 * 构造把宿主认证相关环境变量全部置空的覆盖表。
 */
//@ chunk-hm0ce8vc.js:34693-35012 placement
function buildClearedAuthEnv() {
  return {
    ...Object.fromEntries(che.map((e) => [e, void 0])),
    CLAUDE_BG_AUTH_SNAPSHOT_PATH: void 0,
    CLAUDE_CODE_HOST_AUTH_ENV_VAR: void 0,
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: void 0,
    CLAUDE_CODE_OAUTH_TOKEN: void 0,
    CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR: String(CODE_REVIEW_TOKEN_HANDOFF_FD),
    CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: String(Na),
  };
}
/**
 * （误归 computerUse/mcpServer）把 sessionToken / inferenceToken 写入子进程额外的 stdio 管道并关闭。
 */
//@ chunk-hm0ce8vc.js:35012-35228 placement = runComputerUseMcpServer (0.426)
function writeChildSessionTokens(e, tokens, onError) {
  try {
    let stdio = e.stdio,
      sessionTokenPipe = stdio[CODE_REVIEW_TOKEN_HANDOFF_FD],
      inferenceTokenPipe = stdio[Na];
    if (
      !sessionTokenPipe ||
      !("end" in sessionTokenPipe) ||
      !inferenceTokenPipe ||
      !("end" in inferenceTokenPipe)
    )
      return !1;
    return (
      sessionTokenPipe.on("error", onError),
      inferenceTokenPipe.on("error", onError),
      sessionTokenPipe.end(`${tokens.sessionToken}
`),
      inferenceTokenPipe.end(`${tokens.inferenceToken}
`),
      !0
    );
  } catch {
    return !1;
  }
}

export {
  writeSessionFileAtomically,
  ensureSessionConfigDirs,
  isHostConfigSnapshotError,
  formatHostConfigNotAppliedNotice,
  seedHostConfigForSession,
  formatHostConfigPartiallyAppliedNotice,
  isHooksDirSafe,
  buildClearedAuthEnv,
  Ma,
  writeChildSessionTokens,
  CCR_GIT_DIR_NAME,
  Wo,
  checkBaseDirWritable,
  CODE_REVIEW_TOKEN_HANDOFF,
  Oa,
  startClockSkewMonitor,
  startRunnerTokenRefresher,
  captureHostConfigSnapshot,
};
