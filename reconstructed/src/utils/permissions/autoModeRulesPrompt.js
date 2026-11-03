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
import { $ZodType } from "../../../vendor/zod/v4/core/schemas.js";
import { ZodType } from "../../../vendor/zod/v4/classic/schemas.js";
import { Fr } from "../../../vendor/zod/v4/core/core.js";
import { processSchema } from "../../../vendor/zod/v4/core/to-json-schema.js";
import { defineLazy, cleanRegex } from "../../../vendor/zod/v4/core/util.js";
import { getPlatform } from "../platform.js";

//@ chunk-dcmhvw5a.js:195295-195324 placement
/**
 * isExactlyTrue：严格等于 true 的判定（限制项持有器）。
 */
function isExactlyTrue(atPath) {
  return atPath === true;
}
//@ chunk-dcmhvw5a.js:195324-195458 placement
function isPolicyModOptionValue(e) {
  return (
    e !== false &&
    (["string", "number", "boolean"].includes(typeof e) ||
      (Array.isArray(e) && e.every((n) => typeof n === "string")))
  );
}
//@ chunk-dcmhvw5a.js:195458-195598 placement
var HOST_POLICY_HOLD_PATHS = [
  ...RESTRICTION_KEYS.settings.map((setting) => ({
    path: [setting],
    holds: isExactlyTrue,
  })),
  ...RESTRICTION_KEYS.policyModOptions.map((policyModOption) => ({
    path: ["pluginConfigs", SEC_DEFAULT_PLUGIN_ID, "options", policyModOption],
    holds: isPolicyModOptionValue,
  })),
];
//@ chunk-dcmhvw5a.js:195598-195617 placement
/**
 * 规则列表中代表默认规则的 $defaults 占位。
 */
var DEFAULTS_PLACEHOLDER = "$defaults";
//@ chunk-dcmhvw5a.js:195617-195674 placement
/**
 * replacesDefaultRules：规则列表是否不含 $defaults（完全替换默认规则）。
 */
function replacesDefaultRules(e) {
  return (e ?? []).some((n) => n !== "$defaults");
}
//@ chunk-dcmhvw5a.js:195674-195734 placement
/**
 * 规则列表是否完全替换默认规则。
 */
function replacesDefaults(allow) {
  return !!allow?.length && !allow.includes("$defaults");
}
//@ chunk-dcmhvw5a.js:195734-195886 placement
/**
 * 展开列表中的 "$defaults" 占位为默认项（只展开一次），其余项经转换函数映射；列表为空时返回默认项副本。
 */
function expandDefaultsPlaceholder(e, n, r) {
  if (!e?.length) return [...n];
  let s = false;
  let a = [];
  for (let c of e) {
    if (c === "$defaults") {
      if (!s) {
        a.push(...n);
        s = true;
      }
      continue;
    }
    a.push(r(c));
  }
  return a;
}
//@ chunk-dcmhvw5a.js:195886-195959 placement
function renderUserDenyRulesBlock(e, n) {
  return expandDefaultsPlaceholder(e, n.length > 0 ? [n] : [], (r) => `- ${r}`).join(`
`);
}
//@ chunk-dcmhvw5a.js:195959-196600 placement
/**
 * 生成分类器提示中的用户 deny 规则段落。
 */
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
];
var SETTINGS_DENY_RULES_TAG = "<settings_deny_rules>";
//@ chunk-dcmhvw5a.js:196764-197470 placement
/**
 * 把用户规则填入 auto mode 分类器提示模板槽位。
 */
