/**
 * utils/plugins/marketplaceNames.ts
 *
 * 2.1.316 新增：市场命名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (34), chunk-f3qhjfah.js (33), chunk-k2t0a8ve.js (2)
 * attribution: placement 69
 */
import {
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
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  readdir,
} from "fs/promises";
import { getOriginalCwd } from "../../bootstrap/state.js";
import {
  PJr,
  getPluginsDirectory,
  getMarketplaceStorageKey,
  pluginIdToDirName,
  pluginDataDirPath,
} from "./pluginDirectories.js";
import {
  seedDirFor,
  loadKnownMarketplacesWithDeclared,
  getCachePathForSource,
  validateReservedMarketplaceEntry,
  getStorageArm,
} from "./marketplaceManager.js";
import { isLocalMarketplaceSource } from "./reconciler.js";
import { toComparablePath, isPathWithin } from "../fsJunctions.js";
import { hm } from "../pathPrefix.js";
import { uniq } from "../collections.js";
import { dU } from "../pathSegments.js";
import { cl } from "../pathClassification.js";
import { getPlatform } from "../platform.js";
import { isReservedDeviceName, EHn } from "../windowsProfileFolders.js";
import { bfe } from "./marketplaceErrors.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isENOENT,
} from "../errors.js";
import { jsonStringify } from "../slowOperations.js";
import { isSourceConsistentWith, getNonRepoExtraMarketplaces, L6, Vj } from "./marketplaceSources.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { sorted } from "./marketplaceAutoUpdate.js";
import { RESERVED_MARKETPLACE_NAMES } from "./schemas.js";
import {
  isFoldedSpellingOf,
  OFFICIAL_MARKETPLACE_NAME,
  isOfficialMarketplaceSpelling,
  Xps,
} from "./officialMarketplaceNames.js";
import { logForDebugging } from "../debug.js";
import { removeDirectoryTreeNoFollow, removePathEntry } from "../fsRemove.js";
import { getFsImplementation } from "../fsOperations.js";
import { pathPresence } from "../fsSafety/atomicWriteStaging.js";
import { hasManagedSettings } from "../settings/managedRestrictionKeys.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { TENGU_STEADY_BITTERN } from "../../services/api/withRetry.js";
import { isRemoteManagedSettingsVerified } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { quotedPrintable } from "../printableName.js";
import { claudeCommand } from "../worktreeResumeHint.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { U } from "../../../vendor/zod/v4/classic/schemas.js";
import { BUILTIN } from "../telemetry/pluginTelemetry.js";
import { nfcLower } from "../stringUtils.js";

//@ chunk-e6aww6q8.js:4225236-4225404 placement
function getSyntheticMarketplaceStorageKey(e, n, r) {
  if (resolve_10(getOriginalCwd(), r) !== join_29(getResolvedMarketplacesCacheDir(), e)) return null;
  let s = n?.source === "settings" ? "manifest" : n?.source === "url" ? "catalog" : null;
  return s === null ? null : PJr(e, s, getPluginsDirectory());
}
//@ chunk-e6aww6q8.js:4225404-4225615 placement
function getClonedMarketplaceStorageKey(e, n, r) {
  if ((n?.source !== "github" && n?.source !== "git") || r !== join_29(getMarketplacesCacheDir(), e))
    return null;
  let s = getMarketplaceStorageKey(join_29(r, ".claude-plugin", "marketplace.json"), getPluginsDirectory());
  return s !== null && "marketplace" in s && s.marketplace === e ? s : null;
}
/**
 * 市场在存储层的位置：种子目录（system）、本地来源（workspace）或存储键。
 */
//@ chunk-e6aww6q8.js:4225615-4225828 placement
function getMarketplaceStorageLocation(e, n, r) {
  if (seedDirFor(r) !== void 0) return { kind: "hostFolder", space: "system" };
  if (n !== void 0 && isLocalMarketplaceSource(n)) return { kind: "hostFolder", space: "workspace" };
  let s = getSyntheticMarketplaceStorageKey(e, n, r) ?? getClonedMarketplaceStorageKey(e, n, r);
  return s === null ? null : { kind: "key", key: s };
}
//@ chunk-e6aww6q8.js:4225828-4225874 placement = getMarketplacesCacheDir (1)
function getMarketplacesCacheDir() {
  return join_29(getPluginsDirectory(), "marketplaces");
}
/**
 * 市场缓存目录的绝对路径（相对当前工作目录解析）。
 */
