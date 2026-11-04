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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-t0gq9gyw.js:25952-26099 placement
function invalidSegmentError(argument) {
  return invalidStorageArgument(
    argument,
    "expected a segment that is not empty or made only of dots and spaces, with no path separator, NUL or set-aside shape",
  );
}
//@ chunk-t0gq9gyw.js:26099-26329 placement
/**
 * 校验存储键对象。
 */
function validateStorageKey(key) {
  if (typeof key !== "object" || key === null) return invalidStorageArgument("key", "expected a key object");
  let namespaceError = validateKeyByNamespace(key);
  if (namespaceError !== undefined) return namespaceError;
  let fields = keyPathSegments(key);
  if (fields === undefined)
    return invalidStorageArgument("key", `${key.namespace} is not a storage namespace`);
  return checkKeyFields("key", fields);
}
//@ chunk-t0gq9gyw.js:26329-26757 placement
/**
 * 按字段定义检查键字段（必填、格式）。
 */
function checkKeyFields(keyPath, fields) {
  for (let [fieldName, value, presence] of fields) {
    let fieldPath = `${keyPath}.${fieldName}`;
    if (value === undefined) {
      if (presence !== "optional") return invalidStorageArgument(fieldPath, "required");
    } else if (isRelPathField(fieldName)) {
      if (
        !(
          keyPath === "scope" &&
          fieldName === "agentRelPath" &&
          Array.isArray(value) &&
          value.length === 0
        ) &&
        (!Array.isArray(value) || !areValidKeySegments(value))
      )
        return invalidStorageArgument(
          fieldPath,
          "expected a non-empty array of segments, none empty or made only of dots and spaces, with no path separator, NUL or set-aside shape",
        );
    } else if (typeof value !== "string" || !isValidKeySegment(value)) return invalidSegmentError(fieldPath);
  }
  return;
}
//@ chunk-t0gq9gyw.js:26757-26813 placement
function isRelPathField(field) {
  return field === "relPath" || field === "agentRelPath";
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
var USER_CONFIG_DIR_NAME_SET; // deferred: uses USER_CONFIG_DIR_NAMES of its import cycle while loading; runs once the cycle is complete
var USER_CONFIG_DIR_ERROR;
var PLUGIN_REGISTRY_FILES;
deferInit("chunk-t0gq9gyw.js:26987", () => {
  USER_CONFIG_DIR_NAME_SET = new Set(USER_CONFIG_DIR_NAMES);
  USER_CONFIG_DIR_ERROR = `must be one of the userConfigDir directory names (${USER_CONFIG_DIR_NAMES.join(", ")})`;
  PLUGIN_REGISTRY_FILES = ["installed", "marketplaces", "flagged", "catalog", "inUseSweep"];
});
//@ chunk-t0gq9gyw.js:27144-27253 placement
var PLUGIN_REGISTRY_FILE_SET; // deferred: uses USER_CONFIG_DIR_NAME_SET of its import cycle while loading; runs once the cycle is complete
var PLUGIN_REGISTRY_FILE_ERROR;
var MARKETPLACE_CACHE_FORMS_2;
deferInit("chunk-t0gq9gyw.js:27144", () => {
  PLUGIN_REGISTRY_FILE_SET = new Set(PLUGIN_REGISTRY_FILES);
  PLUGIN_REGISTRY_FILE_ERROR = `must be one of the pluginRegistry files (${PLUGIN_REGISTRY_FILES.join(", ")})`;
  MARKETPLACE_CACHE_FORMS_2 = ["manifest", "catalog"];
});
//@ chunk-t0gq9gyw.js:27253-27338 placement
var MARKETPLACE_CACHE_FORMS; // deferred: uses PLUGIN_REGISTRY_FILE_SET of its import cycle while loading; runs once the cycle is complete
var MARKETPLACE_CACHE_FORM_ERROR;
deferInit("chunk-t0gq9gyw.js:27253", () => {
  MARKETPLACE_CACHE_FORMS = new Set(MARKETPLACE_CACHE_FORMS_2);
  MARKETPLACE_CACHE_FORM_ERROR = `must be one of the marketplaceCache forms (${MARKETPLACE_CACHE_FORMS_2.join(", ")})`;
});
//@ chunk-t0gq9gyw.js:27338-27355 placement
var SESSION_JOURNAL_NAMES = ["world"];
//@ chunk-t0gq9gyw.js:27355-27439 placement
var SESSION_JOURNAL_NAME_SET; // deferred: uses SESSION_JOURNAL_NAMES of its import cycle while loading; runs once the cycle is complete
var SESSION_JOURNAL_NAME_ERROR;
deferInit("chunk-t0gq9gyw.js:27355", () => {
  SESSION_JOURNAL_NAME_SET = new Set(SESSION_JOURNAL_NAMES);
  SESSION_JOURNAL_NAME_ERROR = `must be one of the session journal names (${SESSION_JOURNAL_NAMES.join(", ")})`;
});
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
function validateKeyByNamespace(key) {
  if (key.namespace === "transcript") return validateTranscriptKey(key);
  if (key.namespace === "pluginAssetCache" && !isSha256Hex(key.digest))
    return invalidStorageArgument(
      "key.digest",
      "must be a SHA-256 digest: 64 lowercase hexadecimal characters",
    );
  if (key.namespace === "globalConfig" && "kind" in key) {
    if (!isGlobalConfigCopyKind(key.kind))
      return invalidStorageArgument("key.kind", GLOBAL_CONFIG_COPY_KIND_ERROR);
    if (typeof key.stamp !== "string")
      return invalidStorageArgument("key.stamp", "a recovery copy key carries its stamp");
  }
  if (key.namespace === "task") return validateTaskKey(key);
  if (key.namespace === "sidecar") {
    let sessionError = validateSessionIdSegment("key.sessionId", key.sessionId);
    if (sessionError !== undefined) return sessionError;
    if (namesJsonlStream(key.relPath)) return invalidStorageArgument("key.relPath", JSONL_STREAM_KEY_ERROR);
    return isRecordingStreamPath(key.relPath)
      ? invalidStorageArgument("key.relPath", RECORDING_STREAM_ADDRESSED_ERROR)
      : undefined;
  }
  if (key.namespace === "recording")
    return (
      validateSessionIdSegment("key.sessionId", key.sessionId) ??
      (isRecordingStamp(key.stamp) ? undefined : invalidStorageArgument("key.stamp", RECORDING_STAMP_ERROR))
    );
  if (key.namespace === "jobsRoot") return validateJobsKey(key);
  if (key.namespace === "userConfigDir" && !USER_CONFIG_DIR_NAME_SET.has(key.dir))
    return invalidStorageArgument("key.dir", USER_CONFIG_DIR_ERROR);
  if (key.namespace === "fileHistory") return validateBackupFileName(key);
  if (key.namespace === "settings" && !isMcpServerFromProjectOrLocalSettings_2(key.layer))
    return invalidStorageArgument("key.layer", "must be user, project or local");
  if (key.namespace === "log") return validateLogChannelKey(key);
  if (key.namespace === "job" && isJobTimelinePath(key.relPath))
    return invalidStorageArgument("key.relPath", JOB_TIMELINE_KEY_ERROR);
  if (key.namespace === "sessionLog")
    return (
      validateDateParts("key", key) ??
      (isShortLogName(key.logName)
        ? undefined
        : invalidStorageArgument(
            "key.logName",
            "must be the session-log stem <sessionId8>[-<title-slug>]: up to eight word characters, then lower-case a-z / 0-9 runs joined by single hyphens; not a bare device name",
          ))
    );
  if (key.namespace === "pluginRegistry" && !PLUGIN_REGISTRY_FILE_SET.has(key.file))
    return invalidStorageArgument("key.file", PLUGIN_REGISTRY_FILE_ERROR);
  if (key.namespace === "marketplaceCache") {
    if (!("relPath" in key))
      return MARKETPLACE_CACHE_FORMS.has(key.form)
        ? undefined
        : invalidStorageArgument("key.form", MARKETPLACE_CACHE_FORM_ERROR);
    return key.form === undefined
      ? undefined
      : invalidStorageArgument("key.form", "a tree file key carries relPath, not form");
  }
  if (key.namespace !== "agentMemory") return;
  if (!isMcpServerFromProjectOrLocalSettings(key.layer))
    return invalidStorageArgument("key.layer", "must be user, project or local");
  if (key.layer === "user" && "projectKey" in key)
    return invalidStorageArgument("key.projectKey", "the user layer is not keyed by project");
  if (key.layer !== "user" && typeof key.projectKey !== "string")
    return invalidStorageArgument("key.projectKey", "required for the project and local layers");
  return typeof key.agentType === "string"
    ? undefined
    : invalidStorageArgument("key.agentType", "an agent memory key names its agent");
}
//@ chunk-t0gq9gyw.js:29572-29769 placement
function validateBackupFileName(key) {
  return typeof key.backupFileName !== "string" ||
    !BACKUP_FILE_NAME_PATTERN_WITH_LEGACY.test(key.backupFileName)
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
var GLOBAL_CONFIG_COPY_KIND_SET; // deferred: uses GLOBAL_CONFIG_COPY_KINDS of its import cycle while loading; runs once the cycle is complete
var GLOBAL_CONFIG_COPY_KIND_ERROR;
deferInit("chunk-t0gq9gyw.js:29860", () => {
  GLOBAL_CONFIG_COPY_KIND_SET = new Set(GLOBAL_CONFIG_COPY_KINDS);
  GLOBAL_CONFIG_COPY_KIND_ERROR = `must be one of the global-config copy kinds (${GLOBAL_CONFIG_COPY_KINDS.join(", ")})`;
});
//@ chunk-t0gq9gyw.js:29947-29979 placement
function isGlobalConfigCopyKind(kind) {
  return GLOBAL_CONFIG_COPY_KIND_SET.has(kind);
}
//@ chunk-t0gq9gyw.js:29979-30853 placement
/**
 * 校验转录存储键（会话、代理相对路径）。
 */
function validateTranscriptKey(key) {
  let sessionError = validateSessionIdSegment("key.sessionId", key.sessionId);
  if (sessionError !== undefined) return sessionError;
  if (namesJsonlStream(key.agentRelPath))
    return invalidStorageArgument("key.agentRelPath", JSONL_STREAM_KEY_ERROR);
  if ("sessionJournal" in key) {
    if (typeof key.sessionJournal !== "string" || !isSessionJournalName(key.sessionJournal))
      return invalidStorageArgument("key.sessionJournal", SESSION_JOURNAL_NAME_ERROR);
    return key.agentId === undefined && key.agentRelPath === undefined && !("journal" in key)
      ? undefined
      : invalidStorageArgument(
          "key.sessionJournal",
          "a session journal key names the session's own journal: no agentId, agentRelPath or run journal",
        );
  }
  if ("journal" in key) {
    if (key.journal !== true) return invalidStorageArgument("key.journal", "must be true");
    if (!Array.isArray(key.agentRelPath))
      return invalidStorageArgument("key.agentRelPath", "a run journal key carries its run directory");
    return key.agentId === undefined
      ? undefined
      : invalidStorageArgument(
          "key.agentId",
          "a transcript key names an agent transcript or the run journal, never both",
        );
  }
  return key.agentRelPath !== undefined && key.agentId === undefined
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
var STEPS_UNDER_WAY_DIR; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RESERVED_PROJECT_ENTRY_NAMES;
var RECORDING_STAMP_RE;
var RECORDING_STAMP_ERROR;
var RECORDING_STREAM_SUFFIX;
var RECORDING_STREAM_ADDRESSED_ERROR;
deferInit("chunk-t0gq9gyw.js:30931", () => {
  STEPS_UNDER_WAY_DIR = "steps-under-way";
  RESERVED_PROJECT_ENTRY_NAMES = new Set([
    "memory",
    "tiny_memory",
    "bagel",
    CLOUD_SNAPSHOTS_DIR,
    "bridge-pointer.json",
    ".session-aliases",
  ]);
  RECORDING_STAMP_RE = /^[0-9]{1,16}$/;
  RECORDING_STAMP_ERROR = "must be the recording stamp: 1 to 16 decimal digits (epoch milliseconds)";
  RECORDING_STREAM_SUFFIX = ".cast";
  RECORDING_STREAM_ADDRESSED_ERROR = `<stamp>${RECORDING_STREAM_SUFFIX} inside a session's folder is that session's terminal recording stream: address it as keys.recording(projectKey, sessionId, stamp)`;
});
//@ chunk-t0gq9gyw.js:31303-31357 placement
function isRecordingStamp(stamp) {
  return typeof stamp === "string" && RECORDING_STAMP_RE.test(stamp);
}
//@ chunk-t0gq9gyw.js:31357-31458 placement
function isRecordingStreamPath(relPath) {
  return (
    Array.isArray(relPath) &&
    typeof relPath[0] === "string" &&
    storageNameSpellings(relPath[0]).some((spelling) => recordingStampOfStreamName(spelling) !== undefined)
  );
}
//@ chunk-t0gq9gyw.js:31458-31550 placement
/**
 * 从录音流文件名取时间戳前缀，非法返回 undefined。
 */
function recordingStampOfStreamName(name) {
  if (!name.endsWith(RECORDING_STREAM_SUFFIX)) return;
  let stamp = name.slice(0, -RECORDING_STREAM_SUFFIX.length);
  return isRecordingStamp(stamp) ? stamp : undefined;
}
//@ chunk-t0gq9gyw.js:31550-31689 placement
var SESSION_SIBLING_SUFFIXES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SESSION_SIBLING_SUFFIX_ERROR;
deferInit("chunk-t0gq9gyw.js:31550", () => {
  SESSION_SIBLING_SUFFIXES = [".ccr-tip.json", ".precompact.json", RECORDING_STREAM_SUFFIX];
  SESSION_SIBLING_SUFFIX_ERROR = `must not end with ${SESSION_SIBLING_SUFFIXES.join(", ")}: those name a session's project-level sibling files`;
});
//@ chunk-t0gq9gyw.js:31689-31757 placement
function hasSessionSiblingSuffix(name) {
  return storageNameSpellings(name).some((spelling) =>
    SESSION_SIBLING_SUFFIXES.some((suffix) => spelling.endsWith(suffix)),
  );
}
//@ chunk-t0gq9gyw.js:31757-31885 placement
var DIR_SYNC_RECORD_SUFFIX = ".dir-sync.json";
var DIR_SYNC_SUFFIX_ERROR = `must not end with ${DIR_SYNC_RECORD_SUFFIX}: that name is reserved for a cloud session's record at the project level`;
//@ chunk-t0gq9gyw.js:31885-31941 placement
function hasDirSyncSuffix(name) {
  return storageNameSpellings(name).some((spelling) => spelling.endsWith(DIR_SYNC_RECORD_SUFFIX));
}
//@ chunk-t0gq9gyw.js:31941-32032 placement
var RESERVED_SESSION_NAME_ERROR; // deferred: uses STEPS_UNDER_WAY_DIR of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-t0gq9gyw.js:31941", () => {
  RESERVED_SESSION_NAME_ERROR = `${[...RESERVED_PROJECT_ENTRY_NAMES].join(", ")} are reserved: they name project-level entries, not sessions`;
});
//@ chunk-t0gq9gyw.js:32032-32082 placement
function isReservedProjectEntryName(name) {
  return storageNameSpellings(name).some((spelling) => RESERVED_PROJECT_ENTRY_NAMES.has(spelling));
}
//@ chunk-t0gq9gyw.js:32082-32128 placement
/**
 * 该名字能否用作会话 id（不是保留项、不含 .jsonl、不带兄弟后缀）。
 */
function isNameableSessionId(name) {
  return !isReservedProjectEntryName(name) && !hasJsonlFiles(name) && !hasSessionSiblingSuffix(name);
}
//@ chunk-t0gq9gyw.js:32128-32280 placement
function validateSessionIdSegment(fieldPath, name) {
  if (typeof name !== "string") return;
  if (isReservedProjectEntryName(name)) return invalidStorageArgument(fieldPath, RESERVED_SESSION_NAME_ERROR);
  if (hasSessionSiblingSuffix(name)) return invalidStorageArgument(fieldPath, SESSION_SIBLING_SUFFIX_ERROR);
  if (hasDirSyncSuffix(name)) return invalidStorageArgument(fieldPath, DIR_SYNC_SUFFIX_ERROR);
  return hasJsonlFiles(name) ? invalidStorageArgument(fieldPath, JSONL_STREAM_KEY_ERROR) : undefined;
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
function isMetaJsonName(name) {
  return storageNameSpellings(name).includes(META_JSON_SUFFIX);
}
//@ chunk-t0gq9gyw.js:32471-32541 placement
var JSONL_STREAM_KEY_ERROR = "names a .jsonl stream, which only a transcript key addresses";
//@ chunk-t0gq9gyw.js:32541-32622 placement
function namesJsonlStream(segments) {
  return (
    Array.isArray(segments) &&
    segments.some((segment) => typeof segment === "string" && hasJsonlFiles(segment))
  );
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
function validateLogChannelKey(key) {
  if (!isLogChannel(key.channel)) return invalidStorageArgument("key.channel", LOG_CHANNEL_ERROR);
  if (key.channel !== "apiDump") return;
  for (let field of ["agentId", "runId"])
    if (field in key && key[field] !== undefined)
      return invalidStorageArgument(
        `key.${field}`,
        "an apiDump key names its dump by one id \u2014 the agent's for a subagent's requests, else the session's (today's dump-prompts/<id>.jsonl); agentId and runId nest nothing on this channel",
      );
  return;
}
//@ chunk-t0gq9gyw.js:33162-33936 placement
/**
 * 校验任务存储键。
 */
function validateTaskKey(key) {
  if ("taskId" in key && ("meta" in key || "highWaterMark" in key))
    return invalidStorageArgument(
      "key.taskId",
      "a task key names an item, the list metadata or the list high-water mark, never more than one",
    );
  if ("meta" in key && "highWaterMark" in key)
    return invalidStorageArgument(
      "key.highWaterMark",
      "a task key names an item, the list metadata or the list high-water mark, never more than one",
    );
  if ("meta" in key && key.meta !== true) return invalidStorageArgument("key.meta", "must be true");
  if ("highWaterMark" in key && key.highWaterMark !== true)
    return invalidStorageArgument("key.highWaterMark", "must be true");
  if (typeof key.listId !== "string")
    return invalidStorageArgument("key.listId", "a task key carries its listId");
  if ("meta" in key || "highWaterMark" in key) return;
  if (typeof key.taskId !== "string")
    return invalidStorageArgument("key.taskId", "a task item key carries its taskId");
  if (isMetaJsonTaskId(key.taskId)) return invalidStorageArgument("key.taskId", META_RESERVED_ERROR);
  return;
}
//@ chunk-t0gq9gyw.js:33936-34337 placement
/**
 * 校验 jobs 根下的键。
 */
function validateJobsKey(key) {
  if ("file" in key && "draftKey" in key)
    return invalidStorageArgument(
      "key.draftKey",
      "a jobs-root key names the pins file or one draft, never both",
    );
  if ("file" in key)
    return key.file === "pins" ? undefined : invalidStorageArgument("key.file", "must be pins");
  if (typeof key.draftKey !== "string")
    return invalidStorageArgument("key.draftKey", "a jobs-root draft key carries its draftKey");
  return DRAFT_KEY_RE.test(key.draftKey)
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
function validateDateParts(prefix, scope) {
  if (scope.year !== undefined && !matchesDigits(YEAR_RE, scope.year))
    return invalidStorageArgument(`${prefix}.year`, "must be four digits (YYYY)");
  if (scope.month !== undefined && !matchesDigits(TWO_DIGIT_RE, scope.month))
    return invalidStorageArgument(`${prefix}.month`, "must be two digits (MM)");
  if (scope.day !== undefined && !matchesDigits(TWO_DIGIT_RE, scope.day))
    return invalidStorageArgument(`${prefix}.day`, "must be two digits (DD)");
  return;
}
//@ chunk-t0gq9gyw.js:35005-35060 placement
function matchesDigits(pattern, value) {
  return typeof value === "string" && pattern.test(value);
}
//@ chunk-t0gq9gyw.js:35060-35380 placement
/**
 * 校验按年月的范围。
 */
function validateDateScope(scope) {
  if (scope.year !== undefined && scope.projectKey === undefined)
    return invalidStorageArgument("scope.projectKey", "required when year is given");
  if (scope.month !== undefined && scope.year === undefined)
    return invalidStorageArgument("scope.year", "required when month is given");
  if (scope.day !== undefined && scope.month === undefined)
    return invalidStorageArgument("scope.month", "required when day is given");
  return validateDateParts("scope", scope);
}
//@ chunk-t0gq9gyw.js:35380-35403 placement
var DRAFT_KEY_RE = /^[0-9a-f]{8}$/;
//@ chunk-t0gq9gyw.js:35403-37779 placement
/**
 * 存储键对应的路径片段。
 */
function keyPathSegments(key) {
  switch (key.namespace) {
    case "transcript":
      return [
        ["projectKey", key.projectKey],
        ["sessionId", key.sessionId],
        ["agentId", key.agentId, "optional"],
        ["agentRelPath", key.agentRelPath, "optional"],
      ];
    case "history":
    case "identity":
      return [];
    case "globalConfig":
      return "kind" in key ? [["stamp", key.stamp]] : [];
    case "settings":
      return key.layer === "user"
        ? []
        : key.layer === "project"
          ? [["projectKey", key.projectKey]]
          : [["consentRootKey", key.consentRootKey]];
    case "task":
      return "taskId" in key
        ? [
            ["listId", key.listId],
            ["taskId", key.taskId],
          ]
        : [["listId", key.listId]];
    case "memory":
      return [
        ["projectKey", key.projectKey],
        ["relPath", key.relPath],
      ];
    case "pluginRegistry":
      return [];
    case "marketplaceCache":
      return "relPath" in key
        ? [
            ["marketplace", key.marketplace],
            ["relPath", key.relPath],
          ]
        : [["marketplace", key.marketplace]];
    case "pluginCache":
      return [
        ["marketplace", key.marketplace],
        ["plugin", key.plugin],
        ["version", key.version],
        ["relPath", key.relPath],
      ];
    case "cache":
      return [
        ["store", key.store],
        ["id", key.id],
      ];
    case "paste":
      return [["id", key.id]];
    case "pluginAssetCache":
      return [["digest", key.digest]];
    case "state":
      return [["id", key.id]];
    case "plan":
      return [["name", key.name]];
    case "feedbackDraft":
      return [["draftId", key.draftId]];
    case "agentMemory":
      return [
        ...(key.layer === "user" ? [] : [["projectKey", key.projectKey]]),
        ["agentType", key.agentType],
        ["relPath", key.relPath],
      ];
    case "team":
      return [["team", key.team]];
    case "sidecar":
      return [
        ["projectKey", key.projectKey],
        ["sessionId", key.sessionId],
        ["relPath", key.relPath],
      ];
    case "scratch":
      return [
        ["sessionId", key.sessionId],
        ["relPath", key.relPath],
      ];
    case "userConfigDir":
      return [["relPath", key.relPath]];
    case "fileHistory":
      return [
        ["sessionId", key.sessionId],
        ["backupFileName", key.backupFileName],
      ];
    case "job":
      return [
        ["jobId", key.jobId],
        ["relPath", key.relPath],
      ];
    case "daemon":
      return [["relPath", key.relPath]];
    case "jobsRoot":
      return "file" in key ? [] : [["draftKey", key.draftKey]];
    case "session":
      return [["file", key.file]];
    case "bridgePointer":
    case "sessionAliases":
      return [["projectKey", key.projectKey]];
    case "dirSyncRecord":
      return [
        ["projectKey", key.projectKey],
        ["sessionId", key.sessionId],
      ];
    case "mailbox":
      return [
        ["team", key.team],
        ["teammate", key.teammate],
      ];
    case "log":
      return [
        ["sessionId", key.sessionId],
        ["agentId", key.agentId, "optional"],
        ["runId", key.runId, "optional"],
      ];
    case "jobTimeline":
      return [["jobId", key.jobId]];
    case "recording":
      return [
        ["projectKey", key.projectKey],
        ["sessionId", key.sessionId],
        ["stamp", key.stamp],
      ];
    case "sessionLog":
      return [
        ["projectKey", key.projectKey],
        ["year", key.year],
        ["month", key.month],
        ["day", key.day],
        ["logName", key.logName],
      ];
  }
  return;
}
//@ chunk-t0gq9gyw.js:37779-37999 placement
/**
 * 校验存储范围对象。
 */
function validateStorageScope(scope) {
  if (typeof scope !== "object" || scope === null)
    return invalidStorageArgument("scope", "expected a scope object");
  let fields = scopePathSegments(scope);
  if (fields === undefined)
    return invalidStorageArgument("scope", `${String(scope.namespace)} is not a listable namespace`);
  return validateScopeByNamespace(scope) ?? checkKeyFields("scope", fields);
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
function validateScopeByNamespace(scope) {
  let agentMemoryError = scope.namespace === "agentMemory" ? validateAgentMemoryScope(scope) : undefined;
  if (agentMemoryError !== undefined) return agentMemoryError;
  if (scope.namespace === "transcript" || scope.namespace === "sidecar") {
    let sessionError = validateSessionIdSegment("scope.sessionId", scope.sessionId);
    if (sessionError !== undefined) return sessionError;
  }
  for (let [field, errorText] of SCOPE_FIELD_ERRORS[scope.namespace])
    if (field in scope && scope[field] !== undefined)
      return invalidStorageArgument(`scope.${field}`, errorText);
  if (scope.namespace === "sidecar" && namesJsonlStream(scope.relPath))
    return invalidStorageArgument("scope.relPath", JSONL_STREAM_KEY_ERROR);
  if (scope.namespace === "sidecar" && isRecordingStreamPath(scope.relPath))
    return invalidStorageArgument("scope.relPath", RECORDING_STREAM_ADDRESSED_ERROR);
  if (scope.namespace === "log" && scope.channel !== undefined && !isLogChannel(scope.channel))
    return invalidStorageArgument("scope.channel", LOG_CHANNEL_ERROR);
  if (scope.namespace === "job" && isJobTimelinePath(scope.relPath))
    return invalidStorageArgument("scope.relPath", JOB_TIMELINE_KEY_ERROR);
  let dateError = scope.namespace === "sessionLog" ? validateDateScope(scope) : undefined;
  if (dateError !== undefined) return dateError;
  if (scope.namespace === "scratch" && scope.sessionId === undefined && scope.relPath !== undefined)
    return invalidStorageArgument(
      "scope.relPath",
      "requires scope.sessionId: a scratch relPath narrows one session directory, and no cross-session prefix filter exists",
    );
  if (scope.namespace === "userConfigDir" && !USER_CONFIG_DIR_NAME_SET.has(scope.dir))
    return invalidStorageArgument("scope.dir", USER_CONFIG_DIR_ERROR);
  if (
    scope.namespace === "transcript" &&
    scope.agentRelPath !== undefined &&
    (scope.projectKey === undefined || scope.sessionId === undefined)
  )
    return invalidStorageArgument(
      "scope.agentRelPath",
      "requires scope.projectKey and scope.sessionId: an agentRelPath narrows the subagents/ tree of one session directory",
    );
  if (scope.namespace === "transcript" && namesJsonlStream(scope.agentRelPath))
    return invalidStorageArgument("scope.agentRelPath", JSONL_STREAM_KEY_ERROR);
  if (scope.namespace === "pluginCache") {
    if (scope.marketplace === undefined && scope.plugin !== undefined)
      return invalidStorageArgument(
        "scope.plugin",
        "requires scope.marketplace: a plugin narrows one marketplace folder",
      );
    if (scope.plugin === undefined && scope.version !== undefined)
      return invalidStorageArgument(
        "scope.version",
        "requires scope.plugin: a version narrows one plugin folder",
      );
    if (scope.version === undefined && scope.relPath !== undefined)
      return invalidStorageArgument(
        "scope.relPath",
        "requires scope.version: a relPath narrows one version folder",
      );
  }
  if (scope.namespace === "job" && scope.jobId === undefined && scope.relPath !== undefined)
    return invalidStorageArgument(
      "scope.relPath",
      "requires scope.jobId: a job relPath narrows one job directory, and no cross-job prefix filter exists",
    );
  if (scope.namespace === "transcript" && scope.projectKey === undefined && scope.sessionId !== undefined)
    return invalidStorageArgument(
      "scope.sessionId",
      "requires scope.projectKey: a session narrows one project folder, and no cross-project session filter exists",
    );
  if (scope.namespace === "globalConfig" && scope.kind !== undefined && !isGlobalConfigCopyKind(scope.kind))
    return invalidStorageArgument("scope.kind", GLOBAL_CONFIG_COPY_KIND_ERROR);
  return;
}
//@ chunk-t0gq9gyw.js:42173-42652 placement
/**
 * 校验代理记忆范围（user/project/local）。
 */
function validateAgentMemoryScope(scope) {
  if (!isMcpServerFromProjectOrLocalSettings(scope.layer))
    return invalidStorageArgument("scope.layer", "must be user, project or local");
  if (scope.layer === "user" && "projectKey" in scope)
    return invalidStorageArgument("scope.projectKey", "the user layer is not keyed by project");
  if (scope.layer !== "user" && typeof scope.projectKey !== "string")
    return invalidStorageArgument("scope.projectKey", "required for the project and local layers");
  return scope.agentType === undefined && scope.relPath !== undefined
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
function scopePathSegments(scope) {
  switch (scope.namespace) {
    case "transcript":
      return [
        ["projectKey", scope.projectKey, "optional"],
        ["sessionId", scope.sessionId, "optional"],
        ["agentRelPath", scope.agentRelPath, "optional"],
      ];
    case "task":
      return [["listId", scope.listId, "optional"]];
    case "mailbox":
      return [["team", scope.team, "optional"]];
    case "memory":
      return [
        ["projectKey", scope.projectKey],
        ["relPath", scope.relPath, "optional"],
      ];
    case "pluginCache":
      return [
        ["marketplace", scope.marketplace, "optional"],
        ["plugin", scope.plugin, "optional"],
        ["version", scope.version, "optional"],
        ["relPath", scope.relPath, "optional"],
      ];
    case "marketplaceCache":
      return [
        ["marketplace", scope.marketplace],
        ["relPath", scope.relPath, "optional"],
      ];
    case "cache":
      return [["store", scope.store]];
    case "state":
    case "plan":
    case "paste":
    case "pluginAssetCache":
    case "feedbackDraft":
      return [];
    case "sidecar":
      return [
        ["projectKey", scope.projectKey],
        ["sessionId", scope.sessionId],
        ["relPath", scope.relPath, "optional"],
      ];
    case "agentMemory":
      return [
        ["projectKey", scope.layer === "user" ? undefined : scope.projectKey, "optional"],
        ["agentType", scope.agentType, "optional"],
        ["relPath", scope.relPath, "optional"],
      ];
    case "scratch":
      return [
        ["sessionId", scope.sessionId, "optional"],
        ["relPath", scope.relPath, "optional"],
      ];
    case "userConfigDir":
      return [["relPath", scope.relPath, "optional"]];
    case "fileHistory":
      return [["sessionId", scope.sessionId, "optional"]];
    case "job":
      return [
        ["jobId", scope.jobId, "optional"],
        ["relPath", scope.relPath, "optional"],
      ];
    case "daemon":
      return [["relPath", scope.relPath, "optional"]];
    case "jobsRoot":
    case "session":
      return [];
    case "bridgeSpawn":
      return [["dir", scope.dir, "optional"]];
    case "globalConfig":
      return [["kind", scope.kind, "optional"]];
    case "log":
      return [["sessionId", scope.sessionId, "optional"]];
    case "sessionLog":
      return [
        ["projectKey", scope.projectKey, "optional"],
        ["year", scope.year, "optional"],
        ["month", scope.month, "optional"],
        ["day", scope.day, "optional"],
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
function pathToSessionSideKey(path) {
  let name = basename(path);
  if (hasJsonlFiles(name)) return;
  let projectsDir = getProjectsDir();
  let segments = [name];
  let dir = dirname(path);
  while (dir !== projectsDir && segments.length <= MAX_SIDE_PATH_DEPTH + 1) {
    let parentDir = dirname(dir);
    if (parentDir === dir) return;
    segments.unshift(basename(dir));
    dir = parentDir;
  }
  if (dir !== projectsDir || segments.length < 3) return;
  let [sessionId, relDir, ...relSegments] = segments;
  if (
    !isValidKeySegment(sessionId) ||
    !isValidKeySegment(relDir) ||
    relSegments.length === 0 ||
    !relSegments.every(isValidKeySegment)
  )
    return;
  let sideKey = STORAGE_SPACES.sidecar(sessionId, relDir, relSegments);
  return validateStorageKey(sideKey) === undefined ? sideKey : undefined;
}
//@ chunk-t0gq9gyw.js:44734-44789 placement
function toStorageKey(pathOrKey) {
  return typeof pathOrKey === "string" ? pathToSessionSideKey(pathOrKey) : pathOrKey.key;
}
export {
  pathToSessionSideKey,
  toStorageKey,
  validateStorageKey,
  keyFromMetaPath,
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
