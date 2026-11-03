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
import { Wre } from "../hostScoped.js";
import { logError } from "../log.js";
import { primeRemoteManagedSettingsCache } from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { is, or } from "./commandSyncNames.js";
import { managedFileSettingsDirs } from "./managedFileSettings.js";
import { Mne } from "./mdm/settings.js";
import { PathSpace } from "../resultError.js";

//@ chunk-5x106wnr.js:598-610 placement
var b = 3,
  z = 8;
//@ chunk-5x106wnr.js:610-694 placement = _temp5 (1)
function v() {
  let s = getSettingsFilePathForSource("userSettings");
  return s !== void 0 && basename(s) === USER_SETTINGS_FILE_NAMES.default ? s : void 0;
}
//@ chunk-5x106wnr.js:694-878 placement
async function seedUserSettings(s, e) {
  if (!isStorageV5Enabled()) return;
  let epoch = e.epoch;
  (await Promise.all([
    seedUserSettingsUnchecked(s, e),
    primeRootOwnershipSafely(s, e),
    trySeed("managed-settings file tier", () => refreshManagedTier(s, e, epoch)),
  ]),
    await trySeed("project/local layers", () => primeProjectLayers(s, e, e.epoch)));
}
//@ chunk-5x106wnr.js:878-1023 placement
async function trySeed(s, e) {
  try {
    await e();
  } catch (error) {
    logForDebugging(
      `settingsPrime: start-up seed of the ${s} failed: ${errorMessage(error)}; the file reads serve`,
      { level: "warn" },
    );
  }
}
/**
 * 安全预读根所有权
 */
//@ chunk-5x106wnr.js:1023-1197 placement
async function primeRootOwnershipSafely(s, e) {
  try {
    await X(s, e);
  } catch (error) {
    logForDebugging(
      `settingsPrime: ownership read-ahead for the local settings root failed: ${errorMessage(error)}; the probe runs as today`,
      { level: "warn" },
    );
  }
}
/**
 * 预读用户设置
 */
//@ chunk-5x106wnr.js:1197-1855 placement
async function seedUserSettingsUnchecked(s, e) {
  try {
    let i = v();
    if (i === void 0) return;
    if (e.parsedFiles.has(i)) {
      logForDebugging("settingsPrime: user settings already read before start-up; seed skipped");
      return;
    }
    let epoch = e.epoch,
      r = await readSettingsSeed(s, i);
    if (r.kind === "absent") {
      if (
        (logMissingSettingsFile(i), e.seedParsedFile(i, "userSettings", missingSettingsFileResult(), epoch))
      )
        logForDebugging("settingsPrime: user settings absent; seeded as none");
      return;
    }
    if (r.kind !== "seeded") {
      logForDebugging(`settingsPrime: start-up seed skipped (${seedOutcomeLabel(r)}); the file read serves`);
      return;
    }
    if (e.seedParsedFile(i, "userSettings", r.parsed, epoch))
      logForDebugging(`settingsPrime: user settings seeded at start-up (${r.size} bytes)`);
  } catch (error) {
    logForDebugging(`settingsPrime: start-up seed failed: ${errorMessage(error)}; the file read serves`, {
      level: "warn",
    });
  }
}
/**
 * 设置预读器
 */
