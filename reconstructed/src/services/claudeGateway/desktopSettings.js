/**
 * services/claudeGateway/desktopSettings.ts
 *
 * 2.1.316 新增：网关下发给 Claude Desktop 的设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (12)
 * attribution: placement 12
 */
import { Re } from "../../../runtime/bun-runtime.js";
import { wz, pg, Ez } from "../../../vendor/private-unresolved/index.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { uniq } from "../../utils/collections.js";
import { isPlainObject as isPlainObject_3 } from "../../utils/isPlainObject.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { similarNames } from "../../utils/settings/managedEnvKeys.js";
import { normalizeKey } from "../../utils/objectUtils.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { SS } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-1ny7cxrt.js:1378065-1378111 placement
/**
 * 懒加载的 desktop 设置校验模块（findingBlocksServing 等）。
 */
var desktopSettingsModule = Re(wz(), 1);
var bootstrapConfigModule = Re(pg(), 1);
var desktopSettingsChecksModule = Re(Ez(), 1);
//@ chunk-1ny7cxrt.js:1378111-1378227 placement
/**
 * 会让 Desktop 会话在设备外运行的可下发键。
 */
var OFF_DEVICE_DESKTOP_KEYS = DoctorLazy(() =>
  GATEWAY_SERVABLE_KEYS().filter((e) => {
    let executionTarget = desktopSettingsModule.getFieldMeta(e).support.executionTarget;
    return executionTarget !== undefined && executionTarget !== "desktop";
  }),
);
//@ chunk-1ny7cxrt.js:1378227-1378577 placement
/**
 * 网关不下发设备外执行设置的错误说明。
 */
function offDeviceKeyError(e) {
  return `${e}: this gateway does not serve settings that run Claude Desktop sessions off the device (such as a self-hosted session host), because they make Claude Desktop ignore the gateway as its inference provider and stop applying its on-device settings (disabledBuiltinTools and coworkEgressAllowedHosts among them); remove the key`;
}
//@ chunk-1ny7cxrt.js:1378577-1378702 placement
/**
 * 两个字符串数组去重合并（任一不是字符串数组时 undefined）。
 */
function unionStringLists(disabledBuiltinTools, disabledBuiltinTools_2) {
  let n = (o) => Array.isArray(o) && o.every((r) => typeof r === "string");
  if (!n(disabledBuiltinTools) || !n(disabledBuiltinTools_2)) return;
  return uniq([...disabledBuiltinTools, ...disabledBuiltinTools_2]);
}
//@ chunk-1ny7cxrt.js:1378702-1379128 placement
/**
 * 合并 Desktop 覆盖层的 disabledBuiltinTools 与 builtinToolPolicy（非 allow 的基础策略优先）。
 */
function mergeDesktopToolPolicy(desktop, desktop_2) {
  let n = {};
  let o = unionStringLists(desktop?.disabledBuiltinTools, desktop_2?.disabledBuiltinTools);
  if (o !== undefined) n.disabledBuiltinTools = o;
  let builtinToolPolicy = desktop?.builtinToolPolicy;
  let builtinToolPolicy_2 = desktop_2?.builtinToolPolicy;
  if (isPlainObject_3(builtinToolPolicy) && isPlainObject_3(builtinToolPolicy_2)) {
    let a = {};
    for (let [key, value] of Object.entries(builtinToolPolicy)) if (typeof value === "string") a[key] = value;
    for (let [key, value] of Object.entries(builtinToolPolicy_2))
      if (typeof value === "string") a[key] = value;
    for (let [key, value] of Object.entries(builtinToolPolicy))
      if (typeof value === "string" && value !== "allow") a[key] = value;
    n.builtinToolPolicy = a;
  }
  return n;
}
//@ chunk-1ny7cxrt.js:1379128-1379771 placement
/**
 * 检查由 sandbox.network.allowedDomains 派生的 coworkEgressAllowedHosts 并警告。
 */
