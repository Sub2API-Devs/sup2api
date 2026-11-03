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
import { resolve as resolve_2, join, relative, basename } from "path";
import { lstat, readdir } from "fs/promises";
import { getOriginalCwd } from "../../bootstrap/state.js";
import {
  marketplaceCacheSpace,
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
import { toComparablePath, isPathWithin as isPathWithin_2 } from "../fsJunctions.js";
import { isSubpathOf } from "../pathPrefix.js";
import { uniq } from "../collections.js";
import { normalizePathSegment } from "../pathSegments.js";
import { hasDotSegment } from "../pathClassification.js";
import { getPlatform } from "../platform.js";
import { isReservedDeviceName, isDosShortName } from "../windowsProfileFolders.js";
import { MarketplaceError } from "./marketplaceErrors.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isENOENT,
} from "../errors.js";
import { jsonStringify } from "../slowOperations.js";
import {
  isSourceConsistentWith,
  getNonRepoExtraMarketplaces,
  hiddenRegistryEntryFor,
  hiddenRegistryEntries,
} from "./marketplaceSources.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { sorted } from "./marketplaceAutoUpdate.js";
import { RESERVED_MARKETPLACE_NAMES } from "./schemas.js";
import {
  isFoldedSpellingOf,
  OFFICIAL_MARKETPLACE_NAME,
  isOfficialMarketplaceSpelling,
  removeMarketplaceCommand,
} from "./officialMarketplaceNames.js";
import { logForDebugging } from "../debug.js";
import {
  removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2,
  removePathEntry,
} from "../fsRemove.js";
import { getFsImplementation } from "../fsOperations.js";
import { pathPresence } from "../fsSafety/atomicWriteStaging.js";
import { hasManagedSettings } from "../settings/managedRestrictionKeys.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { TENGU_STEADY_BITTERN } from "../../services/api/withRetry.js";
import { isRemoteManagedSettingsVerified } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { quotedPrintable } from "../printableName.js";
import { claudeCommand } from "../worktreeResumeHint.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { BUILTIN } from "../telemetry/pluginTelemetry.js";
import { nfcLower } from "../stringUtils.js";

//@ chunk-e6aww6q8.js:4225236-4225404 placement
function getSyntheticMarketplaceStorageKey(e, source, installLocation) {
  if (resolve_2(getOriginalCwd(), installLocation) !== join(getResolvedMarketplacesCacheDir(), e))
    return null;
  let s = source?.source === "settings" ? "manifest" : source?.source === "url" ? "catalog" : null;
  return s === null ? null : marketplaceCacheSpace(e, s, getPluginsDirectory());
}
//@ chunk-e6aww6q8.js:4225404-4225615 placement
function getClonedMarketplaceStorageKey(e, n, r) {
  if ((n?.source !== "github" && n?.source !== "git") || r !== join(getMarketplacesCacheDir(), e))
    return null;
  let marketplaceStorageKey = getMarketplaceStorageKey(
    join(r, ".claude-plugin", "marketplace.json"),
    getPluginsDirectory(),
  );
  return marketplaceStorageKey !== null &&
    "marketplace" in marketplaceStorageKey &&
    marketplaceStorageKey.marketplace === e
    ? marketplaceStorageKey
    : null;
}
//@ chunk-e6aww6q8.js:4225615-4225828 placement
/**
 * 市场在存储层的位置：种子目录（system）、本地来源（workspace）或存储键。
 */
function getMarketplaceStorageLocation(marketplaceName, source, installLocation) {
  if (seedDirFor(installLocation) !== undefined)
    return {
      kind: "hostFolder",
      space: "system",
    };
  if (source !== undefined && isLocalMarketplaceSource(source))
    return {
      kind: "hostFolder",
      space: "workspace",
    };
  let s =
    getSyntheticMarketplaceStorageKey(marketplaceName, source, installLocation) ??
    getClonedMarketplaceStorageKey(marketplaceName, source, installLocation);
  return s === null
    ? null
    : {
        kind: "key",
        key: s,
      };
}
//@ chunk-e6aww6q8.js:4225828-4225874 placement = getMarketplacesCacheDir (1)
function getMarketplacesCacheDir() {
  return join(getPluginsDirectory(), "marketplaces");
}
//@ chunk-e6aww6q8.js:4225874-4225911 placement
/**
 * 市场缓存目录的绝对路径（相对当前工作目录解析）。
 */
