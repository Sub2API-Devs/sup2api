/**
 * utils/settings/settingsPrime.ts
 *
 * 2.1.316 新增。启动时通过存储后端预读设置各层，后续读取复用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5x106wnr.js (29)
 * attribution: placement 29
 */
import { basename, join, dirname } from "path";
import {
  getSettingsFilePathForSource,
  getSettingsWithErrors_2,
  projectSettingsAliasesUserSettings,
  getLegacyLocalSettingsFilePath,
  localSettingsStoreRootAwaitingOwnershipProbe,
} from "./settings.js";
import {
  USER_SETTINGS_FILE_NAMES,
  logMissingSettingsFile,
  missingSettingsFileResult,
} from "./settingsFileParsing.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import {
  readSettingsSeed,
  seedOutcomeLabel,
  seedUserSettings as seedUserSettings_2,
  userSettingsSeedRead,
  projectSettingsSeedRead,
  managedSettingsSeedRead,
  listManagedDropIns,
} from "./settingsSeed.js";
import { isDiskless } from "../hostScoped.js";
import { logError } from "../log.js";
import { primeRemoteManagedSettingsCache } from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { commandSyncNameState, invalidateCommandNames } from "./commandSyncNames.js";
import { managedFileSettingsDirs } from "./managedFileSettings.js";
import { wslInheritsSettings } from "./mdm/settings.js";
import { PathSpace } from "../resultError.js";

