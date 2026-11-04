/**
 * components/ManagedSettingsSecurityDialog/utils.ts
 *
 * 托管设置危险项提取与比较：hooks、apiKeyHelper、危险环境变量（含增强遥测）等，判断自上次批准后是否变化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ManagedSettingsSecurityDialog/utils.ts
 * pieces: chunk-dcmhvw5a.js (54)
 * attribution: placement 47, fingerprint 3, layout 3, affinity 1
 */
import {
  cleanOptionalText_2,
  stripInvisibleKeepNewlines,
  stripInvisibleKeepEmoji,
  cleanOptionalText,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { redactUrlCredentials } from "../../utils/plugins/marketplaceManager.js";
import { displaySafeUrl, REDACTED_URL } from "../../utils/redaction/urlRedaction.js";
import { SUPPORTED_PLATFORMS } from "../../utils/settings/types.js";
import {
  DANGEROUS_SHELL_SETTINGS_LIST,
  SANDBOX_BINARY_SETTINGS,
  SANDBOX_SETTINGS_KEYS,
  SANDBOX_NETWORK_MODE_VALUES,
  isProtectedEnvVar,
} from "../../utils/managedEnvConstants.js";
import { extraMarketplacesOf, describeEnvRows } from "../../utils/settings/otelEndpointValidation.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { uniq } from "../../utils/collections.js";
import { editSizeOf } from "../FileEditToolUpdatedMessage.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { nfcLower } from "../../utils/stringUtils.js";
import { sortKeysDeep } from "../../utils/settings/settingsSourceTrust.js";
import { safeParseJSON } from "../../utils/json.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:376544-376884 placement
/**
 * 清洗插件清单里要展示的字段（显示名、版本、描述、作者），去掉不可打印字符并截断。
 */
function sanitizePluginManifestForDisplay(manifest) {
  return {
    ...manifest,
    displayName: cleanOptionalText_2(manifest.displayName),
    version: cleanOptionalText_2(manifest.version),
    description: cleanOptionalText_2(manifest.description, stripInvisibleKeepNewlines),
    author:
      manifest.author === undefined
        ? undefined
        : {
            ...manifest.author,
            name: stripInvisibleKeepEmoji(manifest.author.name),
            email: cleanOptionalText_2(manifest.author.email),
            url: redactUrlCredentials(manifest.author.url),
          },
    homepage: redactUrlCredentials(manifest.homepage),
    repository: redactUrlCredentials(manifest.repository),
    license: cleanOptionalText_2(manifest.license),
    keywords: manifest.keywords?.map(stripInvisibleKeepEmoji),
  };
}
//@ chunk-dcmhvw5a.js:376884-376912 placement
/**
 * 把插件名转成可打印形式。
 */
function printablePluginName(text) {
  return cleanOptionalText(text);
}
//@ chunk-dcmhvw5a.js:376912-377097 placement
/**
 * 取插件可显示名称：清单 displayName → 名称 → 来源，都不可打印时返回占位文字。
 */
function getPluginDisplayName(plugin) {
  let displayName = hasManifest(plugin) ? plugin.manifest.displayName : plugin.displayName;
  return (
    trimmedOrUndefined(
      typeof displayName === "string" ? stripInvisibleKeepEmoji(displayName).trim() : displayName,
    ) ??
    trimmedOrUndefined(printablePluginName(plugin.name)) ??
    trimmedOrUndefined(printablePluginName(hasManifest(plugin) ? plugin.source : "")) ??
    "(unprintable plugin name)"
  );
}
//@ chunk-dcmhvw5a.js:377097-377168 placement
/**
 * 函数 trimmedOrUndefined（trim 后为空返回 undefined）；位于「托管设置危险项提取与比较：hooks、apiKeyHelper、危险环境变量（含增强遥测）等，判断自上次批准后是否变化」模块。
 */
function trimmedOrUndefined(displayName) {
  if (typeof displayName !== "string") return;
  return displayName.trim() ? displayName : undefined;
}
//@ chunk-dcmhvw5a.js:377168-377253 placement
function hasManifest(plugin) {
  return "manifest" in plugin && typeof plugin.manifest === "object" && plugin.manifest !== null;
}
//@ chunk-dcmhvw5a.js:377253-377396 placement
var HIDDEN_CHARS_WARNING =
  "The command contains non-ASCII, hidden or control characters (shown as \\u{\u2026} escapes). Do not proceed unless you expected them.";
//@ chunk-dcmhvw5a.js:377396-377534 placement
/**
 * 描述插件归档下载的 headersHelper 命令（目的地、隐藏字符警告、转义后的命令）。
 */
function describeArchiveFetchCommand(entry) {
  let { text, escaped } = escapeNonPrintable(entry.command);
  return {
    destination: displaySafeUrl(entry.archiveUrl) ?? REDACTED_URL,
    hiddenCharactersWarning: escaped ? HIDDEN_CHARS_WARNING : null,
    command: text,
  };
}
//@ chunk-dcmhvw5a.js:377534-377702 placement
/**
 * 把不可打印字符（及反斜杠）转义为 \u{…} 形式，返回转义后文本及是否发生转义。
 */
function escapeNonPrintable(rawText) {
  let escaped = false;
  return {
    text: rawText.replace(/[^\x20-\x5b\x5d-\x7e]/gu, (char) => {
      if (char === "\\") return "\\\\";
      escaped = true;
      return `\\u{${char.codePointAt(0).toString(16)}}`;
    }),
    escaped,
  };
}
//@ chunk-dcmhvw5a.js:377702-377810 placement
var SANDBOX_TOGGLE_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NETWORK_ALLOWEDDOMAINS;
var IGNORED_ENV_VARS;
deferInit("chunk-dcmhvw5a.js:377702", () => {
  SANDBOX_TOGGLE_KEYS = ["enabled", "enabledPlatforms"];
  NETWORK_ALLOWEDDOMAINS = "network.allowedDomains";
  IGNORED_ENV_VARS = new Set(["OTEL_LOG_MANAGED_SETTINGS"]);
});
//@ chunk-dcmhvw5a.js:377810-378429 placement
/**
 * 汇总托管设置文档里需要用户确认的危险项（shell 设置、环境变量、沙箱、隔离、hooks、policyHelpers 槽位）。
 */
function summarizeManagedSettingsRisk(settings) {
  if (!settings)
    return {
      shellSettings: {},
      envVars: {},
      sandboxSettings: {},
      isolationSettings: {},
      hasHooks: false,
      payloadSlots: {},
    };
  let slots = [
    ["top", settings],
    ...policyHelperSlots(settings),
    ...policyHelperSlots(settings).map(([name]) => [
      name,
      {
        slotPresent: true,
      },
    ]),
    ...SUPPORTED_PLATFORMS.map((platform) => [
      `policyHelpers.${platform}`,
      {
        outputBehavior: getAtPath_2(settings, `policyHelpers.${platform}.outputBehavior`),
      },
    ]),
  ];
  let dangerousSettings = collectDangerousSettings(settings, slots);
  let slotValues = mapSettingsValues(settings, slots);
  markSandboxSettingConflicts([dangerousSettings, ...slotValues.map(([, value]) => value)]);
  let payloadSlots = {};
  for (let [slotName, slotValue] of slotValues) {
    let risky = {
      shellSettings: slotValue.hasHooks
        ? {
            ...slotValue.shellSettings,
            hooks: toCanonicalPath(slotValue.hooks),
          }
        : slotValue.shellSettings,
      envVars: slotValue.envVars,
      sandboxSettings: slotValue.sandboxSettings,
      isolationSettings: slotValue.isolationSettings,
    };
    if (hasRiskySettings(risky)) payloadSlots[slotName] = risky;
  }
  let { sandboxSwitches, ...rest } = dangerousSettings;
  return {
    ...rest,
    payloadSlots,
  };
}
//@ chunk-dcmhvw5a.js:378429-380873 placement
/**
 * 遍历托管设置的危险键（含 policyHelpers.* 子项），收集命令文本与脚本大小。
 */
function collectDangerousSettings(settings, slots) {
  let shellSettings = {};
  let scriptSizes;
  for (let key of DANGEROUS_SHELL_SETTINGS_LIST) {
    let value = settings[key];
    if (key === "policyHelpers") {
      if (value !== null && typeof value === "object")
        for (let platform of SUPPORTED_PLATFORMS) {
          let helper = policyHelperCommand(value[platform]);
          if (helper) {
            shellSettings[`policyHelpers.${platform}`] = helper.command;
            if (helper.scriptSize) {
              scriptSizes ??= {};
              scriptSizes[`policyHelpers.${platform}`] = helper.scriptSize;
            }
          }
        }
      continue;
    }
    let command;
    if (typeof value === "string") command = value;
    else if (
      value !== null &&
      typeof value === "object" &&
      "command" in value &&
      typeof value.command === "string"
    )
      command = value.command;
    if (command !== undefined && command.length > 0) shellSettings[key] = command;
  }
  let marketplaces = extraMarketplacesOf(settings);
  if (marketplaces && typeof marketplaces === "object")
    for (let [key, value] of Object.entries(marketplaces)) {
      let pluginDigests = value?.pluginDigests;
      if (pluginDigests !== undefined && pluginDigests !== null && Object.keys(pluginDigests).length > 0)
        shellSettings[`extraKnownMarketplaces[${jsonStringify(key)}].pluginDigests`] = toCanonicalPath({
          pluginDigests,
          arming: pluginSlotDangerEntries(slots, key, pluginDigests),
        });
      let source = value?.source;
      if (!source || typeof source !== "object") continue;
      if (
        source.source === "url" &&
        typeof source.headersHelper === "string" &&
        source.headersHelper.length > 0
      )
        shellSettings[`extraKnownMarketplaces[${jsonStringify(key)}].source.headersHelper`] = joinPathParts(
          source.headersHelper,
          "url",
          source.url,
        );
      if (source.source === "settings" && Array.isArray(source.plugins)) {
        let nameCounts = new Map();
        for (let plugin of source.plugins) {
          let pluginName = jsonStringify(plugin?.name);
          let nameIndex = nameCounts.get(pluginName) ?? 0;
          nameCounts.set(pluginName, nameIndex + 1);
          let source = plugin?.source;
          if (
            source !== null &&
            typeof source === "object" &&
            "source" in source &&
            source.source === "command" &&
            "command" in source &&
            typeof source.command === "string" &&
            source.command.length > 0
          )
            shellSettings[
              `extraKnownMarketplaces[${jsonStringify(key)}].plugins[${jsonStringify(plugin.name)}][${nameIndex}].source.command`
            ] = source.command;
          if (typeof plugin?.headersHelper === "string" && plugin.headersHelper.length > 0) {
            let source = plugin.source;
            let hasSource = source !== null && typeof source === "object";
            shellSettings[
              `extraKnownMarketplaces[${jsonStringify(key)}].plugins[${jsonStringify(plugin.name)}][${nameIndex}].headersHelper`
            ] = joinPathParts(
              plugin.headersHelper,
              hasSource && "source" in source ? source.source : undefined,
              hasSource && "url" in source ? source.url : undefined,
            );
          }
        }
      }
    }
  let sandbox = settings.sandbox;
  let sandboxSettings = {};
  let switches = {
    enabled: getAtPath_2(sandbox, "enabled"),
    enabledPlatforms: getAtPath_2(sandbox, "enabledPlatforms"),
    [NETWORK_ALLOWEDDOMAINS]: getAtPath_2(sandbox, NETWORK_ALLOWEDDOMAINS),
  };
  if (sandbox !== null && typeof sandbox === "object") {
    let switchDefaults = {
      enabled: switches.enabled,
      enabledPlatforms: switches.enabledPlatforms,
    };
    for (let key of SANDBOX_BINARY_SETTINGS) {
      let commandText = hookCommandText(sandbox[key]);
      if (commandText)
        shellSettings[`sandbox.${key}`] = toCanonicalPath({
          value: commandText,
          ...switchDefaults,
        });
    }
    for (let key of SANDBOX_SETTINGS_KEYS) {
      let atPath = getAtPath_2(sandbox, key);
      if (isMeaningfulValue(key, atPath))
        sandboxSettings[`sandbox.${key}`] = toCanonicalPath({
          value: atPath,
          ...switchDefaults,
          ...(SENSITIVE_POLICY_KEYS.has(key) && {
            allowedDomains: sortedStringList(switches[NETWORK_ALLOWEDDOMAINS]),
          }),
        });
    }
  }
  let isolation = settings.isolation;
  let isolationSettings = {};
  for (let key of SANDBOX_NETWORK_MODE_VALUES) {
    let atPath = getAtPath_2(isolation, key);
    if (isRiskyIsolationValue(key, atPath))
      isolationSettings[`isolation.${key}`] = toCanonicalPath({
        value: atPath,
      });
  }
  let envVars = {};
  if (settings.env && typeof settings.env === "object")
    for (let [key, value] of Object.entries(settings.env)) {
      if (value === undefined) continue;
      let valueText = String(value);
      if (
        valueText.length > 0 &&
        !IGNORED_ENV_VARS.has(key.toUpperCase()) &&
        !isProtectedEnvVar(key, valueText)
      )
        envVars[key] = valueText;
    }
  let hasHooks =
    settings.hooks !== undefined &&
    settings.hooks !== null &&
    typeof settings.hooks === "object" &&
    Object.keys(settings.hooks).length > 0;
  return {
    shellSettings,
    inlineHelperScriptSizes: scriptSizes,
    envVars,
    sandboxSettings,
    isolationSettings,
    hasHooks,
    hooks: hasHooks ? settings.hooks : undefined,
    sandboxSwitches: switches,
  };
}
//@ chunk-dcmhvw5a.js:380873-380929 placement
function mapSettingsValues(settings, slots) {
  return policyHelperSlots(settings).map(([slotName, slotSettings]) => [
    slotName,
    collectDangerousSettings(slotSettings, slots),
  ]);
}
//@ chunk-dcmhvw5a.js:380929-381092 placement
/**
 * 列出托管设置中各 policyHelpers 槽位的配置（去掉嵌套的 policyHelper/policyHelpers 字段）。
 */
function policyHelperSlots(settings) {
  let slots = [];
  for (let path of POLICY_HELPER_SETTING_PATHS) {
    let slotPath = `policyHelpers.${path}`;
    let atPath = getAtPath_2(settings, slotPath);
    if (!isPlainObject(atPath)) continue;
    let { policyHelper, policyHelpers, ...rest } = atPath;
    slots.push([slotPath, rest]);
  }
  return slots;
}
//@ chunk-dcmhvw5a.js:381092-381169 placement
function isPolicyHelperPath(path) {
  return SUPPORTED_PLATFORMS.find((platform) => path === `policyHelpers.${platform}.defaultSettings`);
}
//@ chunk-dcmhvw5a.js:381169-381269 placement
/**
 * 判断某个设置对应的 policyHelper 是否为 merge 输出行为。
 */
function isMergingPolicyHelper(settings, path) {
  let platform = isPolicyHelperPath(path);
  return (
    platform !== undefined && getAtPath_2(settings, `policyHelpers.${platform}.outputBehavior`) === "merge"
  );
}
//@ chunk-dcmhvw5a.js:381269-381754 placement
/**
 * 在多份托管设置摘要间标出沙箱设置的重叠与冲突。
 */
function markSandboxSettingConflicts(slots) {
  let mapped = slots.map(
    (slot) =>
      Object.keys(slot.sandboxSettings).length > 0 ||
      SANDBOX_BINARY_SETTINGS.some((key) => slot.shellSettings[`sandbox.${key}`] !== undefined),
  );
  let mapped_2 = slots.map((slot) =>
    [...SENSITIVE_POLICY_KEYS].some((key) => slot.sandboxSettings[`sandbox.${key}`] !== undefined),
  );
  slots.forEach((slot, slotIndex) => {
    if (mapped.some((flag, otherIndex) => flag && otherIndex !== slotIndex))
      for (let key of SANDBOX_TOGGLE_KEYS) {
        let switchValue = slot.sandboxSwitches[key];
        if (switchValue !== undefined)
          slot.sandboxSettings[`sandbox.${key}`] = toCanonicalPath({
            value: switchValue,
          });
      }
    if (mapped_2.some((flag, otherIndex) => flag && otherIndex !== slotIndex)) {
      let domains = slot.sandboxSwitches[NETWORK_ALLOWEDDOMAINS];
      if (domains !== undefined)
        slot.sandboxSettings[`sandbox.${NETWORK_ALLOWEDDOMAINS}`] = toCanonicalPath({
          value: sortedStringList(domains) ?? domains,
        });
    }
  });
}
//@ chunk-dcmhvw5a.js:381754-381812 placement
var POLICY_HELPER_SETTING_PATHS; // deferred: uses SUPPORTED_PLATFORMS (../../utils/settings/types.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:381754", () => {
  POLICY_HELPER_SETTING_PATHS = [
    ...SUPPORTED_PLATFORMS.map((platform) => `${platform}.defaultSettings`),
    "default",
  ];
});
//@ chunk-dcmhvw5a.js:381812-381944 placement
/**
 * 列出载荷中含危险内容的 policyHelpers 槽位。
 */
