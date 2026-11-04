/**
 * plugins/functionHooks/api/settingsRead.ts
 *
 * 函数钩子 engineMergeRead 与 settings.read（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (24)
 * attribution: placement 24
 */
import { __export } from "../../../../runtime/bun-runtime.js";
import { serverFilePresenceSlot } from "../../../services/remoteManagedSettings/seating.js";
import { jsonParse, jsonStringify } from "../../../utils/slowOperations.js";
import { uniq } from "../../../utils/collections.js";
import { subscribe } from "../../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { isWarnedSettingsKey, getSettingsFieldSchema } from "../../../utils/settings/types.js";
import {
  getInitialSettings_2,
  getPolicySettingsOrigin,
  isPolicySlotAdminOrParentComposed,
  getSettingsForSource,
  projectSettingsAliasesUserSettings,
} from "../../../utils/settings/settings.js";
import { commandSyncNameState, pluginCommandBase } from "../../../utils/settings/commandSyncNames.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { isRemoteManagedSettingsVerified } from "../../../services/remoteManagedSettings/remoteSettingsState.js";
import { getEnabledSettingSources } from "../../../utils/settings/constants.js";
import { hasCurrentDispatch } from "../dispatch/chain.js";
import { hasModuleHookingSite } from "../../hooksModules/loadedModuleFilters.js";
import { judgeHookInput } from "../dispatch/inputJudging.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { stableStringifySafe } from "../../../utils/hooks/hookSerialization.js";
import { pluginsMatchingEvent } from "../hookDispatch.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:9634-9645 placement
/**
 * 空对象默认导出
 */
var EMPTY_SETTINGS_EXPORTS = {};
//@ chunk-s61vbvea.js:9645-10204 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:9645", () => {
  __export(EMPTY_SETTINGS_EXPORTS, {
    ENGINE_CALLER: () => ENGINE_CALLER,
    SETTINGS_SOURCE_NAMES: () => SETTINGS_SOURCE_NAMES,
    SETTING_SOURCE_OF: () => SETTING_SOURCE_OF,
    default: () => EMPTY_SETTINGS_EXPORTS,
    deliveredNamesOf: () => deliveredNamesOf,
    deliveredReaderSlot: () => deliveredReaderSlot,
    deliveredServers: () => deliveredServers,
    engineMergeRead: () => engineMergeRead,
    fittedValue: () => fittedValue,
    isSchemaKey: () => isSchemaKey,
    originMarked: () => originMarked,
    ownValue: () => ownValue,
    policyAsDelivered: () => policyAsDelivered,
    servedBy: () => servedBy,
    serverFilePresenceSlot: () => serverFilePresenceSlot,
    settingsComputed: () => settingsComputed,
    settingsCopy: () => settingsCopy,
    settingsLayers: () => settingsLayers,
    settingsOfSource: () => settingsOfSource,
    settingsRead: () => settingsRead,
    settingsReadInputOf: () => settingsReadInputOf,
    settingsReadPlugins: () => settingsReadPlugins,
    settingsSourceProblem: () => settingsSourceProblem,
  });
});
//@ chunk-s61vbvea.js:297593-297633 placement
/**
 * JSON 深拷贝
 */
