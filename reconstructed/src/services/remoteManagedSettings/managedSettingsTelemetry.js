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
  for (let r = 0; n && r < 32; r++) {
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
  let s = r._zod.def.options?.find((a) => a.safeParse(n).success);
  return s && resolveUnionBranch(s, n);
}
//@ chunk-151tygw9.js:7529-7611 placement
function ie(e) {
  let n = e?._zod.def.type;
  return n !== void 0 && n !== "unknown" && n !== "any";
}
//@ chunk-151tygw9.js:7611-7693 placement
function re(e, n) {
  let r = resolveUnionBranch(e, n)?._zod.def;
  return r?.type === "array" ? r.element : void 0;
}
//@ chunk-151tygw9.js:7693-8004 placement
function matchesSchemaType(e, n) {
  let r = unwrapZodSchema(e)?._zod.def;
  switch (r?.type) {
    case "boolean":
      return typeof n === "boolean";
    case "number":
      return typeof n === "number";
    case "enum":
      return Object.values(r.entries ?? {}).includes(n);
    case "literal":
      return r.values?.includes(n) ?? !1;
    case "union":
      return r.options?.some((s) => matchesSchemaType(s, n)) ?? !1;
    default:
      return !1;
  }
}
//@ chunk-151tygw9.js:8004-8118 placement
var PERMISSION_RULE_PATHS = new Set(["permissions.allow", "permissions.deny", "permissions.ask"]),
  MCP_TOOL_NAME_RE = /^mcp__[\w-]+(?:__(?:[\w.-]+|\*))?$/;