function riskyPayloadSlots(summary) {
  let risky = [];
  for (let path of POLICY_HELPER_SETTING_PATHS) {
    let slotPath = `policyHelpers.${path}`;
    let slotValue = summary.payloadSlots[slotPath];
    if (slotValue !== undefined && hasRiskySettings(slotValue)) risky.push([slotPath, slotValue]);
  }
  return risky;
}
//@ chunk-dcmhvw5a.js:381944-382011 placement
/**
 * 函数 hasPayloadSlot（payloadSlots 有条目）；位于「托管设置危险项提取与比较：hooks、apiKeyHelper、危险环境变量（含增强遥测）等，判断自上次批准后是否变化」模块。
 */
function hasPayloadSlot(summary, sourceField) {
  let slotValue = summary.payloadSlots[sourceField];
  return slotValue !== undefined && hasRiskySettings(slotValue);
}
//@ chunk-dcmhvw5a.js:382011-382188 placement
function hasRiskySettings(summary) {
  return (
    Object.keys(summary.shellSettings).length > 0 ||
    Object.keys(summary.envVars).length > 0 ||
    Object.keys(summary.sandboxSettings).length > 0 ||
    Object.keys(summary.isolationSettings).length > 0
  );
}
//@ chunk-dcmhvw5a.js:382188-382243 placement
var SENSITIVE_POLICY_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:382188", () => {
  SENSITIVE_POLICY_KEYS = new Set(["credentials", "network.tlsTerminate"]);
});
//@ chunk-dcmhvw5a.js:382243-382334 placement
function sortedStringList(values) {
  return Array.isArray(values) ? uniq(values.filter((entry) => typeof entry === "string")).sort() : undefined;
}
//@ chunk-dcmhvw5a.js:382334-382442 placement
function getAtPath_2(settingsObject, path) {
  let current = settingsObject;
  for (let segment of path.split(".")) {
    if (current === null || typeof current !== "object") return;
    current = current[segment];
  }
  return current;
}
//@ chunk-dcmhvw5a.js:382442-382577 placement
function isMeaningfulValue(key, atPath) {
  if (atPath === undefined || atPath === null || atPath === false) return false;
  if (Array.isArray(atPath) && atPath.length === 0) return false;
  return !(key === "credentials" && isCredentialsSettingShape(atPath));
}
//@ chunk-dcmhvw5a.js:382577-382804 placement
function isRiskyIsolationValue(key, atPath) {
  if (atPath === undefined || atPath === null) return false;
  switch (key) {
    case "required":
      return atPath !== false;
    case "egress":
      return (
        !isPlainObject(atPath) ||
        Object.entries(atPath).some(([key, value]) =>
          NETWORK_HOST_KEYS.has(key)
            ? value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0)
            : value !== undefined,
        )
      );
  }
}
//@ chunk-dcmhvw5a.js:382804-382851 placement
var NETWORK_HOST_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:382804", () => {
  NETWORK_HOST_KEYS = new Set(["allowedHosts", "deniedHosts"]);
});
//@ chunk-dcmhvw5a.js:382851-383237 placement
/**
 * 判断 credentials 设置是否为合法形状（files/envVars 条目带 mode）。
 */
