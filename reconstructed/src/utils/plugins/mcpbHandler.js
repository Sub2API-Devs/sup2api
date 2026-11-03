/**
 * utils/plugins/mcpbHandler.ts
 *
 * MCPB（.mcpb/.dxt）包处理：下载、缓存元数据、解压、生成 MCP 配置，服务器级 userConfig 的读写（敏感值进安全存储）与校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/mcpbHandler.ts
 * pieces: chunk-5aas12zq.js (1), chunk-vr8smdd9.js (18)
 * attribution: fingerprint 13, sole-consumer 1, layout 4, callgraph-fingerprint 1
 */
import { join, join as join_2, dirname, dirname as dirname_2 } from "path";
import { createHash } from "crypto";
import { writeFile, chmod } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { t3 } from "../nativeInstaller/downloadsClient.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { DEFAULT_FILE_MODE, unzipFile, parseZipModes } from "../dxt/zip.js";
import { parseJsonBytes } from "./_new/parseJsonBytes.js";
import { isShortLinkSpan, Ge } from "./validate/readmeAndListing.js";

//@ chunk-vr8smdd9.js:10741-10863 sole-consumer
var McpbCacheMetadataSchema = DoctorLazy(() =>
  u({
    source: o(),
    contentHash: o(),
    extractedPath: o(),
    cachedAt: o(),
    lastChecked: o(),
    sourceMtimeMs: E().optional(),
  }),
);
/**
 * 来源是否为 MCPB 包（.mcpb 或旧名 .dxt）。
 */
//@ chunk-vr8smdd9.js:10863-10925 fingerprint = isMcpbSource (1)
function isMcpbSource(source) {
  return source.endsWith(".mcpb") || source.endsWith(".dxt");
}
//@ chunk-vr8smdd9.js:10925-10997 layout = isUrl (1)
function isUrl_2(source) {
  return source.startsWith("http://") || source.startsWith("https://");
}
/**
 * 是否为本地（非 URL）MCPB 包路径。
 */
//@ chunk-vr8smdd9.js:10997-11034 layout
function isLocalMcpbSource(e) {
  return isMcpbSource(e) && !isUrl_2(e);
}
//@ chunk-vr8smdd9.js:11034-11075 fingerprint = getMcpbCacheDir (1)
function getMcpbCacheDir(pluginPath) {
  return join(pluginPath, ".mcpb-cache");
}
//@ chunk-vr8smdd9.js:11075-11180 fingerprint = getMetadataPath (1)
function getMetadataPath(cacheDir, source) {
  let sourceHash = createHash("md5").update(source).digest("hex").substring(0, 8);
  return join(cacheDir, `${sourceHash}.metadata.json`);
}
//@ chunk-vr8smdd9.js:11180-11266 layout
function qe(e, r) {
  return createJsonStore(getMetadataPath(e, r), () => McpbCacheMetadataSchema().nullable(), {
    defaultValue: null,
    indent: 2,
  });
}
//@ chunk-vr8smdd9.js:11266-11301 layout
function Je(e, r) {
  return `${e}/${r}`;
}
/**
 * 读取某插件 MCP 服务器的用户配置：非敏感值来自 settings，敏感值来自安全存储 pluginSecrets["插件/服务器"]。
 */
//@ chunk-vr8smdd9.js:11301-11610 fingerprint = loadMcpServerUserConfig (0.908)
async function loadMcpServerUserConfig(e, r, n) {
  try {
    let nonSensitive = trustedPluginSetting(e).mcpServers?.[r],
      sensitive = (await getSecureStorage().readAsync(n))?.pluginSecrets?.[Je(e, r)];
    if (!nonSensitive && !sensitive) return null;
    return (
      logForDebugging(`Loaded user config for ${e}/${r} (settings + secureStorage)`),
      { ...nonSensitive, ...sensitive }
    );
  } catch (error) {
    return (logForDebugging(`Failed to load user config for ${e}/${r}: ${error}`, { level: "error" }), null);
  }
}
/**
 * 保存某插件 MCP 服务器的用户配置（敏感值进安全存储）。
 */
