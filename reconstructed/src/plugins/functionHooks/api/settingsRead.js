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
import { fPi, getSettingsFieldSchema } from "../../../utils/settings/types.js";
import {
  getInitialSettings_2,
  getPolicySettingsOrigin,
  isPolicySlotAdminOrParentComposed,
  getSettingsForSource,
  projectSettingsAliasesUserSettings,
} from "../../../utils/settings/settings.js";
import { is, RIn } from "../../../utils/settings/commandSyncNames.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { isRemoteManagedSettingsVerified } from "../../../services/remoteManagedSettings/remoteSettingsState.js";
import { getEnabledSettingSources } from "../../../utils/settings/constants.js";
import { jme } from "../dispatch/chain.js";
import { hasModuleHookingSite } from "../../hooksModules/loadedModuleFilters.js";
import { judgeHookInput } from "../dispatch/inputJudging.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { Rs } from "../../../utils/hooks/hookSerialization.js";
import { pluginsMatchingEvent } from "../hookDispatch.js";

//@ chunk-s61vbvea.js:9634-9645 placement
var _4o = {};
//@ chunk-s61vbvea.js:9645-10204 placement
Ar(_4o, {
  ENGINE_CALLER: () => ENGINE_CALLER,
  SETTINGS_SOURCE_NAMES: () => SETTINGS_SOURCE_NAMES,
  SETTING_SOURCE_OF: () => SETTING_SOURCE_OF,
  default: () => _4o,
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
var Nyn = (e) => (e === void 0 ? void 0 : jsonParse(jsonStringify(e)));
//@ chunk-s61vbvea.js:620272-620623 placement
function deliveredNamesOf({ servers: servers, errors: errors }) {
  let r = (y) => y.mcpErrorMetadata?.severity === "warning";
  if (!errors.every(r))
    throw Error("managed-mcp.json could not be read whole, so the servers it delivers cannot be named");
  let flattened = errors.flatMap((y) => {
    let mcpErrorMetadata = y.mcpErrorMetadata,
      w = mcpErrorMetadata?.serverName;
    return mcpErrorMetadata?.skipReason !== void 0 && w !== void 0 ? [w] : [];
  });
  return uniq([...Object.keys(servers), ...flattened]);
}
//@ chunk-s61vbvea.js:620623-620636 placement
var deliveredReaderSlot = pu();
//@ chunk-s61vbvea.js:620636-620702 placement
var ENGINE_CALLER = Object.freeze({ plugin: "engine", origin: Object.freeze([]) });
//@ chunk-s61vbvea.js:620702-620722 placement
var isSchemaKey = (e) => fPi(e);
//@ chunk-s61vbvea.js:620722-620909 placement
function fittedValue(e, n) {
  let s = n !== void 0 && isSchemaKey(e) ? getSettingsFieldSchema(e)?.safeParse(n) : void 0;
  if (s === void 0) return { isFit: !0, value: n };
  return s.success ? { isFit: s.data !== void 0, value: s.data } : { isFit: !1, value: void 0 };
}
//@ chunk-s61vbvea.js:620909-620955 placement
var ownValue = (e, n) => (Object.hasOwn(e, n) ? e[n] : void 0);
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
  let e = getInitialSettings_2(),
    { answers: answers, computed: computed } = is().hookedMerge;
  return answers === null || computed === null ? e : computed;
}
//@ chunk-s61vbvea.js:621188-621234 placement
function settingsCopy(e) {
  let n = Nyn(e);
  return isPlainObject(n) ? n : {};
}
//@ chunk-s61vbvea.js:621234-621254 placement
var servedBy = new WeakMap();
//@ chunk-s61vbvea.js:621254-621381 placement
function deliveredServers() {
  let policy = is().policy,
    n = servedBy.get(policy),
    r = deliveredReaderSlot.get();
  if (n !== void 0 || r === null) return n ?? [];
  let h = r();
  return (servedBy.set(policy, h), h);
}
//@ chunk-s61vbvea.js:621381-621488 placement
function originMarked(e) {
  let n = getPolicySettingsOrigin() === "remote" && !isRemoteManagedSettingsVerified();
  return e !== null && (!isPolicySlotAdminOrParentComposed() || n) ? { ...e, personWritablePolicy: !0 } : e;
}
//@ chunk-s61vbvea.js:621488-621699 placement
function policyAsDelivered(e) {
  let n = originMarked(e);
  try {
    let r = deliveredServers();
    return r.length === 0
      ? n
      : {
          ...n,
          managedMcpServers: { ...Object.fromEntries(r.map((h) => [h, {}])), ...e?.managedMcpServers },
        };
  } catch {
    return { ...n, managedMcpServersUnreadable: !0 };
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
/**
 * 合并设置错误与插件、MCP 等来源的错误，供 /doctor 和 /status 展示。
 */
//@ chunk-s61vbvea.js:621838-622071 placement = getSettingsWithAllErrors (0.614)
function settingsLayers() {
  let e = new Set(getEnabledSettingSources()),
    result = projectSettingsAliasesUserSettings(),
    r = RIn();
  return [
    ...(r === void 0 ? [] : [{ source: "plugin", settings: r }]),
    ...SETTINGS_SOURCE_NAMES.filter(
      (h) => e.has(SETTING_SOURCE_OF[h]) && !(h === "project" && result),
    ).flatMap((scope) => {
      let y = settingsOfSource(scope);
      return y === null ? [] : [{ source: scope, settings: y }];
    }),
  ];
}
//@ chunk-s61vbvea.js:622071-622258 placement
function settingsReadInputOf(e) {
  if (jme()) return { ...e, layers: [] };
  let { source: source } = e;
  return {
    ...e,
    layers: (source === void 0
      ? settingsLayers()
      : [{ source: source, settings: settingsOfSource(source) }]
    ).map((s) => ({ source: s.source, settings: settingsCopy(s.settings) })),
  };
}
//@ chunk-s61vbvea.js:622258-622948 placement
async function engineMergeRead() {
  if (!hasModuleHookingSite("settings.read")) return;
  let { layers: layers = [] } = settingsReadInputOf({}),
    n = settingsComputed(),
    r = await judgeHookInput({
      event: "settings.read",
      args: { layers: layers },
      caller: ENGINE_CALLER,
      bottom: { run: () => Promise.resolve(settingsCopy(n)) },
    }).catch(
      (s) => (
        logForDebugging(
          `settings.read: refused to the engine (${errorMessage(s)}); the settings' own values stand`,
        ),
        n
      ),
    );
  return uniq([...Object.keys(r), ...Object.keys(n)]).flatMap((s) => {
    let h = ownValue(r, s),
      y = fittedValue(s, h),
      S = layers.findLast((P) => Object.hasOwn(P.settings, s))?.source,
      w = S !== void 0 && S !== "plugin",
      R = Rs(h) === Rs(ownValue(n, s)),
      x = R || !y.isFit;
    if (!R && !y.isFit)
      logForDebugging(
        `settings.read: the answer for ${s} is no value the key can hold; the settings' own value stands`,
        { level: "warn" },
      );
    return x ? [] : [{ key: s, value: y.value, source: w ? SETTING_SOURCE_OF[S] : void 0 }];
  });
}
//@ chunk-s61vbvea.js:622948-623070 placement
function settingsRead(e) {
  let { source: source, layers: layers } = e,
    s = source === void 0;
  return new Promise((h) => {
    h(settingsCopy(s ? settingsComputed() : (layers?.[0]?.settings ?? settingsOfSource(source))));
  });
}
//@ chunk-s61vbvea.js:623070-623126 placement
function settingsReadPlugins() {
  return pluginsMatchingEvent("settings.read", {}, ENGINE_CALLER.origin);
}
//@ chunk-s61vbvea.js:623126-623314 placement
function settingsSourceProblem(e) {
  return e === void 0 || (typeof e === "string" && Object.hasOwn(SETTING_SOURCE_OF, e))
    ? void 0
    : `takes { source } naming one of ${Object.keys(SETTING_SOURCE_OF).join(", ")} (got ${typeof e === "string" ? e : typeof e})`;
}

export {
  deliveredReaderSlot,
  deliveredNamesOf,
  Nyn,
  settingsSourceProblem,
  settingsReadInputOf,
  settingsRead,
};
