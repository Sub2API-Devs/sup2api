/**
 * utils/storage/storageSpaces.ts
 *
 * 存储空间表（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5qsfbz2c.js (21)
 * attribution: placement 21
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5qsfbz2c.js:191-248 placement
var KEY_SEPARATOR = String.fromCharCode(0);
var ASIDE_FILE_RE = /^\.[0-9a-f]{16}\.aside$/;
//@ chunk-5qsfbz2c.js:248-332 placement
/**
 * 是否是 `.16位十六进制.aside` 形式的旁路文件名。
 */
function isAsideFileName(name) {
  if (name.charCodeAt(0) !== 46) return false;
  return storageNameSpellings(name).some((spelling) => ASIDE_FILE_RE.test(spelling));
}
//@ chunk-5qsfbz2c.js:332-468 placement
var TEMP_FILE_NAME_RE =
  /(^\.[0-9a-f]{16}\.tmp~?$)|(\.tmp[.~][0-9a-f]{8}$)|(\.purge\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$)/;
//@ chunk-5qsfbz2c.js:468-519 placement
/**
 * 是否是临时文件名。
 */
function isTempFileName(name) {
  return storageNameSpellings(name).some((spelling) => TEMP_FILE_NAME_RE.test(spelling));
}
//@ chunk-5qsfbz2c.js:519-579 placement
function isDotsOrSpacesOnly(segment) {
  return typeof segment === "string" && /^[. ]+$/.test(segment);
}
//@ chunk-5qsfbz2c.js:579-701 placement
function isValidKeySegment(segment) {
  return !(
    typeof segment !== "string" ||
    segment.length === 0 ||
    isDotsOrSpacesOnly(segment) ||
    segment.includes("/") ||
    segment.includes("\\") ||
    segment.includes(KEY_SEPARATOR) ||
    isAsideFileName(segment)
  );
}
//@ chunk-5qsfbz2c.js:701-747 placement
/**
 * 所有键片段是否都合法。
 */
function areValidKeySegments(segments) {
  return segments.length > 0 && segments.every(isValidKeySegment);
}
//@ chunk-5qsfbz2c.js:824-947 placement
function storageNameSpellings(name) {
  let cached = nameSpellingsCache.get(name);
  if (cached !== undefined) return cached;
  let spellings = Object.freeze(nameSpellingsOf(name));
  if (nameSpellingsCache.size >= SPELLINGS_CACHE_LIMIT) nameSpellingsCache.clear();
  nameSpellingsCache.set(name, spellings);
  return spellings;
}
//@ chunk-5qsfbz2c.js:947-1044 placement
function nameSpellingsOf(name) {
  let lower = name.toLowerCase();
  let index = lower.indexOf(":");
  return index === -1
    ? [trimTrailingDotsAndSpaces(lower)]
    : [trimTrailingDotsAndSpaces(lower), trimTrailingDotsAndSpaces(lower.slice(0, index))];
}
//@ chunk-5qsfbz2c.js:1044-1066 placement
var nameSpellingsCache = new Map();
var SPELLINGS_CACHE_LIMIT = 32768;
//@ chunk-5qsfbz2c.js:1066-1194 placement
function trimTrailingDotsAndSpaces(value) {
  let end = value.length;
  while (end > 0) {
    let code = value.charCodeAt(end - 1);
    if (code !== 46 && code !== 32) break;
    end -= 1;
  }
  return end === value.length ? value : value.slice(0, end);
}
//@ chunk-5qsfbz2c.js:1194-1245 placement
function withOptionalField(base, field, value) {
  return value === undefined
    ? base
    : {
        ...base,
        [field]: value,
      };
}
//@ chunk-5qsfbz2c.js:1245-1365 placement
function transcriptSpace(projectKey, sessionId, agentId, agentRelPath) {
  let baseSpace = withOptionalField(
    {
      namespace: "transcript",
      projectKey,
      sessionId,
    },
    "agentId",
    agentId,
  );
  return withOptionalField(baseSpace, "agentRelPath", agentRelPath);
}
//@ chunk-5qsfbz2c.js:1365-1482 placement
function logSpace(sessionId, channel, logIds) {
  let baseSpace = withOptionalField(
    {
      namespace: "log",
      sessionId,
      channel,
    },
    "agentId",
    logIds?.agentId,
  );
  return withOptionalField(baseSpace, "runId", logIds?.runId);
}
//@ chunk-5qsfbz2c.js:1482-4060 placement
/**
 * 存储空间表：transcript/history/globalConfig/settings 等各自的存储后端描述
 */
