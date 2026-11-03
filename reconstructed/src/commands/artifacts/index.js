/**
 * commands/artifacts/index.ts
 *
 * 2.1.316 新增：/artifacts 命令对象：列出与打开 Artifact
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { isArtifactToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import { getArtifactPublishStubDir } from "../../tools/ArtifactTool/constants.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-e6aww6q8.js:1685492-1685669 placement
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
//@ chunk-e6aww6q8.js:1685669-1685728 placement
/**
 * artifactsRunsBesideTurns：tengu_cobalt_plinth_sainfoin：/artifacts 可在回合进行中打开。
 */
function artifactsRunsBesideTurns() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_sainfoin", false);
}
//@ chunk-e6aww6q8.js:1685728-1685740 placement
var artifactsCommand = artifactsCommandDefinition;
export { artifactsCommand };
