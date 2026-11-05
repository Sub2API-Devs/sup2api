/**
 * commands/artifacts/index.ts
 *
 * 2.1.316 新增：/artifacts 命令对象：列出与打开 Artifact
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isArtifactToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import { getArtifactPublishStubDir } from "../../tools/ArtifactTool/constants.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-5xgkngpb.js:1760384-1760561 placement
/**
 * /artifacts 命令对象（local-jsx）；描述：Browse your published and shared artifacts；isEnabled: ()=>VA()&&hc()===null；实现 chunk-qr2y97px.js 的 fs。
 */
var artifactsCommandDefinition = {
  type: "local-jsx",
  name: "artifacts",
  aliases: [],
  description: "Browse your published and shared artifacts",
  isEnabled: () => isArtifactToolEnabled() && getArtifactPublishStubDir() === null,
  immediate: true,
  runsBesideTurns: artifactsRunsBesideTurns,
};
//@ chunk-5xgkngpb.js:1760561-1760620 placement
/**
 * artifactsRunsBesideTurns：tengu_cobalt_plinth_sainfoin：/artifacts 可在回合进行中打开。
 */
function artifactsRunsBesideTurns() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_sainfoin", false);
}
//@ chunk-5xgkngpb.js:1760620-1760632 placement
var artifactsCommand = artifactsCommandDefinition;
export { artifactsCommand };
