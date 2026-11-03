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
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
} from "path";
import { Vl } from "./storageErrors.js";
import { uA, isValidKeySegment, storageNameSpellings, STORAGE_SPACES } from "./storageSpaces.js";
import { BACKUP_FILE_NAME_PATTERN_WITH_LEGACY, getProjectsDir } from "../sessionStoragePortable.js";
import { hasJsonlFiles } from "../errorLogSink.js";

//@ chunk-t0gq9gyw.js:25952-26099 placement
function invalidSegmentError(e) {
  return Vl(
    e,
    "expected a segment that is not empty or made only of dots and spaces, with no path separator, NUL or set-aside shape",
  );
}
/**
 * 校验存储键对象。
 */
//@ chunk-t0gq9gyw.js:26099-26329 placement
function validateStorageKey(e) {
  if (typeof e !== "object" || e === null) return Vl("key", "expected a key object");
  let n = validateKeyByNamespace(e);
  if (n !== void 0) return n;
  let r = keyPathSegments(e);
  if (r === void 0) return Vl("key", `${e.namespace} is not a storage namespace`);
  return checkKeyFields("key", r);
}
/**
 * 按字段定义检查键字段（必填、格式）。
 */
//@ chunk-t0gq9gyw.js:26329-26757 placement
function checkKeyFields(e, n) {
  for (let [r, o, s] of n) {
    let a = `${e}.${r}`;
    if (o === void 0) {
      if (s !== "optional") return Vl(a, "required");
    } else if (Ni(r)) {
      if (
        !(e === "scope" && r === "agentRelPath" && Array.isArray(o) && o.length === 0) &&
        (!Array.isArray(o) || !uA(o))
      )
        return Vl(
          a,
          "expected a non-empty array of segments, none empty or made only of dots and spaces, with no path separator, NUL or set-aside shape",
        );
    } else if (typeof o !== "string" || !isValidKeySegment(o)) return invalidSegmentError(a);
  }
  return;
}
//@ chunk-t0gq9gyw.js:26757-26813 placement
function Ni(e) {
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
var USER_CONFIG_DIR_NAME_SET = new Set(USER_CONFIG_DIR_NAMES),
  USER_CONFIG_DIR_ERROR = `must be one of the userConfigDir directory names (${USER_CONFIG_DIR_NAMES.join(", ")})`,
  PLUGIN_REGISTRY_FILES = ["installed", "marketplaces", "flagged", "catalog", "inUseSweep"];
//@ chunk-t0gq9gyw.js:27144-27253 placement
var PLUGIN_REGISTRY_FILE_SET = new Set(PLUGIN_REGISTRY_FILES),
  PLUGIN_REGISTRY_FILE_ERROR = `must be one of the pluginRegistry files (${PLUGIN_REGISTRY_FILES.join(", ")})`,
  MARKETPLACE_CACHE_FORMS = ["manifest", "catalog"];
//@ chunk-t0gq9gyw.js:27253-27338 placement
var Bi = new Set(MARKETPLACE_CACHE_FORMS),
  Hi = `must be one of the marketplaceCache forms (${MARKETPLACE_CACHE_FORMS.join(", ")})`;
//@ chunk-t0gq9gyw.js:27338-27355 placement
var un = ["world"];
//@ chunk-t0gq9gyw.js:27355-27439 placement
var Gi = new Set(un),
  Ki = `must be one of the session journal names (${un.join(", ")})`;
//@ chunk-t0gq9gyw.js:27439-27471 placement
function Wi(e) {
  return Gi.has(e);
}
//@ chunk-t0gq9gyw.js:27471-27539 placement
function $i(e) {
  return typeof e === "string" && /^[0-9a-f]{64}$/.test(e);
}
/**
 * 按命名空间校验存储键。
 */
//@ chunk-t0gq9gyw.js:27539-29572 placement
function validateKeyByNamespace(e) {
  if (e.namespace === "transcript") return validateTranscriptKey(e);
  if (e.namespace === "pluginAssetCache" && !$i(e.digest))
    return Vl("key.digest", "must be a SHA-256 digest: 64 lowercase hexadecimal characters");
  if (e.namespace === "globalConfig" && "kind" in e) {
    if (!pn(e.kind)) return Vl("key.kind", gn);
    if (typeof e.stamp !== "string") return Vl("key.stamp", "a recovery copy key carries its stamp");
  }
  if (e.namespace === "task") return validateTaskKey(e);
  if (e.namespace === "sidecar") {
    let n = validateSessionIdSegment("key.sessionId", e.sessionId);
    if (n !== void 0) return n;
    if (Ye(e.relPath)) return Vl("key.relPath", Be);
    return wn(e.relPath) ? Vl("key.relPath", hn) : void 0;
  }
  if (e.namespace === "recording")
    return (
      validateSessionIdSegment("key.sessionId", e.sessionId) ?? (yn(e.stamp) ? void 0 : Vl("key.stamp", Ji))
    );
  if (e.namespace === "jobsRoot") return validateJobsKey(e);
  if (e.namespace === "userConfigDir" && !USER_CONFIG_DIR_NAME_SET.has(e.dir))
    return Vl("key.dir", USER_CONFIG_DIR_ERROR);
  if (e.namespace === "fileHistory") return validateBackupFileName(e);
  if (e.namespace === "settings" && !isMcpServerFromProjectOrLocalSettings_2(e.layer))
    return Vl("key.layer", "must be user, project or local");
  if (e.namespace === "log") return validateLogChannelKey(e);
  if (e.namespace === "job" && In(e.relPath)) return Vl("key.relPath", xn);
  if (e.namespace === "sessionLog")
    return (
      validateDateParts("key", e) ??
      (ho(e.logName)
        ? void 0
        : Vl(
            "key.logName",
            "must be the session-log stem <sessionId8>[-<title-slug>]: up to eight word characters, then lower-case a-z / 0-9 runs joined by single hyphens; not a bare device name",
          ))
    );
  if (e.namespace === "pluginRegistry" && !PLUGIN_REGISTRY_FILE_SET.has(e.file))
    return Vl("key.file", PLUGIN_REGISTRY_FILE_ERROR);
  if (e.namespace === "marketplaceCache") {
    if (!("relPath" in e)) return Bi.has(e.form) ? void 0 : Vl("key.form", Hi);
    return e.form === void 0 ? void 0 : Vl("key.form", "a tree file key carries relPath, not form");
  }
  if (e.namespace !== "agentMemory") return;
  if (!isMcpServerFromProjectOrLocalSettings(e.layer))
    return Vl("key.layer", "must be user, project or local");
  if (e.layer === "user" && "projectKey" in e)
    return Vl("key.projectKey", "the user layer is not keyed by project");
  if (e.layer !== "user" && typeof e.projectKey !== "string")
    return Vl("key.projectKey", "required for the project and local layers");
  return typeof e.agentType === "string"
    ? void 0
    : Vl("key.agentType", "an agent memory key names its agent");
}
//@ chunk-t0gq9gyw.js:29572-29769 placement
function validateBackupFileName(e) {
  return typeof e.backupFileName !== "string" || !BACKUP_FILE_NAME_PATTERN_WITH_LEGACY.test(e.backupFileName)
    ? Vl("key.backupFileName", "must be a backup file name the engine has ever written (hex hash @v version)")
    : void 0;
}
//@ chunk-t0gq9gyw.js:29769-29830 placement = isMcpServerFromProjectOrLocalSettings (1)
function isMcpServerFromProjectOrLocalSettings(config) {
  return config === "user" || config === "project" || config === "local";
}
//@ chunk-t0gq9gyw.js:29830-29860 placement
var fn = ["backup", "corrupted"];
//@ chunk-t0gq9gyw.js:29860-29947 placement
var Vi = new Set(fn),
  gn = `must be one of the global-config copy kinds (${fn.join(", ")})`;
//@ chunk-t0gq9gyw.js:29947-29979 placement
function pn(e) {
  return Vi.has(e);
}
/**
 * 校验转录存储键（会话、代理相对路径）。
 */
//@ chunk-t0gq9gyw.js:29979-30853 placement
function validateTranscriptKey(e) {
  let n = validateSessionIdSegment("key.sessionId", e.sessionId);
  if (n !== void 0) return n;
  if (Ye(e.agentRelPath)) return Vl("key.agentRelPath", Be);
  if ("sessionJournal" in e) {
    if (typeof e.sessionJournal !== "string" || !Wi(e.sessionJournal)) return Vl("key.sessionJournal", Ki);
    return e.agentId === void 0 && e.agentRelPath === void 0 && !("journal" in e)
      ? void 0
      : Vl(
          "key.sessionJournal",
          "a session journal key names the session's own journal: no agentId, agentRelPath or run journal",
        );
  }
  if ("journal" in e) {
    if (e.journal !== !0) return Vl("key.journal", "must be true");
    if (!Array.isArray(e.agentRelPath))
      return Vl("key.agentRelPath", "a run journal key carries its run directory");
    return e.agentId === void 0
      ? void 0
      : Vl("key.agentId", "a transcript key names an agent transcript or the run journal, never both");
  }
  return e.agentRelPath !== void 0 && e.agentId === void 0
    ? Vl("key.agentRelPath", "requires agentId or journal")
    : void 0;
}
/**
 * 云快照、side.git、同步目录名。
 */
//@ chunk-t0gq9gyw.js:30853-30931 placement
var CLOUD_SNAPSHOTS_DIR = "cloud-snapshots",
  SIDE_GIT = "side.git",
  ARCHIVE_SYNC = "archive-sync",
  FOLDER_SYNC = "folder-sync";
/**
 * 进行中步骤目录与保留名集合。
 */
//@ chunk-t0gq9gyw.js:30931-31303 placement
var STEPS_UNDER_WAY_DIR = "steps-under-way",
  mn = new Set([
    "memory",
    "tiny_memory",
    "bagel",
    CLOUD_SNAPSHOTS_DIR,
    "bridge-pointer.json",
    ".session-aliases",
  ]),
  Xi = /^[0-9]{1,16}$/,
  Ji = "must be the recording stamp: 1 to 16 decimal digits (epoch milliseconds)",
  $e = ".cast",
  hn = `<stamp>${$e} inside a session's folder is that session's terminal recording stream: address it as keys.recording(projectKey, sessionId, stamp)`;
//@ chunk-t0gq9gyw.js:31303-31357 placement
function yn(e) {
  return typeof e === "string" && Xi.test(e);
}
//@ chunk-t0gq9gyw.js:31357-31458 placement
function wn(e) {
  return (
    Array.isArray(e) && typeof e[0] === "string" && storageNameSpellings(e[0]).some((n) => Nhs(n) !== void 0)
  );
}
//@ chunk-t0gq9gyw.js:31458-31550 placement
function Nhs(e) {
  if (!e.endsWith($e)) return;
  let sliced = e.slice(0, -$e.length);
  return yn(sliced) ? sliced : void 0;
}
//@ chunk-t0gq9gyw.js:31550-31689 placement
var SESSION_SIBLING_SUFFIXES = [".ccr-tip.json", ".precompact.json", $e],
  SESSION_SIBLING_SUFFIX_ERROR = `must not end with ${SESSION_SIBLING_SUFFIXES.join(", ")}: those name a session's project-level sibling files`;
//@ chunk-t0gq9gyw.js:31689-31757 placement
function En(e) {
  return storageNameSpellings(e).some((n) => SESSION_SIBLING_SUFFIXES.some((r) => n.endsWith(r)));
}
//@ chunk-t0gq9gyw.js:31757-31885 placement
var DIR_SYNC_RECORD_SUFFIX = ".dir-sync.json",
  DIR_SYNC_SUFFIX_ERROR = `must not end with ${DIR_SYNC_RECORD_SUFFIX}: that name is reserved for a cloud session's record at the project level`;
//@ chunk-t0gq9gyw.js:31885-31941 placement
function eo(e) {
  return storageNameSpellings(e).some((n) => n.endsWith(DIR_SYNC_RECORD_SUFFIX));
}
//@ chunk-t0gq9gyw.js:31941-32032 placement
var to = `${[...mn].join(", ")} are reserved: they name project-level entries, not sessions`;
//@ chunk-t0gq9gyw.js:32032-32082 placement
function Sn(e) {
  return storageNameSpellings(e).some((n) => mn.has(n));
}
//@ chunk-t0gq9gyw.js:32082-32128 placement
function QIi(e) {
  return !Sn(e) && !hasJsonlFiles(e) && !En(e);
}
//@ chunk-t0gq9gyw.js:32128-32280 placement
function validateSessionIdSegment(e, n) {
  if (typeof n !== "string") return;
  if (Sn(n)) return Vl(e, to);
  if (En(n)) return Vl(e, SESSION_SIBLING_SUFFIX_ERROR);
  if (eo(n)) return Vl(e, DIR_SYNC_SUFFIX_ERROR);
  return hasJsonlFiles(n) ? Vl(e, Be) : void 0;
}
//@ chunk-t0gq9gyw.js:32280-32391 placement
var META_JSON_SUFFIX = ".meta.json",
  META_RESERVED_ERROR =
    ".meta is reserved for the list metadata key, under every spelling that opens its file";
//@ chunk-t0gq9gyw.js:32391-32429 placement
function io(e) {
  return oo(`${e}.json`);
}
//@ chunk-t0gq9gyw.js:32429-32471 placement
function oo(e) {
  return storageNameSpellings(e).includes(META_JSON_SUFFIX);
}
//@ chunk-t0gq9gyw.js:32471-32541 placement
var Be = "names a .jsonl stream, which only a transcript key addresses";
//@ chunk-t0gq9gyw.js:32541-32622 placement
function Ye(e) {
  return Array.isArray(e) && e.some((n) => typeof n === "string" && hasJsonlFiles(n));
}
//@ chunk-t0gq9gyw.js:32622-32683 placement = isMcpServerFromProjectOrLocalSettings (1)
function isMcpServerFromProjectOrLocalSettings_2(config) {
  return config === "user" || config === "project" || config === "local";
}
//@ chunk-t0gq9gyw.js:32683-32728 placement
var kn = "must be debug, telemetry or apiDump";
//@ chunk-t0gq9gyw.js:32728-32794 placement
function Pn(e) {
  return e === "debug" || e === "telemetry" || e === "apiDump";
}
/**
 * 校验日志通道键。
 */
//@ chunk-t0gq9gyw.js:32794-33162 placement
function validateLogChannelKey(e) {
  if (!Pn(e.channel)) return Vl("key.channel", kn);
  if (e.channel !== "apiDump") return;
  for (let n of ["agentId", "runId"])
    if (n in e && e[n] !== void 0)
      return Vl(
        `key.${n}`,
        "an apiDump key names its dump by one id \u2014 the agent's for a subagent's requests, else the session's (today's dump-prompts/<id>.jsonl); agentId and runId nest nothing on this channel",
      );
  return;
}
/**
 * 校验任务存储键。
 */
//@ chunk-t0gq9gyw.js:33162-33936 placement
function validateTaskKey(e) {
  if ("taskId" in e && ("meta" in e || "highWaterMark" in e))
    return Vl(
      "key.taskId",
      "a task key names an item, the list metadata or the list high-water mark, never more than one",
    );
  if ("meta" in e && "highWaterMark" in e)
    return Vl(
      "key.highWaterMark",
      "a task key names an item, the list metadata or the list high-water mark, never more than one",
    );
  if ("meta" in e && e.meta !== !0) return Vl("key.meta", "must be true");
  if ("highWaterMark" in e && e.highWaterMark !== !0) return Vl("key.highWaterMark", "must be true");
  if (typeof e.listId !== "string") return Vl("key.listId", "a task key carries its listId");
  if ("meta" in e || "highWaterMark" in e) return;
  if (typeof e.taskId !== "string") return Vl("key.taskId", "a task item key carries its taskId");
  if (io(e.taskId)) return Vl("key.taskId", META_RESERVED_ERROR);
  return;
}
/**
 * 校验 jobs 根下的键。
 */
//@ chunk-t0gq9gyw.js:33936-34337 placement
function validateJobsKey(e) {
  if ("file" in e && "draftKey" in e)
    return Vl("key.draftKey", "a jobs-root key names the pins file or one draft, never both");
  if ("file" in e) return e.file === "pins" ? void 0 : Vl("key.file", "must be pins");
  if (typeof e.draftKey !== "string") return Vl("key.draftKey", "a jobs-root draft key carries its draftKey");
  return wo.test(e.draftKey) ? void 0 : Vl("key.draftKey", "must be 8 lowercase hex characters");
}
//@ chunk-t0gq9gyw.js:34337-34440 placement
var TIMELINE_JSONL = "timeline.jsonl",
  xn = `${TIMELINE_JSONL} is the job's timeline stream: address it as keys.jobTimeline(jobId)`;
//@ chunk-t0gq9gyw.js:34440-34527 placement
function In(e) {
  return Array.isArray(e) && typeof e[0] === "string" && storageNameSpellings(e[0]).includes(TIMELINE_JSONL);
}
//@ chunk-t0gq9gyw.js:34527-34645 placement
var YEAR_RE = /^\d{4}$/,
  TWO_DIGIT_RE = /^\d{2}$/,
  SAFE_SHORT_ID_RE = /^[A-Za-z0-9_-]{1,8}(?:-[a-z0-9]+)*$/,
  MAX_SHORT_ID_CHARS = 128,
  WINDOWS_RESERVED_NAME_RE = /^(?:con|prn|aux|nul|com\d|lpt\d)$/i;
//@ chunk-t0gq9gyw.js:34645-34726 placement
function ho(e) {
  return (
    typeof e === "string" &&
    e.length <= MAX_SHORT_ID_CHARS &&
    SAFE_SHORT_ID_RE.test(e) &&
    !WINDOWS_RESERVED_NAME_RE.test(e)
  );
}
//@ chunk-t0gq9gyw.js:34726-35005 placement
function validateDateParts(e, n) {
  if (n.year !== void 0 && !gt(YEAR_RE, n.year)) return Vl(`${e}.year`, "must be four digits (YYYY)");
  if (n.month !== void 0 && !gt(TWO_DIGIT_RE, n.month)) return Vl(`${e}.month`, "must be two digits (MM)");
  if (n.day !== void 0 && !gt(TWO_DIGIT_RE, n.day)) return Vl(`${e}.day`, "must be two digits (DD)");
  return;
}
//@ chunk-t0gq9gyw.js:35005-35060 placement
function gt(e, n) {
  return typeof n === "string" && e.test(n);
}
/**
 * 校验按年月的范围。
 */
//@ chunk-t0gq9gyw.js:35060-35380 placement
function validateDateScope(e) {
  if (e.year !== void 0 && e.projectKey === void 0)
    return Vl("scope.projectKey", "required when year is given");
  if (e.month !== void 0 && e.year === void 0) return Vl("scope.year", "required when month is given");
  if (e.day !== void 0 && e.month === void 0) return Vl("scope.month", "required when day is given");
  return validateDateParts("scope", e);
}
//@ chunk-t0gq9gyw.js:35380-35403 placement
var wo = /^[0-9a-f]{8}$/;
/**
 * 存储键对应的路径片段。
 */
//@ chunk-t0gq9gyw.js:35403-37779 placement
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
/**
 * 校验存储范围对象。
 */
//@ chunk-t0gq9gyw.js:37779-37999 placement
function validateStorageScope(e) {
  if (typeof e !== "object" || e === null) return Vl("scope", "expected a scope object");
  let n = scopePathSegments(e);
  if (n === void 0) return Vl("scope", `${String(e.namespace)} is not a listable namespace`);
  return validateScopeByNamespace(e) ?? checkKeyFields("scope", n);
}
/**
 * 范围中不允许字段的说明。
 */
//@ chunk-t0gq9gyw.js:37999-39955 placement
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
/**
 * 按命名空间校验范围。
 */
//@ chunk-t0gq9gyw.js:39955-42173 placement
function validateScopeByNamespace(e) {
  let n = e.namespace === "agentMemory" ? validateAgentMemoryScope(e) : void 0;
  if (n !== void 0) return n;
  if (e.namespace === "transcript" || e.namespace === "sidecar") {
    let o = validateSessionIdSegment("scope.sessionId", e.sessionId);
    if (o !== void 0) return o;
  }
  for (let [o, s] of SCOPE_FIELD_ERRORS[e.namespace])
    if (o in e && e[o] !== void 0) return Vl(`scope.${o}`, s);
  if (e.namespace === "sidecar" && Ye(e.relPath)) return Vl("scope.relPath", Be);
  if (e.namespace === "sidecar" && wn(e.relPath)) return Vl("scope.relPath", hn);
  if (e.namespace === "log" && e.channel !== void 0 && !Pn(e.channel)) return Vl("scope.channel", kn);
  if (e.namespace === "job" && In(e.relPath)) return Vl("scope.relPath", xn);
  let r = e.namespace === "sessionLog" ? validateDateScope(e) : void 0;
  if (r !== void 0) return r;
  if (e.namespace === "scratch" && e.sessionId === void 0 && e.relPath !== void 0)
    return Vl(
      "scope.relPath",
      "requires scope.sessionId: a scratch relPath narrows one session directory, and no cross-session prefix filter exists",
    );
  if (e.namespace === "userConfigDir" && !USER_CONFIG_DIR_NAME_SET.has(e.dir))
    return Vl("scope.dir", USER_CONFIG_DIR_ERROR);
  if (
    e.namespace === "transcript" &&
    e.agentRelPath !== void 0 &&
    (e.projectKey === void 0 || e.sessionId === void 0)
  )
    return Vl(
      "scope.agentRelPath",
      "requires scope.projectKey and scope.sessionId: an agentRelPath narrows the subagents/ tree of one session directory",
    );
  if (e.namespace === "transcript" && Ye(e.agentRelPath)) return Vl("scope.agentRelPath", Be);
  if (e.namespace === "pluginCache") {
    if (e.marketplace === void 0 && e.plugin !== void 0)
      return Vl("scope.plugin", "requires scope.marketplace: a plugin narrows one marketplace folder");
    if (e.plugin === void 0 && e.version !== void 0)
      return Vl("scope.version", "requires scope.plugin: a version narrows one plugin folder");
    if (e.version === void 0 && e.relPath !== void 0)
      return Vl("scope.relPath", "requires scope.version: a relPath narrows one version folder");
  }
  if (e.namespace === "job" && e.jobId === void 0 && e.relPath !== void 0)
    return Vl(
      "scope.relPath",
      "requires scope.jobId: a job relPath narrows one job directory, and no cross-job prefix filter exists",
    );
  if (e.namespace === "transcript" && e.projectKey === void 0 && e.sessionId !== void 0)
    return Vl(
      "scope.sessionId",
      "requires scope.projectKey: a session narrows one project folder, and no cross-project session filter exists",
    );
  if (e.namespace === "globalConfig" && e.kind !== void 0 && !pn(e.kind)) return Vl("scope.kind", gn);
  return;
}
/**
 * 校验代理记忆范围（user/project/local）。
 */
//@ chunk-t0gq9gyw.js:42173-42652 placement
function validateAgentMemoryScope(e) {
  if (!isMcpServerFromProjectOrLocalSettings(e.layer))
    return Vl("scope.layer", "must be user, project or local");
  if (e.layer === "user" && "projectKey" in e)
    return Vl("scope.projectKey", "the user layer is not keyed by project");
  if (e.layer !== "user" && typeof e.projectKey !== "string")
    return Vl("scope.projectKey", "required for the project and local layers");
  return e.agentType === void 0 && e.relPath !== void 0
    ? Vl("scope.relPath", "requires scope.agentType: an agent-memory relPath narrows one agent directory")
    : void 0;
}
/**
 * 范围对应的路径片段。
 */
//@ chunk-t0gq9gyw.js:42652-44363 placement
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
        ["projectKey", e.layer === "user" ? void 0 : e.projectKey, "optional"],
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
/**
 * 从 .meta.json 路径反推存储键。
 */
//@ chunk-t0gq9gyw.js:44373-44434 placement = getAgentMetadataPath (1)
function keyFromMetaPath(agentId) {
  return agentId.endsWith(".meta.json") ? pathToSessionSideKey(agentId) : void 0;
}
/**
 * 从文件路径反推存储键。
 */
//@ chunk-t0gq9gyw.js:44434-44734 placement
function pathToSessionSideKey(e) {
  let n = basename_4(e);
  if (hasJsonlFiles(n)) return;
  let r = getProjectsDir(),
    o = [n],
    s = dirname_5(e);
  while (s !== r && o.length <= MAX_SIDE_PATH_DEPTH + 1) {
    let y = dirname_5(s);
    if (y === s) return;
    (o.unshift(basename_4(s)), (s = y));
  }
  if (s !== r || o.length < 3) return;
  let [a, c, ...u] = o;
  if (!isValidKeySegment(a) || !isValidKeySegment(c) || u.length === 0 || !u.every(isValidKeySegment)) return;
  let sidecar = STORAGE_SPACES.sidecar(a, c, u);
  return validateStorageKey(sidecar) === void 0 ? sidecar : void 0;
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
  QIi,
  ARCHIVE_SYNC,
  FOLDER_SYNC,
  STEPS_UNDER_WAY_DIR,
  SIDE_GIT,
  CLOUD_SNAPSHOTS_DIR,
  Nhs,
  MAX_SIDE_PATH_DEPTH,
  DIR_SYNC_RECORD_SUFFIX,
};
