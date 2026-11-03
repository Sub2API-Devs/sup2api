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

/**
 * artifact 挂载名常量。
 */
//@ chunk-aepeg2w5.js:345026-345050 placement
var ARTIFACT_MOUNT = "artifact_mount";
//@ chunk-aepeg2w5.js:345050-345122 placement
function Vwi(e, n) {
  return `${getAgentProxyPath()}/artifact/${encodeURIComponent(e)}${n}`;
}
//@ chunk-aepeg2w5.js:345122-345170 placement
function qwi(e) {
  return { "x-frame-asset-token": e };
}
/**
 * 是否为 artifact 挂载模式。
 */
//@ chunk-aepeg2w5.js:345170-345209 placement
function isArtifactMountMode() {
  return getIsNonInteractiveSession() && isTopHostSession() && !isClaudecodeSession();
}
//@ chunk-aepeg2w5.js:345209-345244 placement
function Y3t() {
  return isArtifactMountMode() && !isDesktopTopSession();
}
//@ chunk-aepeg2w5.js:345244-345277 placement
function Xpr() {
  return isArtifactMountMode() || isClaudeAiChatCowork();
}
/**
 * 非挂载模式下的路径前缀。
 */
//@ chunk-aepeg2w5.js:345277-345319 placement
function artifactPathPrefix(e) {
  return isArtifactMountMode() ? void 0 : `/${e}`;
}

export { isArtifactMountMode, Xpr, Y3t, artifactPathPrefix, ARTIFACT_MOUNT, Vwi, qwi };
