/**
 * plugins/functionHooks/telemetry/runTelemetry.ts
 *
 * plugin_function_hooks_run 遥测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (8)
 * attribution: placement 8
 */
import { ge } from "../../../utils/identity.js";
import { IT } from "../../hooksModules/loadedModuleFilters.js";
import { isHookEvent } from "../hookApiSurface.js";
import { fromEnum, lit } from "../../../services/analytics/safeMetadata.js";
import { mn } from "../../../utils/remoteEnvironment.js";
import { classifyPluginOrigin } from "../panes.js";
import { prs } from "../dispatch/chain.js";
import { logFeatureSad } from "../../../services/analytics/featureTelemetry.js";

//@ chunk-s61vbvea.js:623314-623348 placement
var Ep = ge(new Map(), (e) => e.clear());
//@ chunk-s61vbvea.js:623348-623382 placement
var lc = ge(new Map(), (e) => e.clear());
//@ chunk-s61vbvea.js:623382-623395 placement
var BE = 60000;
//@ chunk-s61vbvea.js:623395-623456 placement
function Rp(e, n) {
  return e !== void 0 && n - e.openedAt < BE ? e : void 0;
}
/**
 * 钩子运行失败遥测的节流：同一插件同一原因一分钟内只上报一次（记录被压制次数），返回遥测字段或 undefined。
 */
//@ chunk-s61vbvea.js:623456-623887 placement
function throttledRunTelemetry({ subject: subject, event: event, reason: reason }, s) {
  let h = `${subject} ${reason}`,
    startTime = performance.now(),
    S = Ep.get(h) ?? "",
    w = Rp(lc.get(S), startTime) !== void 0,
    R = w ? void 0 : IT(s()),
    x = w ? S : `${R?.pluginStorageId ?? ""} ${reason}`,
    P = lc.get(x),
    j = Rp(P, startTime),
    G = j !== void 0;
  return (
    lc.set(x, G ? { ...j, held: j.held + 1 } : { openedAt: startTime, held: 0 }),
    Ep.set(h, x),
    G
      ? void 0
      : {
          hook_event: isHookEvent(event) ? fromEnum(event) : lit("other"),
          is_hosted: mn(),
          suppressed: P?.held ?? 0,
          ...(R && { plugin_id_hash: classifyPluginOrigin(R).plugin_id_hash, tier: fromEnum(R.tier) }),
        }
  );
}
//@ chunk-s61vbvea.js:623887-623947 placement
var freeze_4 = Object.freeze(["threw", "budget", "shape", "lingered"]);
//@ chunk-s61vbvea.js:623947-623981 placement
var dc = ge(new Map(), (e) => e.clear());
/**
 * 上报 plugin_function_hooks_run（含 engine.create 捕获的错误）
 */
//@ chunk-s61vbvea.js:623981-624308 placement
function logFunctionHooksRun({ plugin: plugin, event: event, effect: effect, skip: skip }) {
  if (skip?.refusedSubject !== void 0) dc.set(skip.refusedSubject, plugin);
  let y = skip === void 0 && effect === prs ? "caught" : freeze_4.find((R) => R === skip?.kind);
  if (y === void 0 || skip?.isCallRejected === !0 || event === "engine.create") return;
  let w = throttledRunTelemetry({ subject: plugin, event: event, reason: y }, () => plugin);
  if (w !== void 0) logFeatureSad("plugin_function_hooks_run", y, w);
}

export { logFunctionHooksRun, throttledRunTelemetry, dc };
