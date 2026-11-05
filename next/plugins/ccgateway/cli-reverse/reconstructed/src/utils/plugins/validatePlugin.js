/**
 * utils/plugins/validatePlugin.ts
 *
 * 并入已有模块：插件校验，增加 contract 加载与写入检查、manifest 字段问题。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/validatePlugin.ts
 * pieces: chunk-0fqk5atw.js (1), chunk-bfqsgtvj.js (73)
 * attribution: fingerprint 11, placement 15, layout 41, callgraph-fingerprint 1, affinity 2, sole-consumer 4
 */
import * as pathModule from "path";
import { resolve, relative, isAbsolute, sep } from "path";
import { readFile, stat, readdir, lstat } from "fs/promises";
import {
  permissionPromptResultSchemaCutting,
  permissionPromptResultSchemaRefusing,
} from "../permissions/PermissionPromptToolResultSchema.js";
import {
  TYPES_ENTRY,
  describeTypeEntryProblem,
  isRealPathWithinTeamDir_2,
  MAX_TSCONFIG_BYTES,
  readTypeFileCapped,
} from "../../plugins/functionHooks/typeRoots.js";
import { refusedContract, validatePluginContract } from "./validatePluginContract.js";
import { checkInsidePluginRoot } from "../../plugins/functionHooks/moduleLoader.js";
import { stateAtomKey, matchesEventPattern } from "../../plugins/functionHooks/eventPatterns.js";
import { isPlainObject } from "../isPlainObject.js";
import {
  PluginMarketplaceFileSchema,
  PluginManifestSchema,
  parsePluginBinaries,
  BINARY_BASENAME_RE,
  SHA256_HEX_RE,
  MAX_PLUGIN_BINARIES,
  BINARY_FETCH_CONCURRENCY,
  PLUGIN_NAME_FORBIDDEN_CHARS_RE,
  isValidPluginIdSegment,
  normalizePluginRoot,
  isOfficialMarketplaceName,
  isBareSourceName,
  PluginRelevanceSchema,
  PluginRelevanceSignalsSchema,
  isValidRegex,
  PluginMarketplaceEntrySchema,
  PluginMarketplaceSchema,
  applyMarketplacePluginRoot,
  PluginIdSchema,
  resolveBareSourceUnderPluginRoot,
  isRelativeSourcePath,
  ONE_MIB,
  PluginHooksSchema,
  hasManifestFieldSchema,
} from "./schemas.js";
import { jsonParse } from "../slowOperations.js";
import { stripBom } from "../json.js";
import { WORKER_ONLY_SKILL_NAMES, firstPartyCommandNameCheck } from "../../commands.js";
import { foldName } from "./syncedItems.js";
import { boundedEditDistance } from "../settings/managedEnvKeys.js";
import { hasDotDotSegment, hasDotDotWithSpaceSegment } from "../pathClassification.js";
import { getErrnoCode, errorMessage, isENOENT } from "../errors.js";
import { validatePluginManifest as validatePluginManifest_2 } from "./pluginManifestRead.js";
import { checkReservedPluginName, OFFICIAL_PLUGIN_HINT } from "./reservedPluginNames.js";
import {
  stringSchema,
  array,
  objectSchema,
  preprocess,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { resolvePluginRename } from "./pluginRenames.js";
import {
  hasHeadersHelper,
  McpStdioServerConfigSchema,
  McpHTTPServerConfigSchema,
  McpSSEServerConfigSchema,
  McpWebSocketServerConfigSchema,
  McpServerConfigSchema,
} from "../../services/mcp/types.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { isForbiddenHelperHeader } from "./headersHelper.js";
import {
  readPluginFileSafe,
  getMcpAuthCache,
  isDirectoryOrFalse,
  readSmallFileText,
} from "./safeFileRead.js";
import { collapseWhitespace, truncateWithCount, plural } from "../stringUtils.js";
import { stripCombiningRepeated } from "../sanitization.js";
import { FRONTMATTER_REGEX, parseYamlLenient } from "../frontmatterParser.js";
import {
  hasNestedHooks,
  SETTINGS_SKIPPED_KEYS,
  looksLikeHookMatcher,
  UNLOADABLE_GUARD_NOTE,
  validateHooksSetting,
} from "../../schemas/hookEntryValidation.js";
import {
  scanHooksModuleForValidation,
  telemetryRefSummary,
  telemetryStreamRefusal,
} from "../../plugins/functionHooks/hooksModuleScan.js";
import { getHostState } from "../hostEnvironment.js";
import { initBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import { initBundledSkills } from "../../skills/bundled/index.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { logForDebugging } from "../debug.js";
import { hasToolSite } from "../../plugins/functionHooks/sites/siteRules.js";
import { adviseUiRenderMatcher } from "../../plugins/functionHooks/sites/uiSites.js";
import { loadSurfaceModules } from "../../plugins/functionHooks/hooksModuleLoader.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { unaddableTransportReason } from "../../services/mcp/config.js";
import { countWhere } from "../collections.js";
import { buildSecretScanResult } from "../../skills/bundled/pluginAuthoring/secretScanTool.js";
import { PLATFORM_TARGETS, binaryBaseNameForTarget } from "../platformTargets.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0fqk5atw.js:3698-3745 fingerprint (2.1.88 match: MARKETPLACE_ONLY_MANIFEST_FIELDS, 0.369)
/**
 * 按模式返回 schema（strict 或宽松）。名字配错，见 lead 建议。
 */
function MARKETPLACE_ONLY_MANIFEST_FIELDS(kind) {
  return kind === "strict" ? permissionPromptResultSchemaCutting() : permissionPromptResultSchemaRefusing();
}
//@ chunk-bfqsgtvj.js:10185-10702 placement
async function loadPluginContract(typesEntry, pluginDir, pluginName) {
  let entryPath = typesEntry ?? TYPES_ENTRY;
  let absolutePath = resolve(pluginDir, entryPath);
  let relativePath = relative(pluginDir, absolutePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath))
    return refusedContract(`${entryPath} leaves the plugin's folder`);
  let refuse = (error) =>
    refusedContract(`${entryPath}: ${describeTypeEntryProblem(pluginName, absolutePath, error)}`);
  let rootCheck = await checkInsidePluginRoot(absolutePath, pluginDir, pluginName).then(
    (rootResult) => rootResult,
    (error) => (typesEntry === undefined && isRealPathWithinTeamDir_2(error) ? undefined : refuse(error)),
  );
  if (rootCheck === undefined || "kind" in rootCheck) return rootCheck;
  if (rootCheck.size > MAX_TSCONFIG_BYTES)
    return refusedContract(`${entryPath} is over ${MAX_TSCONFIG_BYTES} bytes and was not read`);
  let typeFile = await readTypeFileCapped(rootCheck.real).then((typeFileCapped) => typeFileCapped, refuse);
  if (typeof typeFile !== "string") return typeFile;
  let { problems, nouns, state } = validatePluginContract(typeFile);
  return problems.length === 0
    ? {
        kind: "read",
        text: typeFile,
        nouns,
        state,
      }
    : refusedContract(...problems);
}
//@ chunk-bfqsgtvj.js:10702-11585 placement
function checkContractWrites({ names, owner, declared, others, contract, refusal }) {
  let declaredKeysByPlugin = new Map();
  for (let { plugin, keys } of [...declared, ...(others ?? [])]) {
    let keySet = declaredKeysByPlugin.get(plugin) ?? new Set();
    keys.forEach((key) => keySet.add(key));
    declaredKeysByPlugin.set(plugin, keySet);
  }
  let problems = [];
  let unchecked = new Set();
  for (let { plugin, key } of names.writes)
    if (plugin !== owner)
      problems.push(
        `$.state.set refers to ${stateAtomKey({
          plugin,
          key,
        })}, which ${plugin} owns: only a value's owner writes it (to change what is written, hook ${plugin}'s state.set and rewrite e.value)`,
      );
  for (let { plugin, key } of [...names.reads, ...names.writes]) {
    let isOwner = plugin === owner;
    let canCheck = isOwner || others !== undefined;
    let atomKey = stateAtomKey({
      plugin,
      key,
    });
    if (!canCheck) {
      unchecked.add(atomKey);
      continue;
    }
    let isDeclared = declaredKeysByPlugin.get(plugin)?.has(key) === true;
    let contractLabel = isOwner
      ? (contract ?? "the manifest's types contract")
      : "no enabled plugin's contract";
    let declarationHint =
      refusal ?? `${contractLabel} must name it in interface PluginState { ${plugin}: { ${key}: ... } }`;
    let problem = isOwner
      ? `${atomKey} is not declared: ${declarationHint}`
      : `${atomKey} is not declared: ${contractLabel} names it in PluginState`;
    if (!isDeclared && !problems.includes(problem)) problems.push(problem);
  }
  return {
    problems,
    unchecked: [...unchecked],
  };
}
//@ chunk-bfqsgtvj.js:11585-12155 placement
/**
 * 可放在 experimental 下的组件键与组件路径字段规格。
 */
var EXPERIMENTAL_COMPONENT_KEYS = ["monitors", "themes"];
var COMPONENT_PATH_SPECS = [
  {
    key: "commands",
    recordPathProperty: "source",
  },
  {
    key: "hooks",
    bareStringIndexed: true,
    jsonFile: true,
  },
  {
    key: "agents",
    bareStringIndexed: true,
  },
  {
    key: "skills",
    bareStringIndexed: true,
  },
  {
    key: "outputStyles",
  },
  {
    key: "themes",
  },
  {
    key: "monitors",
    jsonFile: true,
  },
  {
    key: "lspServers",
    jsonFile: true,
  },
  {
    key: "workflows",
    bareStringIndexed: true,
  },
  {
    key: "types",
    bareStringOnly: true,
  },
  {
    key: "mcpServers",
    jsonFile: true,
    acceptsUrl: true,
    missingConsequence: (relPath) =>
      relPath.endsWith(".json")
        ? "The plugin loader skips a missing MCP servers file without reporting it, so none of its servers will load."
        : undefined,
  },
];
//@ chunk-bfqsgtvj.js:12155-12840 placement
/**
 * 按组件规格遍历 manifest（monitors/themes 可来自 experimental）：数组逐项、对象按 recordPathProperty、其余整体， 收集字符串路径（允许 URL 的组件跳过 URL），返回 {spec, field, relPath}。
 */
function collectComponentPathFields(rawCandidate) {
  let experimental = isPlainObject(rawCandidate.experimental) ? rawCandidate.experimental : undefined;
  let fields = [];
  for (let spec of COMPONENT_PATH_SPECS) {
    let fieldValue = rawCandidate[spec.key];
    let key = spec.key;
    let experimentalValue =
      experimental !== undefined &&
      EXPERIMENTAL_COMPONENT_KEYS.includes(spec.key) &&
      Object.hasOwn(experimental, spec.key)
        ? experimental[spec.key]
        : undefined;
    if (experimentalValue != null) {
      fieldValue = experimentalValue;
      key = `experimental.${spec.key}`;
    }
    let candidates = [];
    if (spec.bareStringOnly) candidates.push([key, fieldValue]);
    else if (Array.isArray(fieldValue))
      for (let [index, item] of fieldValue.entries()) candidates.push([`${key}[${index}]`, item]);
    else if (!isPlainObject(fieldValue))
      candidates.push([spec.bareStringIndexed ? `${key}[0]` : key, fieldValue]);
    else if (spec.recordPathProperty !== undefined) {
      for (let [key_2, value] of Object.entries(fieldValue))
        if (isPlainObject(value))
          candidates.push([`${key}.${key_2}.${spec.recordPathProperty}`, value[spec.recordPathProperty]]);
    }
    for (let [fieldPath, rawPath] of candidates)
      if (typeof rawPath === "string" && !(spec.acceptsUrl && /^[a-z][a-z0-9+.-]*:\/\//i.test(rawPath)))
        fields.push({
          spec,
          field: fieldPath,
          relPath: rawPath,
        });
  }
  return fields;
}
//@ chunk-bfqsgtvj.js:12840-13095 placement
/**
 * 上架信息里各类链接字段的键名。
 */
var PRIVACY_POLICY_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SUPPORT_URL_KEYS;
var TERMS_URL_KEYS;
var DOCUMENTATION_URL_KEYS;
var LISTING_FIELD_KEYS;
deferInit("chunk-bfqsgtvj.js:12840", () => {
  PRIVACY_POLICY_KEYS = ["privacyPolicyUrl", "privacy_policy", "privacyPolicy"];
  SUPPORT_URL_KEYS = ["supportUrl", "support", "bugs"];
  TERMS_URL_KEYS = ["termsOfServiceUrl", "terms_of_service"];
  DOCUMENTATION_URL_KEYS = ["documentationUrl", "docs"];
  LISTING_FIELD_KEYS = new Set([
    "icon",
    "screenshots",
    "classification",
    ...PRIVACY_POLICY_KEYS,
    ...SUPPORT_URL_KEYS,
    ...TERMS_URL_KEYS,
    ...DOCUMENTATION_URL_KEYS,
  ]);
});
//@ chunk-bfqsgtvj.js:13095-13167 placement
var PLUGIN_ENV_VARS = ["CLAUDE_PLUGIN_ROOT", "CLAUDE_PLUGIN_DATA", "CLAUDE_PROJECT_DIR"];
//@ chunk-bfqsgtvj.js:13167-13431 placement
function findUnquotedHookPlaceholders(hooksByEvent) {
  let results = [];
  for (let [key, value] of Object.entries(hooksByEvent))
    for (let matcher of value ?? [])
      for (let hook of matcher.hooks) {
        if (hook.type !== "command" || hook.args !== undefined || hook.shell === "powershell") continue;
        let unquotedPlaceholders = findUnquotedPlaceholders(hook.command);
        if (unquotedPlaceholders.length > 0)
          results.push({
            event: key,
            command: hook.command,
            placeholders: unquotedPlaceholders,
          });
      }
  return results;
}
//@ chunk-bfqsgtvj.js:13431-13791 placement
/**
 * 扫描命令中不在引号内的 $VAR/${VAR} 插件变量。
 */
function findUnquotedPlaceholders(command) {
  let placeholders = new Set();
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let idx = 0; idx < command.length; idx++) {
    let char = command[idx];
    if (!inSingleQuote && char === "\\") {
      idx++;
      continue;
    }
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (char !== "$" || inSingleQuote || inDoubleQuote) continue;
    for (let envVar of PLUGIN_ENV_VARS) {
      let withBraces = command.startsWith(`{${envVar}}`, idx + 1);
      let bareName =
        command.startsWith(envVar, idx + 1) && !/[A-Za-z0-9_]/.test(command.charAt(idx + 1 + envVar.length));
      if (withBraces || bareName) {
        placeholders.add(`\${${envVar}}`);
        break;
      }
    }
  }
  return [...placeholders];
}
//@ chunk-bfqsgtvj.js:13883-13934 placement
var stripTrailingSep = (path) => (path.endsWith(sep) ? path.slice(0, -sep.length) : path);
//@ chunk-bfqsgtvj.js:13934-13971 placement
/**
 * isSameResolvedPath：解析后路径相同。
 */
var isSameResolvedPath = (left, right) =>
  stripTrailingSep(resolve(left)) === stripTrailingSep(resolve(right));
//@ chunk-bfqsgtvj.js:13971-14049 placement
function isRelativeToRoot(entry, root, expected) {
  let { source } = entry;
  return typeof source === "string" && isSameResolvedPath(resolve(root, source), expected);
}
//@ chunk-bfqsgtvj.js:14049-14134 placement
/**
 * matchesDirEntry：目录条目按 source 或名字匹配。
 */
function matchesDirEntry(entry, root, dirEntry) {
  return typeof entry.source === "string"
    ? isRelativeToRoot(entry, root, dirEntry.root)
    : entry.name === dirEntry.name;
}
//@ chunk-bfqsgtvj.js:14174-14307 placement (2.1.88 match: readJsonFile, 1)
/**
 * 读取 JSON 文件并按 schema 校验，失败返回 undefined（插件校验用）。
 */
async function readJsonFile(path) {
  try {
    let result = PluginMarketplaceFileSchema().safeParse(
      jsonParse(
        stripBom(
          await readFile(path, {
            encoding: "utf-8",
          }),
        ),
      ),
    );
    return result.success ? result.data : undefined;
  } catch {
    return;
  }
}
//@ chunk-bfqsgtvj.js:14307-15927 placement
/**
 * 市场条目额外允许的键与其他工具 manifest 字段提示。
 */
var MARKETPLACE_ENTRY_EXTRA_KEYS; // deferred: uses WORKER_ONLY_SKILL_NAMES (../../commands.js) of its import cycle while loading; runs once the cycle is complete
var FOREIGN_MANIFEST_FIELDS;
var FOREIGN_MANIFEST_HINT;
var MANIFEST_FIELD_HINTS;
var MANIFEST_FIELD_HINT_SET;
deferInit("chunk-bfqsgtvj.js:14307", () => {
  MARKETPLACE_ENTRY_EXTRA_KEYS = new Set([
    "category",
    "source",
    "tags",
    "strict",
    "id",
    "relevance",
    "headers",
    "headersHelper",
  ]);
  FOREIGN_MANIFEST_FIELDS = new Map([
    ["publisher", "a VS Code/Cursor extension manifest"],
    ["engines", "a VS Code/Cursor extension manifest"],
    ["categories", "a VS Code/Cursor extension manifest"],
    ["icon", "a VS Code/Cursor extension manifest"],
    ["contributes", "a VS Code/Cursor extension manifest"],
    ["activationEvents", "a VS Code/Cursor extension manifest"],
    ["preview", "a VS Code/Cursor extension manifest"],
    ["main", "an npm package.json"],
    ["type", "an npm package.json"],
    ["files", "an npm package.json"],
    ["bin", "an npm package.json"],
    ["scripts", "an npm package.json"],
    ["private", "an npm package.json"],
    ["bugs", "an npm package.json"],
    ["contributors", "an npm package.json"],
    ["dxt_version", "an MCPB/DXT manifest"],
    ["mcpb_version", "an MCPB/DXT manifest"],
    ["user_config", "an MCPB/DXT manifest"],
    ["compatibility", "an MCPB/DXT manifest"],
    ["server", "an MCP server manifest"],
    ["tools", "an MCP server manifest"],
    ["prompts", "an MCP server manifest"],
    ["resources", "an MCP server manifest"],
    ["logo", "manifests across many tools"],
    ["readme", "manifests across many tools"],
    ["changelog", "manifests across many tools"],
    ["support", "manifests across many tools"],
    ["privacy_policy", "manifests across many tools"],
    ["privacy_policies", "manifests across many tools"],
    ["terms_of_service", "manifests across many tools"],
    ["_comment", "manifests across many tools"],
    ["$id", "a JSON Schema document"],
    ["$comment", "a JSON Schema document"],
  ]);
  FOREIGN_MANIFEST_HINT = new Map([["user_config", "userConfig"]]);
  MANIFEST_FIELD_HINTS = new Set(["themes", "monitors", "outputStyles", "evals", "syntaxHighlighting"]);
  MANIFEST_FIELD_HINT_SET = new Set(WORKER_ONLY_SKILL_NAMES.map(foldName));
});
//@ chunk-bfqsgtvj.js:15927-16071 placement
function summarizeValidationResults(results, options) {
  let all = results.every((result) => result.success);
  let any = results.some((result) => result.warnings.length > 0);
  return {
    noErrors: all,
    hasWarnings: any,
    allSuccess: options.strict ? all && !any : all,
  };
}
//@ chunk-bfqsgtvj.js:16071-16142 layout (2.1.88 match: getReceivedType, 0.777)
function getReceivedType(value) {
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}
//@ chunk-bfqsgtvj.js:16142-16341 fingerprint (2.1.88 match: detectManifestType, 1)
function detectManifestType(filePath) {
  let fileName = pathModule.basename(filePath);
  let dirName = pathModule.basename(pathModule.dirname(filePath));
  if (fileName === "plugin.json") return "plugin";
  if (fileName === "marketplace.json") return "marketplace";
  if (dirName === ".claude-plugin") return "plugin";
  return "unknown";
}
//@ chunk-bfqsgtvj.js:16341-16446 fingerprint (2.1.88 match: formatZodErrors, 1)
/**
 * zod 错误转 [{path, message}]（空路径记 root）。
 */
function formatZodErrors(zodError) {
  return zodError.issues.map((error) => ({
    path: error.path.join(".") || "root",
    message: error.message,
    code: error.code,
  }));
}
//@ chunk-bfqsgtvj.js:16446-16662 layout
function suggestSimilarField(field, knownFields) {
  if (FOREIGN_MANIFEST_FIELDS.has(field)) return;
  let maxDistance = field.length <= 3 ? 1 : 2;
  let lower = field.toLowerCase();
  let best;
  let bestDistance = maxDistance + 1;
  for (let candidate of knownFields) {
    if (Math.abs(candidate.length - field.length) > maxDistance) continue;
    if (candidate.toLowerCase() === lower) return candidate;
    let distance = boundedEditDistance(field, candidate, maxDistance);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}
//@ chunk-bfqsgtvj.js:16662-17527 layout
function unknownFieldMessage(field, knownFields, marketplaceOnlyFields) {
  if (marketplaceOnlyFields?.has(field))
    return (
      `Field '${field}' belongs in the marketplace entry (marketplace.json), ` +
      "not plugin.json. It's harmless here but unused \u2014 Claude Code " +
      "ignores it at load time."
    );
  let similar = suggestSimilarField(field, knownFields);
  if (similar)
    return `Unknown field '${field}' \u2014 did you mean '${similar}'? Claude Code ignores unrecognized fields at load time, so this field has no effect.`;
  let crossToolName = FOREIGN_MANIFEST_HINT.get(field);
  if (crossToolName && knownFields.has(crossToolName))
    return (
      `Field '${field}' is the cross-tool spelling of Claude Code's '${crossToolName}'. Rename it to '${crossToolName}' for Claude Code to read it (the option ` +
      "shapes differ slightly \u2014 re-run validate after renaming to check). " +
      "As-is, Claude Code ignores it at load time."
    );
  let toolName = FOREIGN_MANIFEST_FIELDS.get(field);
  if (toolName)
    return `Unknown field '${field}' (commonly seen in ${toolName}). Claude Code ignores unrecognized fields at load time, so it's safe to keep.`;
  return `Unknown field '${field}'. Claude Code ignores it at load time.`;
}
//@ chunk-bfqsgtvj.js:17527-17662 layout
function reportUnknownFields(candidate, knownFields, prefix, warnings, marketplaceOnlyFields, listingFields) {
  for (let key of Object.keys(candidate)) {
    if (knownFields.has(key) || listingFields?.has(key)) continue;
    warnings.push({
      path: prefix ? `${prefix}.${key}` : key,
      message: unknownFieldMessage(key, knownFields, marketplaceOnlyFields),
    });
  }
}
//@ chunk-bfqsgtvj.js:17662-17731 layout
/**
 * 路径（去盘符后）是否为绝对或含危险段。
 */
function isAbsoluteOrUnsafePath(path) {
  let replaced = path.replace(/^[a-zA-Z]:/, "");
  return hasDotDotSegment(replaced) || hasDotDotWithSpaceSegment(replaced);
}
//@ chunk-bfqsgtvj.js:17731-17888 fingerprint (2.1.88 match: checkPathTraversal, 1)
function checkPathTraversal(p, field, errors, hint) {
  if (isAbsoluteOrUnsafePath(p))
    errors.push({
      path: field,
      message: hint
        ? `Path contains "..": ${p}. ${hint}`
        : `Path contains ".." which could be a path traversal attempt: ${p}`,
    });
}
//@ chunk-bfqsgtvj.js:17888-18153 fingerprint (2.1.88 match: marketplaceSourceHint, 0.667)
function marketplaceSourceHint(p) {
  let stripped = p.replace(/^(\.\.\/)+/, "");
  return `Plugin source paths are resolved relative to the marketplace root (the directory containing .claude-plugin/), not relative to marketplace.json. Use "${stripped !== p ? `./${stripped}` : "./plugins/my-plugin"}" instead of "${p}".`;
}
//@ chunk-bfqsgtvj.js:18153-18217 layout
/**
 * 校验单个 hooks.json 并整理结果。
 */
async function validateHooksJsonForDisplay(
  filePath,
  options = {
    kind: "alone",
  },
) {
  return sanitizeValidationResult(await validateHooksJson(filePath, options));
}
//@ chunk-bfqsgtvj.js:18217-18566 fingerprint (2.1.88 match: validateHooksJson, 0.561)
async function validateHooksJson(filePath, options) {
  let filePath_2 = pathModule.resolve(filePath);
  let content;
  try {
    content = await readFile(filePath_2, {
      encoding: "utf-8",
    });
  } catch (error) {
    let code = getErrnoCode(error);
    let message;
    if (code === "ENOENT") message = `File not found: ${filePath_2}`;
    else if (code === "EISDIR") message = `Path is not a file: ${filePath_2}`;
    else message = `Failed to read file: ${errorMessage(error)}`;
    return {
      success: false,
      errors: [
        {
          path: "file",
          message,
          code,
        },
      ],
      warnings: [],
      filePath: filePath_2,
      fileType: "plugin",
    };
  }
  return validatePluginManifest(filePath_2, content, options);
}
//@ chunk-bfqsgtvj.js:18566-23966 callgraph-fingerprint (2.1.88 match: validatePluginManifest, 0.251)
/**
 * claude plugin validate：校验 plugin.json（JSON 语法、schema、名字、marketplace-only 字段警告、组件路径存在性），返回 errors/warnings。
 */
async function validatePluginManifest(filePath, content, options) {
  let errors = [];
  let warnings = [];
  let notes = [];
  let parsed;
  try {
    parsed = jsonParse(stripBom(content));
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: "json",
          message: `Invalid JSON syntax: ${errorMessage(error)}`,
        },
      ],
      warnings: [],
      filePath,
      fileType: "plugin",
    };
  }
  let validation = validatePluginManifest_2(parsed, "plugin-json", {
    pluginName: pathModule.basename(pathModule.dirname(pathModule.dirname(filePath))),
    manifestPath: filePath,
  });
  if (!validation.ok)
    errors.push(
      ...validation.errors.map((error) => ({
        ...error,
        path: error.path || "root",
      })),
    );
  else
    warnings.push(
      ...validation.hookNotes.map((hookNote) => ({
        path: "hooks",
        message: `${hookNote} at runtime`,
      })),
    );
  if (parsed && typeof parsed === "object") {
    let rawCandidate = validation.rawCandidate ?? parsed;
    let dir = pathModule.dirname(filePath);
    let pluginRoot = pathModule.basename(dir) === ".claude-plugin" ? pathModule.dirname(dir) : dir;
    let checkPathExists = async (
      relPath,
      field,
      missingNote = "The runtime loader will report this as a load failure.",
    ) => {
      checkPathTraversal(relPath, field, errors);
      if (isAbsoluteOrUnsafePath(relPath) || pathModule.isAbsolute(relPath) || /^[a-zA-Z]:/.test(relPath))
        return;
      try {
        return await stat(pathModule.resolve(pluginRoot, relPath));
      } catch (error) {
        let code = getErrnoCode(error);
        errors.push({
          path: field,
          message: `Path not found: ${relPath}${code && code !== "ENOENT" ? ` (${code})` : ""}. ${missingNote}`,
        });
        return;
      }
    };
    for (let { spec, field, relPath } of collectComponentPathFields(rawCandidate)) {
      let stats = await checkPathExists(relPath, field, spec.missingConsequence?.(relPath));
      if (stats === undefined) continue;
      if (spec.key === "skills" && !stats.isDirectory()) {
        let dir = pathModule.dirname(relPath);
        let fileHint =
          pathModule.basename(relPath).toLowerCase() === "skill.md"
            ? dir === "."
              ? " \u2014 point to the plugin root '.' instead"
              : ` \u2014 point to the parent directory '${dir}' instead`
            : "";
        errors.push({
          path: field,
          message: `Path is a file; skills entries must be directories containing SKILL.md${fileHint}: ${relPath}`,
        });
      }
      if (spec.jsonFile && relPath.endsWith(".json") && stats.isDirectory())
        errors.push({
          path: field,
          message: `Path is a directory; ${spec.key} must point to a JSON file: ${relPath}`,
        });
      if (spec.key === "types") {
        let contractResult = contractCheckResult(
          await loadPluginContract(relPath, pluginRoot, pathModule.basename(pluginRoot)),
          {
            relPath,
            field,
          },
        );
        errors.push(...contractResult.errors);
        notes.push(...contractResult.notes);
      }
    }
    if (rawCandidate.types === undefined) {
      let pluginContract = await loadPluginContract(undefined, pluginRoot, pathModule.basename(pluginRoot));
      if (pluginContract?.kind === "read")
        notes.push(
          ...contractCheckResult(pluginContract, {
            relPath: TYPES_ENTRY,
            field: "types",
          }).notes,
        );
    }
    if (rawCandidate.mcpServers !== undefined) {
      let mcpSpecs = Array.isArray(rawCandidate.mcpServers)
        ? rawCandidate.mcpServers
        : [rawCandidate.mcpServers];
      let lookupKey;
      for (let [index, spec] of mcpSpecs.entries()) {
        let fieldPath = Array.isArray(rawCandidate.mcpServers) ? `mcpServers[${index}]` : "mcpServers";
        if (isPlainObject(spec)) {
          lookupKey ??= await userConfigKeyLookup(rawCandidate, filePath);
          for (let [key, value] of Object.entries(spec)) {
            let refCheck = checkMcpUserConfigRefs(
              `${fieldPath}.${sanitizeForDisplay(key, 64)}`,
              value,
              lookupKey(key),
            );
            errors.push(...refCheck.errors);
            warnings.push(...refCheck.warnings);
          }
        }
      }
    }
  }
  if (isPlainObject(parsed)) {
    let rawManifest = parsed;
    let rawCandidate = validation.rawCandidate ?? rawManifest;
    reportUnknownFields(
      rawCandidate,
      new Set(Object.keys(PluginManifestSchema().shape)),
      "",
      warnings,
      MARKETPLACE_ENTRY_EXTRA_KEYS,
      LISTING_FIELD_KEYS,
    );
    if ("capabilities" in rawCandidate) {
      let index = warnings.findIndex((warning) => warning.path === "capabilities");
      let capabilitiesWarning = {
        path: "capabilities",
        message:
          "'capabilities' is no longer read: what a hooks module hooks and calls on $ is read from its source and listed under its hooks.json below. Delete the field.",
      };
      if (index === -1) warnings.push(capabilitiesWarning);
      else warnings[index] = capabilitiesWarning;
    }
    for (let key of EXPERIMENTAL_COMPONENT_KEYS)
      if (key in rawManifest)
        warnings.push({
          path: key,
          message: `'${key}' is an experimental component; declare it under 'experimental.${key}' instead of at the top level. Top-level still loads for now but will be removed in a future release.`,
        });
    if ("experimental" in rawManifest)
      if (isPlainObject(rawManifest.experimental)) {
        let experimental = rawManifest.experimental;
        reportUnknownFields(experimental, MANIFEST_FIELD_HINTS, "experimental", warnings);
      } else
        warnings.push({
          path: "experimental",
          message: `'experimental' must be an object containing component declarations; got ${getReceivedType(rawManifest.experimental)}. It will be ignored at load time.`,
        });
    if ("metadata" in rawCandidate && !isPlainObject(rawCandidate.metadata))
      warnings.push({
        path: "metadata",
        message: `'metadata' must be a free-form object; got ${getReceivedType(rawCandidate.metadata)}. It will be ignored at load time.`,
      });
    if ("binaries" in rawManifest)
      if (isPlainObject(rawManifest.binaries)) {
        let validBinaries = parsePluginBinaries(rawManifest.binaries) ?? {};
        let validCount = 0;
        for (let [key, value] of Object.entries(rawManifest.binaries)) {
          if (
            BINARY_BASENAME_RE.test(key) &&
            typeof value === "object" &&
            value !== null &&
            typeof value.sha256 === "string" &&
            SHA256_HEX_RE.test(value.sha256)
          ) {
            validCount++;
            continue;
          }
          if (!Object.hasOwn(validBinaries, key))
            warnings.push({
              path: `binaries.${key}`,
              message: `Invalid binaries entry; it will be ignored at install time. The basename must match ${String(BINARY_BASENAME_RE)} (lowercase, no leading or trailing dot) and the value must be an object with a 64-character lowercase-hex 'sha256'.`,
            });
        }
        if (validCount > MAX_PLUGIN_BINARIES)
          warnings.push({
            path: "binaries",
            message: `${validCount} valid binaries entries declared, but the install hook processes at most ${MAX_PLUGIN_BINARIES}; the rest are dropped entirely.`,
          });
        let binaryCount = Object.keys(validBinaries).length;
        if (binaryCount > BINARY_FETCH_CONCURRENCY)
          warnings.push({
            path: "binaries",
            message: `${binaryCount} valid binaries entries declared, but only the first ${BINARY_FETCH_CONCURRENCY} are fetched at install time; the rest are ignored. Reduce the count or split across plugins.`,
          });
      } else
        warnings.push({
          path: "binaries",
          message: `'binaries' must be an object mapping basenames to { sha256 }; got ${getReceivedType(rawManifest.binaries)}. It will be ignored at install time.`,
        });
  }
  let manifest = validation.manifest;
  if (manifest) {
    let manifestData = manifest;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifestData.name)) {
      let reason = "Claude Code accepts it, but the";
      if (PLUGIN_NAME_FORBIDDEN_CHARS_RE.test(manifestData.name))
        reason =
          "Claude Code refuses a plugin with this name when it is loaded by path (such as --plugin-dir), and cannot install it from a marketplace that lists it under this name. The";
      else if (!isValidPluginIdSegment(manifestData.name))
        reason = "Claude Code cannot install it from a marketplace that lists it under this name, and the";
      warnings.push({
        path: "name",
        message:
          `Plugin name "${manifestData.name}" is not kebab-case. ${reason} Claude.ai marketplace sync requires kebab-case (lowercase letters, digits, and hyphens only, e.g., "my-plugin").` +
          hiddenCharacterNote(manifestData.name),
      });
    }
    let reservedCheck =
      options.kind === "alone" || (options.kind === "entry" && options.entryName !== manifestData.name)
        ? checkReservedPluginName(manifestData.name)
        : undefined;
    if (reservedCheck)
      (reservedCheck.severity === "error" ? errors : warnings).push({
        path: "name",
        message:
          options.kind === "alone"
            ? `${reservedCheck.message} ${OFFICIAL_PLUGIN_HINT}`
            : reservedCheck.message,
      });
    if (!manifestData.version)
      warnings.push({
        path: "version",
        message: 'No version specified. Consider adding a version following semver (e.g., "1.0.0")',
      });
    if (!manifestData.description)
      warnings.push({
        path: "description",
        message: "No description provided. Adding a description helps users understand what your plugin does",
      });
    if (!manifestData.author)
      warnings.push({
        path: "author",
        message: "No author information provided. Consider adding author details for plugin attribution",
      });
  }
  return {
    success: errors.length === 0,
    errors,
    warnings,
    filePath,
    fileType: "plugin",
    ...(notes.length > 0 && {
      notes,
    }),
  };
}
//@ chunk-bfqsgtvj.js:23966-24236 layout
/**
 * 市场/插件名校验常量组：ht 是名称格式正则 /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/；Un 是保留市场名集合（org / org-provisioned / unknown）；$e 是 "UNRECORDABLE_NAME" finding code；UOr 是 plugin@marketplace 各分段允许字符的规则文案，拼进 message。
 */
