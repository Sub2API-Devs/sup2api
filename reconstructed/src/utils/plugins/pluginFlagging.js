/**
 * utils/plugins/pluginFlagging.ts
 *
 * flagged-plugins.json：被下架强制卸载的插件标记的读写、已读与过期清理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginFlagging.ts
 * pieces: chunk-rrq1mnv6.js (12)
 * attribution: fingerprint 5, layout 4, callgraph-witnessed 3
 */
import { join } from "path";
import { readFile } from "fs/promises";
import { getPluginsDirectory, Tet } from "./pluginDirectories.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { logForDebugging } from "../debug.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { logError } from "../log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, getErrnoCode } from "../errors.js";
import { getFsImplementation } from "../fsOperations.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";

//@ chunk-rrq1mnv6.js:1040-1081 fingerprint = FLAGGED_PLUGINS_FILENAME (1)
var FLAGGED_PLUGINS_FILENAME = "flagged-plugins.json",
  FLAGGED_RETENTION_MS = 172800000;
//@ chunk-rrq1mnv6.js:1081-1111 layout
function getFlaggedPluginsPath() {
  return join(getPluginsDirectory(), FLAGGED_PLUGINS_FILENAME);
}
//@ chunk-rrq1mnv6.js:1111-1481 fingerprint = parsePluginsData (1)
function parsePluginsData(content) {
  let parsed = jsonParse(content);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("plugins" in parsed) ||
    typeof parsed.plugins !== "object" ||
    parsed.plugins === null
  )
    return {};
  let plugins = parsed.plugins,
    result = {};
  for (let [o, n] of Object.entries(plugins))
    if (n && typeof n === "object" && "flaggedAt" in n && typeof n.flaggedAt === "string") {
      let parsed = { flaggedAt: n.flaggedAt };
      if ("seenAt" in n && typeof n.seenAt === "string") parsed.seenAt = n.seenAt;
      result[o] = parsed;
    }
  return result;
}
//@ chunk-rrq1mnv6.js:1481-1613 layout
var EXPECTED_FS_ERRORS = new Set(["ENOSPC", "EROFS", "EACCES", "ENOENT", "ENOTDIR"]),
  EXPECTED_STORAGE_ERRORS = new Set([
    ...EXPECTED_FS_ERRORS,
    "EEXIST",
    "EISDIR",
    "AbsentParent",
    "UnexpectedAbsent",
  ]);
