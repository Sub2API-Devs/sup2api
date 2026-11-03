/**
 * utils/plugins/validatePlugin.ts
 *
 * 并入已有模块：插件校验，增加 contract 加载与写入检查、manifest 字段问题。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/validatePlugin.ts
 * pieces: chunk-6j594vm1.js (1), chunk-85kmkm1x.js (73)
 * attribution: fingerprint 11, placement 15, layout 41, callgraph-fingerprint 1, affinity 2, sole-consumer 4
 */
import * as pathModule from "path";
import { resolve, relative, isAbsolute, sep } from "path";
import { readFile, stat, readdir, lstat } from "fs/promises";
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
import { string, array, u, preprocess, record } from "../../../vendor/zod/v4/classic/schemas.js";
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
  mcpAuthCacheContent,
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
import { uniq, count } from "../collections.js";
import { logForDebugging } from "../debug.js";
import { hasToolSite } from "../../plugins/functionHooks/sites/siteRules.js";
import { adviseUiRenderMatcher } from "../../plugins/functionHooks/sites/uiSites.js";
import { loadSurfaceModules } from "../../plugins/functionHooks/hooksModuleLoader.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { unaddableTransportReason } from "../../services/mcp/config.js";
import { PLATFORM_TARGETS, binaryBaseNameForTarget } from "../platformTargets.js";
import {
  permissionPromptResultSchemaCutting,
  permissionPromptResultSchemaRefusing,
} from "../permissions/PermissionPromptToolResultSchema.js";

//@ chunk-85kmkm1x.js:10112-10629 placement
async function loadPluginContract(e, n, s) {
  let r = e ?? TYPES_ENTRY;
  let a = resolve(n, r);
  let i = relative(n, a);
  if (i.startsWith("..") || isAbsolute(i)) return refusedContract(`${r} leaves the plugin's folder`);
  let c = (error) => refusedContract(`${r}: ${describeTypeEntryProblem(s, a, error)}`);
  let m = await checkInsidePluginRoot(a, n, s).then(
    (x) => x,
    (error) => (e === undefined && isRealPathWithinTeamDir_2(error) ? undefined : c(error)),
  );
  if (m === undefined || "kind" in m) return m;
  if (m.size > MAX_TSCONFIG_BYTES)
    return refusedContract(`${r} is over ${MAX_TSCONFIG_BYTES} bytes and was not read`);
  let h = await readTypeFileCapped(m.real).then((typeFileCapped) => typeFileCapped, c);
  if (typeof h !== "string") return h;
  let { problems, nouns, state } = validatePluginContract(h);
  return problems.length === 0
    ? {
        kind: "read",
        text: h,
        nouns,
        state,
      }
    : refusedContract(...problems);
}
//@ chunk-85kmkm1x.js:10629-11512 placement
function checkContractWrites({ names, owner, declared, others, contract, refusal }) {
  let l = new Map();
  for (let { plugin, keys } of [...declared, ...(others ?? [])]) {
    let h = l.get(plugin) ?? new Set();
    keys.forEach((key) => h.add(key));
    l.set(plugin, h);
  }
  let c = [];
  let m = new Set();
  for (let { plugin, key } of names.writes)
    if (plugin !== owner)
      c.push(
        `$.state.set refers to ${stateAtomKey({
          plugin,
          key,
        })}, which ${plugin} owns: only a value's owner writes it (to change what is written, hook ${plugin}'s state.set and rewrite e.value)`,
      );
  for (let { plugin, key } of [...names.reads, ...names.writes]) {
    let h = plugin === owner;
    let v = h || others !== undefined;
    let b = stateAtomKey({
      plugin,
      key,
    });
    if (!v) {
      m.add(b);
      continue;
    }
    let C = l.get(plugin)?.has(key) === true;
    let S = h ? (contract ?? "the manifest's types contract") : "no enabled plugin's contract";
    let x = refusal ?? `${S} must name it in interface PluginState { ${plugin}: { ${key}: ... } }`;
    let f = h ? `${b} is not declared: ${x}` : `${b} is not declared: ${S} names it in PluginState`;
    if (!C && !c.includes(f)) c.push(f);
  }
  return {
    problems: c,
    unchecked: [...m],
  };
}
//@ chunk-85kmkm1x.js:11512-12082 placement
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
    missingConsequence: (e) =>
      e.endsWith(".json")
        ? "The plugin loader skips a missing MCP servers file without reporting it, so none of its servers will load."
        : undefined,
  },
];
//@ chunk-85kmkm1x.js:12082-12767 placement
/**
 * 按组件规格遍历 manifest（monitors/themes 可来自 experimental）：数组逐项、对象按 recordPathProperty、其余整体， 收集字符串路径（允许 URL 的组件跳过 URL），返回 {spec, field, relPath}。
 */
