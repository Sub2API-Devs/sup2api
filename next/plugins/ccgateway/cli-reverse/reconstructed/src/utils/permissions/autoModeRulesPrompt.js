/**
 * utils/permissions/autoModeRulesPrompt.ts
 *
 * 2.1.316 新增：auto mode 内置规则 id 列表；把用户规则填入 auto mode 分类器提示模板槽位等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1p0bwqzj.js (16), chunk-z20c443b.js (11)
 * attribution: placement 27
 */
import { RESTRICTION_KEYS, SEC_DEFAULT_PLUGIN_ID } from "../settings/managedRestrictionKeys.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1p0bwqzj.js:576-595 placement
/**
 * 规则列表中代表默认规则的 $defaults 占位。
 */
var DEFAULTS_PLACEHOLDER = "$defaults";
//@ chunk-1p0bwqzj.js:595-652 placement
/**
 * replacesDefaultRules：规则列表是否不含 $defaults（完全替换默认规则）。
 */
function replacesDefaultRules(rules) {
  return (rules ?? []).some((rule) => rule !== "$defaults");
}
//@ chunk-1p0bwqzj.js:652-712 placement
/**
 * 规则列表是否完全替换默认规则。
 */
function replacesDefaults(rules) {
  return !!rules?.length && !rules.includes("$defaults");
}
//@ chunk-1p0bwqzj.js:712-864 placement
/**
 * 展开列表中的 "$defaults" 占位为默认项（只展开一次），其余项经转换函数映射；列表为空时返回默认项副本。
 */
function expandDefaultsPlaceholder(rules, defaults, formatRule) {
  if (!rules?.length) return [...defaults];
  let insertedDefaults = false;
  let result = [];
  for (let rule of rules) {
    if (rule === "$defaults") {
      if (!insertedDefaults) {
        result.push(...defaults);
        insertedDefaults = true;
      }
      continue;
    }
    result.push(formatRule(rule));
  }
  return result;
}
//@ chunk-1p0bwqzj.js:864-936 placement
function renderUserDenyRulesBlock(rules, settingsRules) {
  return expandDefaultsPlaceholder(
    rules,
    settingsRules.length > 0 ? [settingsRules] : [],
    (rule) => `- ${rule}`,
  ).join(`
`);
}
//@ chunk-1p0bwqzj.js:936-1577 placement
/**
 * 生成分类器提示中的用户 deny 规则段落。
 */
function userDenyRulesSection(rules) {
  if (rules.length === 0) return "";
  return (
    `- User Deny Rules: The user has configured these permission deny rules: ${rules.map((rule) => `\`${rule}\``).join(", ")}. Each rule names a tool and (optionally) an argument pattern that is already hard-blocked for that tool. ` +
    "Block the action if it accomplishes the same effect via a different tool \u2014 e.g. using Bash with " +
    "`python -c`, `sed -i`, `cat >`, heredocs, or similar to write or edit a file that an Edit/Write/MultiEdit deny rule covers, or otherwise routing around a deny rule by switching tools. The named tool itself is enforced separately; your job here is to catch circumvention."
  );
}
//@ chunk-1p0bwqzj.js:1577-1739 placement
var USER_RULE_TEMPLATE_SLOTS = [
  "user_allow_rules_to_replace",
  "user_soft_deny_rules_to_replace",
  "user_hard_deny_rules_to_replace",
  "user_environment_to_replace",
];
var SETTINGS_DENY_RULES_TAG = "<settings_deny_rules>";
//@ chunk-1p0bwqzj.js:1739-2441 placement
/**
 * 把用户规则填入 auto mode 分类器提示模板槽位。
 */
function fillAutoModeRuleSlots(text, values, { collapseEmptySlotLines }) {
  let rulesBySlot = {
    user_allow_rules_to_replace: values.allow,
    user_soft_deny_rules_to_replace: values.softDeny,
    user_hard_deny_rules_to_replace: values.hardDeny,
    user_environment_to_replace: values.environment,
  };
  let result = "";
  for (let cursor = 0; cursor < text.length;) {
    let slotStart = -1;
    let slotEnd = -1;
    let slotInner = null;
    let slotName = null;
    for (let candidateSlot of USER_RULE_TEMPLATE_SLOTS) {
      let openTag = `<${candidateSlot}>`;
      let index = text.indexOf(openTag, cursor);
      if (index === -1 || (slotStart !== -1 && index > slotStart)) continue;
      let closeTag = `</${candidateSlot}>`;
      let index_2 = text.indexOf(closeTag, index + openTag.length);
      if (index_2 === -1) continue;
      slotStart = index;
      slotEnd = index_2 + closeTag.length;
      slotInner = text.slice(index + openTag.length, index_2);
      slotName = candidateSlot;
    }
    let index = text.indexOf(SETTINGS_DENY_RULES_TAG, cursor);
    if (index !== -1 && (slotStart === -1 || index < slotStart)) {
      slotStart = index;
      slotEnd = index + SETTINGS_DENY_RULES_TAG.length;
      slotName = null;
    }
    if (slotStart === -1) {
      result += text.slice(cursor);
      break;
    }
    let replacement =
      slotName === null
        ? values.settingsDenyBlock
        : renderUserDenyRulesBlock(rulesBySlot[slotName], slotInner ?? "");
    result += text.slice(cursor, slotStart);
    let trailingNewline = text.startsWith(
      `
