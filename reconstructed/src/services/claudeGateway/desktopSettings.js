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
import { __toESM } from "../../../runtime/bun-runtime.js";
import {
  configSchemaBarrel,
  bootstrapIntakeModule,
  gatewayValidationModule,
} from "../../../vendor/private-unresolved/index.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { uniq } from "../../utils/collections.js";
import { isPlainObject as isPlainObject_3 } from "../../utils/isPlainObject.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { similarNames } from "../../utils/settings/managedEnvKeys.js";
import { normalizeKey } from "../../utils/objectUtils.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { partitionAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1ny7cxrt.js:1378065-1378111 placement
/**
 * 懒加载的 desktop 设置校验模块（findingBlocksServing 等）。
 */
var desktopSettingsModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var bootstrapConfigModule;
var desktopSettingsChecksModule;
deferInit("chunk-1ny7cxrt.js:1378065", () => {
  desktopSettingsModule = __toESM(configSchemaBarrel(), 1);
  bootstrapConfigModule = __toESM(bootstrapIntakeModule(), 1);
  desktopSettingsChecksModule = __toESM(gatewayValidationModule(), 1);
});
//@ chunk-1ny7cxrt.js:1378111-1378227 placement
/**
 * 会让 Desktop 会话在设备外运行的可下发键。
 */
var OFF_DEVICE_DESKTOP_KEYS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1ny7cxrt.js:1378111", () => {
  OFF_DEVICE_DESKTOP_KEYS = DoctorLazy(() =>
    GATEWAY_SERVABLE_KEYS().filter((key) => {
      let executionTarget = desktopSettingsModule.getFieldMeta(key).support.executionTarget;
      return executionTarget !== undefined && executionTarget !== "desktop";
    }),
  );
});
//@ chunk-1ny7cxrt.js:1378227-1378577 placement
/**
 * 网关不下发设备外执行设置的错误说明。
 */
function offDeviceKeyError(key) {
  return `${key}: this gateway does not serve settings that run Claude Desktop sessions off the device (such as a self-hosted session host), because they make Claude Desktop ignore the gateway as its inference provider and stop applying its on-device settings (disabledBuiltinTools and coworkEgressAllowedHosts among them); remove the key`;
}
//@ chunk-1ny7cxrt.js:1378577-1378702 placement
/**
 * 两个字符串数组去重合并（任一不是字符串数组时 undefined）。
 */
function unionStringLists(disabledBuiltinTools, disabledBuiltinTools_2) {
  let isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
  if (!isStringArray(disabledBuiltinTools) || !isStringArray(disabledBuiltinTools_2)) return;
  return uniq([...disabledBuiltinTools, ...disabledBuiltinTools_2]);
}
//@ chunk-1ny7cxrt.js:1378702-1379128 placement
/**
 * 合并 Desktop 覆盖层的 disabledBuiltinTools 与 builtinToolPolicy（非 allow 的基础策略优先）。
 */
function mergeDesktopToolPolicy(desktop, desktop_2) {
  let merged = {};
  let disabledTools = unionStringLists(desktop?.disabledBuiltinTools, desktop_2?.disabledBuiltinTools);
  if (disabledTools !== undefined) merged.disabledBuiltinTools = disabledTools;
  let builtinToolPolicy = desktop?.builtinToolPolicy;
  let builtinToolPolicy_2 = desktop_2?.builtinToolPolicy;
  if (isPlainObject_3(builtinToolPolicy) && isPlainObject_3(builtinToolPolicy_2)) {
    let mergedPolicy = {};
    for (let [key, value] of Object.entries(builtinToolPolicy))
      if (typeof value === "string") mergedPolicy[key] = value;
    for (let [key, value] of Object.entries(builtinToolPolicy_2))
      if (typeof value === "string") mergedPolicy[key] = value;
    for (let [key, value] of Object.entries(builtinToolPolicy))
      if (typeof value === "string" && value !== "allow") mergedPolicy[key] = value;
    merged.builtinToolPolicy = mergedPolicy;
  }
  return merged;
}
//@ chunk-1ny7cxrt.js:1379128-1379771 placement
/**
 * 检查由 sandbox.network.allowedDomains 派生的 coworkEgressAllowedHosts 并警告。
 */
