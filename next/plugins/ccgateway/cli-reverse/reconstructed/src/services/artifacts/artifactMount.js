/**
 * services/artifacts/artifactMount.ts
 *
 * 2.1.316 新增：非挂载模式下的路径前缀；是否为 artifact 挂载模式等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getAgentProxyPath } from "../ccrAgentProxy/agentProxy.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isTopHostSession, isClaudecodeSession } from "../../utils/sessionShape.js";
import { isDesktopTopSession, isClaudeAiChatCowork } from "../../utils/entrypointKinds.js";

//@ chunk-exfmq47h.js:355513-355537 placement
/**
 * artifact 挂载名常量。
 */
var ARTIFACT_MOUNT = "artifact_mount";
//@ chunk-exfmq47h.js:355537-355609 placement
/**
 * 导出函数 `artifactProxyPath`：参数 e, n，返回 `${getAgentProxyPath()}/artifact/${encodeURIComponent(e)}${n}`。
 */
function artifactProxyPath(slug, path) {
  return `${getAgentProxyPath()}/artifact/${encodeURIComponent(slug)}${path}`;
}
//@ chunk-exfmq47h.js:355609-355657 placement
/**
 * 导出函数 `artifactAssetTokenHeader`：参数 e，返回 { "x-frame-asset-token": e }。
 */
function artifactAssetTokenHeader(token) {
  return {
    "x-frame-asset-token": token,
  };
}
//@ chunk-exfmq47h.js:355657-355696 placement
/**
 * 是否为 artifact 挂载模式。
 */
function isArtifactMountMode() {
  return getIsNonInteractiveSession() && isTopHostSession() && !isClaudecodeSession();
}
//@ chunk-exfmq47h.js:355696-355731 placement
/**
 * 导出函数 `isArtifactMountUsable`：返回 isArtifactMountMode() && !isDesktopTopSession()。
 */
function isArtifactMountUsable() {
  return isArtifactMountMode() && !isDesktopTopSession();
}
//@ chunk-exfmq47h.js:355731-355764 placement
/**
 * 导出函数 `isArtifactPathMounted`：返回 isArtifactMountMode() || isClaudeAiChatCowork()。
 */
function isArtifactPathMounted() {
  return isArtifactMountMode() || isClaudeAiChatCowork();
}
//@ chunk-exfmq47h.js:355764-355806 placement
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
