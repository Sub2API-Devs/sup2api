/**
 * bootstrap/stateSlices.ts
 *
 * 全局状态切片类：配置目录归属、强制登录键、用量计数、工具摘要标记等（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5ythzcas.js (79)
 * attribution: placement 76, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { dirname, basename, resolve } from "path";
import { createSignal } from "../utils/signal.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { HostScoped } from "../utils/hostScoped.js";
import {
  currentSession,
  getAgentContext,
  getHookHolder,
  defaultRootSession,
  agentContextGetter,
} from "./state.js";
import { mergeProjectDirs } from "./sessionSlices.js";
import { SESSION_URL_HASH_SALT } from "../utils/sessionUrl.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5ythzcas.js:1565-1618 placement
/**
 * typeof 为 object 且非 null，用于结构比较前的快速判断。
 */
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-5ythzcas.js:1618-1656 placement
/**
 * 结构相等判断（忽略值为 undefined 的键，不允许多次配对同一节点）：设置/文档比较用。
 */
function deepEqualIgnoringUndefined(left, right) {
  return structurallyEqualGraphs(left, right, definedEntries, false);
}
//@ chunk-5ythzcas.js:1656-1705 placement
function deepEqualWithCycles(left, right) {
  return structurallyEqualGraphs(left, right, Object.entries, true);
}
//@ chunk-5ythzcas.js:1705-2073 placement
/**
 * 用显式栈比较两棵（可能有环的）对象图：o 枚举子项，r 为真时允许同一对节点重复配对（容忍环）。叶子按 === 比较，容器先比外形（ft）再逐键下钻。
 */
function structurallyEqualGraphs(left, right, childEntries, allowCycles) {
  let seenPairs = new Map();
  let pendingPairs = [[left, right]];
  while (pendingPairs.length > 0) {
    let [leftValue, rightValue] = pendingPairs.pop();
    if (!isObjectLike(leftValue) || !isObjectLike(rightValue)) {
      if (leftValue !== rightValue) return false;
      continue;
    }
    let rightSet = seenPairs.get(leftValue);
    if (rightSet !== undefined) {
      if (rightSet.has(rightValue)) continue;
      if (!allowCycles) return false;
      rightSet.add(rightValue);
    } else seenPairs.set(leftValue, new Set([rightValue]));
    let rightEntries = new Map(childEntries(rightValue));
    let leftEntries = childEntries(leftValue);
    if (!haveSameContainerKind(leftValue, rightValue) || leftEntries.length !== rightEntries.size)
      return false;
    for (let [key, childValue] of leftEntries) {
      if (!rightEntries.has(key)) return false;
      pendingPairs.push([childValue, rightEntries.get(key)]);
    }
  }
  return true;
}
//@ chunk-5ythzcas.js:2073-2140 placement
function definedEntries(value) {
  return Object.entries(value).filter(([, value]) => value !== undefined);
}
//@ chunk-5ythzcas.js:2140-2278 placement
function haveSameContainerKind(left, right) {
  if (Array.isArray(left) || Array.isArray(right))
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length;
  return isPlainObject(left) && isPlainObject(right);
}
//@ chunk-5ythzcas.js:2278-2362 placement
function isPlainObject(value) {
  let prototypeOf = Object.getPrototypeOf(value);
  return prototypeOf === Object.prototype || prototypeOf === null;
}
//@ chunk-5ythzcas.js:2362-2702 placement
/**
 * 托管设置文件的软链接遍历记录：walked 记每个路径的链接目标，folderIsLink 记目录是否为链接，managedMcp 为托管 MCP 文件；all() 列出全部链接目标。
 */
class ManagedDocumentLinks {
  walked = new Map();
  folderIsLink = new Map();
  managedMcp = null;
  clearWalk() {
    this.walked.clear();
    this.folderIsLink.clear();
  }
  noteWalked(path, resolveLink) {
    if (!this.walked.has(path)) this.walked.set(path, resolveLink());
  }
  linkOf(path) {
    return this.walked.get(path) ?? null;
  }
  isLinked(path) {
    return this.linkOf(path) !== null;
  }
  all() {
    return [...this.walked.values(), this.managedMcp].filter((link) => link !== null);
  }
}
//@ chunk-5ythzcas.js:2702-2814 placement
var CONFIG_DIR_UNSAFE_REASONS = [
  "not_admin_owned",
  "other_writable",
  "group_writable",
  "symlinked",
  "unknown",
  "not_evaluated",
  "protected",
];
//@ chunk-5ythzcas.js:2814-3122 placement
/**
 * 判定配置目录是否管理员所有、是否组/他人可写或为符号链接
 */
function classifyConfigDirOwnership({ file, folder, linked, posix }) {
  if (!posix) return "not_evaluated";
  if (file === undefined || folder === undefined) return linked ? "symlinked" : "unknown";
  if (file.uid !== 0 || folder.uid !== 0) return "not_admin_owned";
  let modeBits = file.mode | folder.mode;
  if ((modeBits & 2) !== 0) return "other_writable";
  if ((modeBits & 16) !== 0) return "group_writable";
  return linked ? "symlinked" : "protected";
}
//@ chunk-5ythzcas.js:3122-3463 placement
/**
 * 判断文件/目录是否可被当前有效用户改写：root 直接可写；属主为 euid 或其他人可写（mode&2）为真；组可写（mode&16）时看 euid 是否在该组；信息不全返回 undefined。非 POSIX 或无 euid 时返回 undefined。
 */
function isWritableByCurrentUser({ file, folder, euid, groups, posix }) {
  if (!posix || euid === undefined) return;
  if (euid === 0) return true;
  let filtered = [file, folder].filter((stat) => stat !== undefined);
  let mapped = filtered.map((stat) => {
    if (stat.uid === euid || (stat.mode & 2) !== 0) return true;
    if ((stat.mode & 16) === 0) return false;
    return stat.gid === undefined ? undefined : groups().includes(stat.gid);
  });
  if (mapped.includes(true)) return true;
  return filtered.length < 2 || mapped.includes(undefined) ? undefined : false;
}
//@ chunk-5ythzcas.js:3463-3718 placement
/**
 * 托管设置文件的保护记录：documents（路径→保护判定）、folderOwners、siblingRecords，以及是否设置了组织锁定（setsOrgPin）。
 */
class ManagedFileProtections {
  documents = new Map();
  folderOwners = new Map();
  siblingRecords = new Map();
  setsOrgPin = false;
  clear() {
    this.documents.clear();
    this.folderOwners.clear();
    this.siblingRecords.clear();
    this.setsOrgPin = false;
  }
  note(path, record) {
    this.documents.set(path, record);
  }
  all() {
    return [...this.documents];
  }
}
//@ chunk-5ythzcas.js:3718-3879 placement
function createHookedMergeState() {
  return {
    answers: null,
    computed: null,
    pass: Promise.resolve(),
    queuedFor: undefined,
    isAnnouncing: false,
    askedOf: "",
    askedAbout: null,
    visited: [],
    unsettled: new Set(),
  };
}
//@ chunk-5ythzcas.js:3879-5131 placement
/**
 * 仓库级设置层的冻结器：engage() 时取一份层快照并引用计数，release/abandon 释放；持有期间 tier() 返回冻结值，linger 可在无人持有时保留一份延迟快照；baseline 用于 differingTiers 计算与基线不同的层。
 */
class RepoTierFreeze {
  holders = 0;
  tiers;
  baseline;
  lingering;
  tier(key) {
    if (this.holders === 0 && this.lingering !== undefined) {
      let lingeredTiers = this.lingering();
      if (lingeredTiers === undefined) this.lingering = undefined;
      this.tiers = lingeredTiers;
    }
    return this.tiers?.get(key);
  }
  engage(loadTiers, loadBaseline) {
    let saved;
    if (this.holders === 0) {
      let tiers = loadTiers();
      let baseline = loadBaseline?.() ?? tiers;
      if (this.lingering !== undefined) {
        saved = {
          tiers: this.tiers,
          lingering: this.lingering,
        };
        this.lingering = undefined;
      }
      this.tiers = tiers;
      this.baseline = baseline;
    }
    this.holders++;
    let released = false;
    return {
      release: () => {
        if (released)
          return {
            last: false,
          };
        released = true;
        this.holders--;
        if (this.holders > 0)
          return {
            last: false,
          };
        this.tiers = undefined;
        this.lingering = undefined;
        this.baseline = undefined;
        return {
          last: true,
        };
      },
      abandon: () => {
        if (released) return;
        released = true;
        this.holders--;
        if (this.holders === 0) {
          this.tiers = saved?.tiers;
          this.lingering = saved?.lingering;
          this.baseline = undefined;
        }
      },
    };
  }
  whileLive(run) {
    let tiers = this.tiers;
    let lingering = this.lingering;
    this.tiers = undefined;
    this.lingering = undefined;
    try {
      return run();
    } finally {
      this.tiers = tiers;
      this.lingering = lingering;
    }
  }
  baselineTier(key) {
    return this.baseline?.get(key);
  }
  differingTiers(current) {
    return this.baseline === undefined ? [] : diffTierKeys(this.baseline, current);
  }
  rebaseline(current, keys) {
    if (this.baseline === undefined) return;
    let nextBaseline = new Map(this.baseline);
    for (let key of keys) {
      let tier = current.get(key);
      if (tier === undefined) nextBaseline.delete(key);
      else nextBaseline.set(key, tier);
    }
    this.baseline = nextBaseline;
  }
  linger(tiers, lingering) {
    if (this.holders === 0) {
      this.tiers = tiers;
      this.lingering = lingering;
      this.baseline = undefined;
    }
  }
  isHeld() {
    return this.holders > 0;
  }
}
//@ chunk-5ythzcas.js:5131-5197 placement
/**
 * 空对象归一为 null：设置读取时把 {} 视为"没有值"。
 */
function nullIfEmptyObject(value) {
  return value !== null && Object.keys(value).length === 0 ? null : value;
}
//@ chunk-5ythzcas.js:5197-5324 placement
function normalizeTierForCompare(tier) {
  return {
    ...tier,
    settings: nullIfEmptyObject(tier.settings),
    unfiltered: nullIfEmptyObject(tier.unfiltered),
    ...(tier.legacy !== undefined && {
      legacy: nullIfEmptyObject(tier.legacy),
    }),
  };
}
//@ chunk-5ythzcas.js:5324-5470 placement
function diffTierKeys(baseline, other) {
  return [...baseline.keys(), ...[...other.keys()].filter((key) => !baseline.has(key))].filter((key) => {
    let baselineTier = baseline.get(key);
    let otherTier = other.get(key);
    return !deepEqualWithCycles(
      baselineTier && normalizeTierForCompare(baselineTier),
      otherTier && normalizeTierForCompare(otherTier),
    );
  });
}
//@ chunk-5ythzcas.js:5470-5542 placement
var FORCE_LOGIN_SETTING_KEYS = ["forceLoginOrgUUID", "forceLoginMethod", "forceLoginGatewayUrl"];
//@ chunk-5ythzcas.js:5542-10585 placement
/**
 * 设置读取的全局缓存：合并结果、各来源结果、已解析文件、目录列表、托管文件链接/保护、策略层遍历计数、插件基础层与保留层（storage v5）。invalidateAll 递增 epoch 清空缓存（可保留用户层），seed*\/unseed* 按 epoch 写入预读结果，*InstallVerdict 判定预读结果能否安装（install/raced/deferred）。
 */
