/**
 * utils/settings/settingsPrime.ts
 *
 * 2.1.316 新增。启动时通过存储后端预读设置各层，后续读取复用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8cqtsqhy.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename, join, dirname } from "path";
import {
  getSettingsFilePathForSource,
  getSettingsWithErrors,
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8cqtsqhy.js:598-610 placement
var MAX_SETTINGS_PRIME_ATTEMPTS = 3;
var SETTINGS_PRIME_BACKOFF_FACTOR = 8;
//@ chunk-8cqtsqhy.js:610-694 placement (2.1.88 match: _temp5, 1)
function userSettingsFilePath() {
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  return settingsFilePathForSource !== undefined &&
    basename(settingsFilePathForSource) === USER_SETTINGS_FILE_NAMES.default
    ? settingsFilePathForSource
    : undefined;
}
//@ chunk-8cqtsqhy.js:694-878 placement
async function seedUserSettings(backend, context) {
  if (!isStorageV5Enabled()) return;
  let epoch = context.epoch;
  await Promise.all([
    seedUserSettingsUnchecked(backend, context),
    primeRootOwnershipSafely(backend, context),
    trySeed("managed-settings file tier", () => refreshManagedTier(backend, context, epoch)),
  ]);
  await trySeed("project/local layers", () => primeProjectLayers(backend, context, context.epoch));
}
//@ chunk-8cqtsqhy.js:878-1023 placement
async function trySeed(label, seed) {
  try {
    await seed();
  } catch (error) {
    logForDebugging(
      `settingsPrime: start-up seed of the ${label} failed: ${errorMessage(error)}; the file reads serve`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-8cqtsqhy.js:1023-1197 placement
/**
 * 安全预读根所有权
 */
