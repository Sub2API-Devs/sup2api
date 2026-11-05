/**
 * commands/design/index.ts
 *
 * 2.1.316 新增：/design 命令对象：Claude Design 项目入口
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */
import { isDesignSyncAllowed, DESIGN_SYNC_POLICY } from "../../tools/DesignSyncTool/DesignSyncTool.js";

//@ chunk-5xgkngpb.js:1798437-1798873 placement
/**
 * /design-consent 命令对象（local）；描述：Grant Claude agent access to your Design projects；isEnabled: ()=>UW()；isHidden: true；实现 chunk-c9mbsnrs.js 的 m。
 */
var designConsentCommand = {
  type: "local",
  name: "design-consent",
  description: "Grant Claude agent access to your Design projects",
  isEnabled: () => isDesignSyncAllowed(),
  policyGate: DESIGN_SYNC_POLICY,
  supportsNonInteractive: true,
  isHidden: true,
  load: () => import("../consent/call.lazy.js"),
};
var designRevokeCommand = {
  type: "local",
  name: "design-revoke",
  description: "Revoke Claude agent access to your Design projects",
  isEnabled: () => isDesignSyncAllowed(),
  policyGate: DESIGN_SYNC_POLICY,
  supportsNonInteractive: true,
  isHidden: true,
  load: () => import("./call.lazy.js"),
};
//@ chunk-5xgkngpb.js:1798873-1799050 placement
/**
 * createDesignLoginCommand：返回 /design-login 命令对象。
 */
var createDesignLoginCommand = () => ({
  type: "local-jsx",
  name: "design-login",
  description: "Authorize design-system access for /design-sync with your claude.ai account",
  isEnabled: () => isDesignSyncAllowed(),
  policyGate: DESIGN_SYNC_POLICY,
});
export { createDesignLoginCommand, designConsentCommand, designRevokeCommand };
