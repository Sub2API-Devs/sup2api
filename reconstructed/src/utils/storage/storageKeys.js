/**
 * utils/storage/storageKeys.ts
 *
 * 2.1.316 新增：存储键对应的路径片段；按命名空间校验范围等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (61)
 * attribution: placement 61
 */
import { basename, dirname } from "path";
import { invalidStorageArgument } from "./storageErrors.js";
import {
  areValidKeySegments,
  isValidKeySegment,
  storageNameSpellings,
  STORAGE_SPACES,
} from "./storageSpaces.js";
import { BACKUP_FILE_NAME_PATTERN_WITH_LEGACY, getProjectsDir } from "../sessionStoragePortable.js";
import { hasJsonlFiles } from "../errorLogSink.js";

//@ chunk-t0gq9gyw.js:25952-26099 placement
function invalidSegmentError(e) {
  return invalidStorageArgument(
    e,
    "expected a segment that is not empty or made only of dots and spaces, with no path separator, NUL or set-aside shape",
  );
}
//@ chunk-t0gq9gyw.js:26099-26329 placement
/**
 * 校验存储键对象。
 */
function validateStorageKey(e) {
  if (typeof e !== "object" || e === null) return invalidStorageArgument("key", "expected a key object");
  let n = validateKeyByNamespace(e);
  if (n !== undefined) return n;
  let r = keyPathSegments(e);
  if (r === undefined) return invalidStorageArgument("key", `${e.namespace} is not a storage namespace`);
  return checkKeyFields("key", r);
}
//@ chunk-t0gq9gyw.js:26329-26757 placement
/**
 * 按字段定义检查键字段（必填、格式）。
 */
function checkKeyFields(e, n) {
  for (let [r, o, s] of n) {
    let a = `${e}.${r}`;
    if (o === undefined) {
      if (s !== "optional") return invalidStorageArgument(a, "required");
    } else if (isRelPathField(r)) {
      if (
        !(e === "scope" && r === "agentRelPath" && Array.isArray(o) && o.length === 0) &&
        (!Array.isArray(o) || !areValidKeySegments(o))
      )
        return invalidStorageArgument(
          a,
          "expected a non-empty array of segments, none empty or made only of dots and spaces, with no path separator, NUL or set-aside shape",
        );
    } else if (typeof o !== "string" || !isValidKeySegment(o)) return invalidSegmentError(a);
  }
  return;
}
//@ chunk-t0gq9gyw.js:26757-26813 placement
function isRelPathField(e) {
  return e === "relPath" || e === "agentRelPath";
}
//@ chunk-t0gq9gyw.js:26813-26987 placement
var USER_CONFIG_DIR_NAMES = [
  "commands",
  "agents",
  "output-styles",
  "skills",
  "workflows",
  "routines",
  "themes",
  "rules",
  "session-env",
  "uploads",
  "mcp-skill-archives",
  "usage-data",
  "mcp-discovery-cache",
];
//@ chunk-t0gq9gyw.js:26987-27144 placement
var USER_CONFIG_DIR_NAME_SET = new Set(USER_CONFIG_DIR_NAMES);
var USER_CONFIG_DIR_ERROR = `must be one of the userConfigDir directory names (${USER_CONFIG_DIR_NAMES.join(", ")})`;
var PLUGIN_REGISTRY_FILES = ["installed", "marketplaces", "flagged", "catalog", "inUseSweep"];
//@ chunk-t0gq9gyw.js:27144-27253 placement
var PLUGIN_REGISTRY_FILE_SET = new Set(PLUGIN_REGISTRY_FILES);
var PLUGIN_REGISTRY_FILE_ERROR = `must be one of the pluginRegistry files (${PLUGIN_REGISTRY_FILES.join(", ")})`;
var MARKETPLACE_CACHE_FORMS_2 = ["manifest", "catalog"];
//@ chunk-t0gq9gyw.js:27253-27338 placement
var MARKETPLACE_CACHE_FORMS = new Set(MARKETPLACE_CACHE_FORMS_2);
var MARKETPLACE_CACHE_FORM_ERROR = `must be one of the marketplaceCache forms (${MARKETPLACE_CACHE_FORMS_2.join(", ")})`;
//@ chunk-t0gq9gyw.js:27338-27355 placement
var SESSION_JOURNAL_NAMES = ["world"];
//@ chunk-t0gq9gyw.js:27355-27439 placement
var SESSION_JOURNAL_NAME_SET = new Set(SESSION_JOURNAL_NAMES);
var SESSION_JOURNAL_NAME_ERROR = `must be one of the session journal names (${SESSION_JOURNAL_NAMES.join(", ")})`;
//@ chunk-t0gq9gyw.js:27439-27471 placement
function isSessionJournalName(sessionJournal) {
  return SESSION_JOURNAL_NAME_SET.has(sessionJournal);
}
//@ chunk-t0gq9gyw.js:27471-27539 placement
function isSha256Hex(digest) {
  return typeof digest === "string" && /^[0-9a-f]{64}$/.test(digest);
}
//@ chunk-t0gq9gyw.js:27539-29572 placement
/**
 * 按命名空间校验存储键。
 */
