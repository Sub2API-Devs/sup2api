/**
 * services/remoteManagedSettings/managedSettingsTelemetry.ts
 *
 * 2.1.316 新增：托管设置遥测汇总
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-405cd95w.js (21)
 * attribution: affinity 1, placement 20
 */
import { getAllBaseToolsFromRegistry } from "../../Tool.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { parseRuleString } from "../../utils/permissions/permissionRuleParser.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getSettingsSchemaForDocument } from "../../utils/settings/types.js";
import {
  getManagedSourcesInEffect,
  getBasePolicySettingsOrigin,
  parseRemoteManagedSettings,
  getSettingsForSource,
} from "../../utils/settings/settings.js";
import { policyHelperConsentState } from "../../utils/settings/policyHelper/helperRemote.js";
import { platformSettingsChain } from "../../utils/settings/marketplaceSettingsAliases.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import {
  getAppliedGlobalConfigEnv,
  filterPolicyPredicateEnv,
  getLatchedPreSettingsEnvSnapshot,
} from "../../utils/managedEnvApply.js";
import { getEnabledSettingSources, REPO_DIR_SETTING_SOURCES } from "../../utils/settings/constants.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import { sortKeysDeep } from "../../utils/settings/settingsSourceTrust.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-405cd95w.js:7162-7181 affinity
var REDACTED_PLACEHOLDER = "[REDACTED]";
//@ chunk-405cd95w.js:7181-7505 placement
function unwrapZodSchema(schema) {
  let current = schema;
  for (let idx = 0; current && idx < 32; idx++) {
    let def = current._zod.def;
    switch (def.type) {
      case "optional":
      case "nullable":
      case "default":
      case "prefault":
      case "catch":
      case "nonoptional":
      case "readonly":
        current = def.innerType;
        break;
      case "pipe":
        current = def.in?._zod.def.type === "transform" ? def.out : def.in;
        break;
      case "lazy":
        current = def.getter?.();
        break;
      default:
        return current;
    }
  }
  return;
}
//@ chunk-405cd95w.js:7505-7648 placement
function resolveUnionBranch(schema, value) {
  let resolved = unwrapZodSchema(schema);
  if (resolved?._zod.def.type !== "union") return resolved;
  let schema_2 = resolved._zod.def.options?.find((option) => option.safeParse(value).success);
  return schema_2 && resolveUnionBranch(schema_2, value);
}
//@ chunk-405cd95w.js:7648-7730 placement
/**
 * 判断 zod schema 是否有具体类型（不是 unknown/any），遥测里才值得展开。
 */
function hasConcreteZodType(schema) {
  let typeName = schema?._zod.def.type;
  return typeName !== undefined && typeName !== "unknown" && typeName !== "any";
}
//@ chunk-405cd95w.js:7730-7812 placement
/**
 * 取联合类型分支中数组的 element schema（遥测按元素脱敏用）。
 */
function unionArrayElementSchema(schema, value) {
  let def = resolveUnionBranch(schema, value)?._zod.def;
  return def?.type === "array" ? def.element : undefined;
}
//@ chunk-405cd95w.js:7812-8123 placement
function matchesSchemaType(schema, value) {
  let def = unwrapZodSchema(schema)?._zod.def;
  switch (def?.type) {
    case "boolean":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number";
    case "enum":
      return Object.values(def.entries ?? {}).includes(value);
    case "literal":
      return def.values?.includes(value) ?? false;
    case "union":
      return def.options?.some((option) => matchesSchemaType(option, value)) ?? false;
    default:
      return false;
  }
}
//@ chunk-405cd95w.js:8123-8237 placement
var PERMISSION_RULE_PATHS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MCP_TOOL_NAME_RE;
deferInit("chunk-405cd95w.js:8123", () => {
  PERMISSION_RULE_PATHS = new Set(["permissions.allow", "permissions.deny", "permissions.ask"]);
  MCP_TOOL_NAME_RE = /^mcp__[\w-]+(?:__(?:[\w.-]+|\*))?$/;
});
//@ chunk-405cd95w.js:8237-8335 placement
/**
 * 当前所有注册工具名与别名的集合（遥测里识别工具名用）。
 */