function fillAutoModeRuleSlots(e, n, { collapseEmptySlotLines }) {
  let s = {
    user_allow_rules_to_replace: n.allow,
    user_soft_deny_rules_to_replace: n.softDeny,
    user_hard_deny_rules_to_replace: n.hardDeny,
    user_environment_to_replace: n.environment,
  };
  let a = "";
  for (let c = 0; c < e.length;) {
    let g = -1;
    let m = -1;
    let f = null;
    let h = null;
    for (let C of USER_RULE_TEMPLATE_SLOTS) {
      let w = `<${C}>`;
      let index = e.indexOf(w, c);
      if (index === -1 || (g !== -1 && index > g)) continue;
      let v = `</${C}>`;
      let index_2 = e.indexOf(v, index + w.length);
      if (index_2 === -1) continue;
      g = index;
      m = index_2 + v.length;
      f = e.slice(index + w.length, index_2);
      h = C;
    }
    let index = e.indexOf(SETTINGS_DENY_RULES_TAG, c);
    if (index !== -1 && (g === -1 || index < g)) {
      g = index;
      m = index + SETTINGS_DENY_RULES_TAG.length;
      h = null;
    }
    if (g === -1) {
      a += e.slice(c);
      break;
    }
    let b = h === null ? n.settingsDenyBlock : renderUserDenyRulesBlock(s[h], f ?? "");
    a += e.slice(c, g);
    let S = e.startsWith(
      `
`,
      m,
    )
      ? `
`
      : "";
    a += collapseEmptySlotLines
      ? b &&
        `${b}
`
      : b + S;
    c = m + S.length;
  }
  return a;
}
//@ chunk-dcmhvw5a.js:197470-197559 placement
/**
 * normalizeRuleSlug：规则名规范化为小写下划线。
 */
