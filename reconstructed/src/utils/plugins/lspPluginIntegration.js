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
import { resolve as resolve_2, relative, sep, join } from "path";
import { readFile } from "fs/promises";
import { hasDotDotWithSpaceSegment } from "../pathClassification.js";
import { areValidKeySegments, STORAGE_SPACES } from "../storage/storageSpaces.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { parseVersionCachePath, ensurePluginDataDir } from "./pluginDirectories.js";
import { projectPluginCacheDir } from "./pluginCachePaths.js";
import { isProjectLocalPlugin } from "./pluginIdentifier.js";
import { resolvePluginDirComponentPath } from "./pluginPathContainment.js";
import { jsonParse } from "../slowOperations.js";
import { record, string } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-e6aww6q8.js:599782-599914 file-local
/**
 * 把插件内相对路径解析为绝对路径，越出插件目录或为绝对路径时返回 null。
 */
function validatePathWithinPlugin(pluginPath, relativePath) {
  let resolvedPluginPath = resolve_2(pluginPath);
  let resolvedFilePath = resolve_2(pluginPath, relativePath);
  let rel = relative(resolvedPluginPath, resolvedFilePath);
  if (
    rel === ".." ||
    rel.startsWith(`..${sep}`) ||
    resolve_2(rel) === rel ||
    hasDotDotWithSpaceSegment(relativePath)
  )
    return null;
  return resolvedFilePath;
}
//@ chunk-e6aww6q8.js:599914-600301 layout
async function readLspConfigViaStorage(e, n, r) {
  if (!areValidKeySegments(r))
    return {
      kind: "unrepresentable",
    };
  let s = await e.read([STORAGE_SPACES.pluginCache(n.marketplace, n.plugin, n.version, r)]);
  if (!s.ok)
    return s.error.code === "Failed" && s.error.telemetryCode === "ELOOP"
      ? {
          kind: "symlink",
        }
      : {
          kind: "error",
          message: formatStorageError(s.error),
        };
  let h = s.value.items[0];
  if (!h.found)
    return {
      kind: "absent",
    };
  return {
    kind: "found",
    text: Buffer.from(h.value).toString("utf-8"),
  };
}
//@ chunk-e6aww6q8.js:600301-600325 layout
class LspConfigReadError extends Error {}
//@ chunk-e6aww6q8.js:600325-600703 layout
function toLspConfigReadError(lspConfigViaStorage) {
  switch (lspConfigViaStorage.kind) {
    case "symlink":
      return new LspConfigReadError(
        "LSP config path contains a symbolic link that plugin storage does not follow",
      );
    case "absent":
      return new LspConfigReadError("LSP config file not found");
    case "unrepresentable":
      return new LspConfigReadError("LSP config path cannot be addressed in plugin storage");
    case "error":
      return new LspConfigReadError(
        `Could not read LSP config from plugin storage: ${lspConfigViaStorage.message}`,
      );
  }
}
//@ chunk-e6aww6q8.js:600703-600846 layout
function describeLspConfigError(error) {
  if (error instanceof LspConfigReadError) return error.message;
  return error instanceof Error ? `Failed to parse JSON: ${error.message}` : "Failed to parse JSON file";
}
//@ chunk-e6aww6q8.js:600846-601987 fingerprint = loadPluginLspServers (0.745)
/**
 * 读取插件的 LSP 服务器配置：插件根目录 .lsp.json + manifest.lspServers（路径或内联），校验 LspServerConfigSchema。
 */
