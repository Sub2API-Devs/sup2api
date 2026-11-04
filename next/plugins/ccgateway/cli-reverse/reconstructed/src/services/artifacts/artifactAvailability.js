/**
 * services/artifacts/artifactAvailability.ts
 *
 * Artifact 功能可用性（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x7pzr0ah.js (4)
 * attribution: placement 4
 */

//@ chunk-x7pzr0ah.js:191-293 placement
class ArtifactAvailabilityRegistry {
  availability = () => false;
  register(availability) {
    this.availability = availability;
  }
  isAvailable() {
    return this.availability();
  }
}
//@ chunk-x7pzr0ah.js:293-305 placement
/**
 * Artifact 可用性登记器全局实例：注册来源并聚合判断 artifact 功能是否可用。
 */
var artifactAvailabilityRegistry = new ArtifactAvailabilityRegistry();
//@ chunk-x7pzr0ah.js:305-335 placement
/**
 * 导出函数 `registerAvailabilitySource`：参数 i。
 */
function registerAvailabilitySource(artifactCommentsPromptGateOpen) {
  artifactAvailabilityRegistry.register(artifactCommentsPromptGateOpen);
}
//@ chunk-x7pzr0ah.js:335-372 placement
/**
 * 导出函数 `isArtifactsAvailable`：返回 a.isAvailable(); } export { Xb, jGs }。
 */
function isArtifactsAvailable() {
  return artifactAvailabilityRegistry.isAvailable();
}
export { isArtifactsAvailable, registerAvailabilitySource };
