/**
 * services/artifacts/artifactAvailability.ts
 *
 * Artifact 功能可用性（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qt90e95a.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-qt90e95a.js:191-293 placement
class ArtifactAvailabilityRegistry {
  availability = () => false;
  register(availability) {
    this.availability = availability;
  }
  isAvailable() {
    return this.availability();
  }
}
//@ chunk-qt90e95a.js:293-305 placement
/**
 * Artifact 可用性登记器全局实例：注册来源并聚合判断 artifact 功能是否可用。
 */
var artifactAvailabilityRegistry = new ArtifactAvailabilityRegistry();
//@ chunk-qt90e95a.js:305-335 placement
/**
 * 导出函数 `registerAvailabilitySource`：参数 i。
 */
function registerAvailabilitySource(artifactCommentsPromptGateOpen) {
  artifactAvailabilityRegistry.register(artifactCommentsPromptGateOpen);
}
//@ chunk-qt90e95a.js:335-372 placement
/**
 * 导出函数 `isArtifactsAvailable`：返回 a.isAvailable(); } export { Xb, jGs }。
 */
function isArtifactsAvailable() {
  return artifactAvailabilityRegistry.isAvailable();
}
export { isArtifactsAvailable, registerAvailabilitySource };