var RECORDABLE_NAME_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RESERVED_MARKETPLACE_NAMES;
var UNRECORDABLE_NAME_CODE;
var PLUGIN_ID_PART_RULE_TEXT;
deferInit("chunk-bfqsgtvj.js:23966", () => {
  RECORDABLE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  RESERVED_MARKETPLACE_NAMES = new Set(["org", "org-provisioned", "unknown"]);
  UNRECORDABLE_NAME_CODE = "UNRECORDABLE_NAME";
  PLUGIN_ID_PART_RULE_TEXT =
    'Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit.';
});
//@ chunk-bfqsgtvj.js:24236-24334 layout
function hiddenCharacterNote(name) {
  return sanitizeForDisplay(name, name.length) === name
    ? ""
    : " The name holds a character that is not shown here.";
}
//@ chunk-bfqsgtvj.js:24334-24378 layout
async function validateMarketplaceForDisplay(filePath) {
  return sanitizeValidationResult(await validateMarketplaceManifest(filePath));
}
//@ chunk-bfqsgtvj.js:24378-34301 fingerprint (2.1.88 match: validateMarketplaceManifest, 0.392)
/**
 * 校验 marketplace.json：schema、保留名、每个插件条目来源与路径、重复名字等。
 */
async function validateMarketplaceManifest(filePath) {
  let errors = [];
  let warnings = [];
  let absolutePath = pathModule.resolve(filePath);
  let content;
  try {
    content = await readFile(absolutePath, {
      encoding: "utf-8",
    });
  } catch (error) {
    let code = getErrnoCode(error);
    let message;
    if (code === "ENOENT") message = `File not found: ${absolutePath}`;
    else if (code === "EISDIR") message = `Path is not a file: ${absolutePath}`;
    else message = `Failed to read file: ${errorMessage(error)}`;
    return {
      success: false,
      errors: [
        {
          path: "file",
          message,
          code,
        },
      ],
      warnings: [],
      filePath: absolutePath,
      fileType: "marketplace",
    };
  }
  let parsed;
  try {
    parsed = jsonParse(stripBom(content));
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: "json",
          message: `Invalid JSON syntax: ${errorMessage(error)}`,
        },
      ],
      warnings: [],
      filePath: absolutePath,
      fileType: "marketplace",
    };
  }
  let pluginEntries = [];
  let pluginRoot =
    isPlainObject(parsed) && isPlainObject(parsed.metadata) ? parsed.metadata.pluginRoot : undefined;
  let normalizedPluginRoot = normalizePluginRoot(pluginRoot);
  let officialName =
    isPlainObject(parsed) && typeof parsed.name === "string" && isOfficialMarketplaceName(parsed.name);
  if (parsed && typeof parsed === "object") {
    let rawMarketplace = parsed;
    if (Array.isArray(rawMarketplace.plugins)) {
      pluginEntries = rawMarketplace.plugins;
      rawMarketplace.plugins.forEach((plugin, i) => {
        if (plugin && typeof plugin === "object" && "source" in plugin) {
          let source = plugin.source;
          if (typeof source === "string")
            checkPathTraversal(source, `plugins[${i}].source`, errors, marketplaceSourceHint(source));
          if (isBareSourceName(source) && normalizedPluginRoot === undefined)
            errors.push({
              path: `plugins[${i}].source`,
              message:
                pluginRoot === undefined
                  ? `Bare source name "${source}" requires metadata.pluginRoot. Use "./relative/path", or set metadata.pluginRoot (e.g. "./plugins") to allow bare names.`
                  : typeof pluginRoot === "string"
                    ? `Bare source name "${source}" cannot resolve: metadata.pluginRoot ("${pluginRoot}") must be a relative path inside the marketplace (e.g. "./plugins").`
                    : `Bare source name "${source}" cannot resolve: metadata.pluginRoot must be a relative path inside the marketplace (e.g. "./plugins").`,
            });
          if (source && typeof source === "object" && "path" in source && typeof source.path === "string")
            checkPathTraversal(source.path, `plugins[${i}].source.path`, errors);
        }
      });
    }
  }
  let relevanceSchema = PluginRelevanceSchema()
    .extend({
      topic: stringSchema().min(1).max(64).optional(),
      signals: PluginRelevanceSignalsSchema()
        .extend({
          cli: array(stringSchema().min(1).max(64)).max(10).optional(),
          hosts: array(
            stringSchema()
              .min(1)
              .max(128)
              .refine(
                (host) => /^[a-z0-9.-]+$/.test(host),
                "must be a lowercase bare hostname (no scheme, port, or path)",
              ),
          )
            .max(20)
            .optional(),
          filesRead: array(
            stringSchema()
              .min(1)
              .max(256)
              .refine(
                (glob) => !glob.includes("\\"),
                'must use forward slashes (e.g. "**/*.tf"), not backslashes',
              ),
          )
            .max(10)
            .optional(),
          manifestDeps: array(
            objectSchema({
              file: stringSchema().min(1).max(256).refine(isValidRegex, "must be a valid regular expression"),
              pattern: stringSchema()
                .min(1)
                .max(256)
                .refine(isValidRegex, "must be a valid regular expression"),
            }),
          )
            .min(1)
            .max(10)
            .optional(),
          cwd: array(
            stringSchema()
              .min(1)
              .max(256)
              .refine(
                (glob) => !glob.includes("\\"),
                'must use forward slashes (e.g. "Engine/Source/**"), not backslashes',
              ),
          )
            .max(10)
            .optional(),
        })
        .refine(
          (signals) =>
            (signals.cli?.length ?? 0) > 0 ||
            (signals.hosts?.length ?? 0) > 0 ||
            (signals.filesRead?.length ?? 0) > 0 ||
            (signals.manifestDeps?.length ?? 0) > 0 ||
            (signals.cwd?.length ?? 0) > 0,
          "must declare at least one signal (cli, hosts, filesRead, manifestDeps, or cwd)",
        ),
    })
    .optional();
  let entrySchema = PluginMarketplaceEntrySchema()
    .extend({
      relevance: preprocess((value) => (isPlainObject(value) ? value : undefined), relevanceSchema),
    })
    .refine((entry) => typeof entry.source === "string" || entry.source.source !== "unsupported", {
      message: "source.source: 'unsupported' is a parse-time placeholder and cannot be authored",
    });
  let result = PluginMarketplaceSchema()
    .extend({
      plugins: array(entrySchema),
      renames: record(stringSchema(), stringSchema().nullable()).optional(),
    })
    .safeParse(applyMarketplacePluginRoot(parsed));
  if (!result.success) errors.push(...formatZodErrors(result.error));
  if (result.success && result.data.renames) {
    let pluginNames = new Set(result.data.plugins.map((plugin) => plugin.name));
    for (let key of Object.keys(result.data.renames)) {
      let pluginRename = resolvePluginRename(key, result.data.renames, pluginNames);
      if (pluginRename?.kind === "unresolved")
        errors.push({
          path: `renames.${key}`,
          message: `chain does not resolve (${pluginRename.reason}) \u2014 target must be a name in plugins[], a key in renames, or null`,
        });
      else if (
        pluginRename?.kind === "renamed" &&
        !PluginIdSchema().safeParse(`${pluginRename.to}@placeholder`).success
      )
        errors.push({
          path: `renames.${key}`,
          message: `target "${pluginRename.to}" is not a valid plugin name (PluginIdSchema)`,
        });
    }
  }
  if (isPlainObject(parsed)) {
    let rawMarketplace = parsed;
    reportUnknownFields(rawMarketplace, new Set(Object.keys(PluginMarketplaceSchema().shape)), "", warnings);
    if (typeof rawMarketplace.name === "string" && rawMarketplace.name) {
      let nameValid = isValidPluginIdSegment(rawMarketplace.name);
      if (!nameValid)
        errors.push({
          path: "name",
          code: UNRECORDABLE_NAME_CODE,
          message:
            `Claude Code cannot install plugins from marketplace "${sanitizeForDisplay(rawMarketplace.name, 64)}". ${PLUGIN_ID_PART_RULE_TEXT} Change the marketplace's "name".` +
            hiddenCharacterNote(rawMarketplace.name),
        });
      if (RESERVED_MARKETPLACE_NAMES.has(rawMarketplace.name.toLowerCase()))
        warnings.push({
          path: "name",
          message: `Marketplace name "${rawMarketplace.name}" is reserved in Claude Desktop. Claude Code accepts it, but the Claude Desktop managed marketplace sync (allowedPluginMarketplaces) will reject the whole marketplace.`,
        });
      else if (!RECORDABLE_NAME_RE.test(rawMarketplace.name))
        warnings.push({
          path: "name",
          message:
            `Marketplace name "${rawMarketplace.name}" is not accepted by Claude Desktop (letters, digits, ".", "_", "-"; must start alphanumeric; max 128 chars). ` +
            (nameValid ? "Claude Code accepts it, but the " : "The ") +
            "Claude Desktop managed marketplace sync (allowedPluginMarketplaces) will reject the whole marketplace." +
            hiddenCharacterNote(rawMarketplace.name),
        });
    }
    let metadata = rawMarketplace.metadata;
    if (isPlainObject(metadata))
      reportUnknownFields(
        metadata,
        new Set(Object.keys(PluginMarketplaceSchema().shape.metadata.unwrap().shape)),
        "metadata",
        warnings,
      );
    if (Array.isArray(rawMarketplace.plugins)) {
      let entryKeys = new Set(Object.keys(PluginMarketplaceEntrySchema().shape));
      let relevanceKeys = new Set(Object.keys(PluginRelevanceSchema().shape));
      let signalKeys = new Set(Object.keys(PluginRelevanceSignalsSchema().shape));
      rawMarketplace.plugins.forEach((plugin, index) => {
        if (!isPlainObject(plugin)) return;
        let entry = plugin;
        reportUnknownFields(entry, entryKeys, `plugins[${index}]`, warnings);
        if (typeof entry.name === "string" && entry.name) {
          let nameValid = isValidPluginIdSegment(entry.name);
          if (!nameValid)
            errors.push({
              path: `plugins[${index}].name`,
              code: UNRECORDABLE_NAME_CODE,
              message:
                `Claude Code cannot install plugin "${sanitizeForDisplay(entry.name, 64)}". ${PLUGIN_ID_PART_RULE_TEXT} Change this entry's "name".` +
                hiddenCharacterNote(entry.name),
            });
          if (!RECORDABLE_NAME_RE.test(entry.name))
            warnings.push({
              path: `plugins[${index}].name`,
              message:
                `Plugin name "${entry.name}" is not accepted by Claude Desktop (letters, digits, ".", "_", "-"; must start alphanumeric; max 128 chars). ` +
                (nameValid ? "Claude Code accepts it, but the " : "The ") +
                "Claude Desktop managed marketplace sync (allowedPluginMarketplaces) will drop this entry." +
                hiddenCharacterNote(entry.name),
            });
          let reservedCheck = officialName ? undefined : checkReservedPluginName(entry.name);
          if (reservedCheck)
            (reservedCheck.severity === "error" ? errors : warnings).push({
              path: `plugins[${index}].name`,
              message: reservedCheck.message,
            });
        }
        let experimental = entry.experimental;
        if (isPlainObject(experimental))
          reportUnknownFields(experimental, MANIFEST_FIELD_HINTS, `plugins[${index}].experimental`, warnings);
        else if (experimental !== undefined)
          warnings.push({
            path: `plugins[${index}].experimental`,
            message: `'experimental' must be an object containing component declarations; got ${getReceivedType(experimental)}. It will be ignored at load time.`,
          });
        let relevance = entry.relevance;
        if (isPlainObject(relevance)) {
          reportUnknownFields(relevance, relevanceKeys, `plugins[${index}].relevance`, warnings);
          let signals = relevance.signals;
          if (isPlainObject(signals))
            reportUnknownFields(signals, signalKeys, `plugins[${index}].relevance.signals`, warnings);
        } else if (relevance !== undefined)
          warnings.push({
            path: `plugins[${index}].relevance`,
            message: `'relevance' must be an object containing topic and signals; got ${getReceivedType(relevance)}. It will be ignored at load time.`,
          });
        let metadata = entry.metadata;
        if (metadata !== undefined && !isPlainObject(metadata))
          warnings.push({
            path: `plugins[${index}].metadata`,
            message: `'metadata' must be a free-form object; got ${getReceivedType(metadata)}. It will be ignored at load time.`,
          });
      });
    }
  }
  if (result.success) {
    let marketplace = result.data;
    if (!marketplace.plugins || marketplace.plugins.length === 0)
      warnings.push({
        path: "plugins",
        message: "Marketplace has no plugins defined",
      });
    if (marketplace.plugins)
      marketplace.plugins.forEach((plugin, index) => {
        if (marketplace.plugins.filter((plugin_2) => plugin_2.name === plugin.name).length > 1)
          errors.push({
            path: `plugins[${index}].name`,
            message: `Duplicate plugin name "${plugin.name}" found in marketplace`,
          });
        let isArchive = typeof plugin.source === "object" && plugin.source.source === "archive";
        if (isArchive && hasHeadersHelper(plugin) && plugin.strict !== false)
          errors.push({
            path: `plugins[${index}].headersHelper`,
            message: `Plugin "${printablePluginName(plugin.name)}" sets headersHelper but is not "strict": false. An entry with headersHelper must inline its full manifest (strict: false, with commands/agents/hooks/mcpServers declared in the entry) so users can review what it ships before the command runs; Claude Code refuses to run the helper otherwise.`,
          });
        if ((plugin.headers !== undefined || hasHeadersHelper(plugin)) && !isArchive)
          warnings.push({
            path: `plugins[${index}].${hasHeadersHelper(plugin) ? "headersHelper" : "headers"}`,
            message: `Plugin "${printablePluginName(plugin.name)}" sets headers/headersHelper, which only apply to "archive" sources; they have no effect on this entry.`,
          });
        else if (
          hasHeadersHelper(plugin) &&
          typeof plugin.source === "object" &&
          plugin.source.source === "archive" &&
          !plugin.source.sha256
        )
          warnings.push({
            path: `plugins[${index}].source.sha256`,
            message: `Plugin "${printablePluginName(plugin.name)}" fetches its archive with a headersHelper but sets no sha256 pin. Consider pinning the digest so the bytes users install are exactly the ones you reviewed (omit it only if you rely on digest-versioned updates).`,
          });
        for (let headerName of isArchive ? Object.keys(plugin.headers ?? {}) : [])
          if (isForbiddenHelperHeader(headerName))
            warnings.push({
              path: `plugins[${index}].headers.${printablePluginName(headerName)}`,
              message: `Header "${printablePluginName(headerName)}" is a request-routing/identity header that catalog entries may not set; Claude Code drops it at download time.`,
            });
      });
    if (!marketplace.description && !marketplace.metadata?.description)
      warnings.push({
        path: "description",
        message:
          "No marketplace description provided. Adding a description helps users understand what this marketplace offers",
      });
  }
  let marketplaceEntrySchema = PluginMarketplaceEntrySchema();
  let manifestDir = pathModule.dirname(absolutePath);
  let marketplaceRoot =
    pathModule.basename(manifestDir) === ".claude-plugin" ? pathModule.dirname(manifestDir) : manifestDir;
  for (let [index, rawEntry] of pluginEntries.entries()) {
    let parseResult = marketplaceEntrySchema.safeParse(
      resolveBareSourceUnderPluginRoot(rawEntry, normalizedPluginRoot),
    );
    if (!parseResult.success) continue;
    let entry = parseResult.data;
    let source = entry.source;
    if (!isRelativeSourcePath(source) || isAbsoluteOrUnsafePath(source)) continue;
    let joined = pathModule.join(marketplaceRoot, source);
    let filePath = pathModule.join(joined, ".claude-plugin", "plugin.json");
    let relativePath = pathModule.relative(marketplaceRoot, filePath);
    let pluginFile = await readPluginFileSafe(marketplaceRoot, pathModule.join(joined, ".claude-plugin"));
    if (pluginFile === "not-a-directory") {
      errors.push({
        path: `plugins[${index}] plugin.json \u2192 file`,
        code: "ENOTDIR",
        message: `A path component of ${relativePath} is not a directory, so the file cannot be read. The entry will fail to load at install time.`,
      });
      continue;
    }
    if (pluginFile === "refused") {
      warnings.push({
        path: `plugins[${index}].source`,
        message:
          `Local source "${source}" is or traverses a symlink, so ${relativePath} was not read \u2014 ` +
          "validation never follows one. Install dereferences symlinks that stay inside the marketplace, so this entry still loads. Validate the real path separately.",
      });
      continue;
    }
    if (pluginFile !== "ok") continue;
    let pluginJsonRead;
    try {
      pluginJsonRead = await getMcpAuthCache(filePath);
    } catch (error) {
      errors.push({
        path: `plugins[${index}] plugin.json \u2192 file`,
        message: `Failed to read ${relativePath}: ${errorMessage(error)}`,
      });
      continue;
    }
    if (pluginJsonRead.kind === "refused" || pluginJsonRead.kind === "too-large") {
      warnings.push({
        path: `plugins[${index}].source`,
        message: `${relativePath} ${pluginJsonRead.kind === "refused" ? "is a symlink or is not a regular file" : `is larger than ${ONE_MIB} bytes`}, so it was not validated. Install reads it anyway. Validate it separately.`,
      });
      continue;
    }
    if (pluginJsonRead.kind === "absent") continue;
    let content = pluginJsonRead.content;
    if (entry.version) {
      let entryVersion;
      try {
        let parsedPluginJson = jsonParse(stripBom(content));
        if (typeof parsedPluginJson.version === "string") entryVersion = parsedPluginJson.version;
      } catch (error) {
        warnings.push({
          path: `plugins[${index}].source`,
          message: `Could not parse ${pathModule.relative(marketplaceRoot, filePath)} for version cross-check: ${errorMessage(error)}`,
        });
      }
      if (entryVersion && entryVersion !== entry.version) {
        let relativePath = pathModule.relative(marketplaceRoot, filePath);
        warnings.push({
          path: `plugins[${index}].version`,
          message:
            `Entry declares version "${entry.version}" but ${relativePath} says "${entryVersion}". ` +
            "At install time, plugin.json wins (calculatePluginVersion precedence) \u2014 the entry version is silently ignored. " +
            `Update this entry to "${entryVersion}" to match.`,
        });
      }
    }
    let parsed = sanitizeValidationResult(
      await validatePluginManifest(
        filePath,
        content,
        officialName
          ? {
              kind: "anthropic",
            }
          : {
              kind: "entry",
              entryName: entry.name,
            },
      ),
    );
    let pathPrefix = `plugins[${index}] plugin.json \u2192 `;
    for (let error of parsed.errors)
      errors.push({
        ...error,
        path: pathPrefix + error.path,
      });
    for (let warning of parsed.warnings)
      warnings.push({
        ...warning,
        path: pathPrefix + warning.path,
      });
  }
  return {
    success: errors.length === 0,
    errors,
    warnings,
    filePath: absolutePath,
    fileType: "marketplace",
  };
}
//@ chunk-bfqsgtvj.js:34301-34341 layout
/**
 * 把校验信息里的用户输入清洗成可显示的单行（去控制字符、截断）。
 */
