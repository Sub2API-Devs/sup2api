/**
 * utils/plugins/marketplaceSources.ts
 *
 * 2.1.316 新增：市场来源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (34)
 * attribution: placement 34
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
} from "path";
import { canonicalFetchSourceUrl } from "./marketplacePolicy.js";
import {
  lEt,
  FIe,
  ozt,
  validateReservedMarketplaceEntry,
  getStorageArm,
  normalizeInstallLocation,
  getDeclaredMarketplaces,
} from "./marketplaceManager.js";
import {
  getInitialSettings_2,
  getSettingsForSource,
  getSettingsForSourceWriteSeed,
} from "../settings/settings.js";
import { getEnabledSettingSources, REPO_DIR_SETTING_SOURCES } from "../settings/constants.js";
import { sorted } from "./marketplaceAutoUpdate.js";
import { getAddDirExtraMarketplaces } from "./addDirPluginSettings.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import {
  aZo,
  Edr,
  vdr,
  classifyMarketplacePath,
  isWindowsAbsolutePath,
  getLocalSourcePath,
} from "./localMarketplacePaths.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { isLocalMarketplaceSource } from "./reconciler.js";
import { krt } from "./pluginDirectoryTelemetry.js";
import { jsonStringify } from "../slowOperations.js";
import { isFreshTimestamp } from "./pluginCachePaths.js";
import {
  isOfficialMarketplaceSpelling,
  OFFICIAL_MARKETPLACE_NAME,
  reservedMarketplaceEntryMessage,
} from "./officialMarketplaceNames.js";
import { logForDebugging } from "../debug.js";
import { MARKETPLACE_SOURCE_FIX_HINTS as MARKETPLACE_SOURCE_FIX_HINTS_2 } from "./marketplaceNames.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { QE } from "./pluginGates.js";
import { PLUGIN_DIRECTORY_MARKETPLACE_NAMES } from "./schemas.js";
import { hasClaudeAiReservedPrefix } from "./pluginDirectories.js";
import { formatSourceForDisplay } from "./marketplaceHelpers.js";
import { removeExtraMarketplace } from "../../commands/plugin/PluginSettings.js";

/**
 * 对 url 源市场，在各设置层（以及受信时的初始设置）的 extraKnownMarketplaces 中找同一规范 URL 的声明， 返回其 headers、headersHelper 与作者（operator/repo）。
 */
//@ chunk-e6aww6q8.js:4233217-4233776 placement
function findUrlMarketplaceHeaders(e, n) {
  if (e?.source !== "url") return;
  let r = canonicalFetchSourceUrl(e.url),
    s = (S, w) =>
      S !== void 0 && S.source.source === "url" && canonicalFetchSourceUrl(S.source.url) === r
        ? {
            headers: S.source.headers,
            headersHelper:
              typeof S.source.headersHelper === "string" && S.source.headersHelper !== ""
                ? S.source.headersHelper
                : void 0,
            operatorAuthored: w !== "repo",
            authoredBy: w,
          }
        : void 0,
    h = (S, w) => {
      let L = n !== void 0 ? s(Zb(S, n), w) : void 0;
      if (L !== void 0) return L;
      for (let G of Object.values(S)) {
        let q = s(G, w);
        if (q !== void 0) return q;
      }
      return;
    },
    y = nhs(h);
  if (y !== void 0) return y;
  return lEt() ? h(getInitialSettings_2().extraKnownMarketplaces ?? {}, "repo") : void 0;
}
//@ chunk-e6aww6q8.js:4233776-4233859 placement
function E9s(e, n) {
  let r = findUrlMarketplaceHeaders(e, n);
  return r !== void 0 && r.authoredBy !== "repo" ? r : void 0;
}
//@ chunk-e6aww6q8.js:4233859-4233952 placement
function nhs(e) {
  for (let { tier: tier, record: record } of getExtraMarketplacesByTier()) {
    let s = e(record, tier);
    if (s !== void 0) return s;
  }
  return;
}
//@ chunk-e6aww6q8.js:4233952-4234078 placement
function getExtraMarketplacesByTier() {
  let e = getEnabledSettingSources();
  return sorted
    .filter((n) => e.includes(n))
    .map((n) => ({ tier: n, record: getSettingsForSource(n)?.extraKnownMarketplaces ?? {} }));
}
/**
 * 在设置声明的 settings 源市场中找插件的 archive 条目。
 */