//@ chunk-e6aww6q8.js:4225874-4225911 placement
function getResolvedMarketplacesCacheDir() {
  return resolve_10(getOriginalCwd(), getMarketplacesCacheDir());
}
//@ chunk-e6aww6q8.js:4225911-4226114 placement
function comparePathContainment(e, n, r) {
  let s = toComparablePath(n, { foldCase: !0, knownNotSuspect: !0 }),
    h = toComparablePath(e, { foldCase: !0 }),
    y = r === e ? h : toComparablePath(r, { foldCase: !0 });
  if (s === y) return "same";
  return s !== h && isPathWithin(h, s, { alreadyComparable: !0 }) ? "inside" : "outside";
}
//@ chunk-e6aww6q8.js:4226114-4226638 placement = setCwdState (0.793)
async function checkMarketplaceDirCollision(e, n, r, s, h) {
  let y = relative_10(e, n),
    S = hm(e, n, !1) ? y.split(/[\\/]/)[0] : void 0,
    w = relative_10(toComparablePath(e), toComparablePath(n, { knownNotSuspect: !0 })).split(/[\\/]/)[0],
    L = uniq([S, w].filter((we) => we !== void 0 && we !== "" && we !== ".."));
  if (L.length === 0) return;
  let G = h ?? (await loadKnownMarketplacesWithDeclared(s)),
    normalized = r.normalize("NFC"),
    Z = (we) => we.normalize("NFC") === normalized,
    filtered = listMarketplaceNames(G, s).filter((we) => !Z(we)),
    ke = marketplaceDirCandidates(G, s, e);
  for (let we of L) {
    let Ee = findByMarketplaceName(we, filtered, ke);
    if (Ee !== void 0) return Ee;
  }
  for (let we of L) {
    let Ee = await hasDanglingSymlinkAncestor(e, we),
      Ae = Ee === void 0 ? void 0 : await getFileIdentity_7(e, we, Ee, filtered, ke);
    if (Ae !== void 0) return Ae;
  }
  return;
}
//@ chunk-e6aww6q8.js:4226638-4226799 placement
function isValidMarketplaceDirName(e) {
  if (dU(e) === ".git") return !1;
  return !(
    e === "" ||
    e !== basename_10(e) ||
    /[\\/]/.test(e) ||
    cl(e) ||
    (getPlatform() === "windows" && (/[. ]$/.test(e) || e.includes(":") || isReservedDeviceName(e) || EHn(e)))
  );
}
//@ chunk-e6aww6q8.js:4226799-4227130 placement
async function assertMarketplaceNameNotCaseFolded(
  e,
  n,
  r,
  { known: known, selfKey: selfKey, source: source },
) {
  let S = sameNfcAs(n, selfKey),
    { owner: owner, known: known_2 } = await findMarketplaceNameOwner(e, n, r, { known: known, isSelf: S });
  if (owner !== void 0)
    throw new bfe(
      formatNameCollisionMessage(n, owner),
      "marketplace name case-folds onto a registered marketplace directory",
      { kind: "name_taken", name: owner, ...(isOtherSameMarketplaceName(n, owner) && { requested: n }) },
    );
  await assertMarketplaceNameUsable(e, n, r, { known: known_2, isSelf: S, source: source });
}
//@ chunk-e6aww6q8.js:4227130-4227727 placement
async function assertMarketplaceNameUsable(e, n, r, { known: known, isSelf: isSelf, source: source }) {
  let S = findMarketplaceSourceRank(n, source);
  if (S !== void 0 && S <= (findMarketplaceRepoRank(n, source) ?? 1 / 0)) return;
  let w = known ?? (await loadKnownMarketplacesWithDeclared(r)),
    L = findMarketplaceDirOwner(n, e, w, r, (G) => isSelf(G) || isSameGithubMarketplace(G, w, source, r));
  if (L !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Can't use the marketplace name ${jsonStringify(n)}: the registered marketplace ${jsonStringify(L.owner)} downloads from GitHub into the folder ${jsonStringify(L.folder)}${L.backup ? ` and moves it to ${jsonStringify(`${L.folder}.bak`)} while it downloads again` : ""}, so a marketplace named ${jsonStringify(n)} would stop ${jsonStringify(L.owner)} from downloading. Ask the author of ${jsonStringify(n)} to rename it.`,
      "marketplace name is the clone folder of a registered marketplace",
    );
}
//@ chunk-e6aww6q8.js:4227727-4227857 placement
function findMarketplaceSourceRank(e, n) {
  return findMarketplaceSourceIndex(
    (r, s) =>
      sameMarketplaceName(r, e) &&
      s?.source?.source === n.source &&
      (n.source === "github" ? isSourceConsistentWith(n, s.source) : En(n, s.source)),
  );
}
//@ chunk-e6aww6q8.js:4227857-4228112 placement
function findMarketplaceRepoRank(e, n) {
  let r = n.source === "github" ? n.repo.toLowerCase() : void 0;
  return findMarketplaceSourceIndex((s, h) => {
    if (
      h?.source?.source !== "github" ||
      typeof h.source.repo !== "string" ||
      h.source.repo.toLowerCase() === r
    )
      return !1;
    let y = getCachePathForSource(h.source);
    return sameMarketplaceName(y, e) || sameMarketplaceName(`${y}.bak`, e);
  });
}
//@ chunk-e6aww6q8.js:4228112-4228275 placement
function findMarketplaceSourceIndex(e) {
  let n = new Map(getNonRepoExtraMarketplaces().map((s) => [s.source, s.extras])),
    index = sorted.findIndex((s) => Object.entries(n.get(s) ?? {}).some(([h, y]) => e(h, y)));
  return index === -1 ? void 0 : index;
}
//@ chunk-e6aww6q8.js:4228275-4228432 placement
function githubRepoDirName(e, n) {
  return n?.source?.source === "github" &&
    typeof n.source.repo === "string" &&
    seedDirFor(n.installLocation) === void 0 &&
    validateReservedMarketplaceEntry(e, n) === null
    ? getCachePathForSource(n.source)
    : void 0;
}
//@ chunk-e6aww6q8.js:4228432-4228901 placement
function findMarketplaceDirOwner(e, n, r, s, h) {
  for (let w of RESERVED_MARKETPLACE_NAMES) if (isFoldedSpellingOf(e, w)) return;
  let y = listMarketplaceNames(r, s),
    filtered = y.filter((w) => !h(w));
  for (let w of [!1, !0]) {
    let L = findByMarketplaceName(e, filtered, (ke) => {
      let we = githubRepoDirName(ke, getMarketplaceEntry(r, ke, s));
      return we === void 0 ? [] : [w ? `${we}.bak` : we];
    });
    if (L === void 0) continue;
    let G = getMarketplaceEntry(r, L, s),
      q = githubRepoDirName(L, G),
      Z = marketplaceDirCandidates(r, s, n),
      any = y.some((ke) => {
        let we = getMarketplaceEntry(r, ke, s);
        return (
          we !== void 0 &&
          !isLocalMarketplaceSource(we.source) &&
          !(G !== void 0 && isSameGithubMarketplace(ke, r, G.source, s)) &&
          findByMarketplaceName(e, [ke], Z) !== void 0
        );
      });
    return q === void 0 || any ? void 0 : { owner: L, folder: q, backup: w };
  }
  return;
}
//@ chunk-e6aww6q8.js:4228901-4228942 placement
function isOtherSameMarketplaceName(e, n) {
  return e !== n && sameMarketplaceName(e, n);
}
//@ chunk-e6aww6q8.js:4228942-4229024 placement = setCwdState (1)
function sameNfcAs(e, n) {
  let normalized = (n ?? e).normalize("NFC");
  return (s) => s.normalize("NFC") === normalized;
}
//@ chunk-e6aww6q8.js:4229024-4229176 placement
async function assertMarketplaceNameAvailable(
  e,
  n,
  r,
  { ownEntry: ownEntry, known: known, selfKey: selfKey, source: source },
) {
  (await assertMarketplaceNameNotCaseFolded(e, n, r, { known: known, selfKey: selfKey, source: source }),
    await assertMarketplaceDirFree(e, n, r, { ownEntry: ownEntry, selfKey: selfKey }));
}
//@ chunk-e6aww6q8.js:4229176-4229703 placement
async function assertMarketplaceDirFree(
  e,
  n,
  r,
  { knownAlready: knownAlready, ownEntry: ownEntry, selfKey: selfKey } = {},
) {
  let S = await findDirCollisionInCache(e, n, ownEntry);
  if (S === void 0) return;
  let w = knownAlready ?? (await loadKnownMarketplacesWithDeclared(r)),
    L = sameNfcAs(n, selfKey),
    G = listMarketplaceNames(w, r),
    q = marketplaceDirCandidates(w, r, e);
  if (findByMarketplaceName(S, G.filter(L), q) !== void 0) return;
  let Z = findByMarketplaceName(
    S,
    G.filter((Se) => !L(Se)),
    q,
  );
  if (Z !== void 0)
    throw new bfe(formatNameCollisionMessage(n, Z), "marketplace name case-folds onto a registered sibling", {
      kind: "name_taken",
      name: Z,
      ...(isOtherSameMarketplaceName(n, Z) && { requested: n }),
    });
  (logForDebugging(
    `Clearing stale case-variant marketplace directory ${jsonStringify(S)} (unregistered) before publishing ${jsonStringify(n)}`,
    { level: "warn" },
  ),
    await removeDirectoryTreeNoFollow(join_29(e, S)));
}
//@ chunk-e6aww6q8.js:4229703-4229973 placement
async function findMarketplaceNameOwner(e, n, r, { known: known, isSelf: isSelf = () => !1 } = {}) {
  let y = await hasDanglingSymlinkAncestor(e, n);
  if (y === void 0 && known === void 0) return { owner: void 0, known: known };
  let S = known ?? (await loadKnownMarketplacesWithDeclared(r)),
    filtered = listMarketplaceNames(S, r).filter((q) => !isSelf(q, S)),
    L = marketplaceDirCandidates(S, r, e);
  return {
    owner:
      findByMarketplaceName(n, filtered, L) ??
      (y === void 0 ? void 0 : await getFileIdentity_7(e, n, y, filtered, L)),
    known: S,
  };
}
//@ chunk-e6aww6q8.js:4229973-4230032 placement
function getMarketplaceEntry(e, n, r) {
  return Object.hasOwn(e, n) ? e[n] : L6(n, r);
}
//@ chunk-e6aww6q8.js:4230032-4230313 placement
function marketplaceDirCandidates(e, n, r) {
  return (s) => {
    let h = [s, `${s}.json`, `${s}.bak`],
      y = getMarketplaceEntry(e, s, n);
    if (y !== void 0 && typeof y.installLocation === "string") {
      let S = resolve_10(getOriginalCwd(), y.installLocation),
        w = relative_10(r, S),
        L = hm(r, S, !1) ? w.split(/[\\/]/)[0] : void 0;
      if (L !== void 0 && isValidMarketplaceDirName(L) && !h.includes(L)) h.push(L, `${L}.bak`);
    }
    return h;
  };
}
//@ chunk-e6aww6q8.js:4230313-4230377 placement
function findByMarketplaceName(e, n, r) {
  return n.find((s) => r(s).some((h) => sameMarketplaceName(h, e)));
}
//@ chunk-e6aww6q8.js:4230377-4230469 placement = setCwdState (1)
function sameMarketplaceName(e, n) {
  let normalized = e.normalize("NFC"),
    normalized_2 = n.normalize("NFC");
  return normalized === normalized_2 || dU(normalized) === dU(normalized_2);
}
//@ chunk-e6aww6q8.js:4230469-4230546 placement
function listMarketplaceNames(e, n) {
  return [...Object.keys(e), ...Vj()[getStorageArm(n)].keys()].filter(isValidMarketplaceDirName);
}
/**
 * 检查克隆目录名是否落到另一个已注册市场的目录上：是则抛错（让用户先删除或改名）； 否则再按“非同一 github 仓库”查一次，返回是否存在冲突。
 */
