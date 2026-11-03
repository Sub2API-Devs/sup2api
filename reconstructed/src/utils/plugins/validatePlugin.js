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
import { resolve, resolve as resolve_2, resolve as resolve_3, relative, isAbsolute, sep } from "path";
import { readFile, readFile as readFile_2, stat, readdir, lstat } from "fs/promises";
import {
  ZGt,
  describeTypeEntryProblem,
  isRealPathWithinTeamDir_2,
  ezt,
  readTypeFileCapped,
} from "../../plugins/functionHooks/typeRoots.js";
import { ue, validatePluginContract } from "./validatePluginContract.js";
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
import { Wo } from "../json.js";
import { mjo, firstPartyCommandNameCheck } from "../../commands.js";
import { foldName } from "./syncedItems.js";
import { boundedEditDistance } from "../settings/managedEnvKeys.js";
import { Eh, W9e } from "../pathClassification.js";
import { getErrnoCode, errorMessage, isENOENT } from "../errors.js";
import { validatePluginManifest as validatePluginManifest_2 } from "./pluginManifestRead.js";
import { checkReservedPluginName, OFFICIAL_PLUGIN_HINT } from "./reservedPluginNames.js";
import { o, A, u, Ka, pe } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { readPluginFileSafe, getMcpAuthCache, FF, ZB } from "./safeFileRead.js";
import { Dr, truncateWithCount, plural } from "../stringUtils.js";
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
  kqs,
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
  let r = e ?? ZGt,
    a = resolve(n, r),
    i = relative(n, a);
  if (i.startsWith("..") || isAbsolute(i)) return ue(`${r} leaves the plugin's folder`);
  let c = (x) => ue(`${r}: ${describeTypeEntryProblem(s, a, x)}`),
    m = await checkInsidePluginRoot(a, n, s).then(
      (x) => x,
      (x) => (e === void 0 && isRealPathWithinTeamDir_2(x) ? void 0 : c(x)),
    );
  if (m === void 0 || "kind" in m) return m;
  if (m.size > ezt) return ue(`${r} is over ${ezt} bytes and was not read`);
  let h = await readTypeFileCapped(m.real).then((x) => x, c);
  if (typeof h !== "string") return h;
  let { problems: problems, nouns: nouns, state: state } = validatePluginContract(h);
  return problems.length === 0 ? { kind: "read", text: h, nouns: nouns, state: state } : ue(...problems);
}
//@ chunk-85kmkm1x.js:10629-11512 placement
function checkContractWrites({
  names: names,
  owner: owner,
  declared: declared,
  others: others,
  contract: contract,
  refusal: refusal,
}) {
  let l = new Map();
  for (let { plugin: plugin, keys: keys } of [...declared, ...(others ?? [])]) {
    let h = l.get(plugin) ?? new Set();
    (keys.forEach((v) => h.add(v)), l.set(plugin, h));
  }
  let c = [],
    m = new Set();
  for (let { plugin: plugin, key: key } of names.writes)
    if (plugin !== owner)
      c.push(
        `$.state.set refers to ${stateAtomKey({ plugin: plugin, key: key })}, which ${plugin} owns: only a value's owner writes it (to change what is written, hook ${plugin}'s state.set and rewrite e.value)`,
      );
  for (let { plugin: plugin, key: key } of [...names.reads, ...names.writes]) {
    let h = plugin === owner,
      v = h || others !== void 0,
      b = stateAtomKey({ plugin: plugin, key: key });
    if (!v) {
      m.add(b);
      continue;
    }
    let C = l.get(plugin)?.has(key) === !0,
      S = h ? (contract ?? "the manifest's types contract") : "no enabled plugin's contract",
      x = refusal ?? `${S} must name it in interface PluginState { ${plugin}: { ${key}: ... } }`,
      f = h ? `${b} is not declared: ${x}` : `${b} is not declared: ${S} names it in PluginState`;
    if (!C && !c.includes(f)) c.push(f);
  }
  return { problems: c, unchecked: [...m] };
}
/**
 * 可放在 experimental 下的组件键与组件路径字段规格。
 */
//@ chunk-85kmkm1x.js:11512-12082 placement
var EXPERIMENTAL_COMPONENT_KEYS = ["monitors", "themes"],
  COMPONENT_PATH_SPECS = [
    { key: "commands", recordPathProperty: "source" },
    { key: "hooks", bareStringIndexed: !0, jsonFile: !0 },
    { key: "agents", bareStringIndexed: !0 },
    { key: "skills", bareStringIndexed: !0 },
    { key: "outputStyles" },
    { key: "themes" },
    { key: "monitors", jsonFile: !0 },
    { key: "lspServers", jsonFile: !0 },
    { key: "workflows", bareStringIndexed: !0 },
    { key: "types", bareStringOnly: !0 },
    {
      key: "mcpServers",
      jsonFile: !0,
      acceptsUrl: !0,
      missingConsequence: (e) =>
        e.endsWith(".json")
          ? "The plugin loader skips a missing MCP servers file without reporting it, so none of its servers will load."
          : void 0,
    },
  ];
/**
 * 按组件规格遍历 manifest（monitors/themes 可来自 experimental）：数组逐项、对象按 recordPathProperty、其余整体， 收集字符串路径（允许 URL 的组件跳过 URL），返回 {spec, field, relPath}。
 */
