/**
 * utils/plugins/mcpbHandler.ts
 *
 * MCPB（.mcpb/.dxt）包处理：下载、缓存元数据、解压、生成 MCP 配置，服务器级 userConfig 的读写（敏感值进安全存储）与校验。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/mcpbHandler.ts
 * pieces: chunk-6vxyfwtv.js (1), chunk-pzdhtgn4.js (18)
 * attribution: fingerprint 13, sole-consumer 1, layout 4, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { createHash } from "crypto";
import { writeFile, chmod } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { createJsonStore } from "../jsonStore.js";
import { trustedPluginSetting, pluginIdAliases } from "./pluginConfigSources.js";
import { getSecureStorage } from "../secureStorage/index.js";
import { logForDebugging } from "../debug.js";
import { filterEntriesToNullProto } from "../hooks/functionHookMatchers.js";
import { getSettingsForSourceForUpkeep, updateSettingsForSource } from "../settings/settings.js";
import {
  toError,
  withTelemetryMessage,
  errorMessage,
  getErrnoCode,
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { getOwn } from "../objectSafety.js";
import { getSystemDirectories } from "../systemDirectories.js";
import { logError } from "../log.js";
import { stdioIdentityDiff } from "../../services/mcp/serverIdentity.js";
import { getFsImplementation } from "../fsOperations.js";
import { redactUrlQuery, redactUrlsInMessage, replaceAll } from "../redaction/urlRedaction.js";
import { isAnthropicOwnedHost } from "../anthropicHosts.js";
import { publicCdnGuardedClient } from "../nativeInstaller/downloadsClient.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { DEFAULT_FILE_MODE, unzipFile, parseZipModes } from "../dxt/zip.js";
import { parseJsonBytes } from "../dxt/helpers.js";
import { isShortLinkSpan, README_LINE_BREAK_CHARS } from "./validate/readmeAndListing.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pzdhtgn4.js:10808-10930 sole-consumer
var McpbCacheMetadataSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pzdhtgn4.js:10808", () => {
  McpbCacheMetadataSchema = DoctorLazy(() =>
    objectSchema({
      source: stringSchema(),
      contentHash: stringSchema(),
      extractedPath: stringSchema(),
      cachedAt: stringSchema(),
      lastChecked: stringSchema(),
      sourceMtimeMs: numberSchema().optional(),
    }),
  );
});
//@ chunk-pzdhtgn4.js:10930-10992 fingerprint (2.1.88 match: isMcpbSource, 1)
/**
 * 来源是否为 MCPB 包（.mcpb 或旧名 .dxt）。
 */
function isMcpbSource(source) {
  return source.endsWith(".mcpb") || source.endsWith(".dxt");
}
//@ chunk-pzdhtgn4.js:10992-11064 layout (2.1.88 match: isUrl, 1)
function isUrl_2(source) {
  return source.startsWith("http://") || source.startsWith("https://");
}
//@ chunk-pzdhtgn4.js:11064-11101 layout
/**
 * 是否为本地（非 URL）MCPB 包路径。
 */
function isLocalMcpbSource(source) {
  return isMcpbSource(source) && !isUrl_2(source);
}
//@ chunk-pzdhtgn4.js:11101-11142 fingerprint (2.1.88 match: getMcpbCacheDir, 1)
function getMcpbCacheDir(pluginPath) {
  return join(pluginPath, ".mcpb-cache");
}
//@ chunk-pzdhtgn4.js:11142-11247 fingerprint (2.1.88 match: getMetadataPath, 1)
function getMetadataPath(cacheDir, source) {
  let sourceHash = createHash("md5").update(source).digest("hex").substring(0, 8);
  return join(cacheDir, `${sourceHash}.metadata.json`);
}
//@ chunk-pzdhtgn4.js:11247-11333 layout
function mcpbMetadataStore(cacheDir, source) {
  return createJsonStore(getMetadataPath(cacheDir, source), () => McpbCacheMetadataSchema().nullable(), {
    defaultValue: null,
    indent: 2,
  });
}
//@ chunk-pzdhtgn4.js:11333-11368 layout
function pluginServerKey(pluginId, serverName) {
  return `${pluginId}/${serverName}`;
}
//@ chunk-pzdhtgn4.js:11368-11677 fingerprint (2.1.88 match: loadMcpServerUserConfig, 0.908)
/**
 * 读取某插件 MCP 服务器的用户配置：非敏感值来自 settings，敏感值来自安全存储 pluginSecrets["插件/服务器"]。
 */
