/**
 * utils/plugins/pluginDirectoryCatalog.ts
 *
 * 2.1.316 新增：插件目录（官方 directory）缓存与刷新：分页拉取、读写本地缓存、修复改名条目、跳过原因。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s67w32sp.js (64)
 * attribution: placement 64
 */
import { join } from "path";
import { unlink, lstat } from "fs/promises";
import { INVISIBLE_CHAR_CLASS_SOURCE } from "../sanitization.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, string, array, unknown, M, record } from "../../../vendor/zod/v4/classic/schemas.js";
import { getPluginsDirectory, sanitizePluginIdLower } from "./pluginDirectories.js";
import {
  readPluginsDirJsonFile,
  bindingsWithReadFailure,
  isUnreadableBindings,
  isOfficialPluginDirectoryId,
  findBindingKeysFor,
} from "./pluginDirectoryBindings.js";
import { dateToFilename_2, logError } from "../log.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import {
  parseDirectoryListing,
  searchPluginDirectory,
  isPluginDirectoryAccessAllowed,
  isDirectoryListingReviewerMarked,
} from "./pluginDirectorySearch.js";
import { jsonStringify } from "../slowOperations.js";
import { isValidPluginIdSegment } from "./schemas.js";
import { logForDebugging } from "../debug.js";
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

//@ chunk-s67w32sp.js:4205-4492 placement
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
//@ chunk-s67w32sp.js:4492-4569 placement
function stripTrailingSlashes(e) {
  let n = e.length;
  while (n > 0 && e[n - 1] === "/") n--;
  return e.slice(0, n);
}
//@ chunk-s67w32sp.js:4569-4580 placement
var MAX_NAME_LENGTH = 255;
//@ chunk-s67w32sp.js:4580-4679 placement = setCwdState (1)
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
//@ chunk-s67w32sp.js:4679-5018 placement
/**
 * pluginDirectoryCacheSchema：插件目录缓存 schema；pluginDirectoryCacheSchemaWithSchema：带 schema 版本的缓存 schema（同一声明共 2 个绑定）。
 */
var PluginDirectoryCacheSchema = DoctorLazy(() =>
  u({
    schemaVersion: literal(PLUGIN_DIRECTORY_CACHE_VERSION),
    fetchedAt: string(),
    listings: array(unknown()),
    listingsOmitted: M().optional().catch(undefined),
    entryNames: record(string(), unknown()).optional().catch(undefined),
    entryNameClaims: record(string(), unknown()).optional().catch(undefined),
    missedListings: array(unknown()).optional().catch(undefined),
  }),
);
var pluginDirectoryCacheSchema = DoctorLazy(() =>
  u({
    version: literal(1),
    fetchedAt: string(),
    listings: array(unknown()),
  }),
);
var pluginDirectoryCacheSchemaWithSchema = 7776000000;
//@ chunk-s67w32sp.js:5018-5050 placement
function pluginDirectoryCachePath() {
  return join(getPluginsDirectory(), PLUGIN_DIRECTORY_CACHE_FILE);
}
//@ chunk-s67w32sp.js:5139-5239 placement
var EntryNameClaimSchema = DoctorLazy(() =>
  u({
    repositoryKey: string().optional().catch(undefined),
    lastSeen: string().optional().catch(undefined),
  }),
);
//@ chunk-s67w32sp.js:5239-5305 placement
function sanitizeEntryNameClaim(e) {
  let n = EntryNameClaimSchema().safeParse(e);
  return n.success ? n.data : {};
}
//@ chunk-s67w32sp.js:5305-6291 placement
async function readPluginDirectoryCache(e) {
  let pluginsDirJsonFile = await readPluginsDirJsonFile(
    PLUGIN_DIRECTORY_CACHE_FILE,
    MAX_PLUGIN_DIRECTORY_CACHE_BYTES,
    "cache",
  );
  if (pluginsDirJsonFile.state === "read") {
    let w = PluginDirectoryCacheSchema().safeParse(pluginsDirJsonFile.json);
    if (!w.success) return null;
    return {
      fetchedAt: dateToFilename_2(w.data.fetchedAt),
      ...(w.data.listingsOmitted === true
        ? {
            listings: [],
            unparseableRows: 0,
            namesOnly: true,
          }
        : parseDirectoryListings(w.data.listings)),
      missed:
        w.data.listingsOmitted === true
          ? []
          : Ji(
              (w.data.missedListings ?? []).flatMap((c) => {
                let f = missedListingSchema().safeParse(c);
                let r = f.success ? parseDirectoryListing(f.data.listing) : undefined;
                return f.success && r && isEntryIdWithinLimit(r)
                  ? [
                      {
                        listing: r,
                        missedAt: f.data.missedAt,
                      },
                    ]
                  : [];
              }),
              (c) => c.listing.id,
            ),
      entryNames: new Map(
        Object.entries(w.data.entryNames ?? {}).flatMap(([key, value]) =>
          typeof value === "string" &&
          isValidPluginIdSegmentLength(value) &&
          Buffer.byteLength(JSON.stringify(key), "utf8") <= MAX_ENTRY_ID_BYTES
            ? [
                [
                  key,
                  {
                    name: value,
                    ...sanitizeEntryNameClaim(w.data.entryNameClaims?.[key]),
                  },
                ],
              ]
            : [],
        ),
      ),
    };
  }
  if (pluginsDirJsonFile.state === "unusable") {
    if (e) e.readFailed = pluginsDirJsonFile.readFailed;
    return null;
  }
  let pluginsDirJsonFile_2 = await readPluginsDirJsonFile(
    PLUGIN_DIRECTORY_CACHE_JSON,
    MAX_PLUGIN_DIRECTORY_CACHE_BYTES,
    "cache",
  );
  let i =
    pluginsDirJsonFile_2.state === "read"
      ? pluginDirectoryCacheSchema().safeParse(pluginsDirJsonFile_2.json)
      : undefined;
  if (!i?.success) return null;
  return {
    fetchedAt: dateToFilename_2(i.data.fetchedAt),
    ...parseDirectoryListings(i.data.listings),
    entryNames: new Map(),
    missed: [],
    fromLegacyFile: true,
  };
}
//@ chunk-s67w32sp.js:6291-6460 placement
function parseDirectoryListings(listings) {
  let filtered = listings.flatMap((i) => parseDirectoryListing(i) ?? []).filter(isEntryIdWithinLimit);
  let a = Ji(filtered, (i) => i.id);
  return {
    listings: a,
    unparseableRows: listings.length - filtered.length,
    ...(a.length < filtered.length && {
      repeatedIds: true,
    }),
  };
}
//@ chunk-s67w32sp.js:6460-6505 placement
var missedListingSchema = DoctorLazy(() =>
  u({
    missedAt: string(),
    listing: unknown(),
  }),
);
//@ chunk-s67w32sp.js:6505-6880 placement
/**
 * 序列化插件目录缓存（条目、漏列项、名字与认领）。
 */
