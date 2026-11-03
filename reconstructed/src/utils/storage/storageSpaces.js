/**
 * utils/storage/storageSpaces.ts
 *
 * 存储空间表（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3g8vhh6f.js (21)
 * attribution: placement 21
 */
//@ chunk-3g8vhh6f.js:191-248 placement
var l = String.fromCharCode(0);
var ASIDE_FILE_RE = /^\.[0-9a-f]{16}\.aside$/;
//@ chunk-3g8vhh6f.js:248-332 placement
/**
 * 是否是 `.16位十六进制.aside` 形式的旁路文件名。
 */
function isAsideFileName(e) {
  if (e.charCodeAt(0) !== 46) return false;
  return storageNameSpellings(e).some((n) => ASIDE_FILE_RE.test(n));
}
//@ chunk-3g8vhh6f.js:332-468 placement
var TEMP_FILE_NAME_RE =
  /(^\.[0-9a-f]{16}\.tmp~?$)|(\.tmp[.~][0-9a-f]{8}$)|(\.purge\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$)/;
//@ chunk-3g8vhh6f.js:468-519 placement
/**
 * 是否是临时文件名。
 */
function isTempFileName(e) {
  return storageNameSpellings(e).some((n) => TEMP_FILE_NAME_RE.test(n));
}
//@ chunk-3g8vhh6f.js:519-579 placement
function isDotsOrSpacesOnly(e) {
  return typeof e === "string" && /^[. ]+$/.test(e);
}
//@ chunk-3g8vhh6f.js:579-701 placement
function isValidKeySegment(e) {
  return !(
    typeof e !== "string" ||
    e.length === 0 ||
    isDotsOrSpacesOnly(e) ||
    e.includes("/") ||
    e.includes("\\") ||
    e.includes(l) ||
    isAsideFileName(e)
  );
}
//@ chunk-3g8vhh6f.js:701-747 placement
/**
 * 所有键片段是否都合法。
 */
