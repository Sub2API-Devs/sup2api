/**
 * services/analytics/metadataSanitizers.ts
 *
 * 2.1.316 新增：元数据字段校验器（布尔、日期、正则、枚举、组合）；按校验器表过滤对象字段（未知字符串替换为占位）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (3)
 * attribution: placement 3
 */
import { decodeTaggedUuid } from "../mcp/serverIdentity.js";
import { ENTRYPOINT_KINDS } from "../../utils/entrypointKinds.js";
import { isKnownModelName } from "../../utils/model/knownModelNames.js";
import { ALL_TELEMETRY_CODES, keys, keys_2 } from "./telemetryCodes.js";
import {
  KR,
  GR,
  ALLOW_CODE_RE,
  ORG_DENIAL_REASONS,
  AUTH_SURFACES,
  SETTINGS_FETCH_OUTCOMES,
  SIGNED_DOCUMENT_KINDS,
  BR,
} from "./authOutcomeTelemetry.js";

/**
 * 元数据字段校验器（布尔、日期、正则、枚举、组合）。
 */
//@ chunk-aepeg2w5.js:740083-745386 placement
var isBoolean = (e) => typeof e === "boolean",
  lx = (e) => e instanceof Date && !Number.isNaN(e.getTime()),
  sn = (e) => (n) => typeof n === "string" && e.test(n),
  we = (...e) => {
    let n;
    return (r) => typeof r === "string" && (n ??= new Set(e)).has(r);
  },
  Vl =
    (...e) =>
    (n) =>
      e.some((r) => r(n)),
  xz = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  Oz = /^[A-Za-z][A-Za-z0-9_]{0,127}$/,
  Pz = /^(session|cse)(_(local|staging))?_01[1-9A-HJ-NP-Za-km-z]{22}$/,
  jR = (e) => typeof e === "string" && Pz.test(e) && decodeTaggedUuid(e) !== void 0,
  Mz = /^[0-9a-f]{64}$/,
  dx = /^\d{1,4}\.\d{1,4}\.\d{1,6}(-(dev|alpha|beta|rc)(\.\d{1,10}){0,2})?(\+[0-9a-f]{1,12})?$/,
  VR = /^\d{1,4}\.\d{1,4}\.\d{1,6}(-(dev|alpha|beta|rc))?$/,
  fr = sn(xz),
  Iz = [
    "cli",
    "remote",
    "github-action",
    "sdk-typescript",
    "sdk-python",
    "sdk-cli",
    "claude-vscode",
    "local-agent",
    "claude-desktop",
  ],
  cx = [
    "darwin",
    "linux",
    "win32",
    "freebsd",
    "openbsd",
    "netbsd",
    "android",
    "aix",
    "sunos",
    "cygwin",
    "haiku",
    "macos",
    "windows",
    "wsl",
    "unknown",
  ],
  fx = [
    "arm",
    "arm64",
    "ia32",
    "loong64",
    "mips",
    "mipsel",
    "ppc",
    "ppc64",
    "riscv64",
    "s390",
    "s390x",
    "x64",
  ],
  px = we(...Object.keys(ENTRYPOINT_KINDS), "other"),
  mx = (e) => typeof e === "string" && (e === "nonconforming" || isKnownModelName(e)),
  nt = {
    event_name: sn(Oz),
    event_id: fr,
    client_timestamp: lx,
    session_id: Vl(fr, jR),
    parent_session_id: Vl(fr, jR),
    device_id: sn(Mz),
    user_type: we("ant", "external"),
    client_type: we(...Iz),
    agent_type: we("teammate", "subagent", "standalone"),
    is_interactive: isBoolean,
    entrypoint: px,
    model: mx,
  },
  fs = { version: sn(dx), platform: we(...cx), arch: we(...fx) },
  cs = { organization_uuid: fr, account_uuid: fr },
  keys_3 = Object.keys(nt),
  Dz = ["sample_rate"],
  Pt = (e) => typeof e === "number" && Number.isInteger(e) && e >= 0 && e < 2147483648,
  as = (e) => typeof e === "number" && Number.isSafeInteger(e) && e >= 0,
  Br = (e) => typeof e === "number" && Number.isFinite(e) && e >= 0,
  Nz = (e) => typeof e === "number" && Number.isInteger(e) && e >= 100 && e <= 599,
  Fz = {
    diskless: !0,
    user_source_disabled: !0,
    settings_unknowable: !0,
    settings_invalid_key_set: !0,
    remote_settings_unknowable: !0,
  },
  Lz = { load_failed: !0, load_owed: !0, load_running: !0, unanswered: !0 },
  Uz = { no: !0, relative_config_home: !0, settings_moved: !0, inside_tree: !0, shared_directory: !0 },
  YR = { pass: !0, pass_cached: !0, pass_exempt: !0, blocked: !0, refused: !0 },
  Lo = {
    ok: !0,
    none_configured: !0,
    refused_credential: !0,
    refused_not_entitled: !0,
    refused_other: !0,
    blocked_by_intermediary: !0,
    unavailable_timeout: !0,
    unavailable_connect: !0,
    unavailable_server: !0,
    unavailable_rate_limited: !0,
    unavailable_credential_refresh: !0,
    unavailable_pending: !0,
    unavailable_settings_unusable: !0,
    client_no_credentials: !0,
    client_error: !0,
    not_attempted: !0,
    not_required: !0,
  },
  qR = { policy: !0, settings: !0 },
  XR = { login: !0, startup: !0, noninteractive: !0 },
  Hz = { both_resolved: !0, first_prompt: !0, exit: !0, settled: !0 },
  Bz = { passed: !0, quit: !0, sign_in: !0, exit: !0, failed: !0 },
  JR = {
    flag_off: !0,
    rollout_percent: !0,
    provider: !0,
    base_url: !0,
    auth_command: !0,
    credential_shape: !0,
    tier_unknown: !0,
    tier_not_in_plans: !0,
    host_token: !0,
  },
  Kz = {
    stored_login: !0,
    untiered_login: !0,
    api_key: !0,
    env_token_only: !0,
    key_helper_only: !0,
    none: !0,
  },
  QR = { override: !0, payload: !0, disk: !0, disabled: !0, fallback: !0 },
  ZR = { max: !0, pro: !0, team: !0, enterprise: !0 },
  Gz = we(...ALL_TELEMETRY_CODES),
  cg = { feature_name: Gz },
  ex = { stored_copy: we(...KR), stored_copy_gate: we(...GR) },
  tx = {
    tengu_retention_sweep: {
      phase: we("start", "complete"),
      skipped: isBoolean,
      skipReason: we(...Object.keys(Fz)),
      usedDefault: isBoolean,
      periodDays: as,
      transcriptsDeleted: Pt,
      transcriptsExemptedDesktop: Pt,
      sessionFilesDeleted: Pt,
      artifactsDeleted: Pt,
      filesRetainedFresh: Pt,
      filesPastCutoff: Pt,
      historyEntriesPruned: Pt,
      errors: Pt,
      seedAdminRemoved: Pt,
      seedAdminErrors: Pt,
      seedAdminHeld: Pt,
      seedAdminRefused: we(...Object.keys(Uz)),
      hooksUnasked: we(...Object.keys(Lz)),
    },
    tengu_feature_ok: cg,
    tengu_feature_bad: cg,
    tengu_feature_sad: cg,
    tengu_org_policy_denied: {
      org_policy_key: sn(ALLOW_CODE_RE),
      org_policy_deny_kind: we(...ORG_DENIAL_REASONS),
      org_policy_taint_named: isBoolean,
      surface: we(...AUTH_SURFACES),
    },
    tengu_policy_limits_fetch: {
      success: isBoolean,
      is_load: isBoolean,
      restrictions_denied_count: Pt,
      compliance_taint_count: Pt,
      outcome_reason: we(...SETTINGS_FETCH_OUTCOMES),
      ...ex,
    },
    tengu_remote_settings_fetch: {
      success: isBoolean,
      is_load: isBoolean,
      outcome_reason: we(...SETTINGS_FETCH_OUTCOMES),
      ...ex,
    },
    tengu_signed_cache_shadow: { cache: we(...SIGNED_DOCUMENT_KINDS), result: we(...BR) },
    tengu_frontmatter_grant_withheld: { origin: we(...keys), tool_count: Pt, reason: we(...keys_2) },
    tengu_org_config_gate_shadow: {
      decision: we(...Object.keys(YR)),
      decision_reason: we(...Object.keys(Lo)),
      decision_resource: we(...Object.keys(qR)),
      surface: we(...Object.keys(XR)),
      blocked_ms: Pt,
      candidate_if_armed: isBoolean,
      exclusion_if_armed: we(...Object.keys(JR)),
      candidate_now: isBoolean,
      exclusion_now: we(...Object.keys(JR)),
      flag_enabled: isBoolean,
      flag_source: we(...Object.keys(QR)),
      flag_percent: Br,
      grace_ttl_hours: Br,
      tier: we(...Object.keys(ZR)),
      credential_shape: we(...Object.keys(Kz)),
      policy_reason: we(...Object.keys(Lo)),
      policy_has_cache: isBoolean,
      policy_cache_age_ms: as,
      settings_reason: we(...Object.keys(Lo)),
      settings_has_cache: isBoolean,
      settings_cache_age_ms: as,
      shadow_trigger: we(...Object.keys(Hz)),
    },
    tengu_org_config_gate: {
      decision: we(...Object.keys(YR)),
      decision_reason: we(...Object.keys(Lo)),
      decision_resource: we(...Object.keys(qR)),
      surface: we(...Object.keys(XR)),
      blocked_ms: Br,
      attempt: Pt,
      decided_without_waiting: isBoolean,
      final_outcome: we(...Object.keys(Bz)),
      recovered_after_ms: Br,
      tier: we(...Object.keys(ZR)),
      flag_source: we(...Object.keys(QR)),
      flag_percent: Br,
      grace_ttl_hours: Br,
      budget_ms: Br,
      policy_reason: we(...Object.keys(Lo)),
      policy_has_cache: isBoolean,
      policy_cache_age_ms: as,
      settings_reason: we(...Object.keys(Lo)),
      settings_has_cache: isBoolean,
      settings_cache_age_ms: as,
      http_status: Nz,
    },
  },
  HIPAA_REDACTED = "hipaa_redacted";