//@ chunk-85kmkm1x.js:12082-12767 placement
function collectComponentPathFields(e) {
  let n = isPlainObject(e.experimental) ? e.experimental : void 0,
    s = [];
  for (let r of COMPONENT_PATH_SPECS) {
    let a = e[r.key],
      key = r.key,
      l =
        n !== void 0 && EXPERIMENTAL_COMPONENT_KEYS.includes(r.key) && Object.hasOwn(n, r.key)
          ? n[r.key]
          : void 0;
    if (l != null) ((a = l), (key = `experimental.${r.key}`));
    let c = [];
    if (r.bareStringOnly) c.push([key, a]);
    else if (Array.isArray(a)) for (let [m, p] of a.entries()) c.push([`${key}[${m}]`, p]);
    else if (!isPlainObject(a)) c.push([r.bareStringIndexed ? `${key}[0]` : key, a]);
    else if (r.recordPathProperty !== void 0) {
      for (let [m, p] of Object.entries(a))
        if (isPlainObject(p)) c.push([`${key}.${m}.${r.recordPathProperty}`, p[r.recordPathProperty]]);
    }
    for (let [m, p] of c)
      if (typeof p === "string" && !(r.acceptsUrl && /^[a-z][a-z0-9+.-]*:\/\//i.test(p)))
        s.push({ spec: r, field: m, relPath: p });
  }
  return s;
}
/**
 * 上架信息里各类链接字段的键名。
 */
//@ chunk-85kmkm1x.js:12767-13022 placement
var PRIVACY_POLICY_KEYS = ["privacyPolicyUrl", "privacy_policy", "privacyPolicy"],
  SUPPORT_URL_KEYS = ["supportUrl", "support", "bugs"],
  TERMS_URL_KEYS = ["termsOfServiceUrl", "terms_of_service"],
  DOCUMENTATION_URL_KEYS = ["documentationUrl", "docs"],
  LISTING_FIELD_KEYS = new Set([
    "icon",
    "screenshots",
    "classification",
    ...PRIVACY_POLICY_KEYS,
    ...SUPPORT_URL_KEYS,
    ...TERMS_URL_KEYS,
    ...DOCUMENTATION_URL_KEYS,
  ]);
//@ chunk-85kmkm1x.js:13022-13094 placement
var Tn = ["CLAUDE_PLUGIN_ROOT", "CLAUDE_PLUGIN_DATA", "CLAUDE_PROJECT_DIR"];
//@ chunk-85kmkm1x.js:13094-13358 placement
function findUnquotedHookPlaceholders(e) {
  let n = [];
  for (let [s, r] of Object.entries(e))
    for (let a of r ?? [])
      for (let hook of a.hooks) {
        if (hook.type !== "command" || hook.args !== void 0 || hook.shell === "powershell") continue;
        let l = findUnquotedPlaceholders(hook.command);
        if (l.length > 0) n.push({ event: s, command: hook.command, placeholders: l });
      }
  return n;
}
/**
 * 扫描命令中不在引号内的 $VAR/${VAR} 插件变量。
 */
//@ chunk-85kmkm1x.js:13358-13718 placement
function findUnquotedPlaceholders(e) {
  let n = new Set(),
    s = !1,
    r = !1;
  for (let a = 0; a < e.length; a++) {
    let i = e[a];
    if (!s && i === "\\") {
      a++;
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
    for (let l of Tn) {
      let startsWith = e.startsWith(`{${l}}`, a + 1),
        m = e.startsWith(l, a + 1) && !/[A-Za-z0-9_]/.test(e.charAt(a + 1 + l.length));
      if (startsWith || m) {
        n.add(`\${${l}}`);
        break;
      }
    }
  }
  return [...n];
}
//@ chunk-85kmkm1x.js:13810-13861 placement
var Ee = (e) => (e.endsWith(sep) ? e.slice(0, -sep.length) : e);
//@ chunk-85kmkm1x.js:13861-13898 placement
var csn = (e, n) => Ee(resolve_3(e)) === Ee(resolve_3(n));
//@ chunk-85kmkm1x.js:13898-13976 placement
function we(e, n, s) {
  let { source: source } = e;
  return typeof source === "string" && csn(resolve_2(n, source), s);
}
//@ chunk-85kmkm1x.js:13976-14061 placement
function $Or(e, n, s) {
  return typeof e.source === "string" ? we(e, n, s.root) : e.name === s.name;
}
/**
 * 读取 JSON 文件并按 schema 校验，失败返回 undefined（插件校验用）。
 */
//@ chunk-85kmkm1x.js:14101-14234 placement = readJsonFile (1)
async function readJsonFile(e) {
  try {
    let result = PluginMarketplaceFileSchema().safeParse(
      jsonParse(Wo(await readFile_2(e, { encoding: "utf-8" }))),
    );
    return result.success ? result.data : void 0;
  } catch {
    return;
  }
}
/**
 * 市场条目额外允许的键与其他工具 manifest 字段提示。
 */
//@ chunk-85kmkm1x.js:14234-15854 placement
var MARKETPLACE_ENTRY_EXTRA_KEYS = new Set([
    "category",
    "source",
    "tags",
    "strict",
    "id",
    "relevance",
    "headers",
    "headersHelper",
  ]),
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
  ]),
  FOREIGN_MANIFEST_HINT = new Map([["user_config", "userConfig"]]),
  MANIFEST_FIELD_HINTS = new Set(["themes", "monitors", "outputStyles", "evals", "syntaxHighlighting"]),
  MANIFEST_FIELD_HINT_SET = new Set(mjo.map(foldName));
//@ chunk-85kmkm1x.js:15854-15998 placement
function summarizeValidationResults(e, n) {
  let all = e.every((a) => a.success),
    any = e.some((a) => a.warnings.length > 0);
  return { noErrors: all, hasWarnings: any, allSuccess: n.strict ? all && !any : all };
}
//@ chunk-85kmkm1x.js:15998-16069 layout = getReceivedType (0.776)
function getReceivedType(value) {
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}
//@ chunk-85kmkm1x.js:16069-16268 fingerprint = detectManifestType (1)
function detectManifestType(filePath) {
  let fileName = pathModule.basename(filePath),
    dirName = pathModule.basename(pathModule.dirname(filePath));
  if (fileName === "plugin.json") return "plugin";
  if (fileName === "marketplace.json") return "marketplace";
  if (dirName === ".claude-plugin") return "plugin";
  return "unknown";
}
/**
 * zod 错误转 [{path, message}]（空路径记 root）。
 */
//@ chunk-85kmkm1x.js:16268-16373 fingerprint = formatZodErrors (1)
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
  let s = e.length <= 3 ? 1 : 2,
    lower = e.toLowerCase(),
    a,
    i = s + 1;
  for (let l of n) {
    if (Math.abs(l.length - e.length) > s) continue;
    if (l.toLowerCase() === lower) return l;
    let c = boundedEditDistance(e, l, s);
    if (c < i) ((i = c), (a = l));
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
  for (let l of Object.keys(e)) {
    if (n.has(l) || i?.has(l)) continue;
    r.push({ path: s ? `${s}.${l}` : l, message: unknownFieldMessage(l, n, a) });
  }
}
/**
 * 路径（去盘符后）是否为绝对或含危险段。
 */
//@ chunk-85kmkm1x.js:17589-17658 layout
function isAbsoluteOrUnsafePath(e) {
  let replaced = e.replace(/^[a-zA-Z]:/, "");
  return Eh(replaced) || W9e(replaced);
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
/**
 * 校验单个 hooks.json 并整理结果。
 */
//@ chunk-85kmkm1x.js:18080-18144 layout
async function validateHooksJsonForDisplay(e, n = { kind: "alone" }) {
  return sanitizeValidationResult(await validateHooksJson(e, n));
}
//@ chunk-85kmkm1x.js:18144-18493 fingerprint = validateHooksJson (0.561)
async function validateHooksJson(e, n) {
  let resolved = pathModule.resolve(e),
    r;
  try {
    r = await readFile(resolved, { encoding: "utf-8" });
  } catch (error) {
    let code = getErrnoCode(error),
      l;
    if (code === "ENOENT") l = `File not found: ${resolved}`;
    else if (code === "EISDIR") l = `Path is not a file: ${resolved}`;
    else l = `Failed to read file: ${errorMessage(error)}`;
    return {
      success: !1,
      errors: [{ path: "file", message: l, code: code }],
      warnings: [],
      filePath: resolved,
      fileType: "plugin",
    };
  }
  return validatePluginManifest(resolved, r, n);
}
/**
 * claude plugin validate：校验 plugin.json（JSON 语法、schema、名字、marketplace-only 字段警告、组件路径存在性），返回 errors/warnings。
 */
//@ chunk-85kmkm1x.js:18493-23893 callgraph-fingerprint = validatePluginManifest (0.251)
async function validatePluginManifest(e, n, s) {
  let r = [],
    a = [],
    i = [],
    l;
  try {
    l = jsonParse(Wo(n));
  } catch (error) {
    return {
      success: !1,
      errors: [{ path: "json", message: `Invalid JSON syntax: ${errorMessage(error)}` }],
      warnings: [],
      filePath: e,
      fileType: "plugin",
    };
  }
  let c = validatePluginManifest_2(l, "plugin-json", {
    pluginName: pathModule.basename(pathModule.dirname(pathModule.dirname(e))),
    manifestPath: e,
  });
  if (!c.ok) r.push(...c.errors.map((error) => ({ ...error, path: error.path || "root" })));
  else a.push(...c.hookNotes.map((hookNote) => ({ path: "hooks", message: `${hookNote} at runtime` })));
  if (l && typeof l === "object") {
    let p = c.rawCandidate ?? l,
      dir = pathModule.dirname(e),
      h = pathModule.basename(dir) === ".claude-plugin" ? pathModule.dirname(dir) : dir,
      v = async (b, C, S = "The runtime loader will report this as a load failure.") => {
        if (
          (checkPathTraversal(b, C, r),
          isAbsoluteOrUnsafePath(b) || pathModule.isAbsolute(b) || /^[a-zA-Z]:/.test(b))
        )
          return;
        try {
          return await stat(pathModule.resolve(h, b));
        } catch (error) {
          let code = getErrnoCode(error);
          r.push({
            path: C,
            message: `Path not found: ${b}${code && code !== "ENOENT" ? ` (${code})` : ""}. ${S}`,
          });
          return;
        }
      };
    for (let { spec: spec, field: field, relPath: relPath } of collectComponentPathFields(p)) {
      let x = await v(relPath, field, spec.missingConsequence?.(relPath));
      if (x === void 0) continue;
      if (spec.key === "skills" && !x.isDirectory()) {
        let dir = pathModule.dirname(relPath),
          T =
            pathModule.basename(relPath).toLowerCase() === "skill.md"
              ? dir === "."
                ? " \u2014 point to the plugin root '.' instead"
                : ` \u2014 point to the parent directory '${dir}' instead`
              : "";
        r.push({
          path: field,
          message: `Path is a file; skills entries must be directories containing SKILL.md${T}: ${relPath}`,
        });
      }
      if (spec.jsonFile && relPath.endsWith(".json") && x.isDirectory())
        r.push({
          path: field,
          message: `Path is a directory; ${spec.key} must point to a JSON file: ${relPath}`,
        });
      if (spec.key === "types") {
        let f = contractCheckResult(await loadPluginContract(relPath, h, pathModule.basename(h)), {
          relPath: relPath,
          field: field,
        });
        (r.push(...f.errors), i.push(...f.notes));
      }
    }
    if (p.types === void 0) {
      let b = await loadPluginContract(void 0, h, pathModule.basename(h));
      if (b?.kind === "read") i.push(...contractCheckResult(b, { relPath: ZGt, field: "types" }).notes);
    }
    if (p.mcpServers !== void 0) {
      let b = Array.isArray(p.mcpServers) ? p.mcpServers : [p.mcpServers],
        C;
      for (let [S, x] of b.entries()) {
        let f = Array.isArray(p.mcpServers) ? `mcpServers[${S}]` : "mcpServers";
        if (isPlainObject(x)) {
          C ??= await ps(p, e);
          for (let [T, w] of Object.entries(x)) {
            let R = checkMcpUserConfigRefs(`${f}.${sanitizeForDisplay(T, 64)}`, w, C(T));
            (r.push(...R.errors), a.push(...R.warnings));
          }
        }
      }
    }
  }
  if (isPlainObject(l)) {
    let p = l,
      y = c.rawCandidate ?? p;
    if (
      (reportUnknownFields(
        y,
        new Set(Object.keys(PluginManifestSchema().shape)),
        "",
        a,
        MARKETPLACE_ENTRY_EXTRA_KEYS,
        LISTING_FIELD_KEYS,
      ),
      "capabilities" in y)
    ) {
      let index = a.findIndex((b) => b.path === "capabilities"),
        v = {
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
    if ("metadata" in y && !isPlainObject(y.metadata))
      a.push({
        path: "metadata",
        message: `'metadata' must be a free-form object; got ${getReceivedType(y.metadata)}. It will be ignored at load time.`,
      });
    if ("binaries" in p)
      if (isPlainObject(p.binaries)) {
        let h = parsePluginBinaries(p.binaries) ?? {},
          v = 0;
        for (let [C, S] of Object.entries(p.binaries)) {
          if (
            BINARY_BASENAME_RE.test(C) &&
            typeof S === "object" &&
            S !== null &&
            typeof S.sha256 === "string" &&
            SHA256_HEX_RE.test(S.sha256)
          ) {
            v++;
            continue;
          }
          if (!Object.hasOwn(h, C))
            a.push({
              path: `binaries.${C}`,
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
        : void 0;
    if (h)
      (h.severity === "error" ? r : a).push({
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
    success: r.length === 0,
    errors: r,
    warnings: a,
    filePath: e,
    fileType: "plugin",
    ...(i.length > 0 && { notes: i }),
  };
}
//@ chunk-85kmkm1x.js:23893-24163 layout
var RECORDABLE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/,
  Un = new Set(["org", "org-provisioned", "unknown"]),
  UNRECORDABLE_NAME = "UNRECORDABLE_NAME",
  PLUGIN_ID_PART_RULE =
    'Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit.';
//@ chunk-85kmkm1x.js:24163-24261 layout
function hiddenCharacterNote(e) {
  return sanitizeForDisplay(e, e.length) === e ? "" : " The name holds a character that is not shown here.";
}
//@ chunk-85kmkm1x.js:24261-24305 layout
async function validateMarketplaceForDisplay(e) {
  return sanitizeValidationResult(await validateMarketplaceManifest(e));
}
/**
 * 校验 marketplace.json：schema、保留名、每个插件条目来源与路径、重复名字等。
 */
//@ chunk-85kmkm1x.js:24305-34228 fingerprint = validateMarketplaceManifest (0.392)
async function validateMarketplaceManifest(filePath) {
  let n = [],
    s = [],
    absolutePath = pathModule.resolve(filePath),
    a;
  try {
    a = await readFile(absolutePath, { encoding: "utf-8" });
  } catch (error) {
    let code = getErrnoCode(error),
      w;
    if (code === "ENOENT") w = `File not found: ${absolutePath}`;
    else if (code === "EISDIR") w = `Path is not a file: ${absolutePath}`;
    else w = `Failed to read file: ${errorMessage(error)}`;
    return {
      success: !1,
      errors: [{ path: "file", message: w, code: code }],
      warnings: [],
      filePath: absolutePath,
      fileType: "marketplace",
    };
  }
  let i;
  try {
    i = jsonParse(Wo(a));
  } catch (error) {
    return {
      success: !1,
      errors: [{ path: "json", message: `Invalid JSON syntax: ${errorMessage(error)}` }],
      warnings: [],
      filePath: absolutePath,
      fileType: "marketplace",
    };
  }
  let l = [],
    c = isPlainObject(i) && isPlainObject(i.metadata) ? i.metadata.pluginRoot : void 0,
    m = normalizePluginRoot(c),
    p = isPlainObject(i) && typeof i.name === "string" && isOfficialMarketplaceName(i.name);
  if (i && typeof i === "object") {
    let f = i;
    if (Array.isArray(f.plugins))
      ((l = f.plugins),
        f.plugins.forEach((plugin, w) => {
          if (plugin && typeof plugin === "object" && "source" in plugin) {
            let source = plugin.source;
            if (typeof source === "string")
              checkPathTraversal(source, `plugins[${w}].source`, n, marketplaceSourceHint(source));
            if (isBareSourceName(source) && m === void 0)
              n.push({
                path: `plugins[${w}].source`,
                message:
                  c === void 0
                    ? `Bare source name "${source}" requires metadata.pluginRoot. Use "./relative/path", or set metadata.pluginRoot (e.g. "./plugins") to allow bare names.`
                    : typeof c === "string"
                      ? `Bare source name "${source}" cannot resolve: metadata.pluginRoot ("${c}") must be a relative path inside the marketplace (e.g. "./plugins").`
                      : `Bare source name "${source}" cannot resolve: metadata.pluginRoot must be a relative path inside the marketplace (e.g. "./plugins").`,
              });
            if (source && typeof source === "object" && "path" in source && typeof source.path === "string")
              checkPathTraversal(source.path, `plugins[${w}].source.path`, n);
          }
        }));
  }
  let optional = PluginRelevanceSchema()
      .extend({
        topic: o().min(1).max(64).optional(),
        signals: PluginRelevanceSignalsSchema()
          .extend({
            cli: A(o().min(1).max(64)).max(10).optional(),
            hosts: A(
              o()
                .min(1)
                .max(128)
                .refine(
                  (f) => /^[a-z0-9.-]+$/.test(f),
                  "must be a lowercase bare hostname (no scheme, port, or path)",
                ),
            )
              .max(20)
              .optional(),
            filesRead: A(
              o()
                .min(1)
                .max(256)
                .refine(
                  (f) => !f.includes("\\"),
                  'must use forward slashes (e.g. "**/*.tf"), not backslashes',
                ),
            )
              .max(10)
              .optional(),
            manifestDeps: A(
              u({
                file: o().min(1).max(256).refine(isValidRegex, "must be a valid regular expression"),
                pattern: o().min(1).max(256).refine(isValidRegex, "must be a valid regular expression"),
              }),
            )
              .min(1)
              .max(10)
              .optional(),
            cwd: A(
              o()
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
      .optional(),
    refine = PluginMarketplaceEntrySchema()
      .extend({ relevance: Ka((f) => (isPlainObject(f) ? f : void 0), optional) })
      .refine((f) => typeof f.source === "string" || f.source.source !== "unsupported", {
        message: "source.source: 'unsupported' is a parse-time placeholder and cannot be authored",
      }),
    result = PluginMarketplaceSchema()
      .extend({ plugins: A(refine), renames: pe(o(), o().nullable()).optional() })
      .safeParse(applyMarketplacePluginRoot(i));
  if (!result.success) n.push(...formatZodErrors(result.error));
  if (result.success && result.data.renames) {
    let f = new Set(result.data.plugins.map((plugin) => plugin.name));
    for (let T of Object.keys(result.data.renames)) {
      let w = resolvePluginRename(T, result.data.renames, f);
      if (w?.kind === "unresolved")
        n.push({
          path: `renames.${T}`,
          message: `chain does not resolve (${w.reason}) \u2014 target must be a name in plugins[], a key in renames, or null`,
        });
      else if (w?.kind === "renamed" && !PluginIdSchema().safeParse(`${w.to}@placeholder`).success)
        n.push({
          path: `renames.${T}`,
          message: `target "${w.to}" is not a valid plugin name (PluginIdSchema)`,
        });
    }
  }
  if (isPlainObject(i)) {
    let f = i;
    if (
      (reportUnknownFields(f, new Set(Object.keys(PluginMarketplaceSchema().shape)), "", s),
      typeof f.name === "string" && f.name)
    ) {
      let w = isValidPluginIdSegment(f.name);
      if (!w)
        n.push({
          path: "name",
          code: UNRECORDABLE_NAME,
          message:
            `Claude Code cannot install plugins from marketplace "${sanitizeForDisplay(f.name, 64)}". ${PLUGIN_ID_PART_RULE} Change the marketplace's "name".` +
            hiddenCharacterNote(f.name),
        });
      if (Un.has(f.name.toLowerCase()))
        s.push({
          path: "name",
          message: `Marketplace name "${f.name}" is reserved in Claude Desktop. Claude Code accepts it, but the Claude Desktop managed marketplace sync (allowedPluginMarketplaces) will reject the whole marketplace.`,
        });
      else if (!RECORDABLE_NAME_RE.test(f.name))
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
      let w = new Set(Object.keys(PluginMarketplaceEntrySchema().shape)),
        R = new Set(Object.keys(PluginRelevanceSchema().shape)),
        j = new Set(Object.keys(PluginRelevanceSignalsSchema().shape));
      f.plugins.forEach((plugin, _) => {
        if (!isPlainObject(plugin)) return;
        let M = plugin;
        if ((reportUnknownFields(M, w, `plugins[${_}]`, s), typeof M.name === "string" && M.name)) {
          let U = isValidPluginIdSegment(M.name);
          if (!U)
            n.push({
              path: `plugins[${_}].name`,
              code: UNRECORDABLE_NAME,
              message:
                `Claude Code cannot install plugin "${sanitizeForDisplay(M.name, 64)}". ${PLUGIN_ID_PART_RULE} Change this entry's "name".` +
                hiddenCharacterNote(M.name),
            });
          if (!RECORDABLE_NAME_RE.test(M.name))
            s.push({
              path: `plugins[${_}].name`,
              message:
                `Plugin name "${M.name}" is not accepted by Claude Desktop (letters, digits, ".", "_", "-"; must start alphanumeric; max 128 chars). ` +
                (U ? "Claude Code accepts it, but the " : "The ") +
                "Claude Desktop managed marketplace sync (allowedPluginMarketplaces) will drop this entry." +
                hiddenCharacterNote(M.name),
            });
          let X = p ? void 0 : checkReservedPluginName(M.name);
          if (X) (X.severity === "error" ? n : s).push({ path: `plugins[${_}].name`, message: X.message });
        }
        let experimental = M.experimental;
        if (isPlainObject(experimental))
          reportUnknownFields(experimental, MANIFEST_FIELD_HINTS, `plugins[${_}].experimental`, s);
        else if (experimental !== void 0)
          s.push({
            path: `plugins[${_}].experimental`,
            message: `'experimental' must be an object containing component declarations; got ${getReceivedType(experimental)}. It will be ignored at load time.`,
          });
        let relevance = M.relevance;
        if (isPlainObject(relevance)) {
          reportUnknownFields(relevance, R, `plugins[${_}].relevance`, s);
          let signals = relevance.signals;
          if (isPlainObject(signals)) reportUnknownFields(signals, j, `plugins[${_}].relevance.signals`, s);
        } else if (relevance !== void 0)
          s.push({
            path: `plugins[${_}].relevance`,
            message: `'relevance' must be an object containing topic and signals; got ${getReceivedType(relevance)}. It will be ignored at load time.`,
          });
        let metadata = M.metadata;
        if (metadata !== void 0 && !isPlainObject(metadata))
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
      s.push({ path: "plugins", message: "Marketplace has no plugins defined" });
    if (marketplace.plugins)
      marketplace.plugins.forEach((plugin, w) => {
        if (marketplace.plugins.filter((plugin_2) => plugin_2.name === plugin.name).length > 1)
          n.push({
            path: `plugins[${w}].name`,
            message: `Duplicate plugin name "${plugin.name}" found in marketplace`,
          });
        let j = typeof plugin.source === "object" && plugin.source.source === "archive";
        if (j && hasHeadersHelper(plugin) && plugin.strict !== !1)
          n.push({
            path: `plugins[${w}].headersHelper`,
            message: `Plugin "${printablePluginName(plugin.name)}" sets headersHelper but is not "strict": false. An entry with headersHelper must inline its full manifest (strict: false, with commands/agents/hooks/mcpServers declared in the entry) so users can review what it ships before the command runs; Claude Code refuses to run the helper otherwise.`,
          });
        if ((plugin.headers !== void 0 || hasHeadersHelper(plugin)) && !j)
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
  let C = PluginMarketplaceEntrySchema(),
    manifestDir = pathModule.dirname(absolutePath),
    x = pathModule.basename(manifestDir) === ".claude-plugin" ? pathModule.dirname(manifestDir) : manifestDir;
  for (let [f, T] of l.entries()) {
    let safeParse = C.safeParse(resolveBareSourceUnderPluginRoot(T, m));
    if (!safeParse.success) continue;
    let R = safeParse.data,
      source = R.source;
    if (!isRelativeSourcePath(source) || isAbsoluteOrUnsafePath(source)) continue;
    let joined = pathModule.join(x, source),
      joined_2 = pathModule.join(joined, ".claude-plugin", "plugin.json"),
      relativePath = pathModule.relative(x, joined_2),
      K = await readPluginFileSafe(x, pathModule.join(joined, ".claude-plugin"));
    if (K === "not-a-directory") {
      n.push({
        path: `plugins[${f}] plugin.json \u2192 file`,
        code: "ENOTDIR",
        message: `A path component of ${relativePath} is not a directory, so the file cannot be read. The entry will fail to load at install time.`,
      });
      continue;
    }
    if (K === "refused") {
      s.push({
        path: `plugins[${f}].source`,
        message:
          `Local source "${source}" is or traverses a symlink, so ${relativePath} was not read \u2014 ` +
          "validation never follows one. Install dereferences symlinks that stay inside the marketplace, so this entry still loads. Validate the real path separately.",
      });
      continue;
    }
    if (K !== "ok") continue;
    let V;
    try {
      V = await getMcpAuthCache(joined_2);
    } catch (error) {
      n.push({
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
        let W = jsonParse(Wo(content));
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
          p ? { kind: "anthropic" } : { kind: "entry", entryName: R.name },
        ),
      ),
      X = `plugins[${f}] plugin.json \u2192 `;
    for (let error of parsed.errors) n.push({ ...error, path: X + error.path });
    for (let warning of parsed.warnings) s.push({ ...warning, path: X + warning.path });
  }
  return { success: n.length === 0, errors: n, warnings: s, filePath: absolutePath, fileType: "marketplace" };
}
/**
 * 把校验信息里的用户输入清洗成可显示的单行（去控制字符、截断）。
 */
//@ chunk-85kmkm1x.js:34228-34268 layout
function sanitizeForDisplay(e, n) {
  return Dr(truncateWithCount(stripCombiningRepeated(e), n));
}
/**
 * 校验结果展示前的清洗：路径截断到 200、消息截断到 1000 并去掉不可见字符。
 */
//@ chunk-85kmkm1x.js:34268-34677 layout
function sanitizeValidationResult(e) {
  return {
    ...e,
    errors: e.errors.map((error) => ({
      ...error,
      path: sanitizeForDisplay(error.path, 200),
      message: sanitizeForDisplay(error.message, 1000),
    })),
    warnings: e.warnings.map((warning) => ({
      path: sanitizeForDisplay(warning.path, 200),
      message: sanitizeForDisplay(warning.message, 1000),
    })),
    ...(e.notes !== void 0 && { notes: e.notes.map((note) => sanitizeForDisplay(note, 1000)) }),
    ...(e.gatingHooks !== void 0 && {
      gatingHooks: e.gatingHooks.map((gatingHook) => ({
        module: sanitizeForDisplay(gatingHook.module, 200),
        pattern: sanitizeForDisplay(gatingHook.pattern, 200),
        hook: sanitizeForDisplay(gatingHook.hook, 1000),
        hasCatch: gatingHook.hasCatch,
      })),
    }),
  };
}
/**
 * 校验命令/代理/技能 markdown 文件的 frontmatter（必需字段、未知键、YAML 错误）。
 */
//@ chunk-85kmkm1x.js:34677-37397 fingerprint = validateComponentFile (0.696)
function validateComponentFile(e, n, s, r) {
  let a = [],
    i = [],
    l = r === "project" && s === "agent",
    match = Wo(n).match(FRONTMATTER_REGEX);
  if (!match) {
    if (!l)
      i.push({
        path: "frontmatter",
        message:
          "No frontmatter block found. Add YAML frontmatter between --- delimiters at the top of the file to set description and other metadata.",
      });
    return { success: !0, errors: a, warnings: i, filePath: e, fileType: s };
  }
  let m = parseYamlLenient(match[1] || "");
  if (!m.ok) {
    let v =
      s !== "agent"
        ? `At runtime this ${s} loads with empty metadata (all frontmatter fields silently dropped).`
        : r === "project"
          ? "At runtime this agent does not load at all \u2014 with no frontmatter " +
            "name it is treated as a co-located reference document and skipped."
          : "At runtime this agent loads with its name taken from the filename and every other frontmatter field silently dropped.";
    return (
      a.push({
        path: "frontmatter",
        message: `YAML frontmatter failed to parse: ${sanitizeForDisplay(m.error, 200)}. ` + v,
      }),
      { success: !1, errors: a, warnings: i, filePath: e, fileType: s }
    );
  }
  let p = m.value;
  if (p !== null && !isPlainObject(p))
    return (
      a.push({
        path: "frontmatter",
        message: `Frontmatter must be a YAML mapping (key: value pairs), got ${Array.isArray(p) ? "an array" : typeof p}.`,
      }),
      { success: !1, errors: a, warnings: i, filePath: e, fileType: s }
    );
  let y = p ?? {};
  if (y.description !== void 0) {
    let description = y.description;
    if (
      typeof description !== "string" &&
      typeof description !== "number" &&
      typeof description !== "boolean" &&
      description !== null
    )
      a.push({
        path: "description",
        message: `description must be a string, got ${Array.isArray(description) ? "array" : typeof description}. At runtime this value is dropped.`,
      });
  } else if (!l || typeof y.name === "string")
    i.push({
      path: "description",
      message: `No description in frontmatter. A description helps users and Claude understand when to use this ${s}.`,
    });
  if (y.name !== void 0 && y.name !== null && typeof y.name !== "string")
    a.push({ path: "name", message: `name must be a string, got ${typeof y.name}.` });
  let at = y["allowed-tools"];
  if (at !== void 0 && at !== null) {
    if (typeof at !== "string" && !Array.isArray(at))
      a.push({
        path: "allowed-tools",
        message: `allowed-tools must be a string or array of strings, got ${typeof at}.`,
      });
    else if (Array.isArray(at) && at.some((v) => typeof v !== "string"))
      a.push({ path: "allowed-tools", message: "allowed-tools array must contain only strings." });
  }
  if (s === "skill" || s === "command") {
    let v = !1;
    ((C) => {
      if (C == null || isPlainObject(C)) return;
      ((v = !0),
        i.push({
          path: "metadata",
          message: `'metadata' must be a mapping (key: value pairs); got ${Array.isArray(C) ? "array" : typeof C}. It is dropped at load time.`,
        }));
    })(y.metadata);
  }
  if (s === "skill" || s === "command") {
    let sh = y.shell;
    if (sh !== void 0 && sh !== null)
      if (typeof sh !== "string")
        a.push({ path: "shell", message: `shell must be a string, got ${typeof sh}.` });
      else {
        let normalized = sh.trim().toLowerCase();
        if (normalized !== "bash" && normalized !== "powershell")
          a.push({
            path: "shell",
            message: `shell must be 'bash' or 'powershell', got '${sanitizeForDisplay(sh, 64)}'.`,
          });
      }
  }
  return { success: a.length === 0, errors: a, warnings: i, filePath: e, fileType: s };
}
/**
 * 安全读取 hooks 文件（不跟随链接、限大小），解析 JSON 并按 schema 校验 hooks 与 modules；对声明的 hooks 模块 检查加载、注册、渲染匹配器、辅助调用等，返回校验结果与模块列表。
 */
//@ chunk-85kmkm1x.js:37397-42877 layout
async function validateHooksFile(e, n) {
  let s = { result: { success: !0, errors: [], warnings: [], filePath: e, fileType: "hooks" }, modules: [] },
    r = (w) => ({
      result: directoryWarningResult(
        e,
        "hooks",
        `${w} \u2014 hooks are read without following symlinks and are capped at ` +
          `${ONE_MIB} bytes. The plugin loader has neither limit and fails the whole plugin on bad hook config, so validate the real file separately.`,
      ),
      modules: [],
    }),
    dir = pathModule.dirname(e),
    i = await readPluginFileSafe(pathModule.dirname(dir), dir);
  if (i === "refused") return r("The hooks directory is a symlink and was not read");
  if (i !== "ok") return s;
  let l;
  try {
    l = await getMcpAuthCache(e);
  } catch (error) {
    return {
      result: {
        success: !1,
        errors: [{ path: "file", message: `Failed to read file: ${errorMessage(error)}` }],
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
  let content = l.content,
    m;
  try {
    m = jsonParse(content);
  } catch (error) {
    return {
      result: {
        success: !1,
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
        success: !1,
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
        : { notes: [], unloadableGuards: [] },
    mapped = p.notes.map((note) => ({ path: "hooks", message: `${note} at runtime` }));
  if (p.unloadableGuards.length > 0)
    return {
      result: {
        success: !1,
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
  let safeParse = PluginHooksSchema().safeParse(m);
  if (!safeParse.success)
    return {
      result: {
        success: !1,
        errors: formatZodErrors(safeParse.error),
        warnings: mapped,
        filePath: e,
        fileType: "hooks",
      },
      modules: [],
    };
  let v = [];
  for (let w of findUnquotedHookPlaceholders(safeParse.data.hooks ?? {}))
    v.push({
      path: `hooks.${w.event}`,
      message: `Shell command uses ${w.placeholders.join(", ")} without quotes: ${sanitizeForDisplay(w.command, 200)}. If the expanded path contains a space the command can split into several words and fail. Wrap the placeholder in double quotes, or use exec form: {"command": "<executable>", "args": ["\${CLAUDE_PLUGIN_ROOT}/..."]}.`,
    });
  let b = [],
    C = [],
    S = [],
    x = safeParse.data.modules ?? [],
    f = x.length > 0 ? await readPluginContractInfo(n) : ne,
    nouns = f.nouns;
  for (let w of x) {
    let resolved = pathModule.resolve(dir, w),
      relativePath = pathModule.relative(n, resolved);
    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${pathModule.sep}`) ||
      pathModule.resolve(relativePath) === relativePath ||
      W9e(w)
    ) {
      b.push({ path: `modules.${w}`, message: "The module path leaves the plugin directory" });
      continue;
    }
    try {
      let {
          scan: scan,
          registrations: registrations,
          renderMatchers: renderMatchers,
          helperCalls: helperCalls,
          catchReads: catchReads,
        } = await scanHooksModuleForValidation(resolved, n, pathModule.basename(n)),
        J = registrations.length === 0 ? "nothing" : registrations.join(", "),
        U = [
          ...scan.calls.map((E) => {
            let I = helperCalls.get(E);
            return I === void 0 ? `$.${E}` : `$.${E} (via ${I.join(", ")})`;
          }),
          ...(scan.nextTo ?? []).map((E) => `next.to:${E}`),
        ],
        X = U.length === 0 ? "nothing on $" : U.join(", "),
        filtered = catchReads.filter((E) => E.isOwnCommand),
        W = [];
      if (filtered.length > 0) {
        let E = getHostState();
        try {
          if (!E.shippedTablesFillFailed) {
            (initBuiltinPlugins(), initBundledSkills());
            let I = firstPartyCommandNameCheck(),
              G = (Y) => I(Y) || MANIFEST_FIELD_HINT_SET.has(foldName(Y));
            (W.push(...filtered.filter((Y) => !Y.commands.some(G))),
              mapped.push(
                ...uniq(filtered.flatMap((Y) => Y.commands))
                  .filter(G)
                  .map((Y) => ({
                    path: `modules.${w}`,
                    message: `"/${sanitizeForDisplay(Y, 200)}" is a name Claude Code ships: $.command.register refuses it and the hook that calls it is skipped`,
                  })),
              ));
          }
        } catch (error) {
          ((E.shippedTablesFillFailed = !0),
            logForDebugging(
              `plugin validate: shipped command names unread, every command.run hook is listed as a gate: ${errorMessage(error)}`,
              { level: "error" },
            ));
        }
      }
      let filtered_2 = catchReads.filter((E) => !W.includes(E) && hasToolSite(E.pattern));
      (C.push(
        `${w} hooks: ${J}`,
        ...W.map((E) => `${w} answers its own command: ${E.registration}`),
        ...filtered_2.map(
          ({ registration: registration, hasCatch: hasCatch }) =>
            `${w} gating hook ${hasCatch ? "with" : "without"} .catch: ` + registration,
        ),
        `${w} calls: ${X}`,
      ),
        S.push(
          ...filtered_2.map(({ registration: registration, pattern: pattern, hasCatch: hasCatch }) => ({
            module: w,
            pattern: pattern,
            hook: registration,
            hasCatch: hasCatch,
          })),
        ));
      for (let { registration: registration, matcher: matcher } of renderMatchers) {
        let G = adviseUiRenderMatcher(matcher);
        if (G !== void 0) mapped.push({ path: `modules.${w}`, message: `on ${registration}: ${G}` });
      }
      let any = scan.hooks.some((hook) => matchesEventPattern(hook, "engine.create"));
      if (nouns.length > 0 && !any)
        mapped.push({
          path: `modules.${w}`,
          message: `the manifest's types contract declares ${nouns.map((E) => `$.${E}`).join(", ")} on EngineInterface, but ${w} registers no hook on engine.create, so the plugin never adds ${plural(nouns.length, "it", "them")} to $`,
        });
      if (scan.env !== void 0) {
        let E = (I) => (I.length === 0 ? "nothing" : I.join(", "));
        C.push(`${w} env writes: ${E(scan.env.writes)}`, `${w} env reads: ${E(scan.env.reads)}`);
      }
      let De = kqs(scan);
      if (De !== void 0) C.push(`${w} hooks telemetry for: ${De}`);
      let ze = telemetryStreamRefusal(scan, { isBuiltin: !1 });
      if (ze !== void 0) b.push({ path: `modules.${w}`, message: ze });
      if (scan.state !== void 0) {
        let E = (se) => (se.length === 0 ? "nothing" : se.map((Pt) => stateAtomKey(Pt)).join(", "));
        C.push(`${w} state writes: ${E(scan.state.writes)}`, `${w} state reads: ${E(scan.state.reads)}`);
        let I = f.name ?? pathModule.basename(n),
          G = (se) => se.plugin !== I,
          { reads: reads, writes: writes } = scan.state,
          Ce = checkContractWrites({
            names: f.isRefused ? { reads: reads.filter(G), writes: writes.filter(G) } : scan.state,
            owner: I,
            declared: f.state,
            contract: f.conventional,
            refusal: f.refusal,
            others: await collectLoadedContractState(n),
          });
        if (
          (b.push(...Ce.problems.map((problem) => ({ path: `modules.${w}`, message: problem }))),
          Ce.unchecked.length > 0)
        )
          C.push(
            `${w} state of other plugins, not checked (run validate in a session with them enabled): ${Ce.unchecked.join(", ")}`,
          );
      }
      let Ve = await loadSurfaceModules(scan.clients, n, pathModule.basename(n));
      if (Ve !== void 0) C.push(`${w} surface modules: ${Ve.map((E) => E.module).join(", ")}`);
    } catch (error) {
      b.push({ path: `modules.${w}`, message: sanitizeForDisplay(errorMessage(error), 400) });
    }
  }
  return {
    result: {
      success: b.length === 0,
      errors: b,
      warnings: [...mapped, ...v],
      filePath: e,
      fileType: "hooks",
      ...(C.length > 0 && { notes: C }),
      ...(S.length > 0 && { gatingHooks: S }),
    },
    modules: x,
  };
}
/**
 * 契约读取结果转为错误或说明（声明的名词与状态）。
 */
//@ chunk-85kmkm1x.js:42877-43333 layout
function contractCheckResult(e, { relPath: relPath, field: field }) {
  if (e === void 0) return { errors: [], notes: [] };
  if (e.kind === "refused")
    return { errors: e.problems.map((problem) => ({ path: field, message: problem })), notes: [] };
  let r =
      `types ${relPath} declares on $: ` +
      (e.nouns.length > 0
        ? e.nouns.map((noun) => `$.${noun}`).join(", ")
        : "nothing (no EngineInterface member)"),
    flattened = e.state.flatMap(({ plugin: plugin, keys: keys }) =>
      keys.map((c) => stateAtomKey({ plugin: plugin, key: c })),
    );
  return {
    errors: [],
    notes: flattened.length > 0 ? [r, `types ${relPath} declares state: ${flattened.join(", ")}`] : [r],
  };
}
//@ chunk-85kmkm1x.js:43333-43420 layout
var ne = { name: void 0, nouns: [], state: [], isRefused: !1, conventional: void 0, refusal: void 0 };
/**
 * 读插件 types 契约（显式声明或约定位置）。
 */
//@ chunk-85kmkm1x.js:43420-44130 layout
async function readPluginContractInfo(e) {
  let n = await oe(pathModule.join(e, ".claude-plugin", "plugin.json")),
    s = n === void 0 ? void 0 : ae(Wo(n)),
    r = typeof s?.name === "string" ? s.name : void 0,
    a = s?.types;
  if (s === void 0 || (a !== void 0 && typeof a !== "string")) return { ...ne, name: r };
  let i = await loadPluginContract(a, e, pathModule.basename(e));
  if (i === void 0) return { ...ne, name: r };
  if (a !== void 0)
    return i.kind === "read"
      ? { ...ne, name: r, nouns: i.nouns, state: i.state }
      : { ...ne, name: r, isRefused: !0 };
  let l = `the types contract at ${ZGt}`;
  if (i.kind === "read") return { ...ne, name: r, state: i.state, conventional: l };
  let c = i.problems.length - 1;
  return {
    ...ne,
    name: r,
    conventional: l,
    refusal: sanitizeForDisplay(
      `the file at ${ZGt} could not be taken as the types contract (${i.problems[0] ?? "refused"}${c > 0 ? `, and ${c} more` : ""})`,
      1000,
    ),
  };
}
/**
 * 已加载的其他插件契约声明的状态键。
 */
//@ chunk-85kmkm1x.js:44130-44472 layout
async function collectLoadedContractState(e) {
  let n = getPluginRegistry(),
    s = n.pluginLoadCacheOnly ?? n.pluginLoad;
  if (s === void 0) return;
  let r;
  try {
    r = (await s).enabled;
  } catch {
    return;
  }
  let a = [];
  for (let i of r) {
    let types = i.manifest.types;
    if (!((types !== void 0 || i.isBuiltin !== !0) && pathModule.resolve(i.path) !== pathModule.resolve(e)))
      continue;
    let m = await loadPluginContract(types, i.path, i.name);
    if (m?.kind === "read") a.push(...m.state);
  }
  return a;
}
/**
 * 插件的 hooks 文件路径（默认 hooks/hooks.json 与 manifest.hooks）。
 */
//@ chunk-85kmkm1x.js:44472-44900 layout
async function listHooksFilePaths(e) {
  let n = [pathModule.join(e, "hooks", "hooks.json")];
  if (!(await FF(pathModule.join(e, ".claude-plugin")))) return n;
  let s = await oe(pathModule.join(e, ".claude-plugin", "plugin.json")),
    r = s === void 0 ? void 0 : ae(Wo(s))?.hooks,
    a = Array.isArray(r) ? r : [r];
  for (let i of a) {
    if (typeof i !== "string") continue;
    let resolved = pathModule.resolve(e, i),
      relativePath = pathModule.relative(e, resolved);
    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${pathModule.sep}`) ||
      pathModule.resolve(relativePath) === relativePath ||
      W9e(i)
    )
      continue;
    if (!n.includes(resolved)) n.push(resolved);
  }
  return n;
}
/**
 * 逐个校验 hooks 文件，多个文件都声明模块时报错。
 */
//@ chunk-85kmkm1x.js:44900-45366 layout
async function validateAllHooksFiles(e) {
  let n = [],
    s = [];
  for (let a of await listHooksFilePaths(e)) {
    let { result: i, modules: modules } = await validateHooksFile(a, e);
    if (modules.length > 0) s.push(a);
    if (i.errors.length > 0 || i.warnings.length > 0 || i.notes !== void 0) n.push(i);
  }
  let [, r] = s;
  if (r !== void 0) {
    let mapped = s.map((i) => pathModule.relative(e, i));
    n.push({
      success: !1,
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
  ]),
  USER_CONFIG_PLACEHOLDER_PATTERN = /\$\{user_config\.([^}$]+)\}/g,
  xt = /\$\{[^}$]+\}/,
  Me = 16,
  es = 8192,
  SECRET_VALUE_PATTERNS = [
    /\bsk-[A-Za-z0-9_-]{16,}/,
    /\bgh[opsur]_[A-Za-z0-9]{30,}/,
    /\bgithub_pat_[A-Za-z0-9_]{30,}/,
    /\bxox[abeprs]-[A-Za-z0-9-]{10,}/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bglpat-[A-Za-z0-9_-]{20,}/,
    /\bAIza[0-9A-Za-z_-]{35}\b/,
    /(?:^|[^A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/,
  ],
  SECRET_KEY_NAME_PATTERN = /authorization|api[-_]?key|token|secret|password|credential/i,
  PLACEHOLDER_VALUE_PATTERN =
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
  if (n.length > es || xt.test(n) || PLACEHOLDER_VALUE_PATTERN.test(n)) return !1;
  let trimmed = n.trim();
  if (SECRET_VALUE_PATTERNS.some((a) => a.test(trimmed))) return !0;
  if (!SECRET_KEY_NAME_PATTERN.test(e)) return !1;
  let r = trimmed.match(/^(?:Bearer|Basic|Token|Bot)\s+(\S+)$/i)?.[1] ?? trimmed;
  return r.length >= 20 && !/\s/.test(r) && shannonEntropy(r) >= 3;
}
//@ chunk-85kmkm1x.js:46368-46391 layout
var as = /\$\{[^}$]+\}/g;
//@ chunk-85kmkm1x.js:46391-46450 layout
function be(e, n) {
  return URL.parse(e.replace(as, n)) ?? void 0;
}
/**
 * 远程 MCP url 用 http/ws 到非回环主机时的警告。
 */
//@ chunk-85kmkm1x.js:46450-46990 layout
function insecureRemoteUrlWarning(e) {
  let n = be(e, "probe-a.invalid") ?? be(e, "1"),
    s = be(e, "probe-b.invalid") ?? be(e, "2");
  if (!n || !s || n.hostname !== s.hostname) return;
  let r = n.protocol === "http:" ? "http" : n.protocol === "ws:" ? "ws" : void 0;
  if (r === void 0) return;
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
/**
 * 列出 MCP 服务器配置中可能含占位符的字符串字段。
 */
//@ chunk-85kmkm1x.js:46990-47492 layout
function listMcpStringFields(e) {
  let n = [],
    s = [],
    r;
  if (e.type === void 0 || e.type === "stdio") {
    if ((s.push("command"), (r = "env"), Array.isArray(e.args))) {
      for (let [i, l] of e.args.entries())
        if (typeof l === "string") n.push({ field: `args[${i}]`, value: l });
    }
  } else if (_e(e.type)) (s.push("url", "headersHelper"), (r = "headers"));
  for (let i of s) {
    let l = e[i];
    if (typeof l === "string") n.push({ field: i, value: l });
  }
  let a = r === void 0 ? void 0 : e[r];
  if (r !== void 0 && isPlainObject(a)) {
    for (let [i, l] of Object.entries(a)) if (typeof l === "string") n.push({ field: `${r}.${i}`, value: l });
  }
  return n;
}
//@ chunk-85kmkm1x.js:47492-47569 layout
function _e(e) {
  return e === "http" || e === "streamable-http" || e === "sse" || e === "ws";
}
/**
 * 检查 MCP 配置中 ${user_config.*} 引用与 url/directory 问题。
 */
//@ chunk-85kmkm1x.js:47569-49680 layout
function checkMcpUserConfigRefs(e, n, s) {
  let r = [],
    a = [];
  if (!isPlainObject(n)) return { errors: r, warnings: a };
  for (let { field: field, value: l } of listMcpStringFields(n)) {
    let c = new Set([...l.matchAll(USER_CONFIG_PLACEHOLDER_PATTERN)].map((p) => p[1]));
    if (c.size === 0) continue;
    let m = `${e}.${sanitizeForDisplay(field, 64)}`;
    if (field === "headersHelper") {
      r.push({
        path: m,
        message:
          'headersHelper references ${user_config.*}. Options are never substituted into headersHelper: the plugin loader refuses the server when the plugin declares any options (the value would be spliced into a shell command), and otherwise the literal text reaches the shell. Read the value inside the helper script instead (for example from a variable set in the server\'s "env" block).',
      });
      continue;
    }
    if (s === null) continue;
    for (let p of c)
      if (p !== void 0 && !s.has(p))
        r.push({
          path: m,
          message: `references \${user_config.${sanitizeForDisplay(p, 64)}}, which plugin.json does not declare under "userConfig" (or in this server's "channels" entry), so on a fresh install it cannot resolve: the loader drops the server or passes the literal text through. Declare the option or fix the key.`,
        });
  }
  if (_e(n.type) && typeof n.url === "string")
    if (n.url.trim() === "") {
      if (typeof n.directory === "string" && n.directory !== "")
        a.push({
          path: `${e}.directory`,
          message: `"directory" is set but url is empty. The key names a directory entry and counts only when this server's url is that entry's url, so plugin directories may reject this plugin. Set url to that entry's url, or remove the "directory" key.`,
        });
    } else if (!xt.test(n.url) && !URL.canParse(n.url))
      r.push({
        path: `${e}.url`,
        message:
          'url is not a valid absolute URL (for example "https://host/path"). The plugin loader marks this server as invalid config and it never connects.',
      });
    else {
      let i = insecureRemoteUrlWarning(n.url);
      if (i) a.push({ path: `${e}.url`, message: i });
    }
  if (_e(n.type) && isPlainObject(n.headers)) {
    for (let [i, l] of Object.entries(n.headers))
      if (typeof l === "string" && looksLikeSecretValue(i, l))
        a.push({
          path: `${e}.headers.${sanitizeForDisplay(i, 64)}`,
          message:
            "header value looks like a literal credential. Everything shipped in a plugin is readable by everyone who installs it; reference a sensitive userConfig option (${user_config.KEY}) or an environment variable (${VAR}) instead of committing the value.",
        });
  }
  return { errors: r, warnings: a };
}
/**
 * 按类型校验单个 MCP 服务器配置（缺 type、未知类型、schema）。
 */
//@ chunk-85kmkm1x.js:49680-50922 layout
function validateMcpServerConfig(e, n, s) {
  if (!isPlainObject(n))
    return [
      {
        path: e,
        message: `server config must be an object (got ${getReceivedType(n)}). The plugin loader silently drops this server at load.`,
      },
    ];
  let a = n.type;
  if (a === void 0 && !("command" in n) && "url" in n)
    return [
      {
        path: `${e}.type`,
        message:
          'server has a "url" but no "type". Remote servers must set "type" to "http" (or "sse" / "ws"); without it the entry is parsed as a stdio server, fails for lacking "command", and is silently dropped at load.',
      },
    ];
  if (a !== void 0 && (typeof a !== "string" || !KNOWN_SERVER_TYPES.has(a))) {
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
    a === void 0 || a === "stdio"
      ? McpStdioServerConfigSchema()
      : a === "http" || a === "streamable-http"
        ? McpHTTPServerConfigSchema()
        : a === "sse"
          ? McpSSEServerConfigSchema()
          : a === "ws"
            ? McpWebSocketServerConfigSchema()
            : void 0
  )?.safeParse(n);
  if (!l)
    return [
      {
        path: e,
        message: `is not a valid "${String(a)}" server config (${formatZodErrors(s)[0]?.message ?? "invalid"}). The plugin loader silently drops this server at load.`,
      },
    ];
  return (l.success ? formatZodErrors(s) : formatZodErrors(l.error)).map((m) => ({
    ...m,
    path: m.path === "root" ? e : `${e}.${m.path}`,
    message: `${m.message}. The plugin loader silently drops this server at load.`,
  }));
}
/**
 * 校验一个 MCP 服务器 JSON 文件。
 */
//@ chunk-85kmkm1x.js:50922-53245 layout
async function validateMcpJsonFile(e, n, s) {
  let a = (b) =>
      directoryWarningResult(
        n,
        "mcp",
        `${b} \u2014 MCP server files are read without following symlinks and are capped at ` +
          `${ONE_MIB} bytes. The plugin loader has neither limit, so validate the real file separately.`,
      ),
    i;
  try {
    i = await getMcpAuthCache(e);
  } catch (error) {
    return {
      success: !1,
      errors: [{ path: "file", message: `Failed to read file: ${errorMessage(error)}` }],
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
      success: !1,
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
  let c = [],
    m = [],
    p = isPlainObject(l) && Boolean(l.mcpServers),
    y = p && isPlainObject(l) ? l.mcpServers : l,
    h = p ? "mcpServers" : "root",
    v;
  if (isPlainObject(y)) v = Object.entries(y);
  else if (Array.isArray(y)) {
    if (((v = y.map((b, C) => [String(C), b])), y.length > 0))
      m.push({
        path: h,
        message: `is an array; the plugin loader keys its servers by array index ("0", "1", ...), and review tooling has misread this shape as 'no servers'. Use an object keyed by server name.`,
      });
  } else
    return {
      success: !1,
      errors: [
        {
          path: h,
          message: `must be an object mapping server names to server configs (got ${getReceivedType(y)}). No servers load from this file.`,
        },
      ],
      warnings: [],
      filePath: n,
      fileType: "mcp",
    };
  for (let [b, C] of v) {
    let S = sanitizeForDisplay(b, 64),
      x = p ? `mcpServers.${S}` : S,
      safeParse = McpServerConfigSchema().safeParse(C);
    if (!safeParse.success) {
      c.push(...validateMcpServerConfig(x, C, safeParse.error));
      continue;
    }
    let T = unaddableTransportReason(safeParse.data.type);
    if (T !== null) {
      c.push({
        path: `${x}.type`,
        message:
          T === "host-only"
            ? `type "${safeParse.data.type}" servers are registered by the host application at runtime and cannot be declared by a plugin. The plugin loader drops this server at load.`
            : 'type "claudeai-proxy" is used only by claude.ai connectors and cannot be declared ' +
              'by a plugin \u2014 declare the server with type "http" instead. The plugin loader drops ' +
              "this server at load.",
      });
      continue;
    }
    let w = checkMcpUserConfigRefs(x, C, s(b));
    (c.push(...w.errors), m.push(...w.warnings));
  }
  return { success: c.length === 0, errors: c, warnings: m, filePath: n, fileType: "mcp" };
}
/**
 * 由 manifest 构造“某 MCP 服务器可用的 userConfig 键集合”查询函数（插件级 + 频道级）。
 */
//@ chunk-85kmkm1x.js:53245-53586 layout = loadChannelUserConfig (0.777)
function buildUserConfigKeyLookup(e) {
  let n = new Set(isPlainObject(e.userConfig) ? Object.keys(e.userConfig) : []),
    s = new Map();
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
    return a === void 0 ? n : { has: (i) => n.has(i) || a.has(i) };
  };
}
//@ chunk-85kmkm1x.js:53586-53622 layout
async function ps(e, n) {
  return buildUserConfigKeyLookup(e);
}
/**
 * 校验插件的 .mcp.json 与 manifest 引用的 MCP 文件。
 */
//@ chunk-85kmkm1x.js:53622-54876 layout
async function validatePluginMcpFiles(e, n) {
  let s,
    joined = pathModule.join(e, ".claude-plugin", "plugin.json");
  if (await FF(pathModule.dirname(joined))) {
    let S = await oe(joined),
      x = S === void 0 ? void 0 : ae(Wo(S));
    if (x)
      s =
        validatePluginManifest_2(x, "plugin-json", {
          pluginName: pathModule.basename(e),
          manifestPath: joined,
        }).rawCandidate ?? x;
  }
  let i = s ? buildUserConfigKeyLookup(s) : void 0,
    l = (S) => (i ? i(S) : null),
    c = [],
    joined_2 = pathModule.join(e, ".mcp.json"),
    p = await validateMcpJsonFile(joined_2, joined_2, l);
  if (p) c.push(p);
  let y = new Set([pathModule.resolve(joined_2)]),
    h = s?.mcpServers,
    v = h === void 0 ? [] : Array.isArray(h) ? h : [h],
    b = Me,
    C = 0;
  for (let S of v) {
    if (typeof S !== "string") continue;
    if (!S.startsWith("./") || !S.endsWith(".json") || S.includes("..")) continue;
    let joined = pathModule.join(e, S),
      resolved = pathModule.resolve(joined);
    if (y.has(resolved)) continue;
    if ((y.add(resolved), b <= 0)) {
      C++;
      continue;
    }
    b--;
    let joined_2 = pathModule.join(e, sanitizeForDisplay(S, 128)),
      w = await readPluginFileSafe(e, pathModule.dirname(joined));
    if (w === "refused") {
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
    if (w !== "ok") continue;
    let R = await validateMcpJsonFile(joined, joined_2, l);
    if (R) c.push(R);
  }
  if (C > 0)
    c.push(
      directoryWarningResult(
        joined,
        "mcp",
        `plugin.json names more than ${Me} MCP server files; ${C} ${plural(C, "file")} past that limit were not examined. The plugin loader reads them all, so validate those files separately.`,
      ),
    );
  return c.filter((S) => S.errors.length > 0 || S.warnings.length > 0);
}
//@ chunk-85kmkm1x.js:54876-55407 fingerprint = collectMarkdown (0.84)
async function collectMarkdown(dir, isSkillsDir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: !0 });
  } catch (error) {
    let code = getErrnoCode(error);
    if (code === "ENOENT" || code === "ENOTDIR") return { files: [], skippedSymlinks: 0 };
    throw error;
  }
  let r = count(entries, (i) => i.isSymbolicLink());
  if (isSkillsDir)
    return {
      files: entries.filter((i) => i.isDirectory()).map((i) => pathModule.join(dir, i.name, "SKILL.md")),
      skippedSymlinks: r,
    };
  let out = [];
  for (let entry of entries) {
    let full = pathModule.join(dir, entry.name);
    if (entry.isDirectory()) {
      let c = await collectMarkdown(full, !1);
      (out.push(...c.files), (r += c.skippedSymlinks));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return { files: out, skippedSymlinks: r };
}
//@ chunk-85kmkm1x.js:55407-55504 fingerprint = validatePluginContents (0.558)
var NO_MANIFEST = "NO_MANIFEST",
  COMPONENT_DIR_KINDS = new Map([
    ["skills", "skill"],
    ["agents", "agent"],
    ["commands", "command"],
  ]);
//@ chunk-85kmkm1x.js:55504-55555 layout
function kt(e, n) {
  return e === "project" || n === "skill";
}
//@ chunk-85kmkm1x.js:55555-55748 layout
async function findComponentDirs(e) {
  let mapped = [...COMPONENT_DIR_KINDS].map(([r, a]) => [a, pathModule.join(e, r)]),
    results = await Promise.all(mapped.map(([, r]) => readPluginFileSafe(e, r)));
  return {
    dirs: mapped.filter((r, a) => results[a] === "ok"),
    refused: mapped.filter((r, a) => results[a] === "refused"),
  };
}
/**
 * 目录是否像一个插件（有 .claude-plugin/，或有含 SKILL.md 的 skills/）。
 */
//@ chunk-85kmkm1x.js:55748-56057 layout
async function looksLikePluginDir(e) {
  if ((await readPluginFileSafe(e, pathModule.join(e, ".claude-plugin"))) === "ok") return !0;
  let joined = pathModule.join(e, "skills"),
    s = await readPluginFileSafe(e, joined);
  if (s === "refused") return !0;
  if (s !== "ok") return !1;
  let { files: files } = await collectMarkdown(joined, !0);
  for (let a of files)
    if (
      await lstat(a).then(
        () => !0,
        (l) => {
          let c = getErrnoCode(l);
          return c !== "ENOENT" && c !== "ENOTDIR";
        },
      )
    )
      return !0;
  return !1;
}
/**
 * 构造“目录级警告”的校验结果。
 */
//@ chunk-85kmkm1x.js:56057-56166 layout
function directoryWarningResult(e, n, s) {
  return { success: !0, errors: [], warnings: [{ path: "directory", message: s }], filePath: e, fileType: n };
}
/**
 * 校验插件目录下所有组件文件（commands/agents/skills…），符号链接目录不读取并给出警告。
 */
//@ chunk-85kmkm1x.js:56166-57630 layout
async function validateComponentDirs(e, n, s) {
  let r = [],
    a = 0,
    i = n.length;
  for (let [l, c] of n)
    r.push(
      directoryWarningResult(
        c,
        l,
        "This directory is a symlink and nothing in it was read \u2014 component " +
          `directories are read without following symlinks. A session loading this ${s === "plugin" ? "plugin" : "project"} does follow it, so validate the real directory separately.`,
      ),
    );
  for (let [l, c] of e) {
    let { files: files, skippedSymlinks: skippedSymlinks } = await collectMarkdown(c, l === "skill"),
      y = kt(s, l) ? skippedSymlinks : 0,
      h = 0,
      v = 0;
    for (let C of files) {
      let S = sanitizeForDisplay(C, 256),
        x;
      try {
        x = await getMcpAuthCache(C);
      } catch (error) {
        r.push({
          success: !1,
          errors: [
            { path: "file", message: `Failed to read: ${sanitizeForDisplay(errorMessage(error), 200)}` },
          ],
          warnings: [],
          filePath: S,
          fileType: l,
        });
        continue;
      }
      if (x.kind !== "ok") {
        if (x.kind === "refused" && kt(s, l)) h++;
        else if (x.kind === "too-large") v++;
        continue;
      }
      a++;
      let f = validateComponentFile(S, x.content, l, s);
      if (f.errors.length > 0 || f.warnings.length > 0) r.push(f);
    }
    i += y + h + v;
    let b =
      "A session loading this " +
      (s === "plugin" ? "plugin" : "directory") +
      " does follow them, so validate the real paths separately.";
    if (y > 0)
      r.push(
        directoryWarningResult(
          c,
          l,
          `${y} ${plural(y, "entry", "entries")} here ${plural(y, "is", "are")} ${plural(y, "a symlink", "symlinks")} and ${plural(y, "was", "were")} not read \u2014 components are read ` +
            `without following symlinks. ${b}`,
        ),
      );
    if (h > 0)
      r.push(
        directoryWarningResult(
          c,
          l,
          `${h} ${plural(h, "component")} here ${plural(h, "was", "were")} not read \u2014 the path is not a ` +
            `regular file (a symlink, a FIFO, a directory). ${b}`,
        ),
      );
    if (v > 0)
      r.push(
        directoryWarningResult(
          c,
          l,
          `${v} ${plural(v, "file")} here ${plural(v, "is", "are")} larger than ${ONE_MIB} bytes and ${plural(v, "was", "were")} not validated.`,
        ),
      );
  }
  return { results: r, scanned: a, skipped: i };
}
//@ chunk-85kmkm1x.js:57630-57686 layout
async function ms(e) {
  return (await validateComponentDirectory(e))?.map(sanitizeValidationResult) ?? null;
}
/**
 * 校验组件目录（或 .claude、插件根下的组件目录）。
 */
//@ chunk-85kmkm1x.js:57686-58831 layout
async function validateComponentDirectory(e) {
  let n = COMPONENT_DIR_KINDS.get(pathModule.basename(e));
  if (n) {
    let dir = pathModule.dirname(e),
      S;
    if (pathModule.basename(dir) === ".claude" && !(await FF(dir)))
      S = "The enclosing .claude directory is a symlink.";
    else if (!(await FF(e))) S = "This path is a symlink.";
    if (S)
      return [
        {
          success: !1,
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
  let joined = pathModule.join(e, ".claude"),
    r = pathModule.basename(e) === ".claude",
    [a, i] = await Promise.all([
      readPluginFileSafe(e, joined),
      r ? Promise.resolve(!1) : looksLikePluginDir(e),
    ]),
    l = r || i ? await findComponentDirs(e) : { dirs: [], refused: [] },
    c = a === "ok" ? await findComponentDirs(joined) : { dirs: [], refused: [] },
    m = r ? "project" : "plugin",
    [p, y] = await Promise.all([
      validateComponentDirs(l.dirs, l.refused, m),
      validateComponentDirs(c.dirs, c.refused, "project"),
    ]),
    h = [...p.results, ...y.results],
    v = p.scanned + y.scanned,
    b = p.skipped + y.skipped;
  if (a === "refused")
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
/**
 * 插件根目录里出现 CLAUDE.md / CLAUDE.local.md 时给出“插件不会加载它们”的警告。
 */
//@ chunk-85kmkm1x.js:58831-59535 layout
async function checkPluginRootClaudeMd(e) {
  let n = [],
    s = new Set(["claude.md", "claude.local.md"]),
    r = [];
  try {
    r = await readdir(e, { withFileTypes: !0 });
  } catch {}
  for (let i of r) {
    if (!i.isFile() || !s.has(i.name.toLowerCase())) continue;
    let c =
      i.name.toLowerCase() === "claude.local.md"
        ? "Remove it from the plugin root."
        : "To ship context with your plugin, use a skill (skills/<name>/SKILL.md) instead.";
    n.push({
      success: !0,
      errors: [],
      warnings: [
        { path: "root", message: `${i.name} at the plugin root is not loaded as project context. ${c}` },
      ],
      filePath: pathModule.join(e, sanitizeForDisplay(i.name, 64)),
      fileType: "plugin",
    });
  }
  n.push(...(await validateBinaryReferences(e)));
  let a = await findComponentDirs(e);
  return (
    n.push(...(await validateComponentDirs(a.dirs, a.refused, "plugin")).results),
    n.push(...(await validateAllHooksFiles(e))),
    n.push(...(await validatePluginMcpFiles(e, r))),
    n.map(sanitizeValidationResult)
  );
}
/**
 * 校验 manifest，可把“无法记录的名字”错误降级为警告。
 */
//@ chunk-85kmkm1x.js:59535-59820 layout
async function validateManifestForDisplay(e, n) {
  let s = sanitizeValidationResult(await validateManifest(e));
  if (n?.unrecordableNames !== "warn") return s;
  let filtered = s.errors.filter((error) => error.code !== UNRECORDABLE_NAME),
    mapped = s.errors
      .filter((error) => error.code === UNRECORDABLE_NAME)
      .map(({ path: path, message: message }) => ({ path: path, message: message }));
  return { ...s, success: filtered.length === 0, errors: filtered, warnings: [...mapped, ...s.warnings] };
}
/**
 * 按路径判断是 plugin.json 还是 marketplace.json（或目录）并调用对应校验。
 */
//@ chunk-85kmkm1x.js:59820-60756 fingerprint = validateManifest (0.971)
async function validateManifest(filePath) {
  let absolutePath = pathModule.resolve(filePath),
    stats = null;
  try {
    stats = await stat(absolutePath);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  if (stats?.isDirectory()) {
    let marketplacePath = pathModule.join(absolutePath, ".claude-plugin", "marketplace.json"),
      marketplaceResult = await validateMarketplaceForDisplay(marketplacePath),
      l = marketplaceResult.errors[0];
    if (!(l?.path === "file" && (l.code === "ENOENT" || l.code === "ENOTDIR"))) return marketplaceResult;
    let pluginPath = pathModule.join(absolutePath, ".claude-plugin", "plugin.json"),
      pluginResult = await validateHooksJsonForDisplay(pluginPath),
      y = pluginResult.errors[0]?.code;
    if (y !== "ENOENT" && y !== "ENOTDIR") return pluginResult;
    return {
      success: !1,
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
        let content = await readFile(absolutePath, { encoding: "utf-8" }),
          parsed = jsonParse(Wo(content));
        if (Array.isArray(parsed.plugins)) return validateMarketplaceForDisplay(filePath);
      } catch (error) {
        if (getErrnoCode(error) === "ENOENT")
          return {
            success: !1,
            errors: [{ path: "file", message: `File not found: ${absolutePath}` }],
            warnings: [],
            filePath: absolutePath,
            fileType: "plugin",
          };
      }
      return validateHooksJsonForDisplay(filePath);
    }
  }
}
/**
 * validate 命令入口：没有 manifest 时尝试按“裸技能目录”解析，否则返回 manifest 与插件根目录。
 */
//@ chunk-85kmkm1x.js:60756-61697 affinity
async function resolveValidateTarget(e) {
  let n = await validateManifestForDisplay(e),
    filePath = n.filePath;
  if (n.errors.some((error) => error.code === NO_MANIFEST)) {
    let p = await ms(filePath);
    return p
      ? { manifest: null, contents: p, resolvedPath: filePath, pluginRoot: null }
      : { manifest: n, contents: [], resolvedPath: filePath, pluginRoot: null };
  }
  let dir = pathModule.dirname(filePath),
    dir_2 = pathModule.dirname(dir);
  if (pathModule.basename(dir) !== ".claude-plugin")
    return { manifest: n, contents: [], resolvedPath: filePath, pluginRoot: null };
  if (n.fileType === "plugin") {
    let p = await checkPluginRootClaudeMd(dir_2);
    return { manifest: n, contents: p, resolvedPath: filePath, pluginRoot: dir_2 };
  }
  if (pathModule.resolve(e) !== dir_2)
    return { manifest: n, contents: [], resolvedPath: filePath, pluginRoot: null };
  let i = await readJsonFile(filePath),
    l =
      i !== void 0 &&
      isOfficialMarketplaceName(i.name) &&
      i.plugins.some((plugin) => we(plugin, dir_2, dir_2)),
    c = await validateHooksJsonForDisplay(pathModule.join(dir, "plugin.json"), {
      kind: l ? "anthropic" : "alone",
    });
  if (c.errors[0]?.code === "ENOENT")
    return { manifest: n, contents: [], resolvedPath: filePath, pluginRoot: null };
  let m = c.errors.length > 0 || c.warnings.length > 0 || (c.notes?.length ?? 0) > 0;
  return {
    manifest: n,
    contents: [...(m ? [c] : []), ...(await checkPluginRootClaudeMd(dir_2))],
    resolvedPath: filePath,
    pluginRoot: dir_2,
  };
}
//@ chunk-85kmkm1x.js:61697-61751 affinity
async function oe(e) {
  return ZB(e).catch(() => {
    return;
  });
}
//@ chunk-85kmkm1x.js:61751-61787 sole-consumer
function he(e) {
  return isPlainObject(e) ? e : void 0;
}
//@ chunk-85kmkm1x.js:61787-61837 sole-consumer
function ae(e) {
  try {
    return he(jsonParse(e));
  } catch {
    return;
  }
}
/**
 * MCP command 引用的 bin/ 文件须存在或在 binaries 中声明。
 */
//@ chunk-85kmkm1x.js:61837-62358 sole-consumer
function checkBinCommandRefs(e, n, s) {
  let r = [];
  for (let [a, i] of Object.entries(e)) {
    let l = he(i);
    if (!l || typeof l.command !== "string") continue;
    let m = l.command.match(/^\$\{CLAUDE_PLUGIN_ROOT\}\/bin\/([^/\\]+)$/)?.[1];
    if (m === void 0 || n.has(m) || s.has(m)) continue;
    let p = sanitizeForDisplay(a, 64),
      y = sanitizeForDisplay(m, 64);
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
/**
 * 检查 MCP 配置引用的插件二进制是否存在或可推导。
 */
//@ chunk-85kmkm1x.js:62358-63527 sole-consumer
async function validateBinaryReferences(e) {
  if (!(await FF(pathModule.join(e, ".claude-plugin")))) return [];
  let joined = pathModule.join(e, ".claude-plugin", "plugin.json"),
    s = await oe(joined);
  if (s === void 0) return [];
  let r = ae(Wo(s)),
    a = parsePluginBinaries(r?.binaries);
  if (!r || !a) return [];
  let i = new Set(Object.keys(a));
  for (let x of PLATFORM_TARGETS) {
    let f = new Map();
    for (let T of Object.keys(a)) {
      let w = binaryBaseNameForTarget(T, x);
      if (w !== void 0) f.set(w, (f.get(w) ?? 0) + 1);
    }
    for (let [T, w] of f) if (w === 1) i.add(T);
  }
  let joined_2 = pathModule.join(e, "bin"),
    c = new Set();
  if (await FF(joined_2))
    c = await readdir(joined_2)
      .then((x) => new Set(x))
      .catch(() => new Set());
  let m = [];
  function p(x, f) {
    if (f.length > 0) m.push({ success: !0, errors: [], warnings: f, filePath: x, fileType: "plugin" });
  }
  let joined_3 = pathModule.join(e, ".mcp.json"),
    h = await oe(joined_3);
  if (h !== void 0) {
    let x = ae(h);
    if (x) {
      let f = he(x.mcpServers || x);
      if (f) p(joined_3, checkBinCommandRefs(f, c, i));
    }
  }
  let mcpServers = r.mcpServers,
    b = mcpServers === void 0 ? [] : Array.isArray(mcpServers) ? mcpServers : [mcpServers],
    C = [],
    S = Me;
  for (let x of b) {
    if (typeof x === "string" && S <= 0) continue;
    if (typeof x === "string") {
      if ((S--, !x.startsWith("./") || isAbsoluteOrUnsafePath(x))) continue;
      let joined = pathModule.join(e, x);
      if ((await readPluginFileSafe(e, pathModule.dirname(joined))) !== "ok") continue;
      let w = await oe(joined);
      if (w === void 0) continue;
      let R = ae(w);
      if (!R) continue;
      let j = he(R.mcpServers || R);
      if (j) p(pathModule.join(e, sanitizeForDisplay(x, 128)), checkBinCommandRefs(j, c, i));
      continue;
    }
    let f = he(x);
    if (f) C.push(...checkBinCommandRefs(f, c, i));
  }
  return (p(joined, C), m);
}
/**
 * 按模式返回 schema（strict 或宽松）。名字配错，见 lead 建议。
 */
//@ chunk-6j594vm1.js:3309-3356 fingerprint = MARKETPLACE_ONLY_MANIFEST_FIELDS (0.369)
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
  $Or,
  csn,
  summarizeValidationResults,
  validateManifestForDisplay,
  PLUGIN_ID_PART_RULE,
};