function areValidKeySegments(e) {
  return e.length > 0 && e.every(isValidKeySegment);
}
//@ chunk-3g8vhh6f.js:824-947 placement
function storageNameSpellings(e) {
  let n = nameSpellingsCache.get(e);
  if (n !== undefined) return n;
  let a = Object.freeze(nameSpellingsOf(e));
  if (nameSpellingsCache.size >= SPELLINGS_CACHE_LIMIT) nameSpellingsCache.clear();
  nameSpellingsCache.set(e, a);
  return a;
}
//@ chunk-3g8vhh6f.js:947-1044 placement
function nameSpellingsOf(e) {
  let lower = e.toLowerCase();
  let index = lower.indexOf(":");
  return index === -1
    ? [trimTrailingDotsAndSpaces(lower)]
    : [trimTrailingDotsAndSpaces(lower), trimTrailingDotsAndSpaces(lower.slice(0, index))];
}
//@ chunk-3g8vhh6f.js:1044-1066 placement
var nameSpellingsCache = new Map();
var SPELLINGS_CACHE_LIMIT = 32768;
//@ chunk-3g8vhh6f.js:1066-1194 placement
function trimTrailingDotsAndSpaces(e) {
  let n = e.length;
  while (n > 0) {
    let code = e.charCodeAt(n - 1);
    if (code !== 46 && code !== 32) break;
    n -= 1;
  }
  return n === e.length ? e : e.slice(0, n);
}
//@ chunk-3g8vhh6f.js:1194-1245 placement
function withOptionalField(e, n, a) {
  return a === undefined
    ? e
    : {
        ...e,
        [n]: a,
      };
}
//@ chunk-3g8vhh6f.js:1245-1365 placement
function transcriptSpace(projectKey, sessionId, a, t) {
  let o = withOptionalField(
    {
      namespace: "transcript",
      projectKey,
      sessionId,
    },
    "agentId",
    a,
  );
  return withOptionalField(o, "agentRelPath", t);
}
//@ chunk-3g8vhh6f.js:1365-1482 placement
function logSpace(sessionId, channel, a) {
  let c = withOptionalField(
    {
      namespace: "log",
      sessionId,
      channel,
    },
    "agentId",
    a?.agentId,
  );
  return withOptionalField(c, "runId", a?.runId);
}
//@ chunk-3g8vhh6f.js:1482-4060 placement
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
  sessionLog: (projectKey, n, logName) => ({
    namespace: "sessionLog",
    projectKey,
    year: n.year,
    month: n.month,
    day: n.day,
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
//@ chunk-3g8vhh6f.js:4060-4150 placement
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
//@ chunk-3g8vhh6f.js:4150-4194 placement
/**
 * 存储空间标识（describeStorageSpace 的 JSON）。
 */
function storageSpaceId(e) {
  return JSON.stringify(describeStorageSpace(e));
}
//@ chunk-3g8vhh6f.js:4194-4235 placement
/**
 * 两个存储空间是否相同。
 */
function isSameStorageSpace(key, n) {
  return storageSpaceId(key) === storageSpaceId(n);
}
//@ chunk-3g8vhh6f.js:4235-6618 placement
function describeStorageSpace(e) {
  switch (e.namespace) {
    case "transcript":
      return e.journal === true
        ? [e.namespace, e.projectKey, e.sessionId, null, e.agentRelPath, "journal"]
        : e.sessionJournal !== undefined
          ? [e.namespace, e.projectKey, e.sessionId, null, null, e.sessionJournal]
          : [e.namespace, e.projectKey, e.sessionId, e.agentId ?? null, e.agentRelPath ?? null];
    case "history":
    case "identity":
      return [e.namespace];
    case "globalConfig":
      return "kind" in e ? [e.namespace, e.kind, e.stamp] : [e.namespace];
    case "settings":
      return e.layer === "user"
        ? [e.namespace, e.layer]
        : e.layer === "project"
          ? [e.namespace, e.layer, e.projectKey]
          : [e.namespace, e.layer, e.consentRootKey];
    case "task":
      return "meta" in e
        ? [e.namespace, e.listId, e.meta]
        : "highWaterMark" in e
          ? [e.namespace, e.listId, ["highWaterMark"]]
          : [e.namespace, e.listId, e.taskId];
    case "memory":
      return [e.namespace, e.projectKey, e.relPath];
    case "pluginRegistry":
      return [e.namespace, e.file];
    case "marketplaceCache":
      return "relPath" in e ? [e.namespace, e.marketplace, e.relPath] : [e.namespace, e.marketplace, e.form];
    case "pluginCache":
      return [e.namespace, e.marketplace, e.plugin, e.version, e.relPath];
    case "cache":
      return [e.namespace, e.store, e.id];
    case "paste":
      return [e.namespace, e.id];
    case "pluginAssetCache":
      return [e.namespace, e.digest];
    case "state":
      return [e.namespace, e.id];
    case "plan":
      return [e.namespace, e.name];
    case "feedbackDraft":
      return [e.namespace, e.draftId];
    case "agentMemory":
      return [e.namespace, e.layer, e.layer === "user" ? null : e.projectKey, e.agentType, e.relPath];
    case "team":
      return [e.namespace, e.team];
    case "sidecar":
      return [e.namespace, e.projectKey, e.sessionId, e.relPath];
    case "scratch":
      return [e.namespace, e.sessionId, e.relPath];
    case "userConfigDir":
      return [e.namespace, e.dir, e.relPath];
    case "fileHistory":
      return [e.namespace, e.sessionId, e.backupFileName];
    case "job":
      return [e.namespace, e.jobId, e.relPath];
    case "daemon":
      return [e.namespace, e.relPath];
    case "jobsRoot":
      return "file" in e ? [e.namespace, e.file] : [e.namespace, "draft", e.draftKey];
    case "session":
      return [e.namespace, e.file];
    case "bridgePointer":
    case "sessionAliases":
      return [e.namespace, e.projectKey];
    case "dirSyncRecord":
      return [e.namespace, e.projectKey, e.sessionId];
    case "mailbox":
      return [e.namespace, e.team, e.teammate];
    case "log":
      return [e.namespace, e.sessionId, e.channel, e.agentId ?? null, e.runId ?? null];
    case "jobTimeline":
      return [e.namespace, e.jobId];
    case "recording":
      return [e.namespace, e.projectKey, e.sessionId, e.stamp];
    case "sessionLog":
      return [e.namespace, e.projectKey, e.year, e.month, e.day, e.logName];
  }
}
//@ chunk-3g8vhh6f.js:6618-6665 placement
/**
 * 桥接 spawn 作用域。
 */
function bridgeSpawnScope() {
  return {
    namespace: "bridgeSpawn",
  };
}
//@ chunk-3g8vhh6f.js:6665-6815 placement
function marketplaceCacheKey(marketplace, n) {
  return n === undefined || n.length === 0
    ? {
        namespace: "marketplaceCache",
        marketplace,
      }
    : {
        namespace: "marketplaceCache",
        marketplace,
        relPath: n,
      };
}
export {
  STORAGE_SPACES,
  isValidKeySegment,
  areValidKeySegments,
  storageNameSpellings,
  bridgeSpawnScope,
  isTempFileName,
  marketplaceCacheKey,
  storageSpaceId,
  transcriptScope,
  isSameStorageSpace,
  isAsideFileName,
};