function sanitizeForDisplay(text, maxChars) {
  return collapseWhitespace(truncateWithCount(stripCombiningRepeated(text), maxChars));
}
//@ chunk-bfqsgtvj.js:34341-34750 layout
/**
 * 校验结果展示前的清洗：路径截断到 200、消息截断到 1000 并去掉不可见字符。
 */
function sanitizeValidationResult(result) {
  return {
    ...result,
    errors: result.errors.map((error) => ({
      ...error,
      path: sanitizeForDisplay(error.path, 200),
      message: sanitizeForDisplay(error.message, 1000),
    })),
    warnings: result.warnings.map((error) => ({
      path: sanitizeForDisplay(error.path, 200),
      message: sanitizeForDisplay(error.message, 1000),
    })),
    ...(result.notes !== undefined && {
      notes: result.notes.map((note) => sanitizeForDisplay(note, 1000)),
    }),
    ...(result.gatingHooks !== undefined && {
      gatingHooks: result.gatingHooks.map((gatingHook) => ({
        module: sanitizeForDisplay(gatingHook.module, 200),
        pattern: sanitizeForDisplay(gatingHook.pattern, 200),
        hook: sanitizeForDisplay(gatingHook.hook, 1000),
        hasCatch: gatingHook.hasCatch,
      })),
    }),
  };
}
//@ chunk-bfqsgtvj.js:34750-37470 fingerprint (2.1.88 match: validateComponentFile, 0.695)
/**
 * 校验命令/代理/技能 markdown 文件的 frontmatter（必需字段、未知键、YAML 错误）。
 */
