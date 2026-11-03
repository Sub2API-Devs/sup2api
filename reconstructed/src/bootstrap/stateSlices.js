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
import { A } from "../utils/sessionUrl.js";

//@ chunk-ndmse9kj.js:1260-1313 placement
function dco(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-ndmse9kj.js:1313-1351 placement
function eP(e, n) {
  return structurallyEqualGraphs(e, n, gt, !1);
}
//@ chunk-ndmse9kj.js:1351-1400 placement
function k(e, n) {
  return structurallyEqualGraphs(e, n, Object.entries, !0);
}
/**
 * 用显式栈比较两棵（可能有环的）对象图：o 枚举子项，r 为真时允许同一对节点重复配对（容忍环）。叶子按 === 比较，容器先比外形（ft）再逐键下钻。
 */
//@ chunk-ndmse9kj.js:1400-1768 placement
function structurallyEqualGraphs(left, right, childEntries, allowCycles) {
  let i = new Map(),
    s = [[left, right]];
  while (s.length > 0) {
    let [a, l] = s.pop();
    if (!dco(a) || !dco(l)) {
      if (a !== l) return !1;
      continue;
    }
    let p = i.get(a);
    if (p !== void 0) {
      if (p.has(l)) continue;
      if (!allowCycles) return !1;
      p.add(l);
    } else i.set(a, new Set([l]));
    let f = new Map(childEntries(l)),
      S = childEntries(a);
    if (!haveSameContainerKind(a, l) || S.length !== f.size) return !1;
    for (let [u, m] of S) {
      if (!f.has(u)) return !1;
      s.push([m, f.get(u)]);
    }
  }
  return !0;
}
//@ chunk-ndmse9kj.js:1768-1835 placement
function gt(e) {
  return Object.entries(e).filter(([, n]) => n !== void 0);
}
//@ chunk-ndmse9kj.js:1835-1973 placement
function haveSameContainerKind(e, n) {
  if (Array.isArray(e) || Array.isArray(n))
    return Array.isArray(e) && Array.isArray(n) && e.length === n.length;
  return Fe(e) && Fe(n);
}
//@ chunk-ndmse9kj.js:1973-2057 placement
function Fe(e) {
  let prototypeOf = Object.getPrototypeOf(e);
  return prototypeOf === Object.prototype || prototypeOf === null;
}
/**
 * 托管设置文件的软链接遍历记录：walked 记每个路径的链接目标，folderIsLink 记目录是否为链接，managedMcp 为托管 MCP 文件；all() 列出全部链接目标。
 */
//@ chunk-ndmse9kj.js:2057-2397 placement
class ManagedDocumentLinks {
  walked = new Map();
  folderIsLink = new Map();
  managedMcp = null;
  clearWalk() {
    (this.walked.clear(), this.folderIsLink.clear());
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
/**
 * 判定配置目录是否管理员所有、是否组/他人可写或为符号链接
 */
//@ chunk-ndmse9kj.js:2509-2817 placement
function classifyConfigDirOwnership({ file: file, folder: folder, linked: linked, posix: posix }) {
  if (!posix) return "not_evaluated";
  if (file === void 0 || folder === void 0) return linked ? "symlinked" : "unknown";
  if (file.uid !== 0 || folder.uid !== 0) return "not_admin_owned";
  let i = file.mode | folder.mode;
  if ((i & 2) !== 0) return "other_writable";
  if ((i & 16) !== 0) return "group_writable";
  return linked ? "symlinked" : "protected";
}
/**
 * 判断文件/目录是否可被当前有效用户改写：root 直接可写；属主为 euid 或其他人可写（mode&2）为真；组可写（mode&16）时看 euid 是否在该组；信息不全返回 undefined。非 POSIX 或无 euid 时返回 undefined。
 */
//@ chunk-ndmse9kj.js:2817-3158 placement
function isWritableByCurrentUser({ file: file, folder: folder, euid: euid, groups: groups, posix: posix }) {
  if (!posix || euid === void 0) return;
  if (euid === 0) return !0;
  let filtered = [file, folder].filter((l) => l !== void 0),
    mapped = filtered.map((l) => {
      if (l.uid === euid || (l.mode & 2) !== 0) return !0;
      if ((l.mode & 16) === 0) return !1;
      return l.gid === void 0 ? void 0 : groups().includes(l.gid);
    });
  if (mapped.includes(!0)) return !0;
  return filtered.length < 2 || mapped.includes(void 0) ? void 0 : !1;
}
/**
 * 托管设置文件的保护记录：documents（路径→保护判定）、folderOwners、siblingRecords，以及是否设置了组织锁定（setsOrgPin）。
 */
//@ chunk-ndmse9kj.js:3158-3413 placement
class ManagedFileProtections {
  documents = new Map();
  folderOwners = new Map();
  siblingRecords = new Map();
  setsOrgPin = !1;
  clear() {
    (this.documents.clear(), this.folderOwners.clear(), this.siblingRecords.clear(), (this.setsOrgPin = !1));
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
    queuedFor: void 0,
    isAnnouncing: !1,
    askedOf: "",
    askedAbout: null,
    visited: [],
    unsettled: new Set(),
  };
}
/**
 * 仓库级设置层的冻结器：engage() 时取一份层快照并引用计数，release/abandon 释放；持有期间 tier() 返回冻结值，linger 可在无人持有时保留一份延迟快照；baseline 用于 differingTiers 计算与基线不同的层。
 */
//@ chunk-ndmse9kj.js:3574-4826 placement
class RepoTierFreeze {
  holders = 0;
  tiers;
  baseline;
  lingering;
  tier(e) {
    if (this.holders === 0 && this.lingering !== void 0) {
      let lingering = this.lingering();
      if (lingering === void 0) this.lingering = void 0;
      this.tiers = lingering;
    }
    return this.tiers?.get(e);
  }
  engage(e, n) {
    let o;
    if (this.holders === 0) {
      let i = e(),
        s = n?.() ?? i;
      if (this.lingering !== void 0)
        ((o = { tiers: this.tiers, lingering: this.lingering }), (this.lingering = void 0));
      ((this.tiers = i), (this.baseline = s));
    }
    this.holders++;
    let r = !1;
    return {
      release: () => {
        if (r) return { last: !1 };
        if (((r = !0), this.holders--, this.holders > 0)) return { last: !1 };
        return ((this.tiers = void 0), (this.lingering = void 0), (this.baseline = void 0), { last: !0 });
      },
      abandon: () => {
        if (r) return;
        if (((r = !0), this.holders--, this.holders === 0))
          ((this.tiers = o?.tiers), (this.lingering = o?.lingering), (this.baseline = void 0));
      },
    };
  }
  whileLive(e) {
    let tiers = this.tiers,
      lingering = this.lingering;
    ((this.tiers = void 0), (this.lingering = void 0));
    try {
      return e();
    } finally {
      ((this.tiers = tiers), (this.lingering = lingering));
    }
  }
  baselineTier(e) {
    return this.baseline?.get(e);
  }
  differingTiers(e) {
    return this.baseline === void 0 ? [] : diffTierKeys(this.baseline, e);
  }
  rebaseline(e, n) {
    if (this.baseline === void 0) return;
    let o = new Map(this.baseline);
    for (let r of n) {
      let i = e.get(r);
      if (i === void 0) o.delete(r);
      else o.set(r, i);
    }
    this.baseline = o;
  }
  linger(e, n) {
    if (this.holders === 0) ((this.tiers = e), (this.lingering = n), (this.baseline = void 0));
  }
  isHeld() {
    return this.holders > 0;
  }
}
//@ chunk-ndmse9kj.js:4826-4892 placement
function m7t(e) {
  return e !== null && Object.keys(e).length === 0 ? null : e;
}
//@ chunk-ndmse9kj.js:4892-5019 placement
function normalizeTierForCompare(e) {
  return {
    ...e,
    settings: m7t(e.settings),
    unfiltered: m7t(e.unfiltered),
    ...(e.legacy !== void 0 && { legacy: m7t(e.legacy) }),
  };
}
//@ chunk-ndmse9kj.js:5019-5165 placement
function diffTierKeys(e, n) {
  return [...e.keys(), ...[...n.keys()].filter((o) => !e.has(o))].filter((o) => {
    let r = e.get(o),
      i = n.get(o);
    return !k(r && normalizeTierForCompare(r), i && normalizeTierForCompare(i));
  });
}
//@ chunk-ndmse9kj.js:5165-5237 placement
var FORCE_LOGIN_SETTING_KEYS = ["forceLoginOrgUUID", "forceLoginMethod", "forceLoginGatewayUrl"];
/**
 * 设置读取的全局缓存：合并结果、各来源结果、已解析文件、目录列表、托管文件链接/保护、策略层遍历计数、插件基础层与保留层（storage v5）。invalidateAll 递增 epoch 清空缓存（可保留用户层），seed*\/unseed* 按 epoch 写入预读结果，*InstallVerdict 判定预读结果能否安装（install/raced/deferred）。
 */
//@ chunk-ndmse9kj.js:5237-9662 placement
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
  isLoadingFromDisk = !1;
  autoModeUntrustedSourceWarned = !1;
  changed = createSignal();
  internalWrites = new Map();
  enabledSources;
  inlineFlagParse;
  repoTierFreeze = new RepoTierFreeze();
  hookedMerge = createHookedMergeState();
  pluginBase;
  epoch = 0;
  systemSpaceServingLogged = !1;
  systemAttestationContradicted = !1;
  backendReadResetTail = Promise.resolve();
  backgroundWorkTail = Promise.resolve();
  invalidated = createSignal();
  pluginBaseLoaded = !1;
  primer;
  lastSeededUserLayer;
  localStoreProbes = new LocalStoreProbes();
  retained = new Map();
  retainedListings = new Map();
  setPluginBase(e) {
    ((this.pluginBase = e), (this.pluginBaseLoaded = !0));
  }
  clearPluginBase() {
    this.pluginBase = void 0;
  }
  invalidateAll(e) {
    if (
      (this.epoch++,
      (this.mergedSettings = null),
      this.perSource.clear(),
      this.parsedFiles.clear(),
      this.managedDocumentLinks.clearWalk(),
      this.managedFileProtections.clear(),
      this.primedFiles.clear(),
      (this.policyWalks = 0),
      this.walkedFolders.clear(),
      this.folderListings.clear(),
      (this.policy = {}),
      e?.userLayer === "retain" && isStorageV5Enabled() && this.primer !== void 0)
    ) {
      for (let [n, o] of this.retained) (this.parsedFiles.set(n, o.parsed), this.primedFiles.add(n));
      for (let [n, o] of this.retainedListings) this.folderListings.set(n, o.names);
    } else (this.retained.clear(), this.retainedListings.clear());
    this.invalidated.emit();
  }
  invalidatePolicyLayer() {
    ((this.mergedSettings = null), this.perSource.delete("policySettings"), (this.policy = {}));
  }
  onInvalidate(e) {
    return this.invalidated.subscribe(e);
  }
  seedParsedFile(e, n, o, r) {
    if (r !== this.epoch) return !1;
    let i = this.parsedFiles.get(e),
      s = i !== void 0 && E(i, o),
      a = !s,
      l = s ? i : o;
    if ((this.parsedFiles.set(e, l), n === "userSettings")) this.lastSeededUserLayer = { path: e, parsed: l };
    if (a || this.primedFiles.has(e)) this.primedFiles.add(e);
    let p = this.retained.get(e);
    if (p !== void 0) p.parsed = l;
    if (a) this.dropDerivedCaches(n);
    return !0;
  }
  walkReadDiffers(e, n) {
    let o = this.parsedFiles.get(e);
    return o !== void 0 && !this.primedFiles.has(e) && !k(o, n);
  }
  unseedParsedFile(e, n, o) {
    if (o !== this.epoch) return;
    if (
      (this.retained.delete(e), !this.primedFiles.has(e) || (n === "policySettings" && this.policyWalks > 0))
    )
      return;
    (this.primedFiles.delete(e), this.parsedFiles.delete(e), this.dropDerivedCaches(n));
  }
  dropDerivedCaches(e) {
    if ((this.perSource.delete(e), (this.mergedSettings = null), e === "policySettings")) this.policy = {};
  }
  primedFolderListing(e) {
    return isStorageV5Enabled() ? this.folderListings.get(e) : void 0;
  }
  folderListingForPolicyWalk(e) {
    if (!isStorageV5Enabled()) return;
    this.policyWalks++;
    let n = this.folderListings.get(e);
    if (!this.walkedFolders.has(e) || n !== void 0) this.walkedFolders.set(e, n ?? null);
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
    if (r === void 0 || E(r, n)) return "install";
    if (!this.primedFiles.has(e)) return "raced";
    if (this.policyWalks === 0) return "install";
    return this.policyWalks > o ? "raced" : "deferred";
  }
  folderInstallVerdict(e, n, o) {
    if (!this.walkedFolders.has(e)) return this.hasParsedDropInOutside(e, n) ? "raced" : "install";
    let r = this.walkedFolders.get(e);
    if (r !== null && r !== void 0 && k(r, n)) return "install";
    return this.policyWalks > o ? "raced" : "deferred";
  }
  seedFolderListing(e, n, o) {
    if (o !== this.epoch) return !1;
    let r = this.folderListings.get(e);
    this.folderListings.set(e, n);
    let i = this.retainedListings.get(e);
    if (i !== void 0) i.names = n;
    if (r !== void 0 && !k(r, n)) this.dropDerivedCaches("policySettings");
    return !0;
  }
  walkReadManagedFileIn(e, n) {
    for (let [o, r] of this.parsedFiles)
      if (
        !o.includes("\x00") &&
        !this.primedFiles.has(o) &&
        (r.settings !== null || r.errors.length > 0) &&
        (o === e || dirname(o) === n)
      )
        return !0;
    return !1;
  }
  walkRead(e) {
    return this.parsedFiles.has(e) && !this.primedFiles.has(e);
  }
  hasParsedDropInOutside(e, n) {
    for (let o of this.parsedFiles.keys())
      if (!o.includes("\x00") && !this.primedFiles.has(o) && dirname(o) === e && !n.includes(basename(o)))
        return !0;
    return !1;
  }
  clearFolderListing(e, n) {
    if (n !== this.epoch) return;
    if ((this.retainedListings.delete(e), !this.folderListings.has(e) || this.walkedFolders.has(e))) return;
    (this.folderListings.delete(e), this.dropDerivedCaches("policySettings"));
  }
  retainLayer(e, n) {
    let o = this.parsedFiles.get(e),
      r = { parsed: o !== void 0 && E(o, n) ? o : n };
    return (
      this.retained.set(e, r),
      () => {
        if (this.retained.get(e) === r) this.retained.delete(e);
      }
    );
  }
  dropRetainedLayer(e) {
    this.retained.delete(e);
  }
  retainFolderListing(e, n) {
    let o = { names: n };
    return (
      this.retainedListings.set(e, o),
      () => {
        if (this.retainedListings.get(e) === o) this.retainedListings.delete(e);
      }
    );
  }
}
/**
 * 本地存储探测缓存：按根目录缓存属主 uid 列表，以及规范化后的真实家目录。
 */
//@ chunk-ndmse9kj.js:9662-10211 placement
class LocalStoreProbes {
  ownerUidsByRoot = new Map();
  realHomeDir = void 0;
  canonicalRootOwnerUids(e, n) {
    let o = this.ownerUidsByRoot.get(e);
    if (o !== void 0) return o;
    let r = n(e);
    return (this.ownerUidsByRoot.set(e, r), r);
  }
  hasCanonicalRootOwnerUids(e) {
    return this.ownerUidsByRoot.has(e);
  }
  primeCanonicalRootOwnerUids(e, n) {
    if (this.ownerUidsByRoot.has(e)) return !1;
    return (this.ownerUidsByRoot.set(e, n), !0);
  }
  clearCanonicalRootOwnerUids() {
    this.ownerUidsByRoot.clear();
  }
  normalizedRealHomeDir(e) {
    return ((this.realHomeDir ??= e()), this.realHomeDir);
  }
  clearNormalizedRealHomeDir() {
    this.realHomeDir = void 0;
  }
}
//@ chunk-ndmse9kj.js:10211-10238 placement
var lEr = new HostScoped(() => new SettingsCacheStore());
//@ chunk-ndmse9kj.js:10238-10312 placement
function E(e, n) {
  return k({ ...e, fileOwner: void 0 }, { ...n, fileOwner: void 0 });
}
/**
 * 新建一份"粘性 beta 头"会话状态：已发送/被拒绝的 beta、声明的工具集、只发名字的工具公告、内联工具被拒记录、wire 形状种子、媒体数量上限、被拒工具 schema 等。
 */
//@ chunk-ndmse9kj.js:10312-10808 placement
function createStickyBetaLatches() {
  return {
    sent: new Set(),
    rejected: new Set(),
    declaredTools: void 0,
    noChannelTools: void 0,
    turnDeniedTools: void 0,
    declaredToolsDecided: !1,
    nameOnlyAnnouncements: new Set(),
    surfacedOnWire: new Set(),
    definedByValue: new Set(),
    inlineToolsRefusal: { rejectedHeader: void 0, announcementsByName: new Set() },
    advisorHeld: void 0,
    wireShapeSeed: void 0,
    webSearchHistoryRejected: !1,
    mediaItemCap: void 0,
    refusedToolSchemas: new Map(),
    systemMessagesAcceptedBy: new Set(),
    nameOnlyEntries: { held: new Set(), refused: !1, reported: void 0 },
  };
}
/**
 * 为子代理/侧查询复制粘性 beta 状态：已发送、被拒、公告等集合深拷贝，但 declaredTools/noChannelTools/turnDeniedTools 重置为未决定。
 */
//@ chunk-ndmse9kj.js:10808-11572 placement
function forkStickyBetaLatches(parent) {
  return {
    sent: new Set(parent.sent),
    rejected: new Set(parent.rejected),
    declaredTools: void 0,
    noChannelTools: void 0,
    turnDeniedTools: void 0,
    declaredToolsDecided: !1,
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
    nameOnlyEntries: { ...parent.nameOnlyEntries, held: new Set(parent.nameOnlyEntries.held) },
  };
}
/**
 * 完整复制粘性 beta 状态（含声明的工具集与决定标记），用于需要与父对话完全一致的分叉代理。
 */
//@ chunk-ndmse9kj.js:11572-12387 placement
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
    nameOnlyEntries: { ...latches.nameOnlyEntries, held: new Set(latches.nameOnlyEntries.held) },
  };
}
/**
 * 清除会话（/clear）时调用：先重置部分粘性记录，再清空 nameOnlyEntries 的 held/refused/reported。
 */
