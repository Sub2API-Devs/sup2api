/**
 * services/policyLimits/complianceTaints.ts
 *
 * 2.1.316 新增。合规污点标记。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1rckdhfn.js (12), chunk-4eww0w8n.js (6), chunk-55ht3bcx.js (5)
 * attribution: placement 23
 */
import { createSignal } from "../../utils/signal.js";
import { uniq, count } from "../../utils/collections.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasDisplayUnsafeChar } from "../../utils/permissions/approvalPayloadSerialization.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { stripInvisibleChars } from "../../utils/sanitization.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, record, string, M, array, unknown } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-1rckdhfn.js:332-357 placement
/**
 * 合规污点状态判定用的 hipaa 集合。
 */
var HIPAA_TAINTS = new Set(["hipaa"]);
//@ chunk-1rckdhfn.js:357-1215 placement
class ComplianceTaintState {
  latched = new Set();
  latchedTaints = [];
  taints = [];
  current = [];
  changed = createSignal();
  verdict = undefined;
  replaceTaints(t) {
    this.current = uniq(t).sort();
    for (let r of t) if (HIPAA_TAINTS.has(r)) this.latched.add(r);
    if (this.latched.size !== this.latchedTaints.length) this.latchedTaints = Array.from(this.latched).sort();
    return this.refreshEffectiveTaints();
  }
  latchTaints(t) {
    let r = false;
    for (let i of t)
      if (HIPAA_TAINTS.has(i) && !this.latched.has(i)) {
        this.latched.add(i);
        r = true;
      }
    if (!r) return false;
    this.latchedTaints = Array.from(this.latched).sort();
    return this.refreshEffectiveTaints();
  }
  refreshEffectiveTaints() {
    let sorted = uniq([...this.latchedTaints, ...this.current]).sort();
    if (sorted.length === this.taints.length && sorted.every((r, i) => r === this.taints[i])) return false;
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
//@ chunk-1rckdhfn.js:1215-1238 placement
/**
 * 按 host 保存的合规污点状态容器。
 */
var complianceTaintStateSlots = new HostScoped(() => new ComplianceTaintState());
//@ chunk-1rckdhfn.js:1238-1273 placement
function complianceTaintState() {
  return complianceTaintStateSlots.of(getRootSession().host);
}
//@ chunk-1rckdhfn.js:1273-1317 placement
function replaceComplianceTaints(t) {
  return complianceTaintState().replaceTaints(t);
}
//@ chunk-1rckdhfn.js:1317-1359 placement
function latchComplianceTaints(t) {
  return complianceTaintState().latchTaints(t);
}
//@ chunk-1rckdhfn.js:1359-1391 placement
function isKnownTaint(complianceTaint) {
  return HIPAA_TAINTS.has(complianceTaint);
}
//@ chunk-1rckdhfn.js:1391-1436 placement
function hasComplianceTaint(t) {
  return complianceTaintState().taints.includes(t);
}
//@ chunk-1rckdhfn.js:1436-1468 placement
function getComplianceTaints() {
  return complianceTaintState().taints;
}
//@ chunk-1rckdhfn.js:1468-1502 placement
function getCurrentTaints() {
  return complianceTaintState().current;
}
//@ chunk-1rckdhfn.js:1502-1542 placement
function getLatchedTaints() {
  return complianceTaintState().latchedTaints;
}
//@ chunk-1rckdhfn.js:1542-1589 placement
function onComplianceTaintsChanged(t) {
  return complianceTaintState().changed.subscribe(t);
}
//@ chunk-4eww0w8n.js:261-445 placement
/**
 * 合规标记显示名（HIPAA、ZDR），未知时记 warn。
 */
function complianceTaintLabel(n) {
  switch (n) {
    case "hipaa":
      return "HIPAA";
    case "zdr":
      return "ZDR (Zero Data Retention)";
    default:
      logForDebugging(`Unknown compliance_taint '${n}' from policyLimits`, {
        level: "warn",
      });
      return ORGANIZATION_POLICY_LABEL;
  }
}
//@ chunk-4eww0w8n.js:445-587 placement
/**
 * 组织策略标签、提示文案与已知合规标记集合。
 */
var ORGANIZATION_POLICY_LABEL = "Organization policy";
var POLICY_LIMITED_NOTICE = "Per your organization's policy, some features are limited";
var HIPAA_CONFIGURED_LABEL = "HIPAA configured";
var KNOWN_COMPLIANCE_TAINTS = new Set(["hipaa", "zdr"]);
//@ chunk-4eww0w8n.js:587-623 placement
/**
 * 判断是否属于已知合规污点（hipaa/zdr）。
 */
function isKnownComplianceTaint(n) {
  return KNOWN_COMPLIANCE_TAINTS.has(n) || false;
}
//@ chunk-4eww0w8n.js:623-807 placement
/**
 * 去重合规标记，未知值归为“组织策略”。
 */
function normalizeComplianceTaints(complianceTaints) {
  let e = uniq(complianceTaints);
  let filtered = e.filter(isKnownComplianceTaint);
  if (filtered.length === e.length) return filtered;
  logForDebugging(`Unknown compliance_taint values from policyLimits (${e.length - filtered.length})`, {
    level: "warn",
  });
  return [...filtered, ORGANIZATION_POLICY_LABEL];
}
//@ chunk-4eww0w8n.js:807-832 placement
/**
 * 只含 hipaa 的污点集合（用于「HIPAA 未配置」这类判定）。
 */
var HIPAA_ONLY_TAINTS = new Set(["hipaa"]);
//@ chunk-4eww0w8n.js:832-882 placement
/**
 * 去重后只保留 hipaa 污点。
 */
function hipaaTaintsOnly(n) {
  return uniq(n).filter((e) => HIPAA_ONLY_TAINTS.has(e));
}
//@ chunk-55ht3bcx.js:5413-5482 placement
/**
 * 是否含控制字符或双向字符。
 */
function hasControlChars(e) {
  return /[\u0000-\u001f\u007f-\u009f]/.test(e) || hasDisplayUnsafeChar(e);
}
//@ chunk-55ht3bcx.js:5482-5574 placement
/**
 * 规范化制度名：去不可见字符、转小写、截断到 64 并只留合法字符。
 */
function normalizeRegimeName(e) {
  let trimmed = truncateToLength(stripInvisibleChars(e, "").toLowerCase(), 64).trim();
  return /^[a-z0-9_-]+$/.test(trimmed) ? trimmed : "";
}
//@ chunk-55ht3bcx.js:5574-5585 placement
/**
 * 合规污点记录的最大条数。
 */
var MAX_COMPLIANCE_TAINTS = 16;
//@ chunk-55ht3bcx.js:5585-5871 placement
/**
 * 响应中被丢弃（非字符串/空/超上限）的合规标记数。
 */
function countDroppedComplianceTaints(e) {
  let complianceTaints =
    typeof e === "object" && e !== null && "compliance_taints" in e ? e.compliance_taints : undefined;
  if (!Array.isArray(complianceTaints)) return 0;
  let r = count(complianceTaints, (l) => typeof l !== "string" || normalizeRegimeName(l) === "");
  let s = uniq(
    complianceTaints
      .filter((complianceTaint) => typeof complianceTaint === "string")
      .map(normalizeRegimeName)
      .filter((l) => l.length > 0),
  );
  return r + Math.max(0, s.length - MAX_COMPLIANCE_TAINTS);
}
//@ chunk-55ht3bcx.js:5871-7634 placement
/**
 * 策略限制响应 schema（restrictions、compliance_taints）。
 */
var PolicyLimitsResponseSchema = DoctorLazy(() =>
  u({
    restrictions: record(
      string(),
      u({
        allowed: M(),
      }),
    ),
    compliance_taints: array(unknown())
      .default([])
      .transform((e, n) => {
        let sliced = uniq(
          e
            .filter((s) => typeof s === "string")
            .map(normalizeRegimeName)
            .filter((s) => s.length > 0),
        ).slice(0, MAX_COMPLIANCE_TAINTS);
        if (e.length > 0 && sliced.length === 0)
          n.addIssue({
            code: "custom",
            message: "compliance_taints had entries but none were well-formed regime names",
          });
        return sliced;
      }),
    monitoring_notice: u({
      text: string()
        .max(500)
        .transform((e) =>
          stripInvisibleChars(e, "", {
            keepEmojiJoiners: true,
          }),
        ),
      url: string()
        .max(2048)
        .url()
        .startsWith("https://")
        .refine((e) => !hasControlChars(e))
        .nullish()
        .catch(null),
    })
      .nullable()
      .default(null)
      .catch(null),
    defaults: record(string(), unknown()).default({}).catch({}),
    core_skills: array(string().max(128)).max(256).optional().catch([]),
    artifact_create_notice: u({
      text: string()
        .transform((e) =>
          stripInvisibleChars(truncateToLength(e, 500), " ", {
            keepEmojiJoiners: true,
          })
            .replace(/\s+/g, " ")
            .trim(),
        )
        .pipe(string().min(1)),
    })
      .nullish()
      .catch({
        text: "Your organization requires a person to approve each new artifact.",
      }),
  }),
);
var EMPTY_POLICY_RESPONSE = {
  restrictions: {},
  compliance_taints: [],
  monitoring_notice: null,
  defaults: {},
};
var CACHE_IO_ERRNOS = [
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
var SERVER_ERROR_TYPES = [
  "invalid_request_error",
  "authentication_error",
  "permission_error",
  "not_found_error",
  "rate_limit_error",
];
var POLICY_AUTH_DENIAL_CODES = [
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
var POLICY_TOKEN_DENIAL_CODES = [
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
export {
  onComplianceTaintsChanged,
  hasComplianceTaint,
  POLICY_LIMITED_NOTICE,
  HIPAA_CONFIGURED_LABEL,
  countDroppedComplianceTaints,
  getComplianceTaints,
  normalizeComplianceTaints,
  isKnownComplianceTaint,
  hasControlChars,
  complianceTaintState,
  EMPTY_POLICY_RESPONSE,
  replaceComplianceTaints,
  MAX_COMPLIANCE_TAINTS,
  latchComplianceTaints,
  PolicyLimitsResponseSchema,
  getLatchedTaints,
  getCurrentTaints,
  hipaaTaintsOnly,
  complianceTaintLabel,
  SERVER_ERROR_TYPES,
  POLICY_AUTH_DENIAL_CODES,
  CACHE_IO_ERRNOS,
  isKnownTaint,
  POLICY_TOKEN_DENIAL_CODES,
};
