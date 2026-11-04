/**
 * @opentelemetry/api/build/src/internal/semver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_version } from "../version.js";

//@ chunk-bwbq4xvm.js:28849-29687 cjs-fingerprint
var require_semver_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isCompatible = cjsExports._makeCompatibilityCheck = undefined;
  var version_1 = require_version();
  var re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
  function _makeCompatibilityCheck(ownVersion) {
    let acceptedVersions = new Set([ownVersion]);
    let rejectedVersions = new Set();
    let myVersionMatch = ownVersion.match(re);
    if (!myVersionMatch) return () => false;
    let ownVersionParsed = {
      major: +myVersionMatch[1],
      minor: +myVersionMatch[2],
      patch: +myVersionMatch[3],
      prerelease: myVersionMatch[4],
    };
    if (ownVersionParsed.prerelease != null)
      return function (globalVersion) {
        return globalVersion === ownVersion;
      };
    function _reject(v) {
      rejectedVersions.add(v);
      return false;
    }
    function _accept(v) {
      acceptedVersions.add(v);
      return true;
    }
    return function (globalVersion) {
      if (acceptedVersions.has(globalVersion)) return true;
      if (rejectedVersions.has(globalVersion)) return false;
      let globalVersionMatch = globalVersion.match(re);
      if (!globalVersionMatch) return _reject(globalVersion);
      let globalVersionParsed = {
        major: +globalVersionMatch[1],
        minor: +globalVersionMatch[2],
        patch: +globalVersionMatch[3],
        prerelease: globalVersionMatch[4],
      };
      if (globalVersionParsed.prerelease != null) return _reject(globalVersion);
      if (ownVersionParsed.major !== globalVersionParsed.major) return _reject(globalVersion);
      if (ownVersionParsed.major === 0) {
        if (
          ownVersionParsed.minor === globalVersionParsed.minor &&
          ownVersionParsed.patch <= globalVersionParsed.patch
        )
          return _accept(globalVersion);
        return _reject(globalVersion);
      }
      if (ownVersionParsed.minor <= globalVersionParsed.minor) return _accept(globalVersion);
      return _reject(globalVersion);
    };
  }
  cjsExports._makeCompatibilityCheck = _makeCompatibilityCheck;
  cjsExports.isCompatible = _makeCompatibilityCheck(version_1.VERSION);
});
export { require_semver_2 };