function checkCoworkEgressHosts(settings, key) {
  let sandbox = settings.sandbox;
  if (!isPlainObject_3(sandbox)) return;
  let network = sandbox.network;
  if (!isPlainObject_3(network)) return;
  let allowedDomains = network.allowedDomains;
  if (!Array.isArray(allowedDomains)) return;
  if (allowedDomains.length === 0) {
    gatewayLog(
      "warn",
      `${key}: sandbox.network.allowedDomains is explicitly empty \u2014 the derived coworkEgressAllowedHosts is not served (desktops treat absent and empty identically; a desktop: overlay value, when set, still serves); remove the key, or list the domains to allow`,
    );
    return;
  }
  desktopSettingsModule.gatewayOverlayDropChecks().coworkEgressAllowedHosts?.(allowedDomains, (reason) => {
    gatewayLog(
      "warn",
      `${key}: desktop intake of the derived coworkEgressAllowedHosts \u2014 ${reason} (the CLI sandbox still honors the entry; only desktops drop it)`,
    );
  });
}
//@ chunk-1ny7cxrt.js:1379771-1379853 placement
/**
 * 用相似名匹配找出网关可下发的设置键（拼写近似时返回规范键）。
 */
function findGatewayServableKey(key) {
  let servableKeys = GATEWAY_SERVABLE_KEYS();
  let [closest] = similarNames(normalizeKey(key), servableKeys.map(normalizeKey), 1);
  return servableKeys.find((candidateKey) => normalizeKey(candidateKey) === closest);
}
//@ chunk-1ny7cxrt.js:1379853-1380199 placement
/**
 * 键是否只属于引导配置（不是设置字段）。
 */
function isBootstrapOnlyKey(key, value, origin, excludedKeys) {
  if (desktopSettingsModule.tryGetFieldMeta(key) !== undefined || key in {}) return false;
  if (excludedKeys.includes(key)) return false;
  if (/^(inference|otlp|selfhosted)/.test(normalizeKey(key))) return false;
  if (desktopSettingsModule.retiredFlatKeyEffect(key) !== undefined) return false;
  if (findGatewayServableKey(key) !== undefined) return false;
  let { config, sentKeys } = bootstrapConfigModule.parseBootstrapConfig(
    {
      [key]: value,
    },
    origin,
  );
  return Object.keys(config).length === 0 && sentKeys.length === 1 && sentKeys[0] === key;
}
//@ chunk-1ny7cxrt.js:1380199-1382933 placement
function parseDesktopSettingsOverlay(desktop, label, publicUrl, baseOverlay, gatewayKeys) {
  if (!isPlainObject_3(desktop))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label} invalid: expected a mapping of desktop keys`,
      "desktop overlay invalid: expected a mapping of desktop keys",
    );
  desktopSettingsModule.setDeprecationClock(0);
  let origin = publicUrl === undefined ? undefined : new URL(publicUrl).origin;
  let [unknownEntries, servableEntries] = partitionAlias(Object.entries(desktop), ([key, value]) =>
    isBootstrapOnlyKey(key, value, origin, gatewayKeys),
  );
  for (let [key] of unknownEntries)
    gatewayLog(
      "warn",
      `${label}: ${key}: unknown to the apps gateway's bundled Claude Desktop schema (it may be newer). Sent to Claude Desktop as written.`,
    );
  let offDeviceKeys = new Set(OFF_DEVICE_DESKTOP_KEYS());
  let configRecord = desktopSettingsModule.parseConfigRecord(desktop, {
    allowedKeys: DESKTOP_SERVABLE_KEYS(),
  });
  let deprecationNotes = new Map(
    desktopSettingsModule
      .detectDeprecations(configRecord, {
        keys: DESKTOP_SERVABLE_KEYS(),
      })
      .filter((deprecation) => deprecation.supportEnds !== undefined)
      .map((deprecation) => [
        desktopSettingsModule.describeDeprecation(deprecation),
        `${desktopSettingsModule.describeDeprecation(deprecation, Date.now())} Only Claude Desktop enforces that date. This version of the gateway does not refuse the key or stop sending it because of that date, so it stays in this policy until you remove it.`,
      ]),
  );
  let mapped = desktopSettingsChecksModule
    .validateForGatewayServing(
      Object.fromEntries(servableEntries.filter(([key]) => !offDeviceKeys.has(key))),
      {
        trustedOrigin: origin,
        includeInternal: false,
      },
    )
    .map((finding) => {
      let suggestion = finding.msg.includes("unknown desktop key")
        ? findGatewayServableKey(finding.key)
        : undefined;
      return {
        key: finding.key,
        msg:
          finding.kind === "explicit-empty" && hasMeaningfulValue(baseOverlay, finding.key)
            ? `${finding.key}: explicitly empty \u2014 a role policy cannot unset a key the catch-all base sets; set an explicit value here, or remove the key to inherit the base value`
            : gatewayKeys.includes(finding.key)
              ? `${finding.key}: one of gateway.yaml's own keys, not a desktop setting \u2014 check the indentation`
              : suggestion !== undefined && offDeviceKeys.has(suggestion)
                ? `${finding.key}: unknown desktop key, and the nearest one, ${suggestion}, runs Claude Desktop sessions off the device, which this gateway does not serve; remove the key`
                : normalizeKey(finding.key).startsWith("selfhosted")
                  ? offDeviceKeyError(finding.key)
                  : suggestion !== undefined
                    ? `${finding.key}: unknown desktop key \u2014 did you mean ${suggestion}?`
                    : (deprecationNotes.get(finding.msg) ?? finding.msg),
        severity: desktopSettingsChecksModule.findingBlocksServing(finding) ? "error" : "warn",
      };
    });
  for (let key of offDeviceKeys)
    if (desktop[key] !== undefined)
      mapped.push({
        key,
        msg: offDeviceKeyError(key),
        severity: "error",
      });
  for (let entry of mapped) if (entry.severity === "warn") gatewayLog("warn", `${label}: ${entry.msg}`);
  let filtered = mapped.filter((entry) => entry.severity === "error");
  if (filtered.length > 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label} invalid:
