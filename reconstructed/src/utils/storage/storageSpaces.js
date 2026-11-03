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
var fromCharCode = String.fromCharCode(0),
  p = /^\.[0-9a-f]{16}\.aside$/;
//@ chunk-3g8vhh6f.js:248-332 placement
function sDn(e) {
  if (e.charCodeAt(0) !== 46) return !1;
  return storageNameSpellings(e).some((n) => p.test(n));
}
//@ chunk-3g8vhh6f.js:332-468 placement
var TEMP_FILE_NAME_RE =
  /(^\.[0-9a-f]{16}\.tmp~?$)|(\.tmp[.~][0-9a-f]{8}$)|(\.purge\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$)/;
//@ chunk-3g8vhh6f.js:468-519 placement
function YOi(e) {
  return storageNameSpellings(e).some((n) => TEMP_FILE_NAME_RE.test(n));
}
//@ chunk-3g8vhh6f.js:519-579 placement
function u(e) {
  return typeof e === "string" && /^[. ]+$/.test(e);
}
//@ chunk-3g8vhh6f.js:579-701 placement
function isValidKeySegment(e) {
  return !(
    typeof e !== "string" ||
    e.length === 0 ||
    u(e) ||
    e.includes("/") ||
    e.includes("\\") ||
    e.includes(fromCharCode) ||
    sDn(e)
  );
}
//@ chunk-3g8vhh6f.js:701-747 placement
function uA(e) {
  return e.length > 0 && e.every(isValidKeySegment);
}
//@ chunk-3g8vhh6f.js:824-947 placement
function storageNameSpellings(e) {
  let n = s.get(e);
  if (n !== void 0) return n;
  let freeze = Object.freeze(m(e));
  if (s.size >= d) s.clear();
  return (s.set(e, freeze), freeze);
}
//@ chunk-3g8vhh6f.js:947-1044 placement
function m(e) {
  let lower = e.toLowerCase(),
    index = lower.indexOf(":");
  return index === -1
    ? [trimTrailingDotsAndSpaces(lower)]
    : [trimTrailingDotsAndSpaces(lower), trimTrailingDotsAndSpaces(lower.slice(0, index))];
}
//@ chunk-3g8vhh6f.js:1044-1066 placement
var s = new Map(),
  d = 32768;
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
function r(e, n, a) {
  return a === void 0 ? e : { ...e, [n]: a };
}
//@ chunk-3g8vhh6f.js:1245-1365 placement
function transcriptSpace(e, n, a, t) {
  let o = r({ namespace: "transcript", projectKey: e, sessionId: n }, "agentId", a);
  return r(o, "agentRelPath", t);
}
//@ chunk-3g8vhh6f.js:1365-1482 placement
function logSpace(e, n, a) {
  let c = r({ namespace: "log", sessionId: e, channel: n }, "agentId", a?.agentId);
  return r(c, "runId", a?.runId);
}
/**
 * 存储空间表：transcript/history/globalConfig/settings 等各自的存储后端描述
 */