//@ chunk-ndmse9kj.js:12387-12504 placement
function resetStickyBetaNameOnlyEntries(e) {
  (cco(e),
    e.nameOnlyEntries.held.clear(),
    (e.nameOnlyEntries.refused = !1),
    (e.nameOnlyEntries.reported = void 0));
}
//@ chunk-ndmse9kj.js:12504-12593 placement
function cco(e) {
  ((e.declaredTools = void 0), (e.noChannelTools = void 0), (e.declaredToolsDecided = !1));
}
/**
 * 清空 systemMessagesAcceptedBy，并把 wireShapeSeed 带来的 sent/rejected beta 从集合里撤回，然后丢弃种子。
 */
//@ chunk-ndmse9kj.js:12593-12792 placement
function dropWireShapeSeed(e) {
  e.systemMessagesAcceptedBy.clear();
  let wireShapeSeed = e.wireShapeSeed;
  if (wireShapeSeed === void 0) return;
  for (let o of wireShapeSeed.sent) e.sent.delete(o);
  for (let o of wireShapeSeed.rejected) e.rejected.delete(o);
  e.wireShapeSeed = void 0;
}
//@ chunk-ndmse9kj.js:12792-12888 placement
function Obs(e, n) {
  for (let o of n.sent) eB(e, o);
  for (let o of n.rejected) Xg(e, o);
  e.wireShapeSeed = n;
}
//@ chunk-ndmse9kj.js:12888-12925 placement
function xDt(e) {
  e.advisorHeld = void 0;
}
/**
 * 撤销"内联工具被拒"记录：从 rejected 删除被拒的头，从 nameOnlyAnnouncements 删除按名字公告的工具并清空该集合。
 */