//@ chunk-vr8smdd9.js:11610-13130 fingerprint = saveMcpServerUserConfig (0.936)
async function saveMcpServerUserConfig(e, r, n, s, a, f) {
  try {
    let m = {},
      c = {};
    for (let [T, O] of Object.entries(n))
      if (s[T]?.sensitive === !0) c[T] = String(O);
      else m[T] = O;
    let sensitiveKeysInThisSave = new Set(Object.keys(c)),
      nonSensitiveKeysInThisSave = new Set(Object.keys(m)),
      x = Je(e, r),
      w = 0,
      mutate = await getSecureStorage().mutate((T) => {
        let O = T.pluginSecrets?.[x],
          F = O ? filterEntriesToNullProto(O, (v, P) => !nonSensitiveKeysInThisSave.has(P)) : void 0;
        if (
          ((w = F && O ? Object.keys(O).length - Object.keys(F).length : 0),
          Object.keys(c).length === 0 && w === 0)
        )
          return T;
        return { ...T, pluginSecrets: { ...T.pluginSecrets, [x]: { ...F, ...c } } };
      }, f);
    if (!mutate.success) throw Error(`Failed to save sensitive config to secure storage for ${x}`);
    if (mutate.warning) logForDebugging(`Server secrets save warning: ${mutate.warning}`, { level: "warn" });
    if (w > 0)
      logForDebugging(
        `saveMcpServerUserConfig: scrubbed ${w} stale non-sensitive key(s) from secureStorage for ${x}`,
      );
    let S = getSettingsForSourceForUpkeep("userSettings")?.pluginConfigs,
      b = {},
      M = 0;
    for (let T of pluginIdAliases(e)) {
      let keysToScrubFromSettings = Object.keys(S?.[T]?.mcpServers?.[r] ?? {}).filter((P) =>
          sensitiveKeysInThisSave.has(P),
        ),
        scrubbed = Object.fromEntries(keysToScrubFromSettings.map((P) => [P, void 0])),
        v = T === e ? m : {};
      if (Object.keys(v).length > 0 || keysToScrubFromSettings.length > 0)
        ((b[T] = { mcpServers: { [r]: { ...v, ...scrubbed } } }), (M += keysToScrubFromSettings.length));
    }
    if (Object.keys(b).length > 0) {
      let T = await updateSettingsForSource("userSettings", { pluginConfigs: b }, void 0, a);
      if (T.error) throw T.error;
      if (M > 0)
        logForDebugging(
          `saveMcpServerUserConfig: scrubbed ${M} plaintext sensitive key(s) from settings.json for ${e}/${r}`,
        );
    }
    logForDebugging(
      `Saved user config for ${e}/${r} (${Object.keys(m).length} non-sensitive, ${Object.keys(c).length} sensitive)`,
    );
  } catch (error) {
    let errorObj = toError(error);
    throw (
      logForDebugging(`Failed to save user config for ${e}/${r}: ${errorObj.message}`, { level: "error" }),
      Error(`Failed to save user configuration for ${e}/${r}: ${errorObj.message}`)
    );
  }
}
/**
 * 按 userConfig schema 校验值：必填、类型（string/number/boolean/directory/file）、min/max、options。
 */
