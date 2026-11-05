/**
 * plugins/functionHooks/modLoadTelemetry.ts
 *
 * 2.1.316 新增：mod 加载结果遥测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 10
 */
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { isOfficialMarketplacePlugin, classifyPluginOrigin } from "./panes.js";
import { fromEnumOpt, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { countWhere } from "../../utils/collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3795553-3795589 placement
/**
 * 是否已记录 mod 加载汇总
 */
var modLoadSummaryLogged; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3795553", () => {
  modLoadSummaryLogged = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-5xgkngpb.js:3795589-3795625 placement
/**
 * 分发计数
 */
var modLoadDispatchCount; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3795589", () => {
  modLoadDispatchCount = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-5xgkngpb.js:3795625-3795659 placement
/**
 * 按来源计数
 */
var modLoadBySource; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3795625", () => {
  modLoadBySource = identity_2(new Map(), (bySource) => bySource.clear());
});
//@ chunk-5xgkngpb.js:3795659-3795734 placement
/**
 * 计入一次事件
 */
function countModLoadEvent(pluginStorageId) {
  if (modLoadSummaryLogged.get() === undefined && modLoadBySource.has(pluginStorageId))
    modLoadDispatchCount.set((modLoadDispatchCount.get() ?? 0) + 1);
}
//@ chunk-5xgkngpb.js:3795734-3795805 placement
var PROVENANCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3795734", () => {
  PROVENANCES = Object.freeze(["installed", "plugin_dir", "dev_mods", "managed"]);
});
//@ chunk-5xgkngpb.js:3795805-3796202 placement
/**
 * 每个插件只记一次加载结果（官方市场插件且首次即成功时不记），返回来源、哈希 id、层级等遥测字段。
 */
function modLoadTelemetryFields(pluginInfo, outcome) {
  let previous = modLoadBySource.get(pluginInfo.pluginStorageId);
  let isLoaded = outcome === "loaded";
  if (
    (previous === undefined && isOfficialMarketplacePlugin(pluginInfo.pluginStorageId)) ||
    previous?.isLoaded === true ||
    (previous !== undefined && !isLoaded)
  )
    return;
  modLoadBySource.set(pluginInfo.pluginStorageId, {
    provenance: previous?.provenance,
    isLoaded,
  });
  let origin = classifyPluginOrigin(pluginInfo);
  modLoadBySource.set(pluginInfo.pluginStorageId, {
    provenance: PROVENANCES.find((provenance) => provenance === origin.provenance),
    isLoaded,
  });
  return {
    provenance: origin.provenance,
    plugin_id_hash: origin.plugin_id_hash,
    tier: fromEnumOpt(pluginInfo.tier),
    is_hosted: isRemoteManagedEnvironment(),
  };
}
//@ chunk-5xgkngpb.js:3796202-3796375 placement
function logModLoad(pluginInfo, outcome, extraFields) {
  try {
    let fields = modLoadTelemetryFields(pluginInfo, outcome);
    if (fields !== undefined)
      logEvent("tengu_plugin_function_hooks_mod_load", {
        ...fields,
        outcome: fromEnum(outcome),
        ...extraFields,
      });
  } catch (error) {
    logError(
      Error("mod load not counted", {
        cause: error,
      }),
    );
  }
}
//@ chunk-5xgkngpb.js:3796375-3796420 placement
/**
 * 记录加载失败
 */
var logModLoadFailed = (pluginInfo, reason) =>
  logModLoad(pluginInfo, "failed", {
    reason: fromEnum(reason),
  });
//@ chunk-5xgkngpb.js:3796420-3796488 placement
/**
 * 记录已加载
 */
var logModLoaded = (loadedMod) =>
  logModLoad(loadedMod.args, "loaded", {
    hook_patterns: loadedMod.patterns.length,
  });
//@ chunk-5xgkngpb.js:3796488-3796881 placement
/**
 * 首个回合结束时记录一次 mod 加载情况：已加载/失败数量、分发次数与各来源计数。
 */
function logModsFirstTurn() {
  if (modLoadBySource.size === 0 || modLoadSummaryLogged.get() !== undefined) return;
  modLoadSummaryLogged.set(true);
  try {
    let filtered = [...modLoadBySource.values()].filter((entry) => entry.isLoaded);
    logEvent("tengu_plugin_function_hooks_mods_first_turn", {
      loaded_mods: filtered.length,
      failed_mods: modLoadBySource.size - filtered.length,
      mod_dispatches: modLoadDispatchCount.get() ?? 0,
      ...Object.fromEntries(
        PROVENANCES.map((provenance) => [
          `provenance_${provenance}`,
          countWhere(filtered, (entry) => entry.provenance === provenance),
        ]),
      ),
    });
  } catch (error) {
    logError(
      Error("mods first turn not counted", {
        cause: error,
      }),
    );
  }
}
export { logModsFirstTurn, countModLoadEvent, logModLoadFailed, logModLoaded };