function validateComponentFile(filePath, content, fileType, scope) {
  let errors = [];
  let warnings = [];
  let isProjectAgent = scope === "project" && fileType === "agent";
  let match = stripBom(content).match(FRONTMATTER_REGEX);
  if (!match) {
    if (!isProjectAgent)
      warnings.push({
        path: "frontmatter",
        message:
          "No frontmatter block found. Add YAML frontmatter between --- delimiters at the top of the file to set description and other metadata.",
      });
    return {
      success: true,
      errors,
      warnings,
      filePath,
      fileType,
    };
  }
  let yamlLenient = parseYamlLenient(match[1] || "");
  if (!yamlLenient.ok) {
    let dropNote =
      fileType !== "agent"
        ? `At runtime this ${fileType} loads with empty metadata (all frontmatter fields silently dropped).`
        : scope === "project"
          ? "At runtime this agent does not load at all \u2014 with no frontmatter " +
            "name it is treated as a co-located reference document and skipped."
          : "At runtime this agent loads with its name taken from the filename and every other frontmatter field silently dropped.";
    errors.push({
      path: "frontmatter",
      message: `YAML frontmatter failed to parse: ${sanitizeForDisplay(yamlLenient.error, 200)}. ` + dropNote,
    });
    return {
      success: false,
      errors,
      warnings,
      filePath,
      fileType,
    };
  }
  let parsed = yamlLenient.value;
  if (parsed !== null && !isPlainObject(parsed)) {
    errors.push({
      path: "frontmatter",
      message: `Frontmatter must be a YAML mapping (key: value pairs), got ${Array.isArray(parsed) ? "an array" : typeof parsed}.`,
    });
    return {
      success: false,
      errors,
      warnings,
      filePath,
      fileType,
    };
  }
  let frontmatter = parsed ?? {};
  if (frontmatter.description !== undefined) {
    let description = frontmatter.description;
    if (
      typeof description !== "string" &&
      typeof description !== "number" &&
      typeof description !== "boolean" &&
      description !== null
    )
      errors.push({
        path: "description",
        message: `description must be a string, got ${Array.isArray(description) ? "array" : typeof description}. At runtime this value is dropped.`,
      });
  } else if (!isProjectAgent || typeof frontmatter.name === "string")
    warnings.push({
      path: "description",
      message: `No description in frontmatter. A description helps users and Claude understand when to use this ${fileType}.`,
    });
  if (frontmatter.name !== undefined && frontmatter.name !== null && typeof frontmatter.name !== "string")
    errors.push({
      path: "name",
      message: `name must be a string, got ${typeof frontmatter.name}.`,
    });
  let at = frontmatter["allowed-tools"];
  if (at !== undefined && at !== null) {
    if (typeof at !== "string" && !Array.isArray(at))
      errors.push({
        path: "allowed-tools",
        message: `allowed-tools must be a string or array of strings, got ${typeof at}.`,
      });
    else if (Array.isArray(at) && at.some((t) => typeof t !== "string"))
      errors.push({
        path: "allowed-tools",
        message: "allowed-tools array must contain only strings.",
      });
  }
  if (fileType === "skill" || fileType === "command") {
    let isDropped = false;
    ((metadataValue) => {
      if (metadataValue == null || isPlainObject(metadataValue)) return;
      isDropped = true;
      warnings.push({
        path: "metadata",
        message: `'metadata' must be a mapping (key: value pairs); got ${Array.isArray(metadataValue) ? "array" : typeof metadataValue}. It is dropped at load time.`,
      });
    })(frontmatter.metadata);
  }
  if (fileType === "skill" || fileType === "command") {
    let sh = frontmatter.shell;
    if (sh !== undefined && sh !== null)
      if (typeof sh !== "string")
        errors.push({
          path: "shell",
          message: `shell must be a string, got ${typeof sh}.`,
        });
      else {
        let normalized = sh.trim().toLowerCase();
        if (normalized !== "bash" && normalized !== "powershell")
          errors.push({
            path: "shell",
            message: `shell must be 'bash' or 'powershell', got '${sanitizeForDisplay(sh, 64)}'.`,
          });
      }
  }
  return {
    success: errors.length === 0,
    errors,
    warnings,
    filePath,
    fileType,
  };
}
//@ chunk-bfqsgtvj.js:37470-42981 layout
/**
 * 安全读取 hooks 文件（不跟随链接、限大小），解析 JSON 并按 schema 校验 hooks 与 modules；对声明的 hooks 模块 检查加载、注册、渲染匹配器、辅助调用等，返回校验结果与模块列表。
 */