//@ chunk-vr8smdd9.js:13130-14254 fingerprint = validateUserConfig (0.955)
function validateUserConfig(values, schema) {
  let errors = [];
  for (let [s, a] of Object.entries(schema)) {
    let f = getOwn(values, s);
    if (a.required && (f === void 0 || f === "")) {
      errors.push(`${a.title || s} is required but not provided`);
      continue;
    }
    if (f === void 0 || f === "") continue;
    if (a.type === "string") {
      if (Array.isArray(f)) {
        if (!a.multiple) errors.push(`${a.title || s} must be a string, not an array`);
        else if (!f.every((m) => typeof m === "string"))
          errors.push(`${a.title || s} must be an array of strings`);
      } else if (typeof f !== "string") errors.push(`${a.title || s} must be a string`);
      else if (a.options !== void 0 && !a.options.includes(f))
        errors.push(`${a.title || s} must be one of: ${a.options.join(", ")}`);
    } else if (a.type === "number" && typeof f !== "number") errors.push(`${a.title || s} must be a number`);
    else if (a.type === "boolean" && typeof f !== "boolean") errors.push(`${a.title || s} must be a boolean`);
    else if ((a.type === "file" || a.type === "directory") && typeof f !== "string")
      errors.push(`${a.title || s} must be a path string`);
    if (a.type === "number" && typeof f === "number") {
      if (a.min !== void 0 && f < a.min) errors.push(`${a.title || s} must be at least ${a.min}`);
      if (a.max !== void 0 && f > a.max) errors.push(`${a.title || s} must be at most ${a.max}`);
    }
  }
  return { valid: errors.length === 0, errors: errors };
}
/**
 * 由 MCPB manifest 与解压目录生成 MCP 服务器配置（动态导入 @anthropic-ai/mcpb 的 getMcpConfigForManifest，代入用户配置与系统目录）。
 */
//@ chunk-vr8smdd9.js:14254-14680 fingerprint = generateMcpConfig (0.708)
async function generateMcpConfig(manifest, extractedPath, userConfig = {}) {
  let { getMcpConfigForManifest: getMcpConfigForManifest } = await import("./chunk-64s30qnv.js"),
    mcpConfig = await getMcpConfigForManifest({
      manifest: manifest,
      extensionPath: extractedPath,
      systemDirs: getSystemDirectories(),
      userConfig: userConfig,
      pathSeparator: "/",
    });
  if (!mcpConfig) {
    let m = withTelemetryMessage(
      Error(`Failed to generate MCP server configuration from manifest "${manifest.name}"`),
      "MCPB manifest: failed to generate MCP server configuration",
    );
    throw (logError(m), m);
  }
  let f = stdioIdentityDiff(manifest.server.mcp_config, mcpConfig);
  return { ...mcpConfig, ...(f && { configuredCommand: f }) };
}
//@ chunk-vr8smdd9.js:14680-14819 fingerprint = loadCacheMetadata (0.642)
async function loadCacheMetadata(cacheDir, source) {
  try {
    return await qe(cacheDir, source).read();
  } catch (error) {
    return (logForDebugging(`Failed to load MCPB cache metadata: ${error}`, { level: "error" }), null);
  }
}
//@ chunk-vr8smdd9.js:14819-14887 callgraph-fingerprint = saveCacheMetadata (0.555)
async function saveCacheMetadata(cacheDir, source, metadata) {
  (await getFsImplementation().mkdir(cacheDir), await qe(cacheDir, source).write(metadata));
}
/**
 * 下载 .mcpb/.dxt 包（记录 tengu_plugin_remote_fetch），返回字节。
 */
//@ chunk-vr8smdd9.js:14887-15619 fingerprint = downloadMcpb (1)
async function downloadMcpb(url, destPath, onProgress) {
  let s = redactUrlQuery(url);
  if ((logForDebugging(`Downloading MCPB from ${s}`), onProgress)) onProgress(`Downloading ${s}...`);
  let started = performance.now(),
    f = !1;
  try {
    let c = await (isAnthropicOwnedHost(url) ? t3.get : externalHttp.get)(url, {
        timeout: 120000,
        responseType: "arraybuffer",
        maxRedirects: 5,
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            let percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(`Downloading... ${percent}%`);
          }
        },
      }),
      data = new Uint8Array(c.data);
    if (
      (logPluginFetch("mcpb", url, "success", performance.now() - started),
      (f = !0),
      await writeFile(destPath, Buffer.from(data)),
      logForDebugging(`Downloaded ${data.length} bytes to ${destPath}`),
      onProgress)
    )
      onProgress("Download complete");
    return data;
  } catch (error) {
    if (!f) logPluginFetch("mcpb", url, "failure", performance.now() - started, classifyFetchError(error));
    let errorMsg = redactUrlsInMessage(replaceAll(errorMessage(error), url, s)),
      g = Error(`Failed to download MCPB file from ${s}: ${errorMsg}`);
    throw (logForDebugging(`Failed to download MCPB file from ${s}: ${errorMsg}`, { level: "error" }), g);
  }
}
/**
 * 把 MCPB 包内容写到解压目录（恢复文件权限位，回报进度）。
 */
