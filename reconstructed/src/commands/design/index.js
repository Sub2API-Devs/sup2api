/**
 * commands/design/index.ts
 *
 * 2.1.316 新增：/design 命令对象：Claude Design 项目入口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { UW, mqe } from "../../tools/DesignSyncTool/DesignSyncTool.js";

/**
 * /design-consent 命令对象（local）；描述：Grant Claude agent access to your Design projects；isEnabled: ()=>UW()；isHidden: true；实现 chunk-c9mbsnrs.js 的 m。
 */
//@ chunk-e6aww6q8.js:1723067-1723503 placement
var designConsentCommand = {
    type: "local",
    name: "design-consent",
    description: "Grant Claude agent access to your Design projects",
    isEnabled: () => UW(),
    policyGate: mqe,
    supportsNonInteractive: !0,
    isHidden: !0,
    load: () => import("./chunk-c9mbsnrs.js"),
  },
  designRevokeCommand = {
    type: "local",
    name: "design-revoke",
    description: "Revoke Claude agent access to your Design projects",
    isEnabled: () => UW(),
    policyGate: mqe,
    supportsNonInteractive: !0,
    isHidden: !0,
    load: () => import("./chunk-6qdkmygq.js"),
  };
/**
 * createDesignLoginCommand：返回 /design-login 命令对象。
 */
//@ chunk-e6aww6q8.js:1723503-1723680 placement
var createDesignLoginCommand = () => ({
  type: "local-jsx",
  name: "design-login",
  description: "Authorize design-system access for /design-sync with your claude.ai account",
  isEnabled: () => UW(),
  policyGate: mqe,
});

export { createDesignLoginCommand, designConsentCommand, designRevokeCommand };
