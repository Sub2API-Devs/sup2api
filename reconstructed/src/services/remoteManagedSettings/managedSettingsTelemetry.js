/**
 * services/remoteManagedSettings/managedSettingsTelemetry.ts
 *
 * 2.1.316 新增：托管设置遥测汇总
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-151tygw9.js (20)
 * attribution: placement 20
 */
import { getAllBaseToolsFromRegistry } from "../../Tool.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { REDACTED_PLACEHOLDER } from "../teamMemorySync/secretScanner.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
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

//@ chunk-151tygw9.js:7062-7386 placement
function unwrapZodSchema(e) {
  let n = e;
  for (let idx = 0; n && idx < 32; idx++) {
    let def = n._zod.def;
    switch (def.type) {
      case "optional":
      case "nullable":
      case "default":
      case "prefault":
      case "catch":
      case "nonoptional":
      case "readonly":
        n = def.innerType;
        break;
      case "pipe":
        n = def.in?._zod.def.type === "transform" ? def.out : def.in;
        break;
      case "lazy":
        n = def.getter?.();
        break;
      default:
        return n;
    }
  }
  return;
}
//@ chunk-151tygw9.js:7386-7529 placement
function resolveUnionBranch(e, n) {
  let r = unwrapZodSchema(e);
  if (r?._zod.def.type !== "union") return r;
  let found = r._zod.def.options?.find((option) => option.safeParse(n).success);
  return found && resolveUnionBranch(found, n);
}
//@ chunk-151tygw9.js:7529-7611 placement
/**
 * 判断 zod schema 是否有具体类型（不是 unknown/any），遥测里才值得展开。
 */
function hasConcreteZodType(e) {
  let n = e?._zod.def.type;
  return n !== undefined && n !== "unknown" && n !== "any";
}
//@ chunk-151tygw9.js:7611-7693 placement
/**
 * 取联合类型分支中数组的 element schema（遥测按元素脱敏用）。
 */
function unionArrayElementSchema(e, n) {
  let def = resolveUnionBranch(e, n)?._zod.def;
  return def?.type === "array" ? def.element : undefined;
}
//@ chunk-151tygw9.js:7693-8004 placement
function matchesSchemaType(e, n) {
  let def = unwrapZodSchema(e)?._zod.def;
  switch (def?.type) {
    case "boolean":
      return typeof n === "boolean";
    case "number":
      return typeof n === "number";
    case "enum":
      return Object.values(def.entries ?? {}).includes(n);
    case "literal":
      return def.values?.includes(n) ?? false;
    case "union":
      return def.options?.some((option) => matchesSchemaType(option, n)) ?? false;
    default:
      return false;
  }
}
//@ chunk-151tygw9.js:8004-8118 placement
var PERMISSION_RULE_PATHS = new Set(["permissions.allow", "permissions.deny", "permissions.ask"]);
var MCP_TOOL_NAME_RE = /^mcp__[\w-]+(?:__(?:[\w.-]+|\*))?$/;
//@ chunk-151tygw9.js:8118-8216 placement
/**
 * 当前所有注册工具名与别名的集合（遥测里识别工具名用）。
 */
function knownToolNameSet() {
  return new Set([
    ...(getAllBaseToolsFromRegistry() ?? []).flatMap((e) => [e.name, ...(e.aliases ?? [])]),
    BASH_TOOL_NAME,
    POWERSHELL_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
  ]);
}
//@ chunk-151tygw9.js:8216-8370 placement
function redactPermissionRule(e, n) {
  if (typeof e !== "string") return REDACTED_PLACEHOLDER;
  let { toolName, ruleContent } = permissionRuleValueFromString(e);
  if (!(n.has(toolName) || MCP_TOOL_NAME_RE.test(toolName))) return REDACTED_PLACEHOLDER;
  return ruleContent === undefined ? toolName : `${toolName}(${REDACTED_PLACEHOLDER})`;
}
//@ chunk-151tygw9.js:8370-8404 placement
var SANDBOX_IGNOREVIOLATIONS = "sandbox.ignoreViolations";
//@ chunk-151tygw9.js:8404-8716 placement
function schemaKeysOf(e, n) {
  let def = resolveUnionBranch(n, e)?._zod.def;
  if (def?.type === "object" && def.shape) {
    let { shape } = def;
    return Object.keys(e)
      .filter((key) => Object.hasOwn(shape, key))
      .map((key) => [key, shape[key]]);
  }
  let { keyType, valueType } = def ?? {};
  if (def?.type === "record" && keyType && valueType && hasConcreteZodType(unwrapZodSchema(valueType)))
    return Object.keys(e)
      .filter((key) => keyType.safeParse(key).success)
      .map((key) => [key, valueType]);
  return;
}
//@ chunk-151tygw9.js:8716-8799 placement
var SENSITIVE_NUMERIC_SETTING_PATHS = new Set([
  "sandbox.network.httpProxyPort",
  "sandbox.network.socksProxyPort",
]);
//@ chunk-151tygw9.js:8799-9295 placement = isInBundledMode (0.822)
function telemetrySafeValue(e, n, r, s) {
  switch (typeof e) {
    case "string":
    case "boolean":
      return matchesSchemaType(n, e) ? e : REDACTED_PLACEHOLDER;
    case "number":
      return matchesSchemaType(n, e) && !SENSITIVE_NUMERIC_SETTING_PATHS.has(r) ? e : REDACTED_PLACEHOLDER;
    case "undefined":
      return;
    case "object":
      break;
    default:
      return REDACTED_PLACEHOLDER;
  }
  if (e === null) return null;
  if (Array.isArray(e)) {
    if (PERMISSION_RULE_PATHS.has(r)) return e.map((h) => redactPermissionRule(h, s));
    let c = unionArrayElementSchema(n, e);
    return c ? e.map((h) => telemetrySafeValue(h, c, r, s)) : REDACTED_PLACEHOLDER;
  }
  if (PERMISSION_RULE_PATHS.has(r)) return REDACTED_PLACEHOLDER;
  let a = schemaKeysOf(e, n);
  if (!a) return REDACTED_PLACEHOLDER;
  let o = e;
  if (r === SANDBOX_IGNOREVIOLATIONS) return a.map(([c, h]) => telemetrySafeValue(o[c], h, r, s));
  return Object.fromEntries(a.map(([c, h]) => [c, telemetrySafeValue(o[c], h, r ? `${r}.${c}` : c, s)]));
}
//@ chunk-151tygw9.js:9295-9306 placement
var MAX_TELEMETRY_CONTENT_BYTES = 8192;
//@ chunk-151tygw9.js:9306-9527 placement
function safeSettingsContent(settingsForSource) {
  let n = jsonStringify(
    telemetrySafeValue(
      settingsForSource,
      getSettingsSchemaForDocument(settingsForSource),
      "",
      knownToolNameSet(),
    ),
  );
  if (Buffer.byteLength(n) <= MAX_TELEMETRY_CONTENT_BYTES)
    return {
      content: n,
      truncated: false,
    };
  let r = 0;
  let s = 0;
  for (let a of n) {
    r += Buffer.byteLength(a);
    if (r > MAX_TELEMETRY_CONTENT_BYTES) break;
    s += a.length;
  }
  return {
    content: n.slice(0, s),
    truncated: true,
  };
}
//@ chunk-151tygw9.js:9527-10142 placement
/**
 * 汇总当前生效的托管设置来源与键值（只记录安全的值）用于遥测。
 */
