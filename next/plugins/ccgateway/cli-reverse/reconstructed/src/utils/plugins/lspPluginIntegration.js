/**
 * utils/plugins/lspPluginIntegration.ts
 *
 * 插件 LSP 服务器：读取 .lsp.json 与 manifest.lspServers，解析变量与 userConfig，加作用域前缀。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/lspPluginIntegration.ts
 * pieces: chunk-5xgkngpb.js (11), chunk-evj8g37g.js (3)
 * attribution: file-local 1, layout 4, fingerprint 3, placement 5, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve as resolve_2, relative, sep, join } from "path";
import { readFile } from "fs/promises";
import { printableName } from "../printableName.js";
import { hasDotDotWithSpaceSegment } from "../pathClassification.js";
import { areValidKeySegments, STORAGE_SPACES } from "../storage/storageSpaces.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { parseVersionCachePath } from "./pluginDirectories.js";
import { projectPluginCacheDir } from "./pluginCachePaths.js";
import { isProjectLocalPlugin } from "./pluginIdentifier.js";
import { pathEscapeError, resolvePluginDirComponentPath } from "./pluginPathContainment.js";
import { jsonParse } from "../slowOperations.js";
import { record, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { ensurePluginDataDir } from "../sessionStorage.js";
import { getProjectConfigRoot, getProjectRoot } from "../../bootstrap/state.js";
import { mapStringsDeep } from "./pluginLoader.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { formatWithheldEnvNotice } from "../settings/hostEnvWrites.js";
import { isManagedPluginScope, runWithPluginWriteScope } from "./pluginScopedWrite.js";
import { addPluginScopeToServers } from "./mcpPluginIntegration.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-evj8g37g.js:22648-22777 placement
/**
 * LSP 服务器显示名（含来源插件）。
 */
function formatMcpServerLabel(name, fromPlugin) {
  if (!fromPlugin) return printableName(name, SERVER_LABEL_MAX_CHARS);
  let pluginServerName = parsePluginServerName(name);
  return pluginServerName
    ? `${printableName(pluginServerName.serverName, SERVER_LABEL_MAX_CHARS)} (from plugin ${printableName(pluginServerName.pluginName, SERVER_LABEL_MAX_CHARS)})`
    : printableName(name, SERVER_LABEL_MAX_CHARS);
}
//@ chunk-evj8g37g.js:22777-22786 placement
var SERVER_LABEL_MAX_CHARS = 80;
//@ chunk-evj8g37g.js:22786-22933 placement
/**
 * 解析 plugin:插件:服务器 形式的 id。
 */
function parsePluginServerName(name) {
  if (!name.startsWith("plugin:")) return;
  let parts = name.split(":");
  if (parts.length < 3) return;
  return {
    pluginName: parts[1],
    serverName: parts.slice(2).join(":"),
  };
}
//@ chunk-5xgkngpb.js:609656-609788 file-local
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
//@ chunk-5xgkngpb.js:609788-610175 layout
async function readLspConfigViaStorage(storageV5, coords, relPath) {
  if (!areValidKeySegments(relPath))
    return {
      kind: "unrepresentable",
    };
  let readResult = await storageV5.read([
    STORAGE_SPACES.pluginCache(coords.marketplace, coords.plugin, coords.version, relPath),
  ]);
  if (!readResult.ok)
    return readResult.error.code === "Failed" && readResult.error.telemetryCode === "ELOOP"
      ? {
          kind: "symlink",
        }
      : {
          kind: "error",
          message: formatStorageError(readResult.error),
        };
  let item = readResult.value.items[0];
  if (!item.found)
    return {
      kind: "absent",
    };
  return {
    kind: "found",
    text: Buffer.from(item.value).toString("utf-8"),
  };
}
//@ chunk-5xgkngpb.js:610175-610199 layout
class LspConfigReadError extends Error {}
//@ chunk-5xgkngpb.js:610199-610577 layout
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
//@ chunk-5xgkngpb.js:610577-610720 layout
function describeLspConfigError(error) {
  if (error instanceof LspConfigReadError) return error.message;
  return error instanceof Error ? `Failed to parse JSON: ${error.message}` : "Failed to parse JSON file";
}
//@ chunk-5xgkngpb.js:610720-611954 fingerprint (2.1.88 match: loadPluginLspServers, 0.711)
/**
 * 读取插件的 LSP 服务器配置：插件根目录 .lsp.json + manifest.lspServers（路径或内联），校验 LspServerConfigSchema。
 */
