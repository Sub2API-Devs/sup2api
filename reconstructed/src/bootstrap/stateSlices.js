/**
 * bootstrap/stateSlices.ts
 *
 * 全局状态切片类：配置目录归属、强制登录键、用量计数、工具摘要标记等（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ndmse9kj.js (76)
 * attribution: placement 76
 */
import { dirname, basename, resolve } from "path";
import { createSignal } from "../utils/signal.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { HostScoped } from "../utils/hostScoped.js";
import {
  currentSession,
  getAgentContext,
  defaultRootSession,
  agentContextGetter,
  getHookHolder,
} from "./state.js";
import { mergeProjectDirs } from "./sessionSlices.js";
import { SESSION_URL_HASH_SALT } from "../utils/sessionUrl.js";

//@ chunk-ndmse9kj.js:1260-1313 placement
/**
 * typeof 为 object 且非 null，用于结构比较前的快速判断。
 */
function isObjectLike(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-ndmse9kj.js:1313-1351 placement
/**
 * 结构相等判断（忽略值为 undefined 的键，不允许多次配对同一节点）：设置/文档比较用。
 */
function deepEqualIgnoringUndefined(e, n) {
  return structurallyEqualGraphs(e, n, definedEntries, false);
}
//@ chunk-ndmse9kj.js:1351-1400 placement
function deepEqualWithCycles(e, n) {
  return structurallyEqualGraphs(e, n, Object.entries, true);
}
//@ chunk-ndmse9kj.js:1400-1768 placement
/**
 * 用显式栈比较两棵（可能有环的）对象图：o 枚举子项，r 为真时允许同一对节点重复配对（容忍环）。叶子按 === 比较，容器先比外形（ft）再逐键下钻。
 */
function structurallyEqualGraphs(left, right, childEntries, allowCycles) {
  let i = new Map();
  let s = [[left, right]];
  while (s.length > 0) {
    let [a, l] = s.pop();
    if (!isObjectLike(a) || !isObjectLike(l)) {
      if (a !== l) return false;
      continue;
    }
    let p = i.get(a);
    if (p !== undefined) {
      if (p.has(l)) continue;
      if (!allowCycles) return false;
      p.add(l);
    } else i.set(a, new Set([l]));
    let f = new Map(childEntries(l));
    let S = childEntries(a);
    if (!haveSameContainerKind(a, l) || S.length !== f.size) return false;
    for (let [u, m] of S) {
      if (!f.has(u)) return false;
      s.push([m, f.get(u)]);
    }
  }
  return true;
}
//@ chunk-ndmse9kj.js:1768-1835 placement
function definedEntries(e) {
  return Object.entries(e).filter(([, value]) => value !== undefined);
}
//@ chunk-ndmse9kj.js:1835-1973 placement
function haveSameContainerKind(e, n) {
  if (Array.isArray(e) || Array.isArray(n))
    return Array.isArray(e) && Array.isArray(n) && e.length === n.length;
  return isPlainObject(e) && isPlainObject(n);
}
//@ chunk-ndmse9kj.js:1973-2057 placement
function isPlainObject(e) {
  let prototypeOf = Object.getPrototypeOf(e);
  return prototypeOf === Object.prototype || prototypeOf === null;
}
//@ chunk-ndmse9kj.js:2057-2397 placement
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
  noteWalked(e, n) {
    if (!this.walked.has(e)) this.walked.set(e, n());
  }
  linkOf(e) {
    return this.walked.get(e) ?? null;
  }
  isLinked(e) {
    return this.linkOf(e) !== null;
  }
  all() {
    return [...this.walked.values(), this.managedMcp].filter((e) => e !== null);
  }
}
//@ chunk-ndmse9kj.js:2397-2509 placement
var CONFIG_DIR_UNSAFE_REASONS = [
  "not_admin_owned",
  "other_writable",
  "group_writable",
  "symlinked",
  "unknown",
  "not_evaluated",
  "protected",
];
//@ chunk-ndmse9kj.js:2509-2817 placement
/**
 * 判定配置目录是否管理员所有、是否组/他人可写或为符号链接
 */
function classifyConfigDirOwnership({ file, folder, linked, posix }) {
  if (!posix) return "not_evaluated";
  if (file === undefined || folder === undefined) return linked ? "symlinked" : "unknown";
  if (file.uid !== 0 || folder.uid !== 0) return "not_admin_owned";
  let i = file.mode | folder.mode;
  if ((i & 2) !== 0) return "other_writable";
  if ((i & 16) !== 0) return "group_writable";
  return linked ? "symlinked" : "protected";
}
//@ chunk-ndmse9kj.js:2817-3158 placement
/**
 * 判断文件/目录是否可被当前有效用户改写：root 直接可写；属主为 euid 或其他人可写（mode&2）为真；组可写（mode&16）时看 euid 是否在该组；信息不全返回 undefined。非 POSIX 或无 euid 时返回 undefined。
 */
function isWritableByCurrentUser({ file, folder, euid, groups, posix }) {
  if (!posix || euid === undefined) return;
  if (euid === 0) return true;
  let filtered = [file, folder].filter((l) => l !== undefined);
  let mapped = filtered.map((l) => {
    if (l.uid === euid || (l.mode & 2) !== 0) return true;
    if ((l.mode & 16) === 0) return false;
    return l.gid === undefined ? undefined : groups().includes(l.gid);
  });
  if (mapped.includes(true)) return true;
  return filtered.length < 2 || mapped.includes(undefined) ? undefined : false;
}
//@ chunk-ndmse9kj.js:3158-3413 placement
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
  note(e, n) {
    this.documents.set(e, n);
  }
  all() {
    return [...this.documents];
  }
}
//@ chunk-ndmse9kj.js:3413-3574 placement
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
//@ chunk-ndmse9kj.js:3574-4826 placement
/**
 * 仓库级设置层的冻结器：engage() 时取一份层快照并引用计数，release/abandon 释放；持有期间 tier() 返回冻结值，linger 可在无人持有时保留一份延迟快照；baseline 用于 differingTiers 计算与基线不同的层。
 */