var jsonCloneValue = (value) => (value === undefined ? undefined : jsonParse(jsonStringify(value)));
//@ chunk-s61vbvea.js:620272-620623 placement
function deliveredNamesOf({ servers, errors }) {
  let isWarning = (error) => error.mcpErrorMetadata?.severity === "warning";
  if (!errors.every(isWarning))
    throw Error("managed-mcp.json could not be read whole, so the servers it delivers cannot be named");
  let flattened = errors.flatMap((error) => {
    let mcpErrorMetadata = error.mcpErrorMetadata;
    let serverName = mcpErrorMetadata?.serverName;
    return mcpErrorMetadata?.skipReason !== undefined && serverName !== undefined ? [serverName] : [];
  });
  return uniq([...Object.keys(servers), ...flattened]);
}
//@ chunk-s61vbvea.js:620623-620636 placement
var deliveredReaderSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:620623", () => {
  deliveredReaderSlot = subscribe();
});
//@ chunk-s61vbvea.js:620636-620702 placement
var ENGINE_CALLER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:620636", () => {
  ENGINE_CALLER = Object.freeze({
    plugin: "engine",
    origin: Object.freeze([]),
  });
});
//@ chunk-s61vbvea.js:620702-620722 placement
var isSchemaKey = (key) => isWarnedSettingsKey(key);
//@ chunk-s61vbvea.js:620722-620909 placement
function fittedValue(key, value) {
  let parsed =
    value !== undefined && isSchemaKey(key) ? getSettingsFieldSchema(key)?.safeParse(value) : undefined;
  if (parsed === undefined)
    return {
      isFit: true,
      value,
    };
  return parsed.success
    ? {
        isFit: parsed.data !== undefined,
        value: parsed.data,
      }
    : {
        isFit: false,
        value: undefined,
      };
}
//@ chunk-s61vbvea.js:620909-620955 placement
var ownValue = (target, key) => (Object.hasOwn(target, key) ? target[key] : undefined);
//@ chunk-s61vbvea.js:620955-621092 placement
var SETTING_SOURCE_OF; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:620955", () => {
  SETTING_SOURCE_OF = Object.freeze({
    user: "userSettings",
    project: "projectSettings",
    local: "localSettings",
    flag: "flagSettings",
    policy: "policySettings",
  });
});
//@ chunk-s61vbvea.js:621092-621188 placement
function settingsComputed() {
  let initialSettings = getInitialSettings_2();
  let { answers, computed } = commandSyncNameState().hookedMerge;
  return answers === null || computed === null ? initialSettings : computed;
}
//@ chunk-s61vbvea.js:621188-621234 placement
function settingsCopy(settings) {
  let copy = jsonCloneValue(settings);
  return isPlainObject(copy) ? copy : {};
}
//@ chunk-s61vbvea.js:621234-621254 placement
var servedBy; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:621234", () => {
  servedBy = new WeakMap();
});
//@ chunk-s61vbvea.js:621254-621381 placement
function deliveredServers() {
  let policy = commandSyncNameState().policy;
  let served = servedBy.get(policy);
  let reader = deliveredReaderSlot.get();
  if (served !== undefined || reader === null) return served ?? [];
  let compute = reader();
  servedBy.set(policy, compute);
  return compute;
}
//@ chunk-s61vbvea.js:621381-621488 placement
function originMarked(settings) {
  let policyUnverified = getPolicySettingsOrigin() === "remote" && !isRemoteManagedSettingsVerified();
  return settings !== null && (!isPolicySlotAdminOrParentComposed() || policyUnverified)
    ? {
        ...settings,
        personWritablePolicy: true,
      }
    : settings;
}
//@ chunk-s61vbvea.js:621488-621699 placement
function policyAsDelivered(settings) {
  let marked = originMarked(settings);
  try {
    let servers = deliveredServers();
    return servers.length === 0
      ? marked
      : {
          ...marked,
          managedMcpServers: {
            ...Object.fromEntries(servers.map((servers) => [servers, {}])),
            ...settings?.managedMcpServers,
          },
        };
  } catch {
    return {
      ...marked,
      managedMcpServersUnreadable: true,
    };
  }
}
//@ chunk-s61vbvea.js:621699-621772 placement
function settingsOfSource(source) {
  return source === "policy"
    ? policyAsDelivered(getSettingsForSource("policySettings"))
    : getSettingsForSource(SETTING_SOURCE_OF[source]);
}
//@ chunk-s61vbvea.js:621772-621838 placement
var SETTINGS_SOURCE_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:621772", () => {
  SETTINGS_SOURCE_NAMES = Object.freeze(["user", "project", "local", "flag", "policy"]);
});
//@ chunk-s61vbvea.js:621838-622071 placement = getSettingsWithAllErrors (0.614)
/**
 * 合并设置错误与插件、MCP 等来源的错误，供 /doctor 和 /status 展示。
 */