function knownToolNameSet() {
  return new Set([
    ...(getAllBaseToolsFromRegistry() ?? []).flatMap((tool) => [tool.name, ...(tool.aliases ?? [])]),
    BASH_TOOL_NAME,
    POWERSHELL_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
  ]);
}
//@ chunk-405cd95w.js:8335-8489 placement
function redactPermissionRule(rule, knownTools) {
  if (typeof rule !== "string") return REDACTED_PLACEHOLDER;
  let { toolName, ruleContent } = parseRuleString(rule);
  if (!(knownTools.has(toolName) || MCP_TOOL_NAME_RE.test(toolName))) return REDACTED_PLACEHOLDER;
  return ruleContent === undefined ? toolName : `${toolName}(${REDACTED_PLACEHOLDER})`;
}
//@ chunk-405cd95w.js:8489-8523 placement
var SANDBOX_IGNOREVIOLATIONS = "sandbox.ignoreViolations";
//@ chunk-405cd95w.js:8523-8835 placement
function schemaKeysOf(value, schema) {
  let def = resolveUnionBranch(schema, value)?._zod.def;
  if (def?.type === "object" && def.shape) {
    let { shape } = def;
    return Object.keys(value)
      .filter((key) => Object.hasOwn(shape, key))
      .map((key) => [key, shape[key]]);
  }
  let { keyType, valueType } = def ?? {};
  if (def?.type === "record" && keyType && valueType && hasConcreteZodType(unwrapZodSchema(valueType)))
    return Object.keys(value)
      .filter((key) => keyType.safeParse(key).success)
      .map((key) => [key, valueType]);
  return;
}
//@ chunk-405cd95w.js:8835-8918 placement
var SENSITIVE_NUMERIC_SETTING_PATHS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-405cd95w.js:8835", () => {
  SENSITIVE_NUMERIC_SETTING_PATHS = new Set([
    "sandbox.network.httpProxyPort",
    "sandbox.network.socksProxyPort",
  ]);
});
//@ chunk-405cd95w.js:8918-9414 placement (2.1.88 match: isInBundledMode, 0.823)
function telemetrySafeValue(value, schema, path, knownTools) {
  switch (typeof value) {
    case "string":
    case "boolean":
      return matchesSchemaType(schema, value) ? value : REDACTED_PLACEHOLDER;
    case "number":
      return matchesSchemaType(schema, value) && !SENSITIVE_NUMERIC_SETTING_PATHS.has(path)
        ? value
        : REDACTED_PLACEHOLDER;
    case "undefined":
      return;
    case "object":
      break;
    default:
      return REDACTED_PLACEHOLDER;
  }
  if (value === null) return null;
  if (Array.isArray(value)) {
    if (PERMISSION_RULE_PATHS.has(path)) return value.map((rule) => redactPermissionRule(rule, knownTools));
    let elementSchema = unionArrayElementSchema(schema, value);
    return elementSchema
      ? value.map((item) => telemetrySafeValue(item, elementSchema, path, knownTools))
      : REDACTED_PLACEHOLDER;
  }
  if (PERMISSION_RULE_PATHS.has(path)) return REDACTED_PLACEHOLDER;
  let entries = schemaKeysOf(value, schema);
  if (!entries) return REDACTED_PLACEHOLDER;
  let objectValue = value;
  if (path === SANDBOX_IGNOREVIOLATIONS)
    return entries.map(([key, childSchema]) =>
      telemetrySafeValue(objectValue[key], childSchema, path, knownTools),
    );
  return Object.fromEntries(
    entries.map(([key, childSchema]) => [
      key,
      telemetrySafeValue(objectValue[key], childSchema, path ? `${path}.${key}` : key, knownTools),
    ]),
  );
}
//@ chunk-405cd95w.js:9414-9425 placement
var MAX_TELEMETRY_CONTENT_BYTES = 8192;
//@ chunk-405cd95w.js:9425-9646 placement
function safeSettingsContent(settingsForSource) {
  let json = jsonStringify(
    telemetrySafeValue(
      settingsForSource,
      getSettingsSchemaForDocument(settingsForSource),
      "",
      knownToolNameSet(),
    ),
  );
  if (Buffer.byteLength(json) <= MAX_TELEMETRY_CONTENT_BYTES)
    return {
      content: json,
      truncated: false,
    };
  let bytes = 0;
  let chars = 0;
  for (let char of json) {
    bytes += Buffer.byteLength(char);
    if (bytes > MAX_TELEMETRY_CONTENT_BYTES) break;
    chars += char.length;
  }
  return {
    content: json.slice(0, chars),
    truncated: true,
  };
}
//@ chunk-405cd95w.js:9646-10261 placement
/**
 * 汇总当前生效的托管设置来源与键值（只记录安全的值）用于遥测。
 */