function validateKeyByNamespace(e) {
  if (e.namespace === "transcript") return validateTranscriptKey(e);
  if (e.namespace === "pluginAssetCache" && !isSha256Hex(e.digest))
    return invalidStorageArgument(
      "key.digest",
      "must be a SHA-256 digest: 64 lowercase hexadecimal characters",
    );
  if (e.namespace === "globalConfig" && "kind" in e) {
    if (!isGlobalConfigCopyKind(e.kind))
      return invalidStorageArgument("key.kind", GLOBAL_CONFIG_COPY_KIND_ERROR);
    if (typeof e.stamp !== "string")
      return invalidStorageArgument("key.stamp", "a recovery copy key carries its stamp");
  }
  if (e.namespace === "task") return validateTaskKey(e);
  if (e.namespace === "sidecar") {
    let n = validateSessionIdSegment("key.sessionId", e.sessionId);
    if (n !== undefined) return n;
    if (namesJsonlStream(e.relPath)) return invalidStorageArgument("key.relPath", JSONL_STREAM_KEY_ERROR);
    return isRecordingStreamPath(e.relPath)
      ? invalidStorageArgument("key.relPath", RECORDING_STREAM_ADDRESSED_ERROR)
      : undefined;
  }
  if (e.namespace === "recording")
    return (
      validateSessionIdSegment("key.sessionId", e.sessionId) ??
      (isRecordingStamp(e.stamp) ? undefined : invalidStorageArgument("key.stamp", RECORDING_STAMP_ERROR))
    );
  if (e.namespace === "jobsRoot") return validateJobsKey(e);
  if (e.namespace === "userConfigDir" && !USER_CONFIG_DIR_NAME_SET.has(e.dir))
    return invalidStorageArgument("key.dir", USER_CONFIG_DIR_ERROR);
  if (e.namespace === "fileHistory") return validateBackupFileName(e);
  if (e.namespace === "settings" && !isMcpServerFromProjectOrLocalSettings_2(e.layer))
    return invalidStorageArgument("key.layer", "must be user, project or local");
  if (e.namespace === "log") return validateLogChannelKey(e);
  if (e.namespace === "job" && isJobTimelinePath(e.relPath))
    return invalidStorageArgument("key.relPath", JOB_TIMELINE_KEY_ERROR);
  if (e.namespace === "sessionLog")
    return (
      validateDateParts("key", e) ??
      (isShortLogName(e.logName)
        ? undefined
        : invalidStorageArgument(
            "key.logName",
            "must be the session-log stem <sessionId8>[-<title-slug>]: up to eight word characters, then lower-case a-z / 0-9 runs joined by single hyphens; not a bare device name",
          ))
    );
  if (e.namespace === "pluginRegistry" && !PLUGIN_REGISTRY_FILE_SET.has(e.file))
    return invalidStorageArgument("key.file", PLUGIN_REGISTRY_FILE_ERROR);
  if (e.namespace === "marketplaceCache") {
    if (!("relPath" in e))
      return MARKETPLACE_CACHE_FORMS.has(e.form)
        ? undefined
        : invalidStorageArgument("key.form", MARKETPLACE_CACHE_FORM_ERROR);
    return e.form === undefined
      ? undefined
      : invalidStorageArgument("key.form", "a tree file key carries relPath, not form");
  }
  if (e.namespace !== "agentMemory") return;
  if (!isMcpServerFromProjectOrLocalSettings(e.layer))
    return invalidStorageArgument("key.layer", "must be user, project or local");
  if (e.layer === "user" && "projectKey" in e)
    return invalidStorageArgument("key.projectKey", "the user layer is not keyed by project");
  if (e.layer !== "user" && typeof e.projectKey !== "string")
    return invalidStorageArgument("key.projectKey", "required for the project and local layers");
  return typeof e.agentType === "string"
    ? undefined
    : invalidStorageArgument("key.agentType", "an agent memory key names its agent");
}
//@ chunk-t0gq9gyw.js:29572-29769 placement
function validateBackupFileName(e) {
  return typeof e.backupFileName !== "string" || !BACKUP_FILE_NAME_PATTERN_WITH_LEGACY.test(e.backupFileName)
    ? invalidStorageArgument(
        "key.backupFileName",
        "must be a backup file name the engine has ever written (hex hash @v version)",
      )
    : undefined;
}
//@ chunk-t0gq9gyw.js:29769-29830 placement = isMcpServerFromProjectOrLocalSettings (1)
function isMcpServerFromProjectOrLocalSettings(config) {
  return config === "user" || config === "project" || config === "local";
}
//@ chunk-t0gq9gyw.js:29830-29860 placement
var GLOBAL_CONFIG_COPY_KINDS = ["backup", "corrupted"];
//@ chunk-t0gq9gyw.js:29860-29947 placement
var GLOBAL_CONFIG_COPY_KIND_SET = new Set(GLOBAL_CONFIG_COPY_KINDS);
var GLOBAL_CONFIG_COPY_KIND_ERROR = `must be one of the global-config copy kinds (${GLOBAL_CONFIG_COPY_KINDS.join(", ")})`;
//@ chunk-t0gq9gyw.js:29947-29979 placement
function isGlobalConfigCopyKind(kind) {
  return GLOBAL_CONFIG_COPY_KIND_SET.has(kind);
}
//@ chunk-t0gq9gyw.js:29979-30853 placement
/**
 * 校验转录存储键（会话、代理相对路径）。
 */