function checkCoworkEgressHosts(e, t) {
  let sandbox = e.sandbox;
  if (!isPlainObject_3(sandbox)) return;
  let network = sandbox.network;
  if (!isPlainObject_3(network)) return;
  let allowedDomains = network.allowedDomains;
  if (!Array.isArray(allowedDomains)) return;
  if (allowedDomains.length === 0) {
    gatewayLog(
      "warn",
      `${t}: sandbox.network.allowedDomains is explicitly empty \u2014 the derived coworkEgressAllowedHosts is not served (desktops treat absent and empty identically; a desktop: overlay value, when set, still serves); remove the key, or list the domains to allow`,
    );
    return;
  }
  desktopSettingsModule.gatewayOverlayDropChecks().coworkEgressAllowedHosts?.(allowedDomains, (s) => {
    gatewayLog(
      "warn",
      `${t}: desktop intake of the derived coworkEgressAllowedHosts \u2014 ${s} (the CLI sandbox still honors the entry; only desktops drop it)`,
    );
  });
}
//@ chunk-1ny7cxrt.js:1379771-1379853 placement
/**
 * 用相似名匹配找出网关可下发的设置键（拼写近似时返回规范键）。
 */
function findGatewayServableKey(e) {
  let t = GATEWAY_SERVABLE_KEYS();
  let [n] = similarNames(normalizeKey(e), t.map(normalizeKey), 1);
  return t.find((o) => normalizeKey(o) === n);
}
//@ chunk-1ny7cxrt.js:1379853-1380199 placement
/**
 * 键是否只属于引导配置（不是设置字段）。
 */
