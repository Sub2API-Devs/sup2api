/**
 * plugins/functionHooks/modLoadTelemetry.ts
 *
 * 2.1.316 新增：mod 加载结果遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { isOfficialMarketplacePlugin, classifyPluginOrigin } from "./panes.js";
import { fromEnumOpt, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { count } from "../../utils/collections.js";

//@ chunk-e6aww6q8.js:3699865-3699901 placement
/**
 * 是否已记录 mod 加载汇总
 */
var modLoadSummaryLogged = identity_2(createValueSlot(), (e) => e.set(undefined));
//@ chunk-e6aww6q8.js:3699901-3699937 placement
/**
 * 分发计数
 */
var modLoadDispatchCount = identity_2(createValueSlot(), (e) => e.set(undefined));
//@ chunk-e6aww6q8.js:3699937-3699971 placement
/**
 * 按来源计数
 */
var modLoadBySource = identity_2(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:3699971-3700046 placement
/**
 * 计入一次事件
 */
function countModLoadEvent(pluginStorageId) {
  if (modLoadSummaryLogged.get() === undefined && modLoadBySource.has(pluginStorageId))
    modLoadDispatchCount.set((modLoadDispatchCount.get() ?? 0) + 1);
}
//@ chunk-e6aww6q8.js:3700046-3700117 placement
var KAe = Object.freeze(["installed", "plugin_dir", "dev_mods", "managed"]);
//@ chunk-e6aww6q8.js:3700117-3700514 placement
/**
 * 每个插件只记一次加载结果（官方市场插件且首次即成功时不记），返回来源、哈希 id、层级等遥测字段。
 */
function modLoadTelemetryFields(e, n) {
  let r = modLoadBySource.get(e.pluginStorageId);
  let s = n === "loaded";
  if (
    (r === undefined && isOfficialMarketplacePlugin(e.pluginStorageId)) ||
    r?.isLoaded === true ||
    (r !== undefined && !s)
  )
    return;
  modLoadBySource.set(e.pluginStorageId, {
    provenance: r?.provenance,
    isLoaded: s,
  });
  let y = classifyPluginOrigin(e);
  modLoadBySource.set(e.pluginStorageId, {
    provenance: KAe.find((S) => S === y.provenance),
    isLoaded: s,
  });
  return {
    provenance: y.provenance,
    plugin_id_hash: y.plugin_id_hash,
    tier: fromEnumOpt(e.tier),
    is_hosted: isRemoteManagedEnvironment(),
  };
}
//@ chunk-e6aww6q8.js:3700514-3700687 placement
function logModLoad(e, n, r) {
  try {
    let s = modLoadTelemetryFields(e, n);
    if (s !== undefined)
      logEvent("tengu_plugin_function_hooks_mod_load", {
        ...s,
        outcome: fromEnum(n),
        ...r,
      });
  } catch (error) {
    logError(
      Error("mod load not counted", {
        cause: error,
      }),
    );
  }
}
//@ chunk-e6aww6q8.js:3700687-3700732 placement
/**
 * 记录加载失败
 */
var logModLoadFailed = (e, n) =>
  logModLoad(e, "failed", {
    reason: fromEnum(n),
  });
//@ chunk-e6aww6q8.js:3700732-3700800 placement
/**
 * 记录已加载
 */
var logModLoaded = (e) =>
  logModLoad(e.args, "loaded", {
    hook_patterns: e.patterns.length,
  });
//@ chunk-e6aww6q8.js:3700800-3701193 placement
/**
 * 首个回合结束时记录一次 mod 加载情况：已加载/失败数量、分发次数与各来源计数。
 */
function logModsFirstTurn() {
  if (modLoadBySource.size === 0 || modLoadSummaryLogged.get() !== undefined) return;
  modLoadSummaryLogged.set(true);
  try {
    let filtered = [...modLoadBySource.values()].filter((r) => r.isLoaded);
    logEvent("tengu_plugin_function_hooks_mods_first_turn", {
      loaded_mods: filtered.length,
      failed_mods: modLoadBySource.size - filtered.length,
      mod_dispatches: modLoadDispatchCount.get() ?? 0,
      ...Object.fromEntries(KAe.map((r) => [`provenance_${r}`, count(filtered, (s) => s.provenance === r)])),
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
