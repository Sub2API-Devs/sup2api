/**
 * utils/permissions/autoModeRulesPrompt.ts
 *
 * 2.1.316 新增：auto mode 内置规则 id 列表；把用户规则填入 auto mode 分类器提示模板槽位等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (35)
 * attribution: placement 35
 */
import { RESTRICTION_KEYS, SEC_DEFAULT_PLUGIN_ID } from "../settings/managedRestrictionKeys.js";
import { Qk } from "../../../vendor/zod/v4/core/schemas.js";
import { iA } from "../../../vendor/zod/v4/classic/schemas.js";
import { Fr } from "../../../vendor/zod/v4/core/core.js";
import { vR } from "../../../vendor/zod/v4/core/to-json-schema.js";
import { uMn, cMn } from "../../../vendor/zod/v4/core/util.js";
import { getPlatform } from "../platform.js";

//@ chunk-dcmhvw5a.js:195295-195324 placement
function nc(e) {
  return e === !0;
}
//@ chunk-dcmhvw5a.js:195324-195458 placement
function isPolicyModOptionValue(e) {
  return (
    e !== !1 &&
    (["string", "number", "boolean"].includes(typeof e) ||
      (Array.isArray(e) && e.every((n) => typeof n === "string")))
  );
}
//@ chunk-dcmhvw5a.js:195458-195598 placement
var HOST_POLICY_HOLD_PATHS = [
  ...RESTRICTION_KEYS.settings.map((setting) => ({ path: [setting], holds: nc })),
  ...RESTRICTION_KEYS.policyModOptions.map((policyModOption) => ({
    path: ["pluginConfigs", SEC_DEFAULT_PLUGIN_ID, "options", policyModOption],
    holds: isPolicyModOptionValue,
  })),
];
/**
 * 规则列表中代表默认规则的 $defaults 占位。
 */
//@ chunk-dcmhvw5a.js:195598-195617 placement
var DEFAULTS_PLACEHOLDER = "$defaults";
//@ chunk-dcmhvw5a.js:195617-195674 placement
function nct(e) {
  return (e ?? []).some((n) => n !== "$defaults");
}
/**
 * 规则列表是否完全替换默认规则。
 */
//@ chunk-dcmhvw5a.js:195674-195734 placement
function replacesDefaults(e) {
  return !!e?.length && !e.includes("$defaults");
}
/**
 * 展开列表中的 "$defaults" 占位为默认项（只展开一次），其余项经转换函数映射；列表为空时返回默认项副本。
 */
//@ chunk-dcmhvw5a.js:195734-195886 placement
function expandDefaultsPlaceholder(e, n, r) {
  if (!e?.length) return [...n];
  let s = !1,
    a = [];
  for (let c of e) {
    if (c === "$defaults") {
      if (!s) (a.push(...n), (s = !0));
      continue;
    }
    a.push(r(c));
  }
  return a;
}
//@ chunk-dcmhvw5a.js:195886-195959 placement
function Tb(e, n) {
  return expandDefaultsPlaceholder(e, n.length > 0 ? [n] : [], (r) => `- ${r}`).join(`
`);
}
/**
 * 生成分类器提示中的用户 deny 规则段落。
 */