async function loadPluginLspServers(plugin, errors = [], r) {
  if (plugin.isBuiltin) return;
  let servers = {};
  let h = r ? parseVersionCachePath(plugin.path, projectPluginCacheDir()) : null;
  let y = isProjectLocalPlugin(plugin);
  let lspJsonPath = join(plugin.path, ".lsp.json");
  try {
    let w;
    if (y) {
      let pluginDirComponentPath = await resolvePluginDirComponentPath(plugin, ".lsp.json");
      w = pluginDirComponentPath === null ? null : await readFile(pluginDirComponentPath, "utf-8");
    } else if (r && h) {
      let lspConfigViaStorage = await readLspConfigViaStorage(r, h, [".lsp.json"]);
      if (lspConfigViaStorage.kind !== "found" && lspConfigViaStorage.kind !== "absent")
        throw toLspConfigReadError(lspConfigViaStorage);
      w = lspConfigViaStorage.kind === "found" ? lspConfigViaStorage.text : null;
    } else w = await readFile(lspJsonPath, "utf-8");
    if (w !== null) {
      let parsed = jsonParse(w);
      let result = record(string(), LspServerConfigSchema()).safeParse(parsed);
      if (result.success) Object.assign(servers, result.data);
      else {
        let errorMsg = `LSP config validation failed for .lsp.json in plugin ${plugin.name}: ${result.error.message}`;
        logForDebugging(errorMsg, {
          level: "error",
        });
        errors.push({
          type: "lsp-config-invalid",
          plugin: plugin.name,
          serverName: ".lsp.json",
          validationError: result.error.message,
          source: plugin.repository,
        });
      }
    }
  } catch (error) {
    if (!isENOENT(error)) {
      let _errorMsg =
        error instanceof Error
          ? `Failed to read/parse .lsp.json in plugin ${plugin.name}: ${error.message}`
          : `Failed to read/parse .lsp.json file in plugin ${plugin.name}`;
      logForDebugging(_errorMsg, {
        level: "error",
      });
      errors.push({
        type: "lsp-config-invalid",
        plugin: plugin.name,
        serverName: ".lsp.json",
        validationError: describeLspConfigError(error),
        source: plugin.repository,
      });
    }
  }
  if (plugin.manifest.lspServers) {
    let manifestServers = await loadLspServersFromManifest(plugin.manifest.lspServers, plugin, errors, r, h);
    if (manifestServers) Object.assign(servers, manifestServers);
  }
  return Object.keys(servers).length > 0 ? servers : undefined;
}
//@ chunk-e6aww6q8.js:601987-603661 fingerprint = loadLspServersFromManifest (0.8)
/**
 * 处理 manifest.lspServers 中的每一项（文件路径做目录逃逸检查，内联对象直接校验）。
 */
async function loadLspServersFromManifest(declaration, plugin, errors, s, h) {
  let servers = {};
  let S = isProjectLocalPlugin(plugin);
  let declarations = Array.isArray(declaration) ? declaration : [declaration];
  for (let decl of declarations)
    if (typeof decl === "string") {
      let validatedPath = validatePathWithinPlugin(plugin.path, decl);
      if (!validatedPath) {
        let securityMsg = `Security: Path traversal attempt blocked in plugin ${plugin.name}: ${decl}`;
        logForDebugging(securityMsg, {
          level: "error",
        });
        errors.push({
          type: "lsp-config-invalid",
          plugin: plugin.name,
          serverName: decl,
          validationError: "Invalid path: must be relative and within plugin directory",
          source: plugin.repository,
        });
        continue;
      }
      try {
        let q;
        if (S) {
          let pluginDirComponentPath = await resolvePluginDirComponentPath(plugin, decl);
          if (pluginDirComponentPath === null) continue;
          q = await readFile(pluginDirComponentPath, "utf-8");
        } else if (s && h) {
          let lspConfigViaStorage = await readLspConfigViaStorage(
            s,
            h,
            relative(plugin.path, validatedPath).split(sep),
          );
          if (lspConfigViaStorage.kind === "unrepresentable") q = await readFile(validatedPath, "utf-8");
          else if (lspConfigViaStorage.kind === "found") q = lspConfigViaStorage.text;
          else throw toLspConfigReadError(lspConfigViaStorage);
        } else q = await readFile(validatedPath, "utf-8");
        let parsed = jsonParse(q);
        let result = record(string(), LspServerConfigSchema()).safeParse(parsed);
        if (result.success) Object.assign(servers, result.data);
        else {
          let errorMsg = `LSP config validation failed for ${decl} in plugin ${plugin.name}: ${result.error.message}`;
          logForDebugging(errorMsg, {
            level: "error",
          });
          errors.push({
            type: "lsp-config-invalid",
            plugin: plugin.name,
            serverName: decl,
            validationError: result.error.message,
            source: plugin.repository,
          });
        }
      } catch (error) {
        let _errorMsg =
          error instanceof Error
            ? `Failed to read/parse LSP config from ${decl} in plugin ${plugin.name}: ${error.message}`
            : `Failed to read/parse LSP config file ${decl} in plugin ${plugin.name}`;
        logForDebugging(_errorMsg, {
          level: "error",
        });
        errors.push({
          type: "lsp-config-invalid",
          plugin: plugin.name,
          serverName: decl,
          validationError: describeLspConfigError(error),
          source: plugin.repository,
        });
      }
    } else
      for (let [serverName, config] of Object.entries(decl)) {
        let result = LspServerConfigSchema().safeParse(config);
        if (result.success) servers[serverName] = result.data;
        else {
          let errorMsg = `LSP config validation failed for inline server "${serverName}" in plugin ${plugin.name}: ${result.error.message}`;
          logForDebugging(errorMsg, {
            level: "error",
          });
          errors.push({
            type: "lsp-config-invalid",
            plugin: plugin.name,
            serverName,
            validationError: result.error.message,
            source: plugin.repository,
          });
        }
      }
  return Object.keys(servers).length > 0 ? servers : undefined;
}
//@ chunk-e6aww6q8.js:603661-604702 placement
/**
 * 对插件 LSP 服务器配置做变量替换：command/args/env/workspaceFolder 按 spawn 规则（缺用户配置抛错）， initializationOptions/settings 按 data 规则（缺失保留原文）；注入 CLAUDE_PLUGIN_ROOT/DATA/PROJECT_DIR； 被扣留的凭证变量记 error 日志，未展开的 data 变量记调试日志。
 */