//@ chunk-5x106wnr.js:598-610 placement
var MAX_SETTINGS_PRIME_ATTEMPTS = 3;
var SETTINGS_PRIME_BACKOFF_FACTOR = 8;
//@ chunk-5x106wnr.js:610-694 placement = _temp5 (1)
function userSettingsFilePath() {
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  return settingsFilePathForSource !== undefined &&
    basename(settingsFilePathForSource) === USER_SETTINGS_FILE_NAMES.default
    ? settingsFilePathForSource
    : undefined;
}
//@ chunk-5x106wnr.js:694-878 placement
async function seedUserSettings(backend, e) {
  if (!isStorageV5Enabled()) return;
  let epoch = e.epoch;
  await Promise.all([
    seedUserSettingsUnchecked(backend, e),
    primeRootOwnershipSafely(backend, e),
    trySeed("managed-settings file tier", () => refreshManagedTier(backend, e, epoch)),
  ]);
  await trySeed("project/local layers", () => primeProjectLayers(backend, e, e.epoch));
}
//@ chunk-5x106wnr.js:878-1023 placement
async function trySeed(s, e) {
  try {
    await e();
  } catch (error) {
    logForDebugging(
      `settingsPrime: start-up seed of the ${s} failed: ${errorMessage(error)}; the file reads serve`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-5x106wnr.js:1023-1197 placement
/**
 * 安全预读根所有权
 */
async function primeRootOwnershipSafely(s, e) {
  try {
    await primeRootOwnership_2(s, e);
  } catch (error) {
    logForDebugging(
      `settingsPrime: ownership read-ahead for the local settings root failed: ${errorMessage(error)}; the probe runs as today`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-5x106wnr.js:1197-1855 placement
/**
 * 预读用户设置
 */
async function seedUserSettingsUnchecked(s, e) {
  try {
    let i = userSettingsFilePath();
    if (i === undefined) return;
    if (e.parsedFiles.has(i)) {
      logForDebugging("settingsPrime: user settings already read before start-up; seed skipped");
      return;
    }
    let epoch = e.epoch;
    let settingsSeed = await readSettingsSeed(s, i);
    if (settingsSeed.kind === "absent") {
      logMissingSettingsFile(i);
      if (e.seedParsedFile(i, "userSettings", missingSettingsFileResult(), epoch))
        logForDebugging("settingsPrime: user settings absent; seeded as none");
      return;
    }
    if (settingsSeed.kind !== "seeded") {
      logForDebugging(
        `settingsPrime: start-up seed skipped (${seedOutcomeLabel(settingsSeed)}); the file read serves`,
      );
      return;
    }
    if (e.seedParsedFile(i, "userSettings", settingsSeed.parsed, epoch))
      logForDebugging(`settingsPrime: user settings seeded at start-up (${settingsSeed.size} bytes)`);
  } catch (error) {
    logForDebugging(`settingsPrime: start-up seed failed: ${errorMessage(error)}; the file read serves`, {
      level: "warn",
    });
  }
}
//@ chunk-5x106wnr.js:1855-5498 placement
/**
 * 设置预读器
 */
class SettingsPrimer {
  storageV5;
  store;
  inFlight = null;
  followUpQueued = false;
  disposed = false;
  state = {
    kind: "unprimed",
  };
  consecutiveThrows = 0;
  runsInState = 0;
  loggedThrowMessages = new Set();
  loggedOwnershipThrowMessages = new Set();
  loggedHostFilesThrowMessages = new Set();
  unsubscribe;
  constructor(storageV5, e) {
    this.storageV5 = storageV5;
    this.store = e;
    this.unsubscribe = e.onInvalidate(() => {
      if (!this.disposed) {
        this.seedAttestedTier();
        this.keepUserLayer();
        this.schedule();
      }
    });
    this.seedAttestedTier();
    this.schedule();
  }
  keepUserLayer() {
    let lastSeededUserLayer = isDiskless() ? this.store.lastSeededUserLayer : undefined;
    if (lastSeededUserLayer !== undefined)
      this.store.seedParsedFile(
        lastSeededUserLayer.path,
        "userSettings",
        lastSeededUserLayer.parsed,
        this.store.epoch,
      );
  }
  seedAttestedTier() {
    try {
      attestedManagedLayers(this.storageV5, this.store, this.store.epoch);
    } catch (error) {
      this.logThrowOnce(error, this.loggedHostFilesThrowMessages);
    }
  }
  schedule() {
    if (this.inFlight !== null) {
      this.followUpQueued = true;
      return;
    }
    this.inFlight = this.run().finally(() => {
      if (this.disposed) return;
      this.inFlight = null;
      if (this.followUpQueued) {
        this.followUpQueued = false;
        this.schedule();
      }
    });
  }
  async run() {
    let s = readRootOwnershipAhead(this.storageV5, this.store).then(
      (rootOwnershipAhead) => {
        this.loggedOwnershipThrowMessages.clear();
        return rootOwnershipAhead;
      },
      (error) => {
        if (!this.disposed) this.logThrowOnce(error, this.loggedOwnershipThrowMessages);
        return;
      },
    );
    try {
      let epoch = this.store.epoch;
      try {
        let r = userSettingsFilePath();
        if (r !== undefined) {
          if (!(await this.seedFromBackend(r, epoch))) return;
        }
      } catch (error) {
        if (!this.disposed) this.onThrow(error);
        return;
      }
      let i = await s;
      if (this.disposed) return;
      primeRootOwnership(this.store, i);
      if (
        (
          await Promise.all([
            this.seedLogged(epoch, primeProjectLayers),
            this.seedLogged(epoch, refreshManagedTier),
          ])
        ).includes(false)
      )
        return;
      this.consecutiveThrows = 0;
      try {
        getSettingsWithErrors_2();
        this.loggedThrowMessages.clear();
      } catch (error) {
        if (!this.disposed) this.logThrowOnce(error);
      }
    } finally {
      await s;
    }
  }
  async seedLogged(s, e) {
    try {
      return await e(this.storageV5, this.store, s);
    } catch (error) {
      if (!this.disposed) this.logThrowOnce(error, this.loggedHostFilesThrowMessages);
      return this.store.epoch === s && !this.disposed;
    }
  }
  async seedFromBackend(s, e) {
    let state = this.state;
    let settingsSeed = await readSettingsSeed(this.storageV5, s, state.kind === "seeded" ? state : undefined);
    if (this.store.epoch !== e || this.disposed) return false;
    if (settingsSeed.kind === "seeded") {
      this.store.seedParsedFile(s, "userSettings", settingsSeed.parsed, e);
      if (state.kind === "seeded" && state.contentHash === settingsSeed.contentHash) return true;
    } else if (settingsSeed.kind === "absent") {
      logMissingSettingsFile(s);
      this.store.seedParsedFile(s, "userSettings", missingSettingsFileResult(), e);
    }
    this.transition(settingsSeed);
    return true;
  }
  transition(s) {
    let state = this.state;
    this.state = s;
    if (
      state.kind === s.kind &&
      (s.kind !== "failing" || (state.kind === "failing" && state.code === s.code))
    ) {
      this.runsInState++;
      return;
    }
    if (state.kind === "failing" && s.kind === "seeded")
      logForDebugging(`settingsPrime: backend read recovered after ${this.runsInState} failing run(s)`);
    switch (((this.runsInState = 1), s.kind)) {
      case "seeded":
        logForDebugging(`settingsPrime: user settings seeded (${s.size} bytes)`);
        return;
      case "absent":
        logForDebugging("settingsPrime: user settings absent; served as none");
        return;
      case "oversize":
        logForDebugging(
          "settingsPrime: user settings not seeded (oversize); the last seed or the raw path serves",
        );
        return;
      case "failing":
        logForDebugging(
          `settingsPrime: backend read failed: ${s.code}${s.failureClass ? ` (${s.failureClass})` : ""}; the last seed or the raw path serves`,
          {
            level: "warn",
          },
        );
        return;
      case "unprimed":
      case "broken":
        return;
    }
  }
  onThrow(s) {
    this.consecutiveThrows++;
    this.state = {
      kind: "broken",
    };
    this.logThrowOnce(s);
    if (this.consecutiveThrows >= MAX_SETTINGS_PRIME_ATTEMPTS) {
      logForDebugging(
        `settingsPrime: disabled after ${MAX_SETTINGS_PRIME_ATTEMPTS} consecutive failures; the raw path serves from the next reset`,
        {
          level: "warn",
        },
      );
      this.dispose();
    }
  }
  logThrowOnce(s, e = this.loggedThrowMessages) {
    let i = errorMessage(s);
    if (e.has(i) || e.size >= SETTINGS_PRIME_BACKOFF_FACTOR) return;
    e.add(i);
    logError(s);
  }
  primes(s) {
    return this.storageV5 === s;
  }
  async whenIdle() {
    while (this.inFlight !== null || this.followUpQueued) await (this.inFlight ?? Promise.resolve());
  }
  dispose() {
    this.disposed = true;
    this.unsubscribe();
    this.inFlight = null;
    this.followUpQueued = false;
    if (this.store.primer === this) {
      this.store.primer = undefined;
      this.store.managedFileReads.clear();
      this.store.lastSeededUserLayer = undefined;
    }
  }
}
//@ chunk-5x106wnr.js:5498-5750 placement
/**
 * 启动时通过存储后端预读设置层（用户、项目、本地、托管），之后的设置读取直接用预读结果。
 */
async function primeSettings(storageV5, e) {
  if (!isStorageV5Enabled() || storageV5 === undefined) return;
  if (e.primer !== undefined) {
    if (!e.primer.primes(storageV5))
      logForDebugging("settingsPrime: store already primed through another backend; second prime ignored");
    return;
  }
  primeRemoteManagedSettingsCache(storageV5).catch(logError);
  e.primer = new SettingsPrimer(storageV5, e);
  await e.primer.whenIdle();
}
//@ chunk-5x106wnr.js:5750-5900 placement
async function resetSettingsCacheWithBackendRead(s) {
  let e = commandSyncNameState();
  let backendReadResetTail = e.backendReadResetTail;
  let n;
  e.backendReadResetTail = new Promise((resolve) => (n = resolve));
  await backendReadResetTail;
  try {
    return await primeAllSettings(s, e);
  } finally {
    n();
  }
}
//@ chunk-5x106wnr.js:5900-6195 placement
/**
 * 预读全部设置层
 */
async function primeAllSettings(s, e) {
  await e.primer?.whenIdle();
  if (e.primer !== undefined) await primeRootOwnershipSafely(s, e);
  let i =
    e.primer === undefined
      ? []
      : (
          await Promise.all([
            ...settingsPrimeReads(s).map((n) => seedUserSettings_2(e, n)),
            primeManagedTier(s, e),
          ])
        )
          .flat()
          .filter((n) => n !== undefined);
  invalidateCommandNames(
    i.length > 0
      ? {
          userLayer: "retain",
        }
      : undefined,
  );
  if (i.length === 0) return;
  return () => {
    for (let n of i) n();
  };
}
//@ chunk-5x106wnr.js:6195-6263 placement
function settingsPrimeReads(s) {
  let e = userSettingsFilePath();
  return [...(e === undefined ? [] : [userSettingsSeedRead(s, e)]), ...projectSettingsReads(s)];
}
//@ chunk-5x106wnr.js:6263-6587 placement
/**
 * 项目与本地设置读取任务
 */
function projectSettingsReads(s) {
  let e = [];
  for (let i of ["projectSettings", "localSettings"]) {
    if (i === "projectSettings" && projectSettingsAliasesUserSettings()) continue;
    let settingsFilePathForSource = getSettingsFilePathForSource(i);
    if (settingsFilePathForSource !== undefined)
      e.push(
        projectSettingsSeedRead(
          s,
          i,
          settingsFilePathForSource,
          i === "projectSettings" ? "project settings" : "local settings",
        ),
      );
    if (i === "localSettings") {
      let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
      if (
        legacyLocalSettingsFilePath !== undefined &&
        legacyLocalSettingsFilePath !== settingsFilePathForSource
      )
        e.push(projectSettingsSeedRead(s, i, legacyLocalSettingsFilePath, "legacy local settings"));
    }
  }
  return e;
}
//@ chunk-5x106wnr.js:6587-7783 placement
/**
 * 读托管设置文件层
 */
async function readManagedTier(s, e) {
  let hostFiles = s.hostFiles;
  if (!hostFiles.serves("system")) {
    if (!e.systemSpaceServingLogged) {
      e.systemSpaceServingLogged = true;
      logForDebugging(
        "settingsPrime: the managed-settings file tier is not read ahead (the backend does not serve 'system'); the policy walk reads the host's files itself",
      );
    }
    return;
  }
  let n = managedFileSettingsDirs(wslInheritsSettings());
  let walksAtReadStart = e.policyWalkCount;
  let mapped = n.map((u) =>
    managedSettingsSeedRead(s, join(u, "managed-settings.json"), "managed settings", e),
  );
  let [g, c] = await Promise.all([
    Promise.all(n.map((u) => listManagedDropIns(hostFiles, join(u, "managed-settings.d")))),
    Promise.all(mapped.map((u) => u.read())),
  ]);
  let o = {
    listings: [],
    unlisted: [],
    layers: [...mapped],
    walksAtReadStart,
  };
  let f = [];
  for (let [u, S] of n.entries()) {
    let p = g[u];
    let m = join(S, "managed-settings.d");
    if (p.kind === "failing") {
      logForDebugging(
        `settingsPrime: ${m} not listed through the backend (backend listing failed: ${p.code}${p.failureClass ? ` (${p.failureClass})` : ""}); the folder read serves`,
      );
      o.unlisted.push(m);
      continue;
    }
    if (p.names.length === 0) {
      logForDebugging(`settingsPrime: ${m} has no drop-ins to read ahead; the folder read confirms`);
      o.unlisted.push(m);
      continue;
    }
    o.listings.push({
      dir: m,
      names: p.names,
    });
    for (let j of p.names) f.push(managedSettingsSeedRead(s, join(m, j), "managed settings drop-in", e));
  }
  o.layers.push(...f);
  return {
    ...o,
    reads: Promise.all(f.map((u) => u.read())).then((u) => [...c, ...u]),
  };
}
//@ chunk-5x106wnr.js:7783-7934 placement
/**
 * 预读项目层
 */
async function primeProjectLayers(s, e, epoch) {
  let n = projectSettingsReads(s);
  if (n.length === 0) return true;
  let results = await Promise.all(n.map((a) => a.read()));
  if (e.epoch !== epoch) return false;
  installProjectLayers(e, n, results, epoch);
  return true;
}
//@ chunk-5x106wnr.js:7934-7958 placement
var L = Object.freeze([]);
//@ chunk-5x106wnr.js:7958-9054 placement
/**
 * 已证实的托管层
 */
function attestedManagedLayers(s, e, epoch) {
  if (s.hostFiles.serving("system") !== "absent" || e.systemAttestationContradicted) return;
  let mapped = managedFileSettingsDirs(wslInheritsSettings()).map((r) => ({
    dropInDir: join(r, "managed-settings.d"),
    basePath: join(r, "managed-settings.json"),
  }));
  if (mapped.some(({ basePath, dropInDir }) => e.walkReadManagedFileIn(basePath, dropInDir))) {
    e.systemAttestationContradicted = true;
    for (let { basePath, dropInDir } of mapped) {
      e.clearFolderListing(dropInDir, epoch);
      e.unseedParsedFile(basePath, "policySettings", epoch);
    }
    logError(
      Error(
        "settings: a managed-settings file was read from a folder the host attested absent ('system' space); the attestation is ignored for the rest of this process",
      ),
    );
    return;
  }
  if (!e.systemSpaceServingLogged) {
    e.systemSpaceServingLogged = true;
    logForDebugging(
      "settingsPrime: the host attests the 'system' space absent, so this machine's policy folder (or the one CLAUDE_CODE_MANAGED_SETTINGS_PATH names) is not read and the session has no managed-settings files",
    );
  }
  for (let { basePath, dropInDir } of mapped) {
    e.seedFolderListing(dropInDir, L, epoch);
    if (!e.walkRead(basePath))
      e.seedParsedFile(basePath, "policySettings", missingSettingsFileResult(), epoch);
  }
  return {
    listings: mapped.map(({ dropInDir }) => ({
      dir: dropInDir,
      names: L,
    })),
    layers: mapped.map(({ basePath }) => ({
      path: basePath,
      parsed: missingSettingsFileResult(),
    })),
  };
}
//@ chunk-5x106wnr.js:9054-9260 placement
/**
 * 刷新托管层
 */
async function refreshManagedTier(s, e, epoch) {
  if (attestedManagedLayers(s, e, epoch) !== undefined) return e.epoch === epoch;
  let managedTier = await readManagedTier(s, e);
  if (managedTier === undefined) {
    clearManagedSeeds(e, epoch);
    return true;
  }
  let reads = await managedTier.reads;
  if (e.epoch !== epoch) return false;
  let { verdicts } = installFolderListings(e, managedTier, epoch);
  installSeededLayers(e, managedTier, reads, verdicts, epoch);
  return true;
}
//@ chunk-5x106wnr.js:9260-10314 placement
/**
 * 安装预读的托管设置层
 */
function installSeededLayers(s, managedTier, reads, verdicts, r) {
  let a = [];
  let g = new Set();
  for (let [c, o] of managedTier.layers.entries()) {
    let f = reads[c];
    if (f.kind !== "seeded") {
      logForDebugging(`settingsPrime: ${o.label} not seeded (${seedOutcomeLabel(f)}); the file read serves`);
      s.managedFileReads.delete(o.path);
      s.unseedParsedFile(o.path, o.source, r);
      continue;
    }
    g.add(o.path);
    s.managedFileReads.set(o.path, {
      contentHash: f.contentHash,
      parsed: f.parsed,
    });
    let u = verdicts.get(dirname(o.path));
    let S =
      u !== undefined && u !== "install"
        ? u
        : s.policyInstallVerdict(o.path, f.parsed, managedTier.walksAtReadStart);
    if (S === "raced") {
      s.dropRetainedLayer(o.path);
      logForDebugging(
        `settingsPrime: ${o.label} not installed (the walk read different content while this read was in flight); re-verified next generation`,
      );
      continue;
    }
    if (S === "deferred") {
      logForDebugging(
        `settingsPrime: ${o.label} changed after this generation's policy walk; it applies from the next reset, as today`,
      );
      a.push({
        layer: o,
        parsed: f.parsed,
      });
      continue;
    }
    if (s.seedParsedFile(o.path, o.source, f.parsed, r))
      a.push({
        layer: o,
        parsed: f.parsed,
      });
  }
  for (let key of [...s.managedFileReads.keys()])
    if (!g.has(key)) {
      s.managedFileReads.delete(key);
      s.unseedParsedFile(key, "policySettings", r);
    }
  return a;
}
//@ chunk-5x106wnr.js:10314-10517 placement
/**
 * 清除托管设置预读
 */
function clearManagedSeeds(s, e) {
  for (let key of [...s.managedFileReads.keys()]) {
    s.managedFileReads.delete(key);
    s.unseedParsedFile(key, "policySettings", e);
  }
  for (let i of managedFileSettingsDirs(wslInheritsSettings()))
    s.clearFolderListing(join(i, "managed-settings.d"), e);
}
//@ chunk-5x106wnr.js:10517-11192 placement
/**
 * 安装 managed-settings.d 列表
 */
function installFolderListings(s, managedTier, i) {
  for (let a of managedTier.unlisted) s.clearFolderListing(a, i);
  let n = [];
  let r = new Map();
  for (let listing of managedTier.listings) {
    let g = s.folderInstallVerdict(listing.dir, listing.names, managedTier.walksAtReadStart);
    r.set(listing.dir, g);
    if (g === "raced") {
      s.clearFolderListing(listing.dir, i);
      logForDebugging(
        `settingsPrime: ${listing.dir} listing not installed (a read this generation went by another membership while it was in flight); the walk's membership or its own folder read serves until the next reset`,
      );
    } else if (g === "deferred") {
      logForDebugging(
        `settingsPrime: ${listing.dir} membership changed after this generation's policy walk; it applies from the next reset, as today`,
      );
      n.push(listing);
    } else if (s.seedFolderListing(listing.dir, listing.names, i)) n.push(listing);
  }
  return {
    kept: n,
    verdicts: r,
  };
}
//@ chunk-5x106wnr.js:11192-11713 placement
/**
 * 安装项目层预读
 */
function installProjectLayers(s, e, i, n) {
  for (let [r, a] of e.entries()) {
    let g = i[r];
    let c =
      g.kind === "seeded"
        ? g.parsed
        : g.kind === "absent" && a.whenAbsent === "seedAbsence"
          ? missingSettingsFileResult()
          : undefined;
    if (c !== undefined && s.walkReadDiffers(a.path, c))
      logForDebugging(
        `settingsPrime: ${a.label} not installed (the file read already saw different content this generation)`,
      );
    else if (g.kind === "seeded") s.seedParsedFile(a.path, a.source, g.parsed, n);
    else if (c !== undefined) {
      logMissingSettingsFile(a.path);
      s.seedParsedFile(a.path, a.source, c, n);
    } else
      logForDebugging(`settingsPrime: ${a.label} not seeded (${seedOutcomeLabel(g)}); the file read serves`);
  }
}
//@ chunk-5x106wnr.js:11713-12295 placement
/**
 * 预读托管层
 */
async function primeManagedTier(s, e) {
  if (!isStorageV5Enabled()) return [];
  let epoch = e.epoch;
  try {
    let n = attestedManagedLayers(s, e, epoch);
    if (n !== undefined)
      return [
        ...n.listings.map(({ dir, names }) => e.retainFolderListing(dir, names)),
        ...n.layers.map(({ path, parsed }) => e.retainLayer(path, parsed)),
      ];
    let managedTier = await readManagedTier(s, e);
    if (managedTier === undefined) {
      clearManagedSeeds(e, epoch);
      return [];
    }
    let reads = await managedTier.reads;
    if (e.epoch !== epoch) return [];
    let g = installFolderListings(e, managedTier, epoch);
    return [
      ...g.kept.map(({ dir, names }) => e.retainFolderListing(dir, names)),
      ...installSeededLayers(e, managedTier, reads, g.verdicts, epoch).map(({ layer, parsed }) =>
        e.retainLayer(layer.path, parsed),
      ),
    ];
  } catch (error) {
    logForDebugging(
      `settings: managed settings not re-seeded: ${errorMessage(error)}; the file reads serve`,
      {
        level: "warn",
      },
    );
    return [];
  }
}
//@ chunk-5x106wnr.js:12295-12335 placement
async function primeRootOwnership_2(s, e) {
  primeRootOwnership(e, await readRootOwnershipAhead(s, e));
}
//@ chunk-5x106wnr.js:12335-13082 placement
/**
 * 预读根目录所有权
 */
async function readRootOwnershipAhead(s, e) {
  if (!isStorageV5Enabled()) return;
  if (typeof process.getuid !== "function" && typeof process.geteuid !== "function") return;
  let i = localSettingsStoreRootAwaitingOwnershipProbe();
  if (i === undefined || e.localStoreProbes.hasCanonicalRootOwnerUids(i)) return;
  let hostFiles = s.hostFiles;
  if (!hostFiles.serves("workspace")) {
    logForDebugging(
      "settingsPrime: ownership of the local settings root not read ahead (the backend does not serve the workspace); the probe runs as today",
    );
    return;
  }
  let [error, error_2, error_3] = await Promise.allSettled([
    hostFiles.stat(PathSpace.workspace(i)),
    hostFiles.stat(PathSpace.workspace(join(i, ".git")), {
      follow: false,
    }),
    hostFiles.stat(PathSpace.workspace(join(i, ".claude")), {
      follow: false,
    }),
  ]);
  let c = unwrapSettledResult(error);
  let o = unwrapSettledResult(error_2);
  let f = unwrapSettledResult(error_3);
  let u = ownerUidsOf(c, o, f);
  if ("skipped" in u) {
    logForDebugging(
      `settingsPrime: ownership of the local settings root not read ahead (${u.skipped}); the probe runs as today`,
    );
    return;
  }
  return {
    root: i,
    uids: u.uids,
  };
}
//@ chunk-5x106wnr.js:13082-13263 placement
/**
 * 预读本地设置根所有者
 */
function primeRootOwnership(s, e) {
  if (e !== undefined && s.localStoreProbes.primeCanonicalRootOwnerUids(e.root, e.uids))
    logForDebugging("settingsPrime: ownership of the local settings root read ahead through the backend");
}
//@ chunk-5x106wnr.js:13263-13332 placement = extractQuotaStatusFromError (1)
/**
 * Promise.allSettled 结果：rejected 抛出原因，否则返回值。旧版名错配；疑似归错文件。
 */
function unwrapSettledResult(error) {
  if (error.status === "rejected") throw error.reason;
  return error.value;
}
//@ chunk-5x106wnr.js:13332-13986 placement
/**
 * 根、.git、.claude 的所有者 uid
 */
function ownerUidsOf(s, e, i) {
  if (!s.ok)
    return {
      skipped: `stat of the root failed: ${failureCodeForTelemetry(s.error)}`,
    };
  if (!e.ok)
    return {
      skipped: `lstat of .git failed: ${failureCodeForTelemetry(e.error)}`,
    };
  if (!i.ok)
    return {
      skipped: `lstat of .claude failed: ${failureCodeForTelemetry(i.error)}`,
    };
  let n = ownershipUid(s.value);
  if (n === undefined)
    return {
      skipped: s.value.kind === "absent" ? "the root is absent" : "no owner uid for the root",
    };
  let r = ownershipUid(e.value);
  if (r === undefined)
    return {
      skipped:
        e.value.kind === "absent"
          ? "no .git entry (left to the probe's per-call throw)"
          : "no owner uid for .git",
    };
  let claudeEntryUid = null;
  if (i.value.kind !== "absent") {
    let g = ownershipUid(i.value);
    if (g === undefined)
      return {
        skipped: "no owner uid for .claude",
      };
    claudeEntryUid = g;
  }
  return {
    uids: {
      rootUid: n,
      gitEntryUid: r,
      claudeEntryUid,
    },
  };
}
//@ chunk-5x106wnr.js:13986-14038 placement
function ownershipUid(s) {
  return s.kind === "absent" ? undefined : s.uid;
}
//@ chunk-5x106wnr.js:14038-14116 placement
function failureCodeForTelemetry(error) {
  return error.code === "Failed" ? (error.telemetryCode ?? error.failureClass) : error.code;
}
export { resetSettingsCacheWithBackendRead, seedUserSettings, primeSettings };