function collectComponentPathFields(rawCandidate) {
  let experimental = isPlainObject(rawCandidate.experimental) ? rawCandidate.experimental : undefined;
  let s = [];
  for (let r of COMPONENT_PATH_SPECS) {
    let a = rawCandidate[r.key];
    let key = r.key;
    let l =
      experimental !== undefined &&
      EXPERIMENTAL_COMPONENT_KEYS.includes(r.key) &&
      Object.hasOwn(experimental, r.key)
        ? experimental[r.key]
        : undefined;
    if (l != null) {
      a = l;
      key = `experimental.${r.key}`;
    }
    let c = [];
    if (r.bareStringOnly) c.push([key, a]);
    else if (Array.isArray(a)) for (let [m, p] of a.entries()) c.push([`${key}[${m}]`, p]);
    else if (!isPlainObject(a)) c.push([r.bareStringIndexed ? `${key}[0]` : key, a]);
    else if (r.recordPathProperty !== undefined) {
      for (let [key_2, value] of Object.entries(a))
        if (isPlainObject(value))
          c.push([`${key}.${key_2}.${r.recordPathProperty}`, value[r.recordPathProperty]]);
    }
    for (let [m, p] of c)
      if (typeof p === "string" && !(r.acceptsUrl && /^[a-z][a-z0-9+.-]*:\/\//i.test(p)))
        s.push({
          spec: r,
          field: m,
          relPath: p,
        });
  }
  return s;
}
//@ chunk-85kmkm1x.js:12767-13022 placement
/**
 * 上架信息里各类链接字段的键名。
 */
var PRIVACY_POLICY_KEYS = ["privacyPolicyUrl", "privacy_policy", "privacyPolicy"];
var SUPPORT_URL_KEYS = ["supportUrl", "support", "bugs"];
var TERMS_URL_KEYS = ["termsOfServiceUrl", "terms_of_service"];
var DOCUMENTATION_URL_KEYS = ["documentationUrl", "docs"];
var LISTING_FIELD_KEYS = new Set([
  "icon",
  "screenshots",
  "classification",
  ...PRIVACY_POLICY_KEYS,
  ...SUPPORT_URL_KEYS,
  ...TERMS_URL_KEYS,
  ...DOCUMENTATION_URL_KEYS,
]);
//@ chunk-85kmkm1x.js:13022-13094 placement
var PLUGIN_ENV_VARS = ["CLAUDE_PLUGIN_ROOT", "CLAUDE_PLUGIN_DATA", "CLAUDE_PROJECT_DIR"];
//@ chunk-85kmkm1x.js:13094-13358 placement
function findUnquotedHookPlaceholders(e) {
  let n = [];
  for (let [key, value] of Object.entries(e))
    for (let a of value ?? [])
      for (let hook of a.hooks) {
        if (hook.type !== "command" || hook.args !== undefined || hook.shell === "powershell") continue;
        let unquotedPlaceholders = findUnquotedPlaceholders(hook.command);
        if (unquotedPlaceholders.length > 0)
          n.push({
            event: key,
            command: hook.command,
            placeholders: unquotedPlaceholders,
          });
      }
  return n;
}
//@ chunk-85kmkm1x.js:13358-13718 placement
/**
 * 扫描命令中不在引号内的 $VAR/${VAR} 插件变量。
 */
function findUnquotedPlaceholders(command) {
  let n = new Set();
  let s = false;
  let r = false;
  for (let j = 0; j < command.length; j++) {
    let i = command[j];
    if (!s && i === "\\") {
      j++;
      continue;
    }
    if (i === "'" && !r) {
      s = !s;
      continue;
    }
    if (i === '"' && !s) {
      r = !r;
      continue;
    }
    if (i !== "$" || s || r) continue;
    for (let l of PLUGIN_ENV_VARS) {
      let c = command.startsWith(`{${l}}`, j + 1);
      let m = command.startsWith(l, j + 1) && !/[A-Za-z0-9_]/.test(command.charAt(j + 1 + l.length));
      if (c || m) {
        n.add(`\${${l}}`);
        break;
      }
    }
  }
  return [...n];
}
//@ chunk-85kmkm1x.js:13810-13861 placement
var stripTrailingSep = (e) => (e.endsWith(sep) ? e.slice(0, -sep.length) : e);
//@ chunk-85kmkm1x.js:13861-13898 placement
/**
 * isSameResolvedPath：解析后路径相同。
 */
var isSameResolvedPath = (e, n) => stripTrailingSep(resolve(e)) === stripTrailingSep(resolve(n));
//@ chunk-85kmkm1x.js:13898-13976 placement
function isRelativeToRoot(e, n, s) {
  let { source } = e;
  return typeof source === "string" && isSameResolvedPath(resolve(n, source), s);
}
//@ chunk-85kmkm1x.js:13976-14061 placement
/**
 * matchesDirEntry：目录条目按 source 或名字匹配。
 */
function matchesDirEntry(e, n, s) {
  return typeof e.source === "string" ? isRelativeToRoot(e, n, s.root) : e.name === s.name;
}
//@ chunk-85kmkm1x.js:14101-14234 placement = readJsonFile (1)
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
//@ chunk-85kmkm1x.js:14234-15854 placement
/**
 * 市场条目额外允许的键与其他工具 manifest 字段提示。
 */
var MARKETPLACE_ENTRY_EXTRA_KEYS = new Set([
  "category",
  "source",
  "tags",
  "strict",
  "id",
  "relevance",
  "headers",
  "headersHelper",
]);
var FOREIGN_MANIFEST_FIELDS = new Map([
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
var FOREIGN_MANIFEST_HINT = new Map([["user_config", "userConfig"]]);
var MANIFEST_FIELD_HINTS = new Set(["themes", "monitors", "outputStyles", "evals", "syntaxHighlighting"]);
var MANIFEST_FIELD_HINT_SET = new Set(WORKER_ONLY_SKILL_NAMES.map(foldName));
//@ chunk-85kmkm1x.js:15854-15998 placement
function summarizeValidationResults(e, n) {
  let all = e.every((a) => a.success);
  let any = e.some((a) => a.warnings.length > 0);
  return {
    noErrors: all,
    hasWarnings: any,
    allSuccess: n.strict ? all && !any : all,
  };
}
//@ chunk-85kmkm1x.js:15998-16069 layout = getReceivedType (0.776)
function getReceivedType(value) {
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}
//@ chunk-85kmkm1x.js:16069-16268 fingerprint = detectManifestType (1)
function detectManifestType(filePath) {
  let fileName = pathModule.basename(filePath);
  let dirName = pathModule.basename(pathModule.dirname(filePath));
  if (fileName === "plugin.json") return "plugin";
  if (fileName === "marketplace.json") return "marketplace";
  if (dirName === ".claude-plugin") return "plugin";
  return "unknown";
}
//@ chunk-85kmkm1x.js:16268-16373 fingerprint = formatZodErrors (1)
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
//@ chunk-85kmkm1x.js:16373-16589 layout
function suggestSimilarField(e, n) {
  if (FOREIGN_MANIFEST_FIELDS.has(e)) return;
  let s = e.length <= 3 ? 1 : 2;
  let lower = e.toLowerCase();
  let a;
  let i = s + 1;
  for (let l of n) {
    if (Math.abs(l.length - e.length) > s) continue;
    if (l.toLowerCase() === lower) return l;
    let c = boundedEditDistance(e, l, s);
    if (c < i) {
      i = c;
      a = l;
    }
  }
  return a;
}
//@ chunk-85kmkm1x.js:16589-17454 layout
function unknownFieldMessage(e, n, s) {
  if (s?.has(e))
    return (
      `Field '${e}' belongs in the marketplace entry (marketplace.json), ` +
      "not plugin.json. It's harmless here but unused \u2014 Claude Code " +
      "ignores it at load time."
    );
  let r = suggestSimilarField(e, n);
  if (r)
    return `Unknown field '${e}' \u2014 did you mean '${r}'? Claude Code ignores unrecognized fields at load time, so this field has no effect.`;
  let a = FOREIGN_MANIFEST_HINT.get(e);
  if (a && n.has(a))
    return (
      `Field '${e}' is the cross-tool spelling of Claude Code's '${a}'. Rename it to '${a}' for Claude Code to read it (the option ` +
      "shapes differ slightly \u2014 re-run validate after renaming to check). " +
      "As-is, Claude Code ignores it at load time."
    );
  let i = FOREIGN_MANIFEST_FIELDS.get(e);
  if (i)
    return `Unknown field '${e}' (commonly seen in ${i}). Claude Code ignores unrecognized fields at load time, so it's safe to keep.`;
  return `Unknown field '${e}'. Claude Code ignores it at load time.`;
}
//@ chunk-85kmkm1x.js:17454-17589 layout
function reportUnknownFields(e, n, s, r, a, i) {
  for (let key of Object.keys(e)) {
    if (n.has(key) || i?.has(key)) continue;
    r.push({
      path: s ? `${s}.${key}` : key,
      message: unknownFieldMessage(key, n, a),
    });
  }
}
//@ chunk-85kmkm1x.js:17589-17658 layout
/**
 * 路径（去盘符后）是否为绝对或含危险段。
 */
function isAbsoluteOrUnsafePath(e) {
  let replaced = e.replace(/^[a-zA-Z]:/, "");
  return hasDotDotSegment(replaced) || hasDotDotWithSpaceSegment(replaced);
}
//@ chunk-85kmkm1x.js:17658-17815 fingerprint = checkPathTraversal (1)
function checkPathTraversal(p, field, errors, hint) {
  if (isAbsoluteOrUnsafePath(p))
    errors.push({
      path: field,
      message: hint
        ? `Path contains "..": ${p}. ${hint}`
        : `Path contains ".." which could be a path traversal attempt: ${p}`,
    });
}
//@ chunk-85kmkm1x.js:17815-18080 fingerprint = marketplaceSourceHint (0.667)
function marketplaceSourceHint(p) {
  let stripped = p.replace(/^(\.\.\/)+/, "");
  return `Plugin source paths are resolved relative to the marketplace root (the directory containing .claude-plugin/), not relative to marketplace.json. Use "${stripped !== p ? `./${stripped}` : "./plugins/my-plugin"}" instead of "${p}".`;
}
//@ chunk-85kmkm1x.js:18080-18144 layout
/**
 * 校验单个 hooks.json 并整理结果。
 */
async function validateHooksJsonForDisplay(
  e,
  n = {
    kind: "alone",
  },
) {
  return sanitizeValidationResult(await validateHooksJson(e, n));
}
//@ chunk-85kmkm1x.js:18144-18493 fingerprint = validateHooksJson (0.561)
async function validateHooksJson(e, n) {
  let resolved = pathModule.resolve(e);
  let r;
  try {
    r = await readFile(resolved, {
      encoding: "utf-8",
    });
  } catch (error) {
    let code = getErrnoCode(error);
    let l;
    if (code === "ENOENT") l = `File not found: ${resolved}`;
    else if (code === "EISDIR") l = `Path is not a file: ${resolved}`;
    else l = `Failed to read file: ${errorMessage(error)}`;
    return {
      success: false,
      errors: [
        {
          path: "file",
          message: l,
          code,
        },
      ],
      warnings: [],
      filePath: resolved,
      fileType: "plugin",
    };
  }
  return validatePluginManifest(resolved, r, n);
}
//@ chunk-85kmkm1x.js:18493-23893 callgraph-fingerprint = validatePluginManifest (0.251)
/**
 * claude plugin validate：校验 plugin.json（JSON 语法、schema、名字、marketplace-only 字段警告、组件路径存在性），返回 errors/warnings。
 */
async function validatePluginManifest(e, n, s) {
  let errors = [];
  let a = [];
  let i = [];
  let l;
  try {
    l = jsonParse(stripBom(n));
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
      filePath: e,
      fileType: "plugin",
    };
  }
  let c = validatePluginManifest_2(l, "plugin-json", {
    pluginName: pathModule.basename(pathModule.dirname(pathModule.dirname(e))),
    manifestPath: e,
  });
  if (!c.ok)
    errors.push(
      ...c.errors.map((error) => ({
        ...error,
        path: error.path || "root",
      })),
    );
  else
    a.push(
      ...c.hookNotes.map((hookNote) => ({
        path: "hooks",
        message: `${hookNote} at runtime`,
      })),
    );
  if (l && typeof l === "object") {
    let rawCandidate = c.rawCandidate ?? l;
    let dir = pathModule.dirname(e);
    let h = pathModule.basename(dir) === ".claude-plugin" ? pathModule.dirname(dir) : dir;
    let v = async (relPath, field, S = "The runtime loader will report this as a load failure.") => {
      checkPathTraversal(relPath, field, errors);
      if (isAbsoluteOrUnsafePath(relPath) || pathModule.isAbsolute(relPath) || /^[a-zA-Z]:/.test(relPath))
        return;
      try {
        return await stat(pathModule.resolve(h, relPath));
      } catch (error) {
        let code = getErrnoCode(error);
        errors.push({
          path: field,
          message: `Path not found: ${relPath}${code && code !== "ENOENT" ? ` (${code})` : ""}. ${S}`,
        });
        return;
      }
    };
    for (let { spec, field, relPath } of collectComponentPathFields(rawCandidate)) {
      let x = await v(relPath, field, spec.missingConsequence?.(relPath));
      if (x === undefined) continue;
      if (spec.key === "skills" && !x.isDirectory()) {
        let dir = pathModule.dirname(relPath);
        let T =
          pathModule.basename(relPath).toLowerCase() === "skill.md"
            ? dir === "."
              ? " \u2014 point to the plugin root '.' instead"
              : ` \u2014 point to the parent directory '${dir}' instead`
            : "";
        errors.push({
          path: field,
          message: `Path is a file; skills entries must be directories containing SKILL.md${T}: ${relPath}`,
        });
      }
      if (spec.jsonFile && relPath.endsWith(".json") && x.isDirectory())
        errors.push({
          path: field,
          message: `Path is a directory; ${spec.key} must point to a JSON file: ${relPath}`,
        });
      if (spec.key === "types") {
        let f = contractCheckResult(await loadPluginContract(relPath, h, pathModule.basename(h)), {
          relPath,
          field,
        });
        errors.push(...f.errors);
        i.push(...f.notes);
      }
    }
    if (rawCandidate.types === undefined) {
      let pluginContract = await loadPluginContract(undefined, h, pathModule.basename(h));
      if (pluginContract?.kind === "read")
        i.push(
          ...contractCheckResult(pluginContract, {
            relPath: TYPES_ENTRY,
            field: "types",
          }).notes,
        );
    }
    if (rawCandidate.mcpServers !== undefined) {
      let b = Array.isArray(rawCandidate.mcpServers) ? rawCandidate.mcpServers : [rawCandidate.mcpServers];
      let C;
      for (let [S, x] of b.entries()) {
        let f = Array.isArray(rawCandidate.mcpServers) ? `mcpServers[${S}]` : "mcpServers";
        if (isPlainObject(x)) {
          C ??= await userConfigKeyLookup(rawCandidate, e);
          for (let [key, value] of Object.entries(x)) {
            let R = checkMcpUserConfigRefs(`${f}.${sanitizeForDisplay(key, 64)}`, value, C(key));
            errors.push(...R.errors);
            a.push(...R.warnings);
          }
        }
      }
    }
  }
  if (isPlainObject(l)) {
    let p = l;
    let rawCandidate = c.rawCandidate ?? p;
    reportUnknownFields(
      rawCandidate,
      new Set(Object.keys(PluginManifestSchema().shape)),
      "",
      a,
      MARKETPLACE_ENTRY_EXTRA_KEYS,
      LISTING_FIELD_KEYS,
    );
    if ("capabilities" in rawCandidate) {
      let index = a.findIndex((b) => b.path === "capabilities");
      let v = {
        path: "capabilities",
        message:
          "'capabilities' is no longer read: what a hooks module hooks and calls on $ is read from its source and listed under its hooks.json below. Delete the field.",
      };
      if (index === -1) a.push(v);
      else a[index] = v;
    }
    for (let key of EXPERIMENTAL_COMPONENT_KEYS)
      if (key in p)
        a.push({
          path: key,
          message: `'${key}' is an experimental component; declare it under 'experimental.${key}' instead of at the top level. Top-level still loads for now but will be removed in a future release.`,
        });
    if ("experimental" in p)
      if (isPlainObject(p.experimental)) {
        let experimental = p.experimental;
        reportUnknownFields(experimental, MANIFEST_FIELD_HINTS, "experimental", a);
      } else
        a.push({
          path: "experimental",
          message: `'experimental' must be an object containing component declarations; got ${getReceivedType(p.experimental)}. It will be ignored at load time.`,
        });
    if ("metadata" in rawCandidate && !isPlainObject(rawCandidate.metadata))
      a.push({
        path: "metadata",
        message: `'metadata' must be a free-form object; got ${getReceivedType(rawCandidate.metadata)}. It will be ignored at load time.`,
      });
    if ("binaries" in p)
      if (isPlainObject(p.binaries)) {
        let h = parsePluginBinaries(p.binaries) ?? {};
        let v = 0;
        for (let [key, value] of Object.entries(p.binaries)) {
          if (
            BINARY_BASENAME_RE.test(key) &&
            typeof value === "object" &&
            value !== null &&
            typeof value.sha256 === "string" &&
            SHA256_HEX_RE.test(value.sha256)
          ) {
            v++;
            continue;
          }
          if (!Object.hasOwn(h, key))
            a.push({
              path: `binaries.${key}`,
              message: `Invalid binaries entry; it will be ignored at install time. The basename must match ${String(BINARY_BASENAME_RE)} (lowercase, no leading or trailing dot) and the value must be an object with a 64-character lowercase-hex 'sha256'.`,
            });
        }
        if (v > MAX_PLUGIN_BINARIES)
          a.push({
            path: "binaries",
            message: `${v} valid binaries entries declared, but the install hook processes at most ${MAX_PLUGIN_BINARIES}; the rest are dropped entirely.`,
          });
        let b = Object.keys(h).length;
        if (b > BINARY_FETCH_CONCURRENCY)
          a.push({
            path: "binaries",
            message: `${b} valid binaries entries declared, but only the first ${BINARY_FETCH_CONCURRENCY} are fetched at install time; the rest are ignored. Reduce the count or split across plugins.`,
          });
      } else
        a.push({
          path: "binaries",
          message: `'binaries' must be an object mapping basenames to { sha256 }; got ${getReceivedType(p.binaries)}. It will be ignored at install time.`,
        });
  }
  let manifest = c.manifest;
  if (manifest) {
    let p = manifest;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.name)) {
      let v = "Claude Code accepts it, but the";
      if (PLUGIN_NAME_FORBIDDEN_CHARS_RE.test(p.name))
        v =
          "Claude Code refuses a plugin with this name when it is loaded by path (such as --plugin-dir), and cannot install it from a marketplace that lists it under this name. The";
      else if (!isValidPluginIdSegment(p.name))
        v = "Claude Code cannot install it from a marketplace that lists it under this name, and the";
      a.push({
        path: "name",
        message:
          `Plugin name "${p.name}" is not kebab-case. ${v} Claude.ai marketplace sync requires kebab-case (lowercase letters, digits, and hyphens only, e.g., "my-plugin").` +
          hiddenCharacterNote(p.name),
      });
    }
    let h =
      s.kind === "alone" || (s.kind === "entry" && s.entryName !== p.name)
        ? checkReservedPluginName(p.name)
        : undefined;
    if (h)
      (h.severity === "error" ? errors : a).push({
        path: "name",
        message: s.kind === "alone" ? `${h.message} ${OFFICIAL_PLUGIN_HINT}` : h.message,
      });
    if (!p.version)
      a.push({
        path: "version",
        message: 'No version specified. Consider adding a version following semver (e.g., "1.0.0")',
      });
    if (!p.description)
      a.push({
        path: "description",
        message: "No description provided. Adding a description helps users understand what your plugin does",
      });
    if (!p.author)
      a.push({
        path: "author",
        message: "No author information provided. Consider adding author details for plugin attribution",
      });
  }
  return {
    success: errors.length === 0,
    errors,
    warnings: a,
    filePath: e,
    fileType: "plugin",
    ...(i.length > 0 && {
      notes: i,
    }),
  };
}
//@ chunk-85kmkm1x.js:23893-24163 layout
var RECORDABLE_NAME_RE_2 = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
var RECORDABLE_NAME_RE = new Set(["org", "org-provisioned", "unknown"]);
var UNRECORDABLE_NAME = "UNRECORDABLE_NAME";
var PLUGIN_ID_PART_RULE =
  'Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit.';
//@ chunk-85kmkm1x.js:24163-24261 layout
function hiddenCharacterNote(name) {
  return sanitizeForDisplay(name, name.length) === name
    ? ""
    : " The name holds a character that is not shown here.";
}
//@ chunk-85kmkm1x.js:24261-24305 layout
async function validateMarketplaceForDisplay(filePath) {
  return sanitizeValidationResult(await validateMarketplaceManifest(filePath));
}
//@ chunk-85kmkm1x.js:24305-34228 fingerprint = validateMarketplaceManifest (0.392)
/**
 * 校验 marketplace.json：schema、保留名、每个插件条目来源与路径、重复名字等。
 */
async function validateMarketplaceManifest(filePath) {
  let errors = [];
  let s = [];
  let absolutePath = pathModule.resolve(filePath);
  let a;
  try {
    a = await readFile(absolutePath, {
      encoding: "utf-8",
    });
  } catch (error) {
    let code = getErrnoCode(error);
    let w;
    if (code === "ENOENT") w = `File not found: ${absolutePath}`;
    else if (code === "EISDIR") w = `Path is not a file: ${absolutePath}`;
    else w = `Failed to read file: ${errorMessage(error)}`;
    return {
      success: false,
      errors: [
        {
          path: "file",
          message: w,
          code,
        },
      ],
      warnings: [],
      filePath: absolutePath,
      fileType: "marketplace",
    };
  }
  let i;
  try {
    i = jsonParse(stripBom(a));
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
  let l = [];
  let pluginRoot = isPlainObject(i) && isPlainObject(i.metadata) ? i.metadata.pluginRoot : undefined;
  let m = normalizePluginRoot(pluginRoot);
  let p = isPlainObject(i) && typeof i.name === "string" && isOfficialMarketplaceName(i.name);
  if (i && typeof i === "object") {
    let f = i;
    if (Array.isArray(f.plugins)) {
      l = f.plugins;
      f.plugins.forEach((plugin, i) => {
        if (plugin && typeof plugin === "object" && "source" in plugin) {
          let source = plugin.source;
          if (typeof source === "string")
            checkPathTraversal(source, `plugins[${i}].source`, errors, marketplaceSourceHint(source));
          if (isBareSourceName(source) && m === undefined)
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
  let y = PluginRelevanceSchema()
    .extend({
      topic: string().min(1).max(64).optional(),
      signals: PluginRelevanceSignalsSchema()
        .extend({
          cli: array(string().min(1).max(64)).max(10).optional(),
          hosts: array(
            string()
              .min(1)
              .max(128)
              .refine(
                (f) => /^[a-z0-9.-]+$/.test(f),
                "must be a lowercase bare hostname (no scheme, port, or path)",
              ),
          )
            .max(20)
            .optional(),
          filesRead: array(
            string()
              .min(1)
              .max(256)
              .refine((f) => !f.includes("\\"), 'must use forward slashes (e.g. "**/*.tf"), not backslashes'),
          )
            .max(10)
            .optional(),
          manifestDeps: array(
            u({
              file: string().min(1).max(256).refine(isValidRegex, "must be a valid regular expression"),
              pattern: string().min(1).max(256).refine(isValidRegex, "must be a valid regular expression"),
            }),
          )
            .min(1)
            .max(10)
            .optional(),
          cwd: array(
            string()
              .min(1)
              .max(256)
              .refine(
                (f) => !f.includes("\\"),
                'must use forward slashes (e.g. "Engine/Source/**"), not backslashes',
              ),
          )
            .max(10)
            .optional(),
        })
        .refine(
          (f) =>
            (f.cli?.length ?? 0) > 0 ||
            (f.hosts?.length ?? 0) > 0 ||
            (f.filesRead?.length ?? 0) > 0 ||
            (f.manifestDeps?.length ?? 0) > 0 ||
            (f.cwd?.length ?? 0) > 0,
          "must declare at least one signal (cli, hosts, filesRead, manifestDeps, or cwd)",
        ),
    })
    .optional();
  let h = PluginMarketplaceEntrySchema()
    .extend({
      relevance: preprocess((f) => (isPlainObject(f) ? f : undefined), y),
    })
    .refine((f) => typeof f.source === "string" || f.source.source !== "unsupported", {
      message: "source.source: 'unsupported' is a parse-time placeholder and cannot be authored",
    });
  let result = PluginMarketplaceSchema()
    .extend({
      plugins: array(h),
      renames: record(string(), string().nullable()).optional(),
    })
    .safeParse(applyMarketplacePluginRoot(i));
  if (!result.success) errors.push(...formatZodErrors(result.error));
  if (result.success && result.data.renames) {
    let f = new Set(result.data.plugins.map((plugin) => plugin.name));
    for (let key of Object.keys(result.data.renames)) {
      let pluginRename = resolvePluginRename(key, result.data.renames, f);
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
  if (isPlainObject(i)) {
    let f = i;
    reportUnknownFields(f, new Set(Object.keys(PluginMarketplaceSchema().shape)), "", s);
    if (typeof f.name === "string" && f.name) {
      let w = isValidPluginIdSegment(f.name);
      if (!w)
        errors.push({
          path: "name",
          code: UNRECORDABLE_NAME,
          message:
            `Claude Code cannot install plugins from marketplace "${sanitizeForDisplay(f.name, 64)}". ${PLUGIN_ID_PART_RULE} Change the marketplace's "name".` +
            hiddenCharacterNote(f.name),
        });
      if (RECORDABLE_NAME_RE.has(f.name.toLowerCase()))
        s.push({
          path: "name",
          message: `Marketplace name "${f.name}" is reserved in Claude Desktop. Claude Code accepts it, but the Claude Desktop managed marketplace sync (allowedPluginMarketplaces) will reject the whole marketplace.`,
        });
      else if (!RECORDABLE_NAME_RE_2.test(f.name))
        s.push({
          path: "name",
          message:
            `Marketplace name "${f.name}" is not accepted by Claude Desktop (letters, digits, ".", "_", "-"; must start alphanumeric; max 128 chars). ` +
            (w ? "Claude Code accepts it, but the " : "The ") +
            "Claude Desktop managed marketplace sync (allowedPluginMarketplaces) will reject the whole marketplace." +
            hiddenCharacterNote(f.name),
        });
    }
    let metadata = f.metadata;
    if (isPlainObject(metadata))
      reportUnknownFields(
        metadata,
        new Set(Object.keys(PluginMarketplaceSchema().shape.metadata.unwrap().shape)),
        "metadata",
        s,
      );
    if (Array.isArray(f.plugins)) {
      let w = new Set(Object.keys(PluginMarketplaceEntrySchema().shape));
      let R = new Set(Object.keys(PluginRelevanceSchema().shape));
      let j = new Set(Object.keys(PluginRelevanceSignalsSchema().shape));
      f.plugins.forEach((plugin, _) => {
        if (!isPlainObject(plugin)) return;
        let M = plugin;
        reportUnknownFields(M, w, `plugins[${_}]`, s);
        if (typeof M.name === "string" && M.name) {
          let U = isValidPluginIdSegment(M.name);
          if (!U)
            errors.push({
              path: `plugins[${_}].name`,
              code: UNRECORDABLE_NAME,
              message:
                `Claude Code cannot install plugin "${sanitizeForDisplay(M.name, 64)}". ${PLUGIN_ID_PART_RULE} Change this entry's "name".` +
                hiddenCharacterNote(M.name),
            });
          if (!RECORDABLE_NAME_RE_2.test(M.name))
            s.push({
              path: `plugins[${_}].name`,
              message:
                `Plugin name "${M.name}" is not accepted by Claude Desktop (letters, digits, ".", "_", "-"; must start alphanumeric; max 128 chars). ` +
                (U ? "Claude Code accepts it, but the " : "The ") +
                "Claude Desktop managed marketplace sync (allowedPluginMarketplaces) will drop this entry." +
                hiddenCharacterNote(M.name),
            });
          let X = p ? undefined : checkReservedPluginName(M.name);
          if (X)
            (X.severity === "error" ? errors : s).push({
              path: `plugins[${_}].name`,
              message: X.message,
            });
        }
        let experimental = M.experimental;
        if (isPlainObject(experimental))
          reportUnknownFields(experimental, MANIFEST_FIELD_HINTS, `plugins[${_}].experimental`, s);
        else if (experimental !== undefined)
          s.push({
            path: `plugins[${_}].experimental`,
            message: `'experimental' must be an object containing component declarations; got ${getReceivedType(experimental)}. It will be ignored at load time.`,
          });
        let relevance = M.relevance;
        if (isPlainObject(relevance)) {
          reportUnknownFields(relevance, R, `plugins[${_}].relevance`, s);
          let signals = relevance.signals;
          if (isPlainObject(signals)) reportUnknownFields(signals, j, `plugins[${_}].relevance.signals`, s);
        } else if (relevance !== undefined)
          s.push({
            path: `plugins[${_}].relevance`,
            message: `'relevance' must be an object containing topic and signals; got ${getReceivedType(relevance)}. It will be ignored at load time.`,
          });
        let metadata = M.metadata;
        if (metadata !== undefined && !isPlainObject(metadata))
          s.push({
            path: `plugins[${_}].metadata`,
            message: `'metadata' must be a free-form object; got ${getReceivedType(metadata)}. It will be ignored at load time.`,
          });
      });
    }
  }
  if (result.success) {
    let marketplace = result.data;
    if (!marketplace.plugins || marketplace.plugins.length === 0)
      s.push({
        path: "plugins",
        message: "Marketplace has no plugins defined",
      });
    if (marketplace.plugins)
      marketplace.plugins.forEach((plugin, w) => {
        if (marketplace.plugins.filter((plugin_2) => plugin_2.name === plugin.name).length > 1)
          errors.push({
            path: `plugins[${w}].name`,
            message: `Duplicate plugin name "${plugin.name}" found in marketplace`,
          });
        let j = typeof plugin.source === "object" && plugin.source.source === "archive";
        if (j && hasHeadersHelper(plugin) && plugin.strict !== false)
          errors.push({
            path: `plugins[${w}].headersHelper`,
            message: `Plugin "${printablePluginName(plugin.name)}" sets headersHelper but is not "strict": false. An entry with headersHelper must inline its full manifest (strict: false, with commands/agents/hooks/mcpServers declared in the entry) so users can review what it ships before the command runs; Claude Code refuses to run the helper otherwise.`,
          });
        if ((plugin.headers !== undefined || hasHeadersHelper(plugin)) && !j)
          s.push({
            path: `plugins[${w}].${hasHeadersHelper(plugin) ? "headersHelper" : "headers"}`,
            message: `Plugin "${printablePluginName(plugin.name)}" sets headers/headersHelper, which only apply to "archive" sources; they have no effect on this entry.`,
          });
        else if (
          hasHeadersHelper(plugin) &&
          typeof plugin.source === "object" &&
          plugin.source.source === "archive" &&
          !plugin.source.sha256
        )
          s.push({
            path: `plugins[${w}].source.sha256`,
            message: `Plugin "${printablePluginName(plugin.name)}" fetches its archive with a headersHelper but sets no sha256 pin. Consider pinning the digest so the bytes users install are exactly the ones you reviewed (omit it only if you rely on digest-versioned updates).`,
          });
        for (let N of j ? Object.keys(plugin.headers ?? {}) : [])
          if (isForbiddenHelperHeader(N))
            s.push({
              path: `plugins[${w}].headers.${printablePluginName(N)}`,
              message: `Header "${printablePluginName(N)}" is a request-routing/identity header that catalog entries may not set; Claude Code drops it at download time.`,
            });
      });
    if (!marketplace.description && !marketplace.metadata?.description)
      s.push({
        path: "description",
        message:
          "No marketplace description provided. Adding a description helps users understand what this marketplace offers",
      });
  }
  let C = PluginMarketplaceEntrySchema();
  let manifestDir = pathModule.dirname(absolutePath);
  let x =
    pathModule.basename(manifestDir) === ".claude-plugin" ? pathModule.dirname(manifestDir) : manifestDir;
  for (let [f, T] of l.entries()) {
    let w = C.safeParse(resolveBareSourceUnderPluginRoot(T, m));
    if (!w.success) continue;
    let R = w.data;
    let source = R.source;
    if (!isRelativeSourcePath(source) || isAbsoluteOrUnsafePath(source)) continue;
    let joined = pathModule.join(x, source);
    let joined_2 = pathModule.join(joined, ".claude-plugin", "plugin.json");
    let relativePath = pathModule.relative(x, joined_2);
    let pluginFile = await readPluginFileSafe(x, pathModule.join(joined, ".claude-plugin"));
    if (pluginFile === "not-a-directory") {
      errors.push({
        path: `plugins[${f}] plugin.json \u2192 file`,
        code: "ENOTDIR",
        message: `A path component of ${relativePath} is not a directory, so the file cannot be read. The entry will fail to load at install time.`,
      });
      continue;
    }
    if (pluginFile === "refused") {
      s.push({
        path: `plugins[${f}].source`,
        message:
          `Local source "${source}" is or traverses a symlink, so ${relativePath} was not read \u2014 ` +
          "validation never follows one. Install dereferences symlinks that stay inside the marketplace, so this entry still loads. Validate the real path separately.",
      });
      continue;
    }
    if (pluginFile !== "ok") continue;
    let V;
    try {
      V = await getMcpAuthCache(joined_2);
    } catch (error) {
      errors.push({
        path: `plugins[${f}] plugin.json \u2192 file`,
        message: `Failed to read ${relativePath}: ${errorMessage(error)}`,
      });
      continue;
    }
    if (V.kind === "refused" || V.kind === "too-large") {
      s.push({
        path: `plugins[${f}].source`,
        message: `${relativePath} ${V.kind === "refused" ? "is a symlink or is not a regular file" : `is larger than ${ONE_MIB} bytes`}, so it was not validated. Install reads it anyway. Validate it separately.`,
      });
      continue;
    }
    if (V.kind === "absent") continue;
    let content = V.content;
    if (R.version) {
      let L;
      try {
        let W = jsonParse(stripBom(content));
        if (typeof W.version === "string") L = W.version;
      } catch (error) {
        s.push({
          path: `plugins[${f}].source`,
          message: `Could not parse ${pathModule.relative(x, joined_2)} for version cross-check: ${errorMessage(error)}`,
        });
      }
      if (L && L !== R.version) {
        let relativePath = pathModule.relative(x, joined_2);
        s.push({
          path: `plugins[${f}].version`,
          message:
            `Entry declares version "${R.version}" but ${relativePath} says "${L}". ` +
            "At install time, plugin.json wins (calculatePluginVersion precedence) \u2014 the entry version is silently ignored. " +
            `Update this entry to "${L}" to match.`,
        });
      }
    }
    let parsed = sanitizeValidationResult(
      await validatePluginManifest(
        joined_2,
        content,
        p
          ? {
              kind: "anthropic",
            }
          : {
              kind: "entry",
              entryName: R.name,
            },
      ),
    );
    let X = `plugins[${f}] plugin.json \u2192 `;
    for (let error of parsed.errors)
      errors.push({
        ...error,
        path: X + error.path,
      });
    for (let warning of parsed.warnings)
      s.push({
        ...warning,
        path: X + warning.path,
      });
  }
  return {
    success: errors.length === 0,
    errors,
    warnings: s,
    filePath: absolutePath,
    fileType: "marketplace",
  };
}
//@ chunk-85kmkm1x.js:34228-34268 layout
/**
 * 把校验信息里的用户输入清洗成可显示的单行（去控制字符、截断）。
 */
function sanitizeForDisplay(e, n) {
  return collapseWhitespace(truncateWithCount(stripCombiningRepeated(e), n));
}
//@ chunk-85kmkm1x.js:34268-34677 layout
/**
 * 校验结果展示前的清洗：路径截断到 200、消息截断到 1000 并去掉不可见字符。
 */
function sanitizeValidationResult(e) {
  return {
    ...e,
    errors: e.errors.map((error) => ({
      ...error,
      path: sanitizeForDisplay(error.path, 200),
      message: sanitizeForDisplay(error.message, 1000),
    })),
    warnings: e.warnings.map((error) => ({
      path: sanitizeForDisplay(error.path, 200),
      message: sanitizeForDisplay(error.message, 1000),
    })),
    ...(e.notes !== undefined && {
      notes: e.notes.map((note) => sanitizeForDisplay(note, 1000)),
    }),
    ...(e.gatingHooks !== undefined && {
      gatingHooks: e.gatingHooks.map((gatingHook) => ({
        module: sanitizeForDisplay(gatingHook.module, 200),
        pattern: sanitizeForDisplay(gatingHook.pattern, 200),
        hook: sanitizeForDisplay(gatingHook.hook, 1000),
        hasCatch: gatingHook.hasCatch,
      })),
    }),
  };
}
//@ chunk-85kmkm1x.js:34677-37397 fingerprint = validateComponentFile (0.696)
/**
 * 校验命令/代理/技能 markdown 文件的 frontmatter（必需字段、未知键、YAML 错误）。
 */
function validateComponentFile(filePath, content, fileType, r) {
  let errors = [];
  let warnings = [];
  let l = r === "project" && fileType === "agent";
  let match = stripBom(content).match(FRONTMATTER_REGEX);
  if (!match) {
    if (!l)
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
    let v =
      fileType !== "agent"
        ? `At runtime this ${fileType} loads with empty metadata (all frontmatter fields silently dropped).`
        : r === "project"
          ? "At runtime this agent does not load at all \u2014 with no frontmatter " +
            "name it is treated as a co-located reference document and skipped."
          : "At runtime this agent loads with its name taken from the filename and every other frontmatter field silently dropped.";
    errors.push({
      path: "frontmatter",
      message: `YAML frontmatter failed to parse: ${sanitizeForDisplay(yamlLenient.error, 200)}. ` + v,
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
  let y = parsed ?? {};
  if (y.description !== undefined) {
    let description = y.description;
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
  } else if (!l || typeof y.name === "string")
    warnings.push({
      path: "description",
      message: `No description in frontmatter. A description helps users and Claude understand when to use this ${fileType}.`,
    });
  if (y.name !== undefined && y.name !== null && typeof y.name !== "string")
    errors.push({
      path: "name",
      message: `name must be a string, got ${typeof y.name}.`,
    });
  let at = y["allowed-tools"];
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
    let v = false;
    ((C) => {
      if (C == null || isPlainObject(C)) return;
      v = true;
      warnings.push({
        path: "metadata",
        message: `'metadata' must be a mapping (key: value pairs); got ${Array.isArray(C) ? "array" : typeof C}. It is dropped at load time.`,
      });
    })(y.metadata);
  }
  if (fileType === "skill" || fileType === "command") {
    let sh = y.shell;
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
//@ chunk-85kmkm1x.js:37397-42877 layout
/**
 * 安全读取 hooks 文件（不跟随链接、限大小），解析 JSON 并按 schema 校验 hooks 与 modules；对声明的 hooks 模块 检查加载、注册、渲染匹配器、辅助调用等，返回校验结果与模块列表。
 */
async function validateHooksFile(e, n) {
  let s = {
    result: {
      success: true,
      errors: [],
      warnings: [],
      filePath: e,
      fileType: "hooks",
    },
    modules: [],
  };
  let r = (w) => ({
    result: directoryWarningResult(
      e,
      "hooks",
      `${w} \u2014 hooks are read without following symlinks and are capped at ` +
        `${ONE_MIB} bytes. The plugin loader has neither limit and fails the whole plugin on bad hook config, so validate the real file separately.`,
    ),
    modules: [],
  });
  let dir = pathModule.dirname(e);
  let pluginFile = await readPluginFileSafe(pathModule.dirname(dir), dir);
  if (pluginFile === "refused") return r("The hooks directory is a symlink and was not read");
  if (pluginFile !== "ok") return s;
  let l;
  try {
    l = await getMcpAuthCache(e);
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
        filePath: e,
        fileType: "hooks",
      },
      modules: [],
    };
  }
  if (l.kind === "refused") return r("hooks.json is not a regular file (a symlink, a FIFO, a directory)");
  if (l.kind === "too-large") return r("hooks.json is past the size cap and was not read");
  if (l.kind === "absent") return s;
  let content = l.content;
  let m;
  try {
    m = jsonParse(content);
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
        filePath: e,
        fileType: "hooks",
      },
      modules: [],
    };
  }
  if (hasNestedHooks(m, SETTINGS_SKIPPED_KEYS) || looksLikeHookMatcher(m))
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
        filePath: e,
        fileType: "hooks",
      },
      modules: [],
    };
  let p =
    m && typeof m === "object" && "hooks" in m
      ? validateHooksSetting(m.hooks)
      : {
          notes: [],
          unloadableGuards: [],
        };
  let mapped = p.notes.map((note) => ({
    path: "hooks",
    message: `${note} at runtime`,
  }));
  if (p.unloadableGuards.length > 0)
    return {
      result: {
        success: false,
        errors: p.unloadableGuards.map((unloadableGuard) => ({
          path: "hooks",
          message: `${unloadableGuard} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
        })),
        warnings: mapped,
        filePath: e,
        fileType: "hooks",
      },
      modules: [],
    };
  let h = PluginHooksSchema().safeParse(m);
  if (!h.success)
    return {
      result: {
        success: false,
        errors: formatZodErrors(h.error),
        warnings: mapped,
        filePath: e,
        fileType: "hooks",
      },
      modules: [],
    };
  let v = [];
  for (let w of findUnquotedHookPlaceholders(h.data.hooks ?? {}))
    v.push({
      path: `hooks.${w.event}`,
      message: `Shell command uses ${w.placeholders.join(", ")} without quotes: ${sanitizeForDisplay(w.command, 200)}. If the expanded path contains a space the command can split into several words and fail. Wrap the placeholder in double quotes, or use exec form: {"command": "<executable>", "args": ["\${CLAUDE_PLUGIN_ROOT}/..."]}.`,
    });
  let b = [];
  let C = [];
  let S = [];
  let modules = h.data.modules ?? [];
  let f = modules.length > 0 ? await readPluginContractInfo(n) : emptyPluginTypesContract;
  let nouns = f.nouns;
  for (let w of modules) {
    let resolved = pathModule.resolve(dir, w);
    let relativePath = pathModule.relative(n, resolved);
    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${pathModule.sep}`) ||
      pathModule.resolve(relativePath) === relativePath ||
      hasDotDotWithSpaceSegment(w)
    ) {
      b.push({
        path: `modules.${w}`,
        message: "The module path leaves the plugin directory",
      });
      continue;
    }
    try {
      let { scan, registrations, renderMatchers, helperCalls, catchReads } =
        await scanHooksModuleForValidation(resolved, n, pathModule.basename(n));
      let J = registrations.length === 0 ? "nothing" : registrations.join(", ");
      let U = [
        ...scan.calls.map((E) => {
          let I = helperCalls.get(E);
          return I === undefined ? `$.${E}` : `$.${E} (via ${I.join(", ")})`;
        }),
        ...(scan.nextTo ?? []).map((E) => `next.to:${E}`),
      ];
      let X = U.length === 0 ? "nothing on $" : U.join(", ");
      let filtered = catchReads.filter((catchRead) => catchRead.isOwnCommand);
      let W = [];
      if (filtered.length > 0) {
        let hostState = getHostState();
        try {
          if (!hostState.shippedTablesFillFailed) {
            initBuiltinPlugins();
            initBundledSkills();
            let I = firstPartyCommandNameCheck();
            let G = (Y) => I(Y) || MANIFEST_FIELD_HINT_SET.has(foldName(Y));
            W.push(...filtered.filter((Y) => !Y.commands.some(G)));
            mapped.push(
              ...uniq(filtered.flatMap((Y) => Y.commands))
                .filter(G)
                .map((Y) => ({
                  path: `modules.${w}`,
                  message: `"/${sanitizeForDisplay(Y, 200)}" is a name Claude Code ships: $.command.register refuses it and the hook that calls it is skipped`,
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
        (catchRead) => !W.includes(catchRead) && hasToolSite(catchRead.pattern),
      );
      C.push(
        `${w} hooks: ${J}`,
        ...W.map((E) => `${w} answers its own command: ${E.registration}`),
        ...filtered_2.map(
          ({ registration, hasCatch }) =>
            `${w} gating hook ${hasCatch ? "with" : "without"} .catch: ` + registration,
        ),
        `${w} calls: ${X}`,
      );
      S.push(
        ...filtered_2.map(({ registration, pattern, hasCatch }) => ({
          module: w,
          pattern,
          hook: registration,
          hasCatch,
        })),
      );
      for (let { registration, matcher } of renderMatchers) {
        let G = adviseUiRenderMatcher(matcher);
        if (G !== undefined)
          mapped.push({
            path: `modules.${w}`,
            message: `on ${registration}: ${G}`,
          });
      }
      let any = scan.hooks.some((hook) => matchesEventPattern(hook, "engine.create"));
      if (nouns.length > 0 && !any)
        mapped.push({
          path: `modules.${w}`,
          message: `the manifest's types contract declares ${nouns.map((noun) => `$.${noun}`).join(", ")} on EngineInterface, but ${w} registers no hook on engine.create, so the plugin never adds ${plural(nouns.length, "it", "them")} to $`,
        });
      if (scan.env !== undefined) {
        let E = (I) => (I.length === 0 ? "nothing" : I.join(", "));
        C.push(`${w} env writes: ${E(scan.env.writes)}`, `${w} env reads: ${E(scan.env.reads)}`);
      }
      let De = telemetryRefSummary(scan);
      if (De !== undefined) C.push(`${w} hooks telemetry for: ${De}`);
      let ze = telemetryStreamRefusal(scan, {
        isBuiltin: false,
      });
      if (ze !== undefined)
        b.push({
          path: `modules.${w}`,
          message: ze,
        });
      if (scan.state !== undefined) {
        let E = (se) => (se.length === 0 ? "nothing" : se.map((Pt) => stateAtomKey(Pt)).join(", "));
        C.push(`${w} state writes: ${E(scan.state.writes)}`, `${w} state reads: ${E(scan.state.reads)}`);
        let I = f.name ?? pathModule.basename(n);
        let G = (se) => se.plugin !== I;
        let { reads, writes } = scan.state;
        let Ce = checkContractWrites({
          names: f.isRefused
            ? {
                reads: reads.filter(G),
                writes: writes.filter(G),
              }
            : scan.state,
          owner: I,
          declared: f.state,
          contract: f.conventional,
          refusal: f.refusal,
          others: await collectLoadedContractState(n),
        });
        b.push(
          ...Ce.problems.map((message) => ({
            path: `modules.${w}`,
            message,
          })),
        );
        if (Ce.unchecked.length > 0)
          C.push(
            `${w} state of other plugins, not checked (run validate in a session with them enabled): ${Ce.unchecked.join(", ")}`,
          );
      }
      let surfaceModules = await loadSurfaceModules(scan.clients, n, pathModule.basename(n));
      if (surfaceModules !== undefined)
        C.push(
          `${w} surface modules: ${surfaceModules.map((surfaceModule) => surfaceModule.module).join(", ")}`,
        );
    } catch (error) {
      b.push({
        path: `modules.${w}`,
        message: sanitizeForDisplay(errorMessage(error), 400),
      });
    }
  }
  return {
    result: {
      success: b.length === 0,
      errors: b,
      warnings: [...mapped, ...v],
      filePath: e,
      fileType: "hooks",
      ...(C.length > 0 && {
        notes: C,
      }),
      ...(S.length > 0 && {
        gatingHooks: S,
      }),
    },
    modules,
  };
}
//@ chunk-85kmkm1x.js:42877-43333 layout
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
  let r =
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
    notes: flattened.length > 0 ? [r, `types ${relPath} declares state: ${flattened.join(", ")}`] : [r],
  };
}
//@ chunk-85kmkm1x.js:43333-43420 layout
var emptyPluginTypesContract = {
  name: undefined,
  nouns: [],
  state: [],
  isRefused: false,
  conventional: undefined,
  refusal: undefined,
};
//@ chunk-85kmkm1x.js:43420-44130 layout
/**
 * 读插件 types 契约（显式声明或约定位置）。
 */
async function readPluginContractInfo(e) {
  let n = await safeValidateComponentFiles(pathModule.join(e, ".claude-plugin", "plugin.json"));
  let s = n === undefined ? undefined : parsePlainObject(stripBom(n));
  let name = typeof s?.name === "string" ? s.name : undefined;
  let types = s?.types;
  if (s === undefined || (types !== undefined && typeof types !== "string"))
    return {
      ...emptyPluginTypesContract,
      name,
    };
  let pluginContract = await loadPluginContract(types, e, pathModule.basename(e));
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
  let c = pluginContract.problems.length - 1;
  return {
    ...emptyPluginTypesContract,
    name,
    conventional,
    refusal: sanitizeForDisplay(
      `the file at ${TYPES_ENTRY} could not be taken as the types contract (${pluginContract.problems[0] ?? "refused"}${c > 0 ? `, and ${c} more` : ""})`,
      1000,
    ),
  };
}
//@ chunk-85kmkm1x.js:44130-44472 layout
/**
 * 已加载的其他插件契约声明的状态键。
 */
async function collectLoadedContractState(e) {
  let pluginRegistry = getPluginRegistry();
  let s = pluginRegistry.pluginLoadCacheOnly ?? pluginRegistry.pluginLoad;
  if (s === undefined) return;
  let r;
  try {
    r = (await s).enabled;
  } catch {
    return;
  }
  let a = [];
  for (let i of r) {
    let types = i.manifest.types;
    if (!(
      (types !== undefined || i.isBuiltin !== true) &&
      pathModule.resolve(i.path) !== pathModule.resolve(e)
    ))
      continue;
    let pluginContract = await loadPluginContract(types, i.path, i.name);
    if (pluginContract?.kind === "read") a.push(...pluginContract.state);
  }
  return a;
}
//@ chunk-85kmkm1x.js:44472-44900 layout
/**
 * 插件的 hooks 文件路径（默认 hooks/hooks.json 与 manifest.hooks）。
 */
async function listHooksFilePaths(e) {
  let n = [pathModule.join(e, "hooks", "hooks.json")];
  if (!(await isDirectoryOrFalse(pathModule.join(e, ".claude-plugin")))) return n;
  let s = await safeValidateComponentFiles(pathModule.join(e, ".claude-plugin", "plugin.json"));
  let hooks = s === undefined ? undefined : parsePlainObject(stripBom(s))?.hooks;
  let a = Array.isArray(hooks) ? hooks : [hooks];
  for (let i of a) {
    if (typeof i !== "string") continue;
    let resolved = pathModule.resolve(e, i);
    let relativePath = pathModule.relative(e, resolved);
    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${pathModule.sep}`) ||
      pathModule.resolve(relativePath) === relativePath ||
      hasDotDotWithSpaceSegment(i)
    )
      continue;
    if (!n.includes(resolved)) n.push(resolved);
  }
  return n;
}
//@ chunk-85kmkm1x.js:44900-45366 layout
/**
 * 逐个校验 hooks 文件，多个文件都声明模块时报错。
 */
async function validateAllHooksFiles(e) {
  let n = [];
  let s = [];
  for (let a of await listHooksFilePaths(e)) {
    let { result: i, modules } = await validateHooksFile(a, e);
    if (modules.length > 0) s.push(a);
    if (i.errors.length > 0 || i.warnings.length > 0 || i.notes !== undefined) n.push(i);
  }
  let [, r] = s;
  if (r !== undefined) {
    let mapped = s.map((i) => pathModule.relative(e, i));
    n.push({
      success: false,
      errors: [
        {
          path: "modules",
          message: `The plugin names one hooks module per plugin, but ${mapped.join(" and ")} each name one; the loader refuses both`,
        },
      ],
      warnings: [],
      filePath: r,
      fileType: "hooks",
    });
  }
  return n;
}
//@ chunk-85kmkm1x.js:45366-45974 layout = expandEnvVars (0.841)
/**
 * KNOWN_MCP_SERVER_TYPES：已知 MCP 服务器类型；USER_CONFIG_PLACEHOLDER_PATTERN：user_config 占位符；MCP_URL_TEMPLATE_RE：MCP URL 里的模板占位（同一声明共 3 个绑定）。
 */
var KNOWN_SERVER_TYPES = new Set([
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
var USER_CONFIG_PLACEHOLDER_PATTERN = /\$\{user_config\.([^}$]+)\}/g;
var KNOWN_MCP_SERVER_TYPES = /\$\{[^}$]+\}/;
var USER_CONFIG_PLACEHOLDER_PATTERN_2 = 16;
var MCP_URL_TEMPLATE_RE = 8192;
var SECRET_VALUE_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\bgh[opsur]_[A-Za-z0-9]{30,}/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}/,
  /\bxox[abeprs]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bglpat-[A-Za-z0-9_-]{20,}/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /(?:^|[^A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/,
];
var SECRET_KEY_NAME_PATTERN = /authorization|api[-_]?key|token|secret|password|credential/i;
var PLACEHOLDER_VALUE_PATTERN =
  /your[-_ ]|replace|example|changeme|placeholder|dummy|redacted|xxx|[<>]|\*\*\*/i;
//@ chunk-85kmkm1x.js:45974-46120 layout
function shannonEntropy(e) {
  let n = new Map();
  for (let r of e) n.set(r, (n.get(r) ?? 0) + 1);
  let s = 0;
  for (let r of n.values()) {
    let a = r / e.length;
    s -= a * Math.log2(a);
  }
  return s;
}
//@ chunk-85kmkm1x.js:46120-46368 layout
function looksLikeSecretValue(e, n) {
  if (n.length > MCP_URL_TEMPLATE_RE || KNOWN_MCP_SERVER_TYPES.test(n) || PLACEHOLDER_VALUE_PATTERN.test(n))
    return false;
  let trimmed = n.trim();
  if (SECRET_VALUE_PATTERNS.some((a) => a.test(trimmed))) return true;
  if (!SECRET_KEY_NAME_PATTERN.test(e)) return false;
  let r = trimmed.match(/^(?:Bearer|Basic|Token|Bot)\s+(\S+)$/i)?.[1] ?? trimmed;
  return r.length >= 20 && !/\s/.test(r) && shannonEntropy(r) >= 3;
}
//@ chunk-85kmkm1x.js:46368-46391 layout
var USER_CONFIG_REF_RE = /\$\{[^}$]+\}/g;
//@ chunk-85kmkm1x.js:46391-46450 layout
function parseUrlWithConfig(e, n) {
  return URL.parse(e.replace(USER_CONFIG_REF_RE, n)) ?? undefined;
}
//@ chunk-85kmkm1x.js:46450-46990 layout
/**
 * 远程 MCP url 用 http/ws 到非回环主机时的警告。
 */
function insecureRemoteUrlWarning(url) {
  let n = parseUrlWithConfig(url, "probe-a.invalid") ?? parseUrlWithConfig(url, "1");
  let s = parseUrlWithConfig(url, "probe-b.invalid") ?? parseUrlWithConfig(url, "2");
  if (!n || !s || n.hostname !== s.hostname) return;
  let r = n.protocol === "http:" ? "http" : n.protocol === "ws:" ? "ws" : undefined;
  if (r === undefined) return;
  let hostname = n.hostname;
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  )
    return;
  let i = r === "http" ? "https" : "wss";
  return (
    `url uses ${r}:// to a non-loopback host \u2014 requests, headers and any ` +
    `credentials travel in cleartext. Use ${i}://; plugin directories may reject insecure remote server urls.`
  );
}
//@ chunk-85kmkm1x.js:46990-47492 layout
/**
 * 列出 MCP 服务器配置中可能含占位符的字符串字段。
 */
function listMcpStringFields(e) {
  let n = [];
  let s = [];
  let r;
  if (e.type === undefined || e.type === "stdio") {
    s.push("command");
    r = "env";
    if (Array.isArray(e.args)) {
      for (let [i, l] of e.args.entries())
        if (typeof l === "string")
          n.push({
            field: `args[${i}]`,
            value: l,
          });
    }
  } else if (isRemoteMcpType(e.type)) {
    s.push("url", "headersHelper");
    r = "headers";
  }
  for (let i of s) {
    let l = e[i];
    if (typeof l === "string")
      n.push({
        field: i,
        value: l,
      });
  }
  let a = r === undefined ? undefined : e[r];
  if (r !== undefined && isPlainObject(a)) {
    for (let [key, value] of Object.entries(a))
      if (typeof value === "string")
        n.push({
          field: `${r}.${key}`,
          value,
        });
  }
  return n;
}
//@ chunk-85kmkm1x.js:47492-47569 layout
function isRemoteMcpType(type) {
  return type === "http" || type === "streamable-http" || type === "sse" || type === "ws";
}
//@ chunk-85kmkm1x.js:47569-49680 layout
/**
 * 检查 MCP 配置中 ${user_config.*} 引用与 url/directory 问题。
 */
function checkMcpUserConfigRefs(e, n, s) {
  let r = [];
  let a = [];
  if (!isPlainObject(n))
    return {
      errors: r,
      warnings: a,
    };
  for (let { field, value: l } of listMcpStringFields(n)) {
    let c = new Set([...l.matchAll(USER_CONFIG_PLACEHOLDER_PATTERN)].map((p) => p[1]));
    if (c.size === 0) continue;
    let path = `${e}.${sanitizeForDisplay(field, 64)}`;
    if (field === "headersHelper") {
      r.push({
        path,
        message:
          'headersHelper references ${user_config.*}. Options are never substituted into headersHelper: the plugin loader refuses the server when the plugin declares any options (the value would be spliced into a shell command), and otherwise the literal text reaches the shell. Read the value inside the helper script instead (for example from a variable set in the server\'s "env" block).',
      });
      continue;
    }
    if (s === null) continue;
    for (let p of c)
      if (p !== undefined && !s.has(p))
        r.push({
          path,
          message: `references \${user_config.${sanitizeForDisplay(p, 64)}}, which plugin.json does not declare under "userConfig" (or in this server's "channels" entry), so on a fresh install it cannot resolve: the loader drops the server or passes the literal text through. Declare the option or fix the key.`,
        });
  }
  if (isRemoteMcpType(n.type) && typeof n.url === "string")
    if (n.url.trim() === "") {
      if (typeof n.directory === "string" && n.directory !== "")
        a.push({
          path: `${e}.directory`,
          message: `"directory" is set but url is empty. The key names a directory entry and counts only when this server's url is that entry's url, so plugin directories may reject this plugin. Set url to that entry's url, or remove the "directory" key.`,
        });
    } else if (!KNOWN_MCP_SERVER_TYPES.test(n.url) && !URL.canParse(n.url))
      r.push({
        path: `${e}.url`,
        message:
          'url is not a valid absolute URL (for example "https://host/path"). The plugin loader marks this server as invalid config and it never connects.',
      });
    else {
      let i = insecureRemoteUrlWarning(n.url);
      if (i)
        a.push({
          path: `${e}.url`,
          message: i,
        });
    }
  if (isRemoteMcpType(n.type) && isPlainObject(n.headers)) {
    for (let [key, value] of Object.entries(n.headers))
      if (typeof value === "string" && looksLikeSecretValue(key, value))
        a.push({
          path: `${e}.headers.${sanitizeForDisplay(key, 64)}`,
          message:
            "header value looks like a literal credential. Everything shipped in a plugin is readable by everyone who installs it; reference a sensitive userConfig option (${user_config.KEY}) or an environment variable (${VAR}) instead of committing the value.",
        });
  }
  return {
    errors: r,
    warnings: a,
  };
}
//@ chunk-85kmkm1x.js:49680-50922 layout
/**
 * 按类型校验单个 MCP 服务器配置（缺 type、未知类型、schema）。
 */
function validateMcpServerConfig(e, n, error) {
  if (!isPlainObject(n))
    return [
      {
        path: e,
        message: `server config must be an object (got ${getReceivedType(n)}). The plugin loader silently drops this server at load.`,
      },
    ];
  let a = n.type;
  if (a === undefined && !("command" in n) && "url" in n)
    return [
      {
        path: `${e}.type`,
        message:
          'server has a "url" but no "type". Remote servers must set "type" to "http" (or "sse" / "ws"); without it the entry is parsed as a stdio server, fails for lacking "command", and is silently dropped at load.',
      },
    ];
  if (a !== undefined && (typeof a !== "string" || !KNOWN_SERVER_TYPES.has(a))) {
    let m = typeof a === "string" ? `"${sanitizeForDisplay(a, 32)}"` : getReceivedType(a);
    return [
      {
        path: `${e}.type`,
        message:
          `unknown server type ${m} \u2014 expected "stdio" (or no type) for a local ` +
          'command, or "http", "sse", "ws" for a remote server. The plugin loader silently drops this server at load.',
      },
    ];
  }
  let l = (
    a === undefined || a === "stdio"
      ? McpStdioServerConfigSchema()
      : a === "http" || a === "streamable-http"
        ? McpHTTPServerConfigSchema()
        : a === "sse"
          ? McpSSEServerConfigSchema()
          : a === "ws"
            ? McpWebSocketServerConfigSchema()
            : undefined
  )?.safeParse(n);
  if (!l)
    return [
      {
        path: e,
        message: `is not a valid "${String(a)}" server config (${formatZodErrors(error)[0]?.message ?? "invalid"}). The plugin loader silently drops this server at load.`,
      },
    ];
  return (l.success ? formatZodErrors(error) : formatZodErrors(l.error)).map((m) => ({
    ...m,
    path: m.path === "root" ? e : `${e}.${m.path}`,
    message: `${m.message}. The plugin loader silently drops this server at load.`,
  }));
}
//@ chunk-85kmkm1x.js:50922-53245 layout
/**
 * 校验一个 MCP 服务器 JSON 文件。
 */
async function validateMcpJsonFile(e, n, s) {
  let a = (b) =>
    directoryWarningResult(
      n,
      "mcp",
      `${b} \u2014 MCP server files are read without following symlinks and are capped at ` +
        `${ONE_MIB} bytes. The plugin loader has neither limit, so validate the real file separately.`,
    );
  let i;
  try {
    i = await getMcpAuthCache(e);
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
      filePath: n,
      fileType: "mcp",
    };
  }
  if (i.kind === "absent") return null;
  if (i.kind === "refused")
    return a("The file is not a regular file (a symlink, a FIFO, a directory) and was not read");
  if (i.kind === "too-large") return a("The file is past the size cap and was not read");
  let l;
  try {
    l = jsonParse(i.content);
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: "json",
          message: `Invalid JSON syntax: ${i.content.startsWith("\uFEFF") ? "the file starts with a UTF-8 byte-order mark (BOM), which this file (unlike plugin.json) must not have \u2014 re-save it as UTF-8 without BOM" : errorMessage(error)}. The plugin loader logs this at debug level and loads no servers from the file.`,
        },
      ],
      warnings: [],
      filePath: n,
      fileType: "mcp",
    };
  }
  let c = [];
  let m = [];
  let p = isPlainObject(l) && Boolean(l.mcpServers);
  let y = p && isPlainObject(l) ? l.mcpServers : l;
  let path = p ? "mcpServers" : "root";
  let v;
  if (isPlainObject(y)) v = Object.entries(y);
  else if (Array.isArray(y)) {
    v = y.map((b, C) => [String(C), b]);
    if (y.length > 0)
      m.push({
        path,
        message: `is an array; the plugin loader keys its servers by array index ("0", "1", ...), and review tooling has misread this shape as 'no servers'. Use an object keyed by server name.`,
      });
  } else
    return {
      success: false,
      errors: [
        {
          path,
          message: `must be an object mapping server names to server configs (got ${getReceivedType(y)}). No servers load from this file.`,
        },
      ],
      warnings: [],
      filePath: n,
      fileType: "mcp",
    };
  for (let [b, C] of v) {
    let S = sanitizeForDisplay(b, 64);
    let x = p ? `mcpServers.${S}` : S;
    let f = McpServerConfigSchema().safeParse(C);
    if (!f.success) {
      c.push(...validateMcpServerConfig(x, C, f.error));
      continue;
    }
    let T = unaddableTransportReason(f.data.type);
    if (T !== null) {
      c.push({
        path: `${x}.type`,
        message:
          T === "host-only"
            ? `type "${f.data.type}" servers are registered by the host application at runtime and cannot be declared by a plugin. The plugin loader drops this server at load.`
            : 'type "claudeai-proxy" is used only by claude.ai connectors and cannot be declared ' +
              'by a plugin \u2014 declare the server with type "http" instead. The plugin loader drops ' +
              "this server at load.",
      });
      continue;
    }
    let w = checkMcpUserConfigRefs(x, C, s(b));
    c.push(...w.errors);
    m.push(...w.warnings);
  }
  return {
    success: c.length === 0,
    errors: c,
    warnings: m,
    filePath: n,
    fileType: "mcp",
  };
}
//@ chunk-85kmkm1x.js:53245-53586 layout = loadChannelUserConfig (0.777)
/**
 * 由 manifest 构造“某 MCP 服务器可用的 userConfig 键集合”查询函数（插件级 + 频道级）。
 */
function buildUserConfigKeyLookup(e) {
  let n = new Set(isPlainObject(e.userConfig) ? Object.keys(e.userConfig) : []);
  let s = new Map();
  if (Array.isArray(e.channels)) {
    for (let channel of e.channels)
      if (isPlainObject(channel) && typeof channel.server === "string" && !s.has(channel.server))
        s.set(
          channel.server,
          new Set(isPlainObject(channel.userConfig) ? Object.keys(channel.userConfig) : []),
        );
  }
  return (r) => {
    let a = s.get(r);
    return a === undefined
      ? n
      : {
          has: (i) => n.has(i) || a.has(i),
        };
  };
}
//@ chunk-85kmkm1x.js:53586-53622 layout
async function userConfigKeyLookup(rawCandidate, n) {
  return buildUserConfigKeyLookup(rawCandidate);
}
//@ chunk-85kmkm1x.js:53622-54876 layout
/**
 * 校验插件的 .mcp.json 与 manifest 引用的 MCP 文件。
 */
async function validatePluginMcpFiles(e, n) {
  let s;
  let joined = pathModule.join(e, ".claude-plugin", "plugin.json");
  if (await isDirectoryOrFalse(pathModule.dirname(joined))) {
    let S = await safeValidateComponentFiles(joined);
    let x = S === undefined ? undefined : parsePlainObject(stripBom(S));
    if (x)
      s =
        validatePluginManifest_2(x, "plugin-json", {
          pluginName: pathModule.basename(e),
          manifestPath: joined,
        }).rawCandidate ?? x;
  }
  let i = s ? buildUserConfigKeyLookup(s) : undefined;
  let l = (S) => (i ? i(S) : null);
  let c = [];
  let joined_2 = pathModule.join(e, ".mcp.json");
  let p = await validateMcpJsonFile(joined_2, joined_2, l);
  if (p) c.push(p);
  let y = new Set([pathModule.resolve(joined_2)]);
  let mcpServers = s?.mcpServers;
  let v = mcpServers === undefined ? [] : Array.isArray(mcpServers) ? mcpServers : [mcpServers];
  let b = USER_CONFIG_PLACEHOLDER_PATTERN_2;
  let C = 0;
  for (let S of v) {
    if (typeof S !== "string") continue;
    if (!S.startsWith("./") || !S.endsWith(".json") || S.includes("..")) continue;
    let joined = pathModule.join(e, S);
    let resolved = pathModule.resolve(joined);
    if (y.has(resolved)) continue;
    y.add(resolved);
    if (b <= 0) {
      C++;
      continue;
    }
    b--;
    let joined_2 = pathModule.join(e, sanitizeForDisplay(S, 128));
    let pluginFile = await readPluginFileSafe(e, pathModule.dirname(joined));
    if (pluginFile === "refused") {
      c.push(
        directoryWarningResult(
          joined_2,
          "mcp",
          "A directory on the way to this MCP servers file is a symlink or " +
            "escapes the plugin, and the file was not read \u2014 the plugin loader " +
            "follows it, so validate the real file separately.",
        ),
      );
      continue;
    }
    if (pluginFile !== "ok") continue;
    let R = await validateMcpJsonFile(joined, joined_2, l);
    if (R) c.push(R);
  }
  if (C > 0)
    c.push(
      directoryWarningResult(
        joined,
        "mcp",
        `plugin.json names more than ${USER_CONFIG_PLACEHOLDER_PATTERN_2} MCP server files; ${C} ${plural(C, "file")} past that limit were not examined. The plugin loader reads them all, so validate those files separately.`,
      ),
    );
  return c.filter((S) => S.errors.length > 0 || S.warnings.length > 0);
}
//@ chunk-85kmkm1x.js:54876-55407 fingerprint = collectMarkdown (0.84)
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
  let skippedSymlinks = count(entries, (i) => i.isSymbolicLink());
  if (isSkillsDir)
    return {
      files: entries.filter((e) => e.isDirectory()).map((e) => pathModule.join(dir, e.name, "SKILL.md")),
      skippedSymlinks,
    };
  let out = [];
  for (let entry of entries) {
    let full = pathModule.join(dir, entry.name);
    if (entry.isDirectory()) {
      let markdown = await collectMarkdown(full, false);
      out.push(...markdown.files);
      skippedSymlinks += markdown.skippedSymlinks;
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return {
    files: out,
    skippedSymlinks,
  };
}
//@ chunk-85kmkm1x.js:55407-55504 fingerprint = validatePluginContents (0.558)
var NO_MANIFEST = "NO_MANIFEST";
var COMPONENT_DIR_KINDS = new Map([
  ["skills", "skill"],
  ["agents", "agent"],
  ["commands", "command"],
]);
//@ chunk-85kmkm1x.js:55504-55555 layout
function isProjectOrSkillScope(e, n) {
  return e === "project" || n === "skill";
}
//@ chunk-85kmkm1x.js:55555-55748 layout
async function findComponentDirs(e) {
  let mapped = [...COMPONENT_DIR_KINDS].map(([r, a]) => [a, pathModule.join(e, r)]);
  let results = await Promise.all(mapped.map(([, r]) => readPluginFileSafe(e, r)));
  return {
    dirs: mapped.filter((r, a) => results[a] === "ok"),
    refused: mapped.filter((r, a) => results[a] === "refused"),
  };
}
//@ chunk-85kmkm1x.js:55748-56057 layout
/**
 * 目录是否像一个插件（有 .claude-plugin/，或有含 SKILL.md 的 skills/）。
 */
async function looksLikePluginDir(e) {
  if ((await readPluginFileSafe(e, pathModule.join(e, ".claude-plugin"))) === "ok") return true;
  let dir = pathModule.join(e, "skills");
  let pluginFile = await readPluginFileSafe(e, dir);
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
//@ chunk-85kmkm1x.js:56057-56166 layout
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
//@ chunk-85kmkm1x.js:56166-57630 layout
/**
 * 校验插件目录下所有组件文件（commands/agents/skills…），符号链接目录不读取并给出警告。
 */
async function validateComponentDirs(dirs, refused, s) {
  let r = [];
  let a = 0;
  let skipped = refused.length;
  for (let [l, c] of refused)
    r.push(
      directoryWarningResult(
        c,
        l,
        "This directory is a symlink and nothing in it was read \u2014 component " +
          `directories are read without following symlinks. A session loading this ${s === "plugin" ? "plugin" : "project"} does follow it, so validate the real directory separately.`,
      ),
    );
  for (let [fileType, dir] of dirs) {
    let { files, skippedSymlinks } = await collectMarkdown(dir, fileType === "skill");
    let y = isProjectOrSkillScope(s, fileType) ? skippedSymlinks : 0;
    let h = 0;
    let v = 0;
    for (let file of files) {
      let filePath = sanitizeForDisplay(file, 256);
      let x;
      try {
        x = await getMcpAuthCache(file);
      } catch (error) {
        r.push({
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
      if (x.kind !== "ok") {
        if (x.kind === "refused" && isProjectOrSkillScope(s, fileType)) h++;
        else if (x.kind === "too-large") v++;
        continue;
      }
      a++;
      let f = validateComponentFile(filePath, x.content, fileType, s);
      if (f.errors.length > 0 || f.warnings.length > 0) r.push(f);
    }
    skipped += y + h + v;
    let b =
      "A session loading this " +
      (s === "plugin" ? "plugin" : "directory") +
      " does follow them, so validate the real paths separately.";
    if (y > 0)
      r.push(
        directoryWarningResult(
          dir,
          fileType,
          `${y} ${plural(y, "entry", "entries")} here ${plural(y, "is", "are")} ${plural(y, "a symlink", "symlinks")} and ${plural(y, "was", "were")} not read \u2014 components are read ` +
            `without following symlinks. ${b}`,
        ),
      );
    if (h > 0)
      r.push(
        directoryWarningResult(
          dir,
          fileType,
          `${h} ${plural(h, "component")} here ${plural(h, "was", "were")} not read \u2014 the path is not a ` +
            `regular file (a symlink, a FIFO, a directory). ${b}`,
        ),
      );
    if (v > 0)
      r.push(
        directoryWarningResult(
          dir,
          fileType,
          `${v} ${plural(v, "file")} here ${plural(v, "is", "are")} larger than ${ONE_MIB} bytes and ${plural(v, "was", "were")} not validated.`,
        ),
      );
  }
  return {
    results: r,
    scanned: a,
    skipped,
  };
}
//@ chunk-85kmkm1x.js:57630-57686 layout
async function validateComponentDirectorySafe(filePath) {
  return (await validateComponentDirectory(filePath))?.map(sanitizeValidationResult) ?? null;
}
//@ chunk-85kmkm1x.js:57686-58831 layout
/**
 * 校验组件目录（或 .claude、插件根下的组件目录）。
 */
async function validateComponentDirectory(e) {
  let n = COMPONENT_DIR_KINDS.get(pathModule.basename(e));
  if (n) {
    let dir = pathModule.dirname(e);
    let S;
    if (pathModule.basename(dir) === ".claude" && !(await isDirectoryOrFalse(dir)))
      S = "The enclosing .claude directory is a symlink.";
    else if (!(await isDirectoryOrFalse(e))) S = "This path is a symlink.";
    if (S)
      return [
        {
          success: false,
          errors: [
            {
              path: "directory",
              message: `${S} Component directories are read without following symlinks, so nothing here was validated. Pass the real directory instead.`,
            },
          ],
          warnings: [],
          filePath: e,
          fileType: n,
        },
      ];
    return (await validateComponentDirs([[n, e]], [], "project")).results;
  }
  let joined = pathModule.join(e, ".claude");
  let r = pathModule.basename(e) === ".claude";
  let [pluginFile, i] = await Promise.all([
    readPluginFileSafe(e, joined),
    r ? Promise.resolve(false) : looksLikePluginDir(e),
  ]);
  let l =
    r || i
      ? await findComponentDirs(e)
      : {
          dirs: [],
          refused: [],
        };
  let c =
    pluginFile === "ok"
      ? await findComponentDirs(joined)
      : {
          dirs: [],
          refused: [],
        };
  let m = r ? "project" : "plugin";
  let [p, y] = await Promise.all([
    validateComponentDirs(l.dirs, l.refused, m),
    validateComponentDirs(c.dirs, c.refused, "project"),
  ]);
  let h = [...p.results, ...y.results];
  let v = p.scanned + y.scanned;
  let b = p.skipped + y.skipped;
  if (pluginFile === "refused")
    h.push(
      directoryWarningResult(
        joined,
        "plugin",
        "This directory is a symlink and nothing in it was read \u2014 .claude is " +
          "read without following symlinks. A session loading this project does follow it, so validate the real directory separately.",
      ),
    );
  return v > 0 || b > 0 || h.length > 0 ? h : null;
}
//@ chunk-85kmkm1x.js:58831-59535 layout
/**
 * 插件根目录里出现 CLAUDE.md / CLAUDE.local.md 时给出“插件不会加载它们”的警告。
 */
async function checkPluginRootClaudeMd(e) {
  let n = [];
  let s = new Set(["claude.md", "claude.local.md"]);
  let r = [];
  try {
    r = await readdir(e, {
      withFileTypes: true,
    });
  } catch {}
  for (let i of r) {
    if (!i.isFile() || !s.has(i.name.toLowerCase())) continue;
    let c =
      i.name.toLowerCase() === "claude.local.md"
        ? "Remove it from the plugin root."
        : "To ship context with your plugin, use a skill (skills/<name>/SKILL.md) instead.";
    n.push({
      success: true,
      errors: [],
      warnings: [
        {
          path: "root",
          message: `${i.name} at the plugin root is not loaded as project context. ${c}`,
        },
      ],
      filePath: pathModule.join(e, sanitizeForDisplay(i.name, 64)),
      fileType: "plugin",
    });
  }
  n.push(...(await validateBinaryReferences(e)));
  let componentDirs = await findComponentDirs(e);
  n.push(...(await validateComponentDirs(componentDirs.dirs, componentDirs.refused, "plugin")).results);
  n.push(...(await validateAllHooksFiles(e)));
  n.push(...(await validatePluginMcpFiles(e, r)));
  return n.map(sanitizeValidationResult);
}
//@ chunk-85kmkm1x.js:59535-59820 layout
/**
 * 校验 manifest，可把“无法记录的名字”错误降级为警告。
 */
async function validateManifestForDisplay(filePath, n) {
  let s = sanitizeValidationResult(await validateManifest(filePath));
  if (n?.unrecordableNames !== "warn") return s;
  let filtered = s.errors.filter((error) => error.code !== UNRECORDABLE_NAME);
  let mapped = s.errors
    .filter((error) => error.code === UNRECORDABLE_NAME)
    .map(({ path, message }) => ({
      path,
      message,
    }));
  return {
    ...s,
    success: filtered.length === 0,
    errors: filtered,
    warnings: [...mapped, ...s.warnings],
  };
}
//@ chunk-85kmkm1x.js:59820-60756 fingerprint = validateManifest (0.971)
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
    let l = marketplaceResult.errors[0];
    if (!(l?.path === "file" && (l.code === "ENOENT" || l.code === "ENOTDIR"))) return marketplaceResult;
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
  switch (detectManifestType(filePath)) {
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
        if (Array.isArray(parsed.plugins)) return validateMarketplaceForDisplay(filePath);
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
//@ chunk-85kmkm1x.js:60756-61697 affinity
/**
 * validate 命令入口：没有 manifest 时尝试按“裸技能目录”解析，否则返回 manifest 与插件根目录。
 */
async function resolveValidateTarget(e) {
  let n = await validateManifestForDisplay(e);
  let filePath = n.filePath;
  if (n.errors.some((error) => error.code === NO_MANIFEST)) {
    let p = await validateComponentDirectorySafe(filePath);
    return p
      ? {
          manifest: null,
          contents: p,
          resolvedPath: filePath,
          pluginRoot: null,
        }
      : {
          manifest: n,
          contents: [],
          resolvedPath: filePath,
          pluginRoot: null,
        };
  }
  let dir = pathModule.dirname(filePath);
  let dir_2 = pathModule.dirname(dir);
  if (pathModule.basename(dir) !== ".claude-plugin")
    return {
      manifest: n,
      contents: [],
      resolvedPath: filePath,
      pluginRoot: null,
    };
  if (n.fileType === "plugin") {
    let contents = await checkPluginRootClaudeMd(dir_2);
    return {
      manifest: n,
      contents,
      resolvedPath: filePath,
      pluginRoot: dir_2,
    };
  }
  if (pathModule.resolve(e) !== dir_2)
    return {
      manifest: n,
      contents: [],
      resolvedPath: filePath,
      pluginRoot: null,
    };
  let jsonFile = await readJsonFile(filePath);
  let l =
    jsonFile !== undefined &&
    isOfficialMarketplaceName(jsonFile.name) &&
    jsonFile.plugins.some((plugin) => isRelativeToRoot(plugin, dir_2, dir_2));
  let c = await validateHooksJsonForDisplay(pathModule.join(dir, "plugin.json"), {
    kind: l ? "anthropic" : "alone",
  });
  if (c.errors[0]?.code === "ENOENT")
    return {
      manifest: n,
      contents: [],
      resolvedPath: filePath,
      pluginRoot: null,
    };
  let m = c.errors.length > 0 || c.warnings.length > 0 || (c.notes?.length ?? 0) > 0;
  return {
    manifest: n,
    contents: [...(m ? [c] : []), ...(await checkPluginRootClaudeMd(dir_2))],
    resolvedPath: filePath,
    pluginRoot: dir_2,
  };
}
//@ chunk-85kmkm1x.js:61697-61751 affinity
async function safeValidateComponentFiles(e) {
  return mcpAuthCacheContent(e).catch(() => {
    return;
  });
}
//@ chunk-85kmkm1x.js:61751-61787 sole-consumer
function asPlainObject(e) {
  return isPlainObject(e) ? e : undefined;
}
//@ chunk-85kmkm1x.js:61787-61837 sole-consumer
function parsePlainObject(e) {
  try {
    return asPlainObject(jsonParse(e));
  } catch {
    return;
  }
}
//@ chunk-85kmkm1x.js:61837-62358 sole-consumer
/**
 * MCP command 引用的 bin/ 文件须存在或在 binaries 中声明。
 */
function checkBinCommandRefs(e, n, s) {
  let r = [];
  for (let [key, value] of Object.entries(e)) {
    let l = asPlainObject(value);
    if (!l || typeof l.command !== "string") continue;
    let m = l.command.match(/^\$\{CLAUDE_PLUGIN_ROOT\}\/bin\/([^/\\]+)$/)?.[1];
    if (m === undefined || n.has(m) || s.has(m)) continue;
    let p = sanitizeForDisplay(key, 64);
    let y = sanitizeForDisplay(m, 64);
    r.push({
      path: `mcpServers.${p}`,
      message:
        `bin/${y} is not a shipped file, a declared binaries entry, or ` +
        "a name derivable from the declared entries \u2014 the server will " +
        'fail to start. Check for a typo against the "binaries" map in plugin.json.',
    });
  }
  return r;
}
//@ chunk-85kmkm1x.js:62358-63527 sole-consumer
/**
 * 检查 MCP 配置引用的插件二进制是否存在或可推导。
 */
async function validateBinaryReferences(e) {
  if (!(await isDirectoryOrFalse(pathModule.join(e, ".claude-plugin")))) return [];
  let filePath = pathModule.join(e, ".claude-plugin", "plugin.json");
  let s = await safeValidateComponentFiles(filePath);
  if (s === undefined) return [];
  let plainObject = parsePlainObject(stripBom(s));
  let pluginBinaries = parsePluginBinaries(plainObject?.binaries);
  if (!plainObject || !pluginBinaries) return [];
  let i = new Set(Object.keys(pluginBinaries));
  for (let x of PLATFORM_TARGETS) {
    let f = new Map();
    for (let key of Object.keys(pluginBinaries)) {
      let w = binaryBaseNameForTarget(key, x);
      if (w !== undefined) f.set(w, (f.get(w) ?? 0) + 1);
    }
    for (let [T, w] of f) if (w === 1) i.add(T);
  }
  let joined = pathModule.join(e, "bin");
  let c = new Set();
  if (await isDirectoryOrFalse(joined))
    c = await readdir(joined)
      .then((x) => new Set(x))
      .catch(() => new Set());
  let m = [];
  function p(filePath, f) {
    if (f.length > 0)
      m.push({
        success: true,
        errors: [],
        warnings: f,
        filePath,
        fileType: "plugin",
      });
  }
  let filePath_2 = pathModule.join(e, ".mcp.json");
  let h = await safeValidateComponentFiles(filePath_2);
  if (h !== undefined) {
    let plainObject = parsePlainObject(h);
    if (plainObject) {
      let f = asPlainObject(plainObject.mcpServers || plainObject);
      if (f) p(filePath_2, checkBinCommandRefs(f, c, i));
    }
  }
  let mcpServers = plainObject.mcpServers;
  let b = mcpServers === undefined ? [] : Array.isArray(mcpServers) ? mcpServers : [mcpServers];
  let C = [];
  let S = USER_CONFIG_PLACEHOLDER_PATTERN_2;
  for (let x of b) {
    if (typeof x === "string" && S <= 0) continue;
    if (typeof x === "string") {
      S--;
      if (!x.startsWith("./") || isAbsoluteOrUnsafePath(x)) continue;
      let joined = pathModule.join(e, x);
      if ((await readPluginFileSafe(e, pathModule.dirname(joined))) !== "ok") continue;
      let w = await safeValidateComponentFiles(joined);
      if (w === undefined) continue;
      let plainObject = parsePlainObject(w);
      if (!plainObject) continue;
      let j = asPlainObject(plainObject.mcpServers || plainObject);
      if (j) p(pathModule.join(e, sanitizeForDisplay(x, 128)), checkBinCommandRefs(j, c, i));
      continue;
    }
    let f = asPlainObject(x);
    if (f) C.push(...checkBinCommandRefs(f, c, i));
  }
  p(filePath, C);
  return m;
}
//@ chunk-6j594vm1.js:3309-3356 fingerprint = MARKETPLACE_ONLY_MANIFEST_FIELDS (0.369)
/**
 * 按模式返回 schema（strict 或宽松）。名字配错，见 lead 建议。
 */
function MARKETPLACE_ONLY_MANIFEST_FIELDS(n) {
  return n === "strict" ? permissionPromptResultSchemaCutting() : permissionPromptResultSchemaRefusing();
}
export {
  PRIVACY_POLICY_KEYS,
  SUPPORT_URL_KEYS,
  TERMS_URL_KEYS,
  DOCUMENTATION_URL_KEYS,
  MARKETPLACE_ONLY_MANIFEST_FIELDS,
  sanitizeForDisplay,
  resolveValidateTarget,
  NO_MANIFEST,
  validateHooksJsonForDisplay,
  checkPluginRootClaudeMd,
  readJsonFile,
  matchesDirEntry,
  isSameResolvedPath,
  summarizeValidationResults,
  validateManifestForDisplay,
  PLUGIN_ID_PART_RULE,
};
