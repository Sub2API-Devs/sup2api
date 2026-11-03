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
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { similarNames } from "../../utils/settings/managedEnvKeys.js";
import { BQ } from "../../utils/objectUtils.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { SS } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-1ny7cxrt.js:1378065-1378111 placement
var Gn = Re(wz(), 1),
  Iz = Re(pg(), 1),
  qg = Re(Ez(), 1);
/**
 * 会让 Desktop 会话在设备外运行的可下发键。
 */
//@ chunk-1ny7cxrt.js:1378111-1378227 placement
var OFF_DEVICE_DESKTOP_KEYS = DoctorLazy(() =>
  GATEWAY_SERVABLE_KEYS().filter((e) => {
    let executionTarget = Gn.getFieldMeta(e).support.executionTarget;
    return executionTarget !== void 0 && executionTarget !== "desktop";
  }),
);
/**
 * 网关不下发设备外执行设置的错误说明。
 */
//@ chunk-1ny7cxrt.js:1378227-1378577 placement
function offDeviceKeyError(e) {
  return `${e}: this gateway does not serve settings that run Claude Desktop sessions off the device (such as a self-hosted session host), because they make Claude Desktop ignore the gateway as its inference provider and stop applying its on-device settings (disabledBuiltinTools and coworkEgressAllowedHosts among them); remove the key`;
}
/**
 * 两个字符串数组去重合并（任一不是字符串数组时 undefined）。
 */
//@ chunk-1ny7cxrt.js:1378577-1378702 placement
function unionStringLists(e, t) {
  let n = (o) => Array.isArray(o) && o.every((r) => typeof r === "string");
  if (!n(e) || !n(t)) return;
  return uniq([...e, ...t]);
}
/**
 * 合并 Desktop 覆盖层的 disabledBuiltinTools 与 builtinToolPolicy（非 allow 的基础策略优先）。
 */
//@ chunk-1ny7cxrt.js:1378702-1379128 placement
function mergeDesktopToolPolicy(e, t) {
  let n = {},
    o = unionStringLists(e?.disabledBuiltinTools, t?.disabledBuiltinTools);
  if (o !== void 0) n.disabledBuiltinTools = o;
  let r = e?.builtinToolPolicy,
    s = t?.builtinToolPolicy;
  if (isPlainObject_2(r) && isPlainObject_2(s)) {
    let a = {};
    for (let [l, c] of Object.entries(r)) if (typeof c === "string") a[l] = c;
    for (let [l, c] of Object.entries(s)) if (typeof c === "string") a[l] = c;
    for (let [l, c] of Object.entries(r)) if (typeof c === "string" && c !== "allow") a[l] = c;
    n.builtinToolPolicy = a;
  }
  return n;
}
/**
 * 检查由 sandbox.network.allowedDomains 派生的 coworkEgressAllowedHosts 并警告。
 */
//@ chunk-1ny7cxrt.js:1379128-1379771 placement
function checkCoworkEgressHosts(e, t) {
  let sandbox = e.sandbox;
  if (!isPlainObject_2(sandbox)) return;
  let network = sandbox.network;
  if (!isPlainObject_2(network)) return;
  let allowedDomains = network.allowedDomains;
  if (!Array.isArray(allowedDomains)) return;
  if (allowedDomains.length === 0) {
    gatewayLog(
      "warn",
      `${t}: sandbox.network.allowedDomains is explicitly empty \u2014 the derived coworkEgressAllowedHosts is not served (desktops treat absent and empty identically; a desktop: overlay value, when set, still serves); remove the key, or list the domains to allow`,
    );
    return;
  }
  Gn.gatewayOverlayDropChecks().coworkEgressAllowedHosts?.(allowedDomains, (s) => {
    gatewayLog(
      "warn",
      `${t}: desktop intake of the derived coworkEgressAllowedHosts \u2014 ${s} (the CLI sandbox still honors the entry; only desktops drop it)`,
    );
  });
}
//@ chunk-1ny7cxrt.js:1379771-1379853 placement
function Rz(e) {
  let t = GATEWAY_SERVABLE_KEYS(),
    [n] = similarNames(BQ(e), t.map(BQ), 1);
  return t.find((o) => BQ(o) === n);
}
/**
 * 键是否只属于引导配置（不是设置字段）。
 */