function getResolvedMarketplacesCacheDir() {
  return resolve_2(getOriginalCwd(), getMarketplacesCacheDir());
}
//@ chunk-e6aww6q8.js:4225911-4226114 placement
function comparePathContainment(resolvedMarketplacesCacheDir, n, r) {
  let comparablePath = toComparablePath(n, {
    foldCase: true,
    knownNotSuspect: true,
  });
  let comparablePath_2 = toComparablePath(resolvedMarketplacesCacheDir, {
    foldCase: true,
  });
  let y =
    r === resolvedMarketplacesCacheDir
      ? comparablePath_2
      : toComparablePath(r, {
          foldCase: true,
        });
  if (comparablePath === y) return "same";
  return comparablePath !== comparablePath_2 &&
    isPathWithin_2(comparablePath_2, comparablePath, {
      alreadyComparable: true,
    })
    ? "inside"
    : "outside";
}
//@ chunk-e6aww6q8.js:4226114-4226638 placement = setCwdState (0.793)
async function checkMarketplaceDirCollision(resolvedMarketplacesCacheDir, n, r, s, h) {
  let y = relative(resolvedMarketplacesCacheDir, n);
  let S = isSubpathOf(resolvedMarketplacesCacheDir, n, false) ? y.split(/[\\/]/)[0] : undefined;
  let w = relative(
    toComparablePath(resolvedMarketplacesCacheDir),
    toComparablePath(n, {
      knownNotSuspect: true,
    }),
  ).split(/[\\/]/)[0];
  let L = uniq([S, w].filter((we) => we !== undefined && we !== "" && we !== ".."));
  if (L.length === 0) return;
  let G = h ?? (await loadKnownMarketplacesWithDeclared(s));
  let normalized = r.normalize("NFC");
  let Z = (we) => we.normalize("NFC") === normalized;
  let filtered = listMarketplaceNames(G, s).filter((we) => !Z(we));
  let ke = marketplaceDirCandidates(G, s, resolvedMarketplacesCacheDir);
  for (let we of L) {
    let Ee = findByMarketplaceName(we, filtered, ke);
    if (Ee !== undefined) return Ee;
  }
  for (let we of L) {
    let Ee = await hasDanglingSymlinkAncestor(resolvedMarketplacesCacheDir, we);
    let Ae =
      Ee === undefined
        ? undefined
        : await getFileIdentity_7(resolvedMarketplacesCacheDir, we, Ee, filtered, ke);
    if (Ae !== undefined) return Ae;
  }
  return;
}
//@ chunk-e6aww6q8.js:4226638-4226799 placement
function isValidMarketplaceDirName(name) {
  if (normalizePathSegment(name) === ".git") return false;
  return !(
    name === "" ||
    name !== basename(name) ||
    /[\\/]/.test(name) ||
    hasDotSegment(name) ||
    (getPlatform() === "windows" &&
      (/[. ]$/.test(name) || name.includes(":") || isReservedDeviceName(name) || isDosShortName(name)))
  );
}
//@ chunk-e6aww6q8.js:4226799-4227130 placement
async function assertMarketplaceNameNotCaseFolded(e, n, r, { known, selfKey, source }) {
  let isSelf = sameNfcAs(n, selfKey);
  let { owner, known: known_2 } = await findMarketplaceNameOwner(e, n, r, {
    known,
    isSelf,
  });
  if (owner !== undefined)
    throw new MarketplaceError(
      formatNameCollisionMessage(n, owner),
      "marketplace name case-folds onto a registered marketplace directory",
      {
        kind: "name_taken",
        name: owner,
        ...(isOtherSameMarketplaceName(n, owner) && {
          requested: n,
        }),
      },
    );
  await assertMarketplaceNameUsable(e, n, r, {
    known: known_2,
    isSelf,
    source,
  });
}
//@ chunk-e6aww6q8.js:4227130-4227727 placement
async function assertMarketplaceNameUsable(e, n, r, { known, isSelf, source }) {
  let marketplaceSourceRank = findMarketplaceSourceRank(n, source);
  if (
    marketplaceSourceRank !== undefined &&
    marketplaceSourceRank <= (findMarketplaceRepoRank(n, source) ?? 1 / 0)
  )
    return;
  let w = known ?? (await loadKnownMarketplacesWithDeclared(r));
  let marketplaceDirOwner = findMarketplaceDirOwner(
    n,
    e,
    w,
    r,
    (G) => isSelf(G) || isSameGithubMarketplace(G, w, source, r),
  );
  if (marketplaceDirOwner !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Can't use the marketplace name ${jsonStringify(n)}: the registered marketplace ${jsonStringify(marketplaceDirOwner.owner)} downloads from GitHub into the folder ${jsonStringify(marketplaceDirOwner.folder)}${marketplaceDirOwner.backup ? ` and moves it to ${jsonStringify(`${marketplaceDirOwner.folder}.bak`)} while it downloads again` : ""}, so a marketplace named ${jsonStringify(n)} would stop ${jsonStringify(marketplaceDirOwner.owner)} from downloading. Ask the author of ${jsonStringify(n)} to rename it.`,
      "marketplace name is the clone folder of a registered marketplace",
    );
}
//@ chunk-e6aww6q8.js:4227727-4227857 placement
function findMarketplaceSourceRank(e, source) {
  return findMarketplaceSourceIndex(
    (r, s) =>
      sameMarketplaceName(r, e) &&
      s?.source?.source === source.source &&
      (source.source === "github" ? isSourceConsistentWith(source, s.source) : En(source, s.source)),
  );
}
//@ chunk-e6aww6q8.js:4227857-4228112 placement
function findMarketplaceRepoRank(e, source) {
  let r = source.source === "github" ? source.repo.toLowerCase() : undefined;
  return findMarketplaceSourceIndex((s, h) => {
    if (
      h?.source?.source !== "github" ||
      typeof h.source.repo !== "string" ||
      h.source.repo.toLowerCase() === r
    )
      return false;
    let cachePathForSource = getCachePathForSource(h.source);
    return sameMarketplaceName(cachePathForSource, e) || sameMarketplaceName(`${cachePathForSource}.bak`, e);
  });
}
//@ chunk-e6aww6q8.js:4228112-4228275 placement
function findMarketplaceSourceIndex(e) {
  let n = new Map(getNonRepoExtraMarketplaces().map((s) => [s.source, s.extras]));
  let index = sorted.findIndex((s) => Object.entries(n.get(s) ?? {}).some(([key, value]) => e(key, value)));
  return index === -1 ? undefined : index;
}
//@ chunk-e6aww6q8.js:4228275-4228432 placement
function githubRepoDirName(e, marketplaceEntry) {
  return marketplaceEntry?.source?.source === "github" &&
    typeof marketplaceEntry.source.repo === "string" &&
    seedDirFor(marketplaceEntry.installLocation) === undefined &&
    validateReservedMarketplaceEntry(e, marketplaceEntry) === null
    ? getCachePathForSource(marketplaceEntry.source)
    : undefined;
}
//@ chunk-e6aww6q8.js:4228432-4228901 placement
function findMarketplaceDirOwner(e, n, r, s, h) {
  for (let w of RESERVED_MARKETPLACE_NAMES) if (isFoldedSpellingOf(e, w)) return;
  let y = listMarketplaceNames(r, s);
  let filtered = y.filter((w) => !h(w));
  for (let w of [false, true]) {
    let L = findByMarketplaceName(e, filtered, (ke) => {
      let we = githubRepoDirName(ke, getMarketplaceEntry(r, ke, s));
      return we === undefined ? [] : [w ? `${we}.bak` : we];
    });
    if (L === undefined) continue;
    let marketplaceEntry = getMarketplaceEntry(r, L, s);
    let q = githubRepoDirName(L, marketplaceEntry);
    let Z = marketplaceDirCandidates(r, s, n);
    let any = y.some((ke) => {
      let marketplaceEntry_2 = getMarketplaceEntry(r, ke, s);
      return (
        marketplaceEntry_2 !== undefined &&
        !isLocalMarketplaceSource(marketplaceEntry_2.source) &&
        !(marketplaceEntry !== undefined && isSameGithubMarketplace(ke, r, marketplaceEntry.source, s)) &&
        findByMarketplaceName(e, [ke], Z) !== undefined
      );
    });
    return q === undefined || any
      ? undefined
      : {
          owner: L,
          folder: q,
          backup: w,
        };
  }
  return;
}
//@ chunk-e6aww6q8.js:4228901-4228942 placement
function isOtherSameMarketplaceName(e, n) {
  return e !== n && sameMarketplaceName(e, n);
}
//@ chunk-e6aww6q8.js:4228942-4229024 placement = setCwdState (1)
function sameNfcAs(e, selfKey) {
  let normalized = (selfKey ?? e).normalize("NFC");
  return (s) => s.normalize("NFC") === normalized;
}
//@ chunk-e6aww6q8.js:4229024-4229176 placement
async function assertMarketplaceNameAvailable(cacheDir, name, r, { ownEntry, known, selfKey, source }) {
  await assertMarketplaceNameNotCaseFolded(cacheDir, name, r, {
    known,
    selfKey,
    source,
  });
  await assertMarketplaceDirFree(cacheDir, name, r, {
    ownEntry,
    selfKey,
  });
}
//@ chunk-e6aww6q8.js:4229176-4229703 placement
async function assertMarketplaceDirFree(e, n, r, { knownAlready, ownEntry, selfKey } = {}) {
  let dirCollisionInCache = await findDirCollisionInCache(e, n, ownEntry);
  if (dirCollisionInCache === undefined) return;
  let w = knownAlready ?? (await loadKnownMarketplacesWithDeclared(r));
  let L = sameNfcAs(n, selfKey);
  let G = listMarketplaceNames(w, r);
  let q = marketplaceDirCandidates(w, r, e);
  if (findByMarketplaceName(dirCollisionInCache, G.filter(L), q) !== undefined) return;
  let Z = findByMarketplaceName(
    dirCollisionInCache,
    G.filter((Se) => !L(Se)),
    q,
  );
  if (Z !== undefined)
    throw new MarketplaceError(
      formatNameCollisionMessage(n, Z),
      "marketplace name case-folds onto a registered sibling",
      {
        kind: "name_taken",
        name: Z,
        ...(isOtherSameMarketplaceName(n, Z) && {
          requested: n,
        }),
      },
    );
  logForDebugging(
    `Clearing stale case-variant marketplace directory ${jsonStringify(dirCollisionInCache)} (unregistered) before publishing ${jsonStringify(n)}`,
    {
      level: "warn",
    },
  );
  await removeDirectoryTreeNoFollow_2(join(e, dirCollisionInCache));
}
//@ chunk-e6aww6q8.js:4229703-4229973 placement
async function findMarketplaceNameOwner(e, n, r, { known, isSelf = () => false } = {}) {
  let y = await hasDanglingSymlinkAncestor(e, n);
  if (y === undefined && known === undefined)
    return {
      owner: undefined,
      known,
    };
  let S = known ?? (await loadKnownMarketplacesWithDeclared(r));
  let filtered = listMarketplaceNames(S, r).filter((q) => !isSelf(q, S));
  let L = marketplaceDirCandidates(S, r, e);
  return {
    owner:
      findByMarketplaceName(n, filtered, L) ??
      (y === undefined ? undefined : await getFileIdentity_7(e, n, y, filtered, L)),
    known: S,
  };
}
//@ chunk-e6aww6q8.js:4229973-4230032 placement
function getMarketplaceEntry(e, n, r) {
  return Object.hasOwn(e, n) ? e[n] : hiddenRegistryEntryFor(n, r);
}
//@ chunk-e6aww6q8.js:4230032-4230313 placement
function marketplaceDirCandidates(e, n, r) {
  return (s) => {
    let h = [s, `${s}.json`, `${s}.bak`];
    let marketplaceEntry = getMarketplaceEntry(e, s, n);
    if (marketplaceEntry !== undefined && typeof marketplaceEntry.installLocation === "string") {
      let S = resolve_2(getOriginalCwd(), marketplaceEntry.installLocation);
      let w = relative(r, S);
      let L = isSubpathOf(r, S, false) ? w.split(/[\\/]/)[0] : undefined;
      if (L !== undefined && isValidMarketplaceDirName(L) && !h.includes(L)) h.push(L, `${L}.bak`);
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
  let normalized = e.normalize("NFC");
  let normalized_2 = n.normalize("NFC");
  return (
    normalized === normalized_2 || normalizePathSegment(normalized) === normalizePathSegment(normalized_2)
  );
}
//@ chunk-e6aww6q8.js:4230469-4230546 placement
function listMarketplaceNames(e, n) {
  return [...Object.keys(e), ...hiddenRegistryEntries()[getStorageArm(n)].keys()].filter(
    isValidMarketplaceDirName,
  );
}
//@ chunk-e6aww6q8.js:4230546-4231041 placement
/**
 * 检查克隆目录名是否落到另一个已注册市场的目录上：是则抛错（让用户先删除或改名）； 否则再按“非同一 github 仓库”查一次，返回是否存在冲突。
 */
async function checkCloneDirOwnedByOther(cacheDir, tempName, source, s) {
  let { owner, known } = await findMarketplaceNameOwner(cacheDir, tempName, s, {
    isSelf: (w, L) => isSameGithubMarketplace(w, L, source, s),
  });
  if (owner !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot fetch this marketplace: its clone directory name ${jsonStringify(tempName)} is the registered marketplace ${jsonStringify(owner)}'s directory. Remove or rename that marketplace first (claude plugin marketplace remove).`,
      "marketplace clone target is another registered marketplace directory",
    );
  if (known === undefined) return false;
  let { owner: owner_2 } = await findMarketplaceNameOwner(cacheDir, tempName, s, {
    known,
    isSelf: (w, L) => !isSameGithubMarketplace(w, L, source, s),
  });
  return owner_2 !== undefined;
}
//@ chunk-e6aww6q8.js:4231041-4231199 placement
function isSameGithubMarketplace(e, n, r, s) {
  let marketplaceEntry = getMarketplaceEntry(n, e, s);
  return (
    marketplaceEntry !== undefined &&
    marketplaceEntry.source.source === "github" &&
    r.source === "github" &&
    marketplaceEntry.source.repo.toLowerCase() === r.repo.toLowerCase()
  );
}
//@ chunk-e6aww6q8.js:4231199-4231584 placement
/**
 * 两个市场名折叠到同一 marketplaces/ 目录、拒绝发布的提示。
 */
function formatNameCollisionMessage(e, n) {
  return `Marketplace name ${jsonStringify(e)} collides with the registered marketplace ${jsonStringify(n)}: the two names fold onto one marketplaces/ entry (the same key up to letter case and filesystem-ignorable characters, or the same directory on this filesystem); refusing to publish over it. Remove that marketplace first (claude plugin marketplace remove), or ask the author to rename.`;
}
//@ chunk-e6aww6q8.js:4231584-4231766 placement
async function findDirCollisionInCache(e, n, ownEntry) {
  let s;
  try {
    s = (await getFsImplementation().readdir(e)).map((h) => h.name);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw error;
  }
  return findSameDirAmong(
    e,
    n,
    s.filter((h) => h !== ownEntry),
  );
}
//@ chunk-e6aww6q8.js:4231766-4231897 placement
async function findSameDirIdentity(resolvedMarketplacesCacheDir, n, r, s) {
  let filtered = r.filter(isValidMarketplaceDirName);
  if (filtered.length === 0) return;
  let y = await hasDanglingSymlinkAncestor(resolvedMarketplacesCacheDir, n);
  return y === undefined ? undefined : getFileIdentity_7(resolvedMarketplacesCacheDir, n, y, filtered, s);
}
//@ chunk-e6aww6q8.js:4231897-4232012 placement
async function findSameDirAmong(e, n, r) {
  if (!r.some((h) => h !== n)) return;
  let s = await hasDanglingSymlinkAncestor(e, n);
  return s === undefined ? undefined : getFileIdentity_7(e, n, s, r);
}
//@ chunk-e6aww6q8.js:4232012-4232145 placement = isRealPathWithinTeamDir (0.77)
async function hasDanglingSymlinkAncestor(e, n) {
  try {
    return await lstat(join(e, n), {
      bigint: true,
    });
  } catch (e) {
    let code = getErrnoCode(e);
    if (code === "ENOENT" || code === "ENOTDIR") return;
    throw e;
  }
}
//@ chunk-e6aww6q8.js:4232145-4232442 placement = getFileIdentity (0.778)
async function getFileIdentity_7(e, n, r, s, h = (y) => [y]) {
  for (let y of s) {
    if (y === n) continue;
    for (let S of h(y)) {
      if (S === n) continue;
      try {
        let stats = await lstat(join(e, S), {
          bigint: true,
        });
        if (
          r.ino !== 0n && stats.ino !== 0n
            ? stats.dev === r.dev && stats.ino === r.ino
            : normalizePathSegment(S) === normalizePathSegment(n)
        )
          return y;
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") throw error;
      }
    }
  }
  return;
}
//@ chunk-e6aww6q8.js:4232442-4233013 placement
/**
 * 删除市场缓存（目录、.bak 目录与 .json 文件）；名字不是普通目录名时跳过； 若这些路径在本文件系统上其实是另一个已注册市场的目录则不删并记 warn。
 */
async function removeMarketplaceCacheFiles(e, n, r) {
  if (!isValidMarketplaceDirName(e)) {
    logForDebugging(
      `Not removing cache files for marketplace name ${jsonStringify(e)}: not a plain directory name`,
      {
        level: "warn",
      },
    );
    return;
  }
  let resolvedMarketplacesCacheDir = getResolvedMarketplacesCacheDir();
  let h = join(resolvedMarketplacesCacheDir, e);
  let y = async (w) =>
    findByMarketplaceName(w, n, r) ??
    (await findSameDirIdentity(resolvedMarketplacesCacheDir, w, n, r)) ??
    (await findDirCollisionInCache(resolvedMarketplacesCacheDir, w).then((dirCollisionInCache) =>
      dirCollisionInCache === undefined ? undefined : findByMarketplaceName(dirCollisionInCache, n, r),
    ));
  let S = await y(e);
  if (S !== undefined) {
    logForDebugging(
      `Not removing cache files for marketplace ${jsonStringify(e)}: on this filesystem they are the registered marketplace ${jsonStringify(S)}'s directory`,
      {
        level: "warn",
      },
    );
    return;
  }
  await removeDirectoryTreeNoFollow_2(h);
  if ((await y(`${e}.bak`)) === undefined) await removeDirectoryTreeNoFollow_2(`${h}.bak`);
  if ((await y(`${e}.json`)) === undefined)
    await removePathEntry(join(resolvedMarketplacesCacheDir, `${e}.json`));
}
//@ chunk-f3qhjfah.js:6714-6902 placement
/**
 * plugins/data 下大小写不敏感匹配插件的数据目录。
 */
async function findPluginDataDirs(e) {
  let n = join(getPluginsDirectory(), "data");
  let lower = pluginIdToDirName(e).toLowerCase();
  try {
    return (await readdir(n)).filter((s) => s.toLowerCase() === lower).map((s) => join(n, s));
  } catch (error) {
    return isENOENT(error) || getErrnoCode(error) === "ENOTDIR" ? [] : undefined;
  }
}
//@ chunk-f3qhjfah.js:6902-6956 placement
async function isMarketplaceGone(e) {
  return (await pathPresence(pluginDataDirPath(e))) === "gone";
}
//@ chunk-f3qhjfah.js:6956-6966 placement
var FLAG_SAFE_DEFAULT = true;
//@ chunk-f3qhjfah.js:6966-7001 placement
/**
 * managedMarketplaceAnswerFlag：托管设置下的市场名答复开关。
 */
var managedMarketplaceAnswerFlag = () =>
  hasManagedSettings() &&
  readFlagWithOverride(TENGU_STEADY_BITTERN, {
    safe: FLAG_SAFE_DEFAULT,
  });
//@ chunk-f3qhjfah.js:7001-7056 placement
/**
 * marketplaceNameAnswerState：市场名检查的答复状态。
 */
var marketplaceNameAnswerState = () =>
  managedMarketplaceAnswerFlag()
    ? isRemoteManagedSettingsVerified()
      ? "answered"
      : "unanswered"
    : "unasked";
//@ chunk-f3qhjfah.js:7056-7302 placement
function reservedMarketplaceNameError(marketplace) {
  if (impersonationCheckDisabled())
    return `Claude Code won't load marketplace "${quotedPrintable(marketplace)}": its name looks like the name of one of Anthropic's own marketplaces`;
  return `Claude Code refuses the marketplace name "${quotedPrintable(marketplace)}": it looks like one of Anthropic's own`;
}
//@ chunk-f3qhjfah.js:7302-7372 placement
function marketplaceLoadFailedMessage(e, n) {
  return `Failed to load marketplace "${quotedPrintable(e)}": ${n}`;
}
//@ chunk-f3qhjfah.js:7372-7396 placement
/**
 * impersonationCheckDisabled：恒 false（冒充检查占位）。
 */
function impersonationCheckDisabled() {
  return false;
}
//@ chunk-f3qhjfah.js:7396-7406 placement
var MAX_MARKETPLACE_NAME_LOOSE = 64;
//@ chunk-f3qhjfah.js:7406-7571 placement
function formatRemoveMarketplaceHint(e, n = "it") {
  let r = e.length <= MAX_MARKETPLACE_NAME_LOOSE ? claudeCommand("plugin marketplace remove", e) : null;
  return r === null ? `Remove ${n} in /plugin \u2192 Marketplaces` : `Remove ${n} with: ${r}`;
}
//@ chunk-f3qhjfah.js:7571-8530 placement
/**
 * 删除/改名仿冒市场的各段说明文字。
 */
var REMOVE_ALSO_UNINSTALLS_NOTE =
  "this also uninstalls its plugins and deletes their data, options and secrets";
var RENAME_INSTEAD_NOTE = "if its maintainer renames it, update it instead";
var REMOVE_ONLY_FIX_LINES = [
  "Removing it is the only fix. That also uninstalls its plugins and deletes what they saved:",
  "their data, options and secrets.",
];
var READD_AFTER_REMOVE_NOTE =
  "After removing it, you can add it again from the same source; if that is refused, its maintainer has to rename it first.";
var SETTINGS_RENAME_STEPS = [
  "It was added from a settings file. To keep it, do these in order (if your organization's managed settings add it, an administrator does step 1):",
  "1. In each settings file that lists it under extraKnownMarketplaces, rename its entry (the key and its source.name) to a plain-ASCII name that doesn't look like one of Anthropic's.",
];
var REMOVE_ALSO_UNINSTALLS_PAREN =
  "(this also uninstalls its plugins and deletes their data, options and secrets).";
var RESTART_STEP =
  "3. Start Claude Code again, in that project's folder if it is a project's settings file, then install its plugins from the renamed one.";
//@ chunk-f3qhjfah.js:8530-8593 placement
function renameMarketplaceSteps(e) {
  return [
    ...SETTINGS_RENAME_STEPS,
    `2. ${formatRemoveMarketplaceHint(e, "the old name")}`,
    REMOVE_ALSO_UNINSTALLS_PAREN,
    RESTART_STEP,
  ];
}
//@ chunk-f3qhjfah.js:8593-8630 placement
function removeMarketplaceFixSteps(e) {
  return [...REMOVE_ONLY_FIX_LINES, READD_AFTER_REMOVE_NOTE, formatRemoveMarketplaceHint(e)];
}
//@ chunk-f3qhjfah.js:8630-8840 placement
function marketplaceRemovalAdvice(e, n = {}) {
  if (n.declaredInSettings === true) return `Reloading won't help. ${renameMarketplaceSteps(e).join(" ")}`;
  if (impersonationCheckDisabled()) return `Reloading won't help. ${removeMarketplaceFixSteps(e).join(" ")}`;
  return `Reloading won't help. ${formatRemoveMarketplaceHint(e)} (${REMOVE_ALSO_UNINSTALLS_NOTE}; ${RENAME_INSTEAD_NOTE})`;
}
//@ chunk-f3qhjfah.js:8840-9256 placement
function reservedMarketplaceNameMessage(e, n = {}) {
  let r = impersonationCheckDisabled();
  let s = r
    ? [
        `Claude Code won't load marketplace "${quotedPrintable(e)}":`,
        "its name looks like the name of one of Anthropic's own marketplaces. Reloading won't help.",
      ]
    : [
        `Claude Code refuses the marketplace name "${quotedPrintable(e)}":`,
        "it looks like one of Anthropic's own. Reloading won't help.",
      ];
  if (n.declaredInSettings === true) return [...s, ...renameMarketplaceSteps(e)];
  if (r) return [...s, ...removeMarketplaceFixSteps(e)];
  return [
    ...s,
    formatRemoveMarketplaceHint(e),
    `(${REMOVE_ALSO_UNINSTALLS_NOTE};`,
    `${RENAME_INSTEAD_NOTE}).`,
  ];
}
//@ chunk-f3qhjfah.js:9256-9679 placement
/**
 * RESERVED_MARKETPLACE_RENAME_MESSAGE：保留名需改名的说明。
 */
var RESERVED_MARKETPLACE_NAME_MESSAGE =
  "Claude Code refuses this marketplace's name: it looks like one of Anthropic's own. Reloading won't help. Remove it in /plugin \u2192 Marketplaces (deletes its plugins and their data, options and secrets).";
var RESERVED_MARKETPLACE_RENAME_MESSAGE =
  "Claude Code refuses this marketplace's name: it looks like one of Anthropic's own. Rename it in its settings file, remove the old name in /plugin \u2192 Marketplaces (plugins and data go), then restart.";
//@ chunk-f3qhjfah.js:9679-9711 placement
function reservedNameMessage(e) {
  return e ? RESERVED_MARKETPLACE_RENAME_MESSAGE : RESERVED_MARKETPLACE_NAME_MESSAGE;
}
//@ chunk-f3qhjfah.js:9711-9811 placement
var formatOnlyWhileDisabledHint = (e, heldBy) =>
  `${e} only while "${quotedPrintable(heldBy)}" is disabled. Disable or uninstall the copy you don't need`;
//@ chunk-f3qhjfah.js:9811-10203 placement
var MARKETPLACE_SOURCE_FIX_HINTS = {
  "network-location":
    "re-add the marketplace (one added from a folder or file must be re-added from a copy on this computer), or, to trust a folder on a network drive, declare it under extraKnownMarketplaces in user or managed settings",
  source: "re-add the marketplace with a supported source",
  declaration: "re-add the marketplace from the source that entry lists, or change the entry",
};
//@ chunk-f3qhjfah.js:10203-10283 placement
/**
 * pluginAvailabilitySchema：插件可用性状态 schema。
 */
var PLUGIN_AVAILABILITY_STATES = ["available", "required", "auto_install", "not_available"];
var pluginAvailabilitySchema = DoctorLazy(() => _enum(PLUGIN_AVAILABILITY_STATES));
//@ chunk-f3qhjfah.js:10283-10330 placement
/**
 * parsePluginAvailability：解析插件可用性状态。
 */
function parsePluginAvailability(installationPreference) {
  return pluginAvailabilitySchema().safeParse(installationPreference).data;
}
//@ chunk-f3qhjfah.js:10330-10464 placement
/**
 * pluginOriginSchema：插件来源种类 schema。
 */
var PLUGIN_ORIGIN_KINDS = [
  "anthropic_catalog",
  "other_catalog",
  "account_uploads",
  "account_marketplace",
  "org_library",
  "org_marketplace",
];
var pluginOriginSchema = DoctorLazy(() => _enum(PLUGIN_ORIGIN_KINDS));
//@ chunk-f3qhjfah.js:10464-10511 placement
/**
 * parsePluginOriginKind：解析插件来源种类。
 */
function parsePluginOriginKind(marketplaceKind) {
  return pluginOriginSchema().safeParse(marketplaceKind).data;
}
//@ chunk-f3qhjfah.js:10511-11085 placement
function marketplaceListingChangedMessage(
  pluginId,
  directoryRenamedTo,
  r,
  directoryNotInstallableReason,
  a = false,
) {
  {
    let c = quotedPrintable(pluginId);
    let l =
      directoryRenamedTo && directoryRenamedTo.length > 0
        ? `now lists it as ${directoryRenamedTo.map((g) => quotedPrintable(g)).join(" or ")}`
        : directoryNotInstallableReason !== undefined
          ? `still lists it, but Claude Code cannot install it (${quotedPrintable(directoryNotInstallableReason)})`
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
function isMarketplaceLoadError(error) {
  return (
    error.type === "marketplace-load-failed" &&
    error.reason === "cache-miss" &&
    error.marketplace === OFFICIAL_MARKETPLACE_NAME &&
    error.directoryBlockedBy === undefined
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
    e.registrationHidden !== undefined
  ) {
    let n = removeMarketplaceCommand(e.marketplace);
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
function pluginBlockSource(error) {
  if (error.directoryDisabledByOrganization) return "managed_setting";
  if (error.marketplace !== OFFICIAL_MARKETPLACE_NAME || error.sourceUnverifiable) return null;
  return error.blockedByBlocklist ? "blocklist" : "allowlist";
}
//@ chunk-f3qhjfah.js:12217-12448 placement
function directoryBlockedMessage(e, n) {
  {
    let r = policyBlockReason(n);
    let s =
      e === undefined
        ? "The Anthropic Directory is blocked by your organization"
        : `Plugin "${quotedPrintable(e)}" is not loaded: the Anthropic Directory is blocked by your organization`;
    return r === "" ? s : `${s}. ${r}`;
  }
  return "";
}
//@ chunk-f3qhjfah.js:12448-13261 placement
/**
 * PLUGIN_FAILURE_RETRYABLE：各插件失败码是否可重试。
 */
var NOT_RECORDED = "(not recorded)";
var PLUGIN_FAILURE_RETRYABLE = {
  "path-not-found": false,
  "path-traversal": false,
  "mcp-config-invalid": false,
  "lsp-config-invalid": false,
  "hook-load-failed": false,
  "component-load-failed": false,
  "mcpb-download-failed": false,
  "mcpb-extract-failed": false,
  "mcpb-invalid-manifest": false,
  "lsp-server-start-failed": false,
  "lsp-server-crashed": false,
  "lsp-request-timeout": false,
  "lsp-request-failed": false,
  "plugin-not-installed": false,
  "marketplace-blocked-by-policy": false,
  "autoupdate-blocked-by-pinner": false,
  "autoupdate-deferred-entry-helper": false,
  "autoupdate-disabled-by-policy": false,
  "plugin-cache-miss": true,
  "generic-error": true,
  "manifest-parse-error": true,
  "manifest-validation-error": true,
  "marketplace-not-found": true,
  "marketplace-load-failed": true,
  "plugin-not-found": true,
  "git-auth-failed": true,
  "git-timeout": true,
  "network-error": true,
  "dependency-unsatisfied": true,
  "dependency-version-unsatisfied": true,
};
//@ chunk-f3qhjfah.js:13261-13862 placement
/**
 * 把插件加载错误（path-not-found、plugin-not-installed、marketplace-load-failed…）转成一行用户可读说明。
 */
function pluginErrorSummary(error) {
  if (error.type === "path-not-found") return error.plugin === undefined && error.errno !== undefined;
  if (error.type === "plugin-not-installed")
    return error.seedHasOtherVersion === true || error.registryReadFailed === true;
  if (error.type === "generic-error") return error.orphan !== true && error.refused !== true;
  if (error.type === "marketplace-load-failed")
    return (
      error.untrustedReservedName !== true &&
      error.nameRefused !== true &&
      error.directoryBlockedBy === undefined
    );
  if (error.type === "marketplace-not-found")
    return error.registrationHidden === undefined || error.registrationHidden === "network-location";
  if (error.type === "plugin-not-found")
    return error.removedFromDirectory !== true || error.registryReadFailed === true;
  return PLUGIN_FAILURE_RETRYABLE[error.type];
}
//@ chunk-f3qhjfah.js:13862-13962 placement
function isDependencyError(e) {
  return e.type === "dependency-unsatisfied" || e.type === "dependency-version-unsatisfied";
}
//@ chunk-k2t0a8ve.js:230-263 placement
var isOfficialMarketplaceRef = (pluginStorageId) => pluginStorageId.endsWith(`@${BUILTIN}`);
//@ chunk-k2t0a8ve.js:263-339 placement
function hasSimilarMarketplaceName(o, e) {
  let t = nfcLower(o);
  return [...(e ?? [])].some((r) => !isOfficialMarketplaceRef(r) && nfcLower(r) === t);
}
export {
  isOfficialMarketplaceRef,
  hasSimilarMarketplaceName,
  marketplaceNameAnswerState,
  pluginErrorSummary,
  getResolvedMarketplacesCacheDir,
  reservedMarketplaceNameError,
  marketplaceLoadFailedMessage,
  marketplaceRemovalAdvice,
  isDependencyError,
  NOT_RECORDED,
  managedMarketplaceAnswerFlag,
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
  impersonationCheckDisabled,
  reservedNameMessage,
  getMarketplaceStorageLocation,
  RESERVED_MARKETPLACE_NAME_MESSAGE,
  pluginAvailabilitySchema,
  pluginOriginSchema,
  findPluginDataDirs,
  MARKETPLACE_SOURCE_FIX_HINTS,
  marketplaceListingChangedMessage,
  pluginBlockSource,
  formatOnlyWhileDisabledHint,
  parsePluginAvailability,
  parsePluginOriginKind,
  policyBlockReason,
};