class SettingsCacheStore {
  mergedSettings = null;
  perSource = new Map();
  parsedFiles = new Map();
  firstReads = new Map();
  ownWritesBeforeFirstCheck = new Map();
  firstReadsChecked = false;
  managedDocumentLinks = new ManagedDocumentLinks();
  managedFileProtections = new ManagedFileProtections();
  folderListings = new Map();
  managedFileReads = new Map();
  primedFiles = new Set();
  policyWalks = 0;
  walkedFolders = new Map();
  policy = {};
  lastPolicyEnvComposition = null;
  isLoadingFromDisk = false;
  autoModeUntrustedSourceWarned = false;
  parentLeftOutReason = null;
  changed = createSignal();
  internalWrites = new Map();
  enabledSources;
  inlineFlagParse;
  repoTierFreeze = new RepoTierFreeze();
  hookedMerge = createHookedMergeState();
  pluginBase;
  epoch = 0;
  systemSpaceServingLogged = false;
  systemAttestationContradicted = false;
  backendReadResetTail = Promise.resolve();
  backgroundWorkTail = Promise.resolve();
  invalidated = createSignal();
  pluginBaseLoaded = false;
  primer;
  lastSeededUserLayer;
  localStoreProbes = new LocalStoreProbes();
  retained = new Map();
  retainedListings = new Map();
  noteFirstRead(path, listing) {
    if (!this.firstReadsChecked && !this.firstReads.has(path)) this.firstReads.set(path, listing);
  }
  noteOwnWrite(path) {
    if (!this.firstReadsChecked)
      this.ownWritesBeforeFirstCheck.set(path, (this.ownWritesBeforeFirstCheck.get(path) ?? 0) + 1);
  }
  withdrawOwnWrite(path) {
    let left = (this.ownWritesBeforeFirstCheck.get(path) ?? 0) - 1;
    if (left > 0) this.ownWritesBeforeFirstCheck.set(path, left);
    else this.ownWritesBeforeFirstCheck.delete(path);
  }
  forgetFirstReads({ checkAgain = false } = {}) {
    this.firstReads.clear();
    this.ownWritesBeforeFirstCheck.clear();
    if (checkAgain) this.firstReadsChecked = false;
  }
  setPluginBase(pluginBase) {
    this.pluginBase = pluginBase;
    this.pluginBaseLoaded = true;
  }
  clearPluginBase() {
    this.pluginBase = undefined;
  }
  invalidateAll(options) {
    this.epoch++;
    this.mergedSettings = null;
    this.perSource.clear();
    this.parsedFiles.clear();
    this.managedDocumentLinks.clearWalk();
    this.managedFileProtections.clear();
    this.primedFiles.clear();
    this.policyWalks = 0;
    this.walkedFolders.clear();
    this.folderListings.clear();
    this.policy = {};
    if (options?.userLayer === "retain" && isStorageV5Enabled() && this.primer !== undefined) {
      for (let [path, entry] of this.retained) {
        this.parsedFiles.set(path, entry.parsed);
        this.primedFiles.add(path);
      }
      for (let [path, entry] of this.retainedListings) this.folderListings.set(path, entry.names);
    } else {
      this.retained.clear();
      this.retainedListings.clear();
    }
    this.invalidated.emit();
  }
  invalidatePolicyLayer() {
    this.mergedSettings = null;
    this.perSource.delete("policySettings");
    this.policy = {};
  }
  onInvalidate(listener) {
    return this.invalidated.subscribe(listener);
  }
  seedParsedFile(path, sourceName, parsed, epoch) {
    if (epoch !== this.epoch) return false;
    let previous = this.parsedFiles.get(path);
    let unchanged = previous !== undefined && settingsEqualIgnoringOwner(previous, parsed);
    let changed = !unchanged;
    let next = unchanged ? previous : parsed;
    this.parsedFiles.set(path, next);
    if (sourceName === "userSettings")
      this.lastSeededUserLayer = {
        path,
        parsed: next,
      };
    if (changed || this.primedFiles.has(path)) this.primedFiles.add(path);
    let retainedEntry = this.retained.get(path);
    if (retainedEntry !== undefined) retainedEntry.parsed = next;
    if (changed) this.dropDerivedCaches(sourceName);
    return true;
  }
  walkReadDiffers(path, parsed) {
    let previous = this.parsedFiles.get(path);
    return previous !== undefined && !this.primedFiles.has(path) && !deepEqualWithCycles(previous, parsed);
  }
  unseedParsedFile(path, sourceName, epoch) {
    if (epoch !== this.epoch) return;
    this.retained.delete(path);
    if (!this.primedFiles.has(path) || (sourceName === "policySettings" && this.policyWalks > 0)) return;
    this.primedFiles.delete(path);
    this.parsedFiles.delete(path);
    this.dropDerivedCaches(sourceName);
  }
  dropDerivedCaches(sourceName) {
    this.perSource.delete(sourceName);
    this.mergedSettings = null;
    if (sourceName === "policySettings") this.policy = {};
  }
  primedFolderListing(folder) {
    return isStorageV5Enabled() ? this.folderListings.get(folder) : undefined;
  }
  folderListingForPolicyWalk(folder) {
    if (!isStorageV5Enabled()) return;
    this.policyWalks++;
    let names = this.folderListings.get(folder);
    if (!this.walkedFolders.has(folder) || names !== undefined) this.walkedFolders.set(folder, names ?? null);
    return names;
  }
  noteWalkListing(folder, names) {
    if (!isStorageV5Enabled()) return;
    this.walkedFolders.set(folder, names);
  }
  get policyWalkCount() {
    return this.policyWalks;
  }
  policyInstallVerdict(path, parsed, policyWalks) {
    let previous = this.parsedFiles.get(path);
    if (previous === undefined || settingsEqualIgnoringOwner(previous, parsed)) return "install";
    if (!this.primedFiles.has(path)) return "raced";
    if (this.policyWalks === 0) return "install";
    return this.policyWalks > policyWalks ? "raced" : "deferred";
  }
  folderInstallVerdict(folder, names, policyWalks) {
    if (!this.walkedFolders.has(folder))
      return this.hasParsedDropInOutside(folder, names) ? "raced" : "install";
    let walkedNames = this.walkedFolders.get(folder);
    if (walkedNames !== null && walkedNames !== undefined && deepEqualWithCycles(walkedNames, names))
      return "install";
    return this.policyWalks > policyWalks ? "raced" : "deferred";
  }
  seedFolderListing(folder, names, epoch) {
    if (epoch !== this.epoch) return false;
    let previous = this.folderListings.get(folder);
    this.folderListings.set(folder, names);
    let retainedEntry = this.retainedListings.get(folder);
    if (retainedEntry !== undefined) retainedEntry.names = names;
    if (previous !== undefined && !deepEqualWithCycles(previous, names))
      this.dropDerivedCaches("policySettings");
    return true;
  }
  walkReadManagedFileIn(filePath, folderPath) {
    for (let [path, entry] of this.parsedFiles)
      if (
        !path.includes("\x00") &&
        !this.primedFiles.has(path) &&
        (entry.settings !== null || entry.errors.length > 0) &&
        (path === filePath || dirname(path) === folderPath)
      )
        return true;
    return false;
  }
  walkRead(path) {
    return this.parsedFiles.has(path) && !this.primedFiles.has(path);
  }
  hasParsedDropInOutside(folder, names) {
    for (let key of this.parsedFiles.keys())
      if (
        !key.includes("\x00") &&
        !this.primedFiles.has(key) &&
        dirname(key) === folder &&
        !names.includes(basename(key))
      )
        return true;
    return false;
  }
  clearFolderListing(folder, epoch) {
    if (epoch !== this.epoch) return;
    this.retainedListings.delete(folder);
    if (!this.folderListings.has(folder) || this.walkedFolders.has(folder)) return;
    this.folderListings.delete(folder);
    this.dropDerivedCaches("policySettings");
  }
  retainLayer(path, parsed) {
    let previous = this.parsedFiles.get(path);
    let entry = {
      parsed: previous !== undefined && settingsEqualIgnoringOwner(previous, parsed) ? previous : parsed,
    };
    this.retained.set(path, entry);
    return () => {
      if (this.retained.get(path) === entry) this.retained.delete(path);
    };
  }
  dropRetainedLayer(path) {
    this.retained.delete(path);
  }
  retainFolderListing(folder, names) {
    let entry = {
      names,
    };
    this.retainedListings.set(folder, entry);
    return () => {
      if (this.retainedListings.get(folder) === entry) this.retainedListings.delete(folder);
    };
  }
}
//@ chunk-5ythzcas.js:10585-11134 placement
/**
 * 本地存储探测缓存：按根目录缓存属主 uid 列表，以及规范化后的真实家目录。
 */
class LocalStoreProbes {
  ownerUidsByRoot = new Map();
  realHomeDir = undefined;
  canonicalRootOwnerUids(root, computeOwnerUids) {
    let uids = this.ownerUidsByRoot.get(root);
    if (uids !== undefined) return uids;
    let computed = computeOwnerUids(root);
    this.ownerUidsByRoot.set(root, computed);
    return computed;
  }
  hasCanonicalRootOwnerUids(root) {
    return this.ownerUidsByRoot.has(root);
  }
  primeCanonicalRootOwnerUids(root, uids) {
    if (this.ownerUidsByRoot.has(root)) return false;
    this.ownerUidsByRoot.set(root, uids);
    return true;
  }
  clearCanonicalRootOwnerUids() {
    this.ownerUidsByRoot.clear();
  }
  normalizedRealHomeDir(computeHomeDir) {
    this.realHomeDir ??= computeHomeDir();
    return this.realHomeDir;
  }
  clearNormalizedRealHomeDir() {
    this.realHomeDir = undefined;
  }
}
//@ chunk-5ythzcas.js:11134-11161 placement
/**
 * 按会话宿主缓存的 SettingsCacheStore（设置缓存与派生缓存的容器）。
 */