function isBootstrapOnlyKey(e, t, origin, o) {
  if (desktopSettingsModule.tryGetFieldMeta(e) !== undefined || e in {}) return false;
  if (o.includes(e)) return false;
  if (/^(inference|otlp|selfhosted)/.test(normalizeKey(e))) return false;
  if (desktopSettingsModule.retiredFlatKeyEffect(e) !== undefined) return false;
  if (findGatewayServableKey(e) !== undefined) return false;
  let { config, sentKeys } = bootstrapConfigModule.parseBootstrapConfig(
    {
      [e]: t,
    },
    origin,
  );
  return Object.keys(config).length === 0 && sentKeys.length === 1 && sentKeys[0] === e;
}
//@ chunk-1ny7cxrt.js:1380199-1382933 placement
function parseDesktopSettingsOverlay(desktop, t, publicUrl, o, r) {
  if (!isPlainObject_3(desktop))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${t} invalid: expected a mapping of desktop keys`,
      "desktop overlay invalid: expected a mapping of desktop keys",
    );
  desktopSettingsModule.setDeprecationClock(0);
  let origin = publicUrl === undefined ? undefined : new URL(publicUrl).origin;
  let [a, l] = SS(Object.entries(desktop), ([y, b]) => isBootstrapOnlyKey(y, b, origin, r));
  for (let [y] of a)
    gatewayLog(
      "warn",
      `${t}: ${y}: unknown to the apps gateway's bundled Claude Desktop schema (it may be newer). Sent to Claude Desktop as written.`,
    );
  let c = new Set(OFF_DEVICE_DESKTOP_KEYS());
  let configRecord = desktopSettingsModule.parseConfigRecord(desktop, {
    allowedKeys: DESKTOP_SERVABLE_KEYS(),
  });
  let f = new Map(
    desktopSettingsModule
      .detectDeprecations(configRecord, {
        keys: DESKTOP_SERVABLE_KEYS(),
      })
      .filter((y) => y.supportEnds !== undefined)
      .map((y) => [
        desktopSettingsModule.describeDeprecation(y),
        `${desktopSettingsModule.describeDeprecation(y, Date.now())} Only Claude Desktop enforces that date. This version of the gateway does not refuse the key or stop sending it because of that date, so it stays in this policy until you remove it.`,
      ]),
  );
  let mapped = desktopSettingsChecksModule
    .validateForGatewayServing(Object.fromEntries(l.filter(([y]) => !c.has(y))), {
      trustedOrigin: origin,
      includeInternal: false,
    })
    .map((y) => {
      let b = y.msg.includes("unknown desktop key") ? findGatewayServableKey(y.key) : undefined;
      return {
        key: y.key,
        msg:
          y.kind === "explicit-empty" && hasMeaningfulValue(o, y.key)
            ? `${y.key}: explicitly empty \u2014 a role policy cannot unset a key the catch-all base sets; set an explicit value here, or remove the key to inherit the base value`
            : r.includes(y.key)
              ? `${y.key}: one of gateway.yaml's own keys, not a desktop setting \u2014 check the indentation`
              : b !== undefined && c.has(b)
                ? `${y.key}: unknown desktop key, and the nearest one, ${b}, runs Claude Desktop sessions off the device, which this gateway does not serve; remove the key`
                : normalizeKey(y.key).startsWith("selfhosted")
                  ? offDeviceKeyError(y.key)
                  : b !== undefined
                    ? `${y.key}: unknown desktop key \u2014 did you mean ${b}?`
                    : (f.get(y.msg) ?? y.msg),
        severity: desktopSettingsChecksModule.findingBlocksServing(y) ? "error" : "warn",
      };
    });
  for (let y of c)
    if (desktop[y] !== undefined)
      mapped.push({
        key: y,
        msg: offDeviceKeyError(y),
        severity: "error",
      });
  for (let y of mapped) if (y.severity === "warn") gatewayLog("warn", `${t}: ${y.msg}`);
  let filtered = mapped.filter((y) => y.severity === "error");
  if (filtered.length > 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${t} invalid:
${filtered.map((y) => `  ${y.msg}`).join(`
`)}`,
      "desktop overlay invalid: refused or unparseable keys",
    );
  if (desktop.orgPluginSettings !== undefined)
    gatewayLog(
      "warn",
      `${t}: orgPluginSettings is served in the array form, read by Claude Desktop 1.15200.0 and later; older desktops ignore it and enforce no plugin tool policy`,
    );
  if (configRecord.dictationEnabled === true)
    gatewayLog(
      "warn",
      `${t}: dictationEnabled is set, but this gateway has no dictation route, so the dictation control in Claude Desktop will fail; remove the key`,
    );
  if (configRecord.codeAllowedRepositories !== undefined)
    gatewayLog(
      "warn",
      `${t}: codeAllowedRepositories is served, but Claude Desktop does not apply it yet where sessions run on the device, as every session of this gateway does; it does not limit which repositories Claude Code works in`,
    );
  return {
    ...Object.fromEntries(a),
    ...configRecord,
  };
}
//@ chunk-1ny7cxrt.js:1382933-1383021 placement
/**
 * 判断对象上某键是否有非空值（非 undefined、null、空串）。
 */
function hasMeaningfulValue(e, key) {
  if (e === undefined) return false;
  let n = e[key];
  return n !== undefined && n !== null && n !== "";
}
//@ chunk-1ny7cxrt.js:1383021-1383147 placement
/**
 * 网关可下发的设置键与其中 Desktop 可用的键。
 */
var GATEWAY_SERVABLE_KEYS = DoctorLazy(() =>
  desktopSettingsModule.gatewayServableKeys({
    includeInternal: false,
  }),
);
var DESKTOP_SERVABLE_KEYS = DoctorLazy(() => {
  let e = new Set(OFF_DEVICE_DESKTOP_KEYS());
  return GATEWAY_SERVABLE_KEYS().filter((t) => !e.has(t));
});
//@ chunk-1ny7cxrt.js:1385972-1386128 placement
/**
 * 按路径读取字符串数组。
 */
function readStringListAt(e, t) {
  let n = e;
  for (let o of t) {
    if (n === null || typeof n !== "object") return;
    n = n[o];
  }
  return Array.isArray(n) && n.every((o) => typeof o === "string") ? n : undefined;
}
export {
  unionStringLists,
  readStringListAt,
  parseDesktopSettingsOverlay,
  checkCoworkEgressHosts,
  mergeDesktopToolPolicy,
};
