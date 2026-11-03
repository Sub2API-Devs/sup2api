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
import { u, pe, o, M, A, oe } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-1rckdhfn.js:332-357 placement
var n = new Set(["hipaa"]);
//@ chunk-1rckdhfn.js:357-1215 placement
class ComplianceTaintState {
  latched = new Set();
  latchedTaints = [];
  taints = [];
  current = [];
  changed = createSignal();
  verdict = void 0;
  replaceTaints(t) {
    this.current = uniq(t).sort();
    for (let r of t) if (n.has(r)) this.latched.add(r);
    if (this.latched.size !== this.latchedTaints.length) this.latchedTaints = Array.from(this.latched).sort();
    return this.refreshEffectiveTaints();
  }
  latchTaints(t) {
    let r = !1;
    for (let i of t) if (n.has(i) && !this.latched.has(i)) (this.latched.add(i), (r = !0));
    if (!r) return !1;
    return ((this.latchedTaints = Array.from(this.latched).sort()), this.refreshEffectiveTaints());
  }
  refreshEffectiveTaints() {
    let sorted = uniq([...this.latchedTaints, ...this.current]).sort();
    if (sorted.length === this.taints.length && sorted.every((r, i) => r === this.taints[i])) return !1;
    return ((this.taints = sorted), this.changed.emit(this.taints), !0);
  }
  registerVerdict(t) {
    this.verdict = t;
  }
  resetForTesting() {
    (this.latched.clear(), (this.latchedTaints = []), (this.taints = []), (this.current = []));
  }
}
//@ chunk-1rckdhfn.js:1215-1238 placement
var a = new HostScoped(() => new ComplianceTaintState());
//@ chunk-1rckdhfn.js:1238-1273 placement
function complianceTaintState() {
  return a.of(getRootSession().host);
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
function isKnownTaint(t) {
  return n.has(t);
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
/**
 * 合规标记显示名（HIPAA、ZDR），未知时记 warn。
 */
//@ chunk-4eww0w8n.js:261-445 placement
function complianceTaintLabel(n) {
  switch (n) {
    case "hipaa":
      return "HIPAA";
    case "zdr":
      return "ZDR (Zero Data Retention)";
    default:
      return (
        logForDebugging(`Unknown compliance_taint '${n}' from policyLimits`, { level: "warn" }),
        ORGANIZATION_POLICY_LABEL
      );
  }
}
/**
 * 组织策略标签、提示文案与已知合规标记集合。
 */
//@ chunk-4eww0w8n.js:445-587 placement
var ORGANIZATION_POLICY_LABEL = "Organization policy",
  POLICY_LIMITED_NOTICE = "Per your organization's policy, some features are limited",
  HIPAA_CONFIGURED_LABEL = "HIPAA configured",
  KNOWN_COMPLIANCE_TAINTS = new Set(["hipaa", "zdr"]);
//@ chunk-4eww0w8n.js:587-623 placement
function MPn(n) {
  return KNOWN_COMPLIANCE_TAINTS.has(n) || !1;
}
/**
 * 去重合规标记，未知值归为“组织策略”。
 */
//@ chunk-4eww0w8n.js:623-807 placement
function normalizeComplianceTaints(n) {
  let e = uniq(n),
    filtered = e.filter(MPn);
  if (filtered.length === e.length) return filtered;
  return (
    logForDebugging(`Unknown compliance_taint values from policyLimits (${e.length - filtered.length})`, {
      level: "warn",
    }),
    [...filtered, ORGANIZATION_POLICY_LABEL]
  );
}
//@ chunk-4eww0w8n.js:807-832 placement
var a_4eww = new Set(["hipaa"]);
//@ chunk-4eww0w8n.js:832-882 placement
function Cle(n) {
  return uniq(n).filter((e) => a_4eww.has(e));
}
/**
 * 是否含控制字符或双向字符。
 */
//@ chunk-55ht3bcx.js:5413-5482 placement
function hasControlChars(e) {
  return /[\u0000-\u001f\u007f-\u009f]/.test(e) || hasDisplayUnsafeChar(e);
}
//@ chunk-55ht3bcx.js:5482-5574 placement
function D(e) {
  let trimmed = truncateToLength(stripInvisibleChars(e, "").toLowerCase(), 64).trim();
  return /^[a-z0-9_-]+$/.test(trimmed) ? trimmed : "";
}
//@ chunk-55ht3bcx.js:5574-5585 placement
var MRt = 16;
/**
 * 响应中被丢弃（非字符串/空/超上限）的合规标记数。
 */
//@ chunk-55ht3bcx.js:5585-5871 placement
function countDroppedComplianceTaints(e) {
  let n = typeof e === "object" && e !== null && "compliance_taints" in e ? e.compliance_taints : void 0;
  if (!Array.isArray(n)) return 0;
  let r = count(n, (l) => typeof l !== "string" || D(l) === ""),
    s = uniq(
      n
        .filter((l) => typeof l === "string")
        .map(D)
        .filter((l) => l.length > 0),
    );
  return r + Math.max(0, s.length - MRt);
}
/**
 * 策略限制响应 schema（restrictions、compliance_taints）。
 */
//@ chunk-55ht3bcx.js:5871-7634 placement
var PolicyLimitsResponseSchema = DoctorLazy(() =>
    u({
      restrictions: pe(o(), u({ allowed: M() })),
      compliance_taints: A(oe())
        .default([])
        .transform((e, n) => {
          let sliced = uniq(
            e
              .filter((s) => typeof s === "string")
              .map(D)
              .filter((s) => s.length > 0),
          ).slice(0, MRt);
          if (e.length > 0 && sliced.length === 0)
            n.addIssue({
              code: "custom",
              message: "compliance_taints had entries but none were well-formed regime names",
            });
          return sliced;
        }),
      monitoring_notice: u({
        text: o()
          .max(500)
          .transform((e) => stripInvisibleChars(e, "", { keepEmojiJoiners: !0 })),
        url: o()
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
      defaults: pe(o(), oe()).default({}).catch({}),
      core_skills: A(o().max(128)).max(256).optional().catch([]),
      artifact_create_notice: u({
        text: o()
          .transform((e) =>
            stripInvisibleChars(truncateToLength(e, 500), " ", { keepEmojiJoiners: !0 })
              .replace(/\s+/g, " ")
              .trim(),
          )
          .pipe(o().min(1)),
      })
        .nullish()
        .catch({ text: "Your organization requires a person to approve each new artifact." }),
    }),
  ),
  R5e = { restrictions: {}, compliance_taints: [], monitoring_notice: null, defaults: {} },
  ebi = [
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
  ],
  tbi = [
    "invalid_request_error",
    "authentication_error",
    "permission_error",
    "not_found_error",
    "rate_limit_error",
  ],
  vur = [
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
  ],
  nbi = [
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
  MPn,
  complianceTaintState,
  R5e,
  replaceComplianceTaints,
  MRt,
  latchComplianceTaints,
  PolicyLimitsResponseSchema,
  getLatchedTaints,
  getCurrentTaints,
  Cle,
  complianceTaintLabel,
  tbi,
  vur,
  ebi,
  isKnownTaint,
  hasControlChars,
  nbi,
};