async function loadPluginLspServers(plugin, errors = [], storageV5) {
  if (plugin.isBuiltin) return;
  let servers = {};
  let cacheCoords = storageV5 ? parseVersionCachePath(plugin.path, projectPluginCacheDir()) : null;
  let isProjectLocal = isProjectLocalPlugin(plugin);
  let lspJsonPath = join(plugin.path, ".lsp.json");
  let escapeError = await pathEscapeError(plugin, ".lsp.json", "lsp-servers");
  if (escapeError !== undefined) errors.push(escapeError);
  try {
    let content;
    if (escapeError !== undefined) content = null;
    else if (isProjectLocal) {
      let pluginDirComponentPath = await resolvePluginDirComponentPath(plugin, ".lsp.json");
      content = pluginDirComponentPath === null ? null : await readFile(pluginDirComponentPath, "utf-8");
    } else if (storageV5 && cacheCoords) {
      let lspConfigViaStorage = await readLspConfigViaStorage(storageV5, cacheCoords, [".lsp.json"]);
      if (lspConfigViaStorage.kind !== "found" && lspConfigViaStorage.kind !== "absent")
        throw toLspConfigReadError(lspConfigViaStorage);
      content = lspConfigViaStorage.kind === "found" ? lspConfigViaStorage.text : null;
    } else content = await readFile(lspJsonPath, "utf-8");
    if (content !== null) {
      let parsed = jsonParse(content);
      let result = record(stringSchema(), LspServerConfigSchema()).safeParse(parsed);
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
    let manifestServers = await loadLspServersFromManifest(
      plugin.manifest.lspServers,
      plugin,
      errors,
      storageV5,
      cacheCoords,
    );
    if (manifestServers) Object.assign(servers, manifestServers);
  }
  return Object.keys(servers).length > 0 ? servers : undefined;
}
//@ chunk-5xgkngpb.js:611954-613718 fingerprint (2.1.88 match: loadLspServersFromManifest, 0.774)
/**
 * 处理 manifest.lspServers 中的每一项（文件路径做目录逃逸检查，内联对象直接校验）。
 */
async function loadLspServersFromManifest(declaration, plugin, errors, storageV5, cacheCoords) {
  let servers = {};
  let isProjectLocal = isProjectLocalPlugin(plugin);
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
      let entryEscape = await pathEscapeError(plugin, decl, "lsp-servers");
      if (entryEscape !== undefined) {
        errors.push(entryEscape);
        continue;
      }
      try {
        let content;
        if (isProjectLocal) {
          let pluginDirComponentPath = await resolvePluginDirComponentPath(plugin, decl);
          if (pluginDirComponentPath === null) continue;
          content = await readFile(pluginDirComponentPath, "utf-8");
        } else if (storageV5 && cacheCoords) {
          let lspConfigViaStorage = await readLspConfigViaStorage(
            storageV5,
            cacheCoords,
            relative(plugin.path, validatedPath).split(sep),
          );
          if (lspConfigViaStorage.kind === "unrepresentable")
            content = await readFile(validatedPath, "utf-8");
          else if (lspConfigViaStorage.kind === "found") content = lspConfigViaStorage.text;
          else throw toLspConfigReadError(lspConfigViaStorage);
        } else content = await readFile(validatedPath, "utf-8");
        let parsed = jsonParse(content);
        let result = record(stringSchema(), LspServerConfigSchema()).safeParse(parsed);
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
//@ chunk-5xgkngpb.js:613718-614772 placement
/**
 * 对插件 LSP 服务器配置做变量替换：command/args/env/workspaceFolder 按 spawn 规则（缺用户配置抛错）， initializationOptions/settings 按 data 规则（缺失保留原文）；注入 CLAUDE_PLUGIN_ROOT/DATA/PROJECT_DIR； 被扣留的凭证变量记 error 日志，未展开的 data 变量记调试日志。
 */
function resolvePluginLspServerConfig(serverConfig, plugin, userConfig, errors) {
  let withheldVars = [];
  let unexpandedDataVars = [];
  let blankList = scrubbedEnvKeys();
  let expand = (text, mode = "spawn") => {
    let substituted = substitutePluginVariables(text, plugin);
    if (userConfig)
      substituted = substituteUserConfigVariables(substituted, userConfig, {
        missingKey: mode === "data" ? "literal" : "throw",
      });
    let { expanded, missingVars } = expandMcpCredentialEnvVars(substituted, undefined, undefined, {
      blankList,
    });
    if (mode === "data") unexpandedDataVars.push(...missingVars);
    else withheldVars.push(...missingVars);
    return expanded;
  };
  let expandData = (text) => expand(text, "data");
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
    let withheld = normalizeCaseForComparison_2(withheldVars);
    logForDebugging(
      `In plugin LSP config: ${formatWithheldEnvNotice(
        withheld,
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
      `Left unexpanded in plugin LSP initializationOptions/settings (not set): ${normalizeCaseForComparison_2(unexpandedDataVars).join(", ")}`,
    );
  return resolved;
}
//@ chunk-5xgkngpb.js:614772-615213 placement
/**
 * 遍历已启用插件的 lspServers.extensionToLanguage，同一扩展名（小写）被多个 plugin:<插件>:<服务器> 声明时生成 lsp-extension-conflict 错误（先声明者生效）。
 */
function findLspExtensionConflicts(enabled) {
  let errors = [];
  let extensionOwners = new Map();
  for (let plugin of enabled) {
    if (!plugin.enabled || !plugin.lspServers) continue;
    for (let [key, value] of Object.entries(plugin.lspServers)) {
      if (!value.extensionToLanguage) continue;
      let serverId = `plugin:${plugin.name}:${key}`;
      for (let key_2 of Object.keys(value.extensionToLanguage)) {
        let lower = key_2.toLowerCase();
        let owner = extensionOwners.get(lower);
        if (owner === undefined) extensionOwners.set(lower, serverId);
        else if (owner !== serverId)
          errors.push({
            type: "lsp-extension-conflict",
            source: plugin.source,
            plugin: plugin.name,
            serverName: key,
            extension: lower,
            activeServer: owner,
          });
      }
    }
  }
  return errors;
}
//@ chunk-5xgkngpb.js:615362-616281 callgraph-witnessed (2.1.88 match: getPluginLspServers, 0.258)
/**
 * 已启用插件的最终 LSP 服务器配置：解析 ${CLAUDE_PLUGIN_ROOT}/${user_config.X} 等变量，缺 command 的报错；名字加 plugin:<插件>: 前缀。
 */
async function getPluginLspServers(plugin, errors = [], storageV5, credentials) {
  if (!plugin.enabled) return;
  let servers = plugin.lspServers || (await loadPluginLspServers(plugin, errors, storageV5));
  if (!servers) return;
  let userConfig = plugin.manifest.userConfig
    ? applyUserConfigDefaults(
        await loadPluginOptions(marketplaceSource(plugin), credentials),
        plugin.manifest.userConfig,
      )
    : undefined;
  let resolvedServers = {};
  for (let [key, value] of Object.entries(servers))
    try {
      let resolved = runWithPluginWriteScope(
        {
          pluginSource: plugin.source,
        },
        () => resolvePluginLspServerConfig(value, plugin, userConfig, errors),
      );
      if (!resolved.command) {
        errors.push({
          type: "lsp-config-invalid",
          plugin: plugin.name,
          serverName: key,
          validationError: `Server ${key} 'command' ${value.command} resolved to an empty string; set the plugin option or environment variable it references`,
          source: plugin.repository,
        });
        continue;
      }
      if (!resolved.extensionToLanguage || Object.keys(resolved.extensionToLanguage).length === 0) {
        errors.push({
          type: "lsp-config-invalid",
          plugin: plugin.name,
          serverName: key,
          validationError: `Server ${key} missing required 'extensionToLanguage' field`,
          source: plugin.repository,
        });
        continue;
      }
      resolvedServers[key] = resolved;
    } catch (error) {
      errors.push({
        type: "lsp-config-invalid",
        plugin: plugin.name,
        serverName: key,
        validationError: errorMessage(error),
        source: plugin.repository,
      });
    }
  return addPluginScopeToServers(resolvedServers, plugin.name, plugin.repository);
}
//@ chunk-5xgkngpb.js:3914702-3914771 fingerprint (2.1.88 match: resolvePluginLspEnvironment, 0.601)
var PLUGIN_ENV_VAR_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PLUGIN_ENV_VAR_SET;
deferInit("chunk-5xgkngpb.js:3914702", () => {
  PLUGIN_ENV_VAR_NAMES = ["CLAUDE_PLUGIN_ROOT", "CLAUDE_PLUGIN_DATA"];
  PLUGIN_ENV_VAR_SET = new Set(PLUGIN_ENV_VAR_NAMES);
});
export {
  formatMcpServerLabel,
  loadPluginLspServers,
  findLspExtensionConflicts,
  getPluginLspServers,
  PLUGIN_ENV_VAR_SET,
  parsePluginServerName,
  PLUGIN_ENV_VAR_NAMES,
};
