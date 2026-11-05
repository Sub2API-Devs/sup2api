/**
 * services/homeSeed/portableSettings.ts
 *
 * 2.1.316 新增：可移植设置筛选
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-t58ha4ac.js (23)
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
import { isWorkingFilePath as isWorkingFilePath_2 } from "./workingFiles.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { containsSecret } from "../../utils/redactSecrets.js";
import { scanForSecrets } from "../teamMemorySync/secretScanner.js";
import { urlSpans, WEB_SCHEME_TAIL_RE } from "../../utils/redaction/urlParsing.js";
import { COLON_RE } from "../../utils/redaction/urlRedaction.js";
import { DEVICE_BASH_TOOL, REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { TOOL_VALIDATION_CONFIG } from "../../utils/settings/toolValidationConfig.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { READ } from "../../tools/FileReadTool/constants.js";
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
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { PUBLISH_PLUGIN_TOOL_NAME } from "../../tools/PublishPluginTool/prompt.js";
import { hasWildcard, parseRuleString } from "../../utils/permissions/permissionRuleParser.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { isSettingsToCloudEnabledCached } from "../analytics/violinGates.js";
import {
  emptyRuleCounts,
  filterPermissionRules,
  getOwn,
  pickNonEmptyString,
  pickAttribution,
  asBooleanOrUndefined,
  scrubCredentialValues,
  pickSchemaValidSetting,
  classifyRulePathRoot,
  isPortableShellAllowRule,
  isLocalWebDomainRule,
  matchesDeviceServerId,
} from "./deviceRuleFilter.js";
import { countWhere } from "../../utils/collections.js";
import { getSettingsSchemaForDocument } from "../../utils/settings/types.js";
import { sortKeysDeep } from "../../utils/settings/settingsSourceTrust.js";
import { validatePermissionRule } from "../../utils/settings/permissionValidation.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-t58ha4ac.js:6445-6532 placement
/**
 * 判断对象的键是否都在允许/禁止集合内。
 */
function hasOnlyAllowedKeys(settings, allowed) {
  return (
    settings === undefined ||
    (isPlainObject(settings) &&
      Object.keys(settings).every((key) => allowed.has(key) || FORBIDDEN_KEYS.has(key)))
  );
}
//@ chunk-t58ha4ac.js:6532-6606 placement
/**
 * 判断是否为字符串数组。
 */
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
//@ chunk-t58ha4ac.js:6606-6653 placement
/**
 * 尝试解析 JSON，失败返回 undefined。
 */
function tryJsonParse(text) {
  try {
    return jsonParse(text);
  } catch {
    return;
  }
}
//@ chunk-t58ha4ac.js:6653-6868 placement
/**
 * 扫描 JSON 文本（跳过字符串），括号嵌套超过上限时返回 true。
 */
function exceedsJsonNesting(text) {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    if (inString) {
      if (char === "\\") i++;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "[" || char === "{") {
      depth++;
      if (depth > MAX_JSON_NESTING) return true;
    } else if (char === "]" || char === "}") depth--;
  }
  return false;
}
//@ chunk-t58ha4ac.js:6868-6945 placement
/**
 * 判断 files 列表是否超过打包文件数上限。
 */
function exceedsMaxPackFiles(parsed) {
  let files = isPlainObject(parsed) ? parsed.files : undefined;
  return Array.isArray(files) && files.length > MAX_PACK_FILES;
}
//@ chunk-t58ha4ac.js:6945-7002 placement
/**
 * 判断对象没有 settings 或 settings 可序列化。
 */
function hasSerializableSettings(parsed) {
  return (
    !isPlainObject(parsed) || (isWithinValueBounds(parsed.settings) && isJsonPlainValue(parsed.settings))
  );
}
//@ chunk-t58ha4ac.js:7002-7036 placement
/**
 * 判断路径是否是可工作的目标文件。
 */
function isWorkingFilePath(file) {
  return isWorkingFilePath_2(file.path);
}
//@ chunk-t58ha4ac.js:7036-7233 placement
function decodePackFile(file) {
  if (file.content.length !== Math.ceil(file.size / 3) * 4) return null;
  let buffer = Buffer.from(file.content, "base64");
  return buffer.length === file.size && computeContentHash(buffer) === file.sha256
    ? {
        path: file.path,
        content: buffer,
        sha256: file.sha256,
      }
    : null;
}
//@ chunk-t58ha4ac.js:7233-7521 placement
/**
 * 迭代检查值的嵌套深度与值总数是否在上限内。
 */