function isCredentialsSettingShape(value) {
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).every(([key, value]) => {
    if (value === undefined) return true;
    if (key === "files" || key === "envVars")
      return (
        Array.isArray(value) &&
        value.every((entry) => typeof entry === "object" && entry !== null && entry.mode === "deny")
      );
    if (key === "sigv4")
      return (
        typeof value === "object" &&
        value !== null &&
        Object.values(value).every((field) => field === undefined || field === "deny")
      );
    return key === "allowPlaintextInject" && value === false;
  });
}
//@ chunk-dcmhvw5a.js:383237-383297 fingerprint = hasDangerousSettingsChanged (0.574)
function hasDangerousSettingsChanged(summary) {
  return Object.keys(summary.shellSettings).some(isPolicyHelperName);
}
//@ chunk-dcmhvw5a.js:383297-383358 placement
function isPolicyHelperName(name) {
  return SUPPORTED_PLATFORMS.some((platform) => name === `policyHelpers.${platform}`);
}
//@ chunk-dcmhvw5a.js:383358-383483 placement
/**
 * 判断托管设置是否需要用户确认：危险设置有变化、新增 extraKnownMarketplaces，或存在危险的 policyHelpers 槽位。
 */
function needsManagedSettingsConsent(summary) {
  return (
    hasDangerousSettingsChanged(summary) ||
    Object.keys(summary.shellSettings).some((key) => key.startsWith("extraKnownMarketplaces[")) ||
    riskyPayloadSlots(summary).length > 0
  );
}
//@ chunk-dcmhvw5a.js:383483-383526 placement
function isShellHelper(interpreter) {
  return interpreter === "sh" || interpreter === "pwsh";
}
//@ chunk-dcmhvw5a.js:383526-383658 placement
/**
 * 判断 policyHelper 配置是否为内联脚本形式（合法 interpreter + 字符串 script）。
 */