async function primeRootOwnershipSafely(backend, context) {
  try {
    await primeRootOwnership_2(backend, context);
  } catch (error) {
    logForDebugging(
      `settingsPrime: ownership read-ahead for the local settings root failed: ${errorMessage(error)}; the probe runs as today`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-8cqtsqhy.js:1197-1855 placement
/**
 * 预读用户设置
 */
async function seedUserSettingsUnchecked(backend, context) {
  try {
    let settingsPath = userSettingsFilePath();
    if (settingsPath === undefined) return;
    if (context.parsedFiles.has(settingsPath)) {
      logForDebugging("settingsPrime: user settings already read before start-up; seed skipped");
      return;
    }
    let epoch = context.epoch;
    let settingsSeed = await readSettingsSeed(backend, settingsPath);
    if (settingsSeed.kind === "absent") {
      logMissingSettingsFile(settingsPath);
      if (context.seedParsedFile(settingsPath, "userSettings", missingSettingsFileResult(), epoch))
        logForDebugging("settingsPrime: user settings absent; seeded as none");
      return;
    }
    if (settingsSeed.kind !== "seeded") {
      logForDebugging(
        `settingsPrime: start-up seed skipped (${seedOutcomeLabel(settingsSeed)}); the file read serves`,
      );
      return;
    }
    if (context.seedParsedFile(settingsPath, "userSettings", settingsSeed.parsed, epoch))
      logForDebugging(`settingsPrime: user settings seeded at start-up (${settingsSeed.size} bytes)`);
  } catch (error) {
    logForDebugging(`settingsPrime: start-up seed failed: ${errorMessage(error)}; the file read serves`, {
      level: "warn",
    });
  }
}
//@ chunk-8cqtsqhy.js:1855-5498 placement
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
  constructor(storageV5, store) {
    this.storageV5 = storageV5;
    this.store = store;
    this.unsubscribe = store.onInvalidate(() => {
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
    let ownershipAhead = readRootOwnershipAhead(this.storageV5, this.store).then(
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
        let settingsPath = userSettingsFilePath();
        if (settingsPath !== undefined) {
          if (!(await this.seedFromBackend(settingsPath, epoch))) return;
        }
      } catch (error) {
        if (!this.disposed) this.onThrow(error);
        return;
      }
      let rootOwnership = await ownershipAhead;
      if (this.disposed) return;
      primeRootOwnership(this.store, rootOwnership);
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
        getSettingsWithErrors();
        this.loggedThrowMessages.clear();
      } catch (error) {
        if (!this.disposed) this.logThrowOnce(error);
      }
    } finally {
      await ownershipAhead;
    }
  }
  async seedLogged(epoch, seed) {
    try {
      return await seed(this.storageV5, this.store, epoch);
    } catch (error) {
      if (!this.disposed) this.logThrowOnce(error, this.loggedHostFilesThrowMessages);
      return this.store.epoch === epoch && !this.disposed;
    }
  }
  async seedFromBackend(settingsPath, epoch) {
    let state = this.state;
    let settingsSeed = await readSettingsSeed(
      this.storageV5,
      settingsPath,
      state.kind === "seeded" ? state : undefined,
    );
    if (this.store.epoch !== epoch || this.disposed) return false;
    if (settingsSeed.kind === "seeded") {
      this.store.seedParsedFile(settingsPath, "userSettings", settingsSeed.parsed, epoch);
      if (state.kind === "seeded" && state.contentHash === settingsSeed.contentHash) return true;
    } else if (settingsSeed.kind === "absent") {
      logMissingSettingsFile(settingsPath);
      this.store.seedParsedFile(settingsPath, "userSettings", missingSettingsFileResult(), epoch);
    }
    this.transition(settingsSeed);
    return true;
  }
  transition(nextState) {
    let state = this.state;
    this.state = nextState;
    if (
      state.kind === nextState.kind &&
      (nextState.kind !== "failing" || (state.kind === "failing" && state.code === nextState.code))
    ) {
      this.runsInState++;
      return;
    }
    if (state.kind === "failing" && nextState.kind === "seeded")
      logForDebugging(`settingsPrime: backend read recovered after ${this.runsInState} failing run(s)`);
    switch (((this.runsInState = 1), nextState.kind)) {
      case "seeded":
        logForDebugging(`settingsPrime: user settings seeded (${nextState.size} bytes)`);
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
          `settingsPrime: backend read failed: ${nextState.code}${nextState.failureClass ? ` (${nextState.failureClass})` : ""}; the last seed or the raw path serves`,
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
  onThrow(error) {
    this.consecutiveThrows++;
    this.state = {
      kind: "broken",
    };
    this.logThrowOnce(error);
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
  logThrowOnce(error, seenMessages = this.loggedThrowMessages) {
    let message = errorMessage(error);
    if (seenMessages.has(message) || seenMessages.size >= SETTINGS_PRIME_BACKOFF_FACTOR) return;
    seenMessages.add(message);
    logError(error);
  }
  primes(backend) {
    return this.storageV5 === backend;
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
//@ chunk-8cqtsqhy.js:5498-5750 placement
/**
 * 启动时通过存储后端预读设置层（用户、项目、本地、托管），之后的设置读取直接用预读结果。
 */
async function primeSettings(storageV5, store) {
  if (!isStorageV5Enabled() || storageV5 === undefined) return;
  if (store.primer !== undefined) {
    if (!store.primer.primes(storageV5))
      logForDebugging("settingsPrime: store already primed through another backend; second prime ignored");
    return;
  }
  primeRemoteManagedSettingsCache(storageV5).catch(logError);
  store.primer = new SettingsPrimer(storageV5, store);
  await store.primer.whenIdle();
}
//@ chunk-8cqtsqhy.js:5750-5900 placement
async function resetSettingsCacheWithBackendRead(storageV5) {
  let commandNameState = commandSyncNameState();
  let backendReadResetTail = commandNameState.backendReadResetTail;
  let releaseTail;
  commandNameState.backendReadResetTail = new Promise((resolve) => (releaseTail = resolve));
  await backendReadResetTail;
  try {
    return await primeAllSettings(storageV5, commandNameState);
  } finally {
    releaseTail();
  }
}
//@ chunk-8cqtsqhy.js:5900-6195 placement
/**
 * 预读全部设置层
 */
async function primeAllSettings(storageV5, store) {
  await store.primer?.whenIdle();
  if (store.primer !== undefined) await primeRootOwnershipSafely(storageV5, store);
  let unsubscribers =
    store.primer === undefined
      ? []
      : (
          await Promise.all([
            ...settingsPrimeReads(storageV5).map((read) => seedUserSettings_2(store, read)),
            primeManagedTier(storageV5, store),
          ])
        )
          .flat()
          .filter((unsubscriber) => unsubscriber !== undefined);
  invalidateCommandNames(
    unsubscribers.length > 0
      ? {
          userLayer: "retain",
        }
      : undefined,
  );
  if (unsubscribers.length === 0) return;
  return () => {
    for (let unsubscribe of unsubscribers) unsubscribe();
  };
}
//@ chunk-8cqtsqhy.js:6195-6263 placement
function settingsPrimeReads(storageV5) {
  let settingsPath = userSettingsFilePath();
  return [
    ...(settingsPath === undefined ? [] : [userSettingsSeedRead(storageV5, settingsPath)]),
    ...projectSettingsReads(storageV5),
  ];
}
//@ chunk-8cqtsqhy.js:6263-6587 placement
/**
 * 项目与本地设置读取任务
 */
function projectSettingsReads(storageV5) {
  let reads = [];
  for (let source of ["projectSettings", "localSettings"]) {
    if (source === "projectSettings" && projectSettingsAliasesUserSettings()) continue;
    let settingsPath = getSettingsFilePathForSource(source);
    if (settingsPath !== undefined)
      reads.push(
        projectSettingsSeedRead(
          storageV5,
          source,
          settingsPath,
          source === "projectSettings" ? "project settings" : "local settings",
        ),
      );
    if (source === "localSettings") {
      let settingsPath_2 = getLegacyLocalSettingsFilePath();
      if (settingsPath_2 !== undefined && settingsPath_2 !== settingsPath)
        reads.push(projectSettingsSeedRead(storageV5, source, settingsPath_2, "legacy local settings"));
    }
  }
  return reads;
}
//@ chunk-8cqtsqhy.js:6587-7783 placement
/**
 * 读托管设置文件层
 */
async function readManagedTier(storageV5, store) {
  let hostFiles = storageV5.hostFiles;
  if (!hostFiles.serves("system")) {
    if (!store.systemSpaceServingLogged) {
      store.systemSpaceServingLogged = true;
      logForDebugging(
        "settingsPrime: the managed-settings file tier is not read ahead (the backend does not serve 'system'); the policy walk reads the host's files itself",
      );
    }
    return;
  }
  let settingsDirs = managedFileSettingsDirs(wslInheritsSettings());
  let walksAtReadStart = store.policyWalkCount;
  let mapped = settingsDirs.map((settingsDir) =>
    managedSettingsSeedRead(storageV5, join(settingsDir, "managed-settings.json"), "managed settings", store),
  );
  let [listingResults, baseReads] = await Promise.all([
    Promise.all(
      settingsDirs.map((settingsDir) =>
        listManagedDropIns(hostFiles, join(settingsDir, "managed-settings.d")),
      ),
    ),
    Promise.all(mapped.map((seedRead) => seedRead.read())),
  ]);
  let managedTier = {
    listings: [],
    unlisted: [],
    layers: [...mapped],
    walksAtReadStart,
  };
  let dropInReads = [];
  for (let [dirIndex, settingsDir] of settingsDirs.entries()) {
    let listing = listingResults[dirIndex];
    let dropInDir = join(settingsDir, "managed-settings.d");
    if (listing.kind === "failing") {
      logForDebugging(
        `settingsPrime: ${dropInDir} not listed through the backend (backend listing failed: ${listing.code}${listing.failureClass ? ` (${listing.failureClass})` : ""}); the folder read serves`,
      );
      managedTier.unlisted.push(dropInDir);
      continue;
    }
    if (listing.names.length === 0) {
      logForDebugging(`settingsPrime: ${dropInDir} has no drop-ins to read ahead; the folder read confirms`);
      managedTier.unlisted.push(dropInDir);
      continue;
    }
    managedTier.listings.push({
      dir: dropInDir,
      names: listing.names,
    });
    for (let name of listing.names)
      dropInReads.push(
        managedSettingsSeedRead(storageV5, join(dropInDir, name), "managed settings drop-in", store),
      );
  }
  managedTier.layers.push(...dropInReads);
  return {
    ...managedTier,
    reads: Promise.all(dropInReads.map((seedRead) => seedRead.read())).then((dropInResults) => [
      ...baseReads,
      ...dropInResults,
    ]),
  };
}
//@ chunk-8cqtsqhy.js:7783-7934 placement
/**
 * 预读项目层
 */
async function primeProjectLayers(storageV5, store, epoch) {
  let reads = projectSettingsReads(storageV5);
  if (reads.length === 0) return true;
  let results = await Promise.all(reads.map((read) => read.read()));
  if (store.epoch !== epoch) return false;
  installProjectLayers(store, reads, results, epoch);
  return true;
}
//@ chunk-8cqtsqhy.js:7934-7958 placement
var EMPTY_LIST; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8cqtsqhy.js:7934", () => {
  EMPTY_LIST = Object.freeze([]);
});
//@ chunk-8cqtsqhy.js:7958-9054 placement
/**
 * 已证实的托管层
 */
function attestedManagedLayers(storageV5, store, epoch) {
  if (storageV5.hostFiles.serving("system") !== "absent" || store.systemAttestationContradicted) return;
  let mapped = managedFileSettingsDirs(wslInheritsSettings()).map((settingsDir) => ({
    dropInDir: join(settingsDir, "managed-settings.d"),
    basePath: join(settingsDir, "managed-settings.json"),
  }));
  if (mapped.some(({ basePath, dropInDir }) => store.walkReadManagedFileIn(basePath, dropInDir))) {
    store.systemAttestationContradicted = true;
    for (let { basePath, dropInDir } of mapped) {
      store.clearFolderListing(dropInDir, epoch);
      store.unseedParsedFile(basePath, "policySettings", epoch);
    }
    logError(
      Error(
        "settings: a managed-settings file was read from a folder the host attested absent ('system' space); the attestation is ignored for the rest of this process",
      ),
    );
    return;
  }
  if (!store.systemSpaceServingLogged) {
    store.systemSpaceServingLogged = true;
    logForDebugging(
      "settingsPrime: the host attests the 'system' space absent, so this machine's policy folder (or the one CLAUDE_CODE_MANAGED_SETTINGS_PATH names) is not read and the session has no managed-settings files",
    );
  }
  for (let { basePath, dropInDir } of mapped) {
    store.seedFolderListing(dropInDir, EMPTY_LIST, epoch);
    if (!store.walkRead(basePath))
      store.seedParsedFile(basePath, "policySettings", missingSettingsFileResult(), epoch);
  }
  return {
    listings: mapped.map(({ dropInDir }) => ({
      dir: dropInDir,
      names: EMPTY_LIST,
    })),
    layers: mapped.map(({ basePath }) => ({
      path: basePath,
      parsed: missingSettingsFileResult(),
    })),
  };
}
//@ chunk-8cqtsqhy.js:9054-9260 placement
/**
 * 刷新托管层
 */
async function refreshManagedTier(storageV5, store, epoch) {
  if (attestedManagedLayers(storageV5, store, epoch) !== undefined) return store.epoch === epoch;
  let managedTier = await readManagedTier(storageV5, store);
  if (managedTier === undefined) {
    clearManagedSeeds(store, epoch);
    return true;
  }
  let reads = await managedTier.reads;
  if (store.epoch !== epoch) return false;
  let { verdicts } = installFolderListings(store, managedTier, epoch);
  installSeededLayers(store, managedTier, reads, verdicts, epoch);
  return true;
}
//@ chunk-8cqtsqhy.js:9260-10314 placement
/**
 * 安装预读的托管设置层
 */
function installSeededLayers(store, managedTier, reads, verdicts, epoch) {
  let installed = [];
  let seededPaths = new Set();
  for (let [layerIndex, layer] of managedTier.layers.entries()) {
    let seedRead = reads[layerIndex];
    if (seedRead.kind !== "seeded") {
      logForDebugging(
        `settingsPrime: ${layer.label} not seeded (${seedOutcomeLabel(seedRead)}); the file read serves`,
      );
      store.managedFileReads.delete(layer.path);
      store.unseedParsedFile(layer.path, layer.source, epoch);
      continue;
    }
    seededPaths.add(layer.path);
    store.managedFileReads.set(layer.path, {
      contentHash: seedRead.contentHash,
      parsed: seedRead.parsed,
    });
    let dirVerdict = verdicts.get(dirname(layer.path));
    let verdict =
      dirVerdict !== undefined && dirVerdict !== "install"
        ? dirVerdict
        : store.policyInstallVerdict(layer.path, seedRead.parsed, managedTier.walksAtReadStart);
    if (verdict === "raced") {
      store.dropRetainedLayer(layer.path);
      logForDebugging(
        `settingsPrime: ${layer.label} not installed (the walk read different content while this read was in flight); re-verified next generation`,
      );
      continue;
    }
    if (verdict === "deferred") {
      logForDebugging(
        `settingsPrime: ${layer.label} changed after this generation's policy walk; it applies from the next reset, as today`,
      );
      installed.push({
        layer,
        parsed: seedRead.parsed,
      });
      continue;
    }
    if (store.seedParsedFile(layer.path, layer.source, seedRead.parsed, epoch))
      installed.push({
        layer,
        parsed: seedRead.parsed,
      });
  }
  for (let key of [...store.managedFileReads.keys()])
    if (!seededPaths.has(key)) {
      store.managedFileReads.delete(key);
      store.unseedParsedFile(key, "policySettings", epoch);
    }
  return installed;
}
//@ chunk-8cqtsqhy.js:10314-10517 placement
/**
 * 清除托管设置预读
 */
function clearManagedSeeds(store, epoch) {
  for (let key of [...store.managedFileReads.keys()]) {
    store.managedFileReads.delete(key);
    store.unseedParsedFile(key, "policySettings", epoch);
  }
  for (let settingsDir of managedFileSettingsDirs(wslInheritsSettings()))
    store.clearFolderListing(join(settingsDir, "managed-settings.d"), epoch);
}
//@ chunk-8cqtsqhy.js:10517-11192 placement
/**
 * 安装 managed-settings.d 列表
 */
function installFolderListings(store, managedTier, epoch) {
  for (let unlistedDir of managedTier.unlisted) store.clearFolderListing(unlistedDir, epoch);
  let kept = [];
  let verdicts = new Map();
  for (let listing of managedTier.listings) {
    let verdict = store.folderInstallVerdict(listing.dir, listing.names, managedTier.walksAtReadStart);
    verdicts.set(listing.dir, verdict);
    if (verdict === "raced") {
      store.clearFolderListing(listing.dir, epoch);
      logForDebugging(
        `settingsPrime: ${listing.dir} listing not installed (a read this generation went by another membership while it was in flight); the walk's membership or its own folder read serves until the next reset`,
      );
    } else if (verdict === "deferred") {
      logForDebugging(
        `settingsPrime: ${listing.dir} membership changed after this generation's policy walk; it applies from the next reset, as today`,
      );
      kept.push(listing);
    } else if (store.seedFolderListing(listing.dir, listing.names, epoch)) kept.push(listing);
  }
  return {
    kept,
    verdicts,
  };
}
//@ chunk-8cqtsqhy.js:11192-11713 placement
/**
 * 安装项目层预读
 */
function installProjectLayers(store, reads, results, epoch) {
  for (let [readIndex, read] of reads.entries()) {
    let result = results[readIndex];
    let parsed =
      result.kind === "seeded"
        ? result.parsed
        : result.kind === "absent" && read.whenAbsent === "seedAbsence"
          ? missingSettingsFileResult()
          : undefined;
    if (parsed !== undefined && store.walkReadDiffers(read.path, parsed))
      logForDebugging(
        `settingsPrime: ${read.label} not installed (the file read already saw different content this generation)`,
      );
    else if (result.kind === "seeded") store.seedParsedFile(read.path, read.source, result.parsed, epoch);
    else if (parsed !== undefined) {
      logMissingSettingsFile(read.path);
      store.seedParsedFile(read.path, read.source, parsed, epoch);
    } else
      logForDebugging(
        `settingsPrime: ${read.label} not seeded (${seedOutcomeLabel(result)}); the file read serves`,
      );
  }
}
//@ chunk-8cqtsqhy.js:11713-12295 placement
/**
 * 预读托管层
 */
async function primeManagedTier(storageV5, store) {
  if (!isStorageV5Enabled()) return [];
  let epoch = store.epoch;
  try {
    let attested = attestedManagedLayers(storageV5, store, epoch);
    if (attested !== undefined)
      return [
        ...attested.listings.map(({ dir, names }) => store.retainFolderListing(dir, names)),
        ...attested.layers.map(({ path, parsed }) => store.retainLayer(path, parsed)),
      ];
    let managedTier = await readManagedTier(storageV5, store);
    if (managedTier === undefined) {
      clearManagedSeeds(store, epoch);
      return [];
    }
    let reads = await managedTier.reads;
    if (store.epoch !== epoch) return [];
    let listed = installFolderListings(store, managedTier, epoch);
    return [
      ...listed.kept.map(({ dir, names }) => store.retainFolderListing(dir, names)),
      ...installSeededLayers(store, managedTier, reads, listed.verdicts, epoch).map(({ layer, parsed }) =>
        store.retainLayer(layer.path, parsed),
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
//@ chunk-8cqtsqhy.js:12295-12335 placement
async function primeRootOwnership_2(storageV5, store) {
  primeRootOwnership(store, await readRootOwnershipAhead(storageV5, store));
}
//@ chunk-8cqtsqhy.js:12335-13082 placement
/**
 * 预读根目录所有权
 */
async function readRootOwnershipAhead(storageV5, store) {
  if (!isStorageV5Enabled()) return;
  if (typeof process.getuid !== "function" && typeof process.geteuid !== "function") return;
  let root = localSettingsStoreRootAwaitingOwnershipProbe();
  if (root === undefined || store.localStoreProbes.hasCanonicalRootOwnerUids(root)) return;
  let hostFiles = storageV5.hostFiles;
  if (!hostFiles.serves("workspace")) {
    logForDebugging(
      "settingsPrime: ownership of the local settings root not read ahead (the backend does not serve the workspace); the probe runs as today",
    );
    return;
  }
  let [error, error_2, error_3] = await Promise.allSettled([
    hostFiles.stat(PathSpace.workspace(root)),
    hostFiles.stat(PathSpace.workspace(join(root, ".git")), {
      follow: false,
    }),
    hostFiles.stat(PathSpace.workspace(join(root, ".claude")), {
      follow: false,
    }),
  ]);
  let rootStat = unwrapSettledResult(error);
  let gitStat = unwrapSettledResult(error_2);
  let claudeStat = unwrapSettledResult(error_3);
  let ownerUids = ownerUidsOf(rootStat, gitStat, claudeStat);
  if ("skipped" in ownerUids) {
    logForDebugging(
      `settingsPrime: ownership of the local settings root not read ahead (${ownerUids.skipped}); the probe runs as today`,
    );
    return;
  }
  return {
    root,
    uids: ownerUids.uids,
  };
}
//@ chunk-8cqtsqhy.js:13082-13263 placement
/**
 * 预读本地设置根所有者
 */
function primeRootOwnership(store, ownership) {
  if (
    ownership !== undefined &&
    store.localStoreProbes.primeCanonicalRootOwnerUids(ownership.root, ownership.uids)
  )
    logForDebugging("settingsPrime: ownership of the local settings root read ahead through the backend");
}
//@ chunk-8cqtsqhy.js:13263-13332 placement (2.1.88 match: extractQuotaStatusFromError, 1)
/**
 * Promise.allSettled 结果：rejected 抛出原因，否则返回值。旧版名错配；疑似归错文件。
 */
function unwrapSettledResult(error) {
  if (error.status === "rejected") throw error.reason;
  return error.value;
}
//@ chunk-8cqtsqhy.js:13332-13986 placement
/**
 * 根、.git、.claude 的所有者 uid
 */
function ownerUidsOf(rootStat, gitStat, claudeStat) {
  if (!rootStat.ok)
    return {
      skipped: `stat of the root failed: ${failureCodeForTelemetry(rootStat.error)}`,
    };
  if (!gitStat.ok)
    return {
      skipped: `lstat of .git failed: ${failureCodeForTelemetry(gitStat.error)}`,
    };
  if (!claudeStat.ok)
    return {
      skipped: `lstat of .claude failed: ${failureCodeForTelemetry(claudeStat.error)}`,
    };
  let rootUid = ownershipUid(rootStat.value);
  if (rootUid === undefined)
    return {
      skipped: rootStat.value.kind === "absent" ? "the root is absent" : "no owner uid for the root",
    };
  let gitEntryUid = ownershipUid(gitStat.value);
  if (gitEntryUid === undefined)
    return {
      skipped:
        gitStat.value.kind === "absent"
          ? "no .git entry (left to the probe's per-call throw)"
          : "no owner uid for .git",
    };
  let claudeEntryUid = null;
  if (claudeStat.value.kind !== "absent") {
    let entryUid = ownershipUid(claudeStat.value);
    if (entryUid === undefined)
      return {
        skipped: "no owner uid for .claude",
      };
    claudeEntryUid = entryUid;
  }
  return {
    uids: {
      rootUid,
      gitEntryUid,
      claudeEntryUid,
    },
  };
}
//@ chunk-8cqtsqhy.js:13986-14038 placement
function ownershipUid(stat) {
  return stat.kind === "absent" ? undefined : stat.uid;
}
//@ chunk-8cqtsqhy.js:14038-14116 placement
function failureCodeForTelemetry(error) {
  return error.code === "Failed" ? (error.telemetryCode ?? error.failureClass) : error.code;
}
export { resetSettingsCacheWithBackendRead, seedUserSettings, primeSettings };
