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
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { isOfficialMarketplacePlugin, classifyPluginOrigin } from "./panes.js";
import { fromEnumOpt, fromEnum } from "../../services/analytics/safeMetadata.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { count } from "../../utils/collections.js";

//@ chunk-e6aww6q8.js:3699865-3699901 placement
var moe = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:3699901-3699937 placement
var goe = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:3699937-3699971 placement
var fx = ge(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:3699971-3700046 placement
function fLr(e) {
  if (moe.get() === void 0 && fx.has(e)) goe.set((goe.get() ?? 0) + 1);
}
//@ chunk-e6aww6q8.js:3700046-3700117 placement
var freeze_16 = Object.freeze(["installed", "plugin_dir", "dev_mods", "managed"]);
/**
 * 每个插件只记一次加载结果（官方市场插件且首次即成功时不记），返回来源、哈希 id、层级等遥测字段。
 */
//@ chunk-e6aww6q8.js:3700117-3700514 placement
function modLoadTelemetryFields(e, n) {
  let r = fx.get(e.pluginStorageId),
    s = n === "loaded";
  if (
    (r === void 0 && isOfficialMarketplacePlugin(e.pluginStorageId)) ||
    r?.isLoaded === !0 ||
    (r !== void 0 && !s)
  )
    return;
  fx.set(e.pluginStorageId, { provenance: r?.provenance, isLoaded: s });
  let y = classifyPluginOrigin(e);
  return (
    fx.set(e.pluginStorageId, { provenance: freeze_16.find((S) => S === y.provenance), isLoaded: s }),
    { provenance: y.provenance, plugin_id_hash: y.plugin_id_hash, tier: fromEnumOpt(e.tier), is_hosted: mn() }
  );
}
//@ chunk-e6aww6q8.js:3700514-3700687 placement
function logModLoad(e, n, r) {
  try {
    let s = modLoadTelemetryFields(e, n);
    if (s !== void 0) logEvent("tengu_plugin_function_hooks_mod_load", { ...s, outcome: fromEnum(n), ...r });
  } catch (error) {
    logError(Error("mod load not counted", { cause: error }));
  }
}
//@ chunk-e6aww6q8.js:3700687-3700732 placement
var vOn = (e, n) => logModLoad(e, "failed", { reason: fromEnum(n) });
//@ chunk-e6aww6q8.js:3700732-3700800 placement
var _Lr = (e) => logModLoad(e.args, "loaded", { hook_patterns: e.patterns.length });
/**
 * 首个回合结束时记录一次 mod 加载情况：已加载/失败数量、分发次数与各来源计数。
 */
//@ chunk-e6aww6q8.js:3700800-3701193 placement
function logModsFirstTurn() {
  if (fx.size === 0 || moe.get() !== void 0) return;
  moe.set(!0);
  try {
    let filtered = [...fx.values()].filter((r) => r.isLoaded);
    logEvent("tengu_plugin_function_hooks_mods_first_turn", {
      loaded_mods: filtered.length,
      failed_mods: fx.size - filtered.length,
      mod_dispatches: goe.get() ?? 0,
      ...Object.fromEntries(
        freeze_16.map((r) => [`provenance_${r}`, count(filtered, (s) => s.provenance === r)]),
      ),
    });
  } catch (error) {
    logError(Error("mods first turn not counted", { cause: error }));
  }
}

export { logModsFirstTurn, fLr, vOn, _Lr };