function isInlineScriptHelper(helper) {
  return (
    helper !== null &&
    typeof helper === "object" &&
    "interpreter" in helper &&
    isShellHelper(helper.interpreter) &&
    "script" in helper &&
    typeof helper.script === "string"
  );
}
//@ chunk-dcmhvw5a.js:383658-383696 placement
/**
 * 取 policyHelper 配置对应的命令文本。
 */
function getPolicyHelperCommand(helper) {
  return policyHelperCommand(helper)?.command;
}
//@ chunk-dcmhvw5a.js:383696-383995 placement
function policyHelperCommand(helper) {
  if (helper === null || typeof helper !== "object") return;
  let { path, script, interpreter, timeoutMs, refreshIntervalMs } = helper;
  let target;
  let scriptSize;
  if (typeof path === "string" && path) target = path;
  else if (typeof script === "string" && script && isShellHelper(interpreter)) {
    target = {
      interpreter,
      script: normalizePathText(script),
    };
    scriptSize = editSizeOf(script);
  } else return;
  return {
    command: jsonStringify([target, timeoutMs ?? null, refreshIntervalMs ?? null]),
    scriptSize,
  };
}
//@ chunk-dcmhvw5a.js:384090-384121 placement
function normalizePathText(value) {
  return computeContentHash(jsonStringify(value));
}
//@ chunk-dcmhvw5a.js:384121-384364 placement
function hookCommandText(value) {
  if (typeof value === "string") return value || undefined;
  if (
    value === null ||
    typeof value !== "object" ||
    !("command" in value) ||
    typeof value.command !== "string" ||
    !value.command
  )
    return;
  let args = "args" in value && Array.isArray(value.args) ? value.args.map(String) : [];
  return jsonStringify([value.command, ...args]);
}
//@ chunk-dcmhvw5a.js:384364-384421 placement
/**
 * 摘要中是否含任何需要确认的危险设置（含 hooks 与 payload 槽位）。
 */