function validateTranscriptKey(e) {
  let n = validateSessionIdSegment("key.sessionId", e.sessionId);
  if (n !== undefined) return n;
  if (namesJsonlStream(e.agentRelPath))
    return invalidStorageArgument("key.agentRelPath", JSONL_STREAM_KEY_ERROR);
  if ("sessionJournal" in e) {
    if (typeof e.sessionJournal !== "string" || !isSessionJournalName(e.sessionJournal))
      return invalidStorageArgument("key.sessionJournal", SESSION_JOURNAL_NAME_ERROR);
    return e.agentId === undefined && e.agentRelPath === undefined && !("journal" in e)
      ? undefined
      : invalidStorageArgument(
          "key.sessionJournal",
          "a session journal key names the session's own journal: no agentId, agentRelPath or run journal",
        );
  }
  if ("journal" in e) {
    if (e.journal !== true) return invalidStorageArgument("key.journal", "must be true");
    if (!Array.isArray(e.agentRelPath))
      return invalidStorageArgument("key.agentRelPath", "a run journal key carries its run directory");
    return e.agentId === undefined
      ? undefined
      : invalidStorageArgument(
          "key.agentId",
          "a transcript key names an agent transcript or the run journal, never both",
        );
  }
  return e.agentRelPath !== undefined && e.agentId === undefined
    ? invalidStorageArgument("key.agentRelPath", "requires agentId or journal")
    : undefined;
}
//@ chunk-t0gq9gyw.js:30853-30931 placement
/**
 * 云快照、side.git、同步目录名。
 */
var CLOUD_SNAPSHOTS_DIR = "cloud-snapshots";
var SIDE_GIT = "side.git";
var ARCHIVE_SYNC = "archive-sync";
var FOLDER_SYNC = "folder-sync";
//@ chunk-t0gq9gyw.js:30931-31303 placement
/**
 * 「steps-under-way」目录名：会话转录下保留项目级条目的保留名单之一。
 */
var STEPS_UNDER_WAY_DIR = "steps-under-way";
var RESERVED_PROJECT_ENTRY_NAMES = new Set([
  "memory",
  "tiny_memory",
  "bagel",
  CLOUD_SNAPSHOTS_DIR,
  "bridge-pointer.json",
  ".session-aliases",
]);
var RECORDING_STAMP_RE = /^[0-9]{1,16}$/;
var RECORDING_STAMP_ERROR = "must be the recording stamp: 1 to 16 decimal digits (epoch milliseconds)";
var RECORDING_STREAM_SUFFIX = ".cast";
var RECORDING_STREAM_ADDRESSED_ERROR = `<stamp>${RECORDING_STREAM_SUFFIX} inside a session's folder is that session's terminal recording stream: address it as keys.recording(projectKey, sessionId, stamp)`;
//@ chunk-t0gq9gyw.js:31303-31357 placement
function isRecordingStamp(e) {
  return typeof e === "string" && RECORDING_STAMP_RE.test(e);
}
//@ chunk-t0gq9gyw.js:31357-31458 placement
function isRecordingStreamPath(relPath) {
  return (
    Array.isArray(relPath) &&
    typeof relPath[0] === "string" &&
    storageNameSpellings(relPath[0]).some((n) => recordingStampOfStreamName(n) !== undefined)
  );
}
//@ chunk-t0gq9gyw.js:31458-31550 placement
/**
 * 从录音流文件名取时间戳前缀，非法返回 undefined。
 */
function recordingStampOfStreamName(e) {
  if (!e.endsWith(RECORDING_STREAM_SUFFIX)) return;
  let sliced = e.slice(0, -RECORDING_STREAM_SUFFIX.length);
  return isRecordingStamp(sliced) ? sliced : undefined;
}
//@ chunk-t0gq9gyw.js:31550-31689 placement
var SESSION_SIBLING_SUFFIXES = [".ccr-tip.json", ".precompact.json", RECORDING_STREAM_SUFFIX];
var SESSION_SIBLING_SUFFIX_ERROR = `must not end with ${SESSION_SIBLING_SUFFIXES.join(", ")}: those name a session's project-level sibling files`;
//@ chunk-t0gq9gyw.js:31689-31757 placement
function hasSessionSiblingSuffix(e) {
  return storageNameSpellings(e).some((n) => SESSION_SIBLING_SUFFIXES.some((r) => n.endsWith(r)));
}
//@ chunk-t0gq9gyw.js:31757-31885 placement
var DIR_SYNC_RECORD_SUFFIX = ".dir-sync.json";
var DIR_SYNC_SUFFIX_ERROR = `must not end with ${DIR_SYNC_RECORD_SUFFIX}: that name is reserved for a cloud session's record at the project level`;
//@ chunk-t0gq9gyw.js:31885-31941 placement
function hasDirSyncSuffix(e) {
  return storageNameSpellings(e).some((n) => n.endsWith(DIR_SYNC_RECORD_SUFFIX));
}
//@ chunk-t0gq9gyw.js:31941-32032 placement
var RESERVED_SESSION_NAME_ERROR = `${[...RESERVED_PROJECT_ENTRY_NAMES].join(", ")} are reserved: they name project-level entries, not sessions`;
//@ chunk-t0gq9gyw.js:32032-32082 placement
function isReservedProjectEntryName(e) {
  return storageNameSpellings(e).some((n) => RESERVED_PROJECT_ENTRY_NAMES.has(n));
}
//@ chunk-t0gq9gyw.js:32082-32128 placement
/**
 * 该名字能否用作会话 id（不是保留项、不含 .jsonl、不带兄弟后缀）。
 */
