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
  SIGNATURE_TRUST_STATES,
  ENFORCEMENT_MODES,
  ALLOW_CODE_RE,
  ORG_DENIAL_REASONS,
  AUTH_SURFACES,
  SETTINGS_FETCH_OUTCOMES,
  SIGNED_DOCUMENT_KINDS,
  SIGNATURE_VERIFY_RESULTS,
} from "./authOutcomeTelemetry.js";

//@ chunk-aepeg2w5.js:740083-745386 placement
/**
 * 元数据字段校验器（布尔、日期、正则、枚举、组合）。
 */
var isBoolean = (e) => typeof e === "boolean";
var isDateValidator = (e) => e instanceof Date && !Number.isNaN(e.getTime());
var regexValidator = (e) => (n) => typeof n === "string" && e.test(n);
var oneOfValidator = (...e) => {
  let n;
  return (r) => typeof r === "string" && (n ??= new Set(e)).has(r);
};
var anyOfValidators =
  (...e) =>
  (n) =>
    e.some((r) => r(n));
var UUID_HEX_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var EVENT_NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,127}$/;
var TAGGED_SESSION_ID_RE = /^(session|cse)(_(local|staging))?_01[1-9A-HJ-NP-Za-km-z]{22}$/;
var isTaggedSessionId = (e) =>
  typeof e === "string" && TAGGED_SESSION_ID_RE.test(e) && decodeTaggedUuid(e) !== undefined;
var SHA256_HEX_RE = /^[0-9a-f]{64}$/;
var SEMVER_WITH_PRERELEASE_RE =
  /^\d{1,4}\.\d{1,4}\.\d{1,6}(-(dev|alpha|beta|rc)(\.\d{1,10}){0,2})?(\+[0-9a-f]{1,12})?$/;
var SEMVER_PLAIN_RE = /^\d{1,4}\.\d{1,4}\.\d{1,6}(-(dev|alpha|beta|rc))?$/;
var isUuid = regexValidator(UUID_HEX_RE);
var CLIENT_TYPES = [
  "cli",
  "remote",
  "github-action",
  "sdk-typescript",
  "sdk-python",
  "sdk-cli",
  "claude-vscode",
  "local-agent",
  "claude-desktop",
];
var PLATFORM_NAMES = [
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
];
var ARCH_NAMES = [
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
];
var ENTRYPOINT_VALIDATOR = oneOfValidator(...Object.keys(ENTRYPOINT_KINDS), "other");
var isKnownModelOrNonconforming = (e) =>
  typeof e === "string" && (e === "nonconforming" || isKnownModelName(e));
var TOP_LEVEL_FIELD_VALIDATORS = {
  event_name: regexValidator(EVENT_NAME_RE),
  event_id: isUuid,
  client_timestamp: isDateValidator,
  session_id: anyOfValidators(isUuid, isTaggedSessionId),
  parent_session_id: anyOfValidators(isUuid, isTaggedSessionId),
  device_id: regexValidator(SHA256_HEX_RE),
  user_type: oneOfValidator("ant", "external"),
  client_type: oneOfValidator(...CLIENT_TYPES),
  agent_type: oneOfValidator("teammate", "subagent", "standalone"),
  is_interactive: isBoolean,
  entrypoint: ENTRYPOINT_VALIDATOR,
  model: isKnownModelOrNonconforming,
};
var ENV_FIELD_VALIDATORS = {
  version: regexValidator(SEMVER_WITH_PRERELEASE_RE),
  platform: oneOfValidator(...PLATFORM_NAMES),
  arch: oneOfValidator(...ARCH_NAMES),
};
var AUTH_FIELD_VALIDATORS = {
  organization_uuid: isUuid,
  account_uuid: isUuid,
};
var keys_3 = Object.keys(TOP_LEVEL_FIELD_VALIDATORS);
var SAMPLE_RATE_FIELDS = ["sample_rate"];
var nonNegativeInt32Validator = (e) =>
  typeof e === "number" && Number.isInteger(e) && e >= 0 && e < 2147483648;