function hasDangerousManagedSettings(summary) {
  return hasRiskySettings(summary) || summary.hasHooks || riskyPayloadSlots(summary).length > 0;
}
//@ chunk-dcmhvw5a.js:384421-384453 placement
function canonicalPath(summary) {
  return toCanonicalPath(dangerousSettingsDigestInput(summary));
}
//@ chunk-dcmhvw5a.js:384453-384763 placement
/**
 * 生成用于计算同意摘要哈希的危险设置对象。
 */
function dangerousSettingsDigestInput(summary) {
  return {
    shellSettings: summary.shellSettings,
    envVars: summary.envVars,
    sandboxSettings: Object.keys(summary.sandboxSettings).length > 0 ? summary.sandboxSettings : undefined,
    ...isolationSettingsField(summary),
    hooks: summary.hooks,
    payloadSlots:
      riskyPayloadSlots(summary).length > 0
        ? Object.fromEntries(
            riskyPayloadSlots(summary).map(([slotName, slotValue]) => {
              let { isolationSettings, ...rest } = slotValue;
              return [
                slotName,
                {
                  ...rest,
                  ...isolationSettingsField(slotValue),
                },
              ];
            }),
          )
        : undefined,
  };
}
//@ chunk-dcmhvw5a.js:384763-384870 placement
function isolationSettingsField(summary) {
  return Object.keys(summary.isolationSettings).length > 0
    ? {
        isolationSettings: summary.isolationSettings,
      }
    : {};
}
//@ chunk-dcmhvw5a.js:384870-385347 placement
/**
 * 为托管设置里的插件槽位（enabledPlugins、prepend/appendPlugins 等）生成危险项条目。
 */
