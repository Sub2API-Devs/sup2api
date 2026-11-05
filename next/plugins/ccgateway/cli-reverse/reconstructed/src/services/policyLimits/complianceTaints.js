/**
 * services/policyLimits/complianceTaints.ts
 *
 * 2.1.316 新增。合规污点标记。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0nvx3515.js (5), chunk-f3md3zsc.js (12), chunk-rn8k2fjf.js (6)
 * attribution: placement 23
 */
import { createSignal } from "../../utils/signal.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasDisplayUnsafeChar } from "../../utils/permissions/approvalPayloadSerialization.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { stripInvisibleChars } from "../../utils/sanitization.js";
import { countWhere } from "../../utils/collections.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  record,
  stringSchema,
  booleanSchema,
  array,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-f3md3zsc.js:332-357 placement
/**
 * 合规污点状态判定用的 hipaa 集合。
 */
var HIPAA_TAINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-f3md3zsc.js:332", () => {
  HIPAA_TAINTS = new Set(["hipaa"]);
});
//@ chunk-f3md3zsc.js:357-1215 placement
class ComplianceTaintState {
  latched = new Set();
  latchedTaints = [];
  taints = [];
  current = [];
  changed = createSignal();
  verdict = undefined;
  replaceTaints(taints) {
    this.current = normalizeCaseForComparison_2(taints).sort();
    for (let taint of taints) if (HIPAA_TAINTS.has(taint)) this.latched.add(taint);
    if (this.latched.size !== this.latchedTaints.length) this.latchedTaints = Array.from(this.latched).sort();
    return this.refreshEffectiveTaints();
  }
  latchTaints(taints) {
    let changed = false;
    for (let taint of taints)
      if (HIPAA_TAINTS.has(taint) && !this.latched.has(taint)) {
        this.latched.add(taint);
        changed = true;
      }
    if (!changed) return false;
    this.latchedTaints = Array.from(this.latched).sort();
    return this.refreshEffectiveTaints();
  }
  refreshEffectiveTaints() {
    let sorted = normalizeCaseForComparison_2([...this.latchedTaints, ...this.current]).sort();
    if (sorted.length === this.taints.length && sorted.every((taint, index) => taint === this.taints[index]))
      return false;
    this.taints = sorted;
    this.changed.emit(this.taints);
    return true;
  }
  registerVerdict(verdict) {
    this.verdict = verdict;
  }
  resetForTesting() {
    this.latched.clear();
    this.latchedTaints = [];
    this.taints = [];
    this.current = [];
  }
}
//@ chunk-f3md3zsc.js:1215-1238 placement
/**
 * 按 host 保存的合规污点状态容器。
 */
var complianceTaintStateSlots; // deferred: uses ComplianceTaintState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-f3md3zsc.js:1215", () => {
  complianceTaintStateSlots = new HostScoped(() => new ComplianceTaintState());
});
//@ chunk-f3md3zsc.js:1238-1273 placement
function complianceTaintState() {
  return complianceTaintStateSlots.of(getRootSession().host);
}
//@ chunk-f3md3zsc.js:1273-1317 placement
function replaceComplianceTaints(taints) {
  return complianceTaintState().replaceTaints(taints);
}
//@ chunk-f3md3zsc.js:1317-1359 placement
function latchComplianceTaints(taints) {
  return complianceTaintState().latchTaints(taints);
}
//@ chunk-f3md3zsc.js:1359-1391 placement
function isKnownTaint(complianceTaint) {
  return HIPAA_TAINTS.has(complianceTaint);
}
//@ chunk-f3md3zsc.js:1391-1436 placement
function hasComplianceTaint(taint) {
  return complianceTaintState().taints.includes(taint);
}
//@ chunk-f3md3zsc.js:1436-1468 placement
function getComplianceTaints() {
  return complianceTaintState().taints;
}
//@ chunk-f3md3zsc.js:1468-1502 placement
function getCurrentTaints() {
  return complianceTaintState().current;
}
//@ chunk-f3md3zsc.js:1502-1542 placement
function getLatchedTaints() {
  return complianceTaintState().latchedTaints;
}
//@ chunk-f3md3zsc.js:1542-1589 placement
function onComplianceTaintsChanged(listener) {
  return complianceTaintState().changed.subscribe(listener);
}
//@ chunk-rn8k2fjf.js:261-445 placement
/**
 * 合规标记显示名（HIPAA、ZDR），未知时记 warn。
 */