var nonNegativeSafeIntValidator = (e) => typeof e === "number" && Number.isSafeInteger(e) && e >= 0;
var nonNegativeFiniteValidator = (e) => typeof e === "number" && Number.isFinite(e) && e >= 0;
var httpStatusValidator = (e) => typeof e === "number" && Number.isInteger(e) && e >= 100 && e <= 599;
var SWEEP_SKIP_REASONS = {
  diskless: true,
  user_source_disabled: true,
  settings_unknowable: true,
  settings_invalid_key_set: true,
  remote_settings_unknowable: true,
};
var UNANSWERED_HOOK_STATES = {
  load_failed: true,
  load_owed: true,
  load_running: true,
  unanswered: true,
};
var EXEMPTED_SETTINGS_REASONS = {
  no: true,
  relative_config_home: true,
  settings_moved: true,
  inside_tree: true,
  shared_directory: true,
};
var GATE_DECISIONS = {
  pass: true,
  pass_cached: true,
  pass_exempt: true,
  blocked: true,
  refused: true,
};
var GATE_DECISION_REASONS = {
  ok: true,
  none_configured: true,
  refused_credential: true,
  refused_not_entitled: true,
  refused_other: true,
  blocked_by_intermediary: true,
  unavailable_timeout: true,
  unavailable_connect: true,
  unavailable_server: true,
  unavailable_rate_limited: true,
  unavailable_credential_refresh: true,
  unavailable_pending: true,
  unavailable_settings_unusable: true,
  client_no_credentials: true,
  client_error: true,
  not_attempted: true,
  not_required: true,
};
var GATE_RESOURCES = {
  policy: true,
  settings: true,
};
var GATE_SURFACES = {
  login: true,
  startup: true,
  noninteractive: true,
};
var GATE_SHADOW_TRIGGERS = {
  both_resolved: true,
  first_prompt: true,
  exit: true,
  settled: true,
};
var GATE_FINAL_OUTCOMES = {
  passed: true,
  quit: true,
  sign_in: true,
  exit: true,
  failed: true,
};
var GATE_EXCLUSION_REASONS = {
  flag_off: true,
  rollout_percent: true,
  provider: true,
  base_url: true,
  auth_command: true,
  credential_shape: true,
  tier_unknown: true,
  tier_not_in_plans: true,
  host_token: true,
};
var CREDENTIAL_SHAPES = {
  stored_login: true,
  untiered_login: true,
  api_key: true,
  env_token_only: true,
  key_helper_only: true,
  none: true,
};
var FLAG_SOURCES = {
  override: true,
  payload: true,
  disk: true,
  disabled: true,
  fallback: true,
};
var SUBSCRIPTION_TIERS = {
  max: true,
  pro: true,
  team: true,
  enterprise: true,
};
var isTelemetryCode = oneOfValidator(...ALL_TELEMETRY_CODES);
var FEATURE_CODE_FIELDS = {
  feature_name: isTelemetryCode,
};
var STORED_COPY_FIELDS = {
  stored_copy: oneOfValidator(...SIGNATURE_TRUST_STATES),
  stored_copy_gate: oneOfValidator(...ENFORCEMENT_MODES),
};
var EVENT_FIELD_VALIDATORS = {
  tengu_retention_sweep: {
    phase: oneOfValidator("start", "complete"),
    skipped: isBoolean,
    skipReason: oneOfValidator(...Object.keys(SWEEP_SKIP_REASONS)),
    usedDefault: isBoolean,
    periodDays: nonNegativeSafeIntValidator,
    transcriptsDeleted: nonNegativeInt32Validator,
    transcriptsExemptedDesktop: nonNegativeInt32Validator,
    sessionFilesDeleted: nonNegativeInt32Validator,
    artifactsDeleted: nonNegativeInt32Validator,
    filesRetainedFresh: nonNegativeInt32Validator,
    filesPastCutoff: nonNegativeInt32Validator,
    historyEntriesPruned: nonNegativeInt32Validator,
    errors: nonNegativeInt32Validator,
    seedAdminRemoved: nonNegativeInt32Validator,
    seedAdminErrors: nonNegativeInt32Validator,
    seedAdminHeld: nonNegativeInt32Validator,
    seedAdminRefused: oneOfValidator(...Object.keys(EXEMPTED_SETTINGS_REASONS)),
    hooksUnasked: oneOfValidator(...Object.keys(UNANSWERED_HOOK_STATES)),
  },
  tengu_feature_ok: FEATURE_CODE_FIELDS,
  tengu_feature_bad: FEATURE_CODE_FIELDS,
  tengu_feature_sad: FEATURE_CODE_FIELDS,
  tengu_org_policy_denied: {
    org_policy_key: regexValidator(ALLOW_CODE_RE),
    org_policy_deny_kind: oneOfValidator(...ORG_DENIAL_REASONS),
    org_policy_taint_named: isBoolean,
    surface: oneOfValidator(...AUTH_SURFACES),
  },
  tengu_policy_limits_fetch: {
    success: isBoolean,
    is_load: isBoolean,
    restrictions_denied_count: nonNegativeInt32Validator,
    compliance_taint_count: nonNegativeInt32Validator,
    outcome_reason: oneOfValidator(...SETTINGS_FETCH_OUTCOMES),
    ...STORED_COPY_FIELDS,
  },
  tengu_remote_settings_fetch: {
    success: isBoolean,
    is_load: isBoolean,
    outcome_reason: oneOfValidator(...SETTINGS_FETCH_OUTCOMES),
    ...STORED_COPY_FIELDS,
  },
  tengu_signed_cache_shadow: {
    cache: oneOfValidator(...SIGNED_DOCUMENT_KINDS),
    result: oneOfValidator(...SIGNATURE_VERIFY_RESULTS),
  },
  tengu_frontmatter_grant_withheld: {
    origin: oneOfValidator(...keys),
    tool_count: nonNegativeInt32Validator,
    reason: oneOfValidator(...keys_2),
  },
  tengu_org_config_gate_shadow: {
    decision: oneOfValidator(...Object.keys(GATE_DECISIONS)),
    decision_reason: oneOfValidator(...Object.keys(GATE_DECISION_REASONS)),
    decision_resource: oneOfValidator(...Object.keys(GATE_RESOURCES)),
    surface: oneOfValidator(...Object.keys(GATE_SURFACES)),
    blocked_ms: nonNegativeInt32Validator,
    candidate_if_armed: isBoolean,
    exclusion_if_armed: oneOfValidator(...Object.keys(GATE_EXCLUSION_REASONS)),
    candidate_now: isBoolean,
    exclusion_now: oneOfValidator(...Object.keys(GATE_EXCLUSION_REASONS)),
    flag_enabled: isBoolean,
    flag_source: oneOfValidator(...Object.keys(FLAG_SOURCES)),
    flag_percent: nonNegativeFiniteValidator,
    grace_ttl_hours: nonNegativeFiniteValidator,
    tier: oneOfValidator(...Object.keys(SUBSCRIPTION_TIERS)),
    credential_shape: oneOfValidator(...Object.keys(CREDENTIAL_SHAPES)),
    policy_reason: oneOfValidator(...Object.keys(GATE_DECISION_REASONS)),
    policy_has_cache: isBoolean,
    policy_cache_age_ms: nonNegativeSafeIntValidator,
    settings_reason: oneOfValidator(...Object.keys(GATE_DECISION_REASONS)),
    settings_has_cache: isBoolean,
    settings_cache_age_ms: nonNegativeSafeIntValidator,
    shadow_trigger: oneOfValidator(...Object.keys(GATE_SHADOW_TRIGGERS)),
  },
  tengu_org_config_gate: {
    decision: oneOfValidator(...Object.keys(GATE_DECISIONS)),
    decision_reason: oneOfValidator(...Object.keys(GATE_DECISION_REASONS)),
    decision_resource: oneOfValidator(...Object.keys(GATE_RESOURCES)),
    surface: oneOfValidator(...Object.keys(GATE_SURFACES)),
    blocked_ms: nonNegativeFiniteValidator,
    attempt: nonNegativeInt32Validator,
    decided_without_waiting: isBoolean,
    final_outcome: oneOfValidator(...Object.keys(GATE_FINAL_OUTCOMES)),
    recovered_after_ms: nonNegativeFiniteValidator,
    tier: oneOfValidator(...Object.keys(SUBSCRIPTION_TIERS)),
    flag_source: oneOfValidator(...Object.keys(FLAG_SOURCES)),
    flag_percent: nonNegativeFiniteValidator,
    grace_ttl_hours: nonNegativeFiniteValidator,
    budget_ms: nonNegativeFiniteValidator,
    policy_reason: oneOfValidator(...Object.keys(GATE_DECISION_REASONS)),
    policy_has_cache: isBoolean,
    policy_cache_age_ms: nonNegativeSafeIntValidator,
    settings_reason: oneOfValidator(...Object.keys(GATE_DECISION_REASONS)),
    settings_has_cache: isBoolean,
    settings_cache_age_ms: nonNegativeSafeIntValidator,
    http_status: httpStatusValidator,
  },
};
var HIPAA_REDACTED = "hipaa_redacted";
//@ chunk-aepeg2w5.js:745386-745712 placement
/**
 * 按校验器表过滤对象字段（未知字符串替换为占位）。
 */