function pluginSlotDangerEntries(slots, marketplace, pluginDigests) {
  let digestIds = new Set(Object.keys(pluginDigests).map((key) => nfcLower(`${key}@${marketplace}`)));
  return slots.flatMap(([slotName, slotValue]) =>
    [
      "enabledPlugins",
      "prependPlugins",
      "appendPlugins",
      "managedSourcesBehavior",
      "outputBehavior",
      "slotPresent",
    ].flatMap((field) => {
      let fieldValue = slotValue[field];
      let isObjectOrArray =
        field === "enabledPlugins" ? isPlainObject(fieldValue) : Array.isArray(fieldValue);
      if (fieldValue === undefined) return [];
      if (!isObjectOrArray) return [[slotName, `${field}:whole`, fieldValue]];
      return (
        isPlainObject(fieldValue)
          ? Object.entries(fieldValue).toSorted()
          : [fieldValue].flat().map((value) => [value])
      )
        .filter(([firstKey]) => typeof firstKey !== "string" || digestIds.has(nfcLower(firstKey)))
        .map((entry) => [slotName, field, ...entry]);
    }),
  );
}
//@ chunk-dcmhvw5a.js:385347-385378 placement
function toCanonicalPath(hooks) {
  return jsonStringify(sortKeysDeep(hooks));
}
//@ chunk-dcmhvw5a.js:385378-385411 placement
/**
 * 函数 realCanonicalPath（真实路径）；位于「托管设置危险项提取与比较：hooks、apiKeyHelper、危险环境变量（含增强遥测）等，判断自上次批准后是否变化」模块。
 */
function realCanonicalPath(summary) {
  return computeContentHash(canonicalPath(summary));
}
//@ chunk-dcmhvw5a.js:385411-385527 placement
/**
 * 判断托管设置摘要是否与已同意的哈希一致（直接比较，或加入 CLAUDE.md 内容后重算比较）。
 */
function matchesConsentedHash(consentedHash, summary, claudeMd) {
  if (realCanonicalPath(summary) === consentedHash) return true;
  return (
    typeof claudeMd === "string" &&
    claudeMd.length > 0 &&
    computeContentHash(
      toCanonicalPath({
        ...dangerousSettingsDigestInput(summary),
        claudeMd,
      }),
    ) === consentedHash
  );
}
//@ chunk-dcmhvw5a.js:385527-385683 placement
/**
 * 解析 headersHelper 的 JSON 三元组，取出命令与可选 URL。
 */