//@ chunk-5x106wnr.js:1855-5498 placement
class SettingsPrimer {
  storageV5;
  store;
  inFlight = null;
  followUpQueued = !1;
  disposed = !1;
  state = { kind: "unprimed" };
  consecutiveThrows = 0;
  runsInState = 0;
  loggedThrowMessages = new Set();
  loggedOwnershipThrowMessages = new Set();
  loggedHostFilesThrowMessages = new Set();
  unsubscribe;
  constructor(s, e) {
    this.storageV5 = s;
    this.store = e;
    ((this.unsubscribe = e.onInvalidate(() => {
      if (!this.disposed) (this.seedAttestedTier(), this.keepUserLayer(), this.schedule());
    })),
      this.seedAttestedTier(),
      this.schedule());
  }
  keepUserLayer() {
    let s = Wre() ? this.store.lastSeededUserLayer : void 0;
    if (s !== void 0) this.store.seedParsedFile(s.path, "userSettings", s.parsed, this.store.epoch);
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
      this.followUpQueued = !0;
      return;
    }
    this.inFlight = this.run().finally(() => {
      if (this.disposed) return;
      if (((this.inFlight = null), this.followUpQueued)) ((this.followUpQueued = !1), this.schedule());
    });
  }
  async run() {
    let s = readRootOwnershipAhead(this.storageV5, this.store).then(
      (e) => (this.loggedOwnershipThrowMessages.clear(), e),
      (e) => {
        if (!this.disposed) this.logThrowOnce(e, this.loggedOwnershipThrowMessages);
        return;
      },
    );
    try {
      let epoch = this.store.epoch;
      try {
        let r = v();
        if (r !== void 0) {
          if (!(await this.seedFromBackend(r, epoch))) return;
        }
      } catch (error) {
        if (!this.disposed) this.onThrow(error);
        return;
      }
      let i = await s;
      if (this.disposed) return;
      if (
        (primeRootOwnership(this.store, i),
        (
          await Promise.all([
            this.seedLogged(epoch, primeProjectLayers),
            this.seedLogged(epoch, refreshManagedTier),
          ])
        ).includes(!1))
      )
        return;
      this.consecutiveThrows = 0;
      try {
        (getSettingsWithErrors_2(), this.loggedThrowMessages.clear());
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
    let state = this.state,
      n = await readSettingsSeed(this.storageV5, s, state.kind === "seeded" ? state : void 0);
    if (this.store.epoch !== e || this.disposed) return !1;
    if (n.kind === "seeded") {
      if (
        (this.store.seedParsedFile(s, "userSettings", n.parsed, e),
        state.kind === "seeded" && state.contentHash === n.contentHash)
      )
        return !0;
    } else if (n.kind === "absent")
      (logMissingSettingsFile(s),
        this.store.seedParsedFile(s, "userSettings", missingSettingsFileResult(), e));
    return (this.transition(n), !0);
  }
  transition(s) {
    let state = this.state;
    if (
      ((this.state = s),
      state.kind === s.kind && (s.kind !== "failing" || (state.kind === "failing" && state.code === s.code)))
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
          { level: "warn" },
        );
        return;
      case "unprimed":
      case "broken":
        return;
    }
  }
  onThrow(s) {
    if (
      (this.consecutiveThrows++,
      (this.state = { kind: "broken" }),
      this.logThrowOnce(s),
      this.consecutiveThrows >= b)
    )
      (logForDebugging(
        `settingsPrime: disabled after ${b} consecutive failures; the raw path serves from the next reset`,
        { level: "warn" },
      ),
        this.dispose());
  }
  logThrowOnce(s, e = this.loggedThrowMessages) {
    let i = errorMessage(s);
    if (e.has(i) || e.size >= z) return;
    (e.add(i), logError(s));
  }
  primes(s) {
    return this.storageV5 === s;
  }
  async whenIdle() {
    while (this.inFlight !== null || this.followUpQueued) await (this.inFlight ?? Promise.resolve());
  }
  dispose() {
    if (
      ((this.disposed = !0),
      this.unsubscribe(),
      (this.inFlight = null),
      (this.followUpQueued = !1),
      this.store.primer === this)
    )
      ((this.store.primer = void 0),
        this.store.managedFileReads.clear(),
        (this.store.lastSeededUserLayer = void 0));
  }
}
/**
 * 启动时通过存储后端预读设置层（用户、项目、本地、托管），之后的设置读取直接用预读结果。
 */
//@ chunk-5x106wnr.js:5498-5750 placement
async function primeSettings(s, e) {
  if (!isStorageV5Enabled() || s === void 0) return;
  if (e.primer !== void 0) {
    if (!e.primer.primes(s))
      logForDebugging("settingsPrime: store already primed through another backend; second prime ignored");
    return;
  }
  (primeRemoteManagedSettingsCache(s).catch(logError),
    (e.primer = new SettingsPrimer(s, e)),
    await e.primer.whenIdle());
}
//@ chunk-5x106wnr.js:5750-5900 placement
async function resetSettingsCacheWithBackendRead(s) {
  let e = is(),
    backendReadResetTail = e.backendReadResetTail,
    n;
  ((e.backendReadResetTail = new Promise((r) => (n = r))), await backendReadResetTail);
  try {
    return await primeAllSettings(s, e);
  } finally {
    n();
  }
}
/**
 * 预读全部设置层
 */
