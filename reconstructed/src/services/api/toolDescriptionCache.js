/**
 * services/api/toolDescriptionCache.ts
 *
 * 2.1.316 新增：工具描述缓存（按键、MCP 工具权重上限）；工具描述解析器（组合、缓存、epoch）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (27)
 * attribution: placement 27
 */
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-aepeg2w5.js:500590-501659 placement
/**
 * 工具描述解析器（组合、缓存、epoch）。
 */
function createToolDescriptionResolver() {
  let e = pu();
  let n = pu();
  let r = pu();
  let s = pu();
  let h = new Map();
  let y = new Map();
  let S = new Set();
  let w = new Set();
  let R = {
    hasDescribed: false,
    epoch: 0,
  };
  let x = (P) => (r.get() ?? n.get())?.(P) ?? false;
  return {
    setToolDescribeResolver: e.set,
    resolveToolDescription: async (P, F, L) => {
      R.hasDescribed = true;
      if (x(P.name)) S.add(P.name);
      let G = await (e.get()?.(P, F, L) ??
        Promise.resolve({
          description: F,
          isDeferred: L,
        }));
      if (normalizeFullWidthSpace(G.description) !== normalizeFullWidthSpace(F)) w.add(P.name);
      return G;
    },
    setToolDescribePresence: n.set,
    isToolDescribeHooked: (P) => n.get()?.(P) ?? false,
    setToolDescribeBuildPresence: r.set,
    isToolDescribeHookedForBuild: x,
    setToolDescribeInvalidator: s.set,
    invalidateToolDescriptions: () => {
      h.clear();
      y.clear();
      R.epoch += R.hasDescribed ? 1 : 0;
      s.get()?.();
    },
    redescribeTools: () => {
      R.hasDescribed = true;
    },
    redescribeEpoch: () => R.epoch,
    isHookDescribed: (P) => S.has(P) || x(P),
    isRewrittenByHook: (P) => w.has(P),
    forgetRedescribed: () => {
      S.clear();
      w.clear();
      R.hasDescribed = false;
      R.epoch = 0;
    },
    recordDeferral: (P, F) => (F === undefined ? void h.delete(P) : void h.set(P, F)),
    deferralOf: (P) => h.get(P),
    forgetDeferrals: () => {
      h.clear();
      y.clear();
    },
    describedOnce: (P, F) => {
      let L = y.get(P) ?? F();
      y.set(P, L);
      return L;
    },
  };
}
//@ chunk-aepeg2w5.js:501659-501724 placement
/**
 * 工具描述缓存的门面实例（HostScoped）：转发读取、盖章、登记、已发送记录与大小，重置时清空延迟与重述记录。
 */
var toolDescriptionResolver = identity_2(createToolDescriptionResolver(), (e) => {
  e.forgetDeferrals();
  e.forgetRedescribed();
});
//@ chunk-aepeg2w5.js:501724-501746 placement
var deferralOf = toolDescriptionResolver.deferralOf;
//@ chunk-aepeg2w5.js:501746-501771 placement
var describedOnce = toolDescriptionResolver.describedOnce;
//@ chunk-aepeg2w5.js:501771-501797 placement
var forgetDeferrals = toolDescriptionResolver.forgetDeferrals;
//@ chunk-aepeg2w5.js:501797-501823 placement
var recordDeferral = toolDescriptionResolver.recordDeferral;
//@ chunk-aepeg2w5.js:501823-501861 placement
var invalidateToolDescriptions_2 = toolDescriptionResolver.invalidateToolDescriptions;
//@ chunk-aepeg2w5.js:501861-501893 placement
var isToolDescribeHooked = toolDescriptionResolver.isToolDescribeHooked;
//@ chunk-aepeg2w5.js:501893-501933 placement
var isToolDescribeHookedForBuild = toolDescriptionResolver.isToolDescribeHookedForBuild;
//@ chunk-aepeg2w5.js:501933-501973 placement
var setToolDescribeBuildPresence = toolDescriptionResolver.setToolDescribeBuildPresence;
//@ chunk-aepeg2w5.js:501973-502008 placement
var setToolDescribePresence = toolDescriptionResolver.setToolDescribePresence;
//@ chunk-aepeg2w5.js:502008-502035 placement
var isHookDescribed = toolDescriptionResolver.isHookDescribed;
//@ chunk-aepeg2w5.js:502035-502064 placement
var isRewrittenByHook = toolDescriptionResolver.isRewrittenByHook;
//@ chunk-aepeg2w5.js:502064-502091 placement
var redescribeEpoch = toolDescriptionResolver.redescribeEpoch;
//@ chunk-aepeg2w5.js:502091-502118 placement
var redescribeTools = toolDescriptionResolver.redescribeTools;
//@ chunk-aepeg2w5.js:502118-502152 placement
var resolveToolDescription = toolDescriptionResolver.resolveToolDescription;
//@ chunk-aepeg2w5.js:502152-502189 placement
var setToolDescribeInvalidator = toolDescriptionResolver.setToolDescribeInvalidator;
//@ chunk-aepeg2w5.js:502189-502224 placement
var setToolDescribeResolver = toolDescriptionResolver.setToolDescribeResolver;
//@ chunk-aepeg2w5.js:502224-502253 placement
var MAX_IDS_KEPT = 2;
var MAX_KEY_OVERHEAD_BYTES = 256;
var MAX_MCP_KEYS_WEIGHT = 128000000;
//@ chunk-aepeg2w5.js:502253-502413 placement = getMcpPrefix (0.822)
function getMcpPrefix(serverName) {
  let index = serverName.indexOf(":{");
  if (index === -1 || !serverName.startsWith("mcp__", serverName.lastIndexOf(":", index - 1) + 1)) return;
  return `${serverName.slice(0, index).replace(/^V[0-9a-f]{16}:/, "V:")}:`;
}
//@ chunk-aepeg2w5.js:502413-504172 placement
/**
 * 工具描述缓存（按键、MCP 工具权重上限）。
 */