`,
      slotEnd,
    )
      ? `
`
      : "";
    result += collapseEmptySlotLines
      ? replacement &&
        `${replacement}
`
      : replacement + trailingNewline;
    cursor = slotEnd + trailingNewline.length;
  }
  return result;
}
//@ chunk-1p0bwqzj.js:2441-2530 placement
/**
 * normalizeRuleSlug：规则名规范化为小写下划线。
 */
function normalizeRuleSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
//@ chunk-1p0bwqzj.js:2530-2612 placement
/**
 * ruleIdFromBracketPrefix：从 “[规则名]” 前缀提取规则 id。
 */
function ruleIdFromBracketPrefix(reason) {
  let prefix = /^\[([^[\]]{1,80})\]/.exec(reason)?.[1];
  return (prefix && normalizeRuleSlug(prefix)) || undefined;
}
//@ chunk-1p0bwqzj.js:2612-4829 placement
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
//@ chunk-1p0bwqzj.js:4829-4923 placement
/**
 * EXTRA_AUTO_MODE_RULE_IDS：预留的空规则数组（供合并）；ALL_AUTO_MODE_RULE_ID_SET：auto 模式规则 id 的集合；ALL_AUTO_MODE_RULE_ID_SET_WITH_UNTRUSTED：基础规则 + 不可信内容规则集合（同一声明共 4 个绑定）。
 */
var EXTRA_AUTO_MODE_RULE_IDS; // deferred: uses AUTO_MODE_RULE_IDS of its import cycle while loading; runs once the cycle is complete
var ALL_AUTO_MODE_RULE_ID_SET;
var ALL_AUTO_MODE_RULE_ID_SET_WITH_UNTRUSTED;
var ALL_AUTO_MODE_RULE_ID_SET_WITH_COWORK;
deferInit("chunk-1p0bwqzj.js:4829", () => {
  EXTRA_AUTO_MODE_RULE_IDS = [];
  ALL_AUTO_MODE_RULE_ID_SET = new Set([...AUTO_MODE_RULE_IDS, ...EXTRA_AUTO_MODE_RULE_IDS]);
  ALL_AUTO_MODE_RULE_ID_SET_WITH_UNTRUSTED = new Set([
    ...ALL_AUTO_MODE_RULE_ID_SET,
    ...UNTRUSTED_CONTENT_RULE_IDS,
  ]);
  ALL_AUTO_MODE_RULE_ID_SET_WITH_COWORK = new Set([...ALL_AUTO_MODE_RULE_ID_SET, ...COWORK_RULE_IDS]);
});
//@ chunk-1p0bwqzj.js:4923-5058 placement
/**
 * 字符串是否含控制字符（Tab 以外的 C0、C1、U+2028/2029）。
 */
function hasControlChars(text) {
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if ((code < 32 && code !== 9) || (code >= 127 && code <= 159) || code === 8232 || code === 8233)
      return true;
  }
  return false;
}
//@ chunk-1p0bwqzj.js:5058-5158 placement
var INVISIBLE_RULE_CHAR_RE =
  /[\p{Cf}\p{Default_Ignorable_Code_Point}\u2028\u2029\u2800\uFFF9-\uFFFB\u{1D173}-\u{1D17A}]/u;
//@ chunk-1p0bwqzj.js:5158-5191 placement
/**
 * hasInvisibleRuleChars：规则文本是否含不可见字符。
 */
function hasInvisibleRuleChars(text) {
  return INVISIBLE_RULE_CHAR_RE.test(text);
}
//@ chunk-1p0bwqzj.js:5191-5404 placement
/**
 * 检查用户规则文本是否含模板标记（<settings_、用户规则槽位、<cc_automode 区域标签），返回问题类型或 null。
 */
function findTemplateInjection(text) {
  if (
    text.includes("<settings_") ||
    USER_RULE_TEMPLATE_SLOTS.some((slot) => text.includes(`<${slot}`) || text.includes(`</${slot}`))
  )
    return "template_token";
  if (text.includes("<cc_automode") || text.includes("</cc_automode")) return "region_tag";
  return null;
}
//@ chunk-z20c443b.js:194261-194290 placement
/**
 * isExactlyTrue：严格等于 true 的判定（限制项持有器）。
 */
function isExactlyTrue(atPath) {
  return atPath === true;
}
//@ chunk-z20c443b.js:194290-194424 placement
function isPolicyModOptionValue(value) {
  return (
    value !== false &&
    (["string", "number", "boolean"].includes(typeof value) ||
      (Array.isArray(value) && value.every((item) => typeof item === "string")))
  );
}
//@ chunk-z20c443b.js:194424-194564 placement
var HOST_POLICY_HOLD_PATHS; // deferred: uses SEC_DEFAULT_PLUGIN_ID (../settings/managedRestrictionKeys.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:194424", () => {
  HOST_POLICY_HOLD_PATHS = [
    ...RESTRICTION_KEYS.settings.map((setting) => ({
      path: [setting],
      holds: isExactlyTrue,
    })),
    ...RESTRICTION_KEYS.policyModOptions.map((policyModOption) => ({
      path: ["pluginConfigs", SEC_DEFAULT_PLUGIN_ID, "options", policyModOption],
      holds: isPolicyModOptionValue,
    })),
  ];
});
//@ chunk-z20c443b.js:194564-194718 placement
/**
 * auto 模式可覆盖的规则段（allow/environment/soft_deny）及其 CCR 环境变量名。
 */
var AUTO_MODE_RULE_SECTIONS = ["allow", "environment", "soft_deny"];
var AUTO_MODE_SECTION_ENV_VARS = {
  allow: "CCR_AUTO_MODE_ALLOW",
  environment: "CCR_AUTO_MODE_ENVIRONMENT",
  soft_deny: "CCR_AUTO_MODE_SOFT_DENY",
};
//@ chunk-z20c443b.js:194718-194791 placement
/**
 * isAcceptableRuleText：规则文本可用（非空、无控制字符、无模板注入）。
 */
function isAcceptableRuleText(text) {
  return (
    text.trim().length > 0 &&
    !hasControlChars(text) &&
    !hasInvisibleRuleChars(text) &&
    findTemplateInjection(text) === null
  );
}
//@ chunk-z20c443b.js:194791-194999 placement
function parseRuleOverrideList(value) {
  if (!Array.isArray(value) || !value.every((entry) => entry === null || typeof entry === "string"))
    return null;
  let unique = new Set(value);
  unique.delete(DEFAULTS_PLACEHOLDER);
  let filtered = [...unique].filter((entry) => entry !== null && isAcceptableRuleText(entry));
  return {
    entries: filtered,
    refused: unique.size - filtered.length,
  };
}
//@ chunk-z20c443b.js:194999-195383 placement
/**
 * 读取 auto mode 规则覆盖（不可读的标记出来）。
 */
function readAutoModeRuleOverrides(source) {
  let rules = {};
  let refused = {};
  for (let section of AUTO_MODE_RULE_SECTIONS) {
    let rawList = source?.[section];
    if (rawList === undefined) continue;
    let ruleOverrideList = parseRuleOverrideList(rawList);
    if (ruleOverrideList === null) {
      refused[section] = "unreadable";
      continue;
    }
    if (ruleOverrideList.refused > 0) refused[section] = ruleOverrideList.refused;
    if (ruleOverrideList.entries.length > 0) rules[section] = ruleOverrideList.entries;
  }
  let grantsWithheld =
    (refused.soft_deny !== undefined || refused.environment !== undefined) &&
    (rules.allow !== undefined || rules.environment !== undefined);
  if (grantsWithheld) {
    delete rules.allow;
    delete rules.environment;
  }
  return {
    rules,
    refused,
    grantsWithheld,
  };
}
//@ chunk-z20c443b.js:195383-195506 placement
/**
 * 给每个存在的规则段在开头补上 $defaults 占位，保留内置默认规则。
 */
function prependDefaultsToSections(rules) {
  let result = {};
  for (let section of AUTO_MODE_RULE_SECTIONS) {
    let entries = rules[section];
    if (entries !== undefined) result[section] = [DEFAULTS_PLACEHOLDER, ...entries];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
//@ chunk-z20c443b.js:196671-196823 placement
/**
 * API 提供方类型列表（anthropic、bedrock、vertex、foundry、gateway 等）及其集合。
 */
var API_PROVIDER_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ANTHROPIC_PROVIDER_ID_RE;
var API_PROVIDER_KIND_SET;
deferInit("chunk-z20c443b.js:196671", () => {
  API_PROVIDER_KINDS = [
    "anthropic",
    "customEndpoint",
    "bedrock",
    "vertex",
    "foundry",
    "anthropicAws",
    "mantle",
    "gateway",
  ];
  ANTHROPIC_PROVIDER_ID_RE = /^anthropic[A-Z][A-Za-z0-9]*$/;
  API_PROVIDER_KIND_SET = new Set(API_PROVIDER_KINDS);
});
//@ chunk-z20c443b.js:196823-196876 placement
/**
 * isApiProviderKind：是否为已知 API 提供方类型。
 */
function isApiProviderKind(kind) {
  return typeof kind === "string" && API_PROVIDER_KIND_SET.has(kind);
}
//@ chunk-z20c443b.js:196876-196937 placement
/**
 * isAnthropicProviderId：提供方类型或其 Anthropic id 形式。
 */
function isAnthropicProviderId(kind) {
  return isApiProviderKind(kind) || (typeof kind === "string" && ANTHROPIC_PROVIDER_ID_RE.test(kind));
}
export {
  ALL_AUTO_MODE_RULE_ID_SET_WITH_COWORK,
  UNTRUSTED_CONTENT_RULE_IDS,
  AUTO_MODE_RULE_IDS,
  COWORK_RULE_IDS,
  replacesDefaultRules,
  ALL_AUTO_MODE_RULE_ID_SET_WITH_UNTRUSTED,
  ruleIdFromBracketPrefix,
  ALL_AUTO_MODE_RULE_ID_SET,
  DEFAULTS_PLACEHOLDER,
  replacesDefaults,
  normalizeRuleSlug,
  userDenyRulesSection,
  fillAutoModeRuleSlots,
  AUTO_MODE_RULE_SECTIONS,
  AUTO_MODE_SECTION_ENV_VARS,
  readAutoModeRuleOverrides,
  prependDefaultsToSections,
  API_PROVIDER_KINDS,
  expandDefaultsPlaceholder,
  hasControlChars,
  hasInvisibleRuleChars,
  findTemplateInjection,
  isPolicyModOptionValue,
  isExactlyTrue,
  HOST_POLICY_HOLD_PATHS,
  isApiProviderKind,
  isAnthropicProviderId,
  isAcceptableRuleText,
};