//@ chunk-5x106wnr.js:5900-6195 placement
async function primeAllSettings(s, e) {
  if ((await e.primer?.whenIdle(), e.primer !== void 0)) await primeRootOwnershipSafely(s, e);
  let i =
    e.primer === void 0
      ? []
      : (await Promise.all([...W(s).map((n) => seedUserSettings_2(e, n)), primeManagedTier(s, e)]))
          .flat()
          .filter((n) => n !== void 0);
  if ((or(i.length > 0 ? { userLayer: "retain" } : void 0), i.length === 0)) return;
  return () => {
    for (let n of i) n();
  };
}
//@ chunk-5x106wnr.js:6195-6263 placement
function W(s) {
  let e = v();
  return [...(e === void 0 ? [] : [userSettingsSeedRead(s, e)]), ...projectSettingsReads(s)];
}
/**
 * 项目与本地设置读取任务
 */
//@ chunk-5x106wnr.js:6263-6587 placement
function projectSettingsReads(s) {
  let e = [];
  for (let i of ["projectSettings", "localSettings"]) {
    if (i === "projectSettings" && projectSettingsAliasesUserSettings()) continue;
    let n = getSettingsFilePathForSource(i);
    if (n !== void 0)
      e.push(
        projectSettingsSeedRead(s, i, n, i === "projectSettings" ? "project settings" : "local settings"),
      );
    if (i === "localSettings") {
      let r = getLegacyLocalSettingsFilePath();
      if (r !== void 0 && r !== n) e.push(projectSettingsSeedRead(s, i, r, "legacy local settings"));
    }
  }
  return e;
}
/**
 * 读托管设置文件层
 */
//@ chunk-5x106wnr.js:6587-7783 placement
async function readManagedTier(s, e) {
  let hostFiles = s.hostFiles;
  if (!hostFiles.serves("system")) {
    if (!e.systemSpaceServingLogged)
      ((e.systemSpaceServingLogged = !0),
        logForDebugging(
          "settingsPrime: the managed-settings file tier is not read ahead (the backend does not serve 'system'); the policy walk reads the host's files itself",
        ));
    return;
  }
  let n = managedFileSettingsDirs(Mne()),
    policyWalkCount = e.policyWalkCount,
    mapped = n.map((u) =>
      managedSettingsSeedRead(s, join(u, "managed-settings.json"), "managed settings", e),
    ),
    [g, c] = await Promise.all([
      Promise.all(n.map((u) => listManagedDropIns(hostFiles, join(u, "managed-settings.d")))),
      Promise.all(mapped.map((u) => u.read())),
    ]),
    o = { listings: [], unlisted: [], layers: [...mapped], walksAtReadStart: policyWalkCount },
    f = [];
  for (let [u, S] of n.entries()) {
    let p = g[u],
      m = join(S, "managed-settings.d");
    if (p.kind === "failing") {
      (logForDebugging(
        `settingsPrime: ${m} not listed through the backend (backend listing failed: ${p.code}${p.failureClass ? ` (${p.failureClass})` : ""}); the folder read serves`,
      ),
        o.unlisted.push(m));
      continue;
    }
    if (p.names.length === 0) {
      (logForDebugging(`settingsPrime: ${m} has no drop-ins to read ahead; the folder read confirms`),
        o.unlisted.push(m));
      continue;
    }
    o.listings.push({ dir: m, names: p.names });
    for (let j of p.names) f.push(managedSettingsSeedRead(s, join(m, j), "managed settings drop-in", e));
  }
  return (
    o.layers.push(...f),
    { ...o, reads: Promise.all(f.map((u) => u.read())).then((u) => [...c, ...u]) }
  );
}
/**
 * 预读项目层
 */