function complianceTaintLabel(taint) {
  switch (taint) {
    case "hipaa":
      return "HIPAA";
    case "zdr":
      return "ZDR (Zero Data Retention)";
    default:
      logForDebugging(`Unknown compliance_taint '${taint}' from policyLimits`, {
        level: "warn",
      });
      return ORGANIZATION_POLICY_LABEL;
  }
}
//@ chunk-rn8k2fjf.js:445-587 placement
/**
 * 组织策略标签、提示文案与已知合规标记集合。
 */
var ORGANIZATION_POLICY_LABEL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var POLICY_LIMITED_NOTICE;
var HIPAA_CONFIGURED_LABEL;
var KNOWN_COMPLIANCE_TAINTS;
deferInit("chunk-rn8k2fjf.js:445", () => {
  ORGANIZATION_POLICY_LABEL = "Organization policy";
  POLICY_LIMITED_NOTICE = "Per your organization's policy, some features are limited";
  HIPAA_CONFIGURED_LABEL = "HIPAA configured";
  KNOWN_COMPLIANCE_TAINTS = new Set(["hipaa", "zdr"]);
});
//@ chunk-rn8k2fjf.js:587-623 placement
/**
 * 判断是否属于已知合规污点（hipaa/zdr）。
 */
function isKnownComplianceTaint(taint) {
  return KNOWN_COMPLIANCE_TAINTS.has(taint) || false;
}
//@ chunk-rn8k2fjf.js:623-807 placement
/**
 * 去重合规标记，未知值归为“组织策略”。
 */
function normalizeComplianceTaints(complianceTaints) {
  let unique = normalizeCaseForComparison_2(complianceTaints);
  let filtered = unique.filter(isKnownComplianceTaint);
  if (filtered.length === unique.length) return filtered;
  logForDebugging(`Unknown compliance_taint values from policyLimits (${unique.length - filtered.length})`, {
    level: "warn",
  });
  return [...filtered, ORGANIZATION_POLICY_LABEL];
}
//@ chunk-rn8k2fjf.js:807-832 placement
/**
 * 只含 hipaa 的污点集合（用于「HIPAA 未配置」这类判定）。
 */
var HIPAA_ONLY_TAINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rn8k2fjf.js:807", () => {
  HIPAA_ONLY_TAINTS = new Set(["hipaa"]);
});
//@ chunk-rn8k2fjf.js:832-882 placement
/**
 * 去重后只保留 hipaa 污点。
 */
function hipaaTaintsOnly(taints) {
  return normalizeCaseForComparison_2(taints).filter((taint) => HIPAA_ONLY_TAINTS.has(taint));
}
//@ chunk-0nvx3515.js:5449-5518 placement
/**
 * 是否含控制字符或双向字符。
 */
function hasControlChars(text) {
  return /[\u0000-\u001f\u007f-\u009f]/.test(text) || hasDisplayUnsafeChar(text);
}
//@ chunk-0nvx3515.js:5518-5609 placement
/**
 * 规范化制度名：去不可见字符、转小写、截断到 64 并只留合法字符。
 */
function normalizeRegimeName(name) {
  let trimmed = truncateToLength(stripInvisibleChars(name, "").toLowerCase(), 64).trim();
  return /^[a-z0-9_-]+$/.test(trimmed) ? trimmed : "";
}
//@ chunk-0nvx3515.js:5609-5620 placement
/**
 * 合规污点记录的最大条数。
 */
var MAX_COMPLIANCE_TAINTS = 16;
//@ chunk-0nvx3515.js:5620-5906 placement
/**
 * 响应中被丢弃（非字符串/空/超上限）的合规标记数。
 */
function countDroppedComplianceTaints(body) {
  let complianceTaints =
    typeof body === "object" && body !== null && "compliance_taints" in body
      ? body.compliance_taints
      : undefined;
  if (!Array.isArray(complianceTaints)) return 0;
  let invalidCount = countWhere(
    complianceTaints,
    (entry) => typeof entry !== "string" || normalizeRegimeName(entry) === "",
  );
  let normalized = normalizeCaseForComparison_2(
    complianceTaints
      .filter((complianceTaint) => typeof complianceTaint === "string")
      .map(normalizeRegimeName)
      .filter((name) => name.length > 0),
  );
  return invalidCount + Math.max(0, normalized.length - MAX_COMPLIANCE_TAINTS);
}
//@ chunk-0nvx3515.js:5906-7668 placement
/**
 * 策略限制响应 schema（restrictions、compliance_taints）。
 */
var PolicyLimitsResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var EMPTY_POLICY_RESPONSE;
var CACHE_IO_ERRNOS;
var SERVER_ERROR_TYPES;
var POLICY_AUTH_DENIAL_CODES;
var POLICY_TOKEN_DENIAL_CODES;
deferInit("chunk-0nvx3515.js:5906", () => {
  PolicyLimitsResponseSchema = DoctorLazy(() =>
    objectSchema({
      restrictions: record(
        stringSchema(),
        objectSchema({
          allowed: booleanSchema(),
        }),
      ),
      compliance_taints: array(unknown())
        .default([])
        .transform((entries, ctx) => {
          let sliced = normalizeCaseForComparison_2(
            entries
              .filter((entry) => typeof entry === "string")
              .map(normalizeRegimeName)
              .filter((name) => name.length > 0),
          ).slice(0, MAX_COMPLIANCE_TAINTS);
          if (entries.length > 0 && sliced.length === 0)
            ctx.addIssue({
              code: "custom",
              message: "compliance_taints had entries but none were well-formed regime names",
            });
          return sliced;
        }),
      monitoring_notice: objectSchema({
        text: stringSchema()
          .max(500)
          .transform((text) =>
            stripInvisibleChars(text, "", {
              keepEmojiJoiners: true,
            }),
          ),
        url: stringSchema()
          .max(2048)
          .url()
          .startsWith("https://")
          .refine((url) => !hasControlChars(url))
          .nullish()
          .catch(null),
      })
        .nullable()
        .default(null)
        .catch(null),
      defaults: record(stringSchema(), unknown()).default({}).catch({}),
      core_skills: array(stringSchema().max(128)).max(256).optional().catch([]),
      artifact_create_notice: objectSchema({
        text: stringSchema()
          .transform((text) =>
            stripInvisibleChars(truncateToLength(text, 500), " ", {
              keepEmojiJoiners: true,
            })
              .replace(/\s+/g, " ")
              .trim(),
          )
          .pipe(stringSchema().min(1)),
      })
        .nullish()
        .catch({
          text: "Your organization requires a person to approve each new artifact.",
        }),
    }),
  );
  EMPTY_POLICY_RESPONSE = {
    restrictions: {},
    compliance_taints: [],
    monitoring_notice: null,
    defaults: {},
  };
  CACHE_IO_ERRNOS = [
    "ENOTFOUND",
    "EAI_AGAIN",
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "EPIPE",
    "CERT_ERROR",
    "ABORTED",
    "OTHER",
  ];
  SERVER_ERROR_TYPES = [
    "invalid_request_error",
    "authentication_error",
    "permission_error",
    "not_found_error",
    "rate_limit_error",
  ];
  POLICY_AUTH_DENIAL_CODES = [
    "ip_not_in_allowed_range",
    "claude_code_key_creator_not_member",
    "organization_disabled",
    "organization_on_hold",
    "restricted_regime_endpoint",
    "oauth_not_allowed_for_organization",
    "oauth_scope_insufficient",
    "token_expired",
    "oauth_application_deactivated",
    "oauth_token_no_organization",
    "oauth_token_no_account",
    "oauth_account_not_member",
  ];
  POLICY_TOKEN_DENIAL_CODES = [
    "token_expired",
    "token_revoked",
    "token_invalid",
    "credential_invalid",
    "org_access_revoked",
    "workspace_revoked",
    "application_deactivated",
    "token_no_organization",
    "token_no_account",
    "account_not_member",
  ];
});
export {
  hasComplianceTaint,
  EMPTY_POLICY_RESPONSE,
  replaceComplianceTaints,
  MAX_COMPLIANCE_TAINTS,
  latchComplianceTaints,
  PolicyLimitsResponseSchema,
  getLatchedTaints,
  getCurrentTaints,
  hipaaTaintsOnly,
  getComplianceTaints,
  onComplianceTaintsChanged,
  complianceTaintState,
  SERVER_ERROR_TYPES,
  POLICY_AUTH_DENIAL_CODES,
  countDroppedComplianceTaints,
  POLICY_TOKEN_DENIAL_CODES,
  POLICY_LIMITED_NOTICE,
  HIPAA_CONFIGURED_LABEL,
  normalizeComplianceTaints,
  isKnownComplianceTaint,
  hasControlChars,
  complianceTaintLabel,
  CACHE_IO_ERRNOS,
  isKnownTaint,
};