//@ chunk-rrq1mnv6.js:1613-1682 layout
function M(e) {
  return isStorageV5Enabled() && e !== void 0 && Tet("flagged") !== null ? e : void 0;
}
//@ chunk-rrq1mnv6.js:1682-2011 callgraph-witnessed = readFromDisk (0.395)
async function readFromDisk(e) {
  let r = M(e);
  if (r) {
    let read = await r.read([STORAGE_SPACES.pluginRegistry("flagged")]),
      o = read.ok ? read.value.items[0] : void 0;
    if (!o?.found) return {};
    let n = o.value;
    try {
      return parsePluginsData(Buffer.from(n.buffer, n.byteOffset, n.byteLength).toString("utf-8"));
    } catch {
      return {};
    }
  }
  let s = getFlaggedPluginsPath();
  try {
    let content = await readFile(s, { encoding: "utf-8" });
    return parsePluginsData(content);
  } catch {
    return {};
  }
}
//@ chunk-rrq1mnv6.js:2011-2670 callgraph-witnessed = writeToDisk (0.15)
async function writeToDisk(e, r) {
  let s = M(r);
  if (s) {
    let write = await s.write(
      STORAGE_SPACES.pluginRegistry("flagged"),
      jsonStringify({ plugins: e }, null, 2),
    );
    if (write.ok) {
      getPluginRegistry().flaggedPlugins = e;
      return;
    }
    let n = "telemetryCode" in write.error ? write.error.telemetryCode : void 0;
    if (n !== void 0 && EXPECTED_STORAGE_ERRORS.has(n))
      logForDebugging(`Failed to persist flagged plugins: ${formatStorageError(write.error)}`, {
        level: "error",
      });
    else
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to persist flagged plugins: ${write.error.code}${n === void 0 ? "" : ` ${n}`}`,
          "flagged plugins v5 write failed",
        ),
      );
    return;
  }
  let filePath = getFlaggedPluginsPath();
  try {
    await getFsImplementation().mkdir(getPluginsDirectory());
    let content = jsonStringify({ plugins: e }, null, 2);
    (await writeFileAtomic(filePath, content, 384), (getPluginRegistry().flaggedPlugins = e));
  } catch (error) {
    let n = getErrnoCode(error);
    if (n !== void 0 && EXPECTED_FS_ERRORS.has(n))
      logForDebugging(`Failed to persist flagged plugins: ${error}`, { level: "error" });
    else logError(error);
  }
}
/**
 * 读取 flagged-plugins.json（被下架强制卸载的插件），超过 48 小时且已看过的条目清掉。
 */
//@ chunk-rrq1mnv6.js:2670-2862 fingerprint = loadFlaggedPlugins (0.77)
async function loadFlaggedPlugins(e) {
  let r = await readFromDisk(e),
    now = Date.now(),
    g = !1;
  for (let [o, n] of Object.entries(r))
    if (n.seenAt && now - new Date(n.seenAt).getTime() >= FLAGGED_RETENTION_MS) (delete r[o], (g = !0));
  if (((getPluginRegistry().flaggedPlugins = r), g)) await writeToDisk(r, e);
}
/**
 * 全局状态中的 flagged 插件表。
 */
//@ chunk-rrq1mnv6.js:2862-2908 layout
function getFlaggedPlugins() {
  return getPluginRegistry().flaggedPlugins ?? {};
}
/**
 * 标记一个插件为 flagged（记录时间），持久化。
 */
//@ chunk-rrq1mnv6.js:2908-3104 fingerprint = addFlaggedPlugin (0.886)
async function addFlaggedPlugin(e, r) {
  let s = getPluginRegistry();
  if (s.flaggedPlugins === null) s.flaggedPlugins = await readFromDisk(r);
  let g = { ...s.flaggedPlugins, [e]: { flaggedAt: new Date().toISOString() } };
  (await writeToDisk(g, r), logForDebugging(`Flagged plugin: ${e}`));
}
/**
 * 把所有 flagged 插件标为已看过（/plugin 界面展示后）。
 */
//@ chunk-rrq1mnv6.js:3104-3341 fingerprint = markFlaggedPluginsSeen (0.762)
async function markFlaggedPluginsSeen(e, r) {
  let s = getPluginRegistry();
  if (s.flaggedPlugins === null) s.flaggedPlugins = await readFromDisk(r);
  let now = new Date().toISOString(),
    o = !1,
    updated = { ...s.flaggedPlugins };
  for (let id of e) {
    let entry = updated[id];
    if (entry && !entry.seenAt) ((updated[id] = { ...entry, seenAt: now }), (o = !0));
  }
  if (o) await writeToDisk(updated, r);
}
/**
 * 移除一个 flagged 标记。
 */
//@ chunk-rrq1mnv6.js:3341-3531 callgraph-witnessed = removeFlaggedPlugin (0)
async function removeFlaggedPlugin(e, r) {
  let s = getPluginRegistry();
  if (s.flaggedPlugins === null) s.flaggedPlugins = await readFromDisk(r);
  if (!(e in s.flaggedPlugins)) return;
  let { [e]: g, ...o } = s.flaggedPlugins;
  ((s.flaggedPlugins = o), await writeToDisk(o, r));
}

export {
  getFlaggedPlugins,
  markFlaggedPluginsSeen,
  removeFlaggedPlugin,
  loadFlaggedPlugins,
  addFlaggedPlugin,
};
