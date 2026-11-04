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
import { getPluginsDirectory, pluginRegistrySpace } from "./pluginDirectories.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rrq1mnv6.js:1040-1081 fingerprint = FLAGGED_PLUGINS_FILENAME (1)
var FLAGGED_PLUGINS_FILENAME = "flagged-plugins.json";
var FLAGGED_RETENTION_MS = 172800000;
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
  let plugins = parsed.plugins;
  let result = {};
  for (let [id, entry] of Object.entries(plugins))
    if (entry && typeof entry === "object" && "flaggedAt" in entry && typeof entry.flaggedAt === "string") {
      let parsed = {
        flaggedAt: entry.flaggedAt,
      };
      if ("seenAt" in entry && typeof entry.seenAt === "string") parsed.seenAt = entry.seenAt;
      result[id] = parsed;
    }
  return result;
}
//@ chunk-rrq1mnv6.js:1481-1613 layout
var EXPECTED_FS_ERRORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EXPECTED_STORAGE_ERRORS;
deferInit("chunk-rrq1mnv6.js:1481", () => {
  EXPECTED_FS_ERRORS = new Set(["ENOSPC", "EROFS", "EACCES", "ENOENT", "ENOTDIR"]);
  EXPECTED_STORAGE_ERRORS = new Set([
    ...EXPECTED_FS_ERRORS,
    "EEXIST",
    "EISDIR",
    "AbsentParent",
    "UnexpectedAbsent",
  ]);
});
//@ chunk-rrq1mnv6.js:1613-1682 layout
function flaggedPluginIdIfStored(storageV5) {
  return isStorageV5Enabled() && storageV5 !== undefined && pluginRegistrySpace("flagged") !== null
    ? storageV5
    : undefined;
}
//@ chunk-rrq1mnv6.js:1682-2011 callgraph-witnessed = readFromDisk (0.395)
async function readFromDisk(storageV5) {
  let storageId = flaggedPluginIdIfStored(storageV5);
  if (storageId) {
    let readResult = await storageId.read([STORAGE_SPACES.pluginRegistry("flagged")]);
    let item = readResult.ok ? readResult.value.items[0] : undefined;
    if (!item?.found) return {};
    let value = item.value;
    try {
      return parsePluginsData(
        Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString("utf-8"),
      );
    } catch {
      return {};
    }
  }
  let flaggedPluginsPath = getFlaggedPluginsPath();
  try {
    let content = await readFile(flaggedPluginsPath, {
      encoding: "utf-8",
    });
    return parsePluginsData(content);
  } catch {
    return {};
  }
}
//@ chunk-rrq1mnv6.js:2011-2670 callgraph-witnessed = writeToDisk (0.15)
async function writeToDisk(plugins, storageV5) {
  let storageId = flaggedPluginIdIfStored(storageV5);
  if (storageId) {
    let writeResult = await storageId.write(
      STORAGE_SPACES.pluginRegistry("flagged"),
      jsonStringify(
        {
          plugins,
        },
        null,
        2,
      ),
    );
    if (writeResult.ok) {
      getPluginRegistry().flaggedPlugins = plugins;
      return;
    }
    let telemetryCode = "telemetryCode" in writeResult.error ? writeResult.error.telemetryCode : undefined;
    if (telemetryCode !== undefined && EXPECTED_STORAGE_ERRORS.has(telemetryCode))
      logForDebugging(`Failed to persist flagged plugins: ${formatStorageError(writeResult.error)}`, {
        level: "error",
      });
    else
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to persist flagged plugins: ${writeResult.error.code}${telemetryCode === undefined ? "" : ` ${telemetryCode}`}`,
          "flagged plugins v5 write failed",
        ),
      );
    return;
  }
  let filePath = getFlaggedPluginsPath();
  try {
    await getFsImplementation().mkdir(getPluginsDirectory());
    let content = jsonStringify(
      {
        plugins,
      },
      null,
      2,
    );
    await writeFileAtomic(filePath, content, 384);
    getPluginRegistry().flaggedPlugins = plugins;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== undefined && EXPECTED_FS_ERRORS.has(errnoCode))
      logForDebugging(`Failed to persist flagged plugins: ${error}`, {
        level: "error",
      });
    else logError(error);
  }
}
//@ chunk-rrq1mnv6.js:2670-2862 fingerprint = loadFlaggedPlugins (0.77)
/**
 * 读取 flagged-plugins.json（被下架强制卸载的插件），超过 48 小时且已看过的条目清掉。
 */
async function loadFlaggedPlugins(storageV5) {
  let all = await readFromDisk(storageV5);
  let now = Date.now();
  let changed = false;
  for (let [id, entry] of Object.entries(all))
    if (entry.seenAt && now - new Date(entry.seenAt).getTime() >= FLAGGED_RETENTION_MS) {
      delete all[id];
      changed = true;
    }
  getPluginRegistry().flaggedPlugins = all;
  if (changed) await writeToDisk(all, storageV5);
}
//@ chunk-rrq1mnv6.js:2862-2908 layout
/**
 * 全局状态中的 flagged 插件表。
 */
function getFlaggedPlugins() {
  return getPluginRegistry().flaggedPlugins ?? {};
}
//@ chunk-rrq1mnv6.js:2908-3104 fingerprint = addFlaggedPlugin (0.886)
/**
 * 标记一个插件为 flagged（记录时间），持久化。
 */
async function addFlaggedPlugin(pluginId, storageV5) {
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.flaggedPlugins === null) pluginRegistry.flaggedPlugins = await readFromDisk(storageV5);
  let updated = {
    ...pluginRegistry.flaggedPlugins,
    [pluginId]: {
      flaggedAt: new Date().toISOString(),
    },
  };
  await writeToDisk(updated, storageV5);
  logForDebugging(`Flagged plugin: ${pluginId}`);
}
//@ chunk-rrq1mnv6.js:3104-3341 fingerprint = markFlaggedPluginsSeen (0.762)
/**
 * 把所有 flagged 插件标为已看过（/plugin 界面展示后）。
 */
async function markFlaggedPluginsSeen(pluginIds, storageV5) {
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.flaggedPlugins === null) pluginRegistry.flaggedPlugins = await readFromDisk(storageV5);
  let now = new Date().toISOString();
  let changed = false;
  let updated = {
    ...pluginRegistry.flaggedPlugins,
  };
  for (let id of pluginIds) {
    let entry = updated[id];
    if (entry && !entry.seenAt) {
      updated[id] = {
        ...entry,
        seenAt: now,
      };
      changed = true;
    }
  }
  if (changed) await writeToDisk(updated, storageV5);
}
//@ chunk-rrq1mnv6.js:3341-3531 callgraph-witnessed = removeFlaggedPlugin (0)
/**
 * 移除一个 flagged 标记。
 */
async function removeFlaggedPlugin(pluginId, storageV5) {
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.flaggedPlugins === null) pluginRegistry.flaggedPlugins = await readFromDisk(storageV5);
  if (!(pluginId in pluginRegistry.flaggedPlugins)) return;
  let { [pluginId]: removed, ...remaining } = pluginRegistry.flaggedPlugins;
  pluginRegistry.flaggedPlugins = remaining;
  await writeToDisk(remaining, storageV5);
}
export {
  getFlaggedPlugins,
  markFlaggedPluginsSeen,
  removeFlaggedPlugin,
  loadFlaggedPlugins,
  addFlaggedPlugin,
};