var STORAGE_SPACES = {
  transcript: transcriptSpace,
  journal: (projectKey, sessionId, agentRelPath) => ({
    namespace: "transcript",
    projectKey,
    sessionId,
    agentRelPath,
    journal: true,
  }),
  sessionJournal: (projectKey, sessionId, sessionJournal) => ({
    namespace: "transcript",
    projectKey,
    sessionId,
    sessionJournal,
  }),
  history: () => ({
    namespace: "history",
  }),
  log: logSpace,
  globalConfig: () => ({
    namespace: "globalConfig",
  }),
  globalConfigCopy: (kind, stamp) => ({
    namespace: "globalConfig",
    kind,
    stamp,
  }),
  userSettings: () => ({
    namespace: "settings",
    layer: "user",
  }),
  projectSettings: (projectKey) => ({
    namespace: "settings",
    layer: "project",
    projectKey,
  }),
  localSettings: (consentRootKey) => ({
    namespace: "settings",
    layer: "local",
    consentRootKey,
  }),
  task: (listId, taskId) => ({
    namespace: "task",
    listId,
    taskId,
  }),
  taskListMeta: (listId) => ({
    namespace: "task",
    listId,
    meta: true,
  }),
  taskListHighWaterMark: (listId) => ({
    namespace: "task",
    listId,
    highWaterMark: true,
  }),
  memory: (projectKey, relPath) => ({
    namespace: "memory",
    projectKey,
    relPath,
  }),
  pluginRegistry: (file) => ({
    namespace: "pluginRegistry",
    file,
  }),
  marketplaceCache: (marketplace, form) => ({
    namespace: "marketplaceCache",
    marketplace,
    form,
  }),
  marketplaceTree: (marketplace, relPath) => ({
    namespace: "marketplaceCache",
    marketplace,
    relPath,
  }),
  pluginCache: (marketplace, plugin, version, relPath) => ({
    namespace: "pluginCache",
    marketplace,
    plugin,
    version,
    relPath,
  }),
  cache: (store, id) => ({
    namespace: "cache",
    store,
    id,
  }),
  paste: (id) => ({
    namespace: "paste",
    id,
  }),
  state: (id) => ({
    namespace: "state",
    id,
  }),
  pluginAssetCache: (digest) => ({
    namespace: "pluginAssetCache",
    digest,
  }),
  plan: (name) => ({
    namespace: "plan",
    name,
  }),
  daemon: (relPath) => ({
    namespace: "daemon",
    relPath,
  }),
  feedbackDraft: (draftId) => ({
    namespace: "feedbackDraft",
    draftId,
  }),
  agentMemory: (agentType, relPath) => ({
    namespace: "agentMemory",
    layer: "user",
    agentType,
    relPath,
  }),
  identity: () => ({
    namespace: "identity",
  }),
  team: (team) => ({
    namespace: "team",
    team,
  }),
  sidecar: (projectKey, sessionId, relPath) => ({
    namespace: "sidecar",
    projectKey,
    sessionId,
    relPath,
  }),
  mailbox: (team, teammate) => ({
    namespace: "mailbox",
    team,
    teammate,
  }),
  scratch: (sessionId, relPath) => ({
    namespace: "scratch",
    sessionId,
    relPath,
  }),
  userConfigDir: (dir, relPath) => ({
    namespace: "userConfigDir",
    dir,
    relPath,
  }),
  fileHistory: (sessionId, backupFileName) => ({
    namespace: "fileHistory",
    sessionId,
    backupFileName,
  }),
  job: (jobId, relPath) => ({
    namespace: "job",
    jobId,
    relPath,
  }),
  jobTimeline: (jobId) => ({
    namespace: "jobTimeline",
    jobId,
  }),
  recording: (projectKey, sessionId, stamp) => ({
    namespace: "recording",
    projectKey,
    sessionId,
    stamp,
  }),
  sessionLog: (projectKey, dateParts, logName) => ({
    namespace: "sessionLog",
    projectKey,
    year: dateParts.year,
    month: dateParts.month,
    day: dateParts.day,
    logName,
  }),
  jobPins: () => ({
    namespace: "jobsRoot",
    file: "pins",
  }),
  jobDraft: (draftKey) => ({
    namespace: "jobsRoot",
    draftKey,
  }),
  session: (file) => ({
    namespace: "session",
    file,
  }),
  bridgePointer: (projectKey) => ({
    namespace: "bridgePointer",
    projectKey,
  }),
  sessionAliases: (projectKey) => ({
    namespace: "sessionAliases",
    projectKey,
  }),
  dirSyncRecord: (projectKey, sessionId) => ({
    namespace: "dirSyncRecord",
    projectKey,
    sessionId,
  }),
};
//@ chunk-5qsfbz2c.js:4060-4150 placement
/**
 * 构造转录作用域（空 agentRelPath）。
 */
function transcriptScope(projectKey, sessionId) {
  return {
    namespace: "transcript",
    projectKey,
    sessionId,
    agentRelPath: [],
  };
}
//@ chunk-5qsfbz2c.js:4150-4194 placement
/**
 * 存储空间标识（describeStorageSpace 的 JSON）。
 */