//@ chunk-e6aww6q8.js:4230546-4231041 placement
async function checkCloneDirOwnedByOther(e, n, r, s) {
  let { owner: owner, known: known } = await findMarketplaceNameOwner(e, n, s, {
    isSelf: (w, L) => isSameGithubMarketplace(w, L, r, s),
  });
  if (owner !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot fetch this marketplace: its clone directory name ${jsonStringify(n)} is the registered marketplace ${jsonStringify(owner)}'s directory. Remove or rename that marketplace first (claude plugin marketplace remove).`,
      "marketplace clone target is another registered marketplace directory",
    );
  if (known === void 0) return !1;
  let { owner: owner_2 } = await findMarketplaceNameOwner(e, n, s, {
    known: known,
    isSelf: (w, L) => !isSameGithubMarketplace(w, L, r, s),
  });
  return owner_2 !== void 0;
}
//@ chunk-e6aww6q8.js:4231041-4231199 placement
function isSameGithubMarketplace(e, n, r, s) {
  let h = getMarketplaceEntry(n, e, s);
  return (
    h !== void 0 &&
    h.source.source === "github" &&
    r.source === "github" &&
    h.source.repo.toLowerCase() === r.repo.toLowerCase()
  );
}
/**
 * 两个市场名折叠到同一 marketplaces/ 目录、拒绝发布的提示。
 */