var SETTINGS_CACHE_STORE_SLOT; // deferred: uses SettingsCacheStore of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5ythzcas.js:11134", () => {
  SETTINGS_CACHE_STORE_SLOT = new HostScoped(() => new SettingsCacheStore());
});
//@ chunk-5ythzcas.js:11161-11235 placement
function settingsEqualIgnoringOwner(left, right) {
  return deepEqualWithCycles(
    {
      ...left,
      fileOwner: undefined,
    },
    {
      ...right,
      fileOwner: undefined,
    },
  );
}
//@ chunk-5ythzcas.js:11235-11731 placement
/**
 * 新建一份"粘性 beta 头"会话状态：已发送/被拒绝的 beta、声明的工具集、只发名字的工具公告、内联工具被拒记录、wire 形状种子、媒体数量上限、被拒工具 schema 等。
 */
function createStickyBetaLatches() {
  return {
    sent: new Set(),
    rejected: new Set(),
    declaredTools: undefined,
    noChannelTools: undefined,
    turnDeniedTools: undefined,
    declaredToolsDecided: false,
    nameOnlyAnnouncements: new Set(),
    surfacedOnWire: new Set(),
    definedByValue: new Set(),
    inlineToolsRefusal: {
      rejectedHeader: undefined,
      announcementsByName: new Set(),
    },
    advisorHeld: undefined,
    wireShapeSeed: undefined,
    webSearchHistoryRejected: false,
    mediaItemCap: undefined,
    refusedToolSchemas: new Map(),
    systemMessagesAcceptedBy: new Set(),
    nameOnlyEntries: {
      held: new Set(),
      refused: false,
      reported: undefined,
    },
  };
}
//@ chunk-5ythzcas.js:11731-12495 placement
/**
 * 为子代理/侧查询复制粘性 beta 状态：已发送、被拒、公告等集合深拷贝，但 declaredTools/noChannelTools/turnDeniedTools 重置为未决定。
 */
function forkStickyBetaLatches(parent) {
  return {
    sent: new Set(parent.sent),
    rejected: new Set(parent.rejected),
    declaredTools: undefined,
    noChannelTools: undefined,
    turnDeniedTools: undefined,
    declaredToolsDecided: false,
    nameOnlyAnnouncements: new Set(parent.nameOnlyAnnouncements),
    surfacedOnWire: new Set(parent.surfacedOnWire),
    definedByValue: new Set(parent.definedByValue),
    inlineToolsRefusal: {
      rejectedHeader: parent.inlineToolsRefusal.rejectedHeader,
      announcementsByName: new Set(parent.inlineToolsRefusal.announcementsByName),
    },
    advisorHeld: parent.advisorHeld,
    wireShapeSeed: parent.wireShapeSeed,
    webSearchHistoryRejected: parent.webSearchHistoryRejected,
    mediaItemCap: parent.mediaItemCap,
    refusedToolSchemas: new Map(parent.refusedToolSchemas),
    systemMessagesAcceptedBy: new Set(parent.systemMessagesAcceptedBy),
    nameOnlyEntries: {
      ...parent.nameOnlyEntries,
      held: new Set(parent.nameOnlyEntries.held),
    },
  };
}
//@ chunk-5ythzcas.js:12495-13310 placement
/**
 * 完整复制粘性 beta 状态（含声明的工具集与决定标记），用于需要与父对话完全一致的分叉代理。
 */
function cloneStickyBetaLatches(latches) {
  return {
    sent: new Set(latches.sent),
    rejected: new Set(latches.rejected),
    declaredTools: latches.declaredTools,
    noChannelTools: latches.noChannelTools,
    turnDeniedTools: latches.turnDeniedTools,
    declaredToolsDecided: latches.declaredToolsDecided,
    nameOnlyAnnouncements: new Set(latches.nameOnlyAnnouncements),
    surfacedOnWire: new Set(latches.surfacedOnWire),
    definedByValue: new Set(latches.definedByValue),
    inlineToolsRefusal: {
      rejectedHeader: latches.inlineToolsRefusal.rejectedHeader,
      announcementsByName: new Set(latches.inlineToolsRefusal.announcementsByName),
    },
    advisorHeld: latches.advisorHeld,
    wireShapeSeed: latches.wireShapeSeed,
    webSearchHistoryRejected: latches.webSearchHistoryRejected,
    mediaItemCap: latches.mediaItemCap,
    refusedToolSchemas: new Map(latches.refusedToolSchemas),
    systemMessagesAcceptedBy: new Set(latches.systemMessagesAcceptedBy),
    nameOnlyEntries: {
      ...latches.nameOnlyEntries,
      held: new Set(latches.nameOnlyEntries.held),
    },
  };
}
//@ chunk-5ythzcas.js:13310-13427 placement
/**
 * 清除会话（/clear）时调用：先重置部分粘性记录，再清空 nameOnlyEntries 的 held/refused/reported。
 */
function resetStickyBetaNameOnlyEntries(stickyBetas) {
  resetDeclaredTools(stickyBetas);
  stickyBetas.nameOnlyEntries.held.clear();
  stickyBetas.nameOnlyEntries.refused = false;
  stickyBetas.nameOnlyEntries.reported = undefined;
}
//@ chunk-5ythzcas.js:13427-13516 placement
/**
 * 清空 declaredTools/noChannelTools 并把 declaredToolsDecided 置 false（粘性 beta 状态重置的一步）。
 */
function resetDeclaredTools(conversation) {
  conversation.declaredTools = undefined;
  conversation.noChannelTools = undefined;
  conversation.declaredToolsDecided = false;
}
//@ chunk-5ythzcas.js:13516-13715 placement
/**
 * 清空 systemMessagesAcceptedBy，并把 wireShapeSeed 带来的 sent/rejected beta 从集合里撤回，然后丢弃种子。
 */
function dropWireShapeSeed(stickyBetas) {
  stickyBetas.systemMessagesAcceptedBy.clear();
  let wireShapeSeed = stickyBetas.wireShapeSeed;
  if (wireShapeSeed === undefined) return;
  for (let beta of wireShapeSeed.sent) stickyBetas.sent.delete(beta);
  for (let beta of wireShapeSeed.rejected) stickyBetas.rejected.delete(beta);
  stickyBetas.wireShapeSeed = undefined;
}
//@ chunk-5ythzcas.js:13715-13811 placement
/**
 * 把上一份粘性 beta 状态的 sent/rejected 集合并回新状态，并挂上 wireShapeSeed，供后续撤销。
 */
function applyWireShapeSeed(stickyBetas, seed) {
  for (let beta of seed.sent) markBetaSent(stickyBetas, beta);
  for (let beta of seed.rejected) markBetaRejected(stickyBetas, beta);
  stickyBetas.wireShapeSeed = seed;
}
//@ chunk-5ythzcas.js:13811-13939 layout
function conversation(conversation, beta) {
  let wireShapeSeed = conversation.wireShapeSeed;
  conversation.wireShapeSeed = {
    record: wireShapeSeed?.record ?? {},
    sent: wireShapeSeed?.sent ?? [],
    rejected: [...(wireShapeSeed?.rejected ?? []), beta],
  };
}
//@ chunk-5ythzcas.js:13939-13976 placement
/**
 * 清掉 advisorHeld 标记（撤销此前暂扣的 advisor 头）。
 */
function clearAdvisorHeld(stickyBetas) {
  stickyBetas.advisorHeld = undefined;
}
//@ chunk-5ythzcas.js:13976-14194 placement
/**
 * 撤销"内联工具被拒"记录：从 rejected 删除被拒的头，从 nameOnlyAnnouncements 删除按名字公告的工具并清空该集合。
 */
function clearInlineToolsRefusal(stickyBetas) {
  let { rejectedHeader, announcementsByName } = stickyBetas.inlineToolsRefusal;
  if (rejectedHeader !== undefined) {
    stickyBetas.rejected.delete(rejectedHeader);
    stickyBetas.inlineToolsRefusal.rejectedHeader = undefined;
  }
  for (let name of announcementsByName) stickyBetas.nameOnlyAnnouncements.delete(name);
  announcementsByName.clear();
}
//@ chunk-5ythzcas.js:14194-14240 placement
/**
 * 清掉 advisorHeld 后返回同一对象，便于链式构造解锁状态。
 */
function clearAdvisorHeldAndReturn(stickyBetas) {
  stickyBetas.advisorHeld = undefined;
  return stickyBetas;
}
//@ chunk-5ythzcas.js:14240-14282 placement
/**
 * 把 declaredToolsDecided 置 true：声明的工具集已经确定，不再追加。
 */
function markDeclaredToolsDecided(stickyBetas) {
  stickyBetas.declaredToolsDecided = true;
}
//@ chunk-5ythzcas.js:14282-14897 placement
/**
 * 生成一份解锁后的粘性 beta 状态：新建空状态，只保留声明工具集、advisor、wire 种子、内联拒绝、web search 历史拒绝、媒体上限、被拒 schema 与 nameOnlyEntries 的拒绝/上报标记。
 */
function unlatchStickyBetaLatches(previous) {
  let stickyBetas = createStickyBetaLatches();
  stickyBetas.declaredTools = previous.declaredTools;
  stickyBetas.noChannelTools = previous.noChannelTools;
  stickyBetas.turnDeniedTools = previous.turnDeniedTools;
  stickyBetas.declaredToolsDecided = previous.declaredToolsDecided;
  stickyBetas.advisorHeld = previous.advisorHeld;
  if (previous.wireShapeSeed !== undefined) applyWireShapeSeed(stickyBetas, previous.wireShapeSeed);
  let { rejectedHeader, announcementsByName } = previous.inlineToolsRefusal;
  if (rejectedHeader !== undefined) rejectInlineToolsHeader(stickyBetas, rejectedHeader);
  addNameOnlyAnnouncements(stickyBetas, announcementsByName);
  stickyBetas.webSearchHistoryRejected = previous.webSearchHistoryRejected;
  stickyBetas.mediaItemCap = previous.mediaItemCap;
  for (let [name, reason] of previous.refusedToolSchemas) stickyBetas.refusedToolSchemas.set(name, reason);
  stickyBetas.nameOnlyEntries.refused = previous.nameOnlyEntries.refused;
  stickyBetas.nameOnlyEntries.reported = previous.nameOnlyEntries.reported;
  return stickyBetas;
}
//@ chunk-5ythzcas.js:14897-14961 placement
/**
 * 把某个头记入拒绝集合并写入 inlineToolsRefusal.rejectedHeader（内联工具被拒）。
 */
function rejectInlineToolsHeader(stickyBetas, headerName) {
  markBetaRejected(stickyBetas, headerName);
  stickyBetas.inlineToolsRefusal.rejectedHeader = headerName;
}
//@ chunk-5ythzcas.js:14961-15073 placement
/**
 * 把一组工具名同时记入内联拒绝的按名公告集合和 nameOnlyAnnouncements。
 */
function addNameOnlyAnnouncements(stickyBetas, names) {
  for (let name of names) {
    stickyBetas.inlineToolsRefusal.announcementsByName.add(name);
    stickyBetas.nameOnlyAnnouncements.add(name);
  }
}
//@ chunk-5ythzcas.js:15073-15144 placement
/**
 * 首次设置 declaredTools 并标记为已决定。
 */