//@ chunk-e6aww6q8.js:4234078-4234367 placement
function findSettingsArchiveEntry(e, n) {
  if (e === void 0) return;
  for (let { tier: tier, record: record } of getExtraMarketplacesByTier()) {
    let S = Zb(record, e);
    if (S !== void 0) return toArchiveEntryAuth(S, n, "settings", tier);
  }
  if (!lEt()) return;
  let r = Zb(getInitialSettings_2().extraKnownMarketplaces ?? {}, e);
  if (r !== void 0) return toArchiveEntryAuth(r, n, "repo");
  let s = Zb(getAddDirExtraMarketplaces(), e);
  return s === void 0 ? void 0 : toArchiveEntryAuth(s, n, "addDir");
}
//@ chunk-e6aww6q8.js:4234367-4234422 placement
function Zb(e, n) {
  return Object.hasOwn(e, n) ? e[n] : void 0;
}
/**
 * settings 源市场中插件的 archive URL、headers 与 helper（--add-dir 不带 helper）。
 */
//@ chunk-e6aww6q8.js:4234422-4234796 placement
function toArchiveEntryAuth(e, n, r, s) {
  if (e.source.source !== "settings") return;
  let found = e.source.plugins.find((plugin) => plugin.name === n);
  if (!found || typeof found.source !== "object" || found.source.source !== "archive") return;
  return {
    origin: r,
    ...(s !== void 0 && { operatorTier: s }),
    archiveUrl: found.source.url,
    headers: found.headers,
    headersHelper:
      r !== "addDir" && typeof found.headersHelper === "string" && found.headersHelper !== ""
        ? found.headersHelper
        : void 0,
  };
}
//@ chunk-e6aww6q8.js:4236730-4236803 placement
function Vut(e) {
  let { marketplace: marketplace } = parsePluginIdentifier(e);
  return marketplace === void 0 ? void 0 : FIe(marketplace);
}
//@ chunk-e6aww6q8.js:4236803-4236817 placement
var shs = 60000;
//@ chunk-e6aww6q8.js:4236817-4236874 placement
function uGn() {
  getPluginRegistry().marketplaceAdmissionVerdicts.clear();
}
//@ chunk-e6aww6q8.js:4236874-4237794 placement
function describeUnusableMarketplaceSource(e, n) {
  let r = (y) => {
    if (isAbsolute_8(y)) return aZo(y, e.source, n) !== void 0;
    let replaced = y.replace(Edr, "");
    return (
      resolve_10(replaced) === resolve_10(getOriginalCwd(), replaced) &&
      !vdr(y) &&
      !classifyMarketplacePath(resolve_10(getOriginalCwd(), replaced)).suspect
    );
  };
  if (!r(e.installLocation))
    return {
      cause: `its location is on a network drive, has "." or ".." in its path, or couldn't be checked`,
      kind: "network-location",
    };
  let source = e.source;
  if (source === void 0) return;
  if (isLocalMarketplaceSource(source) && !r(source.path))
    return {
      cause: `the folder or file it was added from is on a network drive, has "." or ".." in its path, or couldn't be checked`,
      kind: "network-location",
    };
  let h = source.source === "git" ? krt(source.url) : null;
  if (h !== null)
    return { cause: `its git URL can't be used: ${h.message.replace(/\.$/, "")}`, kind: "source" };
  if (source.source === "url" && !ahs(source.url))
    return { cause: "its URL can't be read as an https:// or http:// address", kind: "source" };
  if (!isSourceConsistentWith(source, n))
    return {
      cause: "its source doesn't match its extraKnownMarketplaces entry in user or managed settings",
      kind: "declaration",
    };
  return;
}
/**
 * 不可用市场来源的修复建议与对应失败码。
 */
