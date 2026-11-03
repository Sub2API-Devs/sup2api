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
function serializeSettingsErrors(e) {
  return e.map(serializeSettingsError);
}
//@ chunk-dcmhvw5a.js:428860-429514 placement
/**
 * 序列化单条设置错误。
 */
function serializeSettingsError(e) {
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
    ...ee
  } = e;
  let Z = ee;
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
function serializeErrorText(e) {
  let n = asciiOnly(e.replace(/\s+/gu, " "));
  return n.length > MAX_SERIALIZED_ERROR_CHARS ? `${n.slice(0, MAX_SERIALIZED_ERROR_CHARS - 1)}\u2026` : n;
}
//@ chunk-82kqcve8.js:80891-81142 fingerprint = cloneFileStateCache (0.55)
/**
 * 复制 readFileState（同容量），可把 seededFromContext 置为 false，保留 start-only 标记；子代理/分叉用。
 */
function cloneFileStateCache(readFileState, n) {
  let cloned = createRemoteFileState(readFileState.max, readFileState.maxSize);
  let s = readFileState.dump();
  if (n?.stripSeededFromContext) {
    for (let h of s)
      if (h[1].value?.seededFromContext)
        h[1].value = {
          ...h[1].value,
          seededFromContext: false,
        };
  }
  cloned.load(s);
  for (let h of readFileState.startOnlyPaths()) cloned.markStartOnly(h);
  return cloned;
}
//@ chunk-82kqcve8.js:81142-81269 layout
/**
 * 清空 readFileState，但保留启动时预置的记忆文件记录。
 */
function clearFileStateCacheKeepingSeeds(readFileState) {
  let n = [];
  for (let [r, s] of readFileState.entries()) if (s.startupMemorySeed) n.push([r, s]);
  readFileState.clear();
  for (let [r, s] of n) readFileState.set(r, s);
}
//@ chunk-82kqcve8.js:81269-81394 callgraph-fingerprint = mergeFileStateCaches (1)
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