async function validateHooksFile(filePath, pluginDir) {
  let emptyResult = {
    result: {
      success: true,
      errors: [],
      warnings: [],
      filePath,
      fileType: "hooks",
    },
    modules: [],
  };
  let refusedResult = (reason) => ({
    result: directoryWarningResult(
      filePath,
      "hooks",
      `${reason} \u2014 hooks are read without following symlinks and are capped at ` +
        `${ONE_MIB} bytes. The plugin loader has neither limit and fails the whole plugin on bad hook config, so validate the real file separately.`,
    ),
    modules: [],
  });
  let dir = pathModule.dirname(filePath);
  let pluginFile = await readPluginFileSafe(pathModule.dirname(dir), dir);
  if (pluginFile === "refused")
    return refusedResult("The hooks directory is a link (a symlink or a Windows junction) and was not read");
  if (pluginFile !== "ok") return emptyResult;
  let fileRead;
  try {
    fileRead = await getMcpAuthCache(filePath);
  } catch (error) {
    return {
      result: {
        success: false,
        errors: [
          {
            path: "file",
            message: `Failed to read file: ${errorMessage(error)}`,
          },
        ],
        warnings: [],
        filePath,
        fileType: "hooks",
      },
      modules: [],
    };
  }
  if (fileRead.kind === "refused")
    return refusedResult("hooks.json is not a regular file (a symlink, a FIFO, a directory)");
  if (fileRead.kind === "too-large") return refusedResult("hooks.json is past the size cap and was not read");
  if (fileRead.kind === "absent") return emptyResult;
  let content = fileRead.content;
  let parsed;
  try {
    parsed = jsonParse(content);
  } catch (error) {
    return {
      result: {
        success: false,
        errors: [
          {
            path: "json",
            message: `Invalid JSON syntax: ${errorMessage(error)}. At runtime this breaks the entire plugin load.`,
          },
        ],
        warnings: [],
        filePath,
        fileType: "hooks",
      },
      modules: [],
    };
  }
  if (hasNestedHooks(parsed, SETTINGS_SKIPPED_KEYS) || looksLikeHookMatcher(parsed))
    return {
      result: {
        success: false,
        errors: [
          {
            path: "hooks",
            message: `PreToolUse/PermissionRequest is declared at the top level, outside the "hooks" object \u2014 ${UNLOADABLE_GUARD_NOTE}`,
          },
        ],
        warnings: [],
        filePath,
        fileType: "hooks",
      },
      modules: [],
    };
  let hookValidation =
    parsed && typeof parsed === "object" && "hooks" in parsed
      ? validateHooksSetting(parsed.hooks)
      : {
          notes: [],
          unloadableGuards: [],
        };
  let mapped = hookValidation.notes.map((note) => ({
    path: "hooks",
    message: `${note} at runtime`,
  }));
  if (hookValidation.unloadableGuards.length > 0)
    return {
      result: {
        success: false,
        errors: hookValidation.unloadableGuards.map((unloadableGuard) => ({
          path: "hooks",
          message: `${unloadableGuard} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
        })),
        warnings: mapped,
        filePath,
        fileType: "hooks",
      },
      modules: [],
    };
  let schemaResult = PluginHooksSchema().safeParse(parsed);
  if (!schemaResult.success)
    return {
      result: {
        success: false,
        errors: formatZodErrors(schemaResult.error),
        warnings: mapped,
        filePath,
        fileType: "hooks",
      },
      modules: [],
    };
  let placeholderWarnings = [];
  for (let placeholderInfo of findUnquotedHookPlaceholders(schemaResult.data.hooks ?? {}))
    placeholderWarnings.push({
      path: `hooks.${placeholderInfo.event}`,
      message: `Shell command uses ${placeholderInfo.placeholders.join(", ")} without quotes: ${sanitizeForDisplay(placeholderInfo.command, 200)}. If the expanded path contains a space the command can split into several words and fail. Wrap the placeholder in double quotes, or use exec form: {"command": "<executable>", "args": ["\${CLAUDE_PLUGIN_ROOT}/..."]}.`,
    });
  let errors = [];
  let notes = [];
  let gatingHooks = [];
  let modules = schemaResult.data.modules ?? [];
  let contract = modules.length > 0 ? await readPluginContractInfo(pluginDir) : emptyPluginTypesContract;
  let nouns = contract.nouns;
  for (let moduleSpec of modules) {
    let modulePath = pathModule.resolve(dir, moduleSpec);
    let relativePath = pathModule.relative(pluginDir, modulePath);
    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${pathModule.sep}`) ||
      pathModule.resolve(relativePath) === relativePath ||
      hasDotDotWithSpaceSegment(moduleSpec)
    ) {
      errors.push({
        path: `modules.${moduleSpec}`,
        message: "The module path leaves the plugin directory",
      });
      continue;
    }
    try {
      let { scan, registrations, renderMatchers, helperCalls, catchReads } =
        await scanHooksModuleForValidation(modulePath, pluginDir, pathModule.basename(pluginDir));
      let registrationText = registrations.length === 0 ? "nothing" : registrations.join(", ");
      let callDescriptions = [
        ...scan.calls.map((call) => {
          let helpers = helperCalls.get(call);
          return helpers === undefined ? `$.${call}` : `$.${call} (via ${helpers.join(", ")})`;
        }),
        ...(scan.nextTo ?? []).map((target) => `next.to:${target}`),
      ];
      let callsText = callDescriptions.length === 0 ? "nothing on $" : callDescriptions.join(", ");
      let filtered = catchReads.filter((catchRead) => catchRead.isOwnCommand);
      let unansweredRegistrations = [];
      if (filtered.length > 0) {
        let hostState = getHostState();
        try {
          if (!hostState.shippedTablesFillFailed) {
            initBuiltinPlugins();
            initBundledSkills();
            let isShippedCommand = firstPartyCommandNameCheck();
            let isShippedName = (name) =>
              isShippedCommand(name) || MANIFEST_FIELD_HINT_SET.has(foldName(name));
            unansweredRegistrations.push(
              ...filtered.filter((registration) => !registration.commands.some(isShippedName)),
            );
            mapped.push(
              ...normalizeCaseForComparison_2(filtered.flatMap((registration) => registration.commands))
                .filter(isShippedName)
                .map((commandName) => ({
                  path: `modules.${moduleSpec}`,
                  message: `"/${sanitizeForDisplay(commandName, 200)}" is a name Claude Code ships: $.command.register refuses it and the hook that calls it is skipped`,
                })),
            );
          }
        } catch (error) {
          hostState.shippedTablesFillFailed = true;
          logForDebugging(
            `plugin validate: shipped command names unread, every command.run hook is listed as a gate: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        }
      }
      let filtered_2 = catchReads.filter(
        (catchRead) => !unansweredRegistrations.includes(catchRead) && hasToolSite(catchRead.pattern),
      );
      notes.push(
        `${moduleSpec} hooks: ${registrationText}`,
        ...unansweredRegistrations.map(
          (registration) => `${moduleSpec} answers its own command: ${registration.registration}`,
        ),
        ...filtered_2.map(
          ({ registration, hasCatch }) =>
            `${moduleSpec} gating hook ${hasCatch ? "with" : "without"} .catch: ` + registration,
        ),
        `${moduleSpec} calls: ${callsText}`,
      );
      gatingHooks.push(
        ...filtered_2.map(({ registration, pattern, hasCatch }) => ({
          module: moduleSpec,
          pattern,
          hook: registration,
          hasCatch,
        })),
      );
      for (let { registration, matcher } of renderMatchers) {
        let advice = adviseUiRenderMatcher(matcher);
        if (advice !== undefined)
          mapped.push({
            path: `modules.${moduleSpec}`,
            message: `on ${registration}: ${advice}`,
          });
      }
      let any = scan.hooks.some((hook) => matchesEventPattern(hook, "engine.create"));
      if (nouns.length > 0 && !any)
        mapped.push({
          path: `modules.${moduleSpec}`,
          message: `the manifest's types contract declares ${nouns.map((noun) => `$.${noun}`).join(", ")} on EngineInterface, but ${moduleSpec} registers no hook on engine.create, so the plugin never adds ${plural(nouns.length, "it", "them")} to $`,
        });
      if (scan.env !== undefined) {
        let joinList = (items) => (items.length === 0 ? "nothing" : items.join(", "));
        notes.push(
          `${moduleSpec} env writes: ${joinList(scan.env.writes)}`,
          `${moduleSpec} env reads: ${joinList(scan.env.reads)}`,
        );
      }
      let telemetrySummary = telemetryRefSummary(scan);
      if (telemetrySummary !== undefined)
        notes.push(`${moduleSpec} hooks telemetry for: ${telemetrySummary}`);
      let streamRefusal = telemetryStreamRefusal(scan, {
        isBuiltin: false,
      });
      if (streamRefusal !== undefined)
        errors.push({
          path: `modules.${moduleSpec}`,
          message: streamRefusal,
        });
      if (scan.state !== undefined) {
        let formatAtoms = (atoms) =>
          atoms.length === 0 ? "nothing" : atoms.map((atom) => stateAtomKey(atom)).join(", ");
        notes.push(
          `${moduleSpec} state writes: ${formatAtoms(scan.state.writes)}`,
          `${moduleSpec} state reads: ${formatAtoms(scan.state.reads)}`,
        );
        let ownerName = contract.name ?? pathModule.basename(pluginDir);
        let isForeign = (atom) => atom.plugin !== ownerName;
        let { reads, writes } = scan.state;
        let contractCheck = checkContractWrites({
          names: contract.isRefused
            ? {
                reads: reads.filter(isForeign),
                writes: writes.filter(isForeign),
              }
            : scan.state,
          owner: ownerName,
          declared: contract.state,
          contract: contract.conventional,
          refusal: contract.refusal,
          others: await collectLoadedContractState(pluginDir),
        });
        errors.push(
          ...contractCheck.problems.map((message) => ({
            path: `modules.${moduleSpec}`,
            message,
          })),
        );
        if (contractCheck.unchecked.length > 0)
          notes.push(
            `${moduleSpec} state of other plugins, not checked (run validate in a session with them enabled): ${contractCheck.unchecked.join(", ")}`,
          );
      }
      let surfaceModules = await loadSurfaceModules(scan.clients, pluginDir, pathModule.basename(pluginDir));
      if (surfaceModules !== undefined)
        notes.push(
          `${moduleSpec} surface modules: ${surfaceModules.map((surfaceModule) => surfaceModule.module).join(", ")}`,
        );
    } catch (error) {
      errors.push({
        path: `modules.${moduleSpec}`,
        message: sanitizeForDisplay(errorMessage(error), 400),
      });
    }
  }
  return {
    result: {
      success: errors.length === 0,
      errors,
      warnings: [...mapped, ...placeholderWarnings],
      filePath,
      fileType: "hooks",
      ...(notes.length > 0 && {
        notes,
      }),
      ...(gatingHooks.length > 0 && {
        gatingHooks,
      }),
    },
    modules,
  };
}
//@ chunk-bfqsgtvj.js:42981-43437 layout
/**
 * 契约读取结果转为错误或说明（声明的名词与状态）。
 */
function contractCheckResult(pluginContract, { relPath, field }) {
  if (pluginContract === undefined)
    return {
      errors: [],
      notes: [],
    };
  if (pluginContract.kind === "refused")
    return {
      errors: pluginContract.problems.map((message) => ({
        path: field,
        message,
      })),
      notes: [],
    };
  let nounsNote =
    `types ${relPath} declares on $: ` +
    (pluginContract.nouns.length > 0
      ? pluginContract.nouns.map((noun) => `$.${noun}`).join(", ")
      : "nothing (no EngineInterface member)");
  let flattened = pluginContract.state.flatMap(({ plugin, keys }) =>
    keys.map((key) =>
      stateAtomKey({
        plugin,
        key,
      }),
    ),
  );
  return {
    errors: [],
    notes:
      flattened.length > 0
        ? [nounsNote, `types ${relPath} declares state: ${flattened.join(", ")}`]
        : [nounsNote],
  };
}
//@ chunk-bfqsgtvj.js:43437-43524 layout
var emptyPluginTypesContract = {
  name: undefined,
  nouns: [],
  state: [],
  isRefused: false,
  conventional: undefined,
  refusal: undefined,
};
//@ chunk-bfqsgtvj.js:43524-44234 layout
/**
 * 读插件 types 契约（显式声明或约定位置）。
 */
async function readPluginContractInfo(pluginDir) {
  let manifestText = await safeValidateComponentFiles(
    pathModule.join(pluginDir, ".claude-plugin", "plugin.json"),
  );
  let manifest = manifestText === undefined ? undefined : parsePlainObject(stripBom(manifestText));
  let name = typeof manifest?.name === "string" ? manifest.name : undefined;
  let types = manifest?.types;
  if (manifest === undefined || (types !== undefined && typeof types !== "string"))
    return {
      ...emptyPluginTypesContract,
      name,
    };
  let pluginContract = await loadPluginContract(types, pluginDir, pathModule.basename(pluginDir));
  if (pluginContract === undefined)
    return {
      ...emptyPluginTypesContract,
      name,
    };
  if (types !== undefined)
    return pluginContract.kind === "read"
      ? {
          ...emptyPluginTypesContract,
          name,
          nouns: pluginContract.nouns,
          state: pluginContract.state,
        }
      : {
          ...emptyPluginTypesContract,
          name,
          isRefused: true,
        };
  let conventional = `the types contract at ${TYPES_ENTRY}`;
  if (pluginContract.kind === "read")
    return {
      ...emptyPluginTypesContract,
      name,
      state: pluginContract.state,
      conventional,
    };
  let moreCount = pluginContract.problems.length - 1;
  return {
    ...emptyPluginTypesContract,
    name,
    conventional,
    refusal: sanitizeForDisplay(
      `the file at ${TYPES_ENTRY} could not be taken as the types contract (${pluginContract.problems[0] ?? "refused"}${moreCount > 0 ? `, and ${moreCount} more` : ""})`,
      1000,
    ),
  };
}
//@ chunk-bfqsgtvj.js:44234-44576 layout
/**
 * 已加载的其他插件契约声明的状态键。
 */
async function collectLoadedContractState(pluginDir) {
  let pluginRegistry = getPluginRegistry();
  let loadPromise = pluginRegistry.pluginLoadCacheOnly ?? pluginRegistry.pluginLoad;
  if (loadPromise === undefined) return;
  let enabledPlugins;
  try {
    enabledPlugins = (await loadPromise).enabled;
  } catch {
    return;
  }
  let stateAtoms = [];
  for (let plugin of enabledPlugins) {
    let types = plugin.manifest.types;
    if (!(
      (types !== undefined || plugin.isBuiltin !== true) &&
      pathModule.resolve(plugin.path) !== pathModule.resolve(pluginDir)
    ))
      continue;
    let pluginContract = await loadPluginContract(types, plugin.path, plugin.name);
    if (pluginContract?.kind === "read") stateAtoms.push(...pluginContract.state);
  }
  return stateAtoms;
}
//@ chunk-bfqsgtvj.js:44576-45004 layout
/**
 * 插件的 hooks 文件路径（默认 hooks/hooks.json 与 manifest.hooks）。
 */
async function listHooksFilePaths(pluginDir) {
  let paths = [pathModule.join(pluginDir, "hooks", "hooks.json")];
  if (!(await isDirectoryOrFalse(pathModule.join(pluginDir, ".claude-plugin")))) return paths;
  let manifestText = await safeValidateComponentFiles(
    pathModule.join(pluginDir, ".claude-plugin", "plugin.json"),
  );
  let hooks = manifestText === undefined ? undefined : parsePlainObject(stripBom(manifestText))?.hooks;
  let hookSpecs = Array.isArray(hooks) ? hooks : [hooks];
  for (let spec of hookSpecs) {
    if (typeof spec !== "string") continue;
    let resolved = pathModule.resolve(pluginDir, spec);
    let relativePath = pathModule.relative(pluginDir, resolved);
    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${pathModule.sep}`) ||
      pathModule.resolve(relativePath) === relativePath ||
      hasDotDotWithSpaceSegment(spec)
    )
      continue;
    if (!paths.includes(resolved)) paths.push(resolved);
  }
  return paths;
}
//@ chunk-bfqsgtvj.js:45004-45470 layout
/**
 * 逐个校验 hooks 文件，多个文件都声明模块时报错。
 */
async function validateAllHooksFiles(pluginDir) {
  let results = [];
  let filesWithModules = [];
  for (let hookFilePath of await listHooksFilePaths(pluginDir)) {
    let { result, modules } = await validateHooksFile(hookFilePath, pluginDir);
    if (modules.length > 0) filesWithModules.push(hookFilePath);
    if (result.errors.length > 0 || result.warnings.length > 0 || result.notes !== undefined)
      results.push(result);
  }
  let [, duplicateFile] = filesWithModules;
  if (duplicateFile !== undefined) {
    let mapped = filesWithModules.map((file) => pathModule.relative(pluginDir, file));
    results.push({
      success: false,
      errors: [
        {
          path: "modules",
          message: `The plugin names one hooks module per plugin, but ${mapped.join(" and ")} each name one; the loader refuses both`,
        },
      ],
      warnings: [],
      filePath: duplicateFile,
      fileType: "hooks",
    });
  }
  return results;
}
//@ chunk-bfqsgtvj.js:45470-46078 layout (2.1.88 match: expandEnvVars, 0.841)
/**
 * MCP 服务器文件的校验常量组：Xn 是已知服务器类型集合（stdio/http/streamable-http/sse/ws/sdk/sse-ide/ws-ide/claudeai-proxy）；Qn 是 ${user_config.X} 占位符正则（全局）；xt 是任意 ${…} 模板占位正则，URL 里出现即判模板；Me 是最多检查的 MCP server 文件数 16；es 是 URL 长度上限 8192；ts/ns/ss 是机密值、键名与占位值的识别正则。
 */
var KNOWN_SERVER_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var USER_CONFIG_PLACEHOLDER_PATTERN;
var URL_TEMPLATE_RE;
var MAX_MCP_SERVER_FILES;
var MAX_URL_LENGTH;
var SECRET_VALUE_PATTERNS;
var SECRET_KEY_NAME_PATTERN;
var PLACEHOLDER_VALUE_PATTERN;
deferInit("chunk-bfqsgtvj.js:45470", () => {
  KNOWN_SERVER_TYPES = new Set([
    "stdio",
    "http",
    "streamable-http",
    "sse",
    "ws",
    "sdk",
    "sse-ide",
    "ws-ide",
    "claudeai-proxy",
  ]);
  USER_CONFIG_PLACEHOLDER_PATTERN = /\$\{user_config\.([^}$]+)\}/g;
  URL_TEMPLATE_RE = /\$\{[^}$]+\}/;
  MAX_MCP_SERVER_FILES = 16;
  MAX_URL_LENGTH = 8192;
  SECRET_VALUE_PATTERNS = [
    /\bsk-[A-Za-z0-9_-]{16,}/,
    /\bgh[opsur]_[A-Za-z0-9]{30,}/,
    /\bgithub_pat_[A-Za-z0-9_]{30,}/,
    /\bxox[abeprs]-[A-Za-z0-9-]{10,}/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bglpat-[A-Za-z0-9_-]{20,}/,
    /\bAIza[0-9A-Za-z_-]{35}\b/,
    /(?:^|[^A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/,
  ];
  SECRET_KEY_NAME_PATTERN = /authorization|api[-_]?key|token|secret|password|credential/i;
  PLACEHOLDER_VALUE_PATTERN =
    /your[-_ ]|replace|example|changeme|placeholder|dummy|redacted|xxx|[<>]|\*\*\*/i;
});
//@ chunk-bfqsgtvj.js:46078-46224 layout
function shannonEntropy(text) {
  let charCounts = new Map();
  for (let char of text) charCounts.set(char, (charCounts.get(char) ?? 0) + 1);
  let entropy = 0;
  for (let count of charCounts.values()) {
    let probability = count / text.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}
//@ chunk-bfqsgtvj.js:46224-46472 layout
function looksLikeSecretValue(headerName, value) {
  if (value.length > MAX_URL_LENGTH || URL_TEMPLATE_RE.test(value) || PLACEHOLDER_VALUE_PATTERN.test(value))
    return false;
  let trimmed = value.trim();
  if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;
  if (!SECRET_KEY_NAME_PATTERN.test(headerName)) return false;
  let credential = trimmed.match(/^(?:Bearer|Basic|Token|Bot)\s+(\S+)$/i)?.[1] ?? trimmed;
  return credential.length >= 20 && !/\s/.test(credential) && shannonEntropy(credential) >= 3;
}
//@ chunk-bfqsgtvj.js:46472-46495 layout
var USER_CONFIG_REF_RE = /\$\{[^}$]+\}/g;
//@ chunk-bfqsgtvj.js:46495-46554 layout
function parseUrlWithConfig(url, replacement) {
  return URL.parse(url.replace(USER_CONFIG_REF_RE, replacement)) ?? undefined;
}
//@ chunk-bfqsgtvj.js:46554-47094 layout
/**
 * 远程 MCP url 用 http/ws 到非回环主机时的警告。
 */
function insecureRemoteUrlWarning(url) {
  let probeA = parseUrlWithConfig(url, "probe-a.invalid") ?? parseUrlWithConfig(url, "1");
  let probeB = parseUrlWithConfig(url, "probe-b.invalid") ?? parseUrlWithConfig(url, "2");
  if (!probeA || !probeB || probeA.hostname !== probeB.hostname) return;
  let insecureScheme = probeA.protocol === "http:" ? "http" : probeA.protocol === "ws:" ? "ws" : undefined;
  if (insecureScheme === undefined) return;
  let hostname = probeA.hostname;
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  )
    return;
  let secureScheme = insecureScheme === "http" ? "https" : "wss";
  return (
    `url uses ${insecureScheme}:// to a non-loopback host \u2014 requests, headers and any ` +
    `credentials travel in cleartext. Use ${secureScheme}://; plugin directories may reject insecure remote server urls.`
  );
}
//@ chunk-bfqsgtvj.js:47094-47596 layout
/**
 * 列出 MCP 服务器配置中可能含占位符的字符串字段。
 */
function listMcpStringFields(server) {
  let fields = [];
  let directFields = [];
  let mapField;
  if (server.type === undefined || server.type === "stdio") {
    directFields.push("command");
    mapField = "env";
    if (Array.isArray(server.args)) {
      for (let [index, arg] of server.args.entries())
        if (typeof arg === "string")
          fields.push({
            field: `args[${index}]`,
            value: arg,
          });
    }
  } else if (isRemoteMcpType(server.type)) {
    directFields.push("url", "headersHelper");
    mapField = "headers";
  }
  for (let fieldName of directFields) {
    let fieldValue = server[fieldName];
    if (typeof fieldValue === "string")
      fields.push({
        field: fieldName,
        value: fieldValue,
      });
  }
  let mapValue = mapField === undefined ? undefined : server[mapField];
  if (mapField !== undefined && isPlainObject(mapValue)) {
    for (let [key, value] of Object.entries(mapValue))
      if (typeof value === "string")
        fields.push({
          field: `${mapField}.${key}`,
          value,
        });
  }
  return fields;
}
//@ chunk-bfqsgtvj.js:47596-47673 layout
function isRemoteMcpType(type) {
  return type === "http" || type === "streamable-http" || type === "sse" || type === "ws";
}
//@ chunk-bfqsgtvj.js:47673-49784 layout
/**
 * 检查 MCP 配置中 ${user_config.*} 引用与 url/directory 问题。
 */
function checkMcpUserConfigRefs(fieldPath, server, declaredKeys) {
  let errors = [];
  let warnings = [];
  if (!isPlainObject(server))
    return {
      errors,
      warnings,
    };
  for (let { field, value } of listMcpStringFields(server)) {
    let referencedKeys = new Set(
      [...value.matchAll(USER_CONFIG_PLACEHOLDER_PATTERN)].map((match) => match[1]),
    );
    if (referencedKeys.size === 0) continue;
    let path = `${fieldPath}.${sanitizeForDisplay(field, 64)}`;
    if (field === "headersHelper") {
      errors.push({
        path,
        message:
          'headersHelper references ${user_config.*}. Options are never substituted into headersHelper: the plugin loader refuses the server when the plugin declares any options (the value would be spliced into a shell command), and otherwise the literal text reaches the shell. Read the value inside the helper script instead (for example from a variable set in the server\'s "env" block).',
      });
      continue;
    }
    if (declaredKeys === null) continue;
    for (let key of referencedKeys)
      if (key !== undefined && !declaredKeys.has(key))
        errors.push({
          path,
          message: `references \${user_config.${sanitizeForDisplay(key, 64)}}, which plugin.json does not declare under "userConfig" (or in this server's "channels" entry), so on a fresh install it cannot resolve: the loader drops the server or passes the literal text through. Declare the option or fix the key.`,
        });
  }
  if (isRemoteMcpType(server.type) && typeof server.url === "string")
    if (server.url.trim() === "") {
      if (typeof server.directory === "string" && server.directory !== "")
        warnings.push({
          path: `${fieldPath}.directory`,
          message: `"directory" is set but url is empty. The key names a directory entry and counts only when this server's url is that entry's url, so plugin directories may reject this plugin. Set url to that entry's url, or remove the "directory" key.`,
        });
    } else if (!URL_TEMPLATE_RE.test(server.url) && !URL.canParse(server.url))
      errors.push({
        path: `${fieldPath}.url`,
        message:
          'url is not a valid absolute URL (for example "https://host/path"). The plugin loader marks this server as invalid config and it never connects.',
      });
    else {
      let insecureWarning = insecureRemoteUrlWarning(server.url);
      if (insecureWarning)
        warnings.push({
          path: `${fieldPath}.url`,
          message: insecureWarning,
        });
    }
  if (isRemoteMcpType(server.type) && isPlainObject(server.headers)) {
    for (let [key, value] of Object.entries(server.headers))
      if (typeof value === "string" && looksLikeSecretValue(key, value))
        warnings.push({
          path: `${fieldPath}.headers.${sanitizeForDisplay(key, 64)}`,
          message:
            "header value looks like a literal credential. Everything shipped in a plugin is readable by everyone who installs it; reference a sensitive userConfig option (${user_config.KEY}) or an environment variable (${VAR}) instead of committing the value.",
        });
  }
  return {
    errors,
    warnings,
  };
}
//@ chunk-bfqsgtvj.js:49784-51026 layout
/**
 * 按类型校验单个 MCP 服务器配置（缺 type、未知类型、schema）。
 */
function validateMcpServerConfig(path, config, error) {
  if (!isPlainObject(config))
    return [
      {
        path,
        message: `server config must be an object (got ${getReceivedType(config)}). The plugin loader silently drops this server at load.`,
      },
    ];
  let type = config.type;
  if (type === undefined && !("command" in config) && "url" in config)
    return [
      {
        path: `${path}.type`,
        message:
          'server has a "url" but no "type". Remote servers must set "type" to "http" (or "sse" / "ws"); without it the entry is parsed as a stdio server, fails for lacking "command", and is silently dropped at load.',
      },
    ];
  if (type !== undefined && (typeof type !== "string" || !KNOWN_SERVER_TYPES.has(type))) {
    let typeText = typeof type === "string" ? `"${sanitizeForDisplay(type, 32)}"` : getReceivedType(type);
    return [
      {
        path: `${path}.type`,
        message:
          `unknown server type ${typeText} \u2014 expected "stdio" (or no type) for a local ` +
          'command, or "http", "sse", "ws" for a remote server. The plugin loader silently drops this server at load.',
      },
    ];
  }
  let schemaResult = (
    type === undefined || type === "stdio"
      ? McpStdioServerConfigSchema()
      : type === "http" || type === "streamable-http"
        ? McpHTTPServerConfigSchema()
        : type === "sse"
          ? McpSSEServerConfigSchema()
          : type === "ws"
            ? McpWebSocketServerConfigSchema()
            : undefined
  )?.safeParse(config);
  if (!schemaResult)
    return [
      {
        path,
        message: `is not a valid "${String(type)}" server config (${formatZodErrors(error)[0]?.message ?? "invalid"}). The plugin loader silently drops this server at load.`,
      },
    ];
  return (schemaResult.success ? formatZodErrors(error) : formatZodErrors(schemaResult.error)).map(
    (issue) => ({
      ...issue,
      path: issue.path === "root" ? path : `${path}.${issue.path}`,
      message: `${issue.message}. The plugin loader silently drops this server at load.`,
    }),
  );
}
//@ chunk-bfqsgtvj.js:51026-53349 layout
/**
 * 校验一个 MCP 服务器 JSON 文件。
 */
async function validateMcpJsonFile(filePath, displayPath, keysForServer) {
  let refusedResult = (reason) =>
    directoryWarningResult(
      displayPath,
      "mcp",
      `${reason} \u2014 MCP server files are read without following symlinks and are capped at ` +
        `${ONE_MIB} bytes. The plugin loader has neither limit, so validate the real file separately.`,
    );
  let fileRead;
  try {
    fileRead = await getMcpAuthCache(filePath);
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: "file",
          message: `Failed to read file: ${errorMessage(error)}`,
        },
      ],
      warnings: [],
      filePath: displayPath,
      fileType: "mcp",
    };
  }
  if (fileRead.kind === "absent") return null;
  if (fileRead.kind === "refused")
    return refusedResult("The file is not a regular file (a symlink, a FIFO, a directory) and was not read");
  if (fileRead.kind === "too-large") return refusedResult("The file is past the size cap and was not read");
  let parsed;
  try {
    parsed = jsonParse(fileRead.content);
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: "json",
          message: `Invalid JSON syntax: ${fileRead.content.startsWith("\uFEFF") ? "the file starts with a UTF-8 byte-order mark (BOM), which this file (unlike plugin.json) must not have \u2014 re-save it as UTF-8 without BOM" : errorMessage(error)}. The plugin loader logs this at debug level and loads no servers from the file.`,
        },
      ],
      warnings: [],
      filePath: displayPath,
      fileType: "mcp",
    };
  }
  let errors = [];
  let warnings = [];
  let hasWrapper = isPlainObject(parsed) && Boolean(parsed.mcpServers);
  let serverMap = hasWrapper && isPlainObject(parsed) ? parsed.mcpServers : parsed;
  let path = hasWrapper ? "mcpServers" : "root";
  let entries;
  if (isPlainObject(serverMap)) entries = Object.entries(serverMap);
  else if (Array.isArray(serverMap)) {
    entries = serverMap.map((config, index) => [String(index), config]);
    if (serverMap.length > 0)
      warnings.push({
        path,
        message: `is an array; the plugin loader keys its servers by array index ("0", "1", ...), and review tooling has misread this shape as 'no servers'. Use an object keyed by server name.`,
      });
  } else
    return {
      success: false,
      errors: [
        {
          path,
          message: `must be an object mapping server names to server configs (got ${getReceivedType(serverMap)}). No servers load from this file.`,
        },
      ],
      warnings: [],
      filePath: displayPath,
      fileType: "mcp",
    };
  for (let [serverName, config] of entries) {
    let safeName = sanitizeForDisplay(serverName, 64);
    let serverPath = hasWrapper ? `mcpServers.${safeName}` : safeName;
    let parseResult = McpServerConfigSchema().safeParse(config);
    if (!parseResult.success) {
      errors.push(...validateMcpServerConfig(serverPath, config, parseResult.error));
      continue;
    }
    let transportRefusal = unaddableTransportReason(parseResult.data.type);
    if (transportRefusal !== null) {
      errors.push({
        path: `${serverPath}.type`,
        message:
          transportRefusal === "host-only"
            ? `type "${parseResult.data.type}" servers are registered by the host application at runtime and cannot be declared by a plugin. The plugin loader drops this server at load.`
            : 'type "claudeai-proxy" is used only by claude.ai connectors and cannot be declared ' +
              'by a plugin \u2014 declare the server with type "http" instead. The plugin loader drops ' +
              "this server at load.",
      });
      continue;
    }
    let refCheck = checkMcpUserConfigRefs(serverPath, config, keysForServer(serverName));
    errors.push(...refCheck.errors);
    warnings.push(...refCheck.warnings);
  }
  return {
    success: errors.length === 0,
    errors,
    warnings,
    filePath: displayPath,
    fileType: "mcp",
  };
}
//@ chunk-bfqsgtvj.js:53349-53690 layout (2.1.88 match: loadChannelUserConfig, 0.777)
/**
 * 由 manifest 构造“某 MCP 服务器可用的 userConfig 键集合”查询函数（插件级 + 频道级）。
 */