function parseHeadersHelperCommand(command) {
  let parts = safeParseJSON(command, false);
  if (!Array.isArray(parts) || parts.length !== 3 || typeof parts[0] !== "string") return;
  return {
    command: parts[0],
    url: typeof parts[2] === "string" ? parts[2] : undefined,
  };
}
//@ chunk-dcmhvw5a.js:385683-385770 placement
function joinPathParts(headersHelper, kind, url) {
  return jsonStringify([
    headersHelper,
    typeof kind === "string" ? kind : null,
    typeof url === "string" ? url : null,
  ]);
}
//@ chunk-dcmhvw5a.js:385770-385868 placement
function isPathShadowed(consentedSettings, currentSettings) {
  let consentedSummary = summarizeManagedSettingsRisk(consentedSettings);
  let currentSummary = summarizeManagedSettingsRisk(currentSettings);
  if (!hasDangerousManagedSettings(currentSummary)) return false;
  if (!hasDangerousManagedSettings(consentedSummary)) return true;
  return canonicalPath(consentedSummary) !== canonicalPath(currentSummary);
}
//@ chunk-dcmhvw5a.js:385868-386089 placement
/**
 * 判断已同意的托管设置是否需要重新征求同意：按同意来源（已同意的 payload 或组织记录）比较当前危险项与哈希/已同意内容。
 */
function managedSettingsNeedReconsent(record, settings) {
  switch (record.source) {
    case "consented_payload":
      return isPathShadowed(record.settings, settings);
    case "org_record": {
      let summary = summarizeManagedSettingsRisk(settings);
      if (!hasDangerousManagedSettings(summary)) return false;
      if (matchesConsentedHash(record.dangerousSettingsHash, summary, settings?.claudeMd)) return false;
      return isPathShadowed(record.consentedPayload, settings);
    }
  }
}
//@ chunk-dcmhvw5a.js:386089-387329 fingerprint = extractDangerousSettings (0.426)
function extractDangerousSettings(baseline, dangerous) {
  let baselineSummary = summarizeManagedSettingsRisk(baseline);
  let changedShell = {};
  let shellDiff = diffSettingsMap(baselineSummary.shellSettings, dangerous.shellSettings, changedShell);
  let changedEnv = {};
  let envDiff = diffSettingsMap(baselineSummary.envVars, dangerous.envVars, changedEnv);
  let changedSandbox = {};
  let sandboxDiff = diffSettingsMap(
    baselineSummary.sandboxSettings,
    dangerous.sandboxSettings,
    changedSandbox,
  );
  let changedIsolation = {};
  let isolationDiff = diffSettingsMap(
    baselineSummary.isolationSettings,
    dangerous.isolationSettings,
    changedIsolation,
  );
  let unchangedCount =
    shellDiff.unchanged + envDiff.unchanged + sandboxDiff.unchanged + isolationDiff.unchanged;
  let removedCount = shellDiff.removed + envDiff.removed + sandboxDiff.removed + isolationDiff.removed;
  if (baselineSummary.hasHooks && !dangerous.hasHooks) removedCount++;
  let hasHooks =
    dangerous.hasHooks &&
    !(
      baselineSummary.hasHooks && toCanonicalPath(baselineSummary.hooks) === toCanonicalPath(dangerous.hooks)
    );
  if (dangerous.hasHooks && !hasHooks) unchangedCount++;
  let changedSlots = {};
  for (let [slotName, slotValue] of riskyPayloadSlots(dangerous)) {
    let baselineSlot = baselineSummary.payloadSlots[slotName];
    let changedSlot = {
      shellSettings: {},
      envVars: {},
      sandboxSettings: {},
      isolationSettings: {},
    };
    for (let { unchanged, removed } of [
      diffSettingsMap(baselineSlot?.shellSettings ?? {}, slotValue.shellSettings, changedSlot.shellSettings),
      diffSettingsMap(baselineSlot?.envVars ?? {}, slotValue.envVars, changedSlot.envVars),
      diffSettingsMap(
        baselineSlot?.sandboxSettings ?? {},
        slotValue.sandboxSettings,
        changedSlot.sandboxSettings,
      ),
      diffSettingsMap(
        baselineSlot?.isolationSettings ?? {},
        slotValue.isolationSettings,
        changedSlot.isolationSettings,
      ),
    ]) {
      unchangedCount += unchanged;
      removedCount += removed;
    }
    if (hasRiskySettings(changedSlot)) changedSlots[slotName] = changedSlot;
  }
  for (let [slotName, slotValue] of riskyPayloadSlots(baselineSummary))
    if (dangerous.payloadSlots[slotName] === undefined)
      removedCount +=
        Object.keys(slotValue.shellSettings).length +
        Object.keys(slotValue.envVars).length +
        Object.keys(slotValue.sandboxSettings).length +
        Object.keys(slotValue.isolationSettings).length;
  return {
    changed: {
      shellSettings: changedShell,
      inlineHelperScriptSizes: dangerous.inlineHelperScriptSizes,
      envVars: changedEnv,
      sandboxSettings: changedSandbox,
      isolationSettings: changedIsolation,
      hasHooks,
      hooks: hasHooks ? dangerous.hooks : undefined,
      payloadSlots: changedSlots,
    },
    unchangedCount,
    removedCount,
  };
}
//@ chunk-dcmhvw5a.js:387329-387554 layout
function diffSettingsMap(previous, next, changed) {
  let unchanged = 0;
  for (let [key, value] of Object.entries(next)) {
    if (value === undefined) continue;
    if (Object.hasOwn(previous, key) && previous[key] === value) unchanged++;
    else changed[key] = value;
  }
  let removed = 0;
  for (let key of Object.keys(previous)) if (!Object.hasOwn(next, key)) removed++;
  return {
    unchanged,
    removed,
  };
}
//@ chunk-dcmhvw5a.js:387554-387850 layout
/**
 * OTLP 导出端点环境变量名的匹配正则（含 traces/logs/metrics 及 ANT_ 前缀版本），以及增强遥测开关变量名集合。
 */