//@ chunk-dcmhvw5a.js:195959-196600 placement
function userDenyRulesSection(e) {
  if (e.length === 0) return "";
  return (
    `- User Deny Rules: The user has configured these permission deny rules: ${e.map((r) => `\`${r}\``).join(", ")}. Each rule names a tool and (optionally) an argument pattern that is already hard-blocked for that tool. ` +
    "Block the action if it accomplishes the same effect via a different tool \u2014 e.g. using Bash with " +
    "`python -c`, `sed -i`, `cat >`, heredocs, or similar to write or edit a file that an Edit/Write/MultiEdit deny rule covers, or otherwise routing around a deny rule by switching tools. The named tool itself is enforced separately; your job here is to catch circumvention."
  );
}
//@ chunk-dcmhvw5a.js:196600-196764 placement
var USER_RULE_TEMPLATE_SLOTS = [
    "user_allow_rules_to_replace",
    "user_soft_deny_rules_to_replace",
    "user_hard_deny_rules_to_replace",
    "user_environment_to_replace",
  ],
  SETTINGS_DENY_RULES_TAG = "<settings_deny_rules>";
/**
 * 把用户规则填入 auto mode 分类器提示模板槽位。
 */
//@ chunk-dcmhvw5a.js:196764-197470 placement
function fillAutoModeRuleSlots(e, n, { collapseEmptySlotLines: collapseEmptySlotLines }) {
  let s = {
      user_allow_rules_to_replace: n.allow,
      user_soft_deny_rules_to_replace: n.softDeny,
      user_hard_deny_rules_to_replace: n.hardDeny,
      user_environment_to_replace: n.environment,
    },
    a = "";
  for (let c = 0; c < e.length;) {
    let g = -1,
      m = -1,
      f = null,
      h = null;
    for (let C of USER_RULE_TEMPLATE_SLOTS) {
      let w = `<${C}>`,
        index = e.indexOf(w, c);
      if (index === -1 || (g !== -1 && index > g)) continue;
      let v = `</${C}>`,
        index_2 = e.indexOf(v, index + w.length);
      if (index_2 === -1) continue;
      ((g = index), (m = index_2 + v.length), (f = e.slice(index + w.length, index_2)), (h = C));
    }
    let index = e.indexOf(SETTINGS_DENY_RULES_TAG, c);
    if (index !== -1 && (g === -1 || index < g))
      ((g = index), (m = index + SETTINGS_DENY_RULES_TAG.length), (h = null));
    if (g === -1) {
      a += e.slice(c);
      break;
    }
    let b = h === null ? n.settingsDenyBlock : Tb(s[h], f ?? "");
    a += e.slice(c, g);
    let S = e.startsWith(
      `
`,
      m,
    )
      ? `
`
      : "";
    ((a += collapseEmptySlotLines
      ? b &&
        `${b}
