/**
 * utils/fileStateCache.ts
 *
 * readFileState 的复制/合并/清空（真正的缓存类在未归属代码中）；混有保留技能命名空间检测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fileStateCache.ts
 * pieces: chunk-82kqcve8.js (3), chunk-dcmhvw5a.js (5)
 * attribution: fingerprint 1, layout 1, callgraph-fingerprint 1, placement 5
 */
import { managedPathCache } from "./settings/managedPath.js";
import { asciiOnly } from "./settings/otelEndpointValidation.js";
import { createRemoteFileState } from "./remoteFileState.js";

//@ chunk-dcmhvw5a.js:428776-428816 placement
/**
 * 托管设置 drop-in 目录。
 */
function getDropInDir() {
  return managedPathCache.getDropInDir();
}
//@ chunk-dcmhvw5a.js:428816-428827 placement
var MAX_SERIALIZED_ERROR_CHARS = 512;
//@ chunk-dcmhvw5a.js:428827-428860 placement
/**
 * 序列化设置错误列表。
 */
function serializeSettingsErrors(errors) {
  return errors.map(serializeSettingsError);
}
//@ chunk-dcmhvw5a.js:428860-429514 placement
/**
 * 序列化单条设置错误。
 */
function serializeSettingsError(settingsError) {
  let {
    file,
    severity,
    docLink,
    statusOnly,
    startupFatal,
    loadedWithoutGuardHook,
    errorClass,
    errno,
    preserveOnWrite,
    mcpErrorMetadata,
    userWritable,
    wslIgnored,
    substituted,
    onlySubstitutes,
    removal,
    path,
    message,
    expected,
    suggestion,
    invalidValue,
    ...extraErrorFields
  } = settingsError;
  let extraErrorFieldsAlias = extraErrorFields;
  return {
    file,
    severity,
    docLink,
    statusOnly,
    startupFatal,
    loadedWithoutGuardHook,
    errorClass,
    errno,
    preserveOnWrite,
    mcpErrorMetadata,
    userWritable,
    wslIgnored,
    substituted,
    onlySubstitutes,
    removal,
    path: serializeErrorText(path),
    message: serializeErrorText(message),
    expected: expected === undefined ? undefined : serializeErrorText(expected),
    suggestion: suggestion === undefined ? undefined : serializeErrorText(suggestion),
    invalidValue: typeof invalidValue === "string" ? serializeErrorText(invalidValue) : undefined,
  };
}
//@ chunk-dcmhvw5a.js:429514-429611 placement
function serializeErrorText(text) {
  let collapsedText = asciiOnly(text.replace(/\s+/gu, " "));
  return collapsedText.length > MAX_SERIALIZED_ERROR_CHARS
    ? `${collapsedText.slice(0, MAX_SERIALIZED_ERROR_CHARS - 1)}\u2026`
    : collapsedText;
}
//@ chunk-82kqcve8.js:80891-81142 fingerprint (2.1.88 match: cloneFileStateCache, 0.55)
/**
 * 复制 readFileState（同容量），可把 seededFromContext 置为 false，保留 start-only 标记；子代理/分叉用。
 */
function cloneFileStateCache(readFileState, options) {
  let cloned = createRemoteFileState(readFileState.max, readFileState.maxSize);
  let dumpedEntries = readFileState.dump();
  if (options?.stripSeededFromContext) {
    for (let cacheEntry of dumpedEntries)
      if (cacheEntry[1].value?.seededFromContext)
        cacheEntry[1].value = {
          ...cacheEntry[1].value,
          seededFromContext: false,
        };
  }
  cloned.load(dumpedEntries);
  for (let startOnlyPath of readFileState.startOnlyPaths()) cloned.markStartOnly(startOnlyPath);
  return cloned;
}
//@ chunk-82kqcve8.js:81142-81269 layout
/**
 * 清空 readFileState，但保留启动时预置的记忆文件记录。
 */
function clearFileStateCacheKeepingSeeds(readFileState) {
  let seedEntries = [];
  for (let [filePath, cacheEntry] of readFileState.entries())
    if (cacheEntry.startupMemorySeed) seedEntries.push([filePath, cacheEntry]);
  readFileState.clear();
  for (let [filePath, cacheEntry] of seedEntries) readFileState.set(filePath, cacheEntry);
}
//@ chunk-82kqcve8.js:81269-81394 callgraph-fingerprint (2.1.88 match: mergeFileStateCaches, 1)
/**
 * 合并两个 readFileState，同一路径取时间戳较新的记录。
 */
function mergeFileStateCaches(first, second) {
  let merged = cloneFileStateCache(first);
  for (let [filePath, fileState] of second.entries()) {
    let existing = merged.get(filePath);
    if (!existing || fileState.timestamp > existing.timestamp) merged.set(filePath, fileState);
  }
  return merged;
}
export {
  cloneFileStateCache,
  getDropInDir,
  mergeFileStateCaches,
  clearFileStateCacheKeepingSeeds,
  serializeSettingsErrors,
};