class RepoTierFreeze {
  holders = 0;
  tiers;
  baseline;
  lingering;
  tier(e) {
    if (this.holders === 0 && this.lingering !== undefined) {
      let n = this.lingering();
      if (n === undefined) this.lingering = undefined;
      this.tiers = n;
    }
    return this.tiers?.get(e);
  }
  engage(e, n) {
    let o;
    if (this.holders === 0) {
      let i = e();
      let baseline = n?.() ?? i;
      if (this.lingering !== undefined) {
        o = {
          tiers: this.tiers,
          lingering: this.lingering,
        };
        this.lingering = undefined;
      }
      this.tiers = i;
      this.baseline = baseline;
    }
    this.holders++;
    let r = false;
    return {
      release: () => {
        if (r)
          return {
            last: false,
          };
        r = true;
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
        if (r) return;
        r = true;
        this.holders--;
        if (this.holders === 0) {
          this.tiers = o?.tiers;
          this.lingering = o?.lingering;
          this.baseline = undefined;
        }
      },
    };
  }
  whileLive(e) {
    let tiers = this.tiers;
    let lingering = this.lingering;
    this.tiers = undefined;
    this.lingering = undefined;
    try {
      return e();
    } finally {
      this.tiers = tiers;
      this.lingering = lingering;
    }
  }
  baselineTier(e) {
    return this.baseline?.get(e);
  }
  differingTiers(e) {
    return this.baseline === undefined ? [] : diffTierKeys(this.baseline, e);
  }
  rebaseline(e, n) {
    if (this.baseline === undefined) return;
    let o = new Map(this.baseline);
    for (let r of n) {
      let i = e.get(r);
      if (i === undefined) o.delete(r);
      else o.set(r, i);
    }
    this.baseline = o;
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
//@ chunk-ndmse9kj.js:4826-4892 placement
/**
 * 空对象归一为 null：设置读取时把 {} 视为"没有值"。
 */
function nullIfEmptyObject(e) {
  return e !== null && Object.keys(e).length === 0 ? null : e;
}
//@ chunk-ndmse9kj.js:4892-5019 placement
function normalizeTierForCompare(e) {
  return {
    ...e,
    settings: nullIfEmptyObject(e.settings),
    unfiltered: nullIfEmptyObject(e.unfiltered),
    ...(e.legacy !== undefined && {
      legacy: nullIfEmptyObject(e.legacy),
    }),
  };
}
//@ chunk-ndmse9kj.js:5019-5165 placement
function diffTierKeys(baseline, n) {
  return [...baseline.keys(), ...[...n.keys()].filter((key) => !baseline.has(key))].filter((o) => {
    let r = baseline.get(o);
    let i = n.get(o);
    return !deepEqualWithCycles(r && normalizeTierForCompare(r), i && normalizeTierForCompare(i));
  });
}
//@ chunk-ndmse9kj.js:5165-5237 placement
var FORCE_LOGIN_SETTING_KEYS = ["forceLoginOrgUUID", "forceLoginMethod", "forceLoginGatewayUrl"];
//@ chunk-ndmse9kj.js:5237-9662 placement
/**
 * 设置读取的全局缓存：合并结果、各来源结果、已解析文件、目录列表、托管文件链接/保护、策略层遍历计数、插件基础层与保留层（storage v5）。invalidateAll 递增 epoch 清空缓存（可保留用户层），seed*\/unseed* 按 epoch 写入预读结果，*InstallVerdict 判定预读结果能否安装（install/raced/deferred）。
 */
class SettingsCacheStore {
  mergedSettings = null;
  perSource = new Map();
  parsedFiles = new Map();
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
  setPluginBase(pluginBase) {
    this.pluginBase = pluginBase;
    this.pluginBaseLoaded = true;
  }
  clearPluginBase() {
    this.pluginBase = undefined;
  }
  invalidateAll(e) {
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
    if (e?.userLayer === "retain" && isStorageV5Enabled() && this.primer !== undefined) {
      for (let [n, o] of this.retained) {
        this.parsedFiles.set(n, o.parsed);
        this.primedFiles.add(n);
      }
      for (let [n, o] of this.retainedListings) this.folderListings.set(n, o.names);
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
  onInvalidate(e) {
    return this.invalidated.subscribe(e);
  }
  seedParsedFile(e, n, o, r) {
    if (r !== this.epoch) return false;
    let i = this.parsedFiles.get(e);
    let s = i !== undefined && settingsEqualIgnoringOwner(i, o);
    let a = !s;
    let l = s ? i : o;
    this.parsedFiles.set(e, l);
    if (n === "userSettings")
      this.lastSeededUserLayer = {
        path: e,
        parsed: l,
      };
    if (a || this.primedFiles.has(e)) this.primedFiles.add(e);
    let p = this.retained.get(e);
    if (p !== undefined) p.parsed = l;
    if (a) this.dropDerivedCaches(n);
    return true;
  }
  walkReadDiffers(e, n) {
    let o = this.parsedFiles.get(e);
    return o !== undefined && !this.primedFiles.has(e) && !deepEqualWithCycles(o, n);
  }
  unseedParsedFile(e, n, o) {
    if (o !== this.epoch) return;
    this.retained.delete(e);
    if (!this.primedFiles.has(e) || (n === "policySettings" && this.policyWalks > 0)) return;
    this.primedFiles.delete(e);
    this.parsedFiles.delete(e);
    this.dropDerivedCaches(n);
  }
  dropDerivedCaches(e) {
    this.perSource.delete(e);
    this.mergedSettings = null;
    if (e === "policySettings") this.policy = {};
  }
  primedFolderListing(e) {
    return isStorageV5Enabled() ? this.folderListings.get(e) : undefined;
  }
  folderListingForPolicyWalk(e) {
    if (!isStorageV5Enabled()) return;
    this.policyWalks++;
    let n = this.folderListings.get(e);
    if (!this.walkedFolders.has(e) || n !== undefined) this.walkedFolders.set(e, n ?? null);
    return n;
  }
  noteWalkListing(e, n) {
    if (!isStorageV5Enabled()) return;
    this.walkedFolders.set(e, n);
  }
  get policyWalkCount() {
    return this.policyWalks;
  }
  policyInstallVerdict(e, n, o) {
    let r = this.parsedFiles.get(e);
    if (r === undefined || settingsEqualIgnoringOwner(r, n)) return "install";
    if (!this.primedFiles.has(e)) return "raced";
    if (this.policyWalks === 0) return "install";
    return this.policyWalks > o ? "raced" : "deferred";
  }
  folderInstallVerdict(e, n, o) {
    if (!this.walkedFolders.has(e)) return this.hasParsedDropInOutside(e, n) ? "raced" : "install";
    let r = this.walkedFolders.get(e);
    if (r !== null && r !== undefined && deepEqualWithCycles(r, n)) return "install";
    return this.policyWalks > o ? "raced" : "deferred";
  }
  seedFolderListing(e, n, o) {
    if (o !== this.epoch) return false;
    let r = this.folderListings.get(e);
    this.folderListings.set(e, n);
    let i = this.retainedListings.get(e);
    if (i !== undefined) i.names = n;
    if (r !== undefined && !deepEqualWithCycles(r, n)) this.dropDerivedCaches("policySettings");
    return true;
  }
  walkReadManagedFileIn(e, n) {
    for (let [o, r] of this.parsedFiles)
      if (
        !o.includes("\x00") &&
        !this.primedFiles.has(o) &&
        (r.settings !== null || r.errors.length > 0) &&
        (o === e || dirname(o) === n)
      )
        return true;
    return false;
  }
  walkRead(e) {
    return this.parsedFiles.has(e) && !this.primedFiles.has(e);
  }
  hasParsedDropInOutside(e, n) {
    for (let key of this.parsedFiles.keys())
      if (
        !key.includes("\x00") &&
        !this.primedFiles.has(key) &&
        dirname(key) === e &&
        !n.includes(basename(key))
      )
        return true;
    return false;
  }
  clearFolderListing(e, n) {
    if (n !== this.epoch) return;
    this.retainedListings.delete(e);
    if (!this.folderListings.has(e) || this.walkedFolders.has(e)) return;
    this.folderListings.delete(e);
    this.dropDerivedCaches("policySettings");
  }
  retainLayer(e, n) {
    let o = this.parsedFiles.get(e);
    let r = {
      parsed: o !== undefined && settingsEqualIgnoringOwner(o, n) ? o : n,
    };
    this.retained.set(e, r);
    return () => {
      if (this.retained.get(e) === r) this.retained.delete(e);
    };
  }
  dropRetainedLayer(e) {
    this.retained.delete(e);
  }
  retainFolderListing(e, names) {
    let o = {
      names,
    };
    this.retainedListings.set(e, o);
    return () => {
      if (this.retainedListings.get(e) === o) this.retainedListings.delete(e);
    };
  }
}
//@ chunk-ndmse9kj.js:9662-10211 placement
/**
 * 本地存储探测缓存：按根目录缓存属主 uid 列表，以及规范化后的真实家目录。
 */
class LocalStoreProbes {
  ownerUidsByRoot = new Map();
  realHomeDir = undefined;
  canonicalRootOwnerUids(e, n) {
    let o = this.ownerUidsByRoot.get(e);
    if (o !== undefined) return o;
    let r = n(e);
    this.ownerUidsByRoot.set(e, r);
    return r;
  }
  hasCanonicalRootOwnerUids(e) {
    return this.ownerUidsByRoot.has(e);
  }
  primeCanonicalRootOwnerUids(e, n) {
    if (this.ownerUidsByRoot.has(e)) return false;
    this.ownerUidsByRoot.set(e, n);
    return true;
  }
  clearCanonicalRootOwnerUids() {
    this.ownerUidsByRoot.clear();
  }
  normalizedRealHomeDir(e) {
    this.realHomeDir ??= e();
    return this.realHomeDir;
  }
  clearNormalizedRealHomeDir() {
    this.realHomeDir = undefined;
  }
}
//@ chunk-ndmse9kj.js:10211-10238 placement
/**
 * 按会话宿主缓存的 SettingsCacheStore（设置缓存与派生缓存的容器）。
 */
var SETTINGS_CACHE_STORE_SLOT = new HostScoped(() => new SettingsCacheStore());
//@ chunk-ndmse9kj.js:10238-10312 placement
function settingsEqualIgnoringOwner(e, n) {
  return deepEqualWithCycles(
    {
      ...e,
      fileOwner: undefined,
    },
    {
      ...n,
      fileOwner: undefined,
    },
  );
}
//@ chunk-ndmse9kj.js:10312-10808 placement
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
//@ chunk-ndmse9kj.js:10808-11572 placement
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
//@ chunk-ndmse9kj.js:11572-12387 placement
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
//@ chunk-ndmse9kj.js:12387-12504 placement
/**
 * 清除会话（/clear）时调用：先重置部分粘性记录，再清空 nameOnlyEntries 的 held/refused/reported。
 */
function resetStickyBetaNameOnlyEntries(stickyBetas) {
  resetDeclaredTools(stickyBetas);
  stickyBetas.nameOnlyEntries.held.clear();
  stickyBetas.nameOnlyEntries.refused = false;
  stickyBetas.nameOnlyEntries.reported = undefined;
}
//@ chunk-ndmse9kj.js:12504-12593 placement
/**
 * 清空 declaredTools/noChannelTools 并把 declaredToolsDecided 置 false（粘性 beta 状态重置的一步）。
 */
function resetDeclaredTools(conversation) {
  conversation.declaredTools = undefined;
  conversation.noChannelTools = undefined;
  conversation.declaredToolsDecided = false;
}
//@ chunk-ndmse9kj.js:12593-12792 placement
/**
 * 清空 systemMessagesAcceptedBy，并把 wireShapeSeed 带来的 sent/rejected beta 从集合里撤回，然后丢弃种子。
 */
function dropWireShapeSeed(e) {
  e.systemMessagesAcceptedBy.clear();
  let wireShapeSeed = e.wireShapeSeed;
  if (wireShapeSeed === undefined) return;
  for (let o of wireShapeSeed.sent) e.sent.delete(o);
  for (let o of wireShapeSeed.rejected) e.rejected.delete(o);
  e.wireShapeSeed = undefined;
}
//@ chunk-ndmse9kj.js:12792-12888 placement
/**
 * 把上一份粘性 beta 状态的 sent/rejected 集合并回新状态，并挂上 wireShapeSeed，供后续撤销。
 */
function applyWireShapeSeed(e, n) {
  for (let o of n.sent) markBetaSent(e, o);
  for (let o of n.rejected) markBetaRejected(e, o);
  e.wireShapeSeed = n;
}
//@ chunk-ndmse9kj.js:12888-12925 placement
/**
 * 清掉 advisorHeld 标记（撤销此前暂扣的 advisor 头）。
 */
function clearAdvisorHeld(stickyBetas) {
  stickyBetas.advisorHeld = undefined;
}
//@ chunk-ndmse9kj.js:12925-13143 placement
/**
 * 撤销"内联工具被拒"记录：从 rejected 删除被拒的头，从 nameOnlyAnnouncements 删除按名字公告的工具并清空该集合。
 */
function clearInlineToolsRefusal(stickyBetas) {
  let { rejectedHeader, announcementsByName } = stickyBetas.inlineToolsRefusal;
  if (rejectedHeader !== undefined) {
    stickyBetas.rejected.delete(rejectedHeader);
    stickyBetas.inlineToolsRefusal.rejectedHeader = undefined;
  }
  for (let r of announcementsByName) stickyBetas.nameOnlyAnnouncements.delete(r);
  announcementsByName.clear();
}
//@ chunk-ndmse9kj.js:13143-13189 placement
/**
 * 清掉 advisorHeld 后返回同一对象，便于链式构造解锁状态。
 */
function clearAdvisorHeldAndReturn(e) {
  e.advisorHeld = undefined;
  return e;
}
//@ chunk-ndmse9kj.js:13189-13231 placement
/**
 * 把 declaredToolsDecided 置 true：声明的工具集已经确定，不再追加。
 */
function markDeclaredToolsDecided(e) {
  e.declaredToolsDecided = true;
}
//@ chunk-ndmse9kj.js:13231-13846 placement
/**
 * 生成一份解锁后的粘性 beta 状态：新建空状态，只保留声明工具集、advisor、wire 种子、内联拒绝、web search 历史拒绝、媒体上限、被拒 schema 与 nameOnlyEntries 的拒绝/上报标记。
 */
function unlatchStickyBetaLatches(previous) {
  let stickyBetaLatches = createStickyBetaLatches();
  stickyBetaLatches.declaredTools = previous.declaredTools;
  stickyBetaLatches.noChannelTools = previous.noChannelTools;
  stickyBetaLatches.turnDeniedTools = previous.turnDeniedTools;
  stickyBetaLatches.declaredToolsDecided = previous.declaredToolsDecided;
  stickyBetaLatches.advisorHeld = previous.advisorHeld;
  if (previous.wireShapeSeed !== undefined) applyWireShapeSeed(stickyBetaLatches, previous.wireShapeSeed);
  let { rejectedHeader, announcementsByName } = previous.inlineToolsRefusal;
  if (rejectedHeader !== undefined) rejectInlineToolsHeader(stickyBetaLatches, rejectedHeader);
  addNameOnlyAnnouncements(stickyBetaLatches, announcementsByName);
  stickyBetaLatches.webSearchHistoryRejected = previous.webSearchHistoryRejected;
  stickyBetaLatches.mediaItemCap = previous.mediaItemCap;
  for (let [i, s] of previous.refusedToolSchemas) stickyBetaLatches.refusedToolSchemas.set(i, s);
  stickyBetaLatches.nameOnlyEntries.refused = previous.nameOnlyEntries.refused;
  stickyBetaLatches.nameOnlyEntries.reported = previous.nameOnlyEntries.reported;
  return stickyBetaLatches;
}
//@ chunk-ndmse9kj.js:13846-13910 placement
/**
 * 把某个头记入拒绝集合并写入 inlineToolsRefusal.rejectedHeader（内联工具被拒）。
 */
function rejectInlineToolsHeader(e, n) {
  markBetaRejected(e, n);
  e.inlineToolsRefusal.rejectedHeader = n;
}
//@ chunk-ndmse9kj.js:13910-14022 placement
/**
 * 把一组工具名同时记入内联拒绝的按名公告集合和 nameOnlyAnnouncements。
 */
function addNameOnlyAnnouncements(e, n) {
  for (let o of n) {
    e.inlineToolsRefusal.announcementsByName.add(o);
    e.nameOnlyAnnouncements.add(o);
  }
}
//@ chunk-ndmse9kj.js:14022-14093 placement
/**
 * 首次设置 declaredTools 并标记为已决定。
 */
function setDeclaredTools(e, declaredTools) {
  if (e.declaredTools === undefined) e.declaredTools = declaredTools;
  markDeclaredToolsDecided(e);
}
//@ chunk-ndmse9kj.js:14093-14210 placement
/**
 * 返回已在 wire 上露出的工具名集合；有按值定义的工具时与 definedByValue 合并。
 */
function getSurfacedToolNames(e) {
  return e.definedByValue.size === 0 ? e.surfacedOnWire : new Set([...e.surfacedOnWire, ...e.definedByValue]);
}
//@ chunk-ndmse9kj.js:14210-14263 placement
/**
 * 标记某个 beta 头已发送（未被拒绝时才记入 sent）。
 */
function markBetaSent(conversation, n) {
  if (!conversation.rejected.has(n)) conversation.sent.add(n);
}
//@ chunk-ndmse9kj.js:14263-14321 placement
/**
 * 判断某个 beta 头已发送且未被拒绝。
 */
function isBetaSent(e, n) {
  return e.sent.has(n) && !e.rejected.has(n);
}
//@ chunk-ndmse9kj.js:14321-14373 placement
/**
 * 标记某个 beta 头被拒：从 sent 删除并加入 rejected。另附同名 inlineToolsRefusal 记录。
 */
function markBetaRejected(conversation, n) {
  conversation.sent.delete(n);
  conversation.rejected.add(n);
}
//@ chunk-ndmse9kj.js:14373-14415 placement
/**
 * 判断某个 beta 头是否被拒绝。
 */
function isBetaRejected(conversation, n) {
  return conversation.rejected.has(n);
}
//@ chunk-ndmse9kj.js:14415-14471 placement
/**
 * 忘记某个 beta 头：sent 与 rejected 两边都删除。
 */
function forgetBeta(e, n) {
  e.sent.delete(n);
  e.rejected.delete(n);
}
//@ chunk-ndmse9kj.js:14471-14517 placement
/**
 * 标记 web search 历史相关 beta 已被拒绝，后续不再发送。
 */
function markWebSearchHistoryRejected(conversation) {
  conversation.webSearchHistoryRejected = true;
}
//@ chunk-ndmse9kj.js:14517-14563 placement
/**
 * 清除 web search 历史被拒标记。
 */
function clearWebSearchHistoryRejected(stickyBetas) {
  stickyBetas.webSearchHistoryRejected = false;
}
//@ chunk-ndmse9kj.js:14563-14636 placement
/**
 * 按模型取媒体条目上限缓存：模型不匹配时返回 undefined。
 */
function mediaItemCapForModel(conversation, effectiveModel) {
  return conversation.mediaItemCap?.model === effectiveModel ? conversation.mediaItemCap : undefined;
}
//@ chunk-ndmse9kj.js:14636-14671 placement
/**
 * 记录某模型下的媒体条目上限。
 */
function setMediaItemCap(conversation, mediaItemCap) {
  conversation.mediaItemCap = mediaItemCap;
}
//@ chunk-ndmse9kj.js:14671-14709 placement
/**
 * 清除媒体条目上限缓存。
 */
function clearMediaItemCap(e) {
  e.mediaItemCap = undefined;
}
//@ chunk-ndmse9kj.js:14709-14754 placement
/**
 * 清空被拒绝的工具 schema 缓存。
 */
function clearRefusedToolSchemas(stickyBetas) {
  stickyBetas.refusedToolSchemas.clear();
}
//@ chunk-ndmse9kj.js:14754-14835 placement
class SessionObservers {
  spawner = undefined;
  pairings = new Map();
  mainEnsureInFlight = false;
  mainSlotBlocked = false;
}
//@ chunk-ndmse9kj.js:14835-14913 placement
/**
 * 可安全出现在工具名单里的名字字符集（1–256 个 [A-Za-z0-9_.:-]）；不合规的名字在摘要中替换为固定占位。
 */
var TOOL_NAME_PATTERN = /^[A-Za-z0-9_.:-]{1,256}$/;
var UNREADABLE_TOOLS_USED_BEFORE_SUMMARY = "unreadable-tools-used-before-summary";
//@ chunk-ndmse9kj.js:14913-14989 placement
/**
 * 把工具名规范成可出现在 <tools-used-before-summary> 的文本：不合规时返回固定占位 UNREADABLE_TOOLS_USED_BEFORE_SUMMARY。
 */
function readableToolName(e) {
  return TOOL_NAME_PATTERN.test(e) ? e : "unreadable-tools-used-before-summary";
}
//@ chunk-ndmse9kj.js:14989-15024 placement
var TOOLS_USED_BEFORE_SUMMARY_TAG = "tools-used-before-summary";
//@ chunk-ndmse9kj.js:15024-15088 placement
/**
 * 生成 <tools-used-before-summary>…</tools-used-before-summary> 标签文本，逐个名字先按 xre 规范化。
 */
function formatToolsUsedBeforeSummary(e) {
  return `<${TOOLS_USED_BEFORE_SUMMARY_TAG}>${e.map(readableToolName).join(", ")}</${TOOLS_USED_BEFORE_SUMMARY_TAG}>`;
}
//@ chunk-ndmse9kj.js:15088-15157 placement
/**
 * 判断工具名是否为 Gmail 附件下载工具（以 download_gmail_attachment 结尾）。
 */
function isGmailAttachmentTool(e) {
  return /(?:^|__|:)download_gmail_attachment$/.test(e);
}
//@ chunk-ndmse9kj.js:15157-15715 placement
/**
 * 会话里"已使用工具"名单：record 规范化后去重记入并递增代数，built() 按代数缓存派生值，reportTruncationOnce 只报一次截断。
 */
class ToolsUsedSet {
  #e = new Set();
  #t = 0;
  #n = false;
  #o;
  record(e) {
    let n = false;
    for (let o of e) {
      if (typeof o !== "string" || o === "") continue;
      let r = readableToolName(o);
      if (!this.#e.has(r)) {
        this.#e.add(r);
        n = true;
      }
    }
    if (n) this.#t++;
    return n;
  }
  has(e) {
    return this.#e.has(e);
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
  built(e) {
    if (this.#o?.generation !== this.#t)
      this.#o = {
        generation: this.#t,
        value: e(this.names()),
      };
    return this.#o.value;
  }
  reportTruncationOnce() {
    if (this.#n) return false;
    this.#n = true;
    return true;
  }
  replace(e) {
    this.clear();
    this.record(e);
  }
  clear() {
    this.#e.clear();
    this.#t++;
    this.#n = false;
  }
}
//@ chunk-ndmse9kj.js:15715-15989 placement
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
  replaceAtisLatch(e) {
    this.#t = e;
    this.#n?.(e);
  }
  watchAtisLatch(e) {
    this.#n = e;
  }
  reset() {
    this.#e = createStickyBetaLatches();
    this.#t = undefined;
    this.toolsUsed.clear();
  }
}
//@ chunk-ndmse9kj.js:15989-16078 placement
/**
 * 四类 token 用量（输入/输出/缓存读/缓存写）全零的初值对象，用作费用账本的初始值。
 */
var ZERO_TOKEN_USAGE = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
};
//@ chunk-ndmse9kj.js:16078-16144 placement
function nullProtoCopy(modelUsage) {
  let n = Object.create(null);
  return Object.assign(n, modelUsage);
}
//@ chunk-ndmse9kj.js:16144-16223 placement
function cloneModelUsage(modelUsage) {
  let n = nullProtoCopy();
  for (let [key, value] of Object.entries(modelUsage))
    n[key] = {
      ...value,
    };
  return n;
}
//@ chunk-ndmse9kj.js:16223-20132 placement
/**
 * 会话费用账本：总费用、API/工具耗时、增删行数、各模型用量、侧查询费用、安全停止次数、已花 token；支持 restore/snapshot 与按会话认领（claim/scopeTo/belongsTo），记账时触发 spendRecorded 信号。
 */
class CostLedger {
  #e = 0;
  #t = 0;
  #n = 0;
  #o = 0;
  #r = Date.now();
  #s = undefined;
  #i = 0;
  #d = 0;
  #u = 0;
  #c = ZERO_TOKEN_USAGE;
  #l = 0;
  #p = ZERO_TOKEN_USAGE;
  #h = false;
  #a = 0;
  #g = nullProtoCopy();
  #S = undefined;
  #y = null;
  #v = null;
  #f = null;
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
    return this.#o;
  }
  totalDuration() {
    return Math.max(0, Date.now() - this.#r);
  }
  sessionStartTime() {
    return this.#s ?? this.#r;
  }
  totalLinesAdded() {
    return this.#i;
  }
  totalLinesRemoved() {
    return this.#d;
  }
  hasUnknownModelCost() {
    return this.#h;
  }
  safetyStops() {
    return this.#a;
  }
  modelUsage() {
    return this.#g;
  }
  usageForModel(e) {
    return this.#g[e];
  }
  trackUsageSinceLastResult() {
    this.#S ??= nullProtoCopy();
  }
  usageSinceLastResult() {
    return this.#S;
  }
  takeUsageSinceLastResult() {
    let e = this.#S;
    if (e !== undefined) this.#S = nullProtoCopy();
    return e;
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
  #m(e) {
    let n = 0;
    for (let o of Object.values(this.#g)) n += o[e];
    return n;
  }
  recordApiDuration(e, n) {
    this.#t += e;
    this.#n += n;
  }
  spentTokens() {
    return this.#p;
  }
  recordSpentTokens(e) {
    let n = this.#p;
    this.#p = {
      inputTokens: n.inputTokens + e.inputTokens,
      outputTokens: n.outputTokens + e.outputTokens,
      cacheReadInputTokens: n.cacheReadInputTokens + e.cacheReadInputTokens,
      cacheCreationInputTokens: n.cacheCreationInputTokens + e.cacheCreationInputTokens,
    };
    this.spendRecorded.emit();
  }
  recordCost(e, n, o) {
    this.#g[o] = n;
    this.#e += e;
    this.spendRecorded.emit();
  }
  recordSideQueryCost(e) {
    if (Number.isFinite(e) && e >= 0) {
      this.#l += e;
      this.spendRecorded.emit();
    }
  }
  recordToolDuration(e) {
    this.#o += e;
  }
  recordLinesChanged(e, n) {
    this.#i += e;
    this.#d += n;
  }
  markUnknownModelCost() {
    this.#h = true;
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
    this.#r = Date.now();
    this.anchorLogicalStart(undefined);
  }
  anchorLogicalStart(e) {
    this.#s = e === undefined ? undefined : Math.min(e, this.#r);
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
    S,
  ) {
    this.#f = S;
    this.#e = totalCostUSD;
    this.#u = totalCostUSD;
    this.#t = totalAPIDuration;
    this.#n = totalAPIDurationWithoutRetries;
    this.#o = totalToolDuration;
    this.#i = totalLinesAdded;
    this.#d = totalLinesRemoved;
    this.#h = hasUnknownModelCost ?? false;
    if (modelUsage) this.#g = nullProtoCopy(modelUsage);
    this.#c = {
      inputTokens: this.totalInputTokens(),
      outputTokens: this.totalOutputTokens(),
      cacheReadInputTokens: this.totalCacheReadInputTokens(),
      cacheCreationInputTokens: this.totalCacheCreationInputTokens(),
    };
    if (lastDuration !== undefined) this.#r = Date.now() - lastDuration;
    this.anchorLogicalStart(startTime);
  }
  registerSaver(e) {
    this.#y = e;
  }
  runSaver(e, n) {
    (this.#y ?? (n ? n.#y : null))?.(e);
  }
  registerTranscriptRecorder(e) {
    this.#v = e;
  }
  runTranscriptRecorder(e, n, o) {
    (this.#v ?? (o ? o.#v : null))?.(e, n);
  }
  snapshot() {
    return {
      ownerSessionId: this.#f,
      totalCostUSD: this.#e,
      totalAPIDuration: this.#t,
      totalAPIDurationWithoutRetries: this.#n,
      totalToolDuration: this.#o,
      startTime: this.#r,
      sessionLogicalStartTime: this.#s,
      totalLinesAdded: this.#i,
      totalLinesRemoved: this.#d,
      restoredCostUSD: this.#u,
      restoredTokens: this.#c,
      hasUnknownModelCost: this.#h,
      safetyStops: this.#a,
      modelUsage: cloneModelUsage(this.#g),
    };
  }
  restoreSnapshot(e) {
    this.#f = e.ownerSessionId;
    this.#e = e.totalCostUSD;
    this.#t = e.totalAPIDuration;
    this.#n = e.totalAPIDurationWithoutRetries;
    this.#o = e.totalToolDuration;
    this.#r = e.startTime;
    this.#s = e.sessionLogicalStartTime;
    this.#i = e.totalLinesAdded;
    this.#d = e.totalLinesRemoved;
    this.#u = e.restoredCostUSD;
    this.#c = e.restoredTokens;
    this.#h = e.hasUnknownModelCost;
    this.#a = e.safetyStops;
    this.#g = cloneModelUsage(e.modelUsage);
  }
  claim(e) {
    this.#f ??= e;
  }
  scopeTo(e) {
    this.#f = e;
  }
  ownerSessionId() {
    return this.#f;
  }
  belongsTo(e) {
    return this.#f === e;
  }
  reset(e) {
    this.#f = e;
    this.#e = 0;
    this.#u = 0;
    this.#c = ZERO_TOKEN_USAGE;
    this.#t = 0;
    this.#n = 0;
    this.#o = 0;
    this.#r = Date.now();
    this.anchorLogicalStart(undefined);
    this.#i = 0;
    this.#d = 0;
    this.#h = false;
    this.#a = 0;
    this.#g = nullProtoCopy();
  }
}
//@ chunk-ndmse9kj.js:20132-20460 placement
/**
 * 仅用量额度模型的同意记录：按会话的回退同意集合与会话同意键表。
 */
class UsageCreditsConsentSlots {
  #e = new Set();
  #t = new Map();
  consentSessionFallback(e) {
    return this.#e.has(e);
  }
  replaceConsentSessionFallback(e, n) {
    if (n) this.#e.add(e);
    else this.#e.delete(e);
  }
  sessionConsentKey(e) {
    return this.#t.get(e) ?? null;
  }
  replaceSessionConsentKey(e, n) {
    if (n === null) this.#t.delete(e);
    else this.#t.set(e, n);
  }
  reset() {
    this.#e.clear();
    this.#t.clear();
  }
}
//@ chunk-ndmse9kj.js:20460-20764 placement
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
  replaceMainThreadAgentType(e) {
    this.#t = e;
  }
  mainThreadAgentHooks() {
    return this.#n;
  }
  replaceMainThreadAgentHooks(e) {
    this.#n = e;
  }
  reset() {
    this.#e = {
      registeredHooks: null,
    };
    this.#t = undefined;
    this.#n = undefined;
  }
}
//@ chunk-ndmse9kj.js:20764-20949 placement
/**
 * 本会话已调用技能表：按名字记录/查询/遗忘。
 */
class InvokedSkills {
  #e = new Map();
  skills() {
    return this.#e;
  }
  lookup(e) {
    return this.#e.get(e);
  }
  record(e, n) {
    this.#e.set(e, n);
  }
  forget(e) {
    this.#e.delete(e);
  }
  forgetAll() {
    this.#e.clear();
  }
  reset() {
    this.#e = new Map();
  }
}
//@ chunk-ndmse9kj.js:20949-21794 placement
/**
 * MCP 会话接线切片：已批准的服务器（按工作区）、客户端访问器、已连接客户端接线、工具替换器与连接表；acquire* 系列只允许一个持有者并返回释放函数。
 */
class McpSessionWiring {
  #e = [];
  #t;
  #n;
  #o;
  #r;
  approvedServers() {
    return this.#e;
  }
  approveServers(e, n) {
    for (let o of n)
      if (!this.#e.some((r) => r.name === o && r.workspaceKey === e))
        this.#e.push({
          name: o,
          workspaceKey: e,
        });
  }
  registerClientsAccessor(e) {
    this.#t = e;
  }
  acquireClientsAccessor(e) {
    if (this.#t) return () => {};
    this.#t = e;
    return () => {
      if (this.#t === e) this.#t = undefined;
    };
  }
  clientsFromAccessor() {
    return this.#t?.();
  }
  registerConnectedClientWiring(e) {
    this.#n = e;
  }
  connectedClientWiring() {
    return this.#n;
  }
  registerToolsSwapper(e) {
    this.#o = e;
  }
  acquireToolsSwapper(e) {
    if (this.#o) return () => {};
    this.#o = e;
    return () => {
      if (this.#o === e) this.#o = undefined;
    };
  }
  swapServerTools(e, n, o) {
    if (!this.#o) return false;
    return this.#o(e, n, o);
  }
  registerConnections(e) {
    this.#r = e;
  }
  acquireConnections(e) {
    if (this.#r) return () => {};
    this.#r = e;
    return () => {
      if (this.#r === e) this.#r = undefined;
    };
  }
  connections() {
    return this.#r;
  }
  reset() {
    this.#e = [];
    this.#t = undefined;
  }
}
//@ chunk-ndmse9kj.js:21794-23391 placement
/**
 * 模型选择切片：主循环模型覆盖、effort 状态、初始模型及其设置层、组织默认、环境默认模型；拒绝回退（refusal fallback）发生/头锁存/静默通道标记与回退模型锁存、可用性回退链。
 */
class ModelSelectionSlice {
  #e = undefined;
  #t = undefined;
  #n = undefined;
  #o = undefined;
  #r = undefined;
  #s = undefined;
  #i = false;
  #d = false;
  #u = undefined;
  #c = false;
  #l = undefined;
  #p = undefined;
  #h = undefined;
  mainLoopModelOverride() {
    return this.#e;
  }
  overrideMainLoopModel(e) {
    this.#e = e;
  }
  mainLoopEffortState() {
    return this.#t;
  }
  replaceMainLoopEffortState(e) {
    this.#t = e;
  }
  initialMainLoopModel() {
    return this.#n;
  }
  replaceInitialMainLoopModel(e) {
    this.#n = e;
  }
  initialModelSettingLayer() {
    return this.#o;
  }
  replaceInitialModelSettingLayer(e) {
    this.#o = e;
  }
  resolvedOrgDefault() {
    return this.#r;
  }
  replaceResolvedOrgDefault(e) {
    this.#r = e;
  }
  initialEnvDefaultModel() {
    return this.#s;
  }
  replaceInitialEnvDefaultModel(e) {
    this.#s = e;
  }
  refusalFallbackOccurred() {
    return this.#i;
  }
  markRefusalFallbackOccurred(e) {
    this.#i = true;
    this.#u ??= e;
  }
  refusalFallbackHeaderArmed() {
    return this.#d;
  }
  armRefusalFallbackHeader(e) {
    this.#d = true;
    this.#u ??= e;
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
    this.#i = false;
    this.#d = false;
    this.#c = false;
    this.#u = undefined;
  }
  refusalFallbackModelLatch() {
    return this.#l;
  }
  replaceRefusalFallbackModelLatch(e, n = "superseded") {
    if (this.#l?.carriedEffort !== undefined && e?.carriedEffort === undefined) this.#p = n;
    this.#l = e;
  }
  unlatchRefusalFallbackModel(e) {
    this.replaceRefusalFallbackModelLatch(undefined, e);
  }
  takeCarriedEffortEnd() {
    let e = this.#p;
    this.#p = undefined;
    return e;
  }
  availabilityFallbackChain() {
    return this.#h;
  }
  replaceAvailabilityFallbackChain(e) {
    this.#h = e;
  }
  reset() {
    this.#e = undefined;
    this.#t = undefined;
    this.#n = undefined;
    this.#o = undefined;
    this.#r = undefined;
    this.#s = undefined;
    this.#i = false;
    this.#d = false;
    this.#c = false;
    this.#u = undefined;
    this.#l = undefined;
    this.#p = undefined;
    this.#h = undefined;
  }
}
//@ chunk-ndmse9kj.js:23391-23660 placement
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
  recordSection(e, n) {
    this.#e.set(e, n);
  }
  forgetAllSections() {
    this.#e.clear();
  }
  noteInvalidation(e = "other") {
    this.#t += 1;
    this.#n = e;
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
//@ chunk-ndmse9kj.js:23660-26250 placement
/**
 * 请求日志切片：最近一次 API 请求/消息/分类器请求、promptId 与序号、最近人工提示、主线程请求 id 与响应、主线程缓存 TTL 与续期时间、上下文 token、恢复种子、最近完成时间、压缩后待处理标记。
 */
class RequestJournal {
  #e = null;
  #t = null;
  #n = null;
  #o = null;
  #r = null;
  #s = 0;
  #i = null;
  #d = undefined;
  #u = 0;
  #c = undefined;
  #l = null;
  #p = null;
  #h = null;
  #a = null;
  #g = null;
  #S = false;
  #y = null;
  #v = null;
  #f = false;
  lastAPIRequest() {
    return this.#e;
  }
  replaceLastAPIRequest(e) {
    this.#e = e;
  }
  lastCancelledAPIMessageId() {
    return this.#t;
  }
  replaceLastCancelledAPIMessageId(e) {
    this.#t = e;
  }
  lastAPIRequestMessages() {
    return this.#n;
  }
  replaceLastAPIRequestMessages(e) {
    this.#n = e;
  }
  lastClassifierRequests() {
    return this.#o;
  }
  replaceLastClassifierRequests(e) {
    this.#o = e;
  }
  promptId() {
    return this.#r;
  }
  replacePromptId(e) {
    this.#r = e;
  }
  promptIndex() {
    return this.#s;
  }
  replacePromptIndex(e) {
    this.#s = e;
  }
  incrementPromptIndex() {
    this.#s++;
    return this.#s;
  }
  lastPersonPrompt() {
    return this.#i;
  }
  replaceLastPersonPrompt(e) {
    this.#i = e;
  }
  lastMainRequestId() {
    return this.#d;
  }
  replaceLastMainRequestId(e, n) {
    this.#d = e;
    this.#c = n;
    if (e === undefined) this.#u += 1;
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
  replaceLastMainThreadCacheTtlMs(e, model, o = false) {
    this.#l = e;
    this.#a = Date.now();
    this.#h = {
      ttlMs: e,
      model,
      requestAt: this.#a,
      askedAt: o ? (this.#h?.askedAt ?? this.#a) : this.#a,
    };
    this.#g = this.#a;
    this.#S = true;
  }
  isLastMainThreadAskLive(e, n) {
    let o = this.#h;
    return (
      o !== null && o.requestAt === this.#a && o.ttlMs === e && o.model === n && Date.now() - o.askedAt < e
    );
  }
  adjustLastMainThreadCacheTtlMs(e) {
    this.#l = e;
  }
  recordLastMainThreadCacheRenewal(e) {
    if (this.#a !== null)
      this.#p = {
        requestAt: this.#a,
        at: Math.max(e, this.lastMainThreadCacheRenewedAt() ?? -1 / 0),
      };
  }
  lastMainThreadCacheRenewedAt() {
    let e = this.#p;
    return e !== null && e.requestAt === this.#a ? e.at : null;
  }
  lastLiveMainThreadRequestAt() {
    return this.#g;
  }
  lastMainThreadRequestAt() {
    return this.#a;
  }
  mainThreadRequestedInProcess() {
    return this.#S;
  }
  recordMainThreadTurnStart() {
    this.#S = true;
  }
  replaceLastMainThreadRequest(e, n) {
    this.#a = e;
    this.#l = n;
  }
  lastMainThreadContextTokens() {
    return this.#y;
  }
  replaceLastMainThreadContextTokens(e) {
    this.#y = e;
  }
  stageResumeSeed(e) {
    this.#m = e;
  }
  applyResumeSeed(e) {
    this.#m = null;
    this.#l = e.ttlMs;
    this.#a = e.requestAt;
    this.#y = e.contextTokens;
  }
  #m = null;
  clearLastMainThreadRequest(e) {
    let n = e !== undefined && this.#m?.sessionId === e ? this.#m : null;
    this.#m = null;
    this.#l = n?.ttlMs ?? null;
    this.#a = n?.requestAt ?? null;
    this.#y = n?.contextTokens ?? null;
    this.#g = null;
    this.#S = false;
  }
  lastApiCompletionTimestamp() {
    return this.#v;
  }
  replaceLastApiCompletionTimestamp(e) {
    this.#v = e;
  }
  pendingPostCompaction() {
    return this.#f;
  }
  replacePendingPostCompaction(e) {
    this.#f = e;
  }
  reset() {
    this.#e = null;
    this.#t = null;
    this.#n = null;
    this.#o = null;
    this.#r = null;
    this.#s = 0;
    this.#i = null;
    this.#d = undefined;
    this.#c = undefined;
    this.#u += 1;
    this.#l = null;
    this.#a = null;
    this.#g = null;
    this.#S = false;
    this.#y = null;
    this.#m = null;
    this.#v = null;
    this.#f = false;
  }
}
//@ chunk-ndmse9kj.js:26250-27000 placement
/**
 * 会话定时任务切片：任务列表、各链开始时间、tick 中的提示与插件、连续 keepalive 次数、结束标记与唤醒次数；changed/pendingLoopWakeup 两个信号。
 */
class SessionCron {
  #e = [];
  #t = Object.create(null);
  #n = null;
  #o = undefined;
  #r = 0;
  #s = false;
  #i = 0;
  changed = createSignal();
  pendingLoopWakeup = createSignal();
  tasks() {
    return this.#e;
  }
  schedule(e) {
    this.#e.push(e);
  }
  replaceTasks(e) {
    this.#e = e;
  }
  chainStartedAt(e) {
    return this.#t[e];
  }
  recordChainStart(e, n) {
    this.#t[e] = n;
  }
  forgetChainStart(e) {
    delete this.#t[e];
  }
  tickInFlightPrompt() {
    return this.#n;
  }
  tickInFlightPlugin() {
    return this.#o;
  }
  replaceTickInFlightPrompt(e, n) {
    this.#n = e;
    this.#o = e === null ? undefined : n;
  }
  consecutiveKeepalives() {
    return this.#r;
  }
  replaceConsecutiveKeepalives(e) {
    this.#r = e;
  }
  ended() {
    return this.#s;
  }
  replaceEnded(e) {
    this.#s = e;
  }
  wakeFires() {
    return this.#i;
  }
  recordWakeFire() {
    this.#i++;
  }
  resetWakeFires() {
    this.#i = 0;
  }
  reset() {
    this.#e = [];
    this.#t = Object.create(null);
    this.#n = null;
    this.#o = undefined;
    this.#r = 0;
    this.#s = false;
    this.#i = 0;
  }
}
//@ chunk-ndmse9kj.js:27000-30506 placement
/**
 * 会话标志切片：引导/LSP 推荐是否已显示、信任对话框、计划/自动模式退出附件、记忆开关与暂停、账号记忆模式、各种 rollout 闸门锁存、技能/插件同步开关与否决、待处理的上下文压缩通知、例程、继承的团队名、teleport 会话信息、CLAUDE.md 缓存等。
 */
class SessionFlags {
  #e = false;
  #t = false;
  #n = false;
  #o = false;
  #r = false;
  #s = false;
  #i = false;
  #d = false;
  #u = false;
  #c = false;
  #l = false;
  #p = undefined;
  #h = false;
  #a = undefined;
  #g = false;
  #S = false;
  #y = null;
  #v = null;
  #f = null;
  #m = false;
  #b = null;
  #k = false;
  #R = false;
  #x = false;
  #C = false;
  #P = false;
  #T = undefined;
  #w = undefined;
  #A = undefined;
  #L = undefined;
  #M = null;
  #O = null;
  onboardingShownThisSession() {
    return this.#e;
  }
  replaceOnboardingShownThisSession(e) {
    this.#e = e;
  }
  lspRecommendationShownThisSession() {
    return this.#t;
  }
  replaceLspRecommendationShownThisSession(e) {
    this.#t = e;
  }
  sessionTrustAccepted() {
    return this.#n;
  }
  replaceSessionTrustAccepted(e) {
    this.#n = e;
  }
  homeTrustDialogAccepted() {
    return this.#o;
  }
  replaceHomeTrustDialogAccepted(e) {
    this.#o = e;
  }
  hasExitedPlanMode() {
    return this.#r;
  }
  replaceHasExitedPlanMode(e) {
    this.#r = e;
  }
  needsPlanModeExitAttachment() {
    return this.#s;
  }
  replaceNeedsPlanModeExitAttachment(e) {
    this.#s = e;
  }
  needsAutoModeExitAttachment() {
    return this.#i;
  }
  replaceNeedsAutoModeExitAttachment(e) {
    this.#i = e;
  }
  memoryToggledOff() {
    return this.#d;
  }
  replaceMemoryToggledOff(e) {
    this.#d = e;
  }
  autoMemoryOffThisSession() {
    return this.#u;
  }
  replaceAutoMemoryOffThisSession(e) {
    this.#u = e;
  }
  memoryPausedByCommand() {
    return this.#l;
  }
  replaceMemoryPausedByCommand(e) {
    this.#l = e;
  }
  accountMemorySessionMode() {
    return this.#p;
  }
  replaceAccountMemorySessionMode(e, n = false) {
    this.#p = e;
    this.#h = n && e !== undefined;
  }
  accountMemorySessionModeRestored() {
    return this.#h;
  }
  accountMemoryLaunchMode() {
    return this.#a;
  }
  replaceAccountMemoryLaunchMode(e) {
    this.#a = e;
  }
  restoredMemoryPause() {
    return this.#g;
  }
  replaceRestoredMemoryPause(e) {
    this.#g = e;
  }
  restoredAutoMemoryOff() {
    return this.#c;
  }
  replaceRestoredAutoMemoryOff(e) {
    this.#c = e;
  }
  teardownUnwindRequested() {
    return this.#m;
  }
  replaceTeardownUnwindRequested(e) {
    this.#m = e;
  }
  backgroundAutoModeSetupInFlight() {
    return this.#S;
  }
  replaceBackgroundAutoModeSetupInFlight(e) {
    this.#S = e;
  }
  deferredToolStubGateLatch() {
    return this.#y;
  }
  replaceDeferredToolStubGateLatch(e) {
    this.#y = e;
  }
  verifySkillRolloutGateLatch() {
    return this.#v;
  }
  replaceVerifySkillRolloutGateLatch(e) {
    this.#v = e;
  }
  commitSkillRolloutGateLatch() {
    return this.#f;
  }
  replaceCommitSkillRolloutGateLatch(e) {
    this.#f = e;
  }
  memoryToolsShapeLatch() {
    return this.#b;
  }
  replaceMemoryToolsShapeLatch(e) {
    this.#b = e;
  }
  proposeGoalAvailabilityLogged() {
    return this.#k;
  }
  markProposeGoalAvailabilityLogged() {
    this.#k = true;
  }
  activeRoutine() {
    return this.#A;
  }
  replaceActiveRoutine(e) {
    this.#A = e;
  }
  inheritedTeamName() {
    return this.#L;
  }
  replaceInheritedTeamName(e) {
    this.#L = e;
  }
  teleportedSessionInfo() {
    return this.#M;
  }
  replaceTeleportedSessionInfo(e) {
    this.#M = e;
  }
  markFirstTeleportMessageLogged() {
    if (this.#M) this.#M.hasLoggedFirstMessage = true;
  }
  cachedClaudeMdContent() {
    return this.#O;
  }
  replaceCachedClaudeMdContent(e) {
    this.#O = e;
  }
  accountSkillsSyncEnabled() {
    return this.#R;
  }
  replaceAccountSkillsSyncEnabled(e) {
    this.#R = e;
  }
  skillsSyncVetoed() {
    return this.#x;
  }
  replaceSkillsSyncVetoed(e) {
    this.#x = e;
  }
  accountPluginsSyncEnabled() {
    return this.#C;
  }
  replaceAccountPluginsSyncEnabled(e) {
    this.#C = e;
  }
  pluginsSyncVetoed() {
    return this.#P;
  }
  replacePluginsSyncVetoed(e) {
    this.#P = e;
  }
  armPendingContextCompacted(e, n) {
    this.#T = e;
    this.#w = n;
  }
  consumePendingContextCompacted() {
    let e = this.#T;
    this.#T = undefined;
    return e;
  }
  forgetPendingContextCompacted() {
    this.#T = undefined;
    this.#w = undefined;
  }
  responseBeforeCompaction() {
    return this.#w;
  }
  forgetResponseBeforeCompaction() {
    this.#w = undefined;
  }
  reset() {
    this.#R = false;
    this.#x = false;
    this.#C = false;
    this.#P = false;
    this.#e = false;
    this.#t = false;
    this.#n = false;
    this.#o = false;
    this.#r = false;
    this.#s = false;
    this.#i = false;
    this.#d = false;
    this.#u = false;
    this.#l = false;
    this.#p = undefined;
    this.#h = false;
    this.#a = undefined;
    this.#g = false;
    this.#c = false;
    this.#m = false;
    this.#S = false;
    this.#y = null;
    this.#v = null;
    this.#f = null;
    this.#b = null;
    this.#k = false;
    this.#A = undefined;
    this.#L = undefined;
    this.#M = null;
    this.#O = null;
    this.#T = undefined;
    this.#w = undefined;
  }
}
//@ chunk-ndmse9kj.js:30506-30729 placement
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
//@ chunk-ndmse9kj.js:30729-33066 placement
/**
 * 会话暂存切片：计划 slug 缓存、待关联分支/PR、vim 共享状态、代理颜色、本会话建的团队与窗格、已提示过的失败、入站附件下载与到达队列、Chrome 可用性日志、目标空闲提醒/重新提示定时器、worker 签到；reset 会清掉所有定时器并中止下载。
 */
class SessionScratch {
  #e = new Map();
  #t = new Map();
  #n = null;
  #o = new Map();
  #r = new Set();
  #s = new Set();
  #i = new Set();
  #d = new Set();
  #u = new Set();
  #c = new Set();
  #l = new Set();
  #p = new Set();
  #h = new Set();
  #a = new Set();
  #g = new Map();
  #S = new Map();
  #y = new Map();
  #v;
  #f = {
    byFileUuid: new Map(),
    recentPrefetchStarts: [],
  };
  #m = createArrivingInboundFiles();
  #b = new Set();
  #k = undefined;
  #R = undefined;
  #x = undefined;
  #C = undefined;
  #P = undefined;
  planSlugCache() {
    return this.#e;
  }
  forgetPlanSlug(e) {
    this.#e.delete(e);
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
  replaceVimSharedState(e) {
    this.#n = e;
  }
  agentColorMap() {
    return this.#o;
  }
  sessionCreatedTeams() {
    return this.#r;
  }
  sessionSpawnedTeammatePanes() {
    return this.#s;
  }
  surfacedHookSpawnFailures() {
    return this.#i;
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
    return this.#p;
  }
  pendingPrLinks() {
    return this.#h;
  }
  policyPredicateTelemetryEmitted() {
    return this.#a;
  }
  humanAttachmentDigests() {
    return this.#g;
  }
  inboundAttachmentFiles() {
    return this.#S;
  }
  filesPlacedByName() {
    return this.#y;
  }
  filesPlacedByNameRead() {
    return this.#v;
  }
  setFilesPlacedByNameRead(e) {
    this.#v = e;
  }
  inboundAttachmentDownloads() {
    return this.#f;
  }
  arrivingInboundFiles() {
    return this.#m;
  }
  chromeAvailabilityStagesLogged() {
    return this.#b;
  }
  replaceChromeAvailabilityStagesLogged(e) {
    this.#b = new Set();
    if (e) this.#k = Date.now();
  }
  chromeAvailabilityAnchorMs() {
    return this.#k;
  }
  pendingGoalIdleCheckin() {
    return this.#R;
  }
  replacePendingGoalIdleCheckin(e) {
    this.#R = e;
  }
  pendingGoalReprompt() {
    return this.#x;
  }
  replacePendingGoalReprompt(e) {
    this.#x = e;
  }
  goalInterruptionStreak() {
    return this.#C;
  }
  replaceGoalInterruptionStreak(e) {
    this.#C = e;
  }
  workerCheckin() {
    return this.#P;
  }
  replaceWorkerCheckin(e) {
    this.#P = e;
  }
  reset() {
    this.#e = new Map();
    this.#t = new Map();
    this.#n = null;
    this.#o = new Map();
    this.#r = new Set();
    this.#s = new Set();
    this.#i = new Set();
    this.#d = new Set();
    this.#u = new Set();
    this.#c = new Set();
    this.#l = new Set();
    this.#p = new Set();
    this.#h = new Set();
    this.#a = new Set();
    this.#g = new Map();
    this.#S = new Map();
    this.#y = new Map();
    this.#v = undefined;
    for (let e of this.#f.byFileUuid.values()) {
      clearTimeout(e.expiry);
      e.abort.abort();
    }
    this.#f = {
      byFileUuid: new Map(),
      recentPrefetchStarts: [],
    };
    this.#m = createArrivingInboundFiles();
    this.#b = new Set();
    this.#k = undefined;
    clearTimeout(this.#R);
    this.#R = undefined;
    clearTimeout(this.#x);
    this.#x = undefined;
    this.#C = undefined;
    clearInterval(this.#P?.timer);
    this.#P = undefined;
  }
}
//@ chunk-ndmse9kj.js:33066-33167 placement
var DEFAULT_SURFACE_CAPS = {
  renderTarget: "ink",
  workspace: "local",
  canDrive: true,
  transcriptSource: "local-jsonl",
  remote: null,
};
//@ chunk-ndmse9kj.js:33167-35020 placement
/**
 * 宿主界面能力切片：SDK 宿主是否接管对话框及支持的对话框种类、按任务停止、快速追问抢占、嵌套子代理工具转发、Chrome 设置提示；附着方能力、RV supervisor 连接、SDK betas、界面能力（本地/远程）、云端 cwd、REPL bridge 与主循环状态。
 */
class SurfaceCapabilities {
  #e = false;
  #t = undefined;
  #n = undefined;
  #o = undefined;
  #r = undefined;
  #s = undefined;
  #i = undefined;
  #d = null;
  #u = false;
  #c = undefined;
  #l = DEFAULT_SURFACE_CAPS;
  #p = false;
  #h = "idle";
  #a = null;
  attacherCapsChanged = createSignal();
  rvSupervisorLinkChanged = createSignal();
  cloudCwdChanged = createSignal();
  sdkDialogHostActive() {
    return this.#e;
  }
  markSdkDialogHostActive(e) {
    this.#e = e;
  }
  sdkSupportedDialogKinds() {
    return this.#t;
  }
  sdkSupportedDialogKindsSource() {
    return this.#n;
  }
  declareDialogKinds(e, n) {
    this.#t = e;
    this.#n = e === undefined ? undefined : n;
  }
  sdkPerTaskStopAffordance() {
    return this.#o;
  }
  declarePerTaskStopAffordance(e) {
    this.#o = e;
  }
  sdkRapidFollowupPreempt() {
    return this.#r;
  }
  declareRapidFollowupPreempt(e) {
    this.#r = e;
  }
  sdkForwardNestedSubagentToolCalls() {
    return this.#s;
  }
  declareForwardNestedSubagentToolCalls(e) {
    this.#s = e;
  }
  hostRendersChromeSetupOffer() {
    return this.#i;
  }
  declareHostRendersChromeSetupOffer(e) {
    this.#i = e;
  }
  attacherCaps() {
    return this.#d;
  }
  replaceAttacherCaps(e) {
    this.#d = e;
    this.attacherCapsChanged.emit();
  }
  rvSupervisorLinkLive() {
    return this.#u;
  }
  replaceRvSupervisorLinkLive(e) {
    if (this.#u === e) return;
    this.#u = e;
    this.rvSupervisorLinkChanged.emit();
  }
  sdkBetas() {
    return this.#c;
  }
  replaceSdkBetas(e) {
    this.#c = e;
  }
  caps() {
    return this.#l;
  }
  replaceCaps(e) {
    this.#l = e;
  }
  markRemote(e) {
    this.#l = {
      ...this.#l,
      workspace: e ? "remote" : "local",
    };
  }
  cloudCwdOfSession(e) {
    return this.#l.workspace === "remote" && this.#a?.sessionId === e ? this.#a.cwd : null;
  }
  replaceCloudCwd(e) {
    this.#a = e;
    this.cloudCwdChanged.emit();
  }
  replBridgeActive() {
    return this.#p;
  }
  replaceReplBridgeActive(e) {
    if (this.#p === e) return;
    this.#p = e;
  }
  mainLoopBusy() {
    return this.#h !== "idle";
  }
  mainQueryRunning() {
    return this.#h === "running";
  }
  replaceMainLoopStatus(e) {
    this.#h = e;
  }
  reset() {
    this.#e = false;
    this.#t = undefined;
    this.#n = undefined;
    this.#o = undefined;
    this.#r = undefined;
    this.#s = undefined;
    this.#i = undefined;
    this.#d = null;
    this.#c = undefined;
    this.#l = DEFAULT_SURFACE_CAPS;
    this.#p = false;
    this.#h = "idle";
    this.#u = false;
    this.#a = null;
    this.attacherCapsChanged.clear();
    this.rvSupervisorLinkChanged.clear();
    this.cloudCwdChanged.clear();
  }
}
//@ chunk-ndmse9kj.js:35020-35031 placement
var SCROLL_IDLE_DEBOUNCE_MS = 150;
//@ chunk-ndmse9kj.js:35031-35988 placement
/**
 * 用户在场切片：最近交互/提交/人工输入时间、终端焦点、滚动中标记（150ms 去抖）与 waitForScrollIdle；交互与焦点变化触发信号。
 */
class UserPresence {
  #e = Date.now();
  #t = false;
  #n = 0;
  #o = -1 / 0;
  interactionFired = createSignal();
  #r = undefined;
  terminalFocusFired = createSignal();
  #s = false;
  #i;
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
    return this.#o;
  }
  notePersonWrote() {
    this.#o = performance.now();
  }
  recordInteraction(e) {
    if (e) this.#d();
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
    return this.#r;
  }
  updateTerminalFocus(e) {
    this.#r = e;
    this.terminalFocusFired.emit();
  }
  scrollDraining() {
    return this.#s;
  }
  markScrollActivity() {
    this.#s = true;
    if (this.#i) clearTimeout(this.#i);
    this.#i = setTimeout(() => {
      this.#s = false;
      this.#i = undefined;
    }, SCROLL_IDLE_DEBOUNCE_MS);
    this.#i.unref?.();
  }
  async waitForScrollIdle() {
    while (this.#s) await new Promise((resolve) => setTimeout(resolve, SCROLL_IDLE_DEBOUNCE_MS));
  }
  reset() {
    this.#e = Date.now();
    this.#n = 0;
    this.#o = -1 / 0;
    this.#r = undefined;
    this.interactionFired.clear();
    this.terminalFocusFired.clear();
  }
}
export {
  TOOLS_USED_BEFORE_SUMMARY_TAG,
  readableToolName,
  cloneStickyBetaLatches,
  clearAdvisorHeldAndReturn,
  forkStickyBetaLatches,
  createStickyBetaLatches,
  ZERO_TOKEN_USAGE,
  resetStickyBetaNameOnlyEntries,
  clearAdvisorHeld,
  clearInlineToolsRefusal,
  dropWireShapeSeed,
  clearWebSearchHistoryRejected,
  clearMediaItemCap,
  clearRefusedToolSchemas,
  forgetBeta,
  isBetaRejected,
  markBetaRejected,
  markDeclaredToolsDecided,
  setDeclaredTools,
  mediaItemCapForModel,
  markBetaSent,
  isBetaSent,
  resetDeclaredTools,
  markWebSearchHistoryRejected,
  setMediaItemCap,
  addNameOnlyAnnouncements,
  isGmailAttachmentTool,
  UNREADABLE_TOOLS_USED_BEFORE_SUMMARY,
  deepEqualIgnoringUndefined,
  SettingsCacheStore,
  nullIfEmptyObject,
  CONFIG_DIR_UNSAFE_REASONS,
  SETTINGS_CACHE_STORE_SLOT,
  rejectInlineToolsHeader,
  formatToolsUsedBeforeSummary,
  TOOL_NAME_PATTERN,
  getSurfacedToolNames,
  isWritableByCurrentUser,
  FORCE_LOGIN_SETTING_KEYS,
  classifyConfigDirOwnership,
  isObjectLike,
  applyWireShapeSeed,
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
  ManagedDocumentLinks,
  unlatchStickyBetaLatches,
  ManagedFileProtections,
  RepoTierFreeze,
  settingsEqualIgnoringOwner,
  ToolsUsedSet,
};