/**
 * 按校验器表过滤对象字段（未知字符串替换为占位）。
 */
//@ chunk-aepeg2w5.js:745386-745712 placement
function sanitizeFields(e, n) {
  let r = {};
  if (!e) return r;
  for (let s of Object.keys(e)) {
    let h = e[s];
    if (h === void 0 || h === "" || (Array.isArray(h) && h.length === 0)) continue;
    let y = Object.hasOwn(n, s) ? n[s] : void 0;
    if (y !== void 0) {
      if (y(h)) r[s] = h;
    } else if (typeof h === "string") r[s] = HIPAA_REDACTED;
    else if (Array.isArray(h) && h.every((S) => typeof S === "string")) r[s] = [HIPAA_REDACTED];
  }
  return r;
}
/**
 * 按校验器表清洗事件元数据（顶层、env、auth）。
 */
//@ chunk-aepeg2w5.js:745712-745825 placement
function sanitizeEventMetadata(e) {
  return {
    ...sanitizeFields(e, nt),
    env: sanitizeFields(e.env, fs),
    auth: sanitizeFields(e.auth, cs),
    additional_metadata: e.additional_metadata,
  };
}

export {
  sanitizeEventMetadata,
  fr,
  sn,
  lx,
  we,
  sanitizeFields,
  Dz,
  tx,
  Vl,
  isBoolean,
  nt,
  fs,
  cs,
  VR,
  dx,
  cx,
  fx,
  px,
  mx,
  HIPAA_REDACTED,
};