function buildUserConfigKeyLookup(manifest) {
  let topLevelKeys = new Set(isPlainObject(manifest.userConfig) ? Object.keys(manifest.userConfig) : []);
  let keysByServer = new Map();
  if (Array.isArray(manifest.channels)) {
    for (let channel of manifest.channels)
      if (isPlainObject(channel) && typeof channel.server === "string" && !keysByServer.has(channel.server))
        keysByServer.set(
          channel.server,
          new Set(isPlainObject(channel.userConfig) ? Object.keys(channel.userConfig) : []),
        );
  }
  return (serverName) => {
    let serverKeys = keysByServer.get(serverName);
    return serverKeys === undefined
      ? topLevelKeys
      : {
          has: (key) => topLevelKeys.has(key) || serverKeys.has(key),
        };
  };
}
//@ chunk-bfqsgtvj.js:53690-53726 layout
async function userConfigKeyLookup(manifest, pluginDir) {
  return buildUserConfigKeyLookup(manifest);
}
//@ chunk-bfqsgtvj.js:53726-55011 layout
/**
 * 校验插件的 .mcp.json 与 manifest 引用的 MCP 文件。
 */
async function validatePluginMcpFiles(pluginDir, entries) {
  let rawCandidate;
  let joined = pathModule.join(pluginDir, ".claude-plugin", "plugin.json");
  if (await isDirectoryOrFalse(pathModule.dirname(joined))) {
    let manifestText = await safeValidateComponentFiles(joined);
    let manifest = manifestText === undefined ? undefined : parsePlainObject(stripBom(manifestText));
    if (manifest)
      rawCandidate =
        validatePluginManifest_2(manifest, "plugin-json", {
          pluginName: pathModule.basename(pluginDir),
          manifestPath: joined,
        }).rawCandidate ?? manifest;
  }
  let lookupKeys = rawCandidate ? buildUserConfigKeyLookup(rawCandidate) : undefined;
  let keysForServer = (serverName) => (lookupKeys ? lookupKeys(serverName) : null);
  let results = [];
  let joined_2 = pathModule.join(pluginDir, ".mcp.json");
  let firstResult = await validateMcpJsonFile(joined_2, joined_2, keysForServer);
  if (firstResult) results.push(firstResult);
  let seenPaths = new Set([pathModule.resolve(joined_2)]);
  let mcpServers = rawCandidate?.mcpServers;
  let mcpSpecs = mcpServers === undefined ? [] : Array.isArray(mcpServers) ? mcpServers : [mcpServers];
  let remainingBudget = MAX_MCP_SERVER_FILES;
  let skippedCount = 0;
  for (let spec of mcpSpecs) {
    if (typeof spec !== "string") continue;
    if (!spec.startsWith("./") || !spec.endsWith(".json") || spec.includes("..")) continue;
    let filePath = pathModule.join(pluginDir, spec);
    let resolved = pathModule.resolve(filePath);
    if (seenPaths.has(resolved)) continue;
    seenPaths.add(resolved);
    if (remainingBudget <= 0) {
      skippedCount++;
      continue;
    }
    remainingBudget--;
    let displayPath = pathModule.join(pluginDir, sanitizeForDisplay(spec, 128));
    let pluginFile = await readPluginFileSafe(pluginDir, pathModule.dirname(filePath));
    if (pluginFile === "refused") {
      results.push(
        directoryWarningResult(
          displayPath,
          "mcp",
          "A directory on the way to this MCP servers file is a link (a symlink or a Windows junction) or " +
            "escapes the plugin, and the file was not read \u2014 the plugin loader " +
            "follows it, so validate the real file separately.",
        ),
      );
      continue;
    }
    if (pluginFile !== "ok") continue;
    let result = await validateMcpJsonFile(filePath, displayPath, keysForServer);
    if (result) results.push(result);
  }
  if (skippedCount > 0)
    results.push(
      directoryWarningResult(
        joined,
        "mcp",
        `plugin.json names more than ${MAX_MCP_SERVER_FILES} MCP server files; ${skippedCount} ${plural(skippedCount, "file")} past that limit were not examined. The plugin loader reads them all, so validate those files separately.`,
      ),
    );
  return results.filter((result) => result.errors.length > 0 || result.warnings.length > 0);
}
//@ chunk-bfqsgtvj.js:55011-55633 fingerprint (2.1.88 match: collectMarkdown, 0.84)
async function collectMarkdown(dir, isSkillsDir) {
  let entries;
  try {
    entries = await readdir(dir, {
      withFileTypes: true,
    });
  } catch (e) {
    let code = getErrnoCode(e);
    if (code === "ENOENT" || code === "ENOTDIR")
      return {
        files: [],
        skippedSymlinks: 0,
      };
    throw e;
  }
  let skippedSymlinks = countWhere(entries, (entry) => entry.isSymbolicLink());
  if (isSkillsDir) {
    let files = [];
    for (let entry of entries.filter((e) => e.isDirectory()))
      if (await buildSecretScanResult(pathModule.join(dir, entry.name))) skippedSymlinks++;
      else files.push(pathModule.join(dir, entry.name, "SKILL.md"));
    return {
      files,
      skippedSymlinks,
    };
  }
  let files = [];
  for (let entry of entries) {
    let full = pathModule.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (await buildSecretScanResult(full)) {
        skippedSymlinks++;
        continue;
      }
      let markdown = await collectMarkdown(full, false);
      files.push(...markdown.files);
      skippedSymlinks += markdown.skippedSymlinks;
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(full);
  }
  return {
    files,
    skippedSymlinks,
  };
}
//@ chunk-bfqsgtvj.js:55633-55730 fingerprint (2.1.88 match: validatePluginContents, 0.557)
var NO_MANIFEST; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COMPONENT_DIR_KINDS;
deferInit("chunk-bfqsgtvj.js:55633", () => {
  NO_MANIFEST = "NO_MANIFEST";
  COMPONENT_DIR_KINDS = new Map([
    ["skills", "skill"],
    ["agents", "agent"],
    ["commands", "command"],
  ]);
});
//@ chunk-bfqsgtvj.js:55730-55781 layout
function isProjectOrSkillScope(scope, fileType) {
  return scope === "project" || fileType === "skill";
}
//@ chunk-bfqsgtvj.js:55781-55974 layout
async function findComponentDirs(rootDir) {
  let mapped = [...COMPONENT_DIR_KINDS].map(([kind, baseName]) => [baseName, pathModule.join(rootDir, kind)]);
  let results = await Promise.all(mapped.map(([, relPath]) => readPluginFileSafe(rootDir, relPath)));
  return {
    dirs: mapped.filter((dir, index) => results[index] === "ok"),
    refused: mapped.filter((dir, index) => results[index] === "refused"),
  };
}
//@ chunk-bfqsgtvj.js:55974-56283 layout
/**
 * 目录是否像一个插件（有 .claude-plugin/，或有含 SKILL.md 的 skills/）。
 */