function managedSettingsSummary(trigger) {
  let { sources, behavior } = getManagedSourcesInEffect();
  let helperState = policyHelperConsentState();
  let entry = helperState.entry;
  let isEntryInvalid =
    helperState.state === "none" &&
    entry?.path === undefined &&
    entry?.script === undefined &&
    getBasePolicySettingsOrigin() === "remote" &&
    parseRemoteManagedSettings().errors.some((error) =>
      platformSettingsChain().chain.some((name) => error.path === `policyHelpers.${name}`),
    );
  let fields = {
    "managed_settings.trigger": trigger,
    "managed_settings.sources": sources,
    "managed_settings.source_behavior": behavior,
    "managed_settings.helper.state": isEntryInvalid ? "entry_invalid" : helperState.state,
    "managed_settings.helper.applied": helperState.applied,
  };
  if (entry) {
    fields["managed_settings.helper.entry"] = entry.key;
    if (entry.path !== undefined) fields["managed_settings.helper.path"] = entry.path;
    else if (entry.script !== undefined)
      fields["managed_settings.helper.script_sha256"] = computeContentHash(entry.script);
  }
  return fields;
}
//@ chunk-405cd95w.js:10261-10425 placement
function logEmitFailure(error) {
  let errorName = error instanceof Error ? error.constructor.name : typeof error;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `managed_settings_resolved emit failed (${errorName})`,
      "managed_settings_resolved emit failed",
    ),
  );
}
//@ chunk-405cd95w.js:10425-10650 placement
function isManagedSettingsLoggingEnabled() {
  let OTEL_LOG_MANAGED_SETTINGS = getAppliedGlobalConfigEnv()?.OTEL_LOG_MANAGED_SETTINGS;
  for (let source of getEnabledSettingSources()) {
    if (REPO_DIR_SETTING_SOURCES.has(source)) continue;
    OTEL_LOG_MANAGED_SETTINGS =
      filterPolicyPredicateEnv(getSettingsForSource(source)?.env, source).OTEL_LOG_MANAGED_SETTINGS ??
      OTEL_LOG_MANAGED_SETTINGS;
  }
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  return isEnvTruthy(
    OTEL_LOG_MANAGED_SETTINGS ??
      (latchedPreSettingsEnvSnapshot
        ? latchedPreSettingsEnvSnapshot.OTEL_LOG_MANAGED_SETTINGS
        : env.OTEL_LOG_MANAGED_SETTINGS),
  );
}
//@ chunk-405cd95w.js:10650-10767 placement
function dropHashFields(fields, keepHash) {
  if (!keepHash) {
    delete fields["managed_settings.resolved_sha256"];
    delete fields["managed_settings.helper.script_sha256"];
  }
}
//@ chunk-405cd95w.js:10767-11251 placement
function createManagedSettingsReporter() {
  let started = false;
  let lastPayload = null;
  let report = (trigger) => {
    try {
      let fields = managedSettingsSummary(trigger);
      let settingsForSource = getSettingsForSource("policySettings");
      if (settingsForSource)
        fields["managed_settings.resolved_sha256"] = computeContentHash(
          jsonStringify(sortKeysDeep(settingsForSource)),
        );
      let { "managed_settings.trigger": triggerValue, ...rest } = fields;
      let payload = jsonStringify(rest);
      if (payload === lastPayload) return;
      lastPayload = payload;
      let includeContent = isManagedSettingsLoggingEnabled();
      dropHashFields(fields, includeContent);
      if (settingsForSource && includeContent) {
        let { content, truncated } = safeSettingsContent(settingsForSource);
        fields["managed_settings.settings"] = content;
        fields["managed_settings.settings_truncated"] = truncated;
      }
      logOTelEvent("managed_settings_resolved", fields).catch(logEmitFailure);
    } catch (error) {
      logEmitFailure(error);
    }
  };
  let unsubscribe = settingsChangeDetector.subscribe((changedSource) => {
    if (changedSource === "policySettings" && started) report("change");
  });
  report("startup");
  started = true;
  return unsubscribe;
}
//@ chunk-405cd95w.js:11251-11377 placement
function logManagedSettingsRefused(errorType) {
  try {
    let fields = managedSettingsSummary("refused");
    dropHashFields(fields, isManagedSettingsLoggingEnabled());
    logOTelEvent("managed_settings_resolved", {
      ...fields,
      "error.type": errorType,
    }).catch(logEmitFailure);
  } catch (error) {
    logEmitFailure(error);
  }
}
export { logManagedSettingsRefused, createManagedSettingsReporter };