function resolvePluginLspServerConfig(serverConfig, plugin, userConfig, s) {
  let withheldVars = [];
  let unexpandedDataVars = [];
  let blankList = scrubbedEnvKeys();
  let expand = (Z, Se = "spawn") => {
    let ke = substitutePluginVariables(Z, plugin);
    if (userConfig)
      ke = substituteUserConfigVariables(ke, userConfig, {
        missingKey: Se === "data" ? "literal" : "throw",
      });
    let { expanded, missingVars } = expandMcpCredentialEnvVars(ke, undefined, undefined, {
      blankList,
    });
    if (Se === "data") unexpandedDataVars.push(...missingVars);
    else withheldVars.push(...missingVars);
    return expanded;
  };
  let expandData = (Z) => expand(Z, "data");
  let resolved = {
    ...serverConfig,
  };
  if (resolved.command) resolved.command = expand(resolved.command);
  if (resolved.args) resolved.args = resolved.args.map((arg) => expand(arg));
  let env = {
    CLAUDE_PLUGIN_ROOT: plugin.path,
    CLAUDE_PLUGIN_DATA: ensurePluginDataDir(plugin.source),
    CLAUDE_PROJECT_DIR: getProjectConfigRoot() ?? getProjectRoot(),
    ...(resolved.env || {}),
  };
  for (let [key, value] of Object.entries(env))
    if (key !== "CLAUDE_PLUGIN_ROOT" && key !== "CLAUDE_PLUGIN_DATA" && key !== "CLAUDE_PROJECT_DIR")
      env[key] = expand(value);
  resolved.env = env;
  if (resolved.workspaceFolder) resolved.workspaceFolder = expand(resolved.workspaceFolder);
  if (resolved.initializationOptions !== undefined)
    resolved.initializationOptions = mapStringsDeep(resolved.initializationOptions, expandData);
  if (resolved.settings !== undefined) resolved.settings = mapStringsDeep(resolved.settings, expandData);
  if (withheldVars.length > 0) {
    let Z = uniq(withheldVars);
    logForDebugging(
      `In plugin LSP config: ${formatWithheldEnvNotice(
        Z,
        isManagedPluginScope({
          pluginSource: plugin.source,
        }),
      )}`,
      {
        level: "error",
      },
    );
  }
  if (unexpandedDataVars.length > 0)
    logForDebugging(
      `Left unexpanded in plugin LSP initializationOptions/settings (not set): ${uniq(unexpandedDataVars).join(", ")}`,
    );
  return resolved;
}
//@ chunk-e6aww6q8.js:604702-605143 placement
/**
 * 遍历已启用插件的 lspServers.extensionToLanguage，同一扩展名（小写）被多个 plugin:<插件>:<服务器> 声明时生成 lsp-extension-conflict 错误（先声明者生效）。
 */