//@ chunk-vr8smdd9.js:15619-16246 fingerprint = extractMcpbContents (1)
async function extractMcpbContents(unzipped, extractPath, modes, onProgress) {
  if (onProgress) onProgress("Extracting files...");
  await getFsImplementation().mkdir(extractPath);
  let filesWritten = 0,
    entries = Object.entries(unzipped).filter(([c]) => !c.endsWith("/")),
    totalFiles = entries.length;
  for (let [c, g] of entries) {
    let fullPath = join(extractPath, c),
      dir = dirname_2(fullPath);
    if (dir !== extractPath) await getFsImplementation().mkdir(dir);
    if (
      c.endsWith(".json") ||
      c.endsWith(".js") ||
      c.endsWith(".ts") ||
      c.endsWith(".txt") ||
      c.endsWith(".md") ||
      c.endsWith(".yml") ||
      c.endsWith(".yaml")
    ) {
      let content = new TextDecoder().decode(g);
      await writeFile(fullPath, content, "utf-8");
    } else await writeFile(fullPath, Buffer.from(g));
    let mode = modes[c];
    if (mode && mode & 73) await chmod(fullPath, mode & DEFAULT_FILE_MODE).catch(() => {});
    if ((filesWritten++, onProgress && filesWritten % 10 === 0))
      onProgress(`Extracted ${filesWritten}/${totalFiles} files`);
  }
  if ((logForDebugging(`Extracted ${filesWritten} files to ${extractPath}`), onProgress))
    onProgress(`Extraction complete (${filesWritten} files)`);
}
/**
 * 判断 MCPB 源是否变化（本地文件 mtime/哈希、远程按缓存元数据），决定是否重新解压。
 */
//@ chunk-vr8smdd9.js:16246-16969 fingerprint = checkMcpbChanged (0.742)
async function checkMcpbChanged(source, pluginPath) {
  let fs = getFsImplementation(),
    cacheDir = getMcpbCacheDir(pluginPath),
    metadata = await loadCacheMetadata(cacheDir, source);
  if (!metadata) return !0;
  try {
    await fs.stat(metadata.extractedPath);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      logForDebugging(`MCPB extraction path missing: ${metadata.extractedPath}`);
    else
      logForDebugging(`MCPB extraction path inaccessible: ${metadata.extractedPath}: ${error}`, {
        level: "error",
      });
    return !0;
  }
  if (!isUrl_2(source)) {
    let f = join(pluginPath, source),
      localPath = join(pluginPath, redactUrlQuery(source)),
      stats;
    try {
      stats = await fs.stat(f);
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") logForDebugging(`MCPB source file missing: ${localPath}`);
      else
        logForDebugging(
          `MCPB source file inaccessible: ${localPath}: ${replaceAll(String(error), f, localPath)}`,
          { level: "error" },
        );
      return !0;
    }
    if (metadata.sourceMtimeMs === void 0) return !0;
    let fileTime = Math.floor(stats.mtimeMs);
    if (fileTime !== metadata.sourceMtimeMs)
      return (
        logForDebugging(
          `MCPB file modified: mtime ${new Date(fileTime).toISOString()} != cached ${new Date(metadata.sourceMtimeMs).toISOString()}`,
        ),
        !0
      );
  }
  return !1;
}
/**
 * 加载 MCPB 包：缓存于 <插件>/.mcpb-cache/<hash>，未变化复用；否则下载/读取、校验 manifest、解压、生成 MCP 配置；需要用户配置时返回 needs-config 与 schema。
 */
