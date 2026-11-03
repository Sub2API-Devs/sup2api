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
  availability = () => !1;
  register(i) {
    this.availability = i;
  }
  isAvailable() {
    return this.availability();
  }
}
//@ chunk-x7pzr0ah.js:293-305 placement
var a = new ArtifactAvailabilityRegistry();
//@ chunk-x7pzr0ah.js:305-335 placement
function jGs(i) {
  a.register(i);
}
//@ chunk-x7pzr0ah.js:335-372 placement
function Xb() {
  return a.isAvailable();
}

export { Xb, jGs };