//@ chunk-5x106wnr.js:7783-7934 placement
async function primeProjectLayers(s, e, i) {
  let n = projectSettingsReads(s);
  if (n.length === 0) return !0;
  let results = await Promise.all(n.map((a) => a.read()));
  if (e.epoch !== i) return !1;
  return (installProjectLayers(e, n, results, i), !0);
}
//@ chunk-5x106wnr.js:7934-7958 placement
var freeze = Object.freeze([]);
/**
 * 已证实的托管层
 */
//@ chunk-5x106wnr.js:7958-9054 placement
function attestedManagedLayers(s, e, i) {
  if (s.hostFiles.serving("system") !== "absent" || e.systemAttestationContradicted) return;
  let mapped = managedFileSettingsDirs(Mne()).map((r) => ({
    dropInDir: join(r, "managed-settings.d"),
    basePath: join(r, "managed-settings.json"),
  }));
  if (
    mapped.some(({ basePath: basePath, dropInDir: dropInDir }) =>
      e.walkReadManagedFileIn(basePath, dropInDir),
    )
  ) {
    e.systemAttestationContradicted = !0;
    for (let { basePath: basePath, dropInDir: dropInDir } of mapped)
      (e.clearFolderListing(dropInDir, i), e.unseedParsedFile(basePath, "policySettings", i));
    logError(
      Error(
        "settings: a managed-settings file was read from a folder the host attested absent ('system' space); the attestation is ignored for the rest of this process",
      ),
    );
    return;
  }
  if (!e.systemSpaceServingLogged)
    ((e.systemSpaceServingLogged = !0),
      logForDebugging(
        "settingsPrime: the host attests the 'system' space absent, so this machine's policy folder (or the one CLAUDE_CODE_MANAGED_SETTINGS_PATH names) is not read and the session has no managed-settings files",
      ));
  for (let { basePath: basePath, dropInDir: dropInDir } of mapped)
    if ((e.seedFolderListing(dropInDir, freeze, i), !e.walkRead(basePath)))
      e.seedParsedFile(basePath, "policySettings", missingSettingsFileResult(), i);
  return {
    listings: mapped.map(({ dropInDir: dropInDir }) => ({ dir: dropInDir, names: freeze })),
    layers: mapped.map(({ basePath: basePath }) => ({ path: basePath, parsed: missingSettingsFileResult() })),
  };
}
/**
 * 刷新托管层
 */
//@ chunk-5x106wnr.js:9054-9260 placement
async function refreshManagedTier(s, e, i) {
  if (attestedManagedLayers(s, e, i) !== void 0) return e.epoch === i;
  let n = await readManagedTier(s, e);
  if (n === void 0) return (clearManagedSeeds(e, i), !0);
  let reads = await n.reads;
  if (e.epoch !== i) return !1;
  let { verdicts: verdicts } = installFolderListings(e, n, i);
  return (installSeededLayers(e, n, reads, verdicts, i), !0);
}
/**
 * 安装预读的托管设置层
 */
//@ chunk-5x106wnr.js:9260-10314 placement
function installSeededLayers(s, e, i, n, r) {
  let a = [],
    g = new Set();
  for (let [c, o] of e.layers.entries()) {
    let f = i[c];
    if (f.kind !== "seeded") {
      (logForDebugging(`settingsPrime: ${o.label} not seeded (${seedOutcomeLabel(f)}); the file read serves`),
        s.managedFileReads.delete(o.path),
        s.unseedParsedFile(o.path, o.source, r));
      continue;
    }
    (g.add(o.path), s.managedFileReads.set(o.path, { contentHash: f.contentHash, parsed: f.parsed }));
    let u = n.get(dirname(o.path)),
      S = u !== void 0 && u !== "install" ? u : s.policyInstallVerdict(o.path, f.parsed, e.walksAtReadStart);
    if (S === "raced") {
      (s.dropRetainedLayer(o.path),
        logForDebugging(
          `settingsPrime: ${o.label} not installed (the walk read different content while this read was in flight); re-verified next generation`,
        ));
      continue;
    }
    if (S === "deferred") {
      (logForDebugging(
        `settingsPrime: ${o.label} changed after this generation's policy walk; it applies from the next reset, as today`,
      ),
        a.push({ layer: o, parsed: f.parsed }));
      continue;
    }
    if (s.seedParsedFile(o.path, o.source, f.parsed, r)) a.push({ layer: o, parsed: f.parsed });
  }
  for (let c of [...s.managedFileReads.keys()])
    if (!g.has(c)) (s.managedFileReads.delete(c), s.unseedParsedFile(c, "policySettings", r));
  return a;
}
/**
 * 清除托管设置预读
 */
