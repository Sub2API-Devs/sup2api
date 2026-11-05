/**
 * services/memorySync/availability.ts
 *
 * 记忆同步可用性（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  getIsRemoteMode,
  getMemoryToolsShapeLatch,
  setMemoryToolsShapeLatch,
} from "../../bootstrap/state.js";
import {
  isAutoMemoryEnabledIgnoringPause,
  hasAutoMemPathOverride,
  isStoreMountedRecall,
} from "../../memdir/paths.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  getOrgMemoryPolicyState,
  isOrgMemoryEligible,
  isOrgMemoryPolicyOpen,
} from "../orgMemory/memoryStores.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getCurrentProjectConfig } from "../../utils/config.js";
import {
  getDecisionStores,
  getOrgMemoryDecision,
  grantedModeFor,
  isOrgMemoryWriteOptedIn,
} from "../orgMemory/orgMemoryDecision.js";
import { hasOrgMemoryDecisionRunStarted } from "../orgMemory/discovery.js";
import { isMemoryPromptIndexEligible } from "../orgMemory/promptIndex.js";
import {
  isPolicyVerdictUnobtainable,
  isPrincipalSeenUnderHipaa,
  isPolicyVerdictAbsent,
  isPolicyAllowed,
} from "../policyLimits/policyEvidence.js";

//@ chunk-a2q0x549.js:64937-64965 placement
/**
 * 在宽松模式下取记忆工具的呈现形态（tools/files）。
 */
function memoryToolsShapeLoose() {
  return getMemoryToolsShape(false);
}
//@ chunk-a2q0x549.js:64965-64993 placement
/**
 * 在严格模式下取记忆工具的呈现形态。
 */
function memoryToolsShapeStrict() {
  return getMemoryToolsShape(true);
}
//@ chunk-a2q0x549.js:64993-65030 placement
/**
 * 自动记忆是否以 tools 形式提供。
 */
function areMemoryToolsEnabled() {
  return memoryToolsShapeLoose() === "tools";
}
//@ chunk-a2q0x549.js:65030-65406 placement
/**
 * 决定自动记忆以 tools 还是 files 形式提供：远程模式、自动记忆关闭、有目录覆盖等为 files；否则按开关与状态锁定结果。
 */
function getMemoryToolsShape(latchAllowed) {
  if (getIsRemoteMode()) return "files";
  let memoryToolsShapeLatch = getMemoryToolsShapeLatch();
  if (!isAutoMemoryEnabledIgnoringPause()) {
    if (latchAllowed && memoryToolsShapeLatch === null) setMemoryToolsShapeLatch(false);
    return "files";
  }
  if (memoryToolsShapeLatch !== null) return memoryToolsShapeLatch ? "tools" : "files";
  if (
    (env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_REMOTE_MEMORY_DIR !== undefined) ||
    hasAutoMemPathOverride() ||
    env.CLAUDE_COWORK_MEMORY_GUIDELINES !== undefined ||
    isStoreMountedRecall()
  ) {
    setMemoryToolsShapeLatch(false);
    return "files";
  }
  let toolsShapeWanted =
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_linen_orbit", false) ||
    getOrgMemoryPolicyState() !== "closed" ||
    isOrgMemoryEligible();
  if (toolsShapeWanted || latchAllowed) setMemoryToolsShapeLatch(toolsShapeWanted);
  return toolsShapeWanted ? "tools" : "files";
}
//@ chunk-a2q0x549.js:65406-65506 placement
/**
 * 组织记忆读取是否启用：功能开启、非仅必要流量、满足前置条件且项目配置未关闭。
 */
function isOrgMemoryReadEnabled() {
  if (!areMemoryToolsEnabled()) return false;
  if (isEssentialTrafficOnly()) return false;
  if (!isOrgMemoryPolicyOpen()) return false;
  return getCurrentProjectConfig().orgMemoryRead !== false;
}
//@ chunk-a2q0x549.js:65506-65583 placement
/**
 * 是否已有待读取的组织记忆。
 */
function hasPendingOrgMemoryRead() {
  return (
    (getDecisionStores().length > 0 ||
      (hasOrgMemoryDecisionRunStarted() && getOrgMemoryDecision().state === "undecided")) &&
    isOrgMemoryReadEnabled()
  );
}
//@ chunk-a2q0x549.js:65583-65783 placement
function memorySyncAvailability_2() {
  if (!isOrgMemoryReadEnabled()) return "inactive";
  switch (getOrgMemoryDecision().state) {
    case "undecided":
      return hasOrgMemoryDecisionRunStarted() ? "connecting" : "unavailable";
    case "on":
      return "connected";
    case "off":
    case "parked":
    case "ended":
      return "unavailable";
  }
}
//@ chunk-a2q0x549.js:65783-65820 placement
/**
 * 可读的组织记忆存储列表（未开启时为空）。
 */
function readableOrgMemoryStores() {
  return isOrgMemoryReadEnabled() ? getDecisionStores() : [];
}
//@ chunk-a2q0x549.js:65820-65890 placement
/**
 * 组织记忆开启时的身份信息。
 */
function orgMemoryIdentity() {
  let orgMemoryDecision = getOrgMemoryDecision();
  return isOrgMemoryReadEnabled() && orgMemoryDecision.state === "on" ? orgMemoryDecision.identity : null;
}
//@ chunk-a2q0x549.js:65890-65953 placement
/**
 * 判断某存储是否可写（两端 rw 且用户已选择写入）。
 */
function isStoreWritable(store) {
  return store.mode === "rw" && grantedModeFor(store.path) === "rw" && isOrgMemoryWriteOptedIn();
}
//@ chunk-a2q0x549.js:119096-119242 placement
function memorySyncAvailability() {
  if (!isMemoryPromptIndexEligible()) return "closed";
  if (isPolicyVerdictUnobtainable()) {
    if (isPrincipalSeenUnderHipaa()) return "closed";
  } else if (isPolicyVerdictAbsent()) return "held";
  return isPolicyAllowed("allow_memory_sync") ? "open" : "closed";
}
//@ chunk-a2q0x549.js:119242-119279 placement
function isMultiStoreSyncAvailable() {
  return memorySyncAvailability() === "open";
}
//@ chunk-a2q0x549.js:119279-119312 placement
function memorySyncAwaitsVerdict() {
  return isMemoryPromptIndexEligible() && isPolicyVerdictAbsent();
}
//@ chunk-a2q0x549.js:119312-119357 placement
/**
 * 是否处于"挫败检测"可触发状态（功能开启且记忆同步状态为 closed）。
 */
function memorySyncClosedByPolicy() {
  return isMemoryPromptIndexEligible() && memorySyncAvailability() === "closed";
}
export {
  isMultiStoreSyncAvailable,
  isOrgMemoryReadEnabled,
  areMemoryToolsEnabled,
  memoryToolsShapeLoose,
  memoryToolsShapeStrict,
  readableOrgMemoryStores,
  isStoreWritable,
  hasPendingOrgMemoryRead,
  memorySyncAvailability,
  memorySyncAwaitsVerdict,
  memorySyncClosedByPolicy,
  orgMemoryIdentity,
  memorySyncAvailability_2,
};
