/**
 * utils/featureAvailability.ts
 *
 * 2.1.316 新增。功能可用性。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q7k80qkg.js (4)
 * attribution: placement 4
 */

//@ chunk-q7k80qkg.js:191-293 placement
class FeatureAvailability {
  availability = () => false;
  register(availability) {
    this.availability = availability;
  }
  isAvailable() {
    return this.availability();
  }
}
//@ chunk-q7k80qkg.js:293-305 placement
var featureAvailabilityRegistry = new FeatureAvailability();
//@ chunk-q7k80qkg.js:305-335 placement
/**
 * 注册一个特性可用性判定函数。
 */
function registerFeatureAvailability(hasArtifactTypeListGate) {
  featureAvailabilityRegistry.register(hasArtifactTypeListGate);
}
//@ chunk-q7k80qkg.js:335-373 placement
/**
 * 判断当前是否任一注册的特性能用。
 */
function isAnyFeatureAvailable() {
  return featureAvailabilityRegistry.isAvailable();
}
export { isAnyFeatureAvailable, registerFeatureAvailability };
