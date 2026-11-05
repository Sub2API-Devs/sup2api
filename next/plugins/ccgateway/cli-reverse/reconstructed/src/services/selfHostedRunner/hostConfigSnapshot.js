/**
 * services/selfHostedRunner/hostConfigSnapshot.ts
 *
 * 2.1.316 新增：自托管 runner 启动时把宿主 ~/.claude 配置拍成快照，按会话种入每个会话的配置目录，并校验快照未被篡改
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-asf5gh8x.js (62)
 * attribution: placement 62
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { GIT_ENV_VARS_TO_CLEAR as GIT_ENV_VARS_TO_CLEAR_2 } from "../../utils/git/gitSafeEnv.js";
import { TOKEN_FD_ENV_VARS } from "../../utils/managedEnvConstants.js";

//@ chunk-asf5gh8x.js:15911-15983 placement
/**
 * 宿主配置快照目录名前缀 ".host-config-snapshot-"。
 */
var HOST_CONFIG_CAPTURE_TIMEOUT_MS = 300000;
var HOST_CONFIG_SNAPSHOT_TIMEOUT_MS = 300000;
var HOST_CONFIG_MEMORY_TIMEOUT_MS = 60000;
var SNAPSHOT_DIR_PREFIX = ".host-config-snapshot-";
var SNAPSHOT_CHUNK_BYTES = 1048576;
//@ chunk-asf5gh8x.js:15983-16077 placement
/**
 * 打开文件的标志：Windows 只读，其他平台加 O_NOFOLLOW|O_NONBLOCK，防止跟随符号链接或阻塞在 FIFO 上。
 */
function getNoFollowReadFlags(platform = "linux") {
  return platform === "win32"
    ? constants.O_RDONLY
    : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
}
//@ chunk-asf5gh8x.js:16077-17239 placement
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
  ...["policy-limits.json", "remote-settings.json"].flatMap((fileName) => [
    signatureFileFor(fileName),
    signatureIatFileFor(fileName),
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
//@ chunk-asf5gh8x.js:17239-17359 placement
/**
 * 判断快照条目是否位于 hooks 目录（或是顶层 hooks 文件），这类文件读入内存而非复制。
 */
function isHookPathEntry(relPath) {
  let index = relPath.indexOf(sep);
  if (index === -1) return HOST_ROOT_SETTINGS_FILE_NAMES.has(relPath.toLowerCase());
  return relPath.slice(0, index).toLowerCase() === "hooks";
}
//@ chunk-asf5gh8x.js:17359-17755 placement
/**
 * 宿主配置超过快照大小上限时抛出，提示减小或设置 SELF_HOSTED_RUNNER_HOST_CONFIG_DIR。
 */
class HostConfigOverCapError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(maxHeapBytes, location) {
    super(
      `host config exceeds ${maxHeapBytes} bytes at ${location} \u2014 reduce it or set SELF_HOSTED_RUNNER_HOST_CONFIG_DIR to a slimmer dir (the limit covers the whole directory with --host-config-snapshot memory, and only settings*.json, CLAUDE.md and hooks/ with --host-config-snapshot disk)`,
      "host config exceeds the snapshot size limit",
    );
    this.name = "HostConfigOverCapError";
  }
}
//@ chunk-asf5gh8x.js:17755-18056 placement
/**
 * runner 启动后快照被改动时抛出；runner 拒绝再开会话直到重启。
 */
class HostConfigSnapshotTamperedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  rel;
  what;
  constructor(rel, what) {
    super(
      `Host config snapshot was modified after runner startup (${rel}: ${what}) \u2014 restart the runner; it will not start sessions until then`,
      "host config snapshot modified after startup",
    );
    this.name = "HostConfigSnapshotTamperedError";
    this.rel = rel;
    this.what = what;
  }
}
//@ chunk-asf5gh8x.js:18056-18510 placement
/**
 * 会话配置路径已存在且不是普通目录/文件时抛出，拒绝穿透写入。
 */
class HostConfigSeedTargetError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  target;
  constructor(targetPath, targetKind = "directory") {
    super(
      `Session config path ${targetPath} exists and is not a plain ${targetKind} \u2014 refusing to write session config through it; this session was not started. Remove that entry (most likely an earlier pickup of the session left it there). The runner keeps serving other sessions and does not need a restart`,
      "host config seed target is not a plain directory",
    );
    this.name = "HostConfigSeedTargetError";
    this.target = targetPath;
  }
}
//@ chunk-asf5gh8x.js:18510-18742 placement
/**
 * 向会话种配置超时（多为 --base-dir 挂载不健康）。
 */
class HostConfigSeedTimeoutError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(targetPath, error) {
    super(
      `Seeding host config into ${targetPath} did not finish (${error.message}; check --base-dir mount health) \u2014 session not started`,
      "host config seed timed out",
    );
    this.name = "HostConfigSeedTimeoutError";
  }
}
//@ chunk-asf5gh8x.js:18742-18987 placement
/**
 * 快照条目读失败，本会话不启动，下个会话重试。
 */
class HostConfigSnapshotReadError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(entryPath, reason) {
    super(
      `Host config snapshot entry ${entryPath} could not be read (${reason}) \u2014 session not started; it will be retried on the next session`,
      "host config snapshot read failed",
    );
    this.name = "HostConfigSnapshotReadError";
  }
}
//@ chunk-asf5gh8x.js:18987-19076 placement
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
//@ chunk-asf5gh8x.js:19076-19420 placement
/**
 * 生成"宿主配置未应用"的会话提示文本。
 */
function formatHostConfigNotAppliedNotice(sessionId, notApplied) {
  return makeInformationalWarningMessage(
    sessionId,
    `Host config from ${notApplied.sourceDir} was not applied: ${notApplied.message}. This session has none of the runner operator's user-level settings, skills, plugins or MCP servers. Operators: see --host-config-snapshot in the self-hosted runner guide; large plugin sets can also be pre-populated with CLAUDE_CODE_PLUGIN_SEED_DIR.`,
  );
}
//@ chunk-asf5gh8x.js:19420-19693 placement
/**
 * 生成"宿主配置只部分应用"的会话提示文本。
 */