`
      : b + S),
      (c = m + S.length));
  }
  return a;
}
//@ chunk-dcmhvw5a.js:197470-197559 placement
function w_r(e) {
  return e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
//@ chunk-dcmhvw5a.js:197559-197641 placement
function Xfs(e) {
  let n = /^\[([^[\]]{1,80})\]/.exec(e)?.[1];
  return (n && w_r(n)) || void 0;
}
/**
 * auto mode 内置规则 id 列表。
 */
//@ chunk-dcmhvw5a.js:197641-199858 placement
var AUTO_MODE_RULE_IDS = [
    "account_standing_rule_changes",
    "auto_mode_bypass",
    "blind_apply",
    "browser_file_upload_exfil",
    "browser_input_exfil",
    "browser_js_exfil",
    "browser_navigate_exfil",
    "browser_shortcut_execution",
    "chatops_trigger_comments",
    "ci_bypass",
    "cloud_storage_mass_delete",
    "cluster_wide_workload_creation",
    "code_from_external",
    "code_that_leaks_when_run",
    "command_network_lists",
    "containment_escape",
    "create_public_surface",
    "create_rce_surface",
    "create_unsafe_agents",
    "credential_exploration",
    "credential_leakage",
    "credential_materialization",
    "data_exfiltration",
    "dns_domain_cert_changes",
    "excess_sensitive_detail",
    "exfil_scouting",
    "expose_local_services",
    "external_ingress_tunnel",
    "external_system_writes",
    "feature_flag_writes",
    "git_destructive",
    "instruction_poisoning",
    "interfere_with_workloads",
    "irreversible_deletion_general",
    "irreversible_local_destruction",
    "live_shared_artifact_sensitive_delta",
    "logging_audit_tampering",
    "merge_without_review",
    "modify_shared_resources",
    "node_lifecycle_operations",
    "out_of_place_publication",
    "package_registry_bypass",
    "permission_grant",
    "pii_data_handling",
    "production_deploy",
    "production_reads",
    "protected_scope_iac_apply",
    "public_data_sharing_upload",
    "real_world_transactions",
    "remote_repoint",
    "remote_shell_writes",
    "safety_bypass_flag",
    "sandbox_network_callback",
    "secret_store_writes",
    "security_test_removal",
    "security_weaken",
    "self_approval",
    "self_modification",
    "sensitive_remote_exec",
    "sensitive_source_provenance",
    "session_transcript_tampering",
    "shared_cluster_mutation",
    "shared_scratch_sweep",
    "third_party_attack",
    "tls_auth_weaken",
    "tmux_self_drive",
    "traffic_redirection",
    "unauthorized_persistence",
    "unrequested_artifact_publish",
    "unrequested_commit_in_a_connected_app",
    "untrusted_code_integration",
    "unverifiable_deletion_scope",
    "unverifiable_deletion_target",
  ],
  Qfs = [
    "cowork_delete_grant",
    "cowork_folder_access",
    "cowork_run_routine_now",
    "cowork_scheduled_task_delete",
    "cowork_scheduled_task_write",
    "cowork_skill_persistence",
  ],
  Tio = [
    "access_added_as_a_means",
    "bot_check_circumvention",
    "consent_given_for_the_user",
    "identity_not_given",
    "notes_for_later_sessions",
    "save_over_an_occupied_name",
    "stated_interface_sidestepped",
    "walled_content_from_a_copy",
    "website_access_circumvention",
  ];
//@ chunk-dcmhvw5a.js:199858-199954 placement
var vb = [],
  Aio = new Set([...AUTO_MODE_RULE_IDS, ...vb]),
  Hxi = new Set([...Aio, ...Tio]),
  zIn = new Set([...Aio, ...Qfs]);
/**
 * 字符串是否含控制字符（Tab 以外的 C0、C1、U+2028/2029）。
 */
//@ chunk-dcmhvw5a.js:199954-200089 placement
function hasControlChars(e) {
  for (let n = 0; n < e.length; n++) {
    let code = e.charCodeAt(n);
    if ((code < 32 && code !== 9) || (code >= 127 && code <= 159) || code === 8232 || code === 8233)
      return !0;
  }
  return !1;
}
//@ chunk-dcmhvw5a.js:200089-200190 placement
var INVISIBLE_RULE_CHAR_RE =
  /[\p{Cf}\p{Default_Ignorable_Code_Point}\u2028\u2029\u2800\uFFF9-\uFFFB\u{1D173}-\u{1D17A}]/u;
//@ chunk-dcmhvw5a.js:200190-200224 placement
function oct(e) {
  return INVISIBLE_RULE_CHAR_RE.test(e);
}
/**
 * 检查用户规则文本是否含模板标记（<settings_、用户规则槽位、<cc_automode 区域标签），返回问题类型或 null。
 */
//@ chunk-dcmhvw5a.js:200224-200438 placement
function findTemplateInjection(e) {
  if (
    e.includes("<settings_") ||
    USER_RULE_TEMPLATE_SLOTS.some((n) => e.includes(`<${n}`) || e.includes(`</${n}`))
  )
    return "template_token";
  if (e.includes("<cc_automode") || e.includes("</cc_automode")) return "region_tag";
  return null;
}
/**
 * auto 模式可覆盖的规则段（allow/environment/soft_deny）及其 CCR 环境变量名。
 */
//@ chunk-dcmhvw5a.js:200438-200592 placement
var AUTO_MODE_RULE_SECTIONS = ["allow", "environment", "soft_deny"],
  AUTO_MODE_SECTION_ENV_VARS = {
    allow: "CCR_AUTO_MODE_ALLOW",
    environment: "CCR_AUTO_MODE_ENVIRONMENT",
    soft_deny: "CCR_AUTO_MODE_SOFT_DENY",
  };
//@ chunk-dcmhvw5a.js:200592-200665 placement
function Xr(e) {
  return e.trim().length > 0 && !hasControlChars(e) && !oct(e) && findTemplateInjection(e) === null;
}
//@ chunk-dcmhvw5a.js:200665-200873 placement
function parseRuleOverrideList(e) {
  if (!Array.isArray(e) || !e.every((s) => s === null || typeof s === "string")) return null;
  let n = new Set(e);
  n.delete(DEFAULTS_PLACEHOLDER);
  let filtered = [...n].filter((s) => s !== null && Xr(s));
  return { entries: filtered, refused: n.size - filtered.length };
}
/**
 * 读取 auto mode 规则覆盖（不可读的标记出来）。
 */
//@ chunk-dcmhvw5a.js:200873-201257 placement
function readAutoModeRuleOverrides(e) {
  let n = {},
    r = {};
  for (let a of AUTO_MODE_RULE_SECTIONS) {
    let c = e?.[a];
    if (c === void 0) continue;
    let g = parseRuleOverrideList(c);
    if (g === null) {
      r[a] = "unreadable";
      continue;
    }
    if (g.refused > 0) r[a] = g.refused;
    if (g.entries.length > 0) n[a] = g.entries;
  }
  let s =
    (r.soft_deny !== void 0 || r.environment !== void 0) && (n.allow !== void 0 || n.environment !== void 0);
  if (s) (delete n.allow, delete n.environment);
  return { rules: n, refused: r, grantsWithheld: s };
}
/**
 * 给每个存在的规则段在开头补上 $defaults 占位，保留内置默认规则。
 */
//@ chunk-dcmhvw5a.js:201257-201380 placement
function prependDefaultsToSections(e) {
  let n = {};
  for (let r of AUTO_MODE_RULE_SECTIONS) {
    let s = e[r];
    if (s !== void 0) n[r] = [DEFAULTS_PLACEHOLDER, ...s];
  }
  return Object.keys(n).length > 0 ? n : void 0;
}
/**
 * 延迟可选的 zod 类型。
 */
//@ chunk-dcmhvw5a.js:201422-202068 placement
var ZodDeferredOptional = Qk,
  xb = iA,
  qr = Fr("ZodDeferredOptional", (e, n) => {
    (ZodDeferredOptional.init(e, n),
      xb.init(e, n),
      (e._zod.optin = "optional"),
      (e._zod.optout = "optional"),
      Object.defineProperty(e._zod, "innerType", { get: n.built, configurable: !0 }),
      (e._zod.processJSONSchema = (r, s, a) => {
        let getter = n.getter();
        (vR(getter, r, a), (r.seen.get(e).ref = getter));
      }),
      uMn(e._zod, "values", () => {
        let values = n.getter()._zod.values;
        return values ? new Set([...values, void 0]) : void 0;
      }),
      uMn(e._zod, "pattern", () => {
        let pattern = n.getter()._zod.pattern;
        return pattern ? new RegExp(`^(${cMn(pattern.source)})?$`) : void 0;
      }),
      uMn(e._zod, "propValues", () => n.getter()._zod.propValues),
      (e._zod.parse = (r, s) => {
        if (r.value === void 0) return r;
        return n.getter()._zod.run(r, s);
      }),
      (e.unwrap = n.getter));
  });
/**
 * 创建延迟可选 schema（惰性 getter）。
 */
//@ chunk-dcmhvw5a.js:202068-202545 placement
function deferredOptional(e) {
  let n;
  return new qr({
    type: "lazy",
    getter: () => {
      if (n === void 0) {
        let s = e();
        if (s._zod.optin !== void 0)
          throw Error(
            "deferredOptional(): the schema the build callback returned already handles a missing key itself (.optional(), .catch(), .default(), .prefault(), z.preprocess(), or a union or wrapper holding one). Return the plain schema and let deferredOptional() make it optional, or use that schema with .optional() without deferring it.",
          );
        n = s;
      }
      return n;
    },
    built: () => n,
  });
}
/**
 * API 提供方类型列表（anthropic、bedrock、vertex、foundry、gateway 等）及其集合。
 */
//@ chunk-dcmhvw5a.js:202545-202697 placement
var API_PROVIDER_KINDS = [
    "anthropic",
    "customEndpoint",
    "bedrock",
    "vertex",
    "foundry",
    "anthropicAws",
    "mantle",
    "gateway",
  ],
  ANTHROPIC_PROVIDER_ID_RE = /^anthropic[A-Z][A-Za-z0-9]*$/,
  API_PROVIDER_KIND_SET = new Set(API_PROVIDER_KINDS);
//@ chunk-dcmhvw5a.js:202697-202750 placement
function Zr(e) {
  return typeof e === "string" && API_PROVIDER_KIND_SET.has(e);
}
//@ chunk-dcmhvw5a.js:202750-202811 placement
function cn(e) {
  return Zr(e) || (typeof e === "string" && ANTHROPIC_PROVIDER_ID_RE.test(e));
}
/**
 * 界面符号常量（圆点、星号等）。
 */
//@ chunk-dcmhvw5a.js:202811-203165 placement = getReservedShortcuts (1)
var BLACK_CIRCLE = getPlatform() === "macos" ? "\u23FA" : "\u25CF",
  BULLET_OPERATOR = "\u2219",
  BULLET = "\u2022",
  TELEPHONE_RECORDER = "\u2315",
  TEARDROP_ASTERISK = "\u273B",
  FOUR_POINTED_STAR = "\u2726",
  DIAGONAL = "\u2571",
  THEREFORE = "\u2234",
  PROPORTION = "\u2237",
  BECAUSE = "\u2235",
  SPINNER_DOTS = [THEREFORE, PROPORTION, BECAUSE, PROPORTION],
  DOTTED_CIRCLE = "\u25CC",
  UP_ARROW = "\u2191",
  DOWN_ARROW = "\u2193",
  DOWN_RIGHT_ARROW = "\u21B3",
  LEFT_ARROW = "\u2190",
  RIGHT_ARROW = "\u2192",
  RETURN_SYMBOL = "\u23CE",
  LIGHTNING = "\u21AF",
  WHITE_CIRCLE = "\u25CB",
  HALF_CIRCLE = "\u25D0",
  FILLED_CIRCLE = "\u25CF",
  FISHEYE = "\u25C9",
  DIAMOND_IN_DIAMOND = "\u25C8",
  BULLSEYE = "\u25CE";
/**
 * 暂停/播放/刷新/箭头符号。
 */
//@ chunk-dcmhvw5a.js:203165-203239 placement
var PAUSE_GLYPH = "\u23F8",
  AOt = "\u23F5\u23F5",
  ips = "\u21BB",
  p1e = "\u2190",
  YO = "\u2442";
/**
 * 菱形、警告等符号。
 */
//@ chunk-dcmhvw5a.js:203239-203304 placement
var DIAMOND_GLYPH = "\u25C7",
  Wx = "\u25C6",
  aps = "\u203B",
  Gg = "\u26A0",
  hf = "\u29C9";
//@ chunk-dcmhvw5a.js:203304-203339 placement
function lps(e) {
  return `${hf} ${e}`;
}
//@ chunk-dcmhvw5a.js:203339-203381 placement
var dps = "\u258E",
  cps = "\u2588",
  T8 = "\u2500";
//@ chunk-dcmhvw5a.js:203381-203409 placement
var ups = "\u2503",
  k_r = "\xA0";

export {
  SPINNER_DOTS,
  PROPORTION,
  k_r,
  Gg,
  zIn,
  Tio,
  AUTO_MODE_RULE_IDS,
  Qfs,
  nct,
  Hxi,
  Xfs,
  Aio,
  BLACK_CIRCLE,
  DEFAULTS_PLACEHOLDER,
  YO,
  UP_ARROW,
  DOWN_ARROW,
  WHITE_CIRCLE,
  HALF_CIRCLE,
  FILLED_CIRCLE,
  FISHEYE,
  DIAMOND_IN_DIAMOND,
  hf,
  TEARDROP_ASTERISK,
  PAUSE_GLYPH,
  LIGHTNING,
  DOWN_RIGHT_ARROW,
  Wx,
  DIAMOND_GLYPH,
  BULLSEYE,
  LEFT_ARROW,
  AOt,
  w_r,
  userDenyRulesSection,
  fillAutoModeRuleSlots,
  expandDefaultsPlaceholder,
  hasControlChars,
  oct,
  findTemplateInjection,
  AUTO_MODE_RULE_SECTIONS,
  AUTO_MODE_SECTION_ENV_VARS,
  readAutoModeRuleOverrides,
  prependDefaultsToSections,
  cps,
  replacesDefaults,
  deferredOptional,
  Zr,
  API_PROVIDER_KINDS,
  qr,
  cn,
  ups,
  BULLET_OPERATOR,
  DIAGONAL,
  FOUR_POINTED_STAR,
  p1e,
  RETURN_SYMBOL,
  THEREFORE,
  aps,
  ips,
  BULLET,
  DOTTED_CIRCLE,
  T8,
  isPolicyModOptionValue,
  nc,
  HOST_POLICY_HOLD_PATHS,
  Xr,
  TELEPHONE_RECORDER,
  dps,
  lps,
  RIGHT_ARROW,
};