//@ chunk-151tygw9.js:8118-8216 placement
function ae() {
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
  let { toolName: toolName, ruleContent: ruleContent } = permissionRuleValueFromString(e);
  if (!(n.has(toolName) || MCP_TOOL_NAME_RE.test(toolName))) return REDACTED_PLACEHOLDER;
  return ruleContent === void 0 ? toolName : `${toolName}(${REDACTED_PLACEHOLDER})`;
}
//@ chunk-151tygw9.js:8370-8404 placement
var SANDBOX_IGNOREVIOLATIONS = "sandbox.ignoreViolations";
//@ chunk-151tygw9.js:8404-8716 placement
function schemaKeysOf(e, n) {
  let r = resolveUnionBranch(n, e)?._zod.def;
  if (r?.type === "object" && r.shape) {
    let { shape: shape } = r;
    return Object.keys(e)
      .filter((c) => Object.hasOwn(shape, c))
      .map((c) => [c, shape[c]]);
  }
  let { keyType: keyType, valueType: valueType } = r ?? {};
  if (r?.type === "record" && keyType && valueType && ie(unwrapZodSchema(valueType)))
    return Object.keys(e)
      .filter((o) => keyType.safeParse(o).success)
      .map((o) => [o, valueType]);
  return;
}
//@ chunk-151tygw9.js:8716-8799 placement
var ue = new Set(["sandbox.network.httpProxyPort", "sandbox.network.socksProxyPort"]);
//@ chunk-151tygw9.js:8799-9295 placement = isInBundledMode (0.822)
function telemetrySafeValue(e, n, r, s) {
  switch (typeof e) {
    case "string":
    case "boolean":
      return matchesSchemaType(n, e) ? e : REDACTED_PLACEHOLDER;
    case "number":
      return matchesSchemaType(n, e) && !ue.has(r) ? e : REDACTED_PLACEHOLDER;
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
    let c = re(n, e);
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
var q = 8192;
//@ chunk-151tygw9.js:9306-9527 placement
function safeSettingsContent(e) {
  let n = jsonStringify(telemetrySafeValue(e, getSettingsSchemaForDocument(e), "", ae()));
  if (Buffer.byteLength(n) <= q) return { content: n, truncated: !1 };
  let r = 0,
    s = 0;
  for (let a of n) {
    if (((r += Buffer.byteLength(a)), r > q)) break;
    s += a.length;
  }
  return { content: n.slice(0, s), truncated: !0 };
}
/**
 * 汇总当前生效的托管设置来源与键值（只记录安全的值）用于遥测。
 */
//@ chunk-151tygw9.js:9527-10142 placement
function managedSettingsSummary(e) {
  let { sources: sources, behavior: behavior } = getManagedSourcesInEffect(),
    s = policyHelperConsentState(),
    entry = s.entry,
    o =
      s.state === "none" &&
      entry?.path === void 0 &&
      entry?.script === void 0 &&
      getBasePolicySettingsOrigin() === "remote" &&
      parseRemoteManagedSettings().errors.some((error) =>
        platformSettingsChain().chain.some((L) => error.path === `policyHelpers.${L}`),
      ),
    c = {
      "managed_settings.trigger": e,
      "managed_settings.sources": sources,
      "managed_settings.source_behavior": behavior,
      "managed_settings.helper.state": o ? "entry_invalid" : s.state,
      "managed_settings.helper.applied": s.applied,
    };
  if (entry) {
    if (((c["managed_settings.helper.entry"] = entry.key), entry.path !== void 0))
      c["managed_settings.helper.path"] = entry.path;
    else if (entry.script !== void 0)
      c["managed_settings.helper.script_sha256"] = computeContentHash(entry.script);
  }
  return c;
}
//@ chunk-151tygw9.js:10142-10306 placement
function logEmitFailure(e) {
  let n = e instanceof Error ? e.constructor.name : typeof e;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `managed_settings_resolved emit failed (${n})`,
      "managed_settings_resolved emit failed",
    ),
  );
}
//@ chunk-151tygw9.js:10306-10532 placement
function isManagedSettingsLoggingEnabled() {
  let e = getAppliedGlobalConfigEnv()?.OTEL_LOG_MANAGED_SETTINGS;
  for (let r of getEnabledSettingSources()) {
    if (REPO_DIR_SETTING_SOURCES.has(r)) continue;
    e = filterPolicyPredicateEnv(getSettingsForSource(r)?.env, r).OTEL_LOG_MANAGED_SETTINGS ?? e;
  }
  let n = getLatchedPreSettingsEnvSnapshot();
  return isEnvTruthy(e ?? (n ? n.OTEL_LOG_MANAGED_SETTINGS : env.OTEL_LOG_MANAGED_SETTINGS));
}
//@ chunk-151tygw9.js:10532-10649 placement
function dropHashFields(e, n) {
  if (!n) (delete e["managed_settings.resolved_sha256"], delete e["managed_settings.helper.script_sha256"]);
}
//@ chunk-151tygw9.js:10649-11133 placement
function createManagedSettingsReporter() {
  let e = !1,
    n = null,
    r = (a) => {
      try {
        let o = managedSettingsSummary(a),
          c = getSettingsForSource("policySettings");
        if (c) o["managed_settings.resolved_sha256"] = computeContentHash(jsonStringify(sortKeysDeep(c)));
        let { "managed_settings.trigger": h, ...L } = o,
          I = jsonStringify(L);
        if (I === n) return;
        n = I;
        let M = isManagedSettingsLoggingEnabled();
        if ((dropHashFields(o, M), c && M)) {
          let { content: content, truncated: truncated } = safeSettingsContent(c);
          ((o["managed_settings.settings"] = content),
            (o["managed_settings.settings_truncated"] = truncated));
        }
        logOTelEvent("managed_settings_resolved", o).catch(logEmitFailure);
      } catch (error) {
        logEmitFailure(error);
      }
    },
    subscribe = settingsChangeDetector.subscribe((a) => {
      if (a === "policySettings" && e) r("change");
    });
  return (r("startup"), (e = !0), subscribe);
}
//@ chunk-151tygw9.js:11133-11259 placement
function logManagedSettingsRefused(e) {
  try {
    let n = managedSettingsSummary("refused");
    (dropHashFields(n, isManagedSettingsLoggingEnabled()),
      logOTelEvent("managed_settings_resolved", { ...n, "error.type": e }).catch(logEmitFailure));
  } catch (error) {
    logEmitFailure(error);
  }
}

export { createManagedSettingsReporter, logManagedSettingsRefused };
