/**
 * services/homeSeed/portableSettings.ts
 *
 * 2.1.316 新增：可移植设置筛选
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwpc82tt.js (23)
 * attribution: placement 23
 */
import { isPlainObject } from "../../utils/isPlainObject.js";
import {
  FORBIDDEN_KEYS,
  MAX_JSON_NESTING,
  MAX_PACK_FILES,
  MAX_SETTINGS_DEPTH,
  MAX_SETTINGS_VALUES,
} from "./homePack.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { RUt } from "./workingFiles.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { containsSecret } from "../../utils/redactSecrets.js";
import { scanForSecrets } from "../teamMemorySync/secretScanner.js";
import { UDi, abs } from "../../utils/redaction/urlParsing.js";
import { ZDn } from "../../utils/redaction/urlRedaction.js";
import { DEVICE_BASH_TOOL, REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { TOOL_VALIDATION_CONFIG } from "../../utils/settings/toolValidationConfig.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { LSP_TOOL_NAME } from "../../tools/LSPTool/UI.js";
import { ARTIFACT_FAMILY_TOOL_NAMES, ARTIFACT_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import { SENDFILE } from "../../tools/SendFileTool/prompt.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import {
  BATCH_RESTRICTED_TOOLS,
  CLAUDE_IN_CHROME_MCP_SERVER_NAME,
} from "../../utils/claudeInChrome/common.js";
import { buildMcpToolName, mcpInfoFromString } from "../mcp/mcpStringUtils.js";
import { BROWSER_SERVER_NAMES } from "../../utils/permissions/browserToolNames.js";
import { FILE_UPLOAD_TOOLS } from "../mcp/utils.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { PUBLISH_PLUGIN_TOOL_NAME } from "../../tools/PublishPluginTool/prompt.js";
import { hasWildcard, permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { isSettingsToCloudEnabledCached } from "../analytics/violinGates.js";
import {
  emptyRuleCounts,
  filterPermissionRules,
  g,
  ne,
  pickAttribution,
  E,
  scrubCredentialValues,
  kt,
  classifyRulePathRoot,
  isPortableShellAllowRule,
  isLocalWebDomainRule,
  _t,
} from "./deviceRuleFilter.js";
import { count } from "../../utils/collections.js";
import { getSettingsSchemaForDocument } from "../../utils/settings/types.js";
import { sortKeysDeep } from "../../utils/settings/settingsSourceTrust.js";
import { validatePermissionRule } from "../../utils/settings/permissionValidation.js";

//@ chunk-bwpc82tt.js:6346-6433 placement
function L(e, t) {
  return e === void 0 || (isPlainObject(e) && Object.keys(e).every((n) => t.has(n) || FORBIDDEN_KEYS.has(n)));
}
//@ chunk-bwpc82tt.js:6433-6507 placement
function be(e) {
  return Array.isArray(e) && e.every((t) => typeof t === "string");
}
//@ chunk-bwpc82tt.js:6507-6554 placement
function bln(e) {
  try {
    return jsonParse(e);
  } catch {
    return;
  }
}
/**
 * 扫描 JSON 文本（跳过字符串），括号嵌套超过上限时返回 true。
 */
//@ chunk-bwpc82tt.js:6554-6769 placement
function exceedsJsonNesting(e) {
  let t = 0,
    n = !1;
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    if (n) {
      if (s === "\\") r++;
      else if (s === '"') n = !1;
    } else if (s === '"') n = !0;
    else if (s === "[" || s === "{") {
      if ((t++, t > MAX_JSON_NESTING)) return !0;
    } else if (s === "]" || s === "}") t--;
  }
  return !1;
}
//@ chunk-bwpc82tt.js:6769-6846 placement
function Oe(e) {
  let t = isPlainObject(e) ? e.files : void 0;
  return Array.isArray(t) && t.length > MAX_PACK_FILES;
}
//@ chunk-bwpc82tt.js:6846-6903 placement
function Pe(e) {
  return !isPlainObject(e) || (isWithinValueBounds(e.settings) && isJsonPlainValue(e.settings));
}
//@ chunk-bwpc82tt.js:6903-6937 placement
function Ce(e) {
  return RUt(e.path);
}
//@ chunk-bwpc82tt.js:6937-7134 placement
function decodePackFile(e) {
  if (e.content.length !== Math.ceil(e.size / 3) * 4) return null;
  let buffer = Buffer.from(e.content, "base64");
  return buffer.length === e.size && computeContentHash(buffer) === e.sha256
    ? { path: e.path, content: buffer, sha256: e.sha256 }
    : null;
}
/**
 * 迭代检查值的嵌套深度与值总数是否在上限内。
 */
//@ chunk-bwpc82tt.js:7134-7422 placement
function isWithinValueBounds(e) {
  let t = [{ value: e, depth: 0 }],
    n = 1;
  for (let r = t.pop(); r !== void 0; r = t.pop()) {
    let { value: s, depth: depth } = r;
    if (depth > MAX_SETTINGS_DEPTH) return !1;
    if (typeof s !== "object" || s === null) continue;
    let c = Array.isArray(s) ? s : Object.values(s);
    if (((n += c.length), n > MAX_SETTINGS_VALUES)) return !1;
    for (let a of c) t.push({ value: a, depth: depth + 1 });
  }
  return !0;
}
/**
 * 迭代检查值是否只由 JSON 可表达的原始值、数组与普通对象组成。
 */
//@ chunk-bwpc82tt.js:7422-7796 placement
function isJsonPlainValue(e) {
  let t = [e];
  while (t.length > 0) {
    let n = t.pop();
    if (
      n === null ||
      typeof n === "string" ||
      typeof n === "boolean" ||
      (typeof n === "number" && Number.isFinite(n))
    )
      continue;
    if (Array.isArray(n)) {
      for (let r = 0; r < n.length; r++) t.push(n[r]);
      continue;
    }
    if (isPlainObject(n)) {
      let prototypeOf = Object.getPrototypeOf(n);
      if (prototypeOf === Object.prototype || prototypeOf === null) {
        for (let s of Object.values(n)) t.push(s);
        continue;
      }
    }
    return !1;
  }
  return !0;
}
//@ chunk-bwpc82tt.js:7796-7908 placement
function sortedPortableCopy(e) {
  return Object.fromEntries(
    Object.keys(e)
      .filter((t) => !FORBIDDEN_KEYS.has(t))
      .toSorted()
      .map((t) => [t, Z(e[t])]),
  );
}
//@ chunk-bwpc82tt.js:7908-7967 placement
function Z(e) {
  return Array.isArray(e) ? e.map(Z) : isPlainObject(e) ? sortedPortableCopy(e) : e;
}
//@ chunk-bwpc82tt.js:7967-8026 placement
function ke(e, t) {
  return e.path < t.path ? -1 : e.path > t.path ? 1 : 0;
}
//@ chunk-bwpc82tt.js:8026-8419 placement
var regExp = new RegExp(
    `^(?:${[String.raw`\*+`, String.raw`(["']?)(?:\$(?:env:)?[A-Za-z_]\w*|\$\{(?:env:)?[A-Za-z_][\w.]*(?::?\?[^{}]*)?\}|\$\{\{[^{}]*\}\}|\$\([^()]*\)|%[A-Za-z_]\w*%)\1`, String.raw`<[^<>]*>|\{[^{}]*\}|\{\{[^{}]*\}\}|%s|x+`, "password|passwd|pass|secret|changeme|example"].join("|")})?$`,
    "i",
  ),
  xe = /^(?:\[[^\]]*\]|[^:?#]*)(?::\d*)?[?#]/,
  Ie = /^sha256:(?:[0-9a-f]{64}(?![\w.-])|[*$<{])/i;
//@ chunk-bwpc82tt.js:8419-8495 placement
function AAe(e) {
  return looksLikeCredential(e) || (e.includes("\x00") && looksLikeCredential(e.replaceAll("\x00", "")));
}
/**
 * 文本是否像凭证：直接或经 URL/转义解码后扫描到密钥，或出现带值的密钥赋值片段（排除部分常见误报）。
 */
//@ chunk-bwpc82tt.js:8495-8930 placement
function looksLikeCredential(e) {
  let replaced = e.replace(/%[0-9A-Fa-f]{2}|\\[nrt]/g, " "),
    replaced_2 = replaced.replace(/[^\w.~+/=-]+/g, " "),
    r = [replaced_2, replaced_2.replace(/[.~+/=]+(?= |$)/g, " "), replaced.replace(/[^\w-]+/g, " ")];
  return (
    containsSecret(e) ||
    containsSecret(replaced) ||
    r.some((s) => scanForSecrets(s).length > 0) ||
    UDi(e).some(({ start: start, end: end, separatorEnd: separatorEnd }) => {
      let sliced = e.slice(start, end),
        match = ZDn.exec(sliced);
      return (
        match !== null &&
        !regExp.test(sliced.slice(match.index + match[0].length)) &&
        !Ie.test(e.slice(separatorEnd, separatorEnd + 72)) &&
        !(xe.test(sliced) && abs.test(e.slice(Math.max(0, start - 11), start - 3)))
      );
    })
  );
}
/**
 * 可移植设置筛选用到的键顺序、长度与条数上限，以及按工具族展开规则（读、编辑、shell、Artifact）的工具名列表。
 */
//@ chunk-bwpc82tt.js:8930-9501 placement
var PORTABLE_KEYS_ORDER = [
    "language",
    "outputStyle",
    "attribution",
    "includeCoAuthoredBy",
    "includeGitInstructions",
    "alwaysThinkingEnabled",
    "showThinkingSummaries",
    "permissions",
  ],
  ATTRIBUTION_KEYS = ["commit", "pr", "sessionUrl", "commitTrailers"],
  PERMISSION_BEHAVIORS = ["allow", "deny", "ask"],
  DEVICE_SERVER_ID = DEVICE_BASH_TOOL,
  MAX_STRING_SETTING_LENGTH = 256,
  MAX_ATTRIBUTION_LENGTH = 8192,
  MAX_RULE_LENGTH = 1024,
  MAX_RULES_PER_BEHAVIOR = 1000,
  MAX_SETTINGS_BYTES = 1048576,
  PATH_RULE_TOOLS = new Set([...TOOL_VALIDATION_CONFIG.filePatternTools, GREP_TOOL_NAME, "MultiEdit", "LS"]),
  READ_FAMILY_TOOLS = [
    FILE_READ_TOOL_NAME,
    GREP_TOOL_NAME,
    GLOB_TOOL_NAME,
    LSP_TOOL_NAME,
    ...ARTIFACT_FAMILY_TOOL_NAMES,
    WORKFLOW_TOOL_NAME,
    SENDFILE,
    SEND_USER_FILE_TOOL_NAME,
    ...BATCH_RESTRICTED_TOOLS.map((e) => buildMcpToolName(CLAUDE_IN_CHROME_MCP_SERVER_NAME, e)),
    ...[...BROWSER_SERVER_NAMES].flatMap((e) => FILE_UPLOAD_TOOLS.map((t) => buildMcpToolName(e, t))),
    "NotebookRead",
    "LS",
    ...TOOL_VALIDATION_CONFIG.bashPrefixTools,
    POWERSHELL_TOOL_NAME,
    MONITOR,
  ],
  ARTIFACT_FAMILY = ARTIFACT_FAMILY_TOOL_NAMES,
  SHELL_FAMILY_TOOLS = [...TOOL_VALIDATION_CONFIG.bashPrefixTools, MONITOR],
  EDIT_FAMILY_TOOLS = [
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    ...ARTIFACT_FAMILY_TOOL_NAMES,
    "MultiEdit",
    PUBLISH_PLUGIN_TOOL_NAME,
    ...READ_FAMILY_TOOLS,
  ];
/**
 * 给出某工具名的规则会覆盖的工具族（编辑、Artifact、读、shell）；整服务器的 MCP 规则展开为通配。
 */
//@ chunk-bwpc82tt.js:9501-9699 placement
function getRuleToolFamily(e) {
  if (e === FILE_EDIT_TOOL_NAME) return EDIT_FAMILY_TOOLS;
  if (e === ARTIFACT_TOOL_NAME) return ARTIFACT_FAMILY;
  if (e === FILE_READ_TOOL_NAME) return READ_FAMILY_TOOLS;
  if (SHELL_FAMILY_TOOLS.includes(e)) return SHELL_FAMILY_TOOLS;
  let t = mcpInfoFromString(e);
  if (t !== null && t.toolName === void 0 && !hasWildcard(e))
    return [`${buildMcpToolName(t.serverName, "")}*`];
  return [e];
}
//@ chunk-bwpc82tt.js:9699-9961 placement
var SHELL_RULE_TOOLS = new Set([...TOOL_VALIDATION_CONFIG.bashPrefixTools, POWERSHELL_TOOL_NAME]),
  WEB_RULE_TOOLS = new Set([WEBFETCH, "WebBrowser"]),
  POSIX_ROOT = "/",
  CONTROL_CHAR_RE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]/u,
  UNSAFE_TEXT_CHAR_RE = /[\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]|[^\P{Cc}\t\n\r]|\r(?!\n)/u,
  RULE_TOOL_NAME_RE = /^[\w*-]+$/,
  TRIPLE_STAR_RE = /\*{3,}/,
  MAX_RULE_STARS = 8;
/**
 * 从用户设置中筛选可转发到云端的部分：开关关闭或设置不可读时不发；权限规则按 PreToolUse 钩子与解析丢失情况过滤；去掉像凭证的文本；通过 schema 与大小检查后返回 document 与计数。
 */
//@ chunk-bwpc82tt.js:9961-11315 placement
function filterPortableSettings(
  userSettings,
  {
    settingsToCloud: settingsToCloud = isSettingsToCloudEnabledCached,
    preToolUseHookActiveHere: preToolUseHookActiveHere,
    hasLostAnAllowEntryAtParse: hasLostAnAllowEntryAtParse,
  },
) {
  if (!et(settingsToCloud))
    return {
      document: null,
      reason: "flag_off",
      counts: { forwardedKeys: 0, withheldKeys: 0, withheldCredentialTexts: 0, rules: emptyRuleCounts() },
    };
  if (!isPlainObject(userSettings))
    return {
      document: null,
      reason: "settings_unreadable",
      counts: { forwardedKeys: 0, withheldKeys: 0, withheldCredentialTexts: 0, rules: emptyRuleCounts() },
    };
  let permissions = filterPermissionRules(
      g(userSettings, "permissions"),
      preToolUseHookActiveHere,
      hasLostAnAllowEntryAtParse,
    ),
    i = g(userSettings, "language"),
    picked = {
      language: ne(typeof i === "string" ? i.trim() : i),
      outputStyle: ne(g(userSettings, "outputStyle")),
      attribution: pickAttribution(g(userSettings, "attribution")),
      includeCoAuthoredBy: E(g(userSettings, "includeCoAuthoredBy")),
      includeGitInstructions: E(g(userSettings, "includeGitInstructions")),
      alwaysThinkingEnabled: E(g(userSettings, "alwaysThinkingEnabled")),
      showThinkingSummaries: E(g(userSettings, "showThinkingSummaries")),
      permissions: permissions.value,
    },
    scrubbed = scrubCredentialValues(PORTABLE_KEYS_ORDER.reduce((b, ce) => kt(b, picked, ce), {})),
    kept = scrubbed.kept ?? {},
    keys = Object.keys(userSettings),
    counts = {
      forwardedKeys: Object.keys(kept).length,
      withheldKeys: count(keys, (b) => !Object.hasOwn(kept, b)),
      withheldCredentialTexts: scrubbed.withheld,
      rules: permissions.counts,
    };
  if (counts.forwardedKeys === 0) return { document: null, reason: "nothing_to_send", counts: counts };
  let refusedCounts = {
    ...counts,
    forwardedKeys: 0,
    withheldKeys: keys.length,
    rules: { ...counts.rules, kept: 0, coveringDeviceTools: 0 },
  };
  if (!getSettingsSchemaForDocument(kept).safeParse(kept).success)
    return { document: null, reason: "schema_rejected", counts: refusedCounts };
  if (Buffer.byteLength(HOo(kept), "utf8") > MAX_SETTINGS_BYTES)
    return { document: null, reason: "settings_too_large", counts: refusedCounts };
  return { document: kept, counts: counts };
}
//@ chunk-bwpc82tt.js:11315-11361 placement
function et(e) {
  try {
    return e();
  } catch {
    return !1;
  }
}
//@ chunk-bwpc82tt.js:11361-11404 placement
function HOo(e) {
  return (
    jsonStringify(sortKeysDeep(e), null, 2) +
    `
`
  );
}
/**
 * 判断单条权限规则能否转发：过长、像凭证、非法、远程设备工具、以机器/主目录为根的路径、shell 允许规则不安全、Web 允许本地主机等分别给出丢弃原因，否则 keep。
 */
//@ chunk-bwpc82tt.js:11404-12011 placement
function classifyPortableRule(rule, behavior) {
  if (rule.length > MAX_RULE_LENGTH) return "over_cap";
  if (AAe(rule)) return "credential";
  if (
    CONTROL_CHAR_RE.test(rule) ||
    TRIPLE_STAR_RE.test(rule) ||
    count([...rule], (s) => s === "*") > MAX_RULE_STARS ||
    !validatePermissionRule(rule, behavior).valid
  )
    return "invalid";
  let { toolName: toolName, ruleContent: ruleContent } = permissionRuleValueFromString(rule);
  if (!RULE_TOOL_NAME_RE.test(toolName)) return "invalid";
  if (mcpInfoFromString(toolName)?.serverName === REMOTE_DEVICES)
    return behavior === "allow" ? "device" : "keep_covers_device_tools";
  if (ruleContent !== void 0 && (PATH_RULE_TOOLS.has(toolName) || hasWildcard(toolName))) {
    let s = classifyRulePathRoot(ruleContent);
    if (s === "machine" || (s === "home" && behavior === "allow")) return "rooted";
  }
  if (
    ruleContent !== void 0 &&
    behavior === "allow" &&
    SHELL_RULE_TOOLS.has(toolName) &&
    !isPortableShellAllowRule(ruleContent, toolName)
  )
    return "rooted";
  if (
    ruleContent !== void 0 &&
    behavior === "allow" &&
    WEB_RULE_TOOLS.has(toolName) &&
    isLocalWebDomainRule(ruleContent)
  )
    return "rooted";
  if (behavior !== "allow" && _t(toolName)) return "keep_covers_device_tools";
  return "keep";
}

export {
  AAe,
  filterPortableSettings,
  isWithinValueBounds,
  isJsonPlainValue,
  ke,
  sortedPortableCopy,
  exceedsJsonNesting,
  bln,
  Oe,
  Pe,
  Ce,
  decodePackFile,
  L,
  be,
  DEVICE_SERVER_ID,
  POSIX_ROOT,
  PERMISSION_BEHAVIORS,
  getRuleToolFamily,
  MAX_RULES_PER_BEHAVIOR,
  classifyPortableRule,
  PATH_RULE_TOOLS,
  ATTRIBUTION_KEYS,
  MAX_STRING_SETTING_LENGTH,
  CONTROL_CHAR_RE,
  MAX_ATTRIBUTION_LENGTH,
  UNSAFE_TEXT_CHAR_RE,
  HOo,
};