//@ chunk-vr8smdd9.js:16969-20170 fingerprint = loadMcpbFile (0.926)
async function loadMcpbFile(source, pluginPath, pluginId, onProgress, a, f, m, c) {
  let g = redactUrlQuery(source),
    fs = getFsImplementation(),
    cacheDir = getMcpbCacheDir(pluginPath);
  (await fs.mkdir(cacheDir), logForDebugging(`Loading MCPB from source: ${g}`));
  let metadata = await loadCacheMetadata(cacheDir, source);
  if (metadata && !(await checkMcpbChanged(source, pluginPath))) {
    logForDebugging(`Using cached MCPB from ${metadata.extractedPath} (hash: ${metadata.contentHash})`);
    let manifestPath = join(metadata.extractedPath, "manifest.json"),
      R;
    try {
      R = await fs.readFile(manifestPath, { encoding: "utf-8" });
    } catch (error) {
      if (isENOENT(error)) {
        let X = Error(`Cached manifest not found: ${manifestPath}`);
        throw (logError(X), X);
      }
      throw error;
    }
    let manifestData = new TextEncoder().encode(R),
      manifest = await parseJsonBytes(manifestData);
    if (manifest.user_config && Object.keys(manifest.user_config).length > 0) {
      let serverName = manifest.name,
        X = await loadMcpServerUserConfig(pluginId, serverName, c),
        Ke = a || X || {},
        validation = validateUserConfig(Ke, manifest.user_config);
      if (f || !validation.valid)
        return {
          status: "needs-config",
          manifest: manifest,
          extractedPath: metadata.extractedPath,
          contentHash: metadata.contentHash,
          configSchema: manifest.user_config,
          existingConfig: X || {},
          validationErrors: validation.valid ? [] : validation.errors,
        };
      if (a) await saveMcpServerUserConfig(pluginId, serverName, a, manifest.user_config ?? {}, m, c);
      let mcpConfig = await generateMcpConfig(manifest, metadata.extractedPath, Ke);
      return {
        manifest: manifest,
        mcpConfig: mcpConfig,
        extractedPath: metadata.extractedPath,
        contentHash: metadata.contentHash,
      };
    }
    let mcpConfig = await generateMcpConfig(manifest, metadata.extractedPath);
    return {
      manifest: manifest,
      mcpConfig: mcpConfig,
      extractedPath: metadata.extractedPath,
      contentHash: metadata.contentHash,
    };
  }
  let y, S, b;
  if (isUrl_2(source)) {
    let sourceHash = createHash("md5").update(source).digest("hex").substring(0, 8);
    ((S = join(cacheDir, `${sourceHash}.mcpb`)), (y = await downloadMcpb(source, S, onProgress)));
  } else {
    let localPath = join(pluginPath, source);
    if (onProgress) onProgress(`Loading ${g}...`);
    try {
      ((y = await fs.readFileBytes(localPath)),
        (S = localPath),
        (b = Math.floor((await fs.stat(localPath)).mtimeMs)));
    } catch (error) {
      let _ = join(pluginPath, g);
      if (isENOENT(error)) {
        let contentHash = Error(`MCPB file not found: ${_}`);
        throw (logForDebugging(`MCPB file not found: ${_}`, { level: "error" }), contentHash);
      }
      throw localPath === _
        ? error
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            replaceAll(errorMessage(error), localPath, _),
            "MCPB local file read failed",
          );
    }
  }
  let substring = createHash("sha256").update(y).digest("hex").substring(0, 16);
  if ((logForDebugging(`MCPB content hash: ${substring}`), onProgress))
    onProgress("Extracting MCPB archive...");
  let unzipped = await unzipFile(Buffer.from(y)),
    modes = parseZipModes(y),
    manifestData = unzipped["manifest.json"];
  if (!manifestData) {
    let L = Error("No manifest.json found in MCPB file");
    throw (logForDebugging(`No manifest.json found in MCPB file: ${S}`, { level: "error" }), L);
  }
  let manifest = await parseJsonBytes(manifestData);
  if (
    (logForDebugging(`MCPB manifest: ${manifest.name} v${manifest.version} by ${manifest.author.name}`),
    !manifest.server)
  ) {
    let L = withTelemetryMessage(
      Error(`MCPB manifest for "${manifest.name}" does not define a server configuration`),
      "MCPB manifest does not define a server configuration",
    );
    throw (logError(L), L);
  }
  let extractPath = join(cacheDir, substring);
  if (
    (await extractMcpbContents(unzipped, extractPath, modes, onProgress),
    manifest.user_config && Object.keys(manifest.user_config).length > 0)
  ) {
    let serverName = manifest.name,
      R = await loadMcpServerUserConfig(pluginId, serverName, c),
      _ = a || R || {},
      validation = validateUserConfig(_, manifest.user_config);
    if (f || !validation.valid) {
      let X = {
        source: source,
        contentHash: substring,
        extractedPath: extractPath,
        cachedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
        sourceMtimeMs: b,
      };
      return (
        await saveCacheMetadata(cacheDir, source, X),
        {
          status: "needs-config",
          manifest: manifest,
          extractedPath: extractPath,
          contentHash: substring,
          configSchema: manifest.user_config,
          existingConfig: R || {},
          validationErrors: validation.valid ? [] : validation.errors,
        }
      );
    }
    if (a) await saveMcpServerUserConfig(pluginId, serverName, a, manifest.user_config ?? {}, m, c);
    if (onProgress) onProgress("Generating MCP server configuration...");
    let mcpConfig = await generateMcpConfig(manifest, extractPath, _),
      G = {
        source: source,
        contentHash: substring,
        extractedPath: extractPath,
        cachedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
        sourceMtimeMs: b,
      };
    return (
      await saveCacheMetadata(cacheDir, source, G),
      { manifest: manifest, mcpConfig: mcpConfig, extractedPath: extractPath, contentHash: substring }
    );
  }
  if (onProgress) onProgress("Generating MCP server configuration...");
  let mcpConfig = await generateMcpConfig(manifest, extractPath),
    ue = {
      source: source,
      contentHash: substring,
      extractedPath: extractPath,
      cachedAt: new Date().toISOString(),
      lastChecked: new Date().toISOString(),
      sourceMtimeMs: b,
    };
  return (
    await saveCacheMetadata(cacheDir, source, ue),
    logForDebugging(`Successfully loaded MCPB: ${manifest.name} (extracted to ${extractPath})`),
    { manifest: manifest, mcpConfig: mcpConfig, extractedPath: extractPath, contentHash: substring }
  );
}
//@ chunk-5aas12zq.js:25474-25909 fingerprint = isUrl (1)
function isUrl(source) {
  let n = [],
    t = -1,
    r = -1,
    s = -1,
    index = source.indexOf("[");
  while (index !== -1) {
    if (s <= index) {
      if (((s = source.indexOf("]", index + 1)), s === -1)) break;
    }
    let a = s + 2,
      l = source.startsWith("https://", a) ? 8 : source.startsWith("http://", a) ? 7 : 0;
    if (source[s + 1] === "(" && l > 0 && isShortLinkSpan(source, index + 1, s)) {
      if (a < t || a >= r) {
        ((t = a), (r = a));
        while (r < source.length && !Ge.includes(source[r] ?? "")) r++;
      }
      if (source[r] === ")" && r > a + l) {
        (n.push({ start: index, end: r + 1, text: source.slice(index + 1, s), url: source.slice(a, r) }),
          (index = source.indexOf("[", r + 1)));
        continue;
      }
    }
    index = source.indexOf("[", index + 1);
  }
  return n;
}

export {
  isMcpbSource,
  isLocalMcpbSource,
  loadMcpbFile,
  validateUserConfig,
  saveMcpServerUserConfig,
  loadMcpServerUserConfig,
  isUrl,
};