function managedSettingsSummary(e) {
  let { sources, behavior } = getManagedSourcesInEffect();
  let s = policyHelperConsentState();
  let entry = s.entry;
  let o =
    s.state === "none" &&
    entry?.path === undefined &&
    entry?.script === undefined &&
    getBasePolicySettingsOrigin() === "remote" &&
    parseRemoteManagedSettings().errors.some((error) =>
      platformSettingsChain().chain.some((L) => error.path === `policyHelpers.${L}`),
    );
  let c = {
    "managed_settings.trigger": e,
    "managed_settings.sources": sources,
    "managed_settings.source_behavior": behavior,
    "managed_settings.helper.state": o ? "entry_invalid" : s.state,
    "managed_settings.helper.applied": s.applied,
  };
  if (entry) {
    c["managed_settings.helper.entry"] = entry.key;
    if (entry.path !== undefined) c["managed_settings.helper.path"] = entry.path;
    else if (entry.script !== undefined)
      c["managed_settings.helper.script_sha256"] = computeContentHash(entry.script);
  }
  return c;
}
//@ chunk-151tygw9.js:10142-10306 placement
function logEmitFailure(error) {
  let n = error instanceof Error ? error.constructor.name : typeof error;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `managed_settings_resolved emit failed (${n})`,
      "managed_settings_resolved emit failed",
    ),
  );
}
//@ chunk-151tygw9.js:10306-10532 placement
function isManagedSettingsLoggingEnabled() {
  let OTEL_LOG_MANAGED_SETTINGS = getAppliedGlobalConfigEnv()?.OTEL_LOG_MANAGED_SETTINGS;
  for (let r of getEnabledSettingSources()) {
    if (REPO_DIR_SETTING_SOURCES.has(r)) continue;
    OTEL_LOG_MANAGED_SETTINGS =
      filterPolicyPredicateEnv(getSettingsForSource(r)?.env, r).OTEL_LOG_MANAGED_SETTINGS ??
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
//@ chunk-151tygw9.js:10532-10649 placement
function dropHashFields(e, n) {
  if (!n) {
    delete e["managed_settings.resolved_sha256"];
    delete e["managed_settings.helper.script_sha256"];
  }
}
//@ chunk-151tygw9.js:10649-11133 placement
function createManagedSettingsReporter() {
  let e = false;
  let n = null;
  let r = (a) => {
    try {
      let o = managedSettingsSummary(a);
      let settingsForSource = getSettingsForSource("policySettings");
      if (settingsForSource)
        o["managed_settings.resolved_sha256"] = computeContentHash(
          jsonStringify(sortKeysDeep(settingsForSource)),
        );
      let { "managed_settings.trigger": h, ...L } = o;
      let I = jsonStringify(L);
      if (I === n) return;
      n = I;
      let M = isManagedSettingsLoggingEnabled();
      dropHashFields(o, M);
      if (settingsForSource && M) {
        let { content, truncated } = safeSettingsContent(settingsForSource);
        o["managed_settings.settings"] = content;
        o["managed_settings.settings_truncated"] = truncated;
      }
      logOTelEvent("managed_settings_resolved", o).catch(logEmitFailure);
    } catch (error) {
      logEmitFailure(error);
    }
  };
  let s = settingsChangeDetector.subscribe((a) => {
    if (a === "policySettings" && e) r("change");
  });
  r("startup");
  e = true;
  return s;
}
//@ chunk-151tygw9.js:11133-11259 placement
function logManagedSettingsRefused(e) {
  try {
    let n = managedSettingsSummary("refused");
    dropHashFields(n, isManagedSettingsLoggingEnabled());
    logOTelEvent("managed_settings_resolved", {
      ...n,
      "error.type": e,
    }).catch(logEmitFailure);
  } catch (error) {
    logEmitFailure(error);
  }
}
export { createManagedSettingsReporter, logManagedSettingsRefused };