function settingsLayers() {
  let enabledSources = new Set(getEnabledSettingSources());
  let result = projectSettingsAliasesUserSettings();
  let pluginSettings = pluginCommandBase();
  return [
    ...(pluginSettings === undefined
      ? []
      : [
          {
            source: "plugin",
            settings: pluginSettings,
          },
        ]),
    ...SETTINGS_SOURCE_NAMES.filter(
      (layer) => enabledSources.has(SETTING_SOURCE_OF[layer]) && !(layer === "project" && result),
    ).flatMap((scope) => {
      let layer = settingsOfSource(scope);
      return layer === null
        ? []
        : [
            {
              source: scope,
              settings: layer,
            },
          ];
    }),
  ];
}
//@ chunk-s61vbvea.js:622071-622258 placement
function settingsReadInputOf(input) {
  if (hasCurrentDispatch())
    return {
      ...input,
      layers: [],
    };
  let { source } = input;
  return {
    ...input,
    layers: (source === undefined
      ? settingsLayers()
      : [
          {
            source,
            settings: settingsOfSource(source),
          },
        ]
    ).map((layers) => ({
      source: layers.source,
      settings: settingsCopy(layers.settings),
    })),
  };
}
//@ chunk-s61vbvea.js:622258-622948 placement
async function engineMergeRead() {
  if (!hasModuleHookingSite("settings.read")) return;
  let { layers = [] } = settingsReadInputOf({});
  let computed = settingsComputed();
  let judged = await judgeHookInput({
    event: "settings.read",
    args: {
      layers,
    },
    caller: ENGINE_CALLER,
    bottom: {
      run: () => Promise.resolve(settingsCopy(computed)),
    },
  }).catch((error) => {
    logForDebugging(
      `settings.read: refused to the engine (${errorMessage(error)}); the settings' own values stand`,
    );
    return computed;
  });
  return uniq([...Object.keys(judged), ...Object.keys(computed)]).flatMap((input) => {
    let base = ownValue(judged, input);
    let result = fittedValue(input, base);
    let source = layers.findLast((layer) => Object.hasOwn(layer.settings, input))?.source;
    let hook = source !== undefined && source !== "plugin";
    let key = stableStringifySafe(base) === stableStringifySafe(ownValue(computed, input));
    let value = key || !result.isFit;
    if (!key && !result.isFit)
      logForDebugging(
        `settings.read: the answer for ${input} is no value the key can hold; the settings' own value stands`,
        {
          level: "warn",
        },
      );
    return value
      ? []
      : [
          {
            key: input,
            value: result.value,
            source: hook ? SETTING_SOURCE_OF[source] : undefined,
          },
        ];
  });
}
//@ chunk-s61vbvea.js:622948-623070 placement
function settingsRead(input) {
  let { source, layers } = input;
  let noSource = source === undefined;
  return new Promise((resolve) => {
    resolve(
      settingsCopy(noSource ? settingsComputed() : (layers?.[0]?.settings ?? settingsOfSource(source))),
    );
  });
}
//@ chunk-s61vbvea.js:623070-623126 placement
function settingsReadPlugins() {
  return pluginsMatchingEvent("settings.read", {}, ENGINE_CALLER.origin);
}
//@ chunk-s61vbvea.js:623126-623314 placement
function settingsSourceProblem(source) {
  return source === undefined || (typeof source === "string" && Object.hasOwn(SETTING_SOURCE_OF, source))
    ? undefined
    : `takes { source } naming one of ${Object.keys(SETTING_SOURCE_OF).join(", ")} (got ${typeof source === "string" ? source : typeof source})`;
}
export {
  deliveredReaderSlot,
  deliveredNamesOf,
  jsonCloneValue,
  settingsSourceProblem,
  settingsReadInputOf,
  settingsRead,
  ENGINE_CALLER,
  SETTINGS_SOURCE_NAMES,
  SETTING_SOURCE_OF,
  EMPTY_SETTINGS_EXPORTS,
  deliveredServers,
  engineMergeRead,
  fittedValue,
  isSchemaKey,
  originMarked,
  ownValue,
  policyAsDelivered,
  servedBy,
  settingsComputed,
  settingsCopy,
  settingsLayers,
  settingsOfSource,
  settingsReadPlugins,
};