//@ chunk-e6aww6q8.js:4231199-4231584 placement
function formatNameCollisionMessage(e, n) {
  return `Marketplace name ${jsonStringify(e)} collides with the registered marketplace ${jsonStringify(n)}: the two names fold onto one marketplaces/ entry (the same key up to letter case and filesystem-ignorable characters, or the same directory on this filesystem); refusing to publish over it. Remove that marketplace first (claude plugin marketplace remove), or ask the author to rename.`;
}
//@ chunk-e6aww6q8.js:4231584-4231766 placement
async function findDirCollisionInCache(e, n, r) {
  let s;
  try {
    s = (await getFsImplementation().readdir(e)).map((h) => h.name);
  } catch (error) {
    let y = getErrnoCode(error);
    if (y === "ENOENT" || y === "ENOTDIR") return;
    throw error;
  }
  return findSameDirAmong(
    e,
    n,
    s.filter((h) => h !== r),
  );
}
//@ chunk-e6aww6q8.js:4231766-4231897 placement
async function findSameDirIdentity(e, n, r, s) {
  let filtered = r.filter(isValidMarketplaceDirName);
  if (filtered.length === 0) return;
  let y = await hasDanglingSymlinkAncestor(e, n);
  return y === void 0 ? void 0 : getFileIdentity_7(e, n, y, filtered, s);
}
//@ chunk-e6aww6q8.js:4231897-4232012 placement
async function findSameDirAmong(e, n, r) {
  if (!r.some((h) => h !== n)) return;
  let s = await hasDanglingSymlinkAncestor(e, n);
  return s === void 0 ? void 0 : getFileIdentity_7(e, n, s, r);
}
//@ chunk-e6aww6q8.js:4232012-4232145 placement = isRealPathWithinTeamDir (0.77)
async function hasDanglingSymlinkAncestor(e, n) {
  try {
    return await lstat_14(join_29(e, n), { bigint: !0 });
  } catch (error) {
    let code = getErrnoCode(error);
    if (code === "ENOENT" || code === "ENOTDIR") return;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4232145-4232442 placement = getFileIdentity (0.778)
async function getFileIdentity_7(e, n, r, s, h = (y) => [y]) {
  for (let y of s) {
    if (y === n) continue;
    for (let S of h(y)) {
      if (S === n) continue;
      try {
        let stats = await lstat_14(join_29(e, S), { bigint: !0 });
        if (r.ino !== 0n && stats.ino !== 0n ? stats.dev === r.dev && stats.ino === r.ino : dU(S) === dU(n))
          return y;
      } catch (error) {
        let L = getErrnoCode(error);
        if (L !== "ENOENT" && L !== "ENOTDIR") throw error;
      }
    }
  }
  return;
}
/**
 * 删除市场缓存（目录、.bak 目录与 .json 文件）；名字不是普通目录名时跳过； 若这些路径在本文件系统上其实是另一个已注册市场的目录则不删并记 warn。
 */
//@ chunk-e6aww6q8.js:4232442-4233013 placement
async function removeMarketplaceCacheFiles(e, n, r) {
  if (!isValidMarketplaceDirName(e)) {
    logForDebugging(
      `Not removing cache files for marketplace name ${jsonStringify(e)}: not a plain directory name`,
      { level: "warn" },
    );
    return;
  }
  let s = getResolvedMarketplacesCacheDir(),
    h = join_29(s, e),
    y = async (w) =>
      findByMarketplaceName(w, n, r) ??
      (await findSameDirIdentity(s, w, n, r)) ??
      (await findDirCollisionInCache(s, w).then((L) =>
        L === void 0 ? void 0 : findByMarketplaceName(L, n, r),
      )),
    S = await y(e);
  if (S !== void 0) {
    logForDebugging(
      `Not removing cache files for marketplace ${jsonStringify(e)}: on this filesystem they are the registered marketplace ${jsonStringify(S)}'s directory`,
      { level: "warn" },
    );
    return;
  }
  if ((await removeDirectoryTreeNoFollow(h), (await y(`${e}.bak`)) === void 0))
    await removeDirectoryTreeNoFollow(`${h}.bak`);
  if ((await y(`${e}.json`)) === void 0) await removePathEntry(join_29(s, `${e}.json`));
}
/**
 * plugins/data 下大小写不敏感匹配插件的数据目录。
 */
//@ chunk-f3qhjfah.js:6714-6902 placement
async function findPluginDataDirs(e) {
  let n = join(getPluginsDirectory(), "data"),
    lower = pluginIdToDirName(e).toLowerCase();
  try {
    return (await readdir(n)).filter((s) => s.toLowerCase() === lower).map((s) => join(n, s));
  } catch (error) {
    return isENOENT(error) || getErrnoCode(error) === "ENOTDIR" ? [] : void 0;
  }
}
//@ chunk-f3qhjfah.js:6902-6956 placement
async function isMarketplaceGone(e) {
  return (await pathPresence(pluginDataDirPath(e))) === "gone";
}
//@ chunk-f3qhjfah.js:6956-6966 placement
var Ce = !0;
//@ chunk-f3qhjfah.js:6966-7001 placement
var IJ = () => hasManagedSettings() && readFlagWithOverride(TENGU_STEADY_BITTERN, { safe: Ce });
//@ chunk-f3qhjfah.js:7001-7056 placement
var J_ = () => (IJ() ? (isRemoteManagedSettingsVerified() ? "answered" : "unanswered") : "unasked");
//@ chunk-f3qhjfah.js:7056-7302 placement
function reservedMarketplaceNameError(e) {
  if (cdr())
    return `Claude Code won't load marketplace "${quotedPrintable(e)}": its name looks like the name of one of Anthropic's own marketplaces`;
  return `Claude Code refuses the marketplace name "${quotedPrintable(e)}": it looks like one of Anthropic's own`;
}
//@ chunk-f3qhjfah.js:7302-7372 placement
function marketplaceLoadFailedMessage(e, n) {
  return `Failed to load marketplace "${quotedPrintable(e)}": ${n}`;
}
//@ chunk-f3qhjfah.js:7372-7396 placement
function cdr() {
  return !1;
}
//@ chunk-f3qhjfah.js:7396-7406 placement
var _t = 64;
//@ chunk-f3qhjfah.js:7406-7571 placement
function formatRemoveMarketplaceHint(e, n = "it") {
  let r = e.length <= _t ? claudeCommand("plugin marketplace remove", e) : null;
  return r === null ? `Remove ${n} in /plugin \u2192 Marketplaces` : `Remove ${n} with: ${r}`;
}
/**
 * 删除/改名仿冒市场的各段说明文字。
 */
//@ chunk-f3qhjfah.js:7571-8530 placement
var REMOVE_ALSO_UNINSTALLS_NOTE =
    "this also uninstalls its plugins and deletes their data, options and secrets",
  RENAME_INSTEAD_NOTE = "if its maintainer renames it, update it instead",
  REMOVE_ONLY_FIX_LINES = [
    "Removing it is the only fix. That also uninstalls its plugins and deletes what they saved:",
    "their data, options and secrets.",
  ],
  READD_AFTER_REMOVE_NOTE =
    "After removing it, you can add it again from the same source; if that is refused, its maintainer has to rename it first.",
  SETTINGS_RENAME_STEPS = [
    "It was added from a settings file. To keep it, do these in order (if your organization's managed settings add it, an administrator does step 1):",
    "1. In each settings file that lists it under extraKnownMarketplaces, rename its entry (the key and its source.name) to a plain-ASCII name that doesn't look like one of Anthropic's.",
  ],
  REMOVE_ALSO_UNINSTALLS_PAREN =
    "(this also uninstalls its plugins and deletes their data, options and secrets).",
  RESTART_STEP =
    "3. Start Claude Code again, in that project's folder if it is a project's settings file, then install its plugins from the renamed one.";
//@ chunk-f3qhjfah.js:8530-8593 placement
function Ne(e) {
  return [
    ...SETTINGS_RENAME_STEPS,
    `2. ${formatRemoveMarketplaceHint(e, "the old name")}`,
    REMOVE_ALSO_UNINSTALLS_PAREN,
    RESTART_STEP,
  ];
}
//@ chunk-f3qhjfah.js:8593-8630 placement
function Ie(e) {
  return [...REMOVE_ONLY_FIX_LINES, READD_AFTER_REMOVE_NOTE, formatRemoveMarketplaceHint(e)];
}
//@ chunk-f3qhjfah.js:8630-8840 placement
function marketplaceRemovalAdvice(e, n = {}) {
  if (n.declaredInSettings === !0) return `Reloading won't help. ${Ne(e).join(" ")}`;
  if (cdr()) return `Reloading won't help. ${Ie(e).join(" ")}`;
  return `Reloading won't help. ${formatRemoveMarketplaceHint(e)} (${REMOVE_ALSO_UNINSTALLS_NOTE}; ${RENAME_INSTEAD_NOTE})`;
}
//@ chunk-f3qhjfah.js:8840-9256 placement
function reservedMarketplaceNameMessage(e, n = {}) {
  let r = cdr(),
    s = r
      ? [
          `Claude Code won't load marketplace "${quotedPrintable(e)}":`,
          "its name looks like the name of one of Anthropic's own marketplaces. Reloading won't help.",
        ]
      : [
          `Claude Code refuses the marketplace name "${quotedPrintable(e)}":`,
          "it looks like one of Anthropic's own. Reloading won't help.",
        ];
  if (n.declaredInSettings === !0) return [...s, ...Ne(e)];
  if (r) return [...s, ...Ie(e)];
  return [
    ...s,
    formatRemoveMarketplaceHint(e),
    `(${REMOVE_ALSO_UNINSTALLS_NOTE};`,
    `${RENAME_INSTEAD_NOTE}).`,
  ];
}
//@ chunk-f3qhjfah.js:9256-9679 placement
var RESERVED_MARKETPLACE_NAME_MESSAGE =
    "Claude Code refuses this marketplace's name: it looks like one of Anthropic's own. Reloading won't help. Remove it in /plugin \u2192 Marketplaces (deletes its plugins and their data, options and secrets).",
  vt =
    "Claude Code refuses this marketplace's name: it looks like one of Anthropic's own. Rename it in its settings file, remove the old name in /plugin \u2192 Marketplaces (plugins and data go), then restart.";
//@ chunk-f3qhjfah.js:9679-9711 placement
function reservedNameMessage(e) {
  return e ? vt : RESERVED_MARKETPLACE_NAME_MESSAGE;
}
//@ chunk-f3qhjfah.js:9711-9811 placement
var formatOnlyWhileDisabledHint = (e, n) =>
  `${e} only while "${quotedPrintable(n)}" is disabled. Disable or uninstall the copy you don't need`;
//@ chunk-f3qhjfah.js:9811-10203 placement
var MARKETPLACE_SOURCE_FIX_HINTS = {
  "network-location":
    "re-add the marketplace (one added from a folder or file must be re-added from a copy on this computer), or, to trust a folder on a network drive, declare it under extraKnownMarketplaces in user or managed settings",
  source: "re-add the marketplace with a supported source",
  declaration: "re-add the marketplace from the source that entry lists, or change the entry",
};
//@ chunk-f3qhjfah.js:10203-10283 placement
var PLUGIN_AVAILABILITY_STATES = ["available", "required", "auto_install", "not_available"],
  fdr = DoctorLazy(() => U(PLUGIN_AVAILABILITY_STATES));
//@ chunk-f3qhjfah.js:10283-10330 placement
function EJr(e) {
  return fdr().safeParse(e).data;
}
//@ chunk-f3qhjfah.js:10330-10464 placement
var PLUGIN_ORIGIN_KINDS = [
    "anthropic_catalog",
    "other_catalog",
    "account_uploads",
    "account_marketplace",
    "org_library",
    "org_marketplace",
  ],
  pdr = DoctorLazy(() => U(PLUGIN_ORIGIN_KINDS));
//@ chunk-f3qhjfah.js:10464-10511 placement
function vJr(e) {
  return pdr().safeParse(e).data;
}
//@ chunk-f3qhjfah.js:10511-11085 placement
function marketplaceListingChangedMessage(e, n, r, s, a = !1) {
  {
    let c = quotedPrintable(e),
      l =
        n && n.length > 0
          ? `now lists it as ${n.map((g) => quotedPrintable(g)).join(" or ")}`
          : s !== void 0
            ? `still lists it, but Claude Code cannot install it (${quotedPrintable(s)})`
            : r
              ? "now lists a different repository under that name"
              : a
                ? "does not list it (or your organization blocks it)"
                : "no longer lists it (removed, or blocked by your organization)";
    return a
      ? `Plugin "${c}" is not loaded: installed_plugins.json could not be read, so its install could not be checked, and the Anthropic Directory ${l}`
      : `Plugin "${c}" is not loaded: the Anthropic Directory ${l}`;
  }
  return "";
}
//@ chunk-f3qhjfah.js:11085-11219 placement
function isMarketplaceLoadError(e) {
  return (
    e.type === "marketplace-load-failed" &&
    e.reason === "cache-miss" &&
    e.marketplace === OFFICIAL_MARKETPLACE_NAME &&
    e.directoryBlockedBy === void 0
  );
}
//@ chunk-f3qhjfah.js:11219-11293 placement
var RELOAD_PLUGINS_HINT = `Run /reload-plugins, or: claude plugin marketplace update ${OFFICIAL_MARKETPLACE_NAME}`;
//@ chunk-f3qhjfah.js:11293-11581 placement
function marketplaceNotFoundMessage(e) {
  if (
    e.type === "marketplace-not-found" &&
    e.marketplace !== OFFICIAL_MARKETPLACE_NAME &&
    isOfficialMarketplaceSpelling(e.marketplace) &&
    e.registrationHidden !== void 0
  ) {
    let n = Xps(e.marketplace);
    return n === null
      ? "Remove that entry from known_marketplaces.json, then uninstall this plugin if it is still listed"
      : `Remove it: ${n}`;
  }
  return;
}
//@ chunk-f3qhjfah.js:11581-12032 placement
function policyBlockReason(e) {
  switch (e) {
    case "managed_setting":
      return "Your administrator turned it off with disablePluginDirectory in managed settings.";
    case "allowlist":
      return "Your administrator's marketplace allowlist (strictKnownMarketplaces) does not include the Anthropic Directory.";
    case "blocklist":
      return "Your administrator listed it in blockedMarketplaces in managed settings.";
    case "policy_limit":
      return "Your organization's policy does not allow it.";
  }
  return "";
}
//@ chunk-f3qhjfah.js:12032-12217 placement
function pluginBlockSource(e) {
  if (e.directoryDisabledByOrganization) return "managed_setting";
  if (e.marketplace !== OFFICIAL_MARKETPLACE_NAME || e.sourceUnverifiable) return null;
  return e.blockedByBlocklist ? "blocklist" : "allowlist";
}
//@ chunk-f3qhjfah.js:12217-12448 placement
function directoryBlockedMessage(e, n) {
  {
    let r = policyBlockReason(n),
      s =
        e === void 0
          ? "The Anthropic Directory is blocked by your organization"
          : `Plugin "${quotedPrintable(e)}" is not loaded: the Anthropic Directory is blocked by your organization`;
    return r === "" ? s : `${s}. ${r}`;
  }
  return "";
}
//@ chunk-f3qhjfah.js:12448-13261 placement
var NOT_RECORDED = "(not recorded)",
  $t = {
    "path-not-found": !1,
    "path-traversal": !1,
    "mcp-config-invalid": !1,
    "lsp-config-invalid": !1,
    "hook-load-failed": !1,
    "component-load-failed": !1,
    "mcpb-download-failed": !1,
    "mcpb-extract-failed": !1,
    "mcpb-invalid-manifest": !1,
    "lsp-server-start-failed": !1,
    "lsp-server-crashed": !1,
    "lsp-request-timeout": !1,
    "lsp-request-failed": !1,
    "plugin-not-installed": !1,
    "marketplace-blocked-by-policy": !1,
    "autoupdate-blocked-by-pinner": !1,
    "autoupdate-deferred-entry-helper": !1,
    "autoupdate-disabled-by-policy": !1,
    "plugin-cache-miss": !0,
    "generic-error": !0,
    "manifest-parse-error": !0,
    "manifest-validation-error": !0,
    "marketplace-not-found": !0,
    "marketplace-load-failed": !0,
    "plugin-not-found": !0,
    "git-auth-failed": !0,
    "git-timeout": !0,
    "network-error": !0,
    "dependency-unsatisfied": !0,
    "dependency-version-unsatisfied": !0,
  };
/**
 * 把插件加载错误（path-not-found、plugin-not-installed、marketplace-load-failed…）转成一行用户可读说明。
 */
//@ chunk-f3qhjfah.js:13261-13862 placement
function pluginErrorSummary(e) {
  if (e.type === "path-not-found") return e.plugin === void 0 && e.errno !== void 0;
  if (e.type === "plugin-not-installed") return e.seedHasOtherVersion === !0 || e.registryReadFailed === !0;
  if (e.type === "generic-error") return e.orphan !== !0 && e.refused !== !0;
  if (e.type === "marketplace-load-failed")
    return e.untrustedReservedName !== !0 && e.nameRefused !== !0 && e.directoryBlockedBy === void 0;
  if (e.type === "marketplace-not-found")
    return e.registrationHidden === void 0 || e.registrationHidden === "network-location";
  if (e.type === "plugin-not-found") return e.removedFromDirectory !== !0 || e.registryReadFailed === !0;
  return $t[e.type];
}
//@ chunk-f3qhjfah.js:13862-13962 placement
function isDependencyError(e) {
  return e.type === "dependency-unsatisfied" || e.type === "dependency-version-unsatisfied";
}
//@ chunk-k2t0a8ve.js:230-263 placement
var isOfficialMarketplaceRef = (o) => o.endsWith(`@${BUILTIN}`);
//@ chunk-k2t0a8ve.js:263-339 placement
function hasSimilarMarketplaceName(o, e) {
  let t = nfcLower(o);
  return [...(e ?? [])].some((r) => !isOfficialMarketplaceRef(r) && nfcLower(r) === t);
}

export {
  isOfficialMarketplaceRef,
  hasSimilarMarketplaceName,
  J_,
  pluginErrorSummary,
  getResolvedMarketplacesCacheDir,
  reservedMarketplaceNameError,
  marketplaceLoadFailedMessage,
  marketplaceRemovalAdvice,
  isDependencyError,
  NOT_RECORDED,
  IJ,
  isMarketplaceGone,
  reservedMarketplaceNameMessage,
  isMarketplaceLoadError,
  RELOAD_PLUGINS_HINT,
  marketplaceNotFoundMessage,
  directoryBlockedMessage,
  findMarketplaceNameOwner,
  isValidMarketplaceDirName,
  assertMarketplaceNameAvailable,
  checkCloneDirOwnedByOther,
  assertMarketplaceNameUsable,
  sameNfcAs,
  marketplaceDirCandidates,
  findByMarketplaceName,
  isSameGithubMarketplace,
  getSyntheticMarketplaceStorageKey,
  comparePathContainment,
  checkMarketplaceDirCollision,
  listMarketplaceNames,
  removeMarketplaceCacheFiles,
  cdr,
  reservedNameMessage,
  getMarketplaceStorageLocation,
  RESERVED_MARKETPLACE_NAME_MESSAGE,
  fdr,
  pdr,
  findPluginDataDirs,
  MARKETPLACE_SOURCE_FIX_HINTS,
  marketplaceListingChangedMessage,
  pluginBlockSource,
  formatOnlyWhileDisabledHint,
  EJr,
  vJr,
  policyBlockReason,
};
