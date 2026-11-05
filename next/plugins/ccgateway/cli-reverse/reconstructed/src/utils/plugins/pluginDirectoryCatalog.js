/**
 * utils/plugins/pluginDirectoryCatalog.ts
 *
 * 2.1.316 新增：插件目录（官方 directory）缓存与刷新：分页拉取、读写本地缓存、修复改名条目、跳过原因。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-036m2pwj.js (65)
 * attribution: placement 64, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { unlink, lstat } from "fs/promises";
import { INVISIBLE_CHAR_CLASS_SOURCE } from "../sanitization.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  array,
  unknown,
  booleanSchema,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getPluginsDirectory, sanitizePluginIdLower } from "./pluginDirectories.js";
import {
  readPluginsDirJsonFile,
  bindingsWithReadFailure,
  isUnreadableBindings,
  isOfficialPluginDirectoryId,
  findBindingKeysFor,
} from "./pluginDirectoryBindings.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import {
  parseDirectoryListing,
  searchPluginDirectory,
  isPluginDirectoryAccessAllowed,
  isDirectoryListingReviewerMarked,
} from "./pluginDirectorySearch.js";
import { jsonStringify } from "../slowOperations.js";
import { isValidPluginIdSegment } from "./schemas.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import {
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_NAME_CHECK_TTL_MS,
  OFFICIAL_MARKETPLACE_DISPLAY,
} from "./officialMarketplaceNames.js";
import { isDiskless } from "../../bootstrap/state.js";
import { getFsImplementation } from "../fsOperations.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";
import {
  errorMessage,
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { commandSourceSession } from "./commandSourceErrors.js";
import {
  logDirectoryCatalogLoad,
  logDirectoryBlockedOnce,
  isPluginGitUrlValid,
} from "./pluginDirectoryTelemetry.js";
import { normalizePluginRepoUrl, parseRepoWithRef, samePluginSource } from "./pluginSourceUrl.js";
import { shortHash } from "../shortHash.js";
import {
  stripInvisibleKeepNewlines,
  stripInvisibleKeepEmoji,
} from "../settings/marketplaceSettingsAliases.js";
import { encapsulatedPebbleEnabled } from "./pluginGates.js";

//@ chunk-036m2pwj.js:4546-4833 placement
var PLUGIN_DIRECTORY_CACHE_FILE = "plugin-directory-cache-v2.json";
var PLUGIN_DIRECTORY_CACHE_VERSION = 2;
var PLUGIN_DIRECTORY_CACHE_JSON = "plugin-directory-cache.json";
var MAX_PLUGIN_DIRECTORY_CACHE_BYTES = 16777216;
var CACHE_FRESH_MS = 3600000;
var DIRECTORY_PAGE_SIZE = 500;
var MAX_DIRECTORY_PAGES = 40;
var DESCRIPTION = "description";
var MISSED_LISTING_TTL_MS = 604800000;
var COMMIT_SHA_RE = /^[0-9a-f]{40}$/;
var CLAUDE_CODE = "claude_code";
var REPOSITORY_URL_RE = /^https:\/\/(?!-)[A-Za-z0-9._-]+\/[^\s\\?#%]+$/;
var regExp = new RegExp(`[\\\\:${INVISIBLE_CHAR_CLASS_SOURCE}]|[^\\S ]|^ |[ .]$|~\\d`, "u");
//@ chunk-036m2pwj.js:4833-4910 placement
function stripTrailingSlashes(text) {
  let len = text.length;
  while (len > 0 && text[len - 1] === "/") len--;
  return text.slice(0, len);
}
//@ chunk-036m2pwj.js:4910-4921 placement
var MAX_NAME_LENGTH = 255;
//@ chunk-036m2pwj.js:4921-5020 placement (2.1.88 match: setCwdState, 1)
function isSafeNfcName(cwd) {
  return (
    cwd !== "" &&
    cwd !== "." &&
    cwd !== ".." &&
    cwd.length <= MAX_NAME_LENGTH &&
    !regExp.test(cwd) &&
    cwd === cwd.normalize("NFC")
  );
}
//@ chunk-036m2pwj.js:5020-5359 placement
/**
 * 插件目录缓存 schema：Xe 是带 schema 版本的缓存 schema；Je 是不带版本的最小 schema；Ve 是 listing 的最长保留时间 90 天。
 */
var PluginDirectoryCacheSchema = DoctorLazy(() =>
  objectSchema({
    schemaVersion: literal(PLUGIN_DIRECTORY_CACHE_VERSION),
    fetchedAt: stringSchema(),
    listings: array(unknown()),
    listingsOmitted: booleanSchema().optional().catch(undefined),
    entryNames: record(stringSchema(), unknown()).optional().catch(undefined),
    entryNameClaims: record(stringSchema(), unknown()).optional().catch(undefined),
    missedListings: array(unknown()).optional().catch(undefined),
  }),
);
var pluginDirectoryCacheSchema = DoctorLazy(() =>
  objectSchema({
    version: literal(1),
    fetchedAt: stringSchema(),
    listings: array(unknown()),
  }),
);
var LISTING_MAX_AGE_MS = 7776000000;
//@ chunk-036m2pwj.js:5359-5391 placement
function pluginDirectoryCachePath() {
  return join(getPluginsDirectory(), PLUGIN_DIRECTORY_CACHE_FILE);
}
//@ chunk-036m2pwj.js:5391-5480 layout
function fetchedAtIso(fetchedAt) {
  let timestamp = Date.parse(fetchedAt);
  return new Date(Number.isFinite(timestamp) ? timestamp : 0).toISOString();
}
//@ chunk-036m2pwj.js:5480-5580 placement
var EntryNameClaimSchema = DoctorLazy(() =>
  objectSchema({
    repositoryKey: stringSchema().optional().catch(undefined),
    lastSeen: stringSchema().optional().catch(undefined),
  }),
);
//@ chunk-036m2pwj.js:5580-5646 placement
function sanitizeEntryNameClaim(claim) {
  let result = EntryNameClaimSchema().safeParse(claim);
  return result.success ? result.data : {};
}
//@ chunk-036m2pwj.js:5646-6632 placement
async function readPluginDirectoryCache(failureState) {
  let pluginsDirJsonFile = await readPluginsDirJsonFile(
    PLUGIN_DIRECTORY_CACHE_FILE,
    MAX_PLUGIN_DIRECTORY_CACHE_BYTES,
    "cache",
  );
  if (pluginsDirJsonFile.state === "read") {
    let parseResult = PluginDirectoryCacheSchema().safeParse(pluginsDirJsonFile.json);
    if (!parseResult.success) return null;
    return {
      fetchedAt: fetchedAtIso(parseResult.data.fetchedAt),
      ...(parseResult.data.listingsOmitted === true
        ? {
            listings: [],
            unparseableRows: 0,
            namesOnly: true,
          }
        : parseDirectoryListings(parseResult.data.listings)),
      missed:
        parseResult.data.listingsOmitted === true
          ? []
          : uniqByExport(
              (parseResult.data.missedListings ?? []).flatMap((raw) => {
                let result = missedListingSchema().safeParse(raw);
                let listing = result.success ? parseDirectoryListing(result.data.listing) : undefined;
                return result.success && listing && isEntryIdWithinLimit(listing)
                  ? [
                      {
                        listing,
                        missedAt: result.data.missedAt,
                      },
                    ]
                  : [];
              }),
              (entry) => entry.listing.id,
            ),
      entryNames: new Map(
        Object.entries(parseResult.data.entryNames ?? {}).flatMap(([key, value]) =>
          typeof value === "string" &&
          isValidPluginIdSegmentLength(value) &&
          Buffer.byteLength(JSON.stringify(key), "utf8") <= MAX_ENTRY_ID_BYTES
            ? [
                [
                  key,
                  {
                    name: value,
                    ...sanitizeEntryNameClaim(parseResult.data.entryNameClaims?.[key]),
                  },
                ],
              ]
            : [],
        ),
      ),
    };
  }
  if (pluginsDirJsonFile.state === "unusable") {
    if (failureState) failureState.readFailed = pluginsDirJsonFile.readFailed;
    return null;
  }
  let pluginsDirJsonFile_2 = await readPluginsDirJsonFile(
    PLUGIN_DIRECTORY_CACHE_JSON,
    MAX_PLUGIN_DIRECTORY_CACHE_BYTES,
    "cache",
  );
  let legacyResult =
    pluginsDirJsonFile_2.state === "read"
      ? pluginDirectoryCacheSchema().safeParse(pluginsDirJsonFile_2.json)
      : undefined;
  if (!legacyResult?.success) return null;
  return {
    fetchedAt: fetchedAtIso(legacyResult.data.fetchedAt),
    ...parseDirectoryListings(legacyResult.data.listings),
    entryNames: new Map(),
    missed: [],
    fromLegacyFile: true,
  };
}
//@ chunk-036m2pwj.js:6632-6801 placement
function parseDirectoryListings(listings) {
  let filtered = listings.flatMap((raw) => parseDirectoryListing(raw) ?? []).filter(isEntryIdWithinLimit);
  let deduped = uniqByExport(filtered, (listing) => listing.id);
  return {
    listings: deduped,
    unparseableRows: listings.length - filtered.length,
    ...(deduped.length < filtered.length && {
      repeatedIds: true,
    }),
  };
}
//@ chunk-036m2pwj.js:6801-6846 placement
var missedListingSchema = DoctorLazy(() =>
  objectSchema({
    missedAt: stringSchema(),
    listing: unknown(),
  }),
);
//@ chunk-036m2pwj.js:6846-7221 placement
/**
 * 序列化插件目录缓存（条目、漏列项、名字与认领）。
 */