function isNameableSessionId(e) {
  return !isReservedProjectEntryName(e) && !hasJsonlFiles(e) && !hasSessionSiblingSuffix(e);
}
//@ chunk-t0gq9gyw.js:32128-32280 placement
function validateSessionIdSegment(e, sessionId) {
  if (typeof sessionId !== "string") return;
  if (isReservedProjectEntryName(sessionId)) return invalidStorageArgument(e, RESERVED_SESSION_NAME_ERROR);
  if (hasSessionSiblingSuffix(sessionId)) return invalidStorageArgument(e, SESSION_SIBLING_SUFFIX_ERROR);
  if (hasDirSyncSuffix(sessionId)) return invalidStorageArgument(e, DIR_SYNC_SUFFIX_ERROR);
  return hasJsonlFiles(sessionId) ? invalidStorageArgument(e, JSONL_STREAM_KEY_ERROR) : undefined;
}
//@ chunk-t0gq9gyw.js:32280-32391 placement
var META_JSON_SUFFIX = ".meta.json";
var META_RESERVED_ERROR =
  ".meta is reserved for the list metadata key, under every spelling that opens its file";
//@ chunk-t0gq9gyw.js:32391-32429 placement
function isMetaJsonTaskId(taskId) {
  return isMetaJsonName(`${taskId}.json`);
}
//@ chunk-t0gq9gyw.js:32429-32471 placement
function isMetaJsonName(e) {
  return storageNameSpellings(e).includes(META_JSON_SUFFIX);
}
//@ chunk-t0gq9gyw.js:32471-32541 placement
var JSONL_STREAM_KEY_ERROR = "names a .jsonl stream, which only a transcript key addresses";
//@ chunk-t0gq9gyw.js:32541-32622 placement
function namesJsonlStream(e) {
  return Array.isArray(e) && e.some((n) => typeof n === "string" && hasJsonlFiles(n));
}
//@ chunk-t0gq9gyw.js:32622-32683 placement = isMcpServerFromProjectOrLocalSettings (1)
function isMcpServerFromProjectOrLocalSettings_2(config) {
  return config === "user" || config === "project" || config === "local";
}
//@ chunk-t0gq9gyw.js:32683-32728 placement
var LOG_CHANNEL_ERROR = "must be debug, telemetry or apiDump";
//@ chunk-t0gq9gyw.js:32728-32794 placement
function isLogChannel(channel) {
  return channel === "debug" || channel === "telemetry" || channel === "apiDump";
}
//@ chunk-t0gq9gyw.js:32794-33162 placement
/**
 * 校验日志通道键。
 */
function validateLogChannelKey(e) {
  if (!isLogChannel(e.channel)) return invalidStorageArgument("key.channel", LOG_CHANNEL_ERROR);
  if (e.channel !== "apiDump") return;
  for (let n of ["agentId", "runId"])
    if (n in e && e[n] !== undefined)
      return invalidStorageArgument(
        `key.${n}`,
        "an apiDump key names its dump by one id \u2014 the agent's for a subagent's requests, else the session's (today's dump-prompts/<id>.jsonl); agentId and runId nest nothing on this channel",
      );
  return;
}
//@ chunk-t0gq9gyw.js:33162-33936 placement
/**
 * 校验任务存储键。
 */
function validateTaskKey(e) {
  if ("taskId" in e && ("meta" in e || "highWaterMark" in e))
    return invalidStorageArgument(
      "key.taskId",
      "a task key names an item, the list metadata or the list high-water mark, never more than one",
    );
  if ("meta" in e && "highWaterMark" in e)
    return invalidStorageArgument(
      "key.highWaterMark",
      "a task key names an item, the list metadata or the list high-water mark, never more than one",
    );
  if ("meta" in e && e.meta !== true) return invalidStorageArgument("key.meta", "must be true");
  if ("highWaterMark" in e && e.highWaterMark !== true)
    return invalidStorageArgument("key.highWaterMark", "must be true");
  if (typeof e.listId !== "string")
    return invalidStorageArgument("key.listId", "a task key carries its listId");
  if ("meta" in e || "highWaterMark" in e) return;
  if (typeof e.taskId !== "string")
    return invalidStorageArgument("key.taskId", "a task item key carries its taskId");
  if (isMetaJsonTaskId(e.taskId)) return invalidStorageArgument("key.taskId", META_RESERVED_ERROR);
  return;
}
//@ chunk-t0gq9gyw.js:33936-34337 placement
/**
 * 校验 jobs 根下的键。
 */