//@ chunk-5x106wnr.js:10314-10517 placement
function clearManagedSeeds(s, e) {
  for (let i of [...s.managedFileReads.keys()])
    (s.managedFileReads.delete(i), s.unseedParsedFile(i, "policySettings", e));
  for (let i of managedFileSettingsDirs(Mne())) s.clearFolderListing(join(i, "managed-settings.d"), e);
}
/**
 * 安装 managed-settings.d 列表
 */
//@ chunk-5x106wnr.js:10517-11192 placement
function installFolderListings(s, e, i) {
  for (let a of e.unlisted) s.clearFolderListing(a, i);
  let n = [],
    r = new Map();
  for (let listing of e.listings) {
    let folderInstallVerdict = s.folderInstallVerdict(listing.dir, listing.names, e.walksAtReadStart);
    if ((r.set(listing.dir, folderInstallVerdict), folderInstallVerdict === "raced"))
      (s.clearFolderListing(listing.dir, i),
        logForDebugging(
          `settingsPrime: ${listing.dir} listing not installed (a read this generation went by another membership while it was in flight); the walk's membership or its own folder read serves until the next reset`,
        ));
    else if (folderInstallVerdict === "deferred")
      (logForDebugging(
        `settingsPrime: ${listing.dir} membership changed after this generation's policy walk; it applies from the next reset, as today`,
      ),
        n.push(listing));
    else if (s.seedFolderListing(listing.dir, listing.names, i)) n.push(listing);
  }
  return { kept: n, verdicts: r };
}
/**
 * 安装项目层预读
 */
//@ chunk-5x106wnr.js:11192-11713 placement
function installProjectLayers(s, e, i, n) {
  for (let [r, a] of e.entries()) {
    let g = i[r],
      c =
        g.kind === "seeded"
          ? g.parsed
          : g.kind === "absent" && a.whenAbsent === "seedAbsence"
            ? missingSettingsFileResult()
            : void 0;
    if (c !== void 0 && s.walkReadDiffers(a.path, c))
      logForDebugging(
        `settingsPrime: ${a.label} not installed (the file read already saw different content this generation)`,
      );
    else if (g.kind === "seeded") s.seedParsedFile(a.path, a.source, g.parsed, n);
    else if (c !== void 0) (logMissingSettingsFile(a.path), s.seedParsedFile(a.path, a.source, c, n));
    else
      logForDebugging(`settingsPrime: ${a.label} not seeded (${seedOutcomeLabel(g)}); the file read serves`);
  }
}
/**
 * 预读托管层
 */
//@ chunk-5x106wnr.js:11713-12295 placement
async function primeManagedTier(s, e) {
  if (!isStorageV5Enabled()) return [];
  let epoch = e.epoch;
  try {
    let n = attestedManagedLayers(s, e, epoch);
    if (n !== void 0)
      return [
        ...n.listings.map(({ dir: dir, names: names }) => e.retainFolderListing(dir, names)),
        ...n.layers.map(({ path: path, parsed: parsed }) => e.retainLayer(path, parsed)),
      ];
    let r = await readManagedTier(s, e);
    if (r === void 0) return (clearManagedSeeds(e, epoch), []);
    let reads = await r.reads;
    if (e.epoch !== epoch) return [];
    let g = installFolderListings(e, r, epoch);
    return [
      ...g.kept.map(({ dir: dir, names: names }) => e.retainFolderListing(dir, names)),
      ...installSeededLayers(e, r, reads, g.verdicts, epoch).map(({ layer: layer, parsed: parsed }) =>
        e.retainLayer(layer.path, parsed),
      ),
    ];
  } catch (error) {
    return (
      logForDebugging(
        `settings: managed settings not re-seeded: ${errorMessage(error)}; the file reads serve`,
        { level: "warn" },
      ),
      []
    );
  }
}
//@ chunk-5x106wnr.js:12295-12335 placement
async function X(s, e) {
  primeRootOwnership(e, await readRootOwnershipAhead(s, e));
}
/**
 * 预读根目录所有权
 */
