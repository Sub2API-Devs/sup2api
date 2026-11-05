/**
 * commands/project/index.ts
 *
 * /project 命令注册：设置本次会话用量上报所属的 claude.ai Project（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
import { getSubscriberAttributionProject } from "../../utils/attributionProject.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-5xgkngpb.js:1761218-1761535 placement
/**
 * /project 命令注册：设置本次会话用量上报所属的 claude.ai Project（tengu_gentle_cupcake 开关）。
 */
var TENGU_GENTLE_CUPCAKE = "tengu_gentle_cupcake";
var projectCommand = {
  type: "local",
  name: "project",
  description: "Set the claude.ai Project for this session's usage reports",
  argumentHint: "[Project ID or claude.ai address] [--save] | clear [--save]",
  isEnabled: () =>
    getSubscriberAttributionProject() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GENTLE_CUPCAKE, false),
  supportsNonInteractive: true,
  load: () => import("./call.lazy.js"),
};
var projectCommandAlias = projectCommand;
export { projectCommandAlias };