function setDeclaredTools(stickyBetas, declaredTools) {
  if (stickyBetas.declaredTools === undefined) stickyBetas.declaredTools = declaredTools;
  markDeclaredToolsDecided(stickyBetas);
}
//@ chunk-5ythzcas.js:15144-15261 placement
/**
 * 返回已在 wire 上露出的工具名集合；有按值定义的工具时与 definedByValue 合并。
 */
function getSurfacedToolNames(stickyBetas) {
  return stickyBetas.definedByValue.size === 0
    ? stickyBetas.surfacedOnWire
    : new Set([...stickyBetas.surfacedOnWire, ...stickyBetas.definedByValue]);
}
//@ chunk-5ythzcas.js:15261-15314 placement
/**
 * 标记某个 beta 头已发送（未被拒绝时才记入 sent）。
 */
function markBetaSent(betaState, beta) {
  if (!betaState.rejected.has(beta)) betaState.sent.add(beta);
}
//@ chunk-5ythzcas.js:15314-15372 placement
/**
 * 判断某个 beta 头已发送且未被拒绝。
 */
function isBetaSent(stickyBetas, beta) {
  return stickyBetas.sent.has(beta) && !stickyBetas.rejected.has(beta);
}
//@ chunk-5ythzcas.js:15372-15424 placement
/**
 * 标记某个 beta 头被拒：从 sent 删除并加入 rejected。另附同名 inlineToolsRefusal 记录。
 */
function markBetaRejected(conversation, beta) {
  conversation.sent.delete(beta);
  conversation.rejected.add(beta);
}
//@ chunk-5ythzcas.js:15424-15466 placement
/**
 * 判断某个 beta 头是否被拒绝。
 */
function isBetaRejected(betaState, beta) {
  return betaState.rejected.has(beta);
}
//@ chunk-5ythzcas.js:15466-15522 placement
/**
 * 忘记某个 beta 头：sent 与 rejected 两边都删除。
 */
function forgetBeta(stickyBetas, beta) {
  stickyBetas.sent.delete(beta);
  stickyBetas.rejected.delete(beta);
}
//@ chunk-5ythzcas.js:15522-15568 placement
/**
 * 标记 web search 历史相关 beta 已被拒绝，后续不再发送。
 */
function markWebSearchHistoryRejected(conversation) {
  conversation.webSearchHistoryRejected = true;
}
//@ chunk-5ythzcas.js:15568-15614 placement
/**
 * 清除 web search 历史被拒标记。
 */
function clearWebSearchHistoryRejected(stickyBetas) {
  stickyBetas.webSearchHistoryRejected = false;
}
//@ chunk-5ythzcas.js:15614-15687 placement
/**
 * 按模型取媒体条目上限缓存：模型不匹配时返回 undefined。
 */
function mediaItemCapForModel(conversation, effectiveModel) {
  return conversation.mediaItemCap?.model === effectiveModel ? conversation.mediaItemCap : undefined;
}
//@ chunk-5ythzcas.js:15687-15722 placement
/**
 * 记录某模型下的媒体条目上限。
 */
function setMediaItemCap(conversation, mediaItemCap) {
  conversation.mediaItemCap = mediaItemCap;
}
//@ chunk-5ythzcas.js:15722-15760 placement
/**
 * 清除媒体条目上限缓存。
 */
function clearMediaItemCap(stickyBetas) {
  stickyBetas.mediaItemCap = undefined;
}
//@ chunk-5ythzcas.js:15760-15805 placement
/**
 * 清空被拒绝的工具 schema 缓存。
 */
function clearRefusedToolSchemas(stickyBetas) {
  stickyBetas.refusedToolSchemas.clear();
}
//@ chunk-5ythzcas.js:15805-15886 placement
class SessionObservers {
  spawner = undefined;
  pairings = new Map();
  mainEnsureInFlight = false;
  mainSlotBlocked = false;
}
//@ chunk-5ythzcas.js:15886-15963 placement
/**
 * 可安全出现在工具名单里的名字字符集（1–256 个 [A-Za-z0-9_.:-]）；不合规的名字在摘要中替换为固定占位。
 */
var TOOL_NAME_PATTERN = /^[A-Za-z0-9_.:-]{1,256}$/;
var UNREADABLE_TOOLS_USED_BEFORE_SUMMARY = "unreadable-tools-used-before-summary";
//@ chunk-5ythzcas.js:15963-16039 placement
/**
 * 把工具名规范成可出现在 <tools-used-before-summary> 的文本：不合规时返回固定占位 UNREADABLE_TOOLS_USED_BEFORE_SUMMARY。
 */
function readableToolName(toolName) {
  return TOOL_NAME_PATTERN.test(toolName) ? toolName : "unreadable-tools-used-before-summary";
}
//@ chunk-5ythzcas.js:16039-16074 placement
var TOOLS_USED_BEFORE_SUMMARY_TAG = "tools-used-before-summary";
//@ chunk-5ythzcas.js:16074-16138 placement
/**
 * 生成 <tools-used-before-summary>…</tools-used-before-summary> 标签文本，逐个名字先按 xre 规范化。
 */
function formatToolsUsedBeforeSummary(toolNames) {
  return `<${TOOLS_USED_BEFORE_SUMMARY_TAG}>${toolNames.map(readableToolName).join(", ")}</${TOOLS_USED_BEFORE_SUMMARY_TAG}>`;
}
//@ chunk-5ythzcas.js:16138-16207 placement
/**
 * 判断工具名是否为 Gmail 附件下载工具（以 download_gmail_attachment 结尾）。
 */
function isGmailAttachmentTool(toolName) {
  return /(?:^|__|:)download_gmail_attachment$/.test(toolName);
}
//@ chunk-5ythzcas.js:16207-16218 layout
var MAX_DELIVERED = 256;
//@ chunk-5ythzcas.js:16218-17342 placement
/**
 * 会话里"已使用工具"名单：record 规范化后去重记入并递增代数，built() 按代数缓存派生值，reportTruncationOnce 只报一次截断。
 */