//@ chunk-5x106wnr.js:12335-13082 placement
async function readRootOwnershipAhead(s, e) {
  if (!isStorageV5Enabled()) return;
  if (typeof process.getuid !== "function" && typeof process.geteuid !== "function") return;
  let i = localSettingsStoreRootAwaitingOwnershipProbe();
  if (i === void 0 || e.localStoreProbes.hasCanonicalRootOwnerUids(i)) return;
  let hostFiles = s.hostFiles;
  if (!hostFiles.serves("workspace")) {
    logForDebugging(
      "settingsPrime: ownership of the local settings root not read ahead (the backend does not serve the workspace); the probe runs as today",
    );
    return;
  }
  let [r, a, g] = await Promise.allSettled([
      hostFiles.stat(PathSpace.workspace(i)),
      hostFiles.stat(PathSpace.workspace(join(i, ".git")), { follow: !1 }),
      hostFiles.stat(PathSpace.workspace(join(i, ".claude")), { follow: !1 }),
    ]),
    c = unwrapSettledResult(r),
    o = unwrapSettledResult(a),
    f = unwrapSettledResult(g),
    u = ownerUidsOf(c, o, f);
  if ("skipped" in u) {
    logForDebugging(
      `settingsPrime: ownership of the local settings root not read ahead (${u.skipped}); the probe runs as today`,
    );
    return;
  }
  return { root: i, uids: u.uids };
}
/**
 * 预读本地设置根所有者
 */
//@ chunk-5x106wnr.js:13082-13263 placement
function primeRootOwnership(s, e) {
  if (e !== void 0 && s.localStoreProbes.primeCanonicalRootOwnerUids(e.root, e.uids))
    logForDebugging("settingsPrime: ownership of the local settings root read ahead through the backend");
}
/**
 * Promise.allSettled 结果：rejected 抛出原因，否则返回值。旧版名错配；疑似归错文件。
 */
//@ chunk-5x106wnr.js:13263-13332 placement = extractQuotaStatusFromError (1)
function unwrapSettledResult(error) {
  if (error.status === "rejected") throw error.reason;
  return error.value;
}
/**
 * 根、.git、.claude 的所有者 uid
 */
//@ chunk-5x106wnr.js:13332-13986 placement
function ownerUidsOf(s, e, i) {
  if (!s.ok) return { skipped: `stat of the root failed: ${k(s.error)}` };
  if (!e.ok) return { skipped: `lstat of .git failed: ${k(e.error)}` };
  if (!i.ok) return { skipped: `lstat of .claude failed: ${k(i.error)}` };
  let n = w(s.value);
  if (n === void 0)
    return { skipped: s.value.kind === "absent" ? "the root is absent" : "no owner uid for the root" };
  let r = w(e.value);
  if (r === void 0)
    return {
      skipped:
        e.value.kind === "absent"
          ? "no .git entry (left to the probe's per-call throw)"
          : "no owner uid for .git",
    };
  let a = null;
  if (i.value.kind !== "absent") {
    let g = w(i.value);
    if (g === void 0) return { skipped: "no owner uid for .claude" };
    a = g;
  }
  return { uids: { rootUid: n, gitEntryUid: r, claudeEntryUid: a } };
}
//@ chunk-5x106wnr.js:13986-14038 placement
function w(s) {
  return s.kind === "absent" ? void 0 : s.uid;
}
//@ chunk-5x106wnr.js:14038-14116 placement
function k(s) {
  return s.code === "Failed" ? (s.telemetryCode ?? s.failureClass) : s.code;
}

export { resetSettingsCacheWithBackendRead, seedUserSettings, primeSettings };
