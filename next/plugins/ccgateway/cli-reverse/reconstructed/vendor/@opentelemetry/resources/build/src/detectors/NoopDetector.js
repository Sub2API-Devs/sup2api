/**
 * @opentelemetry/resources/build/src/detectors/NoopDetector.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:147608-147804 cjs-fingerprint
var require_NoopDetector = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.noopDetector = cjsExports.NoopDetector = undefined;
  class NoopDetector {
    detect() {
      return {
        attributes: {},
      };
    }
  }
  cjsExports.NoopDetector = NoopDetector;
  cjsExports.noopDetector = new NoopDetector();
});
export { require_NoopDetector };