function storageSpaceId(space) {
  return JSON.stringify(describeStorageSpace(space));
}
//@ chunk-5qsfbz2c.js:4194-4235 placement
/**
 * 两个存储空间是否相同。
 */
function isSameStorageSpace(key, right) {
  return storageSpaceId(key) === storageSpaceId(right);
}
//@ chunk-5qsfbz2c.js:4235-6618 placement
function describeStorageSpace(space) {
  switch (space.namespace) {
    case "transcript":
      return space.journal === true
        ? [space.namespace, space.projectKey, space.sessionId, null, space.agentRelPath, "journal"]
        : space.sessionJournal !== undefined
          ? [space.namespace, space.projectKey, space.sessionId, null, null, space.sessionJournal]
          : [
              space.namespace,
              space.projectKey,
              space.sessionId,
              space.agentId ?? null,
              space.agentRelPath ?? null,
            ];
    case "history":
    case "identity":
      return [space.namespace];
    case "globalConfig":
      return "kind" in space ? [space.namespace, space.kind, space.stamp] : [space.namespace];
    case "settings":
      return space.layer === "user"
        ? [space.namespace, space.layer]
        : space.layer === "project"
          ? [space.namespace, space.layer, space.projectKey]
          : [space.namespace, space.layer, space.consentRootKey];
    case "task":
      return "meta" in space
        ? [space.namespace, space.listId, space.meta]
        : "highWaterMark" in space
          ? [space.namespace, space.listId, ["highWaterMark"]]
          : [space.namespace, space.listId, space.taskId];
    case "memory":
      return [space.namespace, space.projectKey, space.relPath];
    case "pluginRegistry":
      return [space.namespace, space.file];
    case "marketplaceCache":
      return "relPath" in space
        ? [space.namespace, space.marketplace, space.relPath]
        : [space.namespace, space.marketplace, space.form];
    case "pluginCache":
      return [space.namespace, space.marketplace, space.plugin, space.version, space.relPath];
    case "cache":
      return [space.namespace, space.store, space.id];
    case "paste":
      return [space.namespace, space.id];
    case "pluginAssetCache":
      return [space.namespace, space.digest];
    case "state":
      return [space.namespace, space.id];
    case "plan":
      return [space.namespace, space.name];
    case "feedbackDraft":
      return [space.namespace, space.draftId];
    case "agentMemory":
      return [
        space.namespace,
        space.layer,
        space.layer === "user" ? null : space.projectKey,
        space.agentType,
        space.relPath,
      ];
    case "team":
      return [space.namespace, space.team];
    case "sidecar":
      return [space.namespace, space.projectKey, space.sessionId, space.relPath];
    case "scratch":
      return [space.namespace, space.sessionId, space.relPath];
    case "userConfigDir":
      return [space.namespace, space.dir, space.relPath];
    case "fileHistory":
      return [space.namespace, space.sessionId, space.backupFileName];
    case "job":
      return [space.namespace, space.jobId, space.relPath];
    case "daemon":
      return [space.namespace, space.relPath];
    case "jobsRoot":
      return "file" in space ? [space.namespace, space.file] : [space.namespace, "draft", space.draftKey];
    case "session":
      return [space.namespace, space.file];
    case "bridgePointer":
    case "sessionAliases":
      return [space.namespace, space.projectKey];
    case "dirSyncRecord":
      return [space.namespace, space.projectKey, space.sessionId];
    case "mailbox":
      return [space.namespace, space.team, space.teammate];
    case "log":
      return [space.namespace, space.sessionId, space.channel, space.agentId ?? null, space.runId ?? null];
    case "jobTimeline":
      return [space.namespace, space.jobId];
    case "recording":
      return [space.namespace, space.projectKey, space.sessionId, space.stamp];
    case "sessionLog":
      return [space.namespace, space.projectKey, space.year, space.month, space.day, space.logName];
  }
}
//@ chunk-5qsfbz2c.js:6618-6665 placement
/**
 * 桥接 spawn 作用域。
 */
function bridgeSpawnScope() {
  return {
    namespace: "bridgeSpawn",
  };
}
//@ chunk-5qsfbz2c.js:6665-6815 placement
function marketplaceCacheKey(marketplace, relPath) {
  return relPath === undefined || relPath.length === 0
    ? {
        namespace: "marketplaceCache",
        marketplace,
      }
    : {
        namespace: "marketplaceCache",
        marketplace,
        relPath,
      };
}
export {
  isValidKeySegment,
  STORAGE_SPACES,
  areValidKeySegments,
  storageNameSpellings,
  bridgeSpawnScope,
  isTempFileName,
  storageSpaceId,
  marketplaceCacheKey,
  isSameStorageSpace,
  transcriptScope,
  isAsideFileName,
};