function validateJobsKey(e) {
  if ("file" in e && "draftKey" in e)
    return invalidStorageArgument(
      "key.draftKey",
      "a jobs-root key names the pins file or one draft, never both",
    );
  if ("file" in e) return e.file === "pins" ? undefined : invalidStorageArgument("key.file", "must be pins");
  if (typeof e.draftKey !== "string")
    return invalidStorageArgument("key.draftKey", "a jobs-root draft key carries its draftKey");
  return DRAFT_KEY_RE.test(e.draftKey)
    ? undefined
    : invalidStorageArgument("key.draftKey", "must be 8 lowercase hex characters");
}
//@ chunk-t0gq9gyw.js:34337-34440 placement
var TIMELINE_JSONL = "timeline.jsonl";
var JOB_TIMELINE_KEY_ERROR = `${TIMELINE_JSONL} is the job's timeline stream: address it as keys.jobTimeline(jobId)`;
//@ chunk-t0gq9gyw.js:34440-34527 placement
function isJobTimelinePath(relPath) {
  return (
    Array.isArray(relPath) &&
    typeof relPath[0] === "string" &&
    storageNameSpellings(relPath[0]).includes(TIMELINE_JSONL)
  );
}
//@ chunk-t0gq9gyw.js:34527-34645 placement
var YEAR_RE = /^\d{4}$/;
var TWO_DIGIT_RE = /^\d{2}$/;
var SAFE_SHORT_ID_RE = /^[A-Za-z0-9_-]{1,8}(?:-[a-z0-9]+)*$/;
var MAX_SHORT_ID_CHARS = 128;
var WINDOWS_RESERVED_NAME_RE = /^(?:con|prn|aux|nul|com\d|lpt\d)$/i;
//@ chunk-t0gq9gyw.js:34645-34726 placement
function isShortLogName(logName) {
  return (
    typeof logName === "string" &&
    logName.length <= MAX_SHORT_ID_CHARS &&
    SAFE_SHORT_ID_RE.test(logName) &&
    !WINDOWS_RESERVED_NAME_RE.test(logName)
  );
}
//@ chunk-t0gq9gyw.js:34726-35005 placement
function validateDateParts(e, n) {
  if (n.year !== undefined && !matchesDigits(YEAR_RE, n.year))
    return invalidStorageArgument(`${e}.year`, "must be four digits (YYYY)");
  if (n.month !== undefined && !matchesDigits(TWO_DIGIT_RE, n.month))
    return invalidStorageArgument(`${e}.month`, "must be two digits (MM)");
  if (n.day !== undefined && !matchesDigits(TWO_DIGIT_RE, n.day))
    return invalidStorageArgument(`${e}.day`, "must be two digits (DD)");
  return;
}
//@ chunk-t0gq9gyw.js:35005-35060 placement
function matchesDigits(e, n) {
  return typeof n === "string" && e.test(n);
}
//@ chunk-t0gq9gyw.js:35060-35380 placement
/**
 * 校验按年月的范围。
 */
function validateDateScope(e) {
  if (e.year !== undefined && e.projectKey === undefined)
    return invalidStorageArgument("scope.projectKey", "required when year is given");
  if (e.month !== undefined && e.year === undefined)
    return invalidStorageArgument("scope.year", "required when month is given");
  if (e.day !== undefined && e.month === undefined)
    return invalidStorageArgument("scope.month", "required when day is given");
  return validateDateParts("scope", e);
}
//@ chunk-t0gq9gyw.js:35380-35403 placement
var DRAFT_KEY_RE = /^[0-9a-f]{8}$/;
//@ chunk-t0gq9gyw.js:35403-37779 placement
/**
 * 存储键对应的路径片段。
 */
