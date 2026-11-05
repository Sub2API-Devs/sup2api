/**
 * utils/plugins/zipCacheAdapters.ts
 *
 * zip 缓存模式下 known_marketplaces 与 marketplace.json 的读取和同步。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/zipCacheAdapters.ts
 * pieces: chunk-54b7qs0h.js (5)
 * attribution: fingerprint 3, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readFile } from "fs/promises";
import { join } from "path";
import {
  getZipCacheKnownMarketplacesPath,
  writeFileEnsuringDir,
  getZipCacheDirOverride,
} from "./zipCache.js";
import { KnownMarketplacesFileSchema } from "./schemas.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import {
  findSeedMarketplaceLocation,
  loadKnownMarketplacesSafe,
  validateReservedMarketplaceEntry,
  isImpersonatingOfficialMarketplace,
} from "./marketplaceManager.js";
import { omitPluginDirectoryEntries } from "./officialMarketplaceNames.js";

//@ chunk-54b7qs0h.js:662-879 fingerprint (2.1.88 match: readZipCacheKnownMarketplaces, 1)
async function readZipCacheKnownMarketplaces() {
  try {
    let content = await readFile(getZipCacheKnownMarketplacesPath(), "utf-8");
    let parsed = KnownMarketplacesFileSchema().safeParse(jsonParse(content));
    if (!parsed.success) {
      logForDebugging(`Invalid known_marketplaces.json in zip cache: ${parsed.error.message}`, {
        level: "error",
      });
      return {};
    }
    return parsed.data;
  } catch {
    return {};
  }
}
//@ chunk-54b7qs0h.js:879-928 layout
async function writeZipCacheKnownMarketplaces(data) {
  await writeFileEnsuringDir(getZipCacheKnownMarketplacesPath(), jsonStringify(data, null, 2));
}
//@ chunk-54b7qs0h.js:928-1039 layout
async function syncMarketplaceJsonToZipCache(marketplaceName, installLocation) {
  let zipCachePath = getZipCacheDirOverride();
  if (!zipCachePath) return;
  let content = await readMarketplaceJsonContent(installLocation);
  if (content !== null) {
    let relPath = findSeedMarketplaceLocation(marketplaceName);
    await writeFileEnsuringDir(join(zipCachePath, relPath), content);
  }
}
//@ chunk-54b7qs0h.js:1039-1198 fingerprint (2.1.88 match: readMarketplaceJsonContent, 1)
async function readMarketplaceJsonContent(dir) {
  let candidates = [join(dir, ".claude-plugin", "marketplace.json"), join(dir, "marketplace.json"), dir];
  for (let candidate of candidates)
    try {
      return await readFile(candidate, "utf-8");
    } catch {}
  return null;
}
//@ chunk-54b7qs0h.js:1198-1506 fingerprint (2.1.88 match: syncMarketplacesToZipCache, 0.908)
/**
 * zip 缓存模式下把已知市场的 marketplace.json 同步到 zip 缓存目录。
 */
async function syncMarketplacesToZipCache(storageV5) {
  let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
  let filtered = Object.entries(omitPluginDirectoryEntries(knownMarketplaces)).filter(
    ([key, value]) =>
      validateReservedMarketplaceEntry(key, value) === null &&
      !isImpersonatingOfficialMarketplace(key, value),
  );
  for (let [marketplaceName, entry] of filtered) {
    if (!entry.installLocation) continue;
    try {
      await syncMarketplaceJsonToZipCache(marketplaceName, entry.installLocation);
    } catch (error) {
      logForDebugging(`Failed to save marketplace JSON for ${marketplaceName}: ${error}`);
    }
  }
  let mergedKnownMarketplaces = {
    ...(await readZipCacheKnownMarketplaces()),
    ...Object.fromEntries(filtered),
  };
  await writeZipCacheKnownMarketplaces(mergedKnownMarketplaces);
}
export { syncMarketplacesToZipCache };
