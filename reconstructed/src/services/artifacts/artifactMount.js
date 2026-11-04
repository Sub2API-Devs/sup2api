/**
 * services/artifacts/artifactMount.ts
 *
 * 2.1.316 新增：非挂载模式下的路径前缀；是否为 artifact 挂载模式等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (7)
 * attribution: placement 7
 */
import { getAgentProxyPath } from "../ccrAgentProxy/agentProxy.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isTopHostSession, isClaudecodeSession } from "../../utils/sessionShape.js";
import { isDesktopTopSession, isClaudeAiChatCowork } from "../../utils/entrypointKinds.js";

//@ chunk-aepeg2w5.js:345026-345050 placement
/**
 * artifact 挂载名常量。
 */
var ARTIFACT_MOUNT = "artifact_mount";
//@ chunk-aepeg2w5.js:345050-345122 placement
/**
 * 导出函数 `artifactProxyPath`：参数 e, n，返回 `${getAgentProxyPath()}/artifact/${encodeURIComponent(e)}${n}`。
 */
function artifactProxyPath(slug, path) {
  return `${getAgentProxyPath()}/artifact/${encodeURIComponent(slug)}${path}`;
}
//@ chunk-aepeg2w5.js:345122-345170 placement
/**
 * 导出函数 `artifactAssetTokenHeader`：参数 e，返回 { "x-frame-asset-token": e }。
 */
function artifactAssetTokenHeader(token) {
  return {
    "x-frame-asset-token": token,
  };
}
//@ chunk-aepeg2w5.js:345170-345209 placement
/**
 * 是否为 artifact 挂载模式。
 */
function isArtifactMountMode() {
  return getIsNonInteractiveSession() && isTopHostSession() && !isClaudecodeSession();
}
//@ chunk-aepeg2w5.js:345209-345244 placement
/**
 * 导出函数 `isArtifactMountUsable`：返回 isArtifactMountMode() && !isDesktopTopSession()。
 */
function isArtifactMountUsable() {
  return isArtifactMountMode() && !isDesktopTopSession();
}
//@ chunk-aepeg2w5.js:345244-345277 placement
/**
 * 导出函数 `isArtifactPathMounted`：返回 isArtifactMountMode() || isClaudeAiChatCowork()。
 */
function isArtifactPathMounted() {
  return isArtifactMountMode() || isClaudeAiChatCowork();
}
//@ chunk-aepeg2w5.js:345277-345319 placement
/**
 * 非挂载模式下的路径前缀。
 */
function artifactPathPrefix(path) {
  return isArtifactMountMode() ? undefined : `/${path}`;
}
export {
  isArtifactMountMode,
  isArtifactPathMounted,
  isArtifactMountUsable,
  artifactPathPrefix,
  ARTIFACT_MOUNT,
  artifactProxyPath,
  artifactAssetTokenHeader,
};