function serializeCatalogCache(fetchedAt, listings, entryNames, omitted, missed) {
  return jsonStringify({
    schemaVersion: PLUGIN_DIRECTORY_CACHE_VERSION,
    fetchedAt,
    listings,
    ...(omitted && {
      listingsOmitted: true,
    }),
    ...(!omitted &&
      missed.length > 0 && {
        missedListings: missed.map(({ missedAt, listing }) => ({
          missedAt,
          listing,
        })),
      }),
    entryNames: Object.fromEntries([...entryNames].map(([id, entry]) => [id, entry.name])),
    entryNameClaims: Object.fromEntries(
      [...entryNames].map(([id, { repositoryKey: repoKey, lastSeen }]) => [
        id,
        {
          repositoryKey: repoKey,
          lastSeen,
        },
      ]),
    ),
  });
}
//@ chunk-036m2pwj.js:7221-7446 placement
function entryNameClaimBytes(id, entry) {
  let { repositoryKey, lastSeen } = entry;
  return (
    2 * Buffer.byteLength(JSON.stringify(id), "utf8") +
    Buffer.byteLength(JSON.stringify(entry.name), "utf8") +
    Buffer.byteLength(
      JSON.stringify({
        repositoryKey,
        lastSeen,
      }),
      "utf8",
    ) +
    4
  );
}
//@ chunk-036m2pwj.js:7446-7496 placement
var MAX_ENTRY_ID_BYTES = 200;
var MAX_PLUGIN_ID_SEGMENT = 128;
var MAX_LOCAL_NAME_SEGMENT = 64;
var MAX_OWNER_SEGMENT = 32;
var MAX_ENTRY_NAME_BYTES = 1024;
var MAX_NAME_CLAIMS_BYTES = 12582912;
//@ chunk-036m2pwj.js:7496-7569 placement
function isEntryIdWithinLimit(listing) {
  return Buffer.byteLength(JSON.stringify(listing.id), "utf8") <= MAX_ENTRY_ID_BYTES;
}
//@ chunk-036m2pwj.js:7569-7611 placement
function isValidPluginIdSegmentLength(segment) {
  return segment.length <= MAX_PLUGIN_ID_SEGMENT && isValidPluginIdSegment(segment);
}
//@ chunk-036m2pwj.js:7611-9002 placement
async function namesThatFit(names, installedIds, installRecords, budget = MAX_NAME_CLAIMS_BYTES) {
  let strippedCount = 0;
  let totalBytes = 0;
  let sized = new Map();
  for (let [id, entry] of names) {
    let claim = entry;
    let bytes = entryNameClaimBytes(id, claim);
    if (bytes > MAX_ENTRY_NAME_BYTES) {
      claim = {
        name: entry.name,
        lastSeen: entry.lastSeen,
      };
      bytes = entryNameClaimBytes(id, claim);
      strippedCount++;
    }
    sized.set(id, {
      claim,
      bytes,
    });
    totalBytes += bytes;
  }
  if (strippedCount === 0 && totalBytes <= budget) return names;
  let keep = new Set(sized.keys());
  if (totalBytes > budget) {
    let currentNames = await listInstalledOfficialNames(installRecords);
    if (currentNames === undefined) {
      for (let wanted of [true, false]) {
        for (let [id, item] of sized)
          if (installedIds.has(id) === wanted && item.claim.repositoryKey !== undefined) {
            let stripped = {
              name: item.claim.name,
              lastSeen: item.claim.lastSeen,
            };
            let bytes = entryNameClaimBytes(id, stripped);
            totalBytes += bytes - item.bytes;
            sized.set(id, {
              claim: stripped,
              bytes,
            });
            strippedCount++;
          }
        if (totalBytes <= budget) break;
      }
      logForDebugging(
        `Plugin directory cache: the kept entry names are past ${budget} bytes and the install records (installed_plugins.json) could not be read, so none is dropped; ${totalBytes > budget ? "they do not fit even without their repositories, so the cache file is left as it is until the install records can be read" : `${strippedCount} are written without their repository`}`,
      );
      return totalBytes > budget ? undefined : new Map([...sized].map(([id, { claim }]) => [id, claim]));
    }
    let sorted = [...sized].sort(([leftId, leftItem], [rightId, rightItem]) => {
      let leftInstalled = currentNames.has(leftItem.claim.name);
      let rightInstalled = currentNames.has(rightItem.claim.name);
      if (leftInstalled !== rightInstalled) return leftInstalled ? -1 : 1;
      let lastSeen = leftItem.claim.lastSeen ?? "";
      let lastSeen_2 = rightItem.claim.lastSeen ?? "";
      if (lastSeen !== lastSeen_2) return lastSeen > lastSeen_2 ? -1 : 1;
      return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
    });
    let kept = new Set();
    let remaining = budget;
    for (let [id, { bytes }] of sorted) {
      if (bytes > remaining) break;
      remaining -= bytes;
      kept.add(id);
    }
    keep = kept;
  }
  logForDebugging(
    `Plugin directory cache: ${strippedCount} entry name(s) written without their repository (each was past ${MAX_ENTRY_NAME_BYTES} bytes), ${sized.size - keep.size} let go (all names together may take ${budget} bytes)`,
  );
  return new Map([...sized].filter(([id]) => keep.has(id)).map(([id, { claim }]) => [id, claim]));
}
//@ chunk-036m2pwj.js:9002-9076 placement
async function tryDirectoryFetch(fetchDirectory, withInstallRecords, allPages = false) {
  try {
    return await fetchDirectory(withInstallRecords, allPages);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-036m2pwj.js:9076-9243 placement
async function listInstalledOfficialNames(fetchDirectory) {
  let installed = await tryDirectoryFetch(fetchDirectory, true);
  if (installed === undefined) return;
  let suffix = `@${OFFICIAL_MARKETPLACE_NAME}`;
  return new Set(
    Object.keys(installed)
      .filter((key) => key.endsWith(suffix))
      .map((key) => key.slice(0, -suffix.length)),
  );
}
//@ chunk-036m2pwj.js:9243-9295 placement
function isWithinCacheBytes(text) {
  return Buffer.byteLength(text, "utf8") <= MAX_PLUGIN_DIRECTORY_CACHE_BYTES;
}
//@ chunk-036m2pwj.js:9295-10117 placement
async function writePluginDirectoryCache(fetchedAt, listings, names, installRecords, missed) {
  if (isDiskless())
    return {
      wrote: "diskless",
      names,
    };
  let wasNamesOnly = false;
  let curNames = names;
  try {
    let text = serializeCatalogCache(fetchedAt, listings, curNames, false, missed);
    if (!isWithinCacheBytes(text) && missed.length > 0)
      text = serializeCatalogCache(fetchedAt, listings, curNames, false, []);
    if (!isWithinCacheBytes(text)) {
      logForDebugging(
        `Plugin directory cache: writing it without its listings, because whole it would be ${Buffer.byteLength(text, "utf8")} bytes and a cache file past ${MAX_PLUGIN_DIRECTORY_CACHE_BYTES} bytes is not read back`,
      );
      wasNamesOnly = true;
      text = serializeCatalogCache(fetchedAt, [], curNames, true, []);
      let listingIds = new Set(listings.map((listing) => listing.id));
      for (
        let budget = MAX_NAME_CLAIMS_BYTES / 2;
        !isWithinCacheBytes(text) && budget >= 1;
        budget = Math.floor(budget / 2)
      ) {
        let trimmed = await namesThatFit(names, listingIds, installRecords, budget);
        if (trimmed === undefined)
          return {
            wrote: "not-written",
            names,
          };
        curNames = trimmed;
        text = serializeCatalogCache(fetchedAt, [], curNames, true, []);
      }
    }
    await getFsImplementation().mkdir(getPluginsDirectory());
    await writeFileAtomic(pluginDirectoryCachePath(), text, 384);
  } catch (error) {
    logForDebugging(`Failed to write plugin directory cache: ${errorMessage(error)}`);
    return {
      wrote: "not-written",
      names,
    };
  }
  try {
    await unlink(join(getPluginsDirectory(), PLUGIN_DIRECTORY_CACHE_JSON));
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Failed to remove the old plugin directory cache: ${errorMessage(error)}`);
  }
  return {
    wrote: wasNamesOnly ? "names-only" : "written",
    names: curNames,
  };
}
//@ chunk-036m2pwj.js:10117-10598 placement
/**
 * 搜索失败原因转结果。
 */
function toSearchFailure(failure) {
  switch (failure.reason) {
    case "unavailable":
      if (failure.cause !== "policy")
        return {
          ok: false,
          reason: "failed",
          message: "a search with typed text is not sent from this session",
        };
      return {
        ok: false,
        reason: "policy",
        message: failure.message,
        blockedBy: failure.blockedBy,
      };
    case "not-served":
      return {
        ok: false,
        reason: "not-served",
        message: "it is not available for your account yet",
      };
    case "aborted":
      return {
        ok: false,
        reason: "failed",
        message: "the request was cancelled",
      };
    case "failed":
      return {
        ok: false,
        reason: "failed",
        message: failure.message,
      };
  }
}
//@ chunk-036m2pwj.js:10598-11049 placement
/**
 * 在总超时与首答超时内遍历插件目录。
 */
async function walkWithTimeouts(signal, deadlineMs, firstAnswerMs) {
  let deadlineSignal = AbortSignal.timeout(deadlineMs);
  let abortController = new AbortController();
  let progress = {
    pages: 0,
    answered: false,
  };
  let timer = setTimeout(
    (state, controller) => {
      if (!state.answered) controller.abort();
    },
    Math.min(firstAnswerMs, deadlineMs),
    progress,
    abortController,
  );
  let combined = AbortSignal.any([deadlineSignal, abortController.signal]);
  try {
    return await Promise.race([
      walkPluginDirectory(signal === undefined ? combined : AbortSignal.any([signal, combined]), progress),
      new Promise((resolve) => {
        combined.addEventListener(
          "abort",
          () =>
            resolve({
              pages: progress.pages,
              unparseableRows: 0,
              result: {
                ok: false,
                reason: "failed",
                message: DIRECTORY_NO_ANSWER_TEXT,
              },
              backoffMs: BACKOFF_MS,
            }),
          {
            once: true,
          },
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
//@ chunk-036m2pwj.js:11049-11100 placement
/**
 * 插件目录请求的超时：at 是单次响应的时限（cbr）；ot 是首个答复的默认时限 15000 ms；Ne 是超时时的说明文案 "it did not answer in time"。
 */
var MAX_DIRECTORY_RESPONSE_MS = OFFICIAL_MARKETPLACE_NAME_CHECK_TTL_MS;
var DEFAULT_FIRST_ANSWER_MS = 15000;
var DIRECTORY_NO_ANSWER_TEXT = "it did not answer in time";
//@ chunk-036m2pwj.js:11100-11874 placement
async function walkPluginDirectory(signal, progress) {
  let listings = [];
  let seenIds = new Set();
  let pageToken;
  let page = 0;
  let unparseableRows = 0;
  while (page < MAX_DIRECTORY_PAGES) {
    page++;
    if (progress) progress.pages = page;
    let response = await searchPluginDirectory({
      query: "",
      pageToken,
      signal,
      pageSize: DIRECTORY_PAGE_SIZE,
      include: DESCRIPTION,
      keepTokenWhenEmpty: true,
    });
    if (!response.ok)
      return {
        pages: page,
        unparseableRows,
        result: toSearchFailure(response),
        ...(response.reason === "failed" && {
          backoffMs: Math.max(BACKOFF_MS, response.retryAfterMs ?? 0),
          ...(response.retryAfterMs !== undefined && {
            serviceDelayMs: response.retryAfterMs,
          }),
        }),
      };
    if (progress) progress.answered = true;
    let filtered = response.page.listings.filter(isEntryIdWithinLimit);
    unparseableRows += response.page.skippedRows + response.page.listings.length - filtered.length;
    for (let listing of filtered) {
      if (seenIds.has(listing.id))
        return {
          pages: page,
          unparseableRows,
          result: DUPLICATE_LISTING_FAILURE,
          backoffMs: BACKOFF_MS,
        };
      seenIds.add(listing.id);
    }
    listings.push(...filtered);
    pageToken = response.page.nextPageToken;
    if (response.page.truncated || (pageToken !== undefined && page === MAX_DIRECTORY_PAGES))
      return {
        pages: page,
        unparseableRows,
        result: INCOMPLETE_LIST_FAILURE,
        backoffMs: BACKOFF_MS,
      };
    if (pageToken === undefined) break;
  }
  return {
    pages: page,
    unparseableRows,
    result: {
      ok: true,
      listings,
    },
  };
}
//@ chunk-036m2pwj.js:11874-12015 placement
var INCOMPLETE_LIST_FAILURE = {
  ok: false,
  reason: "failed",
  message: "it returned an incomplete list",
};
var DUPLICATE_LISTING_FAILURE = {
  ok: false,
  reason: "failed",
  message: "it listed a plugin twice",
};
var BACKOFF_MS = 300000;
//@ chunk-036m2pwj.js:12015-12143 placement
function pluginDirectoryWalkReadiness() {
  if (!isPluginDirectoryAccessAllowed()) return "not_allowed";
  let lastFailedWalk = commandSourceSession().lastFailedWalk;
  return lastFailedWalk !== undefined && Date.now() - lastFailedWalk.at < BACKOFF_MS ? "backed_off" : "ready";
}
//@ chunk-036m2pwj.js:12143-12243 placement
async function awaitPluginDirectoryPolicyVerdict() {
  let { awaitPolicyLimitsColdStart } =
    await import("../../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js");
  await awaitPolicyLimitsColdStart();
}
//@ chunk-036m2pwj.js:12243-12322 placement
function notePluginDirectoryWalkTimedOut() {
  let now = Date.now();
  commandSourceSession().lastFailedWalk = {
    at: now,
    reason: DIRECTORY_NO_ANSWER_TEXT,
    failedAt: now,
  };
}
//@ chunk-036m2pwj.js:12322-12337 placement
/**
 * 判定时间戳是否可信：dt 是允许时钟超前的容差 3600000 ms；F 是失败后的退避时长。
 */
var CLOCK_SKEW_TOLERANCE_MS = 3600000;
//@ chunk-036m2pwj.js:12337-12584 placement
function pluginDirectoryFailedWalkWindow() {
  let lastFailedWalk = commandSourceSession().lastFailedWalk;
  if (lastFailedWalk === undefined) return;
  let now = Date.now();
  if (
    now - lastFailedWalk.at >= BACKOFF_MS ||
    lastFailedWalk.at - now > CLOCK_SKEW_TOLERANCE_MS ||
    lastFailedWalk.failedAt > now
  )
    return;
  return {
    closesAt: lastFailedWalk.at + BACKOFF_MS,
    reason: lastFailedWalk.reason,
    failedAt: lastFailedWalk.failedAt,
    ...(lastFailedWalk.serviceDelayMs !== undefined && {
      serviceDelayMs: lastFailedWalk.serviceDelayMs,
    }),
  };
}
//@ chunk-036m2pwj.js:12584-12648 placement
function MISSED_LISTING_MAX_AGE_MS(fetchedAt) {
  let ageMs = Date.now() - Date.parse(fetchedAt);
  return ageMs >= 0 && ageMs < CACHE_FRESH_MS;
}
//@ chunk-036m2pwj.js:12648-13595 placement
async function loadPluginDirectoryCatalog({
  signal,
  forceRefresh = false,
  trigger = "other",
  deadlineMs = MAX_DIRECTORY_RESPONSE_MS,
  firstAnswerMs = DEFAULT_FIRST_ANSWER_MS,
  installRecords,
}) {
  let session = commandSourceSession();
  let catalogLoadInFlight = session.catalogLoadInFlight;
  if (
    signal === undefined &&
    catalogLoadInFlight !== undefined &&
    (catalogLoadInFlight.forceRefresh || !forceRefresh)
  )
    return catalogLoadInFlight.load;
  let load = (async () => {
    let now = Date.now();
    let state = {
      readFailed: false,
    };
    let pluginDirectoryCache = await readPluginDirectoryCache(state);
    let { catalog, pages, judged, ...details } = await refreshPluginDirectory(
      pluginDirectoryCache,
      forceRefresh,
      signal,
      {
        deadlineMs,
        firstAnswerMs,
      },
      state.readFailed,
      installRecords,
    );
    session.staleCatalogFetchedAt =
      catalog.ok && catalog.staleReason !== undefined ? catalog.fetchedAt : undefined;
    let cacheAgeMin = pluginDirectoryCache
      ? Math.round((now - Date.parse(pluginDirectoryCache.fetchedAt)) / 60000)
      : undefined;
    logDirectoryCatalogLoad({
      ...details,
      trigger,
      pages,
      listingCount: catalog.ok ? catalog.listings.length : 0,
      tally: tallyDirectoryEntries(
        judged?.listings ?? [],
        judged?.unparseableRows ?? 0,
        judged?.entryNames ?? new Map(),
      ),
      durationMs: Date.now() - now,
      cacheAgeMin:
        pluginDirectoryCache && Date.parse(pluginDirectoryCache.fetchedAt) !== 0 ? cacheAgeMin : undefined,
    });
    if (!catalog.ok && catalog.blockedBy !== undefined) logDirectoryBlockedOnce(catalog.blockedBy);
    return catalog;
  })();
  if (signal !== undefined) return load;
  session.catalogLoadInFlight = {
    forceRefresh,
    load,
  };
  try {
    return await load;
  } finally {
    if (session.catalogLoadInFlight?.load === load) session.catalogLoadInFlight = undefined;
  }
}
//@ chunk-036m2pwj.js:13595-16888 placement
async function refreshPluginDirectory(
  pluginDirectoryCache,
  forceRefresh,
  signal,
  { deadlineMs, firstAnswerMs },
  readFailed,
  installRecords,
) {
  let session = commandSourceSession();
  let cache = pluginDirectoryCache?.namesOnly ? null : pluginDirectoryCache;
  if (cache?.repeatedIds)
    logForDebugging(
      "Plugin directory: the cached list names a listing more than once (Claude Code 2.1.287 wrote such files), so it is treated as out of date",
    );
  if (
    cache &&
    !forceRefresh &&
    isPluginDirectoryAccessAllowed() &&
    !cache.fromLegacyFile &&
    !cache.repeatedIds &&
    MISSED_LISTING_MAX_AGE_MS(cache.fetchedAt)
  )
    return {
      outcome: "fresh_cache",
      pages: 0,
      judged: cache,
      catalog: {
        ok: true,
        listings: cache.listings,
        fetchedAt: cache.fetchedAt,
        entryNames: cache.entryNames,
      },
    };
  if (!isPluginDirectoryAccessAllowed()) await awaitPluginDirectoryPolicyVerdict();
  let lastFailedWalk = session.lastFailedWalk;
  if (
    !forceRefresh &&
    lastFailedWalk !== undefined &&
    Date.now() - lastFailedWalk.at < BACKOFF_MS &&
    isPluginDirectoryAccessAllowed()
  )
    return cache
      ? {
          outcome: "backoff",
          pages: 0,
          judged: cache,
          catalog: {
            ok: true,
            listings: cache.listings,
            fetchedAt: cache.fetchedAt,
            entryNames: cache.entryNames,
            staleReason: lastFailedWalk.reason,
            laterMayHelp: true,
          },
        }
      : {
          outcome: "backoff_cold",
          pages: 0,
          catalog: {
            ok: false,
            reason: "failed",
            message: lastFailedWalk.reason,
            laterMayHelp: true,
          },
        };
  let walkStarted = {
    wall: Date.now(),
    mono: performance.now(),
  };
  let {
    pages,
    unparseableRows,
    result: walk,
    backoffMs,
    serviceDelayMs,
  } = await walkWithTimeouts(signal, deadlineMs, firstAnswerMs);
  if (!walk.ok) {
    if (backoffMs !== undefined) {
      let now = Date.now();
      session.lastFailedWalk = {
        at: now + backoffMs - BACKOFF_MS,
        reason: walk.message,
        failedAt: now,
        ...(serviceDelayMs !== undefined && {
          serviceDelayMs,
        }),
      };
    }
    if (cache && walk.reason === "failed")
      return {
        ...(walk === DUPLICATE_LISTING_FAILURE
          ? {
              outcome: "stale_duplicate_id",
            }
          : {
              outcome: "stale_failed",
              incompleteWalk: walk === INCOMPLETE_LIST_FAILURE,
            }),
        pages,
        judged: cache,
        catalog: {
          ok: true,
          listings: cache.listings,
          fetchedAt: cache.fetchedAt,
          entryNames: cache.entryNames,
          staleReason: walk.message,
          ...(backoffMs !== undefined && {
            laterMayHelp: true,
          }),
        },
      };
    let catalog =
      backoffMs !== undefined
        ? {
            ...walk,
            laterMayHelp: true,
          }
        : walk;
    if (walk === DUPLICATE_LISTING_FAILURE)
      return {
        outcome: "duplicate_id",
        pages,
        catalog,
      };
    return walk === INCOMPLETE_LIST_FAILURE
      ? {
          outcome: "incomplete",
          pages,
          catalog,
        }
      : {
          outcome: "refused",
          refusal: walk.reason,
          blockedByOrganization: walk.blockedBy !== undefined,
          pages,
          catalog,
        };
  }
  let iso = new Date().toISOString();
  let cachedNames = pluginDirectoryCache?.entryNames ?? new Map();
  let { names, repairs } = await repairCollisionRenames(cachedNames, walk.listings, installRecords);
  let freshNames = new Map();
  let usedNames = new Set();
  for (let entry of directoryListingsToEntries(walk.listings, names)) {
    usedNames.add(entry.name);
    freshNames.set(entry.listing.id, {
      name: entry.name,
      repositoryKey: entry.repositoryKey,
      lastSeen: iso,
    });
  }
  let installed = await tryDirectoryFetch(installRecords, false);
  for (let [id, entry] of names) {
    if (freshNames.has(id) || usedNames.has(entry.name)) continue;
    let ageMs = Date.now() - Date.parse(entry.lastSeen ?? "");
    if (
      installed !== undefined &&
      ageMs > LISTING_MAX_AGE_MS &&
      !Object.hasOwn(installed, `${entry.name}@${OFFICIAL_MARKETPLACE_NAME}`)
    )
      continue;
    freshNames.set(id, {
      ...entry,
      lastSeen:
        Number.isFinite(ageMs) && ageMs >= 0 ? new Date(Date.parse(entry.lastSeen ?? "")).toISOString() : iso,
    });
  }
  let judged = {
    listings: walk.listings,
    unparseableRows,
    entryNames: freshNames,
  };
  let cacheAgeMs = cache ? Date.now() - Date.parse(cache.fetchedAt) : NaN;
  if (
    cache &&
    cacheAgeMs >= 0 &&
    cacheAgeMs < MISSED_LISTING_TTL_MS &&
    !walk.listings.some(idTailSlug) &&
    cache.listings.some(idTailSlug)
  ) {
    let reason =
      walk.listings.length === 0
        ? "it returned an empty list"
        : "it returned no plugins this version of Claude Code can install";
    logForDebugging(`Plugin directory: ${reason}; keeping the cached catalogue`, {
      level: "warn",
    });
    let now = Date.now();
    session.lastFailedWalk = {
      at: now,
      reason,
      failedAt: now,
    };
    return {
      outcome: "stale_empty",
      pages,
      judged,
      catalog: {
        ok: true,
        listings: cache.listings,
        fetchedAt: cache.fetchedAt,
        entryNames: cache.entryNames,
        staleReason: reason,
        ...(walk.listings.length === 0 && {
          laterMayHelp: true,
        }),
      },
    };
  }
  session.lastFailedWalk = undefined;
  let fitted = readFailed
    ? undefined
    : await namesThatFit(freshNames, new Set(walk.listings.map((listing) => listing.id)), installRecords);
  let missed =
    fitted === undefined
      ? []
      : await keepMissedListings(cache, walk.listings, usedNames, iso, installRecords);
  let repaired =
    fitted === undefined
      ? undefined
      : await revertLegacyRenames(fitted, repairs, cachedNames, names, walk.listings, installRecords);
  let namesRepaired = repaired?.repaired ?? 0;
  let { wrote, names: names_2 } =
    repaired === undefined
      ? {
          wrote: "not-written",
          names: freshNames,
        }
      : await writePluginDirectoryCache(iso, walk.listings, repaired.names, installRecords, missed);
  return {
    outcome:
      wrote === "names-only"
        ? "walked_names_only"
        : wrote === "not-written"
          ? "walked_not_written"
          : "walked",
    pages,
    ...(wrote !== "not-written" && {
      namesRepaired,
    }),
    judged: {
      ...judged,
      entryNames: names_2,
    },
    catalog: {
      ok: true,
      listings: walk.listings,
      fetchedAt: iso,
      entryNames: names_2,
      walked: true,
      walkStarted,
    },
  };
}
//@ chunk-036m2pwj.js:16888-16903 placement
/**
 * 插件从 listing 里消失后的宽限期 7200000 ms（2 小时）：只有在宽限期之后的又一次遍历仍缺失，才真正丢弃。
 */
var DELISTING_GRACE_MS = 7200000;
//@ chunk-036m2pwj.js:16903-17914 placement
/**
 * 对比上次缓存与本次遍历：漏列且仍被已安装插件使用、未被新名字占用的条目保留（记录首次漏列时间）， 超过保留期（he）后丢弃。
 */
async function keepMissedListings(cache, listings, namesInUse, now, fetchDirectory) {
  if (cache === null) return [];
  let freshIds = new Set(listings.map((listing) => listing.id));
  let knownIds = new Set(cache.listings.map((listing) => listing.id));
  let filtered = cache.missed.filter(({ listing }) => !knownIds.has(listing.id));
  let candidates = [
    ...cache.listings
      .filter((listing) => !freshIds.has(listing.id))
      .map((listing) => ({
        listing,
      })),
    ...filtered.filter(({ listing }) => !freshIds.has(listing.id)),
  ];
  if (candidates.length === 0) return [];
  let namesById = candidates.every(({ listing }) => cache.entryNames.has(listing.id))
    ? undefined
    : new Map(
        directoryListingsToEntries(
          [...cache.listings, ...filtered.map(({ listing }) => listing)],
          cache.entryNames,
        ).map((entry) => [entry.listing.id, entry.name]),
      );
  let installed = await listInstalledOfficialNames(fetchDirectory);
  let timestamp = Date.parse(now);
  let kept = [];
  for (let { listing, missedAt } of candidates) {
    let name = namesById?.get(listing.id) ?? cache.entryNames.get(listing.id)?.name;
    if (
      name === undefined ||
      namesInUse.has(name) ||
      (installed !== undefined && !installed.has(name)) ||
      !idTailSlug(listing)
    )
      continue;
    let timestamp_2 = Date.parse(missedAt ?? "");
    let since = Number.isFinite(timestamp_2) && timestamp_2 <= timestamp ? timestamp_2 : timestamp;
    if (timestamp - since < DELISTING_GRACE_MS)
      kept.push({
        listing,
        missedAt: new Date(since).toISOString(),
      });
  }
  logForDebugging(
    `Plugin directory: this walk did not list ${candidates.length} listing(s) the saved catalog had; keeping ${kept.length} that installed plugins use, so they still load until a walk at least ${DELISTING_GRACE_MS / 3600000} hours after the first miss also misses them`,
  );
  return kept;
}
//@ chunk-036m2pwj.js:17914-17952 placement
function idTailSlug(listing) {
  return "source" in directoryListingSource(listing);
}
//@ chunk-036m2pwj.js:17952-18213 placement
function tallyDirectoryEntries(listings, unparseable, namesById) {
  let tally = {
    installable: 0,
    unparseable,
    skipped: {
      other_surface: 0,
      no_pin: 0,
      bad_url: 0,
      bad_path: 0,
    },
    nameClashes: 0,
  };
  for (let entry of directoryListingsToEntries(listings, namesById)) {
    if (entry.nameClashed) tally.nameClashes++;
    if ("entry" in entry.result) tally.installable++;
    else tally.skipped[entry.result.skipped]++;
  }
  return tally;
}
//@ chunk-036m2pwj.js:18213-18976 placement
function directoryListingSource(listing) {
  let { surfaces } = listing;
  let { url, path, reviewed_commit: reviewedCommit } = listing.source.repository;
  if (surfaces?.length && !surfaces.includes(CLAUDE_CODE))
    return {
      skipped: "other_surface",
    };
  if (!reviewedCommit || !COMMIT_SHA_RE.test(reviewedCommit))
    return {
      skipped: "no_pin",
    };
  if (!REPOSITORY_URL_RE.test(url) || !isPluginGitUrlValid(url))
    return {
      skipped: "bad_url",
    };
  if (
    /^https:\/\/[^/]*\.(?::\d*)?(?:\/|$)/.test(url) ||
    stripTrailingSlashes(url.replace(/^https:\/\/[^/]+\//, ""))
      .split("/")
      .some(
        (segment) =>
          segment === "" || segment === "." || segment === ".." || segment.toLowerCase() === ".git",
      )
  )
    return {
      skipped: "bad_url",
    };
  let normalizedUrl = stripTrailingSlashes(url);
  if (/\.git$/i.test(normalizedUrl) && !normalizedUrl.endsWith(".git"))
    return {
      skipped: "bad_url",
    };
  if (normalizePluginRepoUrl(url, undefined) === undefined)
    return {
      skipped: "bad_url",
    };
  let normalizedPath = path === undefined ? undefined : stripTrailingSlashes(path);
  if (path && !normalizedPath?.split("/").every(isSafeNfcName))
    return {
      skipped: "bad_path",
    };
  return {
    source: normalizedPath
      ? {
          source: "git-subdir",
          url: normalizedUrl,
          path: normalizedPath,
          sha: reviewedCommit,
        }
      : {
          source: "url",
          url: `${normalizedUrl.replace(/\.git$/, "")}.git`,
          sha: reviewedCommit,
        },
  };
}
//@ chunk-036m2pwj.js:18976-19158 placement
function slugifyName(rawName) {
  let replaced = rawName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  let isTrimChar = (char) => char === "-" || char === "." || char === "_";
  let start = 0;
  let end = replaced.length;
  while (start < end && isTrimChar(replaced[start])) start++;
  while (end > start && isTrimChar(replaced[end - 1])) end--;
  return replaced.slice(start, end);
}
//@ chunk-036m2pwj.js:19158-19200 placement
function pluginDirectoryMarketplaceConfig(rawName) {
  return slugifyName(rawName).slice(-8) || "x";
}
//@ chunk-036m2pwj.js:19200-21179 placement
/**
 * 为插件目录条目分配稳定的本地名（沿用旧名、按仓库迁移、冲突加后缀）。
 */
function assignDirectoryEntryNames(entries, knownNames) {
  let mapped = entries.map((entry) => {
    let { url, path } = entry.source.repository;
    let filtered = url
      .replace(/\.git$/, "")
      .split("/")
      .filter(Boolean);
    let base =
      [
        slugifyName(entry.name),
        slugifyName(path?.split("/").filter(Boolean).at(-1) ?? ""),
        slugifyName(filtered.at(-1) ?? ""),
      ]
        .map((segment) => segment.slice(0, MAX_LOCAL_NAME_SEGMENT).replace(/[-._]+$/, ""))
        .find((candidateName) => candidateName !== "" && isValidPluginIdSegment(candidateName)) ?? "plugin";
    return {
      id: entry.id,
      base,
      repositoryKey: normalizePluginRepoUrl(url, path),
      owner: slugifyName(filtered.at(-2) ?? "")
        .slice(0, MAX_OWNER_SEGMENT)
        .replace(/[-._]+$/, ""),
      idTail: pluginDirectoryMarketplaceConfig(entry.id),
      sortKey: `${entry.id}
${url}
${path ?? ""}`,
    };
  });
  let idCounts = new Map();
  for (let { id } of mapped) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  let nameOwners = new Map();
  for (let [bindingKey, { name }] of [...knownNames].sort(([leftKey], [rightKey]) =>
    leftKey < rightKey ? -1 : 1,
  ))
    if (isValidPluginIdSegmentLength(name) && !nameOwners.has(name)) nameOwners.set(name, bindingKey);
  let ownerByName = new Map();
  for (let [name, id] of [...nameOwners].sort(([, leftId], [, rightId]) =>
    idCounts.has(leftId) !== idCounts.has(rightId)
      ? idCounts.has(leftId)
        ? -1
        : 1
      : leftId < rightId
        ? -1
        : 1,
  ))
    if (!ownerByName.has(sanitizePluginIdLower(name)))
      ownerByName.set(sanitizePluginIdLower(name), {
        name,
        id,
      });
  let nameById = new Map();
  let idsByRepoKey = new Map();
  for (let info of mapped)
    if (info.repositoryKey !== undefined && idCounts.get(info.id) === 1 && !knownNames.has(info.id)) {
      let ids = idsByRepoKey.get(info.repositoryKey) ?? [];
      ids.push(info.id);
      idsByRepoKey.set(info.repositoryKey, ids);
    }
  for (let ids of idsByRepoKey.values()) ids.sort();
  for (let [normalizedName, { name, id }] of ownerByName) {
    let repositoryKey = knownNames.get(id)?.repositoryKey;
    if (repositoryKey === undefined || idCounts.has(id)) continue;
    let assignedId = idsByRepoKey.get(parseRepoWithRef(repositoryKey))?.shift();
    if (assignedId !== undefined) {
      ownerByName.set(normalizedName, {
        name,
        id: assignedId,
      });
      nameById.set(assignedId, name);
    }
  }
  let mapped_2 = mapped.map(({ id }) => {
    let assignedName = nameById.get(id) ?? knownNames.get(id)?.name;
    let owner = assignedName === undefined ? undefined : ownerByName.get(sanitizePluginIdLower(assignedName));
    return assignedName !== undefined &&
      owner?.id === id &&
      owner.name === assignedName &&
      idCounts.get(id) === 1
      ? assignedName
      : undefined;
  });
  let mapped_3 = mapped.map((entry, index) => mapped_2[index] ?? entry.base);
  let findClashing = () => {
    let nameCounts = new Map();
    for (let candidateName of mapped_3) {
      let candidateKey = sanitizePluginIdLower(candidateName);
      nameCounts.set(candidateKey, (nameCounts.get(candidateKey) ?? 0) + 1);
    }
    return mapped.flatMap((entry, index) => {
      let normalizedName = sanitizePluginIdLower(mapped_3[index] ?? entry.base);
      let owner = ownerByName.get(normalizedName);
      return mapped_2[index] === undefined &&
        ((nameCounts.get(normalizedName) ?? 0) > 1 || (owner !== undefined && owner.id !== entry.id))
        ? index
        : [];
    });
  };
  let mapped_4 = mapped.map(() => 0);
  for (let j = 0; j < 3; j++)
    for (let index of findClashing()) {
      let entry = mapped[index];
      let max = Math.max(j, mapped_4[index] ?? 0);
      let level = max === 0 && entry?.owner === "" ? 1 : max;
      let suffix =
        level === 0
          ? entry?.owner
          : level === 1
            ? entry?.idTail
            : level === 2 && entry
              ? shortHash(entry.id)
              : undefined;
      if (suffix !== undefined) {
        mapped_3[index] = `${mapped_3[index]}-${suffix}`;
        mapped_4[index] = level + 1;
      }
    }
  let usedNames = new Set([...ownerByName.keys(), ...mapped_3.map(sanitizePluginIdLower)]);
  let sortKeyOf = (index) => mapped[index]?.sortKey ?? "";
  let sorted = findClashing().sort((leftIndex, rightIndex) =>
    sortKeyOf(leftIndex) === sortKeyOf(rightIndex)
      ? 0
      : sortKeyOf(leftIndex) < sortKeyOf(rightIndex)
        ? -1
        : 1,
  );
  for (let index of sorted) {
    let suffix = 2;
    while (usedNames.has(sanitizePluginIdLower(`${mapped_3[index]}-${suffix}`))) suffix++;
    let finalName = `${mapped_3[index]}-${suffix}`;
    mapped_3[index] = finalName;
    usedNames.add(sanitizePluginIdLower(finalName));
  }
  return mapped_3.map((name, index) => ({
    name,
    clashed: name !== mapped[index]?.base,
  }));
}
//@ chunk-036m2pwj.js:21179-21318 placement
function isCollisionSuffixedName(name, listing) {
  let match = /-([1-9][0-9]*)$/.exec(name);
  return (
    match !== null &&
    Number(match[1]) >= 3 &&
    name
      .slice(0, match.index)
      .endsWith(`-${pluginDirectoryMarketplaceConfig(listing.id)}-${shortHash(listing.id)}`)
  );
}
//@ chunk-036m2pwj.js:21318-22038 placement
/**
 * 读安装记录与绑定，给出名字是否被占用、仓库唯一绑定名。
 */
async function loadNameBindingEvidence(installRecords) {
  let installed = await tryDirectoryFetch(installRecords, true, true);
  let bindings = await bindingsWithReadFailure();
  if (installed === undefined || isUnreadableBindings(bindings)) return;
  let suffix = `@${OFFICIAL_MARKETPLACE_NAME}`;
  let filtered = Object.keys(installed).filter(isOfficialPluginDirectoryId);
  let boundKeys = [...bindings.keys()];
  let installsFor = (id) =>
    findBindingKeysFor(filtered, id).flatMap((key) => {
      let value = installed[key];
      return Array.isArray(value) ? value : [];
    });
  let repoKeyOf = (installation) =>
    typeof installation === "object" &&
    installation !== null &&
    "directoryRepositoryKey" in installation &&
    typeof installation.directoryRepositoryKey === "string" &&
    installation.directoryRepositoryKey !== ""
      ? parseRepoWithRef(installation.directoryRepositoryKey)
      : undefined;
  let byRepo = new Map();
  for (let id of filtered) {
    let mapped = installsFor(id).map(repoKeyOf);
    let repoKey = mapped[0];
    if (
      repoKey !== undefined &&
      mapped.every((key) => key === repoKey) &&
      findBindingKeysFor(boundKeys, id).every((key) => parseRepoWithRef(bindings.get(key) ?? "") === repoKey)
    )
      byRepo.set(repoKey, [...(byRepo.get(repoKey) ?? []), id]);
  }
  return {
    holds: (name) =>
      installsFor(`${name}${suffix}`).length > 0 ||
      findBindingKeysFor(boundKeys, `${name}${suffix}`).length > 0,
    onlyNameBoundTo: (repoKey) => {
      let ids = byRepo.get(repoKey) ?? [];
      return ids.length === 1 ? ids[0]?.slice(0, -suffix.length) : undefined;
    },
  };
}
//@ chunk-036m2pwj.js:22038-22975 placement
/**
 * 修复被加冲突后缀的条目名，改回安装插件使用的名字。
 */
async function repairCollisionRenames(cachedNames, listings, installRecords) {
  let filtered = listings.filter((listing) => {
    let name = cachedNames.get(listing.id)?.name;
    return name !== undefined && isCollisionSuffixedName(name, listing);
  });
  if (filtered.length === 0)
    return {
      names: cachedNames,
      repairs: [],
    };
  let nameBindingEvidence = await loadNameBindingEvidence(installRecords);
  if (nameBindingEvidence === undefined)
    return {
      names: cachedNames,
      repairs: [],
    };
  let sourceKeyOf = (listing) => {
    let sourceKey = directoryListingSource(listing);
    return "source" in sourceKey ? samePluginSource(sourceKey.source, undefined) : undefined;
  };
  let countBySource = new Map();
  for (let listing of listings) {
    let { url, path } = listing.source.repository;
    for (let key of new Set(
      [sourceKeyOf(listing), normalizePluginRepoUrl(url, path)].flatMap((key) => key ?? []),
    ))
      countBySource.set(key, (countBySource.get(key) ?? 0) + 1);
  }
  let nameOwner = new Map();
  let track = (pluginName, id, add) => {
    let sanitized = sanitizePluginIdLower(pluginName);
    let owners = nameOwner.get(sanitized) ?? new Set();
    if (add) owners.add(id);
    else owners.delete(id);
    nameOwner.set(sanitized, owners);
  };
  for (let [id, entry] of cachedNames) track(entry.name, id, true);
  let names = new Map(cachedNames);
  let repairs = [];
  for (let listing of filtered) {
    let current = names.get(listing.id);
    let sourceKey = sourceKeyOf(listing);
    if (current === undefined || sourceKey === undefined) continue;
    if ((countBySource.get(sourceKey) ?? 0) !== 1) continue;
    if (nameBindingEvidence.holds(current.name)) continue;
    let boundName = nameBindingEvidence.onlyNameBoundTo(sourceKey);
    if (
      boundName === undefined ||
      boundName === current.name ||
      !isValidPluginIdSegmentLength(boundName) ||
      [...(nameOwner.get(sanitizePluginIdLower(boundName)) ?? [])].some((id) => id !== listing.id)
    )
      continue;
    names.set(listing.id, {
      ...current,
      name: boundName,
    });
    track(current.name, listing.id, false);
    track(boundName, listing.id, true);
    repairs.push({
      id: listing.id,
      key: sourceKey,
      name: boundName,
    });
  }
  return {
    names,
    repairs,
  };
}
//@ chunk-036m2pwj.js:22975-23943 placement
/**
 * 撤销 2.1.287 改过的名字（安装记录能证明时）。
 */
async function revertLegacyRenames(cachedNames, repairs, cachedNames2, names, listings, installRecords) {
  if (repairs.length === 0)
    return {
      names: cachedNames,
      repaired: 0,
    };
  let nameBindingEvidence = await loadNameBindingEvidence(installRecords);
  let keepIds = [];
  let repaired = 0;
  for (let { id, key, name: newName } of repairs) {
    let cachedName = cachedNames2.get(id)?.name;
    if (
      cachedName !== undefined &&
      (nameBindingEvidence === undefined ||
        nameBindingEvidence.holds(cachedName) ||
        nameBindingEvidence.onlyNameBoundTo(key) !== newName)
    )
      keepIds.push(id);
    else if (cachedNames.has(id)) repaired++;
  }
  if (repaired + keepIds.length > 0)
    logForDebugging(
      `Plugin directory: of ${repaired + keepIds.length} listing(s) Claude Code 2.1.287 had renamed, gave ${repaired} back the name their installed plugin uses` +
        (keepIds.length === 0
          ? ""
          : nameBindingEvidence === undefined
            ? `; kept the 2.1.287 name for ${keepIds.length} because the install records or bindings file could not be read again`
            : `; kept the 2.1.287 name for ${keepIds.length} because a plugin is now installed under it, or the install records and bindings no longer prove the name it was given back`),
    );
  if (keepIds.length === 0)
    return {
      names: cachedNames,
      repaired,
    };
  let baseNames = new Map(names);
  for (let id of keepIds) {
    let entry = cachedNames2.get(id);
    if (entry !== undefined) baseNames.set(id, entry);
  }
  let updated = new Map(cachedNames);
  for (let entry of directoryListingsToEntries(listings, baseNames)) {
    let existing = updated.get(entry.listing.id);
    if (existing !== undefined)
      updated.set(entry.listing.id, {
        ...existing,
        name: entry.name,
      });
  }
  return {
    names: updated,
    repaired,
  };
}
//@ chunk-036m2pwj.js:23943-24562 placement
function directoryListingsToEntries(listings, names) {
  let assigned = assignDirectoryEntryNames(listings, names);
  let entries = [];
  for (let [index, listing] of listings.entries()) {
    let name = assigned[index]?.name ?? listing.id;
    let source = directoryListingSource(listing);
    let { url, path } = listing.source.repository;
    let trimmed = stripInvisibleKeepNewlines(listing.summary || listing.description || "").trim();
    let trimmed_2 = stripInvisibleKeepEmoji(listing.name).trim();
    let trimmed_3 = stripInvisibleKeepEmoji(listing.release?.version ?? "").trim();
    let trimmed_4 = stripInvisibleKeepEmoji(listing.publisher?.name ?? "").trim();
    let trimmed_5 = stripInvisibleKeepEmoji(listing.links?.documentation ?? "").trim();
    let homepage = trimmed_5.startsWith("https://") ? trimmed_5 : "";
    entries.push({
      name,
      nameClashed: assigned[index]?.clashed ?? false,
      listing,
      repositoryKey: normalizePluginRepoUrl(url, path),
      result:
        "skipped" in source
          ? source
          : {
              entry: {
                name,
                source: source.source,
                ...(trimmed_2 !== "" &&
                  trimmed_2 !== name && {
                    displayName: trimmed_2,
                  }),
                ...(trimmed && {
                  description: trimmed,
                }),
                ...(trimmed_3 && {
                  version: trimmed_3,
                }),
                ...(trimmed_4 && {
                  author: {
                    name: trimmed_4,
                  },
                }),
                ...(homepage && {
                  homepage,
                }),
                repository: url,
                strict: true,
              },
            },
    });
  }
  return entries;
}
//@ chunk-036m2pwj.js:24562-24779 placement
function synthesizePluginDirectoryMarketplace(
  listings,
  names,
  entries = directoryListingsToEntries(listings, names),
) {
  return {
    name: OFFICIAL_MARKETPLACE_NAME,
    owner: {
      name: "Anthropic",
    },
    metadata: {
      description: `Plugins listed by the ${OFFICIAL_MARKETPLACE_DISPLAY}, installed at their listed commit`,
    },
    plugins: entries.flatMap((entry) => ("entry" in entry.result ? entry.result.entry : [])),
  };
}
//@ chunk-036m2pwj.js:24779-24981 placement
var ENTRY_SKIP_REASONS = {
  other_surface: "it is not offered for Claude Code",
  no_pin: "it has no listed commit",
  bad_url: "its repository address is not one Claude Code installs from",
  bad_path: "its folder path is not valid",
};
//@ chunk-036m2pwj.js:24981-25053 placement
async function pluginDirectoryNotInstallableMessage(name) {
  let reason = await pluginDirectoryNotInstallableReason(name);
  return reason === undefined ? undefined : pluginDirectoryNotInstallableSentence(name, reason);
}
//@ chunk-036m2pwj.js:25053-25171 placement
function pluginDirectoryNotInstallableSentence(name, reason) {
  return `"${name}" is listed in the ${OFFICIAL_MARKETPLACE_DISPLAY} but cannot be installed by this version of Claude Code (${reason}).`;
}
//@ chunk-036m2pwj.js:25171-25334 placement
async function pluginDirectoryNotInstallableReason(name) {
  let pluginDirectoryCache = await readPluginDirectoryCache();
  let found = directoryListingsToEntries(
    pluginDirectoryCache?.listings ?? [],
    pluginDirectoryCache?.entryNames ?? new Map(),
  ).find((entry) => entry.name === name);
  return found && "skipped" in found.result ? ENTRY_SKIP_REASONS[found.result.skipped] : undefined;
}
//@ chunk-036m2pwj.js:25334-25415 placement
var PLUGIN_DIRECTORY_MARKETPLACE_JSON = "plugin-directory-marketplace.json";
var pluginDirectoryMarketplacePath = DoctorLazy(() =>
  objectSchema({
    enabled: booleanSchema().optional(),
  }),
);
//@ chunk-036m2pwj.js:25415-25447 placement
function MAX_PLUGIN_DIRECTORY_MARKETPLACE_BYTES() {
  return join(getPluginsDirectory(), PLUGIN_DIRECTORY_MARKETPLACE_JSON);
}
//@ chunk-036m2pwj.js:25447-25459 placement
var MAX_SEGMENT_SLUG_LENGTH = 4096;
//@ chunk-036m2pwj.js:25459-25831 placement
async function readPluginDirectoryMarketplaceChoice() {
  let pluginsDirJsonFile = await readPluginsDirJsonFile(
    PLUGIN_DIRECTORY_MARKETPLACE_JSON,
    MAX_SEGMENT_SLUG_LENGTH,
    "on/off file",
  );
  let session = commandSourceSession();
  let readFailed = pluginsDirJsonFile.state === "unusable" && pluginsDirJsonFile.readFailed;
  if (readFailed && session.marketplaceChoice !== undefined) return session.marketplaceChoice;
  let parsed =
    pluginsDirJsonFile.state === "read"
      ? pluginDirectoryMarketplacePath().safeParse(pluginsDirJsonFile.json)
      : undefined;
  let enabled = parsed?.success ? parsed.data.enabled : undefined;
  let choice =
    enabled === undefined
      ? {
          enabled: encapsulatedPebbleEnabled(),
          source: "flag_default",
        }
      : {
          enabled,
          source: "user_choice",
        };
  if (!readFailed) session.marketplaceChoice = choice;
  return choice;
}
//@ chunk-036m2pwj.js:25831-25878 placement
async function isPluginDirectoryMarketplaceEnabled() {
  return (await readPluginDirectoryMarketplaceChoice()).enabled;
}
//@ chunk-036m2pwj.js:25878-26176 placement
async function setPluginDirectoryMarketplaceEnabled(enabled) {
  if (isDiskless())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `This session doesn't save settings, so the ${OFFICIAL_MARKETPLACE_DISPLAY} can't be turned ${enabled ? "on" : "off"}`,
      "plugin directory marketplace toggled in a diskless session",
    );
  await getFsImplementation().mkdir(getPluginsDirectory());
  await writeFileAtomic(
    MAX_PLUGIN_DIRECTORY_MARKETPLACE_BYTES(),
    jsonStringify({
      enabled,
    }),
    384,
  );
  commandSourceSession().marketplaceChoice = {
    enabled,
    source: "user_choice",
  };
}
//@ chunk-036m2pwj.js:26176-26211 placement
var PLUGIN_DIRECTORY_BUILT_IN = "plugin-directory:built-in";
//@ chunk-036m2pwj.js:26211-26446 placement
async function pluginDirectoryRegistryEntry() {
  let lastUpdated = new Date(0).toISOString();
  if (!isDiskless())
    try {
      let stat = await lstat(pluginDirectoryCachePath());
      if (stat.isFile()) lastUpdated = stat.mtime.toISOString();
    } catch {}
  return {
    source: {
      source: "pluginDirectory",
    },
    installLocation: isDiskless()
      ? PLUGIN_DIRECTORY_BUILT_IN
      : join(getPluginsDirectory(), "marketplaces", OFFICIAL_MARKETPLACE_NAME),
    lastUpdated,
  };
}
//@ chunk-036m2pwj.js:26446-26551 placement
var SWITCH_PURPOSE_LABELS = {
  install: "an install",
  update: "an update",
  switch: "a marketplace switch",
};
var CATALOG_TTL_MS = 1800000;
var weakMap = new WeakMap();
//@ chunk-036m2pwj.js:26551-26686 placement
function isPluginDirectoryEntryFromAFreshWalk(plugin) {
  let walkStarted = weakMap.get(plugin);
  if (walkStarted === undefined) return false;
  let wallAge = Date.now() - walkStarted.wall;
  let monoAge = performance.now() - walkStarted.mono;
  return wallAge >= 0 && wallAge < CATALOG_TTL_MS && monoAge >= 0 && monoAge < CATALOG_TTL_MS;
}
//@ chunk-036m2pwj.js:26686-28249 placement
async function loadPluginDirectoryMarketplace(
  mode,
  {
    forInstalledPlugin = false,
    onlyMissedListings = false,
    purpose = "load",
    trigger = "other",
    signal,
    installRecords,
  },
) {
  let neededPurpose = purpose === "load" ? undefined : purpose;
  if (neededPurpose !== undefined && (mode !== "refresh" || forInstalledPlugin))
    return {
      marketplace: null,
      message: `no fresh list was asked for, which ${SWITCH_PURPOSE_LABELS[neededPurpose]} needs (an internal error)`,
      notFreshEnoughFor: neededPurpose,
    };
  if (mode === "cache-only") {
    if (!forInstalledPlugin && !isPluginDirectoryAccessAllowed())
      return {
        marketplace: null,
        message: "it isn't available in this session",
      };
    let pluginDirectoryCache = await readPluginDirectoryCache();
    if (!pluginDirectoryCache || pluginDirectoryCache.namesOnly)
      return {
        marketplace: null,
        message: "it has not been loaded yet",
      };
    if (!onlyMissedListings)
      return {
        marketplace: buildDirectoryMarketplace(
          pluginDirectoryCache.listings,
          pluginDirectoryCache.entryNames,
        ),
      };
    let freshIds = new Set(pluginDirectoryCache.listings.map((listing) => listing.id));
    let listings = pluginDirectoryCache.missed
      .filter(({ listing }) => !freshIds.has(listing.id))
      .map(({ listing }) => listing);
    return {
      marketplace: synthesizePluginDirectoryMarketplace(
        listings,
        pluginDirectoryCache.entryNames,
        listings.length === 0
          ? []
          : directoryListingsToEntries(
              [...pluginDirectoryCache.listings, ...listings],
              pluginDirectoryCache.entryNames,
            ).slice(pluginDirectoryCache.listings.length),
      ),
    };
  }
  let pluginDirectoryCatalog = await loadPluginDirectoryCatalog({
    forceRefresh: mode === "refresh",
    trigger,
    signal,
    installRecords,
  });
  if (!pluginDirectoryCatalog.ok)
    return {
      marketplace: null,
      message: pluginDirectoryCatalog.message,
      ...(neededPurpose !== undefined && {
        notFreshEnoughFor: neededPurpose,
      }),
      ...(pluginDirectoryCatalog.laterMayHelp && {
        laterMayHelp: true,
      }),
    };
  if (neededPurpose !== undefined) {
    if (pluginDirectoryCatalog.staleReason !== undefined || pluginDirectoryCatalog.walked !== true)
      return {
        marketplace: null,
        message:
          pluginDirectoryCatalog.staleReason ??
          "only the list saved on this machine answered, not the Directory itself",
        notFreshEnoughFor: neededPurpose,
        ...(pluginDirectoryCatalog.laterMayHelp && {
          laterMayHelp: true,
        }),
      };
    let reviewerMarked = new Set();
    let notInstallable = new Map();
    let directoryMarketplace = buildDirectoryMarketplace(
      pluginDirectoryCatalog.listings,
      pluginDirectoryCatalog.entryNames,
      reviewerMarked,
      notInstallable,
    );
    if (pluginDirectoryCatalog.walkStarted !== undefined)
      for (let plugin of directoryMarketplace.plugins)
        weakMap.set(plugin, pluginDirectoryCatalog.walkStarted);
    return {
      marketplace: directoryMarketplace,
      reviewerMarkedNames: reviewerMarked,
      notInstallable: new Map(
        [...notInstallable].map(([name, skipKind]) => [name, ENTRY_SKIP_REASONS[skipKind]]),
      ),
    };
  }
  return {
    marketplace: buildDirectoryMarketplace(
      pluginDirectoryCatalog.listings,
      pluginDirectoryCatalog.entryNames,
    ),
    ...(pluginDirectoryCatalog.staleReason && {
      staleReason: pluginDirectoryCatalog.staleReason,
    }),
  };
}
//@ chunk-036m2pwj.js:28249-28601 placement
/**
 * 由条目合成插件目录市场并更新会话里的条目名与审核标记。
 */
function buildDirectoryMarketplace(listings, entryNames, reviewerMarked, notInstallable) {
  let entries = directoryListingsToEntries(listings, entryNames);
  for (let entry of entries)
    if ("skipped" in entry.result) notInstallable?.set(entry.name, entry.result.skipped);
  let marketplace = synthesizePluginDirectoryMarketplace(listings, entryNames, entries);
  let session = commandSourceSession();
  session.catalogEntryNames = new Set(marketplace.plugins.map((plugin) => plugin.name));
  let flattened = entries.flatMap((entry) =>
    "entry" in entry.result && isDirectoryListingReviewerMarked(entry.listing) ? entry.name : [],
  );
  session.reviewerMarkedEntryNames = new Set(flattened);
  for (let name of flattened) reviewerMarked?.add(name);
  session.isAccessAllowed = () => isPluginDirectoryAccessAllowed();
  return marketplace;
}
export {
  awaitPluginDirectoryPolicyVerdict,
  directoryListingSource,
  directoryListingsToEntries,
  entryNameClaimBytes,
  isPluginDirectoryEntryFromAFreshWalk,
  isPluginDirectoryMarketplaceEnabled,
  loadPluginDirectoryCatalog,
  loadPluginDirectoryMarketplace,
  namesThatFit,
  notePluginDirectoryWalkTimedOut,
  pluginDirectoryFailedWalkWindow,
  pluginDirectoryNotInstallableMessage,
  pluginDirectoryNotInstallableReason,
  pluginDirectoryNotInstallableSentence,
  pluginDirectoryRegistryEntry,
  pluginDirectoryWalkReadiness,
  readPluginDirectoryMarketplaceChoice,
  setPluginDirectoryMarketplaceEnabled,
  synthesizePluginDirectoryMarketplace,
};
