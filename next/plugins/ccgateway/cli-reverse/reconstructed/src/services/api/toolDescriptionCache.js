/**
 * services/api/toolDescriptionCache.ts
 *
 * 2.1.316 新增：工具描述缓存（按键、MCP 工具权重上限）；工具描述解析器（组合、缓存、epoch）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (27)
 * attribution: placement 25, layout 2
 */
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:512584-513653 placement
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
//@ chunk-exfmq47h.js:513653-513718 placement
/**
 * 工具描述缓存的门面实例（HostScoped）：转发读取、盖章、登记、已发送记录与大小，重置时清空延迟与重述记录。
 */
var toolDescriptionResolver; // deferred: uses createToolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:513653", () => {
  toolDescriptionResolver = identity_2(createToolDescriptionResolver(), (resolver) => {
    resolver.forgetDeferrals();
    resolver.forgetRedescribed();
  });
});
//@ chunk-exfmq47h.js:513718-513740 placement
var deferralOf; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:513718", () => {
  deferralOf = toolDescriptionResolver.deferralOf;
});
//@ chunk-exfmq47h.js:513740-513765 placement
var describedOnce; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:513740", () => {
  describedOnce = toolDescriptionResolver.describedOnce;
});
//@ chunk-exfmq47h.js:513765-513791 placement
var forgetDeferrals; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:513765", () => {
  forgetDeferrals = toolDescriptionResolver.forgetDeferrals;
});
//@ chunk-exfmq47h.js:513791-513817 placement
var recordDeferral; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:513791", () => {
  recordDeferral = toolDescriptionResolver.recordDeferral;
});
//@ chunk-exfmq47h.js:513817-513855 placement
var invalidateToolDescriptions_2; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:513817", () => {
  invalidateToolDescriptions_2 = toolDescriptionResolver.invalidateToolDescriptions;
});
//@ chunk-exfmq47h.js:513855-513887 layout
var isToolDescribeHooked; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:513855", () => {
  isToolDescribeHooked = toolDescriptionResolver.isToolDescribeHooked;
});
//@ chunk-exfmq47h.js:513887-513927 layout
var isToolDescribeHookedForBuild; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:513887", () => {
  isToolDescribeHookedForBuild = toolDescriptionResolver.isToolDescribeHookedForBuild;
});
//@ chunk-exfmq47h.js:513927-513967 placement
var setToolDescribeBuildPresence; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:513927", () => {
  setToolDescribeBuildPresence = toolDescriptionResolver.setToolDescribeBuildPresence;
});
//@ chunk-exfmq47h.js:513967-514002 placement
var setToolDescribePresence; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:513967", () => {
  setToolDescribePresence = toolDescriptionResolver.setToolDescribePresence;
});
//@ chunk-exfmq47h.js:514002-514029 placement
var isHookDescribed; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:514002", () => {
  isHookDescribed = toolDescriptionResolver.isHookDescribed;
});
//@ chunk-exfmq47h.js:514029-514058 placement
var isRewrittenByHook; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:514029", () => {
  isRewrittenByHook = toolDescriptionResolver.isRewrittenByHook;
});
//@ chunk-exfmq47h.js:514058-514085 placement
var redescribeEpoch; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:514058", () => {
  redescribeEpoch = toolDescriptionResolver.redescribeEpoch;
});
//@ chunk-exfmq47h.js:514085-514112 placement
var redescribeTools; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:514085", () => {
  redescribeTools = toolDescriptionResolver.redescribeTools;
});
//@ chunk-exfmq47h.js:514112-514146 placement
var resolveToolDescription; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:514112", () => {
  resolveToolDescription = toolDescriptionResolver.resolveToolDescription;
});
//@ chunk-exfmq47h.js:514146-514183 placement
var setToolDescribeInvalidator; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:514146", () => {
  setToolDescribeInvalidator = toolDescriptionResolver.setToolDescribeInvalidator;
});
//@ chunk-exfmq47h.js:514183-514218 placement
var setToolDescribeResolver; // deferred: uses toolDescriptionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:514183", () => {
  setToolDescribeResolver = toolDescriptionResolver.setToolDescribeResolver;
});
//@ chunk-exfmq47h.js:514218-514247 placement
var MAX_IDS_KEPT = 2;
var MAX_KEY_OVERHEAD_BYTES = 256;
var MAX_MCP_KEYS_WEIGHT = 128000000;
//@ chunk-exfmq47h.js:514247-514407 placement (2.1.88 match: getMcpPrefix, 0.822)
function getMcpPrefix(serverName) {
  let index = serverName.indexOf(":{");
  if (index === -1 || !serverName.startsWith("mcp__", serverName.lastIndexOf(":", index - 1) + 1)) return;
  return `${serverName.slice(0, index).replace(/^V[0-9a-f]{16}:/, "V:")}:`;
}
//@ chunk-exfmq47h.js:514407-516166 placement
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
//@ chunk-exfmq47h.js:516166-516191 placement
var descriptionCacheSlot; // deferred: uses ToolDescriptionCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:516166", () => {
  descriptionCacheSlot = new HostScoped(() => new ToolDescriptionCache());
});
//@ chunk-exfmq47h.js:516191-516228 placement
function descriptionCache() {
  return descriptionCacheSlot.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:516228-516468 placement
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
//@ chunk-exfmq47h.js:516468-516508 placement
/**
 * 失效所有工具描述缓存。
 */
function invalidateToolDescriptions() {
  descriptionCache().invalidateAll();
  forgetDeferrals();
}
//@ chunk-exfmq47h.js:516508-516550 placement
function dropInFlightComposes() {
  descriptionCache().dropInFlightComposes();
}
//@ chunk-exfmq47h.js:516550-516557 placement
// deferred: uses setToolDescribeInvalidator of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:516550", () => {
  setToolDescribeInvalidator(invalidateToolDescriptions);
});
export {
  toolDescriptionCache,
  isToolDescribeHooked,
  deferralOf,
  dropInFlightComposes,
  invalidateToolDescriptions,
  setToolDescribeResolver,
  setToolDescribePresence,
  setToolDescribeBuildPresence,
  isToolDescribeHookedForBuild,
  recordDeferral,
  resolveToolDescription,
  isRewrittenByHook,
  describedOnce,
  invalidateToolDescriptions_2,
  redescribeTools,
  isHookDescribed,
  redescribeEpoch,
};
