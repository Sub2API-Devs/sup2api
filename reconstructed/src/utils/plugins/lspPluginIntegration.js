/**
 * utils/plugins/lspPluginIntegration.ts
 *
 * 插件 LSP 服务器：读取 .lsp.json 与 manifest.lspServers，解析变量与 userConfig，加作用域前缀。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/lspPluginIntegration.ts
 * pieces: chunk-6mwt0myy.js (3), chunk-e6aww6q8.js (11)
 * attribution: placement 5, file-local 1, layout 4, fingerprint 3, callgraph-witnessed 1
 */
import {
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
} from "fs/promises";
import { W9e } from "../pathClassification.js";
import { uA, STORAGE_SPACES } from "../storage/storageSpaces.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { parseVersionCachePath, ensurePluginDataDir } from "./pluginDirectories.js";
import { projectPluginCacheDir } from "./pluginCachePaths.js";
import { isProjectLocalPlugin } from "./pluginIdentifier.js";
import { resolvePluginDirComponentPath } from "./pluginPathContainment.js";
import { jsonParse } from "../slowOperations.js";
import { pe, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { LspServerConfigSchema } from "./schemas.js";
import { logForDebugging } from "../debug.js";
import { isENOENT, errorMessage } from "../errors.js";
import { scrubbedEnvKeys, expandMcpCredentialEnvVars } from "../envExpansion.js";
import {
  substitutePluginVariables,
  substituteUserConfigVariables,
  applyUserConfigDefaults,
  loadPluginOptions,
  marketplaceSource,
} from "./pluginOptionsStorage.js";
import { getProjectConfigRoot, getProjectRoot } from "../../bootstrap/state.js";
import { mapStringsDeep } from "./pluginLoader.js";
import { uniq } from "../collections.js";
import { formatWithheldEnvNotice } from "../settings/managedSettingsFiles.js";
import { isManagedPluginScope, runWithPluginWriteScope } from "./pluginScopedWrite.js";
import { addPluginScopeToServers } from "./mcpPluginIntegration.js";
import { printableName } from "../printableName.js";

/**
 * 把插件内相对路径解析为绝对路径，越出插件目录或为绝对路径时返回 null。
 */
//@ chunk-e6aww6q8.js:599782-599914 file-local
function validatePathWithinPlugin(pluginPath, relativePath) {
  let resolvedPluginPath = resolve_3(pluginPath),
    resolvedFilePath = resolve_3(pluginPath, relativePath),
    rel = relative_4(resolvedPluginPath, resolvedFilePath);
  if (rel === ".." || rel.startsWith(`..${sep_7}`) || resolve_3(rel) === rel || W9e(relativePath))
    return null;
  return resolvedFilePath;
}
//@ chunk-e6aww6q8.js:599914-600301 layout
async function readLspConfigViaStorage(e, n, r) {
  if (!uA(r)) return { kind: "unrepresentable" };
  let read = await e.read([STORAGE_SPACES.pluginCache(n.marketplace, n.plugin, n.version, r)]);
  if (!read.ok)
    return read.error.code === "Failed" && read.error.telemetryCode === "ELOOP"
      ? { kind: "symlink" }
      : { kind: "error", message: formatStorageError(read.error) };
  let h = read.value.items[0];
  if (!h.found) return { kind: "absent" };
  return { kind: "found", text: Buffer.from(h.value).toString("utf-8") };
}
//@ chunk-e6aww6q8.js:600301-600325 layout
class LspConfigReadError extends Error {}
//@ chunk-e6aww6q8.js:600325-600703 layout
function toLspConfigReadError(e) {
  switch (e.kind) {
    case "symlink":
      return new LspConfigReadError(
        "LSP config path contains a symbolic link that plugin storage does not follow",
      );
    case "absent":
      return new LspConfigReadError("LSP config file not found");
    case "unrepresentable":
      return new LspConfigReadError("LSP config path cannot be addressed in plugin storage");
    case "error":
      return new LspConfigReadError(`Could not read LSP config from plugin storage: ${e.message}`);
  }
}
//@ chunk-e6aww6q8.js:600703-600846 layout
function describeLspConfigError(e) {
  if (e instanceof LspConfigReadError) return e.message;
  return e instanceof Error ? `Failed to parse JSON: ${e.message}` : "Failed to parse JSON file";
}
/**
 * 读取插件的 LSP 服务器配置：插件根目录 .lsp.json + manifest.lspServers（路径或内联），校验 LspServerConfigSchema。
 */
//@ chunk-e6aww6q8.js:600846-601987 fingerprint = loadPluginLspServers (0.745)
async function loadPluginLspServers(e, n = [], r) {
  if (e.isBuiltin) return;
  let servers = {},
    h = r ? parseVersionCachePath(e.path, projectPluginCacheDir()) : null,
    y = isProjectLocalPlugin(e),
    lspJsonPath = join_7(e.path, ".lsp.json");
  try {
    let w;
    if (y) {
      let L = await resolvePluginDirComponentPath(e, ".lsp.json");
      w = L === null ? null : await readFile_2(L, "utf-8");
    } else if (r && h) {
      let L = await readLspConfigViaStorage(r, h, [".lsp.json"]);
      if (L.kind !== "found" && L.kind !== "absent") throw toLspConfigReadError(L);
      w = L.kind === "found" ? L.text : null;
    } else w = await readFile_2(lspJsonPath, "utf-8");
    if (w !== null) {
      let parsed = jsonParse(w),
        result = pe(o(), LspServerConfigSchema()).safeParse(parsed);
      if (result.success) Object.assign(servers, result.data);
      else {
        let errorMsg = `LSP config validation failed for .lsp.json in plugin ${e.name}: ${result.error.message}`;
        (logForDebugging(errorMsg, { level: "error" }),
          n.push({
            type: "lsp-config-invalid",
            plugin: e.name,
            serverName: ".lsp.json",
            validationError: result.error.message,
            source: e.repository,
          }));
      }
    }
  } catch (error) {
    if (!isENOENT(error)) {
      let L =
        error instanceof Error
          ? `Failed to read/parse .lsp.json in plugin ${e.name}: ${error.message}`
          : `Failed to read/parse .lsp.json file in plugin ${e.name}`;
      (logForDebugging(L, { level: "error" }),
        n.push({
          type: "lsp-config-invalid",
          plugin: e.name,
          serverName: ".lsp.json",
          validationError: describeLspConfigError(error),
          source: e.repository,
        }));
    }
  }
  if (e.manifest.lspServers) {
    let w = await loadLspServersFromManifest(e.manifest.lspServers, e, n, r, h);
    if (w) Object.assign(servers, w);
  }
  return Object.keys(servers).length > 0 ? servers : void 0;
}
/**
 * 处理 manifest.lspServers 中的每一项（文件路径做目录逃逸检查，内联对象直接校验）。
 */
//@ chunk-e6aww6q8.js:601987-603661 fingerprint = loadLspServersFromManifest (0.8)
async function loadLspServersFromManifest(e, n, r, s, h) {
  let servers = {},
    S = isProjectLocalPlugin(n),
    w = Array.isArray(e) ? e : [e];
  for (let decl of w)
    if (typeof decl === "string") {
      let validatedPath = validatePathWithinPlugin(n.path, decl);
      if (!validatedPath) {
        let securityMsg = `Security: Path traversal attempt blocked in plugin ${n.name}: ${decl}`;
        (logForDebugging(securityMsg, { level: "error" }),
          r.push({
            type: "lsp-config-invalid",
            plugin: n.name,
            serverName: decl,
            validationError: "Invalid path: must be relative and within plugin directory",
            source: n.repository,
          }));
        continue;
      }
      try {
        let q;
        if (S) {
          let ke = await resolvePluginDirComponentPath(n, decl);
          if (ke === null) continue;
          q = await readFile_2(ke, "utf-8");
        } else if (s && h) {
          let ke = await readLspConfigViaStorage(s, h, relative_4(n.path, validatedPath).split(sep_7));
          if (ke.kind === "unrepresentable") q = await readFile_2(validatedPath, "utf-8");
          else if (ke.kind === "found") q = ke.text;
          else throw toLspConfigReadError(ke);
        } else q = await readFile_2(validatedPath, "utf-8");
        let parsed = jsonParse(q),
          result = pe(o(), LspServerConfigSchema()).safeParse(parsed);
        if (result.success) Object.assign(servers, result.data);
        else {
          let errorMsg = `LSP config validation failed for ${decl} in plugin ${n.name}: ${result.error.message}`;
          (logForDebugging(errorMsg, { level: "error" }),
            r.push({
              type: "lsp-config-invalid",
              plugin: n.name,
              serverName: decl,
              validationError: result.error.message,
              source: n.repository,
            }));
        }
      } catch (error) {
        let Z =
          error instanceof Error
            ? `Failed to read/parse LSP config from ${decl} in plugin ${n.name}: ${error.message}`
            : `Failed to read/parse LSP config file ${decl} in plugin ${n.name}`;
        (logForDebugging(Z, { level: "error" }),
          r.push({
            type: "lsp-config-invalid",
            plugin: n.name,
            serverName: decl,
            validationError: describeLspConfigError(error),
            source: n.repository,
          }));
      }
    } else
      for (let [G, q] of Object.entries(decl)) {
        let result = LspServerConfigSchema().safeParse(q);
        if (result.success) servers[G] = result.data;
        else {
          let errorMsg = `LSP config validation failed for inline server "${G}" in plugin ${n.name}: ${result.error.message}`;
          (logForDebugging(errorMsg, { level: "error" }),
            r.push({
              type: "lsp-config-invalid",
              plugin: n.name,
              serverName: G,
              validationError: result.error.message,
              source: n.repository,
            }));
        }
      }
  return Object.keys(servers).length > 0 ? servers : void 0;
}
/**
 * 对插件 LSP 服务器配置做变量替换：command/args/env/workspaceFolder 按 spawn 规则（缺用户配置抛错）， initializationOptions/settings 按 data 规则（缺失保留原文）；注入 CLAUDE_PLUGIN_ROOT/DATA/PROJECT_DIR； 被扣留的凭证变量记 error 日志，未展开的 data 变量记调试日志。
 */
//@ chunk-e6aww6q8.js:603661-604702 placement
function resolvePluginLspServerConfig(serverConfig, plugin, userConfig, s) {
  let withheldVars = [],
    unexpandedDataVars = [],
    S = scrubbedEnvKeys(),
    expand = (Z, Se = "spawn") => {
      let ke = substitutePluginVariables(Z, plugin);
      if (userConfig)
        ke = substituteUserConfigVariables(ke, userConfig, {
          missingKey: Se === "data" ? "literal" : "throw",
        });
      let { expanded: expanded, missingVars: missingVars } = expandMcpCredentialEnvVars(ke, void 0, void 0, {
        blankList: S,
      });
      if (Se === "data") unexpandedDataVars.push(...missingVars);
      else withheldVars.push(...missingVars);
      return expanded;
    },
    expandData = (Z) => expand(Z, "data"),
    resolved = { ...serverConfig };
  if (resolved.command) resolved.command = expand(resolved.command);
  if (resolved.args) resolved.args = resolved.args.map((arg) => expand(arg));
  let env = {
    CLAUDE_PLUGIN_ROOT: plugin.path,
    CLAUDE_PLUGIN_DATA: ensurePluginDataDir(plugin.source),
    CLAUDE_PROJECT_DIR: getProjectConfigRoot() ?? getProjectRoot(),
    ...(resolved.env || {}),
  };
  for (let [Z, Se] of Object.entries(env))
    if (Z !== "CLAUDE_PLUGIN_ROOT" && Z !== "CLAUDE_PLUGIN_DATA" && Z !== "CLAUDE_PROJECT_DIR")
      env[Z] = expand(Se);
  if (((resolved.env = env), resolved.workspaceFolder))
    resolved.workspaceFolder = expand(resolved.workspaceFolder);
  if (resolved.initializationOptions !== void 0)
    resolved.initializationOptions = mapStringsDeep(resolved.initializationOptions, expandData);
  if (resolved.settings !== void 0) resolved.settings = mapStringsDeep(resolved.settings, expandData);
  if (withheldVars.length > 0) {
    let Z = uniq(withheldVars);
    logForDebugging(
      `In plugin LSP config: ${formatWithheldEnvNotice(Z, isManagedPluginScope({ pluginSource: plugin.source }))}`,
      { level: "error" },
    );
  }
  if (unexpandedDataVars.length > 0)
    logForDebugging(
      `Left unexpanded in plugin LSP initializationOptions/settings (not set): ${uniq(unexpandedDataVars).join(", ")}`,
    );
  return resolved;
}
/**
 * 遍历已启用插件的 lspServers.extensionToLanguage，同一扩展名（小写）被多个 plugin:<插件>:<服务器> 声明时生成 lsp-extension-conflict 错误（先声明者生效）。
 */
//@ chunk-e6aww6q8.js:604702-605143 placement
function findLspExtensionConflicts(e) {
  let n = [],
    r = new Map();
  for (let s of e) {
    if (!s.enabled || !s.lspServers) continue;
    for (let [h, y] of Object.entries(s.lspServers)) {
      if (!y.extensionToLanguage) continue;
      let S = `plugin:${s.name}:${h}`;
      for (let w of Object.keys(y.extensionToLanguage)) {
        let lower = w.toLowerCase(),
          G = r.get(lower);
        if (G === void 0) r.set(lower, S);
        else if (G !== S)
          n.push({
            type: "lsp-extension-conflict",
            source: s.source,
            plugin: s.name,
            serverName: h,
            extension: lower,
            activeServer: G,
          });
      }
    }
  }
  return n;
}
/**
 * 已启用插件的最终 LSP 服务器配置：解析 ${CLAUDE_PLUGIN_ROOT}/${user_config.X} 等变量，缺 command 的报错；名字加 plugin:<插件>: 前缀。
 */
//@ chunk-e6aww6q8.js:605292-606211 callgraph-witnessed = getPluginLspServers (0.257)
async function getPluginLspServers(e, n = [], r, s) {
  if (!e.enabled) return;
  let servers = e.lspServers || (await loadPluginLspServers(e, n, r));
  if (!servers) return;
  let userConfig = e.manifest.userConfig
      ? applyUserConfigDefaults(await loadPluginOptions(marketplaceSource(e), s), e.manifest.userConfig)
      : void 0,
    resolvedServers = {};
  for (let [w, L] of Object.entries(servers))
    try {
      let G = runWithPluginWriteScope({ pluginSource: e.source }, () =>
        resolvePluginLspServerConfig(L, e, userConfig, n),
      );
      if (!G.command) {
        n.push({
          type: "lsp-config-invalid",
          plugin: e.name,
          serverName: w,
          validationError: `Server ${w} 'command' ${L.command} resolved to an empty string; set the plugin option or environment variable it references`,
          source: e.repository,
        });
        continue;
      }
      if (!G.extensionToLanguage || Object.keys(G.extensionToLanguage).length === 0) {
        n.push({
          type: "lsp-config-invalid",
          plugin: e.name,
          serverName: w,
          validationError: `Server ${w} missing required 'extensionToLanguage' field`,
          source: e.repository,
        });
        continue;
      }
      resolvedServers[w] = G;
    } catch (error) {
      n.push({
        type: "lsp-config-invalid",
        plugin: e.name,
        serverName: w,
        validationError: errorMessage(error),
        source: e.repository,
      });
    }
  return addPluginScopeToServers(resolvedServers, e.name, e.repository);
}
//@ chunk-e6aww6q8.js:3817371-3817440 fingerprint = resolvePluginLspEnvironment (0.601)
var PLUGIN_ENV_VAR_NAMES = ["CLAUDE_PLUGIN_ROOT", "CLAUDE_PLUGIN_DATA"],
  PLUGIN_ENV_VAR_SET = new Set(PLUGIN_ENV_VAR_NAMES);
/**
 * LSP 服务器显示名（含来源插件）。
 */
//@ chunk-6mwt0myy.js:20771-20900 placement
function formatMcpServerLabel(e, n) {
  if (!n) return printableName(e, SERVER_LABEL_MAX_CHARS);
  let r = parsePluginServerName(e);
  return r
    ? `${printableName(r.serverName, SERVER_LABEL_MAX_CHARS)} (from plugin ${printableName(r.pluginName, SERVER_LABEL_MAX_CHARS)})`
    : printableName(e, SERVER_LABEL_MAX_CHARS);
}
//@ chunk-6mwt0myy.js:20900-20909 placement
var SERVER_LABEL_MAX_CHARS = 80;
/**
 * 解析 plugin:插件:服务器 形式的 id。
 */
//@ chunk-6mwt0myy.js:20909-21056 placement
function parsePluginServerName(e) {
  if (!e.startsWith("plugin:")) return;
  let parts = e.split(":");
  if (parts.length < 3) return;
  return { pluginName: parts[1], serverName: parts.slice(2).join(":") };
}

export {
  PLUGIN_ENV_VAR_NAMES,
  loadPluginLspServers,
  findLspExtensionConflicts,
  parsePluginServerName,
  formatMcpServerLabel,
  getPluginLspServers,
  PLUGIN_ENV_VAR_SET,
};