function isWithinValueBounds(value) {
  let stack = [
    {
      value,
      depth: 0,
    },
  ];
  let valueCount = 1;
  for (let entry = stack.pop(); entry !== undefined; entry = stack.pop()) {
    let { value: current, depth } = entry;
    if (depth > MAX_SETTINGS_DEPTH) return false;
    if (typeof current !== "object" || current === null) continue;
    let children = Array.isArray(current) ? current : Object.values(current);
    valueCount += children.length;
    if (valueCount > MAX_SETTINGS_VALUES) return false;
    for (let value of children)
      stack.push({
        value,
        depth: depth + 1,
      });
  }
  return true;
}
//@ chunk-t58ha4ac.js:7521-7895 placement
/**
 * 迭代检查值是否只由 JSON 可表达的原始值、数组与普通对象组成。
 */
function isJsonPlainValue(settings) {
  let stack = [settings];
  while (stack.length > 0) {
    let item = stack.pop();
    if (
      item === null ||
      typeof item === "string" ||
      typeof item === "boolean" ||
      (typeof item === "number" && Number.isFinite(item))
    )
      continue;
    if (Array.isArray(item)) {
      for (let i = 0; i < item.length; i++) stack.push(item[i]);
      continue;
    }
    if (isPlainObject(item)) {
      let prototypeOf = Object.getPrototypeOf(item);
      if (prototypeOf === Object.prototype || prototypeOf === null) {
        for (let key of Object.values(item)) stack.push(key);
        continue;
      }
    }
    return false;
  }
  return true;
}
//@ chunk-t58ha4ac.js:7895-8007 placement
function sortedPortableCopy(settings) {
  return Object.fromEntries(
    Object.keys(settings)
      .filter((key) => !FORBIDDEN_KEYS.has(key))
      .toSorted()
      .map((key) => [key, sortedCopy(settings[key])]),
  );
}
//@ chunk-t58ha4ac.js:8007-8066 placement
/**
 * 深拷贝并排序（数组逐项、对象按键）。
 */
function sortedCopy(value) {
  return Array.isArray(value)
    ? value.map(sortedCopy)
    : isPlainObject(value)
      ? sortedPortableCopy(value)
      : value;
}
//@ chunk-t58ha4ac.js:8066-8125 placement
/**
 * 按 path 排序的比较函数。
 */
function compareByPath(left, right) {
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
}
//@ chunk-t58ha4ac.js:8125-8518 placement
/**
 * 匹配 sha256: 摘要引用的正则。
 */
