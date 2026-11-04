/**
 * services/memorySync/availability.ts
 *
 * 记忆同步可用性（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (14)
 * attribution: placement 14
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

//@ chunk-82kqcve8.js:63773-63801 placement
/**
 * 在宽松模式下取记忆工具的呈现形态（tools/files）。
 */
function memoryToolsShapeLoose() {
  return getMemoryToolsShape(false);
}
//@ chunk-82kqcve8.js:63801-63829 placement
/**
 * 在严格模式下取记忆工具的呈现形态。
 */
function memoryToolsShapeStrict() {
  return getMemoryToolsShape(true);
}
//@ chunk-82kqcve8.js:63829-63866 placement
/**
 * 自动记忆是否以 tools 形式提供。
 */
function areMemoryToolsEnabled() {
  return memoryToolsShapeLoose() === "tools";
}
//@ chunk-82kqcve8.js:63866-64241 placement
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
//@ chunk-82kqcve8.js:64241-64341 placement
/**
 * 组织记忆读取是否启用：功能开启、非仅必要流量、满足前置条件且项目配置未关闭。
 */
function isOrgMemoryReadEnabled() {
  if (!areMemoryToolsEnabled()) return false;
  if (isEssentialTrafficOnly()) return false;
  if (!isOrgMemoryPolicyOpen()) return false;
  return getCurrentProjectConfig().orgMemoryRead !== false;
}
//@ chunk-82kqcve8.js:64341-64418 placement
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
//@ chunk-82kqcve8.js:64418-64618 placement
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
//@ chunk-82kqcve8.js:64618-64655 placement
/**
 * 可读的组织记忆存储列表（未开启时为空）。
 */
function readableOrgMemoryStores() {
  return isOrgMemoryReadEnabled() ? getDecisionStores() : [];
}
//@ chunk-82kqcve8.js:64655-64725 placement
/**
 * 组织记忆开启时的身份信息。
 */
function orgMemoryIdentity() {
  let orgMemoryDecision = getOrgMemoryDecision();
  return isOrgMemoryReadEnabled() && orgMemoryDecision.state === "on" ? orgMemoryDecision.identity : null;
}
//@ chunk-82kqcve8.js:64725-64788 placement
/**
 * 判断某存储是否可写（两端 rw 且用户已选择写入）。
 */
function isStoreWritable(store) {
  return store.mode === "rw" && grantedModeFor(store.path) === "rw" && isOrgMemoryWriteOptedIn();
}
//@ chunk-82kqcve8.js:121650-121796 placement
function memorySyncAvailability() {
  if (!isMemoryPromptIndexEligible()) return "closed";
  if (isPolicyVerdictUnobtainable()) {
    if (isPrincipalSeenUnderHipaa()) return "closed";
  } else if (isPolicyVerdictAbsent()) return "held";
  return isPolicyAllowed("allow_memory_sync") ? "open" : "closed";
}
//@ chunk-82kqcve8.js:121796-121833 placement
function isMultiStoreSyncAvailable() {
  return memorySyncAvailability() === "open";
}
//@ chunk-82kqcve8.js:121833-121866 placement
function memorySyncAwaitsVerdict() {
  return isMemoryPromptIndexEligible() && isPolicyVerdictAbsent();
}
//@ chunk-82kqcve8.js:121866-121911 placement = useFrustrationDetection (0.391)
/**
 * 是否处于"挫败检测"可触发状态（功能开启且记忆同步状态为 closed）。
 */
function memorySyncClosedByPolicy() {
  return isMemoryPromptIndexEligible() && memorySyncAvailability() === "closed";
}
export {
  isOrgMemoryReadEnabled,
  readableOrgMemoryStores,
  memorySyncAvailability,
  orgMemoryIdentity,
  isMultiStoreSyncAvailable,
  memoryToolsShapeLoose,
  memoryToolsShapeStrict,
  isStoreWritable,
  hasPendingOrgMemoryRead,
  areMemoryToolsEnabled,
  memorySyncAvailability_2,
  memorySyncAwaitsVerdict,
  memorySyncClosedByPolicy,
};
