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
import { Lp } from "./settings/managedPath.js";
import { asciiOnly } from "./settings/otelEndpointValidation.js";
import { nv } from "./remoteFileState.js";

/**
 * 托管设置 drop-in 目录。
 */
//@ chunk-dcmhvw5a.js:428776-428816 placement
function getDropInDir() {
  return Lp.getDropInDir();
}
//@ chunk-dcmhvw5a.js:428816-428827 placement
var Np = 512;
/**
 * 序列化设置错误列表。
 */
//@ chunk-dcmhvw5a.js:428827-428860 placement
function serializeSettingsErrors(e) {
  return e.map(serializeSettingsError);
}
/**
 * 序列化单条设置错误。
 */
//@ chunk-dcmhvw5a.js:428860-429514 placement
function serializeSettingsError(e) {
  let {
      file: file,
      severity: severity,
      docLink: docLink,
      statusOnly: statusOnly,
      startupFatal: startupFatal,
      loadedWithoutGuardHook: loadedWithoutGuardHook,
      errorClass: errorClass,
      errno: errno,
      preserveOnWrite: preserveOnWrite,
      mcpErrorMetadata: mcpErrorMetadata,
      userWritable: userWritable,
      wslIgnored: wslIgnored,
      substituted: substituted,
      onlySubstitutes: onlySubstitutes,
      removal: removal,
      path: path,
      message: message,
      expected: expected,
      suggestion: suggestion,
      invalidValue: invalidValue,
      ...ee
    } = e,
    Z = ee;
  return {
    file: file,
    severity: severity,
    docLink: docLink,
    statusOnly: statusOnly,
    startupFatal: startupFatal,
    loadedWithoutGuardHook: loadedWithoutGuardHook,
    errorClass: errorClass,
    errno: errno,
    preserveOnWrite: preserveOnWrite,
    mcpErrorMetadata: mcpErrorMetadata,
    userWritable: userWritable,
    wslIgnored: wslIgnored,
    substituted: substituted,
    onlySubstitutes: onlySubstitutes,
    removal: removal,
    path: An(path),
    message: An(message),
    expected: expected === void 0 ? void 0 : An(expected),
    suggestion: suggestion === void 0 ? void 0 : An(suggestion),
    invalidValue: typeof invalidValue === "string" ? An(invalidValue) : void 0,
  };
}
//@ chunk-dcmhvw5a.js:429514-429611 placement
function An(e) {
  let n = asciiOnly(e.replace(/\s+/gu, " "));
  return n.length > Np ? `${n.slice(0, Np - 1)}\u2026` : n;
}
/**
 * 复制 readFileState（同容量），可把 seededFromContext 置为 false，保留 start-only 标记；子代理/分叉用。
 */
//@ chunk-82kqcve8.js:80891-81142 fingerprint = cloneFileStateCache (0.55)
function cloneFileStateCache(e, n) {
  let cloned = nv(e.max, e.maxSize),
    dump = e.dump();
  if (n?.stripSeededFromContext) {
    for (let h of dump)
      if (h[1].value?.seededFromContext) h[1].value = { ...h[1].value, seededFromContext: !1 };
  }
  cloned.load(dump);
  for (let h of e.startOnlyPaths()) cloned.markStartOnly(h);
  return cloned;
}
/**
 * 清空 readFileState，但保留启动时预置的记忆文件记录。
 */
//@ chunk-82kqcve8.js:81142-81269 layout
function clearFileStateCacheKeepingSeeds(e) {
  let n = [];
  for (let [r, s] of e.entries()) if (s.startupMemorySeed) n.push([r, s]);
  e.clear();
  for (let [r, s] of n) e.set(r, s);
}
/**
 * 合并两个 readFileState，同一路径取时间戳较新的记录。
 */
//@ chunk-82kqcve8.js:81269-81394 callgraph-fingerprint = mergeFileStateCaches (1)
function mergeFileStateCaches(first, second) {
  let merged = cloneFileStateCache(first);
  for (let [s, h] of second.entries()) {
    let existing = merged.get(s);
    if (!existing || h.timestamp > existing.timestamp) merged.set(s, h);
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