function keyPathSegments(e) {
  switch (e.namespace) {
    case "transcript":
      return [
        ["projectKey", e.projectKey],
        ["sessionId", e.sessionId],
        ["agentId", e.agentId, "optional"],
        ["agentRelPath", e.agentRelPath, "optional"],
      ];
    case "history":
    case "identity":
      return [];
    case "globalConfig":
      return "kind" in e ? [["stamp", e.stamp]] : [];
    case "settings":
      return e.layer === "user"
        ? []
        : e.layer === "project"
          ? [["projectKey", e.projectKey]]
          : [["consentRootKey", e.consentRootKey]];
    case "task":
      return "taskId" in e
        ? [
            ["listId", e.listId],
            ["taskId", e.taskId],
          ]
        : [["listId", e.listId]];
    case "memory":
      return [
        ["projectKey", e.projectKey],
        ["relPath", e.relPath],
      ];
    case "pluginRegistry":
      return [];
    case "marketplaceCache":
      return "relPath" in e
        ? [
            ["marketplace", e.marketplace],
            ["relPath", e.relPath],
          ]
        : [["marketplace", e.marketplace]];
    case "pluginCache":
      return [
        ["marketplace", e.marketplace],
        ["plugin", e.plugin],
        ["version", e.version],
        ["relPath", e.relPath],
      ];
    case "cache":
      return [
        ["store", e.store],
        ["id", e.id],
      ];
    case "paste":
      return [["id", e.id]];
    case "pluginAssetCache":
      return [["digest", e.digest]];
    case "state":
      return [["id", e.id]];
    case "plan":
      return [["name", e.name]];
    case "feedbackDraft":
      return [["draftId", e.draftId]];
    case "agentMemory":
      return [
        ...(e.layer === "user" ? [] : [["projectKey", e.projectKey]]),
        ["agentType", e.agentType],
        ["relPath", e.relPath],
      ];
    case "team":
      return [["team", e.team]];
    case "sidecar":
      return [
        ["projectKey", e.projectKey],
        ["sessionId", e.sessionId],
        ["relPath", e.relPath],
      ];
    case "scratch":
      return [
        ["sessionId", e.sessionId],
        ["relPath", e.relPath],
      ];
    case "userConfigDir":
      return [["relPath", e.relPath]];
    case "fileHistory":
      return [
        ["sessionId", e.sessionId],
        ["backupFileName", e.backupFileName],
      ];
    case "job":
      return [
        ["jobId", e.jobId],
        ["relPath", e.relPath],
      ];
    case "daemon":
      return [["relPath", e.relPath]];
    case "jobsRoot":
      return "file" in e ? [] : [["draftKey", e.draftKey]];
    case "session":
      return [["file", e.file]];
    case "bridgePointer":
    case "sessionAliases":
      return [["projectKey", e.projectKey]];
    case "dirSyncRecord":
      return [
        ["projectKey", e.projectKey],
        ["sessionId", e.sessionId],
      ];
    case "mailbox":
      return [
        ["team", e.team],
        ["teammate", e.teammate],
      ];
    case "log":
      return [
        ["sessionId", e.sessionId],
        ["agentId", e.agentId, "optional"],
        ["runId", e.runId, "optional"],
      ];
    case "jobTimeline":
      return [["jobId", e.jobId]];
    case "recording":
      return [
        ["projectKey", e.projectKey],
        ["sessionId", e.sessionId],
        ["stamp", e.stamp],
      ];
    case "sessionLog":
      return [
        ["projectKey", e.projectKey],
        ["year", e.year],
        ["month", e.month],
        ["day", e.day],
        ["logName", e.logName],
      ];
  }
  return;
}
//@ chunk-t0gq9gyw.js:37779-37999 placement
/**
 * 校验存储范围对象。
 */
function validateStorageScope(e) {
  if (typeof e !== "object" || e === null) return invalidStorageArgument("scope", "expected a scope object");
  let n = scopePathSegments(e);
  if (n === undefined)
    return invalidStorageArgument("scope", `${String(e.namespace)} is not a listable namespace`);
  return validateScopeByNamespace(e) ?? checkKeyFields("scope", n);
}
//@ chunk-t0gq9gyw.js:37999-39955 placement
/**
 * 范围中不允许字段的说明。
 */
var SCOPE_FIELD_ERRORS = {
  transcript: [
    ["agentId", "names one agent transcript, a stream key, not a scope: narrow a scope with agentRelPath"],
    ["journal", "names a run journal, a stream key, not a scope: narrow a scope with agentRelPath"],
    [
      "sessionJournal",
      "names a session's own journal, a stream key, not a scope: the session scope lists it",
    ],
  ],
  log: [
    ["agentId", "names one log stream, a stream key, not a scope"],
    ["runId", "names one log stream, a stream key, not a scope"],
  ],
  sessionLog: [["logName", "names one session's log, a stream key, not a scope: a day scope lists its logs"]],
  task: [
    ["taskId", "names one task value, a key, not a scope: a list scope narrows with listId only"],
    ["meta", "names one task value, a key, not a scope: a list scope narrows with listId only"],
    ["highWaterMark", "names one task value, a key, not a scope: a list scope narrows with listId only"],
  ],
  mailbox: [["teammate", "names one inbox, a key, not a scope"]],
  cache: [["id", "names one cached value, a key, not a scope: a cache scope narrows with store only"]],
  pluginAssetCache: [["digest", "names one cached asset, a key, not a scope"]],
  fileHistory: [
    [
      "backupFileName",
      "names one backup, a key, not a scope: a file-history scope narrows with sessionId only",
    ],
  ],
  state: [["id", "names one value, a key, not a scope"]],
  feedbackDraft: [["draftId", "names one draft, a key, not a scope"]],
  jobsRoot: [
    ["file", "names one value, a key, not a scope"],
    ["draftKey", "names one value, a key, not a scope"],
  ],
  plan: [["name", "names one plan, a key, not a scope"]],
  paste: [["id", "names one paste, a key, not a scope"]],
  session: [["file", "names one value, a key, not a scope"]],
  globalConfig: [["stamp", "names one recovery copy, a key, not a scope: the scope narrows with kind only"]],
  marketplaceCache: [
    [
      "form",
      "names one of the marketplace's two engine-written files, a key, not a scope: the tree narrows with relPath only",
    ],
  ],
  memory: [],
  pluginCache: [],
  daemon: [],
  sidecar: [],
  agentMemory: [],
  scratch: [],
  userConfigDir: [],
  job: [],
  bridgeSpawn: [],
};
//@ chunk-t0gq9gyw.js:39955-42173 placement
/**
 * 按命名空间校验范围。
 */