function formatHostConfigPartiallyAppliedNotice(sessionId, sourceDir, error) {
  return makeInformationalWarningMessage(
    sessionId,
    `Host config from ${sourceDir} was only partially applied: ${error}. Some of the runner operator's user-level settings, skills, plugins or MCP servers may be missing from this session. Operators: check free space and health of the runner's --base-dir.`,
  );
}
//@ chunk-asf5gh8x.js:19693-19805 placement
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
//@ chunk-asf5gh8x.js:19805-20110 placement
/**
 * 顶层条目过滤：排除会话态文件、点文件、daemon/agent-memory、.claude*.json 及其备份等。
 */
function shouldSnapshotTopLevelEntry(name) {
  let strippedName = stripInvisibleChars(name);
  return (
    !HOST_CONFIG_EXCLUDED_NAMES.has(strippedName) &&
    !strippedName.startsWith(".") &&
    !strippedName.startsWith("daemon") &&
    !strippedName.startsWith("agent-memory") &&
    !/^\.claude(-[a-z-]+)?\.json(\.backup)?$/.test(strippedName) &&
    !/^\.config\.json(\.|$)/.test(strippedName) &&
    !/^\.claude(-[a-z-]+)?\.json\./.test(strippedName) &&
    !strippedName.startsWith(".session_ingress_token") &&
    !isTempFileName(strippedName) &&
    !isHashTempFile(strippedName)
  );
}
//@ chunk-asf5gh8x.js:20110-20215 placement
/**
 * 判断条目是否由宿主 skills 认领（claim-all 或在认领集合中）而应跳过。
 */
function isClaimedByHostSkills(relPath, name, name_2, claims) {
  if (SYNCED_SKILL_PATHS.has(stripInvisibleChars(relPath))) return true;
  return (
    stripInvisibleChars(name) === "skills" && (claims === "claim-all" || claims.has(foldNameForSync(name_2)))
  );
}
//@ chunk-asf5gh8x.js:20215-23268 placement
/**
 * runner 启动时捕获宿主配置：校验 --base-dir 不在配置目录内，按 disk/memory 两种存储模式生成快照。
 */