class ToolDescriptionCache {
  byKey = new Map();
  sentFromRecordByKey = new Map();
  mcpKeys = new Map();
  mcpKeysByTool = new Map();
  mcpKeysWeight = 0;
  maxMcpKeysWeight = MAX_MCP_KEYS_WEIGHT;
  generation = 0;
  get(e) {
    let n = this.byKey.get(e);
    if (n !== undefined) this.noteMcpKeyUsed(e);
    return n;
  }
  stamp() {
    return this.generation;
  }
  register(e, n, r) {
    if (r === this.generation) this.byKey.set(this.noteMcpKeyUsed(e, n.description?.length ?? 0), n);
  }
  getSentFromRecord(e) {
    let n = this.sentFromRecordByKey.get(e);
    if (n !== undefined) this.noteMcpKeyUsed(e);
    return n;
  }
  setSentFromRecord(e, n) {
    this.sentFromRecordByKey.set(this.noteMcpKeyUsed(e), n);
  }
  setMaxMcpKeysWeight(maxMcpKeysWeight) {
    this.maxMcpKeysWeight = maxMcpKeysWeight;
    this.dropMcpKeysPastBounds(new Set());
  }
  noteMcpKeyUsed(serverName, n) {
    let r = this.mcpKeys.get(serverName);
    if (r === undefined) {
      let mcpPrefix = getMcpPrefix(serverName);
      if (mcpPrefix === undefined) return serverName;
      r = {
        key: serverName,
        tool: mcpPrefix,
        weight: 0,
      };
    }
    if (r.weight === 0 || n !== undefined) {
      let h = serverName.length + MAX_KEY_OVERHEAD_BYTES + (n ?? 0);
      this.mcpKeysWeight += h - r.weight;
      r.weight = h;
    }
    this.mcpKeys.delete(r.key);
    this.mcpKeys.set(r.key, r);
    let s = this.mcpKeysByTool.get(r.tool) ?? new Set();
    s.delete(r);
    s.add(r);
    this.mcpKeysByTool.set(r.tool, s);
    this.dropMcpKeysPastBounds(s);
    return r.key;
  }
  dropMcpKeysPastBounds(e) {
    for (let n of e) {
      if (e.size <= MAX_IDS_KEPT) break;
      this.dropMcpKey(n);
    }
    if (this.mcpKeysWeight <= this.maxMcpKeysWeight) return;
    for (let mcpKey of this.mcpKeys.values()) {
      if (this.mcpKeysWeight <= this.maxMcpKeysWeight || this.mcpKeys.size === 1) break;
      this.dropMcpKey(mcpKey);
    }
  }
  dropMcpKey(e) {
    this.mcpKeys.delete(e.key);
    this.mcpKeysWeight -= e.weight;
    let n = this.mcpKeysByTool.get(e.tool);
    n?.delete(e);
    if (n?.size === 0) this.mcpKeysByTool.delete(e.tool);
    this.byKey.delete(e.key);
    this.sentFromRecordByKey.delete(e.key);
  }
  get size() {
    return this.byKey.size;
  }
  invalidateAll() {
    this.byKey.clear();
    this.sentFromRecordByKey.clear();
    this.mcpKeys.clear();
    this.mcpKeysByTool.clear();
    this.mcpKeysWeight = 0;
    this.generation += 1;
  }
  dropInFlightComposes() {
    this.generation += 1;
  }
}
//@ chunk-aepeg2w5.js:504172-504197 placement
var descriptionCacheSlot = new HostScoped(() => new ToolDescriptionCache());
//@ chunk-aepeg2w5.js:504197-504234 placement
function descriptionCache() {
  return descriptionCacheSlot.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:504234-504474 placement
/**
 * 工具描述缓存的门面：转发到当前会话的缓存实例（读取、盖章、登记、已发送记录、大小）。
 */
var toolDescriptionCache = {
  get(e) {
    return descriptionCache().get(e);
  },
  stamp() {
    return descriptionCache().stamp();
  },
  register(e, n, r) {
    descriptionCache().register(e, n, r);
  },
  getSentFromRecord(e) {
    return descriptionCache().getSentFromRecord(e);
  },
  setSentFromRecord(e, n) {
    descriptionCache().setSentFromRecord(e, n);
  },
  get size() {
    return descriptionCache().size;
  },
};
//@ chunk-aepeg2w5.js:504474-504514 placement
/**
 * 失效所有工具描述缓存。
 */
function invalidateToolDescriptions() {
  descriptionCache().invalidateAll();
  forgetDeferrals();
}
//@ chunk-aepeg2w5.js:504514-504556 placement
function dropInFlightComposes() {
  descriptionCache().dropInFlightComposes();
}
//@ chunk-aepeg2w5.js:504556-504563 placement
setToolDescribeInvalidator(invalidateToolDescriptions);
export {
  dropInFlightComposes,
  invalidateToolDescriptions,
  deferralOf,
  setToolDescribeResolver,
  setToolDescribePresence,
  setToolDescribeBuildPresence,
  isToolDescribeHookedForBuild,
  toolDescriptionCache,
  recordDeferral,
  resolveToolDescription,
  isRewrittenByHook,
  isToolDescribeHooked,
  describedOnce,
  invalidateToolDescriptions_2,
  redescribeTools,
  isHookDescribed,
  redescribeEpoch,
};