function validateScopeByNamespace(e) {
  let n = e.namespace === "agentMemory" ? validateAgentMemoryScope(e) : undefined;
  if (n !== undefined) return n;
  if (e.namespace === "transcript" || e.namespace === "sidecar") {
    let o = validateSessionIdSegment("scope.sessionId", e.sessionId);
    if (o !== undefined) return o;
  }
  for (let [o, s] of SCOPE_FIELD_ERRORS[e.namespace])
    if (o in e && e[o] !== undefined) return invalidStorageArgument(`scope.${o}`, s);
  if (e.namespace === "sidecar" && namesJsonlStream(e.relPath))
    return invalidStorageArgument("scope.relPath", JSONL_STREAM_KEY_ERROR);
  if (e.namespace === "sidecar" && isRecordingStreamPath(e.relPath))
    return invalidStorageArgument("scope.relPath", RECORDING_STREAM_ADDRESSED_ERROR);
  if (e.namespace === "log" && e.channel !== undefined && !isLogChannel(e.channel))
    return invalidStorageArgument("scope.channel", LOG_CHANNEL_ERROR);
  if (e.namespace === "job" && isJobTimelinePath(e.relPath))
    return invalidStorageArgument("scope.relPath", JOB_TIMELINE_KEY_ERROR);
  let r = e.namespace === "sessionLog" ? validateDateScope(e) : undefined;
  if (r !== undefined) return r;
  if (e.namespace === "scratch" && e.sessionId === undefined && e.relPath !== undefined)
    return invalidStorageArgument(
      "scope.relPath",
      "requires scope.sessionId: a scratch relPath narrows one session directory, and no cross-session prefix filter exists",
    );
  if (e.namespace === "userConfigDir" && !USER_CONFIG_DIR_NAME_SET.has(e.dir))
    return invalidStorageArgument("scope.dir", USER_CONFIG_DIR_ERROR);
  if (
    e.namespace === "transcript" &&
    e.agentRelPath !== undefined &&
    (e.projectKey === undefined || e.sessionId === undefined)
  )
    return invalidStorageArgument(
      "scope.agentRelPath",
      "requires scope.projectKey and scope.sessionId: an agentRelPath narrows the subagents/ tree of one session directory",
    );
  if (e.namespace === "transcript" && namesJsonlStream(e.agentRelPath))
    return invalidStorageArgument("scope.agentRelPath", JSONL_STREAM_KEY_ERROR);
  if (e.namespace === "pluginCache") {
    if (e.marketplace === undefined && e.plugin !== undefined)
      return invalidStorageArgument(
        "scope.plugin",
        "requires scope.marketplace: a plugin narrows one marketplace folder",
      );
    if (e.plugin === undefined && e.version !== undefined)
      return invalidStorageArgument(
        "scope.version",
        "requires scope.plugin: a version narrows one plugin folder",
      );
    if (e.version === undefined && e.relPath !== undefined)
      return invalidStorageArgument(
        "scope.relPath",
        "requires scope.version: a relPath narrows one version folder",
      );
  }
  if (e.namespace === "job" && e.jobId === undefined && e.relPath !== undefined)
    return invalidStorageArgument(
      "scope.relPath",
      "requires scope.jobId: a job relPath narrows one job directory, and no cross-job prefix filter exists",
    );
  if (e.namespace === "transcript" && e.projectKey === undefined && e.sessionId !== undefined)
    return invalidStorageArgument(
      "scope.sessionId",
      "requires scope.projectKey: a session narrows one project folder, and no cross-project session filter exists",
    );
  if (e.namespace === "globalConfig" && e.kind !== undefined && !isGlobalConfigCopyKind(e.kind))
    return invalidStorageArgument("scope.kind", GLOBAL_CONFIG_COPY_KIND_ERROR);
  return;
}
//@ chunk-t0gq9gyw.js:42173-42652 placement
/**
 * 校验代理记忆范围（user/project/local）。
 */
