/**
 * utils/plugins/zipCacheAdapters.ts
 *
 * zip 缓存模式下 known_marketplaces 与 marketplace.json 的读取和同步。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/zipCacheAdapters.ts
 * pieces: chunk-qna1q0cq.js (5)
 * attribution: fingerprint 3, layout 2
 */
import { readFile } from "fs/promises";
import { join } from "path";
import { getZipCacheKnownMarketplacesPath, writeFileEnsuringDir } from "./zipCache.js";
import { KnownMarketplacesFileSchema } from "./schemas.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { getZipCacheDirOverride } from "./pluginDirectories.js";
import {
  findSeedMarketplaceLocation,
  loadKnownMarketplacesSafe,
  validateReservedMarketplaceEntry,
  Dse,
} from "./marketplaceManager.js";
import { omitPluginDirectoryEntries } from "./officialMarketplaceNames.js";

//@ chunk-qna1q0cq.js:661-878 fingerprint = readZipCacheKnownMarketplaces (1)
async function readZipCacheKnownMarketplaces() {
  try {
    let content = await readFile(getZipCacheKnownMarketplacesPath(), "utf-8"),
      parsed = KnownMarketplacesFileSchema().safeParse(jsonParse(content));
    if (!parsed.success)
      return (
        logForDebugging(`Invalid known_marketplaces.json in zip cache: ${parsed.error.message}`, {
          level: "error",
        }),
        {}
      );
    return parsed.data;
  } catch {
    return {};
  }
}
//@ chunk-qna1q0cq.js:878-927 layout
async function S(n) {
  await writeFileEnsuringDir(getZipCacheKnownMarketplacesPath(), jsonStringify(n, null, 2));
}
//@ chunk-qna1q0cq.js:927-1038 layout
async function syncMarketplaceJsonToZipCache(n, e) {
  let s = getZipCacheDirOverride();
  if (!s) return;
  let r = await readMarketplaceJsonContent(e);
  if (r !== null) {
    let o = findSeedMarketplaceLocation(n);
    await writeFileEnsuringDir(join(s, o), r);
  }
}
//@ chunk-qna1q0cq.js:1038-1197 fingerprint = readMarketplaceJsonContent (1)
async function readMarketplaceJsonContent(dir) {
  let candidates = [join(dir, ".claude-plugin", "marketplace.json"), join(dir, "marketplace.json"), dir];
  for (let candidate of candidates)
    try {
      return await readFile(candidate, "utf-8");
    } catch {}
  return null;
}
/**
 * zip 缓存模式下把已知市场的 marketplace.json 同步到 zip 缓存目录。
 */
//@ chunk-qna1q0cq.js:1197-1505 fingerprint = syncMarketplacesToZipCache (0.908)
async function syncMarketplacesToZipCache(n) {
  let e = await loadKnownMarketplacesSafe(n),
    filtered = Object.entries(omitPluginDirectoryEntries(e)).filter(
      ([i, c]) => validateReservedMarketplaceEntry(i, c) === null && !Dse(i, c),
    );
  for (let [i, c] of filtered) {
    if (!c.installLocation) continue;
    try {
      await syncMarketplaceJsonToZipCache(i, c.installLocation);
    } catch (error) {
      logForDebugging(`Failed to save marketplace JSON for ${i}: ${error}`);
    }
  }
  let mergedKnownMarketplaces = {
    ...(await readZipCacheKnownMarketplaces()),
    ...Object.fromEntries(filtered),
  };
  await S(mergedKnownMarketplaces);
}

export { syncMarketplacesToZipCache };
