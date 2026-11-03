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
import { getOrgMemoryPolicyState, _r, Dn } from "../orgMemory/memoryStores.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getCurrentProjectConfig } from "../../utils/config.js";
import {
  getDecisionStores,
  getOrgMemoryDecision,
  N2,
  isOrgMemoryWriteOptedIn,
} from "../orgMemory/orgMemoryDecision.js";
import { hasOrgMemoryDecisionRunStarted } from "../orgMemory/discovery.js";
import { Uo } from "../orgMemory/promptIndex.js";
import {
  isPolicyVerdictUnobtainable,
  isPrincipalSeenUnderHipaa,
  isPolicyVerdictAbsent,
  isPolicyAllowed,
} from "../policyLimits/policyEvidence.js";

//@ chunk-82kqcve8.js:63773-63801 placement
function To() {
  return getMemoryToolsShape(!1);
}
//@ chunk-82kqcve8.js:63801-63829 placement
function Cr() {
  return getMemoryToolsShape(!0);
}
//@ chunk-82kqcve8.js:63829-63866 placement
function _Pe() {
  return To() === "tools";
}
/**
 * 决定自动记忆以 tools 还是 files 形式提供：远程模式、自动记忆关闭、有目录覆盖等为 files；否则按开关与状态锁定结果。
 */
//@ chunk-82kqcve8.js:63866-64241 placement
function getMemoryToolsShape(e) {
  if (getIsRemoteMode()) return "files";
  let n = getMemoryToolsShapeLatch();
  if (!isAutoMemoryEnabledIgnoringPause()) {
    if (e && n === null) setMemoryToolsShapeLatch(!1);
    return "files";
  }
  if (n !== null) return n ? "tools" : "files";
  if (
    (env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_REMOTE_MEMORY_DIR !== void 0) ||
    hasAutoMemPathOverride() ||
    env.CLAUDE_COWORK_MEMORY_GUIDELINES !== void 0 ||
    isStoreMountedRecall()
  )
    return (setMemoryToolsShapeLatch(!1), "files");
  let r =
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_linen_orbit", !1) ||
    getOrgMemoryPolicyState() !== "closed" ||
    _r();
  if (r || e) setMemoryToolsShapeLatch(r);
  return r ? "tools" : "files";
}
/**
 * 组织记忆读取是否启用：功能开启、非仅必要流量、满足前置条件且项目配置未关闭。
 */
//@ chunk-82kqcve8.js:64241-64341 placement
function isOrgMemoryReadEnabled() {
  if (!_Pe()) return !1;
  if (isEssentialTrafficOnly()) return !1;
  if (!Dn()) return !1;
  return getCurrentProjectConfig().orgMemoryRead !== !1;
}
//@ chunk-82kqcve8.js:64341-64418 placement
function pa() {
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
function Qpe() {
  return isOrgMemoryReadEnabled() ? getDecisionStores() : [];
}
//@ chunk-82kqcve8.js:64655-64725 placement
function ha() {
  let e = getOrgMemoryDecision();
  return isOrgMemoryReadEnabled() && e.state === "on" ? e.identity : null;
}
//@ chunk-82kqcve8.js:64725-64788 placement
function CAt(e) {
  return e.mode === "rw" && N2(e.path) === "rw" && isOrgMemoryWriteOptedIn();
}
//@ chunk-82kqcve8.js:121650-121796 placement
function memorySyncAvailability() {
  if (!Uo()) return "closed";
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
  return Uo() && isPolicyVerdictAbsent();
}
/**
 * 是否处于"挫败检测"可触发状态（功能开启且记忆同步状态为 closed）。
 */
//@ chunk-82kqcve8.js:121866-121911 placement = useFrustrationDetection (0.391)
function memorySyncClosedByPolicy() {
  return Uo() && memorySyncAvailability() === "closed";
}

export {
  isOrgMemoryReadEnabled,
  Qpe,
  memorySyncAvailability,
  ha,
  isMultiStoreSyncAvailable,
  To,
  Cr,
  CAt,
  pa,
  _Pe,
  memorySyncAvailability_2,
  memorySyncAwaitsVerdict,
  memorySyncClosedByPolicy,
};