//@ chunk-e6aww6q8.js:4237794-4238236 placement
var MARKETPLACE_SOURCE_FIX_HINTS = {
    "network-location":
      "add it from a folder or file on this computer, or, to trust a folder on a network drive, declare it under extraKnownMarketplaces in user or managed settings (a declaration in project or local settings does not count)",
    source: "use a supported source",
    declaration: "add it from the source that entry lists, or change the entry",
  },
  MARKETPLACE_SOURCE_FAILURE_CODES = {
    "network-location": "network_location",
    source: "invalid_source",
    declaration: void 0,
  };
//@ chunk-e6aww6q8.js:4238236-4238279 placement
function cGn(e, n) {
  return ihs(e, n) === void 0;
}
//@ chunk-e6aww6q8.js:4238279-4238319 placement
function ihs(e, n) {
  return checkMarketplaceAdmission(e, n)?.kind;
}
/**
 * 判断一个已注册市场能否被使用：官方/保留拼写需合法来源；来源不可用（网络位置、无效来源、声明不符）则拒绝。 结果按（名字、位置、来源）缓存一段时间，首次拒绝记 warn。返回 {kind, cause} 或 undefined。
 */
//@ chunk-e6aww6q8.js:4238319-4239108 placement
function checkMarketplaceAdmission(e, n) {
  let r = FIe(e),
    s = jsonStringify([
      e,
      n.installLocation,
      n.source,
      r ?? null,
      isAbsolute_8(n.installLocation) ? null : resolve_10(n.installLocation),
      n.source !== void 0 && isLocalMarketplaceSource(n.source) && !isAbsolute_8(n.source.path)
        ? resolve_10(n.source.path)
        : null,
    ]),
    now = Date.now(),
    marketplaceAdmissionVerdicts = getPluginRegistry().marketplaceAdmissionVerdicts,
    S = marketplaceAdmissionVerdicts.get(s);
  if (S !== void 0 && isFreshTimestamp(S.at, shs, now))
    return S.refusal === void 0 ? void 0 : { kind: S.refusal, cause: S.cause };
  let w =
    isOfficialMarketplaceSpelling(e) || ozt(e) !== void 0 ? validateReservedMarketplaceEntry(e, n) : null;
  if (w !== null) {
    if ((marketplaceAdmissionVerdicts.set(s, { refusal: "source", at: now }), S?.refusal === void 0))
      logForDebugging(w, { level: "warn" });
    return { kind: "source", cause: void 0 };
  }
  let L = describeUnusableMarketplaceSource(n, r);
  if (L === void 0) {
    marketplaceAdmissionVerdicts.set(s, { refusal: void 0, at: now });
    return;
  }
  if (
    (marketplaceAdmissionVerdicts.set(s, { refusal: L.kind, cause: L.cause, at: now }), S?.refusal === void 0)
  )
    logForDebugging(
      `Marketplace ${jsonStringify(e)} is ignored everywhere: ${L.cause} \u2014 ${MARKETPLACE_SOURCE_FIX_HINTS_2[L.kind]}.`,
      { level: "warn" },
    );
  return { kind: L.kind, cause: L.cause };
}
//@ chunk-e6aww6q8.js:4239108-4239156 placement
function Vj() {
  return getPluginRegistry().hiddenRegistryEntries;
}
//@ chunk-e6aww6q8.js:4239156-4239207 placement
function HIe() {
  return getPluginRegistry().releasedRegistryEntries;
}
//@ chunk-e6aww6q8.js:4239207-4239250 placement
function L6(e, n) {
  return Vj()[getStorageArm(n)].get(e);
}
//@ chunk-e6aww6q8.js:4239250-4239314 placement
function O1n(e, n) {
  let r = getStorageArm(n);
  (Vj()[r].delete(e), HIe()[r].add(e));
}
//@ chunk-e6aww6q8.js:4239314-4239410 placement
function ahs(e) {
  try {
    let { protocol: protocol } = new URL(e);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:4239410-4239649 placement
function isSourceConsistentWith(e, n) {
  if (n === void 0 || isLocalMarketplaceSource(e)) return !0;
  switch (e.source) {
    case "url":
    case "git":
    case "npm":
      return En(e, n);
    case "github":
      return (
        n.source === "github" &&
        En({ ...e, repo: e.repo.toLowerCase() }, { ...n, repo: n.repo.toLowerCase() })
      );
    default:
      return !0;
  }
}
//@ chunk-e6aww6q8.js:4239649-4239800 placement
function getAdmittedMarketplaceEntry(e, n) {
  let r = Object.hasOwn(n, e) ? n[e] : void 0;
  if (r === void 0) return;
  return (
    (r.installLocation = normalizeInstallLocation(r.source, r.installLocation)),
    cGn(e, r) ? r : void 0
  );
}
//@ chunk-e6aww6q8.js:4239800-4240096 placement
function filterAdmittedMarketplaces(e, n) {
  let r = e,
    s = new Map(),
    h = new Map(),
    y = new Map();
  for (let [S, w] of Object.entries(e)) {
    let L = checkMarketplaceAdmission(S, w);
    if (L !== void 0) {
      if (r === e) r = { ...e };
      if ((delete r[S], h.set(S, L.kind), L.cause !== void 0)) y.set(S, L.cause);
      if (!HIe()[n].has(S)) s.set(S, w);
    }
  }
  if (((Vj()[n] = s), h.size > 0)) weakMap_11.set(r, { kinds: h, causes: y });
  return r;
}
//@ chunk-e6aww6q8.js:4240096-4240128 placement
var weakMap_11 = new WeakMap(),
  dhs = new Map();
//@ chunk-e6aww6q8.js:4240128-4240173 placement
function uF(e) {
  return weakMap_11.get(e)?.kinds ?? dhs;
}
//@ chunk-e6aww6q8.js:4240173-4240224 placement
function pGn(e, n) {
  return weakMap_11.get(e)?.causes.get(n);
}
//@ chunk-e6aww6q8.js:4240224-4240272 placement
function Xut(e) {
  return uF(e).get(OFFICIAL_MARKETPLACE_NAME) === "source";
}
//@ chunk-e6aww6q8.js:4240272-4240378 placement
function reservedMarketplaceNameMessage(e) {
  if (isOfficialMarketplaceSpelling(e)) return reservedMarketplaceEntryMessage(e, QE());
  let n = ozt(e);
  return n === void 0
    ? void 0
    : reservedMarketplaceEntryMessage(e, !1, n, !PLUGIN_DIRECTORY_MARKETPLACE_NAMES.has(n));
}
/**
 * 因来源被拒的保留名市场及说明。
 */
//@ chunk-e6aww6q8.js:4240378-4240515 placement
function listReservedNameRefusals(e) {
  let n = [];
  for (let [r, s] of uF(e)) {
    if (s !== "source") continue;
    {
      let h = reservedMarketplaceNameMessage(r);
      if (h !== void 0) n.push({ name: r, message: h });
    }
  }
  return n;
}
//@ chunk-e6aww6q8.js:4240515-4240630 placement
function logMarketplaceNoticeOnce(e, n, r = "warn") {
  let marketplaceResolutionNoticesLogged = getPluginRegistry().marketplaceResolutionNoticesLogged;
  if (marketplaceResolutionNoticesLogged.has(e)) return;
  (marketplaceResolutionNoticesLogged.add(e), logForDebugging(n, { level: r }));
}
//@ chunk-e6aww6q8.js:4240630-4241629 placement
function validateDeclaredMarketplaceSource(e, n) {
  let r = uF(n),
    s,
    h = {},
    y = new Map();
  for (let S of e) {
    if (Object.hasOwn(n, S) || r.has(S) || hasClaudeAiReservedPrefix(S)) continue;
    s ??= getDeclaredMarketplaces();
    let w = Zb(s, S);
    if (w === void 0) continue;
    let { source: source } = w;
    if (!isLocalMarketplaceSource(source)) {
      y.set(S, "its declared source is not a directory or file source");
      continue;
    }
    if (!isWindowsAbsolutePath(source.path)) {
      y.set(
        S,
        "its declared path is not fully anchored (relative, or drive-less on Windows); the background reconcile anchors and records it",
      );
      continue;
    }
    let G = getLocalSourcePath(source);
    if (G === void 0) {
      y.set(S, "its declared file source is not a manifest under a .claude-plugin folder");
      continue;
    }
    let q = { source: source, installLocation: G, lastUpdated: new Date().toISOString() };
    if (!cGn(S, q)) {
      y.set(S, "the registry admission rule refuses its declared location (see the line above)");
      continue;
    }
    ((h[S] = q),
      logMarketplaceNoticeOnce(
        `declared-only:${S}:${G}`,
        `Marketplace ${jsonStringify(S)} is declared in settings (${formatSourceForDisplay(source)}) but not recorded in known_marketplaces.json yet: its plugins load in place from the declared path, and the background reconcile records it`,
        "debug",
      ));
  }
  return { additions: h, skipped: y };
}
//@ chunk-e6aww6q8.js:4241629-4241740 placement
function getNonRepoExtraMarketplaces() {
  return getEnabledSettingSources()
    .filter((e) => !REPO_DIR_SETTING_SOURCES.has(e))
    .map((e) => ({ source: e, extras: getSettingsForSource(e)?.extraKnownMarketplaces }));
}
/**
 * autoUpdate 被托管设置/--settings/--add-dir 固定时返回来源说明。
 */
//@ chunk-e6aww6q8.js:4241740-4242123 placement
function findAutoUpdateOverrideSource(e) {
  let n = removeExtraMarketplace(getSettingsForSource("policySettings"), e);
  if (n !== void 0) return n.autoUpdate !== void 0 ? "managed settings (managed-settings.json)" : null;
  let r = removeExtraMarketplace(getSettingsForSource("flagSettings"), e);
  if (r !== void 0) return r.autoUpdate !== void 0 ? "the --settings flag" : null;
  if (e === OFFICIAL_MARKETPLACE_NAME && QE()) return null;
  if (
    Zb(getAddDirExtraMarketplaces(), e)?.autoUpdate !== void 0 &&
    removeExtraMarketplace(getInitialSettings_2(), e) === void 0
  )
    return "an --add-dir directory's settings";
  return null;
}
//@ chunk-e6aww6q8.js:4242123-4242257 placement = supportsPersistence (1)
function supportsPersistence(destination) {
  let n = ["localSettings", "projectSettings", "userSettings"];
  for (let r of n) {
    let s = getSettingsForSourceWriteSeed(r);
    if (removeExtraMarketplace(s, destination)) return r;
  }
  return null;
}

export {
  E9s,
  Zb,
  uGn,
  Vj,
  listReservedNameRefusals,
  findSettingsArchiveEntry,
  findUrlMarketplaceHeaders,
  uF,
  pGn,
  validateDeclaredMarketplaceSource,
  logMarketplaceNoticeOnce,
  Xut,
  Vut,
  getNonRepoExtraMarketplaces,
  filterAdmittedMarketplaces,
  weakMap_11,
  HIe,
  isSourceConsistentWith,
  describeUnusableMarketplaceSource,
  MARKETPLACE_SOURCE_FIX_HINTS,
  MARKETPLACE_SOURCE_FAILURE_CODES,
  L6,
  O1n,
  reservedMarketplaceNameMessage,
  getAdmittedMarketplaceEntry,
  findAutoUpdateOverrideSource,
  supportsPersistence,
};