function sanitizeFields(e, n) {
  let r = {};
  if (!e) return r;
  for (let key of Object.keys(e)) {
    let h = e[key];
    if (h === undefined || h === "" || (Array.isArray(h) && h.length === 0)) continue;
    let y = Object.hasOwn(n, key) ? n[key] : undefined;
    if (y !== undefined) {
      if (y(h)) r[key] = h;
    } else if (typeof h === "string") r[key] = HIPAA_REDACTED;
    else if (Array.isArray(h) && h.every((S) => typeof S === "string")) r[key] = [HIPAA_REDACTED];
  }
  return r;
}
//@ chunk-aepeg2w5.js:745712-745825 placement
/**
 * 按校验器表清洗事件元数据（顶层、env、auth）。
 */
function sanitizeEventMetadata(e) {
  return {
    ...sanitizeFields(e, TOP_LEVEL_FIELD_VALIDATORS),
    env: sanitizeFields(e.env, ENV_FIELD_VALIDATORS),
    auth: sanitizeFields(e.auth, AUTH_FIELD_VALIDATORS),
    additional_metadata: e.additional_metadata,
  };
}
export {
  sanitizeEventMetadata,
  isUuid,
  regexValidator,
  isDateValidator,
  oneOfValidator,
  sanitizeFields,
  SAMPLE_RATE_FIELDS,
  EVENT_FIELD_VALIDATORS,
  anyOfValidators,
  isBoolean,
  TOP_LEVEL_FIELD_VALIDATORS,
  ENV_FIELD_VALIDATORS,
  AUTH_FIELD_VALIDATORS,
  SEMVER_PLAIN_RE,
  SEMVER_WITH_PRERELEASE_RE,
  PLATFORM_NAMES,
  ARCH_NAMES,
  ENTRYPOINT_VALIDATOR,
  isKnownModelOrNonconforming,
  HIPAA_REDACTED,
};