function serializeCatalogCache(fetchedAt, listings, a, i, w) {
  return jsonStringify({
    schemaVersion: PLUGIN_DIRECTORY_CACHE_VERSION,
    fetchedAt,
    listings,
    ...(i && {
      listingsOmitted: true,
    }),
    ...(!i &&
      w.length > 0 && {
        missedListings: w.map(({ missedAt, listing }) => ({
          missedAt,
          listing,
        })),
      }),
    entryNames: Object.fromEntries([...a].map(([c, f]) => [c, f.name])),
    entryNameClaims: Object.fromEntries(
      [...a].map(([c, { repositoryKey: f, lastSeen: r }]) => [
        c,
        {
          repositoryKey: f,
          lastSeen: r,
        },
      ]),
    ),
  });
}
//@ chunk-s67w32sp.js:6880-7105 placement
function entryNameClaimBytes(e, n) {
  let { repositoryKey, lastSeen } = n;
  return (
    2 * Buffer.byteLength(JSON.stringify(e), "utf8") +
    Buffer.byteLength(JSON.stringify(n.name), "utf8") +
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
//@ chunk-s67w32sp.js:7105-7155 placement
var MAX_ENTRY_ID_BYTES = 200;
var MAX_PLUGIN_ID_SEGMENT = 128;
var MAX_LOCAL_NAME_SEGMENT = 64;
var MAX_OWNER_SEGMENT = 32;
var MAX_ENTRY_NAME_BYTES = 1024;
var MAX_NAME_CLAIMS_BYTES = 12582912;
//@ chunk-s67w32sp.js:7155-7228 placement
function isEntryIdWithinLimit(e) {
  return Buffer.byteLength(JSON.stringify(e.id), "utf8") <= MAX_ENTRY_ID_BYTES;
}
//@ chunk-s67w32sp.js:7228-7270 placement
function isValidPluginIdSegmentLength(e) {
  return e.length <= MAX_PLUGIN_ID_SEGMENT && isValidPluginIdSegment(e);
}
//@ chunk-s67w32sp.js:7270-8661 placement
async function namesThatFit(e, n, a, i = MAX_NAME_CLAIMS_BYTES) {
  let w = 0;
  let c = 0;
  let f = new Map();
  for (let [s, m] of e) {
    let S = m;
    let y = entryNameClaimBytes(s, S);
    if (y > MAX_ENTRY_NAME_BYTES) {
      S = {
        name: m.name,
        lastSeen: m.lastSeen,
      };
      y = entryNameClaimBytes(s, S);
      w++;
    }
    f.set(s, {
      claim: S,
      bytes: y,
    });
    c += y;
  }
  if (w === 0 && c <= i) return e;
  let r = new Set(f.keys());
  if (c > i) {
    let s = await listInstalledOfficialNames(a);
    if (s === undefined) {
      for (let k of [true, false]) {
        for (let [g, D] of f)
          if (n.has(g) === k && D.claim.repositoryKey !== undefined) {
            let h = {
              name: D.claim.name,
              lastSeen: D.claim.lastSeen,
            };
            let b = entryNameClaimBytes(g, h);
            c += b - D.bytes;
            f.set(g, {
              claim: h,
              bytes: b,
            });
            w++;
          }
        if (c <= i) break;
      }
      logForDebugging(
        `Plugin directory cache: the kept entry names are past ${i} bytes and the install records (installed_plugins.json) could not be read, so none is dropped; ${c > i ? "they do not fit even without their repositories, so the cache file is left as it is until the install records can be read" : `${w} are written without their repository`}`,
      );
      return c > i ? undefined : new Map([...f].map(([k, { claim: g }]) => [k, g]));
    }
    let sorted = [...f].sort(([k, g], [D, h]) => {
      let b = s.has(g.claim.name);
      let E = s.has(h.claim.name);
      if (b !== E) return b ? -1 : 1;
      let lastSeen = g.claim.lastSeen ?? "";
      let lastSeen_2 = h.claim.lastSeen ?? "";
      if (lastSeen !== lastSeen_2) return lastSeen > lastSeen_2 ? -1 : 1;
      return k < D ? -1 : k > D ? 1 : 0;
    });
    let S = new Set();
    let y = i;
    for (let [k, { bytes: g }] of sorted) {
      if (g > y) break;
      y -= g;
      S.add(k);
    }
    r = S;
  }
  logForDebugging(
    `Plugin directory cache: ${w} entry name(s) written without their repository (each was past ${MAX_ENTRY_NAME_BYTES} bytes), ${f.size - r.size} let go (all names together may take ${i} bytes)`,
  );
  return new Map([...f].filter(([s]) => r.has(s)).map(([s, { claim: m }]) => [s, m]));
}
//@ chunk-s67w32sp.js:8661-8735 placement
async function tryDirectoryFetch(e, n, a = false) {
  try {
    return await e(n, a);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-s67w32sp.js:8735-8902 placement
async function listInstalledOfficialNames(e) {
  let n = await tryDirectoryFetch(e, true);
  if (n === undefined) return;
  let a = `@${OFFICIAL_MARKETPLACE_NAME}`;
  return new Set(
    Object.keys(n)
      .filter((key) => key.endsWith(a))
      .map((key) => key.slice(0, -a.length)),
  );
}
//@ chunk-s67w32sp.js:8902-8954 placement
function isWithinCacheBytes(e) {
  return Buffer.byteLength(e, "utf8") <= MAX_PLUGIN_DIRECTORY_CACHE_BYTES;
}
//@ chunk-s67w32sp.js:8954-9776 placement
async function writePluginDirectoryCache(e, listings, names, i, w) {
  if (isDiskless())
    return {
      wrote: "diskless",
      names,
    };
  let c = false;
  let f = names;
  try {
    let r = serializeCatalogCache(e, listings, f, false, w);
    if (!isWithinCacheBytes(r) && w.length > 0) r = serializeCatalogCache(e, listings, f, false, []);
    if (!isWithinCacheBytes(r)) {
      logForDebugging(
        `Plugin directory cache: writing it without its listings, because whole it would be ${Buffer.byteLength(r, "utf8")} bytes and a cache file past ${MAX_PLUGIN_DIRECTORY_CACHE_BYTES} bytes is not read back`,
      );
      c = true;
      r = serializeCatalogCache(e, [], f, true, []);
      let s = new Set(listings.map((m) => m.id));
      for (let m = MAX_NAME_CLAIMS_BYTES / 2; !isWithinCacheBytes(r) && m >= 1; m = Math.floor(m / 2)) {
        let S = await namesThatFit(names, s, i, m);
        if (S === undefined)
          return {
            wrote: "not-written",
            names,
          };
        f = S;
        r = serializeCatalogCache(e, [], f, true, []);
      }
    }
    await getFsImplementation().mkdir(getPluginsDirectory());
    await writeFileAtomic(pluginDirectoryCachePath(), r, 384);
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
    wrote: c ? "names-only" : "written",
    names: f,
  };
}
//@ chunk-s67w32sp.js:9776-10257 placement
/**
 * 搜索失败原因转结果。
 */
function toSearchFailure(e) {
  switch (e.reason) {
    case "unavailable":
      if (e.cause !== "policy")
        return {
          ok: false,
          reason: "failed",
          message: "a search with typed text is not sent from this session",
        };
      return {
        ok: false,
        reason: "policy",
        message: e.message,
        blockedBy: e.blockedBy,
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
        message: e.message,
      };
  }
}
//@ chunk-s67w32sp.js:10257-10708 placement
/**
 * 在总超时与首答超时内遍历插件目录。
 */
async function walkWithTimeouts(e, deadlineMs, firstAnswerMs) {
  let i = AbortSignal.timeout(deadlineMs);
  let abortController = new AbortController();
  let c = {
    pages: 0,
    answered: false,
  };
  let timer = setTimeout(
    (s, m) => {
      if (!s.answered) m.abort();
    },
    Math.min(firstAnswerMs, deadlineMs),
    c,
    abortController,
  );
  let r = AbortSignal.any([i, abortController.signal]);
  try {
    return await Promise.race([
      walkPluginDirectory(e === undefined ? r : AbortSignal.any([e, r]), c),
      new Promise((resolve) => {
        r.addEventListener(
          "abort",
          () =>
            resolve({
              pages: c.pages,
              unparseableRows: 0,
              result: {
                ok: false,
                reason: "failed",
                message: DIRECTORY_REFRESH_TTL_MS,
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
//@ chunk-s67w32sp.js:10708-10759 placement
var MAX_DIRECTORY_RESPONSE_MS = OFFICIAL_MARKETPLACE_NAME_CHECK_TTL_MS;
var DIRECTORY_NO_ANSWER_TEXT = 15000;
var DIRECTORY_REFRESH_TTL_MS = "it did not answer in time";
//@ chunk-s67w32sp.js:10759-11533 placement
async function walkPluginDirectory(signal, n) {
  let a = [];
  let i = new Set();
  let w;
  let c = 0;
  let unparseableRows = 0;
  while (c < MAX_DIRECTORY_PAGES) {
    c++;
    if (n) n.pages = c;
    let r = await searchPluginDirectory({
      query: "",
      pageToken: w,
      signal,
      pageSize: DIRECTORY_PAGE_SIZE,
      include: DESCRIPTION,
      keepTokenWhenEmpty: true,
    });
    if (!r.ok)
      return {
        pages: c,
        unparseableRows,
        result: toSearchFailure(r),
        ...(r.reason === "failed" && {
          backoffMs: Math.max(BACKOFF_MS, r.retryAfterMs ?? 0),
          ...(r.retryAfterMs !== undefined && {
            serviceDelayMs: r.retryAfterMs,
          }),
        }),
      };
    if (n) n.answered = true;
    let filtered = r.page.listings.filter(isEntryIdWithinLimit);
    unparseableRows += r.page.skippedRows + r.page.listings.length - filtered.length;
    for (let m of filtered) {
      if (i.has(m.id))
        return {
          pages: c,
          unparseableRows,
          result: DUPLICATE_LISTING_FAILURE,
          backoffMs: BACKOFF_MS,
        };
      i.add(m.id);
    }
    a.push(...filtered);
    w = r.page.nextPageToken;
    if (r.page.truncated || (w !== undefined && c === MAX_DIRECTORY_PAGES))
      return {
        pages: c,
        unparseableRows,
        result: INCOMPLETE_LIST_FAILURE,
        backoffMs: BACKOFF_MS,
      };
    if (w === undefined) break;
  }
  return {
    pages: c,
    unparseableRows,
    result: {
      ok: true,
      listings: a,
    },
  };
}
//@ chunk-s67w32sp.js:11533-11674 placement
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
//@ chunk-s67w32sp.js:11674-11802 placement
function pluginDirectoryWalkReadiness() {
  if (!isPluginDirectoryAccessAllowed()) return "not_allowed";
  let lastFailedWalk = commandSourceSession().lastFailedWalk;
  return lastFailedWalk !== undefined && Date.now() - lastFailedWalk.at < BACKOFF_MS ? "backed_off" : "ready";
}
//@ chunk-s67w32sp.js:11802-11902 placement
async function awaitPluginDirectoryPolicyVerdict() {
  let { awaitPolicyLimitsColdStart } = await import("./chunk-qchbrsbw.js");
  await awaitPolicyLimitsColdStart();
}
//@ chunk-s67w32sp.js:11902-11981 placement
function notePluginDirectoryWalkTimedOut() {
  let now = Date.now();
  commandSourceSession().lastFailedWalk = {
    at: now,
    reason: DIRECTORY_REFRESH_TTL_MS,
    failedAt: now,
  };
}
//@ chunk-s67w32sp.js:11981-11996 placement
var isRecentTimestamp = 3600000;
//@ chunk-s67w32sp.js:11996-12243 placement
function pluginDirectoryFailedWalkWindow() {
  let lastFailedWalk = commandSourceSession().lastFailedWalk;
  if (lastFailedWalk === undefined) return;
  let now = Date.now();
  if (
    now - lastFailedWalk.at >= BACKOFF_MS ||
    lastFailedWalk.at - now > isRecentTimestamp ||
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
//@ chunk-s67w32sp.js:12243-12307 placement
function MISSED_LISTING_MAX_AGE_MS(fetchedAt) {
  let n = Date.now() - Date.parse(fetchedAt);
  return n >= 0 && n < CACHE_FRESH_MS;
}
//@ chunk-s67w32sp.js:12307-13254 placement
async function loadPluginDirectoryCatalog({
  signal,
  forceRefresh = false,
  trigger = "other",
  deadlineMs = MAX_DIRECTORY_RESPONSE_MS,
  firstAnswerMs = DIRECTORY_NO_ANSWER_TEXT,
  installRecords,
}) {
  let f = commandSourceSession();
  let catalogLoadInFlight = f.catalogLoadInFlight;
  if (
    signal === undefined &&
    catalogLoadInFlight !== undefined &&
    (catalogLoadInFlight.forceRefresh || !forceRefresh)
  )
    return catalogLoadInFlight.load;
  let s = (async () => {
    let now = Date.now();
    let S = {
      readFailed: false,
    };
    let pluginDirectoryCache = await readPluginDirectoryCache(S);
    let { catalog, pages, judged, ...h } = await refreshPluginDirectory(
      pluginDirectoryCache,
      forceRefresh,
      signal,
      {
        deadlineMs,
        firstAnswerMs,
      },
      S.readFailed,
      installRecords,
    );
    f.staleCatalogFetchedAt = catalog.ok && catalog.staleReason !== undefined ? catalog.fetchedAt : undefined;
    let b = pluginDirectoryCache
      ? Math.round((now - Date.parse(pluginDirectoryCache.fetchedAt)) / 60000)
      : undefined;
    logDirectoryCatalogLoad({
      ...h,
      trigger,
      pages,
      listingCount: catalog.ok ? catalog.listings.length : 0,
      tally: tallyDirectoryEntries(
        judged?.listings ?? [],
        judged?.unparseableRows ?? 0,
        judged?.entryNames ?? new Map(),
      ),
      durationMs: Date.now() - now,
      cacheAgeMin: pluginDirectoryCache && Date.parse(pluginDirectoryCache.fetchedAt) !== 0 ? b : undefined,
    });
    if (!catalog.ok && catalog.blockedBy !== undefined) logDirectoryBlockedOnce(catalog.blockedBy);
    return catalog;
  })();
  if (signal !== undefined) return s;
  f.catalogLoadInFlight = {
    forceRefresh,
    load: s,
  };
  try {
    return await s;
  } finally {
    if (f.catalogLoadInFlight?.load === s) f.catalogLoadInFlight = undefined;
  }
}
//@ chunk-s67w32sp.js:13254-16547 placement
async function refreshPluginDirectory(
  pluginDirectoryCache,
  forceRefresh,
  signal,
  { deadlineMs, firstAnswerMs },
  readFailed,
  installRecords,
) {
  let r = commandSourceSession();
  let s = pluginDirectoryCache?.namesOnly ? null : pluginDirectoryCache;
  if (s?.repeatedIds)
    logForDebugging(
      "Plugin directory: the cached list names a listing more than once (Claude Code 2.1.287 wrote such files), so it is treated as out of date",
    );
  if (
    s &&
    !forceRefresh &&
    isPluginDirectoryAccessAllowed() &&
    !s.fromLegacyFile &&
    !s.repeatedIds &&
    MISSED_LISTING_MAX_AGE_MS(s.fetchedAt)
  )
    return {
      outcome: "fresh_cache",
      pages: 0,
      judged: s,
      catalog: {
        ok: true,
        listings: s.listings,
        fetchedAt: s.fetchedAt,
        entryNames: s.entryNames,
      },
    };
  if (!isPluginDirectoryAccessAllowed()) await awaitPluginDirectoryPolicyVerdict();
  let lastFailedWalk = r.lastFailedWalk;
  if (
    !forceRefresh &&
    lastFailedWalk !== undefined &&
    Date.now() - lastFailedWalk.at < BACKOFF_MS &&
    isPluginDirectoryAccessAllowed()
  )
    return s
      ? {
          outcome: "backoff",
          pages: 0,
          judged: s,
          catalog: {
            ok: true,
            listings: s.listings,
            fetchedAt: s.fetchedAt,
            entryNames: s.entryNames,
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
    result: g,
    backoffMs,
    serviceDelayMs,
  } = await walkWithTimeouts(signal, deadlineMs, firstAnswerMs);
  if (!g.ok) {
    if (backoffMs !== undefined) {
      let now = Date.now();
      r.lastFailedWalk = {
        at: now + backoffMs - BACKOFF_MS,
        reason: g.message,
        failedAt: now,
        ...(serviceDelayMs !== undefined && {
          serviceDelayMs,
        }),
      };
    }
    if (s && g.reason === "failed")
      return {
        ...(g === DUPLICATE_LISTING_FAILURE
          ? {
              outcome: "stale_duplicate_id",
            }
          : {
              outcome: "stale_failed",
              incompleteWalk: g === INCOMPLETE_LIST_FAILURE,
            }),
        pages,
        judged: s,
        catalog: {
          ok: true,
          listings: s.listings,
          fetchedAt: s.fetchedAt,
          entryNames: s.entryNames,
          staleReason: g.message,
          ...(backoffMs !== undefined && {
            laterMayHelp: true,
          }),
        },
      };
    let catalog =
      backoffMs !== undefined
        ? {
            ...g,
            laterMayHelp: true,
          }
        : g;
    if (g === DUPLICATE_LISTING_FAILURE)
      return {
        outcome: "duplicate_id",
        pages,
        catalog,
      };
    return g === INCOMPLETE_LIST_FAILURE
      ? {
          outcome: "incomplete",
          pages,
          catalog,
        }
      : {
          outcome: "refused",
          refusal: g.reason,
          blockedByOrganization: g.blockedBy !== undefined,
          pages,
          catalog,
        };
  }
  let iso = new Date().toISOString();
  let E = pluginDirectoryCache?.entryNames ?? new Map();
  let { names, repairs } = await repairCollisionRenames(E, g.listings, installRecords);
  let P = new Map();
  let B = new Set();
  for (let L of directoryListingsToEntries(g.listings, names)) {
    B.add(L.name);
    P.set(L.listing.id, {
      name: L.name,
      repositoryKey: L.repositoryKey,
      lastSeen: iso,
    });
  }
  let ae = await tryDirectoryFetch(installRecords, false);
  for (let [L, I] of names) {
    if (P.has(L) || B.has(I.name)) continue;
    let U = Date.now() - Date.parse(I.lastSeen ?? "");
    if (
      ae !== undefined &&
      U > pluginDirectoryCacheSchemaWithSchema &&
      !Object.hasOwn(ae, `${I.name}@${OFFICIAL_MARKETPLACE_NAME}`)
    )
      continue;
    P.set(L, {
      ...I,
      lastSeen: Number.isFinite(U) && U >= 0 ? new Date(Date.parse(I.lastSeen ?? "")).toISOString() : iso,
    });
  }
  let ce = {
    listings: g.listings,
    unparseableRows,
    entryNames: P,
  };
  let de = s ? Date.now() - Date.parse(s.fetchedAt) : NaN;
  if (
    s &&
    de >= 0 &&
    de < MISSED_LISTING_TTL_MS &&
    !g.listings.some(idTailSlug) &&
    s.listings.some(idTailSlug)
  ) {
    let L =
      g.listings.length === 0
        ? "it returned an empty list"
        : "it returned no plugins this version of Claude Code can install";
    logForDebugging(`Plugin directory: ${L}; keeping the cached catalogue`, {
      level: "warn",
    });
    let now = Date.now();
    r.lastFailedWalk = {
      at: now,
      reason: L,
      failedAt: now,
    };
    return {
      outcome: "stale_empty",
      pages,
      judged: ce,
      catalog: {
        ok: true,
        listings: s.listings,
        fetchedAt: s.fetchedAt,
        entryNames: s.entryNames,
        staleReason: L,
        ...(g.listings.length === 0 && {
          laterMayHelp: true,
        }),
      },
    };
  }
  r.lastFailedWalk = undefined;
  let j = readFailed
    ? undefined
    : await namesThatFit(P, new Set(g.listings.map((listing) => listing.id)), installRecords);
  let Fe = j === undefined ? [] : await keepMissedListings(s, g.listings, B, iso, installRecords);
  let H =
    j === undefined ? undefined : await revertLegacyRenames(j, repairs, E, names, g.listings, installRecords);
  let namesRepaired = H?.repaired ?? 0;
  let { wrote, names: names_2 } =
    H === undefined
      ? {
          wrote: "not-written",
          names: P,
        }
      : await writePluginDirectoryCache(iso, g.listings, H.names, installRecords, Fe);
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
      ...ce,
      entryNames: names_2,
    },
    catalog: {
      ok: true,
      listings: g.listings,
      fetchedAt: iso,
      entryNames: names_2,
      walked: true,
      walkStarted,
    },
  };
}
//@ chunk-s67w32sp.js:16547-16562 placement
var hasListingSource = 7200000;
//@ chunk-s67w32sp.js:16562-17573 placement
/**
 * 对比上次缓存与本次遍历：漏列且仍被已安装插件使用、未被新名字占用的条目保留（记录首次漏列时间）， 超过保留期（he）后丢弃。
 */
async function keepMissedListings(e, listings, a, i, w) {
  if (e === null) return [];
  let c = new Set(listings.map((g) => g.id));
  let f = new Set(e.listings.map((listing) => listing.id));
  let filtered = e.missed.filter(({ listing }) => !f.has(listing.id));
  let s = [
    ...e.listings
      .filter((listing) => !c.has(listing.id))
      .map((listing) => ({
        listing,
      })),
    ...filtered.filter(({ listing }) => !c.has(listing.id)),
  ];
  if (s.length === 0) return [];
  let m = s.every(({ listing }) => e.entryNames.has(listing.id))
    ? undefined
    : new Map(
        directoryListingsToEntries(
          [...e.listings, ...filtered.map(({ listing }) => listing)],
          e.entryNames,
        ).map((g) => [g.listing.id, g.name]),
      );
  let S = await listInstalledOfficialNames(w);
  let timestamp = Date.parse(i);
  let k = [];
  for (let { listing, missedAt } of s) {
    let h = m?.get(listing.id) ?? e.entryNames.get(listing.id)?.name;
    if (h === undefined || a.has(h) || (S !== undefined && !S.has(h)) || !idTailSlug(listing)) continue;
    let timestamp_2 = Date.parse(missedAt ?? "");
    let E = Number.isFinite(timestamp_2) && timestamp_2 <= timestamp ? timestamp_2 : timestamp;
    if (timestamp - E < hasListingSource)
      k.push({
        listing,
        missedAt: new Date(E).toISOString(),
      });
  }
  logForDebugging(
    `Plugin directory: this walk did not list ${s.length} listing(s) the saved catalog had; keeping ${k.length} that installed plugins use, so they still load until a walk at least ${hasListingSource / 3600000} hours after the first miss also misses them`,
  );
  return k;
}
//@ chunk-s67w32sp.js:17573-17611 placement
function idTailSlug(listing) {
  return "source" in directoryListingSource(listing);
}
//@ chunk-s67w32sp.js:17611-17872 placement
function tallyDirectoryEntries(e, unparseable, a) {
  let i = {
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
  for (let w of directoryListingsToEntries(e, a)) {
    if (w.nameClashed) i.nameClashes++;
    if ("entry" in w.result) i.installable++;
    else i.skipped[w.result.skipped]++;
  }
  return i;
}
//@ chunk-s67w32sp.js:17872-18635 placement
function directoryListingSource(e) {
  let { surfaces } = e;
  let { url, path, reviewed_commit: reviewedCommit } = e.source.repository;
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
      .some((r) => r === "" || r === "." || r === ".." || r.toLowerCase() === ".git")
  )
    return {
      skipped: "bad_url",
    };
  let c = stripTrailingSlashes(url);
  if (/\.git$/i.test(c) && !c.endsWith(".git"))
    return {
      skipped: "bad_url",
    };
  if (normalizePluginRepoUrl(url, undefined) === undefined)
    return {
      skipped: "bad_url",
    };
  let f = path === undefined ? undefined : stripTrailingSlashes(path);
  if (path && !f?.split("/").every(isSafeNfcName))
    return {
      skipped: "bad_path",
    };
  return {
    source: f
      ? {
          source: "git-subdir",
          url: c,
          path: f,
          sha: reviewedCommit,
        }
      : {
          source: "url",
          url: `${c.replace(/\.git$/, "")}.git`,
          sha: reviewedCommit,
        },
  };
}
//@ chunk-s67w32sp.js:18635-18817 placement
function slugifyName(e) {
  let replaced = e.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  let a = (c) => c === "-" || c === "." || c === "_";
  let i = 0;
  let w = replaced.length;
  while (i < w && a(replaced[i])) i++;
  while (w > i && a(replaced[w - 1])) w--;
  return replaced.slice(i, w);
}
//@ chunk-s67w32sp.js:18817-18859 placement
function pluginDirectoryMarketplaceConfig(id) {
  return slugifyName(id).slice(-8) || "x";
}
//@ chunk-s67w32sp.js:18859-20838 placement
/**
 * 为插件目录条目分配稳定的本地名（沿用旧名、按仓库迁移、冲突加后缀）。
 */
function assignDirectoryEntryNames(e, n) {
  let mapped = e.map((h) => {
    let { url, path } = h.source.repository;
    let filtered = url
      .replace(/\.git$/, "")
      .split("/")
      .filter(Boolean);
    let base =
      [
        slugifyName(h.name),
        slugifyName(path?.split("/").filter(Boolean).at(-1) ?? ""),
        slugifyName(filtered.at(-1) ?? ""),
      ]
        .map((P) => P.slice(0, MAX_LOCAL_NAME_SEGMENT).replace(/[-._]+$/, ""))
        .find((P) => P !== "" && isValidPluginIdSegment(P)) ?? "plugin";
    return {
      id: h.id,
      base,
      repositoryKey: normalizePluginRepoUrl(url, path),
      owner: slugifyName(filtered.at(-2) ?? "")
        .slice(0, MAX_OWNER_SEGMENT)
        .replace(/[-._]+$/, ""),
      idTail: pluginDirectoryMarketplaceConfig(h.id),
      sortKey: `${h.id}
${url}
${path ?? ""}`,
    };
  });
  let i = new Map();
  for (let { id } of mapped) i.set(id, (i.get(id) ?? 0) + 1);
  let w = new Map();
  for (let [h, { name: b }] of [...n].sort(([E], [N]) => (E < N ? -1 : 1)))
    if (isValidPluginIdSegmentLength(b) && !w.has(b)) w.set(b, h);
  let c = new Map();
  for (let [h, b] of [...w].sort(([, E], [, N]) =>
    i.has(E) !== i.has(N) ? (i.has(E) ? -1 : 1) : E < N ? -1 : 1,
  ))
    if (!c.has(sanitizePluginIdLower(h)))
      c.set(sanitizePluginIdLower(h), {
        name: h,
        id: b,
      });
  let f = new Map();
  let r = new Map();
  for (let h of mapped)
    if (h.repositoryKey !== undefined && i.get(h.id) === 1 && !n.has(h.id)) {
      let b = r.get(h.repositoryKey) ?? [];
      b.push(h.id);
      r.set(h.repositoryKey, b);
    }
  for (let h of r.values()) h.sort();
  for (let [h, { name: b, id: E }] of c) {
    let repositoryKey = n.get(E)?.repositoryKey;
    if (repositoryKey === undefined || i.has(E)) continue;
    let R = r.get(parseRepoWithRef(repositoryKey))?.shift();
    if (R !== undefined) {
      c.set(h, {
        name: b,
        id: R,
      });
      f.set(R, b);
    }
  }
  let mapped_2 = mapped.map(({ id }) => {
    let b = f.get(id) ?? n.get(id)?.name;
    let E = b === undefined ? undefined : c.get(sanitizePluginIdLower(b));
    return b !== undefined && E?.id === id && E.name === b && i.get(id) === 1 ? b : undefined;
  });
  let mapped_3 = mapped.map((h, b) => mapped_2[b] ?? h.base);
  let S = () => {
    let h = new Map();
    for (let b of mapped_3) {
      let E = sanitizePluginIdLower(b);
      h.set(E, (h.get(E) ?? 0) + 1);
    }
    return mapped.flatMap((b, E) => {
      let N = sanitizePluginIdLower(mapped_3[E] ?? b.base);
      let R = c.get(N);
      return mapped_2[E] === undefined && ((h.get(N) ?? 0) > 1 || (R !== undefined && R.id !== b.id))
        ? E
        : [];
    });
  };
  let mapped_4 = mapped.map(() => 0);
  for (let j = 0; j < 3; j++)
    for (let b of S()) {
      let E = mapped[b];
      let max = Math.max(j, mapped_4[b] ?? 0);
      let R = max === 0 && E?.owner === "" ? 1 : max;
      let P = R === 0 ? E?.owner : R === 1 ? E?.idTail : R === 2 && E ? shortHash(E.id) : undefined;
      if (P !== undefined) {
        mapped_3[b] = `${mapped_3[b]}-${P}`;
        mapped_4[b] = R + 1;
      }
    }
  let k = new Set([...c.keys(), ...mapped_3.map(sanitizePluginIdLower)]);
  let g = (h) => mapped[h]?.sortKey ?? "";
  let sorted = S().sort((h, b) => (g(h) === g(b) ? 0 : g(h) < g(b) ? -1 : 1));
  for (let h of sorted) {
    let b = 2;
    while (k.has(sanitizePluginIdLower(`${mapped_3[h]}-${b}`))) b++;
    let E = `${mapped_3[h]}-${b}`;
    mapped_3[h] = E;
    k.add(sanitizePluginIdLower(E));
  }
  return mapped_3.map((h, b) => ({
    name: h,
    clashed: h !== mapped[b]?.base,
  }));
}
//@ chunk-s67w32sp.js:20838-20977 placement
function isCollisionSuffixedName(e, n) {
  let match = /-([1-9][0-9]*)$/.exec(e);
  return (
    match !== null &&
    Number(match[1]) >= 3 &&
    e.slice(0, match.index).endsWith(`-${pluginDirectoryMarketplaceConfig(n.id)}-${shortHash(n.id)}`)
  );
}
//@ chunk-s67w32sp.js:20977-21697 placement
/**
 * 读安装记录与绑定，给出名字是否被占用、仓库唯一绑定名。
 */
async function loadNameBindingEvidence(e) {
  let n = await tryDirectoryFetch(e, true, true);
  let a = await bindingsWithReadFailure();
  if (n === undefined || isUnreadableBindings(a)) return;
  let i = `@${OFFICIAL_MARKETPLACE_NAME}`;
  let filtered = Object.keys(n).filter(isOfficialPluginDirectoryId);
  let c = [...a.keys()];
  let f = (m) =>
    findBindingKeysFor(filtered, m).flatMap((S) => {
      let y = n[S];
      return Array.isArray(y) ? y : [];
    });
  let r = (m) =>
    typeof m === "object" &&
    m !== null &&
    "directoryRepositoryKey" in m &&
    typeof m.directoryRepositoryKey === "string" &&
    m.directoryRepositoryKey !== ""
      ? parseRepoWithRef(m.directoryRepositoryKey)
      : undefined;
  let s = new Map();
  for (let m of filtered) {
    let mapped = f(m).map(r);
    let y = mapped[0];
    if (
      y !== undefined &&
      mapped.every((k) => k === y) &&
      findBindingKeysFor(c, m).every((k) => parseRepoWithRef(a.get(k) ?? "") === y)
    )
      s.set(y, [...(s.get(y) ?? []), m]);
  }
  return {
    holds: (m) => f(`${m}${i}`).length > 0 || findBindingKeysFor(c, `${m}${i}`).length > 0,
    onlyNameBoundTo: (m) => {
      let S = s.get(m) ?? [];
      return S.length === 1 ? S[0]?.slice(0, -i.length) : undefined;
    },
  };
}
//@ chunk-s67w32sp.js:21697-22634 placement
/**
 * 修复被加冲突后缀的条目名，改回安装插件使用的名字。
 */
async function repairCollisionRenames(e, listings, a) {
  let filtered = listings.filter((y) => {
    let k = e.get(y.id)?.name;
    return k !== undefined && isCollisionSuffixedName(k, y);
  });
  if (filtered.length === 0)
    return {
      names: e,
      repairs: [],
    };
  let nameBindingEvidence = await loadNameBindingEvidence(a);
  if (nameBindingEvidence === undefined)
    return {
      names: e,
      repairs: [],
    };
  let c = (y) => {
    let k = directoryListingSource(y);
    return "source" in k ? samePluginSource(k.source, undefined) : undefined;
  };
  let f = new Map();
  for (let y of listings) {
    let { url, path } = y.source.repository;
    for (let D of new Set([c(y), normalizePluginRepoUrl(url, path)].flatMap((h) => h ?? [])))
      f.set(D, (f.get(D) ?? 0) + 1);
  }
  let r = new Map();
  let s = (name, id, g) => {
    let D = sanitizePluginIdLower(name);
    let h = r.get(D) ?? new Set();
    if (g) h.add(id);
    else h.delete(id);
    r.set(D, h);
  };
  for (let [y, k] of e) s(k.name, y, true);
  let m = new Map(e);
  let S = [];
  for (let y of filtered) {
    let k = m.get(y.id);
    let g = c(y);
    if (k === undefined || g === undefined) continue;
    if ((f.get(g) ?? 0) !== 1) continue;
    if (nameBindingEvidence.holds(k.name)) continue;
    let D = nameBindingEvidence.onlyNameBoundTo(g);
    if (
      D === undefined ||
      D === k.name ||
      !isValidPluginIdSegmentLength(D) ||
      [...(r.get(sanitizePluginIdLower(D)) ?? [])].some((h) => h !== y.id)
    )
      continue;
    m.set(y.id, {
      ...k,
      name: D,
    });
    s(k.name, y.id, false);
    s(D, y.id, true);
    S.push({
      id: y.id,
      key: g,
      name: D,
    });
  }
  return {
    names: m,
    repairs: S,
  };
}
//@ chunk-s67w32sp.js:22634-23602 placement
/**
 * 撤销 2.1.287 改过的名字（安装记录能证明时）。
 */
async function revertLegacyRenames(e, repairs, a, names, listings, c) {
  if (repairs.length === 0)
    return {
      names: e,
      repaired: 0,
    };
  let nameBindingEvidence = await loadNameBindingEvidence(c);
  let r = [];
  let s = 0;
  for (let { id, key, name: g } of repairs) {
    let D = a.get(id)?.name;
    if (
      D !== undefined &&
      (nameBindingEvidence === undefined ||
        nameBindingEvidence.holds(D) ||
        nameBindingEvidence.onlyNameBoundTo(key) !== g)
    )
      r.push(id);
    else if (e.has(id)) s++;
  }
  if (s + r.length > 0)
    logForDebugging(
      `Plugin directory: of ${s + r.length} listing(s) Claude Code 2.1.287 had renamed, gave ${s} back the name their installed plugin uses` +
        (r.length === 0
          ? ""
          : nameBindingEvidence === undefined
            ? `; kept the 2.1.287 name for ${r.length} because the install records or bindings file could not be read again`
            : `; kept the 2.1.287 name for ${r.length} because a plugin is now installed under it, or the install records and bindings no longer prove the name it was given back`),
    );
  if (r.length === 0)
    return {
      names: e,
      repaired: s,
    };
  let m = new Map(names);
  for (let y of r) {
    let k = a.get(y);
    if (k !== undefined) m.set(y, k);
  }
  let S = new Map(e);
  for (let y of directoryListingsToEntries(listings, m)) {
    let k = S.get(y.listing.id);
    if (k !== undefined)
      S.set(y.listing.id, {
        ...k,
        name: y.name,
      });
  }
  return {
    names: S,
    repaired: s,
  };
}
//@ chunk-s67w32sp.js:23602-24221 placement
function directoryListingsToEntries(e, n) {
  let a = assignDirectoryEntryNames(e, n);
  let i = [];
  for (let [w, c] of e.entries()) {
    let f = a[w]?.name ?? c.id;
    let r = directoryListingSource(c);
    let { url, path } = c.source.repository;
    let trimmed = stripInvisibleKeepNewlines(c.summary || c.description || "").trim();
    let trimmed_2 = stripInvisibleKeepEmoji(c.name).trim();
    let trimmed_3 = stripInvisibleKeepEmoji(c.release?.version ?? "").trim();
    let trimmed_4 = stripInvisibleKeepEmoji(c.publisher?.name ?? "").trim();
    let trimmed_5 = stripInvisibleKeepEmoji(c.links?.documentation ?? "").trim();
    let h = trimmed_5.startsWith("https://") ? trimmed_5 : "";
    i.push({
      name: f,
      nameClashed: a[w]?.clashed ?? false,
      listing: c,
      repositoryKey: normalizePluginRepoUrl(url, path),
      result:
        "skipped" in r
          ? r
          : {
              entry: {
                name: f,
                source: r.source,
                ...(trimmed_2 !== "" &&
                  trimmed_2 !== f && {
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
                ...(h && {
                  homepage: h,
                }),
                repository: url,
                strict: true,
              },
            },
    });
  }
  return i;
}
//@ chunk-s67w32sp.js:24221-24438 placement
function synthesizePluginDirectoryMarketplace(e, n, a = directoryListingsToEntries(e, n)) {
  return {
    name: OFFICIAL_MARKETPLACE_NAME,
    owner: {
      name: "Anthropic",
    },
    metadata: {
      description: `Plugins listed by the ${OFFICIAL_MARKETPLACE_DISPLAY}, installed at their listed commit`,
    },
    plugins: a.flatMap((i) => ("entry" in i.result ? i.result.entry : [])),
  };
}
//@ chunk-s67w32sp.js:24438-24640 placement
var ENTRY_SKIP_REASONS = {
  other_surface: "it is not offered for Claude Code",
  no_pin: "it has no listed commit",
  bad_url: "its repository address is not one Claude Code installs from",
  bad_path: "its folder path is not valid",
};
//@ chunk-s67w32sp.js:24640-24712 placement
async function pluginDirectoryNotInstallableMessage(e) {
  let n = await pluginDirectoryNotInstallableReason(e);
  return n === undefined ? undefined : pluginDirectoryNotInstallableSentence(e, n);
}
//@ chunk-s67w32sp.js:24712-24830 placement
function pluginDirectoryNotInstallableSentence(e, n) {
  return `"${e}" is listed in the ${OFFICIAL_MARKETPLACE_DISPLAY} but cannot be installed by this version of Claude Code (${n}).`;
}
//@ chunk-s67w32sp.js:24830-24993 placement
async function pluginDirectoryNotInstallableReason(e) {
  let pluginDirectoryCache = await readPluginDirectoryCache();
  let found = directoryListingsToEntries(
    pluginDirectoryCache?.listings ?? [],
    pluginDirectoryCache?.entryNames ?? new Map(),
  ).find((i) => i.name === e);
  return found && "skipped" in found.result ? ENTRY_SKIP_REASONS[found.result.skipped] : undefined;
}
//@ chunk-s67w32sp.js:24993-25074 placement
var PLUGIN_DIRECTORY_MARKETPLACE_JSON = "plugin-directory-marketplace.json";
var pluginDirectoryMarketplacePath = DoctorLazy(() =>
  u({
    enabled: M().optional(),
  }),
);
//@ chunk-s67w32sp.js:25074-25106 placement
function MAX_PLUGIN_DIRECTORY_MARKETPLACE_BYTES() {
  return join(getPluginsDirectory(), PLUGIN_DIRECTORY_MARKETPLACE_JSON);
}
//@ chunk-s67w32sp.js:25106-25118 placement
var MAX_SEGMENT_SLUG_LENGTH = 4096;
//@ chunk-s67w32sp.js:25118-25490 placement
async function readPluginDirectoryMarketplaceChoice() {
  let pluginsDirJsonFile = await readPluginsDirJsonFile(
    PLUGIN_DIRECTORY_MARKETPLACE_JSON,
    MAX_SEGMENT_SLUG_LENGTH,
    "on/off file",
  );
  let n = commandSourceSession();
  let readFailed = pluginsDirJsonFile.state === "unusable" && pluginsDirJsonFile.readFailed;
  if (readFailed && n.marketplaceChoice !== undefined) return n.marketplaceChoice;
  let i =
    pluginsDirJsonFile.state === "read"
      ? pluginDirectoryMarketplacePath().safeParse(pluginsDirJsonFile.json)
      : undefined;
  let enabled = i?.success ? i.data.enabled : undefined;
  let c =
    enabled === undefined
      ? {
          enabled: encapsulatedPebbleEnabled(),
          source: "flag_default",
        }
      : {
          enabled,
          source: "user_choice",
        };
  if (!readFailed) n.marketplaceChoice = c;
  return c;
}
//@ chunk-s67w32sp.js:25490-25537 placement
async function isPluginDirectoryMarketplaceEnabled() {
  return (await readPluginDirectoryMarketplaceChoice()).enabled;
}
//@ chunk-s67w32sp.js:25537-25835 placement
async function setPluginDirectoryMarketplaceEnabled(e) {
  if (isDiskless())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `This session doesn't save settings, so the ${OFFICIAL_MARKETPLACE_DISPLAY} can't be turned ${e ? "on" : "off"}`,
      "plugin directory marketplace toggled in a diskless session",
    );
  await getFsImplementation().mkdir(getPluginsDirectory());
  await writeFileAtomic(
    MAX_PLUGIN_DIRECTORY_MARKETPLACE_BYTES(),
    jsonStringify({
      enabled: e,
    }),
    384,
  );
  commandSourceSession().marketplaceChoice = {
    enabled: e,
    source: "user_choice",
  };
}
//@ chunk-s67w32sp.js:25835-25870 placement
var PLUGIN_DIRECTORY_BUILT_IN = "plugin-directory:built-in";
//@ chunk-s67w32sp.js:25870-26105 placement
async function pluginDirectoryRegistryEntry() {
  let lastUpdated = new Date(0).toISOString();
  if (!isDiskless())
    try {
      let n = await lstat(pluginDirectoryCachePath());
      if (n.isFile()) lastUpdated = n.mtime.toISOString();
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
//@ chunk-s67w32sp.js:26105-26210 placement
var SWITCH_PURPOSE_LABELS = {
  install: "an install",
  update: "an update",
  switch: "a marketplace switch",
};
var CATALOG_TTL_MS = 1800000;
var weakMap = new WeakMap();
//@ chunk-s67w32sp.js:26210-26345 placement
function isPluginDirectoryEntryFromAFreshWalk(e) {
  let n = weakMap.get(e);
  if (n === undefined) return false;
  let a = Date.now() - n.wall;
  let i = performance.now() - n.mono;
  return a >= 0 && a < CATALOG_TTL_MS && i >= 0 && i < CATALOG_TTL_MS;
}
//@ chunk-s67w32sp.js:26345-27908 placement
async function loadPluginDirectoryMarketplace(
  e,
  {
    forInstalledPlugin = false,
    onlyMissedListings = false,
    purpose = "load",
    trigger = "other",
    signal,
    installRecords,
  },
) {
  let r = purpose === "load" ? undefined : purpose;
  if (r !== undefined && (e !== "refresh" || forInstalledPlugin))
    return {
      marketplace: null,
      message: `no fresh list was asked for, which ${SWITCH_PURPOSE_LABELS[r]} needs (an internal error)`,
      notFreshEnoughFor: r,
    };
  if (e === "cache-only") {
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
    let S = new Set(pluginDirectoryCache.listings.map((listing) => listing.id));
    let mapped = pluginDirectoryCache.missed
      .filter(({ listing }) => !S.has(listing.id))
      .map(({ listing }) => listing);
    return {
      marketplace: synthesizePluginDirectoryMarketplace(
        mapped,
        pluginDirectoryCache.entryNames,
        mapped.length === 0
          ? []
          : directoryListingsToEntries(
              [...pluginDirectoryCache.listings, ...mapped],
              pluginDirectoryCache.entryNames,
            ).slice(pluginDirectoryCache.listings.length),
      ),
    };
  }
  let pluginDirectoryCatalog = await loadPluginDirectoryCatalog({
    forceRefresh: e === "refresh",
    trigger,
    signal,
    installRecords,
  });
  if (!pluginDirectoryCatalog.ok)
    return {
      marketplace: null,
      message: pluginDirectoryCatalog.message,
      ...(r !== undefined && {
        notFreshEnoughFor: r,
      }),
      ...(pluginDirectoryCatalog.laterMayHelp && {
        laterMayHelp: true,
      }),
    };
  if (r !== undefined) {
    if (pluginDirectoryCatalog.staleReason !== undefined || pluginDirectoryCatalog.walked !== true)
      return {
        marketplace: null,
        message:
          pluginDirectoryCatalog.staleReason ??
          "only the list saved on this machine answered, not the Directory itself",
        notFreshEnoughFor: r,
        ...(pluginDirectoryCatalog.laterMayHelp && {
          laterMayHelp: true,
        }),
      };
    let m = new Set();
    let S = new Map();
    let directoryMarketplace = buildDirectoryMarketplace(
      pluginDirectoryCatalog.listings,
      pluginDirectoryCatalog.entryNames,
      m,
      S,
    );
    if (pluginDirectoryCatalog.walkStarted !== undefined)
      for (let plugin of directoryMarketplace.plugins)
        weakMap.set(plugin, pluginDirectoryCatalog.walkStarted);
    return {
      marketplace: directoryMarketplace,
      reviewerMarkedNames: m,
      notInstallable: new Map([...S].map(([k, g]) => [k, ENTRY_SKIP_REASONS[g]])),
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
//@ chunk-s67w32sp.js:27908-28260 placement
/**
 * 由条目合成插件目录市场并更新会话里的条目名与审核标记。
 */
function buildDirectoryMarketplace(listings, entryNames, a, i) {
  let w = directoryListingsToEntries(listings, entryNames);
  for (let s of w) if ("skipped" in s.result) i?.set(s.name, s.result.skipped);
  let c = synthesizePluginDirectoryMarketplace(listings, entryNames, w);
  let f = commandSourceSession();
  f.catalogEntryNames = new Set(c.plugins.map((plugin) => plugin.name));
  let flattened = w.flatMap((s) =>
    "entry" in s.result && isDirectoryListingReviewerMarked(s.listing) ? s.name : [],
  );
  f.reviewerMarkedEntryNames = new Set(flattened);
  for (let s of flattened) a?.add(s);
  f.isAccessAllowed = () => isPluginDirectoryAccessAllowed();
  return c;
}
