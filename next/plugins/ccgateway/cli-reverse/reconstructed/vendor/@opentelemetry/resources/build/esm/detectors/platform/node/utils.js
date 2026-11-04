/**
 * @opentelemetry/resources/build/esm/detectors/platform/node/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-9vvvg0d3.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-9vvvg0d3.js:34768-34883 esm-fingerprint
function normalizeArchForOtel(nodeArchString) {
  switch (nodeArchString) {
    case "arm":
      return "arm32";
    case "ppc":
      return "ppc32";
    case "x64":
      return "amd64";
    default:
      return nodeArchString;
  }
}
export { normalizeArchForOtel };