class ToolsUsedSet {
  #e = new Set();
  #t = 0;
  #n = false;
  #s;
  #o;
  #i = new Set();
  #r = new Map();
  record(toolNames) {
    let added = false;
    for (let toolName of toolNames) {
      if (typeof toolName !== "string" || toolName === "") continue;
      let readableName = readableToolName(toolName);
      for (let listenerLog of this.#i) listenerLog.push(readableName);
      if (!this.#e.has(readableName)) {
        this.#e.add(readableName);
        added = true;
      }
    }
    if (added) this.#t++;
    return added;
  }
  has(name) {
    return this.#e.has(name);
  }
  noteDelivered(key, value) {
    this.#r.delete(key);
    this.#r.set(key, value);
    for (let key of this.#r.keys()) {
      if (this.#r.size <= MAX_DELIVERED) break;
      this.#r.delete(key);
    }
  }
  takeDelivered(key) {
    let value = this.#r.get(key);
    this.#r.delete(key);
    return value;
  }
  names() {
    return [...this.#e];
  }
  size() {
    return this.#e.size;
  }
  generation() {
    return this.#t;
  }
  built(build) {
    if (this.#o?.generation !== this.#t)
      this.#o = {
        generation: this.#t,
        value: build(this.names()),
      };
    return this.#o.value;
  }
  raiseHeaderSizeSteps(step) {
    let previous = this.#s;
    if (
      previous &&
      step.count <= previous.count &&
      step.bytes <= previous.bytes &&
      (previous.capped || !step.capped)
    )
      return false;
    this.#s = {
      count: Math.max(step.count, previous?.count ?? 0),
      bytes: Math.max(step.bytes, previous?.bytes ?? 0),
      capped: step.capped || previous?.capped === true,
    };
    return true;
  }
  reportTruncationOnce() {
    if (this.#n) return false;
    this.#n = true;
    return true;
  }
  captureRecords() {
    let records = [];
    this.#i.add(records);
    return records;
  }
  endCapture(unused) {
    this.#i.delete(unused);
  }
  replace(toolNames) {
    this.clear();
    this.record(toolNames);
  }
  clear() {
    this.#e.clear();
    this.#t++;
    this.#n = false;
  }
}
//@ chunk-5ythzcas.js:17342-17616 placement
/**
 * 会话锁存切片：粘性 beta 状态（stickyBetas/unlatchStickyBetas）、ATIS 锁存值与监听、已用工具集合。
 */
class ConversationLatches {
  #e = createStickyBetaLatches();
  #t = undefined;
  #n;
  toolsUsed = new ToolsUsedSet();
  stickyBetas() {
    return this.#e;
  }
  unlatchStickyBetas() {
    this.#e = unlatchStickyBetaLatches(this.#e);
  }
  atisLatch() {
    return this.#t;
  }
  replaceAtisLatch(latch) {
    this.#t = latch;
    this.#n?.(latch);
  }
  watchAtisLatch(watch) {
    this.#n = watch;
  }
  reset() {
    this.#e = createStickyBetaLatches();
    this.#t = undefined;
    this.toolsUsed.clear();
  }
}
//@ chunk-5ythzcas.js:17616-17705 placement
/**
 * 四类 token 用量（输入/输出/缓存读/缓存写）全零的初值对象，用作费用账本的初始值。
 */
var ZERO_TOKEN_USAGE = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
};
//@ chunk-5ythzcas.js:17705-17771 placement
function nullProtoCopy(modelUsage) {
  let copy = Object.create(null);
  return Object.assign(copy, modelUsage);
}
//@ chunk-5ythzcas.js:17771-17850 placement
function cloneModelUsage(modelUsage) {
  let copy = nullProtoCopy();
  for (let [key, value] of Object.entries(modelUsage))
    copy[key] = {
      ...value,
    };
  return copy;
}
//@ chunk-5ythzcas.js:17850-21759 placement
/**
 * 会话费用账本：总费用、API/工具耗时、增删行数、各模型用量、侧查询费用、安全停止次数、已花 token；支持 restore/snapshot 与按会话认领（claim/scopeTo/belongsTo），记账时触发 spendRecorded 信号。
 */
class CostLedger {
  #e = 0;
  #t = 0;
  #n = 0;
  #s = 0;
  #o = Date.now();
  #i = undefined;
  #r = 0;
  #d = 0;
  #u = 0;
  #c = ZERO_TOKEN_USAGE;
  #l = 0;
  #h = ZERO_TOKEN_USAGE;
  #p = false;
  #a = 0;
  #f = nullProtoCopy();
  #v = undefined;
  #S = null;
  #y = null;
  #g = null;
  spendRecorded = createSignal();
  totalCostUSD() {
    return this.#e;
  }
  restoredCostUSD() {
    return this.#u;
  }
  restoredTokens() {
    return this.#c;
  }
  sideQueryCostUSD() {
    return this.#l;
  }
  totalAPIDuration() {
    return this.#t;
  }
  totalAPIDurationWithoutRetries() {
    return this.#n;
  }
  totalToolDuration() {
    return this.#s;
  }
  totalDuration() {
    return Math.max(0, Date.now() - this.#o);
  }
  sessionStartTime() {
    return this.#i ?? this.#o;
  }
  totalLinesAdded() {
    return this.#r;
  }
  totalLinesRemoved() {
    return this.#d;
  }
  hasUnknownModelCost() {
    return this.#p;
  }
  safetyStops() {
    return this.#a;
  }
  modelUsage() {
    return this.#f;
  }
  usageForModel(model) {
    return this.#f[model];
  }
  trackUsageSinceLastResult() {
    this.#v ??= nullProtoCopy();
  }
  usageSinceLastResult() {
    return this.#v;
  }
  takeUsageSinceLastResult() {
    let usage = this.#v;
    if (usage !== undefined) this.#v = nullProtoCopy();
    return usage;
  }
  totalInputTokens() {
    return this.#m("inputTokens");
  }
  totalOutputTokens() {
    return this.#m("outputTokens");
  }
  totalCacheReadInputTokens() {
    return this.#m("cacheReadInputTokens");
  }
  totalCacheCreationInputTokens() {
    return this.#m("cacheCreationInputTokens");
  }
  totalWebSearchRequests() {
    return this.#m("webSearchRequests");
  }
  #m(field) {
    let total = 0;
    for (let usage of Object.values(this.#f)) total += usage[field];
    return total;
  }
  recordApiDuration(durationMs, durationWithoutRetriesMs) {
    this.#t += durationMs;
    this.#n += durationWithoutRetriesMs;
  }
  spentTokens() {
    return this.#h;
  }
  recordSpentTokens(tokens) {
    let previous = this.#h;
    this.#h = {
      inputTokens: previous.inputTokens + tokens.inputTokens,
      outputTokens: previous.outputTokens + tokens.outputTokens,
      cacheReadInputTokens: previous.cacheReadInputTokens + tokens.cacheReadInputTokens,
      cacheCreationInputTokens: previous.cacheCreationInputTokens + tokens.cacheCreationInputTokens,
    };
    this.spendRecorded.emit();
  }
  recordCost(costUsd, usage, model) {
    this.#f[model] = usage;
    this.#e += costUsd;
    this.spendRecorded.emit();
  }
  recordSideQueryCost(costUsd) {
    if (Number.isFinite(costUsd) && costUsd >= 0) {
      this.#l += costUsd;
      this.spendRecorded.emit();
    }
  }
  recordToolDuration(durationMs) {
    this.#s += durationMs;
  }
  recordLinesChanged(added, removed) {
    this.#r += added;
    this.#d += removed;
  }
  markUnknownModelCost() {
    this.#p = true;
  }
  recordSafetyStop() {
    this.#a += 1;
  }
  zeroDurationsAndCostForTests() {
    this.#t = 0;
    this.#n = 0;
    this.#e = 0;
    this.#u = 0;
  }
  restartClock() {
    this.#o = Date.now();
    this.anchorLogicalStart(undefined);
  }
  anchorLogicalStart(startTime) {
    this.#i = startTime === undefined ? undefined : Math.min(startTime, this.#o);
  }
  restore(
    {
      totalCostUSD,
      totalAPIDuration,
      totalAPIDurationWithoutRetries,
      totalToolDuration,
      totalLinesAdded,
      totalLinesRemoved,
      lastDuration,
      startTime,
      modelUsage,
      hasUnknownModelCost,
    },
    ownerSessionId,
  ) {
    this.#g = ownerSessionId;
    this.#e = totalCostUSD;
    this.#u = totalCostUSD;
    this.#t = totalAPIDuration;
    this.#n = totalAPIDurationWithoutRetries;
    this.#s = totalToolDuration;
    this.#r = totalLinesAdded;
    this.#d = totalLinesRemoved;
    this.#p = hasUnknownModelCost ?? false;
    if (modelUsage) this.#f = nullProtoCopy(modelUsage);
    this.#c = {
      inputTokens: this.totalInputTokens(),
      outputTokens: this.totalOutputTokens(),
      cacheReadInputTokens: this.totalCacheReadInputTokens(),
      cacheCreationInputTokens: this.totalCacheCreationInputTokens(),
    };
    if (lastDuration !== undefined) this.#o = Date.now() - lastDuration;
    this.anchorLogicalStart(startTime);
  }
  registerSaver(saver) {
    this.#S = saver;
  }
  runSaver(payload, fallback) {
    (this.#S ?? (fallback ? fallback.#S : null))?.(payload);
  }
  registerTranscriptRecorder(recorder) {
    this.#y = recorder;
  }
  runTranscriptRecorder(recorder, options, fallback) {
    (this.#y ?? (fallback ? fallback.#y : null))?.(recorder, options);
  }
  snapshot() {
    return {
      ownerSessionId: this.#g,
      totalCostUSD: this.#e,
      totalAPIDuration: this.#t,
      totalAPIDurationWithoutRetries: this.#n,
      totalToolDuration: this.#s,
      startTime: this.#o,
      sessionLogicalStartTime: this.#i,
      totalLinesAdded: this.#r,
      totalLinesRemoved: this.#d,
      restoredCostUSD: this.#u,
      restoredTokens: this.#c,
      hasUnknownModelCost: this.#p,
      safetyStops: this.#a,
      modelUsage: cloneModelUsage(this.#f),
    };
  }
  restoreSnapshot(snapshot) {
    this.#g = snapshot.ownerSessionId;
    this.#e = snapshot.totalCostUSD;
    this.#t = snapshot.totalAPIDuration;
    this.#n = snapshot.totalAPIDurationWithoutRetries;
    this.#s = snapshot.totalToolDuration;
    this.#o = snapshot.startTime;
    this.#i = snapshot.sessionLogicalStartTime;
    this.#r = snapshot.totalLinesAdded;
    this.#d = snapshot.totalLinesRemoved;
    this.#u = snapshot.restoredCostUSD;
    this.#c = snapshot.restoredTokens;
    this.#p = snapshot.hasUnknownModelCost;
    this.#a = snapshot.safetyStops;
    this.#f = cloneModelUsage(snapshot.modelUsage);
  }
  claim(sessionId) {
    this.#g ??= sessionId;
  }
  scopeTo(sessionId) {
    this.#g = sessionId;
  }
  ownerSessionId() {
    return this.#g;
  }
  belongsTo(sessionId) {
    return this.#g === sessionId;
  }
  reset(sessionId) {
    this.#g = sessionId;
    this.#e = 0;
    this.#u = 0;
    this.#c = ZERO_TOKEN_USAGE;
    this.#t = 0;
    this.#n = 0;
    this.#s = 0;
    this.#o = Date.now();
    this.anchorLogicalStart(undefined);
    this.#r = 0;
    this.#d = 0;
    this.#p = false;
    this.#a = 0;
    this.#f = nullProtoCopy();
  }
}
//@ chunk-5ythzcas.js:21759-22087 placement
/**
 * 仅用量额度模型的同意记录：按会话的回退同意集合与会话同意键表。
 */
class UsageCreditsConsentSlots {
  #e = new Set();
  #t = new Map();
  consentSessionFallback(modelFamily) {
    return this.#e.has(modelFamily);
  }
  replaceConsentSessionFallback(modelFamily, consented) {
    if (consented) this.#e.add(modelFamily);
    else this.#e.delete(modelFamily);
  }
  sessionConsentKey(modelFamily) {
    return this.#t.get(modelFamily) ?? null;
  }
  replaceSessionConsentKey(modelFamily, ownerKey) {
    if (ownerKey === null) this.#t.delete(modelFamily);
    else this.#t.set(modelFamily, ownerKey);
  }
  reset() {
    this.#e.clear();
    this.#t.clear();
  }
}
//@ chunk-5ythzcas.js:22087-22391 placement
/**
 * 钩子注册切片：registeredHooks 持有者、主线程代理类型与主线程代理钩子。
 */
class HookRegistry {
  #e = {
    registeredHooks: null,
  };
  #t = undefined;
  #n = undefined;
  holder() {
    return this.#e;
  }
  mainThreadAgentType() {
    return this.#t;
  }
  replaceMainThreadAgentType(agentType) {
    this.#t = agentType;
  }
  mainThreadAgentHooks() {
    return this.#n;
  }
  replaceMainThreadAgentHooks(hooks) {
    this.#n = hooks;
  }
  reset() {
    this.#e = {
      registeredHooks: null,
    };
    this.#t = undefined;
    this.#n = undefined;
  }
}
//@ chunk-5ythzcas.js:22391-22576 placement
/**
 * 本会话已调用技能表：按名字记录/查询/遗忘。
 */
class InvokedSkills {
  #e = new Map();
  skills() {
    return this.#e;
  }
  lookup(key) {
    return this.#e.get(key);
  }
  record(key, skill) {
    this.#e.set(key, skill);
  }
  forget(key) {
    this.#e.delete(key);
  }
  forgetAll() {
    this.#e.clear();
  }
  reset() {
    this.#e = new Map();
  }
}
//@ chunk-5ythzcas.js:22576-23518 placement
/**
 * MCP 会话接线切片：已批准的服务器（按工作区）、客户端访问器、已连接客户端接线、工具替换器与连接表；acquire* 系列只允许一个持有者并返回释放函数。
 */
class McpSessionWiring {
  #e = [];
  #t;
  #n;
  #s;
  #o;
  #i;
  approvedServers() {
    return this.#e;
  }
  approveServers(workspaceKey, serverNames) {
    for (let serverName of serverNames)
      if (!this.#e.some((approved) => approved.name === serverName && approved.workspaceKey === workspaceKey))
        this.#e.push({
          name: serverName,
          workspaceKey,
        });
  }
  registerClientsAccessor(accessor) {
    this.#t = accessor;
  }
  acquireClientsAccessor(accessor) {
    if (this.#t) return () => {};
    this.#t = accessor;
    return () => {
      if (this.#t === accessor) this.#t = undefined;
    };
  }
  clientsFromAccessor() {
    return this.#t?.();
  }
  registerTenantClients(getTenantClients) {
    this.#n = getTenantClients;
  }
  clientsFromAccessorOrTenant() {
    return (this.#t ?? this.#n)?.();
  }
  registerConnectedClientWiring(a) {
    this.#s = a;
  }
  connectedClientWiring() {
    return this.#s;
  }
  registerToolsSwapper(swapper) {
    this.#o = swapper;
  }
  acquireToolsSwapper(swapper) {
    if (this.#o) return () => {};
    this.#o = swapper;
    return () => {
      if (this.#o === swapper) this.#o = undefined;
    };
  }
  swapServerTools(serverName, config, options) {
    if (!this.#o) return false;
    return this.#o(serverName, config, options);
  }
  registerConnections(connections) {
    this.#i = connections;
  }
  acquireConnections(connections) {
    if (this.#i) return () => {};
    this.#i = connections;
    return () => {
      if (this.#i === connections) this.#i = undefined;
    };
  }
  connections() {
    return this.#i;
  }
  reset() {
    this.#e = [];
    this.#t = undefined;
  }
}
//@ chunk-5ythzcas.js:23518-25115 placement
/**
 * 模型选择切片：主循环模型覆盖、effort 状态、初始模型及其设置层、组织默认、环境默认模型；拒绝回退（refusal fallback）发生/头锁存/静默通道标记与回退模型锁存、可用性回退链。
 */
class ModelSelectionSlice {
  #e = undefined;
  #t = undefined;
  #n = undefined;
  #s = undefined;
  #o = undefined;
  #i = undefined;
  #r = false;
  #d = false;
  #u = undefined;
  #c = false;
  #l = undefined;
  #h = undefined;
  #p = undefined;
  mainLoopModelOverride() {
    return this.#e;
  }
  overrideMainLoopModel(model) {
    this.#e = model;
  }
  mainLoopEffortState() {
    return this.#t;
  }
  replaceMainLoopEffortState(effortState) {
    this.#t = effortState;
  }
  initialMainLoopModel() {
    return this.#n;
  }
  replaceInitialMainLoopModel(model) {
    this.#n = model;
  }
  initialModelSettingLayer() {
    return this.#s;
  }
  replaceInitialModelSettingLayer(layer) {
    this.#s = layer;
  }
  resolvedOrgDefault() {
    return this.#o;
  }
  replaceResolvedOrgDefault(orgDefault) {
    this.#o = orgDefault;
  }
  initialEnvDefaultModel() {
    return this.#i;
  }
  replaceInitialEnvDefaultModel(model) {
    this.#i = model;
  }
  refusalFallbackOccurred() {
    return this.#r;
  }
  markRefusalFallbackOccurred(requestId) {
    this.#r = true;
    this.#u ??= requestId;
  }
  refusalFallbackHeaderArmed() {
    return this.#d;
  }
  armRefusalFallbackHeader(requestId) {
    this.#d = true;
    this.#u ??= requestId;
  }
  refusalFallbackLatchOriginRequestId() {
    return this.#u;
  }
  silentLaneServerArmed() {
    return this.#c;
  }
  armSilentLaneFromServer() {
    this.#c = true;
  }
  forgetRefusalFallbackOccurred() {
    this.#r = false;
    this.#d = false;
    this.#c = false;
    this.#u = undefined;
  }
  refusalFallbackModelLatch() {
    return this.#l;
  }
  replaceRefusalFallbackModelLatch(latch, reason = "superseded") {
    if (this.#l?.carriedEffort !== undefined && latch?.carriedEffort === undefined) this.#h = reason;
    this.#l = latch;
  }
  unlatchRefusalFallbackModel(reason) {
    this.replaceRefusalFallbackModelLatch(undefined, reason);
  }
  takeCarriedEffortEnd() {
    let carriedEffortEnd = this.#h;
    this.#h = undefined;
    return carriedEffortEnd;
  }
  availabilityFallbackChain() {
    return this.#p;
  }
  replaceAvailabilityFallbackChain(chain) {
    this.#p = chain;
  }
  reset() {
    this.#e = undefined;
    this.#t = undefined;
    this.#n = undefined;
    this.#s = undefined;
    this.#o = undefined;
    this.#i = undefined;
    this.#r = false;
    this.#d = false;
    this.#c = false;
    this.#u = undefined;
    this.#l = undefined;
    this.#h = undefined;
    this.#p = undefined;
  }
}
//@ chunk-5ythzcas.js:25115-25384 placement
/**
 * 系统提示词分段缓存：sections 记录各段，noteInvalidation 递增 epoch 并记原因。
 */
class PromptAssemblySlice {
  #e = new Map();
  #t = 0;
  #n = undefined;
  sections() {
    return this.#e;
  }
  recordSection(key, section) {
    this.#e.set(key, section);
  }
  forgetAllSections() {
    this.#e.clear();
  }
  noteInvalidation(reason = "other") {
    this.#t += 1;
    this.#n = reason;
  }
  epoch() {
    return this.#t;
  }
  lastInvalidationReason() {
    return this.#n;
  }
  reset() {
    this.#e = new Map();
  }
}
//@ chunk-5ythzcas.js:25384-28002 placement
/**
 * 请求日志切片：最近一次 API 请求/消息/分类器请求、promptId 与序号、最近人工提示、主线程请求 id 与响应、主线程缓存 TTL 与续期时间、上下文 token、恢复种子、最近完成时间、压缩后待处理标记。
 */
class RequestJournal {
  #e = null;
  #t = null;
  #n = null;
  #s = null;
  #o = null;
  #i = 0;
  #r = null;
  #d = undefined;
  #u = 0;
  #c = undefined;
  #l = null;
  #h = null;
  #p = null;
  #a = null;
  #f = null;
  #v = false;
  #S = null;
  #y = null;
  #g = false;
  lastAPIRequest() {
    return this.#e;
  }
  replaceLastAPIRequest(request) {
    this.#e = request;
  }
  lastCancelledAPIMessageId() {
    return this.#t;
  }
  replaceLastCancelledAPIMessageId(messageId) {
    this.#t = messageId;
  }
  lastAPIRequestMessages() {
    return this.#n;
  }
  replaceLastAPIRequestMessages(messages) {
    this.#n = messages;
  }
  lastClassifierRequests() {
    return this.#s;
  }
  replaceLastClassifierRequests(requests) {
    this.#s = requests;
  }
  promptId() {
    return this.#o;
  }
  replacePromptId(promptId) {
    this.#o = promptId;
  }
  promptIndex() {
    return this.#i;
  }
  replacePromptIndex(index) {
    this.#i = index;
  }
  incrementPromptIndex() {
    this.#i++;
    return this.#i;
  }
  lastPersonPrompt() {
    return this.#r;
  }
  replaceLastPersonPrompt(prompt) {
    this.#r = prompt;
  }
  lastMainRequestId() {
    return this.#d;
  }
  replaceLastMainRequestId(requestId, response) {
    this.#d = requestId;
    this.#c = response;
    if (requestId === undefined) this.#u += 1;
  }
  lastMainResponse() {
    return this.#c;
  }
  mainChainReleaseCount() {
    return this.#u;
  }
  lastMainThreadCacheTtlMs() {
    return this.#l;
  }
  replaceLastMainThreadCacheTtlMs(ttlMs, model, isRenewal = false) {
    this.#l = ttlMs;
    this.#a = Date.now();
    this.#p = {
      ttlMs,
      model,
      requestAt: this.#a,
      askedAt: isRenewal ? (this.#p?.askedAt ?? this.#a) : this.#a,
    };
    this.#f = this.#a;
    this.#v = true;
  }
  isLastMainThreadAskLive(ttlMs, model) {
    let clientPlatform = this.#p;
    return (
      clientPlatform !== null &&
      clientPlatform.requestAt === this.#a &&
      clientPlatform.ttlMs === ttlMs &&
      clientPlatform.model === model &&
      Date.now() - clientPlatform.askedAt < ttlMs
    );
  }
  adjustLastMainThreadCacheTtlMs(ttlMs) {
    this.#l = ttlMs;
  }
  recordLastMainThreadCacheRenewal(at) {
    if (this.#a !== null)
      this.#h = {
        requestAt: this.#a,
        at: Math.max(at, this.lastMainThreadCacheRenewedAt() ?? -1 / 0),
      };
  }
  lastMainThreadCacheRenewedAt() {
    let renewal = this.#h;
    return renewal !== null && renewal.requestAt === this.#a ? renewal.at : null;
  }
  lastLiveMainThreadRequestAt() {
    return this.#f;
  }
  lastMainThreadRequestAt() {
    return this.#a;
  }
  mainThreadRequestedInProcess() {
    return this.#v;
  }
  recordMainThreadTurnStart() {
    this.#v = true;
  }
  replaceLastMainThreadRequest(requestAt, ttlMs) {
    this.#a = requestAt;
    this.#l = ttlMs;
  }
  lastMainThreadContextTokens() {
    return this.#S;
  }
  replaceLastMainThreadContextTokens(tokens) {
    this.#S = tokens;
  }
  stageResumeSeed(seed) {
    this.#m = seed;
  }
  applyResumeSeed(seed) {
    this.#m = null;
    this.#l = seed.ttlMs;
    this.#a = seed.requestAt;
    this.#p = buildLiveAskFromSeed(seed);
    this.#S = seed.contextTokens;
  }
  #m = null;
  clearLastMainThreadRequest(sessionId) {
    let seed = sessionId !== undefined && this.#m?.sessionId === sessionId ? this.#m : null;
    this.#m = null;
    this.#l = seed?.ttlMs ?? null;
    this.#a = seed?.requestAt ?? null;
    this.#p = buildLiveAskFromSeed(seed);
    this.#S = seed?.contextTokens ?? null;
    this.#f = null;
    this.#v = false;
  }
  lastApiCompletionTimestamp() {
    return this.#y;
  }
  replaceLastApiCompletionTimestamp(timestamp) {
    this.#y = timestamp;
  }
  pendingPostCompaction() {
    return this.#g;
  }
  replacePendingPostCompaction(pending) {
    this.#g = pending;
  }
  reset() {
    this.#e = null;
    this.#t = null;
    this.#n = null;
    this.#s = null;
    this.#o = null;
    this.#i = 0;
    this.#r = null;
    this.#d = undefined;
    this.#c = undefined;
    this.#u += 1;
    this.#l = null;
    this.#a = null;
    this.#f = null;
    this.#v = false;
    this.#S = null;
    this.#m = null;
    this.#y = null;
    this.#g = false;
  }
}
//@ chunk-5ythzcas.js:28002-28143 layout
function buildLiveAskFromSeed(seed) {
  return seed?.ask !== undefined && seed.requestAt !== null && seed.requestAt <= Date.now()
    ? {
        ...seed.ask,
        requestAt: seed.requestAt,
        askedAt: seed.requestAt,
      }
    : null;
}
//@ chunk-5ythzcas.js:28143-28893 placement
/**
 * 会话定时任务切片：任务列表、各链开始时间、tick 中的提示与插件、连续 keepalive 次数、结束标记与唤醒次数；changed/pendingLoopWakeup 两个信号。
 */
class SessionCron {
  #e = [];
  #t = Object.create(null);
  #n = null;
  #s = undefined;
  #o = 0;
  #i = false;
  #r = 0;
  changed = createSignal();
  pendingLoopWakeup = createSignal();
  tasks() {
    return this.#e;
  }
  schedule(task) {
    this.#e.push(task);
  }
  replaceTasks(tasks) {
    this.#e = tasks;
  }
  chainStartedAt(chainId) {
    return this.#t[chainId];
  }
  recordChainStart(chainId, startedAt) {
    this.#t[chainId] = startedAt;
  }
  forgetChainStart(chainId) {
    delete this.#t[chainId];
  }
  tickInFlightPrompt() {
    return this.#n;
  }
  tickInFlightPlugin() {
    return this.#s;
  }
  replaceTickInFlightPrompt(prompt, plugin) {
    this.#n = prompt;
    this.#s = prompt === null ? undefined : plugin;
  }
  consecutiveKeepalives() {
    return this.#o;
  }
  replaceConsecutiveKeepalives(count) {
    this.#o = count;
  }
  ended() {
    return this.#i;
  }
  replaceEnded(ended) {
    this.#i = ended;
  }
  wakeFires() {
    return this.#r;
  }
  recordWakeFire() {
    this.#r++;
  }
  resetWakeFires() {
    this.#r = 0;
  }
  reset() {
    this.#e = [];
    this.#t = Object.create(null);
    this.#n = null;
    this.#s = undefined;
    this.#o = 0;
    this.#i = false;
    this.#r = 0;
  }
}
//@ chunk-5ythzcas.js:28893-32399 placement
/**
 * 会话标志切片：引导/LSP 推荐是否已显示、信任对话框、计划/自动模式退出附件、记忆开关与暂停、账号记忆模式、各种 rollout 闸门锁存、技能/插件同步开关与否决、待处理的上下文压缩通知、例程、继承的团队名、teleport 会话信息、CLAUDE.md 缓存等。
 */
class SessionFlags {
  #e = false;
  #t = false;
  #n = false;
  #s = false;
  #o = false;
  #i = false;
  #r = false;
  #d = false;
  #u = false;
  #c = false;
  #l = false;
  #h = undefined;
  #p = false;
  #a = undefined;
  #f = false;
  #v = false;
  #S = null;
  #y = null;
  #g = null;
  #m = false;
  #b = null;
  #C = false;
  #x = false;
  #R = false;
  #w = false;
  #k = false;
  #P = undefined;
  #M = undefined;
  #T = undefined;
  #A = undefined;
  #L = null;
  #O = null;
  onboardingShownThisSession() {
    return this.#e;
  }
  replaceOnboardingShownThisSession(shown) {
    this.#e = shown;
  }
  lspRecommendationShownThisSession() {
    return this.#t;
  }
  replaceLspRecommendationShownThisSession(shown) {
    this.#t = shown;
  }
  sessionTrustAccepted() {
    return this.#n;
  }
  replaceSessionTrustAccepted(accepted) {
    this.#n = accepted;
  }
  homeTrustDialogAccepted() {
    return this.#s;
  }
  replaceHomeTrustDialogAccepted(accepted) {
    this.#s = accepted;
  }
  hasExitedPlanMode() {
    return this.#o;
  }
  replaceHasExitedPlanMode(hasExited) {
    this.#o = hasExited;
  }
  needsPlanModeExitAttachment() {
    return this.#i;
  }
  replaceNeedsPlanModeExitAttachment(needsAttachment) {
    this.#i = needsAttachment;
  }
  needsAutoModeExitAttachment() {
    return this.#r;
  }
  replaceNeedsAutoModeExitAttachment(needsAttachment) {
    this.#r = needsAttachment;
  }
  memoryToggledOff() {
    return this.#d;
  }
  replaceMemoryToggledOff(isToggledOff) {
    this.#d = isToggledOff;
  }
  autoMemoryOffThisSession() {
    return this.#u;
  }
  replaceAutoMemoryOffThisSession(isOff) {
    this.#u = isOff;
  }
  memoryPausedByCommand() {
    return this.#l;
  }
  replaceMemoryPausedByCommand(isPaused) {
    this.#l = isPaused;
  }
  accountMemorySessionMode() {
    return this.#h;
  }
  replaceAccountMemorySessionMode(mode, isRestored = false) {
    this.#h = mode;
    this.#p = isRestored && mode !== undefined;
  }
  accountMemorySessionModeRestored() {
    return this.#p;
  }
  accountMemoryLaunchMode() {
    return this.#a;
  }
  replaceAccountMemoryLaunchMode(mode) {
    this.#a = mode;
  }
  restoredMemoryPause() {
    return this.#f;
  }
  replaceRestoredMemoryPause(isPaused) {
    this.#f = isPaused;
  }
  restoredAutoMemoryOff() {
    return this.#c;
  }
  replaceRestoredAutoMemoryOff(isOff) {
    this.#c = isOff;
  }
  teardownUnwindRequested() {
    return this.#m;
  }
  replaceTeardownUnwindRequested(requested) {
    this.#m = requested;
  }
  backgroundAutoModeSetupInFlight() {
    return this.#v;
  }
  replaceBackgroundAutoModeSetupInFlight(inFlight) {
    this.#v = inFlight;
  }
  deferredToolStubGateLatch() {
    return this.#S;
  }
  replaceDeferredToolStubGateLatch(latch) {
    this.#S = latch;
  }
  verifySkillRolloutGateLatch() {
    return this.#y;
  }
  replaceVerifySkillRolloutGateLatch(latch) {
    this.#y = latch;
  }
  commitSkillRolloutGateLatch() {
    return this.#g;
  }
  replaceCommitSkillRolloutGateLatch(latch) {
    this.#g = latch;
  }
  memoryToolsShapeLatch() {
    return this.#b;
  }
  replaceMemoryToolsShapeLatch(latch) {
    this.#b = latch;
  }
  proposeGoalAvailabilityLogged() {
    return this.#C;
  }
  markProposeGoalAvailabilityLogged() {
    this.#C = true;
  }
  activeRoutine() {
    return this.#T;
  }
  replaceActiveRoutine(routine) {
    this.#T = routine;
  }
  inheritedTeamName() {
    return this.#A;
  }
  replaceInheritedTeamName(teamName) {
    this.#A = teamName;
  }
  teleportedSessionInfo() {
    return this.#L;
  }
  replaceTeleportedSessionInfo(info) {
    this.#L = info;
  }
  markFirstTeleportMessageLogged() {
    if (this.#L) this.#L.hasLoggedFirstMessage = true;
  }
  cachedClaudeMdContent() {
    return this.#O;
  }
  replaceCachedClaudeMdContent(content) {
    this.#O = content;
  }
  accountSkillsSyncEnabled() {
    return this.#x;
  }
  replaceAccountSkillsSyncEnabled(enabled) {
    this.#x = enabled;
  }
  skillsSyncVetoed() {
    return this.#R;
  }
  replaceSkillsSyncVetoed(vetoed) {
    this.#R = vetoed;
  }
  accountPluginsSyncEnabled() {
    return this.#w;
  }
  replaceAccountPluginsSyncEnabled(enabled) {
    this.#w = enabled;
  }
  pluginsSyncVetoed() {
    return this.#k;
  }
  replacePluginsSyncVetoed(vetoed) {
    this.#k = vetoed;
  }
  armPendingContextCompacted(info, response) {
    this.#P = info;
    this.#M = response;
  }
  consumePendingContextCompacted() {
    let info = this.#P;
    this.#P = undefined;
    return info;
  }
  forgetPendingContextCompacted() {
    this.#P = undefined;
    this.#M = undefined;
  }
  responseBeforeCompaction() {
    return this.#M;
  }
  forgetResponseBeforeCompaction() {
    this.#M = undefined;
  }
  reset() {
    this.#x = false;
    this.#R = false;
    this.#w = false;
    this.#k = false;
    this.#e = false;
    this.#t = false;
    this.#n = false;
    this.#s = false;
    this.#o = false;
    this.#i = false;
    this.#r = false;
    this.#d = false;
    this.#u = false;
    this.#l = false;
    this.#h = undefined;
    this.#p = false;
    this.#a = undefined;
    this.#f = false;
    this.#c = false;
    this.#m = false;
    this.#v = false;
    this.#S = null;
    this.#y = null;
    this.#g = null;
    this.#b = null;
    this.#C = false;
    this.#T = undefined;
    this.#A = undefined;
    this.#L = null;
    this.#O = null;
    this.#P = undefined;
    this.#M = undefined;
  }
}
//@ chunk-5ythzcas.js:32399-32622 placement
function createArrivingInboundFiles() {
  return {
    messagesArriving: 0,
    lastInLine: Promise.resolve(),
    gaveUpOn: undefined,
    besideLine: 0,
    lastBesideLine: Promise.resolve(),
    gaveUpOnBeside: undefined,
    pathsArrivingBeside: new Map(),
    toolCallsWaiting: 0,
    pathsArriving: new Map(),
  };
}
//@ chunk-5ythzcas.js:32622-34959 placement
/**
 * 会话暂存切片：计划 slug 缓存、待关联分支/PR、vim 共享状态、代理颜色、本会话建的团队与窗格、已提示过的失败、入站附件下载与到达队列、Chrome 可用性日志、目标空闲提醒/重新提示定时器、worker 签到；reset 会清掉所有定时器并中止下载。
 */
class SessionScratch {
  #e = new Map();
  #t = new Map();
  #n = null;
  #s = new Map();
  #o = new Set();
  #i = new Set();
  #r = new Set();
  #d = new Set();
  #u = new Set();
  #c = new Set();
  #l = new Set();
  #h = new Set();
  #p = new Set();
  #a = new Set();
  #f = new Map();
  #v = new Map();
  #S = new Map();
  #y;
  #g = {
    byFileUuid: new Map(),
    recentPrefetchStarts: [],
  };
  #m = createArrivingInboundFiles();
  #b = new Set();
  #C = undefined;
  #x = undefined;
  #R = undefined;
  #w = undefined;
  #k = undefined;
  planSlugCache() {
    return this.#e;
  }
  forgetPlanSlug(slug) {
    this.#e.delete(slug);
  }
  pendingBranchLinks() {
    return this.#t;
  }
  replacePendingBranchLinks() {
    this.#t = new Map();
  }
  vimSharedState() {
    return this.#n;
  }
  replaceVimSharedState(state) {
    this.#n = state;
  }
  agentColorMap() {
    return this.#s;
  }
  sessionCreatedTeams() {
    return this.#o;
  }
  sessionSpawnedTeammatePanes() {
    return this.#i;
  }
  surfacedHookSpawnFailures() {
    return this.#r;
  }
  bareMcpServerMatchersWarned() {
    return this.#d;
  }
  pendingConversationEditKinds() {
    return this.#u;
  }
  clientTruncatedAssistantIds() {
    return this.#c;
  }
  heldStatelessReplyIds() {
    return this.#l;
  }
  unsupportedThreadKeys() {
    return this.#h;
  }
  pendingPrLinks() {
    return this.#p;
  }
  policyPredicateTelemetryEmitted() {
    return this.#a;
  }
  humanAttachmentDigests() {
    return this.#f;
  }
  inboundAttachmentFiles() {
    return this.#v;
  }
  filesPlacedByName() {
    return this.#S;
  }
  filesPlacedByNameRead() {
    return this.#y;
  }
  setFilesPlacedByNameRead(reader) {
    this.#y = reader;
  }
  inboundAttachmentDownloads() {
    return this.#g;
  }
  arrivingInboundFiles() {
    return this.#m;
  }
  chromeAvailabilityStagesLogged() {
    return this.#b;
  }
  replaceChromeAvailabilityStagesLogged(stages) {
    this.#b = new Set();
    if (stages) this.#C = Date.now();
  }
  chromeAvailabilityAnchorMs() {
    return this.#C;
  }
  pendingGoalIdleCheckin() {
    return this.#x;
  }
  replacePendingGoalIdleCheckin(timer) {
    this.#x = timer;
  }
  pendingGoalReprompt() {
    return this.#R;
  }
  replacePendingGoalReprompt(timer) {
    this.#R = timer;
  }
  goalInterruptionStreak() {
    return this.#w;
  }
  replaceGoalInterruptionStreak(streak) {
    this.#w = streak;
  }
  workerCheckin() {
    return this.#k;
  }
  replaceWorkerCheckin(checkin) {
    this.#k = checkin;
  }
  reset() {
    this.#e = new Map();
    this.#t = new Map();
    this.#n = null;
    this.#s = new Map();
    this.#o = new Set();
    this.#i = new Set();
    this.#r = new Set();
    this.#d = new Set();
    this.#u = new Set();
    this.#c = new Set();
    this.#l = new Set();
    this.#h = new Set();
    this.#p = new Set();
    this.#a = new Set();
    this.#f = new Map();
    this.#v = new Map();
    this.#S = new Map();
    this.#y = undefined;
    for (let entry of this.#g.byFileUuid.values()) {
      clearTimeout(entry.expiry);
      entry.abort.abort();
    }
    this.#g = {
      byFileUuid: new Map(),
      recentPrefetchStarts: [],
    };
    this.#m = createArrivingInboundFiles();
    this.#b = new Set();
    this.#C = undefined;
    clearTimeout(this.#x);
    this.#x = undefined;
    clearTimeout(this.#R);
    this.#R = undefined;
    this.#w = undefined;
    clearInterval(this.#k?.timer);
    this.#k = undefined;
  }
}
//@ chunk-5ythzcas.js:34959-35060 placement
var DEFAULT_SURFACE_CAPS = {
  renderTarget: "ink",
  workspace: "local",
  canDrive: true,
  transcriptSource: "local-jsonl",
  remote: null,
};
//@ chunk-5ythzcas.js:35060-36913 placement
/**
 * 宿主界面能力切片：SDK 宿主是否接管对话框及支持的对话框种类、按任务停止、快速追问抢占、嵌套子代理工具转发、Chrome 设置提示；附着方能力、RV supervisor 连接、SDK betas、界面能力（本地/远程）、云端 cwd、REPL bridge 与主循环状态。
 */
class SurfaceCapabilities {
  #e = false;
  #t = undefined;
  #n = undefined;
  #s = undefined;
  #o = undefined;
  #i = undefined;
  #r = undefined;
  #d = null;
  #u = false;
  #c = undefined;
  #l = DEFAULT_SURFACE_CAPS;
  #h = false;
  #p = "idle";
  #a = null;
  attacherCapsChanged = createSignal();
  rvSupervisorLinkChanged = createSignal();
  cloudCwdChanged = createSignal();
  sdkDialogHostActive() {
    return this.#e;
  }
  markSdkDialogHostActive(isActive) {
    this.#e = isActive;
  }
  sdkSupportedDialogKinds() {
    return this.#t;
  }
  sdkSupportedDialogKindsSource() {
    return this.#n;
  }
  declareDialogKinds(kinds, source) {
    this.#t = kinds;
    this.#n = kinds === undefined ? undefined : source;
  }
  sdkPerTaskStopAffordance() {
    return this.#s;
  }
  declarePerTaskStopAffordance(affordance) {
    this.#s = affordance;
  }
  sdkRapidFollowupPreempt() {
    return this.#o;
  }
  declareRapidFollowupPreempt(preempt) {
    this.#o = preempt;
  }
  sdkForwardNestedSubagentToolCalls() {
    return this.#i;
  }
  declareForwardNestedSubagentToolCalls(forward) {
    this.#i = forward;
  }
  hostRendersChromeSetupOffer() {
    return this.#r;
  }
  declareHostRendersChromeSetupOffer(renders) {
    this.#r = renders;
  }
  attacherCaps() {
    return this.#d;
  }
  replaceAttacherCaps(caps) {
    this.#d = caps;
    this.attacherCapsChanged.emit();
  }
  rvSupervisorLinkLive() {
    return this.#u;
  }
  replaceRvSupervisorLinkLive(isLive) {
    if (this.#u === isLive) return;
    this.#u = isLive;
    this.rvSupervisorLinkChanged.emit();
  }
  sdkBetas() {
    return this.#c;
  }
  replaceSdkBetas(betas) {
    this.#c = betas;
  }
  caps() {
    return this.#l;
  }
  replaceCaps(caps) {
    this.#l = caps;
  }
  markRemote(isRemote) {
    this.#l = {
      ...this.#l,
      workspace: isRemote ? "remote" : "local",
    };
  }
  cloudCwdOfSession(sessionId) {
    return this.#l.workspace === "remote" && this.#a?.sessionId === sessionId ? this.#a.cwd : null;
  }
  replaceCloudCwd(cwd) {
    this.#a = cwd;
    this.cloudCwdChanged.emit();
  }
  replBridgeActive() {
    return this.#h;
  }
  replaceReplBridgeActive(isActive) {
    if (this.#h === isActive) return;
    this.#h = isActive;
  }
  mainLoopBusy() {
    return this.#p !== "idle";
  }
  mainQueryRunning() {
    return this.#p === "running";
  }
  replaceMainLoopStatus(status) {
    this.#p = status;
  }
  reset() {
    this.#e = false;
    this.#t = undefined;
    this.#n = undefined;
    this.#s = undefined;
    this.#o = undefined;
    this.#i = undefined;
    this.#r = undefined;
    this.#d = null;
    this.#c = undefined;
    this.#l = DEFAULT_SURFACE_CAPS;
    this.#h = false;
    this.#p = "idle";
    this.#u = false;
    this.#a = null;
    this.attacherCapsChanged.clear();
    this.rvSupervisorLinkChanged.clear();
    this.cloudCwdChanged.clear();
  }
}
//@ chunk-5ythzcas.js:36913-36924 placement
var SCROLL_IDLE_DEBOUNCE_MS = 150;
//@ chunk-5ythzcas.js:36924-37881 placement
/**
 * 用户在场切片：最近交互/提交/人工输入时间、终端焦点、滚动中标记（150ms 去抖）与 waitForScrollIdle；交互与焦点变化触发信号。
 */
class UserPresence {
  #e = Date.now();
  #t = false;
  #n = 0;
  #s = -1 / 0;
  interactionFired = createSignal();
  #o = undefined;
  terminalFocusFired = createSignal();
  #i = false;
  #r;
  lastInteractionTime() {
    return this.#e;
  }
  lastSubmitTime() {
    return this.#n;
  }
  recordSubmit() {
    this.#n = Date.now();
  }
  personWroteAt() {
    return this.#s;
  }
  notePersonWrote() {
    this.#s = performance.now();
  }
  recordInteraction(isImmediate) {
    if (isImmediate) this.#d();
    else this.#t = true;
  }
  flushIfDirty() {
    if (this.#t) this.#d();
  }
  #d() {
    this.#e = Date.now();
    this.#t = false;
    this.interactionFired.emit();
  }
  resetBaseline() {
    this.#e = Date.now();
    this.#t = false;
  }
  terminalFocus() {
    return this.#o;
  }
  updateTerminalFocus(focus) {
    this.#o = focus;
    this.terminalFocusFired.emit();
  }
  scrollDraining() {
    return this.#i;
  }
  markScrollActivity() {
    this.#i = true;
    if (this.#r) clearTimeout(this.#r);
    this.#r = setTimeout(() => {
      this.#i = false;
      this.#r = undefined;
    }, SCROLL_IDLE_DEBOUNCE_MS);
    this.#r.unref?.();
  }
  async waitForScrollIdle() {
    while (this.#i) await new Promise((resolve) => setTimeout(resolve, SCROLL_IDLE_DEBOUNCE_MS));
  }
  reset() {
    this.#e = Date.now();
    this.#n = 0;
    this.#s = -1 / 0;
    this.#o = undefined;
    this.interactionFired.clear();
    this.terminalFocusFired.clear();
  }
}
export {
  isBetaRejected,
  markBetaSent,
  isBetaSent,
  markBetaRejected,
  conversation,
  markDeclaredToolsDecided,
  setDeclaredTools,
  mediaItemCapForModel,
  forgetBeta,
  resetDeclaredTools,
  markWebSearchHistoryRejected,
  setMediaItemCap,
  clearMediaItemCap,
  addNameOnlyAnnouncements,
  forkStickyBetaLatches,
  rejectInlineToolsHeader,
  deepEqualIgnoringUndefined,
  TOOLS_USED_BEFORE_SUMMARY_TAG,
  readableToolName,
  getSurfacedToolNames,
  formatToolsUsedBeforeSummary,
  UNREADABLE_TOOLS_USED_BEFORE_SUMMARY,
  TOOL_NAME_PATTERN,
  createStickyBetaLatches,
  isGmailAttachmentTool,
  SettingsCacheStore,
  nullIfEmptyObject,
  CONFIG_DIR_UNSAFE_REASONS,
  dropWireShapeSeed,
  applyWireShapeSeed,
  isObjectLike,
  cloneStickyBetaLatches,
  clearAdvisorHeld,
  SessionObservers,
  ConversationLatches,
  CostLedger,
  UsageCreditsConsentSlots,
  HookRegistry,
  InvokedSkills,
  McpSessionWiring,
  ModelSelectionSlice,
  PromptAssemblySlice,
  RequestJournal,
  SessionCron,
  SessionFlags,
  SessionScratch,
  SurfaceCapabilities,
  UserPresence,
  deepEqualWithCycles,
  nullProtoCopy,
  unlatchStickyBetaLatches,
  ManagedDocumentLinks,
  ManagedFileProtections,
  RepoTierFreeze,
  settingsEqualIgnoringOwner,
  ToolsUsedSet,
  SETTINGS_CACHE_STORE_SLOT,
  resetStickyBetaNameOnlyEntries,
  clearInlineToolsRefusal,
  clearWebSearchHistoryRejected,
  clearRefusedToolSchemas,
  clearAdvisorHeldAndReturn,
  ZERO_TOKEN_USAGE,
  isWritableByCurrentUser,
  FORCE_LOGIN_SETTING_KEYS,
  classifyConfigDirOwnership,
};