async function looksLikePluginDir(rootDir) {
  if ((await readPluginFileSafe(rootDir, pathModule.join(rootDir, ".claude-plugin"))) === "ok") return true;
  let dir = pathModule.join(rootDir, "skills");
  let pluginFile = await readPluginFileSafe(rootDir, dir);
  if (pluginFile === "refused") return true;
  if (pluginFile !== "ok") return false;
  let { files } = await collectMarkdown(dir, true);
  for (let file of files)
    if (
      await lstat(file).then(
        () => true,
        (error) => {
          let errnoCode = getErrnoCode(error);
          return errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR";
        },
      )
    )
      return true;
  return false;
}
//@ chunk-bfqsgtvj.js:56283-56392 layout
/**
 * 构造“目录级警告”的校验结果。
 */
function directoryWarningResult(filePath, fileType, message) {
  return {
    success: true,
    errors: [],
    warnings: [
      {
        path: "directory",
        message,
      },
    ],
    filePath,
    fileType,
  };
}
//@ chunk-bfqsgtvj.js:56392-58718 layout
/**
 * 校验插件目录下所有组件文件（commands/agents/skills…），符号链接目录不读取并给出警告。
 */
async function validateComponentDirs(dirs, refused, scope) {
  let results = [];
  let scannedCount = 0;
  let skipped = refused.length;
  for (let [kind, dir] of refused)
    results.push(
      directoryWarningResult(
        dir,
        kind,
        scope === "plugin"
          ? "This directory is a symlink, so the validator read nothing in it. An installed plugin loads it only if it points inside the plugin's installed folder, or, for a plugin read in place from a local marketplace folder, inside that folder; a project's .claude/skills plugin, only if it points inside the folder holding that .claude. Otherwise replace the link with a copy of the folder. To check its files, validate the folder it points to."
          : "This directory is a symlink and nothing in it was read \u2014 " +
              "component directories are read without following symlinks. A session loading this project does follow it, so validate the real directory separately.",
      ),
    );
  for (let [fileType, dir] of dirs) {
    let { files, skippedSymlinks } = await collectMarkdown(dir, fileType === "skill");
    let symlinkSkipped = isProjectOrSkillScope(scope, fileType) ? skippedSymlinks : 0;
    let refusedSkipped = 0;
    let tooLargeSkipped = 0;
    for (let file of files) {
      let filePath = sanitizeForDisplay(file, 256);
      let fileRead;
      try {
        fileRead = await getMcpAuthCache(file);
      } catch (error) {
        results.push({
          success: false,
          errors: [
            {
              path: "file",
              message: `Failed to read: ${sanitizeForDisplay(errorMessage(error), 200)}`,
            },
          ],
          warnings: [],
          filePath,
          fileType,
        });
        continue;
      }
      if (fileRead.kind !== "ok") {
        if (fileRead.kind === "refused" && isProjectOrSkillScope(scope, fileType)) refusedSkipped++;
        else if (fileRead.kind === "too-large") tooLargeSkipped++;
        continue;
      }
      scannedCount++;
      let result = validateComponentFile(filePath, fileRead.content, fileType, scope);
      if (result.errors.length > 0 || result.warnings.length > 0) results.push(result);
    }
    skipped += symlinkSkipped + refusedSkipped + tooLargeSkipped;
    let symlinkNote =
      scope === "plugin"
        ? "A session started with --plugin-dir on this plugin follows a symlink here. An installed plugin follows one only if it points inside the plugin's installed folder, or, for a plugin read in place from a local marketplace folder, inside that folder; a project's .claude/skills plugin, only if it points inside the folder holding that .claude. To check what a symlink points to, validate that path."
        : "A session loading this directory does follow them, so validate the real paths separately.";
    if (symlinkSkipped > 0)
      results.push(
        directoryWarningResult(
          dir,
          fileType,
          `${symlinkSkipped} ${plural(symlinkSkipped, "entry", "entries")} here ${plural(symlinkSkipped, "is", "are")} ${plural(symlinkSkipped, "a symlink", "symlinks")} and ${plural(symlinkSkipped, "was", "were")} not read \u2014 components are read ` +
            `without following symlinks. ${symlinkNote}`,
        ),
      );
    if (refusedSkipped > 0)
      results.push(
        directoryWarningResult(
          dir,
          fileType,
          `${refusedSkipped} ${plural(refusedSkipped, "component")} here ${plural(refusedSkipped, "was", "were")} not read \u2014 the path is not a ` +
            `regular file (a symlink, a FIFO, a directory). ${scope === "plugin" ? "A FIFO or a directory is never read. " : ""}${symlinkNote}`,
        ),
      );
    if (tooLargeSkipped > 0)
      results.push(
        directoryWarningResult(
          dir,
          fileType,
          `${tooLargeSkipped} ${plural(tooLargeSkipped, "file")} here ${plural(tooLargeSkipped, "is", "are")} larger than ${ONE_MIB} bytes and ${plural(tooLargeSkipped, "was", "were")} not validated.`,
        ),
      );
  }
  return {
    results,
    scanned: scannedCount,
    skipped,
  };
}
//@ chunk-bfqsgtvj.js:58718-58774 layout
async function validateComponentDirectorySafe(dirPath) {
  return (await validateComponentDirectory(dirPath))?.map(sanitizeValidationResult) ?? null;
}
//@ chunk-bfqsgtvj.js:58774-60006 layout
/**
 * 校验组件目录（或 .claude、插件根下的组件目录）。
 */
