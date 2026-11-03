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
  availability = () => !1;
  register(i) {
    this.availability = i;
  }
  isAvailable() {
    return this.availability();
  }
}
//@ chunk-q7k80qkg.js:293-305 placement
var e = new FeatureAvailability();
//@ chunk-q7k80qkg.js:305-335 placement
function fai(i) {
  e.register(i);
}
//@ chunk-q7k80qkg.js:335-373 placement
function l4e() {
  return e.isAvailable();
}

export { l4e, fai };