async function loadMcpServerUserConfig(pluginId, serverName, storageV5) {
  try {
    let nonSensitive = trustedPluginSetting(pluginId).mcpServers?.[serverName];
    let sensitive = (await getSecureStorage().readAsync(storageV5))?.pluginSecrets?.[
      pluginServerKey(pluginId, serverName)
    ];
    if (!nonSensitive && !sensitive) return null;
    logForDebugging(`Loaded user config for ${pluginId}/${serverName} (settings + secureStorage)`);
    return {
      ...nonSensitive,
      ...sensitive,
    };
  } catch (error) {
    logForDebugging(`Failed to load user config for ${pluginId}/${serverName}: ${error}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-pzdhtgn4.js:11677-13197 fingerprint (2.1.88 match: saveMcpServerUserConfig, 0.936)
/**
 * 保存某插件 MCP 服务器的用户配置（敏感值进安全存储）。
 */
async function saveMcpServerUserConfig(pluginId, serverName, config, schema, storageV5, credentials) {
  try {
    let nonSensitive = {};
    let sensitive = {};
    for (let [key, value] of Object.entries(config))
      if (schema[key]?.sensitive === true) sensitive[key] = String(value);
      else nonSensitive[key] = value;
    let sensitiveKeysInThisSave = new Set(Object.keys(sensitive));
    let nonSensitiveKeysInThisSave = new Set(Object.keys(nonSensitive));
    let serverKey = pluginServerKey(pluginId, serverName);
    let scrubbedCount = 0;
    let result = await getSecureStorage().mutate((store) => {
      let existingInSecureStorage = store.pluginSecrets?.[serverKey];
      let secureScrubbed = existingInSecureStorage
        ? filterEntriesToNullProto(
            existingInSecureStorage,
            (existingValue, key) => !nonSensitiveKeysInThisSave.has(key),
          )
        : undefined;
      scrubbedCount =
        secureScrubbed && existingInSecureStorage
          ? Object.keys(existingInSecureStorage).length - Object.keys(secureScrubbed).length
          : 0;
      if (Object.keys(sensitive).length === 0 && scrubbedCount === 0) return store;
      return {
        ...store,
        pluginSecrets: {
          ...store.pluginSecrets,
          [serverKey]: {
            ...secureScrubbed,
            ...sensitive,
          },
        },
      };
    }, credentials);
    if (!result.success) throw Error(`Failed to save sensitive config to secure storage for ${serverKey}`);
    if (result.warning)
      logForDebugging(`Server secrets save warning: ${result.warning}`, {
        level: "warn",
      });
    if (scrubbedCount > 0)
      logForDebugging(
        `saveMcpServerUserConfig: scrubbed ${scrubbedCount} stale non-sensitive key(s) from secureStorage for ${serverKey}`,
      );
    let pluginConfigs = getSettingsForSourceForUpkeep("userSettings")?.pluginConfigs;
    let updates = {};
    let scrubbedSettingsCount = 0;
    for (let alias of pluginIdAliases(pluginId)) {
      let keysToScrubFromSettings = Object.keys(
        pluginConfigs?.[alias]?.mcpServers?.[serverName] ?? {},
      ).filter((k) => sensitiveKeysInThisSave.has(k));
      let scrubbed = Object.fromEntries(
        keysToScrubFromSettings.map((keysToScrubFromSetting) => [keysToScrubFromSetting, undefined]),
      );
      let values = alias === pluginId ? nonSensitive : {};
      if (Object.keys(values).length > 0 || keysToScrubFromSettings.length > 0) {
        updates[alias] = {
          mcpServers: {
            [serverName]: {
              ...values,
              ...scrubbed,
            },
          },
        };
        scrubbedSettingsCount += keysToScrubFromSettings.length;
      }
    }
    if (Object.keys(updates).length > 0) {
      let result = await updateSettingsForSource(
        "userSettings",
        {
          pluginConfigs: updates,
        },
        undefined,
        storageV5,
      );
      if (result.error) throw result.error;
      if (scrubbedSettingsCount > 0)
        logForDebugging(
          `saveMcpServerUserConfig: scrubbed ${scrubbedSettingsCount} plaintext sensitive key(s) from settings.json for ${pluginId}/${serverName}`,
        );
    }
    logForDebugging(
      `Saved user config for ${pluginId}/${serverName} (${Object.keys(nonSensitive).length} non-sensitive, ${Object.keys(sensitive).length} sensitive)`,
    );
  } catch (error) {
    let errorObj = toError(error);
    logForDebugging(`Failed to save user config for ${pluginId}/${serverName}: ${errorObj.message}`, {
      level: "error",
    });
    throw Error(`Failed to save user configuration for ${pluginId}/${serverName}: ${errorObj.message}`);
  }
}
//@ chunk-pzdhtgn4.js:13197-14320 fingerprint (2.1.88 match: validateUserConfig, 0.955)
/**
 * 按 userConfig schema 校验值：必填、类型（string/number/boolean/directory/file）、min/max、options。
 */
function validateUserConfig(values, schema) {
  let errors = [];
  for (let [key, fieldSchema] of Object.entries(schema)) {
    let value = getOwn(values, key);
    if (fieldSchema.required && (value === undefined || value === "")) {
      errors.push(`${fieldSchema.title || key} is required but not provided`);
      continue;
    }
    if (value === undefined || value === "") continue;
    if (fieldSchema.type === "string") {
      if (Array.isArray(value)) {
        if (!fieldSchema.multiple) errors.push(`${fieldSchema.title || key} must be a string, not an array`);
        else if (!value.every((v) => typeof v === "string"))
          errors.push(`${fieldSchema.title || key} must be an array of strings`);
      } else if (typeof value !== "string") errors.push(`${fieldSchema.title || key} must be a string`);
      else if (fieldSchema.options !== undefined && !fieldSchema.options.includes(value))
        errors.push(`${fieldSchema.title || key} must be one of: ${fieldSchema.options.join(", ")}`);
    } else if (fieldSchema.type === "number" && typeof value !== "number")
      errors.push(`${fieldSchema.title || key} must be a number`);
    else if (fieldSchema.type === "boolean" && typeof value !== "boolean")
      errors.push(`${fieldSchema.title || key} must be a boolean`);
    else if ((fieldSchema.type === "file" || fieldSchema.type === "directory") && typeof value !== "string")
      errors.push(`${fieldSchema.title || key} must be a path string`);
    if (fieldSchema.type === "number" && typeof value === "number") {
      if (fieldSchema.min !== undefined && value < fieldSchema.min)
        errors.push(`${fieldSchema.title || key} must be at least ${fieldSchema.min}`);
      if (fieldSchema.max !== undefined && value > fieldSchema.max)
        errors.push(`${fieldSchema.title || key} must be at most ${fieldSchema.max}`);
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
//@ chunk-pzdhtgn4.js:14320-14746 fingerprint (2.1.88 match: generateMcpConfig, 0.707)
/**
 * 由 MCPB manifest 与解压目录生成 MCP 服务器配置（动态导入 @anthropic-ai/mcpb 的 getMcpConfigForManifest，代入用户配置与系统目录）。
 */
async function generateMcpConfig(manifest, extractedPath, userConfig = {}) {
  let { getMcpConfigForManifest } =
    await import("../../../vendor/@anthropic-ai/mcpb/dist/McpbManifestSchema.lazy.js");
  let mcpConfig = await getMcpConfigForManifest({
    manifest,
    extensionPath: extractedPath,
    systemDirs: getSystemDirectories(),
    userConfig,
    pathSeparator: "/",
  });
  if (!mcpConfig) {
    let error = withTelemetryMessage(
      Error(`Failed to generate MCP server configuration from manifest "${manifest.name}"`),
      "MCPB manifest: failed to generate MCP server configuration",
    );
    logError(error);
    throw error;
  }
  let diff = stdioIdentityDiff(manifest.server.mcp_config, mcpConfig);
  return {
    ...mcpConfig,
    ...(diff && {
      configuredCommand: diff,
    }),
  };
}
//@ chunk-pzdhtgn4.js:14746-14885 fingerprint (2.1.88 match: loadCacheMetadata, 0.642)
async function loadCacheMetadata(cacheDir, source) {
  try {
    return await mcpbMetadataStore(cacheDir, source).read();
  } catch (error) {
    logForDebugging(`Failed to load MCPB cache metadata: ${error}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-pzdhtgn4.js:14885-14953 callgraph-fingerprint (2.1.88 match: saveCacheMetadata, 0.554)
async function saveCacheMetadata(cacheDir, source, metadata) {
  await getFsImplementation().mkdir(cacheDir);
  await mcpbMetadataStore(cacheDir, source).write(metadata);
}
//@ chunk-pzdhtgn4.js:14953-15685 fingerprint (2.1.88 match: downloadMcpb, 1)
/**
 * 下载 .mcpb/.dxt 包（记录 tengu_plugin_remote_fetch），返回字节。
 */
async function downloadMcpb(url, destPath, onProgress) {
  let redactedUrl = redactUrlQuery(url);
  logForDebugging(`Downloading MCPB from ${redactedUrl}`);
  if (onProgress) onProgress(`Downloading ${redactedUrl}...`);
  let started = performance.now();
  let fetchTelemetryFired = false;
  try {
    let response = await (isAnthropicOwnedHost(url) ? publicCdnGuardedClient.get : externalHttp.get)(url, {
      timeout: 120000,
      responseType: "arraybuffer",
      maxRedirects: 5,
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          let percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress(`Downloading... ${percent}%`);
        }
      },
    });
    let data = new Uint8Array(response.data);
    logPluginFetch("mcpb", url, "success", performance.now() - started);
    fetchTelemetryFired = true;
    await writeFile(destPath, Buffer.from(data));
    logForDebugging(`Downloaded ${data.length} bytes to ${destPath}`);
    if (onProgress) onProgress("Download complete");
    return data;
  } catch (error) {
    if (!fetchTelemetryFired)
      logPluginFetch("mcpb", url, "failure", performance.now() - started, classifyFetchError(error));
    let errorMsg = redactUrlsInMessage(replaceAll(errorMessage(error), url, redactedUrl));
    let fullError = Error(`Failed to download MCPB file from ${redactedUrl}: ${errorMsg}`);
    logForDebugging(`Failed to download MCPB file from ${redactedUrl}: ${errorMsg}`, {
      level: "error",
    });
    throw fullError;
  }
}
//@ chunk-pzdhtgn4.js:15685-16312 fingerprint (2.1.88 match: extractMcpbContents, 1)
/**
 * 把 MCPB 包内容写到解压目录（恢复文件权限位，回报进度）。
 */
async function extractMcpbContents(unzipped, extractPath, modes, onProgress) {
  if (onProgress) onProgress("Extracting files...");
  await getFsImplementation().mkdir(extractPath);
  let filesWritten = 0;
  let entries = Object.entries(unzipped).filter(([k]) => !k.endsWith("/"));
  let totalFiles = entries.length;
  for (let [filePath, fileData] of entries) {
    let fullPath = join(extractPath, filePath);
    let dir = dirname(fullPath);
    if (dir !== extractPath) await getFsImplementation().mkdir(dir);
    if (
      filePath.endsWith(".json") ||
      filePath.endsWith(".js") ||
      filePath.endsWith(".ts") ||
      filePath.endsWith(".txt") ||
      filePath.endsWith(".md") ||
      filePath.endsWith(".yml") ||
      filePath.endsWith(".yaml")
    ) {
      let content = new TextDecoder().decode(fileData);
      await writeFile(fullPath, content, "utf-8");
    } else await writeFile(fullPath, Buffer.from(fileData));
    let mode = modes[filePath];
    if (mode && mode & 73) await chmod(fullPath, mode & DEFAULT_FILE_MODE).catch(() => {});
    filesWritten++;
    if (onProgress && filesWritten % 10 === 0) onProgress(`Extracted ${filesWritten}/${totalFiles} files`);
  }
  logForDebugging(`Extracted ${filesWritten} files to ${extractPath}`);
  if (onProgress) onProgress(`Extraction complete (${filesWritten} files)`);
}
//@ chunk-pzdhtgn4.js:16312-17035 fingerprint (2.1.88 match: checkMcpbChanged, 0.742)
/**
 * 判断 MCPB 源是否变化（本地文件 mtime/哈希、远程按缓存元数据），决定是否重新解压。
 */
async function checkMcpbChanged(source, pluginPath) {
  let fs = getFsImplementation();
  let cacheDir = getMcpbCacheDir(pluginPath);
  let metadata = await loadCacheMetadata(cacheDir, source);
  if (!metadata) return true;
  try {
    await fs.stat(metadata.extractedPath);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      logForDebugging(`MCPB extraction path missing: ${metadata.extractedPath}`);
    else
      logForDebugging(`MCPB extraction path inaccessible: ${metadata.extractedPath}: ${error}`, {
        level: "error",
      });
    return true;
  }
  if (!isUrl_2(source)) {
    let localSource = join(pluginPath, source);
    let localPath = join(pluginPath, redactUrlQuery(source));
    let stats;
    try {
      stats = await fs.stat(localSource);
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") logForDebugging(`MCPB source file missing: ${localPath}`);
      else
        logForDebugging(
          `MCPB source file inaccessible: ${localPath}: ${replaceAll(String(error), localSource, localPath)}`,
          {
            level: "error",
          },
        );
      return true;
    }
    if (metadata.sourceMtimeMs === undefined) return true;
    let fileTime = Math.floor(stats.mtimeMs);
    if (fileTime !== metadata.sourceMtimeMs) {
      logForDebugging(
        `MCPB file modified: mtime ${new Date(fileTime).toISOString()} != cached ${new Date(metadata.sourceMtimeMs).toISOString()}`,
      );
      return true;
    }
  }
  return false;
}
//@ chunk-pzdhtgn4.js:17035-20234 fingerprint (2.1.88 match: loadMcpbFile, 0.926)
/**
 * 加载 MCPB 包：缓存于 <插件>/.mcpb-cache/<hash>，未变化复用；否则下载/读取、校验 manifest、解压、生成 MCP 配置；需要用户配置时返回 needs-config 与 schema。
 */
async function loadMcpbFile(
  source,
  pluginPath,
  pluginId,
  onProgress,
  providedUserConfig,
  forceConfigDialog,
  storageV5,
  hostStorage,
) {
  let redactedSource = redactUrlQuery(source);
  let fs = getFsImplementation();
  let cacheDir = getMcpbCacheDir(pluginPath);
  await fs.mkdir(cacheDir);
  logForDebugging(`Loading MCPB from source: ${redactedSource}`);
  let metadata = await loadCacheMetadata(cacheDir, source);
  if (metadata && !(await checkMcpbChanged(source, pluginPath))) {
    logForDebugging(`Using cached MCPB from ${metadata.extractedPath} (hash: ${metadata.contentHash})`);
    let manifestPath = join(metadata.extractedPath, "manifest.json");
    let manifestContent;
    try {
      manifestContent = await fs.readFile(manifestPath, {
        encoding: "utf-8",
      });
    } catch (error) {
      if (isENOENT(error)) {
        let err = Error(`Cached manifest not found: ${manifestPath}`);
        logError(err);
        throw err;
      }
      throw error;
    }
    let manifestData = new TextEncoder().encode(manifestContent);
    let manifest = await parseJsonBytes(manifestData);
    if (manifest.user_config && Object.keys(manifest.user_config).length > 0) {
      let serverName = manifest.name;
      let savedConfig = await loadMcpServerUserConfig(pluginId, serverName, hostStorage);
      let userConfig = providedUserConfig || savedConfig || {};
      let validation = validateUserConfig(userConfig, manifest.user_config);
      if (forceConfigDialog || !validation.valid)
        return {
          status: "needs-config",
          manifest,
          extractedPath: metadata.extractedPath,
          contentHash: metadata.contentHash,
          configSchema: manifest.user_config,
          existingConfig: savedConfig || {},
          validationErrors: validation.valid ? [] : validation.errors,
        };
      if (providedUserConfig)
        await saveMcpServerUserConfig(
          pluginId,
          serverName,
          providedUserConfig,
          manifest.user_config ?? {},
          storageV5,
          hostStorage,
        );
      let mcpConfig = await generateMcpConfig(manifest, metadata.extractedPath, userConfig);
      return {
        manifest,
        mcpConfig,
        extractedPath: metadata.extractedPath,
        contentHash: metadata.contentHash,
      };
    }
    let mcpConfig = await generateMcpConfig(manifest, metadata.extractedPath);
    return {
      manifest,
      mcpConfig,
      extractedPath: metadata.extractedPath,
      contentHash: metadata.contentHash,
    };
  }
  let mcpbData;
  let destPath;
  let sourceMtimeMs;
  if (isUrl_2(source)) {
    let sourceHash = createHash("md5").update(source).digest("hex").substring(0, 8);
    destPath = join(cacheDir, `${sourceHash}.mcpb`);
    mcpbData = await downloadMcpb(source, destPath, onProgress);
  } else {
    let localPath = join(pluginPath, source);
    if (onProgress) onProgress(`Loading ${redactedSource}...`);
    try {
      mcpbData = await fs.readFileBytes(localPath);
      destPath = localPath;
      sourceMtimeMs = Math.floor((await fs.stat(localPath)).mtimeMs);
    } catch (error) {
      let redactedPath = join(pluginPath, redactedSource);
      if (isENOENT(error)) {
        let err = Error(`MCPB file not found: ${redactedPath}`);
        logForDebugging(`MCPB file not found: ${redactedPath}`, {
          level: "error",
        });
        throw err;
      }
      throw localPath === redactedPath
        ? error
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            replaceAll(errorMessage(error), localPath, redactedPath),
            "MCPB local file read failed",
          );
    }
  }
  let contentHash = createHash("sha256").update(mcpbData).digest("hex").substring(0, 16);
  logForDebugging(`MCPB content hash: ${contentHash}`);
  if (onProgress) onProgress("Extracting MCPB archive...");
  let unzipped = await unzipFile(Buffer.from(mcpbData));
  let modes = parseZipModes(mcpbData);
  let manifestData = unzipped["manifest.json"];
  if (!manifestData) {
    let error = Error("No manifest.json found in MCPB file");
    logForDebugging(`No manifest.json found in MCPB file: ${destPath}`, {
      level: "error",
    });
    throw error;
  }
  let manifest = await parseJsonBytes(manifestData);
  logForDebugging(`MCPB manifest: ${manifest.name} v${manifest.version} by ${manifest.author.name}`);
  if (!manifest.server) {
    let error = withTelemetryMessage(
      Error(`MCPB manifest for "${manifest.name}" does not define a server configuration`),
      "MCPB manifest does not define a server configuration",
    );
    logError(error);
    throw error;
  }
  let extractPath = join(cacheDir, contentHash);
  await extractMcpbContents(unzipped, extractPath, modes, onProgress);
  if (manifest.user_config && Object.keys(manifest.user_config).length > 0) {
    let serverName = manifest.name;
    let savedConfig = await loadMcpServerUserConfig(pluginId, serverName, hostStorage);
    let userConfig = providedUserConfig || savedConfig || {};
    let validation = validateUserConfig(userConfig, manifest.user_config);
    if (forceConfigDialog || !validation.valid) {
      let newMetadata = {
        source,
        contentHash,
        extractedPath: extractPath,
        cachedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
        sourceMtimeMs,
      };
      await saveCacheMetadata(cacheDir, source, newMetadata);
      return {
        status: "needs-config",
        manifest,
        extractedPath: extractPath,
        contentHash,
        configSchema: manifest.user_config,
        existingConfig: savedConfig || {},
        validationErrors: validation.valid ? [] : validation.errors,
      };
    }
    if (providedUserConfig)
      await saveMcpServerUserConfig(
        pluginId,
        serverName,
        providedUserConfig,
        manifest.user_config ?? {},
        storageV5,
        hostStorage,
      );
    if (onProgress) onProgress("Generating MCP server configuration...");
    let mcpConfig = await generateMcpConfig(manifest, extractPath, userConfig);
    let newMetadata = {
      source,
      contentHash,
      extractedPath: extractPath,
      cachedAt: new Date().toISOString(),
      lastChecked: new Date().toISOString(),
      sourceMtimeMs,
    };
    await saveCacheMetadata(cacheDir, source, newMetadata);
    return {
      manifest,
      mcpConfig,
      extractedPath: extractPath,
      contentHash,
    };
  }
  if (onProgress) onProgress("Generating MCP server configuration...");
  let mcpConfig = await generateMcpConfig(manifest, extractPath);
  let newMetadata = {
    source,
    contentHash,
    extractedPath: extractPath,
    cachedAt: new Date().toISOString(),
    lastChecked: new Date().toISOString(),
    sourceMtimeMs,
  };
  await saveCacheMetadata(cacheDir, source, newMetadata);
  logForDebugging(`Successfully loaded MCPB: ${manifest.name} (extracted to ${extractPath})`);
  return {
    manifest,
    mcpConfig,
    extractedPath: extractPath,
    contentHash,
  };
}
//@ chunk-6vxyfwtv.js:25762-26197 fingerprint (2.1.88 match: isUrl, 1)
function isUrl(source) {
  let links = [];
  let urlStart = -1;
  let urlEnd = -1;
  let closeBracket = -1;
  let index = source.indexOf("[");
  while (index !== -1) {
    if (closeBracket <= index) {
      closeBracket = source.indexOf("]", index + 1);
      if (closeBracket === -1) break;
    }
    let contentStart = closeBracket + 2;
    let schemeLength = source.startsWith("https://", contentStart)
      ? 8
      : source.startsWith("http://", contentStart)
        ? 7
        : 0;
    if (
      source[closeBracket + 1] === "(" &&
      schemeLength > 0 &&
      isShortLinkSpan(source, index + 1, closeBracket)
    ) {
      if (contentStart < urlStart || contentStart >= urlEnd) {
        urlStart = contentStart;
        urlEnd = contentStart;
        while (urlEnd < source.length && !README_LINE_BREAK_CHARS.includes(source[urlEnd] ?? "")) urlEnd++;
      }
      if (source[urlEnd] === ")" && urlEnd > contentStart + schemeLength) {
        links.push({
          start: index,
          end: urlEnd + 1,
          text: source.slice(index + 1, closeBracket),
          url: source.slice(contentStart, urlEnd),
        });
        index = source.indexOf("[", urlEnd + 1);
        continue;
      }
    }
    index = source.indexOf("[", index + 1);
  }
  return links;
}
export {
  loadMcpbFile,
  isMcpbSource,
  isLocalMcpbSource,
  loadMcpServerUserConfig,
  validateUserConfig,
  isUrl,
  saveMcpServerUserConfig,
};