function validateAgentMemoryScope(e) {
  if (!isMcpServerFromProjectOrLocalSettings(e.layer))
    return invalidStorageArgument("scope.layer", "must be user, project or local");
  if (e.layer === "user" && "projectKey" in e)
    return invalidStorageArgument("scope.projectKey", "the user layer is not keyed by project");
  if (e.layer !== "user" && typeof e.projectKey !== "string")
    return invalidStorageArgument("scope.projectKey", "required for the project and local layers");
  return e.agentType === undefined && e.relPath !== undefined
    ? invalidStorageArgument(
        "scope.relPath",
        "requires scope.agentType: an agent-memory relPath narrows one agent directory",
      )
    : undefined;
}
//@ chunk-t0gq9gyw.js:42652-44363 placement
/**
 * 范围对应的路径片段。
 */
function scopePathSegments(e) {
  switch (e.namespace) {
    case "transcript":
      return [
        ["projectKey", e.projectKey, "optional"],
        ["sessionId", e.sessionId, "optional"],
        ["agentRelPath", e.agentRelPath, "optional"],
      ];
    case "task":
      return [["listId", e.listId, "optional"]];
    case "mailbox":
      return [["team", e.team, "optional"]];
    case "memory":
      return [
        ["projectKey", e.projectKey],
        ["relPath", e.relPath, "optional"],
      ];
    case "pluginCache":
      return [
        ["marketplace", e.marketplace, "optional"],
        ["plugin", e.plugin, "optional"],
        ["version", e.version, "optional"],
        ["relPath", e.relPath, "optional"],
      ];
    case "marketplaceCache":
      return [
        ["marketplace", e.marketplace],
        ["relPath", e.relPath, "optional"],
      ];
    case "cache":
      return [["store", e.store]];
    case "state":
    case "plan":
    case "paste":
    case "pluginAssetCache":
    case "feedbackDraft":
      return [];
    case "sidecar":
      return [
        ["projectKey", e.projectKey],
        ["sessionId", e.sessionId],
        ["relPath", e.relPath, "optional"],
      ];
    case "agentMemory":
      return [
        ["projectKey", e.layer === "user" ? undefined : e.projectKey, "optional"],
        ["agentType", e.agentType, "optional"],
        ["relPath", e.relPath, "optional"],
      ];
    case "scratch":
      return [
        ["sessionId", e.sessionId, "optional"],
        ["relPath", e.relPath, "optional"],
      ];
    case "userConfigDir":
      return [["relPath", e.relPath, "optional"]];
    case "fileHistory":
      return [["sessionId", e.sessionId, "optional"]];
    case "job":
      return [
        ["jobId", e.jobId, "optional"],
        ["relPath", e.relPath, "optional"],
      ];
    case "daemon":
      return [["relPath", e.relPath, "optional"]];
    case "jobsRoot":
    case "session":
      return [];
    case "bridgeSpawn":
      return [["dir", e.dir, "optional"]];
    case "globalConfig":
      return [["kind", e.kind, "optional"]];
    case "log":
      return [["sessionId", e.sessionId, "optional"]];
    case "sessionLog":
      return [
        ["projectKey", e.projectKey, "optional"],
        ["year", e.year, "optional"],
        ["month", e.month, "optional"],
        ["day", e.day, "optional"],
      ];
  }
  return;
}
//@ chunk-t0gq9gyw.js:44363-44373 placement
var MAX_SIDE_PATH_DEPTH = 6;
//@ chunk-t0gq9gyw.js:44373-44434 placement = getAgentMetadataPath (1)
/**
 * 从 .meta.json 路径反推存储键。
 */
function keyFromMetaPath(agentId) {
  return agentId.endsWith(".meta.json") ? pathToSessionSideKey(agentId) : undefined;
}
//@ chunk-t0gq9gyw.js:44434-44734 placement
/**
 * 从文件路径反推存储键。
 */
function pathToSessionSideKey(e) {
  let n = basename(e);
  if (hasJsonlFiles(n)) return;
  let projectsDir = getProjectsDir();
  let o = [n];
  let s = dirname(e);
  while (s !== projectsDir && o.length <= MAX_SIDE_PATH_DEPTH + 1) {
    let y = dirname(s);
    if (y === s) return;
    o.unshift(basename(s));
    s = y;
  }
  if (s !== projectsDir || o.length < 3) return;
  let [a, c, ...u] = o;
  if (!isValidKeySegment(a) || !isValidKeySegment(c) || u.length === 0 || !u.every(isValidKeySegment)) return;
  let p = STORAGE_SPACES.sidecar(a, c, u);
  return validateStorageKey(p) === undefined ? p : undefined;
}
//@ chunk-t0gq9gyw.js:44734-44789 placement
function toStorageKey(e) {
  return typeof e === "string" ? pathToSessionSideKey(e) : e.key;
}
export {
  pathToSessionSideKey,
  toStorageKey,
  keyFromMetaPath,
  validateStorageKey,
  validateStorageScope,
  isNameableSessionId,
  ARCHIVE_SYNC,
  FOLDER_SYNC,
  STEPS_UNDER_WAY_DIR,
  SIDE_GIT,
  CLOUD_SNAPSHOTS_DIR,
  recordingStampOfStreamName,
  MAX_SIDE_PATH_DEPTH,
  DIR_SYNC_RECORD_SUFFIX,
};
