/**
 * plugins/functionHooks/settingsReadApi.ts
 *
 * 2.1.316 新增：插件读取合并后设置的接口与缓存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { sT } from "../../utils/pastedContent.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { ems } from "./policyGate.js";
import { logForDebugging } from "../../utils/debug.js";
import { uniq } from "../../utils/collections.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { SETTING_SOURCES } from "../../utils/settings/constants.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:4159986-4160098 placement
function settingsReadKey(e) {
  let toSorted = [...e.keys()].toSorted();
  return sT(jsonStringify([toSorted, toSorted.map((r) => [e.get(r)].filter((s) => s !== void 0))]));
}
/**
 * 插件读取引擎合并后的设置；插件与设置都未变化时复用上次结果。
 */
//@ chunk-e6aww6q8.js:4160098-4162230 placement
async function readMergedSettingsForPlugin(e, n) {
  let hookedMerge = e.hookedMerge;
  hookedMerge.queuedFor = void 0;
  try {
    let s = getPluginRegistry();
    await s.hookRegistrationInFlight?.catch(() => {});
    let answers = hookedMerge.answers;
    if (s.loadedModules.length === 0 && answers === null) return;
    let y = jsonStringify(s.loadedModules.map((loadedModule) => loadedModule.environmentId)),
      S = ems(hookedMerge);
    if (y === hookedMerge.askedOf && S === hookedMerge.askedAbout && hookedMerge.unsettled.size === 0) {
      logForDebugging(
        `settings.read: the engine's merge is not raised again (${n}): neither the loaded plugins nor the settings changed.`,
      );
      return;
    }
    let startTime = performance.now(),
      G = await import("./chunk-2xg1ep72.js"),
      engineMergeRead = await G.engineMergeRead();
    if (engineMergeRead === void 0 && hookedMerge.visited.length === 0) hookedMerge.unsettled = new Set();
    let Z = engineMergeRead ?? [];
    logForDebugging(
      `settings.read: the engine's merge was raised (${n}) in ${(performance.now() - startTime).toFixed(1)} ms; ${Z.length} keys answered otherwise than the files.`,
    );
    let Se = answers?.values ?? new Map(),
      ke = new Map(Z.filter((Je) => !hookedMerge.unsettled.has(Je.key)).map((Je) => [Je.key, Je.value])),
      Ee = hookedMerge.visited.includes(settingsReadKey(ke))
        ? uniq([...ke.keys(), ...Se.keys()]).filter(
            (Je) => ke.has(Je) !== Se.has(Je) || !En(ke.get(Je), Se.get(Je)),
          )
        : [];
    if (Ee.length > 0)
      ((hookedMerge.unsettled = new Set([...hookedMerge.unsettled, ...Ee])),
        logForDebugging(
          `settings.read: the merge never settles for ${Ee.join(", ")}; no hook's answer is taken for it.`,
          { level: "warn" },
        ));
    let filtered = Z.filter((Je) => !hookedMerge.unsettled.has(Je.key)),
      Me =
        filtered.length + hookedMerge.unsettled.size === 0
          ? null
          : {
              values: new Map(filtered.map((Je) => [Je.key, Je.value])),
              errors: [...hookedMerge.unsettled].map((Je) => ({
                path: Je,
                severity: "warning",
                statusOnly: !0,
                message: `${Je} never settles under a settings.read hook (one of: ${G.settingsReadPlugins().join(", ")}): taking its answer was followed by a reload of the plugins, and the plugins then loaded answered as before it. No hook's answer is taken for this key; the settings files' own value stands.`,
              })),
              source: SETTING_SOURCES.findLast((Je) => filtered.some((nt) => nt.source === Je)),
            };
    if (En(Me, answers)) {
      ((hookedMerge.visited = []), (hookedMerge.askedOf = y), (hookedMerge.askedAbout = S));
      return;
    }
    ((hookedMerge.answers = Me), (hookedMerge.isAnnouncing = !0));
    let hookRegistration = s.hookRegistration;
    try {
      settingsChangeDetector.notifyChange(
        SETTING_SOURCES.findLast((Je) => Je === Me?.source || Je === answers?.source) ?? "policySettings",
      );
    } finally {
      hookedMerge.isAnnouncing = !1;
    }
    let ze = s.hookRegistration !== hookRegistration;
    hookedMerge.visited = ze ? [...hookedMerge.visited, settingsReadKey(Se)] : [];
    let lt = await import("./chunk-7dqhgs3y.js");
    lt.configureProxyAuthHelperFromSettings();
  } catch (error) {
    logError(toError(error));
  }
}

export { readMergedSettingsForPlugin };