//@ chunk-ndmse9kj.js:12925-13143 placement
function clearInlineToolsRefusal(e) {
  let { rejectedHeader: rejectedHeader, announcementsByName: announcementsByName } = e.inlineToolsRefusal;
  if (rejectedHeader !== void 0)
    (e.rejected.delete(rejectedHeader), (e.inlineToolsRefusal.rejectedHeader = void 0));
  for (let r of announcementsByName) e.nameOnlyAnnouncements.delete(r);
  announcementsByName.clear();
}
//@ chunk-ndmse9kj.js:13143-13189 placement
function eLi(e) {
  return ((e.advisorHeld = void 0), e);
}
//@ chunk-ndmse9kj.js:13189-13231 placement
function PDt(e) {
  e.declaredToolsDecided = !0;
}
/**
 * 生成一份解锁后的粘性 beta 状态：新建空状态，只保留声明工具集、advisor、wire 种子、内联拒绝、web search 历史拒绝、媒体上限、被拒 schema 与 nameOnlyEntries 的拒绝/上报标记。
 */
//@ chunk-ndmse9kj.js:13231-13846 placement
function unlatchStickyBetaLatches(previous) {
  let n = createStickyBetaLatches();
  if (
    ((n.declaredTools = previous.declaredTools),
    (n.noChannelTools = previous.noChannelTools),
    (n.turnDeniedTools = previous.turnDeniedTools),
    (n.declaredToolsDecided = previous.declaredToolsDecided),
    (n.advisorHeld = previous.advisorHeld),
    previous.wireShapeSeed !== void 0)
  )
    Obs(n, previous.wireShapeSeed);
  let { rejectedHeader: rejectedHeader, announcementsByName: announcementsByName } =
    previous.inlineToolsRefusal;
  if (rejectedHeader !== void 0) Mbs(n, rejectedHeader);
  (addNameOnlyAnnouncements(n, announcementsByName),
    (n.webSearchHistoryRejected = previous.webSearchHistoryRejected),
    (n.mediaItemCap = previous.mediaItemCap));
  for (let [i, s] of previous.refusedToolSchemas) n.refusedToolSchemas.set(i, s);
  return (
    (n.nameOnlyEntries.refused = previous.nameOnlyEntries.refused),
    (n.nameOnlyEntries.reported = previous.nameOnlyEntries.reported),
    n
  );
}
//@ chunk-ndmse9kj.js:13846-13910 placement
function Mbs(e, n) {
  (Xg(e, n), (e.inlineToolsRefusal.rejectedHeader = n));
}
/**
 * 把一组工具名同时记入内联拒绝的按名公告集合和 nameOnlyAnnouncements。
 */
