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
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:500590-501659 placement
/**
 * 工具描述解析器（组合、缓存、epoch）。
 */
function createToolDescriptionResolver() {
  let setToolDescribeResolverRef = subscribe();
  let describeResolverRef = subscribe();
  let describeCacheRef = subscribe();
  let setToolDescribeInvalidatorRef = subscribe();
  let descriptionCache = new Map();
  let promptCache = new Map();
  let resolvedNames = new Set();
  let unavailableNames = new Set();
  let state = {
    hasDescribed: false,
    epoch: 0,
  };
  let isUnresolvable = (toolName) =>
    (describeCacheRef.get() ?? describeResolverRef.get())?.(toolName) ?? false;
  return {
    setToolDescribeResolver: setToolDescribeResolverRef.set,
    resolveToolDescription: async (tool, description, isDeferred) => {
      state.hasDescribed = true;
      if (isUnresolvable(tool.name)) resolvedNames.add(tool.name);
      let resolved = await (setToolDescribeResolverRef.get()?.(tool, description, isDeferred) ??
        Promise.resolve({
          description,
          isDeferred,
        }));
      if (normalizeFullWidthSpace(resolved.description) !== normalizeFullWidthSpace(description))
        unavailableNames.add(tool.name);
      return resolved;
    },
    setToolDescribePresence: describeResolverRef.set,
    isToolDescribeHooked: (toolName) => describeResolverRef.get()?.(toolName) ?? false,
    setToolDescribeBuildPresence: describeCacheRef.set,
    isToolDescribeHookedForBuild: isUnresolvable,
    setToolDescribeInvalidator: setToolDescribeInvalidatorRef.set,
    invalidateToolDescriptions: () => {
      descriptionCache.clear();
      promptCache.clear();
      state.epoch += state.hasDescribed ? 1 : 0;
      setToolDescribeInvalidatorRef.get()?.();
    },
    redescribeTools: () => {
      state.hasDescribed = true;
    },
    redescribeEpoch: () => state.epoch,
    isHookDescribed: (toolName) => resolvedNames.has(toolName) || isUnresolvable(toolName),
    isRewrittenByHook: (toolName) => unavailableNames.has(toolName),
    forgetRedescribed: () => {
      resolvedNames.clear();
      unavailableNames.clear();
      state.hasDescribed = false;
      state.epoch = 0;
    },
    recordDeferral: (toolName, deferred) =>
      deferred === undefined
        ? void descriptionCache.delete(toolName)
        : void descriptionCache.set(toolName, deferred),
    deferralOf: (toolName) => descriptionCache.get(toolName),
    forgetDeferrals: () => {
      descriptionCache.clear();
      promptCache.clear();
    },
    describedOnce: (key, compute) => {
      let value = promptCache.get(key) ?? compute();
      promptCache.set(key, value);
      return value;
    },
  };
}
//@ chunk-aepeg2w5.js:501659-501724 placement
/**
 * 工具描述缓存的门面实例（HostScoped）：转发读取、盖章、登记、已发送记录与大小，重置时清空延迟与重述记录。
 */