${filtered.map((entry) => `  ${entry.msg}`).join(`
`)}`,
      "desktop overlay invalid: refused or unparseable keys",
    );
  if (desktop.orgPluginSettings !== undefined)
    gatewayLog(
      "warn",
      `${label}: orgPluginSettings is served in the array form, read by Claude Desktop 1.15200.0 and later; older desktops ignore it and enforce no plugin tool policy`,
    );
  if (configRecord.dictationEnabled === true)
    gatewayLog(
      "warn",
      `${label}: dictationEnabled is set, but this gateway has no dictation route, so the dictation control in Claude Desktop will fail; remove the key`,
    );
  if (configRecord.codeAllowedRepositories !== undefined)
    gatewayLog(
      "warn",
      `${label}: codeAllowedRepositories is served, but Claude Desktop does not apply it yet where sessions run on the device, as every session of this gateway does; it does not limit which repositories Claude Code works in`,
    );
  return {
    ...Object.fromEntries(unknownEntries),
    ...configRecord,
  };
}
//@ chunk-1ny7cxrt.js:1382933-1383021 placement
/**
 * 判断对象上某键是否有非空值（非 undefined、null、空串）。
 */
function hasMeaningfulValue(source, key) {
  if (source === undefined) return false;
  let value = source[key];
  return value !== undefined && value !== null && value !== "";
}
//@ chunk-1ny7cxrt.js:1383021-1383147 placement
/**
 * 网关可下发的设置键与其中 Desktop 可用的键。
 */
var GATEWAY_SERVABLE_KEYS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DESKTOP_SERVABLE_KEYS;
deferInit("chunk-1ny7cxrt.js:1383021", () => {
  GATEWAY_SERVABLE_KEYS = DoctorLazy(() =>
    desktopSettingsModule.gatewayServableKeys({
      includeInternal: false,
    }),
  );
  DESKTOP_SERVABLE_KEYS = DoctorLazy(() => {
    let offDeviceSet = new Set(OFF_DEVICE_DESKTOP_KEYS());
    return GATEWAY_SERVABLE_KEYS().filter((key) => !offDeviceSet.has(key));
  });
});
//@ chunk-1ny7cxrt.js:1385972-1386128 placement
/**
 * 按路径读取字符串数组。
 */
function readStringListAt(source, pathSegments) {
  let current = source;
  for (let segment of pathSegments) {
    if (current === null || typeof current !== "object") return;
    current = current[segment];
  }
  return Array.isArray(current) && current.every((item) => typeof item === "string") ? current : undefined;
}
export {
  unionStringLists,
  readStringListAt,
  parseDesktopSettingsOverlay,
  checkCoworkEgressHosts,
  mergeDesktopToolPolicy,
};