async function validateComponentDirectory(dirPath) {
  let fileType = COMPONENT_DIR_KINDS.get(pathModule.basename(dirPath));
  if (fileType) {
    let dir = pathModule.dirname(dirPath);
    let reason;
    if (pathModule.basename(dir) === ".claude" && !(await isDirectoryOrFalse(dir)))
      reason = "The enclosing .claude directory is a link (a symlink or a Windows junction).";
    else if (!(await isDirectoryOrFalse(dirPath)))
      reason = "This path is a link (a symlink or a Windows junction).";
    if (reason)
      return [
        {
          success: false,
          errors: [
            {
              path: "directory",
              message: `${reason} Component directories are read without following links, so nothing here was validated. Pass the real directory instead.`,
            },
          ],
          warnings: [],
          filePath: dirPath,
          fileType,
        },
      ];
    return (await validateComponentDirs([[fileType, dirPath]], [], "project")).results;
  }
  let rootDir = pathModule.join(dirPath, ".claude");
  let isClaudeDir = pathModule.basename(dirPath) === ".claude";
  let [pluginFile, looksLikePlugin] = await Promise.all([
    readPluginFileSafe(dirPath, rootDir),
    isClaudeDir ? Promise.resolve(false) : looksLikePluginDir(dirPath),
  ]);
  let ownDirs =
    isClaudeDir || looksLikePlugin
      ? await findComponentDirs(dirPath)
      : {
          dirs: [],
          refused: [],
        };
  let claudeDirs =
    pluginFile === "ok"
      ? await findComponentDirs(rootDir)
      : {
          dirs: [],
          refused: [],
        };
  let scope = isClaudeDir ? "project" : "plugin";
  let [ownResult, claudeResult] = await Promise.all([
    validateComponentDirs(ownDirs.dirs, ownDirs.refused, scope),
    validateComponentDirs(claudeDirs.dirs, claudeDirs.refused, "project"),
  ]);
  let results = [...ownResult.results, ...claudeResult.results];
  let scannedCount = ownResult.scanned + claudeResult.scanned;
  let skippedCount = ownResult.skipped + claudeResult.skipped;
  if (pluginFile === "refused")
    results.push(
      directoryWarningResult(
        rootDir,
        "plugin",
        "This directory is a link (a symlink or a Windows junction) and nothing in it was read \u2014 .claude is " +
          "read without following links. A session loading this project does follow it, so validate the real directory separately.",
      ),
    );
  return scannedCount > 0 || skippedCount > 0 || results.length > 0 ? results : null;
}
//@ chunk-bfqsgtvj.js:60006-60710 layout
/**
 * 插件根目录里出现 CLAUDE.md / CLAUDE.local.md 时给出“插件不会加载它们”的警告。
 */
async function checkPluginRootClaudeMd(pluginDir) {
  let results = [];
  let blockedNames = new Set(["claude.md", "claude.local.md"]);
  let entries = [];
  try {
    entries = await readdir(pluginDir, {
      withFileTypes: true,
    });
  } catch {}
  for (let dirent of entries) {
    if (!dirent.isFile() || !blockedNames.has(dirent.name.toLowerCase())) continue;
    let advice =
      dirent.name.toLowerCase() === "claude.local.md"
        ? "Remove it from the plugin root."
        : "To ship context with your plugin, use a skill (skills/<name>/SKILL.md) instead.";
    results.push({
      success: true,
      errors: [],
      warnings: [
        {
          path: "root",
          message: `${dirent.name} at the plugin root is not loaded as project context. ${advice}`,
        },
      ],
      filePath: pathModule.join(pluginDir, sanitizeForDisplay(dirent.name, 64)),
      fileType: "plugin",
    });
  }
  results.push(...(await validateBinaryReferences(pluginDir)));
  let componentDirs = await findComponentDirs(pluginDir);
  results.push(...(await validateComponentDirs(componentDirs.dirs, componentDirs.refused, "plugin")).results);
  results.push(...(await validateAllHooksFiles(pluginDir)));
  results.push(...(await validatePluginMcpFiles(pluginDir, entries)));
  return results.map(sanitizeValidationResult);
}
//@ chunk-bfqsgtvj.js:60710-60995 layout
/**
 * 校验 manifest，可把“无法记录的名字”错误降级为警告。
 */
async function validateManifestForDisplay(filePath, options) {
  let result = sanitizeValidationResult(await validateManifest(filePath));
  if (options?.unrecordableNames !== "warn") return result;
  let filtered = result.errors.filter((error) => error.code !== UNRECORDABLE_NAME_CODE);
  let mapped = result.errors
    .filter((error) => error.code === UNRECORDABLE_NAME_CODE)
    .map(({ path, message }) => ({
      path,
      message,
    }));
  return {
    ...result,
    success: filtered.length === 0,
    errors: filtered,
    warnings: [...mapped, ...result.warnings],
  };
}
//@ chunk-bfqsgtvj.js:60995-62123 fingerprint (2.1.88 match: validateManifest, 0.89)
/**
 * 按路径判断是 plugin.json 还是 marketplace.json（或目录）并调用对应校验。
 */
async function validateManifest(filePath) {
  let absolutePath = pathModule.resolve(filePath);
  let stats = null;
  try {
    stats = await stat(absolutePath);
  } catch (e) {
    if (!isENOENT(e)) throw e;
  }
  if (stats?.isDirectory()) {
    let marketplacePath = pathModule.join(absolutePath, ".claude-plugin", "marketplace.json");
    let marketplaceResult = await validateMarketplaceForDisplay(marketplacePath);
    let firstError = marketplaceResult.errors[0];
    if (!(firstError?.path === "file" && (firstError.code === "ENOENT" || firstError.code === "ENOTDIR")))
      return marketplaceResult;
    let pluginPath = pathModule.join(absolutePath, ".claude-plugin", "plugin.json");
    let pluginResult = await validateHooksJsonForDisplay(pluginPath);
    let code = pluginResult.errors[0]?.code;
    if (code !== "ENOENT" && code !== "ENOTDIR") return pluginResult;
    return {
      success: false,
      errors: [
        {
          path: "directory",
          code: NO_MANIFEST,
          message:
            "No manifest found in directory. Expected .claude-plugin/marketplace.json or .claude-plugin/plugin.json",
        },
      ],
      warnings: [],
      filePath: absolutePath,
      fileType: "plugin",
    };
  }
  switch (detectManifestType(absolutePath)) {
    case "plugin":
      return validateHooksJsonForDisplay(filePath);
    case "marketplace":
      return validateMarketplaceForDisplay(filePath);
    case "unknown": {
      try {
        let content = await readFile(absolutePath, {
          encoding: "utf-8",
        });
        let parsed = jsonParse(stripBom(content));
        if (isPlainObject(parsed)) {
          let keys = Object.keys(parsed);
          let shape = PluginMarketplaceSchema().shape;
          let any = keys.some((key) => Object.hasOwn(shape, key) && !hasManifestFieldSchema(key));
          let any_2 = keys.some((key) => hasManifestFieldSchema(key) && !Object.hasOwn(shape, key));
          if (
            Array.isArray(parsed.plugins) ||
            (Object.hasOwn(parsed, "plugins") && Object.hasOwn(parsed, "owner")) ||
            (any && !any_2)
          )
            return validateMarketplaceForDisplay(filePath);
        }
      } catch (e) {
        if (getErrnoCode(e) === "ENOENT")
          return {
            success: false,
            errors: [
              {
                path: "file",
                message: `File not found: ${absolutePath}`,
              },
            ],
            warnings: [],
            filePath: absolutePath,
            fileType: "plugin",
          };
      }
      return validateHooksJsonForDisplay(filePath);
    }
  }
}
//@ chunk-bfqsgtvj.js:62123-63064 affinity
/**
 * validate 命令入口：没有 manifest 时尝试按“裸技能目录”解析，否则返回 manifest 与插件根目录。
 */
async function resolveValidateTarget(targetPath) {
  let manifestResult = await validateManifestForDisplay(targetPath);
  let filePath = manifestResult.filePath;
  if (manifestResult.errors.some((error) => error.code === NO_MANIFEST)) {
    let contents = await validateComponentDirectorySafe(filePath);
    return contents
      ? {
          manifest: null,
          contents,
          resolvedPath: filePath,
          pluginRoot: null,
        }
      : {
          manifest: manifestResult,
          contents: [],
          resolvedPath: filePath,
          pluginRoot: null,
        };
  }
  let dir = pathModule.dirname(filePath);
  let dir_2 = pathModule.dirname(dir);
  if (pathModule.basename(dir) !== ".claude-plugin")
    return {
      manifest: manifestResult,
      contents: [],
      resolvedPath: filePath,
      pluginRoot: null,
    };
  if (manifestResult.fileType === "plugin") {
    let contents = await checkPluginRootClaudeMd(dir_2);
    return {
      manifest: manifestResult,
      contents,
      resolvedPath: filePath,
      pluginRoot: dir_2,
    };
  }
  if (pathModule.resolve(targetPath) !== dir_2)
    return {
      manifest: manifestResult,
      contents: [],
      resolvedPath: filePath,
      pluginRoot: null,
    };
  let jsonFile = await readJsonFile(filePath);
  let isAnthropicEntry =
    jsonFile !== undefined &&
    isOfficialMarketplaceName(jsonFile.name) &&
    jsonFile.plugins.some((plugin) => isRelativeToRoot(plugin, dir_2, dir_2));
  let pluginManifestResult = await validateHooksJsonForDisplay(pathModule.join(dir, "plugin.json"), {
    kind: isAnthropicEntry ? "anthropic" : "alone",
  });
  if (pluginManifestResult.errors[0]?.code === "ENOENT")
    return {
      manifest: manifestResult,
      contents: [],
      resolvedPath: filePath,
      pluginRoot: null,
    };
  let hasContent =
    pluginManifestResult.errors.length > 0 ||
    pluginManifestResult.warnings.length > 0 ||
    (pluginManifestResult.notes?.length ?? 0) > 0;
  return {
    manifest: manifestResult,
    contents: [...(hasContent ? [pluginManifestResult] : []), ...(await checkPluginRootClaudeMd(dir_2))],
    resolvedPath: filePath,
    pluginRoot: dir_2,
  };
}
//@ chunk-bfqsgtvj.js:63064-63118 affinity
async function safeValidateComponentFiles(filePath) {
  return readSmallFileText(filePath).catch(() => {
    return;
  });
}
//@ chunk-bfqsgtvj.js:63118-63154 sole-consumer
function asPlainObject(value) {
  return isPlainObject(value) ? value : undefined;
}
//@ chunk-bfqsgtvj.js:63154-63204 sole-consumer
function parsePlainObject(text) {
  try {
    return asPlainObject(jsonParse(text));
  } catch {
    return;
  }
}
//@ chunk-bfqsgtvj.js:63204-63725 sole-consumer
/**
 * MCP command 引用的 bin/ 文件须存在或在 binaries 中声明。
 */
function checkBinCommandRefs(servers, shippedBins, declaredBins) {
  let problems = [];
  for (let [key, value] of Object.entries(servers)) {
    let serverConfig = asPlainObject(value);
    if (!serverConfig || typeof serverConfig.command !== "string") continue;
    let binName = serverConfig.command.match(/^\$\{CLAUDE_PLUGIN_ROOT\}\/bin\/([^/\\]+)$/)?.[1];
    if (binName === undefined || shippedBins.has(binName) || declaredBins.has(binName)) continue;
    let serverName = sanitizeForDisplay(key, 64);
    let safeBinName = sanitizeForDisplay(binName, 64);
    problems.push({
      path: `mcpServers.${serverName}`,
      message:
        `bin/${safeBinName} is not a shipped file, a declared binaries entry, or ` +
        "a name derivable from the declared entries \u2014 the server will " +
        'fail to start. Check for a typo against the "binaries" map in plugin.json.',
    });
  }
  return problems;
}
//@ chunk-bfqsgtvj.js:63725-64894 sole-consumer
/**
 * 检查 MCP 配置引用的插件二进制是否存在或可推导。
 */
async function validateBinaryReferences(pluginDir) {
  if (!(await isDirectoryOrFalse(pathModule.join(pluginDir, ".claude-plugin")))) return [];
  let filePath = pathModule.join(pluginDir, ".claude-plugin", "plugin.json");
  let manifestText = await safeValidateComponentFiles(filePath);
  if (manifestText === undefined) return [];
  let plainObject = parsePlainObject(stripBom(manifestText));
  let pluginBinaries = parsePluginBinaries(plainObject?.binaries);
  if (!plainObject || !pluginBinaries) return [];
  let knownBins = new Set(Object.keys(pluginBinaries));
  for (let target of PLATFORM_TARGETS) {
    let baseNameCounts = new Map();
    for (let key of Object.keys(pluginBinaries)) {
      let baseName = binaryBaseNameForTarget(key, target);
      if (baseName !== undefined) baseNameCounts.set(baseName, (baseNameCounts.get(baseName) ?? 0) + 1);
    }
    for (let [baseName, count] of baseNameCounts) if (count === 1) knownBins.add(baseName);
  }
  let joined = pathModule.join(pluginDir, "bin");
  let shippedBins = new Set();
  if (await isDirectoryOrFalse(joined))
    shippedBins = await readdir(joined)
      .then((entries) => new Set(entries))
      .catch(() => new Set());
  let results = [];
  function pushResult(filePath, warnings) {
    if (warnings.length > 0)
      results.push({
        success: true,
        errors: [],
        warnings,
        filePath,
        fileType: "plugin",
      });
  }
  let filePath_2 = pathModule.join(pluginDir, ".mcp.json");
  let mcpText = await safeValidateComponentFiles(filePath_2);
  if (mcpText !== undefined) {
    let plainObject = parsePlainObject(mcpText);
    if (plainObject) {
      let servers = asPlainObject(plainObject.mcpServers || plainObject);
      if (servers) pushResult(filePath_2, checkBinCommandRefs(servers, shippedBins, knownBins));
    }
  }
  let mcpServers = plainObject.mcpServers;
  let mcpSpecs = mcpServers === undefined ? [] : Array.isArray(mcpServers) ? mcpServers : [mcpServers];
  let remainingProblems = [];
  let remainingBudget = MAX_MCP_SERVER_FILES;
  for (let spec of mcpSpecs) {
    if (typeof spec === "string" && remainingBudget <= 0) continue;
    if (typeof spec === "string") {
      remainingBudget--;
      if (!spec.startsWith("./") || isAbsoluteOrUnsafePath(spec)) continue;
      let joined = pathModule.join(pluginDir, spec);
      if ((await readPluginFileSafe(pluginDir, pathModule.dirname(joined))) !== "ok") continue;
      let mcpText = await safeValidateComponentFiles(joined);
      if (mcpText === undefined) continue;
      let plainObject = parsePlainObject(mcpText);
      if (!plainObject) continue;
      let servers = asPlainObject(plainObject.mcpServers || plainObject);
      if (servers)
        pushResult(
          pathModule.join(pluginDir, sanitizeForDisplay(spec, 128)),
          checkBinCommandRefs(servers, shippedBins, knownBins),
        );
      continue;
    }
    let serverConfig = asPlainObject(spec);
    if (serverConfig) remainingProblems.push(...checkBinCommandRefs(serverConfig, shippedBins, knownBins));
  }
  pushResult(filePath, remainingProblems);
  return results;
}
export {
  MARKETPLACE_ONLY_MANIFEST_FIELDS,
  resolveValidateTarget,
  sanitizeForDisplay,
  summarizeValidationResults,
  validateManifestForDisplay,
  PLUGIN_ID_PART_RULE_TEXT,
  PRIVACY_POLICY_KEYS,
  SUPPORT_URL_KEYS,
  TERMS_URL_KEYS,
  DOCUMENTATION_URL_KEYS,
  NO_MANIFEST,
  validateHooksJsonForDisplay,
  checkPluginRootClaudeMd,
  readJsonFile,
  matchesDirEntry,
  isSameResolvedPath,
};
