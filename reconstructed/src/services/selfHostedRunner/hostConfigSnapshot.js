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
import { constants } from "fs";
import { join, sep, relative, resolve, isAbsolute, dirname, basename } from "path";
import { randomUUID, createHash } from "crypto";
import { homedir, hostname } from "os";
import {
  readFile,
  rm,
  stat,
  readdir,
  mkdtemp,
  open,
  mkdir,
  lstat,
  unlink,
  rename,
  access,
  constants as constants_3,
} from "fs/promises";
import {
  SYNCED_MANIFEST_FILE,
  SKILLS_SYNC_DIR_2,
  SKILLS_SYNC_DIR,
  SKILLS_TRASH_DIR,
  SKILLS_SYNCED_STAGING,
  PLUGINS_SYNC_DIR,
  stripInvisibleChars,
  foldNameForSync,
  parseSkillsSyncManifest,
} from "../../utils/plugins/syncedItems.js";
import { signatureFileFor, signatureIatFileFor } from "../../utils/settings/policyCertificates.js";
import { stampPathFor } from "../policyLimits/cacheStamp.js";
import { syncStampPath, REMOTE_SETTINGS_CONSENT_FILE } from "../remoteManagedSettings/consentRecords.js";
import { HELPER_CONSENT_STATE_ID } from "../remoteManagedSettings/remoteSettingsState.js";
import { CCR_HOME_SEED_JSON } from "../../utils/teleport/homeSeed.js";
import { ATOMIC_WRITE_DIRNAME, ATOMIC_WRITE_ERRNOS } from "../../utils/plugins/safeCopy.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isENOENT,
  getErrnoCode,
  isFsInaccessible_2,
} from "../../utils/errors.js";
import { isTempFileName, retryFsOp } from "../../utils/atomicPublishWrite.js";
import { isHashTempFile } from "../memorySync/syncFiles.js";
import { withBoundedTimeout, BoundedTimeoutError, FS_OP_TIMEOUT_MS } from "../../utils/boundedTimeout.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { fileSuffixForOauthConfig, OAUTH_GLOBAL_FILE_SUFFIXES } from "../../constants/oauth.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getGlobalClaudeFile } from "../../utils/env.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { MAX_SYNCED_SKILL_BYTES } from "../../utils/claudeAiSync/skillsSync.js";
import { throwIfHostConfigCancelled } from "../../entrypoints/sdk/controlSchemas.js";
import { uniq } from "../../utils/collections.js";
import { GIT_ENV_VARS_TO_CLEAR as GIT_ENV_VARS_TO_CLEAR_2 } from "../../utils/git/gitSafeEnv.js";
import { TOKEN_FD_ENV_VARS } from "../../utils/managedEnvConstants.js";

//@ chunk-hm0ce8vc.js:14506-14578 placement
/**
 * 宿主配置快照目录名前缀 ".host-config-snapshot-"。
 */
var HOST_CONFIG_CAPTURE_TIMEOUT_MS = 300000;
var HOST_CONFIG_SNAPSHOT_TIMEOUT_MS = 300000;
var HOST_CONFIG_MEMORY_TIMEOUT_MS = 60000;
var SNAPSHOT_DIR_PREFIX = ".host-config-snapshot-";
var SNAPSHOT_CHUNK_BYTES = 1048576;
//@ chunk-hm0ce8vc.js:14578-14672 placement
/**
 * 打开文件的标志：Windows 只读，其他平台加 O_NOFOLLOW|O_NONBLOCK，防止跟随符号链接或阻塞在 FIFO 上。
 */
function getNoFollowReadFlags(platform = "linux") {
  return platform === "win32"
    ? constants.O_RDONLY
    : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
}
//@ chunk-hm0ce8vc.js:14672-15834 placement
/**
 * 宿主配置目录里的 skills 子目录；同一声明还定义了快照时要排除的会话态文件集合（.claude.json、凭据、projects、sessions、logs 等）。
 */
var HOST_SKILLS_CLAIMS_FILE = join("skills", SYNCED_MANIFEST_FILE);
var SYNCED_SKILL_PATHS = new Set([
  SKILLS_SYNC_DIR_2,
  SKILLS_SYNC_DIR,
  SKILLS_TRASH_DIR,
  HOST_SKILLS_CLAIMS_FILE,
  SKILLS_SYNCED_STAGING,
  PLUGINS_SYNC_DIR,
]);
var HOST_CONFIG_EXCLUDED_NAMES = new Set([
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
  stampPathFor("policy-limits.json"),
  syncStampPath("remote-settings.json"),
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
]);
var HOST_ROOT_SETTINGS_FILE_NAMES = new Set(["settings.json", "settings.local.json", "claude.md"]);
//@ chunk-hm0ce8vc.js:15834-15954 placement
/**
 * 判断快照条目是否位于 hooks 目录（或是顶层 hooks 文件），这类文件读入内存而非复制。
 */
function isHookPathEntry(relPath) {
  let index = relPath.indexOf(sep);
  if (index === -1) return HOST_ROOT_SETTINGS_FILE_NAMES.has(relPath.toLowerCase());
  return relPath.slice(0, index).toLowerCase() === "hooks";
}
//@ chunk-hm0ce8vc.js:15954-16350 placement
/**
 * 宿主配置超过快照大小上限时抛出，提示减小或设置 SELF_HOSTED_RUNNER_HOST_CONFIG_DIR。
 */
class HostConfigOverCapError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(maxHeapBytes, n) {
    super(
      `host config exceeds ${maxHeapBytes} bytes at ${n} \u2014 reduce it or set SELF_HOSTED_RUNNER_HOST_CONFIG_DIR to a slimmer dir (the limit covers the whole directory with --host-config-snapshot memory, and only settings*.json, CLAUDE.md and hooks/ with --host-config-snapshot disk)`,
      "host config exceeds the snapshot size limit",
    );
    this.name = "HostConfigOverCapError";
  }
}
//@ chunk-hm0ce8vc.js:16350-16651 placement
/**
 * runner 启动后快照被改动时抛出；runner 拒绝再开会话直到重启。
 */
class HostConfigSnapshotTamperedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  rel;
  what;
  constructor(e, n) {
    super(
      `Host config snapshot was modified after runner startup (${e}: ${n}) \u2014 restart the runner; it will not start sessions until then`,
      "host config snapshot modified after startup",
    );
    this.name = "HostConfigSnapshotTamperedError";
    this.rel = e;
    this.what = n;
  }
}
//@ chunk-hm0ce8vc.js:16651-17105 placement
/**
 * 会话配置路径已存在且不是普通目录/文件时抛出，拒绝穿透写入。
 */
class HostConfigSeedTargetError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  target;
  constructor(e, n = "directory") {
    super(
      `Session config path ${e} exists and is not a plain ${n} \u2014 refusing to write session config through it; this session was not started. Remove that entry (most likely an earlier pickup of the session left it there). The runner keeps serving other sessions and does not need a restart`,
      "host config seed target is not a plain directory",
    );
    this.name = "HostConfigSeedTargetError";
    this.target = e;
  }
}
//@ chunk-hm0ce8vc.js:17105-17337 placement
/**
 * 向会话种配置超时（多为 --base-dir 挂载不健康）。
 */
class HostConfigSeedTimeoutError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e, error) {
    super(
      `Seeding host config into ${e} did not finish (${error.message}; check --base-dir mount health) \u2014 session not started`,
      "host config seed timed out",
    );
    this.name = "HostConfigSeedTimeoutError";
  }
}
//@ chunk-hm0ce8vc.js:17337-17582 placement
/**
 * 快照条目读失败，本会话不启动，下个会话重试。
 */
class HostConfigSnapshotReadError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e, n) {
    super(
      `Host config snapshot entry ${e} could not be read (${n}) \u2014 session not started; it will be retried on the next session`,
      "host config snapshot read failed",
    );
    this.name = "HostConfigSnapshotReadError";
  }
}
//@ chunk-hm0ce8vc.js:17582-17671 placement
/**
 * 是否为上面四类快照/种入错误。
 */
function isHostConfigSnapshotError(error) {
  return (
    error instanceof HostConfigSnapshotTamperedError ||
    error instanceof HostConfigSeedTargetError ||
    error instanceof HostConfigSeedTimeoutError ||
    error instanceof HostConfigSnapshotReadError
  );
}
//@ chunk-hm0ce8vc.js:17671-18015 placement
/**
 * 生成"宿主配置未应用"的会话提示文本。
 */
function formatHostConfigNotAppliedNotice(sessionId, notApplied) {
  return makeInformationalWarningMessage(
    sessionId,
    `Host config from ${notApplied.sourceDir} was not applied: ${notApplied.message}. This session has none of the runner operator's user-level settings, skills, plugins or MCP servers. Operators: see --host-config-snapshot in the self-hosted runner guide; large plugin sets can also be pre-populated with CLAUDE_CODE_PLUGIN_SEED_DIR.`,
  );
}
//@ chunk-hm0ce8vc.js:18015-18288 placement
/**
 * 生成"宿主配置只部分应用"的会话提示文本。
 */
function formatHostConfigPartiallyAppliedNotice(sessionId, sourceDir, r) {
  return makeInformationalWarningMessage(
    sessionId,
    `Host config from ${sourceDir} was only partially applied: ${r}. Some of the runner operator's user-level settings, skills, plugins or MCP servers may be missing from this session. Operators: check free space and health of the runner's --base-dir.`,
  );
}
//@ chunk-hm0ce8vc.js:18288-18400 placement
/**
 * 构造 system/informational 级别 warning 的 SDK 消息。
 */
function makeInformationalWarningMessage(sessionId, content) {
  return {
    type: "system",
    subtype: "informational",
    level: "warning",
    uuid: randomUUID(),
    session_id: sessionId,
    content,
  };
}
//@ chunk-hm0ce8vc.js:18400-18705 placement
/**
 * 顶层条目过滤：排除会话态文件、点文件、daemon/agent-memory、.claude*.json 及其备份等。
 */
function shouldSnapshotTopLevelEntry(name) {
  let n = stripInvisibleChars(name);
  return (
    !HOST_CONFIG_EXCLUDED_NAMES.has(n) &&
    !n.startsWith(".") &&
    !n.startsWith("daemon") &&
    !n.startsWith("agent-memory") &&
    !/^\.claude(-[a-z-]+)?\.json(\.backup)?$/.test(n) &&
    !/^\.config\.json(\.|$)/.test(n) &&
    !/^\.claude(-[a-z-]+)?\.json\./.test(n) &&
    !n.startsWith(".session_ingress_token") &&
    !isTempFileName(n) &&
    !isHashTempFile(n)
  );
}
//@ chunk-hm0ce8vc.js:18705-18810 placement
/**
 * 判断条目是否由宿主 skills 认领（claim-all 或在认领集合中）而应跳过。
 */
function isClaimedByHostSkills(e, n, name, s) {
  if (SYNCED_SKILL_PATHS.has(stripInvisibleChars(e))) return true;
  return stripInvisibleChars(n) === "skills" && (s === "claim-all" || s.has(foldNameForSync(name)));
}
//@ chunk-hm0ce8vc.js:18810-21863 placement
/**
 * runner 启动时捕获宿主配置：校验 --base-dir 不在配置目录内，按 disk/memory 两种存储模式生成快照。
 */
