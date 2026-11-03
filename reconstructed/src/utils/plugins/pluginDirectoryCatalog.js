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
import { RS } from "../sanitization.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, A, oe, M, pe } from "../../../vendor/zod/v4/classic/schemas.js";
import { getPluginsDirectory, sanitizePluginIdLower } from "./pluginDirectories.js";
import { readPluginsDirJsonFile, lpe, xSe, VS, findBindingKeysFor } from "./pluginDirectoryBindings.js";
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
import { OFFICIAL_MARKETPLACE_NAME, cbr, OFFICIAL_MARKETPLACE_DISPLAY } from "./officialMarketplaceNames.js";
import { isDiskless } from "../../bootstrap/state.js";
import { getFsImplementation } from "../fsOperations.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";
import {
  errorMessage,
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { kk } from "./commandSourceErrors.js";
import { logDirectoryCatalogLoad, logDirectoryBlockedOnce, ckt } from "./pluginDirectoryTelemetry.js";
import { normalizePluginRepoUrl, parseRepoWithRef, samePluginSource } from "./pluginSourceUrl.js";
import { gn } from "../shortHash.js";
import {
  stripInvisibleKeepNewlines,
  stripInvisibleKeepEmoji,
} from "../settings/marketplaceSettingsAliases.js";
import { Q4o } from "./pluginGates.js";

//@ chunk-s67w32sp.js:4205-4492 placement
var PLUGIN_DIRECTORY_CACHE_FILE = "plugin-directory-cache-v2.json",
  be = 2,
  PLUGIN_DIRECTORY_CACHE_JSON = "plugin-directory-cache.json",
  x = 16777216,
  Ke = 3600000,
  xe = 500,
  fe = 40,
  DESCRIPTION = "description",
  ze = 604800000,
  Be = /^[0-9a-f]{40}$/,
  CLAUDE_CODE = "claude_code",
  He = /^https:\/\/(?!-)[A-Za-z0-9._-]+\/[^\s\\?#%]+$/,
  regExp = new RegExp(`[\\\\:${RS}]|[^\\S ]|^ |[ .]$|~\\d`, "u");
//@ chunk-s67w32sp.js:4492-4569 placement
function Y(e) {
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
var PluginDirectoryCacheSchema = DoctorLazy(() =>
    u({
      schemaVersion: T(be),
      fetchedAt: o(),
      listings: A(oe()),
      listingsOmitted: M()
        .optional()
        .catch(void 0),
      entryNames: pe(o(), oe())
        .optional()
        .catch(void 0),
      entryNameClaims: pe(o(), oe())
        .optional()
        .catch(void 0),
      missedListings: A(oe())
        .optional()
        .catch(void 0),
    }),
  ),
  Je = DoctorLazy(() => u({ version: T(1), fetchedAt: o(), listings: A(oe()) })),
  Ve = 7776000000;
//@ chunk-s67w32sp.js:5018-5050 placement
function De() {
  return join(getPluginsDirectory(), PLUGIN_DIRECTORY_CACHE_FILE);
}
//@ chunk-s67w32sp.js:5139-5239 placement
var EntryNameClaimSchema = DoctorLazy(() =>
  u({
    repositoryKey: o()
      .optional()
      .catch(void 0),
    lastSeen: o()
      .optional()
      .catch(void 0),
  }),
);
//@ chunk-s67w32sp.js:5239-5305 placement
function Ze(e) {
  let safeParse = EntryNameClaimSchema().safeParse(e);
  return safeParse.success ? safeParse.data : {};
}
//@ chunk-s67w32sp.js:5305-6291 placement
async function readPluginDirectoryCache(e) {
  let n = await readPluginsDirJsonFile(PLUGIN_DIRECTORY_CACHE_FILE, x, "cache");
  if (n.state === "read") {
    let safeParse = PluginDirectoryCacheSchema().safeParse(n.json);
    if (!safeParse.success) return null;
    return {
      fetchedAt: dateToFilename_2(safeParse.data.fetchedAt),
      ...(safeParse.data.listingsOmitted === !0
        ? { listings: [], unparseableRows: 0, namesOnly: !0 }
        : parseDirectoryListings(safeParse.data.listings)),
      missed:
        safeParse.data.listingsOmitted === !0
          ? []
          : Ji(
              (safeParse.data.missedListings ?? []).flatMap((c) => {
                let safeParse = Qe().safeParse(c),
                  r = safeParse.success ? parseDirectoryListing(safeParse.data.listing) : void 0;
                return safeParse.success && r && ne(r)
                  ? [{ listing: r, missedAt: safeParse.data.missedAt }]
                  : [];
              }),
              (c) => c.listing.id,
            ),
      entryNames: new Map(
        Object.entries(safeParse.data.entryNames ?? {}).flatMap(([c, f]) =>
          typeof f === "string" && se(f) && Buffer.byteLength(JSON.stringify(c), "utf8") <= Ae
            ? [[c, { name: f, ...Ze(safeParse.data.entryNameClaims?.[c]) }]]
            : [],
        ),
      ),
    };
  }
  if (n.state === "unusable") {
    if (e) e.readFailed = n.readFailed;
    return null;
  }
  let a = await readPluginsDirJsonFile(PLUGIN_DIRECTORY_CACHE_JSON, x, "cache"),
    i = a.state === "read" ? Je().safeParse(a.json) : void 0;
  if (!i?.success) return null;
  return {
    fetchedAt: dateToFilename_2(i.data.fetchedAt),
    ...parseDirectoryListings(i.data.listings),
    entryNames: new Map(),
    missed: [],
    fromLegacyFile: !0,
  };
}
//@ chunk-s67w32sp.js:6291-6460 placement
function parseDirectoryListings(e) {
  let filtered = e.flatMap((i) => parseDirectoryListing(i) ?? []).filter(ne),
    a = Ji(filtered, (i) => i.id);
  return {
    listings: a,
    unparseableRows: e.length - filtered.length,
    ...(a.length < filtered.length && { repeatedIds: !0 }),
  };
}
//@ chunk-s67w32sp.js:6460-6505 placement
var Qe = DoctorLazy(() => u({ missedAt: o(), listing: oe() }));
/**
 * 序列化插件目录缓存（条目、漏列项、名字与认领）。
 */
//@ chunk-s67w32sp.js:6505-6880 placement
function serializeCatalogCache(e, n, a, i, w) {
  return jsonStringify({
    schemaVersion: be,
    fetchedAt: e,
    listings: n,
    ...(i && { listingsOmitted: !0 }),
    ...(!i &&
      w.length > 0 && {
        missedListings: w.map(({ missedAt: missedAt, listing: listing }) => ({
          missedAt: missedAt,
          listing: listing,
        })),
      }),
    entryNames: Object.fromEntries([...a].map(([c, f]) => [c, f.name])),
    entryNameClaims: Object.fromEntries(
      [...a].map(([c, { repositoryKey: f, lastSeen: r }]) => [c, { repositoryKey: f, lastSeen: r }]),
    ),
  });
}
//@ chunk-s67w32sp.js:6880-7105 placement
function entryNameClaimBytes(e, n) {
  let { repositoryKey: repositoryKey, lastSeen: lastSeen } = n;
  return (
    2 * Buffer.byteLength(JSON.stringify(e), "utf8") +
    Buffer.byteLength(JSON.stringify(n.name), "utf8") +
    Buffer.byteLength(JSON.stringify({ repositoryKey: repositoryKey, lastSeen: lastSeen }), "utf8") +
    4
  );
}
//@ chunk-s67w32sp.js:7105-7155 placement
var Ae = 200,
  et = 128,
  tt = 64,
  nt = 32,
  ye = 1024,
  Me = 12582912;
//@ chunk-s67w32sp.js:7155-7228 placement
function ne(e) {
  return Buffer.byteLength(JSON.stringify(e.id), "utf8") <= Ae;
}
//@ chunk-s67w32sp.js:7228-7270 placement
function se(e) {
  return e.length <= et && isValidPluginIdSegment(e);
}
//@ chunk-s67w32sp.js:7270-8661 placement
async function namesThatFit(e, n, a, i = Me) {
  let w = 0,
    c = 0,
    f = new Map();
  for (let [s, m] of e) {
    let S = m,
      y = entryNameClaimBytes(s, S);
    if (y > ye) ((S = { name: m.name, lastSeen: m.lastSeen }), (y = entryNameClaimBytes(s, S)), w++);
    (f.set(s, { claim: S, bytes: y }), (c += y));
  }
  if (w === 0 && c <= i) return e;
  let r = new Set(f.keys());
  if (c > i) {
    let s = await listInstalledOfficialNames(a);
    if (s === void 0) {
      for (let k of [!0, !1]) {
        for (let [g, D] of f)
          if (n.has(g) === k && D.claim.repositoryKey !== void 0) {
            let h = { name: D.claim.name, lastSeen: D.claim.lastSeen },
              b = entryNameClaimBytes(g, h);
            ((c += b - D.bytes), f.set(g, { claim: h, bytes: b }), w++);
          }
        if (c <= i) break;
      }
      return (
        logForDebugging(
          `Plugin directory cache: the kept entry names are past ${i} bytes and the install records (installed_plugins.json) could not be read, so none is dropped; ${c > i ? "they do not fit even without their repositories, so the cache file is left as it is until the install records can be read" : `${w} are written without their repository`}`,
        ),
        c > i ? void 0 : new Map([...f].map(([k, { claim: g }]) => [k, g]))
      );
    }
    let sorted = [...f].sort(([k, g], [D, h]) => {
        let b = s.has(g.claim.name),
          E = s.has(h.claim.name);
        if (b !== E) return b ? -1 : 1;
        let N = g.claim.lastSeen ?? "",
          R = h.claim.lastSeen ?? "";
        if (N !== R) return N > R ? -1 : 1;
        return k < D ? -1 : k > D ? 1 : 0;
      }),
      S = new Set(),
      y = i;
    for (let [k, { bytes: g }] of sorted) {
      if (g > y) break;
      ((y -= g), S.add(k));
    }
    r = S;
  }
  return (
    logForDebugging(
      `Plugin directory cache: ${w} entry name(s) written without their repository (each was past ${ye} bytes), ${f.size - r.size} let go (all names together may take ${i} bytes)`,
    ),
    new Map([...f].filter(([s]) => r.has(s)).map(([s, { claim: m }]) => [s, m]))
  );
}
//@ chunk-s67w32sp.js:8661-8735 placement
async function ie(e, n, a = !1) {
  try {
    return await e(n, a);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-s67w32sp.js:8735-8902 placement
async function listInstalledOfficialNames(e) {
  let n = await ie(e, !0);
  if (n === void 0) return;
  let a = `@${OFFICIAL_MARKETPLACE_NAME}`;
  return new Set(
    Object.keys(n)
      .filter((i) => i.endsWith(a))
      .map((i) => i.slice(0, -a.length)),
  );
}
//@ chunk-s67w32sp.js:8902-8954 placement
function V(e) {
  return Buffer.byteLength(e, "utf8") <= x;
}
//@ chunk-s67w32sp.js:8954-9776 placement
async function writePluginDirectoryCache(e, n, a, i, w) {
  if (isDiskless()) return { wrote: "diskless", names: a };
  let c = !1,
    f = a;
  try {
    let r = serializeCatalogCache(e, n, f, !1, w);
    if (!V(r) && w.length > 0) r = serializeCatalogCache(e, n, f, !1, []);
    if (!V(r)) {
      (logForDebugging(
        `Plugin directory cache: writing it without its listings, because whole it would be ${Buffer.byteLength(r, "utf8")} bytes and a cache file past ${x} bytes is not read back`,
      ),
        (c = !0),
        (r = serializeCatalogCache(e, [], f, !0, [])));
      let s = new Set(n.map((m) => m.id));
      for (let m = Me / 2; !V(r) && m >= 1; m = Math.floor(m / 2)) {
        let S = await namesThatFit(a, s, i, m);
        if (S === void 0) return { wrote: "not-written", names: a };
        ((f = S), (r = serializeCatalogCache(e, [], f, !0, [])));
      }
    }
    (await getFsImplementation().mkdir(getPluginsDirectory()), await writeFileAtomic(De(), r, 384));
  } catch (error) {
    return (
      logForDebugging(`Failed to write plugin directory cache: ${errorMessage(error)}`),
      { wrote: "not-written", names: a }
    );
  }
  try {
    await unlink(join(getPluginsDirectory(), PLUGIN_DIRECTORY_CACHE_JSON));
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Failed to remove the old plugin directory cache: ${errorMessage(error)}`);
  }
  return { wrote: c ? "names-only" : "written", names: f };
}
/**
 * 搜索失败原因转结果。
 */
//@ chunk-s67w32sp.js:9776-10257 placement
function toSearchFailure(e) {
  switch (e.reason) {
    case "unavailable":
      if (e.cause !== "policy")
        return {
          ok: !1,
          reason: "failed",
          message: "a search with typed text is not sent from this session",
        };
      return { ok: !1, reason: "policy", message: e.message, blockedBy: e.blockedBy };
    case "not-served":
      return { ok: !1, reason: "not-served", message: "it is not available for your account yet" };
    case "aborted":
      return { ok: !1, reason: "failed", message: "the request was cancelled" };
    case "failed":
      return { ok: !1, reason: "failed", message: e.message };
  }
}
/**
 * 在总超时与首答超时内遍历插件目录。
 */
//@ chunk-s67w32sp.js:10257-10708 placement
async function walkWithTimeouts(e, n, a) {
  let timeout = AbortSignal.timeout(n),
    abortController = new AbortController(),
    c = { pages: 0, answered: !1 },
    f = setTimeout(
      (s, m) => {
        if (!s.answered) m.abort();
      },
      Math.min(a, n),
      c,
      abortController,
    ),
    any = AbortSignal.any([timeout, abortController.signal]);
  try {
    return await Promise.race([
      walkPluginDirectory(e === void 0 ? any : AbortSignal.any([e, any]), c),
      new Promise((s) => {
        any.addEventListener(
          "abort",
          () =>
            s({
              pages: c.pages,
              unparseableRows: 0,
              result: { ok: !1, reason: "failed", message: Ne },
              backoffMs: BACKOFF_MS,
            }),
          { once: !0 },
        );
      }),
    ]);
  } finally {
    clearTimeout(f);
  }
}
//@ chunk-s67w32sp.js:10708-10759 placement
var at = cbr,
  ot = 15000,
  Ne = "it did not answer in time";
//@ chunk-s67w32sp.js:10759-11533 placement
async function walkPluginDirectory(e, n) {
  let a = [],
    i = new Set(),
    w,
    c = 0,
    f = 0;
  while (c < fe) {
    if ((c++, n)) n.pages = c;
    let r = await searchPluginDirectory({
      query: "",
      pageToken: w,
      signal: e,
      pageSize: xe,
      include: DESCRIPTION,
      keepTokenWhenEmpty: !0,
    });
    if (!r.ok)
      return {
        pages: c,
        unparseableRows: f,
        result: toSearchFailure(r),
        ...(r.reason === "failed" && {
          backoffMs: Math.max(BACKOFF_MS, r.retryAfterMs ?? 0),
          ...(r.retryAfterMs !== void 0 && { serviceDelayMs: r.retryAfterMs }),
        }),
      };
    if (n) n.answered = !0;
    let filtered = r.page.listings.filter(ne);
    f += r.page.skippedRows + r.page.listings.length - filtered.length;
    for (let m of filtered) {
      if (i.has(m.id))
        return { pages: c, unparseableRows: f, result: DUPLICATE_LISTING_FAILURE, backoffMs: BACKOFF_MS };
      i.add(m.id);
    }
    if ((a.push(...filtered), (w = r.page.nextPageToken), r.page.truncated || (w !== void 0 && c === fe)))
      return { pages: c, unparseableRows: f, result: INCOMPLETE_LIST_FAILURE, backoffMs: BACKOFF_MS };
    if (w === void 0) break;
  }
  return { pages: c, unparseableRows: f, result: { ok: !0, listings: a } };
}
//@ chunk-s67w32sp.js:11533-11674 placement
var INCOMPLETE_LIST_FAILURE = { ok: !1, reason: "failed", message: "it returned an incomplete list" },
  DUPLICATE_LISTING_FAILURE = { ok: !1, reason: "failed", message: "it listed a plugin twice" },
  BACKOFF_MS = 300000;
//@ chunk-s67w32sp.js:11674-11802 placement
function pluginDirectoryWalkReadiness() {
  if (!isPluginDirectoryAccessAllowed()) return "not_allowed";
  let lastFailedWalk = kk().lastFailedWalk;
  return lastFailedWalk !== void 0 && Date.now() - lastFailedWalk.at < BACKOFF_MS ? "backed_off" : "ready";
}
//@ chunk-s67w32sp.js:11802-11902 placement
async function awaitPluginDirectoryPolicyVerdict() {
  let { awaitPolicyLimitsColdStart: awaitPolicyLimitsColdStart } = await import("./chunk-qchbrsbw.js");
  await awaitPolicyLimitsColdStart();
}
//@ chunk-s67w32sp.js:11902-11981 placement
function notePluginDirectoryWalkTimedOut() {
  let now = Date.now();
  kk().lastFailedWalk = { at: now, reason: Ne, failedAt: now };
}
//@ chunk-s67w32sp.js:11981-11996 placement
var dt = 3600000;
//@ chunk-s67w32sp.js:11996-12243 placement
function pluginDirectoryFailedWalkWindow() {
  let lastFailedWalk = kk().lastFailedWalk;
  if (lastFailedWalk === void 0) return;
  let now = Date.now();
  if (now - lastFailedWalk.at >= BACKOFF_MS || lastFailedWalk.at - now > dt || lastFailedWalk.failedAt > now)
    return;
  return {
    closesAt: lastFailedWalk.at + BACKOFF_MS,
    reason: lastFailedWalk.reason,
    failedAt: lastFailedWalk.failedAt,
    ...(lastFailedWalk.serviceDelayMs !== void 0 && { serviceDelayMs: lastFailedWalk.serviceDelayMs }),
  };
}
//@ chunk-s67w32sp.js:12243-12307 placement
function ut(e) {
  let n = Date.now() - Date.parse(e);
  return n >= 0 && n < Ke;
}
//@ chunk-s67w32sp.js:12307-13254 placement
async function loadPluginDirectoryCatalog({
  signal: signal,
  forceRefresh: forceRefresh = !1,
  trigger: trigger = "other",
  deadlineMs: deadlineMs = at,
  firstAnswerMs: firstAnswerMs = ot,
  installRecords: installRecords,
}) {
  let f = kk(),
    catalogLoadInFlight = f.catalogLoadInFlight;
  if (
    signal === void 0 &&
    catalogLoadInFlight !== void 0 &&
    (catalogLoadInFlight.forceRefresh || !forceRefresh)
  )
    return catalogLoadInFlight.load;
  let s = (async () => {
    let now = Date.now(),
      S = { readFailed: !1 },
      y = await readPluginDirectoryCache(S),
      {
        catalog: catalog,
        pages: pages,
        judged: judged,
        ...h
      } = await refreshPluginDirectory(
        y,
        forceRefresh,
        signal,
        { deadlineMs: deadlineMs, firstAnswerMs: firstAnswerMs },
        S.readFailed,
        installRecords,
      );
    f.staleCatalogFetchedAt = catalog.ok && catalog.staleReason !== void 0 ? catalog.fetchedAt : void 0;
    let b = y ? Math.round((now - Date.parse(y.fetchedAt)) / 60000) : void 0;
    if (
      (logDirectoryCatalogLoad({
        ...h,
        trigger: trigger,
        pages: pages,
        listingCount: catalog.ok ? catalog.listings.length : 0,
        tally: tallyDirectoryEntries(
          judged?.listings ?? [],
          judged?.unparseableRows ?? 0,
          judged?.entryNames ?? new Map(),
        ),
        durationMs: Date.now() - now,
        cacheAgeMin: y && Date.parse(y.fetchedAt) !== 0 ? b : void 0,
      }),
      !catalog.ok && catalog.blockedBy !== void 0)
    )
      logDirectoryBlockedOnce(catalog.blockedBy);
    return catalog;
  })();
  if (signal !== void 0) return s;
  f.catalogLoadInFlight = { forceRefresh: forceRefresh, load: s };
  try {
    return await s;
  } finally {
    if (f.catalogLoadInFlight?.load === s) f.catalogLoadInFlight = void 0;
  }
}
//@ chunk-s67w32sp.js:13254-16547 placement
async function refreshPluginDirectory(
  e,
  n,
  a,
  { deadlineMs: deadlineMs, firstAnswerMs: firstAnswerMs },
  c,
  f,
) {
  let r = kk(),
    s = e?.namesOnly ? null : e;
  if (s?.repeatedIds)
    logForDebugging(
      "Plugin directory: the cached list names a listing more than once (Claude Code 2.1.287 wrote such files), so it is treated as out of date",
    );
  if (s && !n && isPluginDirectoryAccessAllowed() && !s.fromLegacyFile && !s.repeatedIds && ut(s.fetchedAt))
    return {
      outcome: "fresh_cache",
      pages: 0,
      judged: s,
      catalog: { ok: !0, listings: s.listings, fetchedAt: s.fetchedAt, entryNames: s.entryNames },
    };
  if (!isPluginDirectoryAccessAllowed()) await awaitPluginDirectoryPolicyVerdict();
  let lastFailedWalk = r.lastFailedWalk;
  if (
    !n &&
    lastFailedWalk !== void 0 &&
    Date.now() - lastFailedWalk.at < BACKOFF_MS &&
    isPluginDirectoryAccessAllowed()
  )
    return s
      ? {
          outcome: "backoff",
          pages: 0,
          judged: s,
          catalog: {
            ok: !0,
            listings: s.listings,
            fetchedAt: s.fetchedAt,
            entryNames: s.entryNames,
            staleReason: lastFailedWalk.reason,
            laterMayHelp: !0,
          },
        }
      : {
          outcome: "backoff_cold",
          pages: 0,
          catalog: { ok: !1, reason: "failed", message: lastFailedWalk.reason, laterMayHelp: !0 },
        };
  let S = { wall: Date.now(), mono: performance.now() },
    {
      pages: pages,
      unparseableRows: unparseableRows,
      result: g,
      backoffMs: backoffMs,
      serviceDelayMs: serviceDelayMs,
    } = await walkWithTimeouts(a, deadlineMs, firstAnswerMs);
  if (!g.ok) {
    if (backoffMs !== void 0) {
      let now = Date.now();
      r.lastFailedWalk = {
        at: now + backoffMs - BACKOFF_MS,
        reason: g.message,
        failedAt: now,
        ...(serviceDelayMs !== void 0 && { serviceDelayMs: serviceDelayMs }),
      };
    }
    if (s && g.reason === "failed")
      return {
        ...(g === DUPLICATE_LISTING_FAILURE
          ? { outcome: "stale_duplicate_id" }
          : { outcome: "stale_failed", incompleteWalk: g === INCOMPLETE_LIST_FAILURE }),
        pages: pages,
        judged: s,
        catalog: {
          ok: !0,
          listings: s.listings,
          fetchedAt: s.fetchedAt,
          entryNames: s.entryNames,
          staleReason: g.message,
          ...(backoffMs !== void 0 && { laterMayHelp: !0 }),
        },
      };
    let L = backoffMs !== void 0 ? { ...g, laterMayHelp: !0 } : g;
    if (g === DUPLICATE_LISTING_FAILURE) return { outcome: "duplicate_id", pages: pages, catalog: L };
    return g === INCOMPLETE_LIST_FAILURE
      ? { outcome: "incomplete", pages: pages, catalog: L }
      : {
          outcome: "refused",
          refusal: g.reason,
          blockedByOrganization: g.blockedBy !== void 0,
          pages: pages,
          catalog: L,
        };
  }
  let iso = new Date().toISOString(),
    E = e?.entryNames ?? new Map(),
    { names: names, repairs: repairs } = await repairCollisionRenames(E, g.listings, f),
    P = new Map(),
    B = new Set();
  for (let L of directoryListingsToEntries(g.listings, names))
    (B.add(L.name), P.set(L.listing.id, { name: L.name, repositoryKey: L.repositoryKey, lastSeen: iso }));
  let ae = await ie(f, !1);
  for (let [L, I] of names) {
    if (P.has(L) || B.has(I.name)) continue;
    let U = Date.now() - Date.parse(I.lastSeen ?? "");
    if (ae !== void 0 && U > Ve && !Object.hasOwn(ae, `${I.name}@${OFFICIAL_MARKETPLACE_NAME}`)) continue;
    P.set(L, {
      ...I,
      lastSeen: Number.isFinite(U) && U >= 0 ? new Date(Date.parse(I.lastSeen ?? "")).toISOString() : iso,
    });
  }
  let ce = { listings: g.listings, unparseableRows: unparseableRows, entryNames: P },
    de = s ? Date.now() - Date.parse(s.fetchedAt) : NaN;
  if (s && de >= 0 && de < ze && !g.listings.some(ee) && s.listings.some(ee)) {
    let L =
      g.listings.length === 0
        ? "it returned an empty list"
        : "it returned no plugins this version of Claude Code can install";
    logForDebugging(`Plugin directory: ${L}; keeping the cached catalogue`, { level: "warn" });
    let now = Date.now();
    return (
      (r.lastFailedWalk = { at: now, reason: L, failedAt: now }),
      {
        outcome: "stale_empty",
        pages: pages,
        judged: ce,
        catalog: {
          ok: !0,
          listings: s.listings,
          fetchedAt: s.fetchedAt,
          entryNames: s.entryNames,
          staleReason: L,
          ...(g.listings.length === 0 && { laterMayHelp: !0 }),
        },
      }
    );
  }
  r.lastFailedWalk = void 0;
  let j = c ? void 0 : await namesThatFit(P, new Set(g.listings.map((listing) => listing.id)), f),
    Fe = j === void 0 ? [] : await keepMissedListings(s, g.listings, B, iso, f),
    H = j === void 0 ? void 0 : await revertLegacyRenames(j, repairs, E, names, g.listings, f),
    Oe = H?.repaired ?? 0,
    { wrote: wrote, names: names_2 } =
      H === void 0
        ? { wrote: "not-written", names: P }
        : await writePluginDirectoryCache(iso, g.listings, H.names, f, Fe);
  return {
    outcome:
      wrote === "names-only"
        ? "walked_names_only"
        : wrote === "not-written"
          ? "walked_not_written"
          : "walked",
    pages: pages,
    ...(wrote !== "not-written" && { namesRepaired: Oe }),
    judged: { ...ce, entryNames: names_2 },
    catalog: {
      ok: !0,
      listings: g.listings,
      fetchedAt: iso,
      entryNames: names_2,
      walked: !0,
      walkStarted: S,
    },
  };
}
//@ chunk-s67w32sp.js:16547-16562 placement
var he = 7200000;
/**
 * 对比上次缓存与本次遍历：漏列且仍被已安装插件使用、未被新名字占用的条目保留（记录首次漏列时间）， 超过保留期（he）后丢弃。
 */
//@ chunk-s67w32sp.js:16562-17573 placement
async function keepMissedListings(e, n, a, i, w) {
  if (e === null) return [];
  let c = new Set(n.map((g) => g.id)),
    f = new Set(e.listings.map((listing) => listing.id)),
    filtered = e.missed.filter(({ listing: listing }) => !f.has(listing.id)),
    s = [
      ...e.listings.filter((listing) => !c.has(listing.id)).map((g) => ({ listing: g })),
      ...filtered.filter(({ listing: listing }) => !c.has(listing.id)),
    ];
  if (s.length === 0) return [];
  let m = s.every(({ listing: listing }) => e.entryNames.has(listing.id))
      ? void 0
      : new Map(
          directoryListingsToEntries(
            [...e.listings, ...filtered.map(({ listing: listing }) => listing)],
            e.entryNames,
          ).map((g) => [g.listing.id, g.name]),
        ),
    S = await listInstalledOfficialNames(w),
    parse = Date.parse(i),
    k = [];
  for (let { listing: listing, missedAt: missedAt } of s) {
    let h = m?.get(listing.id) ?? e.entryNames.get(listing.id)?.name;
    if (h === void 0 || a.has(h) || (S !== void 0 && !S.has(h)) || !ee(listing)) continue;
    let parse_2 = Date.parse(missedAt ?? ""),
      E = Number.isFinite(parse_2) && parse_2 <= parse ? parse_2 : parse;
    if (parse - E < he) k.push({ listing: listing, missedAt: new Date(E).toISOString() });
  }
  return (
    logForDebugging(
      `Plugin directory: this walk did not list ${s.length} listing(s) the saved catalog had; keeping ${k.length} that installed plugins use, so they still load until a walk at least ${he / 3600000} hours after the first miss also misses them`,
    ),
    k
  );
}
//@ chunk-s67w32sp.js:17573-17611 placement
function ee(e) {
  return "source" in directoryListingSource(e);
}
//@ chunk-s67w32sp.js:17611-17872 placement
function tallyDirectoryEntries(e, n, a) {
  let i = {
    installable: 0,
    unparseable: n,
    skipped: { other_surface: 0, no_pin: 0, bad_url: 0, bad_path: 0 },
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
  let { surfaces: surfaces } = e,
    { url: url, path: path, reviewed_commit: reviewed_commit } = e.source.repository;
  if (surfaces?.length && !surfaces.includes(CLAUDE_CODE)) return { skipped: "other_surface" };
  if (!reviewed_commit || !Be.test(reviewed_commit)) return { skipped: "no_pin" };
  if (!He.test(url) || !ckt(url)) return { skipped: "bad_url" };
  if (
    /^https:\/\/[^/]*\.(?::\d*)?(?:\/|$)/.test(url) ||
    Y(url.replace(/^https:\/\/[^/]+\//, ""))
      .split("/")
      .some((r) => r === "" || r === "." || r === ".." || r.toLowerCase() === ".git")
  )
    return { skipped: "bad_url" };
  let c = Y(url);
  if (/\.git$/i.test(c) && !c.endsWith(".git")) return { skipped: "bad_url" };
  if (normalizePluginRepoUrl(url, void 0) === void 0) return { skipped: "bad_url" };
  let f = path === void 0 ? void 0 : Y(path);
  if (path && !f?.split("/").every(isSafeNfcName)) return { skipped: "bad_path" };
  return {
    source: f
      ? { source: "git-subdir", url: c, path: f, sha: reviewed_commit }
      : { source: "url", url: `${c.replace(/\.git$/, "")}.git`, sha: reviewed_commit },
  };
}
//@ chunk-s67w32sp.js:18635-18817 placement
function slugifyName(e) {
  let replaced = e.toLowerCase().replace(/[^a-z0-9._-]+/g, "-"),
    a = (c) => c === "-" || c === "." || c === "_",
    i = 0,
    w = replaced.length;
  while (i < w && a(replaced[i])) i++;
  while (w > i && a(replaced[w - 1])) w--;
  return replaced.slice(i, w);
}
//@ chunk-s67w32sp.js:18817-18859 placement
function Re(e) {
  return slugifyName(e).slice(-8) || "x";
}
/**
 * 为插件目录条目分配稳定的本地名（沿用旧名、按仓库迁移、冲突加后缀）。
 */
//@ chunk-s67w32sp.js:18859-20838 placement
function assignDirectoryEntryNames(e, n) {
  let mapped = e.map((h) => {
      let { url: url, path: path } = h.source.repository,
        filtered = url
          .replace(/\.git$/, "")
          .split("/")
          .filter(Boolean),
        R =
          [
            slugifyName(h.name),
            slugifyName(path?.split("/").filter(Boolean).at(-1) ?? ""),
            slugifyName(filtered.at(-1) ?? ""),
          ]
            .map((P) => P.slice(0, tt).replace(/[-._]+$/, ""))
            .find((P) => P !== "" && isValidPluginIdSegment(P)) ?? "plugin";
      return {
        id: h.id,
        base: R,
        repositoryKey: normalizePluginRepoUrl(url, path),
        owner: slugifyName(filtered.at(-2) ?? "")
          .slice(0, nt)
          .replace(/[-._]+$/, ""),
        idTail: Re(h.id),
        sortKey: `${h.id}
${url}
${path ?? ""}`,
      };
    }),
    i = new Map();
  for (let { id: id } of mapped) i.set(id, (i.get(id) ?? 0) + 1);
  let w = new Map();
  for (let [h, { name: b }] of [...n].sort(([E], [N]) => (E < N ? -1 : 1)))
    if (se(b) && !w.has(b)) w.set(b, h);
  let c = new Map();
  for (let [h, b] of [...w].sort(([, E], [, N]) =>
    i.has(E) !== i.has(N) ? (i.has(E) ? -1 : 1) : E < N ? -1 : 1,
  ))
    if (!c.has(sanitizePluginIdLower(h))) c.set(sanitizePluginIdLower(h), { name: h, id: b });
  let f = new Map(),
    r = new Map();
  for (let h of mapped)
    if (h.repositoryKey !== void 0 && i.get(h.id) === 1 && !n.has(h.id)) {
      let b = r.get(h.repositoryKey) ?? [];
      (b.push(h.id), r.set(h.repositoryKey, b));
    }
  for (let h of r.values()) h.sort();
  for (let [h, { name: b, id: E }] of c) {
    let N = n.get(E)?.repositoryKey;
    if (N === void 0 || i.has(E)) continue;
    let R = r.get(parseRepoWithRef(N))?.shift();
    if (R !== void 0) (c.set(h, { name: b, id: R }), f.set(R, b));
  }
  let mapped_2 = mapped.map(({ id: id }) => {
      let b = f.get(id) ?? n.get(id)?.name,
        E = b === void 0 ? void 0 : c.get(sanitizePluginIdLower(b));
      return b !== void 0 && E?.id === id && E.name === b && i.get(id) === 1 ? b : void 0;
    }),
    mapped_3 = mapped.map((h, b) => mapped_2[b] ?? h.base),
    S = () => {
      let h = new Map();
      for (let b of mapped_3) {
        let E = sanitizePluginIdLower(b);
        h.set(E, (h.get(E) ?? 0) + 1);
      }
      return mapped.flatMap((b, E) => {
        let N = sanitizePluginIdLower(mapped_3[E] ?? b.base),
          R = c.get(N);
        return mapped_2[E] === void 0 && ((h.get(N) ?? 0) > 1 || (R !== void 0 && R.id !== b.id)) ? E : [];
      });
    },
    mapped_4 = mapped.map(() => 0);
  for (let h = 0; h < 3; h++)
    for (let b of S()) {
      let E = mapped[b],
        max = Math.max(h, mapped_4[b] ?? 0),
        R = max === 0 && E?.owner === "" ? 1 : max,
        P = R === 0 ? E?.owner : R === 1 ? E?.idTail : R === 2 && E ? gn(E.id) : void 0;
      if (P !== void 0) ((mapped_3[b] = `${mapped_3[b]}-${P}`), (mapped_4[b] = R + 1));
    }
  let k = new Set([...c.keys(), ...mapped_3.map(sanitizePluginIdLower)]),
    g = (h) => mapped[h]?.sortKey ?? "",
    sorted = S().sort((h, b) => (g(h) === g(b) ? 0 : g(h) < g(b) ? -1 : 1));
  for (let h of sorted) {
    let b = 2;
    while (k.has(sanitizePluginIdLower(`${mapped_3[h]}-${b}`))) b++;
    let E = `${mapped_3[h]}-${b}`;
    ((mapped_3[h] = E), k.add(sanitizePluginIdLower(E)));
  }
  return mapped_3.map((h, b) => ({ name: h, clashed: h !== mapped[b]?.base }));
}
//@ chunk-s67w32sp.js:20838-20977 placement
function isCollisionSuffixedName(e, n) {
  let match = /-([1-9][0-9]*)$/.exec(e);
  return (
    match !== null && Number(match[1]) >= 3 && e.slice(0, match.index).endsWith(`-${Re(n.id)}-${gn(n.id)}`)
  );
}
/**
 * 读安装记录与绑定，给出名字是否被占用、仓库唯一绑定名。
 */
//@ chunk-s67w32sp.js:20977-21697 placement
async function loadNameBindingEvidence(e) {
  let n = await ie(e, !0, !0),
    a = await lpe();
  if (n === void 0 || xSe(a)) return;
  let i = `@${OFFICIAL_MARKETPLACE_NAME}`,
    filtered = Object.keys(n).filter(VS),
    c = [...a.keys()],
    f = (m) =>
      findBindingKeysFor(filtered, m).flatMap((S) => {
        let y = n[S];
        return Array.isArray(y) ? y : [];
      }),
    r = (m) =>
      typeof m === "object" &&
      m !== null &&
      "directoryRepositoryKey" in m &&
      typeof m.directoryRepositoryKey === "string" &&
      m.directoryRepositoryKey !== ""
        ? parseRepoWithRef(m.directoryRepositoryKey)
        : void 0,
    s = new Map();
  for (let m of filtered) {
    let mapped = f(m).map(r),
      y = mapped[0];
    if (
      y !== void 0 &&
      mapped.every((k) => k === y) &&
      findBindingKeysFor(c, m).every((k) => parseRepoWithRef(a.get(k) ?? "") === y)
    )
      s.set(y, [...(s.get(y) ?? []), m]);
  }
  return {
    holds: (m) => f(`${m}${i}`).length > 0 || findBindingKeysFor(c, `${m}${i}`).length > 0,
    onlyNameBoundTo: (m) => {
      let S = s.get(m) ?? [];
      return S.length === 1 ? S[0]?.slice(0, -i.length) : void 0;
    },
  };
}
/**
 * 修复被加冲突后缀的条目名，改回安装插件使用的名字。
 */
//@ chunk-s67w32sp.js:21697-22634 placement
async function repairCollisionRenames(e, n, a) {
  let filtered = n.filter((y) => {
    let k = e.get(y.id)?.name;
    return k !== void 0 && isCollisionSuffixedName(k, y);
  });
  if (filtered.length === 0) return { names: e, repairs: [] };
  let w = await loadNameBindingEvidence(a);
  if (w === void 0) return { names: e, repairs: [] };
  let c = (y) => {
      let k = directoryListingSource(y);
      return "source" in k ? samePluginSource(k.source, void 0) : void 0;
    },
    f = new Map();
  for (let y of n) {
    let { url: url, path: path } = y.source.repository;
    for (let D of new Set([c(y), normalizePluginRepoUrl(url, path)].flatMap((h) => h ?? [])))
      f.set(D, (f.get(D) ?? 0) + 1);
  }
  let r = new Map(),
    s = (y, k, g) => {
      let D = sanitizePluginIdLower(y),
        h = r.get(D) ?? new Set();
      if (g) h.add(k);
      else h.delete(k);
      r.set(D, h);
    };
  for (let [y, k] of e) s(k.name, y, !0);
  let m = new Map(e),
    S = [];
  for (let y of filtered) {
    let k = m.get(y.id),
      g = c(y);
    if (k === void 0 || g === void 0) continue;
    if ((f.get(g) ?? 0) !== 1) continue;
    if (w.holds(k.name)) continue;
    let onlyNameBoundTo = w.onlyNameBoundTo(g);
    if (
      onlyNameBoundTo === void 0 ||
      onlyNameBoundTo === k.name ||
      !se(onlyNameBoundTo) ||
      [...(r.get(sanitizePluginIdLower(onlyNameBoundTo)) ?? [])].some((h) => h !== y.id)
    )
      continue;
    (m.set(y.id, { ...k, name: onlyNameBoundTo }),
      s(k.name, y.id, !1),
      s(onlyNameBoundTo, y.id, !0),
      S.push({ id: y.id, key: g, name: onlyNameBoundTo }));
  }
  return { names: m, repairs: S };
}
/**
 * 撤销 2.1.287 改过的名字（安装记录能证明时）。
 */
//@ chunk-s67w32sp.js:22634-23602 placement
async function revertLegacyRenames(e, n, a, i, w, c) {
  if (n.length === 0) return { names: e, repaired: 0 };
  let f = await loadNameBindingEvidence(c),
    r = [],
    s = 0;
  for (let { id: id, key: key, name: g } of n) {
    let D = a.get(id)?.name;
    if (D !== void 0 && (f === void 0 || f.holds(D) || f.onlyNameBoundTo(key) !== g)) r.push(id);
    else if (e.has(id)) s++;
  }
  if (s + r.length > 0)
    logForDebugging(
      `Plugin directory: of ${s + r.length} listing(s) Claude Code 2.1.287 had renamed, gave ${s} back the name their installed plugin uses` +
        (r.length === 0
          ? ""
          : f === void 0
            ? `; kept the 2.1.287 name for ${r.length} because the install records or bindings file could not be read again`
            : `; kept the 2.1.287 name for ${r.length} because a plugin is now installed under it, or the install records and bindings no longer prove the name it was given back`),
    );
  if (r.length === 0) return { names: e, repaired: s };
  let m = new Map(i);
  for (let y of r) {
    let k = a.get(y);
    if (k !== void 0) m.set(y, k);
  }
  let S = new Map(e);
  for (let y of directoryListingsToEntries(w, m)) {
    let k = S.get(y.listing.id);
    if (k !== void 0) S.set(y.listing.id, { ...k, name: y.name });
  }
  return { names: S, repaired: s };
}
//@ chunk-s67w32sp.js:23602-24221 placement
function directoryListingsToEntries(e, n) {
  let a = assignDirectoryEntryNames(e, n),
    i = [];
  for (let [w, c] of e.entries()) {
    let f = a[w]?.name ?? c.id,
      r = directoryListingSource(c),
      { url: url, path: path } = c.source.repository,
      trimmed = stripInvisibleKeepNewlines(c.summary || c.description || "").trim(),
      trimmed_2 = stripInvisibleKeepEmoji(c.name).trim(),
      trimmed_3 = stripInvisibleKeepEmoji(c.release?.version ?? "").trim(),
      trimmed_4 = stripInvisibleKeepEmoji(c.publisher?.name ?? "").trim(),
      trimmed_5 = stripInvisibleKeepEmoji(c.links?.documentation ?? "").trim(),
      h = trimmed_5.startsWith("https://") ? trimmed_5 : "";
    i.push({
      name: f,
      nameClashed: a[w]?.clashed ?? !1,
      listing: c,
      repositoryKey: normalizePluginRepoUrl(url, path),
      result:
        "skipped" in r
          ? r
          : {
              entry: {
                name: f,
                source: r.source,
                ...(trimmed_2 !== "" && trimmed_2 !== f && { displayName: trimmed_2 }),
                ...(trimmed && { description: trimmed }),
                ...(trimmed_3 && { version: trimmed_3 }),
                ...(trimmed_4 && { author: { name: trimmed_4 } }),
                ...(h && { homepage: h }),
                repository: url,
                strict: !0,
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
    owner: { name: "Anthropic" },
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
  return n === void 0 ? void 0 : pluginDirectoryNotInstallableSentence(e, n);
}
//@ chunk-s67w32sp.js:24712-24830 placement
function pluginDirectoryNotInstallableSentence(e, n) {
  return `"${e}" is listed in the ${OFFICIAL_MARKETPLACE_DISPLAY} but cannot be installed by this version of Claude Code (${n}).`;
}
//@ chunk-s67w32sp.js:24830-24993 placement
async function pluginDirectoryNotInstallableReason(e) {
  let n = await readPluginDirectoryCache(),
    found = directoryListingsToEntries(n?.listings ?? [], n?.entryNames ?? new Map()).find(
      (i) => i.name === e,
    );
  return found && "skipped" in found.result ? ENTRY_SKIP_REASONS[found.result.skipped] : void 0;
}
//@ chunk-s67w32sp.js:24993-25074 placement
var PLUGIN_DIRECTORY_MARKETPLACE_JSON = "plugin-directory-marketplace.json",
  Dt = DoctorLazy(() => u({ enabled: M().optional() }));
//@ chunk-s67w32sp.js:25074-25106 placement
function At() {
  return join(getPluginsDirectory(), PLUGIN_DIRECTORY_MARKETPLACE_JSON);
}
//@ chunk-s67w32sp.js:25106-25118 placement
var Mt = 4096;
//@ chunk-s67w32sp.js:25118-25490 placement
async function readPluginDirectoryMarketplaceChoice() {
  let e = await readPluginsDirJsonFile(PLUGIN_DIRECTORY_MARKETPLACE_JSON, Mt, "on/off file"),
    n = kk(),
    a = e.state === "unusable" && e.readFailed;
  if (a && n.marketplaceChoice !== void 0) return n.marketplaceChoice;
  let i = e.state === "read" ? Dt().safeParse(e.json) : void 0,
    w = i?.success ? i.data.enabled : void 0,
    c = w === void 0 ? { enabled: Q4o(), source: "flag_default" } : { enabled: w, source: "user_choice" };
  if (!a) n.marketplaceChoice = c;
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
  (await getFsImplementation().mkdir(getPluginsDirectory()),
    await writeFileAtomic(At(), jsonStringify({ enabled: e }), 384),
    (kk().marketplaceChoice = { enabled: e, source: "user_choice" }));
}
//@ chunk-s67w32sp.js:25835-25870 placement
var PLUGIN_DIRECTORY_BUILT_IN = "plugin-directory:built-in";
//@ chunk-s67w32sp.js:25870-26105 placement
async function pluginDirectoryRegistryEntry() {
  let iso = new Date(0).toISOString();
  if (!isDiskless())
    try {
      let n = await lstat(De());
      if (n.isFile()) iso = n.mtime.toISOString();
    } catch {}
  return {
    source: { source: "pluginDirectory" },
    installLocation: isDiskless()
      ? PLUGIN_DIRECTORY_BUILT_IN
      : join(getPluginsDirectory(), "marketplaces", OFFICIAL_MARKETPLACE_NAME),
    lastUpdated: iso,
  };
}
//@ chunk-s67w32sp.js:26105-26210 placement
var SWITCH_PURPOSE_LABELS = { install: "an install", update: "an update", switch: "a marketplace switch" },
  CATALOG_TTL_MS = 1800000,
  weakMap = new WeakMap();
//@ chunk-s67w32sp.js:26210-26345 placement
function isPluginDirectoryEntryFromAFreshWalk(e) {
  let n = weakMap.get(e);
  if (n === void 0) return !1;
  let a = Date.now() - n.wall,
    i = performance.now() - n.mono;
  return a >= 0 && a < CATALOG_TTL_MS && i >= 0 && i < CATALOG_TTL_MS;
}
//@ chunk-s67w32sp.js:26345-27908 placement
async function loadPluginDirectoryMarketplace(
  e,
  {
    forInstalledPlugin: forInstalledPlugin = !1,
    onlyMissedListings: onlyMissedListings = !1,
    purpose: purpose = "load",
    trigger: trigger = "other",
    signal: signal,
    installRecords: installRecords,
  },
) {
  let r = purpose === "load" ? void 0 : purpose;
  if (r !== void 0 && (e !== "refresh" || forInstalledPlugin))
    return {
      marketplace: null,
      message: `no fresh list was asked for, which ${SWITCH_PURPOSE_LABELS[r]} needs (an internal error)`,
      notFreshEnoughFor: r,
    };
  if (e === "cache-only") {
    if (!forInstalledPlugin && !isPluginDirectoryAccessAllowed())
      return { marketplace: null, message: "it isn't available in this session" };
    let m = await readPluginDirectoryCache();
    if (!m || m.namesOnly) return { marketplace: null, message: "it has not been loaded yet" };
    if (!onlyMissedListings) return { marketplace: buildDirectoryMarketplace(m.listings, m.entryNames) };
    let S = new Set(m.listings.map((listing) => listing.id)),
      mapped = m.missed
        .filter(({ listing: listing }) => !S.has(listing.id))
        .map(({ listing: listing }) => listing);
    return {
      marketplace: synthesizePluginDirectoryMarketplace(
        mapped,
        m.entryNames,
        mapped.length === 0
          ? []
          : directoryListingsToEntries([...m.listings, ...mapped], m.entryNames).slice(m.listings.length),
      ),
    };
  }
  let s = await loadPluginDirectoryCatalog({
    forceRefresh: e === "refresh",
    trigger: trigger,
    signal: signal,
    installRecords: installRecords,
  });
  if (!s.ok)
    return {
      marketplace: null,
      message: s.message,
      ...(r !== void 0 && { notFreshEnoughFor: r }),
      ...(s.laterMayHelp && { laterMayHelp: !0 }),
    };
  if (r !== void 0) {
    if (s.staleReason !== void 0 || s.walked !== !0)
      return {
        marketplace: null,
        message: s.staleReason ?? "only the list saved on this machine answered, not the Directory itself",
        notFreshEnoughFor: r,
        ...(s.laterMayHelp && { laterMayHelp: !0 }),
      };
    let m = new Set(),
      S = new Map(),
      y = buildDirectoryMarketplace(s.listings, s.entryNames, m, S);
    if (s.walkStarted !== void 0) for (let plugin of y.plugins) weakMap.set(plugin, s.walkStarted);
    return {
      marketplace: y,
      reviewerMarkedNames: m,
      notInstallable: new Map([...S].map(([k, g]) => [k, ENTRY_SKIP_REASONS[g]])),
    };
  }
  return {
    marketplace: buildDirectoryMarketplace(s.listings, s.entryNames),
    ...(s.staleReason && { staleReason: s.staleReason }),
  };
}
/**
 * 由条目合成插件目录市场并更新会话里的条目名与审核标记。
 */
//@ chunk-s67w32sp.js:27908-28260 placement
function buildDirectoryMarketplace(e, n, a, i) {
  let w = directoryListingsToEntries(e, n);
  for (let s of w) if ("skipped" in s.result) i?.set(s.name, s.result.skipped);
  let c = synthesizePluginDirectoryMarketplace(e, n, w),
    f = kk();
  f.catalogEntryNames = new Set(c.plugins.map((plugin) => plugin.name));
  let flattened = w.flatMap((s) =>
    "entry" in s.result && isDirectoryListingReviewerMarked(s.listing) ? s.name : [],
  );
  f.reviewerMarkedEntryNames = new Set(flattened);
  for (let s of flattened) a?.add(s);
  return ((f.isAccessAllowed = () => isPluginDirectoryAccessAllowed()), c);
}
