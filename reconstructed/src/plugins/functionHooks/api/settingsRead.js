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
import { Ar } from "../../../../runtime/bun-runtime.js";
import { serverFilePresenceSlot } from "../../../services/remoteManagedSettings/seating.js";
import { jsonParse, jsonStringify } from "../../../utils/slowOperations.js";
import { uniq } from "../../../utils/collections.js";
import { pu } from "../../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
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

//@ chunk-s61vbvea.js:9634-9645 placement
/**
 * 空对象默认导出
 */
var EMPTY_SETTINGS_EXPORTS = {};
//@ chunk-s61vbvea.js:9645-10204 placement
Ar(EMPTY_SETTINGS_EXPORTS, {
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
//@ chunk-s61vbvea.js:297593-297633 placement
/**
 * JSON 深拷贝
 */
var jsonCloneValue = (e) => (e === undefined ? undefined : jsonParse(jsonStringify(e)));
//@ chunk-s61vbvea.js:620272-620623 placement
function deliveredNamesOf({ servers, errors }) {
  let r = (y) => y.mcpErrorMetadata?.severity === "warning";
  if (!errors.every(r))
    throw Error("managed-mcp.json could not be read whole, so the servers it delivers cannot be named");
  let flattened = errors.flatMap((error) => {
    let mcpErrorMetadata = error.mcpErrorMetadata;
    let serverName = mcpErrorMetadata?.serverName;
    return mcpErrorMetadata?.skipReason !== undefined && serverName !== undefined ? [serverName] : [];
  });
  return uniq([...Object.keys(servers), ...flattened]);
}
//@ chunk-s61vbvea.js:620623-620636 placement
var deliveredReaderSlot = pu();
//@ chunk-s61vbvea.js:620636-620702 placement
var ENGINE_CALLER = Object.freeze({
  plugin: "engine",
  origin: Object.freeze([]),
});
//@ chunk-s61vbvea.js:620702-620722 placement
var isSchemaKey = (e) => isWarnedSettingsKey(e);
//@ chunk-s61vbvea.js:620722-620909 placement
function fittedValue(e, n) {
  let s = n !== undefined && isSchemaKey(e) ? getSettingsFieldSchema(e)?.safeParse(n) : undefined;
  if (s === undefined)
    return {
      isFit: true,
      value: n,
    };
  return s.success
    ? {
        isFit: s.data !== undefined,
        value: s.data,
      }
    : {
        isFit: false,
        value: undefined,
      };
}
//@ chunk-s61vbvea.js:620909-620955 placement
var ownValue = (e, n) => (Object.hasOwn(e, n) ? e[n] : undefined);
//@ chunk-s61vbvea.js:620955-621092 placement
var SETTING_SOURCE_OF = Object.freeze({
  user: "userSettings",
  project: "projectSettings",
  local: "localSettings",
  flag: "flagSettings",
  policy: "policySettings",
});
//@ chunk-s61vbvea.js:621092-621188 placement
function settingsComputed() {
  let initialSettings = getInitialSettings_2();
  let { answers, computed } = commandSyncNameState().hookedMerge;
  return answers === null || computed === null ? initialSettings : computed;
}
//@ chunk-s61vbvea.js:621188-621234 placement
function settingsCopy(e) {
  let n = jsonCloneValue(e);
  return isPlainObject(n) ? n : {};
}
//@ chunk-s61vbvea.js:621234-621254 placement
var servedBy = new WeakMap();
//@ chunk-s61vbvea.js:621254-621381 placement
function deliveredServers() {
  let policy = commandSyncNameState().policy;
  let n = servedBy.get(policy);
  let r = deliveredReaderSlot.get();
  if (n !== undefined || r === null) return n ?? [];
  let h = r();
  servedBy.set(policy, h);
  return h;
}
//@ chunk-s61vbvea.js:621381-621488 placement
function originMarked(e) {
  let n = getPolicySettingsOrigin() === "remote" && !isRemoteManagedSettingsVerified();
  return e !== null && (!isPolicySlotAdminOrParentComposed() || n)
    ? {
        ...e,
        personWritablePolicy: true,
      }
    : e;
}
//@ chunk-s61vbvea.js:621488-621699 placement
function policyAsDelivered(settingsForSource) {
  let n = originMarked(settingsForSource);
  try {
    let r = deliveredServers();
    return r.length === 0
      ? n
      : {
          ...n,
          managedMcpServers: {
            ...Object.fromEntries(r.map((h) => [h, {}])),
            ...settingsForSource?.managedMcpServers,
          },
        };
  } catch {
    return {
      ...n,
      managedMcpServersUnreadable: true,
    };
  }
}
//@ chunk-s61vbvea.js:621699-621772 placement
function settingsOfSource(e) {
  return e === "policy"
    ? policyAsDelivered(getSettingsForSource("policySettings"))
    : getSettingsForSource(SETTING_SOURCE_OF[e]);
}
//@ chunk-s61vbvea.js:621772-621838 placement
var SETTINGS_SOURCE_NAMES = Object.freeze(["user", "project", "local", "flag", "policy"]);
//@ chunk-s61vbvea.js:621838-622071 placement = getSettingsWithAllErrors (0.614)
/**
 * 合并设置错误与插件、MCP 等来源的错误，供 /doctor 和 /status 展示。
 */
function settingsLayers() {
  let e = new Set(getEnabledSettingSources());
  let result = projectSettingsAliasesUserSettings();
  let r = pluginCommandBase();
  return [
    ...(r === undefined
      ? []
      : [
          {
            source: "plugin",
            settings: r,
          },
        ]),
    ...SETTINGS_SOURCE_NAMES.filter(
      (h) => e.has(SETTING_SOURCE_OF[h]) && !(h === "project" && result),
    ).flatMap((scope) => {
      let y = settingsOfSource(scope);
      return y === null
        ? []
        : [
            {
              source: scope,
              settings: y,
            },
          ];
    }),
  ];
}
//@ chunk-s61vbvea.js:622071-622258 placement
function settingsReadInputOf(e) {
  if (hasCurrentDispatch())
    return {
      ...e,
      layers: [],
    };
  let { source } = e;
  return {
    ...e,
    layers: (source === undefined
      ? settingsLayers()
      : [
          {
            source,
            settings: settingsOfSource(source),
          },
        ]
    ).map((s) => ({
      source: s.source,
      settings: settingsCopy(s.settings),
    })),
  };
}
//@ chunk-s61vbvea.js:622258-622948 placement
async function engineMergeRead() {
  if (!hasModuleHookingSite("settings.read")) return;
  let { layers = [] } = settingsReadInputOf({});
  let n = settingsComputed();
  let r = await judgeHookInput({
    event: "settings.read",
    args: {
      layers,
    },
    caller: ENGINE_CALLER,
    bottom: {
      run: () => Promise.resolve(settingsCopy(n)),
    },
  }).catch((error) => {
    logForDebugging(
      `settings.read: refused to the engine (${errorMessage(error)}); the settings' own values stand`,
    );
    return n;
  });
  return uniq([...Object.keys(r), ...Object.keys(n)]).flatMap((s) => {
    let h = ownValue(r, s);
    let y = fittedValue(s, h);
    let source = layers.findLast((layer) => Object.hasOwn(layer.settings, s))?.source;
    let w = source !== undefined && source !== "plugin";
    let R = stableStringifySafe(h) === stableStringifySafe(ownValue(n, s));
    let x = R || !y.isFit;
    if (!R && !y.isFit)
      logForDebugging(
        `settings.read: the answer for ${s} is no value the key can hold; the settings' own value stands`,
        {
          level: "warn",
        },
      );
    return x
      ? []
      : [
          {
            key: s,
            value: y.value,
            source: w ? SETTING_SOURCE_OF[source] : undefined,
          },
        ];
  });
}
//@ chunk-s61vbvea.js:622948-623070 placement
function settingsRead(e) {
  let { source, layers } = e;
  let s = source === undefined;
  return new Promise((resolve) => {
    resolve(settingsCopy(s ? settingsComputed() : (layers?.[0]?.settings ?? settingsOfSource(source))));
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
};