async function captureHostConfigSnapshot(log, options) {
  let storageV5 = options.storageV5;
  let maxMemoryBytes = options.maxMemoryBytes ?? HOST_CONFIG_SNAPSHOT_MAX_BYTES;
  let configDir =
    process.env.SELF_HOSTED_RUNNER_HOST_CONFIG_DIR ||
    process.env.CLAUDE_CONFIG_DIR ||
    join(homedir(), ".claude");
  let files = new Map();
  let acc = {
    bytes: 0,
  };
  let storage = {
    mode: "memory",
  };
  let skillsClaims = new Set();
  try {
    let useMemory = options.storage.mode === "memory";
    if (options.storage.mode === "disk" && isPathInside(options.storage.baseDir, configDir)) {
      log(
        `[runner:startup] host config dir ${configDir} contains --base-dir ${options.storage.baseDir}; using --host-config-snapshot memory for this run`,
      );
      useMemory = true;
    } else if (options.storage.mode === "disk") {
      let { baseDir } = options.storage;
      let cancel = {
        cancelled: false,
      };
      let snapshotPromise = captureHostConfigToDisk(
        configDir,
        baseDir,
        files,
        acc,
        maxMemoryBytes,
        log,
        cancel,
      );
      let diskResult = await withBoundedTimeout(
        snapshotPromise,
        HOST_CONFIG_SNAPSHOT_TIMEOUT_MS,
        `[runner:stuck] host config disk snapshot ${configDir} \u2192 ${baseDir}`,
      ).catch((error) => {
        if (error instanceof BoundedTimeoutError) {
          cancel.cancelled = true;
          removeCapturedSnapshot(snapshotPromise);
        }
        throw error;
      });
      if (diskResult.outcome === "absent");
      else if (diskResult.outcome === "disk_unavailable") {
        log(
          `[runner:startup] host config disk snapshot under ${baseDir} failed (${errorMessage(diskResult.error)}); falling back to memory mode`,
        );
        logFeatureSad("self_hosted_host_config", "host_config_disk_fallback");
        files.clear();
        acc.bytes = 0;
        useMemory = true;
      } else {
        storage = {
          mode: "disk",
          snapshotDir: diskResult.snapshotDir,
          manifest: diskResult.manifest,
        };
        skillsClaims = diskResult.legacySkillsClaims;
      }
    }
    if (useMemory)
      skillsClaims = await withBoundedTimeout(
        (async () => {
          let legacySkillsClaims = await readHostSkillsClaims(configDir);
          await walkHostConfigDir(configDir, "", files, acc, maxMemoryBytes, legacySkillsClaims);
          return legacySkillsClaims;
        })(),
        HOST_CONFIG_MEMORY_TIMEOUT_MS,
        `[runner:stuck] host config snapshot ${configDir}`,
      );
    if (skillsClaims === "claim-all")
      log(
        `[runner:startup] ${join(configDir, HOST_SKILLS_CLAIMS_FILE)} exists but is unreadable or malformed \u2014 cannot tell org-synced skills from your own, so NO skills were seeded into sessions; delete that file (bookkeeping from an older skills-sync layout) to seed ${join(configDir, "skills")} again`,
      );
  } catch (error) {
    if (!isENOENT(error)) {
      log(
        `[runner:startup] host config snapshot from ${configDir} failed (sessions will start with empty config): ${error}`,
      );
      let reason = error instanceof HostConfigOverCapError ? "over_cap" : "read_error";
      logFeatureBad(
        "self_hosted_host_config",
        reason === "over_cap" ? "host_config_over_cap" : "host_config_read_error",
      );
      return {
        notApplied: {
          sourceDir: configDir,
          reason,
          message: errorMessage(error),
        },
      };
    }
  }
  let envSelfHostedRunnerHostConfigDir = process.env.SELF_HOSTED_RUNNER_HOST_CONFIG_DIR;
  let mcpServers;
  try {
    let globalConfigText = envSelfHostedRunnerHostConfigDir
      ? await (async (fileNames) => {
          for (let fileName of fileNames)
            try {
              let file = await readFile(join(configDir, fileName), "utf8");
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
          ...OAUTH_GLOBAL_FILE_SUFFIXES.map((suffix) => `.claude${suffix}.json`),
        ])
      : isStorageV5Enabled() && storageV5 !== undefined
        ? await readGlobalConfigViaStorage(storageV5)
        : await readFile(getGlobalClaudeFile(), "utf8");
    let globalConfig = await jsonParse(globalConfigText);
    if (globalConfig !== null && typeof globalConfig === "object") {
      let mcpServers_2 = globalConfig.mcpServers;
      if (mcpServers_2 !== null && typeof mcpServers_2 === "object" && Object.keys(mcpServers_2).length > 0)
        mcpServers = mcpServers_2;
    }
  } catch {}
  if (mcpServers) {
    for (let [key, value] of Object.entries(mcpServers)) {
      let problem = describeMcpServerShapeProblem(value);
      if (problem !== undefined) {
        log(
          `[runner:warn] host mcpServers entry "${key}" has ${problem} \u2014 ignoring (the Claude child would drop it silently)`,
        );
        delete mcpServers[key];
      }
    }
    if (Object.keys(mcpServers).length === 0) mcpServers = undefined;
  }
  let fileCount = files.size + (storage.mode === "disk" ? storage.manifest.size : 0);
  if (fileCount === 0 && !mcpServers) {
    if (storage.mode === "disk")
      await rm(storage.snapshotDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
    return;
  }
  let mcpNote = mcpServers ? `, ${Object.keys(mcpServers).length} mcpServer(s)` : "";
  let sizeKiB = (acc.bytes / 1024).toFixed(1);
  log(
    storage.mode === "disk"
      ? `[runner:startup] host config snapshot (disk): ${fileCount} file(s), ${sizeKiB} KiB from ${configDir} \u2192 ${storage.snapshotDir}${mcpNote}`
      : `[runner:startup] host config snapshot: ${fileCount} file(s), ${sizeKiB} KiB from ${configDir}${mcpNote}`,
  );
  logFeatureOk("self_hosted_host_config");
  return {
    snapshot: {
      sourceDir: configDir,
      files,
      mcpServers,
      storage,
    },
  };
}
//@ chunk-asf5gh8x.js:23268-23504 placement
/**
 * 通过存储层读取全局配置 ~/.claude.json，缺失时抛 ENOENT。
 */
async function readGlobalConfigViaStorage(storage) {
  let text = await storage.readText([STORAGE_SPACES.globalConfig()]);
  if (!text.ok) throw Error("global config not readable through storage");
  let item = text.value.items[0];
  if (!item?.found)
    throw Object.assign(Error("ENOENT"), {
      code: "ENOENT",
    });
  return item.value;
}
//@ chunk-asf5gh8x.js:23504-23589 placement
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
//@ chunk-asf5gh8x.js:23589-23986 placement
/**
 * 检查 MCP 服务器条目形状，返回问题描述（无问题返回 undefined）。
 */
function describeMcpServerShapeProblem(server) {
  if (server === null || typeof server !== "object" || Array.isArray(server))
    return `a non-object value (${server === null ? "null" : Array.isArray(server) ? "array" : typeof server})`;
  let serverType = server.type;
  if (serverType === undefined) {
    if ("url" in server && !("command" in server))
      return 'a "url" but no "type" (add "type": "http", "sse", or "ws")';
    return;
  }
  if (typeof serverType !== "string") return `a non-string type (${typeof serverType})`;
  if (!KNOWN_MCP_TRANSPORT_TYPES.has(serverType)) return `unsupported type "${serverType}"`;
  return;
}
//@ chunk-asf5gh8x.js:23986-24002 placement
var HOST_CONFIG_SNAPSHOT_MAX_BYTES = 67108864;
//@ chunk-asf5gh8x.js:24002-24213 placement
/**
 * 读取宿主 skills 认领文件；过大或读失败返回 "claim-all"。
 */
async function readHostSkillsClaims(hostDir) {
  let claimsPath = join(hostDir, HOST_SKILLS_CLAIMS_FILE);
  let rawManifest;
  try {
    if ((await stat(claimsPath)).size > MAX_SYNCED_SKILL_BYTES) return "claim-all";
    rawManifest = await readFile(claimsPath, "utf8");
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? new Set() : "claim-all";
  }
  return parseSkillsSyncManifest(rawManifest, join(hostDir, "skills"));
}
//@ chunk-asf5gh8x.js:24213-24642 placement
/**
 * 递归遍历宿主配置目录，累计字节并收集要快照的文件。
 */
async function walkHostConfigDir(hostDir, relDir, files, acc, maxHeapBytes, legacySkillsClaims) {
  let entries = await readdir(join(hostDir, relDir), {
    withFileTypes: true,
  });
  for (let entry of entries) {
    if (relDir === "" && !shouldSnapshotTopLevelEntry(entry.name)) continue;
    let relPath = relDir === "" ? entry.name : join(relDir, entry.name);
    if (isClaimedByHostSkills(relPath, relDir, entry.name, legacySkillsClaims)) continue;
    if (entry.isDirectory())
      await walkHostConfigDir(hostDir, relPath, files, acc, maxHeapBytes, legacySkillsClaims);
    else if (entry.isFile()) {
      let fullPath = join(hostDir, relPath);
      let stats = await stat(fullPath);
      acc.bytes += stats.size;
      if (acc.bytes > maxHeapBytes) throw new HostConfigOverCapError(maxHeapBytes, relPath);
      let file = await readFile(fullPath);
      acc.bytes += file.length - stats.size;
      if (acc.bytes > maxHeapBytes) throw new HostConfigOverCapError(maxHeapBytes, relPath);
      files.set(relPath, {
        buf: file,
        mode: stats.mode & 511,
      });
    }
  }
}
//@ chunk-asf5gh8x.js:24642-24763 placement
/**
 * 若快照已落盘，删除其目录（尽力而为）。
 */
async function removeCapturedSnapshot(snapshotPromise) {
  try {
    let capture = await snapshotPromise;
    if (capture.outcome === "captured")
      await rm(capture.snapshotDir, {
        recursive: true,
        force: true,
      });
  } catch {}
}
//@ chunk-asf5gh8x.js:24763-24845 placement
function isPathInside(parent, child) {
  let relativePath = relative(resolve(child), resolve(parent));
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}
//@ chunk-asf5gh8x.js:25013-25164 placement
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
//@ chunk-asf5gh8x.js:25164-25241 placement
/**
 * 匹配快照目录名（主机名-pid-随机串），用于清理陈旧快照。
 */
var HOST_CONFIG_SNAPSHOT_DIR_PATTERN = /^\.host-config-snapshot-([A-Za-z0-9_.]{1,64})-(\d+)-[A-Za-z0-9]{6}$/;
//@ chunk-asf5gh8x.js:25241-25332 placement
function getSanitizedHostname() {
  let sliced = hostname()
    .replace(/[^A-Za-z0-9_.]/g, "_")
    .slice(0, 64);
  return sliced === "" ? "host" : sliced;
}
//@ chunk-asf5gh8x.js:25332-25383 placement
function getSnapshotDirPrefixForThisProcess() {
  return `${SNAPSHOT_DIR_PREFIX}${getSanitizedHostname()}-${process.pid}-`;
}
//@ chunk-asf5gh8x.js:25383-25398 placement
/**
 * 已占用快照目录的 pid 集合（防止同机多个 runner 冲突）。
 */
var claimedHostPids = new Set();
//@ chunk-asf5gh8x.js:25398-25477 placement
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
//@ chunk-asf5gh8x.js:25477-26036 placement
/**
 * 启动时删除本机已退出 runner 留下的快照目录；其他主机的快照只提示，不删除。
 */
async function removeStaleHostConfigSnapshots(baseDir, onStatus) {
  let entries = await readdir(baseDir);
  let sanitizedHostname = getSanitizedHostname();
  let keptFromOtherHostsCount = 0;
  for (let entry of entries) {
    let match = HOST_CONFIG_SNAPSHOT_DIR_PATTERN.exec(entry);
    if (!match) continue;
    if (match[1] !== sanitizedHostname) {
      keptFromOtherHostsCount++;
      continue;
    }
    let snapshotDir = join(baseDir, entry);
    let pid = Number(match[2]);
    if (claimedHostPids.has(snapshotDir) || (pid !== process.pid && isProcessAlive(pid))) continue;
    try {
      await rm(snapshotDir, {
        recursive: true,
        force: true,
      });
      onStatus(`[runner:startup] removed stale host config snapshot ${snapshotDir}`);
    } catch (error) {
      onStatus(
        `[runner:warn] could not remove stale host config snapshot ${snapshotDir}: ${errorMessage(error)}`,
      );
    }
  }
  if (keptFromOtherHostsCount > 0)
    onStatus(
      `[runner:warn] kept ${keptFromOtherHostsCount} host config snapshot dir(s) from other hosts under ${baseDir} \u2014 concurrently running runners should not share a --base-dir filesystem`,
    );
}
//@ chunk-asf5gh8x.js:26036-26141 placement
async function writeAll(handle, buffer) {
  let offset = 0;
  while (offset < buffer.length) {
    let { bytesWritten } = await handle.write(buffer, offset, buffer.length - offset);
    offset += bytesWritten;
  }
}
//@ chunk-asf5gh8x.js:26141-26945 placement
/**
 * 以 disk 模式把宿主配置复制到快照目录，捕获期间目录变化则报错。
 */
async function captureHostConfigToDisk(hostDir, baseDir, files, acc, maxHeapBytes, onStatus, cancel) {
  try {
    await removeStaleHostConfigSnapshots(baseDir, onStatus);
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
  let snapshotDir;
  try {
    snapshotDir = await mkdtemp(join(baseDir, getSnapshotDirPrefixForThisProcess()));
  } catch (error) {
    return {
      outcome: "disk_unavailable",
      error,
    };
  }
  let ctx = {
    hostDir,
    snapshotDir,
    files,
    acc,
    heapBytes: 0,
    maxHeapBytes,
    legacySkillsClaims,
    manifest: new Map(),
    chunk: Buffer.allocUnsafe(SNAPSHOT_CHUNK_BYTES),
    onStatus,
    cancel,
  };
  try {
    await copyHostConfigTree(ctx, "");
  } catch (error) {
    await rm(snapshotDir, {
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
  claimedHostPids.add(snapshotDir);
  return {
    outcome: "captured",
    snapshotDir,
    manifest: ctx.manifest,
    legacySkillsClaims,
  };
}
//@ chunk-asf5gh8x.js:26945-27256 placement
/**
 * 递归复制配置树：hooks 读入内存，其余写入快照。
 */
async function copyHostConfigTree(ctx, relDir) {
  let entries = await readdir(join(ctx.hostDir, relDir), {
    withFileTypes: true,
  });
  for (let entry of entries) {
    throwIfHostConfigCancelled(ctx.cancel);
    if (relDir === "" && !shouldSnapshotTopLevelEntry(entry.name)) continue;
    let relPath = relDir === "" ? entry.name : join(relDir, entry.name);
    if (isClaimedByHostSkills(relPath, relDir, entry.name, ctx.legacySkillsClaims)) continue;
    if (entry.isDirectory()) await copyHostConfigTree(ctx, relPath);
    else if (entry.isFile())
      if (isHookPathEntry(relPath)) await readHookFileIntoMemory(ctx, relPath);
      else await copyFileIntoSnapshot(ctx, relPath);
  }
}
//@ chunk-asf5gh8x.js:27256-27369 placement
function reportEntryDisappearedDuringCapture(ctx, relPath) {
  ctx.onStatus(`[runner:startup] host config snapshot: skipping ${relPath} (disappeared during capture)`);
}
//@ chunk-asf5gh8x.js:27369-27723 placement
/**
 * 把 hooks 下的文件读入内存（计入内存上限）。
 */
async function readHookFileIntoMemory(ctx, relPath) {
  let fullPath = join(ctx.hostDir, relPath);
  let stats;
  let buf;
  try {
    stats = await stat(fullPath);
    ctx.heapBytes += stats.size;
    if (ctx.heapBytes > ctx.maxHeapBytes) throw new HostConfigOverCapError(ctx.maxHeapBytes, relPath);
    buf = await readFile(fullPath);
  } catch (error) {
    if (isENOENT(error)) {
      reportEntryDisappearedDuringCapture(ctx, relPath);
      return;
    }
    throw error;
  }
  ctx.heapBytes += buf.length - stats.size;
  if (ctx.heapBytes > ctx.maxHeapBytes) throw new HostConfigOverCapError(ctx.maxHeapBytes, relPath);
  ctx.files.set(relPath, {
    buf,
    mode: stats.mode & 511,
  });
  ctx.acc.bytes += buf.length;
}
//@ chunk-asf5gh8x.js:27723-28414 placement
/**
 * 以不跟随链接方式打开源文件，复制到快照并计算 sha256。
 */
async function copyFileIntoSnapshot(ctx, relPath) {
  let sourceHandle;
  try {
    sourceHandle = await open(join(ctx.hostDir, relPath), getNoFollowReadFlags());
  } catch (error) {
    if (isENOENT(error)) {
      reportEntryDisappearedDuringCapture(ctx, relPath);
      return;
    }
    throw error;
  }
  try {
    let stats = await sourceHandle.stat();
    if (!stats.isFile()) return;
    let mode = stats.mode & 511;
    let destPath = join(ctx.snapshotDir, relPath);
    let destHandle;
    try {
      await mkdir(dirname(destPath), {
        recursive: true,
      });
      destHandle = await open(destPath, "wx", 384);
    } catch (error) {
      throw new SnapshotDirWriteError(error);
    }
    let hash = createHash("sha256");
    let totalBytes = 0;
    try {
      let { chunk } = ctx;
      for (;;) {
        throwIfHostConfigCancelled(ctx.cancel);
        let { bytesRead } = await sourceHandle.read(chunk, 0, chunk.length, null);
        if (bytesRead === 0) break;
        let chunk_2 = chunk.subarray(0, bytesRead);
        hash.update(chunk_2);
        try {
          await writeAll(destHandle, chunk_2);
        } catch (error) {
          throw new SnapshotDirWriteError(error);
        }
        totalBytes += bytesRead;
      }
    } catch (error) {
      await destHandle.close().catch(() => {});
      throw error;
    }
    try {
      await destHandle.close();
    } catch (error) {
      throw new SnapshotDirWriteError(error);
    }
    ctx.manifest.set(relPath, {
      sha256: hash.digest("hex"),
      size: totalBytes,
      mode,
    });
    ctx.acc.bytes += totalBytes;
  } finally {
    await sourceHandle.close().catch(() => {});
  }
}
//@ chunk-asf5gh8x.js:28414-28456 placement
var CCR_GIT_DIR_NAME = ".ccr-git";
var CCR_LAUNCHER_DIRS = [".ccr-launcher", CCR_GIT_DIR_NAME];
//@ chunk-asf5gh8x.js:28456-28759 placement
/**
 * 检查 git 目录下的 hooks 是否为普通目录（是其他类型时记日志并返回 false），文件系统操作有卡住超时。
 */
async function isHooksDirSafe(claudeConfigDir, onStatus, timeoutMs = FS_OP_TIMEOUT_MS) {
  let hooksDir = join(claudeConfigDir, "hooks");
  let hooksStats = await withBoundedTimeout(
    lstat(hooksDir).catch((error) => (isENOENT(error) ? undefined : Promise.reject(error))),
    timeoutMs,
    `[runner:stuck] fs op 'lstat ${hooksDir}' (check mount health)`,
  );
  if (hooksStats !== undefined && !hooksStats.isDirectory()) {
    onStatus(`[runner:session] ${hooksDir} exists and is not a plain directory \u2014 not following`);
    return false;
  }
  return true;
}
//@ chunk-asf5gh8x.js:28759-28792 placement
/**
 * 记录已发现快照问题的 WeakMap，后续会话直接复用错误。
 */
var seededSnapshotErrors = new WeakMap();
var HOOKS_DIR_SAFETY_TIMEOUT_MS = 1e4;
var HOOKS_CHECK_TIMEOUT_MS = 1e4;
//@ chunk-asf5gh8x.js:28792-30178 placement
/**
 * 把快照种入会话配置目录；发现篡改时记录并拒绝。
 */
async function seedHostConfigForSession(
  targetDir,
  snapshot,
  onDebug,
  onStatus,
  configSuffix = fileSuffixForOauthConfig(),
) {
  if (!snapshot)
    return {
      outcome: "seeded",
    };
  let cachedError = seededSnapshotErrors.get(snapshot);
  if (cachedError !== undefined) {
    let tamperError = new HostConfigSnapshotTamperedError(
      cachedError.rel,
      `${cachedError.what}; found by an earlier session on this runner`,
    );
    onStatus(`[runner:error] ${tamperError.message}`);
    logFeatureBad("self_hosted_host_config", "host_config_tampered");
    throw tamperError;
  }
  let seedAcc = {
    files: 0,
    bytes: 0,
    names: [],
    published: [],
    cancelTakesBack: snapshot.storage.mode === "disk",
    cancel: {
      cancelled: false,
    },
  };
  let writeLabel = `[runner:stuck] seed write \u2192 ${targetDir}`;
  try {
    await withBoundedTimeout(
      seedHostConfigFromMemory(targetDir, snapshot, configSuffix, seedAcc, onStatus),
      HOST_CONFIG_CAPTURE_TIMEOUT_MS,
      writeLabel,
    );
    if (seedAcc.files > 0 || snapshot.mcpServers) {
      let mcpSummary = snapshot.mcpServers
        ? `.claude.json[mcpServers\xD7${Object.keys(snapshot.mcpServers).length}]`
        : undefined;
      let seededSummary =
        snapshot.storage.mode === "disk"
          ? [
              `${seedAcc.files} file(s), ${(seedAcc.bytes / 1024).toFixed(1)} KiB`,
              ...(mcpSummary ? [mcpSummary] : []),
            ].join(", ")
          : [...seedAcc.names, ...(mcpSummary ? [mcpSummary] : [])].join(", ");
      onDebug(`[runner:session] Seeded ${seededSummary} from host config snapshot (${snapshot.sourceDir})`);
    }
    return {
      outcome: "seeded",
    };
  } catch (error) {
    let seedError = error;
    if (error instanceof BoundedTimeoutError && snapshot.storage.mode === "disk") {
      seedAcc.cancel.cancelled = true;
      seedError = new HostConfigSeedTimeoutError(targetDir, error);
      onStatus(`[runner:error] ${errorMessage(seedError)}`);
      logFeatureBad("self_hosted_host_config", "host_config_seed_timeout");
    }
    if (isHostConfigSnapshotError(seedError)) {
      if (seedAcc.published.length > 0)
        await withBoundedTimeout(
          unlinkAllReverse(seedAcc.published),
          HOOKS_CHECK_TIMEOUT_MS,
          `[runner:stuck] remove the files seeded into ${targetDir}`,
        ).catch((error) =>
          onStatus(
            `[runner:error] could not remove the files seeded into ${targetDir}: ${errorMessage(error)}`,
          ),
        );
      throw seedError;
    }
    onStatus(`[runner:session] Seed write to ${targetDir} failed (best-effort): ${error}`);
    seedAcc.cancel.cancelled = true;
    logFeatureSad("self_hosted_host_config", "host_config_seed_partial");
    return {
      outcome: "partial",
      error: errorMessage(error),
    };
  }
}
//@ chunk-asf5gh8x.js:30178-31683 placement
/**
 * memory 模式：把内存中的文件逐个写入会话配置目录。
 */
async function seedHostConfigFromMemory(configDir, snapshot, configSuffix, seedAcc, onStatus) {
  let isDiskMode = snapshot.storage.mode === "disk";
  let { cancel } = seedAcc;
  try {
    let createdDirs = new Set();
    await ensurePlainDirectory(configDir);
    throwIfHostConfigCancelled(cancel);
    let hasSafeHooksDir = await isHooksDirSafe(configDir, onStatus, HOOKS_DIR_SAFETY_TIMEOUT_MS);
    throwIfHostConfigCancelled(cancel);
    if (!hasSafeHooksDir) throw new HostConfigSeedTargetError(join(configDir, "hooks"));
    for (let [relPath, { buf, mode }] of snapshot.files) {
      throwIfHostConfigCancelled(cancel);
      let lower = relPath.toLowerCase();
      if (
        CCR_LAUNCHER_DIRS.some(
          (launcherDir) =>
            lower.startsWith("hooks" + sep + launcherDir + sep) || lower === "hooks" + sep + launcherDir,
        )
      )
        continue;
      await ensureParentDirsPlain(configDir, relPath, createdDirs, cancel);
      await writeViaTempAndRename(configDir, relPath, mode, seedAcc, (handle) => writeAll(handle, buf));
      if (!isDiskMode) seedAcc.names.push(relPath);
      seedAcc.files++;
      seedAcc.bytes += buf.length;
    }
    if (snapshot.storage.mode === "disk") {
      let { snapshotDir, manifest } = snapshot.storage;
      if (manifest.size > 0) {
        let snapshotStats = await lstat(snapshotDir).catch((error) => {
          if (isENOENT(error)) return;
          throw new HostConfigSnapshotReadError(
            basename(snapshotDir),
            getErrnoCode(error) ?? errorMessage(error),
          );
        });
        if (snapshotStats === undefined || !snapshotStats.isDirectory())
          throw new HostConfigSnapshotTamperedError(
            basename(snapshotDir),
            `the snapshot directory ${snapshotDir} was removed or replaced after runner startup (another runner or a cleanup job sharing --base-dir?)`,
          );
      }
      let chunk = Buffer.allocUnsafe(SNAPSHOT_CHUNK_BYTES);
      for (let [manifestRelPath, manifestEntry] of manifest) {
        throwIfHostConfigCancelled(cancel);
        await ensureParentDirsPlain(configDir, manifestRelPath, createdDirs, cancel);
        await verifyAndCopySnapshotEntry(
          snapshotDir,
          configDir,
          manifestRelPath,
          manifestEntry,
          chunk,
          seedAcc,
        );
        seedAcc.files++;
        seedAcc.bytes += manifestEntry.size;
      }
    }
    if (snapshot.mcpServers) {
      throwIfHostConfigCancelled(cancel);
      let mcpJson = await jsonStringify({
        mcpServers: snapshot.mcpServers,
      });
      let mcpFileName = `.claude${configSuffix}.json`;
      await writeViaTempAndRename(configDir, mcpFileName, 384, seedAcc, (handle) =>
        writeAll(handle, Buffer.from(mcpJson)),
      );
    }
  } catch (error) {
    if (error instanceof HostConfigSnapshotTamperedError) {
      let isFirstTamper = !seededSnapshotErrors.has(snapshot);
      if (isFirstTamper)
        seededSnapshotErrors.set(snapshot, {
          rel: error.rel,
          what: error.what,
        });
      onStatus(`[runner:error] ${error.message}`);
      if (isFirstTamper)
        onStatus(
          "[runner:error] this runner now refuses to start sessions until it is restarted \u2014 replace it",
        );
      logFeatureBad("self_hosted_host_config", "host_config_tampered");
    } else if (error instanceof HostConfigSeedTargetError) {
      onStatus(`[runner:error] ${error.message}`);
      logFeatureBad("self_hosted_host_config", "host_config_seed_target");
    } else if (error instanceof HostConfigSnapshotReadError) {
      onStatus(`[runner:error] ${error.message}`);
      logFeatureBad("self_hosted_host_config", "host_config_seed_io");
    }
    throw error;
  }
}
//@ chunk-asf5gh8x.js:31683-31919 placement
/**
 * 确保路径是普通目录（不存在则 0700 创建），否则抛 HostConfigSeedTargetError。
 */
async function ensurePlainDirectory(path) {
  let stats = await lstat(path).catch((error) => (isENOENT(error) ? undefined : Promise.reject(error)));
  if (stats === undefined)
    try {
      await mkdir(path, {
        mode: 448,
      });
      return "made";
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
      stats = await lstat(path);
    }
  if (!stats.isDirectory()) throw new HostConfigSeedTargetError(path);
  return "found";
}
//@ chunk-asf5gh8x.js:31919-32127 placement
async function ensureSessionConfigDirs(claudeConfigDir, dirs) {
  await mkdir(claudeConfigDir, {
    recursive: true,
    mode: 448,
  });
  try {
    let outcomes = [];
    for (let dir of dirs) outcomes.push(await ensurePlainDirectory(dir));
    return outcomes;
  } catch (error) {
    if (error instanceof HostConfigSeedTargetError)
      logFeatureBad("self_hosted_host_config", "host_config_seed_target");
    throw error;
  }
}
//@ chunk-asf5gh8x.js:32127-32459 placement
/**
 * 逐级确认父目录是普通目录。
 */
async function ensureParentDirsPlain(rootDir, relPath, createdDirs, cancel) {
  let sliced = relPath.split(sep).slice(0, -1);
  let currentRel = "";
  for (let segment of sliced) {
    currentRel = currentRel === "" ? segment : join(currentRel, segment);
    if (createdDirs.has(currentRel)) continue;
    throwIfHostConfigCancelled(cancel);
    let fullPath = join(rootDir, currentRel);
    let stats = await lstat(fullPath).catch((error) => (isENOENT(error) ? undefined : Promise.reject(error)));
    if (stats === undefined)
      try {
        await mkdir(fullPath);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        stats = await lstat(fullPath);
      }
    if (stats !== undefined && !stats.isDirectory()) throw new HostConfigSeedTargetError(fullPath);
    createdDirs.add(currentRel);
  }
}
//@ chunk-asf5gh8x.js:32459-32669 placement
/**
 * 原子写会话配置文件（先写 .seed- 临时文件再改名）。
 */
async function writeSessionFileAtomically(
  configDir,
  relPath,
  contents,
  mode,
  cancel = {
    cancelled: false,
  },
) {
  let seedAcc = {
    cancel,
    published: [],
    cancelTakesBack: true,
  };
  await ensurePlainDirectory(configDir);
  await ensureParentDirsPlain(configDir, relPath, new Set(), seedAcc.cancel);
  let buf = typeof contents === "string" ? Buffer.from(contents) : contents;
  await writeViaTempAndRename(configDir, relPath, mode, seedAcc, (handle) => writeAll(handle, buf));
}
//@ chunk-asf5gh8x.js:32669-33149 placement
async function writeViaTempAndRename(rootDir, relPath, mode, seedAcc, writeFn) {
  let { cancel } = seedAcc;
  let destPath = join(rootDir, relPath);
  let destStats = await lstat(destPath).catch((error) =>
    isENOENT(error) ? undefined : Promise.reject(error),
  );
  if (destStats !== undefined && !destStats.isFile() && !destStats.isSymbolicLink())
    throw new HostConfigSeedTargetError(destPath, "file");
  let tempPath = join(dirname(destPath), `.${basename(destPath)}.seed-${randomUUID().slice(0, 8)}`);
  throwIfHostConfigCancelled(cancel);
  let handle = await open(tempPath, "wx", mode);
  try {
    await writeFn(handle);
    await handle.close();
    throwIfHostConfigCancelled(cancel);
    await renameOverPlainFile(tempPath, destPath);
    seedAcc.published.push(destPath);
    if (cancel.cancelled) {
      if (seedAcc.cancelTakesBack) await unlink(destPath).catch(() => {});
      throwIfHostConfigCancelled(cancel);
    }
  } catch (error) {
    await handle.close().catch(() => {});
    await unlink(tempPath).catch(() => {});
    throw error;
  }
}
//@ chunk-asf5gh8x.js:33149-33271 placement
async function unlinkAllReverse(published) {
  let firstError;
  for (let j = published.length - 1; j >= 0; j--)
    try {
      await unlink(published[j]);
    } catch (error) {
      if (!isENOENT(error)) firstError ??= error;
    }
  if (firstError !== undefined) throw firstError;
}
//@ chunk-asf5gh8x.js:33271-33574 placement
async function renameOverPlainFile(tempPath, destPath) {
  try {
    await retryFsOp(tempPath, destPath, rename);
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
  let destStats = await lstat(destPath).catch((error) =>
    isENOENT(error) ? undefined : Promise.reject(error),
  );
  if (destStats !== undefined) {
    if (!destStats.isFile() && !destStats.isSymbolicLink())
      throw new HostConfigSeedTargetError(destPath, "file");
    await unlink(destPath);
  }
  await retryFsOp(tempPath, destPath, rename);
}
//@ chunk-asf5gh8x.js:33645-33880 placement
/**
 * 描述快照条目被替换成什么（socket、设备节点、非普通文件）。
 */
async function describeChangedEntry(path) {
  let stats;
  try {
    stats = await lstat(path);
  } catch {
    return;
  }
  if (stats.isFile()) return;
  if (stats.isSocket()) return "replaced by a socket";
  if (stats.isCharacterDevice() || stats.isBlockDevice()) return "replaced by a device node";
  return "no longer a regular file";
}
//@ chunk-asf5gh8x.js:33880-34132 placement
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
//@ chunk-asf5gh8x.js:34132-34953 placement
/**
 * 以快照为准逐个校验条目（大小、sha256、类型），检测被替换/截断/内容变化。
 */
async function verifyAndCopySnapshotEntry(snapshotDir, destRootDir, relPath, manifestEntry, chunk, seedAcc) {
  let { cancel } = seedAcc;
  let sourceHandle;
  try {
    sourceHandle = await open(join(snapshotDir, relPath), getNoFollowReadFlags());
  } catch (error) {
    let code = getErrnoCode(error);
    if (code !== undefined && isFsInaccessible_2.has(code))
      throw new HostConfigSnapshotTamperedError(relPath, describeOpenErrno(code));
    let changedReason = await describeChangedEntry(join(snapshotDir, relPath));
    if (changedReason !== undefined) throw new HostConfigSnapshotTamperedError(relPath, changedReason);
    throw new HostConfigSnapshotReadError(relPath, code ?? errorMessage(error));
  }
  try {
    let stats;
    try {
      stats = await sourceHandle.stat();
    } catch (error) {
      throw new HostConfigSnapshotReadError(relPath, getErrnoCode(error) ?? errorMessage(error));
    }
    if (!stats.isFile()) throw new HostConfigSnapshotTamperedError(relPath, "no longer a regular file");
    if (stats.size !== manifestEntry.size)
      throw new HostConfigSnapshotTamperedError(
        relPath,
        `size is ${stats.size} bytes, was ${manifestEntry.size}`,
      );
    await writeViaTempAndRename(destRootDir, relPath, manifestEntry.mode, seedAcc, async (destHandle) => {
      let hash = createHash("sha256");
      let size = manifestEntry.size;
      while (size > 0) {
        throwIfHostConfigCancelled(cancel);
        let bytesRead;
        try {
          ({ bytesRead } = await sourceHandle.read(chunk, 0, Math.min(chunk.length, size), null));
        } catch (error) {
          throw new HostConfigSnapshotReadError(relPath, getErrnoCode(error) ?? errorMessage(error));
        }
        if (bytesRead === 0) throw new HostConfigSnapshotTamperedError(relPath, "shrank while being copied");
        let chunk_2 = chunk.subarray(0, bytesRead);
        hash.update(chunk_2);
        await writeAll(destHandle, chunk_2);
        size -= bytesRead;
      }
      if (hash.digest("hex") !== manifestEntry.sha256)
        throw new HostConfigSnapshotTamperedError(relPath, "content changed");
    });
  } finally {
    await sourceHandle.close().catch(() => {});
  }
}
//@ chunk-asf5gh8x.js:34953-34994 placement
/**
 * 公版构建里的空实现。
 */
function startClockSkewMonitor({ clock, onStatus }) {
  return;
}
//@ chunk-asf5gh8x.js:34994-35185 placement
/**
 * 公版构建里的空实现（runner 令牌续期）。
 */
function startRunnerTokenRefresher({
  baseUrl,
  getRunnerToken,
  renewRunnerToken,
  renewSessionTokens,
  isThawing,
  thaws,
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
//@ chunk-asf5gh8x.js:35251-35262 placement
/**
 * 检查 --base-dir 可写的默认超时。
 */
var BASE_DIR_CHECK_TIMEOUT_MS = 1e4;
//@ chunk-asf5gh8x.js:35262-35684 placement
/**
 * 带超时检查 --base-dir 可创建且可写，失败时提示 NFS/CSI 挂载健康或设置 SELF_HOSTED_RUNNER_BASE_DIR。
 */
async function checkBaseDirWritable(
  baseDir,
  timeoutMs = BASE_DIR_CHECK_TIMEOUT_MS,
  onFatalLog = (message) => console.error(message),
) {
  try {
    await withBoundedTimeout(
      mkdir(baseDir, {
        recursive: true,
      }).then(() => access(baseDir, constants_3.W_OK | constants_3.X_OK)),
      timeoutMs,
      `base directory check for ${baseDir}`,
    );
  } catch (error) {
    let message = errorMessage(error);
    if (message.includes("timed out after")) {
      onFatalLog(`[runner:fatal] ${message} \u2014 check NFS/CSI mount health`);
      process.exit(1);
    }
    throw Error(
      `cannot create or write to base directory ${baseDir} (${getErrnoCode(error) ?? message}); pass --base-dir <writable path> or set SELF_HOSTED_RUNNER_BASE_DIR`,
    );
  }
}
//@ chunk-asf5gh8x.js:35784-35806 placement
/**
 * 预留的额外 git 目录来源（当前恒 undefined）。
 */
function extraGitDir(configDir) {
  return;
}
//@ chunk-asf5gh8x.js:35806-35877 placement
/**
 * 列出会话要清理/搜索的 git 目录。
 */
function gitSearchDirs(configDir, extraDir) {
  return normalizeCaseForComparison_2(
    [join(configDir, "git"), extraGitDir(extraDir)].filter((dir) => dir !== undefined),
  );
}
//@ chunk-asf5gh8x.js:35877-36014 placement
/**
 * 启动会话子进程前清除的 git 全局环境变量。
 */
var GIT_ENV_VARS_TO_CLEAR = new Set([
  ...GIT_ENV_VARS_TO_CLEAR_2.filter((envVar) => envVar !== "GIT_CONFIG_GLOBAL"),
  "GIT_TEMPLATE_DIR",
  "GIT_EXEC_PATH",
  "GIT_GRAFT_FILE",
  "GIT_REPLACE_REF_BASE",
]);
//@ chunk-asf5gh8x.js:36014-36106 placement
/**
 * 代码审查令牌交接的常量：fd、环境变量名与这些 fd 的 stdio 模式。
 */
var CODE_REVIEW_TOKEN_HANDOFF_FD = 4;
var CODE_REVIEW_TOKEN_FD = 5;
var CODE_REVIEW_TOKEN_HANDOFF = "code_review_token_handoff";
var CHILD_STDIO_MODES = ["pipe", "pipe", "pipe", "pipe", "pipe", "pipe"];
//@ chunk-asf5gh8x.js:36106-36425 placement
/**
 * 构造把宿主认证相关环境变量全部置空的覆盖表。
 */
function buildClearedAuthEnv() {
  return {
    ...Object.fromEntries(TOKEN_FD_ENV_VARS.map((envVar) => [envVar, undefined])),
    CLAUDE_BG_AUTH_SNAPSHOT_PATH: undefined,
    CLAUDE_CODE_HOST_AUTH_ENV_VAR: undefined,
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
    CLAUDE_CODE_OAUTH_TOKEN: undefined,
    CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR: String(CODE_REVIEW_TOKEN_HANDOFF_FD),
    CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: String(CODE_REVIEW_TOKEN_FD),
  };
}
//@ chunk-asf5gh8x.js:36425-36641 placement (2.1.88 match: runComputerUseMcpServer, 0.427)
/**
 * （误归 computerUse/mcpServer）把 sessionToken / inferenceToken 写入子进程额外的 stdio 管道并关闭。
 */
function writeChildSessionTokens(child, tokens, onError) {
  try {
    let stdio = child.stdio;
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