async function captureHostConfigSnapshot(e, n) {
  let storageV5 = n.storageV5;
  let maxMemoryBytes = n.maxMemoryBytes ?? HOST_CONFIG_SNAPSHOT_MAX_BYTES;
  let a =
    process.env.SELF_HOSTED_RUNNER_HOST_CONFIG_DIR ||
    process.env.CLAUDE_CONFIG_DIR ||
    join(homedir(), ".claude");
  let files = new Map();
  let acc = {
    bytes: 0,
  };
  let u = {
    mode: "memory",
  };
  let h = new Set();
  try {
    let w = n.storage.mode === "memory";
    if (n.storage.mode === "disk" && isPathInside(n.storage.baseDir, a)) {
      e(
        `[runner:startup] host config dir ${a} contains --base-dir ${n.storage.baseDir}; using --host-config-snapshot memory for this run`,
      );
      w = true;
    } else if (n.storage.mode === "disk") {
      let { baseDir } = n.storage;
      let cancel = {
        cancelled: false,
      };
      let snapshotPromise = captureHostConfigToDisk(a, baseDir, files, acc, maxMemoryBytes, e, cancel);
      let K = await withBoundedTimeout(
        snapshotPromise,
        HOST_CONFIG_SNAPSHOT_TIMEOUT_MS,
        `[runner:stuck] host config disk snapshot ${a} \u2192 ${baseDir}`,
      ).catch((error) => {
        if (error instanceof BoundedTimeoutError) {
          cancel.cancelled = true;
          removeCapturedSnapshot(snapshotPromise);
        }
        throw error;
      });
      if (K.outcome === "absent");
      else if (K.outcome === "disk_unavailable") {
        e(
          `[runner:startup] host config disk snapshot under ${baseDir} failed (${errorMessage(K.error)}); falling back to memory mode`,
        );
        logFeatureSad("self_hosted_host_config", "host_config_disk_fallback");
        files.clear();
        acc.bytes = 0;
        w = true;
      } else {
        u = {
          mode: "disk",
          snapshotDir: K.snapshotDir,
          manifest: K.manifest,
        };
        h = K.legacySkillsClaims;
      }
    }
    if (w)
      h = await withBoundedTimeout(
        (async () => {
          let hostSkillsClaims = await readHostSkillsClaims(a);
          await walkHostConfigDir(a, "", files, acc, maxMemoryBytes, hostSkillsClaims);
          return hostSkillsClaims;
        })(),
        HOST_CONFIG_MEMORY_TIMEOUT_MS,
        `[runner:stuck] host config snapshot ${a}`,
      );
    if (h === "claim-all")
      e(
        `[runner:startup] ${join(a, HOST_SKILLS_CLAIMS_FILE)} exists but is unreadable or malformed \u2014 cannot tell org-synced skills from your own, so NO skills were seeded into sessions; delete that file (bookkeeping from an older skills-sync layout) to seed ${join(a, "skills")} again`,
      );
  } catch (error) {
    if (!isENOENT(error)) {
      e(
        `[runner:startup] host config snapshot from ${a} failed (sessions will start with empty config): ${error}`,
      );
      let E = error instanceof HostConfigOverCapError ? "over_cap" : "read_error";
      logFeatureBad(
        "self_hosted_host_config",
        E === "over_cap" ? "host_config_over_cap" : "host_config_read_error",
      );
      return {
        notApplied: {
          sourceDir: a,
          reason: E,
          message: errorMessage(error),
        },
      };
    }
  }
  let envSelfHostedRunnerHostConfigDir = process.env.SELF_HOSTED_RUNNER_HOST_CONFIG_DIR;
  let S;
  try {
    let E = envSelfHostedRunnerHostConfigDir
      ? await (async (G) => {
          for (let K of G)
            try {
              let file = await readFile(join(a, K), "utf8");
              if (file !== "") return file;
            } catch (error) {
              let errnoCode = getErrnoCode(error);
              if (errnoCode !== "ENOENT" && errnoCode !== "EISDIR" && errnoCode !== "ELOOP") throw error;
            }
          throw Object.assign(Error("ENOENT"), {
            code: "ENOENT",
          });
        })([
          ".config.json",
          `.claude${fileSuffixForOauthConfig()}.json`,
          ...OAUTH_GLOBAL_FILE_SUFFIXES.map((G) => `.claude${G}.json`),
        ])
      : isStorageV5Enabled() && storageV5 !== undefined
        ? await readGlobalConfigViaStorage(storageV5)
        : await readFile(getGlobalClaudeFile(), "utf8");
    let A = await jsonParse(E);
    if (A !== null && typeof A === "object") {
      let mcpServers = A.mcpServers;
      if (mcpServers !== null && typeof mcpServers === "object" && Object.keys(mcpServers).length > 0)
        S = mcpServers;
    }
  } catch {}
  if (S) {
    for (let [key, value] of Object.entries(S)) {
      let A = describeMcpServerShapeProblem(value);
      if (A !== undefined) {
        e(
          `[runner:warn] host mcpServers entry "${key}" has ${A} \u2014 ignoring (the Claude child would drop it silently)`,
        );
        delete S[key];
      }
    }
    if (Object.keys(S).length === 0) S = undefined;
  }
  let T = files.size + (u.mode === "disk" ? u.manifest.size : 0);
  if (T === 0 && !S) {
    if (u.mode === "disk")
      await rm(u.snapshotDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
    return;
  }
  let y = S ? `, ${Object.keys(S).length} mcpServer(s)` : "";
  let v = (acc.bytes / 1024).toFixed(1);
  e(
    u.mode === "disk"
      ? `[runner:startup] host config snapshot (disk): ${T} file(s), ${v} KiB from ${a} \u2192 ${u.snapshotDir}${y}`
      : `[runner:startup] host config snapshot: ${T} file(s), ${v} KiB from ${a}${y}`,
  );
  logFeatureOk("self_hosted_host_config");
  return {
    snapshot: {
      sourceDir: a,
      files,
      mcpServers: S,
      storage: u,
    },
  };
}
//@ chunk-hm0ce8vc.js:21863-22099 placement
/**
 * 通过存储层读取全局配置 ~/.claude.json，缺失时抛 ENOENT。
 */
async function readGlobalConfigViaStorage(storage) {
  let text = await storage.readText([STORAGE_SPACES.globalConfig()]);
  if (!text.ok) throw Error("global config not readable through storage");
  let r = text.value.items[0];
  if (!r?.found)
    throw Object.assign(Error("ENOENT"), {
      code: "ENOENT",
    });
  return r.value;
}
//@ chunk-hm0ce8vc.js:22099-22184 placement
/**
 * 已知 MCP 传输类型集合（stdio/sse/http/streamable-http/ws/sdk/claudeai-proxy）。
 */
var KNOWN_MCP_TRANSPORT_TYPES = new Set([
  "stdio",
  "sse",
  "http",
  "streamable-http",
  "ws",
  "sdk",
  "claudeai-proxy",
]);
//@ chunk-hm0ce8vc.js:22184-22581 placement
/**
 * 检查 MCP 服务器条目形状，返回问题描述（无问题返回 undefined）。
 */
function describeMcpServerShapeProblem(server) {
  if (server === null || typeof server !== "object" || Array.isArray(server))
    return `a non-object value (${server === null ? "null" : Array.isArray(server) ? "array" : typeof server})`;
  let n = server.type;
  if (n === undefined) {
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
//@ chunk-hm0ce8vc.js:22597-22808 placement
/**
 * 读取宿主 skills 认领文件；过大或读失败返回 "claim-all"。
 */
async function readHostSkillsClaims(hostDir) {
  let n = join(hostDir, HOST_SKILLS_CLAIMS_FILE);
  let r;
  try {
    if ((await stat(n)).size > MAX_SYNCED_SKILL_BYTES) return "claim-all";
    r = await readFile(n, "utf8");
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? new Set() : "claim-all";
  }
  return parseSkillsSyncManifest(r, join(hostDir, "skills"));
}
//@ chunk-hm0ce8vc.js:22808-23237 placement
/**
 * 递归遍历宿主配置目录，累计字节并收集要快照的文件。
 */
async function walkHostConfigDir(e, n, r, s, a, o) {
  let l = await readdir(join(e, n), {
    withFileTypes: true,
  });
  for (let u of l) {
    if (n === "" && !shouldSnapshotTopLevelEntry(u.name)) continue;
    let h = n === "" ? u.name : join(n, u.name);
    if (isClaimedByHostSkills(h, n, u.name, o)) continue;
    if (u.isDirectory()) await walkHostConfigDir(e, h, r, s, a, o);
    else if (u.isFile()) {
      let p = join(e, h);
      let S = await stat(p);
      s.bytes += S.size;
      if (s.bytes > a) throw new HostConfigOverCapError(a, h);
      let file = await readFile(p);
      s.bytes += file.length - S.size;
      if (s.bytes > a) throw new HostConfigOverCapError(a, h);
      r.set(h, {
        buf: file,
        mode: S.mode & 511,
      });
    }
  }
}
//@ chunk-hm0ce8vc.js:23237-23358 placement
/**
 * 若快照已落盘，删除其目录（尽力而为）。
 */
async function removeCapturedSnapshot(snapshotPromise) {
  try {
    let n = await snapshotPromise;
    if (n.outcome === "captured")
      await rm(n.snapshotDir, {
        recursive: true,
        force: true,
      });
  } catch {}
}
//@ chunk-hm0ce8vc.js:23358-23440 placement
function isPathInside(parent, child) {
  let r = relative(resolve(child), resolve(parent));
  return r === "" || (!r.startsWith("..") && !isAbsolute(r));
}
//@ chunk-hm0ce8vc.js:23608-23759 placement
/**
 * 快照目录写失败。
 */
class SnapshotDirWriteError extends Error {
  original;
  constructor(original) {
    super("host config snapshot directory write failed");
    this.original = original;
    this.name = "SnapshotDirWriteError";
  }
}
//@ chunk-hm0ce8vc.js:23759-23836 placement
/**
 * 匹配快照目录名（主机名-pid-随机串），用于清理陈旧快照。
 */
var HOST_CONFIG_SNAPSHOT_DIR_PATTERN = /^\.host-config-snapshot-([A-Za-z0-9_.]{1,64})-(\d+)-[A-Za-z0-9]{6}$/;
//@ chunk-hm0ce8vc.js:23836-23927 placement
function getSanitizedHostname() {
  let sliced = hostname()
    .replace(/[^A-Za-z0-9_.]/g, "_")
    .slice(0, 64);
  return sliced === "" ? "host" : sliced;
}
//@ chunk-hm0ce8vc.js:23927-23978 placement
function getSnapshotDirPrefixForThisProcess() {
  return `${SNAPSHOT_DIR_PREFIX}${getSanitizedHostname()}-${process.pid}-`;
}
//@ chunk-hm0ce8vc.js:23978-23993 placement
/**
 * 已占用快照目录的 pid 集合（防止同机多个 runner 冲突）。
 */
var claimedHostPids = new Set();
//@ chunk-hm0ce8vc.js:23993-24072 placement
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
//@ chunk-hm0ce8vc.js:24072-24631 placement
/**
 * 启动时删除本机已退出 runner 留下的快照目录；其他主机的快照只提示，不删除。
 */
async function removeStaleHostConfigSnapshots(e, n) {
  let r = await readdir(e);
  let sanitizedHostname = getSanitizedHostname();
  let a = 0;
  for (let o of r) {
    let match = HOST_CONFIG_SNAPSHOT_DIR_PATTERN.exec(o);
    if (!match) continue;
    if (match[1] !== sanitizedHostname) {
      a++;
      continue;
    }
    let u = join(e, o);
    let pid = Number(match[2]);
    if (claimedHostPids.has(u) || (pid !== process.pid && isProcessAlive(pid))) continue;
    try {
      await rm(u, {
        recursive: true,
        force: true,
      });
      n(`[runner:startup] removed stale host config snapshot ${u}`);
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
    let { bytesWritten } = await e.write(n, r, n.length - r);
    r += bytesWritten;
  }
}
//@ chunk-hm0ce8vc.js:24736-25540 placement
/**
 * 以 disk 模式把宿主配置复制到快照目录，捕获期间目录变化则报错。
 */
async function captureHostConfigToDisk(hostDir, baseDir, files, acc, maxHeapBytes, o, cancel) {
  try {
    await removeStaleHostConfigSnapshots(baseDir, o);
  } catch (error) {
    return {
      outcome: "disk_unavailable",
      error,
    };
  }
  try {
    await readdir(hostDir);
  } catch (error) {
    if (isENOENT(error))
      return {
        outcome: "absent",
      };
    throw error;
  }
  let legacySkillsClaims = await readHostSkillsClaims(hostDir);
  let h;
  try {
    h = await mkdtemp(join(baseDir, getSnapshotDirPrefixForThisProcess()));
  } catch (error) {
    return {
      outcome: "disk_unavailable",
      error,
    };
  }
  let ctx = {
    hostDir,
    snapshotDir: h,
    files,
    acc,
    heapBytes: 0,
    maxHeapBytes,
    legacySkillsClaims,
    manifest: new Map(),
    chunk: Buffer.allocUnsafe(SNAPSHOT_CHUNK_BYTES),
    onStatus: o,
    cancel,
  };
  try {
    await copyHostConfigTree(ctx, "");
  } catch (error) {
    await rm(h, {
      recursive: true,
      force: true,
    }).catch(() => {});
    if (error instanceof SnapshotDirWriteError)
      return {
        outcome: "disk_unavailable",
        error: error.original,
      };
    if (isENOENT(error))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `host config dir changed while it was being captured (${errorMessage(error)})`,
        "host config dir changed during capture",
      );
    throw error;
  }
  claimedHostPids.add(h);
  return {
    outcome: "captured",
    snapshotDir: h,
    manifest: ctx.manifest,
    legacySkillsClaims,
  };
}
//@ chunk-hm0ce8vc.js:25540-25851 placement
/**
 * 递归复制配置树：hooks 读入内存，其余写入快照。
 */
async function copyHostConfigTree(ctx, relDir) {
  let r = await readdir(join(ctx.hostDir, relDir), {
    withFileTypes: true,
  });
  for (let s of r) {
    throwIfHostConfigCancelled(ctx.cancel);
    if (relDir === "" && !shouldSnapshotTopLevelEntry(s.name)) continue;
    let a = relDir === "" ? s.name : join(relDir, s.name);
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
//@ chunk-hm0ce8vc.js:25964-26318 placement
/**
 * 把 hooks 下的文件读入内存（计入内存上限）。
 */
async function readHookFileIntoMemory(ctx, n) {
  let r = join(ctx.hostDir, n);
  let s;
  let a;
  try {
    s = await stat(r);
    ctx.heapBytes += s.size;
    if (ctx.heapBytes > ctx.maxHeapBytes) throw new HostConfigOverCapError(ctx.maxHeapBytes, n);
    a = await readFile(r);
  } catch (error) {
    if (isENOENT(error)) {
      reportEntryDisappearedDuringCapture(ctx, n);
      return;
    }
    throw error;
  }
  ctx.heapBytes += a.length - s.size;
  if (ctx.heapBytes > ctx.maxHeapBytes) throw new HostConfigOverCapError(ctx.maxHeapBytes, n);
  ctx.files.set(n, {
    buf: a,
    mode: s.mode & 511,
  });
  ctx.acc.bytes += a.length;
}
//@ chunk-hm0ce8vc.js:26318-27009 placement
/**
 * 以不跟随链接方式打开源文件，复制到快照并计算 sha256。
 */
async function copyFileIntoSnapshot(ctx, n) {
  let r;
  try {
    r = await open(join(ctx.hostDir, n), getNoFollowReadFlags());
  } catch (error) {
    if (isENOENT(error)) {
      reportEntryDisappearedDuringCapture(ctx, n);
      return;
    }
    throw error;
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile()) return;
    let mode = stats.mode & 511;
    let o = join(ctx.snapshotDir, n);
    let l;
    try {
      await mkdir(dirname(o), {
        recursive: true,
      });
      l = await open(o, "wx", 384);
    } catch (error) {
      throw new SnapshotDirWriteError(error);
    }
    let hash = createHash("sha256");
    let h = 0;
    try {
      let { chunk } = ctx;
      for (;;) {
        throwIfHostConfigCancelled(ctx.cancel);
        let { bytesRead } = await r.read(chunk, 0, chunk.length, null);
        if (bytesRead === 0) break;
        let chunk_2 = chunk.subarray(0, bytesRead);
        hash.update(chunk_2);
        try {
          await writeAll(l, chunk_2);
        } catch (error) {
          throw new SnapshotDirWriteError(error);
        }
        h += bytesRead;
      }
    } catch (error) {
      await l.close().catch(() => {});
      throw error;
    }
    try {
      await l.close();
    } catch (error) {
      throw new SnapshotDirWriteError(error);
    }
    ctx.manifest.set(n, {
      sha256: hash.digest("hex"),
      size: h,
      mode,
    });
    ctx.acc.bytes += h;
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-hm0ce8vc.js:27009-27051 placement
var CCR_GIT_DIR_NAME = ".ccr-git";
var CCR_LAUNCHER_DIRS = [".ccr-launcher", CCR_GIT_DIR_NAME];
//@ chunk-hm0ce8vc.js:27051-27354 placement
/**
 * 检查 git 目录下的 hooks 是否为普通目录（是其他类型时记日志并返回 false），文件系统操作有卡住超时。
 */
async function isHooksDirSafe(e, onStatus, r = FS_OP_TIMEOUT_MS) {
  let s = join(e, "hooks");
  let a = await withBoundedTimeout(
    lstat(s).catch((error) => (isENOENT(error) ? undefined : Promise.reject(error))),
    r,
    `[runner:stuck] fs op 'lstat ${s}' (check mount health)`,
  );
  if (a !== undefined && !a.isDirectory()) {
    onStatus(`[runner:session] ${s} exists and is not a plain directory \u2014 not following`);
    return false;
  }
  return true;
}
//@ chunk-hm0ce8vc.js:27354-27387 placement
/**
 * 记录已发现快照问题的 WeakMap，后续会话直接复用错误。
 */
var seededSnapshotErrors = new WeakMap();
var HOOKS_DIR_SAFETY_TIMEOUT_MS = 1e4;
var HOOKS_CHECK_TIMEOUT_MS = 1e4;
//@ chunk-hm0ce8vc.js:27387-28773 placement
/**
 * 把快照种入会话配置目录；发现篡改时记录并拒绝。
 */
async function seedHostConfigForSession(
  sessionClaudeConfigDir,
  snapshot,
  onDebug,
  onStatus,
  a = fileSuffixForOauthConfig(),
) {
  if (!snapshot)
    return {
      outcome: "seeded",
    };
  let o = seededSnapshotErrors.get(snapshot);
  if (o !== undefined) {
    let h = new HostConfigSnapshotTamperedError(
      o.rel,
      `${o.what}; found by an earlier session on this runner`,
    );
    onStatus(`[runner:error] ${h.message}`);
    logFeatureBad("self_hosted_host_config", "host_config_tampered");
    throw h;
  }
  let l = {
    files: 0,
    bytes: 0,
    names: [],
    published: [],
    cancelTakesBack: snapshot.storage.mode === "disk",
    cancel: {
      cancelled: false,
    },
  };
  let u = `[runner:stuck] seed write \u2192 ${sessionClaudeConfigDir}`;
  try {
    await withBoundedTimeout(
      seedHostConfigFromMemory(sessionClaudeConfigDir, snapshot, a, l, onStatus),
      HOST_CONFIG_CAPTURE_TIMEOUT_MS,
      u,
    );
    if (l.files > 0 || snapshot.mcpServers) {
      let h = snapshot.mcpServers
        ? `.claude.json[mcpServers\xD7${Object.keys(snapshot.mcpServers).length}]`
        : undefined;
      let p =
        snapshot.storage.mode === "disk"
          ? [`${l.files} file(s), ${(l.bytes / 1024).toFixed(1)} KiB`, ...(h ? [h] : [])].join(", ")
          : [...l.names, ...(h ? [h] : [])].join(", ");
      onDebug(`[runner:session] Seeded ${p} from host config snapshot (${snapshot.sourceDir})`);
    }
    return {
      outcome: "seeded",
    };
  } catch (error) {
    let p = error;
    if (error instanceof BoundedTimeoutError && snapshot.storage.mode === "disk") {
      l.cancel.cancelled = true;
      p = new HostConfigSeedTimeoutError(sessionClaudeConfigDir, error);
      onStatus(`[runner:error] ${errorMessage(p)}`);
      logFeatureBad("self_hosted_host_config", "host_config_seed_timeout");
    }
    if (isHostConfigSnapshotError(p)) {
      if (l.published.length > 0)
        await withBoundedTimeout(
          unlinkAllReverse(l.published),
          HOOKS_CHECK_TIMEOUT_MS,
          `[runner:stuck] remove the files seeded into ${sessionClaudeConfigDir}`,
        ).catch((error) =>
          onStatus(
            `[runner:error] could not remove the files seeded into ${sessionClaudeConfigDir}: ${errorMessage(error)}`,
          ),
        );
      throw p;
    }
    onStatus(`[runner:session] Seed write to ${sessionClaudeConfigDir} failed (best-effort): ${error}`);
    l.cancel.cancelled = true;
    logFeatureSad("self_hosted_host_config", "host_config_seed_partial");
    return {
      outcome: "partial",
      error: errorMessage(error),
    };
  }
}
//@ chunk-hm0ce8vc.js:28773-30278 placement
/**
 * memory 模式：把内存中的文件逐个写入会话配置目录。
 */
async function seedHostConfigFromMemory(path, n, r, s, a) {
  let o = n.storage.mode === "disk";
  let { cancel } = s;
  try {
    let u = new Set();
    await ensurePlainDirectory(path);
    throwIfHostConfigCancelled(cancel);
    let h = await isHooksDirSafe(path, a, HOOKS_DIR_SAFETY_TIMEOUT_MS);
    throwIfHostConfigCancelled(cancel);
    if (!h) throw new HostConfigSeedTargetError(join(path, "hooks"));
    for (let [p, { buf: S, mode: T }] of n.files) {
      throwIfHostConfigCancelled(cancel);
      let lower = p.toLowerCase();
      if (
        CCR_LAUNCHER_DIRS.some(
          (v) => lower.startsWith("hooks" + sep + v + sep) || lower === "hooks" + sep + v,
        )
      )
        continue;
      await ensureParentDirsPlain(path, p, u, cancel);
      await writeViaTempAndRename(path, p, T, s, (v) => writeAll(v, S));
      if (!o) s.names.push(p);
      s.files++;
      s.bytes += S.length;
    }
    if (n.storage.mode === "disk") {
      let { snapshotDir, manifest } = n.storage;
      if (manifest.size > 0) {
        let y = await lstat(snapshotDir).catch((error) => {
          if (isENOENT(error)) return;
          throw new HostConfigSnapshotReadError(
            basename(snapshotDir),
            getErrnoCode(error) ?? errorMessage(error),
          );
        });
        if (y === undefined || !y.isDirectory())
          throw new HostConfigSnapshotTamperedError(
            basename(snapshotDir),
            `the snapshot directory ${snapshotDir} was removed or replaced after runner startup (another runner or a cleanup job sharing --base-dir?)`,
          );
      }
      let T = Buffer.allocUnsafe(SNAPSHOT_CHUNK_BYTES);
      for (let [y, v] of manifest) {
        throwIfHostConfigCancelled(cancel);
        await ensureParentDirsPlain(path, y, u, cancel);
        await verifyAndCopySnapshotEntry(snapshotDir, path, y, v, T, s);
        s.files++;
        s.bytes += v.size;
      }
    }
    if (n.mcpServers) {
      throwIfHostConfigCancelled(cancel);
      let p = await jsonStringify({
        mcpServers: n.mcpServers,
      });
      let S = `.claude${r}.json`;
      await writeViaTempAndRename(path, S, 384, s, (T) => writeAll(T, Buffer.from(p)));
    }
  } catch (error) {
    if (error instanceof HostConfigSnapshotTamperedError) {
      let h = !seededSnapshotErrors.has(n);
      if (h)
        seededSnapshotErrors.set(n, {
          rel: error.rel,
          what: error.what,
        });
      a(`[runner:error] ${error.message}`);
      if (h)
        a("[runner:error] this runner now refuses to start sessions until it is restarted \u2014 replace it");
      logFeatureBad("self_hosted_host_config", "host_config_tampered");
    } else if (error instanceof HostConfigSeedTargetError) {
      a(`[runner:error] ${error.message}`);
      logFeatureBad("self_hosted_host_config", "host_config_seed_target");
    } else if (error instanceof HostConfigSnapshotReadError) {
      a(`[runner:error] ${error.message}`);
      logFeatureBad("self_hosted_host_config", "host_config_seed_io");
    }
    throw error;
  }
}
//@ chunk-hm0ce8vc.js:30278-30514 placement
/**
 * 确保路径是普通目录（不存在则 0700 创建），否则抛 HostConfigSeedTargetError。
 */
async function ensurePlainDirectory(path) {
  let r = await lstat(path).catch((error) => (isENOENT(error) ? undefined : Promise.reject(error)));
  if (r === undefined)
    try {
      await mkdir(path, {
        mode: 448,
      });
      return "made";
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
      r = await lstat(path);
    }
  if (!r.isDirectory()) throw new HostConfigSeedTargetError(path);
  return "found";
}
//@ chunk-hm0ce8vc.js:30514-30722 placement
async function ensureSessionConfigDirs(e, n) {
  await mkdir(e, {
    recursive: true,
    mode: 448,
  });
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
//@ chunk-hm0ce8vc.js:30722-31054 placement
/**
 * 逐级确认父目录是普通目录。
 */
async function ensureParentDirsPlain(e, n, r, cancel) {
  let sliced = n.split(sep).slice(0, -1);
  let o = "";
  for (let l of sliced) {
    o = o === "" ? l : join(o, l);
    if (r.has(o)) continue;
    throwIfHostConfigCancelled(cancel);
    let u = join(e, o);
    let h = await lstat(u).catch((error) => (isENOENT(error) ? undefined : Promise.reject(error)));
    if (h === undefined)
      try {
        await mkdir(u);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        h = await lstat(u);
      }
    if (h !== undefined && !h.isDirectory()) throw new HostConfigSeedTargetError(u);
    r.add(o);
  }
}
//@ chunk-hm0ce8vc.js:31054-31264 placement
/**
 * 原子写会话配置文件（先写 .seed- 临时文件再改名）。
 */
async function writeSessionFileAtomically(
  path,
  n,
  r,
  s,
  cancel = {
    cancelled: false,
  },
) {
  let o = {
    cancel,
    published: [],
    cancelTakesBack: true,
  };
  await ensurePlainDirectory(path);
  await ensureParentDirsPlain(path, n, new Set(), o.cancel);
  let l = typeof r === "string" ? Buffer.from(r) : r;
  await writeViaTempAndRename(path, n, s, o, (u) => writeAll(u, l));
}
//@ chunk-hm0ce8vc.js:31264-31744 placement
async function writeViaTempAndRename(e, n, r, s, a) {
  let { cancel } = s;
  let l = join(e, n);
  let u = await lstat(l).catch((error) => (isENOENT(error) ? undefined : Promise.reject(error)));
  if (u !== undefined && !u.isFile() && !u.isSymbolicLink()) throw new HostConfigSeedTargetError(l, "file");
  let h = join(dirname(l), `.${basename(l)}.seed-${randomUUID().slice(0, 8)}`);
  throwIfHostConfigCancelled(cancel);
  let p = await open(h, "wx", r);
  try {
    await a(p);
    await p.close();
    throwIfHostConfigCancelled(cancel);
    await renameOverPlainFile(h, l);
    s.published.push(l);
    if (cancel.cancelled) {
      if (s.cancelTakesBack) await unlink(l).catch(() => {});
      throwIfHostConfigCancelled(cancel);
    }
  } catch (error) {
    await p.close().catch(() => {});
    await unlink(h).catch(() => {});
    throw error;
  }
}
//@ chunk-hm0ce8vc.js:31744-31866 placement
async function unlinkAllReverse(published) {
  let n;
  for (let j = published.length - 1; j >= 0; j--)
    try {
      await unlink(published[j]);
    } catch (error) {
      if (!isENOENT(error)) n ??= error;
    }
  if (n !== undefined) throw n;
}
//@ chunk-hm0ce8vc.js:31866-32169 placement
async function renameOverPlainFile(e, n) {
  try {
    await retryFsOp(e, n, rename);
    return;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (!(
      errnoCode !== undefined &&
      errnoCode !== "EXDEV" &&
      (ATOMIC_WRITE_ERRNOS.has(errnoCode) || (errnoCode === "EACCES" && false))
    ))
      throw error;
  }
  let r = await lstat(n).catch((error) => (isENOENT(error) ? undefined : Promise.reject(error)));
  if (r !== undefined) {
    if (!r.isFile() && !r.isSymbolicLink()) throw new HostConfigSeedTargetError(n, "file");
    await unlink(n);
  }
  await retryFsOp(e, n, rename);
}
//@ chunk-hm0ce8vc.js:32240-32475 placement
/**
 * 描述快照条目被替换成什么（socket、设备节点、非普通文件）。
 */
async function describeChangedEntry(e) {
  let n;
  try {
    n = await lstat(e);
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
//@ chunk-hm0ce8vc.js:32727-33548 placement
/**
 * 以快照为准逐个校验条目（大小、sha256、类型），检测被替换/截断/内容变化。
 */
async function verifyAndCopySnapshotEntry(snapshotDir, n, r, s, a, o) {
  let { cancel } = o;
  let u;
  try {
    u = await open(join(snapshotDir, r), getNoFollowReadFlags());
  } catch (error) {
    let code = getErrnoCode(error);
    if (code !== undefined && isFsInaccessible_2.has(code))
      throw new HostConfigSnapshotTamperedError(r, describeOpenErrno(code));
    let S = await describeChangedEntry(join(snapshotDir, r));
    if (S !== undefined) throw new HostConfigSnapshotTamperedError(r, S);
    throw new HostConfigSnapshotReadError(r, code ?? errorMessage(error));
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
      let hash = createHash("sha256");
      let size = s.size;
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
        hash.update(chunk);
        await writeAll(p, chunk);
        size -= y;
      }
      if (hash.digest("hex") !== s.sha256) throw new HostConfigSnapshotTamperedError(r, "content changed");
    });
  } finally {
    await u.close().catch(() => {});
  }
}
//@ chunk-hm0ce8vc.js:33548-33731 placement
/**
 * 公版构建里的空实现（runner 令牌续期）。
 */
function startRunnerTokenRefresher({
  baseUrl,
  getRunnerToken,
  renewRunnerToken,
  renewSessionTokens,
  isThawing,
  getRetireAtMs,
  isStopping,
  isHeldOff,
  onGranted,
  clock,
  onStatus,
  onDebug,
}) {
  return;
}
//@ chunk-hm0ce8vc.js:33731-33772 placement
/**
 * 公版构建里的空实现。
 */
function startClockSkewMonitor({ clock, onStatus }) {
  return;
}
//@ chunk-hm0ce8vc.js:33838-33849 placement
/**
 * 检查 --base-dir 可写的默认超时。
 */
var BASE_DIR_CHECK_TIMEOUT_MS = 1e4;
//@ chunk-hm0ce8vc.js:33849-34271 placement
/**
 * 带超时检查 --base-dir 可创建且可写，失败时提示 NFS/CSI 挂载健康或设置 SELF_HOSTED_RUNNER_BASE_DIR。
 */
async function checkBaseDirWritable(baseDir, n = BASE_DIR_CHECK_TIMEOUT_MS, r = (s) => console.error(s)) {
  try {
    await withBoundedTimeout(
      mkdir(baseDir, {
        recursive: true,
      }).then(() => access(baseDir, constants_3.W_OK | constants_3.X_OK)),
      n,
      `base directory check for ${baseDir}`,
    );
  } catch (error) {
    let a = errorMessage(error);
    if (a.includes("timed out after")) {
      r(`[runner:fatal] ${a} \u2014 check NFS/CSI mount health`);
      process.exit(1);
    }
    throw Error(
      `cannot create or write to base directory ${baseDir} (${getErrnoCode(error) ?? a}); pass --base-dir <writable path> or set SELF_HOSTED_RUNNER_BASE_DIR`,
    );
  }
}
//@ chunk-hm0ce8vc.js:34371-34393 placement
/**
 * 预留的额外 git 目录来源（当前恒 undefined）。
 */
function extraGitDir(e) {
  return;
}
//@ chunk-hm0ce8vc.js:34393-34464 placement
/**
 * 列出会话要清理/搜索的 git 目录。
 */
function gitSearchDirs(e, n) {
  return uniq([join(e, "git"), extraGitDir(n)].filter((r) => r !== undefined));
}
//@ chunk-hm0ce8vc.js:34464-34601 placement
/**
 * 启动会话子进程前清除的 git 全局环境变量。
 */
var GIT_ENV_VARS_TO_CLEAR = new Set([
  ...GIT_ENV_VARS_TO_CLEAR_2.filter((e) => e !== "GIT_CONFIG_GLOBAL"),
  "GIT_TEMPLATE_DIR",
  "GIT_EXEC_PATH",
  "GIT_GRAFT_FILE",
  "GIT_REPLACE_REF_BASE",
]);
//@ chunk-hm0ce8vc.js:34601-34693 placement
/**
 * 代码审查令牌交接的常量：fd、环境变量名与这些 fd 的 stdio 模式。
 */
var CODE_REVIEW_TOKEN_HANDOFF_FD = 4;
var CODE_REVIEW_TOKEN_FD = 5;
var CODE_REVIEW_TOKEN_HANDOFF = "code_review_token_handoff";
var CHILD_STDIO_MODES = ["pipe", "pipe", "pipe", "pipe", "pipe", "pipe"];
//@ chunk-hm0ce8vc.js:34693-35012 placement
/**
 * 构造把宿主认证相关环境变量全部置空的覆盖表。
 */
function buildClearedAuthEnv() {
  return {
    ...Object.fromEntries(TOKEN_FD_ENV_VARS.map((e) => [e, undefined])),
    CLAUDE_BG_AUTH_SNAPSHOT_PATH: undefined,
    CLAUDE_CODE_HOST_AUTH_ENV_VAR: undefined,
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
    CLAUDE_CODE_OAUTH_TOKEN: undefined,
    CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR: String(CODE_REVIEW_TOKEN_HANDOFF_FD),
    CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: String(CODE_REVIEW_TOKEN_FD),
  };
}
//@ chunk-hm0ce8vc.js:35012-35228 placement = runComputerUseMcpServer (0.426)
/**
 * （误归 computerUse/mcpServer）把 sessionToken / inferenceToken 写入子进程额外的 stdio 管道并关闭。
 */
function writeChildSessionTokens(e, tokens, onError) {
  try {
    let stdio = e.stdio;
    let sessionTokenPipe = stdio[CODE_REVIEW_TOKEN_HANDOFF_FD];
    let inferenceTokenPipe = stdio[CODE_REVIEW_TOKEN_FD];
    if (
      !sessionTokenPipe ||
      !("end" in sessionTokenPipe) ||
      !inferenceTokenPipe ||
      !("end" in inferenceTokenPipe)
    )
      return false;
    sessionTokenPipe.on("error", onError);
    inferenceTokenPipe.on("error", onError);
    sessionTokenPipe.end(`${tokens.sessionToken}
`);
    inferenceTokenPipe.end(`${tokens.inferenceToken}
`);
    return true;
  } catch {
    return false;
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
  CHILD_STDIO_MODES,
  writeChildSessionTokens,
  CCR_GIT_DIR_NAME,
  extraGitDir,
  checkBaseDirWritable,
  CODE_REVIEW_TOKEN_HANDOFF,
  gitSearchDirs,
  startClockSkewMonitor,
  startRunnerTokenRefresher,
  captureHostConfigSnapshot,
};
