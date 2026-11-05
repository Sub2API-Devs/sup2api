/**
 * plugins/functionHooks/settingsReadApi.ts
 *
 * 2.1.316 新增：插件读取合并后设置的接口与缓存
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { bunHashOf } from "../../utils/pastedContent.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { computedSettings } from "./policyGate.js";
import { logForDebugging } from "../../utils/debug.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { SETTING_SOURCES } from "../../utils/settings/constants.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";

//@ chunk-5xgkngpb.js:4266323-4266435 placement
function settingsReadKey(answers) {
  let keys = [...answers.keys()].toSorted();
  return bunHashOf(
    jsonStringify([keys, keys.map((key) => [answers.get(key)].filter((value) => value !== undefined))]),
  );
}
//@ chunk-5xgkngpb.js:4266435-4268571 placement
/**
 * 插件读取引擎合并后的设置；插件与设置都未变化时复用上次结果。
 */
async function readMergedSettingsForPlugin(state, trigger) {
  let hookedMerge = state.hookedMerge;
  hookedMerge.queuedFor = undefined;
  try {
    let pluginRegistry = getPluginRegistry();
    await pluginRegistry.hookRegistrationInFlight?.catch(() => {});
    let answers = hookedMerge.answers;
    if (pluginRegistry.loadedModules.length === 0 && answers === null) return;
    let askedOf = jsonStringify(
      pluginRegistry.loadedModules.map((loadedModule) => loadedModule.environmentId),
    );
    let askedAbout = computedSettings(hookedMerge);
    if (
      askedOf === hookedMerge.askedOf &&
      askedAbout === hookedMerge.askedAbout &&
      hookedMerge.unsettled.size === 0
    ) {
      logForDebugging(
        `settings.read: the engine's merge is not raised again (${trigger}): neither the loaded plugins nor the settings changed.`,
      );
      return;
    }
    let startTime = performance.now();
    let settingsModule = await import("./api/ENGINE_CALLER.lazy.js");
    let engineMerge = await settingsModule.engineMergeRead();
    if (engineMerge === undefined && hookedMerge.visited.length === 0) hookedMerge.unsettled = new Set();
    let entries = engineMerge ?? [];
    logForDebugging(
      `settings.read: the engine's merge was raised (${trigger}) in ${(performance.now() - startTime).toFixed(1)} ms; ${entries.length} keys answered otherwise than the files.`,
    );
    let hookedValues = answers?.values ?? new Map();
    let engineValues = new Map(
      entries
        .filter((entry) => !hookedMerge.unsettled.has(entry.key))
        .map((entry) => [entry.key, entry.value]),
    );
    let unsettledKeys = hookedMerge.visited.includes(settingsReadKey(engineValues))
      ? normalizeCaseForComparison_2([...engineValues.keys(), ...hookedValues.keys()]).filter(
          (key) =>
            engineValues.has(key) !== hookedValues.has(key) ||
            !import_sortedIndex_2(engineValues.get(key), hookedValues.get(key)),
        )
      : [];
    if (unsettledKeys.length > 0) {
      hookedMerge.unsettled = new Set([...hookedMerge.unsettled, ...unsettledKeys]);
      logForDebugging(
        `settings.read: the merge never settles for ${unsettledKeys.join(", ")}; no hook's answer is taken for it.`,
        {
          level: "warn",
        },
      );
    }
    let filtered = entries.filter((entry) => !hookedMerge.unsettled.has(entry.key));
    let nextAnswers =
      filtered.length + hookedMerge.unsettled.size === 0
        ? null
        : {
            values: new Map(filtered.map((entry) => [entry.key, entry.value])),
            errors: [...hookedMerge.unsettled].map((key) => ({
              path: key,
              severity: "warning",
              statusOnly: true,
              message: `${key} never settles under a settings.read hook (one of: ${settingsModule.settingsReadPlugins().join(", ")}): taking its answer was followed by a reload of the plugins, and the plugins then loaded answered as before it. No hook's answer is taken for this key; the settings files' own value stands.`,
            })),
            source: SETTING_SOURCES.findLast((source) => filtered.some((entry) => entry.source === source)),
          };
    if (import_sortedIndex_2(nextAnswers, answers)) {
      hookedMerge.visited = [];
      hookedMerge.askedOf = askedOf;
      hookedMerge.askedAbout = askedAbout;
      return;
    }
    hookedMerge.answers = nextAnswers;
    hookedMerge.isAnnouncing = true;
    let hookRegistration = pluginRegistry.hookRegistration;
    try {
      settingsChangeDetector.notifyChange(
        SETTING_SOURCES.findLast((source) => source === nextAnswers?.source || source === answers?.source) ??
          "policySettings",
      );
    } finally {
      hookedMerge.isAnnouncing = false;
    }
    let hasReregistered = pluginRegistry.hookRegistration !== hookRegistration;
    hookedMerge.visited = hasReregistered ? [...hookedMerge.visited, settingsReadKey(hookedValues)] : [];
    let proxyModule = await import("../../utils/auth/proxyAuthHelperConfig.js");
    proxyModule.configureProxyAuthHelperFromSettings();
  } catch (error) {
    logError(toError(error));
  }
}
export { readMergedSettingsForPlugin };