var regExp; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var URL_FRAGMENT_RE;
var SHA256_REF_RE;
deferInit("chunk-t58ha4ac.js:8125", () => {
  regExp = new RegExp(
    `^(?:${[String.raw`\*+`, String.raw`(["']?)(?:\$(?:env:)?[A-Za-z_]\w*|\$\{(?:env:)?[A-Za-z_][\w.]*(?::?\?[^{}]*)?\}|\$\{\{[^{}]*\}\}|\$\([^()]*\)|%[A-Za-z_]\w*%)\1`, String.raw`<[^<>]*>|\{[^{}]*\}|\{\{[^{}]*\}\}|%s|x+`, "password|passwd|pass|secret|changeme|example"].join("|")})?$`,
    "i",
  );
  URL_FRAGMENT_RE = /^(?:\[[^\]]*\]|[^:?#]*)(?::\d*)?[?#]/;
  SHA256_REF_RE = /^sha256:(?:[0-9a-f]{64}(?![\w.-])|[*$<{])/i;
});
//@ chunk-t58ha4ac.js:8518-8594 placement
/**
 * 判断文本是否像凭证（含 NUL 时去掉后再判断）。
 */
function looksLikeCredentialIncludingNul(text) {
  return (
    looksLikeCredential(text) || (text.includes("\x00") && looksLikeCredential(text.replaceAll("\x00", "")))
  );
}
//@ chunk-t58ha4ac.js:8594-9029 placement
/**
 * 文本是否像凭证：直接或经 URL/转义解码后扫描到密钥，或出现带值的密钥赋值片段（排除部分常见误报）。
 */
function looksLikeCredential(text) {
  let replaced = text.replace(/%[0-9A-Fa-f]{2}|\\[nrt]/g, " ");
  let replaced_2 = replaced.replace(/[^\w.~+/=-]+/g, " ");
  let decoded = [replaced_2, replaced_2.replace(/[.~+/=]+(?= |$)/g, " "), replaced.replace(/[^\w-]+/g, " ")];
  return (
    containsSecret(text) ||
    containsSecret(replaced) ||
    decoded.some((flag) => scanForSecrets(flag).length > 0) ||
    urlSpans(text).some(({ start, end, separatorEnd }) => {
      let sliced = text.slice(start, end);
      let match = COLON_RE.exec(sliced);
      return (
        match !== null &&
        !regExp.test(sliced.slice(match.index + match[0].length)) &&
        !SHA256_REF_RE.test(text.slice(separatorEnd, separatorEnd + 72)) &&
        !(
          URL_FRAGMENT_RE.test(sliced) &&
          WEB_SCHEME_TAIL_RE.test(text.slice(Math.max(0, start - 11), start - 3))
        )
      );
    })
  );
}
//@ chunk-t58ha4ac.js:9029-9600 placement
/**
 * 可移植设置筛选用到的键顺序、长度与条数上限，以及按工具族展开规则（读、编辑、shell、Artifact）的工具名列表。
 */
var PORTABLE_KEYS_ORDER; // deferred: uses DEVICE_BASH_TOOL (../mcp/firstPartyServerIds.js) of its import cycle while loading; runs once the cycle is complete
var ATTRIBUTION_KEYS;
var PERMISSION_BEHAVIORS;
var DEVICE_SERVER_ID;
var MAX_STRING_SETTING_LENGTH;
var MAX_ATTRIBUTION_LENGTH;
var MAX_RULE_LENGTH;
var MAX_RULES_PER_BEHAVIOR;
var MAX_SETTINGS_BYTES;
var PATH_RULE_TOOLS;
var READ_FAMILY_TOOLS;
var ARTIFACT_FAMILY;
var SHELL_FAMILY_TOOLS;
var EDIT_FAMILY_TOOLS;
deferInit("chunk-t58ha4ac.js:9029", () => {
  PORTABLE_KEYS_ORDER = [
    "language",
    "outputStyle",
    "attribution",
    "includeCoAuthoredBy",
    "includeGitInstructions",
    "alwaysThinkingEnabled",
    "showThinkingSummaries",
    "permissions",
  ];
  ATTRIBUTION_KEYS = ["commit", "pr", "sessionUrl", "commitTrailers"];
  PERMISSION_BEHAVIORS = ["allow", "deny", "ask"];
  DEVICE_SERVER_ID = DEVICE_BASH_TOOL;
  MAX_STRING_SETTING_LENGTH = 256;
  MAX_ATTRIBUTION_LENGTH = 8192;
  MAX_RULE_LENGTH = 1024;
  MAX_RULES_PER_BEHAVIOR = 1000;
  MAX_SETTINGS_BYTES = 1048576;
  PATH_RULE_TOOLS = new Set([...TOOL_VALIDATION_CONFIG.filePatternTools, GREP_TOOL_NAME, "MultiEdit", "LS"]);
  READ_FAMILY_TOOLS = [
    READ,
    GREP_TOOL_NAME,
    GLOB_TOOL_NAME,
    LSP_TOOL_NAME,
    ...ARTIFACT_FAMILY_TOOL_NAMES,
    WORKFLOW_TOOL_NAME,
    SENDFILE,
    SEND_USER_FILE_TOOL_NAME,
    ...BATCH_RESTRICTED_TOOLS.map((key) => buildMcpToolName(CLAUDE_IN_CHROME_MCP_SERVER_NAME, key)),
    ...[...BROWSER_SERVER_NAMES].flatMap((key) =>
      FILE_UPLOAD_TOOLS.map((label) => buildMcpToolName(key, label)),
    ),
    "NotebookRead",
    "LS",
    ...TOOL_VALIDATION_CONFIG.bashPrefixTools,
    POWERSHELL_TOOL_NAME,
    MONITOR,
  ];
  ARTIFACT_FAMILY = ARTIFACT_FAMILY_TOOL_NAMES;
  SHELL_FAMILY_TOOLS = [...TOOL_VALIDATION_CONFIG.bashPrefixTools, MONITOR];
  EDIT_FAMILY_TOOLS = [
    EDIT,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    ...ARTIFACT_FAMILY_TOOL_NAMES,
    "MultiEdit",
    PUBLISH_PLUGIN_TOOL_NAME,
    ...READ_FAMILY_TOOLS,
  ];
});
//@ chunk-t58ha4ac.js:9600-9798 placement
/**
 * 给出某工具名的规则会覆盖的工具族（编辑、Artifact、读、shell）；整服务器的 MCP 规则展开为通配。
 */
function getRuleToolFamily(toolName) {
  if (toolName === EDIT) return EDIT_FAMILY_TOOLS;
  if (toolName === ARTIFACT_TOOL_NAME) return ARTIFACT_FAMILY;
  if (toolName === READ) return READ_FAMILY_TOOLS;
  if (SHELL_FAMILY_TOOLS.includes(toolName)) return SHELL_FAMILY_TOOLS;
  let ruleToolName = mcpInfoFromString(toolName);
  if (ruleToolName !== null && ruleToolName.toolName === undefined && !hasWildcard(toolName))
    return [`${buildMcpToolName(ruleToolName.serverName, "")}*`];
  return [toolName];
}
//@ chunk-t58ha4ac.js:9798-10060 placement
var SHELL_RULE_TOOLS; // deferred: uses WEBFETCH (../../tools/WebFetchTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
var WEB_RULE_TOOLS;
var POSIX_ROOT;
var CONTROL_CHAR_RE;
var UNSAFE_TEXT_CHAR_RE;
var RULE_TOOL_NAME_RE;
var TRIPLE_STAR_RE;
var MAX_RULE_STARS;
deferInit("chunk-t58ha4ac.js:9798", () => {
  SHELL_RULE_TOOLS = new Set([...TOOL_VALIDATION_CONFIG.bashPrefixTools, POWERSHELL_TOOL_NAME]);
  WEB_RULE_TOOLS = new Set([WEBFETCH, "WebBrowser"]);
  POSIX_ROOT = "/";
  CONTROL_CHAR_RE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]/u;
  UNSAFE_TEXT_CHAR_RE = /[\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]|[^\P{Cc}\t\n\r]|\r(?!\n)/u;
  RULE_TOOL_NAME_RE = /^[\w*-]+$/;
  TRIPLE_STAR_RE = /\*{3,}/;
  MAX_RULE_STARS = 8;
});
//@ chunk-t58ha4ac.js:10060-11414 placement
/**
 * 从用户设置中筛选可转发到云端的部分：开关关闭或设置不可读时不发；权限规则按 PreToolUse 钩子与解析丢失情况过滤；去掉像凭证的文本；通过 schema 与大小检查后返回 document 与计数。
 */
function filterPortableSettings(
  userSettings,
  { settingsToCloud = isSettingsToCloudEnabledCached, preToolUseHookActiveHere, hasLostAnAllowEntryAtParse },
) {
  if (!safeBooleanCall(settingsToCloud))
    return {
      document: null,
      reason: "flag_off",
      counts: {
        forwardedKeys: 0,
        withheldKeys: 0,
        withheldCredentialTexts: 0,
        rules: emptyRuleCounts(),
      },
    };
  if (!isPlainObject(userSettings))
    return {
      document: null,
      reason: "settings_unreadable",
      counts: {
        forwardedKeys: 0,
        withheldKeys: 0,
        withheldCredentialTexts: 0,
        rules: emptyRuleCounts(),
      },
    };
  let permissions = filterPermissionRules(
    getOwn(userSettings, "permissions"),
    preToolUseHookActiveHere,
    hasLostAnAllowEntryAtParse,
  );
  let write = getOwn(userSettings, "language");
  let picked = {
    language: pickNonEmptyString(typeof write === "string" ? write.trim() : write),
    outputStyle: pickNonEmptyString(getOwn(userSettings, "outputStyle")),
    attribution: pickAttribution(getOwn(userSettings, "attribution")),
    includeCoAuthoredBy: asBooleanOrUndefined(getOwn(userSettings, "includeCoAuthoredBy")),
    includeGitInstructions: asBooleanOrUndefined(getOwn(userSettings, "includeGitInstructions")),
    alwaysThinkingEnabled: asBooleanOrUndefined(getOwn(userSettings, "alwaysThinkingEnabled")),
    showThinkingSummaries: asBooleanOrUndefined(getOwn(userSettings, "showThinkingSummaries")),
    permissions: permissions.value,
  };
  let scrubbed = scrubCredentialValues(
    PORTABLE_KEYS_ORDER.reduce((acc, options) => pickSchemaValidSetting(acc, picked, options), {}),
  );
  let kept = scrubbed.kept ?? {};
  let keys = Object.keys(userSettings);
  let counts = {
    forwardedKeys: Object.keys(kept).length,
    withheldKeys: countWhere(keys, (predicate) => !Object.hasOwn(kept, predicate)),
    withheldCredentialTexts: scrubbed.withheld,
    rules: permissions.counts,
  };
  if (counts.forwardedKeys === 0)
    return {
      document: null,
      reason: "nothing_to_send",
      counts,
    };
  let refusedCounts = {
    ...counts,
    forwardedKeys: 0,
    withheldKeys: keys.length,
    rules: {
      ...counts.rules,
      kept: 0,
      coveringDeviceTools: 0,
    },
  };
  if (!getSettingsSchemaForDocument(kept).safeParse(kept).success)
    return {
      document: null,
      reason: "schema_rejected",
      counts: refusedCounts,
    };
  if (Buffer.byteLength(canonicalJson(kept), "utf8") > MAX_SETTINGS_BYTES)
    return {
      document: null,
      reason: "settings_too_large",
      counts: refusedCounts,
    };
  return {
    document: kept,
    counts,
  };
}
//@ chunk-t58ha4ac.js:11414-11460 placement
/**
 * 调用函数并吞掉错误（出错返回 false）。
 */
function safeBooleanCall(settingsToCloud) {
  try {
    return settingsToCloud();
  } catch {
    return false;
  }
}
//@ chunk-t58ha4ac.js:11460-11503 placement
/**
 * 生成键排序、两格缩进的 JSON 文本。
 */
function canonicalJson(value) {
  return (
    jsonStringify(sortKeysDeep(value), null, 2) +
    `
`
  );
}
//@ chunk-t58ha4ac.js:11503-12110 placement
/**
 * 判断单条权限规则能否转发：过长、像凭证、非法、远程设备工具、以机器/主目录为根的路径、shell 允许规则不安全、Web 允许本地主机等分别给出丢弃原因，否则 keep。
 */
function classifyPortableRule(rule, behavior) {
  if (rule.length > MAX_RULE_LENGTH) return "over_cap";
  if (looksLikeCredentialIncludingNul(rule)) return "credential";
  if (
    CONTROL_CHAR_RE.test(rule) ||
    TRIPLE_STAR_RE.test(rule) ||
    countWhere([...rule], (rule) => rule === "*") > MAX_RULE_STARS ||
    !validatePermissionRule(rule, behavior).valid
  )
    return "invalid";
  let { toolName, ruleContent } = parseRuleString(rule);
  if (!RULE_TOOL_NAME_RE.test(toolName)) return "invalid";
  if (mcpInfoFromString(toolName)?.serverName === REMOTE_DEVICES)
    return behavior === "allow" ? "device" : "keep_covers_device_tools";
  if (ruleContent !== undefined && (PATH_RULE_TOOLS.has(toolName) || hasWildcard(toolName))) {
    let rule = classifyRulePathRoot(ruleContent);
    if (rule === "machine" || (rule === "home" && behavior === "allow")) return "rooted";
  }
  if (
    ruleContent !== undefined &&
    behavior === "allow" &&
    SHELL_RULE_TOOLS.has(toolName) &&
    !isPortableShellAllowRule(ruleContent, toolName)
  )
    return "rooted";
  if (
    ruleContent !== undefined &&
    behavior === "allow" &&
    WEB_RULE_TOOLS.has(toolName) &&
    isLocalWebDomainRule(ruleContent)
  )
    return "rooted";
  if (behavior !== "allow" && matchesDeviceServerId(toolName)) return "keep_covers_device_tools";
  return "keep";
}
export {
  tryJsonParse,
  canonicalJson,
  looksLikeCredentialIncludingNul,
  filterPortableSettings,
  isWithinValueBounds,
  isJsonPlainValue,
  compareByPath,
  sortedPortableCopy,
  exceedsJsonNesting,
  exceedsMaxPackFiles,
  hasSerializableSettings,
  isWorkingFilePath,
  decodePackFile,
  hasOnlyAllowedKeys,
  isStringArray,
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
};