//@ chunk-1ny7cxrt.js:1379853-1380199 placement
function isBootstrapOnlyKey(e, t, n, o) {
  if (Gn.tryGetFieldMeta(e) !== void 0 || e in {}) return !1;
  if (o.includes(e)) return !1;
  if (/^(inference|otlp|selfhosted)/.test(BQ(e))) return !1;
  if (Gn.retiredFlatKeyEffect(e) !== void 0) return !1;
  if (Rz(e) !== void 0) return !1;
  let { config: config, sentKeys: sentKeys } = Iz.parseBootstrapConfig({ [e]: t }, n);
  return Object.keys(config).length === 0 && sentKeys.length === 1 && sentKeys[0] === e;
}
//@ chunk-1ny7cxrt.js:1380199-1382933 placement
function parseDesktopSettingsOverlay(e, t, n, o, r) {
  if (!isPlainObject_2(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${t} invalid: expected a mapping of desktop keys`,
      "desktop overlay invalid: expected a mapping of desktop keys",
    );
  Gn.setDeprecationClock(0);
  let s = n === void 0 ? void 0 : new URL(n).origin,
    [a, l] = SS(Object.entries(e), ([y, b]) => isBootstrapOnlyKey(y, b, s, r));
  for (let [y] of a)
    gatewayLog(
      "warn",
      `${t}: ${y}: unknown to the apps gateway's bundled Claude Desktop schema (it may be newer). Sent to Claude Desktop as written.`,
    );
  let c = new Set(OFF_DEVICE_DESKTOP_KEYS()),
    configRecord = Gn.parseConfigRecord(e, { allowedKeys: DESKTOP_SERVABLE_KEYS() }),
    f = new Map(
      Gn.detectDeprecations(configRecord, { keys: DESKTOP_SERVABLE_KEYS() })
        .filter((y) => y.supportEnds !== void 0)
        .map((y) => [
          Gn.describeDeprecation(y),
          `${Gn.describeDeprecation(y, Date.now())} Only Claude Desktop enforces that date. This version of the gateway does not refuse the key or stop sending it because of that date, so it stays in this policy until you remove it.`,
        ]),
    ),
    mapped = qg
      .validateForGatewayServing(Object.fromEntries(l.filter(([y]) => !c.has(y))), {
        trustedOrigin: s,
        includeInternal: !1,
      })
      .map((y) => {
        let b = y.msg.includes("unknown desktop key") ? Rz(y.key) : void 0;
        return {
          key: y.key,
          msg:
            y.kind === "explicit-empty" && B_e(o, y.key)
              ? `${y.key}: explicitly empty \u2014 a role policy cannot unset a key the catch-all base sets; set an explicit value here, or remove the key to inherit the base value`
              : r.includes(y.key)
                ? `${y.key}: one of gateway.yaml's own keys, not a desktop setting \u2014 check the indentation`
                : b !== void 0 && c.has(b)
                  ? `${y.key}: unknown desktop key, and the nearest one, ${b}, runs Claude Desktop sessions off the device, which this gateway does not serve; remove the key`
                  : BQ(y.key).startsWith("selfhosted")
                    ? offDeviceKeyError(y.key)
                    : b !== void 0
                      ? `${y.key}: unknown desktop key \u2014 did you mean ${b}?`
                      : (f.get(y.msg) ?? y.msg),
          severity: qg.findingBlocksServing(y) ? "error" : "warn",
        };
      });
  for (let y of c) if (e[y] !== void 0) mapped.push({ key: y, msg: offDeviceKeyError(y), severity: "error" });
  for (let y of mapped) if (y.severity === "warn") gatewayLog("warn", `${t}: ${y.msg}`);
  let filtered = mapped.filter((y) => y.severity === "error");
  if (filtered.length > 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${t} invalid:
${filtered.map((y) => `  ${y.msg}`).join(`
`)}`,
      "desktop overlay invalid: refused or unparseable keys",
    );
  if (e.orgPluginSettings !== void 0)
    gatewayLog(
      "warn",
      `${t}: orgPluginSettings is served in the array form, read by Claude Desktop 1.15200.0 and later; older desktops ignore it and enforce no plugin tool policy`,
    );
  if (configRecord.dictationEnabled === !0)
    gatewayLog(
      "warn",
      `${t}: dictationEnabled is set, but this gateway has no dictation route, so the dictation control in Claude Desktop will fail; remove the key`,
    );
  if (configRecord.codeAllowedRepositories !== void 0)
    gatewayLog(
      "warn",
      `${t}: codeAllowedRepositories is served, but Claude Desktop does not apply it yet where sessions run on the device, as every session of this gateway does; it does not limit which repositories Claude Code works in`,
    );
  return { ...Object.fromEntries(a), ...configRecord };
}
//@ chunk-1ny7cxrt.js:1382933-1383021 placement
function B_e(e, t) {
  if (e === void 0) return !1;
  let n = e[t];
  return n !== void 0 && n !== null && n !== "";
}
/**
 * 网关可下发的设置键与其中 Desktop 可用的键。
 */
//@ chunk-1ny7cxrt.js:1383021-1383147 placement
var GATEWAY_SERVABLE_KEYS = DoctorLazy(() => Gn.gatewayServableKeys({ includeInternal: !1 })),
  DESKTOP_SERVABLE_KEYS = DoctorLazy(() => {
    let e = new Set(OFF_DEVICE_DESKTOP_KEYS());
    return GATEWAY_SERVABLE_KEYS().filter((t) => !e.has(t));
  });
/**
 * 按路径读取字符串数组。
 */
//@ chunk-1ny7cxrt.js:1385972-1386128 placement
function readStringListAt(e, t) {
  let n = e;
  for (let o of t) {
    if (n === null || typeof n !== "object") return;
    n = n[o];
  }
  return Array.isArray(n) && n.every((o) => typeof o === "string") ? n : void 0;
}

export {
  unionStringLists,
  readStringListAt,
  parseDesktopSettingsOverlay,
  checkCoworkEgressHosts,
  mergeDesktopToolPolicy,
};