//@ chunk-ndmse9kj.js:13910-14022 placement
function addNameOnlyAnnouncements(e, n) {
  for (let o of n) (e.inlineToolsRefusal.announcementsByName.add(o), e.nameOnlyAnnouncements.add(o));
}
//@ chunk-ndmse9kj.js:14022-14093 placement
function dLn(e, n) {
  if (e.declaredTools === void 0) e.declaredTools = n;
  PDt(e);
}
/**
 * 返回已在 wire 上露出的工具名集合；有按值定义的工具时与 definedByValue 合并。
 */
//@ chunk-ndmse9kj.js:14093-14210 placement
function getSurfacedToolNames(e) {
  return e.definedByValue.size === 0 ? e.surfacedOnWire : new Set([...e.surfacedOnWire, ...e.definedByValue]);
}
//@ chunk-ndmse9kj.js:14210-14263 placement
function eB(e, n) {
  if (!e.rejected.has(n)) e.sent.add(n);
}
//@ chunk-ndmse9kj.js:14263-14321 placement
function lT(e, n) {
  return e.sent.has(n) && !e.rejected.has(n);
}
//@ chunk-ndmse9kj.js:14321-14373 placement
function Xg(e, n) {
  (e.sent.delete(n), e.rejected.add(n));
}
//@ chunk-ndmse9kj.js:14373-14415 placement
function Lp(e, n) {
  return e.rejected.has(n);
}
//@ chunk-ndmse9kj.js:14415-14471 placement
function IDt(e, n) {
  (e.sent.delete(n), e.rejected.delete(n));
}
//@ chunk-ndmse9kj.js:14471-14517 placement
function tLi(e) {
  e.webSearchHistoryRejected = !0;
}
//@ chunk-ndmse9kj.js:14517-14563 placement
function fEr(e) {
  e.webSearchHistoryRejected = !1;
}
//@ chunk-ndmse9kj.js:14563-14636 placement
function uco(e, n) {
  return e.mediaItemCap?.model === n ? e.mediaItemCap : void 0;
}
//@ chunk-ndmse9kj.js:14636-14671 placement
function fco(e, n) {
  e.mediaItemCap = n;
}
//@ chunk-ndmse9kj.js:14671-14709 placement
function ODt(e) {
  e.mediaItemCap = void 0;
}
//@ chunk-ndmse9kj.js:14709-14754 placement
function pEr(e) {
  e.refusedToolSchemas.clear();
}
//@ chunk-ndmse9kj.js:14754-14835 placement
class D {
  spawner = void 0;
  pairings = new Map();
  mainEnsureInFlight = !1;
  mainSlotBlocked = !1;
}
//@ chunk-ndmse9kj.js:14835-14913 placement
var cLn = /^[A-Za-z0-9_.:-]{1,256}$/,
  UNREADABLE_TOOLS_USED_BEFORE_SUMMARY = "unreadable-tools-used-before-summary";