var toolDescriptionResolver; // deferred: uses createToolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:501659", () => {
  toolDescriptionResolver = identity_2(createToolDescriptionResolver(), (resolver) => {
    resolver.forgetDeferrals();
    resolver.forgetRedescribed();
  });
});
//@ chunk-aepeg2w5.js:501724-501746 placement
var deferralOf; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:501724", () => {
  deferralOf = toolDescriptionResolver.deferralOf;
});
//@ chunk-aepeg2w5.js:501746-501771 placement
var describedOnce; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:501746", () => {
  describedOnce = toolDescriptionResolver.describedOnce;
});
//@ chunk-aepeg2w5.js:501771-501797 placement
var forgetDeferrals; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:501771", () => {
  forgetDeferrals = toolDescriptionResolver.forgetDeferrals;
});
//@ chunk-aepeg2w5.js:501797-501823 placement
var recordDeferral; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:501797", () => {
  recordDeferral = toolDescriptionResolver.recordDeferral;
});
//@ chunk-aepeg2w5.js:501823-501861 placement
var invalidateToolDescriptions_2; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:501823", () => {
  invalidateToolDescriptions_2 = toolDescriptionResolver.invalidateToolDescriptions;
});
//@ chunk-aepeg2w5.js:501861-501893 placement
var isToolDescribeHooked; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:501861", () => {
  isToolDescribeHooked = toolDescriptionResolver.isToolDescribeHooked;
});
//@ chunk-aepeg2w5.js:501893-501933 placement
var isToolDescribeHookedForBuild; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:501893", () => {
  isToolDescribeHookedForBuild = toolDescriptionResolver.isToolDescribeHookedForBuild;
});
//@ chunk-aepeg2w5.js:501933-501973 placement
var setToolDescribeBuildPresence; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:501933", () => {
  setToolDescribeBuildPresence = toolDescriptionResolver.setToolDescribeBuildPresence;
});
//@ chunk-aepeg2w5.js:501973-502008 placement
var setToolDescribePresence; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:501973", () => {
  setToolDescribePresence = toolDescriptionResolver.setToolDescribePresence;
});
//@ chunk-aepeg2w5.js:502008-502035 placement
var isHookDescribed; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:502008", () => {
  isHookDescribed = toolDescriptionResolver.isHookDescribed;
});
//@ chunk-aepeg2w5.js:502035-502064 placement
var isRewrittenByHook; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:502035", () => {
  isRewrittenByHook = toolDescriptionResolver.isRewrittenByHook;
});
//@ chunk-aepeg2w5.js:502064-502091 placement
var redescribeEpoch; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:502064", () => {
  redescribeEpoch = toolDescriptionResolver.redescribeEpoch;
});
//@ chunk-aepeg2w5.js:502091-502118 placement
var redescribeTools; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:502091", () => {
  redescribeTools = toolDescriptionResolver.redescribeTools;
});
//@ chunk-aepeg2w5.js:502118-502152 placement
var resolveToolDescription; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:502118", () => {
  resolveToolDescription = toolDescriptionResolver.resolveToolDescription;
});
//@ chunk-aepeg2w5.js:502152-502189 placement
var setToolDescribeInvalidator; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:502152", () => {
  setToolDescribeInvalidator = toolDescriptionResolver.setToolDescribeInvalidator;
});
//@ chunk-aepeg2w5.js:502189-502224 placement
var setToolDescribeResolver; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:502189", () => {
  setToolDescribeResolver = toolDescriptionResolver.setToolDescribeResolver;
});
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
  get(key) {
    let entry = this.byKey.get(key);
    if (entry !== undefined) this.noteMcpKeyUsed(key);
    return entry;
  }
  stamp() {
    return this.generation;
  }
  register(key, value, generation) {
    if (generation === this.generation)
      this.byKey.set(this.noteMcpKeyUsed(key, value.description?.length ?? 0), value);
  }
  getSentFromRecord(key) {
    let entry = this.sentFromRecordByKey.get(key);
    if (entry !== undefined) this.noteMcpKeyUsed(key);
    return entry;
  }
  setSentFromRecord(key, value) {
    this.sentFromRecordByKey.set(this.noteMcpKeyUsed(key), value);
  }
  setMaxMcpKeysWeight(maxMcpKeysWeight) {
    this.maxMcpKeysWeight = maxMcpKeysWeight;
    this.dropMcpKeysPastBounds(new Set());
  }
  noteMcpKeyUsed(serverName, descBytes) {
    let mcpKey = this.mcpKeys.get(serverName);
    if (mcpKey === undefined) {
      let mcpPrefix = getMcpPrefix(serverName);
      if (mcpPrefix === undefined) return serverName;
      mcpKey = {
        key: serverName,
        tool: mcpPrefix,
        weight: 0,
      };
    }
    if (mcpKey.weight === 0 || descBytes !== undefined) {
      let weight = serverName.length + MAX_KEY_OVERHEAD_BYTES + (descBytes ?? 0);
      this.mcpKeysWeight += weight - mcpKey.weight;
      mcpKey.weight = weight;
    }
    this.mcpKeys.delete(mcpKey.key);
    this.mcpKeys.set(mcpKey.key, mcpKey);
    let keys = this.mcpKeysByTool.get(mcpKey.tool) ?? new Set();
    keys.delete(mcpKey);
    keys.add(mcpKey);
    this.mcpKeysByTool.set(mcpKey.tool, keys);
    this.dropMcpKeysPastBounds(keys);
    return mcpKey.key;
  }
  dropMcpKeysPastBounds(keep) {
    for (let mcpKey of keep) {
      if (keep.size <= MAX_IDS_KEPT) break;
      this.dropMcpKey(mcpKey);
    }
    if (this.mcpKeysWeight <= this.maxMcpKeysWeight) return;
    for (let mcpKey of this.mcpKeys.values()) {
      if (this.mcpKeysWeight <= this.maxMcpKeysWeight || this.mcpKeys.size === 1) break;
      this.dropMcpKey(mcpKey);
    }
  }
  dropMcpKey(mcpKey) {
    this.mcpKeys.delete(mcpKey.key);
    this.mcpKeysWeight -= mcpKey.weight;
    let keys = this.mcpKeysByTool.get(mcpKey.tool);
    keys?.delete(mcpKey);
    if (keys?.size === 0) this.mcpKeysByTool.delete(mcpKey.tool);
    this.byKey.delete(mcpKey.key);
    this.sentFromRecordByKey.delete(mcpKey.key);
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
var descriptionCacheSlot; // deferred: uses ToolDescriptionCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:504172", () => {
  descriptionCacheSlot = new HostScoped(() => new ToolDescriptionCache());
});
//@ chunk-aepeg2w5.js:504197-504234 placement
function descriptionCache() {
  return descriptionCacheSlot.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:504234-504474 placement
/**
 * 工具描述缓存的门面：转发到当前会话的缓存实例（读取、盖章、登记、已发送记录、大小）。
 */
var toolDescriptionCache = {
  get(key) {
    return descriptionCache().get(key);
  },
  stamp() {
    return descriptionCache().stamp();
  },
  register(key, value, generation) {
    descriptionCache().register(key, value, generation);
  },
  getSentFromRecord(key) {
    return descriptionCache().getSentFromRecord(key);
  },
  setSentFromRecord(key, value) {
    descriptionCache().setSentFromRecord(key, value);
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
// deferred: uses setToolDescribeInvalidator of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:504556", () => {
  setToolDescribeInvalidator(invalidateToolDescriptions);
});
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