var OTLP_ENDPOINT_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OTLP_TRACES_ENDPOINT_RE;
var OTLP_ANY_ENDPOINT_RE;
var ENHANCED_TELEMETRY_VARS;
deferInit("chunk-dcmhvw5a.js:387554", () => {
  OTLP_ENDPOINT_RE = /^OTEL_EXPORTER_OTLP_(?:LOGS_|METRICS_|TRACES_)?ENDPOINT$/;
  OTLP_TRACES_ENDPOINT_RE = /^OTEL_EXPORTER_OTLP_(?:TRACES_)?ENDPOINT$/;
  OTLP_ANY_ENDPOINT_RE =
    /^(?:ANT_OTEL_EXPORTER_OTLP_ENDPOINT|OTEL_EXPORTER_OTLP_(?:LOGS_|METRICS_|TRACES_)?ENDPOINT)$/;
  ENHANCED_TELEMETRY_VARS = new Set([
    "CLAUDE_CODE_ENHANCED_TELEMETRY_BETA",
    "ENABLE_ENHANCED_TELEMETRY_BETA",
  ]);
});
//@ chunk-dcmhvw5a.js:387850-388090 layout
/**
 * 托管设置的危险项是否只有 OTLP 遥测端点（及增强遥测开关）而无 hooks/shell/沙箱/隔离设置——此类改动可简化确认。
 */
function isTelemetryOnlyChange(summary, settings) {
  let current = settings ? summarizeManagedSettingsRisk(settings) : summary;
  let all = [current, ...riskyPayloadSlots(current).map(([, slot]) => slot)];
  return (
    onlyTelemetryEnvVars(summary) &&
    onlyTelemetryEnvVars(current) &&
    !current.hasHooks &&
    all.every(
      (dangerous) =>
        Object.keys(dangerous.shellSettings).length === 0 &&
        Object.keys(dangerous.sandboxSettings).length === 0 &&
        Object.keys(dangerous.isolationSettings).length === 0,
    )
  );
}
//@ chunk-dcmhvw5a.js:388090-388361 fingerprint = hasDangerousSettings (0.736)
function hasDangerousSettings(summary, settings) {
  let current = settings ? summarizeManagedSettingsRisk(settings) : summary;
  let all = [current, ...riskyPayloadSlots(current).map(([, slot]) => slot)];
  return (
    !current.hasHooks &&
    all.some((slot) => Object.keys(slot.isolationSettings).length > 0) &&
    all.every(
      (dangerous) =>
        Object.keys(dangerous.shellSettings).length === 0 &&
        Object.keys(dangerous.envVars).length === 0 &&
        Object.keys(dangerous.sandboxSettings).length === 0,
    )
  );
}
//@ chunk-dcmhvw5a.js:388361-388586 affinity
function onlyTelemetryEnvVars(summary) {
  let rows = describeEnvRows(summary);
  let isTelemetryEndpoint = (row) => row.url !== undefined && OTLP_ENDPOINT_RE.test(row.key.toUpperCase());
  let tracesOk =
    !rows.some((row) => row.tracesSwitch === true) ||
    rows.some((row) => isTelemetryEndpoint(row) && OTLP_TRACES_ENDPOINT_RE.test(row.key.toUpperCase()));
  return (
    rows.some(isTelemetryEndpoint) &&
    tracesOk &&
    rows.every((row) => isTelemetryEndpoint(row) || row.tracesSwitch === true)
  );
}
export {
  getPluginDisplayName,
  describeArchiveFetchCommand,
  printablePluginName,
  trimmedOrUndefined,
  sanitizePluginManifestForDisplay,
  summarizeManagedSettingsRisk,
  extractDangerousSettings,
  hasDangerousManagedSettings,
  isTelemetryOnlyChange,
  hasDangerousSettings,
  realCanonicalPath,
  managedSettingsNeedReconsent,
  isInlineScriptHelper,
  normalizePathText,
  riskyPayloadSlots,
  ENHANCED_TELEMETRY_VARS,
  OTLP_ANY_ENDPOINT_RE,
  isPolicyHelperName,
  escapeNonPrintable,
  parseHeadersHelperCommand,
  needsManagedSettingsConsent,
  matchesConsentedHash,
  isMergingPolicyHelper,
  policyHelperSlots,
  isPolicyHelperPath,
  hasPayloadSlot,
  getPolicyHelperCommand,
};