//@ chunk-ndmse9kj.js:14913-14989 placement
function xre(e) {
  return cLn.test(e) ? e : "unreadable-tools-used-before-summary";
}
//@ chunk-ndmse9kj.js:14989-15024 placement
var TOOLS_USED_BEFORE_SUMMARY_TAG = "tools-used-before-summary";
//@ chunk-ndmse9kj.js:15024-15088 placement
function pco(e) {
  return `<${TOOLS_USED_BEFORE_SUMMARY_TAG}>${e.map(xre).join(", ")}</${TOOLS_USED_BEFORE_SUMMARY_TAG}>`;
}
//@ chunk-ndmse9kj.js:15088-15157 placement
function uLn(e) {
  return /(?:^|__|:)download_gmail_attachment$/.test(e);
}
/**
 * 会话里"已使用工具"名单：record 规范化后去重记入并递增代数，built() 按代数缓存派生值，reportTruncationOnce 只报一次截断。
 */
//@ chunk-ndmse9kj.js:15157-15715 placement
class ToolsUsedSet {
  #e = new Set();
  #t = 0;
  #n = !1;
  #o;
  record(e) {
    let n = !1;
    for (let o of e) {
      if (typeof o !== "string" || o === "") continue;
      let r = xre(o);
      if (!this.#e.has(r)) (this.#e.add(r), (n = !0));
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
    if (this.#o?.generation !== this.#t) this.#o = { generation: this.#t, value: e(this.names()) };
    return this.#o.value;
  }
  reportTruncationOnce() {
    if (this.#n) return !1;
    return ((this.#n = !0), !0);
  }
  replace(e) {
    (this.clear(), this.record(e));
  }
  clear() {
    (this.#e.clear(), this.#t++, (this.#n = !1));
  }
}
/**
 * 会话锁存切片：粘性 beta 状态（stickyBetas/unlatchStickyBetas）、ATIS 锁存值与监听、已用工具集合。
 */
//@ chunk-ndmse9kj.js:15715-15989 placement
class ConversationLatches {
  #e = createStickyBetaLatches();
  #t = void 0;
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
    ((this.#t = e), this.#n?.(e));
  }
  watchAtisLatch(e) {
    this.#n = e;
  }
  reset() {
    ((this.#e = createStickyBetaLatches()), (this.#t = void 0), this.toolsUsed.clear());
  }
}
//@ chunk-ndmse9kj.js:15989-16078 placement
var MDt = { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 };
//@ chunk-ndmse9kj.js:16078-16144 placement
function C(e) {
  let create = Object.create(null);
  return Object.assign(create, e);
}
//@ chunk-ndmse9kj.js:16144-16223 placement
function Ue(e) {
  let n = C();
  for (let [o, r] of Object.entries(e)) n[o] = { ...r };
  return n;
}
/**
 * 会话费用账本：总费用、API/工具耗时、增删行数、各模型用量、侧查询费用、安全停止次数、已花 token；支持 restore/snapshot 与按会话认领（claim/scopeTo/belongsTo），记账时触发 spendRecorded 信号。
 */
//@ chunk-ndmse9kj.js:16223-20132 placement
class CostLedger {
  #e = 0;
  #t = 0;
  #n = 0;
  #o = 0;
  #r = Date.now();
  #s = void 0;
  #i = 0;
  #d = 0;
  #u = 0;
  #c = MDt;
  #l = 0;
  #p = MDt;
  #h = !1;
  #a = 0;
  #g = C();
  #S = void 0;
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
    this.#S ??= C();
  }
  usageSinceLastResult() {
    return this.#S;
  }
  takeUsageSinceLastResult() {
    let e = this.#S;
    if (e !== void 0) this.#S = C();
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
    ((this.#t += e), (this.#n += n));
  }
  spentTokens() {
    return this.#p;
  }
  recordSpentTokens(e) {
    let n = this.#p;
    ((this.#p = {
      inputTokens: n.inputTokens + e.inputTokens,
      outputTokens: n.outputTokens + e.outputTokens,
      cacheReadInputTokens: n.cacheReadInputTokens + e.cacheReadInputTokens,
      cacheCreationInputTokens: n.cacheCreationInputTokens + e.cacheCreationInputTokens,
    }),
      this.spendRecorded.emit());
  }
  recordCost(e, n, o) {
    ((this.#g[o] = n), (this.#e += e), this.spendRecorded.emit());
  }
  recordSideQueryCost(e) {
    if (Number.isFinite(e) && e >= 0) ((this.#l += e), this.spendRecorded.emit());
  }
  recordToolDuration(e) {
    this.#o += e;
  }
  recordLinesChanged(e, n) {
    ((this.#i += e), (this.#d += n));
  }
  markUnknownModelCost() {
    this.#h = !0;
  }
  recordSafetyStop() {
    this.#a += 1;
  }
  zeroDurationsAndCostForTests() {
    ((this.#t = 0), (this.#n = 0), (this.#e = 0), (this.#u = 0));
  }
  restartClock() {
    ((this.#r = Date.now()), this.anchorLogicalStart(void 0));
  }
  anchorLogicalStart(e) {
    this.#s = e === void 0 ? void 0 : Math.min(e, this.#r);
  }
  restore(
    {
      totalCostUSD: e,
      totalAPIDuration: n,
      totalAPIDurationWithoutRetries: o,
      totalToolDuration: r,
      totalLinesAdded: i,
      totalLinesRemoved: s,
      lastDuration: a,
      startTime: l,
      modelUsage: p,
      hasUnknownModelCost: f,
    },
    S,
  ) {
    if (
      ((this.#f = S),
      (this.#e = e),
      (this.#u = e),
      (this.#t = n),
      (this.#n = o),
      (this.#o = r),
      (this.#i = i),
      (this.#d = s),
      (this.#h = f ?? !1),
      p)
    )
      this.#g = C(p);
    if (
      ((this.#c = {
        inputTokens: this.totalInputTokens(),
        outputTokens: this.totalOutputTokens(),
        cacheReadInputTokens: this.totalCacheReadInputTokens(),
        cacheCreationInputTokens: this.totalCacheCreationInputTokens(),
      }),
      a !== void 0)
    )
      this.#r = Date.now() - a;
    this.anchorLogicalStart(l);
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
      modelUsage: Ue(this.#g),
    };
  }
  restoreSnapshot(e) {
    ((this.#f = e.ownerSessionId),
      (this.#e = e.totalCostUSD),
      (this.#t = e.totalAPIDuration),
      (this.#n = e.totalAPIDurationWithoutRetries),
      (this.#o = e.totalToolDuration),
      (this.#r = e.startTime),
      (this.#s = e.sessionLogicalStartTime),
      (this.#i = e.totalLinesAdded),
      (this.#d = e.totalLinesRemoved),
      (this.#u = e.restoredCostUSD),
      (this.#c = e.restoredTokens),
      (this.#h = e.hasUnknownModelCost),
      (this.#a = e.safetyStops),
      (this.#g = Ue(e.modelUsage)));
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
    ((this.#f = e),
      (this.#e = 0),
      (this.#u = 0),
      (this.#c = MDt),
      (this.#t = 0),
      (this.#n = 0),
      (this.#o = 0),
      (this.#r = Date.now()),
      this.anchorLogicalStart(void 0),
      (this.#i = 0),
      (this.#d = 0),
      (this.#h = !1),
      (this.#a = 0),
      (this.#g = C()));
  }
}
/**
 * 仅用量额度模型的同意记录：按会话的回退同意集合与会话同意键表。
 */
//@ chunk-ndmse9kj.js:20132-20460 placement
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
    (this.#e.clear(), this.#t.clear());
  }
}
/**
 * 钩子注册切片：registeredHooks 持有者、主线程代理类型与主线程代理钩子。
 */
//@ chunk-ndmse9kj.js:20460-20764 placement
class HookRegistry {
  #e = { registeredHooks: null };
  #t = void 0;
  #n = void 0;
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
    ((this.#e = { registeredHooks: null }), (this.#t = void 0), (this.#n = void 0));
  }
}
/**
 * 本会话已调用技能表：按名字记录/查询/遗忘。
 */
//@ chunk-ndmse9kj.js:20764-20949 placement
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
/**
 * MCP 会话接线切片：已批准的服务器（按工作区）、客户端访问器、已连接客户端接线、工具替换器与连接表；acquire* 系列只允许一个持有者并返回释放函数。
 */
//@ chunk-ndmse9kj.js:20949-21794 placement
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
        this.#e.push({ name: o, workspaceKey: e });
  }
  registerClientsAccessor(e) {
    this.#t = e;
  }
  acquireClientsAccessor(e) {
    if (this.#t) return () => {};
    return (
      (this.#t = e),
      () => {
        if (this.#t === e) this.#t = void 0;
      }
    );
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
    return (
      (this.#o = e),
      () => {
        if (this.#o === e) this.#o = void 0;
      }
    );
  }
  swapServerTools(e, n, o) {
    if (!this.#o) return !1;
    return this.#o(e, n, o);
  }
  registerConnections(e) {
    this.#r = e;
  }
  acquireConnections(e) {
    if (this.#r) return () => {};
    return (
      (this.#r = e),
      () => {
        if (this.#r === e) this.#r = void 0;
      }
    );
  }
  connections() {
    return this.#r;
  }
  reset() {
    ((this.#e = []), (this.#t = void 0));
  }
}
/**
 * 模型选择切片：主循环模型覆盖、effort 状态、初始模型及其设置层、组织默认、环境默认模型；拒绝回退（refusal fallback）发生/头锁存/静默通道标记与回退模型锁存、可用性回退链。
 */
//@ chunk-ndmse9kj.js:21794-23391 placement
class ModelSelectionSlice {
  #e = void 0;
  #t = void 0;
  #n = void 0;
  #o = void 0;
  #r = void 0;
  #s = void 0;
  #i = !1;
  #d = !1;
  #u = void 0;
  #c = !1;
  #l = void 0;
  #p = void 0;
  #h = void 0;
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
    ((this.#i = !0), (this.#u ??= e));
  }
  refusalFallbackHeaderArmed() {
    return this.#d;
  }
  armRefusalFallbackHeader(e) {
    ((this.#d = !0), (this.#u ??= e));
  }
  refusalFallbackLatchOriginRequestId() {
    return this.#u;
  }
  silentLaneServerArmed() {
    return this.#c;
  }
  armSilentLaneFromServer() {
    this.#c = !0;
  }
  forgetRefusalFallbackOccurred() {
    ((this.#i = !1), (this.#d = !1), (this.#c = !1), (this.#u = void 0));
  }
  refusalFallbackModelLatch() {
    return this.#l;
  }
  replaceRefusalFallbackModelLatch(e, n = "superseded") {
    if (this.#l?.carriedEffort !== void 0 && e?.carriedEffort === void 0) this.#p = n;
    this.#l = e;
  }
  unlatchRefusalFallbackModel(e) {
    this.replaceRefusalFallbackModelLatch(void 0, e);
  }
  takeCarriedEffortEnd() {
    let e = this.#p;
    return ((this.#p = void 0), e);
  }
  availabilityFallbackChain() {
    return this.#h;
  }
  replaceAvailabilityFallbackChain(e) {
    this.#h = e;
  }
  reset() {
    ((this.#e = void 0),
      (this.#t = void 0),
      (this.#n = void 0),
      (this.#o = void 0),
      (this.#r = void 0),
      (this.#s = void 0),
      (this.#i = !1),
      (this.#d = !1),
      (this.#c = !1),
      (this.#u = void 0),
      (this.#l = void 0),
      (this.#p = void 0),
      (this.#h = void 0));
  }
}
/**
 * 系统提示词分段缓存：sections 记录各段，noteInvalidation 递增 epoch 并记原因。
 */
//@ chunk-ndmse9kj.js:23391-23660 placement
class PromptAssemblySlice {
  #e = new Map();
  #t = 0;
  #n = void 0;
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
    ((this.#t += 1), (this.#n = e));
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
/**
 * 请求日志切片：最近一次 API 请求/消息/分类器请求、promptId 与序号、最近人工提示、主线程请求 id 与响应、主线程缓存 TTL 与续期时间、上下文 token、恢复种子、最近完成时间、压缩后待处理标记。
 */
//@ chunk-ndmse9kj.js:23660-26250 placement
class RequestJournal {
  #e = null;
  #t = null;
  #n = null;
  #o = null;
  #r = null;
  #s = 0;
  #i = null;
  #d = void 0;
  #u = 0;
  #c = void 0;
  #l = null;
  #p = null;
  #h = null;
  #a = null;
  #g = null;
  #S = !1;
  #y = null;
  #v = null;
  #f = !1;
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
    return (this.#s++, this.#s);
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
    if (((this.#d = e), (this.#c = n), e === void 0)) this.#u += 1;
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
  replaceLastMainThreadCacheTtlMs(e, n, o = !1) {
    ((this.#l = e),
      (this.#a = Date.now()),
      (this.#h = {
        ttlMs: e,
        model: n,
        requestAt: this.#a,
        askedAt: o ? (this.#h?.askedAt ?? this.#a) : this.#a,
      }),
      (this.#g = this.#a),
      (this.#S = !0));
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
      this.#p = { requestAt: this.#a, at: Math.max(e, this.lastMainThreadCacheRenewedAt() ?? -1 / 0) };
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
    this.#S = !0;
  }
  replaceLastMainThreadRequest(e, n) {
    ((this.#a = e), (this.#l = n));
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
    ((this.#m = null), (this.#l = e.ttlMs), (this.#a = e.requestAt), (this.#y = e.contextTokens));
  }
  #m = null;
  clearLastMainThreadRequest(e) {
    let n = e !== void 0 && this.#m?.sessionId === e ? this.#m : null;
    ((this.#m = null),
      (this.#l = n?.ttlMs ?? null),
      (this.#a = n?.requestAt ?? null),
      (this.#y = n?.contextTokens ?? null),
      (this.#g = null),
      (this.#S = !1));
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
    ((this.#e = null),
      (this.#t = null),
      (this.#n = null),
      (this.#o = null),
      (this.#r = null),
      (this.#s = 0),
      (this.#i = null),
      (this.#d = void 0),
      (this.#c = void 0),
      (this.#u += 1),
      (this.#l = null),
      (this.#a = null),
      (this.#g = null),
      (this.#S = !1),
      (this.#y = null),
      (this.#m = null),
      (this.#v = null),
      (this.#f = !1));
  }
}
/**
 * 会话定时任务切片：任务列表、各链开始时间、tick 中的提示与插件、连续 keepalive 次数、结束标记与唤醒次数；changed/pendingLoopWakeup 两个信号。
 */
//@ chunk-ndmse9kj.js:26250-27000 placement
class SessionCron {
  #e = [];
  #t = Object.create(null);
  #n = null;
  #o = void 0;
  #r = 0;
  #s = !1;
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
    ((this.#n = e), (this.#o = e === null ? void 0 : n));
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
    ((this.#e = []),
      (this.#t = Object.create(null)),
      (this.#n = null),
      (this.#o = void 0),
      (this.#r = 0),
      (this.#s = !1),
      (this.#i = 0));
  }
}
/**
 * 会话标志切片：引导/LSP 推荐是否已显示、信任对话框、计划/自动模式退出附件、记忆开关与暂停、账号记忆模式、各种 rollout 闸门锁存、技能/插件同步开关与否决、待处理的上下文压缩通知、例程、继承的团队名、teleport 会话信息、CLAUDE.md 缓存等。
 */
//@ chunk-ndmse9kj.js:27000-30506 placement
class SessionFlags {
  #e = !1;
  #t = !1;
  #n = !1;
  #o = !1;
  #r = !1;
  #s = !1;
  #i = !1;
  #d = !1;
  #u = !1;
  #c = !1;
  #l = !1;
  #p = void 0;
  #h = !1;
  #a = void 0;
  #g = !1;
  #S = !1;
  #y = null;
  #v = null;
  #f = null;
  #m = !1;
  #b = null;
  #k = !1;
  #R = !1;
  #x = !1;
  #C = !1;
  #P = !1;
  #T = void 0;
  #w = void 0;
  #A = void 0;
  #L = void 0;
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
  replaceAccountMemorySessionMode(e, n = !1) {
    ((this.#p = e), (this.#h = n && e !== void 0));
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
    this.#k = !0;
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
    if (this.#M) this.#M.hasLoggedFirstMessage = !0;
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
    ((this.#T = e), (this.#w = n));
  }
  consumePendingContextCompacted() {
    let e = this.#T;
    return ((this.#T = void 0), e);
  }
  forgetPendingContextCompacted() {
    ((this.#T = void 0), (this.#w = void 0));
  }
  responseBeforeCompaction() {
    return this.#w;
  }
  forgetResponseBeforeCompaction() {
    this.#w = void 0;
  }
  reset() {
    ((this.#R = !1),
      (this.#x = !1),
      (this.#C = !1),
      (this.#P = !1),
      (this.#e = !1),
      (this.#t = !1),
      (this.#n = !1),
      (this.#o = !1),
      (this.#r = !1),
      (this.#s = !1),
      (this.#i = !1),
      (this.#d = !1),
      (this.#u = !1),
      (this.#l = !1),
      (this.#p = void 0),
      (this.#h = !1),
      (this.#a = void 0),
      (this.#g = !1),
      (this.#c = !1),
      (this.#m = !1),
      (this.#S = !1),
      (this.#y = null),
      (this.#v = null),
      (this.#f = null),
      (this.#b = null),
      (this.#k = !1),
      (this.#A = void 0),
      (this.#L = void 0),
      (this.#M = null),
      (this.#O = null),
      (this.#T = void 0),
      (this.#w = void 0));
  }
}
//@ chunk-ndmse9kj.js:30506-30729 placement
function createArrivingInboundFiles() {
  return {
    messagesArriving: 0,
    lastInLine: Promise.resolve(),
    gaveUpOn: void 0,
    besideLine: 0,
    lastBesideLine: Promise.resolve(),
    gaveUpOnBeside: void 0,
    pathsArrivingBeside: new Map(),
    toolCallsWaiting: 0,
    pathsArriving: new Map(),
  };
}
/**
 * 会话暂存切片：计划 slug 缓存、待关联分支/PR、vim 共享状态、代理颜色、本会话建的团队与窗格、已提示过的失败、入站附件下载与到达队列、Chrome 可用性日志、目标空闲提醒/重新提示定时器、worker 签到；reset 会清掉所有定时器并中止下载。
 */
//@ chunk-ndmse9kj.js:30729-33066 placement
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
  #f = { byFileUuid: new Map(), recentPrefetchStarts: [] };
  #m = createArrivingInboundFiles();
  #b = new Set();
  #k = void 0;
  #R = void 0;
  #x = void 0;
  #C = void 0;
  #P = void 0;
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
    if (((this.#b = new Set()), e)) this.#k = Date.now();
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
    ((this.#e = new Map()),
      (this.#t = new Map()),
      (this.#n = null),
      (this.#o = new Map()),
      (this.#r = new Set()),
      (this.#s = new Set()),
      (this.#i = new Set()),
      (this.#d = new Set()),
      (this.#u = new Set()),
      (this.#c = new Set()),
      (this.#l = new Set()),
      (this.#p = new Set()),
      (this.#h = new Set()),
      (this.#a = new Set()),
      (this.#g = new Map()),
      (this.#S = new Map()),
      (this.#y = new Map()),
      (this.#v = void 0));
    for (let e of this.#f.byFileUuid.values()) (clearTimeout(e.expiry), e.abort.abort());
    ((this.#f = { byFileUuid: new Map(), recentPrefetchStarts: [] }),
      (this.#m = createArrivingInboundFiles()),
      (this.#b = new Set()),
      (this.#k = void 0),
      clearTimeout(this.#R),
      (this.#R = void 0),
      clearTimeout(this.#x),
      (this.#x = void 0),
      (this.#C = void 0),
      clearInterval(this.#P?.timer),
      (this.#P = void 0));
  }
}
//@ chunk-ndmse9kj.js:33066-33167 placement
var DEFAULT_SURFACE_CAPS = {
  renderTarget: "ink",
  workspace: "local",
  canDrive: !0,
  transcriptSource: "local-jsonl",
  remote: null,
};
/**
 * 宿主界面能力切片：SDK 宿主是否接管对话框及支持的对话框种类、按任务停止、快速追问抢占、嵌套子代理工具转发、Chrome 设置提示；附着方能力、RV supervisor 连接、SDK betas、界面能力（本地/远程）、云端 cwd、REPL bridge 与主循环状态。
 */
//@ chunk-ndmse9kj.js:33167-35020 placement
class SurfaceCapabilities {
  #e = !1;
  #t = void 0;
  #n = void 0;
  #o = void 0;
  #r = void 0;
  #s = void 0;
  #i = void 0;
  #d = null;
  #u = !1;
  #c = void 0;
  #l = DEFAULT_SURFACE_CAPS;
  #p = !1;
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
    ((this.#t = e), (this.#n = e === void 0 ? void 0 : n));
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
    ((this.#d = e), this.attacherCapsChanged.emit());
  }
  rvSupervisorLinkLive() {
    return this.#u;
  }
  replaceRvSupervisorLinkLive(e) {
    if (this.#u === e) return;
    ((this.#u = e), this.rvSupervisorLinkChanged.emit());
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
    this.#l = { ...this.#l, workspace: e ? "remote" : "local" };
  }
  cloudCwdOfSession(e) {
    return this.#l.workspace === "remote" && this.#a?.sessionId === e ? this.#a.cwd : null;
  }
  replaceCloudCwd(e) {
    ((this.#a = e), this.cloudCwdChanged.emit());
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
    ((this.#e = !1),
      (this.#t = void 0),
      (this.#n = void 0),
      (this.#o = void 0),
      (this.#r = void 0),
      (this.#s = void 0),
      (this.#i = void 0),
      (this.#d = null),
      (this.#c = void 0),
      (this.#l = DEFAULT_SURFACE_CAPS),
      (this.#p = !1),
      (this.#h = "idle"),
      (this.#u = !1),
      (this.#a = null),
      this.attacherCapsChanged.clear(),
      this.rvSupervisorLinkChanged.clear(),
      this.cloudCwdChanged.clear());
  }
}
//@ chunk-ndmse9kj.js:35020-35031 placement
var Ne = 150;
/**
 * 用户在场切片：最近交互/提交/人工输入时间、终端焦点、滚动中标记（150ms 去抖）与 waitForScrollIdle；交互与焦点变化触发信号。
 */
//@ chunk-ndmse9kj.js:35031-35988 placement
class UserPresence {
  #e = Date.now();
  #t = !1;
  #n = 0;
  #o = -1 / 0;
  interactionFired = createSignal();
  #r = void 0;
  terminalFocusFired = createSignal();
  #s = !1;
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
    else this.#t = !0;
  }
  flushIfDirty() {
    if (this.#t) this.#d();
  }
  #d() {
    ((this.#e = Date.now()), (this.#t = !1), this.interactionFired.emit());
  }
  resetBaseline() {
    ((this.#e = Date.now()), (this.#t = !1));
  }
  terminalFocus() {
    return this.#r;
  }
  updateTerminalFocus(e) {
    ((this.#r = e), this.terminalFocusFired.emit());
  }
  scrollDraining() {
    return this.#s;
  }
  markScrollActivity() {
    if (((this.#s = !0), this.#i)) clearTimeout(this.#i);
    ((this.#i = setTimeout(() => {
      ((this.#s = !1), (this.#i = void 0));
    }, Ne)),
      this.#i.unref?.());
  }
  async waitForScrollIdle() {
    while (this.#s) await new Promise((e) => setTimeout(e, Ne));
  }
  reset() {
    ((this.#e = Date.now()),
      (this.#n = 0),
      (this.#o = -1 / 0),
      (this.#r = void 0),
      this.interactionFired.clear(),
      this.terminalFocusFired.clear());
  }
}

export {
  TOOLS_USED_BEFORE_SUMMARY_TAG,
  xre,
  cloneStickyBetaLatches,
  eLi,
  forkStickyBetaLatches,
  createStickyBetaLatches,
  MDt,
  resetStickyBetaNameOnlyEntries,
  xDt,
  clearInlineToolsRefusal,
  dropWireShapeSeed,
  fEr,
  ODt,
  pEr,
  IDt,
  Lp,
  Xg,
  PDt,
  dLn,
  uco,
  eB,
  lT,
  cco,
  tLi,
  fco,
  addNameOnlyAnnouncements,
  uLn,
  UNREADABLE_TOOLS_USED_BEFORE_SUMMARY,
  eP,
  SettingsCacheStore,
  m7t,
  CONFIG_DIR_UNSAFE_REASONS,
  lEr,
  Mbs,
  pco,
  cLn,
  getSurfacedToolNames,
  isWritableByCurrentUser,
  FORCE_LOGIN_SETTING_KEYS,
  classifyConfigDirOwnership,
  dco,
  Obs,
  D,
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
  k,
  C,
  ManagedDocumentLinks,
  unlatchStickyBetaLatches,
  ManagedFileProtections,
  RepoTierFreeze,
  E,
  ToolsUsedSet,
};
