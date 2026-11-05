/**
 * utils/computerUse/hostedDesktop.ts
 *
 * 托管桌面相关开关与判断。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n251ajcn.js (2)
 * attribution: placement 2
 */
import { isHostedDesktopSession } from "./toolRendering.js";
import { isHermeticRemoteSession } from "../../services/cloudSessions/eligibility.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { codeModeAccepted } from "../codeMode/accepted.js";
import { isCodeModeEnabled } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";

//@ chunk-n251ajcn.js:443-535 placement
/**
 * 是否接入托管桌面 computer-use：托管桌面会话、非 HIPAA 等受限组织，且 GrowthBook tengu_dapper_acorn。
 */
function shouldWireHostedDesktopComputerUse() {
  return (
    isHostedDesktopSession() &&
    !isHermeticRemoteSession() &&
    !hasComplianceTaint("hipaa") &&
    !(codeModeAccepted() && isCodeModeEnabled()) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_dapper_acorn", false)
  );
}
//@ chunk-n251ajcn.js:535-591 placement
function isCleverYetiEnabled() {
  return readFlagWithOverride("tengu_clever_yeti", {
    safe: true,
  });
}
export { shouldWireHostedDesktopComputerUse };