function findLspExtensionConflicts(enabled) {
  let n = [];
  let r = new Map();
  for (let s of enabled) {
    if (!s.enabled || !s.lspServers) continue;
    for (let [key, value] of Object.entries(s.lspServers)) {
      if (!value.extensionToLanguage) continue;
      let S = `plugin:${s.name}:${key}`;
      for (let key_2 of Object.keys(value.extensionToLanguage)) {
        let lower = key_2.toLowerCase();
        let G = r.get(lower);
        if (G === undefined) r.set(lower, S);
        else if (G !== S)
          n.push({
            type: "lsp-extension-conflict",
            source: s.source,
            plugin: s.name,
            serverName: key,
            extension: lower,
            activeServer: G,
          });
      }
    }
  }
  return n;
}
//@ chunk-e6aww6q8.js:605292-606211 callgraph-witnessed = getPluginLspServers (0.257)
/**
 * 已启用插件的最终 LSP 服务器配置：解析 ${CLAUDE_PLUGIN_ROOT}/${user_config.X} 等变量，缺 command 的报错；名字加 plugin:<插件>: 前缀。
 */
async function getPluginLspServers(plugin, n = [], r, s) {
  if (!plugin.enabled) return;
  let servers = plugin.lspServers || (await loadPluginLspServers(plugin, n, r));
  if (!servers) return;
  let userConfig = plugin.manifest.userConfig
    ? applyUserConfigDefaults(
        await loadPluginOptions(marketplaceSource(plugin), s),
        plugin.manifest.userConfig,
      )
    : undefined;
  let resolvedServers = {};
  for (let [key, value] of Object.entries(servers))
    try {
      let G = runWithPluginWriteScope(
        {
          pluginSource: plugin.source,
        },
        () => resolvePluginLspServerConfig(value, plugin, userConfig, n),
      );
      if (!G.command) {
        n.push({
          type: "lsp-config-invalid",
          plugin: plugin.name,
          serverName: key,
          validationError: `Server ${key} 'command' ${value.command} resolved to an empty string; set the plugin option or environment variable it references`,
          source: plugin.repository,
        });
        continue;
      }
      if (!G.extensionToLanguage || Object.keys(G.extensionToLanguage).length === 0) {
        n.push({
          type: "lsp-config-invalid",
          plugin: plugin.name,
          serverName: key,
          validationError: `Server ${key} missing required 'extensionToLanguage' field`,
          source: plugin.repository,
        });
        continue;
      }
      resolvedServers[key] = G;
    } catch (error) {
      n.push({
        type: "lsp-config-invalid",
        plugin: plugin.name,
        serverName: key,
        validationError: errorMessage(error),
        source: plugin.repository,
      });
    }
  return addPluginScopeToServers(resolvedServers, plugin.name, plugin.repository);
}
//@ chunk-e6aww6q8.js:3817371-3817440 fingerprint = resolvePluginLspEnvironment (0.601)
var PLUGIN_ENV_VAR_NAMES = ["CLAUDE_PLUGIN_ROOT", "CLAUDE_PLUGIN_DATA"];
var PLUGIN_ENV_VAR_SET = new Set(PLUGIN_ENV_VAR_NAMES);
//@ chunk-6mwt0myy.js:20771-20900 placement
/**
 * LSP 服务器显示名（含来源插件）。
 */
function formatMcpServerLabel(e, n) {
  if (!n) return printableName(e, SERVER_LABEL_MAX_CHARS);
  let pluginServerName = parsePluginServerName(e);
  return pluginServerName
    ? `${printableName(pluginServerName.serverName, SERVER_LABEL_MAX_CHARS)} (from plugin ${printableName(pluginServerName.pluginName, SERVER_LABEL_MAX_CHARS)})`
    : printableName(e, SERVER_LABEL_MAX_CHARS);
}
//@ chunk-6mwt0myy.js:20900-20909 placement
var SERVER_LABEL_MAX_CHARS = 80;
//@ chunk-6mwt0myy.js:20909-21056 placement
/**
 * 解析 plugin:插件:服务器 形式的 id。
 */
function parsePluginServerName(e) {
  if (!e.startsWith("plugin:")) return;
  let parts = e.split(":");
  if (parts.length < 3) return;
  return {
    pluginName: parts[1],
    serverName: parts.slice(2).join(":"),
  };
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