//@ chunk-3g8vhh6f.js:1482-4060 placement
var STORAGE_SPACES = {
  transcript: transcriptSpace,
  journal: (e, n, a) => ({
    namespace: "transcript",
    projectKey: e,
    sessionId: n,
    agentRelPath: a,
    journal: !0,
  }),
  sessionJournal: (e, n, a) => ({ namespace: "transcript", projectKey: e, sessionId: n, sessionJournal: a }),
  history: () => ({ namespace: "history" }),
  log: logSpace,
  globalConfig: () => ({ namespace: "globalConfig" }),
  globalConfigCopy: (e, n) => ({ namespace: "globalConfig", kind: e, stamp: n }),
  userSettings: () => ({ namespace: "settings", layer: "user" }),
  projectSettings: (e) => ({ namespace: "settings", layer: "project", projectKey: e }),
  localSettings: (e) => ({ namespace: "settings", layer: "local", consentRootKey: e }),
  task: (e, n) => ({ namespace: "task", listId: e, taskId: n }),
  taskListMeta: (e) => ({ namespace: "task", listId: e, meta: !0 }),
  taskListHighWaterMark: (e) => ({ namespace: "task", listId: e, highWaterMark: !0 }),
  memory: (e, n) => ({ namespace: "memory", projectKey: e, relPath: n }),
  pluginRegistry: (e) => ({ namespace: "pluginRegistry", file: e }),
  marketplaceCache: (e, n) => ({ namespace: "marketplaceCache", marketplace: e, form: n }),
  marketplaceTree: (e, n) => ({ namespace: "marketplaceCache", marketplace: e, relPath: n }),
  pluginCache: (e, n, a, t) => ({
    namespace: "pluginCache",
    marketplace: e,
    plugin: n,
    version: a,
    relPath: t,
  }),
  cache: (e, n) => ({ namespace: "cache", store: e, id: n }),
  paste: (e) => ({ namespace: "paste", id: e }),
  state: (e) => ({ namespace: "state", id: e }),
  pluginAssetCache: (e) => ({ namespace: "pluginAssetCache", digest: e }),
  plan: (e) => ({ namespace: "plan", name: e }),
  daemon: (e) => ({ namespace: "daemon", relPath: e }),
  feedbackDraft: (e) => ({ namespace: "feedbackDraft", draftId: e }),
  agentMemory: (e, n) => ({ namespace: "agentMemory", layer: "user", agentType: e, relPath: n }),
  identity: () => ({ namespace: "identity" }),
  team: (e) => ({ namespace: "team", team: e }),
  sidecar: (e, n, a) => ({ namespace: "sidecar", projectKey: e, sessionId: n, relPath: a }),
  mailbox: (e, n) => ({ namespace: "mailbox", team: e, teammate: n }),
  scratch: (e, n) => ({ namespace: "scratch", sessionId: e, relPath: n }),
  userConfigDir: (e, n) => ({ namespace: "userConfigDir", dir: e, relPath: n }),
  fileHistory: (e, n) => ({ namespace: "fileHistory", sessionId: e, backupFileName: n }),
  job: (e, n) => ({ namespace: "job", jobId: e, relPath: n }),
  jobTimeline: (e) => ({ namespace: "jobTimeline", jobId: e }),
  recording: (e, n, a) => ({ namespace: "recording", projectKey: e, sessionId: n, stamp: a }),
  sessionLog: (e, n, a) => ({
    namespace: "sessionLog",
    projectKey: e,
    year: n.year,
    month: n.month,
    day: n.day,
    logName: a,
  }),
  jobPins: () => ({ namespace: "jobsRoot", file: "pins" }),
  jobDraft: (e) => ({ namespace: "jobsRoot", draftKey: e }),
  session: (e) => ({ namespace: "session", file: e }),
  bridgePointer: (e) => ({ namespace: "bridgePointer", projectKey: e }),
  sessionAliases: (e) => ({ namespace: "sessionAliases", projectKey: e }),
  dirSyncRecord: (e, n) => ({ namespace: "dirSyncRecord", projectKey: e, sessionId: n }),
};
//@ chunk-3g8vhh6f.js:4060-4150 placement
function XOi(e, n) {
  return { namespace: "transcript", projectKey: e, sessionId: n, agentRelPath: [] };
}
//@ chunk-3g8vhh6f.js:4150-4194 placement
function FMt(e) {
  return JSON.stringify(describeStorageSpace(e));
}
//@ chunk-3g8vhh6f.js:4194-4235 placement
function JOi(e, n) {
  return FMt(e) === FMt(n);
}
//@ chunk-3g8vhh6f.js:4235-6618 placement
function describeStorageSpace(e) {
  switch (e.namespace) {
    case "transcript":
      return e.journal === !0
        ? [e.namespace, e.projectKey, e.sessionId, null, e.agentRelPath, "journal"]
        : e.sessionJournal !== void 0
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
function QOi() {
  return { namespace: "bridgeSpawn" };
}
//@ chunk-3g8vhh6f.js:6665-6815 placement
function marketplaceCacheKey(e, n) {
  return n === void 0 || n.length === 0
    ? { namespace: "marketplaceCache", marketplace: e }
    : { namespace: "marketplaceCache", marketplace: e, relPath: n };
}

export {
  STORAGE_SPACES,
  isValidKeySegment,
  uA,
  storageNameSpellings,
  QOi,
  YOi,
  marketplaceCacheKey,
  FMt,
  XOi,
  JOi,
  sDn,
};