function normalizeRuleSlug(e) {
  return e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
//@ chunk-dcmhvw5a.js:197559-197641 placement
/**
 * ruleIdFromBracketPrefix：从 “[规则名]” 前缀提取规则 id。
 */
function ruleIdFromBracketPrefix(reason) {
  let n = /^\[([^[\]]{1,80})\]/.exec(reason)?.[1];
  return (n && normalizeRuleSlug(n)) || undefined;
}
//@ chunk-dcmhvw5a.js:197641-199858 placement
/**
 * auto mode 内置规则 id 列表。
 */
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
];
var COWORK_RULE_IDS = [
  "cowork_delete_grant",
  "cowork_folder_access",
  "cowork_run_routine_now",
  "cowork_scheduled_task_delete",
  "cowork_scheduled_task_write",
  "cowork_skill_persistence",
];
var UNTRUSTED_CONTENT_RULE_IDS = [
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
/**
 * EXTRA_AUTO_MODE_RULE_IDS：预留的空规则数组（供合并）；ALL_AUTO_MODE_RULE_ID_SET：auto 模式规则 id 的集合；ALL_AUTO_MODE_RULE_ID_SET_WITH_UNTRUSTED：基础规则 + 不可信内容规则集合（同一声明共 4 个绑定）。
 */
var EXTRA_AUTO_MODE_RULE_IDS = [];
var ALL_AUTO_MODE_RULE_ID_SET = new Set([...AUTO_MODE_RULE_IDS, ...EXTRA_AUTO_MODE_RULE_IDS]);
var ALL_AUTO_MODE_RULE_ID_SET_WITH_UNTRUSTED = new Set([
  ...ALL_AUTO_MODE_RULE_ID_SET,
  ...UNTRUSTED_CONTENT_RULE_IDS,
]);
var ALL_AUTO_MODE_RULE_ID_SET_WITH_COWORK = new Set([...ALL_AUTO_MODE_RULE_ID_SET, ...COWORK_RULE_IDS]);
//@ chunk-dcmhvw5a.js:199954-200089 placement
/**
 * 字符串是否含控制字符（Tab 以外的 C0、C1、U+2028/2029）。
 */
function hasControlChars(e) {
  for (let j = 0; j < e.length; j++) {
    let code = e.charCodeAt(j);
    if ((code < 32 && code !== 9) || (code >= 127 && code <= 159) || code === 8232 || code === 8233)
      return true;
  }
  return false;
}
//@ chunk-dcmhvw5a.js:200089-200190 placement
var INVISIBLE_RULE_CHAR_RE =
  /[\p{Cf}\p{Default_Ignorable_Code_Point}\u2028\u2029\u2800\uFFF9-\uFFFB\u{1D173}-\u{1D17A}]/u;
//@ chunk-dcmhvw5a.js:200190-200224 placement
/**
 * hasInvisibleRuleChars：规则文本是否含不可见字符。
 */
function hasInvisibleRuleChars(e) {
  return INVISIBLE_RULE_CHAR_RE.test(e);
}
//@ chunk-dcmhvw5a.js:200224-200438 placement
/**
 * 检查用户规则文本是否含模板标记（<settings_、用户规则槽位、<cc_automode 区域标签），返回问题类型或 null。
 */
function findTemplateInjection(e) {
  if (
    e.includes("<settings_") ||
    USER_RULE_TEMPLATE_SLOTS.some((n) => e.includes(`<${n}`) || e.includes(`</${n}`))
  )
    return "template_token";
  if (e.includes("<cc_automode") || e.includes("</cc_automode")) return "region_tag";
  return null;
}
//@ chunk-dcmhvw5a.js:200438-200592 placement
/**
 * auto 模式可覆盖的规则段（allow/environment/soft_deny）及其 CCR 环境变量名。
 */
var AUTO_MODE_RULE_SECTIONS = ["allow", "environment", "soft_deny"];
var AUTO_MODE_SECTION_ENV_VARS = {
  allow: "CCR_AUTO_MODE_ALLOW",
  environment: "CCR_AUTO_MODE_ENVIRONMENT",
  soft_deny: "CCR_AUTO_MODE_SOFT_DENY",
};
//@ chunk-dcmhvw5a.js:200592-200665 placement
/**
 * isAcceptableRuleText：规则文本可用（非空、无控制字符、无模板注入）。
 */
function isAcceptableRuleText(e) {
  return (
    e.trim().length > 0 &&
    !hasControlChars(e) &&
    !hasInvisibleRuleChars(e) &&
    findTemplateInjection(e) === null
  );
}
//@ chunk-dcmhvw5a.js:200665-200873 placement
function parseRuleOverrideList(e) {
  if (!Array.isArray(e) || !e.every((s) => s === null || typeof s === "string")) return null;
  let n = new Set(e);
  n.delete(DEFAULTS_PLACEHOLDER);
  let filtered = [...n].filter((s) => s !== null && isAcceptableRuleText(s));
  return {
    entries: filtered,
    refused: n.size - filtered.length,
  };
}
//@ chunk-dcmhvw5a.js:200873-201257 placement
/**
 * 读取 auto mode 规则覆盖（不可读的标记出来）。
 */
function readAutoModeRuleOverrides(e) {
  let n = {};
  let r = {};
  for (let a of AUTO_MODE_RULE_SECTIONS) {
    let c = e?.[a];
    if (c === undefined) continue;
    let ruleOverrideList = parseRuleOverrideList(c);
    if (ruleOverrideList === null) {
      r[a] = "unreadable";
      continue;
    }
    if (ruleOverrideList.refused > 0) r[a] = ruleOverrideList.refused;
    if (ruleOverrideList.entries.length > 0) n[a] = ruleOverrideList.entries;
  }
  let s =
    (r.soft_deny !== undefined || r.environment !== undefined) &&
    (n.allow !== undefined || n.environment !== undefined);
  if (s) {
    delete n.allow;
    delete n.environment;
  }
  return {
    rules: n,
    refused: r,
    grantsWithheld: s,
  };
}
//@ chunk-dcmhvw5a.js:201257-201380 placement
/**
 * 给每个存在的规则段在开头补上 $defaults 占位，保留内置默认规则。
 */
function prependDefaultsToSections(rules) {
  let n = {};
  for (let r of AUTO_MODE_RULE_SECTIONS) {
    let s = rules[r];
    if (s !== undefined) n[r] = [DEFAULTS_PLACEHOLDER, ...s];
  }
  return Object.keys(n).length > 0 ? n : undefined;
}
//@ chunk-dcmhvw5a.js:201422-202068 placement
/**
 * 延迟可选的 zod 类型。
 */
var ZodDeferredOptional = $ZodType;
var zodDeferredOptionalInner = ZodType;
var createDeferredOptional = Fr("ZodDeferredOptional", (e, n) => {
  ZodDeferredOptional.init(e, n);
  zodDeferredOptionalInner.init(e, n);
  e._zod.optin = "optional";
  e._zod.optout = "optional";
  Object.defineProperty(e._zod, "innerType", {
    get: n.built,
    configurable: true,
  });
  e._zod.processJSONSchema = (r, s, a) => {
    let c = n.getter();
    processSchema(c, r, a);
    r.seen.get(e).ref = c;
  };
  defineLazy(e._zod, "values", () => {
    let values = n.getter()._zod.values;
    return values ? new Set([...values, undefined]) : undefined;
  });
  defineLazy(e._zod, "pattern", () => {
    let pattern = n.getter()._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
  });
  defineLazy(e._zod, "propValues", () => n.getter()._zod.propValues);
  e._zod.parse = (r, s) => {
    if (r.value === undefined) return r;
    return n.getter()._zod.run(r, s);
  };
  e.unwrap = n.getter;
});
//@ chunk-dcmhvw5a.js:202068-202545 placement
/**
 * 创建延迟可选 schema（惰性 getter）。
 */
function deferredOptional(e) {
  let n;
  return new createDeferredOptional({
    type: "lazy",
    getter: () => {
      if (n === undefined) {
        let s = e();
        if (s._zod.optin !== undefined)
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
//@ chunk-dcmhvw5a.js:202545-202697 placement
/**
 * API 提供方类型列表（anthropic、bedrock、vertex、foundry、gateway 等）及其集合。
 */
var API_PROVIDER_KINDS = [
  "anthropic",
  "customEndpoint",
  "bedrock",
  "vertex",
  "foundry",
  "anthropicAws",
  "mantle",
  "gateway",
];
var ANTHROPIC_PROVIDER_ID_RE = /^anthropic[A-Z][A-Za-z0-9]*$/;
var API_PROVIDER_KIND_SET = new Set(API_PROVIDER_KINDS);
//@ chunk-dcmhvw5a.js:202697-202750 placement
/**
 * isApiProviderKind：是否为已知 API 提供方类型。
 */
function isApiProviderKind(e) {
  return typeof e === "string" && API_PROVIDER_KIND_SET.has(e);
}
//@ chunk-dcmhvw5a.js:202750-202811 placement
/**
 * isAnthropicProviderId：提供方类型或其 Anthropic id 形式。
 */
function isAnthropicProviderId(allowedProvider) {
  return (
    isApiProviderKind(allowedProvider) ||
    (typeof allowedProvider === "string" && ANTHROPIC_PROVIDER_ID_RE.test(allowedProvider))
  );
}
//@ chunk-dcmhvw5a.js:202811-203165 placement = getReservedShortcuts (1)
/**
 * 界面符号常量（圆点、星号等）。
 */
var BLACK_CIRCLE = getPlatform() === "macos" ? "\u23FA" : "\u25CF";
var BULLET_OPERATOR = "\u2219";
var BULLET = "\u2022";
var TELEPHONE_RECORDER = "\u2315";
var TEARDROP_ASTERISK = "\u273B";
var FOUR_POINTED_STAR = "\u2726";
var DIAGONAL = "\u2571";
var THEREFORE = "\u2234";
var PROPORTION = "\u2237";
var BECAUSE = "\u2235";
var SPINNER_DOTS = [THEREFORE, PROPORTION, BECAUSE, PROPORTION];
var DOTTED_CIRCLE = "\u25CC";
var UP_ARROW = "\u2191";
var DOWN_ARROW = "\u2193";
var DOWN_RIGHT_ARROW = "\u21B3";
var LEFT_ARROW = "\u2190";
var RIGHT_ARROW = "\u2192";
var RETURN_SYMBOL = "\u23CE";
var LIGHTNING = "\u21AF";
var WHITE_CIRCLE = "\u25CB";
var HALF_CIRCLE = "\u25D0";
var FILLED_CIRCLE = "\u25CF";
var FISHEYE = "\u25C9";
var DIAMOND_IN_DIAMOND = "\u25C8";
var BULLSEYE = "\u25CE";
//@ chunk-dcmhvw5a.js:203165-203239 placement
/**
 * 暂停/播放/刷新/箭头符号。
 */
var PAUSE_GLYPH = "\u23F8";
var FAST_FORWARD_GLYPH = "\u23F5\u23F5";
var REFRESH_GLYPH = "\u21BB";
var BACK_ARROW_GLYPH = "\u2190";
var CIRCLE_MARK_GLYPH = "\u2442";
//@ chunk-dcmhvw5a.js:203239-203304 placement
/**
 * 菱形、警告等符号。
 */
var DIAMOND_GLYPH = "\u25C7";
var FILLED_DIAMOND_GLYPH = "\u25C6";
var REFERENCE_GLYPH = "\u203B";
var WARNING_GLYPH = "\u26A0";
var BOXED_DIAMOND_GLYPH = "\u29C9";
//@ chunk-dcmhvw5a.js:203304-203339 placement
/**
 * withBoxedDiamond：给文本加双线菱形前缀。
 */
function withBoxedDiamond(e) {
  return `${BOXED_DIAMOND_GLYPH} ${e}`;
}
//@ chunk-dcmhvw5a.js:203339-203381 placement
/**
 * VERTICAL_LEFT_BAR_GLYPH：竖条符号（▎）；FULL_BLOCK_GLYPH：实心方块符号（█）；HORIZONTAL_LINE_GLYPH：横线符号（─）（同一声明共 3 个绑定）。
 */
var VERTICAL_LEFT_BAR_GLYPH = "\u258E";
var FULL_BLOCK_GLYPH = "\u2588";
var HORIZONTAL_LINE_GLYPH = "\u2500";
//@ chunk-dcmhvw5a.js:203381-203409 placement
/**
 * HEAVY_VERTICAL_BAR_GLYPH：粗竖线符号（┃）；NO_BREAK_SPACE：不换行空格常量（同一声明共 2 个绑定）。
 */
var HEAVY_VERTICAL_BAR_GLYPH = "\u2503";
var NO_BREAK_SPACE = "\xA0";
export {
  SPINNER_DOTS,
  PROPORTION,
  NO_BREAK_SPACE,
  WARNING_GLYPH,
  ALL_AUTO_MODE_RULE_ID_SET_WITH_COWORK,
  UNTRUSTED_CONTENT_RULE_IDS,
  AUTO_MODE_RULE_IDS,
  COWORK_RULE_IDS,
  replacesDefaultRules,
  ALL_AUTO_MODE_RULE_ID_SET_WITH_UNTRUSTED,
  ruleIdFromBracketPrefix,
  ALL_AUTO_MODE_RULE_ID_SET,
  BLACK_CIRCLE,
  DEFAULTS_PLACEHOLDER,
  CIRCLE_MARK_GLYPH,
  UP_ARROW,
  DOWN_ARROW,
  WHITE_CIRCLE,
  HALF_CIRCLE,
  FILLED_CIRCLE,
  FISHEYE,
  DIAMOND_IN_DIAMOND,
  PAUSE_GLYPH,
  BOXED_DIAMOND_GLYPH,
  TEARDROP_ASTERISK,
  LIGHTNING,
  BULLSEYE,
  DOWN_RIGHT_ARROW,
  FILLED_DIAMOND_GLYPH,
  DIAMOND_GLYPH,
  LEFT_ARROW,
  FAST_FORWARD_GLYPH,
  normalizeRuleSlug,
  userDenyRulesSection,
  fillAutoModeRuleSlots,
  expandDefaultsPlaceholder,
  hasControlChars,
  hasInvisibleRuleChars,
  findTemplateInjection,
  AUTO_MODE_RULE_SECTIONS,
  AUTO_MODE_SECTION_ENV_VARS,
  readAutoModeRuleOverrides,
  prependDefaultsToSections,
  FULL_BLOCK_GLYPH,
  replacesDefaults,
  deferredOptional,
  isApiProviderKind,
  API_PROVIDER_KINDS,
  createDeferredOptional,
  isAnthropicProviderId,
  HEAVY_VERTICAL_BAR_GLYPH,
  BULLET_OPERATOR,
  DIAGONAL,
  FOUR_POINTED_STAR,
  BACK_ARROW_GLYPH,
  RETURN_SYMBOL,
  THEREFORE,
  REFERENCE_GLYPH,
  REFRESH_GLYPH,
  BULLET,
  DOTTED_CIRCLE,
  HORIZONTAL_LINE_GLYPH,
  isPolicyModOptionValue,
  isExactlyTrue,
  HOST_POLICY_HOLD_PATHS,
  isAcceptableRuleText,
  TELEPHONE_RECORDER,
  VERTICAL_LEFT_BAR_GLYPH,
  withBoxedDiamond,
  RIGHT_ARROW,
};
