/**
 * plugins/functionHooks/api/settingsRead.ts
 *
 * 函数钩子 engineMergeRead 与 settings.read（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (24)
 * attribution: placement 24
 */
import { __export } from "../../../../runtime/bun-runtime.js";
import { serverFilePresenceSlot } from "../../../services/remoteManagedSettings/seating.js";
import { jsonParse, jsonStringify } from "../../../utils/slowOperations.js";
import { normalizeCaseForComparison_2 } from "../../../utils/permissions/filesystem.js";
import { subscribe } from "../../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { isWarnedSettingsKey, getSettingsFieldSchema } from "../../../utils/settings/types.js";
import {
  getInitialSettings,
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

//@ chunk-7jxyna5q.js:9610-9621 placement
/**
 * 空对象默认导出
 */
var EMPTY_SETTINGS_EXPORTS = {};
//@ chunk-7jxyna5q.js:9621-10180 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:9621", () => {
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
//@ chunk-7jxyna5q.js:221016-221056 placement
/**
 * JSON 深拷贝
 */
var jsonCloneValue = (value) => (value === undefined ? undefined : jsonParse(jsonStringify(value)));
//@ chunk-7jxyna5q.js:541795-542146 placement
function deliveredNamesOf({ servers, errors }) {
  let isWarning = (error) => error.mcpErrorMetadata?.severity === "warning";
  if (!errors.every(isWarning))
    throw Error("managed-mcp.json could not be read whole, so the servers it delivers cannot be named");
  let flattened = errors.flatMap((error) => {
    let mcpErrorMetadata = error.mcpErrorMetadata;
    let serverName = mcpErrorMetadata?.serverName;
    return mcpErrorMetadata?.skipReason !== undefined && serverName !== undefined ? [serverName] : [];
  });
  return normalizeCaseForComparison_2([...Object.keys(servers), ...flattened]);
}
//@ chunk-7jxyna5q.js:542146-542159 placement
var deliveredReaderSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:542146", () => {
  deliveredReaderSlot = subscribe();
});
//@ chunk-7jxyna5q.js:542159-542225 placement
var ENGINE_CALLER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:542159", () => {
  ENGINE_CALLER = Object.freeze({
    plugin: "engine",
    origin: Object.freeze([]),
  });
});
//@ chunk-7jxyna5q.js:542225-542245 placement
var isSchemaKey = (key) => isWarnedSettingsKey(key);
//@ chunk-7jxyna5q.js:542245-542432 placement
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
//@ chunk-7jxyna5q.js:542432-542478 placement
var ownValue = (target, key) => (Object.hasOwn(target, key) ? target[key] : undefined);
//@ chunk-7jxyna5q.js:542478-542615 placement
var SETTING_SOURCE_OF; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:542478", () => {
  SETTING_SOURCE_OF = Object.freeze({
    user: "userSettings",
    project: "projectSettings",
    local: "localSettings",
    flag: "flagSettings",
    policy: "policySettings",
  });
});
//@ chunk-7jxyna5q.js:542615-542711 placement
function settingsComputed() {
  let initialSettings = getInitialSettings();
  let { answers, computed } = commandSyncNameState().hookedMerge;
  return answers === null || computed === null ? initialSettings : computed;
}
//@ chunk-7jxyna5q.js:542711-542757 placement
function settingsCopy(settings) {
  let copy = jsonCloneValue(settings);
  return isPlainObject(copy) ? copy : {};
}
//@ chunk-7jxyna5q.js:542757-542777 placement
var servedBy; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:542757", () => {
  servedBy = new WeakMap();
});
//@ chunk-7jxyna5q.js:542777-542904 placement
function deliveredServers() {
  let policy = commandSyncNameState().policy;
  let served = servedBy.get(policy);
  let reader = deliveredReaderSlot.get();
  if (served !== undefined || reader === null) return served ?? [];
  let compute = reader();
  servedBy.set(policy, compute);
  return compute;
}
//@ chunk-7jxyna5q.js:542904-543011 placement
function originMarked(settings) {
  let policyUnverified = getPolicySettingsOrigin() === "remote" && !isRemoteManagedSettingsVerified();
  return settings !== null && (!isPolicySlotAdminOrParentComposed() || policyUnverified)
    ? {
        ...settings,
        personWritablePolicy: true,
      }
    : settings;
}
//@ chunk-7jxyna5q.js:543011-543222 placement
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
//@ chunk-7jxyna5q.js:543222-543295 placement
function settingsOfSource(source) {
  return source === "policy"
    ? policyAsDelivered(getSettingsForSource("policySettings"))
    : getSettingsForSource(SETTING_SOURCE_OF[source]);
}
//@ chunk-7jxyna5q.js:543295-543361 placement
var SETTINGS_SOURCE_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:543295", () => {
  SETTINGS_SOURCE_NAMES = Object.freeze(["user", "project", "local", "flag", "policy"]);
});
//@ chunk-7jxyna5q.js:543361-543594 placement (2.1.88 match: getSettingsWithAllErrors, 0.614)
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
//@ chunk-7jxyna5q.js:543594-543781 placement
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
//@ chunk-7jxyna5q.js:543781-544471 placement
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
  return normalizeCaseForComparison_2([...Object.keys(judged), ...Object.keys(computed)]).flatMap((input) => {
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
//@ chunk-7jxyna5q.js:544471-544593 placement
function settingsRead(input) {
  let { source, layers } = input;
  let noSource = source === undefined;
  return new Promise((resolve) => {
    resolve(
      settingsCopy(noSource ? settingsComputed() : (layers?.[0]?.settings ?? settingsOfSource(source))),
    );
  });
}
//@ chunk-7jxyna5q.js:544593-544649 placement
function settingsReadPlugins() {
  return pluginsMatchingEvent("settings.read", {}, ENGINE_CALLER.origin);
}
//@ chunk-7jxyna5q.js:544649-544837 placement
function settingsSourceProblem(source) {
  return source === undefined || (typeof source === "string" && Object.hasOwn(SETTING_SOURCE_OF, source))
    ? undefined
    : `takes { source } naming one of ${Object.keys(SETTING_SOURCE_OF).join(", ")} (got ${typeof source === "string" ? source : typeof source})`;
}
export {
  jsonCloneValue,
  deliveredReaderSlot,
  deliveredNamesOf,
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
